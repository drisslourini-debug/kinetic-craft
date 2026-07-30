const fs = require('fs');
let code = fs.readFileSync('src/views/OffertenView.jsx', 'utf8');

const chartDataCode = `
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
  }, [offerten])
`;

code = code.replace(/(const \[sortConfig, setSortConfig\] = useState.*?;\n)/, '$1' + chartDataCode);

fs.writeFileSync('src/views/OffertenView.jsx', code);
console.log('Successfully injected chartData');
