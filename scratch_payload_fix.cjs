const fs = require('fs');
const path = require('path');

const offPath = path.join(__dirname, 'src', 'components', 'OffertenWizard.jsx');
let offCode = fs.readFileSync(offPath, 'utf8');

offCode = offCode.replace(
  `daten: { ...formData, leistungen: flatLeistungen }`,
  `daten: { ...formData, einleitungstext: formData.texte?.einleitungstext || '', schlusstext: formData.texte?.schlusstext || '', leistungen: flatLeistungen }`
);

fs.writeFileSync(offPath, offCode);

const rechPath = path.join(__dirname, 'src', 'components', 'RechnungenWizard.jsx');
let rCode = fs.readFileSync(rechPath, 'utf8');

rCode = rCode.replace(
  `daten: { ...formData, leistungen: flatLeistungen }`,
  `daten: { ...formData, einleitungstext: formData.texte?.einleitungstext || '', schlusstext: formData.texte?.schlusstext || '', leistungen: flatLeistungen }`
);

fs.writeFileSync(rechPath, rCode);
console.log('Fixed payload');
