import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fpfdlraqtqtcnmajrcyx.supabase.co'
const SUPABASE_KEY = 'sb_publishable_brOU6y2FDiFiZq9fhOYHGA_xYnC5yQN'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function testRLS() {
  console.log("=== SUPABASE RLS TEST ===")
  
  // Ohne auth.uid() sollten wir nichts sehen können, WENN RLS aktiv ist.
  const { data, error } = await supabase
    .from('rechnungen')
    .select('id')
    .limit(5)
    
  if (error) {
    console.error("❌ Error fetching rechnungen:", error.message)
  } else {
    console.log(`Gefundene Rechnungen (als anonymer Gast): ${data?.length}`)
    if (data?.length > 0) {
      console.log("⚠️ WARNUNG: Row Level Security (RLS) ist NICHT aktiv! Ein anonymer User kann Daten lesen.")
    } else {
      console.log("✅ RLS scheint aktiv zu sein (0 Ergebnisse für anonym).")
    }
  }
}

testRLS()
