const fs = require('fs');

const path = 'src/views/RechnungDetailView.jsx';
let code = fs.readFileSync(path, 'utf8');

// Replace using regex for the Schlusstext buttons to ignore encoding variations
const oldSchlussRegex = /\[\s*\{\s*label:\s*'Standard'[\s\S]*?\}\s*\]\.map\(\(tpl\)/;

const newSchlussBtns = `(textVorlagen.filter(t => t.category === 'rechnung_schluss').length > 0 
                            ? textVorlagen.filter(t => t.category === 'rechnung_schluss')
                            : [
                                { label: 'Standard', text: 'Wir danken Ihnen für das Vertrauen und stehen für Fragen gerne zur Verfügung.' },
                                { label: 'Mit Gültigkeit', text: 'Diese Rechnung ist 30 Tage gültig. Materialpreisänderungen bleiben vorbehalten. Wir danken Ihnen für das Vertrauen und freuen uns auf Ihren Auftrag.' },
                                { label: 'Ausführlich', text: 'Die Rechnung versteht sich exkl. allfälliger Gerüstkosten und bauseitiger Vorleistungen. Materialpreisänderungen bleiben vorbehalten. Nicht offerierte Arbeiten werden nach Aufwand verrechnet. Wir danken Ihnen für das Vertrauen und stehen für Fragen gerne zur Verfügung.' },
                              ]).map((tpl)`;

if (oldSchlussRegex.test(code)) {
  code = code.replace(oldSchlussRegex, newSchlussBtns);
  fs.writeFileSync(path, code);
  console.log('Successfully updated RechnungDetailView.jsx with dynamic templates loading (Schlusstext).');
} else {
  console.log('Could not find Schlusstext search string with regex.');
}
