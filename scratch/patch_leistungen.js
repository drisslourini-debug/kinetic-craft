import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fpfdlraqtqtcnmajrcyx.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZmRscmFxdHF0Y25tYWpyY3l4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzOTk5MywiZXhwIjoyMTAwMTE1OTkzfQ.8S8CiMvOFosImncenIptaaPBSNJmEfJ6YmC9XbLG7wA'
const supabase = createClient(supabaseUrl, serviceKey)

async function patchLeistungen() {
  console.log('🔧 Patching Offerten Leistungen (bezeichnung -> beschreibung)...')

  const { data: offerten } = await supabase.from('offerten').select('id, daten')
  let countOfferten = 0
  
  for (const o of (offerten || [])) {
    if (o.daten && o.daten.leistungen) {
      let changed = false
      const newLeistungen = o.daten.leistungen.map(l => {
        if (l.bezeichnung !== undefined && l.beschreibung === undefined) {
          changed = true
          const { bezeichnung, ...rest } = l
          return { ...rest, beschreibung: bezeichnung }
        }
        return l
      })

      if (changed) {
        await supabase.from('offerten').update({ daten: { ...o.daten, leistungen: newLeistungen } }).eq('id', o.id)
        countOfferten++
      }
    }
  }
  console.log(`✅ ${countOfferten} Offerten aktualisiert.`)


  console.log('🔧 Patching Rechnungen Leistungen (bezeichnung -> beschreibung)...')
  const { data: rechnungen } = await supabase.from('rechnungen').select('id, daten')
  let countRechnungen = 0

  for (const r of (rechnungen || [])) {
    if (r.daten && r.daten.leistungen) {
      let changed = false
      const newLeistungen = r.daten.leistungen.map(l => {
        if (l.bezeichnung !== undefined && l.beschreibung === undefined) {
          changed = true
          const { bezeichnung, ...rest } = l
          return { ...rest, beschreibung: bezeichnung }
        }
        return l
      })

      if (changed) {
        await supabase.from('rechnungen').update({ daten: { ...r.daten, leistungen: newLeistungen } }).eq('id', r.id)
        countRechnungen++
      }
    }
  }
  console.log(`✅ ${countRechnungen} Rechnungen aktualisiert.`)
  
  console.log('🎉 Patch abgeschlossen!')
}

patchLeistungen()
