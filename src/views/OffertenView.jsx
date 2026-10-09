import { useState, useEffect, useMemo } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate, formatMonthYear } from '../lib/formatters'
import { navigateBack } from '../lib/router'
import { useModalHistory } from '../hooks/useModalHistory'
import OfferteDetailView from './OfferteDetailView'
import DocumentCreateModal from '../components/DocumentCreateModal'
import { ErrorBoundary } from '../components/ErrorBoundary'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import { IconChart, IconDocument, IconFolder, IconBauunternehmung, IconSearch, IconClose } from '../components/icons/BrandIcons'

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
  const [showChartMobile, setShowChartMobile] = useState(false)
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' })

  useModalHistory(showFilterSheet, () => setShowFilterSheet(false), 'offerten_filter')

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
          const off = data.find(x => String(x.id) === String(viewParams.offerteId))
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
    if (viewParams?.offerteId) {
      if (viewParams.offerteId === 'demo') {
        setSelectedOfferte({
          id: 'demo',
          offerte_nr: 'OF-2026-088',
          status: 'Entwurf',
          created_at: new Date().toISOString(),
          gueltig_bis: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          total: 4895.50,
          kunden: {
            name: 'Architekturbüro Steiner AG',
            strasse: 'Limmatquai 45',
            plz: '8001',
            ort: 'Zürich',
            email: 'info@steiner-arch.ch'
          },
          projekte: {
            name: 'Sanierung Altbau Penthouse',
            adresse: 'Gotthardstrasse 18, 8002 Zürich'
          },
          daten: {
            titel: 'Schreiner- und Ausbauarbeiten Penthouse',
            einleitungstext: 'Sehr geehrte Damen und Herren,\n\nwir bedanken uns für Ihre geschätzte Anfrage und bieten Ihnen die gewünschten Massivholz- und Montagearbeiten wie folgt an:',
            schlusstext: 'Wir freuen uns auf Ihre Auftragserteilung und stehen für Fragen jederzeit gerne zur Verfügung.',
            leistungen: [
              { _id: 1, posNr: '1.0', beschreibung: 'Vorbereitungsarbeiten und Schutzabdeckungen', menge: 8, einheit: 'Std', einzelpreis: 115, optional: false },
              { _id: 2, posNr: '2.0', beschreibung: 'Massivholztüren Eiche geölt liefern und passgenau montieren', menge: 4, einheit: 'Stk', einzelpreis: 850, optional: false },
              { _id: 3, posNr: '3.0', beschreibung: 'Sockelleisten Eiche furniert zuschneiden und unsichtbar befestigen', menge: 32, einheit: 'm', einzelpreis: 28, optional: false },
              { _id: 4, posNr: '4.0', beschreibung: 'Option: Akustik-Wandpaneele Echtholzlamelle liefern & anbringen', menge: 12, einheit: 'm²', einzelpreis: 185, optional: true }
            ],
            konditionen: {
              rabatt: 3,
              mwst: 8.1,
              gueltigkeit: '30 Tage'
            }
          }
        })
        return
      }
      const off = offerten.find(x => String(x.id) === String(viewParams.offerteId))
      if (off) {
        if (!selectedOfferte || String(selectedOfferte.id) !== String(off.id)) {
          setSelectedOfferte(off)
        }
      } else if (supabase) {
        // If not found in current offerten list, fetch it directly
        supabase
          .from('offerten')
          .select('*, kunden(name), projekte(name, adresse)')
          .eq('id', viewParams.offerteId)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              setSelectedOfferte(data)
              setOfferten(prev => {
                if (prev.some(x => String(x.id) === String(data.id))) return prev
                return [data, ...prev]
              })
            }
          })
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
      {/* Mobile Header (sm:hidden) */}
      <div className="flex sm:hidden items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Offerten</h2>
          <p className="text-xs text-text-secondary mt-0.5">Offerten verwalten & überwachen</p>
        </div>
        {userRole !== 'treuhand' && (
          <button
            type="button"
            onClick={() => onNavigate ? onNavigate('offerten', { action: 'create' }) : setShowCreateDrawer(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <span className="text-sm font-bold leading-none">+</span>
            <span>Neu</span>
          </button>
        )}
      </div>

      {/* Desktop Header */}
      <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Offerten</h2>
          <p className="text-text-secondary mt-1">Alle Offerten und Angebote verwalten.</p>
        </div>

        {/* Main Action Button */}
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

      {/* 3-Column KPI Summary (Mobile sm:hidden) */}
      <div className="grid grid-cols-3 gap-2 sm:hidden">
        {/* Versendet */}
        <button
          type="button"
          onClick={() => handleTileClick(['Versendet'])}
          className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeFilter === 'Versendet' 
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20 shadow-xs' 
              : 'bg-surface-card border-border hover:bg-surface'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Versendet</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          </div>
          <p className="text-base font-extrabold text-amber-700 leading-tight">{tileStats.versendet.anz}</p>
          <p className="text-[10px] text-text-secondary truncate mt-0.5">{formatCurrency(tileStats.versendet.total)}</p>
        </button>

        {/* Gewonnen */}
        <button
          type="button"
          onClick={() => handleTileClick(['Akzeptiert', 'Verrechnet'])}
          className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeFilter === 'Akzeptiert,Verrechnet' 
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/20 shadow-xs' 
              : 'bg-surface-card border-border hover:bg-surface'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Gewonnen</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          </div>
          <p className="text-base font-extrabold text-emerald-700 leading-tight">{tileStats.akzeptiert.anz}</p>
          <p className="text-[10px] text-text-secondary truncate mt-0.5">{formatCurrency(tileStats.akzeptiert.total)}</p>
        </button>

        {/* Verloren */}
        <button
          type="button"
          onClick={() => handleTileClick(['Abgelehnt'])}
          className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
            activeFilter === 'Abgelehnt' 
              ? 'bg-red-50 border-red-300 ring-2 ring-red-400/20 shadow-xs' 
              : 'bg-surface-card border-border hover:bg-surface'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-700">Verloren</span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          </div>
          <p className="text-base font-extrabold text-red-700 leading-tight">{tileStats.abgelehnt.anz}</p>
          <p className="text-[10px] text-text-secondary truncate mt-0.5">{formatCurrency(tileStats.abgelehnt.total)}</p>
        </button>
      </div>

      {/* Stats Cards (Desktop hidden sm:grid) */}
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

      {/* Umsatz Chart (Collapsible on Mobile) */}
      <div className="bg-surface-card rounded-2xl border border-border shadow-xs overflow-hidden">
        {/* Mobile Toggle Button */}
        <button
          type="button"
          onClick={() => setShowChartMobile(!showChartMobile)}
          className="w-full sm:hidden flex items-center justify-between p-3.5 text-left text-xs font-bold text-text-primary hover:bg-surface/50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <IconChart className="w-4 h-4 text-amber-600" />
            <span>Offertenvolumen {new Date().getFullYear()}</span>
          </span>
          <span className="text-[11px] text-primary-600 font-semibold flex items-center gap-1">
            {showChartMobile ? 'Ausblenden' : 'Anzeigen'}
            <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showChartMobile ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </span>
        </button>

        {/* Chart Content */}
        <div className={`${showChartMobile ? 'block' : 'hidden sm:block'} p-4 sm:p-6 pt-0 sm:pt-6`}>
          <h3 className="hidden sm:block font-semibold text-text-primary mb-6">Offertenvolumen {new Date().getFullYear()}</h3>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="min-w-[300px] flex items-end justify-between h-40 sm:h-48 gap-1.5 sm:gap-2">
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
                  <span className="text-[11px] sm:text-xs text-text-secondary font-medium">{d.month}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-3 sm:mt-4">
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
      </div>

      {/* 2026 SaaS Datatable Card */}
      <div className="bg-surface-card rounded-2xl border border-border shadow-xs overflow-hidden">
        
        {/* Integrated Toolbar */}
        <div className="p-3 sm:p-4 border-b border-border bg-surface/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
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
              onChange={e => {
                setFilterStatus(e.target.value)
                setActiveFilter(null)
              }}
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
        </div>

        {/* Mobile Filter Pills Bar (sm:hidden) */}
        <div className="flex sm:hidden items-center gap-1.5 px-3 py-2 border-b border-border bg-surface/50">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide flex-1 touch-action-manipulation">
            {[
              { id: '', label: 'Alle' },
              { id: 'Versendet', label: 'Versendet' },
              { id: 'Akzeptiert', label: 'Akzeptiert' },
              { id: 'Entwurf', label: 'Entwurf' },
              { id: 'In Überarbeitung', label: 'Überarbeitung' },
              { id: 'Abgelehnt', label: 'Abgelehnt' },
              { id: 'Verrechnet', label: 'Verrechnet' },
            ].map((f) => {
              const isSelected = activeFilter 
                ? (f.id === '' ? false : activeFilter.split(',').includes(f.id))
                : filterStatus === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setActiveFilter(null)
                    setFilterStatus(f.id)
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap min-h-[36px] transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'bg-surface-card border border-border text-text-secondary active:bg-neutral-100'
                  }`}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
          <button 
            type="button"
            onClick={() => setShowFilterSheet(true)}
            className={`p-2 rounded-xl border flex items-center justify-center min-h-[36px] min-w-[36px] shrink-0 transition-all cursor-pointer ${
              (filterMonth || showArchived)
                ? 'bg-primary-50 border-primary-300 text-primary-700'
                : 'bg-surface-card border-border text-text-secondary hover:text-text-primary'
            }`}
            title="Erweiterte Filter"
            aria-label="Erweiterte Filter"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
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
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-xl text-primary-600">
              <IconDocument className="w-6 h-6" />
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
              className={`flex flex-col lg:grid lg:grid-cols-[120px_minmax(180px,1.2fr)_minmax(180px,1.2fr)_minmax(110px,1fr)_110px_130px_110px_110px_36px] gap-2 sm:gap-3 p-3.5 sm:p-4 lg:px-5 lg:py-3.5 hover:bg-primary-50/20 active:bg-neutral-50 transition-colors cursor-pointer border-l-4 ${getBorderColor(o.status)} group`}
            >
              {/* Mobile Card Header / Desktop Column 1 */}
              <div className="flex items-center justify-between w-full lg:w-auto">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-primary-600">
                    {o.offerte_nr || `OF-2026-${String(o.id).padStart(3, '0')}`}
                  </span>
                  {o.is_archived && (
                    <span className="lg:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <IconFolder className="w-3 h-3 text-amber-700" />
                      <span>Archiv</span>
                    </span>
                  )}
                </div>
                <span className="lg:hidden text-xs text-text-secondary">{formatDate(o.created_at)}</span>
              </div>
              
              {/* Kunde & Projekt */}
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-text-primary truncate">{o.kunden?.name || 'Unbekannt'}</span>
                <span className="text-xs text-text-secondary truncate mt-0.5 lg:hidden flex items-center gap-1">
                  <IconBauunternehmung className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  <span className="truncate">
                    {o.projekte?.name || 'Kein Projekt'}
                    {o.projekte?.adresse && ` · ${o.projekte.adresse.split(',')[0]}`}
                  </span>
                </span>
              </div>
              
              <span className="hidden lg:block text-sm text-text-secondary truncate">
                {o.projekte?.name || 'Kein Projekt'}
                {o.projekte?.adresse && ` - ${o.projekte.adresse.split(',')[0]}`}
              </span>
              
              <span className="hidden lg:block text-xs text-text-secondary truncate">{o.daten?.ausfuehrung?.start || '-'}</span>
              <span className="hidden lg:block text-xs text-text-secondary truncate">{o.daten?.konditionen?.gueltigkeit || '-'}</span>
              
              {/* Mobile Card Footer: Total, Status, Chevron */}
              <div className="flex items-center justify-between w-full lg:contents mt-1.5 lg:mt-0 pt-2 lg:pt-0 border-t border-dashed border-gray-100 lg:border-none">
                <span className="text-sm font-semibold text-text-primary lg:text-right tabular-nums">
                  {formatCurrency(o.total)}
                </span>
                <div className="flex items-center gap-2 lg:justify-center">
                  <StatusBadge status={o.is_archived ? 'Archiviert' : (o.status || 'Entwurf')} size="xs" />
                  <svg className="w-4 h-4 text-text-secondary lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>

              <span className="hidden lg:block text-xs text-text-secondary lg:text-right tabular-nums">{formatDate(o.created_at)}</span>

              {/* Chevron Icon for details (Desktop) */}
              <div className="hidden lg:flex items-center justify-end text-text-secondary group-hover:text-primary-600 transition-colors">
                <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
            ))}
          </div>
        )}
      </div>
    </div>

      {/* Mobile Filter Bottom Sheet (No drag bar, useModalHistory) */}
      {showFilterSheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg p-5 shadow-2xl border border-gray-200 animate-slide-up sm:animate-scale-in max-h-[85vh] flex flex-col">
            {/* Header with Title and explicit round close button (No drag bar!) */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <IconSearch className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold text-base text-gray-900">Filter anpassen</h3>
                {(filterStatus || filterMonth || showArchived) && (
                  <span className="text-[10px] bg-primary-50 text-primary-700 font-bold px-2 py-0.5 rounded-full border border-primary-200">
                    Aktiv
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowFilterSheet(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm transition-colors cursor-pointer"
                aria-label="Schliessen"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Status</label>
                <select 
                  value={filterStatus}
                  onChange={e => {
                    setFilterStatus(e.target.value)
                    setActiveFilter(null)
                  }}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 cursor-pointer"
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
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Monat</label>
                <select 
                  value={filterMonth}
                  onChange={e => setFilterMonth(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 cursor-pointer"
                >
                  <option value="">Alle Monate</option>
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{formatMonthYear(m)}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showArchived} 
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Archivierte Offerten einblenden</span>
              </label>
            </div>

            <div className="pt-3 border-t border-gray-100 flex gap-2">
              {(filterStatus || filterMonth || showArchived) && (
                <button 
                  type="button"
                  onClick={() => {
                    setFilterStatus('')
                    setActiveFilter(null)
                    setFilterMonth('')
                    setShowArchived(false)
                  }}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 transition-colors"
                >
                  Zurücksetzen
                </button>
              )}
              <button 
                type="button"
                onClick={() => setShowFilterSheet(false)}
                className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm text-center active:scale-[0.98] transition-all shadow-sm"
              >
                Fertig
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
          initialKundeId={viewParams?.kundeId}
          initialProjektId={viewParams?.projektId}
          onClose={() => {
            if (viewParams?.action === 'create') {
              navigateBack('offerten')
            } else {
              setShowCreateDrawer(false)
            }
          }}
          onSuccess={(newOfferte) => {
            setShowCreateDrawer(false)
            setOfferten(prev => [newOfferte, ...prev.filter(x => String(x.id) !== String(newOfferte.id))])
            setSelectedOfferte(newOfferte)
            if (onNavigate) {
              onNavigate('offerten', { offerteId: newOfferte.id, edit: true }, { replace: true })
            }
          }}
          onNavigate={onNavigate}
        />
      )}
    </>
  )
}

