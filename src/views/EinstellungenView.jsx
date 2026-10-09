import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  IconUser,
  IconBuilding,
  IconCreditCard,
  IconTag,
  IconNotes,
  IconTeam,
  IconShield,
  IconFlash,
  IconSwissFlag,
  IconClose,
  IconCheck,
  IconWarning,
  IconInfo
} from '../components/icons/BrandIcons'

// ----------------------
// SUBCOMPONENTS
// ----------------------
import MeinProfil from '../components/einstellungen/MeinProfil'
import FirmenDaten from '../components/einstellungen/FirmenDaten'
import Standardwerte from '../components/einstellungen/Standardwerte'
import Nummernkreise from '../components/einstellungen/Nummernkreise'
import TemplateCategory from '../components/einstellungen/TemplateCategory'
import RollenUebersicht from '../components/einstellungen/RollenUebersicht'
import LizenzVerwaltung from '../components/einstellungen/LizenzVerwaltung'

const DEFAULT_TEXT_VORLAGEN = [
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
]

export default function EinstellungenView({ onNavigate, userRole, refreshGlobalSettings, userName: initialUserName, onUserNameChange: parentOnUserNameChange }) {
  const [activeNav, setActiveNav] = useState('profil') // 'profil', 'unternehmen', 'finanzen', 'nummernkreise', 'vorlagen', 'team', 'rollen', 'lizenz'
  const [tenantId, setTenantId] = useState(null)
  const [tenantInfo, setTenantInfo] = useState(null)
  const [userName, setUserName] = useState(initialUserName || '')

  useEffect(() => {
    if (initialUserName) setUserName(initialUserName)
  }, [initialUserName])

  const [settings, setSettings] = useState({
    firmenname: '',
    strasse: '',
    plz: '',
    ort: '',
    plz_ort: '',
    land: 'Schweiz',
    uid: '',
    telefon: '',
    email: '',
    website: '',
    bankverbindung: '',
    qr_iban: '',
    kanton: 'BE',
    hr_nummer: '',
    gerichtsstand: '',
    logo_url: '',
    primary_color: '#b88a38',
    standard_mwst: 8.1,
    standard_rabatt: 0,
    gueltigkeit_offerten_tage: 30,
    zahlungsfrist_tage: 30,
    startnummer_offerten: 1000,
    startnummer_rechnungen: 1000,
    startnummer_kunden: 1000,
    prefix_kunden: 'K-',
    startnummer_projekte: 1000,
    prefix_projekte: 'P-',
    mwst_methode: 'effektiv',
    saldosteuersatz: 5.9,
    mwst_abrechnungsart: 'vereinbart',
    konto_bank: '1020',
    konto_debitoren: '1100',
    konto_kreditoren: '2000',
    konto_ertrag: '3200',
    konto_skonto: '3800',
    text_vorlagen: []
  })
  
  const [editState, setEditState] = useState(null)
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
  const [copiedLink, setCopiedLink] = useState(false)
  const [isLoadingTeam, setIsLoadingTeam] = useState(false)

  const [toast, setToast] = useState(null)
  const showToast = (type, text) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 4000)
  }
  const [confirmModal, setConfirmModal] = useState(null)

  useEffect(() => {
    async function loadInitialData() {
      if (!supabase) return
      setIsLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        let tId = null
        if (session?.user?.id) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('tenant_id, user_name, tenants(id, name, status, trial_ends_at)')
            .eq('id', session.user.id)
            .maybeSingle()

          if (roleData) {
            tId = roleData.tenant_id
            setTenantId(tId)
            const resolvedName = session?.user?.user_metadata?.full_name || roleData.user_name
            if (resolvedName) setUserName(resolvedName)
            if (roleData.tenants) setTenantInfo(roleData.tenants)
          }
        }

        let query = supabase.from('einstellungen').select('*')
        if (tId) {
          query = query.eq('tenant_id', tId)
        }
        const { data, error } = await query.limit(1).maybeSingle()

        let local = {}
        try {
          const localStr = localStorage.getItem('atelier77_einstellungen_v2')
          if (localStr) local = JSON.parse(localStr)
        } catch (e) {}

        if (error) {
          console.warn('Einstellungen Ladefehler:', error)
          setDbError(true)
          if (local) setSettings(prev => ({ ...prev, ...local }))
        } else if (data) {
          const hasSeeded = localStorage.getItem('atelier77_text_vorlagen_seeded')
          if (!data.text_vorlagen || (data.text_vorlagen.length === 0 && !hasSeeded)) {
            const seededSettings = { ...data, text_vorlagen: DEFAULT_TEXT_VORLAGEN }
            setSettings(prev => ({ ...prev, ...local, ...seededSettings }))
            if (tId) {
              supabase.from('einstellungen').update({ text_vorlagen: DEFAULT_TEXT_VORLAGEN }).eq('id', data.id)
            }
            localStorage.setItem('atelier77_text_vorlagen_seeded', 'true')
          } else {
            setSettings(prev => ({ ...prev, ...local, ...data }))
          }
        } else if (tId) {
          // No row exists for this tenant yet -> create initial record
          const initialRow = {
            tenant_id: tId,
            text_vorlagen: DEFAULT_TEXT_VORLAGEN,
            land: 'Schweiz',
            startnummer_kunden: 1000,
            prefix_kunden: 'K-',
            startnummer_projekte: 1000,
            prefix_projekte: 'P-'
          }
          const { data: createdRow } = await supabase.from('einstellungen').insert([initialRow]).select().single()
          if (createdRow) {
            setSettings(prev => ({ ...prev, ...local, ...createdRow }))
          }
        }
      } catch (err) {
        console.error('Fehler beim Initialisieren der Einstellungen:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
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
      showToast('success', 'Einladung erfolgreich erstellt.')
      loadTeamMembers()
    } catch (err) {
      showToast('error', 'Fehler beim Einladen: ' + err.message)
    }
  }

  const handleDeleteInvite = (token) => {
    setConfirmModal({
      title: 'Einladung zurückziehen',
      message: 'Möchtest du diese Einladung wirklich zurückziehen?',
      confirmText: 'Zurückziehen',
      danger: true,
      onConfirm: async () => {
        try {
          await supabase.rpc('delete_invitation', { p_token: token })
          showToast('success', 'Einladung wurde zurückgezogen.')
          loadTeamMembers()
        } catch (err) {
          showToast('error', 'Fehler beim Löschen: ' + err.message)
        }
      }
    })
  }

  const startEdit = (blockName) => {
    setDraft({ ...settings })
    setEditState(blockName)
  }

  const cancelEdit = () => {
    setDraft({})
    setEditState(null)
  }

  const handleDraftChange = (field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSettings(draft)
    try {
      localStorage.setItem('atelier77_einstellungen_v2', JSON.stringify(draft))
    } catch (e) {}
    
    try {
      if (!dbError && supabase) {
        const KNOWN_DB_COLUMNS = new Set([
          'firmenname', 'strasse', 'plz_ort', 'uid', 'telefon', 'email', 'website',
          'bankverbindung', 'standard_mwst', 'standard_rabatt', 'gueltigkeit_offerten_tage',
          'zahlungsfrist_tage', 'startnummer_offerten', 'startnummer_rechnungen', 'text_vorlagen',
          'archiv_kunden_kategorien', 'archiv_projekt_kategorien', 'archiv_max_size_mb',
          'archiv_allowed_types', 'tenant_id', 'primary_color', 'logo_url', 'qr_iban',
          'hr_nummer', 'gerichtsstand', 'pdf_kopfzeile', 'pdf_fusszeile', 'pdf_absenderzeile',
          'plz', 'ort', 'land', 'startnummer_kunden', 'prefix_kunden', 'startnummer_projekte', 'prefix_projekte'
        ])

        const payload = {}
        for (const [key, val] of Object.entries(draft)) {
          if (KNOWN_DB_COLUMNS.has(key)) {
            payload[key] = val
          }
        }
        if (tenantId) {
          payload.tenant_id = tenantId
        }
        
        let saveErr;
        if (draft.id) {
          const { error } = await supabase.from('einstellungen').update(payload).eq('id', draft.id)
          saveErr = error
        } else if (tenantId) {
          const { data, error } = await supabase
            .from('einstellungen')
            .upsert([payload], { onConflict: 'tenant_id' })
            .select()
            .single()
          saveErr = error
          if (!error && data) {
            setSettings(prev => ({ ...draft, ...data }))
            setDraft(prev => ({ ...draft, ...data }))
          }
        }

        if (saveErr) {
          if (saveErr.code === '42703' || saveErr.code === 'PGRST204') {
            console.warn('Einige Spalten fehlen noch in Supabase. Lokaler Fallback aktiv:', saveErr.message)
          } else {
            throw saveErr
          }
        }
      }
      setEditState(null)
      showToast('success', 'Einstellungen erfolgreich gespeichert.')
      if (refreshGlobalSettings) {
        refreshGlobalSettings()
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
      showToast('error', `Fehler beim Speichern: ${error?.message || 'Unbekannter Fehler'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const saveTemplateListToDb = async (newList) => {
    const updatedSettings = { ...settings, text_vorlagen: newList }
    setSettings(updatedSettings)
    try {
      if (settings.id) {
        await supabase.from('einstellungen').update({ text_vorlagen: newList }).eq('id', settings.id)
      } else if (tenantId) {
        await supabase.from('einstellungen').upsert({ tenant_id: tenantId, text_vorlagen: newList }, { onConflict: 'tenant_id' })
      }
      localStorage.setItem('atelier77_einstellungen_v2', JSON.stringify(updatedSettings))
    } catch (err) {
      console.error('Template save error:', err)
    }
  }

  const handleRestoreDefaults = () => {
    setConfirmModal({
      title: 'Standard-Vorlagen wiederherstellen',
      message: 'Möchtest du alle Vorlagen auf die Standard-Texte zurücksetzen? Eigene Änderungen gehen verloren.',
      confirmText: 'Zurücksetzen',
      danger: true,
      onConfirm: () => {
        saveTemplateListToDb(DEFAULT_TEXT_VORLAGEN)
        showToast('success', 'Standard-Vorlagen wurden geladen.')
      }
    })
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
    setConfirmModal({
      title: 'Vorlage löschen',
      message: 'Möchtest du diese Vorlage wirklich löschen?',
      confirmText: 'Löschen',
      danger: true,
      onConfirm: () => {
        const newList = (settings.text_vorlagen || []).filter(t => t.id !== id)
        saveTemplateListToDb(newList)
        showToast('success', 'Vorlage gelöscht.')
      }
    })
  }

  const handleSaveTemplateForm = () => {
    if (!templateForm.label || !templateForm.text) {
      showToast('error', 'Bitte fülle Titel und Text aus.')
      return
    }
    
    let newList = [...(settings.text_vorlagen || [])]
    if (editingTemplate === 'new') {
      newList.push({ ...templateForm, id: Date.now().toString() })
    } else {
      newList = newList.map(t => t.id === editingTemplate ? { ...templateForm, id: editingTemplate } : t)
    }
    
    saveTemplateListToDb(newList)
    showToast('success', 'Vorlage erfolgreich gespeichert.')
    setEditingTemplate(null)
  }

  // Navigation Items (Extro.swiss style)
  const navGroups = [
    {
      title: 'Persönlich',
      items: [
        { id: 'profil', label: 'Mein Profil', icon: IconUser, description: 'Name, Passwort, Sprache' }
      ]
    },
    {
      title: 'Unternehmen & Finanzen',
      items: [
        { id: 'unternehmen', label: 'Firma & Adresse', icon: IconBuilding, description: 'Stammdaten, PLZ/Ort, Logo, Design' },
        { id: 'finanzen', label: 'Finanzen & Fristen', icon: IconCreditCard, description: 'Bank, QR-IBAN, MWST, Zahlungsziele' },
        { id: 'nummernkreise', label: 'Nummernkreise', icon: IconTag, description: 'Offerten, Rechnungen, Kunden, Projekte' }
      ]
    },
    {
      title: 'Konfiguration & Dokumente',
      items: [
        { id: 'vorlagen', label: 'Vorlagen & Texte', icon: IconNotes, description: 'Einleitungs- und Schlusstexte' },
        { id: 'team', label: 'Team & Benutzer', icon: IconTeam, description: 'Mitarbeiter einladen & verwalten' },
        { id: 'rollen', label: 'Rollen & Rechte', icon: IconShield, description: 'Übersicht Berechtigungsmatrix' }
      ]
    },
    {
      title: 'Abonnement',
      items: [
        { id: 'lizenz', label: 'Lizenzverwaltung', icon: IconFlash, description: 'Tarife, Status & Stripe Self-Service' }
      ]
    }
  ]

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6 w-full animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-96 bg-surface-card rounded-2xl border border-border w-full"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1600px] pb-16">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Einstellungen</h2>
        <p className="text-text-secondary mt-1">
          Verwalte Unternehmensdaten, Schweizer QR-Rechnungen, Nummernkreise, Vorlagen und Teamzugriffe.
        </p>
      </div>

      {/* Mobile Nav Selector (Dropdown) */}
      <div className="md:hidden">
        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1.5">
          Bereich auswählen
        </label>
        <select
          value={activeNav}
          onChange={e => setActiveNav(e.target.value)}
          className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-base font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        >
          {navGroups.flatMap(g => g.items).map(item => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {/* Extro-Style Two Column Layout (Sidebar + Main Content) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left Settings Sidebar (Desktop) */}
        <div className="hidden md:block md:col-span-4 lg:col-span-3">
          <div className="sticky top-20 space-y-6">
          <div className="bg-surface-card rounded-2xl border border-border p-3 shadow-xs space-y-5">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <div className="px-3 text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                  {group.title}
                </div>
                {group.items.map(item => {
                  const isActive = activeNav === item.id
                  const ItemIcon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveNav(item.id)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-3 cursor-pointer ${
                        isActive
                          ? 'bg-primary-600 text-white font-bold shadow-md shadow-primary-600/20'
                          : 'text-text-primary hover:bg-surface hover:text-primary-700'
                      }`}
                    >
                      <ItemIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-primary-600'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{item.label}</div>
                      </div>
                      {isActive && <span className="text-white text-xs">›</span>}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

            {/* Quick Info Box */}
            <div className="p-4 bg-surface rounded-2xl border border-border text-xs text-text-secondary space-y-1.5">
              <div className="font-bold text-text-primary flex items-center gap-1.5">
                <IconSwissFlag className="w-4 h-4" />
                <span>Kinetic Craft KMU Edition</span>
              </div>
              <p>Konfiguriert für Schweizer KMU & Handwerksbetriebe. QR-Rechnungen nach ISO 20022 Standard.</p>
            </div>
          </div>
        </div>

        {/* Right Settings Content Area */}
        <div className="md:col-span-8 lg:col-span-9 animate-fade-in">
          
          {/* =========================================
              BEREICH: MEIN PROFIL
          ========================================= */}
          {activeNav === 'profil' && (
            <MeinProfil
              userRole={userRole}
              userName={userName}
              onUserNameChange={(newName) => {
                setUserName(newName)
                if (parentOnUserNameChange) parentOnUserNameChange(newName)
              }}
            />
          )}

          {/* =========================================
              BEREICH: FIRMA & ADRESSE
          ========================================= */}
          {activeNav === 'unternehmen' && (
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
              BEREICH: FINANZEN & FRISTEN
          ========================================= */}
          {activeNav === 'finanzen' && (
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
          )}

          {/* =========================================
              BEREICH: NUMMERNKREISE
          ========================================= */}
          {activeNav === 'nummernkreise' && (
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
          )}

          {/* =========================================
              BEREICH: VORLAGEN (TEXTBAUSTEINE)
          ========================================= */}
          {activeNav === 'vorlagen' && (
            <div className="space-y-6">
              {userRole !== 'treuhand' && (
                <div className="flex justify-between items-center bg-surface-card p-4 rounded-2xl border border-border">
                  <div>
                    <h3 className="text-base font-bold text-text-primary">Text-Vorlagen</h3>
                    <p className="text-xs text-text-secondary">Wiederverwendbare Einleitungs- und Schlusstexte für Offerten und Rechnungen.</p>
                  </div>
                  <button 
                    onClick={handleRestoreDefaults}
                    className="text-xs text-text-secondary hover:text-primary-600 flex items-center gap-1.5 transition-colors cursor-pointer bg-white px-3.5 py-2 border border-border rounded-xl shadow-xs"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Standard-Vorlagen
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
              BEREICH: TEAM & BENUTZER
          ========================================= */}
          {activeNav === 'team' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-2 bg-surface-card p-6 rounded-2xl border border-border">
                <div>
                  <h3 className="text-lg font-bold text-text-primary">Teammitglieder & Zugriffe</h3>
                  <p className="text-sm text-text-secondary mt-1">Personen mit direktem Zugriff auf deinen Mandanten</p>
                </div>
                <button 
                  onClick={() => { setInviteForm({ email: '', role: 'team' }); setInviteLink(''); setShowInviteModal(true); }}
                  className="px-4 py-2.5 bg-primary-600 text-white font-semibold text-sm rounded-xl hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 shadow-md shadow-primary-600/20 cursor-pointer"
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
                                  <button onClick={() => handleDeleteInvite(invite.token)} className="text-red-500 hover:text-red-700 p-1 rounded cursor-pointer" title="Einladung zurückziehen">
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

          {/* =========================================
              BEREICH: ROLLEN & BERECHTIGUNGEN
          ========================================= */}
          {activeNav === 'rollen' && (
            <RollenUebersicht />
          )}

          {/* =========================================
              BEREICH: LIZENZVERWALTUNG
          ========================================= */}
          {activeNav === 'lizenz' && (
            <LizenzVerwaltung tenant={tenantInfo} settings={settings} />
          )}

        </div>
      </div>
      
      {/* TEMPLATE EDITOR MODAL */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border flex justify-between items-center bg-surface-card">
              <h3 className="text-xl font-bold text-text-primary">
                {editingTemplate === 'new' ? 'Neue Vorlage erstellen' : 'Vorlage bearbeiten'}
              </h3>
              <button onClick={() => setEditingTemplate(null)} className="p-2 text-text-secondary hover:text-text-primary rounded-lg transition-colors cursor-pointer" aria-label="Schliessen">
                <IconClose className="w-4 h-4" />
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
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
                />
              </div>
              
              <div>
                <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">Text-Inhalt</label>
                <textarea 
                  value={templateForm.text}
                  onChange={e => setTemplateForm({...templateForm, text: e.target.value})}
                  placeholder="Der Textbaustein..."
                  className="w-full h-40 px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400 resize-y"
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-border bg-surface-card flex justify-end gap-3">
              <button 
                onClick={() => setEditingTemplate(null)}
                className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary bg-surface border border-border rounded-xl cursor-pointer"
              >
                Abbrechen
              </button>
              <button 
                onClick={handleSaveTemplateForm}
                className="px-5 py-2 bg-primary-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-primary-700 cursor-pointer"
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
              <button onClick={() => setShowInviteModal(false)} className="text-text-secondary hover:text-text-primary p-2 cursor-pointer" aria-label="Schliessen">
                <IconClose className="w-5 h-5" />
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
                      className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                      placeholder="mitarbeiter@firma.ch"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-1.5">Rolle</label>
                    <select 
                      value={inviteForm.role}
                      onChange={e => setInviteForm({...inviteForm, role: e.target.value})}
                      className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                    >
                      <option value="team">Team (Standard-Zugriff)</option>
                      <option value="admin">Admin (Zugriff auf Einstellungen)</option>
                      <option value="treuhand">Treuhand (Nur Buchhaltung & Rechnungen)</option>
                    </select>
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setShowInviteModal(false)} className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200">Abbrechen</button>
                    <button type="submit" className="flex-1 py-2.5 px-4 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 shadow-md">Einladung erstellen</button>
                  </div>
                </form>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <IconCheck className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-text-primary">Einladungslink generiert!</h4>
                  <p className="text-sm text-text-secondary">Kopiere diesen Link und schicke ihn an das neue Teammitglied.</p>
                  
                  <div className="relative">
                    <input 
                      type="text" 
                      readOnly 
                      value={inviteLink}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-text-primary text-xs focus:outline-none pr-20"
                    />
                    <button 
                      onClick={() => { 
                        navigator.clipboard.writeText(inviteLink)
                        setCopiedLink(true)
                        setTimeout(() => setCopiedLink(false), 2500)
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-gray-200 text-text-secondary hover:text-primary-600 cursor-pointer flex items-center gap-1.5"
                    >
                      {copiedLink ? (
                        <>
                          <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Kopiert!</span>
                        </>
                      ) : (
                        'Kopieren'
                      )}
                    </button>
                  </div>

                  <button onClick={() => setShowInviteModal(false)} className="w-full mt-2 py-2.5 px-4 text-gray-500 font-semibold hover:text-gray-700">
                    Schliessen
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-scale-in">
            <h3 className={`text-lg font-bold mb-2 ${confirmModal.danger ? 'text-red-600' : 'text-primary-600'}`}>
              {confirmModal.title}
            </h3>
            <p className="text-sm text-gray-600 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = confirmModal.onConfirm
                  setConfirmModal(null)
                  if (action) action()
                }}
                className={`px-5 py-2 text-sm font-semibold text-white rounded-xl cursor-pointer ${
                  confirmModal.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {confirmModal.confirmText || 'Bestätigen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
            toast.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
            'bg-blue-50 text-blue-800 border-blue-200'
          }`}>
            <span className="shrink-0">
              {toast.type === 'success' ? (
                <IconCheck className="w-4 h-4 text-emerald-600" />
              ) : toast.type === 'error' ? (
                <IconWarning className="w-4 h-4 text-red-600" />
              ) : (
                <IconInfo className="w-4 h-4 text-blue-600" />
              )}
            </span>
            <span>{toast.text}</span>
            <button type="button" onClick={() => setToast(null)} className="ml-2 text-xs opacity-60 hover:opacity-100 cursor-pointer" aria-label="Schliessen">
              <IconClose className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
