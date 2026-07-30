import { useState, useEffect } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { supabase } from '../lib/supabase'
import KundeDetailView from './KundeDetailView'
import KundeCreateModal from './KundeCreateModal'

export default function KundenView({ onNavigate, viewParams }) {
  const [parent] = useAutoAnimate()
  const [kunden, setKunden] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedKunde, setSelectedKunde] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [activeMenuId, setActiveMenuId] = useState(null)
  
  // Sort state
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')

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
          if (viewParams?.kundeId && !selectedKunde) {
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
  }, [viewParams, selectedKunde])

  useEffect(() => {
    if (viewParams?.action === 'create' && !selectedKunde) {
      setIsCreateModalOpen(true)
    }
  }, [viewParams, selectedKunde])

  if (selectedKunde) {
    return (
      <KundeDetailView 
        kunde={selectedKunde} 
        onNavigate={onNavigate}
        initialTab={viewParams?.activeTab || 'stammdaten'}
        onBack={() => {
          setSelectedKunde(null)
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

  const handleDeleteKunde = async (id, e) => {
    if (e) e.stopPropagation()
    setActiveMenuId(null)
    if (!window.confirm('Kunden wirklich ins Archiv verschieben?')) return
    
    try {
      const { error } = await supabase.from('kunden').update({ is_archived: true }).eq('id', id)
      if (error) throw error
      setKunden(prev => prev.filter(k => k.id !== id))
    } catch (err) {
      console.error(err)
      alert('Fehler beim Archivieren')
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
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-semibold text-sm rounded-xl hover:bg-primary-700 active:scale-[0.97] transition-all shadow-md shadow-primary-600/20 cursor-pointer"
        >
          <span className="text-lg">+</span>
          Neuer Kunde
        </button>
      </div>

      {/* Stats Cards (Desktop) */}
      <div className="hidden sm:grid grid-cols-3 gap-6">
        <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm relative overflow-hidden group">
          <svg className="absolute -right-4 -bottom-4 w-24 h-24 text-gray-50 opacity-50 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
          <div className="relative z-10">
            <h3 className="text-text-secondary text-sm font-medium mb-1">Alle Kunden</h3>
            <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
          </div>
        </div>
        <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm relative overflow-hidden group">
          <svg className="absolute -right-4 -bottom-4 w-24 h-24 text-emerald-50 opacity-50 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          <div className="relative z-10">
            <h3 className="text-text-secondary text-sm font-medium mb-1">Aktive Kunden</h3>
            <p className="text-2xl font-bold text-text-primary">{stats.active}</p>
          </div>
        </div>
        <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm relative overflow-hidden group">
          <svg className="absolute -right-4 -bottom-4 w-24 h-24 text-blue-50 opacity-50 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
          <div className="relative z-10">
            <h3 className="text-text-secondary text-sm font-medium mb-1">Neu (Dieser Monat)</h3>
            <p className="text-2xl font-bold text-text-primary flex items-center gap-2">
              +{stats.newThisMonth}
              {stats.newThisMonth > 0 && <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center">↑</span>}
            </p>
          </div>
        </div>
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
            placeholder="Kunden suchen nach Name, Firma, Ort..."
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

      {/* Table / Card list */}
      <div className="w-full">
        <div className="hidden lg:grid grid-cols-[1.5fr_1.5fr_1.5fr_140px_120px_100px_40px] gap-4 px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
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
          <div className="p-8 text-center text-text-secondary bg-surface-card rounded-2xl border border-border shadow-sm">
            <div className="flex flex-col gap-4 p-6 w-full animate-pulse bg-surface-card rounded-2xl border border-border shadow-sm"><div className="h-6 bg-gray-200 rounded w-1/4"></div><div className="h-20 bg-gray-200 rounded w-full"></div><div className="h-20 bg-gray-200 rounded w-full"></div></div>
          </div>
        )}

        {error && (
          <div className="p-8 text-center text-red-500 bg-surface-card rounded-2xl border border-border shadow-sm">
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && filteredKunden.length === 0 && (
          <div className="p-8 text-center text-text-secondary bg-surface-card rounded-2xl border border-border shadow-sm">
            <p>Keine Kunden gefunden.</p>
          </div>
        )}

        <div ref={parent} className="space-y-4 lg:space-y-0 lg:bg-surface-card lg:rounded-2xl lg:border lg:border-border lg:shadow-sm">
        {filteredKunden.map((kunde) => {
          const displayName = kunde.firmenname 
            ? `${kunde.firmenname} ${kunde.vorname || ''} ${kunde.nachname || ''}`.trim()
            : `${kunde.vorname || ''} ${kunde.nachname || ''}`.trim() || kunde.name;

          return (
            <div
              key={kunde.id}
              onClick={() => setSelectedKunde(kunde)}
              className="flex flex-col lg:grid lg:grid-cols-[1.5fr_1.5fr_1.5fr_140px_120px_100px_40px] gap-3 lg:gap-4 p-4 lg:px-5 lg:py-3.5 bg-surface-card lg:bg-transparent rounded-2xl lg:rounded-none border border-dashed lg:border-solid border-border lg:border-x-0 lg:border-t-0 lg:border-b lg:last:border-b-0 hover:-translate-y-1 lg:hover:-translate-y-0 hover:shadow-xl lg:hover:shadow-none lg:hover:bg-neutral-50/80 transition-all duration-200 items-start lg:items-center cursor-pointer active:scale-[0.99] lg:active:scale-100 relative group"
            >
              {/* Primary Info */}
              <div className="flex items-center gap-3 w-full lg:w-auto pr-16 lg:pr-0">
                <div className={`w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-inner ${kunde.firmenname ? 'rounded-xl' : 'rounded-full'}`}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="font-bold text-base lg:text-sm text-text-primary truncate pr-2">{displayName}</div>
                  <span className="text-xs lg:hidden text-text-secondary truncate mt-0.5">
                    📍 {kunde.strasse ? `${kunde.strasse}, ` : ''}{kunde.ort || '-'}
                  </span>
                  
                  {/* Floating Action Buttons Desktop/Mobile integration */}
                  <div className="flex gap-2 mt-2 lg:hidden">
                    {kunde.telefon && (
                      <a 
                        href={`tel:${kunde.telefon}`} 
                        onClick={(e) => e.stopPropagation()}
                        className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 active:scale-95 transition-all border border-emerald-100"
                        title="Anrufen"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      </a>
                    )}
                    {kunde.email && (
                      <a 
                        href={`mailto:${kunde.email}`} 
                        onClick={(e) => e.stopPropagation()}
                        className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 active:scale-95 transition-all border border-blue-100"
                        title="E-Mail senden"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </a>
                    )}
                  </div>
                </div>
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
              <div className="hidden lg:block text-sm text-text-secondary truncate">
                {kunde.created_at ? new Date(kunde.created_at).toLocaleDateString('de-CH') : '-'}
              </div>

              {/* Status */}
              <div className="absolute top-4 right-14 lg:relative lg:top-0 lg:right-0 lg:flex lg:justify-center">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                  kunde.status === 'Aktiv'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {kunde.status || 'Aktiv'}
                </span>
              </div>

              {/* Quick Actions (3-dot Menu) */}
              <div className="absolute top-2 right-2 lg:relative lg:top-0 lg:right-0 flex items-center justify-end">
                <div className="relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === kunde.id ? null : kunde.id); }}
                    className="p-2 text-text-secondary hover:text-text-primary hover:bg-black/5 rounded-xl transition-colors cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                  </button>
                  
                  {activeMenuId === kunde.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} />
                      <div className="absolute right-0 mt-1 w-48 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="p-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); setSelectedKunde(kunde); }} 
                            className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-neutral-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            Details anzeigen
                          </button>
                          
                          {kunde.telefon && (
                            <a 
                              href={`tel:${kunde.telefon}`}
                              onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} 
                              className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-neutral-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                              Anrufen
                            </a>
                          )}
                          
                          {kunde.email && (
                            <a 
                              href={`mailto:${kunde.email}`}
                              onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} 
                              className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-neutral-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                              E-Mail senden
                            </a>
                          )}
                          
                          <div className="my-1 border-t border-border"></div>
                          
                          <button 
                            onClick={(e) => handleDeleteKunde(kunde.id, e)} 
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
          );
        })}
        </div>
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <KundeCreateModal 
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(newKunde) => {
            setKunden([...kunden, newKunde])
            setIsCreateModalOpen(false)
            setSelectedKunde(newKunde)
          }}
        />
      )}
    </div>
  )
}

