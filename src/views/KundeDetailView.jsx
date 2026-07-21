import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AddressAutocomplete from '../components/AddressAutocomplete'

const KUNDENTYPEN = [
  'Privatperson',
  'Architekturbüro',
  'Liegenschaftsverwaltung',
  'Generalunternehmung (GU)',
  'Geschäftskunde (Allgemein)'
];

const ZAHLUNGSZIELE = [
  '30 Tage netto',
  '10 Tage netto',
  'Vorauskasse',
  'Barzahlung'
];

export default function KundeDetailView({ kunde: initialKunde, onBack }) {
  const [kunde, setKunde] = useState(initialKunde)
  const [projekte, setProjekte] = useState([])
  const [offerten, setOfferten] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('stammdaten') // stammdaten, projekte, offerten

  useEffect(() => {
    async function loadDetails() {
      if (!supabase || !kunde) return
      
      try {
        setIsLoading(true)
        
        const { data: pData } = await supabase
          .from('projekte')
          .select('*')
          .eq('kunden_id', kunde.id)
          .order('created_at', { ascending: false })
        if (pData) setProjekte(pData)

        const { data: oData } = await supabase
          .from('offerten')
          .select('*')
          .eq('kunden_id', kunde.id)
          .order('created_at', { ascending: false })
        if (oData) setOfferten(oData)
      } catch (err) {
        console.error('Error loading details:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadDetails()
  }, [kunde.id])

  if (!kunde) return null

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('de-CH', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })
  }

  const handleUpdate = async (field, value) => {
    if (kunde[field] === value) return
    
    setIsSaving(true)
    setKunde(prev => ({ ...prev, [field]: value }))
    
    // Auto-update legacy name field if names change
    let updatePayload = { [field]: value }
    if (['firmenname', 'vorname', 'nachname'].includes(field)) {
      const tempKunde = { ...kunde, [field]: value }
      const newDisplayName = tempKunde.firmenname 
        ? `${tempKunde.firmenname} ${tempKunde.vorname || ''} ${tempKunde.nachname || ''}`.trim()
        : `${tempKunde.vorname || ''} ${tempKunde.nachname || ''}`.trim() || tempKunde.name
      
      if (newDisplayName !== kunde.name) {
        updatePayload.name = newDisplayName
        setKunde(prev => ({ ...prev, name: newDisplayName }))
      }
    }

    try {
      await supabase
        .from('kunden')
        .update(updatePayload)
        .eq('id', kunde.id)
    } catch (err) {
      console.error('Failed to update kunde:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const displayName = kunde.firmenname 
    ? `${kunde.firmenname} ${kunde.vorname || ''} ${kunde.nachname || ''}`.trim()
    : `${kunde.vorname || ''} ${kunde.nachname || ''}`.trim() || kunde.name;

  return (
    <div className="space-y-6">
      {/* Header */}
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
            <h2 className="text-2xl md:text-3xl font-bold text-text-primary">{displayName}</h2>
            {isSaving && <span className="text-xs text-text-secondary">Speichert...</span>}
          </div>
          <p className="text-text-secondary mt-1 flex items-center gap-2">
            <span>Kunden-Nr: {kunde.id}</span>
            {kunde.ort && <span>• 📍 {kunde.ort}</span>}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        {['stammdaten', 'projekte', 'offerten'].map(tab => (
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
            {tab === 'projekte' && ` (${projekte.length})`}
            {tab === 'offerten' && ` (${offerten.length})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-text-secondary">Lade Daten...</div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          
          {/* TAB: STAMMDATEN */}
          {activeTab === 'stammdaten' && (
            <div className="space-y-6">
              <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm">
                <h3 className="text-lg font-bold text-text-primary mb-4">Name, Firma & Typ</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Kundentyp</label>
                    <select 
                      value={kunde.typ || ''} 
                      onChange={e => setKunde({...kunde, typ: e.target.value})}
                      onBlur={e => handleUpdate('typ', e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                    >
                      <option value="">-- Bitte wählen --</option>
                      {KUNDENTYPEN.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Firmenname</label>
                    <input 
                      type="text" 
                      value={kunde.firmenname || ''} 
                      onChange={e => setKunde({...kunde, firmenname: e.target.value})}
                      onBlur={e => handleUpdate('firmenname', e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Vorname</label>
                    <input 
                      type="text" 
                      value={kunde.vorname || ''} 
                      onChange={e => setKunde({...kunde, vorname: e.target.value})}
                      onBlur={e => handleUpdate('vorname', e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Nachname</label>
                    <input 
                      type="text" 
                      value={kunde.nachname || ''} 
                      onChange={e => setKunde({...kunde, nachname: e.target.value})}
                      onBlur={e => handleUpdate('nachname', e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm">
                <h3 className="text-lg font-bold text-text-primary mb-4">Kontakt & Adresse</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Strasse</label>
                    <AddressAutocomplete 
                      value={kunde.strasse || ''} 
                      onChange={val => setKunde({...kunde, strasse: val})}
                      onBlur={() => handleUpdate('strasse', kunde.strasse)}
                      placeholder="Strasse eingeben (Auto-Fill)..."
                    />
                  </div>
                  <div className="grid grid-cols-[1fr_2fr] gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">PLZ</label>
                      <input 
                        type="text" 
                        value={kunde.plz || ''} 
                        onChange={e => setKunde({...kunde, plz: e.target.value})}
                        onBlur={e => handleUpdate('plz', e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Ort</label>
                      <input 
                        type="text" 
                        value={kunde.ort || ''} 
                        onChange={e => setKunde({...kunde, ort: e.target.value})}
                        onBlur={e => handleUpdate('ort', e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Telefon</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={kunde.telefon || ''} 
                        onChange={e => setKunde({...kunde, telefon: e.target.value})}
                        onBlur={e => handleUpdate('telefon', e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                      />
                      {kunde.telefon && (
                        <a href={`tel:${kunde.telefon}`} className="shrink-0 flex items-center justify-center w-9 h-9 bg-primary-50 text-primary-600 rounded-lg border border-primary-200 hover:bg-primary-100 transition-colors" title="Anrufen">📞</a>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">E-Mail</label>
                    <div className="flex gap-2">
                      <input 
                        type="email" 
                        value={kunde.email || ''} 
                        onChange={e => setKunde({...kunde, email: e.target.value})}
                        onBlur={e => handleUpdate('email', e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                      />
                      {kunde.email && (
                        <a href={`mailto:${kunde.email}`} className="shrink-0 flex items-center justify-center w-9 h-9 bg-primary-50 text-primary-600 rounded-lg border border-primary-200 hover:bg-primary-100 transition-colors" title="E-Mail schreiben">✉️</a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm">
                <h3 className="text-lg font-bold text-text-primary mb-4">Interne Notizen</h3>
                <textarea 
                  value={kunde.notizen || ''} 
                  onChange={e => setKunde({...kunde, notizen: e.target.value})}
                  onBlur={e => handleUpdate('notizen', e.target.value)}
                  className="w-full h-[150px] px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none"
                  placeholder="Notizen zum Kunden, Rückruf-Erinnerungen, Vorlieben..."
                />
              </div>

              <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm">
                <h3 className="text-lg font-bold text-text-primary mb-4">Standard-Konditionen</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Standard-Rabatt (%)</label>
                    <input 
                      type="number" 
                      min="0" max="100" step="0.5"
                      value={kunde.standard_rabatt || ''} 
                      onChange={e => setKunde({...kunde, standard_rabatt: e.target.value})}
                      onBlur={e => handleUpdate('standard_rabatt', e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                      placeholder="z.B. 5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Zahlungsziel</label>
                    <select 
                      value={kunde.zahlungsziel || ''} 
                      onChange={e => setKunde({...kunde, zahlungsziel: e.target.value})}
                      onBlur={e => handleUpdate('zahlungsziel', e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                    >
                      <option value="">-- Standard --</option>
                      {ZAHLUNGSZIELE.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                {kunde.is_archived ? (
                  <button 
                    onClick={() => {
                      if (window.confirm('Kunde wiederherstellen? Er wird wieder in der aktiven Liste angezeigt.')) {
                        handleUpdate('is_archived', false)
                      }
                    }}
                    className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors"
                  >
                    Kunde wiederherstellen
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      if (window.confirm('Kunde wirklich archivieren? Er verschwindet aus der Liste, aber Projekte/Offerten bleiben erhalten.')) {
                        handleUpdate('is_archived', true)
                        onBack() // zurück zur Liste
                      }
                    }}
                    className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors"
                  >
                    Kunde archivieren
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB: PROJEKTE */}
          {activeTab === 'projekte' && (
            <div className="space-y-4">
              {projekte.length === 0 ? (
                <div className="bg-surface-card rounded-2xl border border-border p-8 text-center text-text-secondary">
                  Dieser Kunde hat noch keine Projekte.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {projekte.map(projekt => {
                    const anzOfferten = offerten.filter(o => o.projekt_id === projekt.id).length
                    return (
                      <div key={projekt.id} className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="text-xs font-semibold text-primary-600 mb-1">
                              {formatDate(projekt.created_at)}
                            </div>
                            <h4 className="font-bold text-text-primary">{projekt.name}</h4>
                            <p className="text-sm text-text-secondary mt-1">{projekt.adresse || 'Keine Adresse'}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            projekt.status === 'Abgeschlossen' ? 'bg-emerald-100 text-emerald-700' :
                            projekt.status === 'In Arbeit' ? 'bg-amber-100 text-amber-700' :
                            'bg-primary-100 text-primary-700'
                          }`}>
                            {projekt.status || 'Aktiv'}
                          </span>
                        </div>
                        <div className="text-xs text-text-secondary">
                          {anzOfferten} Offerte(n) hinterlegt
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: OFFERTEN */}
          {activeTab === 'offerten' && (
            <div className="space-y-4">
              {offerten.length === 0 ? (
                <div className="bg-surface-card rounded-2xl border border-border p-8 text-center text-text-secondary">
                  Dieser Kunde hat noch keine Offerten.
                </div>
              ) : (
                <div className="bg-surface-card rounded-2xl border border-border overflow-hidden">
                  {offerten.map((off) => {
                    const projekt = projekte.find(p => p.id === off.projekt_id)
                    return (
                      <div key={off.id} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_100px] gap-2 sm:gap-4 p-4 border-b border-border last:border-b-0 hover:bg-primary-50/50 transition-colors items-center">
                        <div>
                          <div className="font-semibold text-text-primary flex justify-between sm:block">
                            <span>Offerte #{off.id}</span>
                            <span className={`sm:hidden inline-block px-2 py-0.5 rounded-lg text-xs font-bold ${
                              off.status === 'Akzeptiert' ? 'bg-emerald-100 text-emerald-700' :
                              off.status === 'Abgelehnt' ? 'bg-red-100 text-red-700' :
                              off.status === 'Entwurf' ? 'bg-gray-100 text-gray-600' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {off.status}
                            </span>
                          </div>
                          <div className="text-xs text-text-secondary">{projekt ? projekt.name : 'Kein Projekt'}</div>
                        </div>
                        <div className="sm:text-right font-bold text-text-primary text-sm mt-1 sm:mt-0">
                          <span className="sm:hidden text-xs font-normal text-text-secondary mr-2">Total:</span>
                          CHF {(off.total || 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="hidden sm:block text-right">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                            off.status === 'Akzeptiert' ? 'bg-emerald-100 text-emerald-700' :
                            off.status === 'Abgelehnt' ? 'bg-red-100 text-red-700' :
                            off.status === 'Entwurf' ? 'bg-gray-100 text-gray-600' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {off.status}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          
        </div>
      )}
    </div>
  )
}
