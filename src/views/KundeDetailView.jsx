import { useState, useEffect } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { supabase } from '../lib/supabase'
import { formatDate, formatCurrency } from '../lib/formatters'
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

// ----------------------
// SUBCOMPONENTS
// ----------------------

const SettingsBlock = ({ title, description, isEditing, onEdit, onCancel, onSave, isSaving, children, readOnlyView }) => (
  <div className="bg-surface-card rounded-2xl border border-border shadow-sm p-6 mb-6">
    <div className="flex justify-between items-start mb-6">
      <div>
        <h3 className="text-lg font-bold text-text-primary">{title}</h3>
        {description && <p className="text-sm text-text-secondary mt-1">{description}</p>}
      </div>
      {!isEditing && (
        <button 
          onClick={onEdit} 
          className="p-2 text-text-secondary hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer" 
          title="Bearbeiten"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        </button>
      )}
    </div>
    
    <div>
      {isEditing ? (
        <div className="animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {children}
          </div>
          <div className="mt-8 pt-6 border-t border-border flex justify-end gap-4">
            <button 
              onClick={onCancel} 
              className="px-5 py-2.5 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              Abbrechen
            </button>
            <button 
              onClick={onSave} 
              disabled={isSaving} 
              className="px-6 py-2.5 text-sm font-bold bg-primary-600 text-white rounded-xl hover:bg-primary-700 active:scale-95 transition-all shadow-md shadow-primary-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Speichert...
                </>
              ) : 'Speichern'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col border-t border-border pt-4">
          {readOnlyView}
        </div>
      )}
    </div>
  </div>
)

const SettingsRow = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row py-3 border-b border-border last:border-b-0 hover:bg-surface-50 transition-colors px-2 rounded-lg -mx-2">
    <div className="sm:w-1/3 text-sm font-semibold text-text-secondary">{label}</div>
    <div className="sm:w-2/3 text-sm text-text-primary font-medium">{value || <span className="text-gray-400 italic">Nicht angegeben</span>}</div>
  </div>
)

const InputField = ({ label, value, onChange, type = "text", fullWidth = false, placeholder = "", error = null }) => (
  <div className={fullWidth ? "md:col-span-2" : ""}>
    <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">
      {label} {error && <span className="text-red-500 font-normal ml-1 lowercase">({error})</span>}
    </label>
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2 bg-surface border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400 transition-colors ${error ? 'border-red-400 bg-red-50/50' : 'border-border'}`}
    />
  </div>
)

const SelectField = ({ label, value, onChange, options, fullWidth = false }) => (
  <div className={fullWidth ? "md:col-span-2" : ""}>
    <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">{label}</label>
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400 transition-colors"
    >
      <option value="">-- Bitte wählen --</option>
      {options.map(opt => (
        <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>
      ))}
    </select>
  </div>
)

const TextAreaField = ({ label, value, onChange, fullWidth = true, placeholder = "", small = false }) => (
  <div className={fullWidth ? "md:col-span-2" : ""}>
    <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">{label}</label>
    <textarea
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400 transition-colors resize-y ${small ? 'h-20' : 'h-32'}`}
    />
  </div>
)

// ----------------------
// MAIN COMPONENT
// ----------------------

export default function KundeDetailView({ kunde: initialKunde, onBack, onNavigate, initialTab = 'stammdaten' }) {
  const [parent] = useAutoAnimate()
  const [kunde, setKunde] = useState(initialKunde)
  const [projekte, setProjekte] = useState([])
  const [offerten, setOfferten] = useState([])
  const [rechnungen, setRechnungen] = useState([])
  const [dateien, setDateien] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [activeTab, setActiveTab] = useState(initialTab) // stammdaten, projekte, offerten, rechnungen
  const [showDeleteWarning, setShowDeleteWarning] = useState(false)
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)

  // Edit State
  const [editState, setEditState] = useState(null) // null, 'stammdaten', 'kontakt', 'konditionen'
  const [draft, setDraft] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})

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

        const { data: rData } = await supabase
          .from('rechnungen')
          .select('*')
          .eq('kunden_id', kunde.id)
          .order('created_at', { ascending: false })
        if (rData) setRechnungen(rData)

        const { data: dData } = await supabase
          .from('dateien')
          .select('*')
          .eq('kunde_id', kunde.id)
          .order('created_at', { ascending: false })
        if (dData) setDateien(dData)

      } catch (err) {
        console.error('Error loading details:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadDetails()
  }, [kunde.id])

  if (!kunde) return null

  const startEdit = (blockName) => {
    setDraft({ ...kunde })
    setValidationErrors({})
    setEditState(blockName)
  }

  const cancelEdit = () => {
    setDraft({})
    setValidationErrors({})
    setEditState(null)
  }

  const handleDraftChange = (field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }))
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const handleSaveBlock = async () => {
    // Validation
    const errors = {}
    
    if (editState === 'stammdaten') {
      const isMissingName = !draft.firmenname?.trim() && !draft.nachname?.trim();
      if (isMissingName) {
        errors.firmenname = 'Pflichtfeld'
        errors.nachname = 'Pflichtfeld'
      }
    } else if (editState === 'kontakt') {
      const isValidEmail = !draft.email || /^[^s@]+@[^s@]+.[^s@]+$/.test(draft.email);
      if (!isValidEmail) errors.email = 'Ungültig'
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    setIsSaving(true)
    
    let updatePayload = { ...draft }
    
    // Compute legacy name if fields changed
    const newDisplayName = updatePayload.firmenname 
      ? `${updatePayload.firmenname} ${updatePayload.vorname || ''} ${updatePayload.nachname || ''}`.trim()
      : `${updatePayload.vorname || ''} ${updatePayload.nachname || ''}`.trim() || updatePayload.name
      
    if (newDisplayName !== kunde.name) {
      updatePayload.name = newDisplayName
    }

    try {
      const { id, created_at, updated_at, ...dataToSave } = updatePayload
      
      const { error } = await supabase
        .from('kunden')
        .update(dataToSave)
        .eq('id', kunde.id)
        
      if (error) throw error
      
      setKunde(updatePayload) // Update local state
      setEditState(null)
    } catch (err) {
      console.error('Failed to save kunde:', err)
      alert('Fehler beim Speichern der Kundendaten.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRenameFile = async (id, oldName) => {
    const fileExt = oldName.split('.').pop()
    const baseName = oldName.substring(0, oldName.lastIndexOf('.')) || oldName
    const userPrompt = window.prompt('Neuer Dateiname (ohne Endung):', baseName)
    
    if (!userPrompt || userPrompt.trim() === baseName) return

    const newName = `${userPrompt.trim()}.${fileExt}`

    try {
      const { error } = await supabase.from('dateien').update({ name: newName }).eq('id', id)
      if (error) throw error
      setDateien(prev => prev.map(d => d.id === id ? { ...d, name: newName } : d))
    } catch (err) {
      console.error(err)
      alert('Umbenennen fehlgeschlagen')
    }
  }

  const handleArchive = async () => {
    if (!window.confirm('Kunde ins Archiv verschieben? Er taucht in keinen Suchen mehr auf.')) return;
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

  const handleHardDelete = async () => {
    if (projekte.length > 0 || offerten.length > 0 || rechnungen.length > 0) {
      alert('Der Kunde kann nicht gelöscht werden, da noch Projekte, Offerten oder Rechnungen verknüpft sind. Bitte archiviere ihn stattdessen.')
      setShowDeleteWarning(false)
      return
    }

    try {
      setIsSaving(true)
      const { error } = await supabase
        .from('kunden')
        .delete()
        .eq('id', kunde.id)
        
      if (error) throw error
      onBack()
    } catch (err) {
      console.error('Failed to delete kunde:', err)
      alert('Fehler beim Löschen des Kunden.')
    } finally {
      setIsSaving(false)
      setShowDeleteWarning(false)
    }
  }

  const displayName = kunde.firmenname 
    ? `${kunde.firmenname} ${kunde.vorname || ''} ${kunde.nachname || ''}`.trim()
    : `${kunde.vorname || ''} ${kunde.nachname || ''}`.trim() || kunde.name;

  return (
    <div className="space-y-6 max-w-6xl pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 rounded-xl bg-surface-card shadow-sm border border-border hover:bg-neutral-50 transition-all text-text-secondary hover:text-text-primary cursor-pointer"
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

        {/* Quick Actions */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar shrink-0">
          <button
            onClick={() => onNavigate && onNavigate('projekte', { action: 'create', kundeId: kunde.id })}
            className="px-3 py-2 text-xs font-medium bg-surface-card hover:bg-neutral-50 text-text-primary rounded-lg border border-border shadow-sm transition-colors cursor-pointer whitespace-nowrap active:scale-[0.98]"
          >
            + Projekt
          </button>
          <button
            onClick={() => onNavigate && onNavigate('offerten', { action: 'create', kundeId: kunde.id })}
            className="px-3 py-2 text-xs font-medium bg-surface-card hover:bg-neutral-50 text-text-primary rounded-lg border border-border shadow-sm transition-colors cursor-pointer whitespace-nowrap active:scale-[0.98]"
          >
            + Offerte
          </button>
          <button
            onClick={() => onNavigate && onNavigate('rechnungen', { action: 'create', kundeId: kunde.id })}
            className="px-3 py-2 text-xs font-medium bg-surface-card hover:bg-neutral-50 text-text-primary rounded-lg border border-border shadow-sm transition-colors cursor-pointer whitespace-nowrap active:scale-[0.98]"
          >
            + Rechnung
          </button>
          <button
            onClick={() => setActiveTab('dateien')}
            className="px-3 py-2 text-xs font-medium bg-surface-card hover:bg-neutral-50 text-text-primary rounded-lg border border-border shadow-sm transition-colors cursor-pointer whitespace-nowrap active:scale-[0.98]"
          >
            + Datei
          </button>
          
          <div className="relative">
            <button
              aria-label="Weitere Aktionen"
              onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-black/5 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
            </button>
            {isHeaderMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsHeaderMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">
                  <div className="p-1">
                    <button 
                      onClick={() => { setIsHeaderMenuOpen(false); handleArchive(); }}
                      className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-neutral-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer mb-1"
                    >
                      <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                      Kunde archivieren
                    </button>
                    <button 
                      onClick={() => { setIsHeaderMenuOpen(false); setShowDeleteWarning(true); }}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Unwiderruflich löschen
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs - Pill Design to match Einstellungen */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
        {['stammdaten', 'projekte', 'offerten', 'rechnungen', 'dateien'].map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setEditState(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all capitalize whitespace-nowrap cursor-pointer ${
              activeTab === tab 
                ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20' 
                : 'bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4 p-6 w-full animate-pulse"><div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div><div className="h-64 bg-surface-card rounded-2xl border border-border w-full"></div></div>
      ) : (
        <div className="animate-fade-in" ref={parent}>
          
          {/* TAB: STAMMDATEN */}
          {activeTab === 'stammdaten' && (
            <div className="animate-fade-in-up space-y-4">
              
              <SettingsBlock
                title="Name, Firma & Typ"
                isEditing={editState === 'stammdaten'}
                onEdit={() => startEdit('stammdaten')}
                onCancel={cancelEdit}
                onSave={handleSaveBlock}
                isSaving={isSaving}
                readOnlyView={
                  <>
                    <SettingsRow label="Kundentyp" value={kunde.typ} />
                    <SettingsRow label="Firmenname" value={kunde.firmenname} />
                    <SettingsRow label="Vorname" value={kunde.vorname} />
                    <SettingsRow label="Nachname" value={kunde.nachname} />
                  </>
                }
              >
                <SelectField label="Kundentyp" value={draft.typ} onChange={v => handleDraftChange('typ', v)} options={KUNDENTYPEN} fullWidth />
                <InputField label="Firmenname" value={draft.firmenname} onChange={v => handleDraftChange('firmenname', v)} error={validationErrors.firmenname} />
                <div className="hidden md:block"></div>
                <InputField label="Vorname" value={draft.vorname} onChange={v => handleDraftChange('vorname', v)} />
                <InputField label="Nachname" value={draft.nachname} onChange={v => handleDraftChange('nachname', v)} error={validationErrors.nachname} />
              </SettingsBlock>

              <SettingsBlock
                title="Kontakt & Adresse"
                isEditing={editState === 'kontakt'}
                onEdit={() => startEdit('kontakt')}
                onCancel={cancelEdit}
                onSave={handleSaveBlock}
                isSaving={isSaving}
                readOnlyView={
                  <>
                    <SettingsRow label="Strasse" value={kunde.strasse} />
                    <SettingsRow label="PLZ & Ort" value={kunde.plz && kunde.ort ? `${kunde.plz} ${kunde.ort}` : ''} />
                    <SettingsRow label="Telefon" value={kunde.telefon} />
                    <SettingsRow label="E-Mail" value={kunde.email} />
                    <SettingsRow label="Website" value={kunde.website} />
                  </>
                }
              >
                <div className="md:col-span-2">
                  <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">Strasse (Auto-Fill)</label>
                  <AddressAutocomplete 
                    value={draft.strasse || ''} 
                    onChange={(val, details) => {
                      if (details) {
                        setDraft(prev => ({...prev, strasse: details.strasse, plz: details.plz, ort: details.ort}))
                      } else {
                        handleDraftChange('strasse', val)
                      }
                    }}
                    placeholder="Strasse eingeben..."
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400 transition-colors"
                  />
                </div>
                <InputField label="PLZ" value={draft.plz} onChange={v => handleDraftChange('plz', v)} />
                <InputField label="Ort" value={draft.ort} onChange={v => handleDraftChange('ort', v)} />
                <InputField label="Telefon" type="tel" value={draft.telefon} onChange={v => handleDraftChange('telefon', v)} />
                <InputField label="E-Mail" type="email" value={draft.email} onChange={v => handleDraftChange('email', v)} error={validationErrors.email} />
                <InputField label="Website" type="url" value={draft.website} onChange={v => handleDraftChange('website', v)} fullWidth placeholder="https://" />
              </SettingsBlock>

              <SettingsBlock
                title="Weitere Informationen"
                isEditing={editState === 'konditionen'}
                onEdit={() => startEdit('konditionen')}
                onCancel={cancelEdit}
                onSave={handleSaveBlock}
                isSaving={isSaving}
                readOnlyView={
                  <>
                    <SettingsRow label="Status" value={
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${kunde.status === 'Inaktiv' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {kunde.status || 'Aktiv'}
                      </span>
                    } />
                    <SettingsRow label="Zahlungsziel" value={kunde.zahlungsziel || '30 Tage netto'} />
                    <SettingsRow label="Notizen / Referenzen" value={kunde.notizen} />
                  </>
                }
              >
                <SelectField label="Status" value={draft.status || 'Aktiv'} onChange={v => handleDraftChange('status', v)} options={['Aktiv', 'Inaktiv']} />
                <SelectField label="Zahlungsziel" value={draft.zahlungsziel || '30 Tage netto'} onChange={v => handleDraftChange('zahlungsziel', v)} options={ZAHLUNGSZIELE} />
                <TextAreaField label="Notizen / Referenzen" value={draft.notizen} onChange={v => handleDraftChange('notizen', v)} small />
              </SettingsBlock>

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
                          {formatCurrency(off.total || 0)}
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
                          {formatCurrency(re.total || 0)}
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

          {/* TAB: DATEIEN (Archiv) */}
          {activeTab === 'dateien' && (
            <div className="animate-fade-in-up space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-text-primary">Kunden-Archiv</h3>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 cursor-pointer transition-colors shadow-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  Datei hochladen
                  <input type="file" className="hidden" onChange={async (e) => {
                    const file = e.target.files[0]
                    if (!file) return

                    const fileExt = file.name.split('.').pop()
                    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
                    const userPrompt = window.prompt('Bitte Dateiname eingeben (ohne Endung):', baseName)
                    
                    if (userPrompt === null) {
                      e.target.value = null
                      return
                    }
                    
                    const finalName = userPrompt.trim() ? `${userPrompt.trim()}.${fileExt}` : file.name

                    try {
                      setIsLoading(true)
                      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
                      const filePath = `uploads/${fileName}`
                      
                      const { error: uploadError } = await supabase.storage.from('anhange').upload(filePath, file)
                      if (uploadError) throw uploadError
                      
                      const { data: { publicUrl } } = supabase.storage.from('anhange').getPublicUrl(filePath)
                      
                      const { data, error: dbError } = await supabase.from('dateien').insert([{
                        name: finalName, typ: file.type || fileExt, url: publicUrl, size_bytes: file.size, kunde_id: kunde.id, kategorie: 'Upload'
                      }]).select()
                      
                      if (dbError) throw dbError
                      if (data) setDateien([data[0], ...dateien])
                    } catch(err) {
                      console.error(err)
                      alert('Fehler beim Upload')
                    } finally {
                      setIsLoading(false)
                      e.target.value = null
                    }
                  }} />
                </label>
              </div>

              {dateien.length === 0 ? (
                <div className="bg-surface-card rounded-2xl border border-dashed border-border p-12 text-center flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center text-neutral-400 mb-2">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">Keine Dateien vorhanden</h3>
                    <p className="text-text-secondary mt-1">Lade Dateien, Pläne oder Fotos für diesen Kunden hoch.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {dateien.map(datei => (
                    <div key={datei.id} className="group relative bg-surface-card border border-border rounded-xl p-4 hover:shadow-md hover:border-primary-300 transition-all flex flex-col">
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                        <a href={datei.url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white shadow-sm rounded-lg text-gray-500 hover:text-primary-600 transition-colors" title="Ansehen">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </a>
                        <button onClick={() => handleRenameFile(datei.id, datei.name)} className="p-1.5 bg-white shadow-sm rounded-lg text-gray-500 hover:text-amber-500 transition-colors" title="Umbenennen">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center mb-3 pt-2">
                        <div className="text-4xl mb-2">{datei.typ?.includes('pdf') ? '📄' : datei.typ?.includes('image') ? '🖼️' : '📎'}</div>
                        <h3 className="text-sm font-semibold text-gray-900 text-center line-clamp-2 w-full break-words" title={datei.name}>{datei.name}</h3>
                      </div>
                      <div className="mt-auto border-t border-gray-100 pt-3 flex justify-between text-[10px] text-gray-500">
                        <span>{formatDate(datei.created_at)}</span>
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{datei.kategorie}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
                onClick={handleHardDelete}
                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2 cursor-pointer"
                disabled={isSaving}
              >
                {isSaving ? 'Löscht...' : 'Ja, endgültig löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
