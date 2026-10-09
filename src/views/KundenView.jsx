import { useState, useEffect } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/formatters'
import { navigateBack } from '../lib/router'
import KundeDetailView from './KundeDetailView'
import KundeCreateModal from './KundeCreateModal'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import { IconFolder, IconTeam, IconLocation, IconWarning, IconCheck } from '../components/icons/BrandIcons'

export default function KundenView({ onNavigate, viewParams, userRole }) {
  const [parent] = useAutoAnimate()
  const [kunden, setKunden] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedKunde, setSelectedKunde] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
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

  useEffect(() => {
    async function fetchKunden() {
      if (!supabase) {
        setError('Supabase nicht konfiguriert (Fehlende API Keys).')
        setIsLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('kunden')
          .select('*')
          .order('name', { ascending: true })
        
        if (error) throw error
        
        if (data) {
          setKunden(data)
          if (viewParams?.kundeId) {
            let kunde = data.find(x => String(x.id) === String(viewParams.kundeId))
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
        }
      } catch (err) {
        console.error('Fehler beim Laden der Kunden:', err)
        setError('Kunden konnten nicht geladen werden.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchKunden()
  }, [])

  // Sync selectedKunde with viewParams
  useEffect(() => {
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

  if (selectedKunde) {
    return (
      <KundeDetailView 
        kunde={selectedKunde} 
        onNavigate={onNavigate}
        userRole={userRole}
        initialTab={viewParams?.activeTab || 'stammdaten'}
        onBack={() => {
          navigateBack('kunden')
          // Refresh list to show potentially updated names
          supabase.from('kunden').select('*').order('name', { ascending: true })
            .then(({ data }) => { if (data) setKunden(data) })
        }} 
      />
    )
  }

  let filteredKunden = kunden.filter(k => {
    if (!showArchived && k.is_archived) return false;
    if (filterStatus === 'Aktiv' && (k.status !== 'Aktiv' || k.is_archived)) return false;
    if (filterStatus === 'Neu') {
      const d = new Date(k.created_at)
      const now = new Date()
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
    }
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
    
    // Fallbacks for display name sorting
    if (sortField === 'name') {
      aVal = a.firmenname || a.name || ''
      bVal = b.firmenname || b.name || ''
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
    return sortDirection === 'asc' ? <span className="text-primary-600">↑</span> : <span className="text-primary-600">↓</span>
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
            className="w-10 h-10 rounded-full bg-primary-600 active:bg-primary-700 text-white flex items-center justify-center text-xl font-bold shadow-xs active:scale-95 transition-transform cursor-pointer"
            title="Neuer Kunde"
          >
            +
          </button>
        )}
      </div>

      {/* ---------------- DESKTOP HEADER (>= md) ---------------- */}
      <div className="hidden md:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Kunden</h2>
          <p className="text-text-secondary mt-1">CRM-Übersicht aller Kunden und Auftraggeber.</p>
        </div>
        <div>
          {userRole !== 'treuhand' && (
            <button 
              type="button"
              onClick={() => onNavigate ? onNavigate('kunden', { action: 'create' }) : setIsCreateModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 min-h-[48px] bg-primary-600 text-white font-semibold text-base sm:text-sm rounded-xl hover:bg-primary-700 active:scale-[0.97] transition-all shadow-md shadow-primary-600/20 cursor-pointer"
            >
              <span className="text-lg">+</span>
              Neuer Kunde
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards (Desktop) */}
      <div className="hidden md:grid grid-cols-3 gap-6">
        {/* Tile 1: Alle Kunden */}
        <StatCard 
          title="Alle Kunden"
          value={stats.total}
          subtitle="Im gesamten System"
          icon='<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />'
          color="gray"
        />

        {/* Tile 2: Aktive Kunden */}
        <StatCard 
          title="Aktive Kunden"
          value={stats.active}
          subtitle="Nicht archiviert"
          icon='<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />'
          color="emerald"
        />

        {/* Tile 3: Neue Kunden */}
        <StatCard 
          title="Neue Kunden"
          value={stats.newThisMonth}
          subtitle="Diesen Monat erstellt"
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
                    ? 'bg-primary-100 text-primary-800' 
                    : 'bg-gray-200/70 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mobile Apple Search & Filter Bar */}
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
              className="w-full pl-9 pr-8 py-2 bg-gray-100/80 focus:bg-white border border-gray-200/70 rounded-xl text-xs text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
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
                ? `${kunde.firmenname} ${kunde.vorname || ''} ${kunde.nachname || ''}`.trim()
                : `${kunde.vorname || ''} ${kunde.nachname || ''}`.trim() || kunde.name;

              return (
                <div
                  key={kunde.id}
                  onClick={() => onNavigate ? onNavigate('kunden', { kundeId: kunde.id }) : setSelectedKunde(kunde)}
                  className="bg-white border border-gray-200/70 rounded-2xl p-3.5 shadow-2xs active:scale-[0.99] transition-all cursor-pointer flex flex-col gap-2.5 border-l-4 border-l-primary-500 relative"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-xs ${kunde.firmenname ? 'rounded-xl' : 'rounded-full'}`}>
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
                      className="ml-auto font-semibold text-primary-600 hover:text-primary-700 py-1.5 px-2 cursor-pointer flex items-center gap-1"
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

      {/* ---------------- DESKTOP ONLY: DATATABLE (>= md) ---------------- */}
      <div className="hidden md:block bg-surface-card rounded-2xl border border-border shadow-xs overflow-hidden">
        
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
              placeholder="Kunden suchen nach Name, Nr (z.B. K-1001), Firma, Ort..."
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

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer shrink-0 px-2 py-1.5 rounded-lg hover:bg-surface transition-colors">
              <input 
                type="checkbox" 
                checked={showArchived} 
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded border-border text-primary-600 focus:ring-primary-500"
              />
              Archivierte einblenden
            </label>

            <span className="text-xs text-text-secondary font-medium pl-2 border-l border-border">
              {filteredKunden.length} {filteredKunden.length === 1 ? 'Kunde' : 'Kunden'}
            </span>
          </div>
        </div>

        {/* Integrated Desktop Header */}
        <div className="hidden lg:grid grid-cols-[minmax(220px,1.4fr)_minmax(180px,1.2fr)_minmax(180px,1.2fr)_140px_110px_100px_40px] gap-3 px-5 py-3 bg-surface/60 border-b border-border text-[11px] font-bold text-text-secondary uppercase tracking-wider">
          <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-text-primary transition-colors cursor-pointer group text-left">
            Kunde {getSortIcon('name')}
          </button>
          <button onClick={() => handleSort('ort')} className="flex items-center gap-1 hover:text-text-primary transition-colors cursor-pointer group text-left">
            Adresse {getSortIcon('ort')}
          </button>
          <button onClick={() => handleSort('email')} className="flex items-center gap-1 hover:text-text-primary transition-colors cursor-pointer group text-left">
            E-Mail {getSortIcon('email')}
          </button>
          <button onClick={() => handleSort('telefon')} className="flex items-center gap-1 hover:text-text-primary transition-colors cursor-pointer group text-left">
            Telefon {getSortIcon('telefon')}
          </button>
          <button onClick={() => handleSort('created_at')} className="flex items-center gap-1 hover:text-text-primary transition-colors cursor-pointer group text-left">
            Erfasst am {getSortIcon('created_at')}
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

        <div ref={parent} className="divide-y divide-border">
          {filteredKunden.map((kunde) => {
            const displayName = kunde.firmenname 
              ? `${kunde.firmenname} ${kunde.vorname || ''} ${kunde.nachname || ''}`.trim()
              : `${kunde.vorname || ''} ${kunde.nachname || ''}`.trim() || kunde.name;

            return (
              <div
                key={kunde.id}
                onClick={() => onNavigate ? onNavigate('kunden', { kundeId: kunde.id }) : setSelectedKunde(kunde)}
                className="flex flex-col lg:grid lg:grid-cols-[minmax(220px,1.4fr)_minmax(180px,1.2fr)_minmax(180px,1.2fr)_140px_110px_100px_40px] gap-3 lg:gap-3 p-4 lg:px-5 lg:py-3.5 hover:bg-primary-50/20 active:bg-neutral-50 transition-colors items-start lg:items-center cursor-pointer border-l-4 border-l-primary-500 relative group touch-action-manipulation"
              >
                {/* Primary Info */}
                <div className="flex items-center gap-3.5 w-full lg:w-auto pr-16 lg:pr-0 min-w-0">
                  <div className={`w-11 h-11 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-base font-bold shrink-0 shadow-xs ${kunde.firmenname ? 'rounded-2xl' : 'rounded-full'}`}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base sm:text-sm text-text-primary truncate">{displayName}</span>
                      {kunde.kundennummer && (
                        <span className="font-mono text-[10px] font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-200 shrink-0">
                          {kunde.kundennummer}
                        </span>
                      )}
                    </div>
                    <span className="text-xs lg:hidden text-text-secondary truncate mt-0.5 flex items-center gap-1">
                      <IconLocation className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      <span>{kunde.strasse ? `${kunde.strasse}, ` : ''}{kunde.ort || '-'}</span>
                    </span>
                  </div>
                </div>

                {/* Quick Action Buttons Mobile (min 44px touch targets) */}
                <div className="flex items-center gap-2 w-full pt-1 lg:hidden">
                  {kunde.telefon && (
                    <a 
                      href={`tel:${kunde.telefon}`} 
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 font-semibold text-xs flex items-center justify-center gap-1.5 border border-emerald-200 active:scale-95 transition-all touch-action-manipulation"
                      title="Anrufen"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      <span>Anrufen</span>
                    </a>
                  )}
                  {kunde.email && (
                    <a 
                      href={`mailto:${kunde.email}`} 
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-blue-50 text-blue-800 font-semibold text-xs flex items-center justify-center gap-1.5 border border-blue-200 active:scale-95 transition-all touch-action-manipulation"
                      title="E-Mail senden"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      <span>E-Mail</span>
                    </a>
                  )}
                </div>

                {/* Adresse (Desktop) */}
                <div className="hidden lg:block text-sm text-text-secondary truncate">
                  {kunde.strasse ? `${kunde.strasse}, ` : ''}{kunde.ort || '-'}
                </div>

                {/* Desktop E-Mail */}
                <div className="hidden lg:block text-sm text-text-secondary truncate">
                  {kunde.email ? (
                    <a href={`mailto:${kunde.email}`} onClick={e => e.stopPropagation()} className="hover:text-blue-600 transition-colors">{kunde.email}</a>
                  ) : '-'}
                </div>

                {/* Desktop Telefon */}
                <div className="hidden lg:block text-sm text-text-secondary truncate">
                  {kunde.telefon ? (
                    <a href={`tel:${kunde.telefon}`} onClick={e => e.stopPropagation()} className="hover:text-emerald-600 transition-colors">{kunde.telefon}</a>
                  ) : '-'}
                </div>

                {/* Erstellt am (Desktop) */}
                <div className="hidden lg:block text-xs text-text-secondary tabular-nums truncate">
                  {kunde.created_at ? formatDate(kunde.created_at) : '-'}
                </div>

                {/* Status */}
                <div className="absolute top-4 right-14 lg:relative lg:top-0 lg:right-0 lg:flex lg:justify-center">
                  <StatusBadge 
                    status={kunde.is_archived ? 'Archiviert' : (kunde.status || 'Aktiv')} 
                    size="xs" 
                  />
                </div>

                {/* Quick Actions (3-dot Menu) */}
                <div className="absolute top-2 right-2 lg:relative lg:top-0 lg:right-0 flex items-center justify-end">
                  <div className="relative">
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === kunde.id ? null : kunde.id); }}
                      className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
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
                                <button 
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setEditingKunde(kunde); }} 
                                  className="w-full text-left px-3 py-2 text-xs font-medium text-text-primary hover:bg-neutral-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                  Bearbeiten
                                </button>

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
              </div>
            )
          })}
        </div>
      </div>

      {/* Archive Confirmation Modal */}
      {archiveConfirmKunde && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setArchiveConfirmKunde(null)}>
          <div className="bg-surface-card rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl mb-4">
              <IconFolder className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Kunde archivieren?</h3>
            <p className="text-text-secondary text-sm mb-6 leading-relaxed">
              Möchtest du <strong>{archiveConfirmKunde.firmenname || archiveConfirmKunde.name}</strong> wirklich archivieren? Der Kunde kann jederzeit über die Filterfunktion wiederhergestellt werden.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={() => setArchiveConfirmKunde(null)}
                className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={handleArchiveKunde}
                className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-5 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                Ja, archivieren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <KundeCreateModal 
          onClose={() => {
            if (viewParams?.action === 'create') {
              navigateBack('kunden')
            } else {
              setIsCreateModalOpen(false)
            }
          }}
          onSuccess={(newKunde) => {
            setKunden(prev => [...prev, newKunde])
            setIsCreateModalOpen(false)
            if (onNavigate) {
              onNavigate('kunden', { kundeId: newKunde.id }, { replace: true })
            } else {
              setSelectedKunde(newKunde)
            }
            showToast('success', 'Kunde erfolgreich erstellt.')
          }}
        />
      )}

      {/* Feedback Toast */}
      {feedbackToast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 animate-fade-in ${
          feedbackToast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          {feedbackToast.type === 'error' ? <IconWarning className="w-4 h-4 text-red-600 shrink-0" /> : <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
          <span>{feedbackToast.text}</span>
        </div>
      )}
    </div>
  )
}

