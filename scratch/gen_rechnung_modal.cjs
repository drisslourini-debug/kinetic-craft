const fs = require('fs');

let code = fs.readFileSync('src/components/OfferteDuplicateModal.jsx', 'utf8');

// Replace basic terms
code = code.replace(/OfferteDuplicateModal/g, 'RechnungDuplicateModal');
code = code.replace(/Offerte/g, 'Rechnung');
code = code.replace(/offerte/g, 'rechnung');
code = code.replace(/offerten/g, 'rechnungen');

// The insert block in OfferteDuplicateModal looks like this:
/*
      const { data, error: insertError } = await supabase
        .from('offerten')
        .insert([duplicateData])
        .select()
*/
// But duplicateData is formed before it. Let's replace the whole handleDuplicate logic inside the try block.

const newHandleDuplicate = `
    try {
      // Tiefe Kopie der Daten, um Mutationen zu vermeiden
      let newDaten = JSON.parse(JSON.stringify(currentRechnung.daten || {}))
      let newTotal = currentRechnung.total || 0
      
      // Wenn Leistungen nicht kopiert werden sollen
      if (!copyOptions.copyLeistungen) {
        newDaten.leistungen = []
        newDaten.pauschalpreis = null
        newTotal = 0
      }
      
      // Ausführung Start/Dauer zurücksetzen, da es ein neues Projekt sein könnte
      if (newDaten.ausfuehrung) {
        newDaten.ausfuehrung.start = ''
        newDaten.ausfuehrung.dauer = ''
      }

      // Generate next rechnung_nr
      const year = new Date().getFullYear()
      const { data: existing } = await supabase
        .from('rechnungen')
        .select('rechnung_nr')
        .ilike('rechnung_nr', \`RE-\${year}-%\`)
        .order('rechnung_nr', { ascending: false })
        .limit(1)
      
      let nextNum = 1
      if (existing && existing.length > 0) {
        const parts = existing[0].rechnung_nr.split('-')
        nextNum = parseInt(parts[2]) + 1
      }
      const newNr = \`RE-\${year}-\${String(nextNum).padStart(3, '0')}\`

      const duplicateData = {
        rechnung_nr: newNr,
        kunden_id: selectedKundeId,
        projekt_id: selectedProjektId || null,
        offerte_id: currentRechnung.offerte_id,
        typ: currentRechnung.typ,
        rechnungsdatum: new Date().toISOString().split('T')[0],
        zahlungsfrist_tage: currentRechnung.zahlungsfrist_tage || 30,
        status: 'Entwurf', // Duplikate sind immer zuerst Entwürfe
        total: newTotal,
        daten: newDaten
      }

      const { data, error: insertError } = await supabase
        .from('rechnungen')
        .insert([duplicateData])
        .select()
`;

// Replace the try block content up to `.select()`
code = code.replace(/try \{[\s\S]*?\.select\(\)/, newHandleDuplicate);

fs.writeFileSync('src/components/RechnungDuplicateModal.jsx', code);
console.log('Created RechnungDuplicateModal.jsx');
