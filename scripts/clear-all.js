import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fpfdlraqtqtcnmajrcyx.supabase.co'
// Service role key bypasses RLS completely
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZmRscmFxdHF0Y25tYWpyY3l4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzOTk5MywiZXhwIjoyMTAwMTE1OTkzfQ.8S8CiMvOFosImncenIptaaPBSNJmEfJ6YmC9XbLG7wA'

const supabase = createClient(supabaseUrl, serviceKey)

async function clearAll() {
  console.log('🗑️ Starte vollständiges Löschen (Service Role)...')

  // Step 1: Break circular FK: offerten.rechnung_id → rechnungen
  const r0 = await supabase.from('offerten').update({ rechnung_id: null }).not('id', 'is', null)
  console.log('offerten.rechnung_id → null:', r0.error?.message ?? 'OK')

  // Step 2: Delete rechnungen
  const r1 = await supabase.from('rechnungen').delete().not('id', 'is', null)
  console.log('rechnungen gelöscht:', r1.error?.message ?? 'OK')

  // Step 3: Delete offerten
  const r2 = await supabase.from('offerten').delete().not('id', 'is', null)
  console.log('offerten gelöscht:', r2.error?.message ?? 'OK')

  // Step 4: Delete projekte
  const r3 = await supabase.from('projekte').delete().not('id', 'is', null)
  console.log('projekte gelöscht:', r3.error?.message ?? 'OK')

  // Step 5: Delete kunden
  const r4 = await supabase.from('kunden').delete().not('id', 'is', null)
  console.log('kunden gelöscht:', r4.error?.message ?? 'OK')

  // Verify counts
  const { count: cR } = await supabase.from('rechnungen').select('*', { count: 'exact', head: true })
  const { count: cO } = await supabase.from('offerten').select('*', { count: 'exact', head: true })
  const { count: cP } = await supabase.from('projekte').select('*', { count: 'exact', head: true })
  const { count: cK } = await supabase.from('kunden').select('*', { count: 'exact', head: true })

  console.log('')
  console.log('📊 Verbleibende Einträge nach Löschen:')
  console.log('  rechnungen:', cR)
  console.log('  offerten:  ', cO)
  console.log('  projekte:  ', cP)
  console.log('  kunden:    ', cK)

  if (cR === 0 && cO === 0 && cP === 0 && cK === 0) {
    console.log('\n✅ Datenbank vollständig geleert!')
  } else {
    console.log('\n⚠️ Es sind noch Einträge vorhanden.')
  }
}

clearAll()
