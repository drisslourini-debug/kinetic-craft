-- ==============================================================================
-- KINETIC CRAFT - SUPER-ADMIN PLATFORM CRM & OPS COCKPIT MIGRATION
-- ==============================================================================
-- 1. Super-Admin Sicherheitsmodell (platform_superadmins & is_superadmin)
-- 2. Mandanten-Erweiterungen (Pläne, Status, Zahlungszyklus)
-- 3. Support-Ticketsystem (support_tickets, support_ticket_messages)
-- 4. Plattform-Lizenzabrechnung (platform_invoices)
-- 5. Internes Betreuungs-CRM (crm_tenant_notes)
-- 6. RPCs: admin_impersonate_tenant, admin_get_platform_kpis
-- 7. RLS-Policies für uneingeschränkte Super-Admin Steuerung & sichere Mandantentrennung
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SUPER-ADMIN BERECHTIGUNGEN & HILFSFUNKTIONEN
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_superadmins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.platform_superadmins ENABLE ROW LEVEL SECURITY;

-- Helper Function: Prüft ob der aktuelle User Super-Admin ist
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_superadmins
    WHERE user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "Superadmins can read platform_superadmins" ON public.platform_superadmins;
CREATE POLICY "Superadmins can read platform_superadmins"
  ON public.platform_superadmins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_superadmin());

-- Initial-Seeding: support@ki-netic.ch als Super-Admin hinterlegen falls Account existiert
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = 'support@ki-netic.ch' LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.platform_superadmins (user_id, email)
    VALUES (v_user_id, 'support@ki-netic.ch')
    ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id;
  END IF;
END $$;

-- Trigger: Wenn sich support@ki-netic.ch registriert oder verifiziert, sofort Superadmin zuweisen
CREATE OR REPLACE FUNCTION public.trg_auto_assign_superadmin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF lower(NEW.email) = 'support@ki-netic.ch' THEN
    INSERT INTO public.platform_superadmins (user_id, email)
    VALUES (NEW.id, 'support@ki-netic.ch')
    ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_superadmin ON auth.users;
CREATE TRIGGER on_auth_user_created_superadmin
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_auto_assign_superadmin();

-- ------------------------------------------------------------------------------
-- 2. MANDANTEN-ERWEITERUNGEN (TENANTS TABLE)
-- ------------------------------------------------------------------------------
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'professional';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS price_chf NUMERIC(10, 2) DEFAULT 49.00;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (timezone('utc'::text, now()) + interval '14 days');
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'trial';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- Superadmin RLS Policy für Tenants
DROP POLICY IF EXISTS "Superadmins have full access to tenants" ON public.tenants;
CREATE POLICY "Superadmins have full access to tenants"
  ON public.tenants FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- ------------------------------------------------------------------------------
-- 3. SUPPORT-TICKETS & NACHRICHTENVERLAUF
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'general', -- 'question', 'bug', 'billing', 'feature', 'general'
  priority TEXT DEFAULT 'normal',   -- 'low', 'normal', 'high', 'urgent'
  status TEXT DEFAULT 'open',       -- 'open', 'in_progress', 'resolved', 'closed'
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_id ON public.support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenants can view own support tickets" ON public.support_tickets;
CREATE POLICY "Tenants can view own support tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin() OR
    tenant_id = (SELECT tenant_id FROM public.user_roles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Tenants can create own support tickets" ON public.support_tickets;
CREATE POLICY "Tenants can create own support tickets"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_superadmin() OR
    tenant_id = (SELECT tenant_id FROM public.user_roles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Superadmins can update any support ticket" ON public.support_tickets;
CREATE POLICY "Superadmins can update any support ticket"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- Support Ticket Messages
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT,
  is_admin BOOLEAN DEFAULT false,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON public.support_ticket_messages(ticket_id);

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenants and superadmins can view ticket messages" ON public.support_ticket_messages;
CREATE POLICY "Tenants and superadmins can view ticket messages"
  ON public.support_ticket_messages FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin() OR
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_id
      AND st.tenant_id = (SELECT tenant_id FROM public.user_roles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Tenants and superadmins can insert ticket messages" ON public.support_ticket_messages;
CREATE POLICY "Tenants and superadmins can insert ticket messages"
  ON public.support_ticket_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_superadmin() OR
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_id
      AND st.tenant_id = (SELECT tenant_id FROM public.user_roles WHERE id = auth.uid())
    )
  );

-- ------------------------------------------------------------------------------
-- 4. PLATTFORM-LIZENZABRECHNUNG (PLATFORM INVOICES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  amount_chf NUMERIC(10, 2) NOT NULL DEFAULT 49.00,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'paid', 'overdue', 'cancelled'
  due_date DATE DEFAULT (CURRENT_DATE + 30),
  paid_at TIMESTAMPTZ,
  period_start DATE,
  period_end DATE,
  plan_name TEXT DEFAULT 'Kinetic Craft Professional',
  pdf_url TEXT,
  qr_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_invoices_tenant_id ON public.platform_invoices(tenant_id);

ALTER TABLE public.platform_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenants can view own platform invoices" ON public.platform_invoices;
CREATE POLICY "Tenants can view own platform invoices"
  ON public.platform_invoices FOR SELECT
  TO authenticated
  USING (
    public.is_superadmin() OR
    tenant_id = (SELECT tenant_id FROM public.user_roles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Superadmins have full control over platform invoices" ON public.platform_invoices;
CREATE POLICY "Superadmins have full control over platform invoices"
  ON public.platform_invoices FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- ------------------------------------------------------------------------------
-- 5. INTERNES BETREUUNGS-CRM (CRM_TENANT_NOTES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_tenant_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  note_type TEXT DEFAULT 'call', -- 'call', 'meeting', 'email', 'note', 'status_change'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_crm_tenant_notes_tenant_id ON public.crm_tenant_notes(tenant_id);

ALTER TABLE public.crm_tenant_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only superadmins can access crm_tenant_notes" ON public.crm_tenant_notes;
CREATE POLICY "Only superadmins can access crm_tenant_notes"
  ON public.crm_tenant_notes FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- ------------------------------------------------------------------------------
-- 6. RPCS: IMPERSONATION, TENANT MANAGEMENT & KPIS
-- ------------------------------------------------------------------------------

-- RPC 1: Impersonate Tenant (Super-Admin schlüpft in Kunden-Betrieb)
CREATE OR REPLACE FUNCTION public.admin_impersonate_tenant(p_target_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_name TEXT;
BEGIN
  -- 1. Sicherheitsprüfung: Nur Super-Admins erlaubt
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Zugriff verweigert: Nur autorisierte Plattform-Super-Admins können Mandanten übernehmen.';
  END IF;

  -- 2. Prüfen ob Zielmandant existiert
  SELECT name INTO v_tenant_name FROM public.tenants WHERE id = p_target_tenant_id;
  IF v_tenant_name IS NULL THEN
    RAISE EXCEPTION 'Mandant mit ID % existiert nicht.', p_target_tenant_id;
  END IF;

  -- 3. Aktiven tenant_id des Superadmins in user_roles umschalten
  UPDATE public.user_roles
  SET tenant_id = p_target_tenant_id
  WHERE id = auth.uid();

  -- 4. Notiz im Betreuungs-CRM protokollieren
  INSERT INTO public.crm_tenant_notes (tenant_id, author_id, author_name, note_type, content)
  VALUES (
    p_target_tenant_id,
    auth.uid(),
    'Super-Admin Support',
    'status_change',
    'Super-Admin hat sich zu Support-Zwecken in den Mandanten eingeloggt.'
  );

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', p_target_tenant_id,
    'tenant_name', v_tenant_name
  );
END;
$$;

-- RPC 2: Update Tenant Status & Trial Extension
CREATE OR REPLACE FUNCTION public.admin_update_tenant(
  p_tenant_id UUID,
  p_status TEXT DEFAULT NULL,
  p_trial_days_extension INT DEFAULT NULL,
  p_plan TEXT DEFAULT NULL,
  p_price_chf NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_trial_ends_at TIMESTAMPTZ;
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Zugriff verweigert.';
  END IF;

  IF p_trial_days_extension IS NOT NULL AND p_trial_days_extension > 0 THEN
    SELECT COALESCE(trial_ends_at, timezone('utc'::text, now())) + (p_trial_days_extension || ' days')::interval
    INTO v_new_trial_ends_at
    FROM public.tenants WHERE id = p_tenant_id;

    UPDATE public.tenants
    SET trial_ends_at = v_new_trial_ends_at,
        status = CASE WHEN p_status IS NOT NULL THEN p_status ELSE 'trial' END
    WHERE id = p_tenant_id;
  ELSE
    UPDATE public.tenants
    SET status = COALESCE(p_status, status),
        plan = COALESCE(p_plan, plan),
        price_chf = COALESCE(p_price_chf, price_chf)
    WHERE id = p_tenant_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC 3: Plattform KPIs berechnen
CREATE OR REPLACE FUNCTION public.admin_get_platform_kpis()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_tenants INT;
  v_active_tenants INT;
  v_trial_tenants INT;
  v_suspended_tenants INT;
  v_open_tickets INT;
  v_total_kunden INT;
  v_total_rechnungen INT;
  v_mrr NUMERIC;
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Zugriff verweigert.';
  END IF;

  SELECT count(*) INTO v_total_tenants FROM public.tenants;
  SELECT count(*) INTO v_active_tenants FROM public.tenants WHERE status = 'active';
  SELECT count(*) INTO v_trial_tenants FROM public.tenants WHERE status = 'trial';
  SELECT count(*) INTO v_suspended_tenants FROM public.tenants WHERE status IN ('suspended', 'overdue');
  
  SELECT COALESCE(sum(price_chf), 0) INTO v_mrr FROM public.tenants WHERE status = 'active';
  
  SELECT count(*) INTO v_open_tickets FROM public.support_tickets WHERE status IN ('open', 'in_progress');
  SELECT count(*) INTO v_total_kunden FROM public.kunden;
  SELECT count(*) INTO v_total_rechnungen FROM public.rechnungen;

  RETURN jsonb_build_object(
    'total_tenants', v_total_tenants,
    'active_tenants', v_active_tenants,
    'trial_tenants', v_trial_tenants,
    'suspended_tenants', v_suspended_tenants,
    'mrr', v_mrr,
    'open_tickets', v_open_tickets,
    'total_kunden', v_total_kunden,
    'total_rechnungen', v_total_rechnungen
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. SUPERADMIN GLOBAL VIEW POLICIES (Für volle Einsicht)
-- ------------------------------------------------------------------------------
-- Erlaube Superadmin das Lesen von einstellungen, kunden, offerten, rechnungen über alle Mandanten
DROP POLICY IF EXISTS "Superadmins can view all einstellungen" ON public.einstellungen;
CREATE POLICY "Superadmins can view all einstellungen"
  ON public.einstellungen FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "Superadmins can view all user_roles" ON public.user_roles;
CREATE POLICY "Superadmins can view all user_roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());
