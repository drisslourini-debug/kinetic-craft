-- ============================================================================
-- ATELIER 77 - BENUTZER-ROLLEN & MANDANTEN-ZUWEISUNG REPARATUR
-- ============================================================================
-- Führe dieses Skript im Supabase SQL Editor aus:
-- https://supabase.com/dashboard/project/fpfdlraqtqtcnmajrcyx/sql
-- ============================================================================

DO $$
DECLARE
  v_tenant_id UUID := 'ce510545-c59b-4f0d-b89b-89f756cbb378';
  v_amin_id UUID;
BEGIN
  -- 1. Sicherstellen, dass Atelier 77 Mandant existiert und aktiv ist
  INSERT INTO tenants (id, name, status)
  VALUES (v_tenant_id, 'Atelier 77', 'active')
  ON CONFLICT (id) DO UPDATE SET name = 'Atelier 77', status = 'active';

  -- 2. Amin (amin.lourini@gmail.com) dem Atelier 77 Mandanten als Admin zuweisen
  SELECT id INTO v_amin_id FROM auth.users WHERE email = 'amin.lourini@gmail.com' LIMIT 1;
  IF v_amin_id IS NOT NULL THEN
    INSERT INTO user_roles (id, tenant_id, role, user_name)
    VALUES (v_amin_id, v_tenant_id, 'admin', 'Amin Lourini')
    ON CONFLICT (id) DO UPDATE 
    SET tenant_id = v_tenant_id, role = 'admin', user_name = 'Amin Lourini';
    RAISE NOTICE 'Amin Lourini erfolgreich als Admin zugewiesen.';
  ELSE
    RAISE NOTICE 'amin.lourini@gmail.com wurde noch nicht in auth.users gefunden.';
  END IF;

  -- 3. Alle weiteren auth.users ohne user_roles automatisch Atelier 77 zuweisen
  INSERT INTO user_roles (id, tenant_id, role, user_name)
  SELECT 
    u.id, 
    v_tenant_id, 
    'admin', 
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
  FROM auth.users u
  LEFT JOIN user_roles ur ON u.id = ur.id
  WHERE ur.id IS NULL
  ON CONFLICT (id) DO UPDATE 
  SET tenant_id = EXCLUDED.tenant_id, role = EXCLUDED.role;

END $$;

-- 4. Automatischer Trigger für zukünftige Benutzer-Registrierungen
-- Verhindert, dass neue Benutzer ohne Mandant dastehen und RLS-Fehler erhalten
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_default_tenant_id UUID := 'ce510545-c59b-4f0d-b89b-89f756cbb378';
BEGIN
  INSERT INTO public.user_roles (id, tenant_id, role, user_name)
  VALUES (
    NEW.id,
    v_default_tenant_id,
    'admin',
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
