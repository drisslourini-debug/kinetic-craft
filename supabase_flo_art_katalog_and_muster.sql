-- ==============================================================================
-- KINETIC CRAFT - MUSTER-KATALOGE & STANDARD-DOKUMENTE FÜR FLO ART
-- ==============================================================================
-- 1. Tabellenspalten & RLS für katalog_kategorien & katalog_leistungen
-- 2. Vollständiger Leistungskatalog für «Flo Art – Töpferei» (Kurse, Keramik, Brennen)
-- 3. Vollständiger Leistungskatalog für «Flo Art – Polsterei» (Polstern, Restauration, Stoffe)
-- 4. Standard Offerten & Rechnungen für beide Betriebe
-- ==============================================================================
-- Führe dieses Skript im Supabase SQL Editor aus:
-- https://supabase.com/dashboard/project/fpfdlraqtqtcnmajrcyx/sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- SCHRITT 0: SPALTEN & RLS FÜR KATALOG-TABELLEN
-- ------------------------------------------------------------------------------
ALTER TABLE public.katalog_kategorien ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.katalog_leistungen ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.katalog_leistungen ADD COLUMN IF NOT EXISTS ertragskonto TEXT DEFAULT '3400 Dienstleistungserlöse';
ALTER TABLE public.katalog_leistungen ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- RLS aktivieren & mandantenabhängig absichern
ALTER TABLE public.katalog_kategorien ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.katalog_leistungen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Katalog kategorien tenant policy" ON public.katalog_kategorien;
CREATE POLICY "Katalog kategorien tenant policy" ON public.katalog_kategorien
FOR ALL TO authenticated
USING (
  tenant_id IS NULL OR tenant_id = (SELECT tenant_id FROM public.user_roles WHERE id = auth.uid())
)
WITH CHECK (
  tenant_id IS NULL OR tenant_id = (SELECT tenant_id FROM public.user_roles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Katalog leistungen tenant policy" ON public.katalog_leistungen;
CREATE POLICY "Katalog leistungen tenant policy" ON public.katalog_leistungen
FOR ALL TO authenticated
USING (
  tenant_id IS NULL OR tenant_id = (SELECT tenant_id FROM public.user_roles WHERE id = auth.uid())
)
WITH CHECK (
  tenant_id IS NULL OR tenant_id = (SELECT tenant_id FROM public.user_roles WHERE id = auth.uid())
);

-- Trigger: Automatische Tenant-Zuweisung bei Neuanlage im Katalog
CREATE OR REPLACE FUNCTION public.set_katalog_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id INTO NEW.tenant_id FROM public.user_roles WHERE id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_katalog_kategorien_tenant_id ON public.katalog_kategorien;
CREATE TRIGGER trg_katalog_kategorien_tenant_id
BEFORE INSERT ON public.katalog_kategorien
FOR EACH ROW EXECUTE FUNCTION public.set_katalog_tenant_id();

DROP TRIGGER IF EXISTS trg_katalog_leistungen_tenant_id ON public.katalog_leistungen;
CREATE TRIGGER trg_katalog_leistungen_tenant_id
BEFORE INSERT ON public.katalog_leistungen
FOR EACH ROW EXECUTE FUNCTION public.set_katalog_tenant_id();

-- ------------------------------------------------------------------------------
-- SCHRITT 1: MUSTER-KATALOGE BEFÜLLEN
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_toepferei_id UUID := 'f10a2701-0001-4000-8000-000000000001';
  v_polsterei_id UUID := 'f10a2702-0002-4000-8000-000000000002';

  -- Kategorien Töpferei
  v_kat_top_kurse BIGINT;
  v_kat_top_unikate BIGINT;
  v_kat_top_service BIGINT;

  -- Kategorien Polsterei
  v_kat_pol_arbeiten BIGINT;
  v_kat_pol_restaur BIGINT;
  v_kat_pol_stoffe BIGINT;

  -- IDs für Demo-Rechnungen
  v_kunde_top_id BIGINT;
  v_projekt_top_id BIGINT;
  v_kunde_pol_id BIGINT;
  v_projekt_pol_id BIGINT;
BEGIN

  -- ----------------------------------------------------------------------------
  -- 1. KATALOG TÖPFEREI (Bern)
  -- ----------------------------------------------------------------------------
  -- Bestehende Töpferei-Kategorien bereinigen (idempotent)
  DELETE FROM public.katalog_kategorien WHERE tenant_id = v_toepferei_id;

  -- 1a. Kategorie: Töpferkurse & Workshops
  INSERT INTO public.katalog_kategorien (tenant_id, name, sort_order)
  VALUES (v_toepferei_id, 'Töpferkurse & Workshops', 1)
  RETURNING id INTO v_kat_top_kurse;

  INSERT INTO public.katalog_leistungen (tenant_id, kategorie_id, beschreibung, einheit, einzelpreis, sort_order, ertragskonto)
  VALUES 
    (v_toepferei_id, v_kat_top_kurse, 'Schnupperkurs Töpfern (2.5 Std. Einführung an der Scheibe & Handaufbau, inkl. Material & 2 Brände)', 'Person', 120.00, 1, '3400 Kurs- & Dienstleistungserlöse'),
    (v_toepferei_id, v_kat_top_kurse, 'Intensiv-Drehkurs an der Scheibe (Halbtag 4 Std., Zentrieren, Drehen & Abdrehen inkl. 4 Werkstücke)', 'Person', 240.00, 2, '3400 Kurs- & Dienstleistungserlöse'),
    (v_toepferei_id, v_kat_top_kurse, 'Teamevent & Firmen-Workshop Keramik (3 Std. kreativer Anlass bis 8 Pers. inkl. Material & Apéro)', 'Pauschal', 680.00, 3, '3400 Kurs- & Dienstleistungserlöse'),
    (v_toepferei_id, v_kat_top_kurse, 'Glasur-Workshop & Veredelung (2 Std., Craquelé-, Pinsel- & Tauchglasuren auf geschrühte Rohlinge)', 'Person', 85.00, 4, '3400 Kurs- & Dienstleistungserlöse');

  -- 1b. Kategorie: Keramik-Unikate & Kollektion
  INSERT INTO public.katalog_kategorien (tenant_id, name, sort_order)
  VALUES (v_toepferei_id, 'Handgemachte Keramik & Unikate', 2)
  RETURNING id INTO v_kat_top_unikate;

  INSERT INTO public.katalog_leistungen (tenant_id, kategorie_id, beschreibung, einheit, einzelpreis, sort_order, ertragskonto)
  VALUES 
    (v_toepferei_id, v_kat_top_unikate, 'Keramikschale gross "Teal Glaze" handgedreht (Steinzeug lebensmittelecht hochgebrannt, Ø 24–28cm)', 'Stk', 85.00, 1, '3200 Warenertrag Handwerk'),
    (v_toepferei_id, v_kat_top_unikate, 'Cappuccino-Becher handgedreht (Steinzeug seidenmatt, ca. 280ml, spülmaschinenfest)', 'Stk', 32.00, 2, '3200 Warenertrag Handwerk'),
    (v_toepferei_id, v_kat_top_unikate, 'Design-Vase organische Form mit Craquelé-Effekt (Unikat, von Hand modelliert & glasiert)', 'Stk', 140.00, 3, '3200 Warenertrag Handwerk'),
    (v_toepferei_id, v_kat_top_unikate, 'Keramik-Wandrelief / Skulptur nach Kundenwunsch (Massanfertigung für Wohn- & Geschäftsräume)', 'Stk', 450.00, 4, '3200 Warenertrag Handwerk');

  -- 1c. Kategorie: Brenn- & Atelierservice
  INSERT INTO public.katalog_kategorien (tenant_id, name, sort_order)
  VALUES (v_toepferei_id, 'Brennservice & Werkstattnutzung', 3)
  RETURNING id INTO v_kat_top_service;

  INSERT INTO public.katalog_leistungen (tenant_id, kategorie_id, beschreibung, einheit, einzelpreis, sort_order, ertragskonto)
  VALUES 
    (v_toepferei_id, v_kat_top_service, 'Rohbrand / Schrühbrand 950°C (schonende Trocknung & Brand, Abrechnung nach Gewicht)', 'kg', 16.00, 1, '3400 Dienstleistungserlöse'),
    (v_toepferei_id, v_kat_top_service, 'Glattbrand / Steinzeug-Hochbrand 1240°C (inkl. Ofenplatten-Schutz & Qualitätskontrolle)', 'kg', 22.00, 2, '3400 Dienstleistungserlöse'),
    (v_toepferei_id, v_kat_top_service, 'Offener Atelierplatz / Scheibennutzung (Halbtag, Werkzeuge & Gipsformen frei verfügbar)', 'Halbtag', 45.00, 3, '3400 Dienstleistungserlöse');

  -- ----------------------------------------------------------------------------
  -- 2. KATALOG POLSTEREI (Ittigen)
  -- ----------------------------------------------------------------------------
  DELETE FROM public.katalog_kategorien WHERE tenant_id = v_polsterei_id;

  -- 2a. Kategorie: Polsterarbeiten & Neubezug
  INSERT INTO public.katalog_kategorien (tenant_id, name, sort_order)
  VALUES (v_polsterei_id, 'Polsterarbeiten & Neubezug', 1)
  RETURNING id INTO v_kat_pol_arbeiten;

  INSERT INTO public.katalog_leistungen (tenant_id, kategorie_id, beschreibung, einheit, einzelpreis, sort_order, ertragskonto)
  VALUES 
    (v_polsterei_id, v_kat_pol_arbeiten, 'Sessel komplett neu aufpolstern & beziehen (Demontage Altpolster, Gurten spannen, Federkorb & Neubezug)', 'Stk', 780.00, 1, '3400 Polstererlöse'),
    (v_polsterei_id, v_kat_pol_arbeiten, 'Esszimmerstuhl / Stuhlsitz neu beziehen (Kanten sauber geheftet, Unterspannstoff neu montieren)', 'Stk', 145.00, 2, '3400 Polstererlöse'),
    (v_polsterei_id, v_kat_pol_arbeiten, 'Eckbank / Polsterbank erneuern (Zuschnitt Kaltschaum RG50, Wattierung & Neubezug pro lfm)', 'lfm', 220.00, 3, '3400 Polstererlöse'),
    (v_polsterei_id, v_kat_pol_arbeiten, 'Kissenbezug nach Mass mit verdecktem Reissverschluss (hochwertige Paspel-/Kedernaht)', 'Stk', 65.00, 4, '3400 Polstererlöse');

  -- 2b. Kategorie: Restauration & Antike Sitzmöbel
  INSERT INTO public.katalog_kategorien (tenant_id, name, sort_order)
  VALUES (v_polsterei_id, 'Restauration & Traditionelle Polsterkunst', 2)
  RETURNING id INTO v_kat_pol_restaur;

  INSERT INTO public.katalog_leistungen (tenant_id, kategorie_id, beschreibung, einheit, einzelpreis, sort_order, ertragskonto)
  VALUES 
    (v_polsterei_id, v_kat_pol_restaur, 'Holzgestell verleimen, reinigen & nähren (Wackelstellen nachleimen, Oberfläche mit Antiköl auffrischen)', 'Stk', 120.00, 1, '3400 Restauration & Handwerk'),
    (v_polsterei_id, v_kat_pol_restaur, 'Federkorb fachmännisch handgeschnürt (traditionelle 8-Knoten-Juteschnürung nach Schweizer Handwerksstandard)', 'Pauschal', 280.00, 2, '3400 Restauration & Handwerk'),
    (v_polsterei_id, v_kat_pol_restaur, 'Rosshaar-Pikierung & Fasson von Hand aufbauen (klassische Polsterung für Generationen)', 'Pauschal', 340.00, 3, '3400 Restauration & Handwerk'),
    (v_polsterei_id, v_kat_pol_restaur, 'Ziernägel einzeln von Hand einschlagen (Messing, Altgold oder Chrom, Millimeterabstand)', 'lfm', 45.00, 4, '3400 Restauration & Handwerk');

  -- 2c. Kategorie: Schaumstoffe & Möbelstoffe
  INSERT INTO public.katalog_kategorien (tenant_id, name, sort_order)
  VALUES (v_polsterei_id, 'Möbelstoffe & Schaumstoffzuschnitt', 3)
  RETURNING id INTO v_kat_pol_stoffe;

  INSERT INTO public.katalog_leistungen (tenant_id, kategorie_id, beschreibung, einheit, einzelpreis, sort_order, ertragskonto)
  VALUES 
    (v_polsterei_id, v_kat_pol_stoffe, 'Möbelbezugsstoff Premium Kollektion Bern (ab 50''000 Martindale, schmutzabweisend ausgerüstet)', 'lfm', 95.00, 1, '3200 Materialertrag'),
    (v_polsterei_id, v_kat_pol_stoffe, 'Kaltschaumstoff RG50 / SH45 nach Mass (formstabile Sitzqualität für höchste Ansprüche)', 'm²', 115.00, 2, '3200 Materialertrag'),
    (v_polsterei_id, v_kat_pol_stoffe, 'Polsterwatte & Vlies kaschiert 150g/m² (Gleit- & Schutzschicht gegen Faltenwurf)', 'lfm', 18.00, 3, '3200 Materialertrag'),
    (v_polsterei_id, v_kat_pol_stoffe, 'Jute-Spanngurten extra stark & Unterspannstoff (Spannmaterial für Unterbau)', 'lfm', 24.00, 4, '3200 Materialertrag');

  -- ----------------------------------------------------------------------------
  -- 3. STANDARD-RECHNUNGEN & QR-RECHNUNGS-VORLAGEN
  -- ----------------------------------------------------------------------------
  -- 3a. Töpferei: Offizielle Rechnung anlegen
  SELECT id INTO v_kunde_top_id FROM public.kunden WHERE tenant_id = v_toepferei_id LIMIT 1;
  SELECT id INTO v_projekt_top_id FROM public.projekte WHERE tenant_id = v_toepferei_id LIMIT 1;

  IF v_kunde_top_id IS NOT NULL AND v_projekt_top_id IS NOT NULL THEN
    DELETE FROM public.rechnungen WHERE tenant_id = v_toepferei_id;

    INSERT INTO public.rechnungen (
      tenant_id, kunden_id, projekt_id, rechnung_nr, total, status, typ, rechnungsdatum, zahlungsfrist_tage, daten
    ) VALUES (
      v_toepferei_id,
      v_kunde_top_id,
      v_projekt_top_id,
      'RE-TOP-1001',
      1480.00,
      'Offen',
      'gesamt',
      CURRENT_DATE,
      30,
      jsonb_build_object(
        'titel', 'Rechnung: Handgemachte Keramik-Kollektion Café Münstergasse',
        'rechnungNr', 'RE-TOP-1001',
        'rechnungsdetails', jsonb_build_object(
          'rechnungNr', 'RE-TOP-1001',
          'datum', to_char(now(), 'YYYY-MM-DD'),
          'zahlungsziel', '30 Tage netto',
          'typ', 'Schlussrechnung'
        ),
        'leistungen', jsonb_build_array(
          jsonb_build_object('id', 1, 'pos', '01', 'beschreibung', 'Keramikschale gross "Teal Glaze" handgedreht, Ø 24cm', 'menge', 12, 'einheit', 'Stk', 'einzelpreis', 75.00, 'total', 900.00, 'ertragskonto', '3200 Warenertrag Handwerk'),
          jsonb_build_object('id', 2, 'pos', '02', 'beschreibung', 'Cappuccino-Becher Steinzeug schwarzmatt, unglasiert aussen', 'menge', 20, 'einheit', 'Stk', 'einzelpreis', 24.00, 'total', 480.00, 'ertragskonto', '3200 Warenertrag Handwerk'),
          jsonb_build_object('id', 3, 'pos', '03', 'beschreibung', 'Spezial-Glasurbrand & Qualitätsprüfung', 'menge', 1, 'einheit', 'Pauschal', 'einzelpreis', 100.00, 'total', 100.00, 'ertragskonto', '3400 Dienstleistungserlöse')
        ),
        'konditionen', jsonb_build_object('mwstSatz', 8.1, 'rabattSatz', 0),
        'texte', jsonb_build_object(
          'einleitungstext', 'Gerne stellen wir Ihnen die gefertigten Keramikarbeiten wie vereinbart in Rechnung:',
          'schlusstext', 'Wir danken Ihnen herzlich für diesen schönen Auftrag und wünschen Ihren Gästen viel Freude mit den handgefertigten Unikaten.'
        )
      )
    );
  END IF;

  -- 3b. Polsterei: Offizielle Rechnung anlegen
  SELECT id INTO v_kunde_pol_id FROM public.kunden WHERE tenant_id = v_polsterei_id LIMIT 1;
  SELECT id INTO v_projekt_pol_id FROM public.projekte WHERE tenant_id = v_polsterei_id LIMIT 1;

  IF v_kunde_pol_id IS NOT NULL AND v_projekt_pol_id IS NOT NULL THEN
    DELETE FROM public.rechnungen WHERE tenant_id = v_polsterei_id;

    INSERT INTO public.rechnungen (
      tenant_id, kunden_id, projekt_id, rechnung_nr, total, status, typ, rechnungsdatum, zahlungsfrist_tage, daten
    ) VALUES (
      v_polsterei_id,
      v_kunde_pol_id,
      v_projekt_pol_id,
      'RE-POL-1001',
      2150.00,
      'Offen',
      'gesamt',
      CURRENT_DATE,
      30,
      jsonb_build_object(
        'titel', 'Rechnung: Fachmännische Restauration & Neubezug Art-Déco Ohrensessel',
        'rechnungNr', 'RE-POL-1001',
        'rechnungsdetails', jsonb_build_object(
          'rechnungNr', 'RE-POL-1001',
          'datum', to_char(now(), 'YYYY-MM-DD'),
          'zahlungsziel', '30 Tage netto',
          'typ', 'Schlussrechnung'
        ),
        'leistungen', jsonb_build_array(
          jsonb_build_object('id', 1, 'pos', '01', 'beschreibung', 'Abpolstern bis auf den Rahmen, Holzgestell fachmännisch verleimen & auffrischen', 'menge', 1, 'einheit', 'Stk', 'einzelpreis', 280.00, 'total', 280.00, 'ertragskonto', '3400 Restauration & Handwerk'),
          jsonb_build_object('id', 2, 'pos', '02', 'beschreibung', 'Gurte spannen, Federkorb handgeschnürt & Rosshaar-Pikierung fassonieren', 'menge', 1, 'einheit', 'Pauschal', 'einzelpreis', 650.00, 'total', 650.00, 'ertragskonto', '3400 Polstererlöse'),
          jsonb_build_object('id', 3, 'pos', '03', 'beschreibung', 'Zuschnitt & Neubezug in Möbel-Samtvelours inkl. Keder-Einfassung', 'menge', 1, 'einheit', 'Stk', 'einzelpreis', 750.00, 'total', 750.00, 'ertragskonto', '3400 Polstererlöse'),
          jsonb_build_object('id', 4, 'pos', '04', 'beschreibung', 'Polsterstoff Samtvelours Kollektion Bern (Farbe Deep Purple)', 'menge', 5, 'einheit', 'lfm', 'einzelpreis', 94.00, 'total', 470.00, 'ertragskonto', '3200 Materialertrag')
        ),
        'konditionen', jsonb_build_object('mwstSatz', 8.1, 'rabattSatz', 0),
        'texte', jsonb_build_object(
          'einleitungstext', 'Für die ausgeführten Polster- und Restaurationsarbeiten erlauben wir uns, Ihnen folgende Rechnung zu unterbreiten:',
          'schlusstext', 'Vielen Dank für Ihr Vertrauen in unser Handwerk. Bei Fragen zu Pflege und Erhalt Ihres Möbelstücks stehen wir Ihnen jederzeit gerne zur Seite.'
        )
      )
    );
  END IF;

  RAISE NOTICE 'Musterkataloge und Standard-Rechnungen für Töpferei & Polsterei erfolgreich hinterlegt!';
END $$;
