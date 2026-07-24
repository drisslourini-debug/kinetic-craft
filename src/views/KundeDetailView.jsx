import { useState, useEffect } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
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

export default function KundeDetailView({ kunde: initialKunde, onBack, onNavigate, initialTab = 'stammdaten' }) {
  const [parent] = useAutoAnimate()
  const [kunde, setKunde] = useState(initialKunde)
  const [projekte, setProjekte] = useState([])
  const [offerten, setOfferten] = useState([])
  const [rechnungen, setRechnungen] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('stammdaten') // stammdaten, projekte, offerten, rechnungen
  
  const [isDirty, setIsDirty] = useState(false)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const [showDeleteWarning, setShowDeleteWarning] = useState(false)

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

        // Load invoices
        const { data: rData } = await supabase
          .from('rechnungen')
          .select('*')
          .eq('kunden_id', kunde.id)
          .order('created_at', { ascending: false })
        if (rData) setRechnungen(rData)
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

  const [openSections, setOpenSections] = useState(['stammdaten'])
  const [submitted, setSubmitted] = useState(false)

  const toggleSection = (section) => {
    setOpenSections(prev => 
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    )
  }

  const handleInputChange = (field, value) => {
    setKunde(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)
  }

  const isMissingName = !kunde?.firmenname?.trim() && !kunde?.nachname?.trim();
  const isValidEmail = !kunde?.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(kunde?.email);

  const handleSave = async () => {
    setSubmitted(true)
    if (isMissingName || !isValidEmail) {
      if (isMissingName && !openSections.includes('stammdaten')) toggleSection('stammdaten')
      if (!isValidEmail && !openSections.includes('kontakt')) toggleSection('kontakt')
      return;
    }

    setIsSaving(true)
    
    let updatePayload = { ...kunde }
    
    // Compute legacy name if fields changed
    const newDisplayName = updatePayload.firmenname 
      ? `${updatePayload.firmenname} ${updatePayload.vorname || ''} ${updatePayload.nachname || ''}`.trim()
      : `${updatePayload.vorname || ''} ${updatePayload.nachname || ''}`.trim() || updatePayload.name
      
    if (newDisplayName !== kunde.name) {
      updatePayload.name = newDisplayName
      setKunde(prev => ({ ...prev, name: newDisplayName }))
    }

    try {
      const { id, created_at, updated_at, ...dataToSave } = updatePayload
      
      const { error } = await supabase
        .from('kunden')
        .update(dataToSave)
        .eq('id', kunde.id)
        
      if (error) throw error
      
      setIsDirty(false)
    } catch (err) {
      console.error('Failed to save kunde:', err)
      alert('Fehler beim Speichern der Kundendaten.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      setIsSaving(true)
      const { error } = await supabase
        .from('kunden')
        .update({ is_archived: true })
        .eq('id', kunde.id)
        
      if (error) throw error
      onBack()
    } catch (err) {
      console.error('Failed to archive kunde:', err)
      alert('Fehler beim Archivieren des Kunden.')
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

  const AccordionHeader = ({ title, section, icon }) => (
    <button 
      type="button"
      onClick={() => toggleSection(section)}
      className={`w-full flex items-center justify-between p-5 transition-colors ${openSections.includes(section) ? 'bg-neutral-50 border-b border-border' : 'bg-surface-card hover:bg-neutral-50'}`}
    >
      <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      <span className={`text-text-secondary transition-transform duration-200 ${openSections.includes(section) ? 'rotate-180' : ''}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </span>
    </button>
  )

  const hasNameError = submitted && isMissingName;
  const hasEmailError = submitted && !isValidEmail;

  const displayName = kunde.firmenname 
    ? `${kunde.firmenname} ${kunde.vorname || ''} ${kunde.nachname || ''}`.trim()
    : `${kunde.vorname || ''} ${kunde.nachname || ''}`.trim() || kunde.name;

  return (
    <div className="space-y-6">
      {/* Header */}
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
              <h2 className="text-2xl md:text-3xl font-bold text-text-primary">{displayName}</h2>
            </div>
            <p className="text-text-secondary mt-1 flex items-center gap-2">
              <span>Kunden-Nr: {kunde.id}</span>
              {kunde.ort && <span>• 📍 {kunde.ort}</span>}
            </p>
          </div>
        </div>

        {/* Quick Actions & Save */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar w-full sm:w-auto">
            {activeTab === 'stammdaten' && (
              <button
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className={`px-4 sm:px-5 py-2 text-sm font-semibold rounded-xl transition-all shrink-0 ${
                  isDirty 
                    ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-md shadow-primary-600/20 cursor-pointer active:scale-[0.98]' 
                    : 'bg-surface-card text-text-secondary border border-border cursor-not-allowed opacity-70'
                }`}
              >
                {isSaving ? 'Speichert...' : 'Speichern'}
              </button>
            )}

            <div className="flex items-center gap-2 sm:pl-4 sm:border-l border-border shrink-0">
              <button
                onClick={() => onNavigate && onNavigate('projekte', { action: 'create', kundeId: kunde.id })}
                className="px-3 py-2 text-xs font-medium bg-surface-card hover:bg-neutral-50 text-text-primary rounded-lg border border-border transition-colors cursor-pointer whitespace-nowrap active:scale-[0.98]"
              >
                + Projekt
              </button>
              <button
                onClick={() => onNavigate && onNavigate('offerten', { action: 'create', kundeId: kunde.id })}
                className="px-3 py-2 text-xs font-medium bg-surface-card hover:bg-neutral-50 text-text-primary rounded-lg border border-border transition-colors cursor-pointer whitespace-nowrap active:scale-[0.98]"
              >
                + Offerte
              </button>
              <button
                onClick={() => onNavigate && onNavigate('rechnungen', { action: 'create', kundeId: kunde.id })}
                className="px-3 py-2 text-xs font-medium bg-surface-card hover:bg-neutral-50 text-text-primary rounded-lg border border-border transition-colors cursor-pointer whitespace-nowrap active:scale-[0.98]"
              >
                + Rechnung
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        {['stammdaten', 'projekte', 'offerten', 'rechnungen'].map(tab => (
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
          
          {/* TAB: STAMMDATEN */}
          {activeTab === 'stammdaten' && (
            <div className="animate-fade-in-up space-y-4" ref={parent}>
              
              {/* Stammdaten Accordion */}
              <div className="bg-surface-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <AccordionHeader title="Name, Firma & Typ" section="stammdaten" icon="🏢" />
                {openSections.includes('stammdaten') && (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="md:col-span-1">
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Kundentyp</label>
                        <select 
                          value={kunde.typ || ''} 
                          onChange={e => handleInputChange('typ', e.target.value)}
                          className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                        >
                          <option value="">-- Bitte wählen --</option>
                          {KUNDENTYPEN.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                          Firmenname {hasNameError && <span className="text-red-500 font-normal ml-1">(Pflichtfeld)</span>}
                        </label>
                        <input 
                          type="text" 
                          value={kunde.firmenname || ''} 
                          onChange={e => handleInputChange('firmenname', e.target.value)}
                          className={`w-full px-4 py-3 bg-surface border rounded-xl text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 ${hasNameError ? 'border-red-400 bg-red-50/50' : 'border-border'}`}
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Vorname</label>
                        <input 
                          type="text" 
                          value={kunde.vorname || ''} 
                          onChange={e => handleInputChange('vorname', e.target.value)}
                          className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                          Nachname {hasNameError && <span className="text-red-500 font-normal ml-1">(Pflichtfeld)</span>}
                        </label>
                        <input 
                          type="text" 
                          value={kunde.nachname || ''} 
                          onChange={e => handleInputChange('nachname', e.target.value)}
                          className={`w-full px-4 py-3 bg-surface border rounded-xl text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 ${hasNameError ? 'border-red-400 bg-red-50/50' : 'border-border'}`}
                        />
                      </div>
                    </div>
                    {hasNameError && <p className="text-xs text-red-500 mt-2">Geben Sie entweder einen Firmennamen oder einen Nachnamen an.</p>}
                  </div>
                )}
              </div>

              {/* Kontakt & Adresse Accordion */}
              <div className="bg-surface-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <AccordionHeader title="Kontakt & Adresse" section="kontakt" icon="📍" />
                {openSections.includes('kontakt') && (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-1">
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Strasse (Auto-Fill)</label>
                        <AddressAutocomplete 
                          value={kunde.strasse || ''} 
                          onChange={(val, details) => {
                            if (details) {
                              setKunde(prev => ({...prev, strasse: details.strasse, plz: details.plz, ort: details.ort}))
                              setIsDirty(true)
                            } else {
                              handleInputChange('strasse', val)
                            }
                          }}
                          placeholder="Strasse eingeben..."
                          className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                        />
                      </div>
                      <div className="grid grid-cols-[1fr_2fr] gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">PLZ</label>
                          <input 
                            type="text" 
                            value={kunde.plz || ''} 
                            onChange={e => handleInputChange('plz', e.target.value)}
                            className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Ort</label>
                          <input 
                            type="text" 
                            value={kunde.ort || ''} 
                            onChange={e => handleInputChange('ort', e.target.value)}
                            className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Telefon</label>
                        <input 
                          type="text" 
                          value={kunde.telefon || ''} 
                          onChange={e => handleInputChange('telefon', e.target.value)}
                          className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                          E-Mail {hasEmailError && <span className="text-red-500 font-normal ml-1">(Ungültig)</span>}
                        </label>
                        <input 
                          type="email" 
                          value={kunde.email || ''} 
                          onChange={e => handleInputChange('email', e.target.value)}
                          className={`w-full px-4 py-3 bg-surface border rounded-xl text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 ${hasEmailError ? 'border-red-400 bg-red-50/50' : 'border-border'}`}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Website</label>
                        <input 
                          type="url" 
                          value={kunde.website || ''} 
                          onChange={e => handleInputChange('website', e.target.value)}
                          className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                          placeholder="https://"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Konditionen Accordion */}
              <div className="bg-surface-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <AccordionHeader title="Weitere Informationen" section="konditionen" icon="⚙️" />
                {openSections.includes('konditionen') && (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Status</label>
                        <select 
                          value={kunde.status || 'Aktiv'} 
                          onChange={e => handleInputChange('status', e.target.value)}
                          className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                        >
                          <option value="Aktiv">Aktiv</option>
                          <option value="Inaktiv">Inaktiv</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Zahlungsziel</label>
                        <select 
                          value={kunde.zahlungsziel || '30 Tage netto'} 
                          onChange={e => handleInputChange('zahlungsziel', e.target.value)}
                          className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                        >
                          {ZAHLUNGSZIELE.map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Notizen / Referenzen</label>
                        <textarea 
                          value={kunde.notizen || ''} 
                          onChange={e => handleInputChange('notizen', e.target.value)}
                          rows={4}
                          className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                          placeholder="Interne Notizen zu diesem Kunden..."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Subtle Delete Button */}
              <div className="mt-8 pt-6 border-t border-border flex justify-end">
                <button
                  onClick={() => setShowDeleteWarning(true)}
                  className="flex items-center gap-2 px-4 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Kunde löschen
                </button>
              </div>
            </div>
          )}

          {/* TAB: PROJEKTE */}
          {activeTab === 'projekte' && (
            <div className="animate-fade-in-up space-y-4">
              {projekte.length === 0 ? (
                <div className="bg-surface-card rounded-2xl border border-dashed border-border p-12 text-center flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center text-neutral-400 mb-2">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">{kunde.vorname || kunde.name || 'Dieser Kunde'} hat noch keine Projekte</h3>
                    <p className="text-text-secondary mt-1">Lege das erste Projekt an, um Offerten und Rechnungen schreiben zu können.</p>
                  </div>
                  <button 
                    onClick={() => onNavigate && onNavigate('projekte', { action: 'create', kundeId: kunde.id })}
                    className="mt-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold shadow-md shadow-primary-600/20 hover:bg-primary-700 active:scale-95 transition-all cursor-pointer"
                  >
                    + Erstes Projekt erstellen
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {projekte.map(projekt => {
                    const anzOfferten = offerten.filter(o => o.projekt_id === projekt.id).length
                    return (
                      <div 
                        key={projekt.id} 
                        onClick={() => onNavigate && onNavigate('projekte', { projektId: projekt.id })}
                        className="bg-surface-card rounded-2xl border-l-4 border-l-indigo-500 border-y border-r border-border p-5 shadow-sm hover:shadow-md hover:bg-indigo-50/30 transition-all cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-indigo-600 mb-0.5">
                                {formatDate(projekt.created_at)}
                              </div>
                              <h4 className="font-bold text-text-primary group-hover:text-indigo-700 transition-colors">{projekt.name}</h4>
                              <p className="text-sm text-text-secondary mt-0.5">{projekt.adresse || 'Keine Adresse'}</p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${
                            projekt.status === 'Abgeschlossen' ? 'bg-emerald-100 text-emerald-700' :
                            projekt.status === 'In Arbeit' ? 'bg-amber-100 text-amber-700' :
                            'bg-indigo-100 text-indigo-700'
                          }`}>
                            {projekt.status || 'Aktiv'}
                          </span>
                        </div>
                        <div className="text-xs text-text-secondary flex items-center gap-1.5 ml-13">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
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
            <div className="animate-fade-in-up space-y-4">
              {offerten.length === 0 ? (
                <div className="bg-surface-card rounded-2xl border border-dashed border-border p-12 text-center flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center text-neutral-400 mb-2">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">Noch keine Offerten vorhanden</h3>
                    <p className="text-text-secondary mt-1">Erstelle die erste Offerte für {kunde.vorname || kunde.name || 'diesen Kunden'}, um den Auftrag zu sichern.</p>
                  </div>
                  <button 
                    onClick={() => onNavigate && onNavigate('offerten', { action: 'create', kundeId: kunde.id })}
                    className="mt-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold shadow-md shadow-primary-600/20 hover:bg-primary-700 active:scale-95 transition-all cursor-pointer"
                  >
                    + Erste Offerte erstellen
                  </button>
                </div>
              ) : (
                <div className="bg-surface-card rounded-2xl border border-border overflow-hidden">
                  {offerten.map((off) => {
                    const projekt = projekte.find(p => p.id === off.projekt_id)
                    return (
                      <div 
                        key={off.id} 
                        onClick={() => onNavigate && onNavigate('offerten', { offerteId: off.id })}
                        className="grid grid-cols-1 sm:grid-cols-[1fr_120px_100px] gap-2 sm:gap-4 p-4 border-l-4 border-l-amber-400 border-y border-r border-border mb-2 rounded-xl bg-surface-card hover:bg-amber-50/40 hover:shadow-md transition-all items-center cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform hidden sm:flex">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          </div>
                          <div>
                            <div className="font-bold text-text-primary flex justify-between sm:block group-hover:text-amber-700 transition-colors">
                              <span className="flex items-center gap-1.5">
                                <span className="sm:hidden text-amber-500">📄</span>
                                Offerte {off.offerte_nr || `#${off.id}`}
                              </span>
                              <span className={`sm:hidden inline-block px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                                off.status === 'Akzeptiert' ? 'bg-emerald-100 text-emerald-700' :
                                off.status === 'Abgelehnt' ? 'bg-red-100 text-red-700' :
                                off.status === 'Entwurf' ? 'bg-gray-100 text-gray-600' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {off.status}
                              </span>
                            </div>
                            <div className="text-xs text-text-secondary mt-0.5 truncate">{projekt ? projekt.name : 'Kein Projekt'}</div>
                          </div>
                        </div>
                        <div className="sm:text-right font-bold text-text-primary text-sm mt-1 sm:mt-0 flex sm:block justify-between items-center">
                          <span className="sm:hidden text-xs font-normal text-text-secondary">Total:</span>
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

          {/* TAB: RECHNUNGEN */}
          {activeTab === 'rechnungen' && (
            <div className="animate-fade-in-up space-y-4">
              {rechnungen.length === 0 ? (
                <div className="bg-surface-card rounded-2xl border border-dashed border-border p-12 text-center flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center text-neutral-400 mb-2">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">Keine Rechnungen vorhanden</h3>
                    <p className="text-text-secondary mt-1">Es wurden noch keine Rechnungen für {kunde.vorname || kunde.name || 'diesen Kunden'} geschrieben.</p>
                  </div>
                  <button 
                    onClick={() => onNavigate && onNavigate('rechnungen', { action: 'create', kundeId: kunde.id })}
                    className="mt-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold shadow-md shadow-primary-600/20 hover:bg-primary-700 active:scale-95 transition-all cursor-pointer"
                  >
                    + Erste Rechnung erstellen
                  </button>
                </div>
              ) : (
                <div className="bg-surface-card rounded-2xl border border-border overflow-hidden shadow-sm">
                  {rechnungen.map(re => {
                    const projekt = projekte.find(p => p.id === re.projekt_id)
                    return (
                      <div 
                        key={re.id} 
                        onClick={() => onNavigate && onNavigate('rechnungen', { rechnungId: re.id })}
                        className="grid grid-cols-1 sm:grid-cols-[1fr_120px_100px] gap-2 sm:gap-4 p-4 border-l-4 border-l-emerald-500 border-y border-r border-border mb-2 rounded-xl bg-surface-card hover:bg-emerald-50/40 hover:shadow-md transition-all items-center cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform hidden sm:flex">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                          <div>
                            <div className="font-bold text-text-primary group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                              <span className="sm:hidden text-emerald-600">💰</span>
                              {re.rechnung_nr || `Rechnung #${re.id}`}
                            </div>
                            <div className="text-xs text-text-secondary mt-0.5 truncate">{projekt ? projekt.name : 'Kein Projekt'}</div>
                          </div>
                        </div>
                        <div className="sm:text-right font-bold text-text-primary text-sm">
                          CHF {(re.total || 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="sm:text-right">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                            re.status === 'Bezahlt' ? 'bg-emerald-100 text-emerald-700' :
                            re.status === 'Überfällig' ? 'bg-red-100 text-red-700' :
                            re.status === 'Versendet' ? 'bg-primary-100 text-primary-700' :
                            re.status === 'Storniert' ? 'bg-gray-200 text-gray-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {re.status || 'Entwurf'}
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

      {/* Unsaved Changes Modal */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-text-primary mb-2">Änderungen verwerfen?</h3>
            <p className="text-text-secondary text-sm mb-6">
              Du hast ungespeicherte Änderungen. Wenn du diese Seite verlässt, gehen deine Eingaben verloren.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowUnsavedWarning(false)}
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  setShowUnsavedWarning(false)
                  onBack()
                }}
                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
              >
                Trotzdem verlassen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-text-primary mb-2">Kunde löschen?</h3>
            <p className="text-text-secondary text-sm mb-6">
              Bist du sicher, dass du diesen Kunden endgültig löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteWarning(false)}
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2 cursor-pointer"
                disabled={isSaving}
              >
                {isSaving ? 'Löscht...' : 'Ja, endgültig löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Action Footer (Mobile & Desktop when dirty) */}
      {isDirty && activeTab === 'stammdaten' && (
            <div className="animate-fade-in-up fixed bottom-0 left-0 right-0 lg:left-64 p-4 md:p-6 bg-surface/90 backdrop-blur-md border-t border-border shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] z-40 flex justify-between items-center animate-fade-in pb-safe">
          <div className="text-sm font-medium text-amber-600 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse hidden sm:block"></span>
            Ungespeichert
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setKunde(initialKunde)
                setIsDirty(false)
                setSubmitted(false)
              }}
              className="px-4 py-2.5 sm:px-5 text-sm font-semibold text-text-secondary bg-surface-card hover:bg-surface border border-border rounded-xl transition-colors cursor-pointer"
            >
              Verwerfen
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 sm:px-8 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSaving ? 'Speichert...' : 'Speichern'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


