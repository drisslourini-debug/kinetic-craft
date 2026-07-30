const fs = require('fs');

let code = fs.readFileSync('src/views/OfferteDetailView.jsx', 'utf8');

// Replace standard terms
code = code.replace(/OfferteDetailView/g, 'RechnungDetailView');
code = code.replace(/OffertePrintView/g, 'RechnungPrintView');
code = code.replace(/OfferteDuplicateModal/g, 'RechnungDuplicateModal');
code = code.replace(/offerte/g, 'rechnung');
code = code.replace(/Offerte/g, 'Rechnung');
code = code.replace(/offerten/g, 'rechnungen');
code = code.replace(/Offerten/g, 'Rechnungen');

// Status Options
// Rechnungen have: Entwurf, Offen, Bezahlt, Überfällig, Storniert
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

code = code.replace(/In Rechnung umwandeln/g, 'Zahlung erfassen');
code = code.replace(/handleConvertToRechnung/g, 'handlePayment');

fs.writeFileSync('src/views/RechnungDetailView_NEW.jsx', code);
console.log('Created RechnungDetailView_NEW.jsx');
