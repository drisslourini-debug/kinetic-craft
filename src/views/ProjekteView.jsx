import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ProjektDetailView from './ProjektDetailView'
import ProjektCreateModal from './ProjektCreateModal'

export default function ProjekteView() {
  const [projekte, setProjekte] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProjekt, setSelectedProjekt] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const [showArchived, setShowArchived] = useState(false)

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
        if (data) setProjekte(data)
      } catch (err) {
        console.error('Error fetching projekte:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProjekte()
  }, [])

  const statusColor = {
    'Aktiv': 'bg-primary-100 text-primary-700',
    'In Arbeit': 'bg-amber-100 text-amber-700',
    'Abgeschlossen': 'bg-emerald-100 text-emerald-700',
  }

  if (selectedProjekt) {
    return (
      <ProjektDetailView 
        projekt={selectedProjekt} 
        onBack={() => {
          setSelectedProjekt(null)
          // Refresh to capture potential name/status changes
          supabase.from('projekte').select('*, kunden(name)').order('created_at', { ascending: false })
            .then(({ data }) => { if (data) setProjekte(data) })
        }} 
      />
    )
  }

  const filteredProjekte = projekte.filter(p => {
    if (!showArchived && p.is_archived) return false;
    const term = searchTerm.toLowerCase()
    return (
      (p.name || '').toLowerCase().includes(term) ||
      (p.adresse || '').toLowerCase().includes(term) ||
      (p.kunden?.name || '').toLowerCase().includes(term)
    )
  })

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
        <div className="text-center py-12 text-text-secondary">Lade Projekte...</div>
      ) : filteredProjekte.length === 0 ? (
        <div className="bg-surface-card rounded-2xl border border-border p-12 text-center">
          <p className="text-text-secondary mb-4">Keine Projekte gefunden.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjekte.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedProjekt(p)}
              className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 pr-4">
                  <h3 className="text-sm font-semibold text-text-primary truncate group-hover:text-primary-600 transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5 truncate flex items-center gap-1">
                    <span>👤</span> {p.kunden?.name || 'Kein Kunde'}
                  </p>
                </div>
                <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[p.status] || 'bg-gray-100 text-gray-700'}`}>
                  {p.status || 'Aktiv'}
                </span>
              </div>
              {p.adresse && (
                <div className="mt-4 pt-4 border-t border-border text-xs text-text-secondary truncate">
                  📍 {p.adresse}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isCreateModalOpen && (
        <ProjektCreateModal 
          onClose={() => setIsCreateModalOpen(false)}
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
