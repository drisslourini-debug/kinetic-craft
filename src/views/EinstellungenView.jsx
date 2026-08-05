import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AddressAutocomplete from '../components/AddressAutocomplete'

// ----------------------
// SUBCOMPONENTS
// ----------------------

import { SettingsBlock, SettingsRow, InputField, TextAreaField } from '../components/ui/SettingsComponents'
import TemplateCategory from '../components/einstellungen/TemplateCategory'
import FirmenDaten from '../components/einstellungen/FirmenDaten'
import Standardwerte from '../components/einstellungen/Standardwerte'
import Nummernkreise from '../components/einstellungen/Nummernkreise'

// ----------------------
// MAIN COMPONENT
// ----------------------

export default function EinstellungenView({ userRole }) {
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
    qr_iban: '',
    hr_nummer: '',
    gerichtsstand: '',
    logo_url: '',
    primary_color: '#8b5cf6', // Standard Color
    standard_mwst: 8.1,
    standard_rabatt: 0,
    gueltigkeit_offerten_tage: 30,
    zahlungsfrist_tage: 30,
    startnummer_offerten: 1000,
    startnummer_rechnungen: 1000,
    text_vorlagen: [] // New array for dynamic templates
  })
  
  const [editState, setEditState] = useState(null) // null, 'unternehmen', 'adresse', 'finanzen'
  const [draft, setDraft] = useState({})
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [dbError, setDbError] = useState(false)
  
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [templateForm, setTemplateForm] = useState({ label: '', text: '', category: '' })

  const [teamMembers, setTeamMembers] = useState({ active: [], pending: [] })
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'team' })
  const [inviteLink, setInviteLink] = useState('')
  const [isLoadingTeam, setIsLoadingTeam] = useState(false)

  const defaultTextVorlagen = [
  { id: 'oe_1', category: 'offerte_einleitung', label: 'Standard', text: 'Gerne unterbreiten wir Ihnen folgende Offerte:' },
  { id: 'oe_2', category: 'offerte_einleitung', label: 'Förmlich', text: 'Bezugnehmend auf unsere Besichtigung vor Ort erlauben wir uns, Ihnen folgende Offerte zu unterbreiten:' },
  { id: 'oe_3', category: 'offerte_einleitung', label: 'Persönlich', text: 'Vielen Dank für Ihre Anfrage und das entgegengebrachte Vertrauen. Gerne offerieren wir Ihnen die gewünschten Arbeiten wie folgt:' },
  { id: 'os_1', category: 'offerte_schluss', label: 'Standard', text: 'Wir danken Ihnen für das Vertrauen und stehen für Fragen gerne zur Verfügung.' },
  { id: 'os_2', category: 'offerte_schluss', label: 'Förmlich', text: 'Für die Auftragserteilung danken wir Ihnen im Voraus bestens. Bei Unklarheiten stehen wir Ihnen jederzeit gerne zur Verfügung.' },
  { id: 'os_3', category: 'offerte_schluss', label: 'Kurz', text: 'Besten Dank für Ihre Anfrage.' },
  { id: 're_1', category: 'rechnung_einleitung', label: 'Standard', text: 'Gerne unterbreiten wir Ihnen folgende Rechnung:' },
  { id: 're_2', category: 'rechnung_einleitung', label: 'Förmlich', text: 'Bezugnehmend auf unsere Besichtigung vor Ort erlauben wir uns, Ihnen folgende Rechnung zu unterbreiten:' },
  { id: 're_3', category: 'rechnung_einleitung', label: 'Persönlich', text: 'Vielen Dank für Ihre Anfrage und das entgegengebrachte Vertrauen. Gerne offerieren wir Ihnen die gewünschten Arbeiten wie folgt:' },
  { id: 'rs_1', category: 'rechnung_schluss', label: 'Standard', text: 'Wir danken Ihnen für das Vertrauen und stehen für Fragen gerne zur Verfügung.' },
  { id: 'rs_2', category: 'rechnung_schluss', label: 'Mit Gültigkeit', text: 'Diese Rechnung ist 30 Tage gültig. Materialpreisänderungen bleiben vorbehalten. Wir danken Ihnen für das Vertrauen und freuen uns auf Ihren Auftrag.' },
  { id: 'rs_3', category: 'rechnung_schluss', label: 'Ausführlich', text: 'Die Rechnung versteht sich exkl. allfälliger Gerüstkosten und bauseitiger Vorleistungen. Materialpreisänderungen bleiben vorbehalten. Nicht offerierte Arbeiten werden nach Aufwand verrechnet. Wir danken Ihnen für das Vertrauen und stehen für Fragen gerne zur Verfügung.' }
];

  useEffect(() => {
    async function loadSettings() {
      if (!supabase) return
      setIsLoading(true)
      try {
        const { data, error } = await supabase.from('einstellungen').select('*').limit(1).single()
        if (error) {
          if (error.code === 'PGRST205' || error.code === '42P01' || error.code === '42703') {
            console.warn('Tabelle einstellungen fehlt oder Spalte fehlt in Supabase. Fallback auf lokale Daten.')
            setDbError(true)
            const localSettings = localStorage.getItem('atelier77_einstellungen_v2')
            if (localSettings) {
              setSettings(JSON.parse(localSettings))
            }
          } else if (error.code === 'PGRST116') {
            const { data: newRow, error: insertErr } = await supabase.from('einstellungen').insert([{ ...settings }]).select().single()
            if (newRow) {
              setSettings({ ...settings, ...newRow })
            } else if (insertErr) {
              console.error('Error inserting initial settings:', insertErr)
            }
          } else {
            console.error('Supabase Error:', error)
          }
        } else if (data) {
          const hasSeeded = localStorage.getItem('atelier77_text_vorlagen_seeded')
          if (!data.text_vorlagen || (data.text_vorlagen.length === 0 && !hasSeeded)) {
            // Seed the db only if column is null/undefined or first run after migration
            const seededSettings = { ...settings, ...data, text_vorlagen: defaultTextVorlagen };
            setSettings(seededSettings);
            await supabase.from('einstellungen').update(seededSettings).eq('id', data.id);
            localStorage.setItem('atelier77_text_vorlagen_seeded', 'true');
          } else {
            // If it's [], it means the user deleted them all, respect that.
            setSettings({ ...settings, ...data, text_vorlagen: data.text_vorlagen })
          }
        }
      } catch (err) {
        console.error('Unexpected error loading settings:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
    loadTeamMembers()
  }, [])

  async function loadTeamMembers() {
    setIsLoadingTeam(true)
    try {
      const { data, error } = await supabase.rpc('get_team_members')
      if (data && !error) {
        setTeamMembers(data)
      }
    } catch (err) {
      console.error('Error loading team:', err)
    } finally {
      setIsLoadingTeam(false)
    }
  }

  const handleInviteUser = async (e) => {
    e.preventDefault()
    try {
      const { data: token, error } = await supabase.rpc('create_invitation', { 
        p_email: inviteForm.email, 
        p_role: inviteForm.role 
      })
      if (error) throw error
      
      const link = `${window.location.origin}/#/register?token=${token}`
      setInviteLink(link)
      loadTeamMembers()
    } catch (err) {
      alert('Fehler beim Einladen: ' + err.message)
    }
  }

  const handleDeleteInvite = async (token) => {
    if (!window.confirm('Einladung wirklich zurückziehen?')) return
    try {
      await supabase.rpc('delete_invitation', { p_token: token })
      loadTeamMembers()
    } catch (err) {
      alert('Fehler beim Löschen: ' + err.message)
    }
  }

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
        const payload = { ...draft }
        delete payload.tenant_id // Never attempt to update tenant_id
        
        let saveErr;
        if (draft.id) {
          const { error } = await supabase.from('einstellungen').update(payload).eq('id', draft.id)
          saveErr = error;
        } else {
          // If draft.id is missing (e.g. failed to load initial row), insert instead!
          const { data, error } = await supabase.from('einstellungen').insert([payload]).select().single()
          saveErr = error;
          if (!error && data) {
            setSettings({ ...draft, ...data }) // Update state with the new ID
            setDraft({ ...draft, ...data })
          }
        }

        if (saveErr) {
          if (saveErr.code === '42703') { // Column missing
            console.warn('Spalte text_vorlagen fehlt in Supabase. Fallback auf lokale Daten.')
            setDbError(true)
            localStorage.setItem('atelier77_einstellungen_v2', JSON.stringify(draft))
          } else {
            throw error
          }
        }
      }
      setEditState(null)
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
      alert(`Fehler beim Speichern: ${error?.message || error?.details || JSON.stringify(error)}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDraftChange = (field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }))
  }

  // --- TEMPLATE MANAGEMENT ACTIONS ---
  
  const saveTemplateListToDb = async (newList) => {
    const updatedSettings = { ...settings, text_vorlagen: newList }
    setSettings(updatedSettings)
    
    try {
      if (dbError) {
        localStorage.setItem('atelier77_einstellungen_v2', JSON.stringify(updatedSettings))
      } else {
        let saveErr;
        if (updatedSettings.id) {
          const { error } = await supabase.from('einstellungen').update({ text_vorlagen: newList }).eq('id', updatedSettings.id)
          saveErr = error;
        } else {
          const payload = { ...updatedSettings }
          delete payload.tenant_id
          const { data, error } = await supabase.from('einstellungen').insert([payload]).select().single()
          saveErr = error;
          if (!error && data) {
            setSettings({ ...updatedSettings, ...data })
          }
        }

        if (saveErr) {
          if (saveErr.code === '42703') {
            setDbError(true)
            localStorage.setItem('atelier77_einstellungen_v2', JSON.stringify(updatedSettings))
          } else {
            throw error
          }
        }
      }
    } catch (err) {
      console.error('Fehler beim Speichern der Vorlagen:', err)
    }
  }

  
  const handleRestoreDefaults = () => {
    if (window.confirm('Möchtest du die Standard-Vorlagen laden? Deine bisherigen bleiben erhalten.')) {
      const currentList = settings.text_vorlagen || []
      const newList = [...currentList]
      
      defaultTextVorlagen.forEach(defaultItem => {
         const exists = currentList.find(t => t.category === defaultItem.category && t.label === defaultItem.label)
         if (!exists) {
            newList.push({ ...defaultItem, id: Date.now().toString() + Math.random().toString(36).substring(7) })
         }
      })
      
      saveTemplateListToDb(newList)
    }
  }

  const handleAddTemplate = (category) => {
    setTemplateForm({ label: '', text: '', category })
    setEditingTemplate('new')
  }

  const handleEditTemplate = (template) => {
    setTemplateForm({ ...template })
    setEditingTemplate(template.id)
  }

  const handleDeleteTemplate = (id) => {
    if (window.confirm('Vorlage wirklich löschen?')) {
      const newList = (settings.text_vorlagen || []).filter(t => t.id !== id)
      saveTemplateListToDb(newList)
    }
  }

  const handleSaveTemplateForm = () => {
    if (!templateForm.label || !templateForm.text) {
      alert('Bitte fülle Titel und Text aus.')
      return
    }
    
    let newList = [...(settings.text_vorlagen || [])]
    if (editingTemplate === 'new') {
      newList.push({ ...templateForm, id: Date.now().toString() })
    } else {
      newList = newList.map(t => t.id === editingTemplate ? { ...templateForm, id: editingTemplate } : t)
    }
    
    saveTemplateListToDb(newList)
    setEditingTemplate(null)
  }

  if (isLoading) {
    return <div className="flex flex-col gap-4 p-6 w-full animate-pulse"><div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div><div className="h-64 bg-surface-card rounded-2xl border border-border w-full"></div></div>
  }

  const tabs = [
    { id: 'unternehmen', label: 'Unternehmen', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { id: 'rechnungsstellung', label: 'Finanzen & Konditionen', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z' },
    { id: 'vorlagen', label: 'Vorlagen', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
    { id: 'team', label: 'Team', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' }
  ]

  return (
    <div className="space-y-8 max-w-[1600px] pb-16">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Einstellungen</h2>
        <p className="text-text-secondary mt-1">Verwalte hier die Stammdaten für das PDF und Standardwerte für den Editor.</p>
      </div>

      {/* Tabs - Pill Design */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 sm:py-2.5 min-h-[48px] sm:min-h-0 text-base sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
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
          <FirmenDaten
            settings={settings}
            draft={draft}
            editState={editState}
            isSaving={isSaving}
            startEdit={startEdit}
            cancelEdit={cancelEdit}
            handleSave={handleSave}
            handleDraftChange={handleDraftChange}
            setDraft={setDraft}
            userRole={userRole}
          />
        )}

        {/* =========================================
            TAB: RECHNUNGSSTELLUNG 
        ========================================= */}
        {activeTab === 'rechnungsstellung' && (
          <div className="space-y-6">
            <Standardwerte
              settings={settings}
              draft={draft}
              editState={editState}
              isSaving={isSaving}
              startEdit={startEdit}
              cancelEdit={cancelEdit}
              handleSave={handleSave}
              handleDraftChange={handleDraftChange}
              userRole={userRole}
            />
            
            <Nummernkreise
              settings={settings}
              draft={draft}
              editState={editState}
              isSaving={isSaving}
              startEdit={startEdit}
              cancelEdit={cancelEdit}
              handleSave={handleSave}
              handleDraftChange={handleDraftChange}
              userRole={userRole}
            />
          </div>
        )}

        {/* =========================================
            TAB: VORLAGEN (TEMPLATE MANAGER)
        ========================================= */}
        {activeTab === 'vorlagen' && (
          <div className="space-y-6">
            {userRole !== 'treuhand' && (
              <div className="flex justify-end mb-6">
                <button 
                  onClick={handleRestoreDefaults}
                  className="text-xs text-text-secondary hover:text-primary-600 flex items-center gap-1.5 transition-colors cursor-pointer bg-white px-3 py-1.5 border border-border rounded-lg shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Standard-Vorlagen wiederherstellen
                </button>
              </div>
            )}
            
            <div className="space-y-6">
              <TemplateCategory 
                title="Offerten - Einleitung" 
                description="Der Einleitungstext oberhalb der Leistungs-Tabelle."
                category="offerte_einleitung"
                templates={settings.text_vorlagen || []}
                onAdd={handleAddTemplate}
                onEdit={handleEditTemplate}
                onDelete={handleDeleteTemplate}
                userRole={userRole}
              />
              <TemplateCategory 
                title="Offerten - Schlusstext" 
                description="Der Text nach der Total-Summe, oft für Grussformeln."
                category="offerte_schluss"
                templates={settings.text_vorlagen || []}
                onAdd={handleAddTemplate}
                onEdit={handleEditTemplate}
                onDelete={handleDeleteTemplate}
                userRole={userRole}
              />
              
              <TemplateCategory 
                title="Rechnungen - Einleitung" 
                category="rechnung_einleitung"
                templates={settings.text_vorlagen || []}
                onAdd={handleAddTemplate}
                onEdit={handleEditTemplate}
                onDelete={handleDeleteTemplate}
                userRole={userRole}
              />
              <TemplateCategory 
                title="Rechnungen - Schlusstext" 
                description="Enthält oft die Zahlungsfrist oder Danke-Sätze."
                category="rechnung_schluss"
                templates={settings.text_vorlagen || []}
                onAdd={handleAddTemplate}
                onEdit={handleEditTemplate}
                onDelete={handleDeleteTemplate}
                userRole={userRole}
              />
            </div>
          </div>
        )}

        {/* =========================================
            TAB: TEAMMANAGEMENT 
        ========================================= */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-2">
              <div>
                <h3 className="text-lg font-bold text-text-primary">Teammitglieder</h3>
                <p className="text-sm text-text-secondary mt-1">Personen mit Zugriff auf das System</p>
              </div>
              <button 
                onClick={() => { setInviteForm({ email: '', role: 'team' }); setInviteLink(''); setShowInviteModal(true); }}
                className="px-4 py-2 bg-primary-600 text-white font-semibold text-sm rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
              >
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
                      <th className="px-6 py-4 text-right">Status / Aktion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isLoadingTeam ? (
                      <tr>
                        <td colSpan="4" className="px-6 py-8 text-center text-text-secondary animate-pulse">Team wird geladen...</td>
                      </tr>
                    ) : teamMembers.active?.length === 0 && teamMembers.pending?.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-6 py-8 text-center text-text-secondary">Keine Teammitglieder gefunden.</td>
                      </tr>
                    ) : (
                      <>
                        {/* Active Members */}
                        {teamMembers.active?.map(member => (
                          <tr key={member.id} className="hover:bg-surface/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-text-primary">{member.name}</td>
                            <td className="px-6 py-4 text-text-secondary">{member.email || 'Versteckt'}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {member.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                {member.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {/* Pending Invitations */}
                        {teamMembers.pending?.map(invite => (
                          <tr key={invite.id} className="hover:bg-surface/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-text-secondary italic">Noch nicht registriert</td>
                            <td className="px-6 py-4 text-text-secondary">{invite.email}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 opacity-70">
                                {invite.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-3">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                  {invite.status}
                                </span>
                                <button onClick={() => handleDeleteInvite(invite.token)} className="text-red-500 hover:text-red-700 p-1 rounded" title="Einladung zurückziehen">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
      
      {/* TEMPLATE EDITOR MODAL */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border flex justify-between items-center bg-surface-card">
              <h3 className="text-xl font-bold text-text-primary">
                {editingTemplate === 'new' ? 'Neue Vorlage erstellen' : 'Vorlage bearbeiten'}
              </h3>
              <button onClick={() => setEditingTemplate(null)} className="p-3 sm:p-2 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 text-text-secondary hover:text-text-primary rounded-lg transition-colors bg-surface hover:bg-neutral-100 cursor-pointer flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">Name der Vorlage</label>
                <input 
                  type="text" 
                  value={templateForm.label}
                  onChange={e => setTemplateForm({...templateForm, label: e.target.value})}
                  placeholder="z.B. Standard, Förmlich, Winteraktion..."
                  className="w-full px-3 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-surface border border-border rounded-lg text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary-400 transition-colors"
                />
              </div>
              
              <div>
                <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">Text-Inhalt</label>
                <textarea 
                  value={templateForm.text}
                  onChange={e => setTemplateForm({...templateForm, text: e.target.value})}
                  placeholder="Der Textbaustein..."
                  className="w-full h-40 px-3 py-3 sm:py-2 bg-surface border border-border rounded-lg text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary-400 transition-colors resize-y"
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-border bg-surface-card flex justify-end gap-3">
              <button 
                onClick={() => setEditingTemplate(null)}
                className="px-5 py-3 sm:py-2.5 min-h-[48px] sm:min-h-0 text-base sm:text-sm font-semibold text-text-secondary hover:text-text-primary bg-surface border border-border rounded-xl transition-colors cursor-pointer hover:bg-neutral-100"
              >
                Abbrechen
              </button>
              <button 
                onClick={handleSaveTemplateForm}
                className="px-6 py-3 sm:py-2.5 min-h-[48px] sm:min-h-0 bg-primary-600 text-white rounded-xl text-base sm:text-sm font-bold shadow-md shadow-primary-600/20 hover:bg-primary-700 active:scale-95 transition-all cursor-pointer"
              >
                Vorlage speichern
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">Neues Mitglied einladen</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-text-secondary hover:text-text-primary p-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6">
              {!inviteLink ? (
                <form onSubmit={handleInviteUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-1.5">E-Mail Adresse</label>
                    <input 
                      type="email" 
                      required
                      value={inviteForm.email}
                      onChange={e => setInviteForm({...inviteForm, email: e.target.value})}
                      className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                      placeholder="mitarbeiter@firma.ch"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-1.5">Rolle</label>
                    <select 
                      value={inviteForm.role}
                      onChange={e => setInviteForm({...inviteForm, role: e.target.value})}
                      className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                    >
                      <option value="team">Team (Standard-Zugriff)</option>
                      <option value="admin">Admin (Zugriff auf Einstellungen)</option>
                    </select>
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setShowInviteModal(false)} className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors">Abbrechen</button>
                    <button type="submit" className="flex-1 py-2.5 px-4 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors shadow-md shadow-primary-600/20">Einladung erstellen</button>
                  </div>
                </form>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h4 className="text-lg font-bold text-text-primary">Einladungslink generiert!</h4>
                  <p className="text-sm text-text-secondary">Kopiere diesen Link und schicke ihn an das neue Teammitglied.</p>
                  
                  <div className="relative group">
                    <input 
                      type="text" 
                      readOnly 
                      value={inviteLink}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-text-primary text-sm focus:outline-none pr-12"
                    />
                    <button 
                      onClick={() => { navigator.clipboard.writeText(inviteLink); alert('Kopiert!'); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-primary-600 transition-colors bg-gray-50"
                      title="Link kopieren"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                  </div>

                  <a 
                    href={`mailto:${inviteForm.email}?subject=Einladung zu Atelier 77&body=Hallo,%0D%0A%0D%0ADu wurdest eingeladen. Klicke hier um dich zu registrieren:%0D%0A${inviteLink}`}
                    className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 bg-primary-50 text-primary-700 font-bold rounded-xl hover:bg-primary-100 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    Per E-Mail versenden
                  </a>
                  
                  <button onClick={() => setShowInviteModal(false)} className="w-full mt-2 py-2.5 px-4 text-gray-500 font-semibold hover:text-gray-700 transition-colors">
                    Schliessen
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
