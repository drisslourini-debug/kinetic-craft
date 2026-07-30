import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fpfdlraqtqtcnmajrcyx.supabase.co'
const supabaseKey = 'sb_publishable_brOU6y2FDiFiZq9fhOYHGA_xYnC5yQN'
const supabase = createClient(supabaseUrl, supabaseKey)

async function inspect() {
  const tables = ['kunden', 'projekte', 'offerten', 'rechnungen', 'katalog_kategorien', 'katalog_leistungen', 'einstellungen']
  const schema = {}
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1)
    if (error) {
      console.log(`Table ${table} error:`, error.message)
    } else {
      schema[table] = data && data.length > 0 ? Object.keys(data[0]) : 'Empty table, unknown schema'
    }
  }
  
  console.log(JSON.stringify(schema, null, 2))
}

inspect()
