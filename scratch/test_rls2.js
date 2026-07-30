import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fpfdlraqtqtcnmajrcyx.supabase.co'
const supabaseKey = 'sb_publishable_brOU6y2FDiFiZq9fhOYHGA_xYnC5yQN'
const supabase = createClient(supabaseUrl, supabaseKey)

async function testRLS() {
  await supabase.auth.signInWithPassword({
    email: 'lourinidriss@gmail.com',
    password: 'Test1234'
  })

  // Get a valid kunde and projekt
  const { data: kunde } = await supabase.from('kunden').select('id').limit(1).single()
  const { data: projekt } = await supabase.from('projekte').select('id').limit(1).single()
  const { data: offerte } = await supabase.from('offerten').select('id').limit(1).single()
  
  if (!kunde || !projekt) {
    console.log('No kunde or projekt found to test.')
    return
  }

  const payload = [{
    rechnung_nr: 'TEST-1000',
    kunden_id: kunde.id,
    projekt_id: projekt.id,
    offerte_id: offerte?.id || null,
    typ: 'gesamt',
    total: 100,
    daten: {},
    rechnungsdatum: '2026-05-01',
    zahlungsfrist_tage: 30,
    faellig_am: '2026-05-31',
    status: 'Entwurf'
  }]

  const res = await supabase.from('rechnungen').insert(payload).select()
  console.log('Result with ALL fields:', res.error ? res.error.message : 'Success: ' + res.data[0].id)
}

testRLS()
