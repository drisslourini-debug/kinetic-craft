const fs = require('fs');
let code = fs.readFileSync('src/views/OffertenView.jsx', 'utf8');

// Inject activeFilter state
code = code.replace(
  'const [filterStatus, setFilterStatus] = useState(\'\')',
  'const [filterStatus, setFilterStatus] = useState(\'\')\n  const [activeFilter, setActiveFilter] = useState(null)'
);

// Inject tileStats
const statsCode = `  const tileStats = useMemo(() => {
    let versendetAnz = 0, versendetTotal = 0;
    let akzeptiertAnz = 0, akzeptiertTotal = 0;
    let abgelehntAnz = 0, abgelehntTotal = 0;
    const year = new Date().getFullYear().toString();

    offerten.forEach(o => {
      if (o.is_archived) return;
      const t = parseFloat(o.total) || 0;
      if (o.status === 'Versendet') {
        versendetAnz++;
        versendetTotal += t;
      }
      if (o.created_at && o.created_at.startsWith(year)) {
        if (o.status === 'Akzeptiert' || o.status === 'Verrechnet') {
          akzeptiertAnz++;
          akzeptiertTotal += t;
        } else if (o.status === 'Abgelehnt') {
          abgelehntAnz++;
          abgelehntTotal += t;
        }
      }
    });

    return {
      versendet: { anz: versendetAnz, total: versendetTotal },
      akzeptiert: { anz: akzeptiertAnz, total: akzeptiertTotal },
      abgelehnt: { anz: abgelehntAnz, total: abgelehntTotal }
    }
  }, [offerten])

  const handleTileClick = (statusArray) => {
    const key = statusArray.join(',');
    if (activeFilter === key) {
      setActiveFilter(null);
      setFilterStatus('');
    } else {
      setActiveFilter(key);
    }
  }`;

code = code.replace(
  'const chartData = useMemo(() => {',
  statsCode + '\n\n  const chartData = useMemo(() => {'
);

// Fix filter to handle array of statuses
code = code.replace(
  '// Status filter\n    if (filterStatus && o.status !== filterStatus) return false',
  `// Status filter
    if (activeFilter) {
      const allowed = activeFilter.split(',');
      if (!allowed.includes(o.status)) return false;
    } else if (filterStatus && o.status !== filterStatus) {
      return false;
    }`
);

// Replace static boxes with Tiles
const tilesJSX = `{/* STATS KACHELN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div 
          onClick={() => handleTileClick(['Versendet'])}
          className={\`bg-surface rounded-2xl p-6 border-2 shadow-sm flex items-center justify-between cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 \${activeFilter === 'Versendet' ? 'border-amber-400 ring-4 ring-amber-400/20' : 'border-border hover:border-amber-300'}\`}
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
              <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Versendet</h3>
              {activeFilter === 'Versendet' && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase font-bold">Aktiv</span>}
            </div>
            <div className="text-3xl font-black text-text-primary mb-1">{tileStats.versendet.anz}</div>
            <div className="text-sm font-bold text-amber-600">
              CHF {formatCurrency(tileStats.versendet.total)} ausstehend
            </div>
            <div className="text-xs text-text-secondary mt-1">Warten auf Kundenentscheid</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        </div>

        <div 
          onClick={() => handleTileClick(['Akzeptiert', 'Verrechnet'])}
          className={\`bg-surface rounded-2xl p-6 border-2 shadow-sm flex items-center justify-between cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 \${activeFilter === 'Akzeptiert,Verrechnet' ? 'border-emerald-400 ring-4 ring-emerald-400/20' : 'border-border hover:border-emerald-300'}\`}
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
              <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Akzeptiert {new Date().getFullYear()}</h3>
              {activeFilter === 'Akzeptiert,Verrechnet' && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase font-bold">Aktiv</span>}
            </div>
            <div className="text-3xl font-black text-emerald-600 mb-1">{tileStats.akzeptiert.anz}</div>
            <div className="text-sm font-bold text-emerald-600">
              CHF {formatCurrency(tileStats.akzeptiert.total)} gewonnen
            </div>
            <div className="text-xs text-text-secondary mt-1">Gewonnene Aufträge {new Date().getFullYear()}</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
        </div>

        <div 
          onClick={() => handleTileClick(['Abgelehnt'])}
          className={\`bg-surface rounded-2xl p-6 border-2 shadow-sm flex items-center justify-between cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 \${activeFilter === 'Abgelehnt' ? 'border-red-400 ring-4 ring-red-400/20' : 'border-border hover:border-red-300'}\`}
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
              <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Abgelehnt {new Date().getFullYear()}</h3>
              {activeFilter === 'Abgelehnt' && <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase font-bold">Aktiv</span>}
            </div>
            <div className="text-3xl font-black text-red-600 mb-1">{tileStats.abgelehnt.anz}</div>
            <div className="text-sm font-bold text-red-600">
              CHF {formatCurrency(tileStats.abgelehnt.total)} verloren
            </div>
            <div className="text-xs text-text-secondary mt-1">Verlorene Aufträge {new Date().getFullYear()}</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
        </div>
      </div>`;

const targetBoxesBlockRegex = /<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">[\s\S]*?(?=<\/div>\s*<\/div>\s*<div className="flex flex-col sm:flex-row)/;

if (targetBoxesBlockRegex.test(code)) {
    code = code.replace(targetBoxesBlockRegex, tilesJSX + '\n\n      ');
} else {
    console.log("Could not find static boxes to replace.");
}

fs.writeFileSync('src/views/OffertenView.jsx', code);
