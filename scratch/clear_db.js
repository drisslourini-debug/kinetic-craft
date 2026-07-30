import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fpfdlraqtqtcnmajrcyx.supabase.co'
const supabaseKey = 'sb_publishable_brOU6y2FDiFiZq9fhOYHGA_xYnC5yQN'
const supabase = createClient(supabaseUrl, supabaseKey)

async function clearDb() {
  await supabase.auth.signInWithPassword({
    email: 'lourinidriss@gmail.com',
    password: 'Test1234'
  })
  
  console.log('Clearing DB...')
  await supabase.from('rechnungen').delete().not('id', 'is', null)
  await supabase.from('offerten').delete().not('id', 'is', null)
  await supabase.from('projekte').delete().not('id', 'is', null)
  await supabase.from('kunden').delete().not('id', 'is', null)
  console.log('Done clearing.')
}
clearDb()
