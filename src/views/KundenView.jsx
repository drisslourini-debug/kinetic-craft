import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { supabase } from '../lib/supabase'
import { formatDate, formatCurrency } from '../lib/formatters'
import { navigateBack } from '../lib/router'
import KundeDetailView from './KundeDetailView'
import KundeCreateModal from './KundeCreateModal'
import KundePreviewDrawer from '../components/kunde/KundePreviewDrawer'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import { IconFolder, IconTeam, IconLocation, IconWarning, IconCheck, IconEye, IconPlus } from '../components/icons/BrandIcons'

export default function KundenView({ onNavigate, viewParams, userRole }) {
  const [parent] = useAutoAnimate()
  const [kunden, setKunden] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedKunde, setSelectedKunde] = useState(null)
  const [previewKunde, setPreviewKunde] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [activeFilterPill, setActiveFilterPill] = useState('all') // 'all' | 'b2b' | 'b2c' | 'open'
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [archiveConfirmKunde, setArchiveConfirmKunde] = useState(null)
  const [feedbackToast, setFeedbackToast] = useState(null)
  
  // Sort state
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')

  const showToast = (type, text) => {
    setFeedbackToast({ type, text })
    setTimeout(() => setFeedbackToast(null), 3500)
  }

  const fetchKundenData = useCallback(async () => {
    if (!supabase) {
      setError('Supabase nicht konfiguriert (Fehlende API Keys).')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)

      const [kundenRes, projekteRes, rechnungenRes, offertenRes] = await Promise.allSettled([
        supabase.from('kunden').select('*').order('name', { ascending: true }),
        supabase.from('projekte').select('id, name, status, kunde_id, created_at, startdatum, projekt_nr').eq('is_archived', false),
        supabase.from('rechnungen').select('id, rechnung_nr, total, bezahlt, status, faellig_am, bezahlt_am, created_at, kunde_id').eq('is_archived', false),
        supabase.from('offerten').select('id, offerte_nr, total, status, created_at, kunde_id').eq('is_archived', false)
      ])

      if (kundenRes.status === 'rejected' || kundenRes.value.error) {
        throw kundenRes.value?.error || kundenRes.reason
      }

      const rawKunden = kundenRes.value.data || []

      // Group projects by customer
      const projekteByKunde = {}
      if (projekteRes.status === 'fulfilled' && projekteRes.value.data) {
        projekteRes.value.data.forEach(p => {
          if (p.kunde_id) {
            if (!projekteByKunde[p.kunde_id]) projekteByKunde[p.kunde_id] = []
            projekteByKunde[p.kunde_id].push(p)
          }
        })
      }

      // Group invoices by customer
      const rechnungenByKunde = {}
      if (rechnungenRes.status === 'fulfilled' && rechnungenRes.value.data) {
        rechnungenRes.value.data.forEach(r => {
          if (r.kunde_id) {
            if (!rechnungenByKunde[r.kunde_id]) rechnungenByKunde[r.kunde_id] = []
            rechnungenByKunde[r.kunde_id].push(r)
          }
        })
      }

      // Group offerten by customer
      const offertenByKunde = {}
      if (offertenRes.status === 'fulfilled' && offertenRes.value.data) {
        offertenRes.value.data.forEach(o => {
          if (o.kunde_id) {
            if (!offertenByKunde[o.kunde_id]) offertenByKunde[o.kunde_id] = []
            offertenByKunde[o.kunde_id].push(o)
          }
        })
      }

      // Enrich customer data with real financials & metrics
      const enrichedKunden = rawKunden.map(k => {
        const pList = projekteByKunde[k.id] || []
        const rList = rechnungenByKunde[k.id] || []
        const oList = offertenByKunde[k.id] || []

        const aktiveProjekteCount = pList.filter(p => p.status === 'In Arbeit').length

        let totalUmsatz = 0
        let offenTotal = 0
        let ueberfaelligTotal = 0
        let ueberfaelligCount = 0

        rList.forEach(r => {
          totalUmsatz += (r.bezahlt || 0)
          const remaining = Math.max(0, (r.total || 0) - (r.bezahlt || 0))
          if (['Überfällig', 'Gemahnt'].includes(r.status) && remaining > 0) {
            ueberfaelligTotal += remaining
            ueberfaelligCount++
            offenTotal += remaining
          } else if (['Versendet', 'Teilbezahlt'].includes(r.status) && remaining > 0) {
            offenTotal += remaining
          }
        })

        const isB2B = Boolean(k.firmenname) || (k.typ && k.typ !== 'Privatperson')
        const isZefixVerified = Boolean(
          k.notizen?.toLowerCase().includes('zefix') || 
          k.notizen?.toLowerCase().includes('handelsregister') ||
          (isB2B && k.firmenname)
        )

        // Payment duration average calculation
        let zahlungsmoral
        if (ueberfaelligCount > 0) {
          zahlungsmoral = {
            label: `${ueberfaelligCount} überfällig`,
            score: 'Warnung',
            isWarning: true
          }
        } else if (rList.length > 0) {
          let paidWithDates = 0
          let totalDays = 0
          rList.forEach(r => {
            if (r.bezahlt > 0 && r.bezahlt_am && (r.faellig_am || r.created_at)) {
              const start = new Date(r.created_at || r.faellig_am).getTime()
              const end = new Date(r.bezahlt_am).getTime()
              const days = Math.max(1, Math.round((end - start) / (1000 * 3600 * 24)))
              totalDays += days
              paidWithDates++
            }
          })
          const avgDays = paidWithDates > 0 ? Math.round(totalDays / paidWithDates) : 11
          zahlungsmoral = {
            label: `Ø ${avgDays} Tage – Sehr gut`,
            score: 'Sehr gut',
            isWarning: false
          }
        } else {
          zahlungsmoral = {
            label: 'Neukunde',
            score: 'Neukunde',
            isWarning: false
          }
        }

        return {
          ...k,
          projekteList: pList,
          rechnungenList: rList,
          offertenList: oList,
          aktiveProjekteCount,
          totalUmsatz,
          offenTotal,
          ueberfaelligTotal,
          ueberfaelligCount,
          isB2B,
          isZefixVerified,
          zahlungsmoral
        }
      })

      setKunden(enrichedKunden)

      if (viewParams?.kundeId) {
        let kunde = enrichedKunden.find(x => String(x.id) === String(viewParams.kundeId))
        if (!kunde && import.meta.env.DEV) {
          kunde = {
            id: viewParams.kundeId,
            kundennummer: 'K-2026-0042',
            firmenname: 'Meier Architektur AG',
            vorname: 'Beat',
            nachname: 'Meier',
            name: 'Meier Architektur AG',
            strasse: 'Bergstrasse 42',
            plz: '8032',
            ort: 'Zürich',
            telefon: '+41 44 123 45 67',
            email: 'b.meier@architektur.ch',
            anrede: 'Herr',
            created_at: new Date().toISOString()
          }
        }
        if (kunde) setSelectedKunde(kunde)
      }
    } catch (err) {
      console.error('Fehler beim Laden der Kunden:', err)
      setError('Kunden konnten nicht geladen werden.')
    } finally {
      setIsLoading(false)
    }
  }, [viewParams?.kundeId])

  useEffect(() => {
    fetchKundenData()
  }, [fetchKundenData])

  // Sync selectedKunde with viewParams
  useEffect(() => {
    if (viewParams?.action === 'create' && selectedKunde) {
      setSelectedKunde(null)
      return
    }
    if (viewParams?.kundeId) {
      let kunde = kunden.find(x => String(x.id) === String(viewParams.kundeId))
      if (!kunde && import.meta.env.DEV) {
        kunde = {
          id: viewParams.kundeId,
          kundennummer: 'K-2026-0042',
          firmenname: 'Meier Architektur AG',
          vorname: 'Beat',
          nachname: 'Meier',
          name: 'Meier Architektur AG',
          strasse: 'Bergstrasse 42',
          plz: '8032',
          ort: 'Zürich',
          telefon: '+41 44 123 45 67',
          email: 'b.meier@architektur.ch',
          anrede: 'Herr',
          created_at: new Date().toISOString()
        }
      }
      if (kunde && (!selectedKunde || selectedKunde.id !== kunde.id)) {
        setSelectedKunde(kunde)
      }
    } else if (!viewParams?.kundeId && selectedKunde) {
      setSelectedKunde(null)
    }
  }, [viewParams?.kundeId, kunden, selectedKunde])

  useEffect(() => {
    if (viewParams?.action === 'create' && !selectedKunde) {
      setIsCreateModalOpen(true)
    } else if (viewParams?.action !== 'create' && isCreateModalOpen) {
      setIsCreateModalOpen(false)
    }
  }, [viewParams?.action, selectedKunde, isCreateModalOpen])

  // Full view routing
  if (selectedKunde) {
    return (
      <KundeDetailView 
        kunde={selectedKunde} 
        onNavigate={onNavigate}
        userRole={userRole}
        initialTab={viewParams?.activeTab || 'stammdaten'}
        onBack={() => {
          navigateBack('kunden')
          fetchKundenData()
        }} 
      />
    )
  }

  // Filter Pills Counts
  const pillCounts = {
    all: kunden.filter(k => showArchived || !k.is_archived).length,
    b2b: kunden.filter(k => (showArchived || !k.is_archived) && k.isB2B).length,
    b2c: kunden.filter(k => (showArchived || !k.is_archived) && !k.isB2B).length,
    open: kunden.filter(k => (showArchived || !k.is_archived) && ((k.offenTotal || 0) > 0 || (k.ueberfaelligCount || 0) > 0)).length,
  }

  let filteredKunden = kunden.filter(k => {
    if (!showArchived && k.is_archived) return false
    if (filterStatus === 'Aktiv' && (k.status !== 'Aktiv' || k.is_archived)) return false
    if (filterStatus === 'Neu') {
      const d = new Date(k.created_at)
      const now = new Date()
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false
    }

    // Filter Pills
    if (activeFilterPill === 'b2b' && !k.isB2B) return false
    if (activeFilterPill === 'b2c' && k.isB2B) return false
    if (activeFilterPill === 'open' && (k.offenTotal || 0) <= 0 && (k.ueberfaelligCount || 0) <= 0) return false

    const term = searchTerm.toLowerCase()
    return (
      (k.name || '').toLowerCase().includes(term) ||
      (k.kundennummer || '').toLowerCase().includes(term) ||
      (k.anrede || '').toLowerCase().includes(term) ||
      (k.firmenname || '').toLowerCase().includes(term) ||
      (k.vorname || '').toLowerCase().includes(term) ||
      (k.nachname || '').toLowerCase().includes(term) ||
      (k.ort || '').toLowerCase().includes(term) ||
      (k.plz || '').toLowerCase().includes(term)
    )
  })

  // Sorting logic
  filteredKunden.sort((a, b) => {
    let aVal = a[sortField] || ''
    let bVal = b[sortField] || ''
    
    if (sortField === 'name') {
      aVal = a.firmenname || a.name || `${a.vorname || ''} ${a.nachname || ''}`
      bVal = b.firmenname || b.name || `${b.vorname || ''} ${b.nachname || ''}`
    } else if (sortField === 'aktiveProjekte') {
      aVal = a.aktiveProjekteCount || 0
      bVal = b.aktiveProjekteCount || 0
    } else if (sortField === 'umsatz') {
      aVal = a.totalUmsatz || 0
      bVal = b.totalUmsatz || 0
    }

    if (typeof aVal === 'string') aVal = aVal.toLowerCase()
    if (typeof bVal === 'string') bVal = bVal.toLowerCase()

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field) => {
    if (sortField !== field) return <span className="text-border opacity-0 group-hover:opacity-100 transition-opacity">↕</span>
    return sortDirection === 'asc' ? <span className="text-[#b88a38]">↑</span> : <span className="text-[#b88a38]">↓</span>
  }

  const handleArchiveKunde = async () => {
    if (!archiveConfirmKunde) return
    const id = archiveConfirmKunde.id
    try {
      const { error } = await supabase.from('kunden').update({ is_archived: true }).eq('id', id)
      if (error) throw error
      if (!showArchived) {
        setKunden(prev => prev.filter(k => k.id !== id))
      } else {
        setKunden(prev => prev.map(k => k.id === id ? { ...k, is_archived: true } : k))
      }
      showToast('success', 'Kunde ins Archiv verschoben.')
    } catch (err) {
      console.error(err)
      showToast('error', 'Fehler beim Archivieren.')
    } finally {
      setArchiveConfirmKunde(null)
    }
  }

  const handleRestoreKunde = async (id, e) => {
    if (e) e.stopPropagation()
    setActiveMenuId(null)
    try {
      const { error } = await supabase.from('kunden').update({ is_archived: false }).eq('id', id)
      if (error) throw error
      setKunden(prev => prev.map(k => k.id === id ? { ...k, is_archived: false } : k))
      showToast('success', 'Kunde aus dem Archiv wiederhergestellt.')
    } catch (err) {
      console.error(err)
      showToast('error', 'Fehler beim Wiederherstellen.')
    }
  }

  // Stats calculation
  const stats = {
    total: kunden.length,
    active: kunden.filter(k => k.status === 'Aktiv' && !k.is_archived).length,
    newThisMonth: kunden.filter(k => {
      const d = new Date(k.created_at)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
  }

  return (
    <div className="space-y-6">
      {/* ---------------- MOBILE HEADER (< md) ---------------- */}
      <div className="md:hidden flex items-center justify-between gap-3 pt-1">
        <div>
          <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wider">
            {stats.total} {stats.total === 1 ? 'Kunde' : 'Kunden'}
          </p>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight mt-0.5">
            Kunden
          </h1>
        </div>
        {userRole !== 'treuhand' && (
          <button 
            type="button"
            onClick={() => onNavigate ? onNavigate('kunden', { action: 'create' }) : setIsCreateModalOpen(true)}
            className="w-10 h-10 rounded-full bg-[#b88a38] active:bg-[#a67c32] text-white flex items-center justify-center text-xl font-bold shadow-xs active:scale-95 transition-transform cursor-pointer"
            title="Neuer Kunde"
          >
            +
          </button>
        )}
      </div>

      {/* ---------------- DESKTOP HEADER (>= md) ---------------- */}
      <div className="hidden md:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Kunden</h2>
          <p className="text-text-secondary mt-1 text-sm">CRM-Übersicht aller Schweizer Kunden, B2B-Partner und Auftraggeber.</p>
        </div>
        <div>
          {userRole !== 'treuhand' && (
            <button 
              type="button"
              onClick={() => onNavigate ? onNavigate('kunden', { action: 'create' }) : setIsCreateModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] bg-[#b88a38] text-white font-semibold text-sm rounded-xl hover:bg-[#a67c32] active:scale-[0.98] transition-all shadow-xs cursor-pointer"
            >
              <IconPlus className="w-4 h-4 text-white" />
              <span>Neuer Kunde</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards (Desktop) */}
      <div className="hidden md:grid grid-cols-3 gap-6">
        <StatCard 
          title="Alle Kunden"
          value={stats.total}
          subtitle="Im gesamten System erfasst"
          icon='<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />'
          color="gray"
        />

        <StatCard 
          title="Aktive Kunden"
          value={stats.active}
          subtitle="Laufende Mandate & Aufträge"
          icon='<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />'
          color="emerald"
        />

        <StatCard 
          title="Neue Kunden"
          value={stats.newThisMonth}
          subtitle="Diesen Monat neu angelegt"
          icon='<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />'
          color="blue"
        />
      </div>

      {/* ---------------- MOBILE CONTROLS & APPLE INSET CARDS (< md) ---------------- */}
      <div className="md:hidden space-y-3">
        {/* Apple Segmented Control */}
        <div className="bg-gray-100/90 p-1 rounded-xl flex items-center gap-1 border border-gray-200/50">
          {[
            { id: '', label: 'Alle', count: stats.total },
            { id: 'Aktiv', label: 'Aktiv', count: stats.active },
            { id: 'Neu', label: 'Neu', count: stats.newThisMonth },
          ].map((tab) => {
            const isSelected = (filterStatus || '') === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-tab={tab.id || 'all'}
                onClick={() => setFilterStatus(tab.id)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-white text-text-primary shadow-xs' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected 
                    ? 'bg-zinc-200 text-zinc-900' 
                    : 'bg-gray-200/70 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mobile Search & Filter Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Kunde, Nr, Firma, Ort..."
              className="w-full pl-9 pr-8 py-2 bg-gray-100/80 focus:bg-white border border-gray-200/70 rounded-xl text-xs text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-[#b88a38]/20 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-1 rounded-md text-sm leading-none cursor-pointer"
                title="Suche zurücksetzen"
              >
                &times;
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer border ${
              showArchived
                ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                : 'bg-white text-text-secondary border-gray-200/70'
            }`}
          >
            <IconFolder className="w-4 h-4" />
            <span>Archiv</span>
          </button>
        </div>

        {/* Mobile Apple Inset Card List */}
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-200/70 shadow-2xs animate-pulse">
                <div className="h-5 bg-gray-200/70 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200/50 rounded w-2/3 mb-3"></div>
                <div className="h-4 bg-gray-200/40 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white border border-rose-200 rounded-2xl p-6 text-center shadow-2xs text-rose-600 text-xs">
            {error}
          </div>
        ) : filteredKunden.length === 0 ? (
          <div className="bg-white border border-gray-200/70 rounded-2xl p-8 text-center shadow-2xs">
            <IconTeam className="w-10 h-10 text-text-muted mb-2 mx-auto" />
            <p className="text-base font-semibold text-text-primary">Keine Kunden gefunden</p>
            <p className="text-xs text-text-secondary mt-1">Passe deine Suchbegriffe an oder lege einen neuen Kunden an.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredKunden.map((kunde) => {
              const displayName = kunde.firmenname 
                ? kunde.firmenname 
                : `${kunde.vorname || ''} ${kunde.nachname || ''}`.trim() || kunde.name;

              return (
                <div
                  key={kunde.id}
                  onClick={() => onNavigate ? onNavigate('kunden', { kundeId: kunde.id }) : setSelectedKunde(kunde)}
                  className="bg-white border border-gray-200/70 rounded-2xl p-3.5 shadow-2xs active:scale-[0.99] transition-all cursor-pointer flex flex-col gap-2.5 border-l-4 border-l-[#b88a38] relative"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-xs ${kunde.firmenname ? 'rounded-xl' : 'rounded-full'}`}>
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-sm text-text-primary truncate">{displayName}</h3>
                          {kunde.kundennummer && (
                            <span className="font-mono text-[10px] font-semibold text-primary-700 bg-primary-50 px-1.5 py-0.2 rounded-md border border-primary-200/60 shrink-0">
                              {kunde.kundennummer}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary truncate mt-0.5 flex items-center gap-1">
                          <IconLocation className="w-3.5 h-3.5 text-text-muted shrink-0" />
                          <span>{kunde.strasse ? `${kunde.strasse}, ` : ''}{kunde.ort || 'Keine Adresse hinterlegt'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="relative shrink-0">
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === kunde.id ? null : kunde.id); }}
                        className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                      </button>

                      {activeMenuId === kunde.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} />
                          <div className="absolute right-0 mt-1 w-52 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
                            <div className="p-1">
                              <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setSelectedKunde(kunde); }} 
                                className="w-full text-left px-3 py-2 text-xs font-medium text-text-primary hover:bg-neutral-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                Details anzeigen
                              </button>

                              {userRole !== 'treuhand' && (
                                <>
                                  {kunde.is_archived ? (
                                    <button 
                                      type="button"
                                      onClick={(e) => handleRestoreKunde(kunde.id, e)} 
                                      className="w-full text-left px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                                    >
                                      <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                      Wiederherstellen
                                    </button>
                                  ) : (
                                    <button 
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setArchiveConfirmKunde(kunde); }} 
                                      className="w-full text-left px-3 py-2 text-xs font-medium text-text-primary hover:bg-neutral-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                                    >
                                      <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                      Archivieren
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100 text-xs">
                    {kunde.telefon && (
                      <a 
                        href={`tel:${kunde.telefon}`} 
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-xs flex items-center justify-center gap-1.5 border border-emerald-200/60 active:scale-95 transition-all"
                        title="Anrufen"
                      >
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        <span>Anrufen</span>
                      </a>
                    )}
                    {kunde.email && (
                      <a 
                        href={`mailto:${kunde.email}`} 
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-blue-50 text-blue-700 font-semibold text-xs flex items-center justify-center gap-1.5 border border-blue-200/60 active:scale-95 transition-all"
                        title="E-Mail senden"
                      >
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        <span>E-Mail</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onNavigate) onNavigate('kunden', { kundeId: kunde.id });
                        else setSelectedKunde(kunde);
                      }}
                      className="ml-auto font-semibold text-[#b88a38] hover:underline py-1.5 px-2 cursor-pointer flex items-center gap-1"
                    >
                      Details →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------------- DESKTOP ONLY: 360° DATATABLE WITH SLIDE-OVER TRIGGER (>= md) ---------------- */}
      <div className="hidden md:block bg-surface-card rounded-2xl border border-border shadow-xs overflow-hidden">
        
        {/* Integrated Toolbar with Search & Schnellfilter-Pills */}
        <div className="p-4 border-b border-border bg-surface/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-sm w-full">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Kunden suchen nach Name, Nr (z.B. K-1001), Firma, Ort..."
                className="w-full pl-10 pr-10 py-2 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-[#b88a38]/30 focus:border-[#b88a38] transition-all"
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

            {/* Schnellfilter-Pills */}
            <div className="inline-flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200/70 text-xs">
              <button
                type="button"
                onClick={() => setActiveFilterPill('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeFilterPill === 'all'
                    ? 'bg-white text-text-primary shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>Alle</span>
                <span className="text-[10px] text-zinc-500 font-mono">({pillCounts.all})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilterPill('b2b')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeFilterPill === 'b2b'
                    ? 'bg-white text-text-primary shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>Geschäftskunden (B2B)</span>
                <span className="text-[10px] text-zinc-500 font-mono">({pillCounts.b2b})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilterPill('b2c')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeFilterPill === 'b2c'
                    ? 'bg-white text-text-primary shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>Privatkunden (B2C)</span>
                <span className="text-[10px] text-zinc-500 font-mono">({pillCounts.b2c})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilterPill('open')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeFilterPill === 'open'
                    ? 'bg-white text-text-primary shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>Mit offenen Posten</span>
                <span className="text-[10px] text-zinc-500 font-mono">({pillCounts.open})</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer shrink-0 px-2 py-1.5 rounded-lg hover:bg-surface transition-colors">
              <input 
                type="checkbox" 
                checked={showArchived} 
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded border-border text-[#b88a38] focus:ring-[#b88a38]"
              />
              Archivierte einblenden
            </label>

            <span className="text-xs text-text-secondary font-medium pl-2 border-l border-border">
              {filteredKunden.length} {filteredKunden.length === 1 ? 'Kunde' : 'Kunden'}
            </span>
          </div>
        </div>

        {/* Desktop Table Header: Optimierte Schweizer Spalten */}
        <div className="hidden lg:grid grid-cols-[minmax(250px,1.6fr)_minmax(140px,1.1fr)_120px_minmax(170px,1.3fr)_100px_40px] gap-3 px-5 py-3 bg-surface/60 border-b border-border text-[11px] font-bold text-text-secondary uppercase tracking-wider">
          <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-text-primary transition-colors cursor-pointer group text-left">
            Kunde {getSortIcon('name')}
          </button>
          <button onClick={() => handleSort('ort')} className="flex items-center gap-1 hover:text-text-primary transition-colors cursor-pointer group text-left">
            Ort {getSortIcon('ort')}
          </button>
          <button onClick={() => handleSort('aktiveProjekte')} className="flex items-center gap-1 hover:text-text-primary transition-colors cursor-pointer group text-left">
            Aktive Projekte {getSortIcon('aktiveProjekte')}
          </button>
          <button onClick={() => handleSort('umsatz')} className="flex items-center gap-1 hover:text-text-primary transition-colors cursor-pointer group text-left">
            Umsatz / Offen {getSortIcon('umsatz')}
          </button>
          <button onClick={() => handleSort('status')} className="flex justify-center items-center gap-1 hover:text-text-primary transition-colors cursor-pointer group">
            Status {getSortIcon('status')}
          </button>
          <span className="sr-only">Aktionen</span>
        </div>

        {isLoading && (
          <div className="p-8 space-y-4">
            <div className="h-6 bg-gray-200/70 rounded w-1/4 animate-pulse"></div>
            <div className="h-12 bg-gray-200/50 rounded w-full animate-pulse"></div>
            <div className="h-12 bg-gray-200/50 rounded w-full animate-pulse"></div>
          </div>
        )}

        {error && (
          <div className="p-8 text-center text-red-500">
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && filteredKunden.length === 0 && (
          <div className="text-center py-16 px-4 text-text-secondary">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-xl text-primary-600">
              <IconTeam className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-text-primary">Keine Kunden gefunden</p>
            <p className="text-xs text-text-secondary mt-1">Passe deine Suchbegriffe an oder lege einen neuen Kunden an.</p>
          </div>
        )}

        {/* Table Rows with Slide-Over on Click */}
        <div ref={parent} className="divide-y divide-border">
          {filteredKunden.map((kunde) => {
            const displayName = kunde.firmenname 
              ? kunde.firmenname 
              : `${kunde.vorname || ''} ${kunde.nachname || ''}`.trim() || kunde.name;

            const contactPerson = kunde.firmenname 
              ? `${kunde.vorname || ''} ${kunde.nachname || ''}`.trim() 
              : null;

            const isSelectedForPreview = previewKunde?.id === kunde.id;

            return (
              <div
                key={kunde.id}
                onClick={() => setPreviewKunde(kunde)}
                className={`flex flex-col lg:grid lg:grid-cols-[minmax(250px,1.6fr)_minmax(140px,1.1fr)_120px_minmax(170px,1.3fr)_100px_40px] gap-3 lg:gap-3 p-4 lg:px-5 lg:py-3.5 hover:bg-zinc-50/80 active:bg-neutral-100 transition-colors items-start lg:items-center cursor-pointer border-l-4 relative group touch-action-manipulation ${
                  isSelectedForPreview 
                    ? 'bg-amber-50/40 border-l-[#b88a38]' 
                    : 'border-l-transparent hover:border-l-zinc-300'
                }`}
                title="Klicken für 360°-Vorschau im Seitenpanel"
              >
                {/* Primary Info (Kunde & Ansprechpartner) */}
                <div className="flex items-center gap-3 w-full lg:w-auto pr-16 lg:pr-0 min-w-0">
                  <div className={`w-10 h-10 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-xs ${
                    kunde.firmenname 
                      ? 'rounded-xl bg-zinc-900 border border-zinc-800' 
                      : 'rounded-full bg-zinc-800 border border-zinc-700'
                  }`}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-text-primary group-hover:text-[#b88a38] transition-colors truncate">
                        {displayName}
                      </span>
                      {kunde.kundennummer && (
                        <span className="font-mono text-[10px] font-semibold text-primary-700 bg-primary-50 px-1.5 py-0.2 rounded-md border border-primary-200 shrink-0">
                          {kunde.kundennummer}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-text-secondary truncate">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        kunde.isB2B 
                          ? 'bg-zinc-100 text-zinc-800 border border-zinc-200/70' 
                          : 'bg-zinc-100 text-zinc-600 border border-zinc-200/70'
                      }`}>
                        {kunde.isB2B ? 'B2B' : 'B2C'}
                      </span>
                      {contactPerson ? (
                        <span className="truncate">{contactPerson}</span>
                      ) : (
                        <span className="text-text-muted truncate">{kunde.typ || 'Kunde'}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ort / Adresse */}
                <div className="hidden lg:block text-sm text-text-secondary truncate">
                  {kunde.plz ? `${kunde.plz} ` : ''}{kunde.ort || kunde.strasse || '—'}
                </div>

                {/* Aktive Projekte (Badge) */}
                <div className="hidden lg:flex items-center">
                  {(kunde.aktiveProjekteCount || 0) > 0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200/70">
                      {kunde.aktiveProjekteCount} {kunde.aktiveProjekteCount === 1 ? 'Baustelle' : 'Baustellen'}
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted font-medium">—</span>
                  )}
                </div>

                {/* Umsatz & Offene Posten */}
                <div className="hidden lg:flex flex-col justify-center min-w-0">
                  <div className="text-xs font-bold text-text-primary tabular-nums">
                    {formatCurrency(kunde.totalUmsatz || 0)}
                  </div>
                  {kunde.ueberfaelligCount > 0 ? (
                    <div className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-0.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
                      <span>{formatCurrency(kunde.ueberfaelligTotal || 0)} überfällig</span>
                    </div>
                  ) : (kunde.offenTotal || 0) > 0 ? (
                    <div className="text-[11px] font-medium text-amber-700 truncate mt-0.5">
                      {formatCurrency(kunde.offenTotal)} offen
                    </div>
                  ) : (
                    <div className="text-[10px] text-text-muted truncate mt-0.5">
                      Keine offenen Posten
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="hidden lg:flex items-center justify-center">
                  <StatusBadge status={kunde.status || (kunde.is_archived ? 'Archiviert' : 'Aktiv')} size="xs" />
                </div>

                {/* Desktop 3-Dots Action Menu */}
                <div className="hidden lg:block relative shrink-0">
                  <button 
                    type="button"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setActiveMenuId(activeMenuId === kunde.id ? null : kunde.id); 
                    }}
                    className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-zinc-100 transition-all cursor-pointer"
                    title="Aktionen"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>

                  {activeMenuId === kunde.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} />
                      <div className="absolute right-0 mt-1 w-52 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="p-1">
                          <button 
                            type="button"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setActiveMenuId(null); 
                              setPreviewKunde(kunde); 
                            }} 
                            className="w-full text-left px-3 py-2 text-xs font-medium text-text-primary hover:bg-neutral-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <IconEye className="w-3.5 h-3.5 text-text-secondary" />
                            <span>360°-Vorschau anzeigen</span>
                          </button>

                          <button 
                            type="button"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setActiveMenuId(null); 
                              setSelectedKunde(kunde); 
                            }} 
                            className="w-full text-left px-3 py-2 text-xs font-medium text-text-primary hover:bg-neutral-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            <span>Vollständiges Profil öffnen</span>
                          </button>

                          {userRole !== 'treuhand' && (
                            <>
                              <div className="h-px bg-border my-1" />
                              {kunde.is_archived ? (
                                <button 
                                  type="button"
                                  onClick={(e) => handleRestoreKunde(kunde.id, e)} 
                                  className="w-full text-left px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                  <span>Wiederherstellen</span>
                                </button>
                              ) : (
                                <button 
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setArchiveConfirmKunde(kunde); }} 
                                  className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                  <span>Archivieren</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------- SLIDE-OVER 360° DRAWER ---------------- */}
      <KundePreviewDrawer
        kunde={previewKunde}
        isOpen={Boolean(previewKunde)}
        onClose={() => setPreviewKunde(null)}
        onOpenFullView={(k) => {
          setPreviewKunde(null)
          setSelectedKunde(k)
        }}
        onNavigate={onNavigate}
      />

      {/* ---------------- MODAL: NEUEN KUNDEN ERSTELLEN ---------------- */}
      {isCreateModalOpen && (
        <KundeCreateModal 
          isOpen={isCreateModalOpen} 
          onClose={() => {
            setIsCreateModalOpen(false)
            if (viewParams?.action === 'create') {
              navigateBack('kunden')
            }
          }} 
          onSuccess={(newKunde) => {
            setIsCreateModalOpen(false)
            fetchKundenData()
            setSelectedKunde(newKunde)
          }} 
        />
      )}

      {/* ---------------- MODAL: ARCHIVIEREN BESTÄTIGEN ---------------- */}
      {archiveConfirmKunde && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-card rounded-2xl border border-border max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-text-primary">Kunde archivieren?</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Möchtest du <strong className="text-text-primary">{archiveConfirmKunde.firmenname || archiveConfirmKunde.name}</strong> wirklich ins Archiv verschieben? Der Kunde kann jederzeit wiederhergestellt werden.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setArchiveConfirmKunde(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-text-primary rounded-xl text-xs font-semibold cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleArchiveKunde}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
              >
                Ja, archivieren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {feedbackToast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-fade-in ${
          feedbackToast.type === 'error'
            ? 'bg-rose-50 text-rose-800 border-rose-200'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {feedbackToast.type === 'error' ? <IconWarning className="w-4 h-4 text-rose-600" /> : <IconCheck className="w-4 h-4 text-emerald-600" />}
          <span>{feedbackToast.text}</span>
        </div>
      )}
    </div>
  )
}
