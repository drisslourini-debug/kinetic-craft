import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fpfdlraqtqtcnmajrcyx.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZmRscmFxdHF0Y25tYWpyY3l4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzOTk5MywiZXhwIjoyMTAwMTE1OTkzfQ.8S8CiMvOFosImncenIptaaPBSNJmEfJ6YmC9XbLG7wA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const ATELIER77_TENANT_ID = 'ce510545-c59b-4f0d-b89b-89f756cbb378';

async function runSetup() {
  console.log('🚀 Initialisiere Produktivumgebung für Malerei Leandro Lüthi - Atelier 77...\n');

  // =========================================================================
  // 1. TENANT PRÜFEN & ANLEGEN
  // =========================================================================
  console.log('🏢 1. Sichere Hauptmandant Atelier 77...');
  const { data: mainTenant, error: tenantErr } = await supabase
    .from('tenants')
    .upsert({
      id: ATELIER77_TENANT_ID,
      name: 'Malerei Leandro Lüthi - Atelier 77',
      status: 'active',
      plan: 'professional',
      billing_cycle: 'monthly',
      price_chf: 49,
      contact_name: 'Leandro Lüthi',
      contact_email: 'leandro@atelier-77.ch',
      contact_phone: '078 402 12 22'
    })
    .select()
    .single();

  if (tenantErr) {
    console.error('❌ Fehler beim Mandanten-Upsert:', tenantErr);
    process.exit(1);
  }
  console.log('✅ Mandant bereit:', mainTenant.name, `(${mainTenant.id})`);

  // =========================================================================
  // 2. BENUTZER FÜR LEANDRO LÜTHI & LORINA SCHMID ANLEGEN / AKTUALISIEREN
  // =========================================================================
  console.log('\n👥 2. Richte Benutzerkonten für Leandro Lüthi und Lorina Schmid ein...');
  const { data: userList, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('❌ Fehler beim Abrufen der Auth-Benutzer:', listErr);
    process.exit(1);
  }

  const targetUsers = [
    { email: 'leandro@atelier-77.ch', name: 'Leandro Lüthi', password: 'Leandro77!', role: 'admin' },
    { email: 'info@atelier-77.ch', name: 'Lorina Schmid', password: 'Lorina77!', role: 'admin' },
  ];

  const createdUserMap = {};

  for (const tu of targetUsers) {
    const existing = userList.users.find(u => u.email.toLowerCase() === tu.email.toLowerCase());
    let userId;

    if (existing) {
      console.log(`  🔄 Aktualisiere bestehenden Auth-Benutzer: ${tu.email}`);
      const { data: updated, error: uErr } = await supabase.auth.admin.updateUserById(existing.id, {
        password: tu.password,
        email_confirm: true,
        user_metadata: { full_name: tu.name }
      });
      if (uErr) {
        console.error(`  ⚠️ Fehler beim Update von ${tu.email}:`, uErr);
      }
      userId = existing.id;
    } else {
      console.log(`  ✨ Erstelle neuen Auth-Benutzer: ${tu.email}`);
      const { data: created, error: cErr } = await supabase.auth.admin.createUser({
        email: tu.email,
        password: tu.password,
        email_confirm: true,
        user_metadata: { full_name: tu.name }
      });
      if (cErr) {
        console.error(`  ❌ Fehler beim Erstellen von ${tu.email}:`, cErr);
        process.exit(1);
      }
      userId = created.user.id;
    }

    createdUserMap[tu.email] = userId;

    // 2a. Rollen in user_roles zuweisen
    await supabase.from('user_roles').upsert({
      id: userId,
      tenant_id: ATELIER77_TENANT_ID,
      role: tu.role,
      user_name: tu.name
    });

    // 2b. Mitgliedschaft in user_tenants zuweisen
    await supabase.from('user_tenants').upsert({
      user_id: userId,
      tenant_id: ATELIER77_TENANT_ID,
      role: tu.role,
      is_default: true
    }, { onConflict: 'user_id,tenant_id' });

    console.log(`  ✅ Login eingerichtet: ${tu.email} (${tu.name}) | PW: ${tu.password} | Rolle: ${tu.role}`);
  }

  // Entwickler-Admin Amin Lourini bleibt ausserhalb des Mandanten Atelier 77 (wie gewünscht)
  const aminUser = userList.users.find(u => u.email.toLowerCase() === 'amin.lourini@gmail.com');
  if (aminUser) {
    // Entferne versehentliche Zuordnung zu Atelier 77 falls vorhanden
    await supabase.from('user_tenants').delete().eq('user_id', aminUser.id).eq('tenant_id', ATELIER77_TENANT_ID);
    console.log('  🔒 Mandanten-Isolation: Amin Lourini greift nicht als Mandantenmitglied auf Atelier 77 zu.');
  }

  // =========================================================================
  // 3. BESTEHENDE DATEN FÜR ATELIER 77 BEREINIGEN (KEINE ANDEREN MANDANTEN LÖSCHEN!)
  // =========================================================================
  console.log('\n🧹 3. Bereinige Alt-Daten ausschliesslich für Mandant Atelier 77...');
  await supabase.from('offerten').update({ rechnung_id: null }).eq('tenant_id', ATELIER77_TENANT_ID);
  await supabase.from('termine').delete().eq('tenant_id', ATELIER77_TENANT_ID);
  await supabase.from('rechnungen').delete().eq('tenant_id', ATELIER77_TENANT_ID);
  await supabase.from('offerten').delete().eq('tenant_id', ATELIER77_TENANT_ID);
  await supabase.from('projekte').delete().eq('tenant_id', ATELIER77_TENANT_ID);
  await supabase.from('kunden').delete().eq('tenant_id', ATELIER77_TENANT_ID);
  await supabase.from('katalog_leistungen').delete().eq('tenant_id', ATELIER77_TENANT_ID);
  await supabase.from('katalog_kategorien').delete().eq('tenant_id', ATELIER77_TENANT_ID);
  console.log('✅ Datenbestand für Atelier 77 bereinigt.');

  // =========================================================================
  // 4. EINSTELLUNGEN & STAMMDATEN (ATELIER 77)
  // =========================================================================
  console.log('\n⚙️ 4. Konfiguriere Stammdaten & Schweizer Layout für Atelier 77...');
  const settingsData = {
    tenant_id: ATELIER77_TENANT_ID,
    firmenname: 'Malerei Leandro Lüthi - Atelier 77',
    strasse: 'Landoltstrasse 99',
    plz: '3007',
    ort: 'Bern',
    plz_ort: '3007 Bern',
    land: 'Schweiz',
    telefon: '078 402 12 22',
    email: 'info@atelier-77.ch',
    website: 'https://www.atelier-77.ch',
    bankverbindung: 'CH39 0870 4016 0754 7300 7', // Berner Kantonalbank BEKB
    qr_iban: 'CH44 3199 9123 0008 8901 2',        // Schweizer QR-IBAN Test
    primary_color: '#b88a38',                     // Gold aus Logo
    logo_url: '/atelier_77_logo.png',
    standard_mwst: 8.1,
    standard_rabatt: 0,
    gueltigkeit_offerten_tage: 30,
    zahlungsfrist_tage: 30,
    startnummer_offerten: 1000,
    startnummer_rechnungen: 1000,
    startnummer_kunden: 1000,
    prefix_kunden: 'K-',
    startnummer_projekte: 1000,
    prefix_projekte: 'P-',
    gerichtsstand: 'Bern',
    pdf_absenderzeile: 'Malerei Leandro Lüthi - Atelier 77 · Landoltstrasse 99 · 3007 Bern',
    pdf_fusszeile: 'Malerei Leandro Lüthi - Atelier 77 | Landoltstrasse 99, 3007 Bern | Tel. 078 402 12 22 | info@atelier-77.ch'
  };

  const { error: settingsErr } = await supabase
    .from('einstellungen')
    .upsert(settingsData, { onConflict: 'tenant_id' });

  if (settingsErr) {
    console.error('❌ Fehler beim Aktualisieren der Einstellungen:', settingsErr);
  } else {
    console.log('✅ Stammdaten gespeichert (Landoltstrasse 99, 3007 Bern, Gold #b88a38, BEKB Bankverbindung).');
  }

  // =========================================================================
  // 5. MALER-LEISTUNGSKATALOG EINRICHTEN
  // =========================================================================
  console.log('\n🎨 5. Erstelle professionellen Schweizer Maler-Leistungskatalog...');

  const katalogKategorien = [
    { name: 'Malerarbeiten (Innen)', sort_order: 1 },
    { name: 'Gipser- & Spachtelarbeiten', sort_order: 2 },
    { name: 'Fassadenarbeiten', sort_order: 3 },
    { name: 'Spezialtechniken & Wandgestaltung', sort_order: 4 },
    { name: 'Regietarife (Maler)', sort_order: 5 },
    { name: 'Baustellenservice & Schutz', sort_order: 6 },
    { name: 'Material & Verbrauchsstoffe', sort_order: 7 },
  ];

  const katMap = {};
  for (const kat of katalogKategorien) {
    const { data: kData, error: kErr } = await supabase
      .from('katalog_kategorien')
      .insert({
        tenant_id: ATELIER77_TENANT_ID,
        name: kat.name,
        sort_order: kat.sort_order
      })
      .select()
      .single();
    if (!kErr && kData) {
      katMap[kat.name] = kData.id;
    }
  }

  const katalogLeistungen = [
    // Innen
    { kat: 'Malerarbeiten (Innen)', beschreibung: 'Abdecken und Schützen (Böden, Möbel, Treppen)', einheit: 'm²', einzelpreis: 8.50 },
    { kat: 'Malerarbeiten (Innen)', beschreibung: 'Wände streichen (Dispersion, 2x Anstrich, Standardweiss)', einheit: 'm²', einzelpreis: 23.50 },
    { kat: 'Malerarbeiten (Innen)', beschreibung: 'Decke streichen (Dispersion, 2x Anstrich, Standardweiss)', einheit: 'm²', einzelpreis: 26.00 },
    { kat: 'Malerarbeiten (Innen)', beschreibung: 'Wände streichen farbig (Aufpreis für Bunttöne / Designerfarben)', einheit: 'm²', einzelpreis: 8.50 },
    { kat: 'Malerarbeiten (Innen)', beschreibung: 'Türen und Zargen lackieren (Holz/Metall, inkl. Schleifen)', einheit: 'Stk', einzelpreis: 185.00 },
    { kat: 'Malerarbeiten (Innen)', beschreibung: 'Fensterrahmen lackieren (innen, Holz)', einheit: 'lfm', einzelpreis: 25.00 },
    { kat: 'Malerarbeiten (Innen)', beschreibung: 'Heizkörper lackieren (Rippen-/Plattenheizkörper)', einheit: 'Stk', einzelpreis: 85.00 },
    { kat: 'Malerarbeiten (Innen)', beschreibung: 'Sockelleisten streichen / lackieren', einheit: 'lfm', einzelpreis: 12.00 },
    { kat: 'Malerarbeiten (Innen)', beschreibung: 'Tiefengrund / Voranstrich auftragen (saugende Untergründe)', einheit: 'm²', einzelpreis: 6.50 },
    { kat: 'Malerarbeiten (Innen)', beschreibung: 'Nikotinsperre / Isolierfarbe auftragen', einheit: 'm²', einzelpreis: 18.00 },
    { kat: 'Malerarbeiten (Innen)', beschreibung: 'Fugen erneuern (Silikon oder Acryl ziehen)', einheit: 'lfm', einzelpreis: 12.00 },

    // Gipser & Spachtel
    { kat: 'Gipser- & Spachtelarbeiten', beschreibung: 'Risse und Löcher spachteln, schleifen (Untergrundvorbereitung)', einheit: 'h', einzelpreis: 85.00 },
    { kat: 'Gipser- & Spachtelarbeiten', beschreibung: 'Weissputz / Glattstrich (Wände und Decken glätten, Q3)', einheit: 'm²', einzelpreis: 36.00 },
    { kat: 'Gipser- & Spachtelarbeiten', beschreibung: 'Vollabrieb auftragen (1.5mm Körnung, verrieben)', einheit: 'm²', einzelpreis: 38.00 },
    { kat: 'Gipser- & Spachtelarbeiten', beschreibung: 'Risssanierung (inkl. Netzeinbettung / Rissband)', einheit: 'lfm', einzelpreis: 35.00 },
    { kat: 'Gipser- & Spachtelarbeiten', beschreibung: 'Leibungen spachteln und schleifen (Fenster/Türen)', einheit: 'lfm', einzelpreis: 22.00 },

    // Fassade
    { kat: 'Fassadenarbeiten', beschreibung: 'Fassade Hochdruckreinigen (inkl. Algen-/Fungizidbehandlung)', einheit: 'm²', einzelpreis: 12.50 },
    { kat: 'Fassadenarbeiten', beschreibung: 'Fassade streichen (Silikonharz/Mineralfarbe, 2x Anstrich)', einheit: 'm²', einzelpreis: 39.00 },
    { kat: 'Fassadenarbeiten', beschreibung: 'Fassadensockel streichen (wasserabweisend/Zementsockel)', einheit: 'm²', einzelpreis: 45.00 },
    { kat: 'Fassadenarbeiten', beschreibung: 'Holzwerk aussen schleifen & lasieren (Dachuntersicht/Balkon)', einheit: 'm²', einzelpreis: 34.00 },
    { kat: 'Fassadenarbeiten', beschreibung: 'Fassadengerüst auf- und abbauen (inkl. Vorhaltung)', einheit: 'm²', einzelpreis: 19.50 },

    // Spezialtechniken
    { kat: 'Spezialtechniken & Wandgestaltung', beschreibung: 'Stucco Veneziano / Glättetechnik (Wandgestaltung exklusiv)', einheit: 'm²', einzelpreis: 145.00 },
    { kat: 'Spezialtechniken & Wandgestaltung', beschreibung: 'Betonoptik / Sichtbeton-Imitation (Spachteltechnik)', einheit: 'm²', einzelpreis: 115.00 },
    { kat: 'Spezialtechniken & Wandgestaltung', beschreibung: 'Vliestapete anbringen (inkl. Kleisterauftrag)', einheit: 'm²', einzelpreis: 42.00 },
    { kat: 'Spezialtechniken & Wandgestaltung', beschreibung: 'Schimmelsanierung (mechanische Desinfektion & Spezialanstrich)', einheit: 'm²', einzelpreis: 58.00 },
    { kat: 'Spezialtechniken & Wandgestaltung', beschreibung: 'Graffitientfernung & Graffitischutz auftragen', einheit: 'm²', einzelpreis: 65.00 },

    // Regietarife
    { kat: 'Regietarife (Maler)', beschreibung: 'Vorarbeiter / Malermeister', einheit: 'h', einzelpreis: 95.00 },
    { kat: 'Regietarife (Maler)', beschreibung: 'Kundenmaler EFZ (Facharbeiter)', einheit: 'h', einzelpreis: 85.00 },
    { kat: 'Regietarife (Maler)', beschreibung: 'Malerpraktiker / Assistent', einheit: 'h', einzelpreis: 68.00 },
    { kat: 'Regietarife (Maler)', beschreibung: 'Fahrzeugpauschale & Servicewagen (pro Tag/Einsatz)', einheit: 'Pausch.', einzelpreis: 38.00 },

    // Baustellenservice
    { kat: 'Baustellenservice & Schutz', beschreibung: 'Rollgerüst stellen und vorhalten (Tagesmiete)', einheit: 'Tag', einzelpreis: 120.00 },
    { kat: 'Baustellenservice & Schutz', beschreibung: 'Entsorgungspauschale (Farbreste, Bauschutt, Abdeckmaterial)', einheit: 'Pausch.', einzelpreis: 45.00 },
    { kat: 'Baustellenservice & Schutz', beschreibung: 'Farbberatung & Musterplatten vor Ort', einheit: 'Pausch.', einzelpreis: 150.00 },
    { kat: 'Baustellenservice & Schutz', beschreibung: 'Endreinigung Baustelle (besenrein)', einheit: 'h', einzelpreis: 65.00 },

    // Material
    { kat: 'Material & Verbrauchsstoffe', beschreibung: 'Dispersion weiss (Innenfarbe Nassabriebklasse 1)', einheit: 'kg', einzelpreis: 8.90 },
    { kat: 'Material & Verbrauchsstoffe', beschreibung: 'Fassadenfarbe Silikonharz', einheit: 'kg', einzelpreis: 15.20 },
    { kat: 'Material & Verbrauchsstoffe', beschreibung: 'Buntlack seidenmatt (Holz & Metall)', einheit: 'kg', einzelpreis: 24.00 },
    { kat: 'Material & Verbrauchsstoffe', beschreibung: 'Kleinmaterialpauschale (Schleifpapier, Klebeband, Pinsel)', einheit: 'Pausch.', einzelpreis: 45.00 },
  ];

  const insertedLeistungen = [];
  for (const l of katalogLeistungen) {
    const { data: lData } = await supabase
      .from('katalog_leistungen')
      .insert({
        tenant_id: ATELIER77_TENANT_ID,
        kategorie_id: katMap[l.kat] || null,
        beschreibung: l.beschreibung,
        einheit: l.einheit,
        einzelpreis: l.einzelpreis
      })
      .select()
      .single();
    if (lData) insertedLeistungen.push(lData);
  }
  console.log(`✅ ${insertedLeistungen.length} Maler-Positionen im Leistungskatalog angelegt.`);

  // Position-Finder
  function getItem(keyword, unit, price) {
    const match = insertedLeistungen.find(k => k.beschreibung.toLowerCase().includes(keyword.toLowerCase()));
    if (match) {
      return {
        beschreibung: match.beschreibung,
        einheit: match.einheit || unit,
        einzelpreis: parseFloat(match.einzelpreis)
      };
    }
    return { beschreibung: keyword, einheit: unit, einzelpreis: price };
  }

  const pAbdecken = getItem('Abdecken', 'm²', 8.50);
  const pWaende = getItem('Wände streichen (Dispersion', 'm²', 23.50);
  const pDecke = getItem('Decke streichen', 'm²', 26.00);
  const pTueren = getItem('Türen', 'Stk', 185.00);
  const pFenster = getItem('Fensterrahmen', 'lfm', 25.00);
  const pFarbig = getItem('farbig', 'm²', 8.50);
  const pHeizkoerper = getItem('Heizkörper', 'Stk', 85.00);
  const pSockel = getItem('Sockelleisten', 'lfm', 12.00);
  const pRisse = getItem('Risse', 'h', 85.00);
  const pFassade = getItem('Fassade streichen', 'm²', 39.00);
  const pSockelAussen = getItem('Fassadensockel', 'm²', 45.00);
  const pStucco = getItem('Stucco Veneziano', 'm²', 145.00);

  // =========================================================================
  // 6. KUNDEN ANLEGEN (6 Verwaltungen / Firmen + 5 Privatkunden in Bern)
  // =========================================================================
  console.log('\n👥 6. Erstelle 11 Berner Kunden (Verwaltungen & Privatpersonen)...');

  const kundenDefinitions = [
    {
      kundennummer: 'K-1001',
      typ: 'Bewirtschaftung',
      anrede: 'Firma',
      name: 'Von Graffenried AG Liegenschaften',
      firmenname: 'Von Graffenried AG Liegenschaften',
      vorname: 'Beat',
      nachname: 'Hostettler',
      strasse: 'Marktgass-Passage 3',
      plz: '3011',
      ort: 'Bern',
      land: 'Schweiz',
      telefon: '031 320 57 22',
      email: 'beat.hostettler@graffenried.ch',
      website: 'https://www.graffenried.ch',
      zahlungsziel: '30 Tage netto',
      status: 'Aktiv',
      notizen: 'Führende Berner Liegenschaftsverwaltung. Betreut Objekte im Kirchenfeld und Länggasse.',
      created_at: '2026-10-01T08:00:00Z',
      tenant_id: ATELIER77_TENANT_ID
    },
    {
      kundennummer: 'K-1002',
      typ: 'Bewirtschaftung',
      anrede: 'Firma',
      name: 'Adlatus AG Immobilien & Treuhand',
      firmenname: 'Adlatus AG Immobilien & Treuhand',
      vorname: 'Sandra',
      nachname: 'Nydegger',
      strasse: 'Thunstrasse 24',
      plz: '3005',
      ort: 'Bern',
      land: 'Schweiz',
      telefon: '031 350 18 00',
      email: 's.nydegger@adlatus-bern.ch',
      website: 'https://www.adlatus-bern.ch',
      zahlungsziel: '30 Tage netto',
      status: 'Aktiv',
      notizen: 'Regelmässige Aufträge für Wohnungsrenovationen bei Mieterwechseln.',
      created_at: '2026-10-05T09:30:00Z',
      tenant_id: ATELIER77_TENANT_ID
    },
    {
      kundennummer: 'K-1003',
      typ: 'Bewirtschaftung',
      anrede: 'Firma',
      name: 'PRIVERA AG (Niederlassung Bern)',
      firmenname: 'PRIVERA AG',
      vorname: 'Marc',
      nachname: 'Zaugg',
      strasse: 'Zentweg 9',
      plz: '3006',
      ort: 'Bern',
      land: 'Schweiz',
      telefon: '058 715 60 00',
      email: 'marc.zaugg@privera.ch',
      website: 'https://www.privera.ch',
      zahlungsziel: '30 Tage netto',
      status: 'Aktiv',
      notizen: 'Gewerbe- und Wohnüberbauungen in Bern Ost und Gümligen.',
      created_at: '2026-10-10T10:15:00Z',
      tenant_id: ATELIER77_TENANT_ID
    },
    {
      kundennummer: 'K-1004',
      typ: 'Bewirtschaftung',
      anrede: 'Firma',
      name: 'Livit AG Real Estate Management',
      firmenname: 'Livit AG Real Estate Management',
      vorname: 'Fabian',
      nachname: 'Schmutz',
      strasse: 'Gutenbergstrasse 14',
      plz: '3011',
      ort: 'Bern',
      land: 'Schweiz',
      telefon: '058 360 33 33',
      email: 'fabian.schmutz@livit.ch',
      website: 'https://www.livit.ch',
      zahlungsziel: '30 Tage netto',
      status: 'Aktiv',
      notizen: 'Grosse Liegenschaftsportfolios. Streng getaktete Sanierungsfenster.',
      created_at: '2026-10-12T11:00:00Z',
      tenant_id: ATELIER77_TENANT_ID
    },
    {
      kundennummer: 'K-1005',
      typ: 'Bewirtschaftung',
      anrede: 'Firma',
      name: 'Wincasa AG (Filiale Bern)',
      firmenname: 'Wincasa AG',
      vorname: 'Corinne',
      nachname: 'Marti',
      strasse: 'Laupenstrasse 18',
      plz: '3008',
      ort: 'Bern',
      land: 'Schweiz',
      telefon: '031 385 85 85',
      email: 'corinne.marti@wincasa.ch',
      website: 'https://www.wincasa.ch',
      zahlungsziel: '30 Tage netto',
      status: 'Aktiv',
      notizen: 'Büro- und Gewerbeumbauten sowie repräsentative Mietwohnungen.',
      created_at: '2026-10-15T14:00:00Z',
      tenant_id: ATELIER77_TENANT_ID
    },
    {
      kundennummer: 'K-1006',
      typ: 'Bewirtschaftung',
      anrede: 'Firma',
      name: 'Dr. Meyer Immobilien AG',
      firmenname: 'Dr. Meyer Immobilien AG',
      vorname: 'Thomas',
      nachname: 'Bieri',
      strasse: 'Morillonstrasse 82',
      plz: '3007',
      ort: 'Bern',
      land: 'Schweiz',
      telefon: '031 996 42 42',
      email: 't.bieri@dr-meyer.ch',
      website: 'https://www.dr-meyer.ch',
      zahlungsziel: '30 Tage netto',
      status: 'Aktiv',
      notizen: 'Fokus auf Altbauten im Monbijou- und Mattenhofquartier.',
      created_at: '2026-10-18T09:00:00Z',
      tenant_id: ATELIER77_TENANT_ID
    },
    {
      kundennummer: 'K-1007',
      typ: 'Privatperson',
      anrede: 'Herr & Frau',
      name: 'Dr. med. Christian & Barbara Gerber',
      firmenname: '',
      vorname: 'Christian & Barbara',
      nachname: 'Gerber',
      strasse: 'Brunnadernstrasse 48',
      plz: '3006',
      ort: 'Bern',
      land: 'Schweiz',
      telefon: '031 352 14 88',
      email: 'c.gerber@bluewin.ch',
      website: '',
      zahlungsziel: '14 Tage netto',
      status: 'Aktiv',
      notizen: 'Kirchenfeld-Villa. Sehr qualitätsbewusst, legen Wert auf lösemittelfreie Bio-Farben.',
      created_at: '2026-10-20T13:45:00Z',
      tenant_id: ATELIER77_TENANT_ID
    },
    {
      kundennummer: 'K-1008',
      typ: 'Privatperson',
      anrede: 'Herr & Frau',
      name: 'Patrick & Sophie Vögeli',
      firmenname: '',
      vorname: 'Patrick & Sophie',
      nachname: 'Vögeli',
      strasse: 'Waldheimstrasse 19',
      plz: '3012',
      ort: 'Bern',
      land: 'Schweiz',
      telefon: '079 418 73 90',
      email: 'sophie.voegeli@gmx.ch',
      website: '',
      zahlungsziel: '30 Tage netto',
      status: 'Aktiv',
      notizen: 'Renovation einer 4.5-Zimmer-Eigentumswohnung in der Länggasse.',
      created_at: '2026-10-22T16:20:00Z',
      tenant_id: ATELIER77_TENANT_ID
    },
    {
      kundennummer: 'K-1009',
      typ: 'Privatperson',
      anrede: 'Herr & Frau',
      name: 'Hansueli & Elisabeth Stettler',
      firmenname: '',
      vorname: 'Hansueli & Elisabeth',
      nachname: 'Stettler',
      strasse: 'Muriweg 12',
      plz: '3074',
      ort: 'Muri bei Bern',
      land: 'Schweiz',
      telefon: '031 951 22 40',
      email: 'hstettler@quickline.ch',
      website: '',
      zahlungsziel: '30 Tage netto',
      status: 'Aktiv',
      notizen: 'Einfamilienhaus in Muri. Dachuntersichten, Fensterläden und Sockelanstrich.',
      created_at: '2026-10-25T10:00:00Z',
      tenant_id: ATELIER77_TENANT_ID
    },
    {
      kundennummer: 'K-1010',
      typ: 'Privatperson',
      anrede: 'Frau',
      name: 'Sabine Wyss',
      firmenname: '',
      vorname: 'Sabine',
      nachname: 'Wyss',
      strasse: 'Scheibenstrasse 35',
      plz: '3014',
      ort: 'Bern',
      land: 'Schweiz',
      telefon: '078 620 91 15',
      email: 's.wyss@me.com',
      website: '',
      zahlungsziel: '30 Tage netto',
      status: 'Aktiv',
      notizen: 'Breitenrain. Neuanstrich Korridor, Wohnsalon und Stuckaturdecken.',
      created_at: '2026-10-28T14:30:00Z',
      tenant_id: ATELIER77_TENANT_ID
    },
    {
      kundennummer: 'K-1011',
      typ: 'Privatperson',
      anrede: 'Herr',
      name: 'Stefan Baumann',
      firmenname: '',
      vorname: 'Stefan',
      nachname: 'Baumann',
      strasse: 'Schwarzenburgstrasse 114',
      plz: '3097',
      ort: 'Liebefeld',
      land: 'Schweiz',
      telefon: '079 330 45 82',
      email: 'baumann.stefan@sunrise.ch',
      website: '',
      zahlungsziel: '30 Tage netto',
      status: 'Aktiv',
      notizen: 'Praxis- und Büroräume im Erdgeschoss. Farbkonzept und Schalldämmputz.',
      created_at: '2026-11-01T09:15:00Z',
      tenant_id: ATELIER77_TENANT_ID
    }
  ];

  const { data: insertedKunden, error: kundenErr } = await supabase
    .from('kunden')
    .insert(kundenDefinitions)
    .select();

  if (kundenErr) {
    console.error('❌ Fehler beim Einfügen der Kunden:', kundenErr);
    process.exit(1);
  }
  console.log(`✅ ${insertedKunden.length} Berner Kunden angelegt.`);

  const kMap = {};
  insertedKunden.forEach(k => { kMap[k.kundennummer] = k; });

  // =========================================================================
  // 7. PROJEKTE, OFFERTEN & RECHNUNGEN (ZEITLICHER VERLAUF OKTOBER / NOVEMBER 2026)
  // =========================================================================
  console.log('\n🏗️ 7. Erstelle Maler-Projekte, Offerten und Rechnungen...');

  function makePos(posNr, item, menge, totalCalc = null) {
    const total = totalCalc !== null ? totalCalc : Math.round(menge * item.einzelpreis * 100) / 100;
    return {
      posNr: String(posNr),
      type: 'position',
      beschreibung: item.beschreibung,
      menge: Number(menge),
      einheit: item.einheit,
      einzelpreis: Number(item.einzelpreis),
      total: Number(total)
    };
  }

  function makeDocData(titel, dateStr, leistungen, einleitung, schluss, rabatt = 0) {
    const nettoTotal = leistungen.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
    const rabattAmount = Math.round(nettoTotal * (rabatt / 100) * 100) / 100;
    const nachRabatt = nettoTotal - rabattAmount;
    const mwstAmount = Math.round(nachRabatt * 0.081 * 100) / 100;
    const finalTotal = Math.round((nachRabatt + mwstAmount) * 100) / 100;

    return {
      titel,
      einleitungstext: einleitung || 'Gerne unterbreiten wir Ihnen für die besprochenen Malerarbeiten folgendes Angebot:',
      schlusstext: schluss || 'Wir danken Ihnen für das entgegengebrachte Vertrauen und stehen bei Fragen gerne zur Verfügung.',
      konditionen: {
        rabatt: rabatt,
        mwst: 8.1,
        gueltigkeit: '30 Tage',
        zahlungsfrist: '30 Tage Netto'
      },
      leistungen,
      offertendetails: {
        titel,
        datum: dateStr
      },
      rechnungsdetails: {
        typ: 'Gesamtrechnung',
        datum: dateStr,
        zahlungsziel: '30 Tage netto'
      },
      nettoTotal,
      finalTotal
    };
  }

  const scenarios = [
    // 1. Von Graffenried: Ensingerstrasse 15 (Abgeschlossen, Offerte akzeptiert, Rechnung bezahlt im Oktober)
    {
      kNr: 'K-1001',
      pName: 'Wohnungswechsel 4.5-Zi, Ensingerstrasse 15',
      pAdresse: 'Ensingerstrasse 15, 3006 Bern',
      pKategorie: 'Sanierung',
      pStatus: 'Abgeschlossen',
      pStart: '2026-10-06',
      pEnd: '2026-10-16',
      pNotizen: 'Termingerechte Fertigstellung vor Einzug der Neumieter. Abnahme ohne Mängel.',
      offerte: {
        nr: 'OFF-2026-1001',
        date: '2026-10-02',
        status: 'Akzeptiert',
        titel: 'Offerte Malerarbeiten 4.5-Zi-Wohnung Ensingerstrasse',
        positions: [
          makePos('1.1', pAbdecken, 85),
          makePos('1.2', pRisse, 8),
          makePos('1.3', pWaende, 110),
          makePos('1.4', pDecke, 85),
          makePos('1.5', pTueren, 5)
        ]
      },
      rechnung: {
        nr: 'RE-2026-1001',
        date: '2026-10-18',
        faellig: '2026-11-17',
        status: 'Bezahlt',
        bezahltAm: '2026-11-04'
      }
    },

    // 2. Adlatus AG: Thunstrasse 30 (Abgeschlossen, Rechnung bezahlt)
    {
      kNr: 'K-1002',
      pName: 'Sanierung 3.5-Zi, Thunstrasse 30',
      pAdresse: 'Thunstrasse 30, 3005 Bern',
      pKategorie: 'Sanierung',
      pStatus: 'Abgeschlossen',
      pStart: '2026-10-12',
      pEnd: '2026-10-23',
      pNotizen: 'Komplettrenovation inkl. Heizkörper und Holztüren.',
      offerte: {
        nr: 'OFF-2026-1002',
        date: '2026-10-08',
        status: 'Akzeptiert',
        titel: 'Offerte Sanierung 3.5-Zimmer-Wohnung Thunstrasse',
        positions: [
          makePos('1.1', pAbdecken, 70),
          makePos('1.2', pWaende, 85),
          makePos('1.3', pDecke, 60),
          makePos('1.4', pTueren, 4),
          makePos('1.5', pHeizkoerper, 5)
        ]
      },
      rechnung: {
        nr: 'RE-2026-1002',
        date: '2026-10-24',
        faellig: '2026-11-23',
        status: 'Bezahlt',
        bezahltAm: '2026-11-10'
      }
    },

    // 3. Von Graffenried: Falkenplatz 7 (Aktuell in Arbeit, Offerte akzeptiert, Rechnung versendet/offen fällig Ende Nov)
    {
      kNr: 'K-1001',
      pName: 'Treppenhausrenovation 4 Etagen, Falkenplatz 7',
      pAdresse: 'Falkenplatz 7, 3012 Bern',
      pKategorie: 'Umbau',
      pStatus: 'In Arbeit',
      pStart: '2026-11-02',
      pEnd: '2026-11-27',
      pNotizen: 'Mehrfamilienhaus 4 Etagen. Vorlackieren Geländer und Wände abwaschbar streichen.',
      offerte: {
        nr: 'OFF-2026-1003',
        date: '2026-10-24',
        status: 'Akzeptiert',
        titel: 'Offerte Treppenhaussanierung 4 Stockwerke Falkenplatz',
        positions: [
          makePos('1.1', pAbdecken, 120),
          makePos('1.2', pRisse, 16),
          makePos('1.3', pWaende, 210),
          makePos('1.4', pDecke, 70),
          makePos('1.5', pSockel, 65)
        ]
      },
      rechnung: {
        nr: 'RE-2026-1003',
        date: '2026-11-12',
        faellig: '2026-12-12',
        status: 'Versendet', // Offen, innerhalb Frist
        bezahltAm: null
      }
    },

    // 4. Dr. Meyer AG: Monbijoustrasse 61 (Fällige Rechnung / Mahnstufe 1 zur Vorführung des Mahnwesens!)
    {
      kNr: 'K-1006',
      pName: 'Sockelanstrich & Graffitischutz, Monbijoustrasse 61',
      pAdresse: 'Monbijoustrasse 61, 3007 Bern',
      pKategorie: 'Fassade',
      pStatus: 'Abgeschlossen',
      pStart: '2026-10-05',
      pEnd: '2026-10-10',
      pNotizen: 'Arbeiten abgenommen. Rechnung zur Zahlung angemahnt.',
      offerte: {
        nr: 'OFF-2026-1004',
        date: '2026-09-28',
        status: 'Akzeptiert',
        titel: 'Offerte Sockelanstrich und Graffitischutz Monbijou',
        positions: [
          makePos('1.1', pAbdecken, 40),
          makePos('1.2', pSockelAussen, 35),
          makePos('1.3', pRisse, 4)
        ]
      },
      rechnung: {
        nr: 'RE-2026-1004',
        date: '2026-10-12',
        faellig: '2026-11-11',
        status: 'Mahnstufe 1', // Überfällig, 1. Mahnung
        bezahltAm: null
      }
    },

    // 5. PRIVERA AG: Zentweg 15 (Offerte versendet, wartet auf Freigabe)
    {
      kNr: 'K-1003',
      pName: 'Büroflächen Neuanstrich 280 m², Zentweg 15',
      pAdresse: 'Zentweg 15, 3006 Bern',
      pKategorie: 'Gewerbe',
      pStatus: 'In Planung',
      pStart: '2026-11-30',
      pEnd: '2026-12-11',
      pNotizen: 'Besichtigung mit Herrn Zaugg erfolgt. Offerte zur Genehmigung bei Eigentümerschaft.',
      offerte: {
        nr: 'OFF-2026-1005',
        date: '2026-11-14',
        status: 'Versendet',
        titel: 'Offerte Neuanstrich Büroflächen 280 m² Zentweg',
        positions: [
          makePos('1.1', pAbdecken, 280),
          makePos('1.2', pWaende, 420),
          makePos('1.3', pDecke, 280),
          makePos('1.4', pTueren, 8)
        ]
      }
    },

    // 6. Privatkunde Dr. Gerber: Brunnadernstrasse (Villa Kirchenfeld, Exklusive Spachteltechnik & Malerarbeiten)
    {
      kNr: 'K-1007',
      pName: 'Wandgestaltung Stucco Veneziano, Brunnadernstrasse 48',
      pAdresse: 'Brunnadernstrasse 48, 3006 Bern',
      pKategorie: 'Umbau',
      pStatus: 'In Arbeit',
      pStart: '2026-11-16',
      pEnd: '2026-11-25',
      pNotizen: 'Exklusive Gestaltung Kaminzimmer und Essbereich mit ökologischer Kalkglättetechnik.',
      offerte: {
        nr: 'OFF-2026-1006',
        date: '2026-11-05',
        status: 'Akzeptiert',
        titel: 'Offerte Exklusive Kalkspachteltechnik Stucco Veneziano',
        positions: [
          makePos('1.1', pAbdecken, 45),
          makePos('1.2', pStucco, 38),
          makePos('1.3', pFarbig, 55),
          makePos('1.4', pDecke, 45)
        ]
      },
      rechnung: {
        nr: 'RE-2026-1005',
        date: '2026-11-18',
        faellig: '2026-12-02',
        status: 'Versendet',
        bezahltAm: null
      }
    },

    // 7. Sabine Wyss: Scheibenstrasse 35 (Breitenrain, Offerte Entwurf)
    {
      kNr: 'K-1010',
      pName: 'Farbgestaltung Wohnsalon & Stuckaturdecken, Scheibenstrasse 35',
      pAdresse: 'Scheibenstrasse 35, 3014 Bern',
      pKategorie: 'Sanierung',
      pStatus: 'Aktiv',
      pStart: '2026-11-19',
      pEnd: null,
      pNotizen: 'Besichtigung am 19.11. Offerte in Ausarbeitung für Lorina Schmid zur finalen Prüfung.',
      offerte: {
        nr: 'OFF-2026-1007',
        date: '2026-11-19',
        status: 'Entwurf',
        titel: 'Offerte Farbgestaltung Wohnsalon & Stuckdecken',
        positions: [
          makePos('1.1', pAbdecken, 35),
          makePos('1.2', pRisse, 6),
          makePos('1.3', pDecke, 35),
          makePos('1.4', pFarbig, 48)
        ]
      }
    },

    // 8. Von Graffenried: Wasserschaden Effingerstrasse (Neu eingetroffener Schadenfall)
    {
      kNr: 'K-1001',
      pName: 'Wasserschaden Reparatur, Effingerstrasse 22',
      pAdresse: 'Effingerstrasse 22, 3008 Bern',
      pKategorie: 'Reparatur',
      pStatus: 'Aktiv',
      pStart: '2026-11-20',
      pEnd: null,
      pNotizen: 'Notfall-Meldung von Herrn Hostettler. Besichtigungstermin steht für nächste Woche.',
      offerte: {
        nr: 'OFF-2026-1008',
        date: '2026-11-20',
        status: 'Entwurf',
        titel: 'Offerte Wasserschadensanierung Decke & Wand Effingerstrasse',
        positions: [
          makePos('1.1', pAbdecken, 20),
          makePos('1.2', pRisse, 5),
          makePos('1.3', pDecke, 20),
          makePos('1.4', pWaende, 30)
        ]
      }
    },

    // 9. Patrick & Sophie Vögeli: Waldheimstrasse 19 (Länggasse)
    {
      kNr: 'K-1008',
      pName: 'Renovation Eigentumswohnung 4.5-Zi, Waldheimstrasse 19',
      pAdresse: 'Waldheimstrasse 19, 3012 Bern',
      pKategorie: 'Umbau',
      pStatus: 'In Planung',
      pStart: '2026-12-07',
      pEnd: '2026-12-18',
      pNotizen: 'Termin für Farbberatung vereinbart.',
      offerte: {
        nr: 'OFF-2026-1009',
        date: '2026-11-18',
        status: 'Versendet',
        titel: 'Offerte Maler- und Lackierarbeiten Eigentumswohnung',
        positions: [
          makePos('1.1', pAbdecken, 90),
          makePos('1.2', pWaende, 120),
          makePos('1.3', pDecke, 90),
          makePos('1.4', pTueren, 6),
          makePos('1.5', pFenster, 18)
        ]
      }
    }
  ];

  const createdProjectsMap = {};
  let createdProjekteCount = 0;
  let createdOffertenCount = 0;
  let createdRechnungenCount = 0;

  for (const s of scenarios) {
    const kunde = kMap[s.kNr];
    if (!kunde) continue;

    // 1. Projekt erstellen
    const { data: pData, error: pErr } = await supabase
      .from('projekte')
      .insert({
        tenant_id: ATELIER77_TENANT_ID,
        kunden_id: kunde.id,
        name: s.pName,
        adresse: s.pAdresse,
        kategorie: s.pKategorie,
        status: s.pStatus,
        startdatum: s.pStart,
        enddatum: s.pEnd,
        notizen: s.pNotizen,
        created_at: new Date(s.pStart + 'T08:00:00Z').toISOString()
      })
      .select()
      .single();

    if (pErr) {
      console.error(`❌ Fehler beim Projekt ${s.pName}:`, pErr);
      continue;
    }
    createdProjekteCount++;
    createdProjectsMap[s.pName] = pData;

    // 2. Offerte erstellen
    let createdOfferte = null;
    if (s.offerte) {
      const offDoc = makeDocData(
        s.offerte.titel,
        s.offerte.date,
        s.offerte.positions,
        null,
        null,
        0
      );

      const gueltigBis = new Date(s.offerte.date);
      gueltigBis.setDate(gueltigBis.getDate() + 30);

      const { data: oData, error: oErr } = await supabase
        .from('offerten')
        .insert({
          tenant_id: ATELIER77_TENANT_ID,
          projekt_id: pData.id,
          kunden_id: kunde.id,
          offerte_nr: s.offerte.nr,
          total: offDoc.finalTotal,
          status: s.offerte.status,
          gueltig_bis: gueltigBis.toISOString().split('T')[0],
          daten: offDoc,
          created_at: new Date(s.offerte.date + 'T09:00:00Z').toISOString()
        })
        .select()
        .single();

      if (!oErr && oData) {
        createdOffertenCount++;
        createdOfferte = oData;
      }
    }

    // 3. Rechnung erstellen
    if (s.rechnung && createdOfferte) {
      const rechDoc = makeDocData(
        `Rechnung für ${pData.name}`,
        s.rechnung.date,
        s.offerte.positions,
        'Wir danken Ihnen für den geschätzten Auftrag und stellen Ihnen die ausgeführten Malerarbeiten wie folgt in Rechnung:',
        'Bitte überweisen Sie den Betrag unter Angabe der Rechnungsnummer innert der Zahlungsfrist auf unser Bankkonto. Besten Dank!'
      );

      const totalVal = createdOfferte.total;
      const isPaid = s.rechnung.status === 'Bezahlt';
      const bezahltBetrag = isPaid ? totalVal : 0;

      const { data: rData, error: rErr } = await supabase
        .from('rechnungen')
        .insert({
          tenant_id: ATELIER77_TENANT_ID,
          projekt_id: pData.id,
          kunden_id: kunde.id,
          offerte_id: createdOfferte.id,
          rechnung_nr: s.rechnung.nr,
          total: totalVal,
          status: s.rechnung.status,
          typ: 'gesamt',
          bezahlt: bezahltBetrag,
          rechnungsdatum: s.rechnung.date,
          zahlungsfrist_tage: 30,
          faellig_am: s.rechnung.faellig,
          bezahlt_am: s.rechnung.bezahltAm,
          daten: rechDoc,
          created_at: new Date(s.rechnung.date + 'T10:00:00Z').toISOString()
        })
        .select()
        .single();

      if (!rErr && rData) {
        createdRechnungenCount++;
        await supabase
          .from('offerten')
          .update({ rechnung_id: rData.id })
          .eq('id', createdOfferte.id);
      }
    }
  }

  console.log(`✅ ${createdProjekteCount} Projekte angelegt.`);
  console.log(`✅ ${createdOffertenCount} Offerten angelegt.`);
  console.log(`✅ ${createdRechnungenCount} Rechnungen angelegt.`);

  // =========================================================================
  // 8. KALENDER-TERMINE (RUND UM SAMSTAG 21.11.2026 & FOLGEWOCHE)
  // =========================================================================
  console.log('\n📅 8. Erstelle realistische Kalendertermine für Leandro Lüthi...');

  const leandroUserId = createdUserMap['leandro@atelier-77.ch'];

  const termineDefinitions = [
    // Samstag 21.11.2026 (Meeting & Baustellen-Schedule)
    {
      titel: 'Abnahme Kaminzimmer Villa Brunnadern (Dr. Gerber)',
      beschreibung: 'Zwischenabnahme der Stucco Veneziano Spachtelarbeiten vor Ort im Kirchenfeld.',
      datum: '2026-11-21',
      startzeit: '09:00',
      endzeit: '10:30',
      ganztaegig: false,
      typ: 'Abnahme',
      status: 'Geplant',
      projekt_name: 'Wandgestaltung Stucco Veneziano, Brunnadernstrasse 48',
      kunden_nr: 'K-1007',
      ort: 'Brunnadernstrasse 48, 3006 Bern',
      farbe: '#14b8a6'
    },
    {
      titel: 'Farbberatung & Musterpräsentation Sabine Wyss',
      beschreibung: 'Präsentation der Musteranstrich-Platten Salbeigrün und Altweiss für den Wohnsalon.',
      datum: '2026-11-21',
      startzeit: '11:00',
      endzeit: '12:15',
      ganztaegig: false,
      typ: 'Kundentermin',
      status: 'Geplant',
      projekt_name: 'Farbgestaltung Wohnsalon & Stuckaturdecken, Scheibenstrasse 35',
      kunden_nr: 'K-1010',
      ort: 'Scheibenstrasse 35, 3014 Bern',
      farbe: '#a855f7'
    },
    {
      titel: 'Baustellenvisite Treppenhaus Falkenplatz',
      beschreibung: 'Kontrolle Trocknungszeit Zwischenanstrich Etage 3 mit Monteur.',
      datum: '2026-11-21',
      startzeit: '13:30',
      endzeit: '14:30',
      ganztaegig: false,
      typ: 'Montage',
      status: 'Geplant',
      projekt_name: 'Treppenhausrenovation 4 Etagen, Falkenplatz 7',
      kunden_nr: 'K-1001',
      ort: 'Falkenplatz 7, 3012 Bern',
      farbe: '#10b981'
    },

    // Montag 23.11.2026
    {
      titel: 'Baustelleneinrichtung & Lackierstart Falkenplatz',
      beschreibung: 'Wohnungstüren und Treppengeländer schleifen und grundieren.',
      datum: '2026-11-23',
      startzeit: '07:30',
      endzeit: '16:30',
      ganztaegig: false,
      typ: 'Montage',
      status: 'Geplant',
      projekt_name: 'Treppenhausrenovation 4 Etagen, Falkenplatz 7',
      kunden_nr: 'K-1001',
      ort: 'Falkenplatz 7, 3012 Bern',
      farbe: '#10b981'
    },

    // Dienstag 24.11.2026
    {
      titel: 'Wasserschaden-Inspektion Effingerstrasse (Von Graffenried)',
      beschreibung: 'Feuchtigkeitsmessung und Bestandsaufnahme mit Beat Hostettler.',
      datum: '2026-11-24',
      startzeit: '09:00',
      endzeit: '10:30',
      ganztaegig: false,
      typ: 'Aufmass',
      status: 'Geplant',
      projekt_name: 'Wasserschaden Reparatur, Effingerstrasse 22',
      kunden_nr: 'K-1001',
      ort: 'Effingerstrasse 22, 3008 Bern',
      farbe: '#6366f1'
    },

    // Mittwoch 25.11.2026
    {
      titel: 'Objektbesichtigung Zentweg 15 (PRIVERA AG)',
      beschreibung: 'Begehung der 280 m² Gewerbefläche mit Marc Zaugg für Sanierungsfenster.',
      datum: '2026-11-25',
      startzeit: '14:00',
      endzeit: '15:30',
      ganztaegig: false,
      typ: 'Kundentermin',
      status: 'Geplant',
      projekt_name: 'Büroflächen Neuanstrich 280 m², Zentweg 15',
      kunden_nr: 'K-1003',
      ort: 'Zentweg 15, 3006 Bern',
      farbe: '#a855f7'
    },

    // Donnerstag 26.11.2026
    {
      titel: 'Farbberatung Vögeli Länggasse',
      beschreibung: 'Farbtonauswahl für 4.5-Zimmer-Wohnung Waldheimstrasse.',
      datum: '2026-11-26',
      startzeit: '16:00',
      endzeit: '17:15',
      ganztaegig: false,
      typ: 'Kundentermin',
      status: 'Geplant',
      projekt_name: 'Renovation Eigentumswohnung 4.5-Zi, Waldheimstrasse 19',
      kunden_nr: 'K-1008',
      ort: 'Waldheimstrasse 19, 3012 Bern',
      farbe: '#a855f7'
    },

    // Freitag 27.11.2026
    {
      titel: 'Schlussabnahme Treppenhaus Falkenplatz (Beat Hostettler)',
      beschreibung: 'Offizielle Übergabe mit Liegenschaftsverwaltung Von Graffenried AG.',
      datum: '2026-11-27',
      startzeit: '11:00',
      endzeit: '12:00',
      ganztaegig: false,
      typ: 'Abnahme',
      status: 'Geplant',
      projekt_name: 'Treppenhausrenovation 4 Etagen, Falkenplatz 7',
      kunden_nr: 'K-1001',
      ort: 'Falkenplatz 7, 3012 Bern',
      farbe: '#14b8a6'
    }
  ];

  let createdTermineCount = 0;
  for (const t of termineDefinitions) {
    const proj = createdProjectsMap[t.projekt_name];
    const kunde = kMap[t.kunden_nr];

    const { error: tErr } = await supabase.from('termine').insert({
      tenant_id: ATELIER77_TENANT_ID,
      titel: t.titel,
      beschreibung: t.beschreibung,
      datum: t.datum,
      startzeit: t.startzeit,
      endzeit: t.endzeit,
      ganztaegig: t.ganztaegig,
      typ: t.typ,
      status: t.status,
      projekt_id: proj ? proj.id : null,
      kunden_id: kunde ? kunde.id : null,
      ort: t.ort,
      farbe: t.farbe,
      erstellt_von: leandroUserId
    });

    if (tErr) {
      console.error(`❌ Fehler beim Termin '${t.titel}':`, tErr);
    } else {
      createdTermineCount++;
    }
  }
  console.log(`✅ ${createdTermineCount} Kalendertermine erfolgreich angelegt.`);

  // =========================================================================
  // 9. ABSCHLIESSENDER VERIFIKATIONSTEST (LOGIN-CHECK)
  // =========================================================================
  console.log('\n📊 9. Finale Verifikation und Login-Tests...');

  const { count: countKunden } = await supabase.from('kunden').select('*', { count: 'exact', head: true }).eq('tenant_id', ATELIER77_TENANT_ID);
  const { count: countProjekte } = await supabase.from('projekte').select('*', { count: 'exact', head: true }).eq('tenant_id', ATELIER77_TENANT_ID);
  const { count: countOfferten } = await supabase.from('offerten').select('*', { count: 'exact', head: true }).eq('tenant_id', ATELIER77_TENANT_ID);
  const { count: countRechnungen } = await supabase.from('rechnungen').select('*', { count: 'exact', head: true }).eq('tenant_id', ATELIER77_TENANT_ID);
  const { count: countTermine } = await supabase.from('termine').select('*', { count: 'exact', head: true }).eq('tenant_id', ATELIER77_TENANT_ID);

  console.log('----------------------------------------------------');
  console.log(`Mandant:                Atelier 77 (${ATELIER77_TENANT_ID})`);
  console.log(`Kunden:                 ${countKunden} (Erwartet: 11)`);
  console.log(`Projekte:               ${countProjekte} (Erwartet: 9)`);
  console.log(`Offerten:               ${countOfferten} (Erwartet: 9)`);
  console.log(`Rechnungen:             ${countRechnungen} (Erwartet: 5)`);
  console.log(`Kalender-Termine:       ${countTermine} (Erwartet: 8)`);
  console.log('----------------------------------------------------');

  // Teste reale Logins
  console.log('\n🔑 Teste Anmeldefähigkeit mit den vergebenen Passwörtern:');
  const testCredentials = [
    { email: 'leandro@atelier-77.ch', password: 'Leandro77!', name: 'Leandro Lüthi' },
    { email: 'info@atelier-77.ch', password: 'Lorina77!', name: 'Lorina Schmid' }
  ];

  for (const cred of testCredentials) {
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: cred.email,
      password: cred.password
    });

    if (authErr) {
      console.error(`  ❌ Login fehlgeschlagen für ${cred.name} (${cred.email}):`, authErr.message);
    } else {
      console.log(`  ✅ LOGIN ERFOLGREICH für ${cred.name} (${cred.email})!`);
      // Prüfe user_roles und user_tenants
      const { data: roleCheck } = await supabase.from('user_roles').select('*').eq('id', authData.user.id).single();
      const { data: tenantCheck } = await supabase.from('user_tenants').select('*').eq('user_id', authData.user.id);
      console.log(`     -> Rolle: ${roleCheck?.role} (${roleCheck?.user_name})`);
      console.log(`     -> Mandantenzuordnung: ${tenantCheck?.length} aktiv (${tenantCheck?.[0]?.tenant_id})`);
    }
  }

  console.log('\n🎉 Atelier 77 ist vollständig und schlüsselfertig für Samstag eingerichtet!');
}

runSetup().catch(err => {
  console.error('Fataler Setup-Fehler:', err);
  process.exit(1);
});
