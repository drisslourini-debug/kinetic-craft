const fs = require('fs');

let code = fs.readFileSync('src/views/RechnungDetailView_NEW.jsx', 'utf8');

// 1. Add Payment Form state
code = code.replace(
  /const \[editProjektId, setEditProjektId\] = useState\(''\)/,
  `const [editProjektId, setEditProjektId] = useState('')
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentAmount, setPaymentAmount] = useState(rechnung.total || 0)
  
  // Rechnung specific fields
  const [editRechnungsdatum, setEditRechnungsdatum] = useState(rechnung.rechnungsdatum || '')
  const [editZahlungsfrist, setEditZahlungsfrist] = useState(rechnung.zahlungsfrist_tage || 30)`
);

// 2. Add Payment Modal UI at the bottom (before the closing div of the whole component)
code = code.replace(
  /(\s+)<\/div>\s+<\/div>\s+\);\s+}\s*$/,
  `$1</div>
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-card rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-xl font-bold text-text-primary">Zahlung erfassen</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Zahlungsdatum</label>
                <input 
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Betrag (CHF)</label>
                <input 
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg font-mono"
                />
              </div>
            </div>
            <div className="p-4 border-t border-border bg-neutral-50 flex justify-end gap-3">
              <button onClick={() => setShowPaymentForm(false)} className="px-4 py-2 font-bold text-text-secondary">Abbrechen</button>
              <button onClick={handlePayment} className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl">Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`
);

// 3. Update startEditing to load Rechnung fields
code = code.replace(
  /setEditKundeId\(rechnung\.kunden_id \|\| ''\)/,
  `setEditKundeId(rechnung.kunden_id || '')
    setEditRechnungsdatum(rechnung.rechnungsdatum || '')
    setEditZahlungsfrist(rechnung.zahlungsfrist_tage || 30)`
);

// 4. Update saveEditing to save rechnung fields natively and calculate faellig_am
code = code.replace(
  /const updatedDaten = \{([\s\S]*?)anhange: editAnhange\n\s+\}/,
  `const updatedDaten = {
        ...rechnung.daten,
        leistungen: cleanLeistungen,
        konditionen: {
          rabatt: editKonditionen.rabatt,
          mwst: editKonditionen.mwst,
          zahlungsfrist: editKonditionen.zahlungsfrist
        },
        einleitungstext: editEinleitung || null,
        schlusstext: editSchluss || null,
        pauschalpreis: isPauschal ? parseFloat(editPauschalpreis) || null : null,
        ausfuehrung: editAusfuehrung,
        anhange: editAnhange
      }

      let faellig_am = null;
      if (editRechnungsdatum) {
        const rDate = new Date(editRechnungsdatum);
        rDate.setDate(rDate.getDate() + parseInt(editZahlungsfrist || 0));
        faellig_am = rDate.toISOString().split('T')[0];
      }`
);

code = code.replace(
  /\.update\(\{ daten: updatedDaten, total: finalTotal, kunden_id: editKundeId, projekt_id: editProjektId \|\| null \}\)/,
  `.update({ 
          daten: updatedDaten, 
          total: finalTotal, 
          kunden_id: editKundeId, 
          projekt_id: editProjektId || null,
          rechnungsdatum: editRechnungsdatum,
          zahlungsfrist_tage: editZahlungsfrist,
          faellig_am: faellig_am
        })`
);

code = code.replace(
  /rechnung\.kunden_id = editKundeId\n\s+rechnung\.projekt_id = editProjektId \|\| null/,
  `rechnung.kunden_id = editKundeId
      rechnung.projekt_id = editProjektId || null
      rechnung.rechnungsdatum = editRechnungsdatum
      rechnung.zahlungsfrist_tage = editZahlungsfrist
      rechnung.faellig_am = faellig_am`
);

// 5. Update the handlePayment function logic (currently just a copy of handleConvertToRechnung but renamed)
// Let's rewrite handlePayment
code = code.replace(
  /const handlePayment = async \(\) => \{([\s\S]*?)setIsUpdating\(false\)\n\s+\}\n\s+\}/,
  `const handlePayment = async () => {
    setIsUpdating(true)
    try {
      await supabase
        .from('rechnungen')
        .update({ 
          bezahlt: parseFloat(paymentAmount), 
          bezahlt_am: paymentDate, 
          status: 'Bezahlt' 
        })
        .eq('id', rechnung.id)
      
      setStatus('Bezahlt')
      setShowPaymentForm(false)
      rechnung.bezahlt = parseFloat(paymentAmount)
      rechnung.bezahlt_am = paymentDate
      rechnung.status = 'Bezahlt'
      alert('Zahlung erfolgreich erfasst!')
    } catch (err) {
      console.error('Fehler beim Erfassen der Zahlung:', err)
      alert('Fehler beim Speichern der Zahlung.')
    } finally {
      setIsUpdating(false)
    }
  }`
);

// 6. Action Menu Button replacement for "Zahlung erfassen"
// We already replaced the text, let's make sure it toggles the modal.
code = code.replace(
  /onClick=\{\(\) => \{ setShowActionMenu\(false\); handlePayment\(\); \}\}/,
  `onClick={() => { setShowActionMenu(false); setShowPaymentForm(true); }}`
);

// 7. Update UI to show Rechnungsdatum and Zahlungsziel instead of Erstellt am / Gültigkeit
// Header date:
code = code.replace(
  /Erstellt am \{formatDate\(rechnung\.created_at\)\}/,
  `Rechnungsdatum {rechnung.rechnungsdatum ? formatDate(rechnung.rechnungsdatum).split(',')[0] : formatDate(rechnung.created_at).split(',')[0]}`
);

// Stammdaten UI:
code = code.replace(
  /Gültigkeit Rechnung<\/label>\s*<select[\s\S]*?<\/select>/,
  `Zahlungsfrist (Tage)</label>
                          <input 
                            type="number"
                            value={editZahlungsfrist}
                            onChange={(e) => setEditZahlungsfrist(e.target.value)}
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                          />`
);

code = code.replace(
  /Gültigkeit<\/label>\s*<div[\s\S]*?<\/div>/,
  `Zahlungsfrist (Tage)</label>
                          <div className="text-sm font-medium text-text-primary">{rechnung.zahlungsfrist_tage || 30}</div>`
);

// Need to also add Rechnungsdatum to the UI in the Konditionen / Stammdaten block
code = code.replace(
  /Zahlungsfrist \(Tage\)<\/label>/,
  `Rechnungsdatum</label>
                          <input 
                            type="date"
                            value={editRechnungsdatum}
                            onChange={(e) => setEditRechnungsdatum(e.target.value)}
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 mb-3"
                          />
                          <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1.5">Zahlungsfrist (Tage)</label>`
);

// We should replace the second one too (read-only mode)
code = code.replace(
  /Zahlungsfrist \(Tage\)<\/label>\s*<div className="text-sm font-medium text-text-primary">\{rechnung\.zahlungsfrist_tage \|\| 30\}<\/div>/,
  `Rechnungsdatum</label>
                          <div className="text-sm font-medium text-text-primary mb-3">{rechnung.rechnungsdatum ? formatDate(rechnung.rechnungsdatum).split(',')[0] : '-'}</div>
                          <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Zahlungsfrist (Tage)</label>
                          <div className="text-sm font-medium text-text-primary">{rechnung.zahlungsfrist_tage || 30}</div>`
);


// 8. Fix rechnung.rechnung_nr in title instead of rechnung.id
code = code.replace(
  /Rechnung #\{rechnung\.id\}/,
  `Rechnung {rechnung.rechnung_nr}`
);

fs.writeFileSync('src/views/RechnungDetailView_NEW.jsx', code);
console.log('Patch complete.');
