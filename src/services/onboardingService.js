import { supabase } from '../lib/supabase'

export const BRANCHEN = [
  { id: 'maler_gipser', name: 'Maler & Gipser', icon: '🎨', defaultColor: '#0ea5e9' },
  { id: 'schreinerei', name: 'Schreinerei & Holzbau', icon: '🪚', defaultColor: '#9f1239' },
  { id: 'sanitaer_heizung', name: 'Sanitär & Heizung', icon: '🔧', defaultColor: '#2563eb' },
  { id: 'elektro', name: 'Elektro & Installation', icon: '⚡', defaultColor: '#4f46e5' },
  { id: 'gartenbau', name: 'Gartenbau & Umgebung', icon: '🌱', defaultColor: '#059669' },
  { id: 'bau_renovation', name: 'Bau & Renovation', icon: '🏗️', defaultColor: '#334155' },
  { id: 'allround', name: 'Allround-Handwerk & Service', icon: '🔨', defaultColor: '#0d9488' },
]

export const DEMO_DATA_PRESETS = {
  maler_gipser: {
    kunde: {
      anrede: 'Herr & Frau',
      vorname: 'Beat & Andrea',
      nachname: 'Meier',
      name: 'Meier Beat & Andrea',
      firmenname: '',
      strasse: 'Thunstrasse 45',
      plz: '3005',
      ort: 'Bern',
      land: 'Schweiz',
      telefon: '+41 31 351 12 34',
      email: 'beat.meier@beispiel.ch',
      notizen: '[MUSTERDATEN] Schweizer Demo-Kunde für Ihren Test',
      status: 'Aktiv'
    },
    projekt: {
      name: 'Wohnungsrenovation & Fassadenanstrich',
      adresse: 'Thunstrasse 45, 3005 Bern',
      status: 'Aktiv',
      notizen: '[MUSTERDATEN] Schweizer Demo-Projekt'
    },
    offerte: {
      titel: 'Offerte für Maler- & Abriebarbeiten EFH',
      leistungen: [
        { id: 1, pos: '01', beschreibung: 'Abdecken und Schützen (Böden, Treppen, Fenster & Möbel)', menge: 65, einheit: 'm²', einzelpreis: 5.00, total: 325.00 },
        { id: 2, pos: '02', beschreibung: 'Wände streichen (Dispersion, 2x Anstrich, Deckweiss RAL 9010)', menge: 180, einheit: 'm²', einzelpreis: 23.50, total: 4230.00 },
        { id: 3, pos: '03', beschreibung: 'Decke streichen (Dispersion, 2x Anstrich mattweiss)', menge: 65, einheit: 'm²', einzelpreis: 26.00, total: 1690.00 },
        { id: 4, pos: '04', beschreibung: 'Risssanierung Wände (inkl. Netzeinbettung & Spachteln)', menge: 14, einheit: 'lfm', einzelpreis: 35.00, total: 490.00 },
        { id: 5, pos: '05', beschreibung: 'Türen und Zargen lackieren (Holz seidenmatt, inkl. Anschleifen)', menge: 4, einheit: 'Stk', einzelpreis: 185.00, total: 740.00 },
      ],
      notizen: '[MUSTERDATEN] Schweizer Demo-Offerte'
    }
  },

  schreinerei: {
    kunde: {
      anrede: 'Herr',
      vorname: 'Thomas',
      nachname: 'Keller',
      name: 'Dr. med. Thomas Keller',
      firmenname: 'Praxis Dr. Keller',
      strasse: 'Seestrasse 112',
      plz: '8002',
      ort: 'Zürich',
      land: 'Schweiz',
      telefon: '+41 44 201 88 99',
      email: 'thomas.keller@beispiel.ch',
      notizen: '[MUSTERDATEN] Schweizer Demo-Kunde für Ihren Test',
      status: 'Aktiv'
    },
    projekt: {
      name: 'Massivholz-Einbauschrank & Parkettarbeiten',
      adresse: 'Seestrasse 112, 8002 Zürich',
      status: 'Aktiv',
      notizen: '[MUSTERDATEN] Schweizer Demo-Projekt'
    },
    offerte: {
      titel: 'Offerte für massgefertigten Einbauschrank & Parkett',
      leistungen: [
        { id: 1, pos: '01', beschreibung: 'Einbauschrank nach Mass (Eiche furniert geölt, 3-türig mit Soft-Close)', menge: 1, einheit: 'Stk', einzelpreis: 4850.00, total: 4850.00 },
        { id: 2, pos: '02', beschreibung: 'Landhausdielen Eiche verlegen (inkl. Trittschalldämmung)', menge: 45, einheit: 'm²', einzelpreis: 95.00, total: 4275.00 },
        { id: 3, pos: '03', beschreibung: 'Sockelleisten montieren (massiv Eiche geölt, Gehrungsschnitte)', menge: 28, einheit: 'lfm', einzelpreis: 24.00, total: 672.00 },
      ],
      notizen: '[MUSTERDATEN] Schweizer Demo-Offerte'
    }
  },

  sanitaer_heizung: {
    kunde: {
      anrede: 'Familie',
      vorname: 'Lukas & Corinne',
      nachname: 'Brunner',
      name: 'Brunner Lukas & Corinne',
      firmenname: '',
      strasse: 'Kirchweg 12',
      plz: '4051',
      ort: 'Basel',
      land: 'Schweiz',
      telefon: '+41 61 272 44 55',
      email: 'lukas.brunner@beispiel.ch',
      notizen: '[MUSTERDATEN] Schweizer Demo-Kunde für Ihren Test',
      status: 'Aktiv'
    },
    projekt: {
      name: 'Badsanierung & Leitungsersatz EG',
      adresse: 'Kirchweg 12, 4051 Basel',
      status: 'Aktiv',
      notizen: '[MUSTERDATEN] Schweizer Demo-Projekt'
    },
    offerte: {
      titel: 'Offerte für komplette Badsanierung',
      leistungen: [
        { id: 1, pos: '01', beschreibung: 'Demontage & fachgerechte Entsorgung alte Sanitärkeramik & Armaturen', menge: 1, einheit: 'Pauschal', einzelpreis: 650.00, total: 650.00 },
        { id: 2, pos: '02', beschreibung: 'Montage Waschtisch & Unterbaumöbel (inkl. Ablauf & Einhandmischer)', menge: 1, einheit: 'Stk', einzelpreis: 1450.00, total: 1450.00 },
        { id: 3, pos: '03', beschreibung: 'Duschsystem Unterputz mit Regenduschkopf installieren & verrohren', menge: 1, einheit: 'Stk', einzelpreis: 2150.00, total: 2150.00 },
        { id: 4, pos: '04', beschreibung: 'Heizkörper spülen und voreinstellbare Thermostatventile montieren', menge: 4, einheit: 'Stk', einzelpreis: 160.00, total: 640.00 },
      ],
      notizen: '[MUSTERDATEN] Schweizer Demo-Offerte'
    }
  },

  elektro: {
    kunde: {
      anrede: 'Firma',
      vorname: 'Stefan',
      nachname: 'Amstutz',
      name: 'ImmoVerwaltung Schweizer AG',
      firmenname: 'ImmoVerwaltung Schweizer AG',
      strasse: 'Badenerstrasse 340',
      plz: '8004',
      ort: 'Zürich',
      land: 'Schweiz',
      telefon: '+41 43 311 00 22',
      email: 's.amstutz@immo-schweizer.ch',
      notizen: '[MUSTERDATEN] Schweizer Demo-Kunde für Ihren Test',
      status: 'Aktiv'
    },
    projekt: {
      name: 'Elektro-Installation & LED-Umrüstung Liegenschaft',
      adresse: 'Badenerstrasse 340, 8004 Zürich',
      status: 'Aktiv',
      notizen: '[MUSTERDATEN] Schweizer Demo-Projekt'
    },
    offerte: {
      titel: 'Offerte für Elektro-Grundinstallation & Beleuchtung',
      leistungen: [
        { id: 1, pos: '01', beschreibung: 'Unterverteilung erstellen & verdrahten (inkl. FI-Schutzschalter nach NIN)', menge: 1, einheit: 'Stk', einzelpreis: 2200.00, total: 2200.00 },
        { id: 2, pos: '02', beschreibung: 'Steckdosen & Lichtschalter Feller EDIZIOdue montieren & prüfen', menge: 32, einheit: 'Stk', einzelpreis: 78.00, total: 2496.00 },
        { id: 3, pos: '03', beschreibung: 'LED-Deckeneinbauspots bohren, anschliessen & einmessen (warmweiss 3000K)', menge: 16, einheit: 'Stk', einzelpreis: 65.00, total: 1040.00 },
      ],
      notizen: '[MUSTERDATEN] Schweizer Demo-Offerte'
    }
  },

  gartenbau: {
    kunde: {
      anrede: 'Herr & Frau',
      vorname: 'Hanspeter & Ruth',
      nachname: 'Vögeli',
      name: 'Vögeli Hanspeter & Ruth',
      firmenname: '',
      strasse: 'Sonnenbergstrasse 8',
      plz: '6005',
      ort: 'Luzern',
      land: 'Schweiz',
      telefon: '+41 41 360 77 88',
      email: 'hanspeter.voegeli@beispiel.ch',
      notizen: '[MUSTERDATEN] Schweizer Demo-Kunde für Ihren Test',
      status: 'Aktiv'
    },
    projekt: {
      name: 'Gartenumgestaltung & Tessiner Naturstein-Sitzplatz',
      adresse: 'Sonnenbergstrasse 8, 6005 Luzern',
      status: 'Aktiv',
      notizen: '[MUSTERDATEN] Schweizer Demo-Projekt'
    },
    offerte: {
      titel: 'Offerte für Naturstein-Sitzplatz & Rollrasen',
      leistungen: [
        { id: 1, pos: '01', beschreibung: 'Aushub- und Planierarbeiten Gartenfläche (inkl. Abfuhr und Deponiegebühr)', menge: 45, einheit: 'm²', einzelpreis: 32.00, total: 1440.00 },
        { id: 2, pos: '02', beschreibung: 'Natursteinplatten verlegen (Granit Tessin hell, gebrochene Kanten)', menge: 28, einheit: 'm²', einzelpreis: 145.00, total: 4060.00 },
        { id: 3, pos: '03', beschreibung: 'Rollrasen verlegen (inkl. Bodenfräsen, Feinplanum & Startdünger)', menge: 80, einheit: 'm²', einzelpreis: 18.50, total: 1480.00 },
      ],
      notizen: '[MUSTERDATEN] Schweizer Demo-Offerte'
    }
  },

  bau_renovation: {
    kunde: {
      anrede: 'Eigentümergemeinschaft',
      vorname: 'Marc',
      nachname: 'Gerber',
      name: 'STWEG Residenz Alpenblick',
      firmenname: 'STWEG Residenz Alpenblick',
      strasse: 'Bahnhofstrasse 19',
      plz: '9000',
      ort: 'St. Gallen',
      land: 'Schweiz',
      telefon: '+41 71 222 33 44',
      email: 'verwaltung@residenz-alpenblick.ch',
      notizen: '[MUSTERDATEN] Schweizer Demo-Kunde für Ihren Test',
      status: 'Aktiv'
    },
    projekt: {
      name: 'Renovation Treppenhaus & Eingangsbereich',
      adresse: 'Bahnhofstrasse 19, 9000 St. Gallen',
      status: 'Aktiv',
      notizen: '[MUSTERDATEN] Schweizer Demo-Projekt'
    },
    offerte: {
      titel: 'Offerte für Baumeister- & Sanierungsarbeiten',
      leistungen: [
        { id: 1, pos: '01', beschreibung: 'Baustelleneinrichtung, Staubschutzwand & Schutzmassnahmen', menge: 1, einheit: 'Pauschal', einzelpreis: 850.00, total: 850.00 },
        { id: 2, pos: '02', beschreibung: 'Mauerwerk ausbessern, verputzen & glätten (Q3 Standard)', menge: 75, einheit: 'm²', einzelpreis: 42.00, total: 3150.00 },
        { id: 3, pos: '03', beschreibung: 'Bodenplatten Feinsteinzeug rutschfest verlegen (inkl. Verfugung)', menge: 35, einheit: 'm²', einzelpreis: 85.00, total: 2975.00 },
      ],
      notizen: '[MUSTERDATEN] Schweizer Demo-Offerte'
    }
  },

  allround: {
    kunde: {
      anrede: 'Herr',
      vorname: 'Patrick',
      nachname: 'Zimmermann',
      name: 'Zimmermann Patrick',
      firmenname: '',
      strasse: 'Postgasse 5',
      plz: '5000',
      ort: 'Aarau',
      land: 'Schweiz',
      telefon: '+41 62 822 55 66',
      email: 'patrick.zimmermann@beispiel.ch',
      notizen: '[MUSTERDATEN] Schweizer Demo-Kunde für Ihren Test',
      status: 'Aktiv'
    },
    projekt: {
      name: 'Unterhalts- & Reparaturarbeiten Liegenschaft',
      adresse: 'Postgasse 5, 5000 Aarau',
      status: 'Aktiv',
      notizen: '[MUSTERDATEN] Schweizer Demo-Projekt'
    },
    offerte: {
      titel: 'Offerte für allgemeine Handwerks- & Reparaturarbeiten',
      leistungen: [
        { id: 1, pos: '01', beschreibung: 'Vor-Ort Besichtigung & Arbeitsvorbereitung', menge: 1, einheit: 'Std', einzelpreis: 95.00, total: 95.00 },
        { id: 2, pos: '02', beschreibung: 'Ausbesserungs- & Reparaturarbeiten Holz- und Metallteile', menge: 8, einheit: 'Std', einzelpreis: 95.00, total: 760.00 },
        { id: 3, pos: '03', beschreibung: 'Kleinmaterial, Schrauben, Dichtungen & Schmiermittel', menge: 1, einheit: 'Pauschal', einzelpreis: 85.00, total: 85.00 },
      ],
      notizen: '[MUSTERDATEN] Schweizer Demo-Offerte'
    }
  }
}

/**
 * Enriches a newly created tenant with full Swiss company details and user profile
 */
export async function finalizeTenantRegistration({
  userId,
  vorname,
  nachname,
  firmenname,
  strasse,
  plz,
  ort,
  kanton,
  uid,
  telefon,
  branche,
  primaryColor,
  logoUrl,
  createDemoData = true
}) {
  const fullName = `${vorname || ''} ${nachname || ''}`.trim()
  const cleanPlz = (plz || '').trim()
  const cleanOrt = (ort || '').trim()
  const plzOrt = [cleanPlz, cleanOrt].filter(Boolean).join(' ')

  try {
    // 1. Get the newly assigned tenant_id for this user
    let tenantId = null
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('tenant_id')
      .eq('id', userId)
      .maybeSingle()

    tenantId = roleData?.tenant_id

    // 2. Update user_roles with real user name
    if (fullName) {
      await supabase
        .from('user_roles')
        .update({ user_name: fullName })
        .eq('id', userId)
    }

    // 3. Update or Insert einstellungen for this tenant
    const einstellungenPayload = {
      firmenname: firmenname || 'Mein Betrieb',
      strasse: strasse || '',
      plz: cleanPlz,
      ort: cleanOrt,
      plz_ort: plzOrt,
      kanton: kanton || 'BE',
      uid: uid || '',
      telefon: telefon || '',
      land: 'Schweiz',
      primary_color: primaryColor || '#b88a38',
      standard_mwst: 8.1,
      standard_rabatt: 0,
      gueltigkeit_offerten_tage: 30,
      zahlungsfrist_tage: 30
    }

    if (logoUrl) {
      einstellungenPayload.logo_url = logoUrl
    }

    if (tenantId) {
      // Upsert einstellungen with tenant_id
      const { data: existingSettings } = await supabase
        .from('einstellungen')
        .select('id')
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (existingSettings?.id) {
        await supabase
          .from('einstellungen')
          .update(einstellungenPayload)
          .eq('id', existingSettings.id)
      } else {
        await supabase
          .from('einstellungen')
          .insert([{ ...einstellungenPayload, tenant_id: tenantId }])
      }
    }

    // 4. Optionally seed Swiss Demo Data for the chosen branch
    if (createDemoData) {
      await seedDemoDataForBranch(branche || 'maler_gipser', tenantId)
    }

    return { success: true, tenantId }
  } catch (err) {
    console.error('Failed to finalize tenant registration:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Creates 1 Swiss demo customer, 1 demo project, and 1 demo offer for the new company
 */
export async function seedDemoDataForBranch(branchId, tenantId) {
  const preset = DEMO_DATA_PRESETS[branchId] || DEMO_DATA_PRESETS.maler_gipser

  try {
    // 1. Insert Kunde
    const kundePayload = {
      ...preset.kunde,
      ...(tenantId ? { tenant_id: tenantId } : {})
    }
    const { data: kundeData, error: kundeError } = await supabase
      .from('kunden')
      .insert([kundePayload])
      .select()

    if (kundeError || !kundeData || kundeData.length === 0) {
      console.warn('Could not insert demo kunde:', kundeError)
      return
    }

    const kundeId = kundeData[0].id

    // 2. Insert Projekt
    const projektPayload = {
      ...preset.projekt,
      kunden_id: kundeId,
      ...(tenantId ? { tenant_id: tenantId } : {})
    }
    const { data: projektData, error: projektError } = await supabase
      .from('projekte')
      .insert([projektPayload])
      .select()

    const projektId = projektData && projektData.length > 0 ? projektData[0].id : null

    // 3. Calculate total & Insert Offerte
    const subtotal = preset.offerte.leistungen.reduce((sum, item) => sum + (item.total || 0), 0)
    const mwstBetrag = Math.round(subtotal * 0.081 * 100) / 100
    const grandTotal = Math.round((subtotal + mwstBetrag) * 100) / 100

    const currentYear = new Date().getFullYear()
    const heuteIso = new Date().toISOString().split('T')[0]
    const gueltigBis = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const offertePayload = {
      kunden_id: kundeId,
      projekt_id: projektId,
      offerte_nr: `OF-${currentYear}-1001`,
      status: 'Entwurf',
      total: grandTotal,
      gueltig_bis: gueltigBis,
      notizen: preset.offerte.notizen,
      daten: {
        titel: preset.offerte.titel,
        datum: heuteIso,
        gueltig_bis: gueltigBis,
        leistungen: preset.offerte.leistungen,
        konditionen: { rabatt: 0, mwst: 8.1 },
        texte: {
          einleitungstext: 'Gerne unterbreiten wir Ihnen für die gewünschten Arbeiten folgende Offerte nach Schweizer Handwerker-Standard:',
          schlusstext: 'Wir danken Ihnen für das Vertrauen und stehen für Fragen oder eine Besichtigung gerne zur Verfügung.'
        },
        is_demo: true
      },
      ...(tenantId ? { tenant_id: tenantId } : {})
    }

    await supabase.from('offerten').insert([offertePayload])
  } catch (err) {
    console.error('Error creating demo data:', err)
  }
}

/**
 * 1-Click Clean-up: Removes all demo data records tagged with [MUSTERDATEN]
 */
export async function cleanupDemoData() {
  try {
    // 1. Delete demo offerten
    const { data: demoOfferten } = await supabase
      .from('offerten')
      .select('id')
      .ilike('notizen', '%[MUSTERDATEN]%')

    if (demoOfferten && demoOfferten.length > 0) {
      const ids = demoOfferten.map(o => o.id)
      await supabase.from('offerten').delete().in('id', ids)
    }

    // 2. Delete demo projekte
    const { data: demoProjekte } = await supabase
      .from('projekte')
      .select('id')
      .ilike('notizen', '%[MUSTERDATEN]%')

    if (demoProjekte && demoProjekte.length > 0) {
      const ids = demoProjekte.map(p => p.id)
      await supabase.from('projekte').delete().in('id', ids)
    }

    // 3. Delete demo kunden
    const { data: demoKunden } = await supabase
      .from('kunden')
      .select('id')
      .ilike('notizen', '%[MUSTERDATEN]%')

    if (demoKunden && demoKunden.length > 0) {
      const ids = demoKunden.map(k => k.id)
      await supabase.from('kunden').delete().in('id', ids)
    }

    return { success: true }
  } catch (err) {
    console.error('Failed to cleanup demo data:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Check onboarding milestones status
 */
export async function checkOnboardingStatus(settings) {
  try {
    // 1. Bank / QR-IBAN status
    const hasBank = Boolean(settings?.qr_iban || settings?.bankverbindung)

    // 2. Real Customers count (excluding demo data)
    const { data: kunden } = await supabase
      .from('kunden')
      .select('id, notizen')

    const realKunden = (kunden || []).filter(k => !(k.notizen || '').includes('[MUSTERDATEN]'))
    const hasRealCustomer = realKunden.length > 0
    const hasDemoCustomer = (kunden || []).some(k => (k.notizen || '').includes('[MUSTERDATEN]'))

    // 3. Real Offerten / Rechnungen count
    const { data: offerten } = await supabase
      .from('offerten')
      .select('id, notizen')

    const realOfferten = (offerten || []).filter(o => !(o.notizen || '').includes('[MUSTERDATEN]'))
    const hasCreatedDocument = realOfferten.length > 0

    // 4. Logo status
    const hasLogo = Boolean(settings?.logo_url)

    // 5. Team / Invitation status
    const { data: teamRoles } = await supabase
      .from('user_roles')
      .select('id')

    const hasTeam = (teamRoles || []).length > 1

    const steps = [
      { id: 'bank', label: 'QR-IBAN & Bankverbindung hinterlegen', completed: hasBank, action: 'finanzen' },
      { id: 'kunde', label: 'Ersten echten Kunden erfassen', completed: hasRealCustomer, action: 'kunde' },
      { id: 'offerte', label: 'Erste eigene Offerte schreiben', completed: hasCreatedDocument, action: 'offerte' },
      { id: 'logo', label: 'Firmenlogo hinterlegen', completed: hasLogo, action: 'logo' },
      { id: 'team', label: 'Team oder Treuhänder einladen', completed: hasTeam, action: 'team' },
    ]

    const completedCount = steps.filter(s => s.completed).length
    const progressPercent = Math.round((completedCount / steps.length) * 100)

    return {
      steps,
      completedCount,
      totalSteps: steps.length,
      progressPercent,
      hasDemoData: hasDemoCustomer,
      allCompleted: completedCount === steps.length
    }
  } catch (err) {
    console.error('Failed to check onboarding status:', err)
    return null
  }
}
