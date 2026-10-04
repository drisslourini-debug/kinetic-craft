import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fpfdlraqtqtcnmajrcyx.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SERVICE_ROLE_KEY) {
  console.error('FEHLER: SUPABASE_SERVICE_ROLE_KEY Umgebungsvariable fehlt.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const ATELIER77_TENANT_ID = 'ce510545-c59b-4f0d-b89b-89f756cbb378';

async function runSetup() {
  console.log('🚀 Starte Initialisierung der Umgebung für Malerei Leandro Lüthi - Atelier 77...\n');

  // =========================================================================
  // 1. TENANT PRÜFEN & AKTUALISIEREN
  // =========================================================================
  console.log('🏢 1. Prüfe und sichere Hauptmandant Atelier 77...');
  const { data: mainTenant, error: tenantErr } = await supabase
    .from('tenants')
    .upsert({
      id: ATELIER77_TENANT_ID,
      name: 'Malerei Leandro Lüthi - Atelier 77',
      status: 'active'
    })
    .select()
    .single();

  if (tenantErr) {
    console.error('❌ Fehler beim Erstellen/Aktualisieren des Hauptmandanten:', tenantErr);
    process.exit(1);
  }
  console.log('✅ Hauptmandant aktiv:', mainTenant.name, `(${mainTenant.id})`);

  // =========================================================================
  // 2. BENUTZER & ROLLEN BEREINIGEN & ANLEGEN
  // =========================================================================
  console.log('\n👥 2. Bereinige alte Benutzer und erstelle Zugänge für Leandro & Frau...');
  const { data: userList, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('❌ Fehler beim Abrufen der Auth-Benutzer:', listErr);
    process.exit(1);
  }

  const keepEmails = ['amin.lourini@gmail.com'];
  const targetUsers = [
    { email: 'leandro@atelier-77.ch', name: 'Leandro Lüthi', role: 'admin' },
    { email: 'info@atelier-77.ch', name: 'Frau Lüthi / Büro', role: 'admin' },
  ];

  // Vorhandene Benutzer löschen (ausser amin.lourini@gmail.com und die Ziel-User, die wir updaten/neu anlegen)
  for (const u of userList.users) {
    const isTarget = targetUsers.some(tu => tu.email.toLowerCase() === u.email.toLowerCase());
    const isKeep = keepEmails.some(ke => ke.toLowerCase() === u.email.toLowerCase());

    if (!isKeep && !isTarget) {
      console.log(`  🗑️ Lösche alten Benutzer: ${u.email} (${u.id})`);
      await supabase.from('user_roles').delete().eq('id', u.id);
      await supabase.auth.admin.deleteUser(u.id);
    }
  }

  // Benutzer anlegen oder Passwort & Metadaten aktualisieren
  const createdUserMap = {};

  for (const tu of targetUsers) {
    const existing = userList.users.find(u => u.email.toLowerCase() === tu.email.toLowerCase());
    let userId;

    if (existing) {
      console.log(`  🔄 Aktualisiere bestehenden Benutzer: ${tu.email}`);
      const { data: updated, error: uErr } = await supabase.auth.admin.updateUserById(existing.id, {
        password: 'Test1234',
        email_confirm: true,
        user_metadata: { full_name: tu.name }
      });
      if (uErr) console.error(`  ⚠️ Fehler beim Update von ${tu.email}:`, uErr);
      userId = existing.id;
    } else {
      console.log(`  ✨ Erstelle neuen Benutzer: ${tu.email}`);
      const { data: created, error: cErr } = await supabase.auth.admin.createUser({
        email: tu.email,
        password: 'Test1234',
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

    // In user_roles sicherstellen
    await supabase.from('user_roles').upsert({
      id: userId,
      tenant_id: ATELIER77_TENANT_ID,
      role: tu.role,
      user_name: tu.name
    });
    console.log(`  ✅ Rolle 'admin' zugewiesen für: ${tu.name} (${tu.email})`);
  }

  // Amin sicherstellen
  const aminUser = userList.users.find(u => u.email.toLowerCase() === 'amin.lourini@gmail.com');
  if (aminUser) {
    await supabase.from('user_roles').upsert({
      id: aminUser.id,
      tenant_id: ATELIER77_TENANT_ID,
      role: 'admin',
      user_name: 'Amin Lourini'
    });
    console.log(`  ✅ Entwickler-Admin Amin Lourini bestätigt.`);
  }

  // =========================================================================
  // 3. ANDERE MANDANTEN LÖSCHEN
  // =========================================================================
  console.log('\n🧹 3. Bereinige andere Test-Mandanten (Flo Art, Musterfirma etc.)...');
  const otherTenantIds = ['c6ece51a-9d64-44f7-ae9e-eba1fcf2ab03', 'bc5f03b4-3db6-41c2-90fe-77e52a4772e5', '5555956a-c0a1-46a1-91b6-21c6c67b83f8'];

  for (const tid of otherTenantIds) {
    await supabase.from('offerten').update({ rechnung_id: null }).eq('tenant_id', tid);
    await supabase.from('dateien').delete().eq('tenant_id', tid);
    await supabase.from('termine').delete().eq('tenant_id', tid);
    await supabase.from('rechnungen').delete().eq('tenant_id', tid);
    await supabase.from('offerten').delete().eq('tenant_id', tid);
    await supabase.from('projekte').delete().eq('tenant_id', tid);
    await supabase.from('kunden').delete().eq('tenant_id', tid);
    await supabase.from('katalog_leistungen').delete().eq('tenant_id', tid);
    await supabase.from('katalog_kategorien').delete().eq('tenant_id', tid);
    await supabase.from('einstellungen').delete().eq('tenant_id', tid);
    await supabase.from('user_roles').delete().eq('tenant_id', tid);
    await supabase.from('tenants').delete().eq('id', tid);
  }
  console.log('✅ Überflüssige Mandanten und Daten bereinigt.');

  // =========================================================================
  // 4. ATELIER 77 ALTE TESTDATEN LEEREN
  // =========================================================================
  console.log('\n🗑️ 4. Lösche alte Testdaten für Atelier 77...');
  await supabase.from('offerten').update({ rechnung_id: null }).eq('tenant_id', ATELIER77_TENANT_ID);
  await supabase.from('dateien').delete().eq('tenant_id', ATELIER77_TENANT_ID);
  await supabase.from('termine').delete().eq('tenant_id', ATELIER77_TENANT_ID);
  await supabase.from('rechnungen').delete().eq('tenant_id', ATELIER77_TENANT_ID);
  await supabase.from('offerten').delete().eq('tenant_id', ATELIER77_TENANT_ID);
  await supabase.from('projekte').delete().eq('tenant_id', ATELIER77_TENANT_ID);
  await supabase.from('kunden').delete().eq('tenant_id', ATELIER77_TENANT_ID);

  // Bereinige Dummy-Katalogeinträge (z. B. 'test')
  await supabase.from('katalog_leistungen').delete().ilike('beschreibung', '%test%');
  console.log('✅ Alte Testdaten gelöscht und Katalog bereinigt.');

  // =========================================================================
  // 5. EINSTELLUNGEN / STAMMDATEN AKTUALISIEREN
  // =========================================================================
  console.log('\n⚙️ 5. Aktualisiere Stammdaten / Einstellungen für Atelier 77...');
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
    bankverbindung: 'CH39 0870 4016 0754 7300 7',
    qr_iban: 'CH44 3199 9123 0008 8901 2',
    primary_color: '#b88a38',
    logo_url: 'https://fpfdlraqtqtcnmajrcyx.supabase.co/storage/v1/object/public/public_assets/logos/ce510545-c59b-4f0d-b89b-89f756cbb378/1789298072143_logo.png',
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
    gerichtsstand: 'Bern'
  };

  const { error: settingsErr } = await supabase
    .from('einstellungen')
    .upsert(settingsData, { onConflict: 'tenant_id' });

  if (settingsErr) {
    console.error('❌ Fehler beim Aktualisieren der Einstellungen:', settingsErr);
  } else {
    console.log('✅ Stammdaten aktualisiert (info@atelier-77.ch, Malerei Leandro Lüthi - Atelier 77).');
  }

  // =========================================================================
  // 6. KATALOG-LEISTUNGEN LADEN
  // =========================================================================
  console.log('\n🎨 6. Lade Maler-Katalog für Positionen...');
  const { data: katalogItems } = await supabase
    .from('katalog_leistungen')
    .select('*')
    .eq('tenant_id', ATELIER77_TENANT_ID)
    .gt('einzelpreis', 0);

  console.log(`✅ ${katalogItems?.length || 0} aktive Positionen im Maler-Katalog gefunden.`);

  // Hilfsfunktion zur Auswahl aus Katalog
  function getItem(keyword, fallbackDesc, unit, price) {
    if (katalogItems && katalogItems.length > 0) {
      const match = katalogItems.find(k => k.beschreibung.toLowerCase().includes(keyword.toLowerCase()));
      if (match) {
        return {
          beschreibung: match.beschreibung,
          einheit: match.einheit || unit,
          einzelpreis: parseFloat(match.einzelpreis)
        };
      }
    }
    return { beschreibung: fallbackDesc, einheit: unit, einzelpreis: price };
  }

  const pAbdecken = getItem('Abdecken', 'Abdecken und Schützen (Böden, Möbel, Treppen)', 'm²', 10.00);
  const pWaende = getItem('Wände streichen (Dispersion', 'Wände streichen (Dispersion, 2x Anstrich, Standardweiss)', 'm²', 23.50);
  const pDecke = getItem('Decke streichen', 'Decke streichen (Dispersion, 2x Anstrich, Standardweiss)', 'm²', 26.00);
  const pTueren = getItem('Türen', 'Türen und Zargen lackieren (Holz/Metall, inkl. Schleifen)', 'Stk', 185.00);
  const pFenster = getItem('Fensterrahmen', 'Fensterrahmen lackieren (innen, Holz)', 'lfm', 25.00);
  const pFarbig = getItem('farbig', 'Wände streichen farbig (Aufpreis für Bunttöne)', 'm²', 8.50);
  const pHeizkoerper = getItem('Heizkörper', 'Heizkörper lackieren (Rippen-/Plattenheizkörper)', 'Stk', 85.00);
  const pSockel = getItem('Sockelleisten', 'Sockelleisten streichen / lackieren', 'lfm', 12.00);
  const pRisse = getItem('Risse', 'Risse und Löcher spachteln, schleifen (Untergrundvorbereitung)', 'h', 82.00);

  // =========================================================================
  // 7. KUNDEN ANLEGEN (6 Verwaltungen / Firmen + 5 Privatpersonen)
  // =========================================================================
  console.log('\n👥 7. Erstelle 11 Kunden (6 Verwaltungen/Firmen in Bern, 5 Privatkunden)...');

  const kundenDefinitions = [
    // --- 6 Verwaltungen / Firmen ---
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
      notizen: 'Führende Berner Verwaltung. Herr Hostettler betreut Objekte im Kirchenfeld und Länggasse.',
      created_at: '2026-07-15T08:00:00Z',
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
      created_at: '2026-07-16T09:30:00Z',
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
      created_at: '2026-07-18T10:15:00Z',
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
      created_at: '2026-07-20T11:00:00Z',
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
      created_at: '2026-07-24T14:00:00Z',
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
      created_at: '2026-07-28T09:00:00Z',
      tenant_id: ATELIER77_TENANT_ID
    },

    // --- 5 Berner Privatpersonen ---
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
      notizen: 'Kirchenfeld-Villa. Sehr qualitätsbewusst, legen grossen Wert auf lösemittelfreie Bio-Farben.',
      created_at: '2026-07-22T13:45:00Z',
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
      created_at: '2026-07-26T16:20:00Z',
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
      created_at: '2026-08-01T10:00:00Z',
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
      created_at: '2026-08-10T14:30:00Z',
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
      created_at: '2026-08-15T09:15:00Z',
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
  console.log(`✅ ${insertedKunden.length} Kunden erfolgreich angelegt.`);

  // Map zur schnellen Referenzierung nach Kundennummer
  const kMap = {};
  insertedKunden.forEach(k => { kMap[k.kundennummer] = k; });

  // =========================================================================
  // 8. PROJEKTE, OFFERTEN & RECHNUNGEN
  // =========================================================================
  console.log('\n🏗️ 8. Erstelle strukturierte Projekte, Offerten und Rechnungen (2-Monats-Verlauf)...');

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

  // Definition der Szenarien
  const scenarios = [
    // 1. Von Graffenried Projekt 1: Ensingerstrasse 15 (Abgeschlossen, Offerte akzeptiert, Rechnung bezahlt)
    {
      kNr: 'K-1001',
      pName: 'Wohnungswechsel 4.5-Zi, Ensingerstrasse 15',
      pAdresse: 'Ensingerstrasse 15, 3006 Bern',
      pKategorie: 'Sanierung',
      pStatus: 'Abgeschlossen',
      pStart: '2026-07-20',
      pEnd: '2026-07-29',
      pNotizen: 'Termingerechte Fertigstellung vor Einzug der Neumieter. Abnahme ohne Mängel.',
      offerte: {
        nr: 'OFF-2026-1001',
        date: '2026-07-16',
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
        date: '2026-07-31',
        faellig: '2026-08-30',
        status: 'Bezahlt',
        bezahltAm: '2026-08-18'
      }
    },

    // 2. Von Graffenried Projekt 2: Treppenhausrenovation Falkenplatz 7 (In Arbeit, Offerte akzeptiert, Rechnung versendet/offen)
    {
      kNr: 'K-1001',
      pName: 'Treppenhausrenovation, Falkenplatz 7',
      pAdresse: 'Falkenplatz 7, 3012 Bern',
      pKategorie: 'Umbau',
      pStatus: 'In Arbeit',
      pStart: '2026-08-18',
      pEnd: '2026-09-18',
      pNotizen: 'Mehrfamilienhaus 4 Etagen. Vorlackieren Geländer und Wände abwaschbar streichen.',
      offerte: {
        nr: 'OFF-2026-1002',
        date: '2026-08-05',
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
        nr: 'RE-2026-1004',
        date: '2026-08-28',
        faellig: '2026-09-27',
        status: 'Versendet', // Noch offen innerhalb Frist
        bezahltAm: null
      }
    },

    // 3. Von Graffenried Projekt 3: Wasserschaden Effingerstrasse 22 (Aktiv, Offerte neu als Entwurf)
    {
      kNr: 'K-1001',
      pName: 'Wasserschaden Reparatur, Effingerstrasse 22',
      pAdresse: 'Effingerstrasse 22, 3008 Bern',
      pKategorie: 'Reparatur',
      pStatus: 'Aktiv',
      pStart: '2026-09-08',
      pEnd: null,
      pNotizen: 'Besichtigung am 08.09. durchgeführt. Offerte für Versicherung in Ausarbeitung.',
      offerte: {
        nr: 'OFF-2026-1007',
        date: '2026-09-09',
        status: 'Entwurf',
        titel: 'Offerte Wasserschadensanierung Decke & Wand Effingerstrasse',
        positions: [
          makePos('1.1', pAbdecken, 25),
          makePos('1.2', pRisse, 6),
          makePos('1.3', pDecke, 25),
          makePos('1.4', pWaende, 35)
        ]
      }
    },

    // 4. Adlatus AG Projekt 1: Sanierung Thunstrasse 30 (Abgeschlossen, Offerte akzeptiert, Rechnung bezahlt)
    {
      kNr: 'K-1002',
      pName: 'Sanierung 3.5-Zi, Thunstrasse 30',
      pAdresse: 'Thunstrasse 30, 3005 Bern',
      pKategorie: 'Sanierung',
      pStatus: 'Abgeschlossen',
      pStart: '2026-07-22',
      pEnd: '2026-08-01',
      pNotizen: 'Komplettrenovation inkl. Heizkörper und Holztüren.',
      offerte: {
        nr: 'OFF-2026-1003',
        date: '2026-07-18',
        status: 'Akzeptiert',
        titel: 'Offerte 3.5-Zimmer-Wohnung Thunstrasse',
        positions: [
          makePos('1.1', pAbdecken, 70),
          makePos('1.2', pWaende, 95),
          makePos('1.3', pDecke, 68),
          makePos('1.4', pTueren, 4),
          makePos('1.5', pHeizkoerper, 3)
        ]
      },
      rechnung: {
        nr: 'RE-2026-1002',
        date: '2026-08-03',
        faellig: '2026-09-02',
        status: 'Bezahlt',
        bezahltAm: '2026-08-25'
      }
    },

    // 5. Adlatus AG Projekt 2: Fassadenausbesserung Muristrasse 45 (In Arbeit, Offerte versendet)
    {
      kNr: 'K-1002',
      pName: 'Fassadenausbesserung & Sockel, Muristrasse 45',
      pAdresse: 'Muristrasse 45, 3006 Bern',
      pKategorie: 'Reparatur',
      pStatus: 'In Arbeit',
      pStart: '2026-08-25',
      pEnd: '2026-09-20',
      pNotizen: 'Rissarmierung und wetterfester Sockelanstrich Nord- und Westseite.',
      offerte: {
        nr: 'OFF-2026-1008',
        date: '2026-08-20',
        status: 'Versendet',
        titel: 'Offerte Sockelsanierung und Fassadenflickarbeiten Muristrasse',
        positions: [
          makePos('1.1', pAbdecken, 40),
          makePos('1.2', pRisse, 12),
          makePos('1.3', pSockel, 45),
          makePos('1.4', pWaende, 60)
        ]
      }
    },

    // 6. PRIVERA AG Projekt 1: Gewerbefläche Neuanstrich Zentweg 11 (Abgeschlossen, Offerte akzeptiert, Rechnung bezahlt)
    {
      kNr: 'K-1003',
      pName: 'Gewerbefläche Neuanstrich, Zentweg 11',
      pAdresse: 'Zentweg 11, 3006 Bern',
      pKategorie: 'Umbau',
      pStatus: 'Abgeschlossen',
      pStart: '2026-07-28',
      pEnd: '2026-08-08',
      pNotizen: 'Büroetage ca. 180m². Strapazierfähiger Anstrich RAL 9010.',
      offerte: {
        nr: 'OFF-2026-1004',
        date: '2026-07-22',
        status: 'Akzeptiert',
        titel: 'Offerte Neuanstrich Büroräume Zentweg',
        positions: [
          makePos('1.1', pAbdecken, 140),
          makePos('1.2', pWaende, 230),
          makePos('1.3', pDecke, 140),
          makePos('1.4', pTueren, 6)
        ]
      },
      rechnung: {
        nr: 'RE-2026-1003',
        date: '2026-08-10',
        faellig: '2026-09-09',
        status: 'Bezahlt',
        bezahltAm: '2026-09-02'
      }
    },

    // 7. PRIVERA AG Projekt 2: Wohnungssanierung EG Ostermundigen (Aktiv, Offerte versendet)
    {
      kNr: 'K-1003',
      pName: 'Wohnungssanierung EG, Bernstrasse 102',
      pAdresse: 'Bernstrasse 102, 3072 Ostermundigen',
      pKategorie: 'Sanierung',
      pStatus: 'Aktiv',
      pStart: '2026-09-04',
      pEnd: '2026-09-25',
      pNotizen: 'Besichtigung erfolgt. Offerte versendet, wartet auf Freigabe durch Eigentümer.',
      offerte: {
        nr: 'OFF-2026-1009',
        date: '2026-09-05',
        status: 'Versendet',
        titel: 'Offerte Malerarbeiten EG-Wohnung Ostermundigen',
        positions: [
          makePos('1.1', pAbdecken, 60),
          makePos('1.2', pWaende, 85),
          makePos('1.3', pDecke, 55),
          makePos('1.4', pTueren, 3)
        ]
      }
    },

    // 8. Livit AG Projekt 1: Weissensteinstrasse 50 (Abgeschlossen, RECHNUNG ÜBERFÄLLIG / MAHNUNGSTEST!)
    {
      kNr: 'K-1004',
      pName: 'Malerarbeiten 2.5-Zi-Wohnung, Weissensteinstrasse 50',
      pAdresse: 'Weissensteinstrasse 50, 3007 Bern',
      pKategorie: 'Sanierung',
      pStatus: 'Abgeschlossen',
      pStart: '2026-07-21',
      pEnd: '2026-07-28',
      pNotizen: 'Arbeiten Ende Juli abgeschlossen. Rechnung noch unbezahlt (Mahnfall zum Testen).',
      offerte: {
        nr: 'OFF-2026-1005',
        date: '2026-07-17',
        status: 'Akzeptiert',
        titel: 'Offerte 2.5-Zimmer-Wohnung Weissensteinstrasse',
        positions: [
          makePos('1.1', pAbdecken, 50),
          makePos('1.2', pWaende, 72),
          makePos('1.3', pDecke, 48),
          makePos('1.4', pFenster, 18)
        ]
      },
      rechnung: {
        nr: 'RE-2026-1005',
        date: '2026-07-30',
        faellig: '2026-08-29', // Fällig Ende August -> heute Mitte September ÜBERFÄLLIG!
        status: 'Überfällig',
        bezahltAm: null
      }
    },

    // 9. Livit AG Projekt 2: Balkonuntersichten Bümpliz (In Arbeit, Offerte akzeptiert)
    {
      kNr: 'K-1004',
      pName: 'Balkonuntersichten streichen, Bümplizstrasse 88',
      pAdresse: 'Bümplizstrasse 88, 3018 Bern-Bümpliz',
      pKategorie: 'Wartung',
      pStatus: 'In Arbeit',
      pStart: '2026-08-30',
      pEnd: '2026-09-19',
      pNotizen: 'Gerüstarbeiten bauseits. Wetterfester Silikonharzanstrich für 8 Balkone.',
      offerte: {
        nr: 'OFF-2026-1010',
        date: '2026-08-15',
        status: 'Akzeptiert',
        titel: 'Offerte Balkonuntersichten 8 Einheiten Bümpliz',
        positions: [
          makePos('1.1', pAbdecken, 80),
          makePos('1.2', pRisse, 10),
          makePos('1.3', pDecke, 95)
        ]
      }
    },

    // 10. Wincasa AG Projekt 1: Büroumbau Laupenstrasse (Abgeschlossen, Offerte akzeptiert, Rechnung versendet/offen)
    {
      kNr: 'K-1005',
      pName: 'Büroumbau & Empfang, Laupenstrasse 18',
      pAdresse: 'Laupenstrasse 18, 3008 Bern',
      pKategorie: 'Umbau',
      pStatus: 'Abgeschlossen',
      pStart: '2026-08-10',
      pEnd: '2026-08-22',
      pNotizen: 'Repräsentativer Empfangsbereich in Corporate Identity Farben.',
      offerte: {
        nr: 'OFF-2026-1006',
        date: '2026-08-02',
        status: 'Akzeptiert',
        titel: 'Offerte Umbau Empfangszone Laupenstrasse',
        positions: [
          makePos('1.1', pAbdecken, 90),
          makePos('1.2', pWaende, 120),
          makePos('1.3', pFarbig, 50),
          makePos('1.4', pDecke, 80),
          makePos('1.5', pTueren, 3)
        ]
      },
      rechnung: {
        nr: 'RE-2026-1006',
        date: '2026-08-25',
        faellig: '2026-09-24',
        status: 'Versendet',
        bezahltAm: null
      }
    },

    // 11. Dr. Meyer Immobilien Projekt 1: Fassadenreinigung & Anstrich Monbijou (Aktiv, Offerte versendet)
    {
      kNr: 'K-1006',
      pName: 'Fassadenreinigung & Sockelanstrich, Monbijoustrasse 61',
      pAdresse: 'Monbijoustrasse 61, 3007 Bern',
      pKategorie: 'Wartung',
      pStatus: 'Aktiv',
      pStart: '2026-09-02',
      pEnd: null,
      pNotizen: 'Besprechung vor Ort am 02.09. Farbtonkarte abgegeben.',
      offerte: {
        nr: 'OFF-2026-1011',
        date: '2026-09-03',
        status: 'Versendet',
        titel: 'Offerte Fassadenreinigung & Sockelanstrich Monbijou',
        positions: [
          makePos('1.1', pAbdecken, 60),
          makePos('1.2', pRisse, 14),
          makePos('1.3', pSockel, 55),
          makePos('1.4', pWaende, 140)
        ]
      }
    },

    // 12. Dr. Gerber (Privat): Villa Kirchenfeld (Abgeschlossen, Offerte akzeptiert, Rechnung bezahlt)
    {
      kNr: 'K-1007',
      pName: 'Malerarbeiten Villa Kirchenfeld, Brunnadernstrasse',
      pAdresse: 'Brunnadernstrasse 48, 3006 Bern',
      pKategorie: 'Umbau',
      pStatus: 'Abgeschlossen',
      pStart: '2026-07-27',
      pEnd: '2026-08-07',
      pNotizen: 'Bibliothek, Salon und Treppenaufgang. Hochwertige Mineralfarben.',
      offerte: {
        nr: 'OFF-2026-1012',
        date: '2026-07-23',
        status: 'Akzeptiert',
        titel: 'Offerte Malerarbeiten Villa Gerber',
        positions: [
          makePos('1.1', pAbdecken, 100),
          makePos('1.2', pWaende, 160),
          makePos('1.3', pFarbig, 45),
          makePos('1.4', pDecke, 90),
          makePos('1.5', pTueren, 6),
          makePos('1.6', pHeizkoerper, 4)
        ]
      },
      rechnung: {
        nr: 'RE-2026-1007',
        date: '2026-08-09',
        faellig: '2026-08-23',
        status: 'Bezahlt',
        bezahltAm: '2026-08-16'
      }
    },

    // 13. Sophie Vögeli (Privat): Wohnung Länggasse (Abgeschlossen, Offerte akzeptiert, Rechnung bezahlt)
    {
      kNr: 'K-1008',
      pName: 'Wohnung Länggasse Decken & Wände, Waldheimstrasse',
      pAdresse: 'Waldheimstrasse 19, 3012 Bern',
      pKategorie: 'Sanierung',
      pStatus: 'Abgeschlossen',
      pStart: '2026-08-03',
      pEnd: '2026-08-12',
      pNotizen: 'Junges Paar, Einzug nach Kauf. Wohnbereich in warmem Off-White.',
      offerte: {
        nr: 'OFF-2026-1013',
        date: '2026-07-28',
        status: 'Akzeptiert',
        titel: 'Offerte Decken und Wände Eigentumswohnung',
        positions: [
          makePos('1.1', pAbdecken, 65),
          makePos('1.2', pWaende, 90),
          makePos('1.3', pDecke, 60),
          makePos('1.4', pTueren, 3)
        ]
      },
      rechnung: {
        nr: 'RE-2026-1008',
        date: '2026-08-14',
        faellig: '2026-09-13',
        status: 'Bezahlt',
        bezahltAm: '2026-08-28'
      }
    },

    // 14. Hansueli Stettler (Privat): Dachuntersichten Muri (Aktiv, Offerte versendet)
    {
      kNr: 'K-1009',
      pName: 'Dachuntersichten & Holzelemente, Muriweg 12',
      pAdresse: 'Muriweg 12, 3074 Muri bei Bern',
      pKategorie: 'Wartung',
      pStatus: 'Aktiv',
      pStart: '2026-08-28',
      pEnd: null,
      pNotizen: 'Dachuntersichten schleifen und 2x wetterbeständig lasieren.',
      offerte: {
        nr: 'OFF-2026-1014',
        date: '2026-08-22',
        status: 'Versendet',
        titel: 'Offerte Holzanstrich Dachuntersichten EFH Muri',
        positions: [
          makePos('1.1', pAbdecken, 35),
          makePos('1.2', pRisse, 8),
          makePos('1.3', pFenster, 32),
          makePos('1.4', pDecke, 40)
        ]
      }
    },

    // 15. Sabine Wyss (Privat): Breitenrain Farbgestaltung (Aktiv, Offerte Entwurf)
    {
      kNr: 'K-1010',
      pName: 'Farbgestaltung Wohnsalon & Korridor, Scheibenstrasse 35',
      pAdresse: 'Scheibenstrasse 35, 3014 Bern',
      pKategorie: 'Beratung',
      pStatus: 'Aktiv',
      pStart: '2026-09-06',
      pEnd: null,
      pNotizen: 'Farbberatung vor Ort durchgeführt. Frau Wyss wünscht Nuancen in Salbeigrün.',
      offerte: {
        nr: 'OFF-2026-1015',
        date: '2026-09-07',
        status: 'Entwurf',
        titel: 'Offerte Farbgestaltung Wohnsalon & Stuckatur',
        positions: [
          makePos('1.1', pAbdecken, 45),
          makePos('1.2', pWaende, 65),
          makePos('1.3', pFarbig, 35),
          makePos('1.4', pDecke, 40)
        ]
      }
    },

    // 16. Stefan Baumann (Privat): Praxisräume Liebefeld (Aktiv, Offerte ABGELEHNT zum Testen)
    {
      kNr: 'K-1011',
      pName: 'Praxisräume Liebefeld, Schwarzenburgstrasse 114',
      pAdresse: 'Schwarzenburgstrasse 114, 3097 Liebefeld',
      pKategorie: 'Umbau',
      pStatus: 'Aktiv',
      pStart: '2026-08-16',
      pEnd: null,
      pNotizen: 'Kunde hat sich aufgrund von Budgetkürzungen gegen die Vollsanierung entschieden.',
      offerte: {
        nr: 'OFF-2026-1016',
        date: '2026-08-18',
        status: 'Abgelehnt', // Zum Testen des Status Abgelehnt
        titel: 'Offerte Gesamtanstrich Praxisräume Liebefeld',
        positions: [
          makePos('1.1', pAbdecken, 55),
          makePos('1.2', pWaende, 80),
          makePos('1.3', pDecke, 55),
          makePos('1.4', pTueren, 3)
        ]
      }
    }
  ];

  let createdProjekteCount = 0;
  let createdOffertenCount = 0;
  let createdRechnungenCount = 0;

  const createdProjectsMap = {};

  for (const s of scenarios) {
    const kunde = kMap[s.kNr];
    if (!kunde) {
      console.warn(`⚠️ Kunde ${s.kNr} nicht gefunden!`);
      continue;
    }

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
      console.error(`❌ Fehler beim Einfügen von Projekt ${s.pName}:`, pErr);
      continue;
    }
    createdProjekteCount++;
    createdProjectsMap[s.pName] = pData;

    // 2. Offerte erstellen falls vorhanden
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

      if (oErr) {
        console.error(`❌ Fehler beim Einfügen von Offerte ${s.offerte.nr}:`, oErr);
      } else {
        createdOffertenCount++;
        createdOfferte = oData;
      }
    }

    // 3. Rechnung erstellen falls vorhanden
    if (s.rechnung && createdOfferte) {
      const rechDoc = makeDocData(
        `Rechnung für ${pData.name}`,
        s.rechnung.date,
        s.offerte.positions,
        'Wir danken Ihnen für den geschätzten Auftrag und stellen Ihnen die ausgeführten Arbeiten wie folgt in Rechnung:',
        'Bitte überweisen Sie den Betrag unter Angabe der Rechnungsnummer innert 30 Tagen auf unser Bankkonto. Besten Dank!'
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

      if (rErr) {
        console.error(`❌ Fehler beim Einfügen von Rechnung ${s.rechnung.nr}:`, rErr);
      } else {
        createdRechnungenCount++;
        // Verknüpfung in Offerte speichern
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
  // 9. KALENDER-TERMINE (12 Termine Juli bis September 2026)
  // =========================================================================
  console.log('\n📅 9. Erstelle 12 realistische Termine für den Kalender...');

  const leandroUserId = createdUserMap['leandro@atelier-77.ch'];

  const termineDefinitions = [
    {
      titel: 'Vor-Ort-Besichtigung & Aufmass Ensingerstrasse',
      beschreibung: 'Aufmass aller Räume mit Herrn Hostettler (Von Graffenried AG).',
      datum: '2026-07-16',
      startzeit: '09:00',
      endzeit: '10:30',
      ganztaegig: false,
      typ: 'Aufmass',
      status: 'Erledigt',
      projekt_name: 'Wohnungswechsel 4.5-Zi, Ensingerstrasse 15',
      kunden_nr: 'K-1001',
      ort: 'Ensingerstrasse 15, 3006 Bern',
      farbe: '#6366f1'
    },
    {
      titel: 'Baustellentermin & Materiallieferung Ensingerstr.',
      beschreibung: 'Abdeckmaterial und Dispersion anliefern, Arbeitsbeginn.',
      datum: '2026-07-20',
      startzeit: '07:30',
      endzeit: '12:00',
      ganztaegig: false,
      typ: 'Montage',
      status: 'Erledigt',
      projekt_name: 'Wohnungswechsel 4.5-Zi, Ensingerstrasse 15',
      kunden_nr: 'K-1001',
      ort: 'Ensingerstrasse 15, 3006 Bern',
      farbe: '#10b981'
    },
    {
      titel: 'Schlussabnahme Ensingerstrasse',
      beschreibung: 'Gemeinsame Abnahme mit Verwaltung Beat Hostettler.',
      datum: '2026-07-29',
      startzeit: '14:00',
      endzeit: '15:00',
      ganztaegig: false,
      typ: 'Abnahme',
      status: 'Erledigt',
      projekt_name: 'Wohnungswechsel 4.5-Zi, Ensingerstrasse 15',
      kunden_nr: 'K-1001',
      ort: 'Ensingerstrasse 15, 3006 Bern',
      farbe: '#14b8a6'
    },
    {
      titel: 'Farbberatung Villa Kirchenfeld (Dr. Gerber)',
      beschreibung: 'Musterplatten für Salon und Bibliothek begutachten.',
      datum: '2026-07-23',
      startzeit: '16:00',
      endzeit: '17:30',
      ganztaegig: false,
      typ: 'Kundentermin',
      status: 'Erledigt',
      projekt_name: 'Malerarbeiten Villa Kirchenfeld, Brunnadernstrasse',
      kunden_nr: 'K-1007',
      ort: 'Brunnadernstrasse 48, 3006 Bern',
      farbe: '#a855f7'
    },
    {
      titel: 'Start Malerarbeiten Villa Kirchenfeld',
      beschreibung: 'Abdecken hochwertiges Parkett, Rissarmierung.',
      datum: '2026-07-27',
      startzeit: '08:00',
      endzeit: '17:00',
      ganztaegig: true,
      typ: 'Montage',
      status: 'Erledigt',
      projekt_name: 'Malerarbeiten Villa Kirchenfeld, Brunnadernstrasse',
      kunden_nr: 'K-1007',
      ort: 'Brunnadernstrasse 48, 3006 Bern',
      farbe: '#10b981'
    },
    {
      titel: 'Besichtigung Treppenhaus Falkenplatz',
      beschreibung: 'Zustandsaufnahme 4 Etagen mit Hauswart.',
      datum: '2026-08-04',
      startzeit: '10:00',
      endzeit: '11:30',
      ganztaegig: false,
      typ: 'Aufmass',
      status: 'Erledigt',
      projekt_name: 'Treppenhausrenovation, Falkenplatz 7',
      kunden_nr: 'K-1001',
      ort: 'Falkenplatz 7, 3012 Bern',
      farbe: '#6366f1'
    },
    {
      titel: 'Gerüstkontrolle & Sockelbesichtigung Muristr.',
      beschreibung: 'Absprache Sockelarbeiten mit Sandra Nydegger (Adlatus).',
      datum: '2026-08-21',
      startzeit: '13:30',
      endzeit: '14:30',
      ganztaegig: false,
      typ: 'Kundentermin',
      status: 'Erledigt',
      projekt_name: 'Fassadenausbesserung & Sockel, Muristrasse 45',
      kunden_nr: 'K-1002',
      ort: 'Muristrasse 45, 3006 Bern',
      farbe: '#a855f7'
    },
    {
      titel: 'Arbeiten Treppenhaus Falkenplatz Etappe 2',
      beschreibung: 'Lackierarbeiten Geländer und Wohnungstüren Etage 2 & 3.',
      datum: '2026-08-28',
      startzeit: '08:00',
      endzeit: '16:30',
      ganztaegig: false,
      typ: 'Montage',
      status: 'Erledigt',
      projekt_name: 'Treppenhausrenovation, Falkenplatz 7',
      kunden_nr: 'K-1001',
      ort: 'Falkenplatz 7, 3012 Bern',
      farbe: '#10b981'
    },
    {
      titel: 'Besichtigung Fassade Monbijoustrasse',
      beschreibung: 'Begehung mit Herrn Bieri (Dr. Meyer Immobilien AG).',
      datum: '2026-09-02',
      startzeit: '09:30',
      endzeit: '11:00',
      ganztaegig: false,
      typ: 'Aufmass',
      status: 'Erledigt',
      projekt_name: 'Fassadenreinigung & Sockelanstrich, Monbijoustrasse 61',
      kunden_nr: 'K-1006',
      ort: 'Monbijoustrasse 61, 3007 Bern',
      farbe: '#6366f1'
    },
    {
      titel: 'Farbberatung Wohnsalon Scheibenstrasse (Sabine Wyss)',
      beschreibung: 'Musteranstrich Salbeigrün anlegen und Stuckaturen prüfen.',
      datum: '2026-09-07',
      startzeit: '14:00',
      endzeit: '15:30',
      ganztaegig: false,
      typ: 'Kundentermin',
      status: 'Erledigt',
      projekt_name: 'Farbgestaltung Wohnsalon & Korridor, Scheibenstrasse 35',
      kunden_nr: 'K-1010',
      ort: 'Scheibenstrasse 35, 3014 Bern',
      farbe: '#a855f7'
    },
    {
      titel: 'Wasserschaden-Inspektion Effingerstrasse',
      beschreibung: 'Feuchtigkeitsmessung und Offertenbesprechung.',
      datum: '2026-09-08',
      startzeit: '08:30',
      endzeit: '10:00',
      ganztaegig: false,
      typ: 'Aufmass',
      status: 'Erledigt',
      projekt_name: 'Wasserschaden Reparatur, Effingerstrasse 22',
      kunden_nr: 'K-1001',
      ort: 'Effingerstrasse 22, 3008 Bern',
      farbe: '#6366f1'
    },
    {
      titel: 'Schlussabnahme Treppenhaus Falkenplatz',
      beschreibung: 'Finale Begehung und Schlüsselübergabe mit Verwaltung.',
      datum: '2026-09-18',
      startzeit: '11:00',
      endzeit: '12:00',
      ganztaegig: false,
      typ: 'Abnahme',
      status: 'Geplant',
      projekt_name: 'Treppenhausrenovation, Falkenplatz 7',
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
      console.error(`❌ Fehler beim Erstellen von Termin '${t.titel}':`, tErr);
    } else {
      createdTermineCount++;
    }
  }

  console.log(`✅ ${createdTermineCount} Kalender-Termine erfolgreich angelegt.`);

  // =========================================================================
  // 10. ABSCHLIESSENDE VERIFIKATION & STATISTIK
  // =========================================================================
  console.log('\n📊 10. Führe finale Verifikation durch...');

  const { count: finalKunden } = await supabase.from('kunden').select('*', { count: 'exact', head: true });
  const { count: finalProjekte } = await supabase.from('projekte').select('*', { count: 'exact', head: true });
  const { count: finalOfferten } = await supabase.from('offerten').select('*', { count: 'exact', head: true });
  const { count: finalRechnungen } = await supabase.from('rechnungen').select('*', { count: 'exact', head: true });
  const { count: finalTermine } = await supabase.from('termine').select('*', { count: 'exact', head: true });
  const { count: finalTenants } = await supabase.from('tenants').select('*', { count: 'exact', head: true });
  const { data: finalRoles } = await supabase.from('user_roles').select('*');

  console.log('----------------------------------------------------');
  console.log(`Mandanten (Tenants):    ${finalTenants} (Soll: 1 Atelier 77)`);
  console.log(`Aktive Benutzer-Rollen: ${finalRoles?.length || 0}`);
  console.log(`Kunden:                 ${finalKunden} (Soll: 11)`);
  console.log(`Projekte:               ${finalProjekte} (Soll: 16)`);
  console.log(`Offerten:               ${finalOfferten} (Soll: 16)`);
  console.log(`Rechnungen:             ${finalRechnungen} (Soll: 8)`);
  console.log(`Termine:                ${finalTermine} (Soll: 12)`);
  console.log('----------------------------------------------------');

  // Teste Logins
  console.log('\n🔑 Teste Anmeldefähigkeit mit Passwort Test1234...');
  for (const email of ['leandro@atelier-77.ch', 'info@atelier-77.ch']) {
    const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
      email,
      password: 'Test1234'
    });
    if (loginErr) {
      console.error(`  ❌ Login fehlgeschlagen für ${email}:`, loginErr.message);
    } else {
      console.log(`  ✅ Login ERFOLGREICH für ${email}! (UID: ${loginData.user.id})`);
    }
  }

  console.log('\n🎉 ALL DONE! Die Testumgebung für Malerei Leandro Lüthi - Atelier 77 ist vollständig bereit!');
}

runSetup().catch(err => {
  console.error('Fataler Setup-Fehler:', err);
  process.exit(1);
});
