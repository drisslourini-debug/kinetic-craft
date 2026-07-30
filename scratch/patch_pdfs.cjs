const fs = require('fs');

function replaceInFile(filePath, replacements) {
  let code = fs.readFileSync(filePath, 'utf8');
  for (const r of replacements) {
    code = code.replace(r.target, r.replacement);
  }
  fs.writeFileSync(filePath, code);
}

// 1. OffertePrintView.jsx
replaceInFile('src/views/OffertePrintView.jsx', [
  {
    target: /const text1 = "Malerei Leandro Lüthi • Landoltstrasse 99 • 3007 Bern • \+41 \(0\)78 402 12 22 • leandro@atelier-77\.ch";/g,
    replacement: 'const text1 = `${settings?.firmenname || \'Malerei Leandro Lüthi\'} • ${settings?.strasse || \'Landoltstrasse 99\'} • ${settings?.plz_ort || \'3007 Bern\'} • ${settings?.telefon || \'+41 (0)78 402 12 22\'} • ${settings?.email || \'leandro@atelier-77.ch\'}`;'
  },
  {
    target: /<div style=\{\{ fontWeight: 700, color: '#1a1a1a', fontSize: '9pt' \}\}>Malerei Leandro Lüthi<\/div>/g,
    replacement: '<div style={{ fontWeight: 700, color: \'#1a1a1a\', fontSize: \'9pt\' }}>{settings?.firmenname || \'Malerei Leandro Lüthi\'}</div>'
  },
  {
    target: /Malerei Leandro Lüthi · Landoltstrasse 99 · 3007 Bern/g,
    replacement: '{settings?.firmenname || \'Malerei Leandro Lüthi\'} · {settings?.strasse || \'Landoltstrasse 99\'} · {settings?.plz_ort || \'3007 Bern\'}'
  },
  {
    target: /<div style=\{\{ fontSize: '9\.5pt', fontWeight: 600 \}\}>Leandro Lüthi<\/div>/g,
    replacement: '<div style={{ fontSize: \'9.5pt\', fontWeight: 600 }}>{settings?.firmenname || \'Leandro Lüthi\'}</div>'
  },
  {
    target: /<div style=\{\{ fontSize: '8\.5pt', color: '#888' \}\}>Malerei Leandro Lüthi – Atelier 77<\/div>/g,
    replacement: '<div style={{ fontSize: \'8.5pt\', color: \'#888\' }}>{settings?.website || \'www.atelier-77.ch\'}</div>'
  },
  {
    target: /<div>Malerei Leandro Lüthi • Landoltstrasse 99 • 3007 Bern • \+41 \(0\)78 402 12 22 • leandro@atelier-77\.ch<\/div>/g,
    replacement: '<div>{settings?.firmenname || \'Malerei Leandro Lüthi\'} • {settings?.strasse || \'Landoltstrasse 99\'} • {settings?.plz_ort || \'3007 Bern\'} • {settings?.telefon || \'+41 (0)78 402 12 22\'} • {settings?.email || \'leandro@atelier-77.ch\'}</div>'
  },
  {
    target: /Leandro Lüthi\\nMalerei Leandro Lüthi – Atelier 77/g,
    replacement: '${settings?.firmenname || \'Leandro Lüthi\'}\\n${settings?.website || \'Malerei Leandro Lüthi – Atelier 77\'}'
  }
]);

// 2. RechnungPrintView.jsx
replaceInFile('src/views/RechnungPrintView.jsx', [
  {
    target: /const text1 = "Malerei Leandro Lüthi • Landoltstrasse 99 • 3007 Bern • \+41 \(0\)78 402 12 22 • leandro@atelier-77\.ch";/g,
    replacement: 'const text1 = `${settings?.firmenname || \'Malerei Leandro Lüthi\'} • ${settings?.strasse || \'Landoltstrasse 99\'} • ${settings?.plz_ort || \'3007 Bern\'} • ${settings?.telefon || \'+41 (0)78 402 12 22\'} • ${settings?.email || \'leandro@atelier-77.ch\'}`;'
  },
  {
    target: /<div style=\{\{ fontWeight: 700, color: '#1a1a1a', fontSize: '9pt' \}\}>Malerei Leandro Lüthi<\/div>/g,
    replacement: '<div style={{ fontWeight: 700, color: \'#1a1a1a\', fontSize: \'9pt\' }}>{settings?.firmenname || \'Malerei Leandro Lüthi\'}</div>'
  },
  {
    target: /Malerei Leandro Lüthi · Landoltstrasse 99 · 3007 Bern/g,
    replacement: '{settings?.firmenname || \'Malerei Leandro Lüthi\'} · {settings?.strasse || \'Landoltstrasse 99\'} · {settings?.plz_ort || \'3007 Bern\'}'
  },
  {
    target: /<div style=\{\{ fontSize: '9\.5pt', fontWeight: 600 \}\}>Leandro Lüthi<\/div>/g,
    replacement: '<div style={{ fontSize: \'9.5pt\', fontWeight: 600 }}>{settings?.firmenname || \'Leandro Lüthi\'}</div>'
  },
  {
    target: /<div style=\{\{ fontSize: '8\.5pt', color: '#888' \}\}>Malerei Leandro Lüthi – Atelier 77<\/div>/g,
    replacement: '<div style={{ fontSize: \'8.5pt\', color: \'#888\' }}>{settings?.website || \'www.atelier-77.ch\'}</div>'
  },
  {
    target: /<div>Malerei Leandro Lüthi • Landoltstrasse 99 • 3007 Bern • \+41 \(0\)78 402 12 22 • leandro@atelier-77\.ch<\/div>/g,
    replacement: '<div>{settings?.firmenname || \'Malerei Leandro Lüthi\'} • {settings?.strasse || \'Landoltstrasse 99\'} • {settings?.plz_ort || \'3007 Bern\'} • {settings?.telefon || \'+41 (0)78 402 12 22\'} • {settings?.email || \'leandro@atelier-77.ch\'}</div>'
  },
  {
    target: /Leandro Lüthi\\nMalerei Leandro Lüthi – Atelier 77/g,
    replacement: '${settings?.firmenname || \'Leandro Lüthi\'}\\n${settings?.website || \'Malerei Leandro Lüthi – Atelier 77\'}'
  }
]);

// 3. wordGenerator.js
replaceInFile('src/lib/wordGenerator.js', [
  {
    target: /'Malerei Leandro Lüthi · Landoltstrasse 99 · 3007 Bern'/g,
    replacement: '`${settings?.firmenname || \'Malerei Leandro Lüthi\'} · ${settings?.strasse || \'Landoltstrasse 99\'} · ${settings?.plz_ort || \'3007 Bern\'}`'
  },
  {
    target: /new TextRun\(\{ text: 'Leandro Lüthi', bold: true \}\)/g,
    replacement: 'new TextRun({ text: settings?.firmenname || \'Leandro Lüthi\', bold: true })'
  },
  {
    target: /new TextRun\(\{ text: 'Malerei Leandro Lüthi – Atelier 77', color: '888888', size: 17 \}\)/g,
    replacement: 'new TextRun({ text: settings?.website || \'Malerei Leandro Lüthi – Atelier 77\', color: \'888888\', size: 17 })'
  }
]);

// 4. rechnungWordGenerator.js
replaceInFile('src/lib/rechnungWordGenerator.js', [
  {
    target: /'Malerei Leandro Lüthi · Landoltstrasse 99 · 3007 Bern'/g,
    replacement: '`${settings?.firmenname || \'Malerei Leandro Lüthi\'} · ${settings?.strasse || \'Landoltstrasse 99\'} · ${settings?.plz_ort || \'3007 Bern\'}`'
  },
  {
    target: /new TextRun\(\{ text: 'Leandro Lüthi', bold: true \}\)/g,
    replacement: 'new TextRun({ text: settings?.firmenname || \'Leandro Lüthi\', bold: true })'
  },
  {
    target: /new TextRun\(\{ text: 'Malerei Leandro Lüthi – Atelier 77', color: '888888', size: 17 \}\)/g,
    replacement: 'new TextRun({ text: settings?.website || \'Malerei Leandro Lüthi – Atelier 77\', color: \'888888\', size: 17 })'
  }
]);

console.log('PDFs patched.');
