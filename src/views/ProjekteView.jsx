import { useState, useEffect } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { supabase } from '../lib/supabase'
import ProjektDetailView from './ProjektDetailView'
import ProjektCreateModal from './ProjektCreateModal'

export default function ProjekteView({ onNavigate, viewParams }) {
  const [parent] = useAutoAnimate()
  const [projekte, setProjekte] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProjekt, setSelectedProjekt] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' })

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
          if (viewParams?.projektId && !selectedProjekt) {
            const p = data.find(x => x.id === viewParams.projektId)
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
    
    // Check viewParams for create action
    if (viewParams?.action === 'create') {
      setIsCreateModalOpen(true)
    }
  }, [viewParams])

  const statusColor = {
    'Aktiv': 'bg-primary-100 text-primary-700',
    'In Arbeit': 'bg-amber-100 text-amber-700',
    'Abgeschlossen': 'bg-emerald-100 text-emerald-700',
  }

  if (selectedProjekt) {
    return (
      <ProjektDetailView 
        projekt={selectedProjekt} 
        onNavigate={onNavigate}
        initialTab={viewParams?.activeTab || 'projektdaten'}
        onBack={() => {
          setSelectedProjekt(null)
          // Refresh to capture potential name/status changes
          supabase.from('projekte').select('*, kunden(name)').order('created_at', { ascending: false })
            .then(({ data }) => { if (data) setProjekte(data) })
        }} 
      />
    )
  }

  let filteredProjekte = projekte.filter(p => {
    if (!showArchived && p.is_archived) return false;
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

  const handleDeleteProjekt = async (id, e) => {
    if (e) e.stopPropagation()
    setActiveMenuId(null)
    if (!window.confirm('Projekt wirklich ins Archiv verschieben?')) return
    
    try {
      const { error } = await supabase.from('projekte').update({ is_archived: true }).eq('id', id)
      if (error) throw error
      setProjekte(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      console.error(err)
      alert('Fehler beim Archivieren')
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Projekte & Objekte</h2>
          <p className="text-text-secondary mt-1">Alle Baustellen und Projekte auf einen Blick.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-semibold text-sm rounded-xl hover:bg-primary-700 active:scale-[0.97] transition-all shadow-md shadow-primary-600/20 cursor-pointer"
        >
          <span className="text-lg">+</span>
          Neues Projekt
        </button>
      </div>

      {/* Stats Cards (Desktop) */}
      <div className="hidden sm:grid grid-cols-3 gap-6">
        <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm relative overflow-hidden group">
          <svg className="absolute -right-4 -bottom-4 w-24 h-24 text-gray-50 opacity-50 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" /></svg>
          <div className="relative z-10">
            <h3 className="text-text-secondary text-sm font-medium mb-1">Alle Projekte</h3>
            <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
          </div>
        </div>
        <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm relative overflow-hidden group">
          <svg className="absolute -right-4 -bottom-4 w-24 h-24 text-emerald-50 opacity-50 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" /></svg>
          <div className="relative z-10">
            <h3 className="text-text-secondary text-sm font-medium mb-1">In Arbeit</h3>
            <p className="text-2xl font-bold text-text-primary">{stats.inArbeit}</p>
            <div className="w-full h-1 bg-gray-100 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.total > 0 ? (stats.inArbeit / stats.total) * 100 : 0}%` }}></div>
            </div>
          </div>
        </div>
        <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm relative overflow-hidden group">
          <svg className="absolute -right-4 -bottom-4 w-24 h-24 text-blue-50 opacity-50 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          <div className="relative z-10">
            <h3 className="text-text-secondary text-sm font-medium mb-1">Abgeschlossen</h3>
            <p className="text-2xl font-bold text-text-primary">{stats.abgeschlossen}</p>
          </div>
        </div>
      </div>

      {/* Stats Pills (Mobile) */}
      <div className="flex sm:hidden items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex items-center gap-2 bg-surface-card rounded-full border border-border px-4 py-2 shadow-sm whitespace-nowrap">
          <span className="text-text-secondary text-sm">Alle Projekte:</span>
          <span className="text-sm font-bold text-text-primary">{stats.total}</span>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 rounded-full border border-emerald-100 px-4 py-2 shadow-sm whitespace-nowrap">
          <span className="text-emerald-700 text-sm">In Arbeit:</span>
          <span className="text-sm font-bold text-emerald-800">{stats.inArbeit}</span>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 rounded-full border border-blue-100 px-4 py-2 shadow-sm whitespace-nowrap">
          <span className="text-blue-700 text-sm">Abgeschlossen:</span>
          <span className="text-sm font-bold text-blue-800">{stats.abgeschlossen}</span>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Projekte suchen nach Name, Adresse oder Kunde..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface-card border border-border rounded-xl text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer shrink-0">
          <input 
            type="checkbox" 
            checked={showArchived} 
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border-border text-primary-600 focus:ring-primary-500"
          />
          Archivierte einblenden
        </label>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4 p-6 w-full animate-pulse bg-surface-card rounded-2xl border border-border shadow-sm"><div className="h-6 bg-gray-200 rounded w-1/4"></div><div className="h-20 bg-gray-200 rounded w-full"></div><div className="h-20 bg-gray-200 rounded w-full"></div></div>
      ) : filteredProjekte.length === 0 ? (
        <div className="bg-surface-card rounded-2xl border border-border p-12 text-center">
          <p className="text-text-secondary mb-4">Keine Projekte gefunden.</p>
        </div>
      ) : (
        <div className="w-full">
          <div className="hidden lg:grid grid-cols-[1.5fr_1.5fr_1fr_120px_120px_100px_40px] gap-4 px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            <span className="cursor-pointer hover:text-text-primary flex items-center" onClick={() => requestSort('name')}>Projektname <SortIcon columnKey="name" /></span>
            <span className="cursor-pointer hover:text-text-primary flex items-center" onClick={() => requestSort('kunde')}>Kunde <SortIcon columnKey="kunde" /></span>
            <span className="cursor-pointer hover:text-text-primary flex items-center" onClick={() => requestSort('kategorie')}>Kategorie <SortIcon columnKey="kategorie" /></span>
            <span className="cursor-pointer hover:text-text-primary flex items-center" onClick={() => requestSort('startdatum')}>Startdatum <SortIcon columnKey="startdatum" /></span>
            <span className="cursor-pointer hover:text-text-primary flex items-center" onClick={() => requestSort('enddatum')}>Enddatum <SortIcon columnKey="enddatum" /></span>
            <span className="cursor-pointer hover:text-text-primary flex items-center justify-center" onClick={() => requestSort('status')}>Status <SortIcon columnKey="status" /></span>
            <span className="sr-only">Aktionen</span>
          </div>

          <div ref={parent} className="space-y-4 sm:space-y-0 sm:bg-surface-card sm:rounded-2xl sm:border sm:border-border sm:shadow-sm">
            {filteredProjekte.map((p) => {
              const statusColorClass = p.status === 'In Arbeit' ? 'border-l-emerald-500' : p.status === 'Abgeschlossen' ? 'border-l-blue-500' : 'border-l-primary-500';
              return (
              <div
                key={p.id}
                onClick={() => setSelectedProjekt(p)}
                className={`flex flex-col lg:grid lg:grid-cols-[1.5fr_1.5fr_1fr_120px_120px_100px_40px] gap-3 lg:gap-4 p-4 lg:px-5 lg:py-3.5 bg-surface-card lg:bg-transparent rounded-2xl lg:rounded-none border border-dashed lg:border-solid border-border lg:border-x-0 lg:border-t-0 lg:border-b lg:last:border-b-0 border-l-[6px] lg:border-l-[3px] ${statusColorClass} hover:-translate-y-1 lg:hover:-translate-y-0 hover:shadow-xl lg:hover:shadow-none lg:hover:bg-neutral-50/80 transition-all duration-200 cursor-pointer items-start lg:items-center relative group`}
              >
                {/* Primary Info */}
                <div className="min-w-0 w-full flex flex-col justify-center">
                  {p.adresse ? (
                    <>
                      <div className="flex items-center gap-1.5 text-base lg:text-sm font-bold text-text-primary truncate">
                        <span className="lg:hidden text-primary-500">📍</span> {p.adresse}
                      </div>
                      <div className="text-xs text-text-secondary truncate mt-0.5 font-medium">
                        {p.name}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-base lg:text-sm font-bold text-text-primary truncate">
                      <span className="lg:hidden text-primary-500">🏗️</span> {p.name}
                    </div>
                  )}
                </div>

                {/* Mobile Kunde (shown below title) / Desktop Kunde */}
                <div className="text-sm text-text-secondary truncate flex items-center gap-1 mt-1 lg:mt-0">
                  <span className="lg:hidden">👤</span> {p.kunden?.name || '-'}
                </div>

                {/* Kategorie (Desktop) */}
                <div className="hidden lg:block text-sm text-text-secondary truncate">
                  {p.kategorie || '-'}
                </div>

                {/* Mobile Startdatum / Desktop Startdatum */}
                <div className="text-sm text-text-secondary truncate flex items-center gap-2 mt-1 lg:mt-0">
                  <div className="w-8 h-1 bg-gray-200 rounded-full overflow-hidden relative shrink-0 lg:hidden">
                    <div className={`absolute left-0 top-0 h-full ${p.status === 'In Arbeit' ? 'w-1/2 bg-emerald-500 animate-pulse' : p.status === 'Abgeschlossen' ? 'w-full bg-emerald-500' : 'w-1/4 bg-blue-500'}`}></div>
                  </div>
                  {p.startdatum ? new Date(p.startdatum).toLocaleDateString('de-CH') : '-'}
                </div>

                {/* Enddatum (Desktop) */}
                <div className="hidden lg:block text-sm text-text-secondary truncate">
                  {p.enddatum ? new Date(p.enddatum).toLocaleDateString('de-CH') : '-'}
                </div>

                {/* Status */}
                <div className="absolute bottom-4 right-4 lg:relative lg:bottom-0 lg:right-0 lg:flex lg:items-center lg:justify-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[p.status] || 'bg-gray-100 text-gray-700'}`}>
                    {p.status === 'In Arbeit' && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    )}
                    {p.status || 'Aktiv'}
                  </span>
                </div>

                {/* Quick Actions (3-dot Menu) */}
                <div className="absolute top-2 right-2 lg:relative lg:top-0 lg:right-0 flex items-center justify-end">
                  <div className="relative">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === p.id ? null : p.id); }}
                      className="p-2 text-text-secondary hover:text-text-primary hover:bg-black/5 rounded-xl transition-colors cursor-pointer"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                    </button>
                    
                    {activeMenuId === p.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} />
                        <div className="absolute right-0 mt-1 w-48 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
                          <div className="p-1">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setSelectedProjekt(p); }} 
                              className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-neutral-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              Details anzeigen
                            </button>
                            
                            {p.adresse && (
                              <a 
                                href={`https://maps.google.com/?q=${encodeURIComponent(p.adresse)}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }}
                                className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-neutral-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                              >
                                <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                                Auf Karte zeigen
                              </a>
                            )}
                            
                            <div className="my-1 border-t border-border"></div>
                            
                            <button 
                              onClick={(e) => handleDeleteProjekt(p.id, e)} 
                              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              Archivieren
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <ProjektCreateModal 
          onClose={() => setIsCreateModalOpen(false)}
          prefilledKundeId={viewParams?.kundeId}
          onSuccess={(newProjekt) => {
            setProjekte([newProjekt, ...projekte])
            setIsCreateModalOpen(false)
            setSelectedProjekt(newProjekt)
          }}
        />
      )}
    </div>
  )
}

