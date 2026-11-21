-- ==============================================================================
-- KINETIC CRAFT - VOLLSTÄNDIGE DATENBANK-BEREINIGUNG & SAUBERER NEUSTART
-- ==============================================================================
-- ZWECK:
-- 1. Behebt alle Fremdschlüssel-Konflikte (Foreign Key Constraint 23503)
--    zwischen offerten.rechnung_id und rechnungen.offerte_id.
-- 2. Behebt den Spaltenfehler (ERROR 42703) bei support_ticket_messages.
-- 3. Schützt & erhält beide Kern-Identitäten:
--    - Mandanten 1 & 2: «Flo Art – Töpferei» & «Flo Art – Polsterei» (Florence Lourini, lourini@bluewin.ch)
--    - Mandant 3: «Musterfirma» (Amin Lourini, amin.lourini@gmail.com)
-- 4. Bereinigt alle verwaisten Fremd-Mandanten, alte Test-Accounts und Test-Artefakte.
-- ==============================================================================
-- ANLEITUNG:
-- 1. Öffne den Supabase SQL Editor:
--    https://supabase.com/dashboard/project/fpfdlraqtqtcnmajrcyx/sql
-- 2. Lösche den bisherigen Inhalt im Editor komplett.
-- 3. Füge dieses gesamte Skript ein und klicke auf "Run" (grüner Button).
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- SCHRITT 0: REVISIONS-TRIGGER VORÜBERGEHEND DEAKTIVIEREN
-- (Deaktiviert gezielt GeBüV-Löschsperren für Rechnungen während der Bereinigung)
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_rechnung_delete_restriction') THEN
    ALTER TABLE public.rechnungen DISABLE TRIGGER trg_rechnung_delete_restriction;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_rechnung_immutability') THEN
    ALTER TABLE public.rechnungen DISABLE TRIGGER trg_rechnung_immutability;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- SCHRITT 1: ZU SCHÜTZENDE IDENTITÄTEN BESTIMMEN (FLO ART + MUSTERFIRMA)
-- ------------------------------------------------------------------------------
CREATE TEMP TABLE tmp_keep_tenants ON COMMIT DROP AS
SELECT id, name FROM public.tenants
WHERE id IN (
  'f10a2701-0001-4000-8000-000000000001'::uuid, -- Flo Art Töpferei
  'f10a2702-0002-4000-8000-000000000002'::uuid, -- Flo Art Polsterei
  '78d4896d-6288-4f5a-9f4b-b99c9d88cdd4'::uuid  -- Musterfirma Oberaach
)
OR name ILIKE '%Flo Art%'
OR name ILIKE '%Floort%'
OR name ILIKE '%Musterfirma%';

CREATE TEMP TABLE tmp_keep_users ON COMMIT DROP AS
SELECT id, email FROM auth.users
WHERE lower(email) IN (
  'lourini@bluewin.ch',
  'amin.lourini@gmail.com'
);

-- Sicherheitsprüfung: Falls weder Flo Art noch Musterfirma gefunden wurden, sofort abbrechen!
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tmp_keep_tenants) THEN
    RAISE EXCEPTION 'SICHERHEITSABBRUCH: Keine zu schützenden Mandanten (Flo Art oder Musterfirma) gefunden! Transaktion abgebrochen.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tmp_keep_users) THEN
    RAISE EXCEPTION 'SICHERHEITSABBRUCH: Weder lourini@bluewin.ch noch amin.lourini@gmail.com in auth.users gefunden! Transaktion abgebrochen.';
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- SCHRITT 2: ZIRKULÄRE FREMDSCHLÜSSEL ENTKOPPELN & DDL ABSICHERN
-- (Verhindert garantiert ERROR 23503 offerten_rechnung_id_fkey)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  -- 2.1. Bestehende Beleg-Verknüpfungen auf NULL setzen
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'offerten' AND column_name = 'rechnung_id') THEN
    UPDATE public.offerten SET rechnung_id = NULL WHERE rechnung_id IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rechnungen' AND column_name = 'offerte_id') THEN
    UPDATE public.rechnungen SET offerte_id = NULL WHERE offerte_id IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dateien' AND column_name = 'rechnung_id') THEN
    UPDATE public.dateien SET rechnung_id = NULL, offerte_id = NULL WHERE rechnung_id IS NOT NULL OR offerte_id IS NOT NULL;
  END IF;

  -- 2.2. Alle Foreign Key Constraints auf offerten.rechnung_id dynamisch entfernen und mit ON DELETE SET NULL neu anlegen
  FOR r IN (
    SELECT tc.constraint_name 
    FROM information_schema.table_constraints tc 
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public' 
      AND tc.table_name = 'offerten' 
      AND kcu.column_name = 'rechnung_id' 
      AND tc.constraint_type = 'FOREIGN KEY'
  ) LOOP
    EXECUTE 'ALTER TABLE public.offerten DROP CONSTRAINT ' || quote_ident(r.constraint_name);
  END LOOP;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'offerten' AND column_name = 'rechnung_id') THEN
    ALTER TABLE public.offerten ADD CONSTRAINT offerten_rechnung_id_fkey 
      FOREIGN KEY (rechnung_id) REFERENCES public.rechnungen(id) ON DELETE SET NULL;
  END IF;

  -- 2.3. Alle Foreign Key Constraints auf rechnungen.offerte_id dynamisch mit ON DELETE SET NULL absichern
  FOR r IN (
    SELECT tc.constraint_name 
    FROM information_schema.table_constraints tc 
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public' 
      AND tc.table_name = 'rechnungen' 
      AND kcu.column_name = 'offerte_id' 
      AND tc.constraint_type = 'FOREIGN KEY'
  ) LOOP
    EXECUTE 'ALTER TABLE public.rechnungen DROP CONSTRAINT ' || quote_ident(r.constraint_name);
  END LOOP;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rechnungen' AND column_name = 'offerte_id') THEN
    ALTER TABLE public.rechnungen ADD CONSTRAINT rechnungen_offerte_id_fkey 
      FOREIGN KEY (offerte_id) REFERENCES public.offerten(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- SCHRITT 3: FREMDE BELEGE, DOKUMENTE & STAMMDATEN LÖSCHEN
-- ------------------------------------------------------------------------------

-- 3a. Dateien & Anhänge (nur Nicht-Geschützte)
DELETE FROM public.dateien
WHERE tenant_id IS NULL OR tenant_id NOT IN (SELECT id FROM tmp_keep_tenants);

-- 3b. Termine & Kalendereinträge
DELETE FROM public.termine
WHERE tenant_id IS NULL OR tenant_id NOT IN (SELECT id FROM tmp_keep_tenants);

-- 3c. Ausgaben
DELETE FROM public.ausgaben
WHERE tenant_id IS NULL OR tenant_id NOT IN (SELECT id FROM tmp_keep_tenants);

-- 3d. Rechnungen (jetzt ohne Fremdschlüssel-Blockaden löschbar)
DELETE FROM public.rechnungen
WHERE tenant_id IS NULL OR tenant_id NOT IN (SELECT id FROM tmp_keep_tenants);

-- 3e. Offerten
DELETE FROM public.offerten
WHERE tenant_id IS NULL OR tenant_id NOT IN (SELECT id FROM tmp_keep_tenants);

-- 3f. Projekte
DELETE FROM public.projekte
WHERE tenant_id IS NULL OR tenant_id NOT IN (SELECT id FROM tmp_keep_tenants);

-- 3g. Kunden
DELETE FROM public.kunden
WHERE tenant_id IS NULL OR tenant_id NOT IN (SELECT id FROM tmp_keep_tenants);

-- 3h. Leistungskatalog (Leistungen & Kategorien fremder Mandanten)
DELETE FROM public.katalog_leistungen
WHERE tenant_id IS NULL OR tenant_id NOT IN (SELECT id FROM tmp_keep_tenants);

DELETE FROM public.katalog_kategorien
WHERE tenant_id IS NULL OR tenant_id NOT IN (SELECT id FROM tmp_keep_tenants);

-- 3i. Nummernkreise (Zähler fremder Mandanten)
DELETE FROM public.tenant_document_counters
WHERE tenant_id NOT IN (SELECT id FROM tmp_keep_tenants);

-- 3j. Support-Tickets & Plattform CRM (dynamisch auf tenant_id / ticket_id geprüft - ERROR 42703 FIX)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'support_ticket_messages') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'support_ticket_messages' AND column_name = 'tenant_id') THEN
      EXECUTE 'DELETE FROM public.support_ticket_messages WHERE tenant_id IS NULL OR tenant_id NOT IN (SELECT id FROM tmp_keep_tenants)';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'support_ticket_messages' AND column_name = 'ticket_id') THEN
      EXECUTE 'DELETE FROM public.support_ticket_messages WHERE ticket_id NOT IN (SELECT id FROM public.support_tickets WHERE tenant_id IN (SELECT id FROM tmp_keep_tenants))';
    ELSE
      EXECUTE 'DELETE FROM public.support_ticket_messages';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'support_tickets') THEN
    DELETE FROM public.support_tickets WHERE tenant_id IS NULL OR tenant_id NOT IN (SELECT id FROM tmp_keep_tenants);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'crm_tenant_notes') THEN
    DELETE FROM public.crm_tenant_notes WHERE tenant_id IS NULL OR tenant_id NOT IN (SELECT id FROM tmp_keep_tenants);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'platform_invoices') THEN
    DELETE FROM public.platform_invoices WHERE tenant_id IS NULL OR tenant_id NOT IN (SELECT id FROM tmp_keep_tenants);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'platform_superadmins') THEN
    DELETE FROM public.platform_superadmins WHERE user_id NOT IN (SELECT id FROM tmp_keep_users);
  END IF;
END $$;

-- 3k. Einstellungen (alle fremden Firmen-Einstellungen löschen)
DELETE FROM public.einstellungen
WHERE tenant_id IS NULL OR tenant_id NOT IN (SELECT id FROM tmp_keep_tenants);

-- 3l. Mandanten-Zuordnungen & Rollen
DELETE FROM public.user_tenants
WHERE tenant_id NOT IN (SELECT id FROM tmp_keep_tenants)
   OR user_id NOT IN (SELECT id FROM tmp_keep_users);

DELETE FROM public.user_roles
WHERE id NOT IN (SELECT id FROM tmp_keep_users);

-- 3m. Alle fremden Mandanten (Tenants) löschen
DELETE FROM public.tenants
WHERE id NOT IN (SELECT id FROM tmp_keep_tenants);

-- 3n. Storage Objects (anhange Bucket) von Nicht-Geschützten bereinigen
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    DELETE FROM storage.objects
    WHERE bucket_id = 'anhange'
      AND (
        (storage.foldername(name))[1] NOT IN (SELECT id::text FROM tmp_keep_tenants)
        OR owner NOT IN (SELECT id FROM tmp_keep_users)
      );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 3o. Alle fremden Benutzer aus auth.users entfernen
DELETE FROM auth.identities
WHERE user_id NOT IN (SELECT id FROM tmp_keep_users);

DELETE FROM auth.users
WHERE id NOT IN (SELECT id FROM tmp_keep_users);

-- ------------------------------------------------------------------------------
-- SCHRITT 4: TEST-ARTEFAKTE SPEZIELL INNERHALB VON FLO ART BEREINIGEN
-- (Lässt Musterfirma komplett unberührt!)
-- ------------------------------------------------------------------------------
CREATE TEMP TABLE tmp_floart_tenants ON COMMIT DROP AS
SELECT id FROM public.tenants
WHERE id IN (
  'f10a2701-0001-4000-8000-000000000001'::uuid,
  'f10a2702-0002-4000-8000-000000000002'::uuid
)
OR name ILIKE '%Flo Art%'
OR name ILIKE '%Floort%';

-- 4a. Flo Art Test-Rechnungen löschen (behält nur Originalmuster RE-TOP-1001 & RE-POL-1001)
DELETE FROM public.rechnungen
WHERE tenant_id IN (SELECT id FROM tmp_floart_tenants)
  AND rechnung_nr NOT IN ('RE-TOP-1001', 'RE-POL-1001');

-- 4b. Flo Art Test-Offerten löschen
DELETE FROM public.offerten
WHERE tenant_id IN (SELECT id FROM tmp_floart_tenants)
  AND NOT (
    daten->>'titel' ILIKE '%Münstergasse%'
    OR daten->>'titel' ILIKE '%Ohrensessel%'
    OR daten->>'titel' ILIKE '%Keramik-Kollektion%'
    OR daten->>'titel' ILIKE '%Restauration%'
  );

-- 4c. Flo Art Test-Projekte löschen
DELETE FROM public.projekte
WHERE tenant_id IN (SELECT id FROM tmp_floart_tenants)
  AND NOT (
    name ILIKE '%Keramikschalen%'
    OR name ILIKE '%Ohrensessel%'
  );

-- 4d. Flo Art Test-Kunden löschen
DELETE FROM public.kunden
WHERE tenant_id IN (SELECT id FROM tmp_floart_tenants)
  AND NOT (
    name ILIKE '%Galerie Münstergasse%'
    OR name ILIKE '%Von Graffenried%'
  );

-- 4e. Dokumenten-Zähler für Flo Art zurücksetzen
UPDATE public.tenant_document_counters
SET current_number = 1000
WHERE tenant_id IN (SELECT id FROM tmp_floart_tenants);

-- ------------------------------------------------------------------------------
-- SCHRITT 5: ROLLEN & MANDANTEN-ZUORDNUNGEN FIXIEREN
-- ------------------------------------------------------------------------------
-- 5a. Florence Lourini (lourini@bluewin.ch) -> Flo Art Töpferei als Standard
UPDATE public.user_roles
SET tenant_id = 'f10a2701-0001-4000-8000-000000000001',
    role = 'admin',
    user_name = 'Florence Lourini'
WHERE id IN (SELECT id FROM auth.users WHERE lower(email) = 'lourini@bluewin.ch');

INSERT INTO public.user_tenants (user_id, tenant_id, role, is_default)
SELECT u.id, 'f10a2701-0001-4000-8000-000000000001'::uuid, 'admin', true
FROM auth.users u WHERE lower(u.email) = 'lourini@bluewin.ch'
ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_default = true;

INSERT INTO public.user_tenants (user_id, tenant_id, role, is_default)
SELECT u.id, 'f10a2702-0002-4000-8000-000000000002'::uuid, 'admin', false
FROM auth.users u WHERE lower(u.email) = 'lourini@bluewin.ch'
ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_default = false;

-- 5b. Amin Lourini (amin.lourini@gmail.com) -> Musterfirma als Standard
UPDATE public.user_roles
SET tenant_id = '78d4896d-6288-4f5a-9f4b-b99c9d88cdd4',
    role = 'admin',
    user_name = 'Amin Lourini'
WHERE id IN (SELECT id FROM auth.users WHERE lower(email) = 'amin.lourini@gmail.com');

INSERT INTO public.user_tenants (user_id, tenant_id, role, is_default)
SELECT u.id, '78d4896d-6288-4f5a-9f4b-b99c9d88cdd4'::uuid, 'admin', true
FROM auth.users u WHERE lower(u.email) = 'amin.lourini@gmail.com'
ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_default = true;

-- ------------------------------------------------------------------------------
-- SCHRITT 6: REVISIONS-TRIGGER WIEDER AKTIVIEREN
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_rechnung_delete_restriction') THEN
    ALTER TABLE public.rechnungen ENABLE TRIGGER trg_rechnung_delete_restriction;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_rechnung_immutability') THEN
    ALTER TABLE public.rechnungen ENABLE TRIGGER trg_rechnung_immutability;
  END IF;
END $$;

COMMIT;

-- ------------------------------------------------------------------------------
-- SCHRITT 7: KONTROLL-ABFRAGE (ZEIGT DEN SAUBEREN ENDSTAND AN)
-- ------------------------------------------------------------------------------
SELECT 'auth.users' AS tabelle, COUNT(*) AS anzahl, COALESCE(string_agg(email, ', '), 'keine') AS details FROM auth.users
UNION ALL
SELECT 'public.tenants', COUNT(*), COALESCE(string_agg(name, ', '), 'keine') FROM public.tenants
UNION ALL
SELECT 'public.user_tenants', COUNT(*), '' FROM public.user_tenants
UNION ALL
SELECT 'public.user_roles', COUNT(*), COALESCE(string_agg(user_name, ', '), 'keine') FROM public.user_roles
UNION ALL
SELECT 'public.einstellungen', COUNT(*), COALESCE(string_agg(firmenname, ', '), 'keine') FROM public.einstellungen
UNION ALL
SELECT 'public.kunden', COUNT(*), COALESCE(string_agg(name, ', '), 'keine') FROM public.kunden
UNION ALL
SELECT 'public.projekte', COUNT(*), COALESCE(string_agg(name, ', '), 'keine') FROM public.projekte
UNION ALL
SELECT 'public.offerten', COUNT(*), '' FROM public.offerten
UNION ALL
SELECT 'public.rechnungen', COUNT(*), COALESCE(string_agg(rechnung_nr, ', '), 'keine') FROM public.rechnungen
UNION ALL
SELECT 'public.katalog_leistungen', COUNT(*), '' FROM public.katalog_leistungen;
