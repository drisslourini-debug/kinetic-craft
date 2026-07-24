import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fpfdlraqtqtcnmajrcyx.supabase.co'
const supabaseKey = 'sb_publishable_brOU6y2FDiFiZq9fhOYHGA_xYnC5yQN'
const supabase = createClient(supabaseUrl, supabaseKey)

async function testWrite() {
  console.log('Testing Supabase write access...')
  // Try inserting
  const { data, error } = await supabase.from('kunden').insert([{
    name: 'TEST_DELETE_ME',
    typ: 'Privatperson'
  }]).select()
  
  if (error) {
    console.error('Insert error:', error.message)
    return
  }
  console.log('Insert success. ID:', data[0].id)
  
  // Try deleting
  const { error: delError } = await supabase.from('kunden').delete().eq('id', data[0].id)
  if (delError) {
    console.error('Delete error:', delError.message)
  } else {
    console.log('Delete success!')
  }
}

testWrite()
