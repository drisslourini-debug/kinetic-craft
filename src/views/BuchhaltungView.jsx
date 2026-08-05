import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate, formatCurrency } from '../lib/formatters'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import AusgabeCreateModal from './AusgabeCreateModal'

export default function BuchhaltungView({ onNavigate, userRole }) {
  const [ausgaben, setAusgaben] = useState([])
  const [einnahmen, setEinnahmen] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
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
        .select('id, rechnungsnummer, total, konditionen, daten, status, projekt_id, projekte(name)')
        .eq('is_archived', false)
        .in('status', ['Bezahlt', 'Teilbezahlt'])

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
        const filteredInvoices = []
        invoices.forEach(inv => {
          const zahlungen = inv.daten?.zahlungen || []
          let match = false
          
          zahlungen.forEach(z => {
            // Nur echte Zahlungen (keine Ausbuchungen/Skonto-Abschreibungen) berücksichtigen
            if (z.betrag > 0 && z.typ !== 'Ausbuchung') {
              if (z.datum && z.datum.startsWith(filterYear) && isInQuarter(z.datum)) {
                totalEinnahmen += z.betrag
                match = true
                
                // MwSt Anteil aus dieser spezifischen Teilzahlung berechnen
                let mwstSatzNum = 0;
                if (inv.konditionen?.mwst) {
                  // Fallback falls MwSt als String z.B. "8.1" oder "8.1% (Standard)" gespeichert ist
                  const parsed = parseFloat(inv.konditionen.mwst);
                  if (!isNaN(parsed)) mwstSatzNum = parsed;
                } else if (inv.daten?.konditionen?.mwst) {
                  const parsed = parseFloat(inv.daten.konditionen.mwst);
                  if (!isNaN(parsed)) mwstSatzNum = parsed;
                }

                if (mwstSatzNum > 0) {
                  const nettoAnteil = z.betrag / (1 + (mwstSatzNum / 100))
                  totalGeschuldeteMwst += (z.betrag - nettoAnteil)
                }
              }
            }
          })
          if (match) filteredInvoices.push(inv)
        })
        setEinnahmen(filteredInvoices)
      }

      // Calculate Ausgaben KPIs
      let totalAusgaben = 0
      let totalVorsteuer = 0
      
      if (expenses) {
        // Filter ausgaben by Quarter based on beleg_datum
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


  // Filter out data if a category is selected
  const filteredAusgaben = filterCategory 
    ? ausgaben.filter(a => a.kategorie === filterCategory)
    : ausgaben

  const categories = [...new Set(ausgaben.map(a => a.kategorie))]

  const handleExportZIP = async () => {
    if (filteredAusgaben.length === 0 && einnahmen.length === 0) return alert('Keine Daten zum Exportieren')
    
    setIsExporting(true)
    try {
      const zip = new JSZip()

      // --- AUSGABEN CSV ---
      if (filteredAusgaben.length > 0) {
        const ausgabenHeaders = ['Datum', 'Titel', 'Kategorie', 'Projekt', 'Netto CHF', 'MwSt %', 'MwSt CHF', 'Brutto CHF', 'Beleg URL']
        const ausgabenRows = filteredAusgaben.map(a => {
          return [
            formatDate(a.beleg_datum),
            `"${a.titel.replace(/"/g, '""')}"`,
            `"${a.kategorie}"`,
            `"${a.projekte?.name?.replace(/"/g, '""') || ''}"`,
            a.betrag_netto.toFixed(2),
            a.mwst_satz,
            a.mwst_betrag.toFixed(2),
            a.betrag_brutto.toFixed(2),
            a.beleg_url || ''
          ].join(',')
        })
        const ausgabenCsv = [ausgabenHeaders.join(','), ...ausgabenRows].join('\n')
        zip.file('Ausgaben.csv', '\uFEFF' + ausgabenCsv) // Add BOM for Excel
      }

      // --- EINNAHMEN CSV ---
      if (einnahmen.length > 0) {
        const einnahmenHeaders = ['Rechnungsnummer', 'Status', 'Projekt', 'Total CHF']
        const einnahmenRows = einnahmen.map(r => {
          return [
            r.rechnungsnummer || r.id,
            r.status,
            `"${r.projekte?.name?.replace(/"/g, '""') || ''}"`,
            r.total
          ].join(',')
        })
        const einnahmenCsv = [einnahmenHeaders.join(','), ...einnahmenRows].join('\n')
        zip.file('Einnahmen.csv', '\uFEFF' + einnahmenCsv)
      }

      // --- BELEGE (PDF/JPG) ---
      const belegeFolder = zip.folder('Belege')
      for (const a of filteredAusgaben) {
        if (a.beleg_url) {
          try {
            const response = await fetch(a.beleg_url)
            const blob = await response.blob()
            const ext = a.beleg_url.split('.').pop().split('?')[0] || 'pdf'
            const safeTitle = a.titel.replace(/[^a-z0-9]/gi, '_').toLowerCase()
            belegeFolder.file(`Beleg_${a.beleg_datum}_${safeTitle}.${ext}`, blob)
          } catch (e) {
            console.error('Fehler beim Download des Belegs:', a.beleg_url, e)
          }
        }
      }

      // --- ZIP GENERIEREN & DOWNLOAD ---
      const content = await zip.generateAsync({ type: 'blob' })
      saveAs(content, `Treuhand_Export_${filterYear}_${filterQuarter}.zip`)
      
    } catch (error) {
      console.error('Export Fehler:', error)
      alert('Fehler beim Erstellen des ZIP-Exports.')
    } finally {
      setIsExporting(false)
    }
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
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button 
            onClick={handleExportZIP}
            disabled={isExporting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 min-h-[48px] bg-white text-gray-700 border border-gray-300 font-semibold text-base sm:text-sm rounded-xl hover:bg-gray-50 active:scale-[0.97] transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isExporting ? (
              <svg className="animate-spin w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            )}
            {isExporting ? 'Exportiere ZIP...' : 'Treuhand-ZIP Export'}
          </button>
          {userRole !== 'treuhand' && (
            <button 
              onClick={() => {
                setEditingAusgabe(null)
                setIsCreateModalOpen(true)
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 min-h-[48px] bg-primary-600 text-white font-semibold text-base sm:text-sm rounded-xl hover:bg-primary-700 active:scale-[0.97] transition-all shadow-md shadow-primary-600/20 cursor-pointer"
            >
              <span className="text-lg">+</span>
              Ausgabe erfassen
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Tile 1: Einnahmen */}
        <div className="bg-surface-card rounded-2xl border border-border p-4 shadow-sm relative overflow-hidden group">
          <svg className="absolute -right-4 -bottom-4 w-20 h-20 text-emerald-100 opacity-60 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-text-secondary text-[11px] font-semibold uppercase tracking-wider truncate">Einnahmen</h3>
            </div>
            <p className="text-xl font-bold text-emerald-600 truncate">{formatCurrency(kpis.einnahmen)}</p>
            <div className="text-[10px] text-text-secondary mt-1">{filterQuarter !== 'All' ? filterQuarter : filterYear}</div>
          </div>
        </div>

        {/* Tile 2: Ausgaben */}
        <div className="bg-surface-card rounded-2xl border border-border p-4 shadow-sm relative overflow-hidden group">
          <svg className="absolute -right-4 -bottom-4 w-20 h-20 text-red-100 opacity-60 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              </div>
              <h3 className="text-text-secondary text-[11px] font-semibold uppercase tracking-wider truncate">Ausgaben</h3>
            </div>
            <p className="text-xl font-bold text-red-600 truncate">{formatCurrency(kpis.ausgaben)}</p>
            <div className="text-[10px] text-text-secondary mt-1">{filterQuarter !== 'All' ? filterQuarter : filterYear}</div>
          </div>
        </div>

        {/* Tile 3: Gewinn */}
        <div className="bg-surface-card rounded-2xl border border-border p-4 shadow-sm relative overflow-hidden group">
          <svg className="absolute -right-4 -bottom-4 w-20 h-20 text-primary-100 opacity-60 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </div>
              <h3 className="text-text-secondary text-[11px] font-semibold uppercase tracking-wider truncate">Gewinn</h3>
            </div>
            <p className={`text-xl font-bold truncate ${kpis.gewinn >= 0 ? 'text-primary-600' : 'text-red-600'}`}>{formatCurrency(kpis.gewinn)}</p>
            <div className="text-[10px] text-text-secondary mt-1">{filterQuarter !== 'All' ? filterQuarter : filterYear}</div>
          </div>
        </div>

        {/* Tile 4: Vorsteuer */}
        <div className="bg-surface-card rounded-2xl border border-border p-4 shadow-sm relative overflow-hidden group">
          <svg className="absolute -right-4 -bottom-4 w-20 h-20 text-gray-100 opacity-60 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg>
              </div>
              <h3 className="text-text-secondary text-[11px] font-semibold uppercase tracking-wider truncate">Vorsteuer</h3>
            </div>
            <p className="text-xl font-bold text-gray-900 truncate">{formatCurrency(kpis.vorsteuer)}</p>
            <div className="text-[10px] text-text-secondary mt-1">Guthaben</div>
          </div>
        </div>

        {/* Tile 5: MwSt Schuld */}
        <div className="bg-surface-card rounded-2xl border border-border p-4 shadow-sm relative overflow-hidden group">
          <svg className="absolute -right-4 -bottom-4 w-20 h-20 text-amber-100 opacity-60 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
              </div>
              <h3 className="text-text-secondary text-[11px] font-semibold uppercase tracking-wider truncate">MwSt Schuld</h3>
            </div>
            <p className="text-xl font-bold text-gray-900 truncate">{formatCurrency(kpis.geschuldeteMwst)}</p>
            <div className="text-[10px] text-text-secondary mt-1">Zu zahlen</div>
          </div>
        </div>
      </div>

      {/* Filters & List */}
      <div className="bg-white border border-gray-200/60 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col min-h-[500px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/30">
          <h3 className="font-bold text-text-primary">Ausgaben / Belege</h3>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="w-full sm:w-auto px-3 py-3 sm:py-1.5 min-h-[48px] sm:min-h-0 border border-gray-300 rounded-lg text-base sm:text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="">Alle Kategorien</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={filterQuarter}
              onChange={e => setFilterQuarter(e.target.value)}
              className="w-full sm:w-auto px-3 py-3 sm:py-1.5 min-h-[48px] sm:min-h-0 border border-gray-300 rounded-lg text-base sm:text-sm focus:ring-2 focus:ring-primary-500 outline-none font-semibold text-primary-700 bg-primary-50"
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
              className="w-full sm:w-auto px-3 py-3 sm:py-1.5 min-h-[48px] sm:min-h-0 border border-gray-300 rounded-lg text-base sm:text-sm focus:ring-2 focus:ring-primary-500 outline-none"
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
                  {userRole !== 'treuhand' && <th className="font-semibold py-3 px-4 text-right">Aktionen</th>}
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
                          className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
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
                    {userRole !== 'treuhand' && (
                    <td className="py-3 px-4 text-sm text-right whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1">
                      {ausgabe.status === 'Offen' && (
                        <button 
                          onClick={() => handleMarkAsPaid(ausgabe)}
                          className="text-gray-400 hover:text-emerald-600 transition-colors mr-2 flex items-center gap-1 bg-white border border-gray-200 px-3 py-2 min-h-[48px] rounded-lg shadow-sm hover:shadow cursor-pointer"
                          title="Als bezahlt markieren"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          <span className="text-sm font-semibold">Bezahlt</span>
                        </button>
                      )}
                      <button 
                        onClick={() => handleOpenEdit(ausgabe)}
                        className="text-gray-400 hover:text-primary-600 transition-colors p-3 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg hover:bg-primary-50 cursor-pointer"
                        title="Bearbeiten"
                      >
                        <svg className="w-5 h-5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button 
                        onClick={() => handleDelete(ausgabe.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-3 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg hover:bg-red-50 cursor-pointer"
                        title="Löschen"
                      >
                        <svg className="w-5 h-5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                    )}
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
