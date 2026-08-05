import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fpfdlraqtqtcnmajrcyx.supabase.co'
const supabaseKey = 'sb_publishable_brOU6y2FDiFiZq9fhOYHGA_xYnC5yQN'
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  // We can just insert a draft invoice and then read it to get the schema, and delete it.
  const { data: insertData, error: insertError } = await supabase.from('rechnungen').insert([{
    kunden_id: null,
    typ: 'test',
    status: 'Entwurf'
  }]).select()
  
  if (insertError) {
    console.log('Insert Error:', insertError)
  } else if (insertData && insertData.length > 0) {
    console.log('Columns:', Object.keys(insertData[0]))
    await supabase.from('rechnungen').delete().eq('id', insertData[0].id)
  }
}

test()
