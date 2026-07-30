const fs = require('fs');
let code = fs.readFileSync('src/views/ProjekteView.jsx', 'utf8');
code = code.replace(/\{getSortIcon\('([^']+)'\)\}/g, '<SortIcon columnKey="$1" />');
fs.writeFileSync('src/views/ProjekteView.jsx', code);
console.log('Fixed SortIcon');
