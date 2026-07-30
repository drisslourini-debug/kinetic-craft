import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fpfdlraqtqtcnmajrcyx.supabase.co'
const supabaseKey = 'sb_publishable_brOU6y2FDiFiZq9fhOYHGA_xYnC5yQN'
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  await supabase.auth.signInWithPassword({
    email: 'lourinidriss@gmail.com',
    password: 'Test1234'
  })
  const { data: o } = await supabase.from('offerten').select('id, offerte_nr')
  console.log('Total offerten in DB:', o?.length)
  
  const { data: r } = await supabase.from('rechnungen').select('id, rechnung_nr')
  console.log('Total rechnungen in DB:', r?.length)
}
check()
