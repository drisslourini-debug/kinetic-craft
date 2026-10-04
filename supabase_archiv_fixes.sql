-- ============================================================================
-- ATELIER 77 - ARCHIV MODUL SCHEMA & PERFORMANCE ERWEITERUNG
-- ============================================================================
-- Führe dieses Skript im Supabase SQL Editor aus:
-- https://supabase.com/dashboard/project/fpfdlraqtqtcnmajrcyx/sql
-- ============================================================================

-- 1. Spalten zu 'dateien' hinzufügen für bidirektionale Belegverknüpfung & Versionierung
ALTER TABLE dateien
ADD COLUMN IF NOT EXISTS offerte_id BIGINT REFERENCES offerten(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS rechnung_id BIGINT REFERENCES rechnungen(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;

-- 2. Spalten zu 'rechnungen' hinzufügen
ALTER TABLE rechnungen
ADD COLUMN IF NOT EXISTS pdf_url TEXT,
ADD COLUMN IF NOT EXISTS archiviert_am TIMESTAMPTZ;

-- 3. Spalten zu 'offerten' ergänzen (falls noch nicht vorhanden)
ALTER TABLE offerten
ADD COLUMN IF NOT EXISTS archiviert_am TIMESTAMPTZ;

-- 4. Indizes zur Beschleunigung von Archiv-Abfragen
CREATE INDEX IF NOT EXISTS idx_dateien_offerte_id ON dateien(offerte_id);
CREATE INDEX IF NOT EXISTS idx_dateien_rechnung_id ON dateien(rechnung_id);
CREATE INDEX IF NOT EXISTS idx_dateien_kunde_id ON dateien(kunde_id);
CREATE INDEX IF NOT EXISTS idx_dateien_projekt_id ON dateien(projekt_id);
CREATE INDEX IF NOT EXISTS idx_dateien_tenant_id ON dateien(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dateien_kategorie ON dateien(kategorie);
