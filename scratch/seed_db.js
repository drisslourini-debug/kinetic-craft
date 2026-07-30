import { createClient } from '@supabase/supabase-js'
import { fakerDE_CH as faker } from '@faker-js/faker'

const supabaseUrl = 'https://fpfdlraqtqtcnmajrcyx.supabase.co'
// Service role key — bypasses RLS for seeding
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZmRscmFxdHF0Y25tYWpyY3l4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzOTk5MywiZXhwIjoyMTAwMTE1OTkzfQ.8S8CiMvOFosImncenIptaaPBSNJmEfJ6YmC9XbLG7wA'
const supabase = createClient(supabaseUrl, supabaseKey)

const START_DATE = new Date('2026-01-01T00:00:00Z')
const END_DATE = new Date('2026-07-28T23:59:59Z')

const KUNDENTYPEN = ['Privatperson', 'Firma', 'Bewirtschaftung', 'Architekturbüro', 'Generalunternehmer']
const PROJEKT_KATEGORIEN = ['Umbau', 'Neubau', 'Sanierung', 'Reparatur', 'Wartung', 'Beratung']
const PROJEKT_STATUS = ['Aktiv', 'In Arbeit', 'Abgeschlossen']
const OFFERTE_STATUS = ['Entwurf', 'Versendet', 'Akzeptiert', 'Abgelehnt']
const RECHNUNG_STATUS = ['Entwurf', 'Versendet', 'Bezahlt', 'Überfällig']
const ZAHLUNGSZIELE = ['10 Tage netto', '14 Tage netto', '30 Tage netto']

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

async function seed() {
  console.log('🌱 Starting Database Seeding...')
  
  // 1. Delete all existing data
  console.log('🗑️ Deleting old data (rechnungen, offerten, projekte, kunden)...')
  
  // Break circular FK first
  await supabase.from('offerten').update({ rechnung_id: null }).not('id', 'is', null)
  await supabase.from('rechnungen').delete().not('id', 'is', null)
  await supabase.from('offerten').delete().not('id', 'is', null)
  await supabase.from('projekte').delete().not('id', 'is', null)
  await supabase.from('kunden').delete().not('id', 'is', null)
  
  console.log('✅ Old data deleted.')
  
  // 2. Fetch Catalog — only active items with valid Preise
  console.log('📦 Fetching katalog_leistungen...')
  const { data: katalogRaw } = await supabase
    .from('katalog_leistungen')
    .select('id, beschreibung, einheit, einzelpreis, kategorie_id')
    .eq('is_archived', false)
    .gt('einzelpreis', 0)
  
  if (!katalogRaw || katalogRaw.length === 0) {
    console.error('❌ Kein aktiver Katalog gefunden. Bitte zuerst seed_katalog.js ausführen.')
    return
  }
  const katalog = katalogRaw
  console.log(`✅ ${katalog.length} aktive Leistungen aus Katalog geladen.`)
  
  // 3. Generate 50 Kunden
  console.log('👥 Generating 50 Kunden...')
  const kundenToInsert = []
  
  for (let i = 0; i < 50; i++) {
    const typ = faker.helpers.arrayElement(KUNDENTYPEN)
    
    let firmenname = ''
    let vorname = ''
    let nachname = ''
    let name = ''
    
    if (typ === 'Privatperson') {
      vorname = faker.person.firstName()
      nachname = faker.person.lastName()
      name = `${vorname} ${nachname}`
    } else {
      firmenname = faker.company.name()
      if (typ === 'Architekturbüro' && !firmenname.toLowerCase().includes('architektur')) firmenname += ' Architekturbüro'
      if (typ === 'Generalunternehmer' && !firmenname.toLowerCase().includes('ag') && !firmenname.toLowerCase().includes('gmbh')) firmenname += ' GU AG'
      
      name = firmenname
      // Sometimes they have a contact person
      if (Math.random() > 0.5) {
        vorname = faker.person.firstName()
        nachname = faker.person.lastName()
      }
    }
    
    kundenToInsert.push({
      typ,
      name,
      firmenname,
      vorname,
      nachname,
      ort: faker.location.city(),
      strasse: faker.location.streetAddress(),
      plz: faker.location.zipCode('####'), // Swiss zip codes are 4 digits
      telefon: faker.phone.number(),
      email: faker.internet.email({ firstName: vorname || 'info', lastName: nachname || name }),
      zahlungsziel: faker.helpers.arrayElement(ZAHLUNGSZIELE),
      website: (typ !== 'Privatperson' && Math.random() > 0.5) ? faker.internet.url() : '',
      status: 'Aktiv',
      notizen: Math.random() > 0.7 ? faker.lorem.sentence() : '',
      created_at: randomDate(START_DATE, new Date('2026-03-01')).toISOString()
    })
  }
  
  const { data: insertedKunden, error: kundenErr } = await supabase.from('kunden').insert(kundenToInsert).select()
  if (kundenErr) {
    console.error('❌ Error inserting kunden:', kundenErr)
    return
  }
  console.log(`✅ ${insertedKunden.length} Kunden created.`)
  
  // 4. Generate Projekte, Offerten, Rechnungen
  console.log('🏗️ Generating Projekte, Offerten, Rechnungen...')
  
  let totalProjekte = 0
  let totalOfferten = 0
  let totalRechnungen = 0
  
  for (const kunde of insertedKunden) {
    const numProjekte = faker.number.int({ min: 1, max: 10 })
    
    for (let p = 0; p < numProjekte; p++) {
      const pStart = randomDate(new Date(kunde.created_at), END_DATE)
      const pEnd = randomDate(pStart, END_DATE)
      const kategorie = faker.helpers.arrayElement(PROJEKT_KATEGORIEN)
      
      const { data: pData, error: pErr } = await supabase.from('projekte').insert({
        kunden_id: kunde.id,
        name: `${kategorie} ${faker.location.street()}`,
        adresse: `${faker.location.streetAddress()}, ${faker.location.zipCode('####')} ${faker.location.city()}`,
        kategorie,
        status: faker.helpers.arrayElement(PROJEKT_STATUS),
        startdatum: pStart.toISOString().split('T')[0],
        enddatum: (Math.random() > 0.5) ? pEnd.toISOString().split('T')[0] : null,
        notizen: Math.random() > 0.8 ? faker.lorem.sentences(2) : '',
        created_at: pStart.toISOString()
      }).select().single()
      
      if (pErr) { console.error('Project insert err:', pErr); continue; }
      totalProjekte++
      const projekt = pData
      
      // Generate 0-3 Offerten for this project
      const numOfferten = faker.number.int({ min: 0, max: 3 })
      for (let o = 0; o < numOfferten; o++) {
        const oDate = randomDate(pStart, pEnd)
        const oStatus = faker.helpers.arrayElement(OFFERTE_STATUS)
        
        // Generate positions
        const leistungen = []
        let rawTotal = 0
        const numItems = faker.number.int({ min: 2, max: 8 })
        
        for (let l = 0; l < numItems; l++) {
          // Always pick from catalog (guaranteed non-empty by check above)
          const item = faker.helpers.arrayElement(katalog)
          
          // Use realistic quantities based on unit
          let menge
          if (item.einheit === 'm²') menge = faker.number.int({ min: 5, max: 120 })
          else if (item.einheit === 'lfm') menge = faker.number.int({ min: 2, max: 40 })
          else if (item.einheit === 'Stk') menge = faker.number.int({ min: 1, max: 10 })
          else if (item.einheit === 'h') menge = faker.number.int({ min: 2, max: 24 })
          else menge = faker.number.int({ min: 1, max: 5 })
          
          const einzelpreis = parseFloat(item.einzelpreis)
          const itemTotal = Math.round(menge * einzelpreis * 100) / 100
          
          leistungen.push({
            id: faker.string.uuid(),
            beschreibung: item.beschreibung,
            menge: menge.toString(),
            einheit: item.einheit,
            einzelpreis: einzelpreis.toString(),
            total: itemTotal.toString(),
            typ: 'standard'
          })
          rawTotal += itemTotal
        }
        
        const rabatt = faker.helpers.arrayElement([0, 0, 0, 5, 10])
        const totalNachRabatt = rawTotal * (1 - rabatt / 100)
        const finalTotal = totalNachRabatt * 1.081 // 8.1% MWST
        
        const daten = {
          texte: {
            einleitungstext: "Gerne unterbreiten wir Ihnen folgendes Angebot basierend auf unserer Besprechung.",
            schlusstext: "Wir hoffen, dass unser Angebot Ihren Vorstellungen entspricht."
          },
          konditionen: {
            mwst: "8.1",
            rabatt: rabatt.toString()
          },
          leistungen: leistungen,
          offertendetails: {
            titel: `Offerte für ${projekt.name}`,
            datum: oDate.toISOString().split('T')[0]
          }
        }
        
        const { data: oData, error: oErr } = await supabase.from('offerten').insert({
          projekt_id: projekt.id,
          kunden_id: kunde.id,
          offerte_nr: `OFF-2026-${faker.string.uuid().substring(0, 6).toUpperCase()}`,
          total: finalTotal,
          status: oStatus,
          gueltig_bis: new Date(oDate.getTime() + 30*24*60*60*1000).toISOString().split('T')[0],
          created_at: oDate.toISOString(),
          daten
        }).select().single()
        
        if (oErr) { console.error('Offerte insert err:', oErr); continue; }
        totalOfferten++
        
        // If Offerte is accepted, maybe generate a Rechnung
        if (oStatus === 'Akzeptiert' && Math.random() > 0.2) {
          const rDate = randomDate(oDate, END_DATE)
          const rStatus = faker.helpers.arrayElement(RECHNUNG_STATUS)
          
          const rDaten = { ...daten }
          rDaten.rechnungsdetails = {
            typ: 'Gesamtrechnung',
            datum: rDate.toISOString().split('T')[0],
            zahlungsziel: kunde.zahlungsziel || '30 Tage netto'
          }
          rDaten.texte.einleitungstext = "Vielen Dank für den Auftrag. Wir stellen Ihnen folgende Leistungen in Rechnung:"
          rDaten.texte.schlusstext = "Bitte überweisen Sie den Betrag innert der angegebenen Frist."
          
          let zTage = 30
          if (kunde.zahlungsziel?.includes('10')) zTage = 10
          if (kunde.zahlungsziel?.includes('14')) zTage = 14
          
          const faelligDate = new Date(rDate)
          faelligDate.setDate(faelligDate.getDate() + zTage)

          const { data: rData, error: rErr } = await supabase.from('rechnungen').insert({
            projekt_id: projekt.id,
            kunden_id: kunde.id,
            offerte_id: oData.id,
            rechnung_nr: `RE-2026-${faker.string.uuid().substring(0, 6).toUpperCase()}`,
            total: finalTotal,
            status: rStatus,
            typ: 'gesamt',
            rechnungsdatum: rDate.toISOString().split('T')[0],
            zahlungsfrist_tage: zTage,
            faellig_am: faelligDate.toISOString().split('T')[0],
            created_at: rDate.toISOString(),
            daten: rDaten
          }).select().single()
          
          if (!rErr) {
             totalRechnungen++
             // Update offerte with rechnung_id
             await supabase.from('offerten').update({ rechnung_id: rData.id }).eq('id', oData.id)
          } else {
             console.error('Rechnung insert err:', rErr)
          }
        }
      }
    }
  }
  
  console.log(`✅ ${totalProjekte} Projekte created.`)
  console.log(`✅ ${totalOfferten} Offerten created.`)
  console.log(`✅ ${totalRechnungen} Rechnungen created.`)
  console.log('🎉 Seeding Complete!')
}

seed()
