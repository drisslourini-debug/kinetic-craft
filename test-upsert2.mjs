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
  const { data: settings } = await supabase.from('einstellungen').select('*').limit(1).single()
  console.log('Settings:', settings)
  
  const { data: saveResult, error: saveErr } = await supabase
    .from('einstellungen')
    .upsert({ id: settings.id, ...settings, logo_url: 'https://test.com/logo.png', primary_color: '#8b5cf6' })
    
  if (saveErr) {
    console.error('Save Error:', saveErr)
  } else {
    console.log('Save Success!')
  }
}

test()
