import { useState, useEffect } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/formatters'
import { navigateBack } from '../lib/router'
import KundeDetailView from './KundeDetailView'
import KundeCreateModal from './KundeCreateModal'
import StatCard from '../components/StatCard'

export default function KundenView({ onNavigate, viewParams, userRole }) {
  const [parent] = useAutoAnimate()
  const [kunden, setKunden] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedKunde, setSelectedKunde] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
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
            const kunde = data.find(x => x.id === viewParams.kundeId)
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
    if (!kunden.length) return
    if (viewParams?.kundeId) {
      const kunde = kunden.find(x => x.id === viewParams.kundeId)
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Kunden</h2>
          <p className="text-text-secondary mt-1">CRM-Übersicht aller Kunden und Auftraggeber.</p>
        </div>
        <div>
          {userRole !== 'treuhand' && (
            <button 
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
      <div className="hidden sm:grid grid-cols-3 gap-6">
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

      {/* Stats Pills (Mobile) */}
      <div className="flex sm:hidden items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex items-center gap-2 bg-surface-card rounded-full border border-border px-4 py-2 shadow-sm whitespace-nowrap">
          <span className="text-text-secondary text-sm">Alle Kunden:</span>
          <span className="text-sm font-bold text-text-primary">{stats.total}</span>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 rounded-full border border-emerald-100 px-4 py-2 shadow-sm whitespace-nowrap">
          <span className="text-emerald-700 text-sm">Aktive:</span>
          <span className="text-sm font-bold text-emerald-800">{stats.active}</span>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 rounded-full border border-blue-100 px-4 py-2 shadow-sm whitespace-nowrap">
          <span className="text-blue-700 text-sm">Neu:</span>
          <span className="text-sm font-bold text-blue-800">+{stats.newThisMonth}</span>
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
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-xl">
              👥
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
                      <span>📍</span>
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
                <div className="hidden lg:block text-xs text-text-secondary truncate">
                  {kunde.created_at ? formatDate(kunde.created_at) : '-'}
                </div>

                {/* Status */}
                <div className="absolute top-4 right-14 lg:relative lg:top-0 lg:right-0 lg:flex lg:justify-center">
                  {kunde.is_archived ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <span>📁</span> Archiv
                    </span>
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      kunde.status === 'Aktiv'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {kunde.status || 'Aktiv'}
                    </span>
                  )}
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
              📁
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

      {/* Mobile Floating Action Button (FAB) */}
      {userRole !== 'treuhand' && (
        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-20 lg:hidden">
          <button
            type="button"
            onClick={() => onNavigate ? onNavigate('kunden', { action: 'create' }) : setIsCreateModalOpen(true)}
            className="w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 active:scale-90 text-white shadow-xl shadow-primary-600/35 flex items-center justify-center text-2xl font-bold transition-all touch-action-manipulation cursor-pointer"
            aria-label="Neuen Kunden anlegen"
          >
            +
          </button>
        </div>
      )}

      {/* Feedback Toast */}
      {feedbackToast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 animate-fade-in ${
          feedbackToast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          <span>{feedbackToast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{feedbackToast.text}</span>
        </div>
      )}
    </div>
  )
}

