import { useState, useEffect } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/formatters'
import OfferteCreateDrawer from '../components/OfferteCreateDrawer'
import OfferteDetailView from './OfferteDetailView'

export default function OffertenView({ viewParams, onNavigate }) {
  const [parent] = useAutoAnimate()
  const [showCreateDrawer, setShowCreateDrawer] = useState(false)
  const [offerten, setOfferten] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOfferte, setSelectedOfferte] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [showFilterSheet, setShowFilterSheet] = useState(false)
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' })

  useEffect(() => {
    async function fetchOfferten() {
      if (!supabase) return
      
      try {
        setIsLoading(true)
        const { data, error } = await supabase
          .from('offerten')
          .select('*, kunden(name), projekte(name)')
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

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('de-CH', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })
  }

  const statusStyles = {
    'Entwurf': 'border-gray-400 text-gray-500',
    'Versendet': 'border-blue-500 text-blue-600',
    'In Überarbeitung': 'border-amber-500 text-amber-600',
    'Akzeptiert': 'border-emerald-500 text-emerald-600',
    'Abgelehnt': 'border-red-500 text-red-600',
    'Verrechnet': 'border-purple-500 text-purple-600',
  }

  // If detail view is open
  if (selectedOfferte) {
    return <OfferteDetailView offerte={selectedOfferte} onBack={() => setSelectedOfferte(null)} onNavigate={onNavigate} viewParams={viewParams} />
  }

  let filteredOfferten = offerten.filter(o => {
    if (!showArchived && o.is_archived) return false

    // Status filter
    if (filterStatus && o.status !== filterStatus) return false

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
      <div className="hidden sm:grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="text-text-secondary text-xs sm:text-sm font-medium mb-1">Alle Offerten</h3>
          <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
        </div>
        <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="text-text-secondary text-xs sm:text-sm font-medium mb-1">Offen (Entwurf/Versendet)</h3>
          <p className="text-2xl font-bold text-text-primary">{stats.offen}</p>
        </div>
        <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="text-text-secondary text-xs sm:text-sm font-medium mb-1">Akzeptiert</h3>
          <p className="text-2xl font-bold text-text-primary">{stats.akzeptiert}</p>
        </div>
      </div>

      {/* Stats Pills (Mobile) */}
      <div className="flex sm:hidden items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex items-center gap-2 bg-surface-card rounded-full border border-border px-4 py-2 shadow-sm whitespace-nowrap">
          <span className="text-text-secondary text-sm">Alle:</span>
          <span className="text-sm font-bold text-text-primary">{stats.total}</span>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 rounded-full border border-amber-100 px-4 py-2 shadow-sm whitespace-nowrap">
          <span className="text-amber-700 text-sm">Offen:</span>
          <span className="text-sm font-bold text-amber-800">{stats.offen}</span>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 rounded-full border border-emerald-100 px-4 py-2 shadow-sm whitespace-nowrap">
          <span className="text-emerald-700 text-sm">Akzeptiert:</span>
          <span className="text-sm font-bold text-emerald-800">{stats.akzeptiert}</span>
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
              <option key={m} value={m}>{new Date(m + '-01').toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })}</option>
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
        <div className="hidden lg:grid grid-cols-[100px_1fr_1fr_140px_100px_100px_40px] gap-4 px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
          <span className="cursor-pointer hover:text-text-primary flex items-center" onClick={() => requestSort('id')}>Nr. <SortIcon columnKey="id" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center" onClick={() => requestSort('kunde')}>Kunde <SortIcon columnKey="kunde" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center" onClick={() => requestSort('projekt')}>Objekt <SortIcon columnKey="projekt" /></span>
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
              className="flex flex-col lg:grid lg:grid-cols-[100px_1fr_1fr_140px_100px_100px_40px] gap-3 lg:gap-4 p-4 lg:px-5 lg:py-3.5 bg-surface-card lg:bg-transparent rounded-2xl lg:rounded-none border border-dashed lg:border-solid border-border lg:border-x-0 lg:border-t-0 lg:border-b lg:last:border-b-0 border-l-[6px] lg:border-l-[3px] border-l-amber-400 hover:-translate-y-1 lg:hover:-translate-y-0 hover:shadow-xl lg:hover:shadow-none lg:hover:bg-neutral-50/80 transition-all duration-200 items-start lg:items-center cursor-pointer active:scale-[0.99] lg:active:scale-100 relative group"
            >
              <div className="flex items-center justify-between w-full lg:w-auto">
                <span className="text-sm font-mono font-bold text-primary-600">
                  {o.offerte_nr || `OF-2026-${String(o.id).padStart(3, '0')}`}
                </span>
                <span className="lg:hidden text-xs text-text-secondary">{formatDate(o.created_at)}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-base lg:text-sm font-semibold text-text-primary truncate">{o.kunden?.name || 'Unbekannt'}</span>
                <span className="text-xs lg:text-sm text-text-secondary truncate mt-0.5 lg:hidden">📍 {o.projekte?.name || 'Kein Projekt'}</span>
              </div>
              
              <span className="hidden lg:block text-sm text-text-secondary truncate">{o.projekte?.name || 'Kein Projekt'}</span>
              
              <div className="flex items-center justify-between w-full lg:w-auto mt-2 lg:mt-0 pt-3 border-t border-dashed border-gray-300 lg:border-none lg:pt-0">
                <span className="text-xl font-black font-mono tracking-tight text-text-primary lg:text-right">
                  {formatCurrency(o.total)}
                </span>
                <div className="lg:flex lg:justify-center lg:items-center">
                  <span className={`inline-block px-2 lg:px-3 py-0.5 lg:py-1 border-2 -rotate-3 text-[10px] lg:text-xs font-bold uppercase tracking-widest bg-white/80 backdrop-blur-sm shadow-sm ${statusStyles[o.status] || statusStyles['Entwurf']}`}>
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
                    <option key={m} value={m}>{new Date(m + '-01').toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })}</option>
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
        <OfferteCreateDrawer 
          onClose={() => setShowCreateDrawer(false)}
          prefilledKundeId={viewParams?.kundeId}
          onSuccess={(newId) => {
            setShowCreateDrawer(false)
            onNavigate('offerten', { offerteId: newId, edit: true })
          }}
        />
      )}
    </>
  )
}

