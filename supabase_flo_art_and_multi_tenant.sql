-- ==============================================================================
-- KINETIC CRAFT - MULTI-TENANT ARCHITEKTUR & FLO ART ONBOARDING
-- ==============================================================================
-- 1. Multi-Mandanten-System (user_tenants) für Kunden mit 2+ Betrieben / Standorten
-- 2. Vollständige Einrichtung von «Flo Art – Töpferei» & «Flo Art – Polsterei»
-- 3. Benutzer-Accounts für Florence Lourini (Inhaberin) & Amin Lourini (Admin)
-- ==============================================================================
-- Führe dieses Skript im Supabase SQL Editor aus:
-- https://supabase.com/dashboard/project/fpfdlraqtqtcnmajrcyx/sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- SCHRITT 0: TABELLENSTRUKTUR & SPALTEN SICHERSTELLEN (DDL vor PL/pgSQL Block)
-- ------------------------------------------------------------------------------
ALTER TABLE public.einstellungen ADD COLUMN IF NOT EXISTS kanton TEXT DEFAULT 'BE';
ALTER TABLE public.einstellungen ADD COLUMN IF NOT EXISTS plz TEXT;
ALTER TABLE public.einstellungen ADD COLUMN IF NOT EXISTS ort TEXT;
ALTER TABLE public.einstellungen ADD COLUMN IF NOT EXISTS plz_ort TEXT;
ALTER TABLE public.einstellungen ADD COLUMN IF NOT EXISTS land TEXT DEFAULT 'Schweiz';
ALTER TABLE public.einstellungen ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#b88a38';
ALTER TABLE public.einstellungen ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.einstellungen ADD COLUMN IF NOT EXISTS qr_iban TEXT;
ALTER TABLE public.einstellungen ADD COLUMN IF NOT EXISTS hr_nummer TEXT;
ALTER TABLE public.einstellungen ADD COLUMN IF NOT EXISTS gerichtsstand TEXT;
ALTER TABLE public.einstellungen ADD COLUMN IF NOT EXISTS pdf_kopfzeile TEXT;
ALTER TABLE public.einstellungen ADD COLUMN IF NOT EXISTS pdf_fusszeile TEXT;
ALTER TABLE public.einstellungen ADD COLUMN IF NOT EXISTS pdf_absenderzeile TEXT;
ALTER TABLE public.einstellungen ADD COLUMN IF NOT EXISTS startnummer_offerten INTEGER DEFAULT 1000;
ALTER TABLE public.einstellungen ADD COLUMN IF NOT EXISTS startnummer_rechnungen INTEGER DEFAULT 1000;
ALTER TABLE public.einstellungen ADD COLUMN IF NOT EXISTS startnummer_kunden INTEGER DEFAULT 1000;
ALTER TABLE public.einstellungen ADD COLUMN IF NOT EXISTS prefix_kunden TEXT DEFAULT 'K-';
ALTER TABLE public.einstellungen ADD COLUMN IF NOT EXISTS startnummer_projekte INTEGER DEFAULT 1000;
ALTER TABLE public.einstellungen ADD COLUMN IF NOT EXISTS prefix_projekte TEXT DEFAULT 'P-';

ALTER TABLE public.kunden ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.kunden ADD COLUMN IF NOT EXISTS firmenname TEXT;
ALTER TABLE public.kunden ADD COLUMN IF NOT EXISTS vorname TEXT;
ALTER TABLE public.kunden ADD COLUMN IF NOT EXISTS nachname TEXT;
ALTER TABLE public.kunden ADD COLUMN IF NOT EXISTS notizen TEXT;

ALTER TABLE public.projekte ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.projekte ADD COLUMN IF NOT EXISTS notizen TEXT;

ALTER TABLE public.offerten ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.offerten ADD COLUMN IF NOT EXISTS notizen TEXT;

-- Sicherstellen, dass tenant_id UNIQUE auf einstellungen ist (falls noch nicht gesetzt)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'einstellungen_tenant_id_unique'
  ) THEN
    -- Bereinige Duplikate falls vorhanden
    DELETE FROM public.einstellungen e1
    USING public.einstellungen e2
    WHERE e1.id > e2.id AND e1.tenant_id = e2.tenant_id;

    ALTER TABLE public.einstellungen ADD CONSTRAINT einstellungen_tenant_id_unique UNIQUE (tenant_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Multi-Tenant Mitgliedschaften-Tabelle anlegen
CREATE TABLE IF NOT EXISTS public.user_tenants (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, tenant_id)
);

ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tenant memberships" ON public.user_tenants;
CREATE POLICY "Users can view their own tenant memberships"
  ON public.user_tenants FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- SCHRITT 1: FLO ART MANDANTEN, EINSTELLUNGEN & BENUTZER INITIALISIEREN
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_toepferei_tenant_id UUID := 'f10a2701-0001-4000-8000-000000000001';
  v_polsterei_tenant_id UUID := 'f10a2702-0002-4000-8000-000000000002';
  
  v_florence_id UUID;
  v_amin_id UUID;

  v_kunde_toepferei_id BIGINT;
  v_kunde_polsterei_id BIGINT;
  v_projekt_toepferei_id BIGINT;
  v_projekt_polsterei_id BIGINT;
BEGIN

  -- 1. Bestehende Zuordnungen aus user_roles in user_tenants migrieren
  INSERT INTO public.user_tenants (user_id, tenant_id, role, is_default)
  SELECT id, tenant_id, role, true
  FROM public.user_roles
  WHERE tenant_id IS NOT NULL
  ON CONFLICT (user_id, tenant_id) DO NOTHING;

  -- 2. MANDANTEN: Flo Art Töpferei & Flo Art Polsterei
  INSERT INTO public.tenants (id, name, status)
  VALUES (v_toepferei_tenant_id, 'Flo Art – Töpferei', 'active')
  ON CONFLICT (id) DO UPDATE SET name = 'Flo Art – Töpferei', status = 'active';

  INSERT INTO public.tenants (id, name, status)
  VALUES (v_polsterei_tenant_id, 'Flo Art – Polsterei', 'active')
  ON CONFLICT (id) DO UPDATE SET name = 'Flo Art – Polsterei', status = 'active';

  -- 3. EINSTELLUNGEN: Töpferei (Münstergasse Bern) & Polsterei (Ittigen)
  -- 3a. Flo Art – Töpferei
  INSERT INTO public.einstellungen (
    tenant_id, firmenname, strasse, plz, ort, plz_ort, land,
    telefon, email, website, primary_color, logo_url,
    pdf_kopfzeile, bankverbindung, qr_iban,
    standard_mwst, standard_rabatt, gueltigkeit_offerten_tage, zahlungsfrist_tage,
    startnummer_offerten, startnummer_rechnungen, startnummer_kunden, prefix_kunden,
    startnummer_projekte, prefix_projekte
  ) VALUES (
    v_toepferei_tenant_id,
    'Flo Art – Töpferei',
    'Münstergasse 39',
    '3011',
    'Bern',
    '3011 Bern',
    'Schweiz',
    '+41 76 295 79 23',
    'lourini@bluewin.ch',
    'https://flo-art.ch',
    '#FF6B35',
    '/flo_art_logo.svg',
    'Flo Art – Töpferei & Keramik' || E'\n' || 'Florence Lourini' || E'\n' || 'Münstergasse 39' || E'\n' || '3011 Bern' || E'\n' || 'Tel: +41 76 295 79 23',
    'PostFinance Bern (Demo-Konto)',
    'CH44 3199 9123 0008 8901 2',
    8.1,
    0,
    30,
    30,
    1000,
    1000,
    1000,
    'TOP-',
    1000,
    'P-TOP-'
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    firmenname = EXCLUDED.firmenname,
    strasse = EXCLUDED.strasse,
    plz = EXCLUDED.plz,
    ort = EXCLUDED.ort,
    plz_ort = EXCLUDED.plz_ort,
    telefon = EXCLUDED.telefon,
    email = EXCLUDED.email,
    website = EXCLUDED.website,
    primary_color = EXCLUDED.primary_color,
    logo_url = EXCLUDED.logo_url,
    pdf_kopfzeile = EXCLUDED.pdf_kopfzeile,
    bankverbindung = EXCLUDED.bankverbindung,
    qr_iban = EXCLUDED.qr_iban;

  -- 3b. Flo Art – Polsterei
  INSERT INTO public.einstellungen (
    tenant_id, firmenname, strasse, plz, ort, plz_ort, land,
    telefon, email, website, primary_color, logo_url,
    pdf_kopfzeile, bankverbindung, qr_iban,
    standard_mwst, standard_rabatt, gueltigkeit_offerten_tage, zahlungsfrist_tage,
    startnummer_offerten, startnummer_rechnungen, startnummer_kunden, prefix_kunden,
    startnummer_projekte, prefix_projekte
  ) VALUES (
    v_polsterei_tenant_id,
    'Flo Art – Polsterei',
    'Papiermühlestrasse 107',
    '3063',
    'Ittigen',
    '3063 Ittigen',
    'Schweiz',
    '+41 76 295 79 23',
    'lourini@bluewin.ch',
    'https://flo-art.ch',
    '#6B3A8E',
    '/flo_art_logo.svg',
    'Flo Art – Polsterei & Innendekoration' || E'\n' || 'Florence Lourini' || E'\n' || 'Papiermühlestrasse 107' || E'\n' || '3063 Ittigen' || E'\n' || 'Tel: +41 76 295 79 23',
    'PostFinance Bern (Demo-Konto)',
    'CH44 3199 9123 0008 8901 2',
    8.1,
    0,
    30,
    30,
    1000,
    1000,
    1000,
    'POL-',
    1000,
    'P-POL-'
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    firmenname = EXCLUDED.firmenname,
    strasse = EXCLUDED.strasse,
    plz = EXCLUDED.plz,
    ort = EXCLUDED.ort,
    plz_ort = EXCLUDED.plz_ort,
    telefon = EXCLUDED.telefon,
    email = EXCLUDED.email,
    website = EXCLUDED.website,
    primary_color = EXCLUDED.primary_color,
    logo_url = EXCLUDED.logo_url,
    pdf_kopfzeile = EXCLUDED.pdf_kopfzeile,
    bankverbindung = EXCLUDED.bankverbindung,
    qr_iban = EXCLUDED.qr_iban;

  -- 4. BENUTZER-KONTEN (Florence Lourini & Amin Lourini)
  -- 4a. Florence Lourini (lourini@bluewin.ch)
  SELECT id INTO v_florence_id FROM auth.users WHERE email = 'lourini@bluewin.ch' LIMIT 1;
  IF v_florence_id IS NULL THEN
    v_florence_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_florence_id,
      'authenticated',
      'authenticated',
      'lourini@bluewin.ch',
      crypt('FloArt2026!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Florence Lourini","role":"inhaberin"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_florence_id) THEN
      INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        v_florence_id,
        v_florence_id::text,
        format('{"sub":"%s","email":"%s"}', v_florence_id::text, 'lourini@bluewin.ch')::jsonb,
        'email',
        now(),
        now(),
        now()
      );
    END IF;
  END IF;

  -- Florence memberships: Beide Betriebe (Standard: Töpferei)
  INSERT INTO public.user_tenants (user_id, tenant_id, role, is_default)
  VALUES (v_florence_id, v_toepferei_tenant_id, 'admin', true)
  ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = 'admin', is_default = true;

  INSERT INTO public.user_tenants (user_id, tenant_id, role, is_default)
  VALUES (v_florence_id, v_polsterei_tenant_id, 'admin', false)
  ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = 'admin';

  -- Florence aktive Rolle
  INSERT INTO public.user_roles (id, tenant_id, role, user_name)
  VALUES (v_florence_id, v_toepferei_tenant_id, 'admin', 'Florence Lourini')
  ON CONFLICT (id) DO UPDATE SET tenant_id = v_toepferei_tenant_id, role = 'admin', user_name = 'Florence Lourini';

  -- 4b. Amin Lourini (amin.lourini@gmail.com)
  SELECT id INTO v_amin_id FROM auth.users WHERE email = 'amin.lourini@gmail.com' LIMIT 1;
  IF v_amin_id IS NULL THEN
    v_amin_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_amin_id,
      'authenticated',
      'authenticated',
      'amin.lourini@gmail.com',
      crypt('AminAdmin2026!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Amin Lourini","role":"admin"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_amin_id) THEN
      INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        v_amin_id,
        v_amin_id::text,
        format('{"sub":"%s","email":"%s"}', v_amin_id::text, 'amin.lourini@gmail.com')::jsonb,
        'email',
        now(),
        now(),
        now()
      );
    END IF;
  END IF;

  -- Amin memberships: Beide Flo Art Betriebe zuweisen (bestehende wie Atelier 77 bleiben erhalten)
  INSERT INTO public.user_tenants (user_id, tenant_id, role, is_default)
  VALUES (v_amin_id, v_toepferei_tenant_id, 'admin', false)
  ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = 'admin';

  INSERT INTO public.user_tenants (user_id, tenant_id, role, is_default)
  VALUES (v_amin_id, v_polsterei_tenant_id, 'admin', false)
  ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = 'admin';

  -- Falls Amin noch keinen aktiven Mandanten hat, auf Töpferei setzen
  INSERT INTO public.user_roles (id, tenant_id, role, user_name)
  VALUES (v_amin_id, v_toepferei_tenant_id, 'admin', 'Amin Lourini')
  ON CONFLICT (id) DO NOTHING;

  -- 5. BEISPIEL-KUNDEN & PROJEKTE FÜR BEIDE BETRIEBE
  -- 5a. Töpferei: Demo-Kunde, Projekt & Offerte
  INSERT INTO public.kunden (tenant_id, name, firmenname, strasse, plz, ort, telefon, email, status, notizen)
  VALUES (
    v_toepferei_tenant_id,
    'Galerie Münstergasse (Boutique & Café)',
    'Galerie & Boutique Münstergasse',
    'Münstergasse 14',
    '3011',
    'Bern',
    '+41 31 311 00 22',
    'kontakt@galerie-muenstergasse.ch',
    'Aktiv',
    'Kunde für handgemachte Keramikserien und Ausstellungsstücke in Bern.'
  ) RETURNING id INTO v_kunde_toepferei_id;

  INSERT INTO public.projekte (tenant_id, kunden_id, name, adresse, status, notizen)
  VALUES (
    v_toepferei_tenant_id,
    v_kunde_toepferei_id,
    'Handgemachte Keramikschalen & Tassen Kollektion Bern',
    'Münstergasse 14, 3011 Bern',
    'Aktiv',
    'Sonderserie Steinzeug Teal & Schwarzmatt für Cafébetrieb.'
  ) RETURNING id INTO v_projekt_toepferei_id;

  INSERT INTO public.offerten (tenant_id, kunden_id, projekt_id, total, status, daten)
  VALUES (
    v_toepferei_tenant_id,
    v_kunde_toepferei_id,
    v_projekt_toepferei_id,
    1480.00,
    'Versendet',
    jsonb_build_object(
      'titel', 'Offerte: Keramik-Kollektion für Galerie & Café Münstergasse',
      'datum', to_char(now(), 'YYYY-MM-DD'),
      'leistungen', jsonb_build_array(
        jsonb_build_object('id', 1, 'pos', '01', 'beschreibung', 'Keramikschale gross "Teal Glaze" handgedreht, Ø 24cm', 'menge', 12, 'einheit', 'Stk', 'einzelpreis', 75.00, 'total', 900.00),
        jsonb_build_object('id', 2, 'pos', '02', 'beschreibung', 'Cappuccino-Becher Steinzeug schwarzmatt, unglasiert aussen', 'menge', 20, 'einheit', 'Stk', 'einzelpreis', 24.00, 'total', 480.00),
        jsonb_build_object('id', 3, 'pos', '03', 'beschreibung', 'Spezial-Glasurbrand & Qualitätsprüfung', 'menge', 1, 'einheit', 'Pauschal', 'einzelpreis', 100.00, 'total', 100.00)
      )
    )
  );

  -- 5b. Polsterei: Demo-Kunde, Projekt & Offerte
  INSERT INTO public.kunden (tenant_id, name, vorname, nachname, strasse, plz, ort, telefon, email, status, notizen)
  VALUES (
    v_polsterei_tenant_id,
    'Von Graffenried Beat',
    'Beat',
    'Von Graffenried',
    'Thunstrasse 28',
    '3005',
    'Bern',
    '+41 31 352 88 11',
    'beat.vongraffenried@bluewin.ch',
    'Aktiv',
    'Privatkunde: Restauration zweier antiker Ohrensessel aus Familienbesitz.'
  ) RETURNING id INTO v_kunde_polsterei_id;

  INSERT INTO public.projekte (tenant_id, kunden_id, name, adresse, status, notizen)
  VALUES (
    v_polsterei_tenant_id,
    v_kunde_polsterei_id,
    'Neupolsterung & Restauration Art-Déco Ohrensessel',
    'Thunstrasse 28, 3005 Bern',
    'Aktiv',
    'Original Federkern fassonieren, Rosshaar-Polsterung erneuern, Bezug Samtvelours Royal Purple.'
  ) RETURNING id INTO v_projekt_polsterei_id;

  INSERT INTO public.offerten (tenant_id, kunden_id, projekt_id, total, status, daten)
  VALUES (
    v_polsterei_tenant_id,
    v_kunde_polsterei_id,
    v_projekt_polsterei_id,
    2150.00,
    'Angenommen',
    jsonb_build_object(
      'titel', 'Offerte: Fachmännische Restauration & Neubezug Art-Déco Sessel',
      'datum', to_char(now(), 'YYYY-MM-DD'),
      'leistungen', jsonb_build_array(
        jsonb_build_object('id', 1, 'pos', '01', 'beschreibung', 'Abpolstern bis auf den Holzrahmen, Inspektion & Holzgestell verleimen', 'menge', 1, 'einheit', 'Stk', 'einzelpreis', 280.00, 'total', 280.00),
        jsonb_build_object('id', 2, 'pos', '02', 'beschreibung', 'Gurte spannen, Federkorb neu schnüren & Rosshaar-Pikierung fassonieren', 'menge', 1, 'einheit', 'Pauschal', 'einzelpreis', 650.00, 'total', 650.00),
        jsonb_build_object('id', 3, 'pos', '03', 'beschreibung', 'Zuschnitt & Neubezug in Möbel-Samtvelours inkl. Keder-Einfassung', 'menge', 1, 'einheit', 'Stk', 'einzelpreis', 750.00, 'total', 750.00),
        jsonb_build_object('id', 4, 'pos', '04', 'beschreibung', 'Polsterstoff Samtvelours Kollektion Bern (Farbe Deep Aubergine/Purple)', 'menge', 5, 'einheit', 'lfm', 'einzelpreis', 94.00, 'total', 470.00)
      )
    )
  );

  RAISE NOTICE 'Flo Art Töpferei & Polsterei erfolgreich mit Benutzern, Einstellungen und Demodaten angelegt!';
END $$;

-- ------------------------------------------------------------------------------
-- SCHRITT 2: RPC FUNKTIONEN FÜR MANDANTENWECHSEL
-- ------------------------------------------------------------------------------

-- 2a. switch_active_tenant: Wechselt den aktiven Betrieb in der Session
CREATE OR REPLACE FUNCTION public.switch_active_tenant(p_target_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_membership RECORD;
  v_settings RECORD;
  v_tenant RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert';
  END IF;

  -- 1. Berechtigung prüfen
  SELECT * INTO v_membership
  FROM public.user_tenants
  WHERE user_id = v_user_id AND tenant_id = p_target_tenant_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Zugriff verweigert: Sie gehören diesem Mandanten nicht an.';
  END IF;

  -- 2. Aktive Rolle in user_roles umschalten
  UPDATE public.user_roles
  SET tenant_id = p_target_tenant_id,
      role = v_membership.role
  WHERE id = v_user_id;

  -- 3. Mandant & Einstellungen laden
  SELECT * INTO v_tenant FROM public.tenants WHERE id = p_target_tenant_id LIMIT 1;
  SELECT * INTO v_settings FROM public.einstellungen WHERE tenant_id = p_target_tenant_id LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', p_target_tenant_id,
    'tenant_name', v_tenant.name,
    'role', v_membership.role,
    'firmenname', COALESCE(v_settings.firmenname, v_tenant.name),
    'primary_color', COALESCE(v_settings.primary_color, '#b88a38'),
    'ort', COALESCE(v_settings.ort, '')
  );
END;
$$;

-- 2b. get_user_tenants: Gibt alle Betriebe des eingeloggten Benutzers zurück
CREATE OR REPLACE FUNCTION public.get_user_tenants()
RETURNS TABLE (
  tenant_id UUID,
  name TEXT,
  role TEXT,
  firmenname TEXT,
  ort TEXT,
  primary_color TEXT,
  logo_url TEXT,
  is_active BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    t.id AS tenant_id,
    t.name AS name,
    ut.role AS role,
    COALESCE(e.firmenname, t.name) AS firmenname,
    COALESCE(e.ort, '') AS ort,
    COALESCE(e.primary_color, '#b88a38') AS primary_color,
    COALESCE(e.logo_url, '') AS logo_url,
    (ur.tenant_id = t.id) AS is_active
  FROM public.user_tenants ut
  JOIN public.tenants t ON t.id = ut.tenant_id
  LEFT JOIN public.einstellungen e ON e.tenant_id = t.id
  LEFT JOIN public.user_roles ur ON ur.id = ut.user_id
  WHERE ut.user_id = auth.uid()
  ORDER BY (ur.tenant_id = t.id) DESC, t.name ASC;
$$;

-- Berechtigungen für authentifizierte Benutzer gewähren
GRANT EXECUTE ON FUNCTION public.switch_active_tenant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenants() TO authenticated;
