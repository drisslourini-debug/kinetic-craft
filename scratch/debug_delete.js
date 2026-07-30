import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fpfdlraqtqtcnmajrcyx.supabase.co'
const supabaseKey = 'sb_publishable_brOU6y2FDiFiZq9fhOYHGA_xYnC5yQN'
const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'lourinidriss@gmail.com',
    password: 'Test1234'
  })
  if (authError) { console.error('Login failed:', authError.message); return }

  // Check if RLS is filtering delete results
  const { data: kSample, error: kE } = await supabase.from('kunden').select('id').limit(5)
  console.log('Sample kunden IDs:', kSample?.map(k => k.id), 'error:', kE?.message)
  
  // Try to delete one specific record
  const firstId = kSample?.[0]?.id
  if (firstId) {
    const { error: delErr } = await supabase.from('kunden').delete().eq('id', firstId)
    console.log('Delete kunden id', firstId, 'error:', delErr?.message ?? 'success')
  }
  
  // Try broader range
  const { data: kAll } = await supabase.from('kunden').select('id')
  console.log('Total visible kunden after delete attempt:', kAll?.length)
}

debug()
