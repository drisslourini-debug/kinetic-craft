import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fpfdlraqtqtcnmajrcyx.supabase.co'
const SUPABASE_KEY = 'sb_publishable_brOU6y2FDiFiZq9fhOYHGA_xYnC5yQN'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function testSignupAndRPC() {
  const testEmail = `test-${Date.now()}@ki-netic.ch`
  console.log(`Testing with email: ${testEmail}`)
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: testEmail,
    password: 'SuperSecretPassword123!',
  })

  if (authError) {
    console.error("Auth Error:", authError.message)
    return
  }
  
  console.log("Auth Data:", {
    user: authData.user ? authData.user.id : null,
    session: authData.session ? "EXISTS" : "NULL"
  })

  if (!authData.session) {
    console.error("Session is still null! Confirm Email might still be ON, or this is a fake email issue.")
    return
  }

  console.log("Session exists! Now calling RPC...")
  const { data: rpcData, error: rpcError } = await supabase.rpc('register_new_tenant', {
    p_firmenname: 'RPC Test',
    p_primary_color: '#000000',
    p_logo_url: '',
    p_user_name: 'RPC User'
  })

  if (rpcError) {
    console.error("RPC Error:", rpcError.message)
  } else {
    console.log("RPC Success:", rpcData)
  }
}

testSignupAndRPC()
