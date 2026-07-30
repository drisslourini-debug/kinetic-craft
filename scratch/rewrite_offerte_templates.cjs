const fs = require('fs');

const path = 'src/views/OfferteDetailView.jsx';
let code = fs.readFileSync(path, 'utf8');

// Add state for text_vorlagen
code = code.replace(
  "const [kundenList, setKundenList] = useState([])",
  "const [kundenList, setKundenList] = useState([])\n  const [textVorlagen, setTextVorlagen] = useState([])"
);

// Load text_vorlagen when entering edit mode
const loadEditDataStr = `
    async function loadEditData() {
      if (isEditing && (status === 'Entwurf' || status === 'In Überarbeitung')) {
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

code = code.replace(
  /async function loadEditData\(\) \{[\s\S]*?if \(kData\) setKundenList\(kData\)\n      \}\n    \}/,
  loadEditDataStr.trim()
);

// Replace hardcoded einleitungstext buttons
const oldEinleitungBtns = `[
                      { label: 'Standard', text: 'Gerne unterbreiten wir Ihnen folgende Offerte:' },
                      { label: 'Förmlich', text: 'Bezugnehmend auf unsere Besichtigung vor Ort erlauben wir uns, Ihnen folgende Offerte zu unterbreiten:' },
                      { label: 'Persönlich', text: 'Vielen Dank für Ihre Anfrage und das entgegengebrachte Vertrauen. Gerne offerieren wir Ihnen die gewünschten Arbeiten wie folgt:' },
                    ]`;

const newEinleitungBtns = `textVorlagen.filter(t => t.category === 'offerte_einleitung').length > 0 
                      ? textVorlagen.filter(t => t.category === 'offerte_einleitung')
                      : [
                          { label: 'Standard', text: 'Gerne unterbreiten wir Ihnen folgende Offerte:' },
                          { label: 'Förmlich', text: 'Bezugnehmend auf unsere Besichtigung vor Ort erlauben wir uns, Ihnen folgende Offerte zu unterbreiten:' },
                          { label: 'Persönlich', text: 'Vielen Dank für Ihre Anfrage und das entgegengebrachte Vertrauen. Gerne offerieren wir Ihnen die gewünschten Arbeiten wie folgt:' },
                        ]`;

code = code.replace(oldEinleitungBtns, newEinleitungBtns);

// Replace hardcoded schlusstext buttons
const oldSchlussBtnsSearchStr = `[
                              { label: 'Standard', text: 'Wir danken Ihnen für das Vertrauen und stehen für Fragen gerne zur Verfügung.' },
                              { label: 'Förmlich', text: 'Für die Auftragserteilung danken wir Ihnen im Voraus bestens. Bei Unklarheiten stehen wir Ihnen jederzeit gerne zur Verfügung.' },
                              { label: 'Kurz', text: 'Besten Dank für Ihre Anfrage.' }
                            ]`;
                            
const newSchlussBtns = `textVorlagen.filter(t => t.category === 'offerte_schluss').length > 0 
                              ? textVorlagen.filter(t => t.category === 'offerte_schluss')
                              : [
                                  { label: 'Standard', text: 'Wir danken Ihnen für das Vertrauen und stehen für Fragen gerne zur Verfügung.' },
                                  { label: 'Förmlich', text: 'Für die Auftragserteilung danken wir Ihnen im Voraus bestens. Bei Unklarheiten stehen wir Ihnen jederzeit gerne zur Verfügung.' },
                                  { label: 'Kurz', text: 'Besten Dank für Ihre Anfrage.' }
                                ]`;

code = code.replace(oldSchlussBtnsSearchStr, newSchlussBtns);

fs.writeFileSync(path, code);
console.log('Successfully updated OfferteDetailView.jsx with dynamic templates loading.');
