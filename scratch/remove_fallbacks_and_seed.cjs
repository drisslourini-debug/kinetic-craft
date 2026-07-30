const fs = require('fs');

const offPath = 'src/views/OfferteDetailView.jsx';
const rechPath = 'src/views/RechnungDetailView.jsx';
const einPath = 'src/views/EinstellungenView.jsx';

function removeFallback(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  
  // Remove fallback for Offerte Einleitung
  const offEinRegex = /\(textVorlagen\.filter\(t => t\.category === 'offerte_einleitung'\)\.length > 0\s*\?\s*textVorlagen\.filter\(t => t\.category === 'offerte_einleitung'\)\s*:\s*\[[\s\S]*?\]\)\.map\(\(tpl\)/g;
  code = code.replace(offEinRegex, "textVorlagen.filter(t => t.category === 'offerte_einleitung').map((tpl)");

  // Remove fallback for Offerte Schluss
  const offSchlussRegex = /\(textVorlagen\.filter\(t => t\.category === 'offerte_schluss'\)\.length > 0\s*\?\s*textVorlagen\.filter\(t => t\.category === 'offerte_schluss'\)\s*:\s*\[[\s\S]*?\]\)\.map\(\(tpl\)/g;
  code = code.replace(offSchlussRegex, "textVorlagen.filter(t => t.category === 'offerte_schluss').map((tpl)");

  // Remove fallback for Rechnung Einleitung
  const rechEinRegex = /\(textVorlagen\.filter\(t => t\.category === 'rechnung_einleitung'\)\.length > 0\s*\?\s*textVorlagen\.filter\(t => t\.category === 'rechnung_einleitung'\)\s*:\s*\[[\s\S]*?\]\)\.map\(\(tpl\)/g;
  code = code.replace(rechEinRegex, "textVorlagen.filter(t => t.category === 'rechnung_einleitung').map((tpl)");

  // Remove fallback for Rechnung Schluss
  const rechSchlussRegex = /\(textVorlagen\.filter\(t => t\.category === 'rechnung_schluss'\)\.length > 0\s*\?\s*textVorlagen\.filter\(t => t\.category === 'rechnung_schluss'\)\s*:\s*\[[\s\S]*?\]\)\.map\(\(tpl\)/g;
  code = code.replace(rechSchlussRegex, "textVorlagen.filter(t => t.category === 'rechnung_schluss').map((tpl)");

  fs.writeFileSync(filePath, code);
}

removeFallback(offPath);
removeFallback(rechPath);

// Seed in EinstellungenView.jsx if text_vorlagen is falsy
let einCode = fs.readFileSync(einPath, 'utf8');

const defaultTemplates = `const defaultTextVorlagen = [
  { id: 'oe_1', category: 'offerte_einleitung', label: 'Standard', text: 'Gerne unterbreiten wir Ihnen folgende Offerte:' },
  { id: 'oe_2', category: 'offerte_einleitung', label: 'Förmlich', text: 'Bezugnehmend auf unsere Besichtigung vor Ort erlauben wir uns, Ihnen folgende Offerte zu unterbreiten:' },
  { id: 'oe_3', category: 'offerte_einleitung', label: 'Persönlich', text: 'Vielen Dank für Ihre Anfrage und das entgegengebrachte Vertrauen. Gerne offerieren wir Ihnen die gewünschten Arbeiten wie folgt:' },
  { id: 'os_1', category: 'offerte_schluss', label: 'Standard', text: 'Wir danken Ihnen für das Vertrauen und stehen für Fragen gerne zur Verfügung.' },
  { id: 'os_2', category: 'offerte_schluss', label: 'Förmlich', text: 'Für die Auftragserteilung danken wir Ihnen im Voraus bestens. Bei Unklarheiten stehen wir Ihnen jederzeit gerne zur Verfügung.' },
  { id: 'os_3', category: 'offerte_schluss', label: 'Kurz', text: 'Besten Dank für Ihre Anfrage.' },
  { id: 're_1', category: 'rechnung_einleitung', label: 'Standard', text: 'Gerne unterbreiten wir Ihnen folgende Rechnung:' },
  { id: 're_2', category: 'rechnung_einleitung', label: 'Förmlich', text: 'Bezugnehmend auf unsere Besichtigung vor Ort erlauben wir uns, Ihnen folgende Rechnung zu unterbreiten:' },
  { id: 're_3', category: 'rechnung_einleitung', label: 'Persönlich', text: 'Vielen Dank für Ihre Anfrage und das entgegengebrachte Vertrauen. Gerne offerieren wir Ihnen die gewünschten Arbeiten wie folgt:' },
  { id: 'rs_1', category: 'rechnung_schluss', label: 'Standard', text: 'Wir danken Ihnen für das Vertrauen und stehen für Fragen gerne zur Verfügung.' },
  { id: 'rs_2', category: 'rechnung_schluss', label: 'Mit Gültigkeit', text: 'Diese Rechnung ist 30 Tage gültig. Materialpreisänderungen bleiben vorbehalten. Wir danken Ihnen für das Vertrauen und freuen uns auf Ihren Auftrag.' },
  { id: 'rs_3', category: 'rechnung_schluss', label: 'Ausführlich', text: 'Die Rechnung versteht sich exkl. allfälliger Gerüstkosten und bauseitiger Vorleistungen. Materialpreisänderungen bleiben vorbehalten. Nicht offerierte Arbeiten werden nach Aufwand verrechnet. Wir danken Ihnen für das Vertrauen und stehen für Fragen gerne zur Verfügung.' }
];`;

if (!einCode.includes('const defaultTextVorlagen')) {
  // Add the const outside component or just above loadSettings
  einCode = einCode.replace('useEffect(() => {', defaultTemplates + '\n\n  useEffect(() => {');
  
  // Replace the initialization logic
  const oldInit = `setSettings({ ...settings, ...data, text_vorlagen: data.text_vorlagen || [] })`;
  const newInit = `setSettings({ ...settings, ...data, text_vorlagen: data.text_vorlagen || defaultTextVorlagen })`;
  einCode = einCode.replace(oldInit, newInit);
  
  // Also seed it to DB automatically if not exists
  const oldLoad = `} else if (data) {`;
  const newLoad = `} else if (data) {
          if (!data.text_vorlagen || data.text_vorlagen.length === 0) {
            // Seed the db
            const seededSettings = { ...settings, ...data, text_vorlagen: defaultTextVorlagen };
            setSettings(seededSettings);
            // Optionally upsert back to db so it is saved
            await supabase.from('einstellungen').upsert({ id: 1, ...seededSettings });
          } else {`;
  
  einCode = einCode.replace(oldLoad, newLoad);
  // Close the else block
  einCode = einCode.replace(`setSettings({ ...settings, ...data, text_vorlagen: data.text_vorlagen || [] })`, `setSettings({ ...settings, ...data, text_vorlagen: data.text_vorlagen })
          }`);
          
  fs.writeFileSync(einPath, einCode);
}

console.log('Done!');
