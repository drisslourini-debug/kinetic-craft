import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '.env')
let supabaseUrl = 'YOUR_URL'
let supabaseKey = 'YOUR_KEY'

if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8')
  const lines = envFile.split('\n')
  for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim()
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim()
  }
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  await supabase.auth.signInWithPassword({ email: 'info@ki-netic.ch', password: 'Test1234' })
  const { data: saveResult, error: saveErr } = await supabase
    .from('einstellungen')
    .upsert({ 
      firmenname: 'Test', 
      tenant_id: 'c6ece51a-9d64-44f7-ae9e-eba1fcf2ab03'
    }) 
    
  console.log('Without id:', saveErr)
}

test()
