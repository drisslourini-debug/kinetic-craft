import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AddressAutocomplete from '../components/AddressAutocomplete'

const PROJEKT_KATEGORIEN = [
  'Neubau',
  'Umbau / Renovation',
  'Reparatur / Service',
  'Sanierung'
];

export default function ProjektDetailView({ projekt: initialProjekt, onBack }) {
  const [projekt, setProjekt] = useState(initialProjekt)
  const [offerten, setOfferten] = useState([])
  const [kunde, setKunde] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('projektdaten') // projektdaten, offerten

  useEffect(() => {
    async function loadDetails() {
      if (!supabase || !projekt) return
      
      try {
        setIsLoading(true)
        
        // Load the associated customer
        if (projekt.kunden_id) {
          const { data: kData } = await supabase
            .from('kunden')
            .select('*')
            .eq('id', projekt.kunden_id)
            .single()
            
          if (kData) setKunde(kData)
        }

        // Load quotes
        const { data: oData } = await supabase
          .from('offerten')
          .select('*')
          .eq('projekt_id', projekt.id)
          .order('created_at', { ascending: false })
          
        if (oData) setOfferten(oData)
      } catch (err) {
        console.error('Error loading projekt details:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadDetails()
  }, [projekt.id])

  const handleUpdate = async (field, value) => {
    if (projekt[field] === value) return // no change
    
    setIsSaving(true)
    setProjekt(prev => ({ ...prev, [field]: value }))
    
    try {
      await supabase
        .from('projekte')
        .update({ [field]: value })
        .eq('id', projekt.id)
    } catch (err) {
      console.error('Failed to update projekt:', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (!projekt) return null

  // Helper to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('de-CH', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })
  }

  const statusStyles = {
    'Entwurf': 'bg-gray-100 text-gray-600',
    'Versendet': 'bg-primary-100 text-primary-700',
    'Akzeptiert': 'bg-emerald-100 text-emerald-700',
    'Abgelehnt': 'bg-red-100 text-red-600',
  }

  return (
    <div className="space-y-6">
      {/* Header mit Zurück-Button */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-surface-card border border-transparent hover:border-border transition-all text-text-secondary hover:text-text-primary cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-bold text-text-primary">{projekt.name}</h2>
            {isSaving && <span className="text-xs text-text-secondary">Speichert...</span>}
          </div>
          <p className="text-text-secondary mt-1 flex items-center gap-2">
            <span>{projekt.adresse ? `📍 ${projekt.adresse}` : 'Keine Baustellenadresse'}</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        {['projektdaten', 'offerten'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-2 text-sm font-semibold capitalize border-b-2 transition-colors cursor-pointer ${
              activeTab === tab 
                ? 'border-primary-500 text-primary-600' 
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
            }`}
          >
            {tab}
            {tab === 'offerten' && ` (${offerten.length})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-text-secondary">Lade Daten...</div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          
          {/* TAB: PROJEKTDATEN */}
          {activeTab === 'projektdaten' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm space-y-6">
                <h3 className="text-lg font-bold text-text-primary">Stammdaten</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Projektname</label>
                    <input 
                      type="text" 
                      value={projekt.name || ''} 
                      onChange={e => setProjekt({...projekt, name: e.target.value})}
                      onBlur={e => handleUpdate('name', e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Kategorie</label>
                    <select 
                      value={projekt.kategorie || ''}
                      onChange={(e) => setProjekt({...projekt, kategorie: e.target.value})}
                      onBlur={(e) => handleUpdate('kategorie', e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                    >
                      <option value="">-- Bitte wählen --</option>
                      {PROJEKT_KATEGORIEN.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Baustellen-Adresse</label>
                    <AddressAutocomplete 
                      value={projekt.adresse || ''}
                      onChange={(val) => setProjekt({...projekt, adresse: val})}
                      onBlur={() => handleUpdate('adresse', projekt.adresse)}
                      placeholder="Strasse eingeben (Auto-Fill)..."
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Status</label>
                    <select 
                      value={projekt.status || 'Aktiv'}
                      onChange={(e) => handleUpdate('status', e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 font-medium focus:ring-1 focus:ring-primary-400"
                    >
                      <option value="Aktiv">Aktiv</option>
                      <option value="In Arbeit">In Arbeit</option>
                      <option value="Abgeschlossen">Abgeschlossen</option>
                    </select>
                  </div>
                </div>

                {kunde && (
                  <div className="pt-6 border-t border-border">
                    <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold flex items-center gap-1">
                      <span>👤</span> Zugehöriger Kunde
                    </label>
                    <div className="mt-2 font-medium text-text-primary">{kunde.name}</div>
                    {kunde.ort && <div className="text-sm text-text-secondary mt-0.5">{kunde.ort}</div>}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
                  <h3 className="text-lg font-bold text-text-primary">Termine</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Startdatum</label>
                      <input 
                        type="date"
                        value={projekt.startdatum || ''}
                        onChange={(e) => setProjekt({...projekt, startdatum: e.target.value})}
                        onBlur={(e) => handleUpdate('startdatum', e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Enddatum</label>
                      <input 
                        type="date"
                        value={projekt.enddatum || ''}
                        onChange={(e) => setProjekt({...projekt, enddatum: e.target.value})}
                        onBlur={(e) => handleUpdate('enddatum', e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-text-primary mb-4">Besonderheiten & Notizen</h3>
                  <textarea 
                    value={projekt.notizen || ''}
                    onChange={(e) => setProjekt({...projekt, notizen: e.target.value})}
                    onBlur={(e) => handleUpdate('notizen', e.target.value)}
                    className="w-full h-32 px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none"
                    placeholder="Zugangscodes, Materiallagerplatz, Besonderheiten zur Baustelle..."
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 md:col-span-2">
                {projekt.is_archived ? (
                  <button 
                    onClick={() => {
                      if (window.confirm('Projekt wiederherstellen? Es wird wieder in der aktiven Liste angezeigt.')) {
                        handleUpdate('is_archived', false)
                      }
                    }}
                    className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors"
                  >
                    Projekt wiederherstellen
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      if (window.confirm('Projekt wirklich archivieren? Es verschwindet aus der Liste, bleibt aber erhalten.')) {
                        handleUpdate('is_archived', true)
                        onBack()
                      }
                    }}
                    className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors"
                  >
                    Projekt archivieren
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB: OFFERTEN */}
          {activeTab === 'offerten' && (
            <div className="space-y-4">
              {offerten.length === 0 ? (
                <div className="bg-surface-card rounded-2xl border border-border p-8 text-center text-text-secondary">
                  Noch keine Offerten für dieses Projekt vorhanden.
                </div>
              ) : (
                <div className="bg-surface-card rounded-2xl border border-border overflow-hidden shadow-sm">
                  <div className="divide-y divide-border">
                    {offerten.map(off => (
                      <div key={off.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-primary-50/30 transition-colors">
                        <div>
                          <div className="font-mono text-sm font-semibold text-primary-600 mb-1">#{off.id}</div>
                          <div className="text-text-secondary text-sm flex items-center gap-2">
                            <span>📅 {formatDate(off.created_at)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 sm:justify-end">
                          <div className="text-right">
                            <div className="font-bold text-text-primary">
                              CHF {(off.total || 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusStyles[off.status] || statusStyles['Entwurf']}`}>
                            {off.status || 'Entwurf'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
