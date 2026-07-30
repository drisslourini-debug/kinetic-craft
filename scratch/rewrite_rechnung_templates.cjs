const fs = require('fs');

const path = 'src/views/RechnungDetailView.jsx';
let code = fs.readFileSync(path, 'utf8');

// Add state for text_vorlagen
code = code.replace(
  "const [kundenList, setKundenList] = useState([])",
  "const [kundenList, setKundenList] = useState([])\n  const [textVorlagen, setTextVorlagen] = useState([])"
);

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

code = code.replace(
  /async function loadEditData\(\) \{[\s\S]*?if \(kData\) setKundenList\(kData\)\n      \}\n    \}/,
  loadEditDataStr.trim()
);

// Replace hardcoded einleitungstext buttons
const oldEinleitungBtns = `[
                      { label: 'Standard', text: 'Gerne unterbreiten wir Ihnen folgende Rechnung:' },
                      { label: 'Förmlich', text: 'Bezugnehmend auf unsere Besichtigung vor Ort erlauben wir uns, Ihnen folgende Rechnung zu unterbreiten:' },
                      { label: 'Persönlich', text: 'Vielen Dank für Ihre Anfrage und das entgegengebrachte Vertrauen. Gerne offerieren wir Ihnen die gewünschten Arbeiten wie folgt:' },
                    ]`;

const newEinleitungBtns = `textVorlagen.filter(t => t.category === 'rechnung_einleitung').length > 0 
                      ? textVorlagen.filter(t => t.category === 'rechnung_einleitung')
                      : [
                          { label: 'Standard', text: 'Gerne unterbreiten wir Ihnen folgende Rechnung:' },
                          { label: 'Förmlich', text: 'Bezugnehmend auf unsere Besichtigung vor Ort erlauben wir uns, Ihnen folgende Rechnung zu unterbreiten:' },
                          { label: 'Persönlich', text: 'Vielen Dank für Ihre Anfrage und das entgegengebrachte Vertrauen. Gerne offerieren wir Ihnen die gewünschten Arbeiten wie folgt:' },
                        ]`;

code = code.replace(oldEinleitungBtns, newEinleitungBtns);

// I need to check how schlusstext buttons are implemented in RechnungDetailView.jsx
// It is cut off in the previous view output, but I'll search for it using grep or replace blindly if it matches Offerte.
