import { useState, useEffect } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { supabase } from '../lib/supabase'

import { calculateRechnungStatus } from '../lib/statusLogic'
import { formatDate, formatCurrency } from '../lib/formatters'
import { getTenantStoragePath, extractStoragePath } from '../lib/storageHelper'

import KundeStammdaten from '../components/kunde/KundeStammdaten'
import KundeKontakt from '../components/kunde/KundeKontakt'
import KundeSettings from '../components/kunde/KundeSettings'

// ----------------------
// MAIN COMPONENT
// ----------------------

export default function KundeDetailView({ kunde: initialKunde, onBack, onNavigate, initialTab = 'stammdaten', userRole }) {
  const [parent] = useAutoAnimate()
  const [kunde, setKunde] = useState(initialKunde)
  const [projekte, setProjekte] = useState([])
  const [offerten, setOfferten] = useState([])
  const [rechnungen, setRechnungen] = useState([])
  const [dateien, setDateien] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [activeTab, setActiveTab] = useState(initialTab === 'rechnungen' ? 'finanzen' : initialTab) // stammdaten, projekte, offerten, finanzen
  const [showDeleteWarning, setShowDeleteWarning] = useState(false)
  const [showArchiveWarning, setShowArchiveWarning] = useState(false)
  const [renameModal, setRenameModal] = useState({ isOpen: false, fileId: null, currentFullName: '', fileName: '' })
  const [feedbackToast, setFeedbackToast] = useState(null)
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)

  const showToast = (type, text) => {
    setFeedbackToast({ type, text })
    setTimeout(() => setFeedbackToast(null), 3500)
  }

  // Edit State
  const [editState, setEditState] = useState(null) // null, 'stammdaten', 'kontakt', 'konditionen'
  const [draft, setDraft] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})

  useEffect(() => {
    async function loadDetails() {
      if (!supabase || !kunde?.id) return
      
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
          
        if (rData) {
          const today = new Date()
          const updatesByStatus = {}
          for (const r of rData) {
            const calculatedStatus = calculateRechnungStatus(r, today)
            if (calculatedStatus !== r.status) {
              r.status = calculatedStatus
              if (!updatesByStatus[calculatedStatus]) updatesByStatus[calculatedStatus] = []
              updatesByStatus[calculatedStatus].push(r.id)
            }
          }
          if (Object.keys(updatesByStatus).length > 0) {
            for (const [newStatus, ids] of Object.entries(updatesByStatus)) {
              await supabase.from('rechnungen').update({ status: newStatus }).in('id', ids)
            }
          }
          setRechnungen(rData)
        }

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
  }, [kunde?.id])

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
      const isValidEmail = !draft.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email);
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
      const dataToSave = { ...updatePayload }
      delete dataToSave.id
      delete dataToSave.created_at
      delete dataToSave.updated_at
      
      const { error } = await supabase
        .from('kunden')
        .update(dataToSave)
        .eq('id', kunde.id)
        
      if (error) throw error
      
      setKunde(updatePayload) // Update local state
      setEditState(null)
      showToast('success', 'Kundendaten erfolgreich gespeichert.')
    } catch (err) {
      console.error('Failed to save kunde:', err)
      showToast('error', 'Fehler beim Speichern der Kundendaten.')
    } finally {
      setIsSaving(false)
    }
  }

  const openRenameModal = (id, currentName) => {
    const baseName = currentName.substring(0, currentName.lastIndexOf('.')) || currentName
    setRenameModal({ isOpen: true, fileId: id, currentFullName: currentName, fileName: baseName })
  }

  const handleRenameSubmit = async (e) => {
    e.preventDefault()
    if (!renameModal.fileName.trim()) return

    const fileExt = renameModal.currentFullName.split('.').pop()
    const newName = `${renameModal.fileName.trim()}.${fileExt}`

    try {
      const { error } = await supabase.from('dateien').update({ name: newName }).eq('id', renameModal.fileId)
      if (error) throw error
      setDateien(prev => prev.map(d => d.id === renameModal.fileId ? { ...d, name: newName } : d))
      setRenameModal({ isOpen: false, fileId: null, currentFullName: '', fileName: '' })
      showToast('success', 'Datei erfolgreich umbenannt.')
    } catch (err) {
      console.error(err)
      showToast('error', 'Umbenennen fehlgeschlagen.')
    }
  }

  const handleDeleteFile = async (datei) => {
    if (!window.confirm(`Möchtest du die Datei "${datei.name}" wirklich unwiderruflich löschen?`)) return
    try {
      if (datei.url) {
        const storagePath = extractStoragePath(datei.url)
        if (storagePath) {
          try {
            await supabase.storage.from('anhange').remove([storagePath])
          } catch (stErr) {
            console.warn('Storage delete warning:', stErr)
          }
        }
      }
      const { error } = await supabase.from('dateien').delete().eq('id', datei.id)
      if (error) throw error
      setDateien(prev => prev.filter(d => d.id !== datei.id))
      showToast('success', `Datei "${datei.name}" gelöscht.`)
    } catch (err) {
      console.error('Delete error:', err)
      showToast('error', 'Löschen fehlgeschlagen.')
    }
  }

  const handleArchive = async () => {
    try {
      setIsSaving(true)
      const { error } = await supabase
        .from('kunden')
        .update({ is_archived: true })
        .eq('id', kunde.id)
        
      if (error) throw error
      setKunde(prev => ({ ...prev, is_archived: true }))
      setShowArchiveWarning(false)
      showToast('success', 'Kunde ins Archiv verschoben.')
    } catch (err) {
      console.error('Failed to archive kunde:', err)
      showToast('error', 'Fehler beim Archivieren des Kunden.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRestore = async () => {
    try {
      setIsSaving(true)
      const { error } = await supabase
        .from('kunden')
        .update({ is_archived: false })
        .eq('id', kunde.id)
        
      if (error) throw error
      setKunde(prev => ({ ...prev, is_archived: false }))
      showToast('success', 'Kunde aus dem Archiv wiederhergestellt.')
    } catch (err) {
      console.error('Failed to restore kunde:', err)
      showToast('error', 'Fehler beim Wiederherstellen des Kunden.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleHardDelete = async () => {
    if (projekte.length > 0 || offerten.length > 0 || rechnungen.length > 0 || dateien.length > 0) {
      showToast('error', 'Der Kunde kann nicht gelöscht werden, da noch Verknüpfungen (Projekte, Offerten, Rechnungen oder Dateien) bestehen. Bitte archiviere ihn stattdessen.')
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
      showToast('error', 'Fehler beim Löschen des Kunden.')
    } finally {
      setIsSaving(false)
      setShowDeleteWarning(false)
    }
  }

  const displayName = kunde.firmenname 
    ? `${kunde.firmenname} ${kunde.vorname || ''} ${kunde.nachname || ''}`.trim()
    : `${kunde.vorname || ''} ${kunde.nachname || ''}`.trim() || kunde.name;

  // --- FINANZEN DATA PREPARATION ---
  const offenePosten = rechnungen.filter(r => r.status === 'Versendet' || r.status === 'Teilbezahlt' || r.status === 'Überfällig' || r.status === 'Gemahnt')
  const archivRechnungen = rechnungen.filter(r => r.status === 'Bezahlt' || r.status === 'Storniert' || r.status === 'Entwurf')
  
  let jahresumsatz = 0
  let offenTotal = 0
  const currentYear = new Date().getFullYear()
  
  const alleZahlungen = []
  
  rechnungen.forEach(r => {
    // Offene Posten Total
    if (r.status === 'Versendet' || r.status === 'Teilbezahlt' || r.status === 'Überfällig' || r.status === 'Gemahnt') {
      offenTotal += Math.max(0, (r.total || 0) - (r.bezahlt || 0))
    }
    
    // Zahlungen extrahieren und Umsatz berechnen
    if (r.bezahlt > 0) {
      const zahlungen = r.daten?.zahlungen || []
      if (zahlungen.length > 0) {
        zahlungen.forEach(z => {
          alleZahlungen.push({ ...z, rechnung_nr: r.rechnung_nr || `Rechnung #${r.id}`, rechnung_id: r.id })
          if (new Date(z.datum).getFullYear() === currentYear && z.typ !== 'Ausbuchung') {
            jahresumsatz += z.betrag
          }
        })
      } else if (r.status === 'Bezahlt' || r.status === 'Teilbezahlt') {
        const dateStr = r.bezahlt_am || r.faellig_am || r.created_at
        if (new Date(dateStr).getFullYear() === currentYear) {
          jahresumsatz += r.bezahlt || r.total || 0
        }
        alleZahlungen.push({
          id: r.id + '_fallback',
          datum: dateStr,
          betrag: r.bezahlt || r.total || 0,
          notiz: 'Historie nicht detailliert',
          rechnung_nr: r.rechnung_nr || `Rechnung #${r.id}`,
          rechnung_id: r.id
        })
      }
    }
  })
  
  alleZahlungen.sort((a, b) => new Date(b.datum) - new Date(a.datum))

  return (
    <div className="space-y-6 max-w-[1600px] pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 sm:p-2 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 rounded-xl bg-surface-card shadow-sm border border-border hover:bg-neutral-50 transition-all text-text-secondary hover:text-text-primary cursor-pointer flex items-center justify-center"
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
              <span className="font-mono font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200 text-xs">
                {kunde.kundennummer || `K-${kunde.id}`}
              </span>
              {kunde.anrede && <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">{kunde.anrede}</span>}
              {kunde.ort && <span>• 📍 {kunde.ort}</span>}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar shrink-0">
          {userRole !== 'treuhand' && (
            <>
              <button
                onClick={() => onNavigate && onNavigate('projekte', { action: 'create', kundeId: kunde.id })}
                className="px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-[auto] text-base sm:text-xs font-medium bg-surface-card hover:bg-neutral-50 text-text-primary rounded-xl sm:rounded-lg border border-border shadow-sm transition-colors cursor-pointer whitespace-nowrap active:scale-[0.98]"
              >
                + Projekt
              </button>
              <button
                onClick={() => onNavigate && onNavigate('offerten', { action: 'create', kundeId: kunde.id })}
                className="px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-[auto] text-base sm:text-xs font-medium bg-surface-card hover:bg-neutral-50 text-text-primary rounded-xl sm:rounded-lg border border-border shadow-sm transition-colors cursor-pointer whitespace-nowrap active:scale-[0.98]"
              >
                + Offerte
              </button>
              <button
                onClick={() => onNavigate && onNavigate('rechnungen', { action: 'create', kundeId: kunde.id })}
                className="px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-[auto] text-base sm:text-xs font-medium bg-surface-card hover:bg-neutral-50 text-text-primary rounded-xl sm:rounded-lg border border-border shadow-sm transition-colors cursor-pointer whitespace-nowrap active:scale-[0.98]"
              >
                + Rechnung
              </button>
              <button
                onClick={() => setActiveTab('dateien')}
                className="px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-[auto] text-base sm:text-xs font-medium bg-surface-card hover:bg-neutral-50 text-text-primary rounded-xl sm:rounded-lg border border-border shadow-sm transition-colors cursor-pointer whitespace-nowrap active:scale-[0.98]"
              >
                + Datei
              </button>
            </>
          )}
          
          <div className="relative">
            {userRole !== 'treuhand' && (
              <button 
                onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                className="p-3 min-w-[48px] min-h-[48px] sm:min-w-[auto] sm:min-h-[auto] sm:p-2 flex items-center justify-center rounded-xl sm:rounded-lg text-text-secondary hover:text-text-primary hover:bg-black/5 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
              </button>
            )}
            {isHeaderMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsHeaderMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">
                  <div className="p-1">
                    {kunde.is_archived ? (
                      <button 
                        onClick={() => { setIsHeaderMenuOpen(false); handleRestore(); }}
                        className="w-full text-left px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer mb-1 font-medium"
                      >
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Aus Archiv wiederherstellen
                      </button>
                    ) : (
                      <button 
                        onClick={() => { setIsHeaderMenuOpen(false); setShowArchiveWarning(true); }}
                        className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-neutral-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer mb-1"
                      >
                        <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                        Kunde archivieren
                      </button>
                    )}
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

      {/* Archived Banner */}
      {kunde.is_archived && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl shrink-0">
              📁
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">Dieser Kunde ist archiviert.</p>
              <p className="text-xs text-amber-700 mt-0.5">Der Kunde wird in der Standard-Kundenliste ausgeblendet.</p>
            </div>
          </div>
          <button
            onClick={handleRestore}
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Aus Archiv wiederherstellen
          </button>
        </div>
      )}

      {/* Tabs - Pill Design to match Einstellungen */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
        {['stammdaten', 'projekte', 'offerten', 'finanzen', 'dateien']
          .filter(tab => !(userRole === 'treuhand' && (tab === 'projekte' || tab === 'offerten')))
          .map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setEditState(null); }}
            className={`flex items-center gap-2 px-5 py-3 sm:py-2.5 min-h-[48px] sm:min-h-0 text-base sm:text-sm font-semibold rounded-xl transition-all capitalize whitespace-nowrap cursor-pointer ${
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
              <KundeStammdaten
                kunde={kunde}
                draft={draft}
                isEditing={editState === 'stammdaten'}
                isSaving={isSaving}
                validationErrors={validationErrors}
                onEdit={() => startEdit('stammdaten')}
                onCancel={cancelEdit}
                onSave={handleSaveBlock}
                onChange={handleDraftChange}
                disabled={userRole === 'treuhand'}
              />
              
              <KundeKontakt
                kunde={kunde}
                draft={draft}
                isEditing={editState === 'kontakt'}
                isSaving={isSaving}
                validationErrors={validationErrors}
                onEdit={() => startEdit('kontakt')}
                onCancel={cancelEdit}
                onSave={handleSaveBlock}
                onChange={handleDraftChange}
                onAddressDetails={(details) => setDraft(prev => ({...prev, strasse: details.strasse, plz: details.plz, ort: details.ort}))}
                disabled={userRole === 'treuhand'}
              />
              
              <KundeSettings
                kunde={kunde}
                draft={draft}
                isEditing={editState === 'konditionen'}
                isSaving={isSaving}
                onEdit={() => startEdit('konditionen')}
                onCancel={cancelEdit}
                onSave={handleSaveBlock}
                onChange={handleDraftChange}
                disabled={userRole === 'treuhand'}
              />
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
                    className="mt-2 w-full sm:w-auto min-h-[48px] px-5 py-3 sm:py-2.5 bg-primary-600 text-white rounded-xl text-base sm:text-sm font-bold shadow-md shadow-primary-600/20 hover:bg-primary-700 active:scale-95 transition-all cursor-pointer"
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
                    className="mt-2 w-full sm:w-auto min-h-[48px] px-5 py-3 sm:py-2.5 bg-primary-600 text-white rounded-xl text-base sm:text-sm font-bold shadow-md shadow-primary-600/20 hover:bg-primary-700 active:scale-95 transition-all cursor-pointer"
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

          {/* TAB: FINANZEN */}
          {activeTab === 'finanzen' && (
            <div className="animate-fade-in-up space-y-8">
              
              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm">
                  <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Jahresumsatz ({currentYear})</div>
                  <div className="text-2xl font-bold text-emerald-600">{formatCurrency(jahresumsatz)}</div>
                </div>
                <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm">
                  <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Offene Posten</div>
                  <div className="text-2xl font-bold text-red-500">{formatCurrency(offenTotal)}</div>
                </div>
                <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm">
                  <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Rechnungen (Total)</div>
                  <div className="text-2xl font-bold text-text-primary">{rechnungen.length}</div>
                </div>
              </div>

              {/* Offene Posten */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    <span>⚠️</span> Offene Posten
                  </h3>
                  {userRole !== 'treuhand' && (
                    <button 
                      onClick={() => onNavigate && onNavigate('rechnungen', { action: 'create', kundeId: kunde.id })}
                      className="w-full sm:w-auto min-h-[48px] px-4 py-3 sm:py-2 bg-primary-600 text-white rounded-xl text-base sm:text-sm font-bold hover:bg-primary-700 transition-colors cursor-pointer"
                    >
                      + Neue Rechnung
                    </button>
                  )}
                </div>
                
                {offenePosten.length === 0 ? (
                  <div className="bg-surface-card rounded-xl border border-dashed border-border p-8 text-center text-text-secondary">
                    Keine offenen Forderungen. Alles bezahlt! 🎉
                  </div>
                ) : (
                  <div className="bg-surface-card rounded-xl border border-border overflow-hidden shadow-sm">
                    {offenePosten.map(re => {
                      const projekt = projekte.find(p => p.id === re.projekt_id)
                      const offenerBetrag = Math.max(0, (re.total || 0) - (re.bezahlt || 0))
                      return (
                        <div 
                          key={re.id} 
                          onClick={() => onNavigate && onNavigate('rechnungen', { rechnungId: re.id })}
                          className={`grid grid-cols-1 sm:grid-cols-[1fr_120px_100px] gap-2 sm:gap-4 p-4 border-l-4 border-y border-r border-border mb-2 last:mb-0 rounded-xl bg-surface hover:shadow-md transition-all items-center cursor-pointer group ${
                            re.status === 'Überfällig' || re.status === 'Gemahnt' ? 'border-l-red-500 hover:bg-red-50/40' :
                            re.status === 'Teilbezahlt' ? 'border-l-amber-500 hover:bg-amber-50/40' :
                            'border-l-primary-500 hover:bg-primary-50/40'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform hidden sm:flex">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div className="font-bold text-text-primary flex flex-col gap-0.5">
                              <span className="flex items-center gap-2">
                                {re.rechnung_nr || `Rechnung #${re.id}`}
                              </span>
                              <span className="text-xs text-text-secondary font-normal">{projekt ? projekt.name : 'Kein Projekt'}</span>
                            </div>
                          </div>
                          <div className="sm:text-right flex flex-col">
                            <span className="font-bold text-red-500 text-sm">{formatCurrency(offenerBetrag)}</span>
                            {re.status === 'Teilbezahlt' && (
                              <span className="text-[10px] text-text-secondary uppercase tracking-wider">von {formatCurrency(re.total)}</span>
                            )}
                          </div>
                          <div className="sm:text-right">
                            <span className={`inline-block px-2 py-1 rounded-lg text-[11px] font-bold ${
                              re.status === 'Überfällig' || re.status === 'Gemahnt' ? 'bg-red-100 text-red-700' :
                              re.status === 'Teilbezahlt' ? 'bg-amber-100 text-amber-700' :
                              'bg-primary-100 text-primary-700'
                            }`}>
                              {re.status}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Zahlungshistorie */}
              {alleZahlungen.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    <span>💳</span> Zahlungshistorie
                  </h3>
                  <div className="bg-surface-card rounded-xl border border-border shadow-sm p-4 space-y-2">
                    {alleZahlungen.map(z => (
                      <div key={z.id} onClick={() => onNavigate && onNavigate('rechnungen', { rechnungId: z.rechnung_id })} className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border hover:bg-emerald-50/50 hover:border-emerald-200 transition-colors cursor-pointer">
                        <div>
                          <div className="text-sm font-bold text-text-primary">{formatDate(z.datum)}</div>
                          <div className="text-xs text-text-secondary">
                            {z.typ === 'Ausbuchung' ? 'Ausbuchung (Skonto/Verlust) für' : 'Eingang für'} {z.rechnung_nr}
                            {z.notiz && ` • ${z.notiz}`}
                          </div>
                        </div>
                        <div className={`font-bold ${z.typ === 'Ausbuchung' ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {z.typ === 'Ausbuchung' ? '- ' : ''}CHF {formatCurrency(z.betrag)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Archiv / Alle Rechnungen */}
              {archivRechnungen.length > 0 && (
                <div className="space-y-3 pt-6 border-t border-border">
                  <h3 className="text-lg font-bold text-text-secondary flex items-center gap-2">
                    <span>📁</span> Abgewickelte Rechnungen (Archiv)
                  </h3>
                  <div className="bg-surface rounded-xl border border-border overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
                    {archivRechnungen.map(re => {
                      const projekt = projekte.find(p => p.id === re.projekt_id)
                      return (
                        <div 
                          key={re.id} 
                          onClick={() => onNavigate && onNavigate('rechnungen', { rechnungId: re.id })}
                          className="grid grid-cols-1 sm:grid-cols-[1fr_120px_100px] gap-2 sm:gap-4 p-3 border-b last:border-b-0 border-border bg-white hover:bg-gray-50 transition-colors items-center cursor-pointer"
                        >
                          <div>
                            <div className="font-semibold text-text-primary text-sm">{re.rechnung_nr || `Rechnung #${re.id}`}</div>
                            <div className="text-xs text-text-secondary">{projekt ? projekt.name : 'Kein Projekt'}</div>
                          </div>
                          <div className="sm:text-right font-semibold text-text-primary text-sm">
                            {formatCurrency(re.total || 0)}
                          </div>
                          <div className="sm:text-right">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              re.status === 'Bezahlt' ? 'bg-emerald-50 text-emerald-600' :
                              re.status === 'Storniert' ? 'bg-gray-100 text-gray-500 line-through' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {re.status || 'Entwurf'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB: DATEIEN (Archiv) */}
          {activeTab === 'dateien' && (
            <div className="animate-fade-in-up space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-text-primary">Kunden-Archiv</h3>
                {userRole !== 'treuhand' && (
                  <label className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 min-h-[48px] w-full sm:w-auto bg-primary-600 text-white text-base sm:text-sm font-semibold rounded-xl hover:bg-primary-700 cursor-pointer transition-colors shadow-sm">
                    <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Datei hochladen
                    <input type="file" className="hidden" onChange={async (e) => {
                      const file = e.target.files[0]
                      if (!file) return

                      const fileExt = file.name.split('.').pop()
                      const finalName = file.name

                      try {
                        setIsLoading(true)
                        const filePath = getTenantStoragePath(kunde.tenant_id, finalName, 'kunden')
                        
                        const { error: uploadError } = await supabase.storage.from('anhange').upload(filePath, file)
                        if (uploadError) throw uploadError
                        
                        const { data: { publicUrl } } = supabase.storage.from('anhange').getPublicUrl(filePath)
                        
                        const isImg = file.type?.startsWith('image/')
                        const standardKat = isImg ? 'Fotos & Pläne' : 'Allgemeine Dokumente'

                        const { data, error: dbError } = await supabase.from('dateien').insert([{
                          name: finalName, typ: file.type || fileExt, url: publicUrl, size_bytes: file.size, kunde_id: kunde.id, kategorie: standardKat
                        }]).select()
                        
                        if (dbError) throw dbError
                        if (data) setDateien([data[0], ...dateien])
                        showToast('success', 'Datei erfolgreich hochgeladen.')
                      } catch(err) {
                        console.error(err)
                        showToast('error', 'Fehler beim Upload der Datei.')
                      } finally {
                        setIsLoading(false)
                        e.target.value = null
                      }
                    }} />
                  </label>
                )}
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
                        <a href={datei.url} target="_blank" rel="noopener noreferrer" className="p-3 sm:p-1.5 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 bg-white shadow-sm rounded-lg text-gray-500 hover:text-primary-600 transition-colors flex items-center justify-center" title="Ansehen">
                          <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </a>
                        {userRole !== 'treuhand' && (
                          <>
                            <button onClick={() => openRenameModal(datei.id, datei.name)} className="p-3 sm:p-1.5 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 bg-white shadow-sm rounded-lg text-gray-500 hover:text-amber-500 transition-colors flex items-center justify-center" title="Umbenennen">
                              <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button onClick={() => handleDeleteFile(datei)} className="p-3 sm:p-1.5 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 bg-white shadow-sm rounded-lg text-gray-500 hover:text-red-500 transition-colors flex items-center justify-center" title="Löschen">
                              <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </>
                        )}
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

      {/* Archive Confirmation Modal */}
      {showArchiveWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface-card rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border animate-scale-up">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl mb-4">
              📁
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Kunde archivieren?</h3>
            <p className="text-text-secondary text-sm mb-6 leading-relaxed">
              Der Kunde wird aus der regulären Übersicht ausgeblendet. Verknüpfte Rechnungen und Projekte bleiben sicher erhalten und der Kunde kann jederzeit wiederhergestellt werden.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={() => setShowArchiveWarning(false)}
                className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={handleArchive}
                disabled={isSaving}
                className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-5 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {isSaving ? 'Archiviert...' : 'Ja, archivieren'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Rename Modal */}
      {renameModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface-card rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border animate-scale-up">
            <h3 className="text-xl font-bold text-text-primary mb-2">Datei umbenennen</h3>
            <p className="text-text-secondary text-xs mb-4">Gib einen neuen Namen ohne Dateiendung ein.</p>
            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <input
                type="text"
                value={renameModal.fileName}
                onChange={e => setRenameModal(prev => ({ ...prev, fileName: e.target.value }))}
                className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                placeholder="Neuer Name..."
                autoFocus
              />
              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setRenameModal({ isOpen: false, fileId: null, currentFullName: '', fileName: '' })}
                  className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors cursor-pointer shadow-sm"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface-card rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border animate-scale-up">
            <h3 className="text-xl font-bold text-text-primary mb-2">Kunde löschen?</h3>
            <p className="text-text-secondary text-sm mb-6">
              Bist du sicher, dass du diesen Kunden endgültig löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={() => setShowDeleteWarning(false)}
                className="w-full sm:w-auto min-h-[48px] px-4 py-3 sm:py-2 text-base sm:text-sm font-medium text-text-secondary hover:text-text-primary bg-gray-100 hover:bg-gray-200 sm:bg-transparent sm:hover:bg-transparent rounded-xl transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={handleHardDelete}
                className="w-full sm:w-auto min-h-[48px] px-4 py-3 sm:py-2 bg-red-600 text-white text-base sm:text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                disabled={isSaving}
              >
                {isSaving ? 'Löscht...' : 'Ja, endgültig löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {feedbackToast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 animate-fade-in ${
          feedbackToast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          <span>{feedbackToast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{feedbackToast.text}</span>
        </div>
      )}
    </div>
  )
}
