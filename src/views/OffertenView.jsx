import { useState, useEffect, useMemo } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate, formatMonthYear } from '../lib/formatters'
import { navigateBack } from '../lib/router'
import OfferteDetailView from './OfferteDetailView'
import DocumentCreateModal from '../components/DocumentCreateModal'
import { ErrorBoundary } from '../components/ErrorBoundary'
import StatCard from '../components/StatCard'

export default function OffertenView({ onNavigate, viewParams, userRole }) {
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


  const fetchOfferten = async () => {
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
        if (viewParams?.offerteId) {
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

  useEffect(() => {
    fetchOfferten()
  }, [])

  // Sync selectedOfferte with viewParams
  useEffect(() => {
    if (!offerten.length) return
    if (viewParams?.offerteId) {
      const off = offerten.find(x => x.id === viewParams.offerteId)
      if (off && (!selectedOfferte || selectedOfferte.id !== off.id)) {
        setSelectedOfferte(off)
      }
    } else if (!viewParams?.offerteId && selectedOfferte) {
      setSelectedOfferte(null)
    }
  }, [viewParams?.offerteId, offerten, selectedOfferte])

  useEffect(() => {
    if (viewParams?.action === 'create' && !selectedOfferte) {
      setShowCreateDrawer(true)
    } else if (viewParams?.action !== 'create' && showCreateDrawer) {
      setShowCreateDrawer(false)
    }
  }, [viewParams?.action, selectedOfferte, showCreateDrawer])


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
        <OfferteDetailView 
          offerte={selectedOfferte} 
          onBack={() => {
            navigateBack('offerten')
            fetchOfferten()
          }} 
          onNavigate={onNavigate}
          userRole={userRole}
          viewParams={viewParams} 
        />
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
        {userRole !== 'treuhand' && (
          <button
            id="btn-neue-offerte"
            onClick={() => onNavigate ? onNavigate('offerten', { action: 'create' }) : setShowCreateDrawer(true)}
            className="w-full sm:w-auto inline-flex justify-center items-center gap-2.5 px-6 py-3 min-h-[48px] bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold text-base sm:text-sm rounded-xl hover:from-primary-700 hover:to-primary-800 active:scale-[0.97] transition-all shadow-lg shadow-primary-600/25 cursor-pointer group"
          >
            <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-base group-hover:bg-white/30 transition-colors">+</span>
            Neue Offerte erstellen
          </button>
        )}
      </div>

      {/* Stats Cards (Desktop) */}
      <div className="hidden sm:grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard 
          title="Versendet"
          value={tileStats.versendet.anz}
          secondaryValue={`${formatCurrency(tileStats.versendet.total)} ausstehend`}
          subtitle="Warten auf Kundenentscheid"
          icon='<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />'
          color="amber"
          onClick={() => handleTileClick(['Versendet'])}
          isActive={activeFilter === 'Versendet'}
        />

        <StatCard 
          title={`Akzeptiert ${new Date().getFullYear()}`}
          value={tileStats.akzeptiert.anz}
          secondaryValue={`${formatCurrency(tileStats.akzeptiert.total)} gewonnen`}
          subtitle={`Gewonnene Aufträge ${new Date().getFullYear()}`}
          icon='<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />'
          color="emerald"
          onClick={() => handleTileClick(['Akzeptiert', 'Verrechnet'])}
          isActive={activeFilter === 'Akzeptiert,Verrechnet'}
        />

        <StatCard 
          title={`Abgelehnt ${new Date().getFullYear()}`}
          value={tileStats.abgelehnt.anz}
          secondaryValue={`${formatCurrency(tileStats.abgelehnt.total)} verloren`}
          subtitle={`Verlorene Aufträge ${new Date().getFullYear()}`}
          icon='<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />'
          color="red"
          onClick={() => handleTileClick(['Abgelehnt'])}
          isActive={activeFilter === 'Abgelehnt'}
        />
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

      {/* 2026 SaaS Datatable Card */}
      <div className="bg-surface-card rounded-2xl border border-border shadow-xs overflow-hidden">
        
        {/* Integrated Toolbar */}
        <div className="p-4 border-b border-border bg-surface/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md w-full">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Offerten suchen..."
              className="w-full pl-10 pr-10 py-2 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-1 rounded-md text-base leading-none cursor-pointer"
                title="Suche zurücksetzen"
              >
                &times;
              </button>
            )}
          </div>

          {/* Desktop Filters */}
          <div className="hidden sm:flex flex-row gap-3 items-center">
            <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-surface border border-border rounded-xl text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 cursor-pointer w-36"
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
              className="px-3 py-2 bg-surface border border-border rounded-xl text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 cursor-pointer w-36"
            >
              <option value="">Alle Monate</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{formatMonthYear(m)}</option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer shrink-0 px-2 py-1.5 rounded-lg hover:bg-surface transition-colors">
              <input 
                type="checkbox" 
                checked={showArchived} 
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded border-border text-primary-600 focus:ring-primary-500"
              />
              Archivierte
            </label>

            <span className="text-xs text-text-secondary font-medium pl-2 border-l border-border">
              {filteredOfferten.length} {filteredOfferten.length === 1 ? 'Offerte' : 'Offerten'}
            </span>
          </div>

          {/* Mobile Filter Button */}
          <button 
            type="button"
            onClick={() => setShowFilterSheet(true)}
            className="sm:hidden w-full py-2.5 px-3 flex items-center justify-center gap-2 bg-surface border border-border rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary active:scale-95 transition-all relative shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            <span>Filter</span>
            {(filterStatus || filterMonth || showArchived) && (
              <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
            )}
          </button>
        </div>

        {/* Integrated Desktop Header inside Card */}
        <div className="hidden lg:grid grid-cols-[120px_minmax(180px,1.2fr)_minmax(180px,1.2fr)_minmax(110px,1fr)_110px_130px_110px_110px_36px] gap-3 px-5 py-3 bg-surface/60 border-b border-border text-[11px] font-bold text-text-secondary uppercase tracking-wider">
          <span className="cursor-pointer hover:text-text-primary flex items-center gap-1" onClick={() => requestSort('id')}>Nr. <SortIcon columnKey="id" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center gap-1" onClick={() => requestSort('kunde')}>Kunde <SortIcon columnKey="kunde" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center gap-1" onClick={() => requestSort('projekt')}>Objekt <SortIcon columnKey="projekt" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center gap-1">Ausführung</span>
          <span className="cursor-pointer hover:text-text-primary flex items-center gap-1">Gültig bis</span>
          <span className="cursor-pointer hover:text-text-primary flex items-center justify-end gap-1" onClick={() => requestSort('total')}>Betrag <SortIcon columnKey="total" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center justify-center gap-1" onClick={() => requestSort('status')}>Status <SortIcon columnKey="status" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center justify-end gap-1" onClick={() => requestSort('created_at')}>Datum <SortIcon columnKey="created_at" /></span>
          <span className="sr-only">Aktionen</span>
        </div>

        {isLoading ? (
          <div className="p-8 space-y-4">
            <div className="h-6 bg-gray-200/70 rounded w-1/4 animate-pulse"></div>
            <div className="h-12 bg-gray-200/50 rounded w-full animate-pulse"></div>
            <div className="h-12 bg-gray-200/50 rounded w-full animate-pulse"></div>
          </div>
        ) : filteredOfferten.length === 0 ? (
          <div className="text-center py-16 px-4 text-text-secondary">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-xl">
              📄
            </div>
            <p className="text-sm font-semibold text-text-primary">Keine Offerten gefunden</p>
            <p className="text-xs text-text-secondary mt-1">Passe deine Filterkriterien an oder erstelle eine neue Offerte.</p>
          </div>
        ) : (
          <div ref={parent} className="divide-y divide-border">
            {filteredOfferten.map((o) => (
            <div
              key={o.id}
              onClick={() => onNavigate ? onNavigate('offerten', { offerteId: o.id }) : setSelectedOfferte(o)}
              className={`flex flex-col lg:grid lg:grid-cols-[120px_minmax(180px,1.2fr)_minmax(180px,1.2fr)_minmax(110px,1fr)_110px_130px_110px_110px_36px] gap-3 lg:gap-3 p-4 lg:px-5 lg:py-3.5 hover:bg-primary-50/20 transition-colors items-start lg:items-center cursor-pointer border-l-4 ${getBorderColor(o.status)} group`}
            >
              <div className="flex items-center justify-between w-full lg:w-auto">
                <span className="text-xs font-mono font-bold text-primary-600">
                  {o.offerte_nr || `OF-2026-${String(o.id).padStart(3, '0')}`}
                </span>
                <span className="lg:hidden text-xs text-text-secondary">{formatDate(o.created_at)}</span>
              </div>
              
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-text-primary truncate">{o.kunden?.name || 'Unbekannt'}</span>
                <span className="text-xs text-text-secondary truncate mt-0.5 lg:hidden">
                  🏗️ {o.projekte?.name || 'Kein Projekt'}
                  {o.projekte?.adresse && ` - ${o.projekte.adresse.split(',')[0]}`}
                </span>
              </div>
              
              <span className="hidden lg:block text-sm text-text-secondary truncate">
                {o.projekte?.name || 'Kein Projekt'}
                {o.projekte?.adresse && ` - ${o.projekte.adresse.split(',')[0]}`}
              </span>
              
              <span className="hidden lg:block text-xs text-text-secondary truncate">{o.daten?.ausfuehrung?.start || '-'}</span>
              <span className="hidden lg:block text-xs text-text-secondary truncate">{o.daten?.konditionen?.gueltigkeit || '-'}</span>
              
              <div className="flex items-center justify-between w-full lg:contents mt-2 lg:mt-0 pt-3 border-t border-dashed border-gray-200 lg:border-none lg:pt-0">
                <span className="text-sm font-bold text-text-primary lg:text-right">
                  {formatCurrency(o.total)}
                </span>
                <div className="lg:flex lg:justify-center lg:items-center">
                  {o.is_archived ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <span>📁</span> Archiviert
                    </span>
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusStyles[o.status] || statusStyles['Entwurf']}`}>
                      {o.status || 'Entwurf'}
                    </span>
                  )}
                </div>
              </div>

              <span className="hidden lg:block text-xs text-text-secondary lg:text-right">{formatDate(o.created_at)}</span>

              {/* Chevron Icon for details (Right Arrow) */}
              <div className="hidden lg:flex items-center justify-end text-text-secondary group-hover:text-primary-600 transition-colors">
                <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
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
                  className="w-full px-4 py-3 min-h-[48px] bg-surface-card border border-border rounded-xl text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  className="w-full px-4 py-3 min-h-[48px] bg-surface-card border border-border rounded-xl text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                className="w-full py-3 min-h-[48px] bg-primary-600 text-white rounded-xl font-bold text-center active:scale-[0.98] transition-transform shadow-md text-base"
              >
                Filter anwenden
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Mobile Floating Action Button (FAB) */}
      {userRole !== 'treuhand' && (
        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-20 sm:hidden">
          <button
            type="button"
            onClick={() => onNavigate ? onNavigate('offerten', { action: 'create' }) : setShowCreateDrawer(true)}
            className="w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 active:scale-90 text-white shadow-xl shadow-primary-600/35 flex items-center justify-center text-2xl font-bold transition-all touch-action-manipulation cursor-pointer"
            aria-label="Offerte anlegen FAB"
          >
            +
          </button>
        </div>
      )}

      {/* Create Drawer */}
      {showCreateDrawer && (
        <DocumentCreateModal 
          type="offerte"
          isOpen={showCreateDrawer}
          onClose={() => {
            if (viewParams?.action === 'create') {
              navigateBack('offerten')
            } else {
              setShowCreateDrawer(false)
            }
          }}
          onNavigate={onNavigate}
        />
      )}
    </>
  )
}

