const fs = require('fs');
let code = fs.readFileSync('src/views/OffertenView.jsx', 'utf8');

// 1. Add useMemo
code = code.replace(
  /import { useState, useEffect } from 'react'/,
  `import { useState, useEffect, useMemo } from 'react'`
);

// 2. Insert getBorderColor
code = code.replace(
  /const statusStyles = {[\s\S]*?}/,
  `$&
  
  const getBorderColor = (status) => {
    switch (status) {
      case 'Entwurf': return 'border-l-gray-400'
      case 'Versendet': return 'border-l-blue-500'
      case 'In Überarbeitung': return 'border-l-amber-500'
      case 'Akzeptiert': return 'border-l-emerald-500'
      case 'Abgelehnt': return 'border-l-red-500'
      case 'Verrechnet': return 'border-l-purple-500'
      default: return 'border-l-gray-400'
    }
  }`
);

// 3. Insert chartData logic
code = code.replace(
  /const availableMonths = \[...new Set\(offerten\.map\([\s\S]*?\}\)\)\)\]\.sort\(\)\.reverse\(\)/,
  `$&

  const chartData = useMemo(() => {
    const year = new Date().getFullYear()
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
    const createdTotals = Array(12).fill(0)
    const acceptedTotals = Array(12).fill(0)
    
    offerten.forEach(o => {
      if (!o.is_archived && o.created_at && o.created_at.startsWith(year.toString())) {
        const monthIndex = parseInt(o.created_at.substring(5, 7), 10) - 1
        if (monthIndex >= 0 && monthIndex < 12) {
          createdTotals[monthIndex] += (o.total || 0)
          if (o.status === 'Akzeptiert') {
            acceptedTotals[monthIndex] += (o.total || 0)
          }
        }
      }
    })
    
    const maxVal = Math.max(...createdTotals, ...acceptedTotals, 1000)
    
    return months.map((m, i) => ({
      month: m,
      createdTotal: createdTotals[i],
      acceptedTotal: acceptedTotals[i],
      createdHeight: (createdTotals[i] / maxVal) * 100,
      acceptedHeight: (acceptedTotals[i] / maxVal) * 100
    }))
  }, [offerten])`
);

// 4. Insert Chart UI
code = code.replace(
  /<\/div>\s*\{\/\* Filter and Search Bar \*\/\}/,
  `</div>

      {/* Umsatz Chart */}
      <div className="bg-surface-card rounded-2xl border border-border shadow-sm p-6">
        <h3 className="font-semibold text-text-primary mb-6">Offertenvolumen {new Date().getFullYear()}</h3>
        <div className="flex items-end justify-between h-48 gap-2">
          {chartData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full">
              <div className="w-full h-full flex items-end justify-center gap-1 relative">
                {/* Erstellt Bar */}
                <div 
                  className="w-full max-w-[20px] rounded-t-md transition-all duration-300 relative group-hover:bg-primary-300"
                  style={{ height: \`\${Math.max(d.createdHeight, 1)}%\`, backgroundColor: '#d1d5db' }}
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    Erstellt: {formatCurrency(d.createdTotal)}
                  </div>
                </div>
                {/* Akzeptiert Bar */}
                <div 
                  className="w-full max-w-[20px] rounded-t-md transition-all duration-300 relative group-hover:bg-[#b08e4d]"
                  style={{ height: \`\${Math.max(d.acceptedHeight, 1)}%\`, backgroundColor: '#c5a057' }}
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    Akzeptiert: {formatCurrency(d.acceptedTotal)}
                  </div>
                </div>
              </div>
              <span className="text-xs text-text-secondary font-medium">{d.month}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-300"></div>
            <span className="text-xs text-text-secondary">Erstellt</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#c5a057' }}></div>
            <span className="text-xs text-text-secondary">Akzeptiert</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}`
);

// 5. Update Table Column Name
code = code.replace(
  /<div className="hidden lg:block text-xs font-bold text-text-secondary uppercase tracking-wider">\s*OBJEKT/g,
  `<div className="hidden lg:block text-xs font-bold text-text-secondary uppercase tracking-wider">\n            PROJEKT`
);

// 6. Update row styling
code = code.replace(
  /border-l-\[6px\] lg:border-l-\[3px\] border-l-amber-400/,
  `border-l-[6px] lg:border-l-[3px] \${getBorderColor(o.status)}`
);

code = code.replace(
  /className="flex flex-col lg:grid lg:grid-cols-\[100px_1\.5fr_1\.5fr_1fr_120px_140px_100px_100px_40px\]([\s\S]*?)border-l-\[6px\]/,
  `className={\`flex flex-col lg:grid lg:grid-cols-[100px_1.5fr_1.5fr_1fr_120px_140px_100px_100px_40px]$1border-l-[6px]`
);

// Now fix the end of the class string. The original was className="flex... group"
// We need it to be className={`flex ... group ${getBorderColor(o.status)}`}
// Wait, my previous replace was:
// border-l-[6px] lg:border-l-[3px] ${getBorderColor(o.status)}
// If I change className="..." to className={`...`}, I need to find the exact closing quote.
// Let's just do it cleanly.

let classIndex = code.indexOf('className="flex flex-col lg:grid lg:grid-cols-[100px_1.5fr_1.5fr_1fr_120px_140px_100px_100px_40px]');
if (classIndex !== -1) {
  let endIndex = code.indexOf('"', classIndex + 11);
  let oldClassStr = code.substring(classIndex + 11, endIndex);
  
  // Replace border-l-amber-400
  let newClassStr = oldClassStr.replace('border-l-amber-400', '');
  
  code = code.substring(0, classIndex) + 'className={`' + newClassStr + ' ${getBorderColor(o.status)}`}' + code.substring(endIndex + 1);
}

// 7. Fix BETRAG font size
// From: className="text-xl font-black font-mono tracking-tight text-text-primary lg:text-right"
// To:   className="text-sm font-bold text-text-primary lg:text-right"
code = code.replace(
  /className="text-xl font-black font-mono tracking-tight text-text-primary lg:text-right"/g,
  `className="text-sm font-bold text-text-primary lg:text-right"`
);

// 8. One more column fix: for the mobile view: <span className="text-xs font-semibold text-text-secondary block mb-1">OBJEKT</span>
code = code.replace(
  /<span className="text-xs font-semibold text-text-secondary block mb-1">OBJEKT<\/span>/g,
  `<span className="text-xs font-semibold text-text-secondary block mb-1">PROJEKT</span>`
);

fs.writeFileSync('src/views/OffertenView.jsx', code);
console.log('OffertenView successfully patched.');
