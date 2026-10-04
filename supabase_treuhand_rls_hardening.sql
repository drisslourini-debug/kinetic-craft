-- ==============================================================================
-- KINETIC CRAFT (ATELIER 77 CRM) - ROLLENBASIERTE RLS-POLICIES (SEC-04)
-- Serverseitige Durchsetzung des Rollenmodells (Admin, Monteur, Treuhand)
-- ==============================================================================

-- 1. Hilfsfunktion zur Ermittlung der Benutzerrolle
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.user_roles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Hilfsfunktion zur Ermittlung der Mandanten-ID
CREATE OR REPLACE FUNCTION public.get_current_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT tenant_id FROM public.user_roles WHERE id = auth.uid() LIMIT 1;
$$;

-- ==============================================================================
-- 3. RECHNUNGEN: Treuhand darf nur lesen, nicht schreiben/löschen
-- ==============================================================================
ALTER TABLE public.rechnungen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rechnungen select policy" ON public.rechnungen;
CREATE POLICY "Rechnungen select policy" ON public.rechnungen
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_current_user_tenant_id()
  -- Treuhand, Admin und Monteur dürfen Rechnungen ihres Mandanten lesen
);

DROP POLICY IF EXISTS "Rechnungen write policy" ON public.rechnungen;
CREATE POLICY "Rechnungen write policy" ON public.rechnungen
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.get_current_user_tenant_id()
  AND public.get_current_user_role() != 'treuhand' -- Treuhänder dürfen keine Rechnungen anlegen
);

DROP POLICY IF EXISTS "Rechnungen update policy" ON public.rechnungen;
CREATE POLICY "Rechnungen update policy" ON public.rechnungen
FOR UPDATE
TO authenticated
USING (
  tenant_id = public.get_current_user_tenant_id()
  AND public.get_current_user_role() != 'treuhand' -- Treuhänder dürfen Rechnungen nicht bearbeiten
);

DROP POLICY IF EXISTS "Rechnungen delete policy" ON public.rechnungen;
CREATE POLICY "Rechnungen delete policy" ON public.rechnungen
FOR DELETE
TO authenticated
USING (
  tenant_id = public.get_current_user_tenant_id()
  AND public.get_current_user_role() != 'treuhand' -- Treuhänder dürfen Rechnungen nicht löschen
);

-- ==============================================================================
-- 4. AUSGABEN: Treuhand darf nur lesen; Monteur darf Ausgaben weder sehen noch schreiben
-- ==============================================================================
ALTER TABLE public.ausgaben ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ausgaben select policy" ON public.ausgaben;
CREATE POLICY "Ausgaben select policy" ON public.ausgaben
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_current_user_tenant_id()
  AND public.get_current_user_role() IN ('admin', 'treuhand') -- Monteure sehen keine Finanzdaten
);

DROP POLICY IF EXISTS "Ausgaben write policy" ON public.ausgaben;
CREATE POLICY "Ausgaben write policy" ON public.ausgaben
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.get_current_user_tenant_id()
  AND public.get_current_user_role() = 'admin' -- Nur Admins dürfen Ausgaben buchen
);

DROP POLICY IF EXISTS "Ausgaben update policy" ON public.ausgaben;
CREATE POLICY "Ausgaben update policy" ON public.ausgaben
FOR UPDATE
TO authenticated
USING (
  tenant_id = public.get_current_user_tenant_id()
  AND public.get_current_user_role() = 'admin'
);

DROP POLICY IF EXISTS "Ausgaben delete policy" ON public.ausgaben;
CREATE POLICY "Ausgaben delete policy" ON public.ausgaben
FOR DELETE
TO authenticated
USING (
  tenant_id = public.get_current_user_tenant_id()
  AND public.get_current_user_role() = 'admin'
);

-- ==============================================================================
-- 5. KUNDEN: Treuhand darf nur lesen; Bearbeitung nur durch Admin/Monteur
-- ==============================================================================
ALTER TABLE public.kunden ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kunden write restriction for treuhand" ON public.kunden;
CREATE POLICY "Kunden write restriction for treuhand" ON public.kunden
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.get_current_user_tenant_id()
  AND public.get_current_user_role() != 'treuhand'
);

DROP POLICY IF EXISTS "Kunden update restriction for treuhand" ON public.kunden;
CREATE POLICY "Kunden update restriction for treuhand" ON public.kunden
FOR UPDATE
TO authenticated
USING (
  tenant_id = public.get_current_user_tenant_id()
  AND public.get_current_user_role() != 'treuhand'
);

DROP POLICY IF EXISTS "Kunden delete restriction for treuhand" ON public.kunden;
CREATE POLICY "Kunden delete restriction for treuhand" ON public.kunden
FOR DELETE
TO authenticated
USING (
  tenant_id = public.get_current_user_tenant_id()
  AND public.get_current_user_role() = 'admin' -- Nur Admins dürfen Kunden löschen
);
