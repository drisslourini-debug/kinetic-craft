import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fpfdlraqtqtcnmajrcyx.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZmRscmFxdHF0Y25tYWpyY3l4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzOTk5MywiZXhwIjoyMTAwMTE1OTkzfQ.8S8CiMvOFosImncenIptaaPBSNJmEfJ6YmC9XbLG7wA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const ATELIER77_TENANT_ID = 'ce510545-c59b-4f0d-b89b-89f756cbb378';

async function runMusterdatenSetup() {
  console.log('🚀 Starte Initialisierung der Schweizer Musterdaten für Muster Malerei Bern AG...\n');

  // =========================================================================
  // 1. TENANT AKTUALISIEREN
  // =========================================================================
  console.log('🏢 1. Aktualisiere Hauptmandant auf Muster Malerei Bern AG...');
  const { data: mainTenant, error: tenantErr } = await supabase
    .from('tenants')
    .upsert({
      id: ATELIER77_TENANT_ID,
      name: 'Muster Malerei Bern AG',
      status: 'active'
    })
    .select()
    .single();

  if (tenantErr) {
    console.error('❌ Fehler beim Aktualisieren des Mandanten:', tenantErr);
    process.exit(1);
  }
  console.log('✅ Hauptmandant aktiv:', mainTenant.name);

  // =========================================================================
  // 2. USER PROFILE & AUTH (Max Muster)
  // =========================================================================
  console.log('\n👤 2. Aktualisiere Benutzer-Profil auf Max Muster (max@muster-malerei.ch)...');
  try {
    await supabase.auth.admin.updateUserById('08cb9f1e-35aa-4fee-b5ff-c23880e04352', {
      email: 'max@muster-malerei.ch',
      email_confirm: true,
      user_metadata: { full_name: 'Max Muster' }
    });
    await supabase.from('user_roles').update({ user_name: 'Max Muster' }).eq('id', '08cb9f1e-35aa-4fee-b5ff-c23880e04352');
    console.log('✅ Benutzer auf Max Muster aktualisiert.');
  } catch (uErr) {
    console.warn('Hinweis zu Benutzer-Aktualisierung:', uErr);
  }

  // =========================================================================
  // 3. STAMMDATEN / EINSTELLUNGEN
  // =========================================================================
  console.log('\n⚙️ 3. Aktualisiere Stammdaten & Muster-Logo...');
  const settingsData = {
    tenant_id: ATELIER77_TENANT_ID,
    firmenname: 'Muster Malerei Bern AG',
    strasse: 'Musterstrasse 10',
    plz: '3000',
    ort: 'Bern',
    plz_ort: '3000 Bern',
    land: 'Schweiz',
    telefon: '031 999 00 00',
    email: 'info@muster-malerei.ch',
    website: 'https://www.muster-malerei.ch',
    bankverbindung: 'CH39 0870 4016 0754 7300 7',
    qr_iban: 'CH44 3199 9123 0008 8901 2',
    uid: 'CHE-999.888.777 MWST',
    primary_color: '#b88a38',
    logo_url: '/muster-logo.svg',
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
    console.error('❌ Fehler bei Einstellungen:', settingsErr);
  } else {
    console.log('✅ Stammdaten mit Muster-Logo & Schweizer QR-IBAN hinterlegt.');
  }

  // =========================================================================
  // 4. ALTE DATEN BEREINIGEN
  // =========================================================================
  console.log('\n🗑️ 4. Bereinige bisherige Testdaten...');
  await supabase.from('rechnungen').update({ offerte_id: null }).eq('tenant_id', ATELIER77_TENANT_ID);
  await supabase.from('offerten').update({ rechnung_id: null }).eq('tenant_id', ATELIER77_TENANT_ID);
  await supabase.from('dateien').delete().eq('tenant_id', ATELIER77_TENANT_ID);
  await supabase.from('termine').delete().eq('tenant_id', ATELIER77_TENANT_ID);
  await supabase.from('ausgaben').delete().eq('tenant_id', ATELIER77_TENANT_ID);
  await supabase.from('rechnungen').update({ is_archived: true, offerte_id: null }).eq('tenant_id', ATELIER77_TENANT_ID);
  try { await supabase.from('rechnungen').delete().eq('tenant_id', ATELIER77_TENANT_ID); } catch {}
  await supabase.from('offerten').delete().eq('tenant_id', ATELIER77_TENANT_ID);
  await supabase.from('projekte').delete().eq('tenant_id', ATELIER77_TENANT_ID);
  await supabase.from('kunden').delete().eq('tenant_id', ATELIER77_TENANT_ID);
  console.log('✅ Bisherige Daten bereinigt / archiviert.');

  // =========================================================================
  // 5. MUSTER-KUNDEN ANLEGEN (Schweizer Firmen & Privatpersonen)
  // =========================================================================
  console.log('\n👥 5. Lege Schweizer Muster-Kunden an...');

  const musterKunden = [
    {
      kundennummer: 'K-1001',
      typ: 'Firma',
      anrede: 'Firma',
      name: 'Muster Hotel Alpenblick AG',
      firmenname: 'Muster Hotel Alpenblick AG',
      vorname: 'Beat',
      nachname: 'Muster',
      strasse: 'Musterplatz 1',
      plz: '3000',
      ort: 'Bern',
      land: 'Schweiz',
      telefon: '031 999 10 01',
      email: 'b.muster@muster-hotel.ch',
      website: 'https://www.muster-hotel.ch',
      zahlungsziel: '30 Tage netto',
      status: 'Aktiv',
      notizen: 'Umbau Restaurant- und Empfangsbereich. Ansprechpartner Beat Muster.',
      created_at: '2026-06-10T08:00:00Z',
      tenant_id: ATELIER77_TENANT_ID
    },
    {
      kundennummer: 'K-1002',
      typ: 'Firma',
      anrede: 'Firma',
      name: 'Muster & Partner Architekten AG',
      firmenname: 'Muster & Partner Architekten AG',
      vorname: 'Corinne',
      nachname: 'Muster',
      strasse: 'Musterweg 12',
      plz: '8000',
      ort: 'Zürich',
      land: 'Schweiz',
      telefon: '044 999 20 02',
      email: 'corinne@muster-architekten.ch',
      website: 'https://www.muster-architekten.ch',
      zahlungsziel: '30 Tage netto',
      status: 'Aktiv',
      notizen: 'Architekturbüro für gehobenen Innenausbau und Denkmalpflege.',
      created_at: '2026-06-15T09:00:00Z',
      tenant_id: ATELIER77_TENANT_ID
    },
    {
      kundennummer: 'K-1003',
      typ: 'Bewirtschaftung',
      anrede: 'Firma',
      name: 'Muster Liegenschaften AG',
      firmenname: 'Muster Liegenschaften AG',
      vorname: 'Thomas',
      nachname: 'Muster',
      strasse: 'Mustergasse 5',
      plz: '3000',
      ort: 'Bern',
      land: 'Schweiz',
      telefon: '031 999 30 03',
      email: 't.muster@muster-liegenschaften.ch',
      website: 'https://www.muster-liegenschaften.ch',
      zahlungsziel: '30 Tage netto',
      status: 'Aktiv',
      notizen: 'Verwaltung von Mehrfamilienhäusern im Raum Bern. Regelmässige Malerarbeiten.',
      created_at: '2026-06-20T10:00:00Z',
      tenant_id: ATELIER77_TENANT_ID
    },
    {
      kundennummer: 'K-1004',
      typ: 'Privatperson',
      anrede: 'Herr',
      name: 'Dr. med. Thomas Muster',
      firmenname: '',
      vorname: 'Thomas',
      nachname: 'Muster',
      strasse: 'Musterstrasse 44',
      plz: '8000',
      ort: 'Zürich',
      land: 'Schweiz',
      telefon: '044 999 40 04',
      email: 'dr.muster@muster-praxis.ch',
      website: '',
      zahlungsziel: '30 Tage netto',
      status: 'Aktiv',
      notizen: 'Einfamilienhaus mit Parkett- und Abriebsanierungen.',
      created_at: '2026-07-01T11:00:00Z',
      tenant_id: ATELIER77_TENANT_ID
    },
    {
      kundennummer: 'K-1005',
      typ: 'Privatperson',
      anrede: 'Familie',
      name: 'Beat & Marianne Muster',
      firmenname: '',
      vorname: 'Beat',
      nachname: 'Muster',
      strasse: 'Musterweg 7',
      plz: '3000',
      ort: 'Bern',
      land: 'Schweiz',
      telefon: '031 999 50 05',
      email: 'beat.muster@muster-mail.ch',
      website: '',
      zahlungsziel: '30 Tage netto',
      status: 'Aktiv',
      notizen: 'Historische Altbauwohnung. Fassadenanstrich und Risssanierung.',
      created_at: '2026-07-05T14:00:00Z',
      tenant_id: ATELIER77_TENANT_ID
    },
    {
      kundennummer: 'K-1006',
      typ: 'Generalunternehmer',
      anrede: 'Firma',
      name: 'Muster Gastronomie GmbH',
      firmenname: 'Muster Gastronomie GmbH',
      vorname: 'Stefan',
      nachname: 'Muster',
      strasse: 'Musterstrasse 88',
      plz: '3000',
      ort: 'Bern',
      land: 'Schweiz',
      telefon: '031 999 60 06',
      email: 'stefan@muster-gastro.ch',
      website: 'https://www.muster-gastro.ch',
      zahlungsziel: '30 Tage netto',
      status: 'Aktiv',
      notizen: 'Gastronomiebetriebe und Lokale im Kanton Bern.',
      created_at: '2026-07-12T08:30:00Z',
      tenant_id: ATELIER77_TENANT_ID
    },
    {
      kundennummer: 'K-1007',
      typ: 'Privatperson',
      anrede: 'Frau',
      name: 'Muster Treuhand & Revisions AG',
      firmenname: 'Muster Treuhand & Revisions AG',
      vorname: 'Monika',
      nachname: 'Muster',
      strasse: 'Musterrain 3',
      plz: '3000',
      ort: 'Bern',
      land: 'Schweiz',
      telefon: '031 999 70 07',
      email: 'monika@muster-treuhand.ch',
      website: 'https://www.muster-treuhand.ch',
      zahlungsziel: '30 Tage netto',
      status: 'Aktiv',
      notizen: 'Büro- und Kanzleiräumlichkeiten. Akustikpaneele & Wandanstrich.',
      created_at: '2026-07-18T16:00:00Z',
      tenant_id: ATELIER77_TENANT_ID
    },
    {
      kundennummer: 'K-1008',
      typ: 'Privatperson',
      anrede: 'Familie',
      name: 'Lukas & Corinne Muster',
      firmenname: '',
      vorname: 'Lukas',
      nachname: 'Muster',
      strasse: 'Musterstrasse 15',
      plz: '4000',
      ort: 'Basel',
      land: 'Schweiz',
      telefon: '061 999 80 08',
      email: 'familie.muster@muster-mail.ch',
      website: '',
      zahlungsziel: '30 Tage netto',
      status: 'Aktiv',
      notizen: 'Eigentumswohnung EG. Nasszellen und Malerarbeiten.',
      created_at: '2026-07-22T10:00:00Z',
      tenant_id: ATELIER77_TENANT_ID
    }
  ];

  const createdKunden = [];
  for (const k of musterKunden) {
    const { data, error } = await supabase
      .from('kunden')
      .insert(k)
      .select()
      .single();

    if (error) {
      console.error(`❌ Fehler beim Anlegen von Kunde ${k.name}:`, error);
    } else {
      createdKunden.push(data);
    }
  }
  console.log(`✅ ${createdKunden.length} Schweizer Muster-Kunden erfolgreich angelegt.`);

  const kMap = {};
  createdKunden.forEach(k => {
    kMap[k.kundennummer] = k;
  });

  // =========================================================================
  // 6. PROJEKTE, OFFERTEN & RECHNUNGEN ANLEGEN
  // =========================================================================
  console.log('\n🏗️ 6. Lege Muster-Projekte, Offerten und Rechnungen an...');

  function makePos(posNr, bezeichnung, menge, einheit, preis, mwst = 8.1) {
    const betrag = Math.round(menge * preis * 100) / 100;
    return {
      posNr,
      bezeichnung,
      menge,
      einheit,
      preis,
      rabatt: 0,
      mwst,
      betrag
    };
  }

  function makeDocData(titel, date, positions, zahlungsziel = 30) {
    const subtotal = positions.reduce((acc, p) => acc + (p.betrag || 0), 0);
    const mwstBetrag = Math.round(subtotal * 0.081 * 100) / 100;
    const finalTotal = Math.round((subtotal + mwstBetrag) * 100) / 100;

    return {
      titel,
      positions,
      nettoTotal: subtotal,
      mwstTotal: mwstBetrag,
      finalTotal: finalTotal,
      datum: date,
      faelligAm: new Date(new Date(date).getTime() + zahlungsziel * 86400000).toISOString().split('T')[0],
      konditionen: {
        mwst: 8.1,
        rabatt: 0,
        skontoTage: 10,
        skontoProzent: 2,
        zahlungszielTage: zahlungsziel
      },
      firma: settingsData
    };
  }

  const projectsDef = [
    // 1. Muster Hotel Alpenblick AG
    {
      kNr: 'K-1001',
      pNummer: 'P-3001',
      pName: 'Fassadenanstrich & Farbkonzept Empfang',
      pAdresse: 'Musterplatz 1, 3000 Bern',
      pKategorie: 'Umbau',
      pStatus: 'In Arbeit',
      pStart: '2026-08-01',
      pEnd: '2026-09-30',
      pNotizen: 'Fassadenreinigung, Riss-Sanierung und Neuanstrich.',
      offerte: {
        nr: 'OFF-2026-3001',
        date: '2026-08-10',
        status: 'Akzeptiert',
        titel: 'Offerte Fassadenanstrich & Farbkonzept Empfang',
        positions: [
          makePos('1.1', 'Planung, Farbberatung & Aufmass vor Ort', 1, 'Pauschal', 1200.00),
          makePos('1.2', 'Hochdruckreinigung Fassadenfläche mineralisch', 240, 'm²', 14.50),
          makePos('1.3', 'Fassadenanstrich 2-fach mit Silikonharzfarbe', 240, 'm²', 32.00),
          makePos('1.4', 'Malerarbeiten Empfangstheke & Deckenfläche', 45, 'm²', 48.00),
        ]
      },
      rechnung: {
        nr: 'RE-2026-3001',
        date: '2026-08-20',
        faellig: '2026-09-19',
        status: 'Bezahlt',
        bezahltAm: '2026-09-02',
        titel: 'Akontorechnung 50% Fassadenarbeiten'
      }
    },

    // 2. Dr. Thomas Muster
    {
      kNr: 'K-1004',
      pNummer: 'P-3002',
      pName: 'Musterwohnung Abrieb & Malerarbeiten',
      pAdresse: 'Musterstrasse 44, 8000 Zürich',
      pKategorie: 'Innenausbau',
      pStatus: 'In Arbeit',
      pStart: '2026-08-15',
      pEnd: '2026-09-20',
      pNotizen: 'Schlafzimmer und Ankleide. Mineralischer Positiv-Abrieb.',
      offerte: {
        nr: 'OFF-2026-3002',
        date: '2026-08-15',
        status: 'Akzeptiert',
        titel: 'Offerte Abrieb & Malerarbeiten Musterstrasse',
        positions: [
          makePos('1.1', 'Abdecken Böden & Einbauten mit Schutzvlies', 85, 'm²', 9.50),
          makePos('1.2', 'Wände spachteln & vollflächig schleifen (Q3-Standard)', 110, 'm²', 28.00),
          makePos('1.3', 'Mineralischer Abrieb 1.5mm weiss strukturieren', 110, 'm²', 36.00),
          makePos('1.4', 'Deckenanstrich matt weiss rollen', 65, 'm²', 18.50),
        ]
      },
      rechnung: {
        nr: 'RE-2026-3002',
        date: '2026-09-01',
        faellig: '2026-10-01',
        status: 'Versendet',
        bezahltAm: null,
        titel: 'Rechnung Abrieb & Malerarbeiten'
      }
    },

    // 3. Beat & Marianne Muster
    {
      kNr: 'K-1005',
      pNummer: 'P-3003',
      pName: 'Fassadensanierung & Risssanierung',
      pAdresse: 'Musterweg 7, 3000 Bern',
      pKategorie: 'Sanierung',
      pStatus: 'Aktiv',
      pStart: '2026-08-20',
      pEnd: '2026-10-15',
      pNotizen: 'Denkmalgeschützte Liegenschaft. Riss-Sanierung und Neuanstrich.',
      offerte: {
        nr: 'OFF-2026-3003',
        date: '2026-08-18',
        status: 'Versendet',
        titel: 'Offerte Fassadenanstrich & Risssanierung EFH',
        positions: [
          makePos('1.1', 'Gerüstbau & Schutzeinhausung Fassade', 1, 'Pauschal', 1850.00),
          makePos('1.2', 'Untergrund reinigen & Risssanierung mit Netzeinbettung', 65, 'm²', 38.00),
          makePos('1.3', 'Fassadenanstrich mineralisch (2-facher Anstrich)', 120, 'm²', 26.00),
        ]
      },
      rechnung: {
        nr: 'RE-2026-3003',
        date: '2026-09-05',
        faellig: '2026-10-05',
        status: 'Versendet',
        bezahltAm: null,
        titel: 'Akontorechnung Gerüst & Vorbereitung'
      }
    },

    // 4. Lukas & Corinne Muster
    {
      kNr: 'K-1008',
      pNummer: 'P-3004',
      pName: 'Badsanierung & Schimmelschutz EG',
      pAdresse: 'Musterstrasse 15, 4000 Basel',
      pKategorie: 'Sanierung',
      pStatus: 'Abgeschlossen',
      pStart: '2026-07-01',
      pEnd: '2026-07-31',
      pNotizen: 'Erfolgreich abgenommen am 31. Juli.',
      offerte: {
        nr: 'OFF-2026-3004',
        date: '2026-07-05',
        status: 'Akzeptiert',
        titel: 'Offerte Badsanierung & Anti-Schimmel-Anstrich',
        positions: [
          makePos('1.1', 'Altanstriche abbeizen & Tiefengrundierung aufbringen', 38, 'm²', 22.00),
          makePos('1.2', 'Feuchtraum-Spachtelung mit Schimmelschutz-Zusatz', 38, 'm²', 34.00),
          makePos('1.3', 'Latexfarbe Seidenglanz 2-fach streichen', 38, 'm²', 24.00),
          makePos('1.4', 'Silikonfugen sanitär erneuern', 25, 'lfm', 18.00),
        ]
      },
      rechnung: {
        nr: 'RE-2026-3004',
        date: '2026-08-01',
        faellig: '2026-08-31',
        status: 'Bezahlt',
        bezahltAm: '2026-08-15',
        titel: 'Schlussrechnung Badsanierung & Schimmelschutz'
      }
    },

    // 5. Muster Liegenschaften AG
    {
      kNr: 'K-1003',
      pNummer: 'P-3005',
      pName: 'Treppenhausrenovation Mustergasse',
      pAdresse: 'Mustergasse 5, 3000 Bern',
      pKategorie: 'Renovation',
      pStatus: 'In Arbeit',
      pStart: '2026-08-10',
      pEnd: '2026-09-30',
      pNotizen: 'Geländer schleifen & lackieren. Wände abwaschbar streichen.',
      offerte: {
        nr: 'OFF-2026-3005',
        date: '2026-08-02',
        status: 'Akzeptiert',
        titel: 'Offerte Treppenhaussanierung 4 Etagen',
        positions: [
          makePos('1.1', 'Abdecken Böden & Treppenstufen mit Schutzvlies', 80, 'm²', 9.50),
          makePos('1.2', 'Treppengeländer Metall schleifen und 2x lackieren', 32, 'lfm', 45.00),
          makePos('1.3', 'Wände und Decken Treppenhaus streichen (Latexfarbe seidenmatt)', 180, 'm²', 24.00),
        ]
      },
      rechnung: {
        nr: 'RE-2026-3005',
        date: '2026-07-25',
        faellig: '2026-08-24', // Überfällig
        status: 'Überfällig',
        bezahltAm: null,
        titel: 'Service- & Vorbereitungsrechnung'
      }
    }
  ];

  for (const pDef of projectsDef) {
    const kunde = kMap[pDef.kNr];
    if (!kunde) continue;

    // 1. Projekt anlegen
    const { data: pData, error: pErr } = await supabase
      .from('projekte')
      .insert({
        tenant_id: ATELIER77_TENANT_ID,
        kunden_id: kunde.id,
        name: pDef.pName,
        adresse: pDef.pAdresse,
        kategorie: pDef.pKategorie,
        status: pDef.pStatus,
        startdatum: pDef.pStart,
        enddatum: pDef.pEnd,
        notizen: pDef.pNotizen,
        created_at: pDef.offerte.date + 'T08:00:00Z'
      })
      .select()
      .single();

    if (pErr) {
      console.error(`❌ Fehler bei Projekt ${pDef.pName}:`, pErr);
      continue;
    }

    // 2. Offerte anlegen
    const offDocData = makeDocData(pDef.offerte.titel, pDef.offerte.date, pDef.offerte.positions);

    const { data: oData, error: oErr } = await supabase
      .from('offerten')
      .insert({
        tenant_id: ATELIER77_TENANT_ID,
        offerte_nr: pDef.offerte.nr,
        kunden_id: kunde.id,
        projekt_id: pData.id,
        gueltig_bis: '2026-10-31',
        status: pDef.offerte.status,
        total: offDocData.finalTotal,
        daten: offDocData,
        created_at: pDef.offerte.date + 'T09:00:00Z'
      })
      .select()
      .single();

    if (oErr) {
      console.error(`❌ Fehler bei Offerte ${pDef.offerte.nr}:`, oErr);
      continue;
    }

    // 3. Rechnung anlegen oder aktualisieren
    if (pDef.rechnung) {
      const recDocData = makeDocData(pDef.rechnung.titel || pDef.offerte.titel, pDef.rechnung.date, pDef.offerte.positions);
      const isPaid = pDef.rechnung.status === 'Bezahlt';
      const bezahltBetrag = isPaid ? offDocData.finalTotal : 0;

      // Prüfen ob Rechnung existiert
      const { data: existingRec } = await supabase
        .from('rechnungen')
        .select('id')
        .eq('tenant_id', ATELIER77_TENANT_ID)
        .eq('rechnung_nr', pDef.rechnung.nr)
        .maybeSingle();

      let rData;
      if (existingRec) {
        const { data, error: rErr } = await supabase
          .from('rechnungen')
          .update({
            kunden_id: kunde.id,
            projekt_id: pData.id,
            offerte_id: oData.id,
            rechnungsdatum: pDef.rechnung.date,
            faellig_am: pDef.rechnung.faellig,
            total: offDocData.finalTotal,
            bezahlt: bezahltBetrag,
            bezahlt_am: pDef.rechnung.bezahltAm ? pDef.rechnung.bezahltAm + 'T12:00:00Z' : null,
            daten: recDocData,
            is_archived: false
          })
          .eq('id', existingRec.id)
          .select()
          .single();

        if (rErr) console.error(`❌ Fehler beim Aktualisieren von Rechnung ${pDef.rechnung.nr}:`, rErr);
        else rData = data;
      } else {
        const { data, error: rErr } = await supabase
          .from('rechnungen')
          .insert({
            tenant_id: ATELIER77_TENANT_ID,
            rechnung_nr: pDef.rechnung.nr,
            kunden_id: kunde.id,
            projekt_id: pData.id,
            offerte_id: oData.id,
            rechnungsdatum: pDef.rechnung.date,
            faellig_am: pDef.rechnung.faellig,
            status: pDef.rechnung.status,
            typ: 'gesamt',
            zahlungsfrist_tage: 30,
            total: offDocData.finalTotal,
            bezahlt: bezahltBetrag,
            bezahlt_am: pDef.rechnung.bezahltAm ? pDef.rechnung.bezahltAm + 'T12:00:00Z' : null,
            daten: recDocData,
            created_at: pDef.rechnung.date + 'T10:00:00Z',
            is_archived: false
          })
          .select()
          .single();

        if (rErr) console.error(`❌ Fehler beim Anlegen von Rechnung ${pDef.rechnung.nr}:`, rErr);
        else rData = data;
      }

      if (rData) {
        await supabase.from('offerten').update({ rechnung_id: rData.id }).eq('id', oData.id);
      }
    }
  }

  // =========================================================================
  // 7. MUSTER-TERMINE FÜR KALENDER (Aktuelle Woche)
  // =========================================================================
  console.log('\n📅 7. Lege Termine für den Monteur-Kalender an...');
  const termineDef = [
    {
      tenant_id: ATELIER77_TENANT_ID,
      titel: 'Malerarbeiten Empfang vor Ort',
      beschreibung: 'Farbkonzept ausführen bei Muster Hotel Alpenblick AG',
      start_zeit: '2026-10-12T07:30:00Z',
      end_zeit: '2026-10-12T16:30:00Z',
      typ: 'Montage',
      ort: 'Musterplatz 1, 3000 Bern',
      status: 'Geplant'
    },
    {
      tenant_id: ATELIER77_TENANT_ID,
      titel: 'Farbberatung & Bemusterung Musterstrasse',
      beschreibung: 'Bemusterung Abrieb mit Dr. Thomas Muster',
      start_zeit: '2026-10-13T10:00:00Z',
      end_zeit: '2026-10-13T11:30:00Z',
      typ: 'Besprechung',
      ort: 'Musterstrasse 44, 8000 Zürich',
      status: 'Geplant'
    },
    {
      tenant_id: ATELIER77_TENANT_ID,
      titel: 'Bauabnahme & Übergabe Badsanierung',
      beschreibung: 'Gemeinsame Endabnahme mit Familie Muster',
      start_zeit: '2026-10-14T14:00:00Z',
      end_zeit: '2026-10-14T15:00:00Z',
      typ: 'Abnahme',
      ort: 'Musterstrasse 15, 4000 Basel',
      status: 'Geplant'
    },
    {
      tenant_id: ATELIER77_TENANT_ID,
      titel: 'Zwischenkontrolle Treppenhaus Mustergasse',
      beschreibung: 'Überprüfung Lacktrocknung Geländer 2. OG',
      start_zeit: '2026-10-15T09:00:00Z',
      end_zeit: '2026-10-15T10:00:00Z',
      typ: 'Baustelle',
      ort: 'Mustergasse 5, 3000 Bern',
      status: 'Geplant'
    }
  ];

  await supabase.from('termine').insert(termineDef);
  console.log('✅ Kalender-Termine angelegt.');

  // =========================================================================
  // 8. MUSTER-AUSGABEN FÜR SCHWEIZER BUCHHALTUNG (2026)
  // =========================================================================
  console.log('\n📊 8. Lege Muster-Ausgaben für Schweizer Buchhaltung (OR 957 ff.) an...');
  const ausgabenDef = [
    {
      tenant_id: ATELIER77_TENANT_ID,
      titel: 'Muster Farben Schweiz AG - Innen- und Fassadenfarben',
      beleg_datum: '2026-07-25',
      kategorie: '4000 Materialaufwand',
      betrag_brutto: 1845.50,
      betrag_netto: 1707.22,
      mwst_satz: 8.1,
      mwst_betrag: 138.28,
      status: 'Bezahlt',
      is_archived: false
    },
    {
      tenant_id: ATELIER77_TENANT_ID,
      titel: 'Muster Lacke & Grundierungen AG Bern',
      beleg_datum: '2026-08-12',
      kategorie: '4000 Materialaufwand',
      betrag_brutto: 920.00,
      betrag_netto: 851.06,
      mwst_satz: 8.1,
      mwst_betrag: 68.94,
      status: 'Bezahlt',
      is_archived: false
    },
    {
      tenant_id: ATELIER77_TENANT_ID,
      titel: 'Muster Baumarkt Bern - Gipskartonplatten & Latten',
      beleg_datum: '2026-08-18',
      kategorie: '4000 Materialaufwand',
      betrag_brutto: 1450.00,
      betrag_netto: 1341.35,
      mwst_satz: 8.1,
      mwst_betrag: 108.65,
      status: 'Bezahlt',
      is_archived: false
    },
    {
      tenant_id: ATELIER77_TENANT_ID,
      titel: 'Muster Metallbau & Träger AG Bern',
      beleg_datum: '2026-08-22',
      kategorie: '4000 Materialaufwand',
      betrag_brutto: 2840.00,
      betrag_netto: 2627.20,
      mwst_satz: 8.1,
      mwst_betrag: 212.80,
      status: 'Bezahlt',
      is_archived: false
    },
    {
      tenant_id: ATELIER77_TENANT_ID,
      titel: 'Muster Malerwerkzeuge & Abdeckvlies',
      beleg_datum: '2026-08-26',
      kategorie: '4500 Werkzeuge und Maschinen',
      betrag_brutto: 435.80,
      betrag_netto: 403.15,
      mwst_satz: 8.1,
      mwst_betrag: 32.65,
      status: 'Bezahlt',
      is_archived: false
    },
    {
      tenant_id: ATELIER77_TENANT_ID,
      titel: 'Muster Befestigungstechnik AG - Dübelsortiment',
      beleg_datum: '2026-09-02',
      kategorie: '4500 Werkzeuge und Maschinen',
      betrag_brutto: 890.00,
      betrag_netto: 823.31,
      mwst_satz: 8.1,
      mwst_betrag: 66.69,
      status: 'Bezahlt',
      is_archived: false
    },
    {
      tenant_id: ATELIER77_TENANT_ID,
      titel: 'Muster Schleifmittel & Klebebänder AG',
      beleg_datum: '2026-09-04',
      kategorie: '4000 Materialaufwand',
      betrag_brutto: 285.30,
      betrag_netto: 263.92,
      mwst_satz: 8.1,
      mwst_betrag: 21.38,
      status: 'Bezahlt',
      is_archived: false
    },
    {
      tenant_id: ATELIER77_TENANT_ID,
      titel: 'Muster Versicherung Bern - Betriebshaftpflicht Q3',
      beleg_datum: '2026-07-01',
      kategorie: '6300 Versicherungen',
      betrag_brutto: 1250.00,
      betrag_netto: 1250.00,
      mwst_satz: 0.0,
      mwst_betrag: 0.00,
      status: 'Bezahlt',
      is_archived: false
    }
  ];

  await supabase.from('ausgaben').insert(ausgabenDef);
  console.log('✅ Schweizer Muster-Ausgaben für 2026 verbucht.');

  console.log('\n🎉 Fertig! Schweizer Musterdaten, Logo und Abrechnungen sind vollständig initialisiert.');
}

runMusterdatenSetup().catch(err => {
  console.error('Fataler Fehler beim Seeding:', err);
  process.exit(1);
});
