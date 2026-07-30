const fs = require('fs');

let code = fs.readFileSync('src/views/OfferteDetailView.jsx', 'utf8');

// The order matters heavily for these string replacements to prevent partial word matches.
code = code.replace(/Offerten/g, 'Rechnungen');
code = code.replace(/offerten/g, 'rechnungen');
code = code.replace(/Offerte/g, 'Rechnung');
code = code.replace(/offerte/g, 'rechnung');

// Correct standard terms
code = code.replace(/RechnungDetailView/g, 'RechnungDetailView');
code = code.replace(/RechnungPrintView/g, 'RechnungPrintView');
code = code.replace(/import RechnungDuplicateModal from '..\/components\/RechnungDuplicateModal'\n/g, '');

// State replacements (Add payment states and Rechnungsdatum / Zahlungsfrist fields)
code = code.replace(
  /const \[editProjektId, setEditProjektId\] = useState\(''\)/,
  `const [editProjektId, setEditProjektId] = useState('')
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentAmount, setPaymentAmount] = useState(rechnung.total || 0)
  const [editRechnungsdatum, setEditRechnungsdatum] = useState(rechnung.rechnungsdatum || '')
  const [editZahlungsfrist, setEditZahlungsfrist] = useState(rechnung.zahlungsfrist_tage || 30)`
);

// Payment Modal UI insertion
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

// Delete handleConvertToRechnung completely
code = code.replace(/const handleConvertToRechnung = async \(\) => \{[\s\S]*?finally \{\s*setIsUpdating\(false\)\s*\}\s*\}/, '');

// Replace handleDuplicate with a correct implementation for Rechnungen
code = code.replace(/const handleDuplicate = \(\) => \{[\s\S]*?\}\n/, `const handleDuplicate = async () => {
    if (!window.confirm('Diese Rechnung wirklich kopieren?')) return
    setIsUpdating(true)
    try {
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

      const { data, error } = await supabase
        .from('rechnungen')
        .insert([{
          rechnung_nr: newNr,
          kunden_id: rechnung.kunden_id,
          projekt_id: rechnung.projekt_id,
          offerte_id: rechnung.offerte_id,
          typ: rechnung.typ,
          total: rechnung.total,
          daten: rechnung.daten,
          rechnungsdatum: new Date().toISOString().split('T')[0],
          zahlungsfrist_tage: rechnung.zahlungsfrist_tage || 30,
          status: 'Entwurf'
        }])
        .select()
      if (error) throw error
      if (data && data.length > 0) {
        alert(\`Rechnung \${newNr} dupliziert!\`)
        window.location.reload()
      }
    } catch (err) {
      console.error('Fehler beim Duplizieren:', err)
      alert('Fehler beim Duplizieren')
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePayment = async () => {
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
  }
`);

// Status Options
code = code.replace(/<option value="Versendet">Versendet<\/option>/g, '<option value="Offen">Offen</option>');
code = code.replace(/<option value="In Überarbeitung">In Überarbeitung<\/option>/g, '<option value="Bezahlt">Bezahlt</option>');
code = code.replace(/<option value="Akzeptiert">Akzeptiert<\/option>/g, '<option value="Überfällig">Überfällig</option>');
code = code.replace(/<option value="Abgelehnt">Abgelehnt<\/option>/g, '<option value="Storniert">Storniert</option>');
code = code.replace(/<option value="Verrechnet">Verrechnet<\/option>/g, '');

// Status Colors
code = code.replace(/status === 'Akzeptiert' \|\| status === 'Verrechnet'/g, "status === 'Bezahlt'");
code = code.replace(/status === 'Versendet'/g, "status === 'Offen'");
code = code.replace(/status === 'In Überarbeitung'/g, "status === 'Überfällig'");
code = code.replace(/status === 'Abgelehnt'/g, "status === 'Storniert'");

code = code.replace(/bg-amber-50 text-amber-700/g, 'bg-red-50 text-red-700'); // Überfällig
code = code.replace(/border-amber-200/g, 'border-red-200'); // Überfällig
code = code.replace(/bg-red-50 text-red-700/g, 'bg-gray-100 text-gray-500'); // Storniert
code = code.replace(/border-red-200/g, 'border-gray-300'); // Storniert

// Action Menu options
code = code.replace(/In Rechnung umwandeln/, 'Zahlung erfassen');
code = code.replace(/handleConvertToRechnung\(\)/, 'setShowPaymentForm(true)');
code = code.replace(/setShowDuplicateModal\(true\)/, 'handleDuplicate()');

// Start Editing logic 
code = code.replace(
  /setEditKundeId\(rechnung\.kunden_id \|\| ''\)/,
  `setEditKundeId(rechnung.kunden_id || '')
    setEditRechnungsdatum(rechnung.rechnungsdatum || '')
    setEditZahlungsfrist(rechnung.zahlungsfrist_tage || 30)`
);

// Save editing logic
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

// UI Title and Dates
code = code.replace(
  /Rechnung #\{rechnung\.id\}/,
  `Rechnung {rechnung.rechnung_nr}`
);

code = code.replace(
  /Erstellt am \{formatDate\(rechnung\.created_at\)\}/,
  `Rechnungsdatum {rechnung.rechnungsdatum ? formatDate(rechnung.rechnungsdatum).split(',')[0] : formatDate(rechnung.created_at).split(',')[0]}`
);

// UI fields for Stammdaten read/edit
code = code.replace(
  /Gültigkeit Rechnung<\/label>\s*<select[\s\S]*?<\/select>/,
  `Rechnungsdatum</label>
                          <input 
                            type="date"
                            value={editRechnungsdatum}
                            onChange={(e) => setEditRechnungsdatum(e.target.value)}
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 mb-3"
                          />
                          <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1.5">Zahlungsfrist (Tage)</label>
                          <input 
                            type="number"
                            value={editZahlungsfrist}
                            onChange={(e) => setEditZahlungsfrist(e.target.value)}
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                          />`
);

code = code.replace(
  /Gültigkeit<\/label>\s*<div[\s\S]*?<\/div>/,
  `Rechnungsdatum</label>
                          <div className="text-sm font-medium text-text-primary mb-3">{rechnung.rechnungsdatum ? formatDate(rechnung.rechnungsdatum).split(',')[0] : '-'}</div>
                          <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Zahlungsfrist (Tage)</label>
                          <div className="text-sm font-medium text-text-primary">{rechnung.zahlungsfrist_tage || 30}</div>`
);

// Add missing handleStatusChange
code = code.replace(
  /const handleStatusChange = async \(newStatus\) => \{/,
  `const handleStatusChange = async (newStatus) => {
    if (newStatus === 'Bezahlt') {
      setShowPaymentForm(true)
      return
    }`
);

fs.writeFileSync('src/views/RechnungDetailView.jsx', code);
console.log('RechnungDetailView rewritten successfully.');
