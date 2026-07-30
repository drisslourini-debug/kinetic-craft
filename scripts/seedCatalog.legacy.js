import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// Get env variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: resolve(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const DEFAULT_CATALOG = {
  Malerarbeiten: [
    { titel: 'Wände streichen (Dispersion, 2x Anstrich)', einheit: 'm²', preis: 22.50 },
    { titel: 'Decke streichen (Dispersion, 2x Anstrich)', einheit: 'm²', preis: 26.00 },
    { titel: 'Türen und Zargen lackieren', einheit: 'Stk', preis: 185.00 },
    { titel: 'Abrieb/Putz streichen (Mineralfarbe)', einheit: 'm²', preis: 28.00 },
    { titel: 'Holzwerk aussen (Dachuntersicht) schleifen & streichen', einheit: 'm²', preis: 32.00 }
  ],
  Gipserarbeiten: [
    { titel: 'Weissputz aufziehen (Qualität Q3)', einheit: 'm²', preis: 38.00 },
    { titel: 'Risssanierung inkl. Netzeinbettung', einheit: 'lfm', preis: 18.50 },
    { titel: 'Eckschutzschienen setzen', einheit: 'lfm', preis: 14.00 },
    { titel: 'Grundputz auf Mauerwerk', einheit: 'm²', preis: 45.00 },
    { titel: 'Leibungen spachteln und schleifen', einheit: 'lfm', preis: 22.00 }
  ],
  Fassadenarbeiten: [
    { titel: 'Fassade Hochdruckreinigen (inkl. Fungizid)', einheit: 'm²', preis: 8.50 },
    { titel: 'Fassadenanstrich (Silikonharz, 2x)', einheit: 'm²', preis: 42.00 },
    { titel: 'Fassadenrisse sanieren', einheit: 'lfm', preis: 22.00 },
    { titel: 'Gerüstbau (Richtpreis/Pauschal)', einheit: 'Pauschal', preis: 2500.00 }
  ],
  'Spezialgebiete & Kreatives': [
    { titel: 'Graffitientfernung', einheit: 'm²', preis: 55.00 },
    { titel: 'Schimmelentfernung und Sanierung', einheit: 'm²', preis: 65.00 },
    { titel: 'Industriebodenbeschichtung (Epoxid)', einheit: 'm²', preis: 75.00 },
    { titel: 'Dekorative Spachteltechnik (z.B. Stucco)', einheit: 'm²', preis: 140.00 },
    { titel: 'Strassen- / Parkplatzmarkierungen', einheit: 'lfm', preis: 15.00 },
    { titel: 'Farbberatung vor Ort', einheit: 'Pauschal', preis: 150.00 }
  ],
  Regietarife: [
    { titel: 'Facharbeiter (Maler/Gipser)', einheit: 'Std', preis: 85.00 },
    { titel: 'Hilfskraft / Lehrling', einheit: 'Std', preis: 55.00 },
    { titel: 'Anfahrt / Fahrzeugspesen', einheit: 'Pauschal', preis: 120.00 }
  ],
  Diverses: [
    { titel: 'Allgemeine Abdeckarbeiten (Floorliner, Folie)', einheit: 'Pauschal', preis: 250.00 },
    { titel: 'Umgebung schützen & abdecken', einheit: 'Pauschal', preis: 180.00 },
    { titel: 'Entsorgung (Material und Gebühren)', einheit: 'Pauschal', preis: 150.00 }
  ]
}

async function seed() {
  console.log('Clearing existing catalog data...')
  await supabase.from('katalog_leistungen').delete().neq('id', 0)
  await supabase.from('katalog_kategorien').delete().neq('id', 0)

  console.log('Seeding catalog...')
  let order = 1
  for (const [catName, leistungen] of Object.entries(DEFAULT_CATALOG)) {
    console.log(`Inserting category: ${catName}`)
    // Insert category
    const { data: catData, error: catError } = await supabase
      .from('katalog_kategorien')
      .insert([{ name: catName, sort_order: order++ }])
      .select()

    if (catError) {
      console.error('Error inserting category', catError)
      continue
    }

    const catId = catData[0].id
    let posOrder = 1
    
    // Insert leistungen
    const leistungenToInsert = leistungen.map(l => ({
      kategorie_id: catId,
      beschreibung: l.titel,
      einheit: l.einheit,
      einzelpreis: l.preis,
      preis_material: 0,
      preis_arbeit: l.preis,
      sort_order: posOrder++
    }))

    const { error: posError } = await supabase
      .from('katalog_leistungen')
      .insert(leistungenToInsert)

    if (posError) {
      console.error(`Error inserting leistungen for ${catName}`, posError)
    } else {
      console.log(`Successfully seeded ${leistungen.length} positions for ${catName}`)
    }
  }
  
  console.log('Done.')
}

seed()
