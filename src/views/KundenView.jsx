import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import KundeDetailView from './KundeDetailView'
import KundeCreateModal from './KundeCreateModal'

export default function KundenView() {
  const [kunden, setKunden] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedKunde, setSelectedKunde] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const [showArchived, setShowArchived] = useState(false)

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
        setKunden(data || [])
      } catch (err) {
        console.error('Fehler beim Laden der Kunden:', err)
        setError('Kunden konnten nicht geladen werden.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchKunden()
  }, [])

  if (selectedKunde) {
    return (
      <KundeDetailView 
        kunde={selectedKunde} 
        onBack={() => {
          setSelectedKunde(null)
          // Refresh list to show potentially updated names
          supabase.from('kunden').select('*').order('name', { ascending: true })
            .then(({ data }) => { if (data) setKunden(data) })
        }} 
      />
    )
  }

  const filteredKunden = kunden.filter(k => {
    if (!showArchived && k.is_archived) return false;
    const term = searchTerm.toLowerCase()
    return (
      (k.name || '').toLowerCase().includes(term) ||
      (k.firmenname || '').toLowerCase().includes(term) ||
      (k.vorname || '').toLowerCase().includes(term) ||
      (k.nachname || '').toLowerCase().includes(term) ||
      (k.ort || '').toLowerCase().includes(term)
    )
  })

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
      <div className="bg-surface-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Desktop table header */}
        <div className="hidden sm:grid grid-cols-[1fr_150px_100px] gap-4 px-5 py-3 bg-surface border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wider">
          <span>Kunde</span>
          <span>Ort</span>
          <span className="text-center">Status</span>
        </div>
        
        {isLoading && (
          <div className="p-8 text-center text-text-secondary">
            <p>Lade Kunden...</p>
          </div>
        )}

        {error && (
          <div className="p-8 text-center text-red-500">
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && filteredKunden.length === 0 && (
          <div className="p-8 text-center text-text-secondary">
            <p>Keine Kunden gefunden.</p>
          </div>
        )}

        {filteredKunden.map((kunde) => {
          const displayName = kunde.firmenname 
            ? `${kunde.firmenname} ${kunde.vorname || ''} ${kunde.nachname || ''}`.trim()
            : `${kunde.vorname || ''} ${kunde.nachname || ''}`.trim() || kunde.name;

          return (
            <div
              key={kunde.id}
              onClick={() => setSelectedKunde(kunde)}
              className="grid grid-cols-1 sm:grid-cols-[1fr_150px_100px] gap-2 sm:gap-4 px-5 py-4 border-b border-border last:border-b-0 hover:bg-primary-50/50 transition-colors cursor-pointer items-center"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-sm text-text-primary">{displayName}</div>
                  {(kunde.email || kunde.telefon) && (
                    <div className="text-xs text-text-secondary mt-0.5 flex gap-2">
                      {kunde.telefon && <span>📞 {kunde.telefon}</span>}
                      {kunde.email && <span>✉️ {kunde.email}</span>}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-sm text-text-secondary sm:flex sm:items-center">
                <span className="sm:hidden text-xs text-text-secondary mr-1">Ort:</span>
                {kunde.ort || '-'}
              </span>
              <div className="sm:flex sm:items-center sm:justify-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  kunde.status === 'Aktiv'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {kunde.status || 'Aktiv'}
                </span>
              </div>
            </div>
          )
        })}
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
