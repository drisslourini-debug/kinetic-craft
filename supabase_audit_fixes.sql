-- ============================================================================
-- ATELIER 77 - SUPABASE AUDIT REPAIR SCRIPT
-- ============================================================================
-- Führe dieses Skript im Supabase SQL Editor aus:
-- https://supabase.com/dashboard/project/fpfdlraqtqtcnmajrcyx/sql
-- ============================================================================

-- 1. DATEIEN-TABELLE MANDANTENFÄHIG MACHEN & RLS AKTIVIEREN
ALTER TABLE dateien 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Bestehende Dateien ihren Mandanten zuweisen
UPDATE dateien d
SET tenant_id = k.tenant_id
FROM kunden k
WHERE d.kunde_id = k.id AND d.tenant_id IS NULL;

UPDATE dateien d
SET tenant_id = p.tenant_id
FROM projekte p
WHERE d.projekt_id = p.id AND d.tenant_id IS NULL;

UPDATE dateien 
SET tenant_id = 'ce510545-c59b-4f0d-b89b-89f756cbb378'
WHERE tenant_id IS NULL;

-- Trigger für automatisches Befüllen von tenant_id bei Uploads
CREATE OR REPLACE FUNCTION public.set_dateien_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id INTO NEW.tenant_id FROM public.user_roles WHERE id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_dateien_tenant_id ON dateien;
CREATE TRIGGER trg_dateien_tenant_id
BEFORE INSERT ON dateien
FOR EACH ROW EXECUTE FUNCTION public.set_dateien_tenant_id();

-- RLS Policies für dateien einrichten
ALTER TABLE dateien ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tenant files" ON dateien;
CREATE POLICY "Users can view own tenant files" ON dateien
FOR SELECT USING (
  tenant_id = (SELECT tenant_id FROM public.user_roles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Users can insert own tenant files" ON dateien;
CREATE POLICY "Users can insert own tenant files" ON dateien
FOR INSERT WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.user_roles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update own tenant files" ON dateien;
CREATE POLICY "Users can update own tenant files" ON dateien
FOR UPDATE USING (
  tenant_id = (SELECT tenant_id FROM public.user_roles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Users can delete own tenant files" ON dateien;
CREATE POLICY "Users can delete own tenant files" ON dateien
FOR DELETE USING (
  tenant_id = (SELECT tenant_id FROM public.user_roles WHERE id = auth.uid())
);

-- 2. TENANTS TABLE RLS ANPASSEN
DROP POLICY IF EXISTS "Users can view own tenant" ON tenants;
CREATE POLICY "Users can view own tenant" ON tenants
FOR SELECT USING (
  id = (SELECT tenant_id FROM public.user_roles WHERE id = auth.uid())
);

-- 3. EINSTELLUNGEN BEREINIGEN & DUPLIKATE VERHINDERN
DELETE FROM einstellungen 
WHERE id = 11 AND tenant_id = '5555956a-c0a1-46a1-91b6-21c6c67b83f8';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'einstellungen_tenant_id_unique'
  ) THEN
    ALTER TABLE einstellungen ADD CONSTRAINT einstellungen_tenant_id_unique UNIQUE (tenant_id);
  END IF;
END $$;

-- 4. LEANDRO LÜTHI DEN VOLLSTÄNDIGEN PRODUKTIVDATEN ZUORDNEN
UPDATE tenants 
SET name = 'Atelier 77', status = 'active'
WHERE id = 'ce510545-c59b-4f0d-b89b-89f756cbb378';

UPDATE user_roles 
SET tenant_id = 'ce510545-c59b-4f0d-b89b-89f756cbb378'
WHERE id = '2bbe5282-d4ad-4f9a-ab29-9d36928d60e7';
