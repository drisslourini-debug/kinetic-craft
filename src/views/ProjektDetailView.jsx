import { useState, useEffect } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { supabase } from '../lib/supabase'
import AddressAutocomplete from '../components/AddressAutocomplete'

const PROJEKT_KATEGORIEN = [
  'Neubau',
  'Umbau / Renovation',
  'Reparatur / Service',
  'Sanierung'
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

export default function ProjektDetailView({ projekt: initialProjekt, onBack, onNavigate }) {
  const [parent] = useAutoAnimate()
  const [projekt, setProjekt] = useState(initialProjekt)
  const [offerten, setOfferten] = useState([])
  const [rechnungen, setRechnungen] = useState([])
  const [dateien, setDateien] = useState([])
  const [kunde, setKunde] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('projektdaten') // projektdaten, offerten, rechnungen
  const [showDeleteWarning, setShowDeleteWarning] = useState(false)
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)

  const [editState, setEditState] = useState(null) // null, 'stammdaten', 'termine', 'notizen'
  const [draft, setDraft] = useState({})
  const [isSaving, setIsSaving] = useState(false)

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

        // Load files
        const { data: dData } = await supabase
          .from('dateien')
          .select('*')
          .eq('projekt_id', projekt.id)
          .order('created_at', { ascending: false })
          
        if (dData) setDateien(dData)
      } catch (err) {
        console.error('Error loading projekt details:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadDetails()
  }, [projekt.id])

  const startEdit = (blockName) => {
    setDraft({ ...projekt })
    setEditState(blockName)
  }

  const cancelEdit = () => {
    setDraft({})
    setEditState(null)
  }

  const handleDraftChange = (field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveBlock = async () => {
    setIsSaving(true)
    
    const dataToSave = {
      name: draft.name,
      kunden_id: draft.kunden_id,
      kategorie: draft.kategorie,
      adresse: draft.adresse,
      status: draft.status,
      startdatum: draft.startdatum,
      enddatum: draft.enddatum,
      notizen: draft.notizen,
      is_archived: draft.is_archived
    }
    
    try {
      await supabase
        .from('projekte')
        .update(dataToSave)
        .eq('id', projekt.id)
        
      setProjekt(draft)
      setEditState(null)
    } catch (err) {
      console.error('Failed to update projekt:', err)
      alert('Fehler beim Speichern.')
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
    if (!window.confirm('Projekt ins Archiv verschieben? Er taucht in keinen Suchen mehr auf.')) return;
    try {
      setIsSaving(true)
      const { error } = await supabase
        .from('projekte')
        .update({ is_archived: true })
        .eq('id', projekt.id)
        
      if (error) throw error
      onBack()
    } catch (err) {
      console.error('Failed to archive projekt:', err)
      alert('Fehler beim Archivieren des Projekts.')
    } finally {
      setIsSaving(false)
      setShowDeleteWarning(false)
    }
  }

  const handleHardDelete = async () => {
    if (offerten.length > 0 || rechnungen.length > 0 || dateien.length > 0) {
      alert('Das Projekt kann nicht gelöscht werden, da noch Offerten, Rechnungen oder Dateien verknüpft sind. Bitte archiviere es stattdessen.')
      setShowDeleteWarning(false)
      return
    }

    try {
      setIsSaving(true)
      const { error } = await supabase
        .from('projekte')
        .delete()
        .eq('id', projekt.id)
        
      if (error) throw error
      onBack() // go back to list
    } catch (err) {
      console.error('Failed to delete projekt:', err)
      alert('Fehler beim Löschen. Eventuell gibt es noch verknüpfte Daten.')
    } finally {
      setIsSaving(false)
      setShowDeleteWarning(false)
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

  return (
    <div className="space-y-6 max-w-6xl pb-16">
      {/* Header mit Zurück-Button & Quick Actions */}
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
              <h2 className="text-2xl md:text-3xl font-bold text-text-primary">{projekt.name}</h2>
            </div>
            <p className="text-text-secondary mt-1 flex items-center gap-2">
              <span>{projekt.adresse ? `📍 ${projekt.adresse}` : 'Keine Baustellenadresse'}</span>
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar shrink-0">
          <button 
            onClick={() => onNavigate && onNavigate('offerten', { action: 'create', projektId: projekt.id, kundeId: projekt.kunden_id })}
            className="px-3 py-2 text-xs font-medium bg-surface-card hover:bg-neutral-50 text-text-primary rounded-lg border border-border shadow-sm transition-colors cursor-pointer whitespace-nowrap active:scale-[0.98]"
          >
            + Neue Offerte
          </button>
          <button 
            onClick={() => onNavigate && onNavigate('rechnungen', { action: 'create', projektId: projekt.id, kundeId: projekt.kunden_id })}
            className="px-3 py-2 text-xs font-medium bg-surface-card hover:bg-neutral-50 text-text-primary rounded-lg border border-border shadow-sm transition-colors cursor-pointer whitespace-nowrap active:scale-[0.98]"
          >
            + Neue Rechnung
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
                      Projekt archivieren
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

      {/* Tabs - Pill Design */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
        {['projektdaten', 'offerten', 'rechnungen', 'dateien'].map(tab => (
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
        <div className="flex flex-col gap-4 p-6 w-full animate-pulse bg-surface-card rounded-2xl border border-border shadow-sm"><div className="h-6 bg-gray-200 rounded w-1/4"></div><div className="h-20 bg-gray-200 rounded w-full"></div><div className="h-20 bg-gray-200 rounded w-full"></div></div>
      ) : (
        <div className="animate-fade-in" ref={parent}>
          
          {/* TAB: PROJEKTDATEN */}
          {activeTab === 'projektdaten' && (
            <div className="animate-fade-in-up space-y-4">
              
              <SettingsBlock
                title="Stammdaten"
                isEditing={editState === 'stammdaten'}
                onEdit={() => startEdit('stammdaten')}
                onCancel={cancelEdit}
                onSave={handleSaveBlock}
                isSaving={isSaving}
                readOnlyView={
                  <>
                    <SettingsRow label="Projektname" value={projekt.name} />
                    <SettingsRow label="Kategorie" value={projekt.kategorie} />
                    <SettingsRow label="Baustellen-Adresse" value={projekt.adresse} />
                    <SettingsRow label="Status" value={
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        projekt.status === 'Abgeschlossen' ? 'bg-emerald-100 text-emerald-700' :
                        projekt.status === 'In Arbeit' ? 'bg-amber-100 text-amber-700' :
                        'bg-indigo-100 text-indigo-700'
                      }`}>
                        {projekt.status || 'Aktiv'}
                      </span>
                    } />
                    {kunde && (
                      <SettingsRow label="Zugehöriger Kunde" value={
                        <div 
                          className="font-medium text-primary-600 hover:text-primary-800 cursor-pointer transition-colors"
                          onClick={() => kunde && onNavigate && onNavigate('kunden', { kundeId: kunde.id })}
                        >
                          {kunde.name} {kunde.ort && <span className="text-text-secondary font-normal ml-2">📍 {kunde.ort}</span>}
                        </div>
                      } />
                    )}
                  </>
                }
              >
                <InputField label="Projektname" value={draft.name} onChange={v => handleDraftChange('name', v)} />
                <SelectField label="Kategorie" value={draft.kategorie} onChange={v => handleDraftChange('kategorie', v)} options={PROJEKT_KATEGORIEN} />
                <div className="md:col-span-2">
                  <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">Baustellen-Adresse (Auto-Fill)</label>
                  <AddressAutocomplete 
                    value={draft.adresse || ''}
                    onChange={(val) => handleDraftChange('adresse', val)}
                    placeholder="Strasse eingeben (Auto-Fill)..."
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400 transition-colors"
                  />
                </div>
                <SelectField label="Status" value={draft.status || 'Aktiv'} onChange={v => handleDraftChange('status', v)} options={['Aktiv', 'In Arbeit', 'Abgeschlossen']} />
              </SettingsBlock>

              <SettingsBlock
                title="Termine"
                isEditing={editState === 'termine'}
                onEdit={() => startEdit('termine')}
                onCancel={cancelEdit}
                onSave={handleSaveBlock}
                isSaving={isSaving}
                readOnlyView={
                  <>
                    <SettingsRow label="Startdatum" value={formatDate(projekt.startdatum)} />
                    <SettingsRow label="Enddatum" value={formatDate(projekt.enddatum)} />
                  </>
                }
              >
                <InputField type="date" label="Startdatum" value={draft.startdatum} onChange={v => handleDraftChange('startdatum', v)} />
                <InputField type="date" label="Enddatum" value={draft.enddatum} onChange={v => handleDraftChange('enddatum', v)} />
              </SettingsBlock>

              <SettingsBlock
                title="Besonderheiten & Notizen"
                isEditing={editState === 'notizen'}
                onEdit={() => startEdit('notizen')}
                onCancel={cancelEdit}
                onSave={handleSaveBlock}
                isSaving={isSaving}
                readOnlyView={
                  <SettingsRow label="Notizen" value={projekt.notizen ? <span className="whitespace-pre-wrap">{projekt.notizen}</span> : ''} />
                }
              >
                <TextAreaField label="Notizen" value={draft.notizen} onChange={v => handleDraftChange('notizen', v)} placeholder="Zugangscodes, Materiallagerplatz, Besonderheiten zur Baustelle..." />
              </SettingsBlock>
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
                    onClick={() => onNavigate && onNavigate('offerten', { action: 'create', projektId: projekt.id, kundeId: projekt.kunden_id })}
                    className="mt-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold shadow-md shadow-primary-600/20 hover:bg-primary-700 active:scale-95 transition-all cursor-pointer relative z-10"
                  >
                    + Erste Offerte erstellen
                  </button>
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
                        <div className="w-full sm:w-auto flex items-center justify-between sm:flex-col sm:items-end gap-1 border-t border-dashed border-border sm:border-none pt-3 sm:pt-0">
                          <div className="flex flex-col sm:items-end">
                            <span className="text-xs text-text-secondary uppercase tracking-widest font-semibold">Total</span>
                            <div className="font-mono font-bold text-lg text-text-primary">
                              CHF {(off.total || 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
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
                    onClick={() => onNavigate && onNavigate('rechnungen', { action: 'create', projektId: projekt.id, kundeId: projekt.kunden_id })}
                    className="mt-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold shadow-md shadow-primary-600/20 hover:bg-primary-700 active:scale-95 transition-all cursor-pointer relative z-10"
                  >
                    + Erste Rechnung erstellen
                  </button>
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
                        <div className="w-full sm:w-auto flex items-center justify-between sm:flex-col sm:items-end gap-1 border-t border-dashed border-border sm:border-none pt-3 sm:pt-0">
                          <div className="flex flex-col sm:items-end">
                            <span className="text-xs text-text-secondary uppercase tracking-widest font-semibold">Total</span>
                            <div className="font-mono font-bold text-lg text-text-primary">
                              CHF {(re.total || 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
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

          {/* TAB: DATEIEN (Archiv) */}
          {activeTab === 'dateien' && (
            <div className="animate-fade-in-up space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-text-primary">Projekt-Archiv</h3>
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
                        name: finalName, typ: file.type || fileExt, url: publicUrl, size_bytes: file.size, 
                        kunde_id: projekt.kunden_id, projekt_id: projekt.id, kategorie: 'Projekt'
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
                    <p className="text-text-secondary mt-1">Lade Dateien, Pläne oder Fotos für dieses Projekt hoch.</p>
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
                        <span>{new Date(datei.created_at).toLocaleDateString()}</span>
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
