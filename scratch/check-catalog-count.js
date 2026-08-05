import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fpfdlraqtqtcnmajrcyx.supabase.co'
const supabaseKey = 'sb_publishable_brOU6y2FDiFiZq9fhOYHGA_xYnC5yQN'
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { count: catCount } = await supabase.from('katalog_kategorien').select('*', { count: 'exact', head: true })
  const { count: leisCount } = await supabase.from('katalog_leistungen').select('*', { count: 'exact', head: true })
  
  console.log(`Kategorien: ${catCount}`)
  console.log(`Leistungen: ${leisCount}`)
}

check()
