const fs = require('fs');

const path = 'src/views/RechnungDetailView.jsx';
let code = fs.readFileSync(path, 'utf8');

// Add state for text_vorlagen
if (!code.includes('const [textVorlagen, setTextVorlagen]')) {
  code = code.replace(
    "const [kundenList, setKundenList] = useState([])",
    "const [kundenList, setKundenList] = useState([])\n  const [textVorlagen, setTextVorlagen] = useState([])"
  );
}

// Load text_vorlagen when entering edit mode
const loadEditDataStr = `
    async function loadEditData() {
      if (isEditing && (status === 'Entwurf' || status === 'Überfällig')) {
        const { data: kData } = await supabase.from('kunden').select('id, name, ort').order('name')
        if (kData) setKundenList(kData)
        
        // Load text templates
        const { data: einstellungen } = await supabase.from('einstellungen').select('text_vorlagen').eq('id', 1).single()
        if (einstellungen && einstellungen.text_vorlagen) {
          setTextVorlagen(einstellungen.text_vorlagen)
        }
      }
    }
`;

if (!code.includes('setTextVorlagen(einstellungen.text_vorlagen)')) {
  code = code.replace(
    /async function loadEditData\(\) \{[\s\S]*?if \(kData\) setKundenList\(kData\)\n      \}\n    \}/,
    loadEditDataStr.trim()
  );
}

// Replace hardcoded einleitungstext buttons
const oldEinleitungBtns = /\[\s*\{\s*label:\s*'Standard',\s*text:\s*'Gerne unterbreiten wir Ihnen folgende Rechnung:'\s*\},[\s\S]*?\]\.map\(\(tpl\)/;
const newEinleitungBtns = `(textVorlagen.filter(t => t.category === 'rechnung_einleitung').length > 0 
                      ? textVorlagen.filter(t => t.category === 'rechnung_einleitung')
                      : [
                          { label: 'Standard', text: 'Gerne unterbreiten wir Ihnen folgende Rechnung:' },
                          { label: 'Förmlich', text: 'Bezugnehmend auf unsere Besichtigung vor Ort erlauben wir uns, Ihnen folgende Rechnung zu unterbreiten:' },
                          { label: 'Persönlich', text: 'Vielen Dank für Ihre Anfrage und das entgegengebrachte Vertrauen. Gerne offerieren wir Ihnen die gewünschten Arbeiten wie folgt:' },
                        ]).map((tpl)`;

code = code.replace(oldEinleitungBtns, newEinleitungBtns);

// Replace hardcoded schlusstext buttons
const oldSchlussBtns = /\[\s*\{\s*label:\s*'Standard',\s*text:\s*'Wir danken Ihnen f(?:ü|Ǭ)r das Vertrauen und stehen f(?:ü|Ǭ)r Fragen gerne zur Verf(?:ü|Ǭ)gung.'\s*\},[\s\S]*?\]\.map\(\(tpl\)/;
const newSchlussBtns = `(textVorlagen.filter(t => t.category === 'rechnung_schluss').length > 0 
                            ? textVorlagen.filter(t => t.category === 'rechnung_schluss')
                            : [
                                { label: 'Standard', text: 'Wir danken Ihnen für das Vertrauen und stehen für Fragen gerne zur Verfügung.' },
                                { label: 'Mit Gültigkeit', text: 'Diese Rechnung ist 30 Tage gültig. Materialpreisänderungen bleiben vorbehalten. Wir danken Ihnen für das Vertrauen und freuen uns auf Ihren Auftrag.' },
                                { label: 'Ausführlich', text: 'Die Rechnung versteht sich exkl. allfälliger Gerüstkosten und bauseitiger Vorleistungen. Materialpreisänderungen bleiben vorbehalten. Nicht offerierte Arbeiten werden nach Aufwand verrechnet. Wir danken Ihnen für das Vertrauen und stehen für Fragen gerne zur Verfügung.' },
                              ]).map((tpl)`;

code = code.replace(oldSchlussBtns, newSchlussBtns);

fs.writeFileSync(path, code);
console.log('Successfully updated RechnungDetailView.jsx with dynamic templates loading.');
