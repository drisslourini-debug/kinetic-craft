import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fpfdlraqtqtcnmajrcyx.supabase.co'
const supabaseKey = 'sb_publishable_brOU6y2FDiFiZq9fhOYHGA_xYnC5yQN'
const supabase = createClient(supabaseUrl, supabaseKey)

async function testRLS() {
  // Try inserting with created_at
  const res1 = await supabase.from('rechnungen').insert({
    rechnung_nr: 'TEST-1',
    total: 100,
    created_at: '2026-05-01T10:00:00Z'
  }).select()
  console.log('With created_at:', res1.error ? res1.error.message : 'Success')
  
  // Try inserting without created_at
  const res2 = await supabase.from('rechnungen').insert({
    rechnung_nr: 'TEST-2',
    total: 100
  }).select()
  console.log('Without created_at:', res2.error ? res2.error.message : 'Success')
}

testRLS()
