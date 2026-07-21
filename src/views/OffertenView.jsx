import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import OffertenWizard from '../components/OffertenWizard'
import OfferteDetailView from './OfferteDetailView'

export default function OffertenView() {
  const [showWizard, setShowWizard] = useState(false)
  const [offerten, setOfferten] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOfferte, setSelectedOfferte] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    async function fetchOfferten() {
      if (!supabase) return
      
      try {
        setIsLoading(true)
        const { data, error } = await supabase
          .from('offerten')
          .select('*, kunden(name), projekte(name)')
          .order('created_at', { ascending: false })
          
        if (error) throw error
        if (data) setOfferten(data)
      } catch (err) {
        console.error('Error fetching offerten:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    // Listen for changes so list updates when returning from Wizard
    fetchOfferten()
  }, [showWizard, selectedOfferte])

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('de-CH', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })
  }

  const statusStyles = {
    'Entwurf': 'bg-gray-100 text-gray-600',
    'Versendet': 'bg-primary-100 text-primary-700',
    'In Überarbeitung': 'bg-amber-100 text-amber-700',
    'Akzeptiert': 'bg-emerald-100 text-emerald-700',
    'Abgelehnt': 'bg-red-100 text-red-600',
    'Verrechnet': 'bg-purple-100 text-purple-700',
  }

  // If wizard is open, render it fullscreen instead of the list
  if (showWizard) {
    return <OffertenWizard onClose={() => setShowWizard(false)} />
  }

  // If detail view is open
  if (selectedOfferte) {
    return <OfferteDetailView offerte={selectedOfferte} onBack={() => setSelectedOfferte(null)} />
  }

  const filteredOfferten = offerten.filter(o => {
    if (!showArchived && o.is_archived) return false

    // Status filter
    if (filterStatus && o.status !== filterStatus) return false

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

  // Generate month options from existing offers
  const availableMonths = [...new Set(offerten.map(o => {
    const d = new Date(o.created_at)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }))].sort().reverse()

  return (
    <div className="space-y-6">
      {/* Header with CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Offerten</h2>
          <p className="text-text-secondary mt-1">Alle Offerten und Angebote verwalten.</p>
        </div>

        {/* ★ THE TRIGGER BUTTON ★ */}
        <button
          id="btn-neue-offerte"
          onClick={() => setShowWizard(true)}
          className="inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold text-sm rounded-xl hover:from-primary-700 hover:to-primary-800 active:scale-[0.97] transition-all shadow-lg shadow-primary-600/25 cursor-pointer group"
        >
          <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-base group-hover:bg-white/30 transition-colors">+</span>
          Neue Offerte erstellen
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative flex-1 w-full">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Offerten suchen nach Nummer, Kunde oder Projekt..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface-card border border-border rounded-xl text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-start sm:items-center">
          <select 
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-surface-card border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 cursor-pointer w-full sm:w-40"
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
            className="px-4 py-2.5 bg-surface-card border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 cursor-pointer w-full sm:w-40"
          >
            <option value="">Alle Monate</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>{new Date(m + '-01').toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer shrink-0 ml-1">
            <input 
              type="checkbox" 
              checked={showArchived} 
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-border text-primary-600 focus:ring-primary-500"
            />
            Archivierte einblenden
          </label>
        </div>
      </div>

      {/* Offerten list */}
      <div className="bg-surface-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Desktop header */}
        <div className="hidden lg:grid grid-cols-[100px_1fr_1fr_140px_100px_100px] gap-4 px-5 py-3 bg-surface border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wider">
          <span>Nr.</span>
          <span>Kunde</span>
          <span>Objekt</span>
          <span className="text-right">Betrag</span>
          <span className="text-center">Status</span>
          <span className="text-right">Datum</span>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Lade Offerten...</div>
        ) : filteredOfferten.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">Keine Offerten gefunden.</div>
        ) : (
          filteredOfferten.map((o) => (
            <div
              key={o.id}
              onClick={() => setSelectedOfferte(o)}
              className="grid grid-cols-1 lg:grid-cols-[100px_1fr_1fr_140px_100px_100px] gap-2 lg:gap-4 px-5 py-4 border-b border-border last:border-b-0 hover:bg-primary-50/50 transition-colors cursor-pointer"
            >
              <span className="text-sm font-mono font-semibold text-primary-600">
                #{o.id}
              </span>
              <span className="text-sm font-medium text-text-primary truncate">{o.kunden?.name || 'Unbekannt'}</span>
              <span className="text-sm text-text-secondary truncate">{o.projekte?.name || 'Kein Projekt'}</span>
              <span className="text-sm font-semibold text-text-primary lg:text-right">
                CHF {o.total ? o.total.toFixed(2) : '0.00'}
              </span>
              <div className="lg:flex lg:justify-center lg:items-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[o.status] || statusStyles['Entwurf']}`}>
                  {o.status || 'Entwurf'}
                </span>
              </div>
              <span className="text-sm text-text-secondary lg:text-right">{formatDate(o.created_at)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
