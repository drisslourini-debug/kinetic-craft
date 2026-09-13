-- ============================================================================
-- ATELIER 77 - MIGRATION: EINSTELLUNGEN & KUNDENDATEN ERWEITERUNG
-- ============================================================================

-- 1. KUNDEN-TABELLE: Neue Spalten
ALTER TABLE kunden 
ADD COLUMN IF NOT EXISTS anrede text DEFAULT 'Firma',
ADD COLUMN IF NOT EXISTS kundennummer text,
ADD COLUMN IF NOT EXISTS land text DEFAULT 'Schweiz';

-- Index für schnelle Kundennummer-Suche
CREATE INDEX IF NOT EXISTS idx_kunden_kundennummer ON kunden(kundennummer);

-- 2. EINSTELLUNGEN-TABELLE: Neue Spalten für Adressen & Nummernkreise
ALTER TABLE einstellungen 
ADD COLUMN IF NOT EXISTS plz text,
ADD COLUMN IF NOT EXISTS ort text,
ADD COLUMN IF NOT EXISTS land text DEFAULT 'Schweiz',
ADD COLUMN IF NOT EXISTS startnummer_kunden integer DEFAULT 1000,
ADD COLUMN IF NOT EXISTS prefix_kunden text DEFAULT 'K-',
ADD COLUMN IF NOT EXISTS startnummer_projekte integer DEFAULT 1000,
ADD COLUMN IF NOT EXISTS prefix_projekte text DEFAULT 'P-';

-- 3. BESTEHENDE DATEN IN EINSTELLUNGEN MIGRIEREN (plz_ort -> plz & ort)
UPDATE einstellungen 
SET 
  plz = COALESCE(plz, split_part(trim(plz_ort), ' ', 1)),
  ort = COALESCE(ort, NULLIF(trim(substring(trim(plz_ort) from '^[0-9]+\\s*(.*)$')), ''))
WHERE plz_ort IS NOT NULL AND (plz IS NULL OR ort IS NULL);

-- 4. BESTEHENDE KUNDEN OHNE KUNDENNUMMER NUMMERIEREN
WITH numbered_kunden AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) + 1000 as nr
  FROM kunden
  WHERE kundennummer IS NULL
)
UPDATE kunden k
SET kundennummer = 'K-' || nk.nr
FROM numbered_kunden nk
WHERE k.id = nk.id;
