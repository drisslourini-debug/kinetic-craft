import { useState, useEffect } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { supabase } from '../lib/supabase'
import { formatDate, formatCurrency } from '../lib/formatters'

import { ProjektStammdatenBlock, ProjektTermineBlock, ProjektNotizenBlock } from '../components/projekt/ProjektStammdaten'
import { getTerminTypConfig, getTerminStatusConfig } from '../lib/kalenderConstants'
import TerminModal from '../components/kalender/TerminModal'
import TerminDetailModal from '../components/kalender/TerminDetailModal'

// ----------------------
// MAIN COMPONENT
// ----------------------

export default function ProjektDetailView({ projekt: initialProjekt, onBack, onNavigate, userRole, initialTab }) {
  const [parent] = useAutoAnimate()
  const [projekt, setProjekt] = useState(initialProjekt)
  const [offerten, setOfferten] = useState([])
  const [rechnungen, setRechnungen] = useState([])
  const [ausgaben, setAusgaben] = useState([])
  const [dateien, setDateien] = useState([])
  const [termine, setTermine] = useState([])
  const [kunde, setKunde] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(initialTab || 'projektdaten')
  const [isTerminModalOpen, setIsTerminModalOpen] = useState(false)
  const [terminModalInitial, setTerminModalInitial] = useState(null)
  const [selectedTerminForDetail, setSelectedTerminForDetail] = useState(null)
  const [showDeleteWarning, setShowDeleteWarning] = useState(false)
  const [showArchiveWarning, setShowArchiveWarning] = useState(false)
  const [renameModal, setRenameModal] = useState({ isOpen: false, fileId: null, currentFullName: '', fileName: '' })
  const [feedbackToast, setFeedbackToast] = useState(null)
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)

  const showToast = (type, text) => {
    setFeedbackToast({ type, text })
    setTimeout(() => setFeedbackToast(null), 3500)
  }

  const [editState, setEditState] = useState(null) // null, 'stammdaten', 'termine', 'notizen'
  const [draft, setDraft] = useState({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function loadDetails() {
      if (!supabase || !projekt?.id) return
      
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

        // Load expenses
        const { data: aData } = await supabase
          .from('ausgaben')
          .select('*')
          .eq('projekt_id', projekt.id)
          .order('beleg_datum', { ascending: false })
          
        if (aData) setAusgaben(aData)

        // Load files
        const { data: dData } = await supabase
          .from('dateien')
          .select('*')
          .eq('projekt_id', projekt.id)
          .order('created_at', { ascending: false })
          
        if (dData) setDateien(dData)

        // Load appointments (termine)
        try {
          const { data: tData } = await supabase
            .from('termine')
            .select('*, kunden(name)')
            .eq('projekt_id', projekt.id)
            .order('datum', { ascending: true })

          if (tData) setTermine(tData)
        } catch (tErr) {
          console.warn('Error loading project termine:', tErr)
        }
      } catch (err) {
        console.error('Error loading projekt details:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadDetails()
  }, [projekt?.id, projekt?.kunden_id])

  const refreshProjektTermine = async () => {
    if (!supabase || !projekt?.id) return
    try {
      const { data: tData } = await supabase
        .from('termine')
        .select('*, kunden(name)')
        .eq('projekt_id', projekt.id)
        .order('datum', { ascending: true })
      if (tData) setTermine(tData)
    } catch (e) {
      console.error('Failed to reload termine:', e)
    }
  }

  const handleSaveTermin = async (formData, terminId) => {
    if (!supabase || !projekt?.id) return
    try {
      if (terminId) {
        const { error } = await supabase
          .from('termine')
          .update(formData)
          .eq('id', terminId)
        if (error) throw error
        showToast('success', 'Termin aktualisiert.')
      } else {
        const { error } = await supabase
          .from('termine')
          .insert([{ ...formData, projekt_id: projekt.id }])
        if (error) throw error
        showToast('success', 'Termin hinzugefügt.')
      }
      await refreshProjektTermine()
    } catch (err) {
      console.error('Error saving project termin:', err)
      showToast('error', err.message || 'Fehler beim Speichern des Termins.')
    }
  }

  const handleDeleteTermin = async (terminId) => {
    if (!supabase || !terminId) return
    try {
      const { error } = await supabase
        .from('termine')
        .delete()
        .eq('id', terminId)
      if (error) throw error
      showToast('info', 'Termin gelöscht.')
      setSelectedTerminForDetail(null)
      await refreshProjektTermine()
    } catch (err) {
      console.error('Error deleting termin:', err)
      showToast('error', 'Fehler beim Löschen.')
    }
  }

  const handleStatusChangeTermin = async (terminId, newStatus) => {
    if (!supabase || !terminId) return
    try {
      const { error } = await supabase
        .from('termine')
        .update({ status: newStatus })
        .eq('id', terminId)
      if (error) throw error
      showToast('success', `Status auf "${newStatus}" gesetzt.`)
      setTermine(prev => prev.map(t => t.id === terminId ? { ...t, status: newStatus } : t))
      if (selectedTerminForDetail?.id === terminId) {
        setSelectedTerminForDetail(prev => ({ ...prev, status: newStatus }))
      }
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

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
      const { error } = await supabase
        .from('projekte')
        .update(dataToSave)
        .eq('id', projekt.id)
        
      if (error) throw error
      setProjekt(draft)
      setEditState(null)
      showToast('success', 'Projektdaten erfolgreich gespeichert.')
    } catch (err) {
      console.error('Failed to update projekt:', err)
      showToast('error', 'Fehler beim Speichern der Projektdaten.')
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

  const handleArchive = async () => {
    try {
      setIsSaving(true)
      const { error } = await supabase
        .from('projekte')
        .update({ is_archived: true })
        .eq('id', projekt.id)
        
      if (error) throw error
      setProjekt(prev => ({ ...prev, is_archived: true }))
      setShowArchiveWarning(false)
      showToast('success', 'Projekt ins Archiv verschoben.')
    } catch (err) {
      console.error('Failed to archive projekt:', err)
      showToast('error', 'Fehler beim Archivieren des Projekts.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRestore = async () => {
    try {
      setIsSaving(true)
      const { error } = await supabase
        .from('projekte')
        .update({ is_archived: false })
        .eq('id', projekt.id)
        
      if (error) throw error
      setProjekt(prev => ({ ...prev, is_archived: false }))
      showToast('success', 'Projekt aus dem Archiv wiederhergestellt.')
    } catch (err) {
      console.error('Failed to restore projekt:', err)
      showToast('error', 'Fehler beim Wiederherstellen des Projekts.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleHardDelete = async () => {
    if (offerten.length > 0 || rechnungen.length > 0 || ausgaben.length > 0 || dateien.length > 0) {
      showToast('error', 'Das Projekt kann nicht gelöscht werden, da noch Verknüpfungen (Offerten, Rechnungen, Ausgaben oder Dateien) bestehen. Bitte archiviere es stattdessen.')
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
      onBack()
    } catch (err) {
      console.error('Failed to delete projekt:', err)
      showToast('error', 'Fehler beim Löschen des Projekts.')
    } finally {
      setIsSaving(false)
      setShowDeleteWarning(false)
    }
  }

  if (!projekt) return null


  return (
    <div className="space-y-6 max-w-[1600px] pb-16">
      {/* Header mit Zurück-Button & Quick Actions */}
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
              <h2 className="text-2xl md:text-3xl font-bold text-text-primary">{projekt.name}</h2>
            </div>
            <p className="text-text-secondary mt-1 flex items-center gap-2">
              <span>{projekt.adresse ? `📍 ${projekt.adresse}` : 'Keine Baustellenadresse'}</span>
            </p>
          </div>
        </div>

        {/* Quick Actions - only visible if not locked */}
        {projekt.status !== 'Abgeschlossen' && projekt.status !== 'Abgebrochen' && userRole !== 'treuhand' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar shrink-0">
            <button 
              onClick={() => onNavigate && onNavigate('offerten', { action: 'create', projektId: projekt.id, kundeId: projekt.kunden_id })}
              className="px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-[auto] text-base sm:text-xs font-medium bg-surface-card hover:bg-neutral-50 text-text-primary rounded-xl sm:rounded-lg border border-border shadow-sm transition-colors cursor-pointer whitespace-nowrap active:scale-[0.98]"
            >
              + Neue Offerte
            </button>
            <button 
              onClick={() => onNavigate && onNavigate('rechnungen', { action: 'create', projektId: projekt.id, kundeId: projekt.kunden_id })}
              className="px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-[auto] text-base sm:text-xs font-medium bg-surface-card hover:bg-neutral-50 text-text-primary rounded-xl sm:rounded-lg border border-border shadow-sm transition-colors cursor-pointer whitespace-nowrap active:scale-[0.98]"
            >
              + Neue Rechnung
            </button>
            <button
              onClick={() => setActiveTab('dateien')}
              className="px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-[auto] text-base sm:text-xs font-medium bg-surface-card hover:bg-neutral-50 text-text-primary rounded-xl sm:rounded-lg border border-border shadow-sm transition-colors cursor-pointer whitespace-nowrap active:scale-[0.98]"
            >
              + Datei
            </button>
            
            <div className="relative">
              <button
                aria-label="Weitere Aktionen"
                onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                className="p-3 min-w-[48px] min-h-[48px] sm:min-w-[auto] sm:min-h-[auto] sm:p-2 flex items-center justify-center rounded-xl sm:rounded-lg text-text-secondary hover:text-text-primary hover:bg-black/5 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
              </button>
              {isHeaderMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsHeaderMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">
                    <div className="p-1">
                    {projekt.is_archived ? (
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
                        Projekt archivieren
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
        )}
      </div>

      {/* Archived Banner */}
      {projekt.is_archived && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl shrink-0">
              📁
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">Dieses Projekt ist archiviert.</p>
              <p className="text-xs text-amber-700 mt-0.5">Das Projekt wird in der regulären Übersicht ausgeblendet.</p>
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

      {/* Projektrendite Summary */}
      {(rechnungen.length > 0 || ausgaben.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex flex-col justify-center">
            <div className="text-sm text-emerald-600 font-semibold mb-1">Einnahmen (Bezahlt)</div>
            <div className="text-2xl font-bold text-emerald-700">{formatCurrency(rechnungen.reduce((sum, r) => sum + parseFloat(r.bezahlt || 0), 0))}</div>
          </div>
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex flex-col justify-center">
            <div className="text-sm text-red-600 font-semibold mb-1">Ausgaben (Belege)</div>
            <div className="text-2xl font-bold text-red-700">{formatCurrency(ausgaben.reduce((sum, a) => sum + parseFloat(a.betrag_brutto || 0), 0))}</div>
          </div>
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex flex-col justify-center">
            <div className="text-sm text-blue-600 font-semibold mb-1">Projektrendite</div>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(
                rechnungen.reduce((sum, r) => sum + parseFloat(r.bezahlt || 0), 0) - 
                ausgaben.reduce((sum, a) => sum + parseFloat(a.betrag_brutto || 0), 0)
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs - Pill Design */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
        {[
          { id: 'projektdaten', label: 'Projektdaten' },
          { id: 'termine', label: `📅 Termine (${termine.length})` },
          { id: 'offerten', label: `Offerten (${offerten.length})` },
          { id: 'rechnungen', label: `Rechnungen (${rechnungen.length})` },
          { id: 'ausgaben', label: `Ausgaben (${ausgaben.length})` },
          { id: 'dateien', label: `Dateien (${dateien.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setEditState(null); }}
            className={`flex items-center gap-2 px-5 py-3 sm:py-2.5 min-h-[48px] sm:min-h-0 text-base sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id 
                ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20' 
                : 'bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {tab.label}
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
              <ProjektStammdatenBlock
                projekt={projekt}
                kunde={kunde}
                draft={draft}
                isEditing={editState === 'stammdaten'}
                isSaving={isSaving}
                onEdit={() => startEdit('stammdaten')}
                onCancel={cancelEdit}
                onSave={handleSaveBlock}
                onChange={handleDraftChange}
                onNavigate={onNavigate}
                disabled={projekt.status === 'Abgeschlossen' || projekt.status === 'Abgebrochen' || userRole === 'treuhand'}
              />
              
              <ProjektTermineBlock
                projekt={projekt}
                draft={draft}
                isEditing={editState === 'termine'}
                isSaving={isSaving}
                onEdit={() => startEdit('termine')}
                onCancel={cancelEdit}
                onSave={handleSaveBlock}
                onChange={handleDraftChange}
                disabled={projekt.status === 'Abgeschlossen' || projekt.status === 'Abgebrochen' || userRole === 'treuhand'}
                termineCount={termine.length}
                onOpenTermineTab={() => setActiveTab('termine')}
              />
              
              <ProjektNotizenBlock
                projekt={projekt}
                draft={draft}
                isEditing={editState === 'notizen'}
                isSaving={isSaving}
                onEdit={() => startEdit('notizen')}
                onCancel={cancelEdit}
                onSave={handleSaveBlock}
                onChange={handleDraftChange}
                disabled={projekt.status === 'Abgeschlossen' || projekt.status === 'Abgebrochen' || userRole === 'treuhand'}
              />
            </div>
          )}

          {/* TAB: TERMINE & MONTAGE */}
          {activeTab === 'termine' && (
            <div className="animate-fade-in-up space-y-6">
              {/* Header card with Project Dates & Action buttons */}
              <div className="bg-surface-card border border-border rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📅</span>
                    <h3 className="text-lg font-bold text-text-primary">Einsätze & Termine</h3>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    Projektlaufzeit: <strong>{formatDate(projekt.startdatum)}</strong> bis <strong>{formatDate(projekt.enddatum)}</strong>
                    {projekt.adresse && <span className="ml-2">📍 {projekt.adresse}</span>}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('kalender', { projektId: projekt.id })}
                    className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-text-primary rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>📆</span> Im Hauptkalender öffnen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTerminModalInitial({
                        datum: new Date().toISOString().split('T')[0],
                        projekt_id: projekt.id,
                        kunden_id: projekt.kunden_id,
                        ort: projekt.adresse || ''
                      });
                      setIsTerminModalOpen(true);
                    }}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-md shadow-primary-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                    style={{ display: userRole === 'treuhand' ? 'none' : 'flex' }}
                  >
                    <span>+</span> Termin hinzufügen
                  </button>
                </div>
              </div>

              {/* Termine List */}
              {termine.length === 0 ? (
                <div className="bg-surface-card rounded-2xl border border-dashed border-border p-12 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center text-2xl text-primary-600 mb-1">
                    🔨
                  </div>
                  <h3 className="text-base font-bold text-text-primary">Keine Termine für dieses Projekt erfasst</h3>
                  <p className="text-xs text-text-secondary max-w-sm">
                    Erfasse Montagen, Besichtigungen vor Ort, Materialanlieferungen oder Kundentermine für dieses Projekt.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTerminModalInitial({
                        datum: new Date().toISOString().split('T')[0],
                        projekt_id: projekt.id,
                        kunden_id: projekt.kunden_id,
                        ort: projekt.adresse || ''
                      });
                      setIsTerminModalOpen(true);
                    }}
                    className="mt-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                    style={{ display: userRole === 'treuhand' ? 'none' : 'block' }}
                  >
                    + Ersten Termin erfassen
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {termine.map(t => {
                    const typConf = getTerminTypConfig(t.typ);
                    const statusConf = getTerminStatusConfig(t.status);

                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTerminForDetail(t)}
                        className="p-4 bg-surface-card hover:bg-gray-50/80 border border-border hover:border-primary-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-xs cursor-pointer"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${typConf.badgeClass}`}>
                            {typConf.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-text-primary">
                                {t.titel}
                              </h4>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusConf.badgeClass}`}>
                                {t.status || 'Geplant'}
                              </span>
                              <span className="text-[11px] font-medium text-text-secondary bg-gray-100 px-2 py-0.5 rounded">
                                {typConf.label}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary mt-1.5">
                              <span>
                                📅 {formatDate(t.datum)}
                                {t.end_datum && t.end_datum !== t.datum && ` bis ${formatDate(t.end_datum)}`}
                              </span>
                              <span>
                                ⏰ {t.ganztaegig ? 'Ganztägig' : `${t.startzeit || '08:00'} – ${t.endzeit || '12:00'} Uhr`}
                              </span>
                              {t.ort && (
                                <span>📍 {t.ort}</span>
                              )}
                            </div>

                            {t.beschreibung && (
                              <p className="text-xs text-text-secondary mt-1 line-clamp-1">
                                📝 {t.beschreibung}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {t.status !== 'Erledigt' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChangeTermin(t.id, 'Erledigt');
                              }}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                              ✓ Erledigt
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTerminModalInitial(t);
                              setIsTerminModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-text-primary rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                          >
                            ✏️ Bearbeiten
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                    className="mt-2 w-full sm:w-auto min-h-[48px] px-5 py-3 sm:py-2.5 bg-primary-600 text-white rounded-xl text-base sm:text-sm font-bold shadow-md shadow-primary-600/20 hover:bg-primary-700 active:scale-95 transition-all cursor-pointer relative z-10"
                    style={{ display: userRole === 'treuhand' ? 'none' : 'block' }}
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
                              {formatCurrency(off.total || 0)}
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
                    className="mt-2 w-full sm:w-auto min-h-[48px] px-5 py-3 sm:py-2.5 bg-primary-600 text-white rounded-xl text-base sm:text-sm font-bold shadow-md shadow-primary-600/20 hover:bg-primary-700 active:scale-95 transition-all cursor-pointer relative z-10"
                    style={{ display: userRole === 'treuhand' ? 'none' : 'block' }}
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
                              {formatCurrency(re.total || 0)}
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

          {/* TAB: AUSGABEN */}
          {activeTab === 'ausgaben' && (
            <div className="animate-fade-in-up">
              {ausgaben.length === 0 ? (
                <div className="bg-surface-card rounded-2xl border border-dashed border-border p-12 text-center flex flex-col items-center justify-center gap-4 relative overflow-hidden">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-2">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">Keine Ausgaben für dieses Projekt</h3>
                    <p className="text-text-secondary mt-1">Es wurden noch keine Belege oder Spesen zugewiesen.</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {ausgaben.map(ausgabe => (
                    <div key={ausgabe.id} className="group bg-surface-card rounded-xl border border-dashed border-border overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col sm:flex-row">
                      <div className="w-full sm:w-2 bg-red-500 h-1.5 sm:h-auto"></div>
                      <div className="flex-1 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                           <div>
                            <div className="font-bold text-base sm:text-lg text-text-primary flex items-center gap-2">
                              {ausgabe.titel}
                            </div>
                            <div className="text-text-secondary text-sm mt-1">
                              📅 {formatDate(ausgabe.beleg_datum)} | 🏷️ {ausgabe.kategorie}
                            </div>
                          </div>
                        </div>
                        <div className="font-mono font-bold text-lg text-red-600">
                          - {formatCurrency(ausgabe.betrag_brutto)}
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
                    <p className="text-text-secondary mt-1">Lade Dateien, Pläne oder Fotos für dieses Projekt hoch.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {dateien.map(datei => (
                    <div key={datei.id} className="group relative bg-surface-card border border-border rounded-xl p-4 hover:shadow-md hover:border-primary-300 transition-all flex flex-col">
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                        <a href={datei.url} target="_blank" rel="noopener noreferrer" className="p-3 sm:p-2.5 min-w-[48px] min-h-[48px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center bg-white shadow-sm rounded-lg text-gray-500 hover:text-primary-600 transition-colors" title="Ansehen">
                          <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </a>
                        {userRole !== 'treuhand' && (
                          <button onClick={() => openRenameModal(datei.id, datei.name)} className="p-3 sm:p-2.5 min-w-[48px] min-h-[48px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center bg-white shadow-sm rounded-lg text-gray-500 hover:text-amber-500 transition-colors cursor-pointer" title="Umbenennen">
                            <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowArchiveWarning(false)}>
          <div className="bg-surface-card rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl mb-4">
              📁
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Projekt archivieren?</h3>
            <p className="text-text-secondary text-sm mb-6 leading-relaxed">
              Das Projekt wird aus der regulären Übersicht ausgeblendet. Verknüpfte Offerten, Rechnungen und Dokumente bleiben sicher erhalten und das Projekt kann jederzeit wiederhergestellt werden.
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

      {/* Delete Warning Modal */}
      {showDeleteWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-red-200 animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Projekt wirklich löschen?</h3>
            <p className="text-text-secondary mb-6 text-sm">
              Bist du sicher? Alle Daten dieses Projekts werden <strong>unwiderruflich</strong> gelöscht.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button 
                onClick={() => setShowDeleteWarning(false)}
                className="flex-1 min-h-[48px] px-4 py-3 sm:py-2.5 bg-surface text-text-primary text-base sm:text-sm border border-border rounded-xl hover:bg-neutral-100 font-medium transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={handleHardDelete}
                className="flex-1 min-h-[48px] px-4 py-3 sm:py-2.5 bg-red-600 text-white text-base sm:text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
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

      {/* Termin Create/Edit Modal */}
      <TerminModal
        isOpen={isTerminModalOpen}
        onClose={() => {
          setIsTerminModalOpen(false);
          setTerminModalInitial(null);
        }}
        onSave={handleSaveTermin}
        onDelete={handleDeleteTermin}
        initialData={terminModalInitial}
        projekte={[projekt]}
        kunden={kunde ? [kunde] : []}
      />

      {/* Termin Detail Preview Modal */}
      <TerminDetailModal
        isOpen={Boolean(selectedTerminForDetail)}
        termin={selectedTerminForDetail}
        onClose={() => setSelectedTerminForDetail(null)}
        onEdit={(terminToEdit) => {
          setSelectedTerminForDetail(null);
          setTerminModalInitial(terminToEdit);
          setIsTerminModalOpen(true);
        }}
        onDelete={handleDeleteTermin}
        onStatusChange={handleStatusChangeTermin}
        onNavigate={onNavigate}
      />
    </div>
  )
}
