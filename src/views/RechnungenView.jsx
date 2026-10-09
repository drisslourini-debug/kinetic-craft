import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate, formatMonthYear } from '../lib/formatters'
import { navigateBack } from '../lib/router'
import { useModalHistory } from '../hooks/useModalHistory'
import RechnungDetailView from './RechnungDetailView'
import DocumentCreateModal from '../components/DocumentCreateModal'
import BankabgleichModal from '../components/banking/BankabgleichModal'
import { calculateRechnungStatus } from '../lib/statusLogic'
import { getMahnVorschlag } from '../lib/mahnwesenHelper'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import { IconBank, IconChart, IconQrBill, IconFolder, IconBauunternehmung, IconSearch, IconClose, IconCheck, IconWarning } from '../components/icons/BrandIcons'

export default function RechnungenView({ onNavigate, viewParams, userRole }) {
  const [parent] = useAutoAnimate()
  const [rechnungen, setRechnungen] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRechnung, setSelectedRechnung] = useState(null)
  const [showWizard, setShowWizard] = useState(false)
  const [isBankabgleichOpen, setIsBankabgleichOpen] = useState(false)
  const [toast, setToast] = useState(null)
  
  const showToast = (type, text) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 4000)
  }

  const handleBankabgleichSuccess = ({ count, totalAmount }) => {
    showToast('success', `${count} ${count === 1 ? 'Rechnung' : 'Rechnungen'} über ${formatCurrency(totalAmount)} erfolgreich abgeglichen & verbucht!`)
    fetchRechnungen()
  }
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [showFilterSheet, setShowFilterSheet] = useState(false)
  const [showChartMobile, setShowChartMobile] = useState(false)
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' })

  useModalHistory(showFilterSheet, () => setShowFilterSheet(false), 'rechnungen_filter')

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
          const rech = data.find(x => String(x.id) === String(viewParams.rechnungId))
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
    if (viewParams?.rechnungId) {
      if (viewParams.rechnungId === 'demo') {
        setSelectedRechnung({
          id: 'demo',
          rechnung_nr: 'RE-2026-142',
          status: 'Entwurf',
          created_at: new Date().toISOString(),
          faellig_am: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          total: 5240.85,
          bezahlt: 0,
          kunden: {
            name: 'Eleni & Marc Widmer',
            strasse: 'Sonnenrain 9',
            plz: '8610',
            ort: 'Uster',
            email: 'widmer.uster@bluewin.ch'
          },
          projekte: {
            name: 'Küchenumbau & Schreinerarbeiten',
            adresse: 'Sonnenrain 9, 8610 Uster'
          },
          daten: {
            titel: 'Ausführung Küchenumbau & Einbauschränke',
            einleitungstext: 'Sehr geehrte Familie Widmer,\n\nwir bedanken uns für das Vertrauen und stellen Ihnen die ausgeführten Arbeiten wie folgt in Rechnung:',
            schlusstext: 'Zahlbar innert 30 Tagen auf unser Schweizer PostFinance Konto. Vielen Dank für Ihren geschätzten Auftrag!',
            leistungen: [
              { _id: 1, posNr: '1.0', beschreibung: 'Demontage und Entsorgung der bestehenden Schrankfronten', menge: 6, einheit: 'h', einzelpreis: 110, optional: false },
              { _id: 2, posNr: '2.0', beschreibung: 'Einbaumöbel auf Mass mit Soft-Close Beschlägen montieren', menge: 1, einheit: 'Pauschal', einzelpreis: 3600, optional: false },
              { _id: 3, posNr: '3.0', beschreibung: 'Abschlussleisten und Passstücke millimetergenau einpassen', menge: 14, einheit: 'm', einzelpreis: 42, optional: false },
              { _id: 4, posNr: '4.0', beschreibung: 'Oberflächenreinigung und Endabnahme', menge: 2.5, einheit: 'h', einzelpreis: 110, optional: false }
            ],
            konditionen: {
              rabatt: 2,
              mwst: 8.1,
              zahlungsfrist: 30
            }
          }
        })
        return
      }
      const rech = rechnungen.find(x => String(x.id) === String(viewParams.rechnungId))
      if (rech) {
        if (!selectedRechnung || String(selectedRechnung.id) !== String(rech.id)) {
          setSelectedRechnung(rech)
        }
      } else if (supabase && !isNaN(Number(viewParams.rechnungId))) {
        supabase
          .from('rechnungen')
          .select('*, kunden(name), projekte(name, adresse)')
          .eq('id', Number(viewParams.rechnungId))
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              setSelectedRechnung(data)
              setRechnungen(prev => {
                if (prev.some(x => String(x.id) === String(data.id))) return prev
                return [data, ...prev]
              })
            }
          })
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
    let mahnwesenCount = 0
    let mahnstoppCount = 0
    let stufe1Count = 0
    let stufe2Count = 0
    let stufe3Count = 0
    let betreibungCount = 0
    
    rechnungen.forEach(r => {
      const isArchived = r.is_archived
      if (isArchived) return

      // Offene Rechnungen = Versendet oder Teilbezahlt
      if (r.status === 'Versendet' || r.status === 'Teilbezahlt') {
        offeneCount++
        offeneTotal += Math.max(0, (r.total || 0) - (r.bezahlt || 0))
      }
      
      // Überfällig = nur Status "Überfällig" oder "Gemahnt"
      if (r.status === 'Überfällig' || r.status === 'Gemahnt' || (r.daten?.mahnstufe > 0)) {
        overdueCount++
        overdueTotal += Math.max(0, (r.total || 0) - (r.bezahlt || 0))
        mahnwesenCount++

        if (r.daten?.mahnstopp) {
          mahnstoppCount++
        } else {
          const v = getMahnVorschlag(r)
          if (v.status === 'betreibung_bereit') {
            betreibungCount++
          } else if (v.naechsteStufe === 3) {
            stufe3Count++
          } else if (v.naechsteStufe === 2) {
            stufe2Count++
          } else {
            stufe1Count++
          }
        }
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
      bezahltCount, bezahltTotal,
      mahnwesenCount, mahnstoppCount,
      stufe1Count, stufe2Count, stufe3Count, betreibungCount
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

  const isMahnwesenActive = filterStatus === 'Mahnwesen' || 
    filterStatus === 'Überfällig' || 
    filterStatus?.startsWith('Mahnung') || 
    filterStatus === 'Betreibung' || 
    filterStatus === 'Mahnstopp'

  const statusStyles = {
    'Entwurf': 'bg-gray-100 text-gray-800 border border-gray-200',
    'Versendet': 'bg-blue-100 text-blue-800 border border-blue-200',
    'Teilbezahlt': 'bg-amber-100 text-amber-800 border border-amber-200',
    'Überfällig': 'bg-red-100 text-red-800 border border-red-200',
    'Gemahnt': 'bg-red-100 text-red-800 border border-red-200',
    'Bezahlt': 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    'Storniert': 'bg-gray-100 text-gray-600 border border-gray-200 line-through',
  }

  const getBorderColor = (status) => {
    switch (status) {
      case 'Entwurf': return 'border-l-gray-400'
      case 'Versendet': return 'border-l-blue-500'
      case 'Teilbezahlt': return 'border-l-amber-500'
      case 'Überfällig':
      case 'Gemahnt': return 'border-l-red-500'
      case 'Bezahlt': return 'border-l-emerald-500'
      case 'Storniert': return 'border-l-gray-300'
      default: return 'border-l-gray-400'
    }
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
        viewParams={viewParams}
      />
    )
  }

  let filteredRechnungen = rechnungen.filter(r => {
    if (!showArchived && r.is_archived) return false

    if (filterStatus === 'Mahnwesen') {
      if (r.status !== 'Überfällig' && r.status !== 'Gemahnt' && !r.daten?.mahnstufe) return false
    } else if (filterStatus === 'Mahnstopp') {
      if (!r.daten?.mahnstopp) return false
    } else if (filterStatus === 'Mahnung_1') {
      if (r.daten?.mahnstopp) return false
      const v = getMahnVorschlag(r)
      if (v.naechsteStufe !== 1) return false
    } else if (filterStatus === 'Mahnung_2') {
      if (r.daten?.mahnstopp) return false
      const v = getMahnVorschlag(r)
      if (v.naechsteStufe !== 2) return false
    } else if (filterStatus === 'Mahnung_3') {
      if (r.daten?.mahnstopp) return false
      const v = getMahnVorschlag(r)
      if (v.naechsteStufe !== 3) return false
    } else if (filterStatus === 'Betreibung') {
      if (r.daten?.mahnstopp) return false
      const v = getMahnVorschlag(r)
      if (v.status !== 'betreibung_bereit') return false
    } else if (filterStatus && r.status !== filterStatus) {
      return false
    }

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
    <>
      <div className="space-y-6">
      {/* Mobile Header (sm:hidden) */}
      <div className="flex sm:hidden flex-col gap-2.5">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Rechnungen</h2>
          <p className="text-xs text-text-secondary mt-0.5">Rechnungen verwalten & überwachen</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setIsBankabgleichOpen(true)}
            className="py-2.5 px-3 bg-white border border-border text-text-primary font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            title="Schweizer Bankauszug (camt.054 / camt.053) einlesen"
          >
            <IconBank className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="truncate">Bankabgleich</span>
          </button>
          {userRole !== 'treuhand' && (
            <button
              type="button"
              onClick={() => onNavigate ? onNavigate('rechnungen', { action: 'create' }) : setShowWizard(true)}
              className="py-2.5 px-3 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <span className="text-sm font-bold leading-none">+</span>
              <span className="truncate">Neue Rechnung</span>
            </button>
          )}
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Rechnungen</h2>
          <p className="text-text-secondary mt-1">Rechnungen verwalten und überwachen.</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setIsBankabgleichOpen(true)}
            className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-4 py-3 sm:py-2.5 min-h-[48px] sm:min-h-[44px] bg-white border border-border text-text-primary font-bold text-sm rounded-xl hover:bg-neutral-50 hover:border-sky-500 hover:text-sky-600 active:scale-[0.98] transition-all shadow-xs cursor-pointer"
            title="Schweizer Bankauszug (camt.054 / camt.053) einlesen und Zahlungen automatisch zuordnen"
          >
            <IconBank className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Bankabgleich (camt)</span>
          </button>
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

      {/* 3-Column KPI Summary (Mobile sm:hidden) */}
      <div className="grid grid-cols-3 gap-2 sm:hidden">
        {/* Offen */}
        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'Versendet' ? '' : 'Versendet')}
          className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === 'Versendet' 
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20 shadow-xs' 
              : 'bg-surface-card border-border hover:bg-surface'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Offen</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          </div>
          <p className="text-base font-extrabold text-amber-700 leading-tight">{stats.offeneCount}</p>
          <p className="text-[10px] text-text-secondary truncate mt-0.5">{formatCurrency(stats.offeneTotal)}</p>
        </button>

        {/* Überfällig */}
        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'Überfällig' ? '' : 'Überfällig')}
          className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === 'Überfällig' 
              ? 'bg-red-50 border-red-300 ring-2 ring-red-400/20 shadow-xs' 
              : 'bg-surface-card border-border hover:bg-surface'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-700">Überfällig</span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          </div>
          <p className="text-base font-extrabold text-red-700 leading-tight">{stats.overdueCount}</p>
          <p className="text-[10px] text-text-secondary truncate mt-0.5">{formatCurrency(stats.overdueTotal)}</p>
        </button>

        {/* Bezahlt */}
        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'Bezahlt' ? '' : 'Bezahlt')}
          className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === 'Bezahlt' 
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/20 shadow-xs' 
              : 'bg-surface-card border-border hover:bg-surface'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Bezahlt</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          </div>
          <p className="text-base font-extrabold text-emerald-700 leading-tight">{stats.bezahltCount}</p>
          <p className="text-[10px] text-text-secondary truncate mt-0.5">{formatCurrency(stats.bezahltTotal)}</p>
        </button>
      </div>

      {/* Dashboard Cards (Desktop hidden sm:grid) */}
      <div className="hidden sm:grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Offene Rechnungen"
          value={stats.offeneCount}
          secondaryValue={`${formatCurrency(stats.offeneTotal)} ausstehend`}
          subtitle="Status: Versendet"
          icon='<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />'
          color="amber"
          onClick={() => setFilterStatus(filterStatus === 'Versendet' ? '' : 'Versendet')}
          isActive={filterStatus === 'Versendet'}
        />

        <StatCard 
          title="Mahnwesen (Überfällig)"
          value={stats.overdueCount}
          secondaryValue={`${formatCurrency(stats.overdueTotal)} überfällig`}
          subtitle={stats.mahnstoppCount > 0 ? `${stats.mahnstoppCount} mit Mahnstopp` : "Fälligkeit überschritten"}
          icon='<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />'
          color="red"
          onClick={() => setFilterStatus(filterStatus === 'Mahnwesen' || filterStatus === 'Überfällig' ? '' : 'Mahnwesen')}
          isActive={isMahnwesenActive}
        />

        <StatCard 
          title={`Jahresumsatz ${new Date().getFullYear()}`}
          value={stats.bezahltCount}
          secondaryValue={`${formatCurrency(stats.bezahltTotal)} eingenommen`}
          subtitle="Bezahlte Rechnungen"
          icon='<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />'
          color="emerald"
          onClick={() => setFilterStatus(filterStatus === 'Bezahlt' ? '' : 'Bezahlt')}
          isActive={filterStatus === 'Bezahlt'}
        />
      </div>

      {/* Umsatz Chart (Collapsible on Mobile & Desktop, auto-collapsed during Mahnwesen mode) */}
      {!isMahnwesenActive && (
        <div className="bg-surface-card rounded-2xl border border-border shadow-xs overflow-hidden">
          {/* Toggle Header Button */}
          <button
            type="button"
            onClick={() => setShowChartMobile(!showChartMobile)}
            className="w-full flex items-center justify-between p-3.5 sm:px-6 sm:py-3.5 text-left text-xs sm:text-sm font-bold text-text-primary hover:bg-surface/50 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <IconChart className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Umsatz {new Date().getFullYear()}</span>
            </span>
            <span className="text-[11px] sm:text-xs text-primary-600 font-semibold flex items-center gap-1.5">
              <span>{showChartMobile ? 'Ausblenden' : 'Anzeigen'}</span>
              <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showChartMobile ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </span>
          </button>

          {/* Chart Content */}
          <div className={`${showChartMobile ? 'block' : 'hidden sm:block'} p-4 sm:p-6 pt-0 sm:pt-4 border-t border-border/40`}>
            <h3 className="hidden sm:block font-semibold text-text-primary mb-6">Umsatz {new Date().getFullYear()}</h3>
            <div className="overflow-x-auto scrollbar-hide">
              <div className="min-w-[300px] flex items-end justify-between h-40 sm:h-48 gap-1.5 sm:gap-2">
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
                    <span className="text-[11px] sm:text-xs text-text-secondary font-medium">{d.month}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2026 SaaS Datatable Card */}
      <div className="bg-surface-card rounded-2xl border border-border shadow-xs overflow-hidden">
        
        {/* Schweizer Mahnwesen Cockpit Panel (Integrated directly above table) */}
        {isMahnwesenActive && (
          <div className="bg-gradient-to-r from-rose-50/90 via-white to-amber-50/40 border-b border-rose-200/80 p-4 sm:p-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-2xs border border-rose-200">
                  <IconWarning className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-rose-950">Schweizer Mahnwesen Cockpit</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                      {stats.mahnwesenCount} {stats.mahnwesenCount === 1 ? 'Mahnfall' : 'Mahnfälle'}
                    </span>
                  </div>
                  <p className="text-xs text-rose-800/80 mt-0.5">
                    Gesamthaft <span className="font-bold text-rose-950">{formatCurrency(stats.overdueTotal)}</span> ausstehend · Fälligkeiten überwachen & Mahnstufen nach OR Art. 102 ff. steuern
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFilterStatus('')}
                className="self-start sm:self-auto px-3 py-1.5 bg-white hover:bg-neutral-50 text-text-secondary hover:text-text-primary text-xs font-semibold rounded-xl border border-border shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="Mahnwesen-Filter zurücksetzen und alle Rechnungen anzeigen"
              >
                <span>Alle Rechnungen</span>
                <span className="text-sm leading-none">&times;</span>
              </button>
            </div>

            {/* Mahnstufen Tabs */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-100/90">
              <span className="text-xs font-bold text-rose-900/80 uppercase tracking-wider pl-1">
                Mahnstufen:
              </span>
              <button
                type="button"
                onClick={() => setFilterStatus('Mahnwesen')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === 'Mahnwesen'
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-white/90 border border-rose-200/80 text-text-primary hover:bg-white'
                }`}
              >
                Alle Mahnfälle ({stats.mahnwesenCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus(filterStatus === 'Mahnung_1' ? 'Mahnwesen' : 'Mahnung_1')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterStatus === 'Mahnung_1'
                    ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-400/30'
                    : 'bg-amber-50/80 text-amber-900 border border-amber-200/80 hover:bg-amber-100/70'
                }`}
              >
                <span>🟡 Erinnerung ({stats.stufe1Count})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus(filterStatus === 'Mahnung_2' ? 'Mahnwesen' : 'Mahnung_2')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterStatus === 'Mahnung_2'
                    ? 'bg-orange-600 text-white shadow-xs ring-2 ring-orange-400/30'
                    : 'bg-orange-50/80 text-orange-900 border border-orange-200/80 hover:bg-orange-100/70'
                }`}
              >
                <span>🟠 1. Mahnung ({stats.stufe2Count})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus(filterStatus === 'Mahnung_3' ? 'Mahnwesen' : 'Mahnung_3')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterStatus === 'Mahnung_3'
                    ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-400/30'
                    : 'bg-rose-50/80 text-rose-900 border border-rose-200/80 hover:bg-rose-100/70'
                }`}
              >
                <span>🔴 Letzte Mahnung ({stats.stufe3Count})</span>
              </button>
              {stats.betreibungCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterStatus(filterStatus === 'Betreibung' ? 'Mahnwesen' : 'Betreibung')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterStatus === 'Betreibung'
                      ? 'bg-red-700 text-white shadow-xs ring-2 ring-red-400'
                      : 'bg-red-100 text-red-950 border border-red-300 hover:bg-red-200'
                  }`}
                >
                  <span>🚨 Betreibung bereit ({stats.betreibungCount})</span>
                </button>
              )}
              {stats.mahnstoppCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterStatus(filterStatus === 'Mahnstopp' ? 'Mahnwesen' : 'Mahnstopp')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterStatus === 'Mahnstopp'
                      ? 'bg-amber-700 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  <span>⏸️ Mahnstopp ({stats.mahnstoppCount})</span>
                </button>
              )}
            </div>
          </div>
        )}

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
              value={filterStatus?.startsWith('Mahnung') || filterStatus === 'Betreibung' || filterStatus === 'Mahnstopp' ? 'Mahnwesen' : filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-surface border border-border rounded-xl text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 cursor-pointer w-40"
            >
              <option value="">Alle Status</option>
              <option value="Mahnwesen">Mahnwesen ({stats.mahnwesenCount})</option>
              <option value="Entwurf">Entwurf</option>
              <option value="Versendet">Versendet</option>
              <option value="Bezahlt">Bezahlt</option>
              <option value="Überfällig">Überfällig</option>
              <option value="Gemahnt">Gemahnt</option>
              <option value="Mahnstopp">Mahnstopp</option>
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

        {/* Mobile Filter Pills Bar & Filter Button (sm:hidden) */}
        <div className="flex sm:hidden items-center gap-1.5 px-3 py-2 border-b border-border bg-surface/50">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide flex-1 touch-action-manipulation">
            {[
              { id: '', label: 'Alle' },
              { id: 'Mahnwesen', label: `Mahnwesen (${stats.mahnwesenCount})` },
              { id: 'Versendet', label: 'Offen' },
              { id: 'Überfällig', label: 'Überfällig' },
              { id: 'Bezahlt', label: 'Bezahlt' },
              { id: 'Teilbezahlt', label: 'Teilbezahlt' },
              { id: 'Entwurf', label: 'Entwurf' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterStatus(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap min-h-[36px] transition-all cursor-pointer ${
                  (filterStatus === f.id || (f.id === 'Mahnwesen' && isMahnwesenActive))
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-surface-card border border-border text-text-secondary active:bg-neutral-100'
                }`}
              >
                {f.label}
              </button>
            ))}
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

        {/* Integrated Desktop Header */}
        <div className="hidden lg:grid grid-cols-[125px_minmax(170px,1.2fr)_minmax(170px,1.1fr)_100px_120px_130px_105px_110px] gap-3 px-5 py-3 bg-surface/60 border-b border-border text-[11px] font-bold text-text-secondary uppercase tracking-wider items-center">
          <span className="cursor-pointer hover:text-text-primary flex items-center gap-1" onClick={() => requestSort('rechnung_nr')}>Rechnungsnr. <SortIcon columnKey="rechnung_nr" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center gap-1" onClick={() => requestSort('kunde')}>Kunde <SortIcon columnKey="kunde" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center gap-1" onClick={() => requestSort('projekt')}>Projekt <SortIcon columnKey="projekt" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center justify-end gap-1" onClick={() => requestSort('created_at')}>Erstellt am <SortIcon columnKey="created_at" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center justify-end gap-1" onClick={() => requestSort('total')}>Betrag <SortIcon columnKey="total" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center justify-center gap-1" onClick={() => requestSort('status')}>Status <SortIcon columnKey="status" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center justify-end gap-1" onClick={() => requestSort('faellig_am')}>Fällig am <SortIcon columnKey="faellig_am" /></span>
          <span className="text-right flex items-center justify-end">Aktion</span>
        </div>

        {isLoading ? (
          <div className="p-8 space-y-4">
            <div className="h-6 bg-gray-200/70 rounded w-1/4 animate-pulse"></div>
            <div className="h-12 bg-gray-200/50 rounded w-full animate-pulse"></div>
            <div className="h-12 bg-gray-200/50 rounded w-full animate-pulse"></div>
          </div>
        ) : filteredRechnungen.length === 0 ? (
          <div className="text-center py-16 px-4 text-text-secondary">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-xl text-primary-600">
              <IconQrBill className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-text-primary">Keine Rechnungen gefunden</p>
            <p className="text-xs text-text-secondary mt-1">Passe deine Filterkriterien an oder erstelle eine neue Rechnung.</p>
          </div>
        ) : (
          <div ref={parent} className="divide-y divide-border">
            {filteredRechnungen.map((r) => {
              const mahnVorschlag = (r.status === 'Überfällig' || r.status === 'Gemahnt' || r.daten?.mahnstufe > 0) ? getMahnVorschlag(r) : null
              const isBetreibungReady = mahnVorschlag?.status === 'betreibung_bereit'
              const isOverdue = r.status === 'Überfällig' || r.status === 'Gemahnt' || r.daten?.mahnstufe > 0

              return (
                <div
                  key={r.id}
                  onClick={() => onNavigate ? onNavigate('rechnungen', { rechnungId: r.id }) : setSelectedRechnung(r)}
                  className={`flex flex-col lg:grid lg:grid-cols-[125px_minmax(170px,1.2fr)_minmax(170px,1.1fr)_100px_120px_130px_105px_110px] gap-2 sm:gap-3 p-3.5 sm:p-4 lg:px-5 lg:py-3.5 hover:bg-primary-50/20 active:bg-neutral-50 transition-colors cursor-pointer border-l-4 ${getBorderColor(r.status)} group items-start lg:items-center`}
                >
                  {/* Mobile Card Header / Desktop Col 1 */}
                  <div className="flex items-center justify-between w-full lg:w-auto gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-mono font-bold text-primary-600 truncate">
                        {r.rechnung_nr || `#${r.id}`}
                      </span>
                      {r.is_archived && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                          <IconFolder className="w-2.5 h-2.5 text-amber-700" />
                          <span>Archiv</span>
                        </span>
                      )}
                    </div>
                    <span className={`lg:hidden text-[11px] font-medium shrink-0 ${isOverdue ? 'text-red-600 font-bold' : 'text-text-secondary'}`}>
                      {r.faellig_am ? `Fällig: ${formatDate(r.faellig_am)}` : formatDate(r.created_at)}
                    </span>
                  </div>

                  {/* Col 2: Kunde */}
                  <div className="flex flex-col min-w-0 w-full lg:w-auto" title={r.kunden?.name || ''}>
                    <span className="text-sm font-semibold text-text-primary truncate">{r.kunden?.name || 'Unbekannt'}</span>
                    <span className="text-xs text-text-secondary truncate mt-0.5 lg:hidden flex items-center gap-1">
                      <IconBauunternehmung className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      <span className="truncate">
                        {r.projekte?.name || 'Kein Projekt'}
                        {r.projekte?.adresse && ` · ${r.projekte.adresse.split(',')[0]}`}
                      </span>
                    </span>
                  </div>

                  {/* Col 3: Projekt (Desktop) */}
                  <span className="hidden lg:block text-sm text-text-secondary truncate" title={r.projekte?.name ? `${r.projekte.name}${r.projekte?.adresse ? ` - ${r.projekte.adresse}` : ''}` : ''}>
                    {r.projekte?.name || 'Kein Projekt'}
                    {r.projekte?.adresse && ` - ${r.projekte.adresse.split(',')[0]}`}
                  </span>
                  
                  {/* Col 4: Erstellt am (Desktop) */}
                  <span className="hidden lg:block text-xs text-text-secondary lg:text-right tabular-nums truncate">
                    {formatDate(r.created_at)}
                  </span>

                  {/* Mobile Footer / Desktop Col 5 & Col 6 */}
                  <div className="flex items-center justify-between w-full lg:contents mt-1.5 lg:mt-0 pt-2 lg:pt-0 border-t border-dashed border-gray-100 lg:border-none">
                    {/* Desktop Col 5: Betrag */}
                    <div className="flex flex-col lg:items-end lg:justify-center">
                      <span className="text-sm font-semibold text-text-primary lg:text-right tabular-nums">
                        {formatCurrency(r.total)}
                      </span>
                      {r.bezahlt > 0 && r.status !== 'Bezahlt' && (
                        <span className="text-[10px] text-amber-700 font-medium tabular-nums">
                          ({formatCurrency(r.bezahlt)} bez.)
                        </span>
                      )}
                    </div>

                    {/* Desktop Col 6: Status */}
                    <div className="flex items-center gap-1.5 lg:justify-center flex-wrap">
                      <StatusBadge status={r.status || 'Entwurf'} size="xs" />
                      {r.daten?.mahnstopp ? (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          ⏸️ Stopp
                        </span>
                      ) : r.daten?.mahnstufe > 0 ? (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          Stufe {r.daten.mahnstufe}
                        </span>
                      ) : null}

                      {/* Mobile Mahnen Button */}
                      {isOverdue && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (onNavigate) {
                              onNavigate('rechnungen', { rechnungId: r.id, openMahnung: true })
                            } else {
                              setSelectedRechnung(r)
                            }
                          }}
                          className={`lg:hidden px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all active:scale-95 flex items-center gap-1 shadow-2xs cursor-pointer ${
                            isBetreibungReady
                              ? 'bg-red-600 text-white'
                              : 'bg-rose-50 text-rose-700 border border-rose-300'
                          }`}
                        >
                          <span>{isBetreibungReady ? '🚨 Betreiben' : 'Mahnen'}</span>
                          <span className="text-xs">→</span>
                        </button>
                      )}
                      <svg className="w-4 h-4 text-text-secondary lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </div>

                  {/* Col 7: Fällig am (Desktop) */}
                  <span className={`hidden lg:block text-xs lg:text-right tabular-nums truncate ${isOverdue ? 'font-bold text-rose-600' : 'text-text-secondary'}`}>
                    {formatDate(r.faellig_am)}
                  </span>

                  {/* Col 8: Aktion (Desktop) */}
                  <div className="hidden lg:flex items-center justify-end">
                    {isBetreibungReady ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onNavigate) {
                            onNavigate('rechnungen', { rechnungId: r.id, openMahnung: true })
                          } else {
                            setSelectedRechnung(r)
                          }
                        }}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap group/btn"
                        title="SchKG Betreibungsbegehren einleiten"
                      >
                        <span>🚨 Betreiben</span>
                        <svg className="w-3 h-3 text-white/80 group-hover/btn:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ) : isOverdue ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onNavigate) {
                            onNavigate('rechnungen', { rechnungId: r.id, openMahnung: true })
                          } else {
                            setSelectedRechnung(r)
                          }
                        }}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300/80 shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap group/btn"
                        title={mahnVorschlag?.vorschlagText ? `Mahnung erstellen: ${mahnVorschlag.vorschlagText}` : 'Mahnung erstellen & versenden'}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
                        <span>Mahnen</span>
                        <svg className="w-3 h-3 text-rose-600 group-hover/btn:translate-x-0.5 transition-transform shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted group-hover:text-primary-600 transition-colors opacity-0 group-hover:opacity-100">
                        <span>Details</span>
                        <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Mobile Filter Bottom Sheet (No drag bar, useModalHistory) */}
      {showFilterSheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg p-5 shadow-2xl border border-gray-200 animate-slide-up sm:animate-scale-in max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <IconSearch className="w-5 h-5 text-primary-600 shrink-0" />
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
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 cursor-pointer"
                >
                  <option value="">Alle Status</option>
                  <option value="Entwurf">Entwurf</option>
                  <option value="Versendet">Versendet</option>
                  <option value="Bezahlt">Bezahlt</option>
                  <option value="Überfällig">Überfällig</option>
                  <option value="Gemahnt">Gemahnt</option>
                  <option value="Storniert">Storniert</option>
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
                <span className="text-sm font-medium text-gray-700">Archivierte Rechnungen einblenden</span>
              </label>
            </div>

            <div className="pt-3 border-t border-gray-100 flex gap-2">
              {(filterStatus || filterMonth || showArchived) && (
                <button 
                  type="button"
                  onClick={() => {
                    setFilterStatus('')
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
          initialKundeId={viewParams?.kundeId}
          initialProjektId={viewParams?.projektId}
          initialRechnungTyp={viewParams?.rechnungTyp || (viewParams?.action === 'create_schluss' ? 'schluss' : (viewParams?.action === 'create_akonto' ? 'akonto' : 'standard'))}
          onClose={() => {
            if (viewParams?.action === 'create') {
              navigateBack('rechnungen')
            } else {
              setShowWizard(false)
            }
          }}
          onSuccess={(newRechnung) => {
            setShowWizard(false)
            setRechnungen(prev => [newRechnung, ...prev.filter(x => String(x.id) !== String(newRechnung.id))])
            setSelectedRechnung(newRechnung)
            if (onNavigate) {
              onNavigate('rechnungen', { rechnungId: newRechnung.id, edit: true }, { replace: true })
            }
          }}
          onNavigate={onNavigate}
        />
      )}

      {isBankabgleichOpen && (
        <BankabgleichModal
          isOpen={isBankabgleichOpen}
          onClose={() => setIsBankabgleichOpen(false)}
          onSuccess={handleBankabgleichSuccess}
          invoices={rechnungen}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in pointer-events-none">
          <div className={`px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold flex items-center gap-3 ${
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'
          }`}>
            {toast.type === 'success' ? <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" /> : <IconWarning className="w-4 h-4 text-red-600 shrink-0" />}
            <span>{toast.text}</span>
          </div>
        </div>
      )}
    </>
  )
}
