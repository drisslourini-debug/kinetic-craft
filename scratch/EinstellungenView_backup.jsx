import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AddressAutocomplete from '../components/AddressAutocomplete'

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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

const InputField = ({ label, value, onChange, type = "text", fullWidth = false, placeholder = "" }) => (
  <div className={fullWidth ? "sm:col-span-2" : ""}>
    <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400 transition-colors"
    />
  </div>
)

const TextAreaField = ({ label, value, onChange, fullWidth = true, placeholder = "", small = false }) => (
  <div className={fullWidth ? "sm:col-span-2" : ""}>
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

export default function EinstellungenView() {
  const [activeTab, setActiveTab] = useState('unternehmen')
  const [settings, setSettings] = useState({
    firmenname: '',
    strasse: '',
    plz_ort: '',
    uid: '',
    telefon: '',
    email: '',
    website: '',
    bankverbindung: '',
    standard_mwst: 8.1,
    standard_rabatt: 0,
    gueltigkeit_offerten_tage: 30,
    zahlungsfrist_tage: 30,
    startnummer_offerten: 1000,
    startnummer_rechnungen: 1000,
    vorlage_einleitung_offerte: 'Gerne unterbreiten wir Ihnen folgende Offerte:',
    vorlage_schluss_offerte: 'Wir danken Ihnen fǬr das Vertrauen und stehen fǬr Fragen gerne zur VerfǬgung.',
    vorlage_einleitung_rechnung: 'Herzlichen Dank fǬr den geschtzten Auftrag.',
    vorlage_schluss_rechnung: 'Bitte begleichen Sie den Betrag innert der angegebenen Frist.'
  })
  
  const [editState, setEditState] = useState(null) // null, 'unternehmen', 'adresse', 'finanzen', 'texte'
  const [draft, setDraft] = useState({})
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [dbError, setDbError] = useState(false)

  // Team Mock State
  const [team] = useState([
    { id: 1, name: 'Leandro LǬthi', email: 'leandro@atelier-77.ch', role: 'Inhaber', status: 'Aktiv' },
    { id: 2, name: 'Amin (Dev)', email: 'amin@example.com', role: 'Administrator', status: 'Aktiv' }
  ])

  useEffect(() => {
    async function loadSettings() {
      if (!supabase) return
      setIsLoading(true)
      try {
        const { data, error } = await supabase.from('einstellungen').select('*').eq('id', 1).single()
        if (error) {
          if (error.code === 'PGRST205' || error.code === '42P01') {
            console.warn('Tabelle einstellungen fehlt in Supabase. Fallback auf lokale Daten.')
            setDbError(true)
            const localSettings = localStorage.getItem('atelier77_einstellungen_v2')
            if (localSettings) {
              setSettings(JSON.parse(localSettings))
            }
          } else if (error.code === 'PGRST116') {
            await supabase.from('einstellungen').insert([{ id: 1, ...settings }])
          } else {
            console.error('Supabase Error:', error)
          }
        } else if (data) {
          setSettings({ ...settings, ...data }) // Merge defaults with DB
        }
      } catch (err) {
        console.error('Unexpected error loading settings:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [])

  const startEdit = (blockName) => {
    setDraft({ ...settings })
    setEditState(blockName)
  }

  const cancelEdit = () => {
    setDraft({})
    setEditState(null)
  }

  const handleSave = async (blockName) => {
    setIsSaving(true)
    
    // Optimistic UI Update
    setSettings(draft)
    
    try {
      if (dbError) {
        // Fallback to localstorage
        localStorage.setItem('atelier77_einstellungen_v2', JSON.stringify(draft))
      } else {
        const { error } = await supabase.from('einstellungen').upsert({ id: 1, ...draft })
        if (error) throw error
      }
      setEditState(null)
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
      alert('Fehler beim Speichern der Einstellungen.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDraftChange = (field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }))
  }

  if (isLoading) {
    return <div className="flex flex-col gap-4 p-6 w-full animate-pulse"><div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div><div className="h-64 bg-surface-card rounded-2xl border border-border w-full"></div></div>
  }

  const tabs = [
    { id: 'unternehmen', label: 'Unternehmen', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { id: 'rechnungsstellung', label: 'Finanzen & Konditionen', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z' },
    { id: 'vorlagen', label: 'Texte & Vorlagen', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
    { id: 'team', label: 'Team', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' }
  ]

  return (
    <div className="space-y-8 max-w-5xl pb-16">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Einstellungen</h2>
        <p className="text-text-secondary mt-1">Verwalte hier die Stammdaten fǬr das PDF und Standardwerte fǬr den Editor.</p>
        
        {dbError && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-800 text-sm">
            <span>⚠️</span>
            <div>
              <p className="font-bold">Datenbank-Tabelle "einstellungen" fehlt</p>
              <p>Bitte lege die Tabelle im Supabase Dashboard an. Die neuen Spalten findest du im Implementation Plan. Solange werden nderungen lokal in deinem Browser gespeichert.</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs - Pill Design */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setEditState(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id 
                ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20' 
                : 'bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} /></svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        
        {/* =========================================
            TAB: UNTERNEHMEN 
        ========================================= */}
        {activeTab === 'unternehmen' && (
          <div className="space-y-6">
            <SettingsBlock
              title="Stammdaten & Adresse"
              description="Diese Angaben werden oben links auf deinen Offerten und Rechnungen angedruckt."
              isEditing={editState === 'unternehmen'}
              onEdit={() => startEdit('unternehmen')}
              onCancel={cancelEdit}
              onSave={() => handleSave('unternehmen')}
              isSaving={isSaving}
              readOnlyView={
                <>
                  <SettingsRow label="Name des Unternehmens" value={settings.firmenname} />
                  <SettingsRow label="Strasse & Nr." value={settings.strasse} />
                  <SettingsRow label="PLZ & Ort" value={settings.plz_ort} />
                  <SettingsRow label="UID-Nummer" value={settings.uid} />
                </>
              }
            >
              <InputField label="Name des Unternehmens" value={draft.firmenname} onChange={v => handleDraftChange('firmenname', v)} />
              <InputField label="UID-Nummer" value={draft.uid} onChange={v => handleDraftChange('uid', v)} placeholder="z.B. CHE-123.456.789 MWST" />
              <div className="">
                <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">Strasse (Auto-Fill)</label>
                <AddressAutocomplete 
                  value={draft.strasse || ''} 
                  onChange={(val, details) => {
                    if (details) {
                      setDraft(prev => ({...prev, strasse: details.strasse, plz_ort: `${details.plz} ${details.ort}`.trim()}))
                    } else {
                      handleDraftChange('strasse', val)
                    }
                  }}
                  placeholder="Strasse eingeben..."
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400 transition-colors"
                />
              </div>
              <InputField label="PLZ & Ort" value={draft.plz_ort} onChange={v => handleDraftChange('plz_ort', v)} placeholder="3000 Bern" />
            </SettingsBlock>

            <SettingsBlock
              title="Kontaktdaten"
              description="Diese Daten erscheinen auf dem PDF als Kontaktmglichkeiten fǬr deine Kunden."
              isEditing={editState === 'kontakt'}
              onEdit={() => startEdit('kontakt')}
              onCancel={cancelEdit}
              onSave={() => handleSave('kontakt')}
              isSaving={isSaving}
              readOnlyView={
                <>
                  <SettingsRow label="Geschäfts-E-Mail" value={settings.email} />
                  <SettingsRow label="Telefonnummer" value={settings.telefon} />
                  <SettingsRow label="Website" value={settings.website} />
                </>
              }
            >
              <InputField label="Geschäfts-E-Mail" type="email" value={draft.email} onChange={v => handleDraftChange('email', v)} />
              <InputField label="Telefonnummer" type="tel" value={draft.telefon} onChange={v => handleDraftChange('telefon', v)} />
              <InputField label="Website" type="url" value={draft.website} onChange={v => handleDraftChange('website', v)} />
            </SettingsBlock>
          </div>
        )}

        {/* =========================================
            TAB: RECHNUNGSSTELLUNG 
        ========================================= */}
        {activeTab === 'rechnungsstellung' && (
          <div className="space-y-6">
            <SettingsBlock
              title="Bank & MWST"
              description="Die IBAN wird auf Rechnungen gedruckt. Die MWST gilt als Standard fǬr neue Dokumente."
              isEditing={editState === 'finanzen'}
              onEdit={() => startEdit('finanzen')}
              onCancel={cancelEdit}
              onSave={() => handleSave('finanzen')}
              isSaving={isSaving}
              readOnlyView={
                <>
                  <SettingsRow label="Bankverbindung (IBAN)" value={settings.bankverbindung} />
                  <SettingsRow label="Standard MwSt" value={settings.standard_mwst ? `${settings.standard_mwst}%` : '0%'} />
                  <SettingsRow label="Standard Rabatt" value={settings.standard_rabatt ? `${settings.standard_rabatt}%` : '0%'} />
                </>
              }
            >
              <InputField label="Bankverbindung (IBAN)" value={draft.bankverbindung} onChange={v => handleDraftChange('bankverbindung', v)} fullWidth />
              <InputField label="Standard MwSt (%)" type="number" value={draft.standard_mwst} onChange={v => handleDraftChange('standard_mwst', parseFloat(v))} />
              <InputField label="Standard Rabatt (%)" type="number" value={draft.standard_rabatt} onChange={v => handleDraftChange('standard_rabatt', parseFloat(v))} />
            </SettingsBlock>

            <SettingsBlock
              title="Fristen & Konditionen"
              description="Standard-Tage fǬr die GǬltigkeit von Offerten und Zahlungsziele von Rechnungen."
              isEditing={editState === 'fristen'}
              onEdit={() => startEdit('fristen')}
              onCancel={cancelEdit}
              onSave={() => handleSave('fristen')}
              isSaving={isSaving}
              readOnlyView={
                <>
                  <SettingsRow label="Offerten GǬltigkeit" value={settings.gueltigkeit_offerten_tage ? `${settings.gueltigkeit_offerten_tage} Tage` : ''} />
                  <SettingsRow label="Rechnungen Zahlungsfrist" value={settings.zahlungsfrist_tage ? `${settings.zahlungsfrist_tage} Tage` : ''} />
                </>
              }
            >
              <InputField label="Offerten GǬltigkeit (Tage)" type="number" value={draft.gueltigkeit_offerten_tage} onChange={v => handleDraftChange('gueltigkeit_offerten_tage', parseInt(v))} />
              <InputField label="Rechnungen Zahlungsfrist (Tage)" type="number" value={draft.zahlungsfrist_tage} onChange={v => handleDraftChange('zahlungsfrist_tage', parseInt(v))} />
            </SettingsBlock>

            <SettingsBlock
              title="Nummernkreise"
              description="Die nchste verfǬgbare Nummer fǬr deine Dokumente."
              isEditing={editState === 'nummern'}
              onEdit={() => startEdit('nummern')}
              onCancel={cancelEdit}
              onSave={() => handleSave('nummern')}
              isSaving={isSaving}
              readOnlyView={
                <>
                  <SettingsRow label="Startnummer Offerten" value={settings.startnummer_offerten} />
                  <SettingsRow label="Startnummer Rechnungen" value={settings.startnummer_rechnungen} />
                </>
              }
            >
              <InputField label="Startnummer Offerten" type="number" value={draft.startnummer_offerten} onChange={v => handleDraftChange('startnummer_offerten', parseInt(v))} />
              <InputField label="Startnummer Rechnungen" type="number" value={draft.startnummer_rechnungen} onChange={v => handleDraftChange('startnummer_rechnungen', parseInt(v))} />
            </SettingsBlock>
          </div>
        )}

        {/* =========================================
            TAB: VORLAGEN 
        ========================================= */}
        {activeTab === 'vorlagen' && (
          <div className="space-y-6">
            <SettingsBlock
              title="Offerten Vorlagen"
              description="Diese Texte werden automatisch eingefǬgt, wenn du eine neue Offerte erstellst."
              isEditing={editState === 'texte_offerte'}
              onEdit={() => startEdit('texte_offerte')}
              onCancel={cancelEdit}
              onSave={() => handleSave('texte_offerte')}
              isSaving={isSaving}
              readOnlyView={
                <>
                  <SettingsRow label="Einleitungstext" value={<span className="line-clamp-2">{settings.vorlage_einleitung_offerte}</span>} />
                  <SettingsRow label="Schlusstext" value={<span className="lineclamp-2">{settings.vorlage_schluss_offerte}</span>} />
                </>
              }
            >
              <TextAreaField label="Standard Einleitungstext" small value={draft.vorlage_einleitung_offerte} onChange={v => handleDraftChange('vorlage_einleitung_offerte', v)} />
              <TextAreaField label="Standard Schlusstext" small value={draft.vorlage_schluss_offerte} onChange={v => handleDraftChange('vorlage_schluss_offerte', v)} />
            </SettingsBlock>

            <SettingsBlock
              title="Rechnungen Vorlagen"
              description="Diese Texte werden automatisch eingefǬgt, wenn du eine neue Rechnung erstellst."
              isEditing={editState === 'texte_rechnung'}
              onEdit={() => startEdit('texte_rechnung')}
              onCancel={cancelEdit}
              onSave={() => handleSave('texte_rechnung')}
              isSaving={isSaving}
              readOnlyView={
                <>
                  <SettingsRow label="Einleitungstext" value={<span className="line-clamp-2">{settings.vorlage_einleitung_rechnung}</span>} />
                  <SettingsRow label="Schlusstext" value={<span className="line-clamp-2">{settings.vorlage_schluss_rechnung}</span>} />
                </>
              }
            >
              <TextAreaField label="Standard Einleitungstext" small value={draft.vorlage_einleitung_rechnung} onChange={v => handleDraftChange('vorlage_einleitung_rechnung', v)} />
              <TextAreaField label="Standard Schlusstext" small value={draft.vorlage_schluss_rechnung} onChange={v => handleDraftChange('vorlage_schluss_rechnung', v)} />
            </SettingsBlock>
          </div>
        )}

        {/* =========================================
            TAB: TEAMMANAGEMENT 
        ========================================= */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="text-lg font-bold text-text-primary">Teammitglieder</h3>
                <p className="text-sm text-text-secondary mt-1">Personen mit Zugriff auf das System</p>
              </div>
              <button className="px-4 py-2 bg-primary-50 text-primary-600 font-semibold text-sm rounded-lg hover:bg-primary-100 transition-colors cursor-not-allowed opacity-50 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Mitglied einladen
              </button>
            </div>

            <div className="bg-surface-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-surface/50 border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">E-Mail</th>
                      <th className="px-6 py-4">Rolle</th>
                      <th className="px-6 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {team.map(member => (
                      <tr key={member.id} className="hover:bg-surface-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs shadow-sm">
                              {member.name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-semibold text-text-primary">{member.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-text-secondary font-medium">{member.email}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold">
                            {member.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-100">
                            {member.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
