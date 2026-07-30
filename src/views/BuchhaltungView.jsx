import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AusgabeCreateModal from './AusgabeCreateModal'

export default function BuchhaltungView({ onNavigate }) {
  const [ausgaben, setAusgaben] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingAusgabe, setEditingAusgabe] = useState(null)
  const [kpis, setKpis] = useState({
    einnahmen: 0,
    ausgaben: 0,
    vorsteuer: 0,
    geschuldeteMwst: 0,
    gewinn: 0
  })
  
  const currentYear = new Date().getFullYear()
  const [filterYear, setFilterYear] = useState(currentYear.toString())
  const [filterQuarter, setFilterQuarter] = useState('All') // 'All', 'Q1', 'Q2', 'Q3', 'Q4'
  const [filterCategory, setFilterCategory] = useState('')

  useEffect(() => {
    fetchBuchhaltungData()
  }, [filterYear, filterQuarter])

  const fetchBuchhaltungData = async () => {
    if (!supabase) return
    setIsLoading(true)
    
    try {
      // 1. Fetch Ausgaben for the selected year
      const startOfYear = `${filterYear}-01-01`
      const endOfYear = `${filterYear}-12-31`
      
      const { data: expenses, error: expenseError } = await supabase
        .from('ausgaben')
        .select('*, projekte(name)')
        .eq('is_archived', false)
        .gte('beleg_datum', startOfYear)
        .lte('beleg_datum', endOfYear)
        .order('beleg_datum', { ascending: false })
      
      if (expenseError) throw expenseError
      
      if (expenses) {
        setAusgaben(expenses)
      }

      // 2. Fetch Rechnungen for Einnahmen & geschuldete MwSt
      const { data: invoices, error: invoiceError } = await supabase
        .from('rechnungen')
        .select('total, konditionen, bezahlt_am, faellig_am')
        .eq('is_archived', false)
        .eq('status', 'Bezahlt')

      if (invoiceError) throw invoiceError

      let totalEinnahmen = 0
      let totalGeschuldeteMwst = 0
      
      const getQuarter = (dateStr) => {
        const month = parseInt(dateStr.split('-')[1], 10)
        return Math.ceil(month / 3)
      }
      
      const isInQuarter = (dateStr) => {
        if (!dateStr || filterQuarter === 'All') return true
        const q = getQuarter(dateStr)
        return `Q${q}` === filterQuarter
      }

      if (invoices) {
        invoices.forEach(inv => {
          const dateStr = inv.bezahlt_am || inv.faellig_am || ''
          if (dateStr.startsWith(filterYear) && isInQuarter(dateStr)) {
            const betrag = parseFloat(inv.total) || 0
            totalEinnahmen += betrag
            
            const mwstSatz = parseFloat(inv.konditionen?.mwst || 0)
            if (mwstSatz > 0) {
              const netto = betrag / (1 + (mwstSatz / 100))
              totalGeschuldeteMwst += (betrag - netto)
            }
          }
        })
      }

      // Calculate Ausgaben KPIs
      let totalAusgaben = 0
      let totalVorsteuer = 0
      
      if (expenses) {
        const qExpenses = expenses.filter(ex => isInQuarter(ex.beleg_datum))
        setAusgaben(qExpenses)
        
        qExpenses.forEach(ex => {
          if (ex.status === 'Bezahlt' || !ex.status) { // Fallback if no status
            totalAusgaben += parseFloat(ex.betrag_brutto) || 0
            totalVorsteuer += parseFloat(ex.mwst_betrag) || 0
          }
        })
      }

      setKpis({
        einnahmen: totalEinnahmen,
        ausgaben: totalAusgaben,
        vorsteuer: totalVorsteuer,
        geschuldeteMwst: totalGeschuldeteMwst,
        gewinn: totalEinnahmen - totalAusgaben
      })

    } catch (err) {
      console.error('Error fetching buchhaltung:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(val || 0)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  // Filter out data if a category is selected
  const filteredAusgaben = filterCategory 
    ? ausgaben.filter(a => a.kategorie === filterCategory)
    : ausgaben

  const categories = [...new Set(ausgaben.map(a => a.kategorie))]

  const handleExportCSV = () => {
    if (filteredAusgaben.length === 0) return alert('Keine Daten zum Exportieren')

    const headers = ['Datum', 'Titel', 'Kategorie', 'Projekt', 'Netto CHF', 'MwSt %', 'MwSt CHF', 'Brutto CHF', 'Beleg URL']
    
    const rows = filteredAusgaben.map(a => {
      return [
        formatDate(a.beleg_datum),
        `"${a.titel.replace(/"/g, '""')}"`,
        a.kategorie,
        `"${a.projekte?.name?.replace(/"/g, '""') || ''}"`,
        a.betrag_netto.toFixed(2),
        a.mwst_satz,
        a.mwst_betrag.toFixed(2),
        a.betrag_brutto.toFixed(2),
        a.beleg_url || ''
      ].join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Buchhaltung_${filterYear}_${filterQuarter}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  const handleMarkAsPaid = async (ausgabe) => {
    try {
      const { error } = await supabase
        .from('ausgaben')
        .update({ status: 'Bezahlt' })
        .eq('id', ausgabe.id)

      if (error) throw error
      fetchBuchhaltungData() // Refresh list and KPIs
    } catch (err) {
      console.error('Error marking as paid:', err)
      alert('Fehler beim Aktualisieren des Status.')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Möchtest du diese Ausgabe wirklich löschen?')) return

    try {
      const { error } = await supabase
        .from('ausgaben')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      setAusgaben(prev => prev.filter(a => a.id !== id))
      // Recalculate KPIs by re-fetching
      fetchBuchhaltungData()
    } catch (err) {
      console.error('Error deleting ausgabe:', err)
      alert('Fehler beim Löschen der Ausgabe.')
    }
  }

  const handleOpenEdit = (ausgabe) => {
    setEditingAusgabe(ausgabe)
    setIsCreateModalOpen(true)
  }

  const handleCloseModal = () => {
    setEditingAusgabe(null)
    setIsCreateModalOpen(false)
  }

  const handleSaveModal = () => {
    // Einfach die Daten neu laden, damit die KPIs und die Liste 100% stimmen.
    fetchBuchhaltungData()
    handleCloseModal()
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Buchhaltung (EAR)</h2>
          <p className="text-text-secondary mt-1">Einnahmen, Ausgaben & Gewinnermittlung auf einen Blick.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-300 font-semibold text-sm rounded-xl hover:bg-gray-50 active:scale-[0.97] transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export (CSV)
          </button>
          <button 
            onClick={() => {
              setEditingAusgabe(null)
              setIsCreateModalOpen(true)
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-semibold text-sm rounded-xl hover:bg-primary-700 active:scale-[0.97] transition-all shadow-md shadow-primary-600/20 cursor-pointer"
          >
            <span className="text-lg">+</span>
            Ausgabe erfassen
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Einnahmen {filterQuarter !== 'All' ? filterQuarter : filterYear}</p>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(kpis.einnahmen)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ausgaben {filterQuarter !== 'All' ? filterQuarter : filterYear}</p>
          <p className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(kpis.ausgaben)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gewinn {filterQuarter !== 'All' ? filterQuarter : filterYear}</p>
          <p className={`text-2xl font-bold mt-2 ${kpis.gewinn >= 0 ? 'text-primary-600' : 'text-red-600'}`}>
            {formatCurrency(kpis.gewinn)}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] bg-gradient-to-br from-white to-gray-50">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Vorsteuer Guthaben</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(kpis.vorsteuer)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] bg-gradient-to-br from-white to-gray-50">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">MwSt Schuld</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(kpis.geschuldeteMwst)}</p>
        </div>
      </div>

      {/* Filters & List */}
      <div className="bg-white border border-gray-200/60 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col min-h-[500px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/30">
          <h3 className="font-bold text-text-primary">Ausgaben / Belege</h3>
          <div className="flex gap-2">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="">Alle Kategorien</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={filterQuarter}
              onChange={e => setFilterQuarter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none font-semibold text-primary-700 bg-primary-50"
            >
              <option value="All">Ganzes Jahr</option>
              <option value="Q1">Q1 (Jan-Mär)</option>
              <option value="Q2">Q2 (Apr-Jun)</option>
              <option value="Q3">Q3 (Jul-Sep)</option>
              <option value="Q4">Q4 (Okt-Dez)</option>
            </select>
            <select
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value={currentYear.toString()}>{currentYear}</option>
              <option value={(currentYear - 1).toString()}>{currentYear - 1}</option>
              <option value={(currentYear - 2).toString()}>{currentYear - 2}</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="p-0 overflow-x-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredAusgaben.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-48 text-gray-500">
              <div className="text-3xl mb-2">🧾</div>
              <p>Keine Ausgaben in diesem Zeitraum gefunden.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                  <th className="font-semibold py-3 px-4">Datum</th>
                  <th className="font-semibold py-3 px-4">Titel</th>
                  <th className="font-semibold py-3 px-4">Kategorie</th>
                  <th className="font-semibold py-3 px-4 text-center">Status</th>
                  <th className="font-semibold py-3 px-4 text-center">Beleg</th>
                  <th className="font-semibold py-3 px-4 text-right">MwSt</th>
                  <th className="font-semibold py-3 px-4 text-right">Brutto</th>
                  <th className="font-semibold py-3 px-4 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredAusgaben.map(ausgabe => (
                  <tr key={ausgabe.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                    <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(ausgabe.beleg_datum)}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-text-primary">
                      {ausgabe.titel}
                      {ausgabe.projekte?.name && (
                        <div className="text-xs text-gray-500 font-normal mt-0.5 max-w-[150px] truncate">
                          Projekt: {ausgabe.projekte.name}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs font-medium">
                        {ausgabe.kategorie}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-center">
                      {(!ausgabe.status || ausgabe.status === 'Bezahlt') ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Bezahlt
                        </span>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            ausgabe.faellig_am && new Date(ausgabe.faellig_am) < new Date() 
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-orange-50 text-orange-700 border border-orange-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              ausgabe.faellig_am && new Date(ausgabe.faellig_am) < new Date() ? 'bg-red-500' : 'bg-orange-500'
                            }`}></span>
                            Offen
                          </span>
                          {ausgabe.faellig_am && (
                            <span className="text-[10px] text-gray-500 mt-1 font-medium">
                              bis {formatDate(ausgabe.faellig_am)}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-center">
                      {ausgabe.beleg_url ? (
                        <a 
                          href={ausgabe.beleg_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                          title="Beleg ansehen"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                        </a>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-500 whitespace-nowrap">
                      {formatCurrency(ausgabe.mwst_betrag)} <span className="text-[10px] text-gray-400 ml-1">({ausgabe.mwst_satz}%)</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-bold text-gray-900 whitespace-nowrap">
                      {formatCurrency(ausgabe.betrag_brutto)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1">
                      {ausgabe.status === 'Offen' && (
                        <button 
                          onClick={() => handleMarkAsPaid(ausgabe)}
                          className="text-gray-400 hover:text-emerald-600 transition-colors mr-2 flex items-center gap-1 bg-white border border-gray-200 px-2 py-1 rounded-lg shadow-sm hover:shadow"
                          title="Als bezahlt markieren"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          <span className="text-xs font-semibold">Bezahlt</span>
                        </button>
                      )}
                      <button 
                        onClick={() => handleOpenEdit(ausgabe)}
                        className="text-gray-400 hover:text-primary-600 transition-colors p-1"
                        title="Bearbeiten"
                      >
                        <svg className="w-5 h-5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button 
                        onClick={() => handleDelete(ausgabe.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        title="Löschen"
                      >
                        <svg className="w-5 h-5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AusgabeCreateModal 
        isOpen={isCreateModalOpen} 
        editData={editingAusgabe}
        onClose={handleCloseModal} 
        onSave={handleSaveModal} 
      />
    </div>
  )
}
