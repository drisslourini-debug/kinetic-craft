-- ==============================================================================
-- KINETIC CRAFT - AUDIT-FIX: EINSTELLUNGEN & NUMMERNKREISE VOLLSTÄNDIGKEIT
-- ==============================================================================
-- 1. EINSTELLUNGEN: Schweizer KMU-Kontenrahmen, ESTV-Abrechnung & Brief-Fenster
-- 2. PROJEKTE: Projektnummern-Spalte & Index für lückenlose Nummernkreise (P-1000)
-- ==============================================================================
-- Führe dieses Skript im Supabase SQL Editor aus:
-- https://supabase.com/dashboard/project/fpfdlraqtqtcnmajrcyx/sql
-- ==============================================================================

-- 1. EINSTELLUNGEN: Ergänzung aller im CRM verwendeten Konfigurationsspalten
ALTER TABLE public.einstellungen 
ADD COLUMN IF NOT EXISTS fenster_position TEXT DEFAULT 'rechts',
ADD COLUMN IF NOT EXISTS mwst_methode TEXT DEFAULT 'effektiv',
ADD COLUMN IF NOT EXISTS saldosteuersatz NUMERIC DEFAULT 5.9,
ADD COLUMN IF NOT EXISTS mwst_abrechnungsart TEXT DEFAULT 'vereinbart',
ADD COLUMN IF NOT EXISTS konto_bank TEXT DEFAULT '1020',
ADD COLUMN IF NOT EXISTS konto_debitoren TEXT DEFAULT '1100',
ADD COLUMN IF NOT EXISTS konto_kreditoren TEXT DEFAULT '2000',
ADD COLUMN IF NOT EXISTS konto_ertrag TEXT DEFAULT '3200',
ADD COLUMN IF NOT EXISTS konto_skonto TEXT DEFAULT '3800';

-- 2. PROJEKTE: Projektnummern für lückenlose Zuordnung
ALTER TABLE public.projekte 
ADD COLUMN IF NOT EXISTS projektnummer TEXT;

CREATE INDEX IF NOT EXISTS idx_projekte_projektnummer ON public.projekte(projektnummer);

-- 3. BESTEHENDE PROJEKTE OHNE PROJEKTNUMMER INITIALISIEREN (P-1000, P-1001, ...)
WITH numbered_projekte AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) + 1000 AS nr
  FROM public.projekte
  WHERE projektnummer IS NULL
)
UPDATE public.projekte p
SET projektnummer = 'P-' || np.nr
FROM numbered_projekte np
WHERE p.id = np.id;

-- 4. KONTROLL-ABFRAGE
SELECT 
  'einstellungen' AS tabelle, 
  COUNT(*) AS anzahl,
  'fenster_position, mwst_methode, kmu_konten aktiv' AS status
FROM public.einstellungen
UNION ALL
SELECT 
  'projekte' AS tabelle,
  COUNT(*) AS anzahl,
  COALESCE(string_agg(projektnummer, ', '), 'keine') AS status
FROM public.projekte;
