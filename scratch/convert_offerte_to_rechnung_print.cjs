const fs = require('fs');

let code = fs.readFileSync('src/views/OffertePrintView.jsx', 'utf8');

// Replace standard terms
code = code.replace(/OffertePrintView/g, 'RechnungPrintView');
code = code.replace(/offerte/g, 'rechnung');
code = code.replace(/Offerte/g, 'Rechnung');
code = code.replace(/offerten/g, 'rechnungen');
code = code.replace(/Offerten/g, 'Rechnungen');

// Fix the title inside the print view
code = code.replace(/Rechnung #\{rechnung\.id\}/, 'Rechnung {rechnung.rechnung_nr}');

// Fix the labels in the PDF metadata table on the top right
code = code.replace(
  /<div>Rechnungs-Nr:<\/div>\s*<div className="font-medium text-right">\{rechnung\.id\}<\/div>/,
  `<div>Rechnungs-Nr:</div>
              <div className="font-medium text-right">{rechnung.rechnung_nr || rechnung.id}</div>`
);

// Date replacement
code = code.replace(
  /<div>Datum:<\/div>\s*<div className="font-medium text-right">\{formatDate\(rechnung\.created_at\)\}<\/div>/,
  `<div>Datum:</div>
              <div className="font-medium text-right">{rechnung.rechnungsdatum ? formatDate(rechnung.rechnungsdatum) : formatDate(rechnung.created_at)}</div>`
);

// Gültigkeit / Zahlungsfrist replacement
code = code.replace(
  /<div>Gültigkeit:<\/div>\s*<div className="font-medium text-right">\{daten\.konditionen\?.gueltigkeit \|\| '30 Tage'\}<\/div>/,
  `<div>Zahlungsfrist:</div>
              <div className="font-medium text-right">{rechnung.zahlungsfrist_tage || daten.konditionen?.zahlungsfrist || 30} Tage</div>`
);

// Adding QR-Slip placeholder (If it existed in old RechnungPrintView, otherwise just leave the PDF design identical)
// We will simply make it structurally identical but with correct labels.

fs.writeFileSync('src/views/RechnungPrintView_NEW.jsx', code);
console.log('Created RechnungPrintView_NEW.jsx');
