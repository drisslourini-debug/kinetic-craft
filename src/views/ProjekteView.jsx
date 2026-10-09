import { useState, useEffect } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/formatters'
import { navigateBack } from '../lib/router'
import ProjektDetailView from './ProjektDetailView'
import ProjektCreateModal from './ProjektCreateModal'
import StatCard from '../components/StatCard'
import { IconMic, IconFolder, IconBauunternehmung, IconLocation, IconCalendar, IconClock, IconUser, IconWarning, IconCheck } from '../components/icons/BrandIcons'

export default function ProjekteView({ onNavigate, viewParams, userRole, userName }) {
  const [parent] = useAutoAnimate()
  const [projekte, setProjekte] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProjekt, setSelectedProjekt] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [archiveConfirmProjekt, setArchiveConfirmProjekt] = useState(null)
  const [feedbackToast, setFeedbackToast] = useState(null)
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' })

  const showToast = (type, text) => {
    setFeedbackToast({ type, text })
    setTimeout(() => setFeedbackToast(null), 3500)
  }

  useEffect(() => {
    async function fetchProjekte() {
      if (!supabase) return
      
      try {
        setIsLoading(true)
        const { data, error } = await supabase
          .from('projekte')
          .select('*, kunden(name)')
          .order('created_at', { ascending: false })
          
        if (error) throw error
        if (data) {
          setProjekte(data)
          if (viewParams?.projektId) {
            let p = data.find(x => String(x.id) === String(viewParams.projektId))
            if (!p && import.meta.env.DEV) {
              p = {
                id: viewParams.projektId,
                name: 'Umbau Villa Zürichberg',
                adresse: 'Bergstrasse 42, 8032 Zürich',
                status: 'In Arbeit',
                kunden_id: 'k-1',
                created_at: new Date().toISOString(),
                kunden: { name: 'Meier Architektur AG' }
              }
            }
            if (p) setSelectedProjekt(p)
          }
        }
      } catch (err) {
        console.error('Error fetching projekte:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProjekte()
  }, [])

  // Sync selectedProjekt with viewParams
  useEffect(() => {
    if (viewParams?.projektId) {
      let p = projekte.find(x => String(x.id) === String(viewParams.projektId))
      if (!p && import.meta.env.DEV) {
        p = {
          id: viewParams.projektId,
          name: 'Umbau Villa Zürichberg',
          adresse: 'Bergstrasse 42, 8032 Zürich',
          status: 'In Arbeit',
          kunden_id: 'k-1',
          created_at: new Date().toISOString(),
          kunden: { name: 'Meier Architektur AG' }
        }
      }
      if (p && (!selectedProjekt || selectedProjekt.id !== p.id)) {
        setSelectedProjekt(p)
      }
    } else if (!viewParams?.projektId && selectedProjekt) {
      setSelectedProjekt(null)
    }
  }, [viewParams?.projektId, projekte, selectedProjekt])

  useEffect(() => {
    if (viewParams?.action === 'create' && !selectedProjekt) {
      setIsCreateModalOpen(true)
    } else if (viewParams?.action !== 'create' && isCreateModalOpen) {
      setIsCreateModalOpen(false)
    }
  }, [viewParams?.action, selectedProjekt, isCreateModalOpen])

  useEffect(() => {
    if (viewParams?.action === 'create_rapport' && !selectedProjekt && projekte.length > 0) {
      const targetProj = projekte.find(p => p.status === 'Aktiv' || p.status === 'In Arbeit') || projekte[0]
      setSelectedProjekt(targetProj)
    }
  }, [viewParams?.action, selectedProjekt, projekte])

  const statusColor = {
    'Aktiv': 'bg-primary-100 text-primary-700',
    'In Arbeit': 'bg-emerald-100 text-emerald-700',
    'Abgeschlossen': 'bg-blue-100 text-blue-700',
  }

  if (selectedProjekt) {
    return (
      <ProjektDetailView 
        projekt={selectedProjekt} 
        onNavigate={onNavigate}
        userRole={userRole}
        userName={userName}
        initialTab={viewParams?.action === 'create_rapport' ? 'rapporte' : (viewParams?.activeTab || 'projektdaten')}
        initialAction={viewParams?.action}
        onBack={() => {
          navigateBack('projekte')
          // Refresh to capture potential name/status changes
          supabase.from('projekte').select('*, kunden(name)').order('created_at', { ascending: false })
            .then(({ data }) => { if (data) setProjekte(data) })
        }} 
      />
    )
  }

  let filteredProjekte = projekte.filter(p => {
    if (!showArchived && p.is_archived) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    const term = searchTerm.toLowerCase()
    return (
      (p.name || '').toLowerCase().includes(term) ||
      (p.adresse || '').toLowerCase().includes(term) ||
      (p.kunden?.name || '').toLowerCase().includes(term)
    )
  })

  // Sorting
  filteredProjekte.sort((a, b) => {
    let aValue = a[sortConfig.key]
    let bValue = b[sortConfig.key]

    if (sortConfig.key === 'kunde') {
      aValue = a.kunden?.name || ''
      bValue = b.kunden?.name || ''
    }

    if (!aValue) aValue = ''
    if (!bValue) bValue = ''

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

  const handleArchiveProjekt = async () => {
    if (!archiveConfirmProjekt) return
    const id = archiveConfirmProjekt.id
    try {
      const { error } = await supabase.from('projekte').update({ is_archived: true }).eq('id', id)
      if (error) throw error
      if (!showArchived) {
        setProjekte(prev => prev.filter(p => p.id !== id))
      } else {
        setProjekte(prev => prev.map(p => p.id === id ? { ...p, is_archived: true } : p))
      }
      showToast('success', 'Projekt ins Archiv verschoben.')
    } catch (err) {
      console.error(err)
      showToast('error', 'Fehler beim Archivieren.')
    } finally {
      setArchiveConfirmProjekt(null)
    }
  }

  const handleRestoreProjekt = async (id, e) => {
    if (e) e.stopPropagation()
    setActiveMenuId(null)
    try {
      const { error } = await supabase.from('projekte').update({ is_archived: false }).eq('id', id)
      if (error) throw error
      setProjekte(prev => prev.map(p => p.id === id ? { ...p, is_archived: false } : p))
      showToast('success', 'Projekt aus dem Archiv wiederhergestellt.')
    } catch (err) {
      console.error(err)
      showToast('error', 'Fehler beim Wiederherstellen.')
    }
  }

  // Stats calculation
  const stats = {
    total: projekte.filter(p => !p.is_archived).length,
    inArbeit: projekte.filter(p => !p.is_archived && p.status === 'In Arbeit').length,
    abgeschlossen: projekte.filter(p => !p.is_archived && p.status === 'Abgeschlossen').length,
  }

  return (
    <div className="space-y-6">
      {/* ---------------- MOBILE HEADER (< md) ---------------- */}
      <div className="md:hidden flex items-center justify-between gap-3 pt-1">
        <div>
          <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wider">
            {stats.total} {stats.total === 1 ? 'Projekt' : 'Projekte'}
          </p>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight mt-0.5">
            Projekte & Objekte
          </h1>
        </div>
        {userRole !== 'treuhand' && (
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => onNavigate ? onNavigate('projekte', { action: 'create' }) : setIsCreateModalOpen(true)}
              className="w-10 h-10 rounded-full bg-amber-500/10 active:bg-amber-500/20 text-amber-700 flex items-center justify-center active:scale-95 transition-transform cursor-pointer border border-amber-500/20"
              title="Projekt per Sprache (KI) erfassen"
            >
              <IconMic className="w-5 h-5 text-amber-600" />
            </button>
            <button 
              type="button"
              onClick={() => onNavigate ? onNavigate('projekte', { action: 'create' }) : setIsCreateModalOpen(true)}
              className="w-10 h-10 rounded-full bg-primary-600 active:bg-primary-700 text-white flex items-center justify-center text-xl font-bold shadow-xs active:scale-95 transition-transform cursor-pointer"
              title="Neues Projekt"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* ---------------- DESKTOP HEADER (>= md) ---------------- */}
      <div className="hidden md:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Projekte & Objekte</h2>
          <p className="text-text-secondary mt-1">Alle Baustellen und Projekte auf einen Blick.</p>
        </div>
        {userRole !== 'treuhand' && (
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
            <button 
              type="button"
              onClick={() => onNavigate ? onNavigate('projekte', { action: 'create' }) : setIsCreateModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 min-h-[48px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-base sm:text-sm rounded-xl active:scale-[0.97] transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              title="Projekt per Spracheingabe einsprechen"
            >
              <IconMic className="w-4 h-4 text-slate-950" />
              <span>Per Sprache (KI)</span>
            </button>
            <button 
              type="button"
              onClick={() => onNavigate ? onNavigate('projekte', { action: 'create' }) : setIsCreateModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 min-h-[48px] bg-primary-600 text-white font-semibold text-base sm:text-sm rounded-xl hover:bg-primary-700 active:scale-[0.97] transition-all shadow-md shadow-primary-600/20 cursor-pointer"
            >
              <span className="text-lg">+</span>
              Neues Projekt
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards (Desktop) */}
      <div className="hidden md:grid grid-cols-3 gap-6">
        {/* Tile 1: Alle Projekte */}
        <StatCard 
          title="Alle Projekte"
          value={stats.total}
          subtitle="Aktive Projekte"
          icon='<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />'
          color="gray"
        />

        {/* Tile 2: In Arbeit */}
        <StatCard 
          title="In Arbeit"
          value={stats.inArbeit}
          subtitle=""
          icon='<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />'
          color="emerald"
        />

        {/* Tile 3: Abgeschlossen */}
        <StatCard 
          title="Abgeschlossen"
          value={stats.abgeschlossen}
          subtitle="Erfolgreich beendet"
          icon='<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />'
          color="blue"
        />
      </div>

      {/* ---------------- MOBILE CONTROLS & APPLE INSET CARDS (< md) ---------------- */}
      <div className="md:hidden space-y-3">
        {/* Apple Segmented Control */}
        <div className="bg-gray-100/90 p-1 rounded-xl flex items-center gap-1 border border-gray-200/50">
          {[
            { id: '', label: 'Alle', count: stats.total },
            { id: 'In Arbeit', label: 'In Arbeit', count: stats.inArbeit },
            { id: 'Abgeschlossen', label: 'Fertig', count: stats.abgeschlossen },
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
              placeholder="Suchen nach Name, Adresse, Kunde..."
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
        ) : filteredProjekte.length === 0 ? (
          <div className="bg-white border border-gray-200/70 rounded-2xl p-8 text-center shadow-2xs">
            <IconBauunternehmung className="w-10 h-10 text-text-muted mb-2 mx-auto" />
            <p className="text-base font-semibold text-text-primary">Keine Projekte gefunden</p>
            <p className="text-xs text-text-secondary mt-1">Passe deine Suchbegriffe an oder erstelle ein neues Projekt.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredProjekte.map((p) => {
              const statusBorder = p.status === 'In Arbeit' 
                ? 'border-l-emerald-500' 
                : p.status === 'Abgeschlossen' 
                  ? 'border-l-blue-500' 
                  : 'border-l-primary-500';

              return (
                <div
                  key={p.id}
                  onClick={() => onNavigate ? onNavigate('projekte', { projektId: p.id }) : setSelectedProjekt(p)}
                  className={`bg-white border border-gray-200/70 rounded-2xl p-3.5 shadow-2xs active:scale-[0.99] transition-all cursor-pointer flex flex-col gap-2.5 border-l-4 ${statusBorder} relative`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {p.is_archived ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                            <IconFolder className="w-3.5 h-3.5" /> Archiv
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'In Arbeit'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : p.status === 'Abgeschlossen'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                                : 'bg-primary-50 text-primary-700 border border-primary-200/60'
                          }`}>
                            {p.status === 'In Arbeit' && (
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                              </span>
                            )}
                            {p.status || 'Aktiv'}
                          </span>
                        )}
                        {p.kategorie && (
                          <span className="text-[10px] font-medium text-text-muted bg-gray-100 px-2 py-0.5 rounded-full">
                            {p.kategorie}
                          </span>
                        )}
                      </div>

                      {p.adresse ? (
                        <>
                          <h3 className="text-sm font-bold text-text-primary truncate flex items-center gap-1">
                            <IconLocation className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                            <span>{p.adresse}</span>
                          </h3>
                          <p className="text-xs text-text-secondary truncate mt-0.5 font-medium">
                            {p.name}
                          </p>
                        </>
                      ) : (
                        <h3 className="text-sm font-bold text-text-primary truncate flex items-center gap-1">
                          <IconBauunternehmung className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                          <span>{p.name}</span>
                        </h3>
                      )}
                    </div>

                    <div className="relative shrink-0">
                      <button 
                        type="button"
                        aria-label="Aktionsmenü"
                        title="Aktionsmenü"
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === p.id ? null : p.id); }}
                        className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                      </button>
                      
                      {activeMenuId === p.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} />
                          <div className="absolute right-0 mt-1 w-52 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
                            <div className="p-1">
                              <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setSelectedProjekt(p); }} 
                                className="w-full text-left px-3 py-2 text-xs font-medium text-text-primary hover:bg-neutral-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                Details anzeigen
                              </button>

                              <button 
                                type="button"
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setActiveMenuId(null); 
                                  if (onNavigate) onNavigate('kalender', { date: p.startdatum || undefined, projektId: p.id }); 
                                }} 
                                className="w-full text-left px-3 py-2 text-xs font-medium text-text-primary hover:bg-neutral-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                              >
                                <IconCalendar className="w-3.5 h-3.5 text-text-secondary" />
                                <span>Im Kalender anzeigen</span>
                              </button>

                              <button 
                                type="button"
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setActiveMenuId(null); 
                                  if (onNavigate) onNavigate('kalender', { action: 'create', projektId: p.id, date: p.startdatum || new Date().toISOString().split('T')[0] }); 
                                }} 
                                className="w-full text-left px-3 py-2 text-xs font-medium text-text-primary hover:bg-neutral-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                              >
                                <IconClock className="w-3.5 h-3.5 text-text-secondary" />
                                <span>Termin erfassen</span>
                              </button>

                              {userRole !== 'treuhand' && (
                                <>
                                  {p.is_archived ? (
                                    <button 
                                      type="button"
                                      onClick={(e) => handleRestoreProjekt(p.id, e)} 
                                      className="w-full text-left px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                                    >
                                      <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                      Wiederherstellen
                                    </button>
                                  ) : (
                                    <button 
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setArchiveConfirmProjekt(p); }} 
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

                  <div className="flex items-center justify-between text-xs text-text-secondary pt-0.5">
                    <span className="flex items-center gap-1.5 truncate font-medium">
                      <IconUser className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      <span className="truncate">{p.kunden?.name || 'Kein Kunde'}</span>
                    </span>
                    {p.startdatum && (
                      <span className="shrink-0 text-text-muted flex items-center gap-1">
                        <IconCalendar className="w-3 h-3 text-text-muted shrink-0" />
                        <span>{formatDate(p.startdatum)}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onNavigate) onNavigate('kalender', { projektId: p.id, date: p.startdatum });
                      }}
                      className="text-text-secondary hover:text-text-primary font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <IconCalendar className="w-3.5 h-3.5 text-text-muted" />
                      <span>Kalender</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onNavigate) onNavigate('projekte', { projektId: p.id });
                        else setSelectedProjekt(p);
                      }}
                      className="font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 cursor-pointer"
                    >
                      Details anzeigen →
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
              placeholder="Projekte suchen nach Name, Adresse oder Kunde..."
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
              {filteredProjekte.length} {filteredProjekte.length === 1 ? 'Projekt' : 'Projekte'}
            </span>
          </div>
        </div>

        {/* Integrated Desktop Header */}
        <div className="hidden lg:grid grid-cols-[minmax(220px,1.4fr)_minmax(180px,1.2fr)_minmax(180px,1.2fr)_110px_110px_110px_40px] gap-3 px-5 py-3 bg-surface/60 border-b border-border text-[11px] font-bold text-text-secondary uppercase tracking-wider">
          <span className="cursor-pointer hover:text-text-primary flex items-center gap-1" onClick={() => requestSort('name')}>Projektname <SortIcon columnKey="name" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center gap-1" onClick={() => requestSort('kunde')}>Kunde <SortIcon columnKey="kunde" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center gap-1" onClick={() => requestSort('kategorie')}>Kategorie <SortIcon columnKey="kategorie" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center gap-1" onClick={() => requestSort('startdatum')}>Startdatum <SortIcon columnKey="startdatum" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center gap-1" onClick={() => requestSort('enddatum')}>Enddatum <SortIcon columnKey="enddatum" /></span>
          <span className="cursor-pointer hover:text-text-primary flex items-center justify-center gap-1" onClick={() => requestSort('status')}>Status <SortIcon columnKey="status" /></span>
          <span className="sr-only">Aktionen</span>
        </div>

        {isLoading ? (
          <div className="p-8 space-y-4">
            <div className="h-6 bg-gray-200/70 rounded w-1/4 animate-pulse"></div>
            <div className="h-12 bg-gray-200/50 rounded w-full animate-pulse"></div>
            <div className="h-12 bg-gray-200/50 rounded w-full animate-pulse"></div>
          </div>
        ) : filteredProjekte.length === 0 ? (
          <div className="text-center py-16 px-4 text-text-secondary">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-xl text-primary-600">
              <IconBauunternehmung className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-text-primary">Keine Projekte gefunden</p>
            <p className="text-xs text-text-secondary mt-1">Passe deine Suchbegriffe an oder lege ein neues Projekt an.</p>
          </div>
        ) : (
          <div ref={parent} className="divide-y divide-border">
            {filteredProjekte.map((p) => {
              const statusColorClass = p.status === 'In Arbeit' ? 'border-l-emerald-500' : p.status === 'Abgeschlossen' ? 'border-l-blue-500' : 'border-l-primary-500';
              return (
              <div
                key={p.id}
                onClick={() => onNavigate ? onNavigate('projekte', { projektId: p.id }) : setSelectedProjekt(p)}
                className={`flex flex-col lg:grid lg:grid-cols-[minmax(220px,1.4fr)_minmax(180px,1.2fr)_minmax(180px,1.2fr)_110px_110px_110px_40px] gap-3 lg:gap-3 p-4 lg:px-5 lg:py-3.5 hover:bg-primary-50/20 transition-colors cursor-pointer items-start lg:items-center border-l-4 ${statusColorClass} relative group`}
              >
                {/* Primary Info */}
                <div className="min-w-0 w-full flex flex-col justify-center">
                  {p.adresse ? (
                    <>
                      <div className="flex items-center gap-1.5 text-sm font-bold text-text-primary truncate">
                        <IconLocation className="w-3.5 h-3.5 text-primary-500 lg:hidden shrink-0" />
                        <span>{p.adresse}</span>
                      </div>
                      <div className="text-xs text-text-secondary truncate mt-0.5 font-medium">
                        {p.name}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-sm font-bold text-text-primary truncate">
                      <IconBauunternehmung className="w-3.5 h-3.5 text-primary-500 lg:hidden shrink-0" />
                      <span>{p.name}</span>
                    </div>
                  )}
                </div>

                {/* Mobile Kunde / Desktop Kunde */}
                <div className="text-sm text-text-secondary truncate flex items-center gap-1.5 mt-1 lg:mt-0">
                  <IconUser className="w-3.5 h-3.5 text-text-muted lg:hidden shrink-0" />
                  <span>{p.kunden?.name || '-'}</span>
                </div>

                {/* Kategorie (Desktop) */}
                <div className="hidden lg:block text-sm text-text-secondary truncate">
                  {p.kategorie || '-'}
                </div>

                {/* Mobile Startdatum / Desktop Startdatum */}
                <div className="text-xs text-text-secondary truncate flex items-center gap-2 mt-1 lg:mt-0">
                  <div className="w-8 h-1 bg-gray-200 rounded-full overflow-hidden relative shrink-0 lg:hidden">
                    <div className={`absolute left-0 top-0 h-full ${p.status === 'In Arbeit' ? 'w-1/2 bg-emerald-500 animate-pulse' : p.status === 'Abgeschlossen' ? 'w-full bg-emerald-500' : 'w-1/4 bg-blue-500'}`}></div>
                  </div>
                  {p.startdatum ? formatDate(p.startdatum) : '-'}
                </div>

                {/* Enddatum (Desktop) */}
                <div className="hidden lg:block text-xs text-text-secondary truncate">
                  {p.enddatum ? formatDate(p.enddatum) : '-'}
                </div>

                {/* Status */}
                <div className="absolute bottom-4 right-4 lg:relative lg:bottom-0 lg:right-0 lg:flex lg:items-center lg:justify-center">
                  {p.is_archived ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <IconFolder className="w-3.5 h-3.5" /> Archiv
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusColor[p.status] || 'bg-gray-100 text-gray-700'}`}>
                      {p.status === 'In Arbeit' && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      )}
                      {p.status || 'Aktiv'}
                    </span>
                  )}
                </div>

                {/* Quick Actions (3-dot Menu) */}
                <div className="absolute top-2 right-2 lg:relative lg:top-0 lg:right-0 flex items-center justify-end">
                  <div className="relative">
                    <button 
                      type="button"
                      aria-label="Aktionsmenü"
                      title="Aktionsmenü"
                      onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === p.id ? null : p.id); }}
                      className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                    </button>
                    
                    {activeMenuId === p.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} />
                        <div className="absolute right-0 mt-1 w-52 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
                          <div className="p-1">
                            <button 
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setSelectedProjekt(p); }} 
                              className="w-full text-left px-3 py-2 text-xs font-medium text-text-primary hover:bg-neutral-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              Details anzeigen
                            </button>

                            <button 
                              type="button"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setActiveMenuId(null); 
                                if (onNavigate) onNavigate('kalender', { date: p.startdatum || undefined, projektId: p.id }); 
                              }} 
                              className="w-full text-left px-3 py-2 text-xs font-medium text-text-primary hover:bg-neutral-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              <IconCalendar className="w-3.5 h-3.5 text-text-secondary" />
                              <span>Im Kalender anzeigen</span>
                            </button>

                            <button 
                              type="button"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setActiveMenuId(null); 
                                if (onNavigate) onNavigate('kalender', { action: 'create', projektId: p.id, date: p.startdatum || new Date().toISOString().split('T')[0] }); 
                              }} 
                              className="w-full text-left px-3 py-2 text-xs font-medium text-text-primary hover:bg-neutral-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              <IconClock className="w-3.5 h-3.5 text-text-secondary" />
                              <span>Termin erfassen</span>
                            </button>

                            {userRole !== 'treuhand' && (
                              <>
                                <button 
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setEditingProjekt(p); }} 
                                  className="w-full text-left px-3 py-2 text-xs font-medium text-text-primary hover:bg-neutral-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                  Bearbeiten
                                </button>

                                {p.is_archived ? (
                                  <button 
                                    type="button"
                                    onClick={(e) => handleRestoreProjekt(p.id, e)} 
                                    className="w-full text-left px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                                  >
                                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    Wiederherstellen
                                  </button>
                                ) : (
                                  <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setArchiveConfirmProjekt(p); }} 
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
            )})}
          </div>
        )}
      </div>

      {/* Archive Confirmation Modal */}
      {archiveConfirmProjekt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setArchiveConfirmProjekt(null)}>
          <div className="bg-surface-card rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl mb-4">
              <IconFolder className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Projekt archivieren?</h3>
            <p className="text-text-secondary text-sm mb-6 leading-relaxed">
              Möchtest du <strong>{archiveConfirmProjekt.name}</strong> wirklich archivieren? Das Projekt kann jederzeit über die Filterfunktion wiederhergestellt werden.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={() => setArchiveConfirmProjekt(null)}
                className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={handleArchiveProjekt}
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
        <ProjektCreateModal 
          onClose={() => {
            if (viewParams?.action === 'create') {
              navigateBack('projekte')
            } else {
              setIsCreateModalOpen(false)
            }
          }}
          prefilledKundeId={viewParams?.kundeId}
          onSuccess={(newProjekt) => {
            setProjekte([newProjekt, ...projekte])
            setIsCreateModalOpen(false)
            if (onNavigate) {
              onNavigate('projekte', { projektId: newProjekt.id }, { replace: true })
            } else {
              setSelectedProjekt(newProjekt)
            }
            showToast('success', 'Projekt erfolgreich erstellt.')
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

