import { useState, useEffect, useMemo } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate, formatMonthYear } from '../lib/formatters'
import { ErrorBoundary } from '../components/ErrorBoundary'
import DocumentCreateModal from '../components/DocumentCreateModal'
import OfferteDetailView from './OfferteDetailView'

export default function OffertenView({ viewParams, onNavigate }) {
  const [parent] = useAutoAnimate()
  const [showCreateDrawer, setShowCreateDrawer] = useState(false)
  const [offerten, setOfferten] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOfferte, setSelectedOfferte] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [activeFilter, setActiveFilter] = useState(null)
  const [filterMonth, setFilterMonth] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [showFilterSheet, setShowFilterSheet] = useState(false)
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' })

  const tileStats = useMemo(() => {
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
  }

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


  useEffect(() => {
    async function fetchOfferten() {
      if (!supabase) return
      
      try {
        setIsLoading(true)
        const { data, error } = await supabase
          .from('offerten')
          .select('*, kunden(name), projekte(name, adresse)')
          .order('created_at', { ascending: false })
          
        if (error) throw error
        if (data) {
          setOfferten(data)
          if (viewParams?.offerteId && !selectedOfferte) {
            const off = data.find(x => x.id === viewParams.offerteId)
            if (off) setSelectedOfferte(off)
          }
        }
      } catch (err) {
        console.error('Error fetching offerten:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    // Listen for changes so list updates when returning from Wizard
    fetchOfferten()
    
    // Check viewParams
    if (viewParams?.action === 'create') {
      setShowCreateDrawer(true)
    }
  }, [showCreateDrawer, viewParams])


  const statusStyles = {
    'Entwurf': 'bg-gray-100 text-gray-600',
    'Versendet': 'bg-blue-100 text-blue-700',
    'In Überarbeitung': 'bg-amber-100 text-amber-700',
    'Akzeptiert': 'bg-emerald-100 text-emerald-700',
    'Abgelehnt': 'bg-red-100 text-red-700',
    'Verrechnet': 'bg-purple-100 text-purple-700',
  }
  
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
  }

  if (selectedOfferte) {
    return (
      <ErrorBoundary>
        <OfferteDetailView offerte={selectedOfferte} onBack={() => setSelectedOfferte(null)} onNavigate={onNavigate} viewParams={viewParams} />
      </ErrorBoundary>
    )
  }

  let filteredOfferten = offerten.filter(o => {
    if (!showArchived && o.is_archived) return false

    // Status filter
    if (activeFilter) {
      const allowed = activeFilter.split(',');
      if (!allowed.includes(o.status)) return false;
    } else if (filterStatus && o.status !== filterStatus) {
      return false;
    }

    // Month filter (format YYYY-MM)
    if (filterMonth) {
      const oDate = new Date(o.created_at)
      const oMonth = `${oDate.getFullYear()}-${String(oDate.getMonth() + 1).padStart(2, '0')}`
      if (oMonth !== filterMonth) return false
    }

    const term = searchTerm.toLowerCase()
    return (
      o.id.toString().includes(term) ||
      (o.kunden?.name || '').toLowerCase().includes(term) ||
      (o.projekte?.name || '').toLowerCase().includes(term)
    )
  })

  // Sorting
  filteredOfferten.sort((a, b) => {
    let aValue = a[sortConfig.key]
    let bValue = b[sortConfig.key]

    if (sortConfig.key === 'kunde') {
      aValue = a.kunden?.name || ''
      bValue = b.kunden?.name || ''
    } else if (sortConfig.key === 'projekt') {
      aValue = a.projekte?.name || ''
      bValue = b.projekte?.name || ''
    }

    if (aValue === null || aValue === undefined) aValue = ''
    if (bValue === null || bValue === undefined) bValue = ''

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  const requestSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc'
    setSortConfig({ key, direction })
  }

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <span className="text-gray-300 ml-1">↕</span>
    return sortConfig.direction === 'asc' ? <span className="text-primary-600 ml-1">↑</span> : <span className="text-primary-600 ml-1">↓</span>
  }

  // Stats calculation
  const stats = {
    total: offerten.filter(o => !o.is_archived).length,
    offen: offerten.filter(o => !o.is_archived && ['Entwurf', 'Versendet'].includes(o.status)).length,
    akzeptiert: offerten.filter(o => !o.is_archived && o.status === 'Akzeptiert').length,
  }

  // Generate month options from existing offers
  const availableMonths = [...new Set(offerten.map(o => {
    const d = new Date(o.created_at)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }))].sort().reverse()

  return (
    <>
      <div className="space-y-6">
      {/* Header with CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Offerten</h2>
          <p className="text-text-secondary mt-1">Alle Offerten und Angebote verwalten.</p>
        </div>

        {/* ★ THE TRIGGER BUTTON ★ */}
        <button
          id="btn-neue-offerte"
          onClick={() => setShowCreateDrawer(true)}
          className="inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold text-sm rounded-xl hover:from-primary-700 hover:to-primary-800 active:scale-[0.97] transition-all shadow-lg shadow-primary-600/25 cursor-pointer group"
        >
          <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-base group-hover:bg-white/30 transition-colors">+</span>
          Neue Offerte erstellen
        </button>
      </div>

      {/* Stats Cards (Desktop) */}
      <div className="hidden sm:grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div 
          onClick={() => handleTileClick(['Versendet'])}
          className={`bg-surface rounded-2xl p-6 border-2 shadow-sm flex items-center justify-between cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 ${activeFilter === 'Versendet' ? 'border-amber-400 ring-4 ring-amber-400/20' : 'border-border hover:border-amber-300'}`}
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
          className={`bg-surface rounded-2xl p-6 border-2 shadow-sm flex items-center justify-between cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 ${activeFilter === 'Akzeptiert,Verrechnet' ? 'border-emerald-400 ring-4 ring-emerald-400/20' : 'border-border hover:border-emerald-300'}`}
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
          className={`bg-surface rounded-2xl p-6 border-2 shadow-sm flex items-center justify-between cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 ${activeFilter === 'Abgelehnt' ? 'border-red-400 ring-4 ring-red-400/20' : 'border-border hover:border-red-300'}`}
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
      </div>

      {/* Stats Pills (Mobile) */}
      <div className="flex sm:hidden items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <div 
          onClick={() => handleTileClick(['Versendet'])}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 shadow-sm whitespace-nowrap cursor-pointer transition-all ${activeFilter === 'Versendet' ? 'bg-amber-100 border-amber-300' : 'bg-surface-card border-border hover:bg-surface'}`}
        >
          <div className="w-2 h-2 rounded-full bg-amber-400"></div>
          <span className={`text-sm font-medium ${activeFilter === 'Versendet' ? 'text-amber-800' : 'text-text-secondary'}`}>Versendet:</span>
          <span className={`font-bold ${activeFilter === 'Versendet' ? 'text-amber-700' : 'text-text-primary'}`}>{tileStats.versendet.anz}</span>
        </div>
        
        <div 
          onClick={() => handleTileClick(['Akzeptiert', 'Verrechnet'])}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 shadow-sm whitespace-nowrap cursor-pointer transition-all ${activeFilter === 'Akzeptiert,Verrechnet' ? 'bg-emerald-100 border-emerald-300' : 'bg-surface-card border-border hover:bg-surface'}`}
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
          <span className={`text-sm font-medium ${activeFilter === 'Akzeptiert,Verrechnet' ? 'text-emerald-800' : 'text-text-secondary'}`}>Gewonnen:</span>
          <span className={`font-bold ${activeFilter === 'Akzeptiert,Verrechnet' ? 'text-emerald-700' : 'text-text-primary'}`}>{tileStats.akzeptiert.anz}</span>
        </div>

        <div 
          onClick={() => handleTileClick(['Abgelehnt'])}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 shadow-sm whitespace-nowrap cursor-pointer transition-all ${activeFilter === 'Abgelehnt' ? 'bg-red-100 border-red-300' : 'bg-surface-card border-border hover:bg-surface'}`}
        >
          <div className="w-2 h-2 rounded-full bg-red-400"></div>
          <span className={`text-sm font-medium ${activeFilter === 'Abgelehnt' ? 'text-red-800' : 'text-text-secondary'}`}>Verloren:</span>
          <span className={`font-bold ${activeFilter === 'Abgelehnt' ? 'text-red-700' : 'text-text-primary'}`}>{tileStats.abgelehnt.anz}</span>
        </div>
      </div>

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
                  style={{ height: `${Math.max(d.createdHeight, 1)}%`, backgroundColor: '#d1d5db' }}
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    Erstellt: {formatCurrency(d.createdTotal)}
                  </div>
                </div>
                {/* Akzeptiert Bar */}
                <div 
                  className="w-full max-w-[20px] rounded-t-md transition-all duration-300 relative group-hover:bg-[#b08e4d]"
                  style={{ height: `${Math.max(d.acceptedHeight, 1)}%`, backgroundColor: '#c5a057' }}
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

      {/* Filter and Search Bar */}
      <div className="flex flex-row gap-2 items-center">
        <div className="relative flex-1 w-full">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Offerten suchen..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface-card border border-border rounded-xl text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
          />
        </div>

        {/* Desktop Filters */}
        <div className="hidden sm:flex flex-row gap-4 w-full md:w-auto items-center">
          <select 
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-surface-card border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 cursor-pointer w-40"
          >
            <option value="">Alle Status</option>
            <option value="Entwurf">Entwurf</option>
            <option value="Versendet">Versendet</option>
            <option value="In Überarbeitung">In Überarbeitung</option>
            <option value="Akzeptiert">Akzeptiert</option>
            <option value="Abgelehnt">Abgelehnt</option>
            <option value="Verrechnet">Verrechnet</option>
          </select>

          <select 
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="px-4 py-2.5 bg-surface-card border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 cursor-pointer w-40"
          >
            <option value="">Alle Monate</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>{formatMonthYear(m)}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer shrink-0 ml-1">
            <input 
              type="checkbox" 
              checked={showArchived} 
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-border text-primary-600 focus:ring-primary-500"
            />
            Archivierte einblenden
          </label>
        </div>

        {/* Mobile Filter Button */}
        <button 
          onClick={() => setShowFilterSheet(true)}
          className="sm:hidden w-11 h-11 flex items-center justify-center bg-surface-card border border-border rounded-xl text-text-secondary hover:text-text-primary hover:bg-neutral-50 active:scale-95 transition-all relative shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
          {(filterStatus || filterMonth || showArchived) && (
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary-500 rounded-full border-2 border-surface-card"></span>
          )}
        </button>
      </div>

      {/* Offerten list */}
      <div className="w-full">
        {/* Desktop header */}
        <div className="hidden lg:grid grid-cols-[100px_1.5fr_1.5fr_1fr_120px_140px_100px_100px_40px] gap-4 px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
          <span className="cursor-pointer hover:text-text-primary flex items-center" onClick={() => requestSort('id')}>Nr. <SortIcon columnKey="id" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center" onClick={() => requestSort('kunde')}>Kunde <SortIcon columnKey="kunde" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center" onClick={() => requestSort('projekt')}>Objekt <SortIcon columnKey="projekt" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center">Ausführung</span>
          <span className="cursor-pointer hover:text-text-primary flex items-center">Gültig bis</span>
          <span className="cursor-pointer hover:text-text-primary flex items-center justify-end" onClick={() => requestSort('total')}>Betrag <SortIcon columnKey="total" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center justify-center" onClick={() => requestSort('status')}>Status <SortIcon columnKey="status" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center justify-end" onClick={() => requestSort('created_at')}>Datum <SortIcon columnKey="created_at" /></span>
          <span className="sr-only">Aktionen</span>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-4 p-6 w-full animate-pulse bg-surface-card rounded-2xl border border-border shadow-sm"><div className="h-6 bg-gray-200 rounded w-1/4"></div><div className="h-20 bg-gray-200 rounded w-full"></div><div className="h-20 bg-gray-200 rounded w-full"></div></div>
        ) : filteredOfferten.length === 0 ? (
          <div className="text-center py-12 text-text-secondary bg-surface-card rounded-2xl border border-border shadow-sm">Keine Offerten gefunden.</div>
        ) : (
          <div ref={parent} className="space-y-4 lg:space-y-0 lg:bg-surface-card lg:rounded-2xl lg:border lg:border-border lg:shadow-sm">
            {filteredOfferten.map((o) => (
            <div
              key={o.id}
              onClick={() => setSelectedOfferte(o)}
              className={`flex flex-col lg:grid lg:grid-cols-[100px_1.5fr_1.5fr_1fr_120px_140px_100px_100px_40px] gap-3 lg:gap-4 p-4 lg:px-5 lg:py-3.5 bg-surface-card lg:bg-transparent rounded-2xl lg:rounded-none border border-dashed lg:border-solid border-border lg:border-x-0 lg:border-t-0 lg:border-b lg:last:border-b-0 border-l-[6px] lg:border-l-[3px] ${getBorderColor(o.status)} hover:-translate-y-1 lg:hover:-translate-y-0 hover:shadow-xl lg:hover:shadow-none lg:hover:bg-neutral-50/80 transition-all duration-200 items-start lg:items-center cursor-pointer active:scale-[0.99] lg:active:scale-100 relative group`}
            >
              <div className="flex items-center justify-between w-full lg:w-auto">
                <span className="text-sm font-mono font-bold text-primary-600">
                  {o.offerte_nr || `OF-2026-${String(o.id).padStart(3, '0')}`}
                </span>
                <span className="lg:hidden text-xs text-text-secondary">{formatDate(o.created_at)}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-base lg:text-sm font-semibold text-text-primary truncate">{o.kunden?.name || 'Unbekannt'}</span>
                <span className="text-xs lg:text-sm text-text-secondary truncate mt-0.5 lg:hidden">
                  🏗️ {o.projekte?.name || 'Kein Projekt'}
                  {o.projekte?.adresse && ` - ${o.projekte.adresse.split(',')[0]}`}
                </span>
              </div>
              
              <span className="hidden lg:block text-sm text-text-secondary truncate">
                {o.projekte?.name || 'Kein Projekt'}
                {o.projekte?.adresse && ` - ${o.projekte.adresse.split(',')[0]}`}
              </span>
              
              <span className="hidden lg:block text-sm text-text-secondary truncate">{o.daten?.ausfuehrung?.start || '-'}</span>
              <span className="hidden lg:block text-sm text-text-secondary truncate">{o.daten?.konditionen?.gueltigkeit || '-'}</span>
              
              <div className="flex items-center justify-between w-full lg:contents mt-2 lg:mt-0 pt-3 border-t border-dashed border-gray-300 lg:border-none lg:pt-0">
                <span className="text-sm font-bold text-text-primary lg:text-right">
                  {formatCurrency(o.total)}
                </span>
                <div className="lg:flex lg:justify-center lg:items-center">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium ${statusStyles[o.status] || statusStyles['Entwurf']}`}>
                    {o.status || 'Entwurf'}
                  </span>
                </div>
              </div>

              <span className="hidden lg:block text-sm text-text-secondary lg:text-right">{formatDate(o.created_at)}</span>

              {/* Chevron Icon for details (Right Arrow) */}
              <div className="hidden lg:flex items-center justify-end text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
            ))}
          </div>
        )}
      </div>
    </div>

      {/* Mobile Filter Bottom Sheet */}
      {showFilterSheet && (
        <div className="fixed inset-0 z-[100] sm:hidden flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setShowFilterSheet(false)}></div>
          <div className="bg-surface rounded-t-3xl w-full flex flex-col relative animate-slide-up pb-8 shadow-2xl">
            <div className="w-full flex justify-center pt-4 pb-2 shrink-0" onClick={() => setShowFilterSheet(false)}>
              <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
            </div>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">Filter</h3>
              <button onClick={() => setShowFilterSheet(false)} className="p-2 -mr-2 text-text-secondary hover:text-text-primary">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Status</label>
                <select 
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-card border border-border rounded-xl text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Alle Status</option>
                  <option value="Entwurf">Entwurf</option>
                  <option value="Versendet">Versendet</option>
                  <option value="In Überarbeitung">In Überarbeitung</option>
                  <option value="Akzeptiert">Akzeptiert</option>
                  <option value="Abgelehnt">Abgelehnt</option>
                  <option value="Verrechnet">Verrechnet</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Monat</label>
                <select 
                  value={filterMonth}
                  onChange={e => setFilterMonth(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-card border border-border rounded-xl text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Alle Monate</option>
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{formatMonthYear(m)}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-3 py-2 text-base text-text-primary cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showArchived} 
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="w-5 h-5 rounded border-border text-primary-600 focus:ring-primary-500"
                />
                Archivierte einblenden
              </label>
            </div>
            <div className="px-6 pt-2">
              <button 
                onClick={() => setShowFilterSheet(false)}
                className="w-full py-3.5 bg-primary-600 text-white rounded-xl font-bold text-center active:scale-[0.98] transition-transform shadow-md"
              >
                Filter anwenden
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Create Drawer */}
      {showCreateDrawer && (
        <DocumentCreateModal 
          type="offerte"
          isOpen={showCreateDrawer}
          onClose={() => setShowCreateDrawer(false)}
          onNavigate={onNavigate}
        />
      )}
    </>
  )
}

