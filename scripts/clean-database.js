import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fpfdlraqtqtcnmajrcyx.supabase.co'
const supabaseKey = 'sb_publishable_brOU6y2FDiFiZq9fhOYHGA_xYnC5yQN'
const supabase = createClient(supabaseUrl, supabaseKey)

async function clean() {
  console.log('Logge ein...')
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: 'lourinidriss@gmail.com',
    password: 'Test1234'
  })
  if (authError) throw authError

  const tables = ['rechnungen', 'offerten', 'projekte', 'kunden']

  for (const table of tables) {
    console.log(`Lade alle IDs für Tabelle: ${table}`)
    let hasMore = true
    let page = 0
    while (hasMore) {
      const { data, error } = await supabase.from(table).select('id').range(page * 1000, (page + 1) * 1000 - 1)
      if (error) throw error
      
      if (data.length === 0) {
        hasMore = false
        break
      }
      
      console.log(`Lösche ${data.length} Einträge in ${table}...`)
      const ids = data.map(d => d.id)
      const { error: delError } = await supabase.from(table).delete().in('id', ids)
      if (delError) {
        console.error(`Fehler beim Löschen in ${table}:`, delError.message)
      } else {
        console.log(`Erfolgreich ${data.length} gelöscht.`)
      }
    }
  }

  console.log('Überprüfe, ob die Tabellen leer sind...')
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
    console.log(`${table}: ${count} verbleibend`)
  }
}

clean().catch(console.error)
