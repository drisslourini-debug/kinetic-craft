import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fpfdlraqtqtcnmajrcyx.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZmRscmFxdHF0Y25tYWpyY3l4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzOTk5MywiZXhwIjoyMTAwMTE1OTkzfQ.8S8CiMvOFosImncenIptaaPBSNJmEfJ6YmC9XbLG7wA'
const supabase = createClient(supabaseUrl, serviceKey)

async function inspect() {
  const { data: kat } = await supabase.from('katalog_leistungen').select('*').limit(5)
  console.log('Katalog Leistungen sample:')
  console.log(JSON.stringify(kat, null, 2))
  
  const { data: katKat } = await supabase.from('katalog_kategorien').select('*').limit(3)
  console.log('\nKatalog Kategorien sample:')
  console.log(JSON.stringify(katKat, null, 2))

  const { data: oSample } = await supabase.from('offerten').select('daten').limit(1)
  if (oSample?.length > 0) {
    console.log('\nOfferte daten.leistungen sample:')
    console.log(JSON.stringify(oSample[0].daten?.leistungen?.slice(0,2), null, 2))
  }
}

inspect()
