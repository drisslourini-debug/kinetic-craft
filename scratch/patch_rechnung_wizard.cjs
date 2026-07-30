const fs = require('fs');
let code = fs.readFileSync('src/components/RechnungenWizard.jsx', 'utf8');

if (!code.includes('const [settings, setSettings] = useState(null)')) {
  code = code.replace(
    'const [catalog, setCatalog] = useState(null)',
    'const [catalog, setCatalog] = useState(null)\n  const [settings, setSettings] = useState(null)'
  );
}

if (!code.includes('await supabase.from(\'einstellungen\')')) {
  const catalogLoad = 'async function loadCatalog() {';
  const settingsLoad = `async function loadCatalog() {
      // 0. Settings laden
      try {
        const { data: setts } = await supabase.from('einstellungen').select('*').eq('id', 1).single()
        if (setts) {
          setSettings(setts)
          setFormData(prev => ({ 
            ...prev, 
            konditionen: { rabatt: setts.standard_rabatt || 0, mwst: setts.standard_mwst || 8.1 } 
          }))
        }
      } catch (e) { console.log(e) }
`;
  code = code.replace(catalogLoad, settingsLoad);
}

// Fix nextNum calculation
const rechnungNrLogic = /let nextNum = 1\s*\n\s*if \(existing && existing\.length > 0 && existing\[0\]\.rechnung_nr\) \{\s*\n\s*const lastNr = existing\[0\]\.rechnung_nr\s*\n\s*const parts = lastNr\.split\('-'\)\s*\n\s*nextNum = parseInt\(parts\[2\] \|\| 0\) \+ 1\s*\n\s*\}/;
const newRechnungNrLogic = `let nextNum = settings?.startnummer_rechnungen || 1000
        if (existing && existing.length > 0 && existing[0].rechnung_nr) {
          const lastNr = existing[0].rechnung_nr
          const parts = lastNr.split('-')
          const existingNum = parseInt(parts[2] || 0)
          nextNum = existingNum >= nextNum ? existingNum + 1 : nextNum
        }`;
if (code.match(rechnungNrLogic)) {
  code = code.replace(rechnungNrLogic, newRechnungNrLogic);
}

// Fix zahlungsfristTage
const fristLogic = /let zahlungsfristTage = 30\s*\n\s*if \(formData\.rechnungsdetails\?\.zahlungsziel\?\.includes\('10'\)\) zahlungsfristTage = 10\s*\n\s*if \(formData\.rechnungsdetails\?\.zahlungsziel\?\.includes\('14'\)\) zahlungsfristTage = 14/;
const newFristLogic = `let zahlungsfristTage = settings?.zahlungsfrist_tage || 30
        if (formData.rechnungsdetails?.zahlungsziel?.includes('10')) zahlungsfristTage = 10
        if (formData.rechnungsdetails?.zahlungsziel?.includes('14')) zahlungsfristTage = 14`;
if (code.match(fristLogic)) {
  code = code.replace(fristLogic, newFristLogic);
}

fs.writeFileSync('src/components/RechnungenWizard.jsx', code);
console.log('RechnungenWizard patched');
