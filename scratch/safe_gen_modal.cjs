const fs = require('fs');

let code = fs.readFileSync('src/components/OfferteDuplicateModal.jsx', 'utf8');

// Replace basic terms
code = code.replace(/OfferteDuplicateModal/g, 'RechnungDuplicateModal');
code = code.replace(/Offerte/g, 'Rechnung');
code = code.replace(/offerte/g, 'rechnung');
code = code.replace(/offerten/g, 'rechnungen');
code = code.replace(/Offerten/g, 'Rechnungen');

// The handleDuplicate function in OfferteDuplicateModal starts like:
// const handleDuplicate = async () => {
// Let's replace the whole handleDuplicate function safely.
const startIndex = code.indexOf('const handleDuplicate = async () => {');
const endIndex = code.indexOf('return (', startIndex);

const newHandleDuplicate = `const handleDuplicate = async () => {
    if (!selectedKundeId) {
      setError('Bitte wähle einen Kunden aus.')
      return
    }
    
    setIsSubmitting(true)
    setError('')
    
    try {
      let newDaten = JSON.parse(JSON.stringify(currentRechnung.daten || {}))
      let newTotal = currentRechnung.total || 0
      
      if (!copyOptions.copyLeistungen) {
        newDaten.leistungen = []
        newDaten.pauschalpreis = null
        newTotal = 0
      }
      
      if (newDaten.ausfuehrung) {
        newDaten.ausfuehrung.start = ''
        newDaten.ausfuehrung.dauer = ''
      }

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
        typ: currentRechnung.typ || 'gesamt',
        rechnungsdatum: new Date().toISOString().split('T')[0],
        zahlungsfrist_tage: currentRechnung.zahlungsfrist_tage || 30,
        status: 'Entwurf',
        total: newTotal,
        daten: newDaten
      }

      const { data, error: insertError } = await supabase
        .from('rechnungen')
        .insert([duplicateData])
        .select()
        
      if (insertError) throw insertError
      
      if (data && data.length > 0) {
        onSuccess(data[0].id)
      }
    } catch (err) {
      console.error('Fehler beim Duplizieren:', err)
      setError('Fehler beim Kopieren. Bitte versuche es erneut.')
    } finally {
      setIsSubmitting(false)
    }
  }

  `;

code = code.substring(0, startIndex) + newHandleDuplicate + code.substring(endIndex);

fs.writeFileSync('src/components/RechnungDuplicateModal.jsx', code);
console.log('RechnungDuplicateModal generated safely.');
