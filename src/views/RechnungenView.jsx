import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate, formatMonthYear } from '../lib/formatters'
import { navigateBack } from '../lib/router'
import RechnungDetailView from './RechnungDetailView'
import DocumentCreateModal from '../components/DocumentCreateModal'
import { calculateRechnungStatus } from '../lib/statusLogic'
import StatCard from '../components/StatCard'

export default function RechnungenView({ onNavigate, viewParams, userRole }) {
  const [parent] = useAutoAnimate()
  const [rechnungen, setRechnungen] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRechnung, setSelectedRechnung] = useState(null)
  const [showWizard, setShowWizard] = useState(false)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' })

  const fetchRechnungen = useCallback(async () => {
    if (!supabase) return
    
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('rechnungen')
        .select('*, kunden(name), projekte(name, adresse)')
        .order('created_at', { ascending: false })
        
      if (error) throw error
      
      if (data) {
        // Auto-overdue logic
        const today = new Date()
        const updatesByStatus = {}
        
        for (const r of data) {
          const calculatedStatus = calculateRechnungStatus(r, today)
          if (calculatedStatus !== r.status) {
            r.status = calculatedStatus
            if (!updatesByStatus[calculatedStatus]) updatesByStatus[calculatedStatus] = []
            updatesByStatus[calculatedStatus].push(r.id)
          }
        }
        
        if (Object.keys(updatesByStatus).length > 0) {
          for (const [newStatus, ids] of Object.entries(updatesByStatus)) {
            await supabase.from('rechnungen').update({ status: newStatus }).in('id', ids)
          }
        }
        
        setRechnungen(data)
        if (viewParams?.rechnungId) {
          const rech = data.find(x => x.id === viewParams.rechnungId)
          if (rech) setSelectedRechnung(rech)
        }
      }
    } catch (err) {
      console.error('Error fetching rechnungen:', err)
    } finally {
      setIsLoading(false)
    }
  }, [viewParams?.rechnungId])

  useEffect(() => {
    fetchRechnungen()
  }, [fetchRechnungen])

  // Sync selectedRechnung with viewParams
  useEffect(() => {
    if (!rechnungen.length) return
    if (viewParams?.rechnungId) {
      const rech = rechnungen.find(x => x.id === viewParams.rechnungId)
      if (rech && (!selectedRechnung || selectedRechnung.id !== rech.id)) {
        setSelectedRechnung(rech)
      }
    } else if (!viewParams?.rechnungId && selectedRechnung) {
      setSelectedRechnung(null)
    }
  }, [viewParams?.rechnungId, rechnungen, selectedRechnung])

  useEffect(() => {
    if (viewParams?.action === 'create' && !selectedRechnung) {
      setShowWizard(true)
    } else if (viewParams?.action !== 'create' && showWizard) {
      setShowWizard(false)
    }
  }, [viewParams?.action, selectedRechnung, showWizard])

  const stats = useMemo(() => {
    const currentYear = new Date().getFullYear().toString()
    
    let offeneCount = 0
    let offeneTotal = 0
    let overdueCount = 0
    let overdueTotal = 0
    let bezahltCount = 0
    let bezahltTotal = 0
    
    rechnungen.forEach(r => {
      const isArchived = r.is_archived
      if (isArchived) return

      // Offene Rechnungen = Versendet oder Teilbezahlt
      if (r.status === 'Versendet' || r.status === 'Teilbezahlt') {
        offeneCount++
        offeneTotal += Math.max(0, (r.total || 0) - (r.bezahlt || 0))
      }
      
      // Überfällig = nur Status "Überfällig" oder "Gemahnt"
      if (r.status === 'Überfällig' || r.status === 'Gemahnt') {
        overdueCount++
        overdueTotal += Math.max(0, (r.total || 0) - (r.bezahlt || 0))
      }
      
      // Jahresumsatz = Echte bezahlte Beträge (ohne Ausbuchungen)
      if (r.bezahlt > 0) {
        if (r.status === 'Bezahlt') bezahltCount++
        
        const zahlungen = r.daten?.zahlungen || []
        if (zahlungen.length > 0) {
          zahlungen.forEach(z => {
            if (z.betrag > 0 && z.typ !== 'Ausbuchung') {
              if (new Date(z.datum).getFullYear().toString() === currentYear) {
                bezahltTotal += z.betrag
              }
            }
          })
        } else if (r.status === 'Bezahlt' || r.status === 'Teilbezahlt') {
          // Fallback für alte Rechnungen ohne Detailhistorie
          const rDate = r.bezahlt_am || r.rechnungsdatum || r.created_at || ''
          if (rDate.startsWith(currentYear)) {
            bezahltTotal += (r.bezahlt || 0)
          }
        }
      }
    })
    
    return {
      offeneCount, offeneTotal,
      overdueCount, overdueTotal,
      bezahltCount, bezahltTotal
    }
  }, [rechnungen])

  const chartData = useMemo(() => {
    const year = new Date().getFullYear()
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
    const monthlyTotals = Array(12).fill(0)
    
    rechnungen.forEach(r => {
      if (r.status === 'Bezahlt' && r.bezahlt_am && r.bezahlt_am.startsWith(year.toString())) {
        const monthIndex = parseInt(r.bezahlt_am.substring(5, 7), 10) - 1
        if (monthIndex >= 0 && monthIndex < 12) {
          monthlyTotals[monthIndex] += (r.total || 0)
        }
      }
    })
    
    const maxVal = Math.max(...monthlyTotals, 1000)
    
    return months.map((m, i) => ({
      month: m,
      total: monthlyTotals[i],
      height: (monthlyTotals[i] / maxVal) * 100
    }))
  }, [rechnungen])



  const statusStyles = {
    'Entwurf': 'bg-gray-100 text-gray-800 border border-gray-200',
    'Versendet': 'bg-blue-100 text-blue-800 border border-blue-200',
    'Teilbezahlt': 'bg-amber-100 text-amber-800 border border-amber-200',
    'Überfällig': 'bg-red-100 text-red-800 border border-red-200',
    'Gemahnt': 'bg-red-100 text-red-800 border border-red-200',
    'Bezahlt': 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    'Storniert': 'bg-gray-100 text-gray-600 border border-gray-200 line-through',
  }

  if (selectedRechnung) {
    return (
      <RechnungDetailView 
        rechnung={selectedRechnung} 
        onBack={() => {
          navigateBack('rechnungen')
          fetchRechnungen()
        }} 
        onNavigate={onNavigate} 
        userRole={userRole} 
      />
    )
  }

  let filteredRechnungen = rechnungen.filter(r => {
    if (!showArchived && r.is_archived) return false

    if (filterStatus && r.status !== filterStatus) return false

    if (filterMonth) {
      const rDate = new Date(r.rechnungsdatum || r.created_at)
      if (!isNaN(rDate.getTime())) {
        const rMonth = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}`
        if (rMonth !== filterMonth) return false
      }
    }

    const term = searchTerm.toLowerCase()
    return (
      (r.rechnung_nr || '').toLowerCase().includes(term) ||
      (r.kunden?.name || '').toLowerCase().includes(term) ||
      (r.projekte?.name || '').toLowerCase().includes(term)
    )
  })

  // Sorting
  filteredRechnungen.sort((a, b) => {
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

  const availableMonths = [...new Set(rechnungen.map(r => {
    const d = new Date(r.rechnungsdatum || r.created_at)
    if (isNaN(d.getTime())) return null
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }).filter(Boolean))].sort().reverse()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Rechnungen</h2>
          <p className="text-text-secondary mt-1">Rechnungen verwalten und überwachen.</p>
        </div>
        <div>
          {userRole !== 'treuhand' && (
            <button
              onClick={() => onNavigate ? onNavigate('rechnungen', { action: 'create' }) : setShowWizard(true)}
              className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-5 py-3 sm:py-2.5 min-h-[48px] bg-primary-600 text-white font-bold text-base sm:text-sm rounded-xl hover:bg-primary-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-primary-600/20 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Neue Rechnung erstellen
            </button>
          )}
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Offene Rechnungen"
          value={stats.offeneCount}
          secondaryValue={`${formatCurrency(stats.offeneTotal)} ausstehend`}
          subtitle="Status: Versendet"
          icon='<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />'
          color="amber"
          onClick={() => setFilterStatus('Versendet')}
          isActive={filterStatus === 'Versendet'}
        />

        <StatCard 
          title="Überfällig & Gemahnt"
          value={stats.overdueCount}
          secondaryValue={`${formatCurrency(stats.overdueTotal)} überfällig`}
          subtitle="Fälligkeit überschritten"
          icon='<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />'
          color="red"
          onClick={() => setFilterStatus('Überfällig')}
          isActive={filterStatus === 'Überfällig'}
        />

        <StatCard 
          title={`Jahresumsatz ${new Date().getFullYear()}`}
          value={stats.bezahltCount}
          secondaryValue={`${formatCurrency(stats.bezahltTotal)} eingenommen`}
          subtitle="Bezahlte Rechnungen"
          icon='<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />'
          color="emerald"
          onClick={() => setFilterStatus('Bezahlt')}
          isActive={filterStatus === 'Bezahlt'}
        />
      </div>

      {/* Umsatz Chart */}
      <div className="bg-surface-card rounded-2xl border border-border shadow-sm p-6">
        <h3 className="font-semibold text-text-primary mb-6">Umsatz {new Date().getFullYear()}</h3>
        <div className="flex items-end justify-between h-48 gap-2">
          {chartData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full">
              <div className="w-full h-full flex items-end justify-center relative">
                <div 
                  className="w-full max-w-[40px] rounded-t-md transition-all duration-300 relative group-hover:bg-[#b08e4d]"
                  style={{ height: `${Math.max(d.height, 1)}%`, backgroundColor: '#c5a057' }}
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    {formatCurrency(d.total)}
                  </div>
                </div>
              </div>
              <span className="text-xs text-text-secondary font-medium">{d.month}</span>
            </div>
          ))}
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
              placeholder="Rechnungen suchen nach Nummer, Kunde oder Projekt..."
              className="w-full pl-10 pr-10 py-2 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-1 rounded-md text-base leading-none transition-colors cursor-pointer"
                aria-label="Suche zurücksetzen"
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
              <option value="Bezahlt">Bezahlt</option>
              <option value="Überfällig">Überfällig</option>
              <option value="Gemahnt">Gemahnt</option>
              <option value="Storniert">Storniert</option>
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
              {filteredRechnungen.length} {filteredRechnungen.length === 1 ? 'Rechnung' : 'Rechnungen'}
            </span>
          </div>
        </div>

        {/* Mobile Filter Pills Bar */}
        <div className="flex sm:hidden items-center gap-2 px-4 py-2.5 border-b border-border bg-surface/50 overflow-x-auto scrollbar-hide touch-action-manipulation">
          {[
            { id: '', label: 'Alle' },
            { id: 'Versendet', label: 'Offen' },
            { id: 'Überfällig', label: 'Überfällig' },
            { id: 'Bezahlt', label: 'Bezahlt' },
            { id: 'Entwurf', label: 'Entwurf' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterStatus(f.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap min-h-[38px] transition-all cursor-pointer ${
                filterStatus === f.id
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-surface-card border border-border text-text-secondary active:bg-neutral-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Integrated Desktop Header */}
        <div className="hidden lg:grid grid-cols-[130px_minmax(180px,1.2fr)_minmax(180px,1.2fr)_110px_130px_110px_110px_36px] gap-3 px-5 py-3 bg-surface/60 border-b border-border text-[11px] font-bold text-text-secondary uppercase tracking-wider">
          <span className="cursor-pointer hover:text-text-primary flex items-center gap-1" onClick={() => requestSort('rechnung_nr')}>Rechnungsnr. <SortIcon columnKey="rechnung_nr" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center gap-1" onClick={() => requestSort('kunde')}>Kunde <SortIcon columnKey="kunde" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center gap-1" onClick={() => requestSort('projekt')}>Projekt <SortIcon columnKey="projekt" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center justify-end gap-1" onClick={() => requestSort('created_at')}>Erstellt am <SortIcon columnKey="created_at" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center justify-end gap-1" onClick={() => requestSort('total')}>Betrag <SortIcon columnKey="total" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center justify-center gap-1" onClick={() => requestSort('status')}>Status <SortIcon columnKey="status" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center justify-end gap-1" onClick={() => requestSort('faellig_am')}>Fällig am <SortIcon columnKey="faellig_am" /></span>
          <span className="text-right sr-only">Aktionen</span>
        </div>

        {isLoading ? (
          <div className="p-8 space-y-4">
            <div className="h-6 bg-gray-200/70 rounded w-1/4 animate-pulse"></div>
            <div className="h-12 bg-gray-200/50 rounded w-full animate-pulse"></div>
            <div className="h-12 bg-gray-200/50 rounded w-full animate-pulse"></div>
          </div>
        ) : filteredRechnungen.length === 0 ? (
          <div className="text-center py-16 px-4 text-text-secondary">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-xl">
              🧾
            </div>
            <p className="text-sm font-semibold text-text-primary">Keine Rechnungen gefunden</p>
            <p className="text-xs text-text-secondary mt-1">Passe deine Filterkriterien an oder erstelle eine neue Rechnung.</p>
          </div>
        ) : (
          <div ref={parent} className="divide-y divide-border">
            {filteredRechnungen.map((r) => (
            <div
              key={r.id}
              onClick={() => onNavigate ? onNavigate('rechnungen', { rechnungId: r.id }) : setSelectedRechnung(r)}
              className="flex flex-col lg:grid lg:grid-cols-[130px_minmax(180px,1.2fr)_minmax(180px,1.2fr)_110px_130px_110px_110px_36px] gap-3 lg:gap-3 p-4 lg:px-5 lg:py-3.5 hover:bg-primary-50/20 transition-colors items-start lg:items-center cursor-pointer border-l-4 border-l-emerald-500 group"
            >
              <div className="flex items-center justify-between w-full lg:w-auto gap-2">
                <span className="text-xs font-mono font-bold text-primary-600">
                  {r.rechnung_nr || `#${r.id}`}
                </span>
                {r.is_archived && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    📁 Archiv
                  </span>
                )}
                <span className="lg:hidden text-xs text-text-secondary ml-auto">{formatDate(r.faellig_am)}</span>
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-text-primary truncate">{r.kunden?.name || 'Unbekannt'}</span>
                <span className="text-xs text-text-secondary truncate mt-0.5 lg:hidden">
                  🏗️ {r.projekte?.name || 'Kein Projekt'}
                  {r.projekte?.adresse && ` - ${r.projekte.adresse.split(',')[0]}`}
                </span>
              </div>

              <span className="hidden lg:block text-sm text-text-secondary truncate">
                {r.projekte?.name || 'Kein Projekt'}
                {r.projekte?.adresse && ` - ${r.projekte.adresse.split(',')[0]}`}
              </span>
              
              <span className="hidden lg:block text-xs text-text-secondary lg:text-right truncate">{formatDate(r.created_at)}</span>

              <div className="flex items-center justify-between w-full lg:contents mt-2 lg:mt-0 pt-3 border-t border-dashed border-gray-200 lg:border-none lg:pt-0">
                <span className="text-sm font-bold text-text-primary lg:text-right">
                  {formatCurrency(r.total)}
                </span>
                <div className="lg:flex lg:justify-center lg:items-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusStyles[r.status] || statusStyles['Entwurf']}`}>
                    {r.status || 'Entwurf'}
                  </span>
                </div>
              </div>

              <span className="hidden lg:block text-xs text-text-secondary lg:text-right">{formatDate(r.faellig_am)}</span>

              {/* Desktop Actions (Hover Arrow) */}
              <div className="hidden lg:flex items-center justify-end text-text-secondary group-hover:text-primary-600 transition-colors">
                <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>

              {/* Mobile Action Bar */}
              <div className="flex lg:hidden w-full gap-2 mt-2 pt-2 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => onNavigate ? onNavigate('rechnungen', { rechnungId: r.id }) : setSelectedRechnung(r)}
                  className="flex-1 flex justify-center items-center gap-1.5 py-2 bg-primary-50 text-primary-700 rounded-lg text-xs font-semibold border border-primary-100 active:scale-[0.98] transition-transform"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  Details
                </button>
              </div>
            </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Mobile Floating Action Button (FAB) */}
      {userRole !== 'treuhand' && (
        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-20 sm:hidden">
          <button
            type="button"
            onClick={() => onNavigate ? onNavigate('rechnungen', { action: 'create' }) : setShowWizard(true)}
            className="w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 active:scale-90 text-white shadow-xl shadow-primary-600/35 flex items-center justify-center text-2xl font-bold transition-all touch-action-manipulation cursor-pointer"
            aria-label="Neue Rechnung erstellen"
          >
            +
          </button>
        </div>
      )}

      {showWizard && (
        <DocumentCreateModal 
          type="rechnung"
          isOpen={showWizard}
          onClose={() => {
            if (viewParams?.action === 'create') {
              navigateBack('rechnungen')
            } else {
              setShowWizard(false)
            }
          }}
          onNavigate={onNavigate}
        />
      )}
    </div>
  )
}
