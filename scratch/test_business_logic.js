import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log('--- STARTING HARD TESTS ---');
  let testKundeId, testProjektId, testOfferteId, testRechnungId;

  try {
    // 0. Login
    console.log('0. Logging in...');
    const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
      email: 'lourinidriss@gmail.com',
      password: 'Test1234'
    });
    if (authErr) throw authErr;
    console.log('✅ Logged in successfully');

    // 1. Create Kunde
    console.log('1. Creating test customer...');
    const { data: kunde, error: kErr } = await supabase.from('kunden').insert([{
      name: 'Test AG', strasse: 'Teststr. 1', plz: '1234', ort: 'Testort', email: 'test@test.ch', typ: 'Unternehmen / Firma'
    }]).select().single();
    if (kErr) throw kErr;
    testKundeId = kunde.id;
    console.log('✅ Customer created:', testKundeId);

    // 2. Create Projekt
    console.log('2. Creating test project...');
    const { data: projekt, error: pErr } = await supabase.from('projekte').insert([{
      name: 'Hard Test Project', kunden_id: testKundeId, adresse: 'Teststr. 1'
    }]).select().single();
    if (pErr) throw pErr;
    testProjektId = projekt.id;
    console.log('✅ Project created:', testProjektId);

    // 3. Create Offerte
    console.log('3. Creating Offerte...');
    const { data: offerte, error: oErr } = await supabase.from('offerten').insert([{
      kunden_id: testKundeId, projekt_id: testProjektId, status: 'Entwurf', total: 1500, 
       // Explicitly set user_id
      daten: { leistungen: [{ beschreibung: 'Testleistung', menge: 1, einzelpreis: 1500, total: 1500 }] }
    }]).select().single();
    if (oErr) throw oErr;
    testOfferteId = offerte.id;
    console.log('✅ Offerte created:', testOfferteId);

    // 4. Update Offerte
    console.log('4. Updating Offerte...');
    const { error: updErr } = await supabase.from('offerten').update({
      status: 'Gesendet', total: 2000
    }).eq('id', testOfferteId);
    if (updErr) throw updErr;
    console.log('✅ Offerte updated successfully');

    // 5. Convert to Rechnung
    console.log('5. Converting Offerte to Rechnung...');
    const rechnungData = {
      rechnung_nr: 'RE-2026-999', kunden_id: testKundeId, projekt_id: testProjektId,
      offerte_id: testOfferteId, status: 'Offen', total: 2000, 
       // Explicitly set user_id
      daten: { leistungen: [{ beschreibung: 'Testleistung', menge: 1, einzelpreis: 2000, total: 2000 }] }
    };
    const { data: rechnung, error: rErr } = await supabase.from('rechnungen').insert([rechnungData]).select().single();
    if (rErr) throw rErr;
    testRechnungId = rechnung.id;
    console.log('✅ Rechnung created from Offerte:', testRechnungId);

    // 6. Test Payment Logic
    console.log('6. Adding payment to Rechnung...');
    const newPayments = [{ datum: new Date().toISOString(), betrag: 2000 }];
    const { error: payErr } = await supabase.from('rechnungen').update({
      bezahlt: 2000, bezahlt_am: new Date().toISOString(), status: 'Bezahlt'
    }).eq('id', testRechnungId);
    if (payErr) throw payErr;
    console.log('✅ Payment added and status set to Bezahlt');

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    await supabase.from('rechnungen').delete().eq('id', testRechnungId);
    await supabase.from('offerten').delete().eq('id', testOfferteId);
    await supabase.from('projekte').delete().eq('id', testProjektId);
    await supabase.from('kunden').delete().eq('id', testKundeId);
    console.log('✅ Cleanup complete');

    console.log('🎉 ALL HARD TESTS PASSED SUCCESSFULLY! 🎉');
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
  }
}

runTests();
