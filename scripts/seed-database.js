import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fpfdlraqtqtcnmajrcyx.supabase.co'
const supabaseKey = 'sb_publishable_brOU6y2FDiFiZq9fhOYHGA_xYnC5yQN'
const supabase = createClient(supabaseUrl, supabaseKey)

// -------------------------------------------------------------
// HELPER: Generiere Nummern & Daten
// -------------------------------------------------------------
const generateId = (prefix, index) => {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const num = (index + 1000).toString()
  return `${prefix}-${year}${month}-${num}`
}

const pastDate = (daysAgo) => {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

const futureDate = (daysAhead) => {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().split('T')[0]
}

const leistungenKatalog = {
  abdecken: { titel: "Abdeckarbeiten", beschreibung: "Böden, Fenster und Türen fachgerecht mit Vlies und Folie abdecken.", einheit: "Pausch.", preis: 250 },
  spachteln: { titel: "Risse spachteln", beschreibung: "Feinspachtelung an Wänden und Decken (Flecken-Spachtelung).", einheit: "Std.", preis: 85 },
  grundieren: { titel: "Tiefengrund auftragen", beschreibung: "Wände und Decken mit lösungsmittelfreiem Tiefengrund vorbehandeln.", einheit: "m2", preis: 6.50 },
  streichen_dispersion: { titel: "Dispersion weiss", beschreibung: "2x Anstrich mit hochwertiger Dispersionsfarbe, waschbeständig.", einheit: "m2", preis: 18.50 },
  streichen_mineral: { titel: "Mineralfarbe", beschreibung: "2x Anstrich mit Mineralfarbe (Silikat) für optimales Raumklima.", einheit: "m2", preis: 22.00 },
  fassade_reinigen: { titel: "Fassadenreinigung", beschreibung: "Fassade mit Hochdruckreiniger und Algen-Ex behandeln.", einheit: "m2", preis: 12.00 },
  fassade_streichen: { titel: "Fassadenfarbe", beschreibung: "2x Anstrich mit Silikonharz-Fassadenfarbe inkl. Grundierung.", einheit: "m2", preis: 35.00 },
  geruest: { titel: "Fassadengerüst", beschreibung: "Miete, Auf- und Abbau von Systemgerüst nach SUVA-Normen.", einheit: "Pausch.", preis: 1800 },
  holzwerk: { titel: "Holzwerk streichen", beschreibung: "Türen und Rahmen anschleifen, grundieren und 2x lackieren (Seidenmatt).", einheit: "Stk.", preis: 180 },
  regie_maler: { titel: "Malerarbeiten in Regie", beschreibung: "Zusätzliche Anpassungen und Ausbesserungen nach Aufwand.", einheit: "Std.", preis: 90 },
  schimmel: { titel: "Schimmelbehandlung", beschreibung: "Schimmelbefall fachgerecht entfernen und mit Fungizid behandeln.", einheit: "Pausch.", preis: 450 }
}

async function seed() {
  console.log('Starte extrem tiefgründigen Datenbank-Seed (6 Wochen Simulation)...')

  console.log('Logge ein...')
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: 'lourinidriss@gmail.com',
    password: 'Test1234'
  })
  if (authError) throw authError

  // ==========================================
  // 1. KUNDEN (10 Kunden mit ALLEN Feldern)
  // ==========================================
  const kundenData = [
    { typ: 'Liegenschaftsverwaltung', firmenname: 'Livit AG', vorname: 'Max', nachname: 'Muster', name: 'Livit AG Max Muster', strasse: 'Schwarztorstrasse 26', plz: '3007', ort: 'Bern', email: 'bern@livit.ch', telefon: '058 360 33 33', website: 'www.livit.ch', zahlungsziel: '30', notizen: 'Guter Grosskunde. Rechnung immer als PDF per Mail.', status: 'Aktiv' },
    { typ: 'Liegenschaftsverwaltung', firmenname: 'Wincasa AG', vorname: 'Sarah', nachname: 'Schmid', name: 'Wincasa AG Sarah Schmid', strasse: 'Grüzefeldstrasse 41', plz: '8404', ort: 'Winterthur', email: 'info@wincasa.ch', telefon: '058 456 77 77', website: 'www.wincasa.ch', zahlungsziel: '30', notizen: 'Achtung: Akontorechnungen zwingend über Immobilienportal einreichen.', status: 'Aktiv' },
    { typ: 'Liegenschaftsverwaltung', firmenname: 'Privera AG', vorname: 'Reto', nachname: 'Lüthi', name: 'Privera AG Reto Lüthi', strasse: 'Moserstrasse 10', plz: '3014', ort: 'Bern', email: 'bern@privera.ch', telefon: '058 715 60 60', website: 'www.privera.ch', zahlungsziel: '30', notizen: '', status: 'Aktiv' },
    { typ: 'Unternehmen / Firma', firmenname: 'Senn Architektur GmbH', vorname: 'Markus', nachname: 'Senn', name: 'Senn Architektur GmbH Markus Senn', strasse: 'Langstrasse 20', plz: '8004', ort: 'Zürich', email: 'info@senn-architektur.ch', telefon: '044 123 45 67', website: 'www.senn-architektur.ch', zahlungsziel: '14', notizen: 'Architekturbüro, anspruchsvolle Kunden.', status: 'Aktiv' },
    { typ: 'Unternehmen / Firma', firmenname: 'Bäckerei Hug', vorname: 'Peter', nachname: 'Hug', name: 'Bäckerei Hug Peter Hug', strasse: 'Dorfplatz 1', plz: '6003', ort: 'Luzern', email: 'info@baeckerei-hug.ch', telefon: '041 222 33 44', website: 'www.baeckerei-hug.ch', zahlungsziel: '10', notizen: 'Arbeiten oft nachts durchführen.', status: 'Aktiv' },
    { typ: 'Privatperson', firmenname: '', vorname: 'Michael', nachname: 'Keller', name: 'Michael Keller', strasse: 'Seestrasse 112', plz: '8002', ort: 'Zürich', email: 'm.keller@gmx.ch', telefon: '079 444 55 66', website: '', zahlungsziel: '10', notizen: 'Privatkunde, sehr freundlich.', status: 'Aktiv' },
    { typ: 'Privatperson', firmenname: '', vorname: 'Jürg', nachname: 'Weber', name: 'Jürg Weber', strasse: 'Murtenstrasse 10', plz: '3203', ort: 'Mühleberg', email: 'j.weber77@bluewin.ch', telefon: '076 999 88 77', website: '', zahlungsziel: '10', notizen: '', status: 'Aktiv' },
    { typ: 'Privatperson', firmenname: '', vorname: 'Sarah', nachname: 'Meier', name: 'Sarah Meier', strasse: 'Gurtengasse 5', plz: '3011', ort: 'Bern', email: 's.meier@bluewin.ch', telefon: '078 111 22 33', website: '', zahlungsziel: '10', notizen: 'Hund im Haus (aufpassen bei offener Tür).', status: 'Aktiv' },
    { typ: 'Privatperson', firmenname: '', vorname: 'Thomas', nachname: 'Gerber', name: 'Thomas Gerber', strasse: 'Aarestrasse 44', plz: '3600', ort: 'Thun', email: 't.gerber@gmail.com', telefon: '077 888 99 00', website: '', zahlungsziel: '10', notizen: '', status: 'Aktiv' },
    { typ: 'Privatperson', firmenname: '', vorname: 'Hansruedi', nachname: 'Zurfluh', name: 'Hansruedi Zurfluh', strasse: 'Hauptstrasse 88', plz: '3800', ort: 'Interlaken', email: 'hr.zurfluh@bluewin.ch', telefon: '079 333 44 55', website: '', zahlungsziel: '14', notizen: 'Ferienwohnung', status: 'Aktiv' }
  ]

  console.log('Erstelle 10 Kunden...')
  const { data: createdKunden, error: kundenError } = await supabase.from('kunden').insert(kundenData).select()
  if (kundenError) throw kundenError

  // ==========================================
  // 2. PROJEKTE (13 Projekte)
  // ==========================================
  const projekteData = [
    { kunden_id: createdKunden[0].id, name: 'Wohnungssanierung 3. OG (Mieterwechsel)', adresse: 'Schwarztorstrasse 26, 3007 Bern', status: 'Aktiv', notizen: 'Schlüssel bei Hauswart abholen.' },
    { kunden_id: createdKunden[0].id, name: 'Treppenhaus streichen Weissenstein', adresse: 'Weissensteinstrasse 12, 3008 Bern', status: 'Abgeschlossen', notizen: 'Mieter vorab informieren.' },
    { kunden_id: createdKunden[1].id, name: 'Fassadensanierung Block A & B', adresse: 'Hegifeldstrasse 10, 8404 Winterthur', status: 'Pausiert', notizen: 'Warten auf Baubewilligung.' },
    { kunden_id: createdKunden[1].id, name: 'Wasserschaden Behebung 1. OG', adresse: 'Bahnhofstrasse 15, 8400 Winterthur', status: 'Aktiv', notizen: 'Versicherungsfall.' },
    { kunden_id: createdKunden[2].id, name: 'Brandschutztüren lackieren', adresse: 'Moserstrasse 10, 3014 Bern', status: 'Entwurf', notizen: 'Offerte muss noch erstellt werden.' },
    { kunden_id: createdKunden[3].id, name: 'Neubau MFH Seefeld (Grobkostenschätzung)', adresse: 'Seefeldstrasse 100, 8008 Zürich', status: 'Aktiv', notizen: 'Architekt verlangt Mineralfarben.' },
    { kunden_id: createdKunden[3].id, name: 'Loft-Ausbau Geroldstrasse', adresse: 'Geroldstrasse 15, 8005 Zürich', status: 'Aktiv', notizen: 'Industrie-Chic, Wände roh belassen wo möglich.' },
    { kunden_id: createdKunden[4].id, name: 'Renovation Verkaufsfläche', adresse: 'Dorfplatz 1, 6003 Luzern', status: 'Abgeschlossen', notizen: 'Nur Nachteinsätze (20:00 - 05:00).' },
    { kunden_id: createdKunden[5].id, name: 'Wohnzimmer & Küche streichen', adresse: 'Seestrasse 112, 8002 Zürich', status: 'Aktiv', notizen: 'Wohnung ist bewohnt, extrem gut abdecken!' },
    { kunden_id: createdKunden[6].id, name: 'Badezimmer Schimmelbehandlung', adresse: 'Murtenstrasse 10, 3203 Mühleberg', status: 'Aktiv', notizen: 'Starker Schimmelbefall in der Dusch-Ecke.' },
    { kunden_id: createdKunden[7].id, name: 'Kinderzimmer rosa streichen', adresse: 'Gurtengasse 5, 3011 Bern', status: 'Abgeschlossen', notizen: 'Farbton NCS S 1020-R10B' },
    { kunden_id: createdKunden[8].id, name: 'Aussenholzwerk Gartenhaus', adresse: 'Aarestrasse 44, 3600 Thun', status: 'Pausiert', notizen: 'Holz muss komplett abgeschliffen werden.' },
    { kunden_id: createdKunden[9].id, name: 'Ferienwohnung komplett streichen', adresse: 'Hauptstrasse 88, 3800 Interlaken', status: 'Entwurf', notizen: 'Termin erst im Frühling möglich.' }
  ]

  console.log('Erstelle 13 Projekte...')
  const { data: createdProjekte, error: projekteError } = await supabase.from('projekte').insert(projekteData).select()
  if (projekteError) throw projekteError

  // Helper zum Berechnen des Totals und Flattens der Leistungen
  const getOffertenDaten = (titel, einleitung, schluss, bloecke, rabatt, mwst, konditionen) => {
    let sum = 0;
    bloecke.forEach(b => {
      b.positionen.forEach(p => {
        sum += p.menge * p.preis;
      })
    })
    
    // EXTREM WICHTIG: Das Dashboard erwartet `daten.leistungen` für die UI-Tabelle!
    const flatLeistungen = bloecke.flatMap(b => b.positionen || [])

    return {
      total: sum * (1 - rabatt/100),
      daten: {
        titel,
        einleitungstext: einleitung,
        schlusstext: schluss,
        bloecke,
        leistungen: flatLeistungen, // THIS WAS MISSING PREVIOUSLY!
        konditionen,
        rabatt_prozent: rabatt,
        mwst
      }
    }
  }

  // ==========================================
  // 3. OFFERTEN
  // ==========================================
  const offertenData = [
    // 1. Grosse Fassadensanierung (Wincasa) -> Akzeptiert (mit Rabatt)
    (function(){
      const bloecke = [
        { titel: "Gerüstbau", positionen: [{ ...leistungenKatalog.geruest, menge: 1 }] },
        { titel: "Fassade", positionen: [
          { ...leistungenKatalog.fassade_reinigen, menge: 450 },
          { ...leistungenKatalog.grundieren, menge: 450 },
          { ...leistungenKatalog.fassade_streichen, menge: 450 }
        ]}
      ]
      const o = getOffertenDaten('Offerte Fassadensanierung Block A & B', 
        "Sehr geehrte Damen und Herren,\n\nBesten Dank für die Anfrage. Gerne offerieren wir Ihnen die Fassadensanierung gemäss der gemeinsamen Begehung vom letzten Dienstag.",
        "Wir gewähren Ihnen auf das Gesamtvolumen einen Objekt-Rabatt von 5%.",
        bloecke, 5, 8.1, "30% Akonto bei Gerüststellung. 70% nach Abnahme. Zahlbar innert 30 Tagen netto. Preise exkl. 8.1% MwSt.")
      return { kunden_id: createdKunden[1].id, projekt_id: createdProjekte[2].id, offerte_nr: generateId('OFF', 1), status: 'Akzeptiert', total: o.total, daten: o.daten }
    })(),
    // 2. Wohnungssanierung Livit -> Akzeptiert
    (function(){
      const bloecke = [{ titel: "Malerarbeiten 3. OG", positionen: [
        { ...leistungenKatalog.abdecken, menge: 1 }, { ...leistungenKatalog.spachteln, menge: 4 }, { ...leistungenKatalog.streichen_dispersion, menge: 180 }, { ...leistungenKatalog.holzwerk, menge: 5 }
      ]}]
      const o = getOffertenDaten('Offerte Sanierung 3. OG', 
        "Guten Tag,\n\nWie besprochen, hier die Offerte für den Mieterwechsel im 3. OG.",
        "Ausführungstermin gemäss telefonischer Absprache: KW 42.",
        bloecke, 0, 8.1, "Zahlbar innert 30 Tagen netto. Preise exkl. 8.1% MwSt.")
      return { kunden_id: createdKunden[0].id, projekt_id: createdProjekte[0].id, offerte_nr: generateId('OFF', 2), status: 'Akzeptiert', total: o.total, daten: o.daten }
    })(),
    // 3. Loft-Ausbau Senn -> Offen
    (function(){
      const bloecke = [{ titel: "Wände und Decken", positionen: [ { ...leistungenKatalog.grundieren, menge: 220 }, { ...leistungenKatalog.streichen_mineral, menge: 220 } ]}]
      const o = getOffertenDaten('Offerte Loft-Ausbau Geroldstrasse', 
        "Grüezi Herr Senn,\n\nAnbei das Angebot für die Malerarbeiten im Loft. Wir verwenden hochwertige Mineralfarbe für den Beton-Look.",
        "Wir freuen uns auf Ihre Rückmeldung.",
        bloecke, 0, 8.1, "Zahlbar innert 14 Tagen netto.")
      return { kunden_id: createdKunden[3].id, projekt_id: createdProjekte[6].id, offerte_nr: generateId('OFF', 3), status: 'Offen', total: o.total, daten: o.daten }
    })(),
    // 4. Badezimmer (Privat) -> Abgelehnt
    (function(){
      const bloecke = [{ titel: "Sanierung", positionen: [ { ...leistungenKatalog.schimmel, menge: 1 } ] }]
      const o = getOffertenDaten('Offerte Schimmelbehandlung Bad', 
        "Guten Tag Herr Weber,\n\nGerne unterbreite ich Ihnen die Offerte zur Schimmelbehandlung.",
        "Freundliche Grüsse",
        bloecke, 0, 8.1, "Zahlbar innert 10 Tagen netto.")
      return { kunden_id: createdKunden[6].id, projekt_id: createdProjekte[9].id, offerte_nr: generateId('OFF', 4), status: 'Abgelehnt', total: o.total, daten: o.daten }
    })(),
    // 5. Ferienwohnung (Privat) -> Entwurf
    (function(){
      const bloecke = [{ titel: "Gesamt", positionen: [ { ...leistungenKatalog.streichen_dispersion, menge: 350 } ] }]
      const o = getOffertenDaten('Offerte Ferienwohnung', 
        "Sehr geehrter Herr Zurfluh,\n\nHier ein erster Entwurf für Ihre Ferienwohnung.",
        "", bloecke, 0, 8.1, "Zahlbar innert 10 Tagen.")
      return { kunden_id: createdKunden[9].id, projekt_id: createdProjekte[12].id, offerte_nr: generateId('OFF', 5), status: 'Entwurf', total: o.total, daten: o.daten }
    })()
  ]

  console.log('Erstelle Offerten...')
  const { data: createdOfferten, error: offertenError } = await supabase.from('offerten').insert(offertenData).select()
  if (offertenError) throw offertenError

  // Helper zum Erstellen von Rechnungs-Daten
  const getRechnungsDaten = (titel, einleitung, schluss, bloecke, typ, akontoProzent, mwst, konditionen) => {
    let sum = 0;
    bloecke.forEach(b => { b.positionen.forEach(p => { sum += p.menge * p.preis; }) })
    const flatLeistungen = bloecke.flatMap(b => b.positionen || [])
    return {
      total: sum,
      daten: {
        titel, typ, akonto_prozent: akontoProzent, einleitungstext: einleitung, schlusstext: schluss,
        bloecke, leistungen: flatLeistungen, // THIS WAS MISSING
        konditionen, mwst
      }
    }
  }

  // ==========================================
  // 4. RECHNUNGEN
  // ==========================================
  const rechnungenData = [
    // 1. Akontorechnung für Fassadensanierung (Wincasa) -> Bezahlt
    (function(){
      const off = createdOfferten[0];
      const r = getRechnungsDaten('1. Akontorechnung Fassadensanierung (30%)',
        "Sehr geehrte Damen und Herren,\n\nFür die gestellte Fassade erlauben wir uns vertragsgemäss 30% Akonto in Rechnung zu stellen.",
        "Besten Dank für die pünktliche Überweisung.",
        [{ titel: "Akonto", positionen: [{ titel: "1. Akontozahlung (30%)", beschreibung: "Gemäss Offerte " + off.offerte_nr, menge: 1, einheit: "Pausch.", preis: off.total * 0.3 }] }],
        'akonto', 30, 8.1, "Zahlbar innert 30 Tagen netto."
      )
      return { kunden_id: off.kunden_id, projekt_id: off.projekt_id, offerte_id: off.id, rechnung_nr: generateId('RE', 1), status: 'Bezahlt', total: r.total, typ: 'akonto', akonto_prozent: 30, rechnungsdatum: pastDate(40), faellig_am: pastDate(10), bezahlt_am: pastDate(5), zahlungsfrist_tage: 30, daten: r.daten }
    })(),
    // 2. Schlussrechnung Wohnungssanierung (Livit) -> Gestellt
    (function(){
      const off = createdOfferten[1];
      const r = getRechnungsDaten('Schlussrechnung Sanierung 3. OG',
        "Guten Tag,\n\nDie Arbeiten im 3. OG wurden erfolgreich abgeschlossen. Gerne stellen wir Ihnen folgende Arbeiten in Rechnung:",
        "Vielen Dank für den Auftrag.", off.daten.bloecke, 'gesamt', null, 8.1, "Zahlbar innert 30 Tagen netto.")
      return { kunden_id: off.kunden_id, projekt_id: off.projekt_id, offerte_id: off.id, rechnung_nr: generateId('RE', 2), status: 'Gestellt', total: off.total, typ: 'gesamt', akonto_prozent: null, rechnungsdatum: pastDate(5), faellig_am: futureDate(25), zahlungsfrist_tage: 30, daten: r.daten }
    })(),
    // 3. Regierechnung für Treppenhaus Livit -> Überfällig
    (function(){
      const r = getRechnungsDaten('Regiearbeiten Treppenhaus Weissenstein',
        "Sehr geehrte Damen und Herren,\n\nFür die zusätzlich rapportierten Regiearbeiten im Treppenhaus berechnen wir:",
        "Beiliegend finden Sie die unterschriebenen Regierapporte.",
        [{ titel: "Regie", positionen: [{ ...leistungenKatalog.regie_maler, menge: 4 }] }],
        'gesamt', null, 8.1, "Zahlbar innert 30 Tagen netto.")
      return { kunden_id: createdKunden[0].id, projekt_id: createdProjekte[1].id, offerte_id: null, rechnung_nr: generateId('RE', 3), status: 'Überfällig', total: r.total, typ: 'gesamt', akonto_prozent: null, rechnungsdatum: pastDate(45), faellig_am: pastDate(15), zahlungsfrist_tage: 30, daten: r.daten }
    })(),
    // 4. Bäckerei Hug - Direktrechnung -> Bezahlt
    (function(){
      const r = getRechnungsDaten('Schlussrechnung Renovation Laden',
        "Grüezi Herr Hug,\n\nDer Laden erstrahlt im neuen Glanz! Hier die Rechnung für die ausgeführten Arbeiten (Nachteinsatz).",
        "Herzlichen Dank für den tollen Auftrag und die Gipfeli!",
        [{ titel: "Ladenfläche", positionen: [{ ...leistungenKatalog.abdecken, menge: 1 }, { ...leistungenKatalog.streichen_dispersion, menge: 120 }] }],
        'gesamt', null, 8.1, "Zahlbar innert 10 Tagen netto.")
      return { kunden_id: createdKunden[4].id, projekt_id: createdProjekte[7].id, offerte_id: null, rechnung_nr: generateId('RE', 4), status: 'Bezahlt', total: r.total, typ: 'gesamt', akonto_prozent: null, rechnungsdatum: pastDate(20), faellig_am: pastDate(10), bezahlt_am: pastDate(11), zahlungsfrist_tage: 10, daten: r.daten }
    })(),
    // 5. Kinderzimmer Privat -> Entwurf
    (function(){
      const r = getRechnungsDaten('Malerarbeiten Kinderzimmer',
        "Liebe Frau Meier,\n\nIch hoffe das Rosa gefällt der kleinen Tochter. Anbei meine Rechnung.",
        "Liebe Grüsse\nLeandro",
        [{ titel: "Arbeiten", positionen: [{ titel: "Wände streichen (Rosa)", beschreibung: "Farbton NCS S 1020-R10B", einheit: "Pausch.", menge: 1, preis: 450 }] }],
        'gesamt', null, 0, "Bitte innert 10 Tagen überweisen.")
      return { kunden_id: createdKunden[7].id, projekt_id: createdProjekte[10].id, offerte_id: null, rechnung_nr: generateId('RE', 5), status: 'Entwurf', total: r.total, typ: 'gesamt', akonto_prozent: null, rechnungsdatum: pastDate(0), faellig_am: futureDate(10), zahlungsfrist_tage: 10, daten: r.daten }
    })()
  ]

  console.log('Erstelle Rechnungen...')
  const { data: createdRechnungen, error: rechnungenError } = await supabase.from('rechnungen').insert(rechnungenData).select()
  if (rechnungenError) throw rechnungenError

  console.log('✅ Seed erfolgreich abgeschlossen!')
  console.log(`Erstellt: ${createdKunden.length} Kunden, ${createdProjekte.length} Projekte, ${createdOfferten.length} Offerten, ${createdRechnungen.length} Rechnungen.`)
}

seed().catch(err => console.error(err))
