import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fpfdlraqtqtcnmajrcyx.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZmRscmFxdHF0Y25tYWpyY3l4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzOTk5MywiZXhwIjoyMTAwMTE1OTkzfQ.8S8CiMvOFosImncenIptaaPBSNJmEfJ6YmC9XbLG7wA'
const supabase = createClient(supabaseUrl, serviceKey)

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

const START = new Date('2026-01-01')
const END = new Date('2026-07-28')

async function patchData() {
  console.log('🔧 Patching Offerten (ausfuehrung + gueltigkeit)...')

  // Load all offerten
  const { data: offerten } = await supabase.from('offerten').select('id, daten, created_at, gueltig_bis')
  console.log(`Found ${offerten?.length} offerten`)

  let batchUpdates = []
  for (const o of (offerten || [])) {
    const daten = o.daten || {}
    const createdAt = new Date(o.created_at || o.gueltig_bis || '2026-03-01')
    
    // Generate ausfuehrung dates (1-6 weeks after the offerte date)
    const ausfStart = randomDate(createdAt, new Date(Math.min(createdAt.getTime() + 42*24*60*60*1000, END.getTime())))
    const ausfDuration = Math.floor(Math.random() * 14) + 1 // 1-14 days
    const ausfEnd = new Date(ausfStart.getTime() + ausfDuration * 24*60*60*1000)

    // Gueltigkeit: 30 days from created
    const gueltigkeit = new Date(createdAt.getTime() + 30*24*60*60*1000)
    const gueltigkeitStr = gueltigkeit.toISOString().split('T')[0]

    const updatedDaten = {
      ...daten,
      ausfuehrung: {
        start: ausfStart.toISOString().split('T')[0],
        end: ausfEnd > END ? END.toISOString().split('T')[0] : ausfEnd.toISOString().split('T')[0]
      },
      konditionen: {
        ...(daten.konditionen || {}),
        gueltigkeit: gueltigkeitStr
      }
    }

    batchUpdates.push({ id: o.id, daten: updatedDaten, gueltig_bis: gueltigkeitStr })
  }

  // Update in batches of 50
  let updated = 0
  for (let i = 0; i < batchUpdates.length; i += 50) {
    const batch = batchUpdates.slice(i, i + 50)
    for (const item of batch) {
      await supabase.from('offerten').update({ daten: item.daten, gueltig_bis: item.gueltig_bis }).eq('id', item.id)
    }
    updated += batch.length
    console.log(`  Updated ${updated}/${batchUpdates.length} offerten...`)
  }
  console.log('✅ Offerten gepatcht.')

  // -----------------------------------------------
  console.log('\n🔧 Patching Rechnungen (bezahlt_am für Status Bezahlt)...')
  const { data: rechnungen } = await supabase.from('rechnungen').select('id, status, rechnungsdatum, created_at, zahlungsfrist_tage')
  console.log(`Found ${rechnungen?.length} rechnungen`)

  let rUpdated = 0
  for (const r of (rechnungen || [])) {
    if (r.status === 'Bezahlt') {
      const rDate = new Date(r.rechnungsdatum || r.created_at)
      // bezahlt_am = rechnungsdatum + zahlungsfrist (paid on time) ± a few days
      const frist = r.zahlungsfrist_tage || 30
      const offset = Math.floor(Math.random() * 10) - 3 // -3 to +7 days variation
      const bezahltDate = new Date(rDate.getTime() + (frist + offset) * 24*60*60*1000)
      const bezahltStr = bezahltDate > END ? END.toISOString().split('T')[0] : bezahltDate.toISOString().split('T')[0]
      
      await supabase.from('rechnungen').update({ bezahlt_am: bezahltStr }).eq('id', r.id)
      rUpdated++
    }
  }
  console.log(`✅ ${rUpdated} Rechnungen mit bezahlt_am gepatcht.`)
  
  console.log('\n🎉 Patch komplett!')
}

patchData()
