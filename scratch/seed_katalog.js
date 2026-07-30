import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fpfdlraqtqtcnmajrcyx.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZmRscmFxdHF0Y25tYWpyY3l4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzOTk5MywiZXhwIjoyMTAwMTE1OTkzfQ.8S8CiMvOFosImncenIptaaPBSNJmEfJ6YmC9XbLG7wA'
const supabase = createClient(supabaseUrl, serviceKey)

const KATALOG = [
  {
    name: 'Malerarbeiten (Innen)',
    sort_order: 1,
    leistungen: [
      { beschreibung: 'Abdecken und Schützen (Böden, Treppen, Möbel)',         einheit: 'm²',     einzelpreis: 5.00  },
      { beschreibung: 'Wände streichen (Dispersion, 2x Anstrich, Standardweiss)', einheit: 'm²',  einzelpreis: 23.50 },
      { beschreibung: 'Decke streichen (Dispersion, 2x Anstrich, Standardweiss)', einheit: 'm²',  einzelpreis: 26.00 },
      { beschreibung: 'Wände streichen farbig (Aufpreis für Bunttöne)',         einheit: 'm²',     einzelpreis: 8.50  },
      { beschreibung: 'Türen und Zargen lackieren (Holz/Metall, inkl. Schleifen)', einheit: 'Stk', einzelpreis: 185.00},
      { beschreibung: 'Fensterrahmen lackieren (innen, Holz)',                  einheit: 'lfm',    einzelpreis: 25.00 },
      { beschreibung: 'Heizkörper lackieren (Rippen- oder Plattenheizkörper)', einheit: 'Stk',    einzelpreis: 85.00 },
      { beschreibung: 'Tiefengrund / Voranstrich auftragen (saugende Untergründe)', einheit: 'm²', einzelpreis: 6.50  },
      { beschreibung: 'Fugen erneuern (Silikon oder Acryl ziehen)',             einheit: 'lfm',    einzelpreis: 12.00 },
      { beschreibung: 'Nikotinsperre / Isolierfarbe auftragen',                 einheit: 'm²',     einzelpreis: 18.00 },
    ]
  },
  {
    name: 'Gipserarbeiten',
    sort_order: 2,
    leistungen: [
      { beschreibung: 'Weissputz / Glattstrich (Wände und Decken glätten, Q3)', einheit: 'm²',   einzelpreis: 35.00 },
      { beschreibung: 'Grundputz auf Mauerwerk (z.B. Zement- oder Kalkputz)',  einheit: 'm²',     einzelpreis: 45.00 },
      { beschreibung: 'Vollabrieb auftragen (z.B. 1.5mm Körnung)',              einheit: 'm²',     einzelpreis: 38.00 },
      { beschreibung: 'Trockenbauwand stellen (Gipskarton, 1-fach beplankt, inkl. Dämmung)', einheit: 'm²', einzelpreis: 85.00 },
      { beschreibung: 'Trockenbaudecke abhängen (inkl. Unterkonstruktion)',     einheit: 'm²',     einzelpreis: 95.00 },
      { beschreibung: 'Risssanierung (inkl. Netzeinbettung / Rissband)',        einheit: 'lfm',    einzelpreis: 35.00 },
      { beschreibung: 'Eckschutzschienen setzen',                               einheit: 'lfm',    einzelpreis: 18.00 },
      { beschreibung: 'Leibungen spachteln und schleifen (Fenster/Türen)',      einheit: 'lfm',    einzelpreis: 22.00 },
    ]
  },
  {
    name: 'Fassadenarbeiten',
    sort_order: 3,
    leistungen: [
      { beschreibung: 'Fassade Hochdruckreinigen (inkl. Algen-/Fungizidbehandlung)', einheit: 'm²', einzelpreis: 12.00 },
      { beschreibung: 'Fassade streichen (Silikonharz/Mineralfarbe, 2x Anstrich)', einheit: 'm²',  einzelpreis: 38.00 },
      { beschreibung: 'Fassadensockel streichen (wasserabweisend/Zementsockel)', einheit: 'm²',    einzelpreis: 45.00 },
      { beschreibung: 'Holzwerk aussen schleifen & streichen (Dachuntersicht/Balkon)', einheit: 'm²', einzelpreis: 32.00 },
      { beschreibung: 'Netzeinbettung vollflächig (Gewebe in Spachtelmasse einlegen)', einheit: 'm²', einzelpreis: 65.00 },
      { beschreibung: 'Gerüstbau (Fassadengerüst inkl. Auf- und Abbau, Miete bis 4 Wochen)', einheit: 'm²', einzelpreis: 18.00 },
      { beschreibung: 'Riss- und Fugensanierung (Fassade aussen)',              einheit: 'lfm',    einzelpreis: 25.00 },
    ]
  },
  {
    name: 'Spezialgebiete & Kreatives',
    sort_order: 4,
    leistungen: [
      { beschreibung: 'Stucco Veneziano / Spachteltechnik (exkl. Material)',    einheit: 'm²',     einzelpreis: 140.00 },
      { beschreibung: 'Betonoptik / Sichtbeton-Imitation (Wandgestaltung)',     einheit: 'm²',     einzelpreis: 110.00 },
      { beschreibung: 'Tapeten entfernen (inkl. Entsorgung)',                   einheit: 'm²',     einzelpreis: 15.00  },
      { beschreibung: 'Vliestapete / Fototapete anbringen (Wandtapezierung)',   einheit: 'm²',     einzelpreis: 45.00  },
      { beschreibung: 'Schimmelbehandlung (mechanische Reinigung & Spezialfarbe)', einheit: 'm²',  einzelpreis: 55.00  },
      { beschreibung: 'Magnet- oder Whiteboardfarbe auftragen (mehrere Schichten)', einheit: 'm²', einzelpreis: 65.00  },
      { beschreibung: 'Abrieb/Putz streichen (Mineralfarbe)',                   einheit: 'm²',     einzelpreis: 78.00  },
    ]
  },
  {
    name: 'Regietarife',
    sort_order: 5,
    leistungen: [
      { beschreibung: 'Vorarbeiter / Eidg. dipl. Malermeister',                 einheit: 'h',      einzelpreis: 95.00 },
      { beschreibung: 'Kundenmaler / Facharbeiter / Gipser',                    einheit: 'h',      einzelpreis: 85.00 },
      { beschreibung: 'Malerassistent / Hilfsarbeiter',                         einheit: 'h',      einzelpreis: 65.00 },
      { beschreibung: 'Lernender',                                               einheit: 'h',      einzelpreis: 45.00 },
      { beschreibung: 'Fahrzeugpauschale (Service-Wagen, pro Tag/Einsatz)',     einheit: 'Pausch.', einzelpreis: 35.00 },
    ]
  },
  {
    name: 'Diverses',
    sort_order: 6,
    leistungen: [
      { beschreibung: 'Maschinenmiete (Rollgerüst / Hebebühne, pro Tag)',       einheit: 'Tag',    einzelpreis: 150.00 },
      { beschreibung: 'Entsorgungspauschale (Sondermüll, Farbreste, Bauschutt)', einheit: 'Pausch.', einzelpreis: 45.00 },
      { beschreibung: 'Farbkonzept & Bemusterung (Vor-Ort-Beratung inkl. Musterplatten)', einheit: 'Pausch.', einzelpreis: 150.00 },
      { beschreibung: 'Endreinigung (Baustelle besenrein übergeben)',           einheit: 'h',      einzelpreis: 65.00 },
    ]
  },
  {
    name: 'Material & Verbrauchsstoffe',
    sort_order: 7,
    leistungen: [
      { beschreibung: 'Dispersion weiss (Innenfarbe, Standard)',                einheit: 'kg/l',   einzelpreis: 8.50  },
      { beschreibung: 'Fassadenfarbe (Silikonharz, witterungsbeständig)',       einheit: 'kg/l',   einzelpreis: 14.50 },
      { beschreibung: 'Tiefengrund / Voranstrich (saugende Untergründe)',       einheit: 'l',      einzelpreis: 9.00  },
      { beschreibung: 'Buntlack / Acryllack (für Holz- und Metallwerk)',        einheit: 'kg',     einzelpreis: 22.00 },
      { beschreibung: 'Spachtelmasse / Gips (Sackware, für Ausbesserungen)',    einheit: 'kg',     einzelpreis: 2.50  },
      { beschreibung: 'Abdeckvlies / Malerfilz (Bodenschutz)',                  einheit: 'lfm',    einzelpreis: 1.80  },
      { beschreibung: 'Klebeband / Maskingtape',                                einheit: 'Rolle',  einzelpreis: 4.50  },
      { beschreibung: 'Materialpauschale Kleinmaterial (Schleifpapier, Klingen, Pinsel)', einheit: 'Pausch.', einzelpreis: 45.00 },
      { beschreibung: 'Materialpauschale Prozentual (5% Zuschlag auf Regiestunden)', einheit: '%', einzelpreis: 5.00  },
    ]
  },
  {
    name: 'Zuschläge & Erschwernis',
    sort_order: 8,
    leistungen: [
      { beschreibung: 'Überzeitzuschlag / Samstagsarbeit (auf Stundenansatz)', einheit: '%',      einzelpreis: 25.00  },
      { beschreibung: 'Nacht- / Sonntagszuschlag',                             einheit: '%',      einzelpreis: 50.00  },
      { beschreibung: 'Erschwerniszuschlag (Überkopf, Treppenhaus, enge Platzverhältnisse)', einheit: 'h', einzelpreis: 15.00 },
      { beschreibung: 'Schmutz- / Geruchszuschlag (Raucherwohnung, Wasserschaden)', einheit: 'Pausch.', einzelpreis: 150.00 },
      { beschreibung: 'Express-Zuschlag (Garantierte Ausführung innert 24h)',  einheit: 'Pausch.', einzelpreis: 250.00 },
    ]
  },
]

async function seedKatalog() {
  console.log('📚 Seeding Leistungskatalog...')

  // 1. Löschen (Leistungen cascaden automatisch)
  console.log('🗑️ Lösche alten Katalog...')
  await supabase.from('katalog_leistungen').delete().not('id', 'is', null)
  await supabase.from('katalog_kategorien').delete().not('id', 'is', null)
  console.log('✅ Alter Katalog gelöscht.')

  let totalLeistungen = 0

  for (const kat of KATALOG) {
    // 2. Kategorie anlegen
    const { data: katData, error: katErr } = await supabase
      .from('katalog_kategorien')
      .insert({ name: kat.name, sort_order: kat.sort_order })
      .select().single()

    if (katErr) { console.error('Kategorie Fehler:', katErr.message); continue }
    console.log(`  ✅ Kategorie: ${kat.name} (ID: ${katData.id})`)

    // 3. Leistungen anlegen
    const leistungenRows = kat.leistungen.map((l, idx) => ({
      kategorie_id: katData.id,
      beschreibung: l.beschreibung,
      einheit: l.einheit,
      einzelpreis: l.einzelpreis,
      preis_arbeit: l.einzelpreis,
      preis_material: 0,
      sort_order: idx + 1,
      is_archived: false
    }))

    const { data: lData, error: lErr } = await supabase
      .from('katalog_leistungen')
      .insert(leistungenRows)
      .select()

    if (lErr) { console.error('Leistungen Fehler:', lErr.message); continue }
    totalLeistungen += lData.length
    console.log(`     → ${lData.length} Leistungen eingefügt`)
  }

  console.log('')
  console.log(`🎉 Katalog komplett: ${KATALOG.length} Kategorien, ${totalLeistungen} Leistungen`)
}

seedKatalog()
