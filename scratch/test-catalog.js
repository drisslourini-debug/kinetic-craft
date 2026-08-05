import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fpfdlraqtqtcnmajrcyx.supabase.co'
const supabaseKey = 'sb_publishable_brOU6y2FDiFiZq9fhOYHGA_xYnC5yQN'
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data: kategorien, error: err1 } = await supabase.from('katalog_kategorien').select('*').order('sort_order', { ascending: true })
  const { data: leistungen, error: err2 } = await supabase.from('katalog_leistungen').select('*').order('sort_order', { ascending: true })
  
  console.log('Kategorien Error:', err1)
  console.log('Kategorien Count:', kategorien?.length)
  
  console.log('Leistungen Error:', err2)
  console.log('Leistungen Count:', leistungen?.length)
  
  if (kategorien && leistungen) {
    const newCatalog = {}
    kategorien.forEach(k => {
      const catLeistungen = leistungen.filter(l => l.kategorie_id === k.id && !l.is_archived)
      newCatalog[k.name] = catLeistungen.map(l => ({
        titel: l.beschreibung,
        einheit: l.einheit || 'Pauschal',
        preis: parseFloat(l.einzelpreis) || 0
      }))
    })
    console.log('Catalog Categories:', Object.keys(newCatalog))
    console.log('Total Items in catalog:', Object.values(newCatalog).reduce((acc, arr) => acc + arr.length, 0))
  }
}

test()
