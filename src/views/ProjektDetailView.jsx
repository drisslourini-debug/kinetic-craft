import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AddressAutocomplete from '../components/AddressAutocomplete'

const PROJEKT_KATEGORIEN = [
  'Neubau',
  'Umbau / Renovation',
  'Reparatur / Service',
  'Sanierung'
];

export default function ProjektDetailView({ projekt: initialProjekt, onBack, onNavigate }) {
  const [projekt, setProjekt] = useState(initialProjekt)
  const [offerten, setOfferten] = useState([])
  const [rechnungen, setRechnungen] = useState([])
  const [kunde, setKunde] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('projektdaten') // projektdaten, offerten, rechnungen
  const [isDirty, setIsDirty] = useState(false)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const [showDeleteWarning, setShowDeleteWarning] = useState(false)

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

        // Load invoices
        const { data: rData } = await supabase
          .from('rechnungen')
          .select('*')
          .eq('projekt_id', projekt.id)
          .order('created_at', { ascending: false })
          
        if (rData) setRechnungen(rData)
      } catch (err) {
        console.error('Error loading projekt details:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadDetails()
  }, [projekt.id])

  const handleInputChange = (field, value) => {
    setProjekt(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    
    // We don't want to try and write read-only or joined fields
    const dataToSave = {
      name: projekt.name,
      kunden_id: projekt.kunden_id,
      kategorie: projekt.kategorie,
      adresse: projekt.adresse,
      status: projekt.status,
      startdatum: projekt.startdatum,
      enddatum: projekt.enddatum,
      notizen: projekt.notizen,
      is_archived: projekt.is_archived
    }
    
    try {
      await supabase
        .from('projekte')
        .update(dataToSave)
        .eq('id', projekt.id)
        
      setIsDirty(false)
    } catch (err) {
      console.error('Failed to update projekt:', err)
      alert('Fehler beim Speichern.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsSaving(true)
    try {
      await supabase
        .from('projekte')
        .delete()
        .eq('id', projekt.id)
        
      onBack() // go back to list
    } catch (err) {
      console.error('Failed to delete projekt:', err)
      alert('Fehler beim Löschen. Eventuell gibt es noch verknüpfte Daten.')
    } finally {
      setIsSaving(false)
      setShowDeleteWarning(false)
    }
  }

  const handleBackClick = () => {
    if (isDirty) {
      setShowUnsavedWarning(true)
    } else {
      onBack()
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
      {/* Header mit Zurück-Button & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBackClick}
            className="p-2 rounded-xl hover:bg-surface-card border border-transparent hover:border-border transition-all text-text-secondary hover:text-text-primary cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl md:text-3xl font-bold text-text-primary">{projekt.name}</h2>
              {isDirty && <span className="w-2 h-2 rounded-full bg-amber-500" title="Ungespeicherte Änderungen"></span>}
            </div>
          <p className="text-text-secondary mt-1 flex items-center gap-2">
            <span>{projekt.adresse ? `📍 ${projekt.adresse}` : 'Keine Baustellenadresse'}</span>
          </p>
          </div>
        </div>

        {/* Quick Actions (nur wenn nicht dirty) */}
        <div className="flex items-center gap-2 self-start sm:self-auto ml-12 sm:ml-0 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar w-full sm:w-auto">
          <button 
            onClick={() => !isDirty && onNavigate && onNavigate('offerten', { action: 'create', projektId: projekt.id, kundeId: projekt.kunden_id })}
            disabled={isDirty}
            className="flex-shrink-0 px-3 py-1.5 bg-surface text-primary-600 text-xs font-semibold rounded-lg border border-primary-200 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
          >
            + Neue Offerte
          </button>
          <button 
            onClick={() => !isDirty && onNavigate && onNavigate('rechnungen', { action: 'create', projektId: projekt.id, kundeId: projekt.kunden_id })}
            disabled={isDirty}
            className="flex-shrink-0 px-3 py-1.5 bg-surface text-primary-600 text-xs font-semibold rounded-lg border border-primary-200 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
          >
            + Neue Rechnung
          </button>
        </div>
      </div>

      {/* Warnung bei ungespeicherten Änderungen, falls man Quick Actions nutzen will */}
      {isDirty && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <strong>Ungespeicherte Änderungen:</strong> Bitte speichere das Projekt zuerst ab, bevor du eine Offerte oder Rechnung erstellst.
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        {['projektdaten', 'offerten', 'rechnungen'].map(tab => (
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
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4 p-6 w-full animate-pulse bg-surface-card rounded-2xl border border-border shadow-sm"><div className="h-6 bg-gray-200 rounded w-1/4"></div><div className="h-20 bg-gray-200 rounded w-full"></div><div className="h-20 bg-gray-200 rounded w-full"></div></div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          
          {/* TAB: PROJEKTDATEN */}
          {activeTab === 'projektdaten' && (
            <div className="animate-fade-in-up grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm space-y-6">
                <h3 className="text-lg font-bold text-text-primary">Stammdaten</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Projektname</label>
                    <input 
                      type="text" 
                      value={projekt.name || ''} 
                      onChange={e => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Kategorie</label>
                    <select 
                      value={projekt.kategorie || ''}
                      onChange={(e) => handleInputChange('kategorie', e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                    >
                      <option value="">-- Bitte wählen --</option>
                      {PROJEKT_KATEGORIEN.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Baustellen-Adresse</label>
                    <AddressAutocomplete 
                      value={projekt.adresse || ''}
                      onChange={(val) => handleInputChange('adresse', val)}
                      placeholder="Strasse eingeben (Auto-Fill)..."
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Status</label>
                    <select 
                      value={projekt.status || 'Aktiv'}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-base focus:outline-none focus:border-primary-400 font-medium focus:ring-1 focus:ring-primary-400"
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
                    <div 
                      className="mt-2 font-medium text-primary-600 hover:text-primary-800 cursor-pointer transition-colors"
                      onClick={() => kunde && onNavigate && onNavigate('kunden', { kundeId: kunde.id })}
                    >{kunde.name}</div>
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
                        onChange={(e) => handleInputChange('startdatum', e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Enddatum</label>
                      <input 
                        type="date"
                        value={projekt.enddatum || ''}
                        onChange={(e) => handleInputChange('enddatum', e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-text-primary mb-4">Besonderheiten & Notizen</h3>
                  <textarea 
                    value={projekt.notizen || ''}
                    onChange={(e) => handleInputChange('notizen', e.target.value)}
                    className="w-full h-32 px-3 py-2 bg-surface border border-border rounded-lg text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none"
                    placeholder="Zugangscodes, Materiallagerplatz, Besonderheiten zur Baustelle..."
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 md:col-span-2">
                <div>
                  {isDirty && (
                    <span className="text-sm text-amber-600 font-medium animate-pulse">
                      Es gibt ungespeicherte Änderungen
                    </span>
                  )}
                </div>
                <button 
                  onClick={handleSave}
                  disabled={!isDirty || isSaving}
                  className="w-full sm:w-auto px-6 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary-600/20"
                >
                  {isSaving ? 'Wird gespeichert...' : 'Änderungen speichern'}
                </button>
              </div>

              {/* Subtle Delete Button */}
              <div className="md:col-span-2 mt-8 pt-6 border-t border-border flex justify-end">
                <button
                  onClick={() => setShowDeleteWarning(true)}
                  className="flex items-center gap-2 px-4 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Projekt löschen
                </button>
              </div>
            </div>
          )}

          {/* TAB: OFFERTEN */}
          {activeTab === 'offerten' && (
            <div className="animate-fade-in-up">
              {offerten.length === 0 ? (
                <div className="bg-surface-card rounded-2xl border border-dashed border-border p-12 text-center flex flex-col items-center justify-center gap-4 relative overflow-hidden">
                  <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-2">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">Keine Offerten für dieses Projekt</h3>
                    <p className="text-text-secondary mt-1">Sichere den Auftrag und schreibe jetzt die erste Offerte.</p>
                  </div>
                  <button 
                    onClick={() => !isDirty && onNavigate && onNavigate('offerten', { action: 'create', projektId: projekt.id, kundeId: projekt.kunden_id })}
                    disabled={isDirty}
                    className="mt-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold shadow-md shadow-primary-600/20 hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer relative z-10"
                  >
                    + Erste Offerte erstellen
                  </button>
                  {/* Subtle document decoration background */}
                  <div className="absolute -right-8 -bottom-8 w-40 h-40 border border-amber-100 rounded-lg transform rotate-12 bg-amber-50/20 z-0 pointer-events-none"></div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {offerten.map(off => (
                    <div 
                      key={off.id} 
                      onClick={() => onNavigate && onNavigate('offerten', { offerteId: off.id })}
                      className="group bg-surface-card rounded-xl border border-dashed border-border overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer relative flex flex-col sm:flex-row"
                    >
                      {/* Left accent strip */}
                      <div className="w-full sm:w-2 bg-amber-400 h-1.5 sm:h-auto"></div>
                      
                      <div className="flex-1 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                          <div className="hidden sm:flex w-12 h-12 rounded-xl bg-amber-50 text-amber-600 items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          </div>
                          <div>
                            <div className="font-bold text-base sm:text-lg text-text-primary flex items-center gap-2">
                              Offerte {off.offerte_nr || `#${off.id}`}
                            </div>
                            <div className="text-text-secondary text-sm flex items-center gap-2 mt-1">
                              <span>📅 Erstellt am {formatDate(off.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* The "Document Total" Look */}
                        <div className="w-full sm:w-auto flex items-center justify-between sm:flex-col sm:items-end gap-1 border-t border-dashed border-border sm:border-none pt-3 sm:pt-0">
                          <div className="flex flex-col sm:items-end">
                            <span className="text-xs text-text-secondary uppercase tracking-widest font-semibold">Total</span>
                            <div className="font-mono font-bold text-lg text-text-primary">
                              CHF {(off.total || 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                          
                          {/* "Stamp" Look for status */}
                          <div className={`mt-1 inline-block px-2.5 py-0.5 rounded border-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider transform sm:-rotate-3 ${
                            off.status === 'Akzeptiert' ? 'border-emerald-500 text-emerald-600 bg-emerald-50' :
                            off.status === 'Abgelehnt' ? 'border-red-500 text-red-600 bg-red-50' :
                            off.status === 'Entwurf' ? 'border-gray-400 text-gray-500 bg-gray-50' :
                            'border-amber-500 text-amber-600 bg-amber-50'
                          }`}>
                            {off.status || 'Entwurf'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: RECHNUNGEN */}
          {activeTab === 'rechnungen' && (
            <div className="animate-fade-in-up">
              {rechnungen.length === 0 ? (
                <div className="bg-surface-card rounded-2xl border border-dashed border-border p-12 text-center flex flex-col items-center justify-center gap-4 relative overflow-hidden">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-2">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">Noch keine Rechnungen für dieses Projekt</h3>
                    <p className="text-text-secondary mt-1">Erstelle deine erste Rechnung, sobald Leistungen erbracht wurden.</p>
                  </div>
                  <button 
                    onClick={() => !isDirty && onNavigate && onNavigate('rechnungen', { action: 'create', projektId: projekt.id, kundeId: projekt.kunden_id })}
                    disabled={isDirty}
                    className="mt-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold shadow-md shadow-primary-600/20 hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer relative z-10"
                  >
                    + Erste Rechnung erstellen
                  </button>
                  {/* Subtle document decoration background */}
                  <div className="absolute -left-8 -bottom-8 w-40 h-40 border border-emerald-100 rounded-lg transform -rotate-12 bg-emerald-50/20 z-0 pointer-events-none"></div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {rechnungen.map(re => (
                    <div 
                      key={re.id} 
                      onClick={() => onNavigate && onNavigate('rechnungen', { rechnungId: re.id })}
                      className="group bg-surface-card rounded-xl border border-dashed border-border overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer relative flex flex-col sm:flex-row"
                    >
                      {/* Left accent strip */}
                      <div className="w-full sm:w-2 bg-emerald-500 h-1.5 sm:h-auto"></div>
                      
                      <div className="flex-1 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                          <div className="hidden sm:flex w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                          <div>
                            <div className="font-bold text-base sm:text-lg text-text-primary flex items-center gap-2">
                              {re.rechnung_nr || `Rechnung #${re.id}`}
                            </div>
                            <div className="text-text-secondary text-sm flex flex-col sm:flex-row gap-1 sm:gap-3 mt-1">
                              <span>📅 Vom {formatDate(re.created_at)}</span>
                              {re.faellig_am && <span className="font-medium text-amber-700">⚠️ Fällig: {formatDate(re.faellig_am)}</span>}
                            </div>
                          </div>
                        </div>
                        
                        {/* The "Document Total" Look */}
                        <div className="w-full sm:w-auto flex items-center justify-between sm:flex-col sm:items-end gap-1 border-t border-dashed border-border sm:border-none pt-3 sm:pt-0">
                          <div className="flex flex-col sm:items-end">
                            <span className="text-xs text-text-secondary uppercase tracking-widest font-semibold">Total</span>
                            <div className="font-mono font-bold text-lg text-text-primary">
                              CHF {(re.total || 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                          
                          {/* "Stamp" Look for status */}
                          <div className={`mt-1 inline-block px-2.5 py-0.5 rounded border-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider transform sm:rotate-3 ${
                            re.status === 'Bezahlt' ? 'border-emerald-500 text-emerald-600 bg-emerald-50' :
                            re.status === 'Überfällig' ? 'border-red-500 text-red-600 bg-red-50' :
                            re.status === 'Versendet' ? 'border-blue-500 text-blue-600 bg-blue-50' :
                            re.status === 'Storniert' ? 'border-gray-400 text-gray-500 bg-gray-50' :
                            'border-gray-400 text-gray-500 bg-gray-50'
                          }`}>
                            {re.status || 'Entwurf'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Unsaved Changes Modal */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Ungespeicherte Änderungen</h3>
            <p className="text-text-secondary mb-6 text-sm">
              Du hast Änderungen an diesem Projekt vorgenommen. Möchtest du sie verwerfen oder abbrechen und speichern?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setShowUnsavedWarning(false)}
                className="flex-1 px-4 py-2.5 bg-surface text-text-primary border border-border rounded-xl hover:bg-neutral-100 font-medium transition-colors"
              >
                Abbrechen
              </button>
              <button 
                onClick={() => {
                  setShowUnsavedWarning(false)
                  onBack()
                }}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-colors"
              >
                Änderungen verwerfen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Warning Modal */}
      {showDeleteWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-red-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Projekt wirklich löschen?</h3>
            <p className="text-text-secondary mb-6 text-sm">
              Bist du sicher? Alle Daten dieses Projekts werden <strong>unwiderruflich</strong> gelöscht.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setShowDeleteWarning(false)}
                className="flex-1 px-4 py-2.5 bg-surface text-text-primary border border-border rounded-xl hover:bg-neutral-100 font-medium transition-colors"
              >
                Abbrechen
              </button>
              <button 
                onClick={handleDelete}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isSaving ? 'Lösche...' : 'Ja, endgültig löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
