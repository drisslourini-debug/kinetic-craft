import { useState, useEffect, lazy, Suspense, useRef } from 'react'
import { supabase } from '../lib/supabase'
const RechnungPrintView = lazy(() => import('./RechnungPrintView'))
const MahnungPrintView = lazy(() => import('./MahnungPrintView'))
import { formatMoney, formatDate } from '../lib/formatters'
import { calculateDocumentTotals } from '../lib/calculations'
import { calculateSia118Schlussrechnung, calculateGarantieFreigabeDatum, roundToFiveRappen } from '../lib/sia118Helper'
import { generateNextRechnungNr, generateNextGutschriftNr } from '../lib/documentService'
import { formatUrl } from '../lib/router'
import KatalogDrawer from '../components/KatalogDrawer'
import TerminModal from '../components/kalender/TerminModal'
import MahnungModal from '../components/mahnwesen/MahnungModal'
import BetreibungsModal from '../components/mahnwesen/BetreibungsModal'
import { getMahnVorschlag } from '../lib/mahnwesenHelper'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { useModalHistory } from '../hooks/useModalHistory'
import {
  IconFolder,
  IconEye,
  IconEdit,
  IconCalendar,
  IconDuplicate,
  IconPackage,
  IconTrash,
  IconCheck,
  IconPlus,
  IconBook,
  IconMoney,
  IconFlash,
  IconCreditCard,
  IconClock,
  IconBuilding,
  IconNotes,
  IconSave,
  IconRefresh,
  IconWarning,
  IconQrBill,
  IconDocument
} from '../components/icons/BrandIcons'

function IconPrinter({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  )
}

export default function RechnungDetailView({ rechnung, onBack, onNavigate, userRole, viewParams }) {
  const [kunde, setKunde] = useState(rechnung?.kunden || null)
  const [projekt, setProjekt] = useState(rechnung?.projekte || null)
  const [settings, setSettings] = useState(null)
  const [status, setStatus] = useState(rechnung.status || 'Entwurf')
  const [isUpdating, setIsUpdating] = useState(false)
  const [isLoading, setIsLoading] = useState(rechnung?.id === 'demo' ? false : true)
  const [showPrintView, setShowPrintView] = useState(false)
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [showKatalogDrawer, setShowKatalogDrawer] = useState(false)

  // Modals & Feedback
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [showGutschriftModal, setShowGutschriftModal] = useState(false)
  const [feedbackToast, setFeedbackToast] = useState(null)
  const [isTerminModalOpen, setIsTerminModalOpen] = useState(false)
  const [terminModalInitial, setTerminModalInitial] = useState(null)

  // Mahnwesen Modals & State
  const [showMahnungModal, setShowMahnungModal] = useState(false)
  const [showMahnungPrintView, setShowMahnungPrintView] = useState(false)
  const [activeMahnung, setActiveMahnung] = useState(null)
  const [showBetreibungsModal, setShowBetreibungsModal] = useState(false)

  const showToast = (type, text) => {
    setFeedbackToast({ type, text })
    setTimeout(() => setFeedbackToast(null), 3500)
  }

  // Stammdaten edit state
  const [isDirty, setIsDirty] = useState(false)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const [showDeleteWarning, setShowDeleteWarning] = useState(false)
  const [editStammdaten, setEditStammdaten] = useState({
    rechnungsdatum: rechnung.rechnungsdatum || '',
    zahlungsfrist_tage: rechnung.zahlungsfrist_tage || 30,
    notizen: rechnung.notizen || ''
  })

  // Payment form state
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentAmount, setPaymentAmount] = useState(rechnung.total || 0)
  const [paymentType, setPaymentType] = useState('skonto') // 'skonto' or 'teil'

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editLeistungen, setEditLeistungen] = useState([])
  const [editKonditionen, setEditKonditionen] = useState({ rabatt: 0, mwst: 0 })
  const [editEinleitung, setEditEinleitung] = useState('')
  const [editSchluss, setEditSchluss] = useState('')
  const [editPauschalpreis, setEditPauschalpreis] = useState(null)
  const [isPauschal, setIsPauschal] = useState(false)
  const [showLivePreview, setShowLivePreview] = useState(false)
  const [mobileEditTab, setMobileEditTab] = useState('form') // 'form' | 'preview'

  // SIA 118 Schlussrechnung Edit State
  const [editSia118Aktiv, setEditSia118Aktiv] = useState(false)
  const [editAkontoAbzuege, setEditAkontoAbzuege] = useState([])
  const [editRueckbehaltAktiv, setEditRueckbehaltAktiv] = useState(true)
  const [editRueckbehaltProzent, setEditRueckbehaltProzent] = useState(5.0)
  const [editAbgeloestGarantie, setEditAbgeloestGarantie] = useState(false)
  const [editGarantieDauerJahre, setEditGarantieDauerJahre] = useState(2)
  const [isLoadingProjectInvoices, setIsLoadingProjectInvoices] = useState(false)

  useUnsavedChanges(isDirty || isEditing)
  useModalHistory(showPrintView, () => setShowPrintView(false), 'print_rechnung')
  useModalHistory(showMahnungPrintView, () => setShowMahnungPrintView(false), 'print_mahnung')
  useModalHistory(showMahnungModal, () => setShowMahnungModal(false), 'modal_mahnung')
  useModalHistory(showBetreibungsModal, () => setShowBetreibungsModal(false), 'modal_betreibung')
  useModalHistory(showKatalogDrawer, () => setShowKatalogDrawer(false), 'katalog_drawer')

  useEffect(() => {
    if (viewParams?.openMahnung) {
      setShowMahnungModal(true)
    }
  }, [viewParams?.openMahnung])

  useEffect(() => {
    async function loadDetails() {
      if (!supabase || !rechnung) return
      if (rechnung.id === 'demo') {
        setIsLoading(false)
        return
      }
      
      try {
        setIsLoading(true)
        
        if (rechnung.kunden_id) {
          const { data: kData } = await supabase
            .from('kunden')
            .select('*')
            .eq('id', rechnung.kunden_id)
            .single()
          if (kData) setKunde(kData)
        }

        if (rechnung.projekt_id) {
          const { data: pData } = await supabase
            .from('projekte')
            .select('*')
            .eq('id', rechnung.projekt_id)
            .single()
          if (pData) setProjekt(pData)
        }

        const { data: sData } = await supabase
          .from('einstellungen')
          .select('*')
          .maybeSingle()
        if (sData) setSettings(sData)

      } catch (err) {
        console.error('Error loading rechnung details:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadDetails()
  }, [rechnung])

  const handleStatusChange = async (newStatus) => {
    if (!supabase) return
    // GeBüV: Paid or cancelled invoices cannot be reverted to draft or open status
    if ((status === 'Bezahlt' || status === 'Storniert') && newStatus !== 'Bezahlt' && newStatus !== 'Storniert') {
      showToast('error', 'GeBüV: Eine bezahlte oder stornierte Rechnung darf nicht wieder in den Entwurf-Status versetzt werden.')
      return
    }
    const oldStatus = status
    setStatus(newStatus)
    setIsUpdating(true)
    
    try {
      const { error } = await supabase
        .from('rechnungen')
        .update({ status: newStatus })
        .eq('id', rechnung.id)
      if (error) throw error
      rechnung.status = newStatus
      showToast('success', `Status auf "${newStatus}" aktualisiert.`)
    } catch (err) {
      console.error('Failed to update status:', err)
      showToast('error', err.message || 'Status konnte nicht aktualisiert werden.')
      setStatus(oldStatus)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleStammInputChange = (field, value) => {
    setEditStammdaten(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)
  }

  const handleSaveStammdaten = async () => {
    setIsUpdating(true)
    try {
      // Recalculate faellig_am if rechnungsdatum or zahlungsfrist changed
      let faellig_am = null;
      if (editStammdaten.rechnungsdatum) {
        const rDate = new Date(editStammdaten.rechnungsdatum);
        rDate.setDate(rDate.getDate() + parseInt(editStammdaten.zahlungsfrist_tage || 0));
        faellig_am = rDate.toISOString().split('T')[0];
      }

      await supabase
        .from('rechnungen')
        .update({ 
          rechnungsdatum: editStammdaten.rechnungsdatum,
          zahlungsfrist_tage: editStammdaten.zahlungsfrist_tage,
          notizen: editStammdaten.notizen,
          faellig_am: faellig_am
        })
        .eq('id', rechnung.id)
        
      rechnung.rechnungsdatum = editStammdaten.rechnungsdatum
      rechnung.zahlungsfrist_tage = editStammdaten.zahlungsfrist_tage
      rechnung.notizen = editStammdaten.notizen
      rechnung.faellig_am = faellig_am
      setIsDirty(false)
      showToast('success', 'Stammdaten erfolgreich gespeichert!')
    } catch (err) {
      console.error('Failed to update stammdaten:', err)
      showToast('error', 'Fehler beim Speichern der Stammdaten.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleBackClick = () => {
    if (isDirty || isEditing) {
      setShowUnsavedWarning(true)
    } else {
      onBack()
    }
  }

  const handleArchive = async () => {
    setIsUpdating(true)
    try {
      await supabase.from('rechnungen').update({ is_archived: true }).eq('id', rechnung.id)
      rechnung.is_archived = true
      showToast('success', 'Rechnung archiviert.')
      setTimeout(() => onBack(), 1200)
    } catch (err) {
      console.error('Fehler beim Archivieren:', err)
      showToast('error', 'Fehler beim Archivieren.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDuplicate = async () => {
    setIsUpdating(true)
    try {
      const newNr = await generateNextRechnungNr(supabase)

      const { data, error } = await supabase
        .from('rechnungen')
        .insert([{
          rechnung_nr: newNr,
          kunden_id: rechnung.kunden_id,
          projekt_id: rechnung.projekt_id,
          offerte_id: rechnung.offerte_id,
          typ: rechnung.typ,
          akonto_prozent: rechnung.akonto_prozent,
          total: rechnung.total,
          daten: rechnung.daten,
          zahlungsfrist_tage: rechnung.zahlungsfrist_tage || 30,
          status: 'Entwurf'
        }])
        .select()
      if (error) throw error
      if (data && data.length > 0) {
        showToast('success', `Rechnung ${newNr} dupliziert!`)
        setTimeout(() => {
          if (onBack) onBack()
        }, 1500)
      }
    } catch (err) {
      console.error('Fehler beim Duplizieren:', err)
      showToast('error', 'Fehler beim Duplizieren.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (status !== 'Entwurf') {
      showToast('error', 'Achtung: Nur Entwürfe können endgültig gelöscht werden. Bitte storniere oder archiviere diese Rechnung stattdessen.')
      setShowDeleteWarning(false)
      return
    }
    
    setIsUpdating(true)
    try {
      await supabase.from('rechnungen').delete().eq('id', rechnung.id)
      showToast('success', 'Rechnung gelöscht.')
      setTimeout(() => onBack(), 1000)
    } catch (err) {
      console.error('Fehler beim Löschen:', err)
      showToast('error', 'Fehler beim Löschen der Rechnung.')
    } finally {
      setIsUpdating(false)
      setShowDeleteWarning(false)
    }
  }

  const handlePayment = async () => {
    setIsUpdating(true)
    try {
      const amount = parseFloat(paymentAmount) || 0
      const currentPaid = parseFloat(rechnung.bezahlt) || 0
      const total = parseFloat(rechnung.total) || 0
      const open = Math.max(0, Math.round((total - currentPaid) * 100) / 100)
      const diff = Math.round((open - amount) * 100) / 100

      let newStatus = 'Bezahlt'
      let skontoBetrag = parseFloat(rechnung.daten?.skonto_betrag || 0)
      const newPaid = currentPaid + amount

      const existingZahlungen = Array.isArray(rechnung.daten?.zahlungen) ? [...rechnung.daten.zahlungen] : []

      if (diff > 0.05 && paymentType === 'teil') {
        newStatus = 'Teilbezahlt'
        existingZahlungen.push({
          datum: paymentDate,
          betrag: amount,
          typ: 'Teilzahlung'
        })
      } else if (diff > 0.05 && paymentType === 'skonto') {
        newStatus = 'Bezahlt'
        skontoBetrag += diff
        existingZahlungen.push({
          datum: paymentDate,
          betrag: amount,
          typ: 'Zahlung'
        })
        existingZahlungen.push({
          datum: paymentDate,
          betrag: diff,
          typ: 'Skonto'
        })
      } else {
        newStatus = 'Bezahlt'
        existingZahlungen.push({
          datum: paymentDate,
          betrag: amount,
          typ: 'Zahlung'
        })
      }

      const updatedDaten = {
        ...(rechnung.daten || {}),
        zahlungen: existingZahlungen,
        skonto_betrag: skontoBetrag > 0 ? skontoBetrag : undefined
      }

      await supabase
        .from('rechnungen')
        .update({ 
          bezahlt: newPaid, 
          bezahlt_am: paymentDate, 
          status: newStatus,
          daten: updatedDaten
        })
        .eq('id', rechnung.id)
      
      setStatus(newStatus)
      setShowPaymentForm(false)
      rechnung.bezahlt = newPaid
      rechnung.bezahlt_am = paymentDate
      rechnung.status = newStatus
      rechnung.daten = updatedDaten
      showToast('success', newStatus === 'Bezahlt' ? (skontoBetrag > 0 ? `Zahlung verbucht & Restbetrag (${diff.toFixed(2)} CHF) als Skonto ausgebucht!` : 'Zahlung erfolgreich erfasst!') : `Teilzahlung erfasst. Restforderung: ${(open - amount).toFixed(2)} CHF`)
    } catch (err) {
      console.error('Fehler beim Erfassen der Zahlung:', err)
      showToast('error', 'Fehler beim Speichern der Zahlung.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCreateGutschrift = async () => {
    setIsUpdating(true)
    try {
      const newNr = await generateNextGutschriftNr(supabase)
      const today = new Date().toISOString().split('T')[0]

      const gutschriftDaten = {
        ...(rechnung.daten || {}),
        referenz_rechnung_nr: rechnung.rechnung_nr || `RE-${rechnung.id}`,
        referenz_rechnung_id: rechnung.id,
        einleitungstext: `Gutschrift zu Rechnung ${rechnung.rechnung_nr || rechnung.id} vom ${formatDate(rechnung.rechnungsdatum || rechnung.created_at)}:`,
        schlusstext: 'Der Gutschriftsbetrag wird mit künftigen Rechnungen verrechnet oder auf Ihr Bankkonto vergütet.'
      }

      const { data, error } = await supabase
        .from('rechnungen')
        .insert([{
          rechnung_nr: newNr,
          kunden_id: rechnung.kunden_id,
          projekt_id: rechnung.projekt_id,
          offerte_id: rechnung.offerte_id,
          typ: 'gutschrift',
          total: rechnung.total,
          daten: gutschriftDaten,
          rechnungsdatum: today,
          zahlungsfrist_tage: 0,
          status: 'Entwurf'
        }])
        .select()
        .single()

      if (error) throw error

      showToast('success', `Gutschrift ${newNr} erfolgreich angelegt!`)
      setShowActionMenu(false)
      setShowGutschriftModal(false)
      if (onNavigate && data) {
        onNavigate('rechnungen', { rechnungId: data.id })
      }
    } catch (err) {
      console.error('Fehler beim Erstellen der Gutschrift:', err)
      showToast('error', 'Fehler beim Erstellen der Gutschrift.')
    } finally {
      setIsUpdating(false)
    }
  }

  const openPlanTermin = (type = 'Zahlungserinnerung') => {
    setTerminModalInitial({
      titel: `${type}: RE #${rechnung.rechnung_nr || rechnung.id} - ${kunde?.name || ''}`.trim(),
      typ: 'Besprechung',
      datum: rechnung.faellig_am || new Date().toISOString().split('T')[0],
      kunden_id: rechnung.kunden_id ? String(rechnung.kunden_id) : '',
      projekt_id: rechnung.projekt_id ? String(rechnung.projekt_id) : '',
      ort: projekt?.adresse || kunde?.adresse || (kunde ? `${kunde.strasse || ''}, ${kunde.plz || ''} ${kunde.ort || ''}`.trim() : ''),
      beschreibung: `Erinnerung bezüglich Rechnung ${rechnung.rechnung_nr || '#' + rechnung.id} (Total: CHF ${formatMoney(rechnung.total || 0)})`
    })
    setIsTerminModalOpen(true)
  }

  const handleSaveTermin = async (formData, terminId) => {
    try {
      if (terminId) {
        const { error } = await supabase.from('termine').update(formData).eq('id', terminId)
        if (error) throw error
        showToast('success', 'Termin aktualisiert.')
      } else {
        const { error } = await supabase.from('termine').insert([formData])
        if (error) throw error
        showToast('success', 'Termin im Kalender erfasst.')
      }
      setIsTerminModalOpen(false)
      setTerminModalInitial(null)
    } catch (err) {
      console.error('Fehler beim Speichern des Termins:', err)
      showToast('error', err.message || 'Fehler beim Speichern des Termins.')
    }
  }

  const handleSaveMahnung = async ({ mahnungData, updatedRechnung }) => {
    setIsUpdating(true)
    try {
      const updatePayload = {
        daten: updatedRechnung.daten
      }
      if (updatedRechnung.status) {
        updatePayload.status = updatedRechnung.status
      }

      if (supabase && rechnung.id !== 'demo') {
        // GeBüV-Schutz: Wenn die Rechnung noch 'Versendet' oder 'Überfällig' ist,
        // verlangt der Postgres-Trigger, dass der Statuswechsel (z.B. zu 'Gemahnt')
        // vor der Aktualisierung der Mahndaten im JSON-Feld 'daten' erfolgt.
        if (updatedRechnung.status && updatedRechnung.status !== rechnung.status) {
          const { error: statusError } = await supabase
            .from('rechnungen')
            .update({ status: updatedRechnung.status })
            .eq('id', rechnung.id)
          if (statusError) throw statusError
        }

        const { error: datenError } = await supabase
          .from('rechnungen')
          .update({ daten: updatedRechnung.daten })
          .eq('id', rechnung.id)
        if (datenError) throw datenError
      }

      rechnung.daten = updatedRechnung.daten
      if (updatedRechnung.status) {
        rechnung.status = updatedRechnung.status
        setStatus(updatedRechnung.status)
      }

      if (mahnungData) {
        showToast('success', `${mahnungData.titel || 'Mahnung'} erfolgreich ausgestellt!`)
        setActiveMahnung(mahnungData)
        setShowMahnungPrintView(true)
      } else {
        showToast('success', 'Mahnwesen-Status aktualisiert.')
      }
    } catch (err) {
      console.error('Fehler beim Speichern der Mahnung:', err)
      showToast('error', 'Fehler beim Speichern der Mahnung.')
    } finally {
      setIsUpdating(false)
    }
  }

  // ===== EDIT MODE FUNCTIONS =====
  const handleImportProjectAkontos = async () => {
    const projId = projekt?.id || rechnung.projekt_id
    if (!projId || !supabase) {
      showToast('error', 'Kein Projekt zugeordnet, aus dem Rechnungen importiert werden können.')
      return
    }

    setIsLoadingProjectInvoices(true)
    try {
      const { data, error } = await supabase
        .from('rechnungen')
        .select('id, rechnung_nr, rechnungsdatum, total, typ, status')
        .eq('projekt_id', projId)
        .neq('id', rechnung.id)
        .neq('status', 'Storniert')
        .order('rechnungsdatum', { ascending: true })

      if (error) throw error

      if (!data || data.length === 0) {
        showToast('error', 'Keine weiteren Rechnungen für dieses Projekt gefunden.')
        return
      }

      const imported = data.map(r => ({
        rechnung_id: r.id,
        rechnung_nr: r.rechnung_nr || `RE-${r.id}`,
        datum: r.rechnungsdatum || null,
        betrag: parseFloat(r.total || 0),
        titel: r.typ === 'akonto' ? 'Akonto-Rechnung' : 'Bisherige Rechnung'
      }))

      setEditAkontoAbzuege(imported)
      showToast('success', `${imported.length} Rechnung(en) aus dem Projekt übernommen.`)
    } catch (err) {
      console.error('Fehler beim Laden der Projektrechnungen:', err)
      showToast('error', 'Projektrechnungen konnten nicht geladen werden.')
    } finally {
      setIsLoadingProjectInvoices(false)
    }
  }

  const handleAddAkontoAbzug = () => {
    setEditAkontoAbzuege(prev => [
      ...prev,
      {
        rechnung_id: null,
        rechnung_nr: '',
        datum: new Date().toISOString().split('T')[0],
        betrag: 0,
        titel: 'Akonto-Zahlung'
      }
    ])
  }

  const handleUpdateAkontoAbzug = (index, field, value) => {
    setEditAkontoAbzuege(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleDeleteAkontoAbzug = (index) => {
    setEditAkontoAbzuege(prev => prev.filter((_, i) => i !== index))
  }

  const startEditing = () => {
    const daten = rechnung.daten || {}
    const currentLeistungen = (daten.leistungen || []).map((pos, i) => ({
      ...pos,
      _id: Date.now() + i,
      optional: pos.optional || false,
    }))
    setEditLeistungen(currentLeistungen)
    setEditKonditionen({
      rabatt: parseFloat(daten.konditionen?.rabatt || 0),
      mwst: parseFloat(daten.konditionen?.mwst || 0),
    })
    setEditEinleitung(daten.einleitungstext || '')
    setEditSchluss(daten.schlusstext || '')
    setEditPauschalpreis(daten.pauschalpreis || null)
    setIsPauschal(!!daten.pauschalpreis && parseFloat(daten.pauschalpreis) > 0)

    // SIA 118 Setup
    const isSchluss = rechnung.typ === 'schluss' || Boolean(daten.is_schlussrechnung) || Boolean(daten.sia118?.aktiv)
    setEditSia118Aktiv(isSchluss)
    setEditAkontoAbzuege(daten.akonto_abzuege ? JSON.parse(JSON.stringify(daten.akonto_abzuege)) : [])
    setEditRueckbehaltAktiv(daten.sia118?.rueckbehalt?.aktiv ?? true)
    setEditRueckbehaltProzent(daten.sia118?.rueckbehalt?.prozent ?? 5.0)
    setEditAbgeloestGarantie(daten.sia118?.rueckbehalt?.abgeloestDurchGarantie ?? false)
    setEditGarantieDauerJahre(daten.sia118?.rueckbehalt?.dauerJahre ?? 2)

    setShowLivePreview(true)
    setMobileEditTab('form')
    setIsEditing(true)
  }

  const hasHandledEditParamRef = useRef(false)
  useEffect(() => {
    if (viewParams?.edit && !hasHandledEditParamRef.current && !isEditing && !isLoading) {
      if (status === 'Entwurf' || status === 'Versendet' || status === 'Teilbezahlt') {
        hasHandledEditParamRef.current = true
        startEditing()
      }
    }
  }, [viewParams, isLoading, isEditing, status])

  const cancelEditing = () => {
    if (viewParams?.edit) {
      delete viewParams.edit
      window.history.replaceState(window.history.state, '', formatUrl('rechnungen', { rechnungId: rechnung.id }))
    }
    setShowDiscardModal(true)
  }

  const saveEditing = async () => {
    setIsUpdating(true)
    try {
      const cleanLeistungen = editLeistungen.map(({ _id, ...pos }) => pos)
      
      const { finalTotal } = calculateDocumentTotals(cleanLeistungen, editKonditionen, isPauschal ? editPauschalpreis : null)

      let effectiveTotal = finalTotal
      let siaCalc = null
      if (editSia118Aktiv) {
        siaCalc = calculateSia118Schlussrechnung({
          gesamtwerkpreis: finalTotal,
          akontoAbzuege: editAkontoAbzuege,
          rueckbehalt: {
            aktiv: editRueckbehaltAktiv,
            prozent: parseFloat(editRueckbehaltProzent) || 5.0,
            abgeloestDurchGarantie: editAbgeloestGarantie,
            basis: 'gesamtwerkpreis',
            dauerJahre: editGarantieDauerJahre
          },
          rechnungsdatum: editStammdaten.rechnungsdatum || rechnung.rechnungsdatum || new Date().toISOString()
        })
        effectiveTotal = siaCalc.faelligerSchlussbetrag
      }

      const updatedDaten = {
        ...rechnung.daten,
        leistungen: cleanLeistungen,
        konditionen: {
          rabatt: editKonditionen.rabatt,
          mwst: editKonditionen.mwst,
        },
        einleitungstext: editEinleitung || null,
        schlusstext: editSchluss || null,
        pauschalpreis: isPauschal ? parseFloat(editPauschalpreis) || null : null,
        is_schlussrechnung: editSia118Aktiv,
        gesamtwerkpreis: editSia118Aktiv ? finalTotal : (rechnung.daten?.gesamtwerkpreis || null),
        akonto_abzuege: editSia118Aktiv ? editAkontoAbzuege : (rechnung.daten?.akonto_abzuege || []),
        sia118: editSia118Aktiv ? {
          aktiv: true,
          rueckbehalt: {
            aktiv: editRueckbehaltAktiv,
            prozent: parseFloat(editRueckbehaltProzent) || 5.0,
            abgeloestDurchGarantie: editAbgeloestGarantie,
            basis: 'gesamtwerkpreis',
            dauerJahre: editGarantieDauerJahre,
            freigabe_datum: calculateGarantieFreigabeDatum(editStammdaten.rechnungsdatum || rechnung.rechnungsdatum || new Date().toISOString(), editGarantieDauerJahre)
          },
          berechnung: siaCalc
        } : { aktiv: false }
      }

      const updatePayload = {
        daten: updatedDaten,
        total: effectiveTotal,
        typ: editSia118Aktiv ? 'schluss' : (rechnung.typ === 'schluss' ? 'standard' : rechnung.typ)
      }

      await supabase
        .from('rechnungen')
        .update(updatePayload)
        .eq('id', rechnung.id)
      
      rechnung.daten = updatedDaten
      rechnung.total = effectiveTotal
      rechnung.typ = updatePayload.typ

      if (viewParams?.edit) {
        delete viewParams.edit
        window.history.replaceState(window.history.state, '', formatUrl('rechnungen', { rechnungId: rechnung.id }))
      }

      setIsEditing(false)
      setMobileEditTab('form')
      showToast('success', editSia118Aktiv ? 'SIA 118 Schlussrechnung erfolgreich gespeichert!' : 'Rechnung erfolgreich gespeichert!')
    } catch (err) {
      console.error('Fehler beim Speichern:', err)
      showToast('error', 'Fehler beim Speichern der Rechnung.')
    } finally {
      setIsUpdating(false)
    }
  }

  const updatePosition = (id, field, value) => {
    setEditLeistungen(prev => prev.map(p => p._id === id ? { ...p, [field]: value } : p))
  }

  const deletePosition = (id) => {
    setEditLeistungen(prev => prev.filter(p => p._id !== id))
  }

  const addPosition = () => {
    setEditLeistungen(prev => [...prev, {
      _id: Date.now(),
      posNr: '',
      beschreibung: '',
      menge: '',
      einheit: '',
      einzelpreis: '',
      kategorie: '',
      optional: false,
    }])
  }

  const movePosition = (index, direction) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= editLeistungen.length) return
    const updated = [...editLeistungen]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp
    setEditLeistungen(updated)
  }

  const handleInsertFromKatalog = (items) => {
    if (!items || items.length === 0) return
    const newPositions = items.map(item => ({
      _id: Date.now() + Math.random(),
      posNr: '',
      type: 'position',
      beschreibung: item.titel,
      details: item.details || '',
      npk_code: item.npk_code || item.npkCode || '',
      npk_kapitel: item.npk_kapitel || item.kapitelCode || '',
      menge: item.menge || '',
      einheit: item.einheit,
      einzelpreis: item.preis,
      kategorie: item.kategorie,
      optional: false,
    }))
    setEditLeistungen(prev => recalculatePositions([...prev, ...newPositions]))
    setShowKatalogDrawer(false)
  }

  if (!rechnung) return null


  // Parse daten safely
  const daten = rechnung.daten || {}
  const leistungen = daten.leistungen || []
  const { rawTotal, rabattBetrag, mwstBetrag, finalTotal, optionenTotal } = calculateDocumentTotals(leistungen, daten.konditionen, daten.pauschalpreis)
  const rabatt = parseFloat(daten.konditionen?.rabatt || 0)
  const mwst = parseFloat(daten.konditionen?.mwst || 0)

  // Edit-mode live calculation
  const editTotals = calculateDocumentTotals(editLeistungen, editKonditionen, isPauschal ? editPauschalpreis : null)
  const editRawTotal = editTotals.rawTotal
  const editRabattBetrag = editTotals.rabattBetrag
  const editMwstBetrag = editTotals.mwstBetrag
  const editFinalTotal = editTotals.finalTotal
  const editOptionalTotal = editTotals.optionenTotal

  // SIA 118 Calculations
  const isSchluss = rechnung.typ === 'schluss' || Boolean(daten.is_schlussrechnung) || Boolean(daten.sia118?.aktiv)
  const sia118ViewCalc = isSchluss ? calculateSia118Schlussrechnung({
    gesamtwerkpreis: finalTotal,
    akontoAbzuege: daten.akonto_abzuege || [],
    rueckbehalt: daten.sia118?.rueckbehalt || {
      aktiv: true,
      prozent: 5.0,
      abgeloestDurchGarantie: false,
      basis: 'gesamtwerkpreis'
    },
    rechnungsdatum: rechnung.rechnungsdatum || rechnung.created_at || new Date().toISOString()
  }) : null

  const sia118EditCalc = editSia118Aktiv ? calculateSia118Schlussrechnung({
    gesamtwerkpreis: editFinalTotal,
    akontoAbzuege: editAkontoAbzuege,
    rueckbehalt: {
      aktiv: editRueckbehaltAktiv,
      prozent: parseFloat(editRueckbehaltProzent) || 5.0,
      abgeloestDurchGarantie: editAbgeloestGarantie,
      basis: 'gesamtwerkpreis',
      dauerJahre: editGarantieDauerJahre
    },
    rechnungsdatum: editStammdaten.rechnungsdatum || rechnung.rechnungsdatum || new Date().toISOString()
  }) : null

  const activeSia118Calc = isEditing ? sia118EditCalc : sia118ViewCalc
  const activeIsSchluss = isEditing ? editSia118Aktiv : isSchluss

  const previewRechnung = isEditing ? {
    ...rechnung,
    typ: editSia118Aktiv ? 'schluss' : rechnung.typ,
    daten: {
      ...rechnung.daten,
      leistungen: editLeistungen.map(({ _id, ...pos }) => pos),
      konditionen: editKonditionen,
      einleitungstext: editEinleitung,
      schlusstext: editSchluss,
      pauschalpreis: isPauschal ? editPauschalpreis : null,
      is_schlussrechnung: editSia118Aktiv,
      akonto_abzuege: editSia118Aktiv ? editAkontoAbzuege : (daten.akonto_abzuege || []),
      sia118: editSia118Aktiv ? {
        aktiv: true,
        rueckbehalt: {
          aktiv: editRueckbehaltAktiv,
          prozent: parseFloat(editRueckbehaltProzent) || 5.0,
          abgeloestDurchGarantie: editAbgeloestGarantie,
          basis: 'gesamtwerkpreis',
          dauerJahre: editGarantieDauerJahre,
          freigabe_datum: calculateGarantieFreigabeDatum(editStammdaten.rechnungsdatum || rechnung.rechnungsdatum || new Date().toISOString(), editGarantieDauerJahre)
        },
        berechnung: sia118EditCalc
      } : { aktiv: false }
    },
    total: editSia118Aktiv && sia118EditCalc ? sia118EditCalc.faelligerSchlussbetrag : editFinalTotal
  } : rechnung;

  const mahnvorschlag = getMahnVorschlag(rechnung);

  if (showPrintView) {
    return (
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" /></div>}>
        <RechnungPrintView rechnung={rechnung} kunde={kunde} projekt={projekt} settings={settings} onClose={() => setShowPrintView(false)} />
      </Suspense>
    )
  }

  if (showMahnungPrintView) {
    return (
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" /></div>}>
        <MahnungPrintView
          rechnung={rechnung}
          mahnung={activeMahnung}
          kunde={kunde}
          projekt={projekt}
          settings={settings}
          onClose={() => setShowMahnungPrintView(false)}
        />
      </Suspense>
    )
  }

  return (
    <div className={`space-y-6 relative ${isEditing ? 'pb-32 sm:pb-24' : ''}`}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Row 1: Back Button, Title, Saving State & Archive Status */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button 
            onClick={handleBackClick}
            className="p-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center rounded-xl hover:bg-surface-card border border-transparent hover:border-border transition-all text-text-secondary hover:text-text-primary cursor-pointer shrink-0"
            aria-label="Zurück"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-text-primary truncate">
                Rechnung {rechnung.rechnung_nr || `#${rechnung.id}`}
              </h2>
              {isUpdating && <span className="text-xs text-text-secondary">Speichert...</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-0.5 sm:mt-1">
              <p className="text-text-secondary text-xs sm:text-sm">Erstellt am {formatDate(rechnung.created_at)}</p>
              {rechnung.pdf_url ? (
                <a
                  href={rechnung.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  title="Archiviertes PDF anzeigen"
                >
                  <IconFolder className="w-3.5 h-3.5 inline text-emerald-700" /> <span className="hidden sm:inline">Im Archiv gesichert</span><span className="sm:hidden">Archiviert</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPrintView(true)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                  title="PDF generieren und im Archiv ablegen"
                >
                  <IconFolder className="w-3.5 h-3.5 inline text-amber-700" /> <span className="hidden sm:inline">Noch nicht archiviert</span><span className="sm:hidden">Nicht archiviert</span>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Row 2: Status Dropdown + Primary Action + Icon Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-nowrap">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isUpdating || userRole === 'treuhand'}
            className={`min-w-0 max-w-[125px] sm:max-w-none flex-1 sm:flex-none px-2.5 sm:px-4 py-2 sm:py-2.5 min-h-[44px] sm:min-h-0 text-xs sm:text-sm font-bold rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all cursor-pointer focus:ring-primary-500/30 truncate ${
              status === 'Entwurf' ? 'bg-neutral-100 text-text-primary border-transparent hover:bg-neutral-200' :
              status === 'Versendet' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' :
              status === 'Bezahlt' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' :
              status === 'Überfällig' ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' :
              'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
            }`}
          >
            <option value="Entwurf" disabled={status === 'Bezahlt' || status === 'Storniert'}>Entwurf {status === 'Bezahlt' || status === 'Storniert' ? '(gesperrt)' : ''}</option>
            <option value="Versendet" disabled={status === 'Bezahlt' || status === 'Storniert'}>Versendet</option>
            <option value="Teilbezahlt" disabled={status === 'Bezahlt' || status === 'Storniert'}>Teilbezahlt</option>
            <option value="Bezahlt">Bezahlt</option>
            <option value="Überfällig" disabled={status === 'Bezahlt' || status === 'Storniert'}>Überfällig</option>
            <option value="Storniert">Storniert</option>
          </select>
          
          {/* Main Action: PDF View or Edit */}
          {isEditing && (
            <button
              onClick={() => setShowLivePreview(!showLivePreview)}
              className={`hidden xl:inline-flex items-center gap-2 px-4 py-2.5 font-bold text-sm rounded-xl transition-colors shadow-sm cursor-pointer border ${
                showLivePreview ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-surface border-border text-text-secondary'
              }`}
              title="Split-Screen Live-Vorschau (nur Desktop)"
            >
              <IconEye className={`w-4 h-4 ${showLivePreview ? 'text-primary-700' : 'text-text-secondary'}`} />
              <span>{showLivePreview ? 'Live-Vorschau an' : 'Live-Vorschau aus'}</span>
            </button>
          )}

          {/* Edit Button */}
          {!isEditing && userRole !== 'treuhand' && status === 'Entwurf' && (
            <button
              onClick={startEditing}
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 min-h-[44px] sm:min-h-0 bg-surface border border-primary-200 text-primary-700 font-bold text-xs sm:text-sm rounded-xl hover:bg-primary-50 transition-colors cursor-pointer shadow-sm shrink-0"
            >
              <IconEdit className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rechnung bearbeiten</span>
              <span className="sm:hidden">Bearbeiten</span>
            </button>
          )}

          {/* Mahnwesen Button */}
          {userRole !== 'treuhand' && status !== 'Bezahlt' && status !== 'Storniert' && (status === 'Überfällig' || status === 'Gemahnt' || rechnung?.daten?.mahnstopp || (rechnung.daten?.mahnungen && rechnung.daten.mahnungen.length > 0)) && (
            <button
              type="button"
              onClick={() => setShowMahnungModal(true)}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer shadow-xs border shrink-0 ${
                rechnung?.daten?.mahnstopp
                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                  : status === 'Gemahnt'
                    ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                    : 'bg-orange-50 text-orange-800 border-orange-300 hover:bg-orange-100'
              }`}
              title="Schweizer Mahnwesen öffnen"
            >
              <IconWarning className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">
                {rechnung?.daten?.mahnstopp 
                  ? 'Mahnstopp' 
                  : rechnung?.daten?.mahnstufe 
                    ? `Mahnstufe ${rechnung.daten.mahnstufe}` 
                    : 'Mahnen'}
              </span>
              <span className="sm:hidden">Mahnen</span>
            </button>
          )}

          {/* PDF Button */}
          <button
            onClick={() => setShowPrintView(true)}
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 p-2 sm:px-4 sm:py-2.5 min-w-[40px] min-h-[44px] sm:min-w-0 sm:min-h-0 bg-primary-600 text-white font-bold text-xs sm:text-sm rounded-xl hover:bg-primary-700 transition-colors shadow-md shadow-primary-600/20 active:scale-[0.98] cursor-pointer shrink-0"
            title="PDF anzeigen"
            aria-label="PDF anzeigen"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span className="hidden sm:inline">PDF anzeigen</span>
          </button>
          
          {userRole !== 'treuhand' && (
          <div className="relative shrink-0">
            <button 
              onClick={() => setShowActionMenu(!showActionMenu)}
              className="p-2 min-w-[40px] min-h-[44px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center bg-surface border border-border text-text-secondary rounded-xl hover:text-text-primary hover:bg-neutral-50 transition-colors cursor-pointer shrink-0"
              aria-label="Aktionsmenü"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
            </button>
            
            {showActionMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowActionMenu(false)}></div>
                <div className="absolute right-0 top-12 w-56 bg-surface-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-slide-in-right sm:animate-fade-in-up">
                  <div className="p-1">
                    <button 
                      onClick={() => { setShowActionMenu(false); setShowMahnungModal(true); }}
                      disabled={isDirty || isEditing}
                      className="w-full text-left px-3 py-2 text-sm font-medium text-text-primary hover:bg-neutral-100 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <IconWarning className="w-4 h-4 text-orange-600 shrink-0" />
                      <span>Mahnwesen (Stufen 1–3)</span>
                    </button>
                    {(rechnung?.daten?.mahnstufe >= 3 || (rechnung?.daten?.mahnungen || []).some(m => m.stufe >= 3)) && (
                      <button 
                        onClick={() => { setShowActionMenu(false); setShowBetreibungsModal(true); }}
                        disabled={isDirty || isEditing}
                        className="w-full text-left px-3 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <IconDocument className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Betreibung (Art. 67 SchKG)</span>
                      </button>
                    )}
                    <button 
                      onClick={() => { setShowActionMenu(false); openPlanTermin('Zahlungserinnerung'); }}
                      disabled={isDirty || isEditing}
                      className="w-full text-left px-3 py-2 text-sm font-medium text-text-primary hover:bg-neutral-100 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <IconCalendar className="w-4 h-4 text-primary-600 shrink-0" />
                      <span>Zahlungserinnerung / Termin</span>
                    </button>
                    <button 
                      onClick={() => { setShowActionMenu(false); setShowDuplicateModal(true); }}
                      disabled={isDirty || isEditing}
                      className="w-full text-left px-3 py-2 text-sm font-medium text-text-primary hover:bg-neutral-100 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <IconDuplicate className="w-4 h-4 text-primary-600 shrink-0" />
                      <span>Duplizieren</span>
                    </button>
                    <button 
                      onClick={() => { setShowActionMenu(false); setShowGutschriftModal(true); }}
                      disabled={isDirty || isEditing}
                      className="w-full text-left px-3 py-2 text-sm font-medium text-text-primary hover:bg-neutral-100 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <IconQrBill className="w-4 h-4 text-primary-600 shrink-0" />
                      <span>Gutschrift erstellen</span>
                    </button>
                    <button 
                      onClick={() => {
                        setShowActionMenu(false);
                        if (rechnung.is_archived) {
                          setShowRestoreModal(true);
                        } else {
                          setShowArchiveModal(true);
                        }
                      }}
                      disabled={isEditing}
                      className="w-full text-left px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <IconPackage className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>{rechnung.is_archived ? 'Wiederherstellen' : 'Archivieren'}</span>
                    </button>
                    <button 
                      onClick={() => {
                        setShowActionMenu(false);
                        if (status !== 'Entwurf') {
                          showToast('error', 'Nur Entwürfe können gelöscht werden. Bitte storniere oder archiviere diese Rechnung stattdessen.')
                        } else {
                          setShowDeleteWarning(true);
                        }
                      }}
                      disabled={isEditing}
                      className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer mt-1 border-t border-border pt-2"
                    >
                      <IconTrash className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Rechnung löschen</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Archived Banner */}
      {rechnung.is_archived && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm flex items-center justify-between gap-3 mt-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <IconFolder className="w-5 h-5 text-amber-800 shrink-0" />
            <span>Diese Rechnung ist <strong>archiviert</strong>.</span>
          </div>
          <button
            onClick={() => setShowRestoreModal(true)}
            className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Wiederherstellen
          </button>
        </div>
      )}

      {/* Schweizer Mahnwesen Banner */}
      {!rechnung.is_archived && userRole !== 'treuhand' && (
        <>
          {rechnung?.daten?.mahnstopp ? (
            <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-xl text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 animate-fade-in shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-base">⏸️</span>
                <div>
                  <span className="font-bold">Mahnstopp aktiv:</span>{' '}
                  <span>{rechnung.daten.mahnstopp_grund || 'Automatische Mahnungen pausiert (z.B. wegen Klärung/Ratenzahlung)'}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMahnungModal(true)}
                className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
              >
                Mahnstopp anpassen / aufheben
              </button>
            </div>
          ) : (status === 'Überfällig' || status === 'Gemahnt') && (
            <div className={`border px-4 py-3 rounded-xl text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 animate-fade-in shadow-xs ${
              mahnvorschlag.status === 'betreibung_bereit'
                ? 'bg-rose-50 border-rose-300 text-rose-950'
                : status === 'Gemahnt'
                  ? 'bg-orange-50 border-orange-200 text-orange-950'
                  : 'bg-red-50 border-red-200 text-red-950'
            }`}>
              <div className="flex items-start sm:items-center gap-2.5">
                <IconWarning className={`w-5 h-5 mt-0.5 sm:mt-0 shrink-0 ${
                  mahnvorschlag.status === 'betreibung_bereit' ? 'text-rose-600' : 'text-orange-600'
                }`} />
                <div>
                  <span className="font-bold">
                    {mahnvorschlag.status === 'betreibung_bereit' 
                      ? 'SchKG-Betreibung bereit:' 
                      : rechnung?.daten?.mahnstufe 
                        ? `Mahnstufe ${rechnung.daten.mahnstufe} aktiv:` 
                        : 'Rechnung überfällig:'}
                  </span>{' '}
                  <span className="text-xs sm:text-sm">{mahnvorschlag.empfehlung}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowMahnungModal(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs ${
                    mahnvorschlag.status === 'betreibung_bereit'
                      ? 'bg-neutral-800 hover:bg-neutral-900 text-white'
                      : 'bg-primary-600 hover:bg-primary-700 text-white'
                  }`}
                >
                  {mahnvorschlag.status === 'betreibung_bereit'
                    ? 'Mahnung / Eskalation'
                    : `Mahnung Stufe ${mahnvorschlag.naechsteStufe || 1} erstellen`}
                </button>

                {mahnvorschlag.status === 'betreibung_bereit' && (
                  <button
                    type="button"
                    onClick={() => setShowBetreibungsModal(true)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    Betreibung vorbereiten →
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Warnung bei ungespeicherten Änderungen, falls man Quick Actions nutzen will */}
      {(isDirty || isEditing) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm flex items-start gap-3 mt-4">
          <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <strong>Ungespeicherte Änderungen:</strong> Bitte speichere die Rechnung zuerst ab, bevor du Aktionen ausführst.
          </div>
        </div>
      )}

      

      {/* Mobile / Tablet Tab Switcher (Sticky Sub-Header for < xl screens) */}
      {isEditing && (
        <div className="xl:hidden sticky top-0 sm:top-2 z-20 bg-surface/95 backdrop-blur-md border-b border-border py-2 px-3 mb-4 -mx-4 sm:-mx-6 sm:px-6 shadow-xs flex items-center justify-center">
          <div className="grid grid-cols-2 bg-neutral-100 p-1 rounded-xl border border-neutral-200/80 shadow-inner w-full max-w-sm">
            <button
              type="button"
              onClick={() => setMobileEditTab('form')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                mobileEditTab === 'form'
                  ? 'bg-white text-primary-700 shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <IconEdit className="w-3.5 h-3.5" />
              <span>Bearbeiten</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileEditTab('preview')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                mobileEditTab === 'preview'
                  ? 'bg-white text-primary-700 shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <IconEye className="w-3.5 h-3.5" />
              <span>A4-Vorschau</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-4 p-6 w-full animate-pulse bg-surface-card rounded-2xl border border-border shadow-xs">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded w-full"></div>
          <div className="h-20 bg-gray-200 rounded w-full"></div>
        </div>
      ) : (
        <div className={(showLivePreview || mobileEditTab === 'preview') && isEditing ? "grid grid-cols-1 xl:grid-cols-2 gap-6" : ""}>
          <div className={`animate-fade-in ${isEditing && mobileEditTab === 'preview' ? 'hidden xl:block' : 'block'}`}>
            <div className={`grid grid-cols-1 ${!(showLivePreview && isEditing) ? 'lg:grid-cols-12' : ''} gap-8 items-start`}>
              
              {/* ================= LEFT COLUMN: DOKUMENTENFLUSS ================= */}
              <div className={`${!(showLivePreview && isEditing) ? 'lg:col-span-8' : ''} space-y-6`}>
                
                {/* Edit Mode Alert Badge */}
                {isEditing && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold shadow-2xs">
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    Bearbeitungsmodus aktiv – Änderungen werden erst beim Speichern übernommen
                  </div>
                )}

                {/* Status-Banner: Teilbezahlt */}
                {status === 'Teilbezahlt' && (
                  <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-2xs animate-fade-in">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                        <IconClock className="w-5 h-5 text-purple-700" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-purple-900">Teilweise bezahlt</p>
                        <p className="text-xs text-purple-700 mt-0.5">
                          Bisher bezahlt: <strong className="font-semibold">CHF {formatMoney(rechnung.bezahlt)}</strong> von CHF {formatMoney(rechnung.total)}
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-purple-600 block uppercase font-bold tracking-wider">Restforderung</span>
                      <span className="text-lg font-bold text-purple-900">
                        CHF {formatMoney(Math.max(0, (parseFloat(rechnung.total) || 0) - (parseFloat(rechnung.bezahlt) || 0)))}
                      </span>
                    </div>
                  </div>
                )}

                {/* Status-Banner: Bezahlt */}
                {status === 'Bezahlt' && rechnung.bezahlt_am && (
                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-2xs animate-fade-in">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                        <IconCheck className="w-5 h-5 text-emerald-800" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-900">Vollständig bezahlt am {formatDate(rechnung.bezahlt_am)}</p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          Eingang: <strong className="font-semibold">CHF {formatMoney(rechnung.bezahlt)}</strong>
                          {rechnung.daten?.skonto_betrag > 0 && ` (inkl. CHF ${formatMoney(rechnung.daten.skonto_betrag)} Skonto / Art. 41 MWSTG)`}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg self-start sm:self-center">
                      Ausgeglichen
                    </span>
                  </div>
                )}

                {/* Das Dokument: Einleitung + Leistungsverzeichnis + Konditionen + Schlusstext */}
                <div className="bg-surface-card rounded-2xl border border-border shadow-xs overflow-hidden">
                  
                  {/* Einleitungstext Header */}
                  {isEditing && (
                    <div className="p-5 border-b border-border bg-surface/40 space-y-3">
                      <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block">
                        Einleitungstext (erscheint auf dem PDF)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: 'Standard', text: 'Wir erlauben uns, für unsere Arbeiten wie folgt Rechnung zu stellen:' },
                          { label: 'Akonto', text: 'Wir erlauben uns, für das oben genannte Projekt folgende Akontorechnung zu stellen:' },
                          { label: 'Schlussrechnung', text: 'Wir danken für den geschätzten Auftrag und stellen für die ausgeführten Arbeiten wie folgt Rechnung:' },
                        ].map((tpl) => (
                          <button
                            key={tpl.label}
                            type="button"
                            onClick={() => setEditEinleitung(tpl.text)}
                            className={`px-3 py-1.5 min-h-[36px] sm:min-h-0 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                              editEinleitung === tpl.text
                                ? 'bg-primary-100 border-primary-300 text-primary-700'
                                : 'bg-surface border-border text-text-secondary hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200'
                            }`}
                          >
                            {tpl.label}
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={editEinleitung}
                        onChange={(e) => setEditEinleitung(e.target.value)}
                        className="w-full h-24 sm:h-20 px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none"
                        placeholder="Wir erlauben uns, für unsere Arbeiten wie folgt Rechnung zu stellen:"
                      />
                    </div>
                  )}

                  {!isEditing && daten.einleitungstext && (
                    <div className="p-5 border-b border-border bg-surface/20">
                      <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{daten.einleitungstext}</p>
                    </div>
                  )}

                  {/* Header Leistungsverzeichnis */}
                  <div className="p-5 border-b border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-text-primary">Leistungsverzeichnis</h3>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {leistungen.length} {leistungen.length === 1 ? 'Position' : 'Positionen'}
                      </p>
                    </div>
                    {isEditing && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-nowrap sm:flex-wrap">
                        <button
                          type="button"
                          onClick={addPosition}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-50 text-primary-700 border border-primary-200 font-semibold text-xs rounded-xl hover:bg-primary-100 transition-colors cursor-pointer shadow-2xs shrink-0"
                        >
                          <IconPlus className="w-3.5 h-3.5 text-primary-600" />
                          <span>Position hinzufügen</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowKatalogDrawer(true)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-50 text-primary-700 border border-primary-200 font-semibold text-xs rounded-xl hover:bg-primary-100 transition-colors cursor-pointer shadow-2xs shrink-0"
                        >
                          <IconBook className="w-3.5 h-3.5 text-primary-600" />
                          <span>Katalog</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* READ MODE: Positionstabelle */}
                  {!isEditing && (
                    <>
                      {leistungen.length === 0 ? (
                        <div className="p-12 text-center text-text-secondary">
                          <p className="text-sm">Keine Positionen in dieser Rechnung erfasst.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border">
                          {/* Desktop Grid Header */}
                          <div className="hidden sm:grid grid-cols-[50px_1fr_80px_70px_100px_110px] gap-3 px-5 py-3 bg-surface-card text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                            <span>Pos.</span>
                            <span>Beschreibung</span>
                            <span className="text-right">Menge</span>
                            <span>Einh.</span>
                            <span className="text-right">Preis</span>
                            <span className="text-right">Total</span>
                          </div>
                          
                          {leistungen.map((pos, idx) => {
                            const isInfo = (pos.menge === '' || pos.menge === undefined || pos.menge === null) && (pos.einzelpreis === '' || pos.einzelpreis === undefined || pos.einzelpreis === null)
                            const posTotal = isInfo ? 0 : (parseFloat(pos.menge) * parseFloat(pos.einzelpreis))
                            const isKategorie = isInfo && pos.beschreibung
                            
                            return (
                              <div key={idx} className={`p-4 sm:px-5 sm:py-3.5 hover:bg-primary-50/20 transition-colors ${isKategorie ? 'bg-primary-50/40 border-l-4 border-l-primary-500' : isInfo ? 'bg-surface/50' : ''} ${pos.optional ? 'opacity-70 bg-amber-50/20' : ''}`}>
                                
                                {/* Mobile View */}
                                <div className="sm:hidden flex justify-between items-start w-full gap-3">
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <div className={`text-sm text-text-primary ${isKategorie ? 'font-bold text-base' : 'font-medium'}`}>
                                      <span className="font-bold text-text-secondary mr-2">{pos.posNr || (idx + 1)}</span>
                                      {pos.beschreibung}
                                      {pos.optional && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Option</span>}
                                    </div>
                                    {!isInfo && (
                                      <div className="text-xs text-text-secondary mt-1">
                                        {pos.menge} {pos.einheit} à CHF {formatMoney(pos.einzelpreis)}
                                      </div>
                                    )}
                                  </div>
                                  {!isInfo && (
                                    <div className="text-sm font-bold text-text-primary shrink-0 pt-0.5 whitespace-nowrap">
                                      CHF {formatMoney(posTotal)}
                                    </div>
                                  )}
                                </div>

                                {/* Desktop Grid Row */}
                                <div className="hidden sm:grid sm:grid-cols-[50px_1fr_80px_70px_100px_110px] gap-3 items-center">
                                  <div className="text-xs font-bold text-text-secondary">
                                    {pos.posNr || (idx + 1)}
                                  </div>
                                  <div className={`text-sm text-text-primary ${isKategorie ? 'font-bold text-base' : 'font-medium'}`}>
                                    {pos.beschreibung}
                                    {pos.optional && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">Option</span>}
                                  </div>
                                  {!isInfo ? (
                                    <>
                                      <div className="text-sm text-text-secondary text-right font-medium">{pos.menge}</div>
                                      <div className="text-sm text-text-secondary font-medium">{pos.einheit}</div>
                                      <div className="text-sm text-text-secondary text-right font-medium">CHF {formatMoney(pos.einzelpreis)}</div>
                                      <div className="text-sm font-bold text-text-primary text-right">CHF {formatMoney(posTotal)}</div>
                                    </>
                                  ) : (
                                    <div className="col-span-4"></div>
                                  )}
                                </div>

                              </div>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {/* EDIT MODE: Positionen Editor */}
                  {isEditing && (
                    <div className="divide-y divide-border">
                      {editLeistungen.length === 0 ? (
                        <div className="p-12 text-center text-text-secondary">
                          Keine Positionen. Klicke auf "Position hinzufügen" um zu starten.
                        </div>
                      ) : (
                        editLeistungen.map((pos, idx) => (
                          <div key={pos._id} className={`p-4 space-y-3 ${pos.optional ? 'bg-amber-50/30' : ''}`}>
                            {/* Row 1: Controls + PosNr + Preview + Optional + Delete */}
                            <div className="flex items-center gap-2">
                              {/* Move */}
                              <div className="flex flex-col gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => movePosition(idx, -1)}
                                  disabled={idx === 0}
                                  className="p-1 min-w-[32px] min-h-[32px] flex items-center justify-center rounded hover:bg-surface text-text-secondary hover:text-text-primary disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                                  title="Nach oben"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => movePosition(idx, 1)}
                                  disabled={idx === editLeistungen.length - 1}
                                  className="p-1 min-w-[32px] min-h-[32px] flex items-center justify-center rounded hover:bg-surface text-text-secondary hover:text-text-primary disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                                  title="Nach unten"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                              </div>

                              {/* PosNr */}
                              <div className="shrink-0 w-14">
                                <input
                                  type="text"
                                  value={pos.posNr || ''}
                                  onChange={(e) => updatePosition(pos._id, 'posNr', e.target.value)}
                                  className="w-full px-2 py-1.5 min-h-[36px] bg-surface border border-border rounded-lg text-xs font-bold text-center focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                                  placeholder="1.0"
                                  title="Positionsnummer"
                                />
                              </div>

                              {/* Preview text */}
                              <div className="flex-1 text-sm font-medium text-text-primary truncate">{pos.beschreibung || <span className="text-text-secondary italic">Beschreibung...</span>}</div>

                              {/* Optional Toggle */}
                              <label className="flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[36px] px-2" title="Optionale Position">
                                <input
                                  type="checkbox"
                                  checked={pos.optional || false}
                                  onChange={(e) => updatePosition(pos._id, 'optional', e.target.checked)}
                                  className="accent-amber-500 w-4 h-4"
                                />
                                <span className="text-xs text-text-secondary font-medium hidden sm:inline">Optional</span>
                              </label>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => deletePosition(pos._id)}
                                className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-red-50 text-text-secondary hover:text-red-600 transition-colors cursor-pointer shrink-0"
                                title="Position löschen"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>

                            {/* Row 2: Full-width Description Field */}
                            <div className="pl-2 sm:pl-10">
                              <textarea
                                value={pos.beschreibung}
                                onChange={(e) => updatePosition(pos._id, 'beschreibung', e.target.value)}
                                rows={1}
                                onFocus={(e) => { e.target.rows = Math.max(2, Math.ceil(e.target.value.length / 40)); }}
                                onBlur={(e) => { e.target.rows = 1; }}
                                className="w-full px-3 py-2 min-h-[40px] bg-surface border border-border rounded-lg text-sm font-medium focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none transition-all"
                                placeholder="Beschreibung / Kategorie-Titel..."
                              />
                            </div>

                            {/* Row 3: Menge, Einheit, Preis, Total (2x2 on mobile, 4 cols on desktop) */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pl-0 sm:pl-10">
                              <div>
                                <label className="text-[11px] sm:text-xs text-text-secondary font-semibold block mb-1">Menge</label>
                                <input
                                  type="number"
                                  step="any"
                                  value={pos.menge}
                                  onChange={(e) => updatePosition(pos._id, 'menge', e.target.value)}
                                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] sm:text-xs text-text-secondary font-semibold block mb-1">Einheit</label>
                                <input
                                  type="text"
                                  value={pos.einheit || ''}
                                  onChange={(e) => updatePosition(pos._id, 'einheit', e.target.value)}
                                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                                  placeholder="m², Stk, h..."
                                />
                              </div>
                              <div>
                                <label className="text-[11px] sm:text-xs text-text-secondary font-semibold block mb-1">Einzelpreis (CHF)</label>
                                <input
                                  type="number"
                                  step="0.05"
                                  value={pos.einzelpreis}
                                  onChange={(e) => updatePosition(pos._id, 'einzelpreis', e.target.value)}
                                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                                  placeholder="0.00"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] sm:text-xs text-text-secondary font-semibold block mb-1">Total</label>
                                <div className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm font-bold text-text-primary flex items-center h-[34px] sm:h-[38px] truncate">
                                  CHF {formatMoney((parseFloat(pos.menge) || 0) * (parseFloat(pos.einzelpreis) || 0))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Edit-Mode Konditionen & Pauschalpreis inside the Document Card */}
                  {isEditing && (
                    <div className="p-5 border-t border-border bg-surface/30 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Konditionen & Steuern</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-text-secondary font-semibold block mb-1">Rabatt (%)</label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="100"
                            value={editKonditionen.rabatt}
                            onChange={(e) => setEditKonditionen(prev => ({ ...prev, rabatt: parseFloat(e.target.value) || 0 }))}
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-text-secondary font-semibold block mb-1">MwSt (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={editKonditionen.mwst}
                            onChange={(e) => setEditKonditionen(prev => ({ ...prev, mwst: parseFloat(e.target.value) || 0 }))}
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/60">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isPauschal}
                            onChange={(e) => {
                              setIsPauschal(e.target.checked)
                              if (!e.target.checked) setEditPauschalpreis(null)
                            }}
                            className="accent-primary-600"
                          />
                          <span className="text-sm font-semibold text-text-primary">Pauschalpreis verwenden</span>
                        </label>
                        {isPauschal && (
                          <div className="mt-2">
                            <label className="text-xs text-text-secondary font-semibold block mb-1">Pauschalpreis (CHF)</label>
                            <input
                              type="number"
                              step="0.05"
                              value={editPauschalpreis || ''}
                              onChange={(e) => setEditPauschalpreis(e.target.value)}
                              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                              placeholder="z.B. 15000"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SIA 118 Schlussrechnung Editor Section */}
                  {isEditing && (
                    <div className="p-5 border-t border-border bg-amber-50/25 space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="sia118_toggle"
                            checked={editSia118Aktiv}
                            onChange={(e) => setEditSia118Aktiv(e.target.checked)}
                            className="accent-amber-600 w-4 h-4 cursor-pointer"
                          />
                          <label htmlFor="sia118_toggle" className="text-sm font-bold text-text-primary cursor-pointer flex items-center gap-2">
                            <span>SIA 118 Schlussrechnung</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                              Art. 154 / 181
                            </span>
                          </label>
                        </div>
                        {editSia118Aktiv && (
                          <button
                            type="button"
                            onClick={handleImportProjectAkontos}
                            disabled={isLoadingProjectInvoices || (!projekt?.id && !rechnung.projekt_id)}
                            className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 text-xs font-bold rounded-lg hover:bg-amber-50 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {isLoadingProjectInvoices ? (
                              <svg className="animate-spin w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                              <IconRefresh className="w-3.5 h-3.5 text-amber-700" />
                            )}
                            <span>Akontos aus Projekt importieren</span>
                          </button>
                        )}
                      </div>

                      {editSia118Aktiv && (
                        <div className="space-y-4 pt-2 border-t border-amber-200/60">
                          {/* 1. Akonto-Abzüge */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-amber-950">
                                1. Anrechnung bisherige Akonto-Rechnungen (SIA 118 Art. 154)
                              </span>
                              <button
                                type="button"
                                onClick={handleAddAkontoAbzug}
                                className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                              >
                                + Akonto hinzufügen
                              </button>
                            </div>

                            {editAkontoAbzuege.length === 0 ? (
                              <div className="p-3 bg-white/70 rounded-xl border border-dashed border-amber-300 text-xs text-text-secondary text-center">
                                Noch keine Akonto-Abzüge erfasst. Klicke auf "Akontos aus Projekt importieren" oder füge manuell eine Akonto-Rechnung hinzu.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {editAkontoAbzuege.map((ak, idx) => (
                                  <div key={idx} className="p-2.5 bg-white rounded-xl border border-amber-200/80 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs">
                                    <div className="sm:col-span-5">
                                      <input
                                        type="text"
                                        value={ak.rechnung_nr || ''}
                                        onChange={(e) => handleUpdateAkontoAbzug(idx, 'rechnung_nr', e.target.value)}
                                        placeholder="Rechnungs-Nr. (z.B. RE-2026-001)"
                                        className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs"
                                      />
                                    </div>
                                    <div className="sm:col-span-3">
                                      <input
                                        type="date"
                                        value={ak.datum ? ak.datum.split('T')[0] : ''}
                                        onChange={(e) => handleUpdateAkontoAbzug(idx, 'datum', e.target.value)}
                                        className="w-full px-2 py-1.5 bg-surface border border-border rounded-lg text-xs"
                                      />
                                    </div>
                                    <div className="sm:col-span-3 flex items-center gap-1">
                                      <span className="text-text-secondary font-bold">CHF</span>
                                      <input
                                        type="number"
                                        step="0.05"
                                        value={ak.betrag}
                                        onChange={(e) => handleUpdateAkontoAbzug(idx, 'betrag', parseFloat(e.target.value) || 0)}
                                        placeholder="0.00"
                                        className="w-full px-2 py-1.5 bg-surface border border-border rounded-lg text-xs font-semibold text-right"
                                      />
                                    </div>
                                    <div className="sm:col-span-1 flex justify-end">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteAkontoAbzug(idx)}
                                        className="p-1.5 text-text-secondary hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                                        title="Löschen"
                                      >
                                        <IconTrash className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}

                                <div className="flex justify-between items-center px-3 py-1.5 bg-amber-100/50 rounded-lg text-xs font-bold text-amber-950">
                                  <span>Total Akonto-Abzüge:</span>
                                  <span>- CHF {formatMoney(editAkontoAbzuege.reduce((sum, a) => sum + parseFloat(a.betrag || 0), 0))}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 2. Garantie-Rückbehalt (SIA 118 Art. 181) */}
                          <div className="pt-3 border-t border-amber-200/60 space-y-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-950 block">
                              2. Garantie-Rückbehalt (SIA 118 Art. 181)
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-amber-200 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editRueckbehaltAktiv}
                                  onChange={(e) => setEditRueckbehaltAktiv(e.target.checked)}
                                  className="accent-amber-600 w-4 h-4"
                                />
                                <span className="text-xs font-bold text-text-primary">Garantie-Rückbehalt anwenden</span>
                              </label>

                              {editRueckbehaltAktiv && (
                                <div className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-amber-200">
                                  <span className="text-xs text-text-secondary font-medium">Satz:</span>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="50"
                                    value={editRueckbehaltProzent}
                                    onChange={(e) => setEditRueckbehaltProzent(parseFloat(e.target.value) || 0)}
                                    className="w-16 px-2 py-1 bg-surface border border-border rounded-lg text-xs font-bold text-right"
                                  />
                                  <span className="text-xs font-bold text-text-secondary">% (Standard: 5.0%)</span>
                                </div>
                              )}
                            </div>

                            {editRueckbehaltAktiv && (
                              <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-2">
                                <label className="flex items-start sm:items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editAbgeloestGarantie}
                                    onChange={(e) => setEditAbgeloestGarantie(e.target.checked)}
                                    className="accent-amber-600 w-4 h-4 mt-0.5 sm:mt-0"
                                  />
                                  <div className="text-xs">
                                    <span className="font-bold text-text-primary">Durch Bankgarantie / Versicherungsbürgschaft abgelöst</span>
                                    <span className="text-text-secondary block mt-0.5">Gemäss SIA 118 Art. 181 Abs. 3: Kein Barabzug, 100% Auszahlung bei Vorlage einer Solidarbürgschaft.</span>
                                  </div>
                                </label>

                                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs text-text-secondary flex-wrap gap-2">
                                  <span>Rügefrist nach SIA 118 Art. 172: <strong>{editGarantieDauerJahre} Jahre</strong></span>
                                  <span>Freigabe fällig: <strong>{formatDate(calculateGarantieFreigabeDatum(editStammdaten.rechnungsdatum || rechnung.rechnungsdatum || new Date().toISOString(), editGarantieDauerJahre))}</strong></span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SIA 118 Schlussabrechnung View Card */}
                  {!isEditing && isSchluss && sia118ViewCalc && (
                    <div className="p-5 border-t border-border bg-amber-50/30 space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                          <h4 className="text-sm font-bold text-amber-950 uppercase tracking-wider">
                            SIA 118 Schlussabrechnung & Baugarantie
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            Art. 154 (Akonto)
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            Art. 181 (5% Garantie)
                          </span>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-amber-200/80 overflow-hidden divide-y divide-amber-100 text-xs">
                        <div className="p-3 flex justify-between items-center bg-amber-50/40">
                          <span className="font-semibold text-text-secondary">Gesamtwerkpreis (brutto inkl. MwSt):</span>
                          <span className="font-bold text-text-primary">CHF {formatMoney(sia118ViewCalc.gesamtwerkpreis)}</span>
                        </div>

                        {sia118ViewCalc.akontoAbzuege.length > 0 && (
                          <div className="p-3 space-y-1.5">
                            <span className="font-bold text-text-secondary block mb-1">Angerechnete Akontozahlungen:</span>
                            {sia118ViewCalc.akontoAbzuege.map((ak, idx) => (
                              <div key={idx} className="flex justify-between items-center text-text-secondary pl-2">
                                <span>– Akonto {ak.rechnung_nr || `#${idx + 1}`}{ak.datum ? ` vom ${formatDate(ak.datum)}` : ''}</span>
                                <span className="font-mono font-medium text-red-600">– CHF {formatMoney(ak.betrag)}</span>
                              </div>
                            ))}
                            <div className="pt-1.5 border-t border-neutral-100 flex justify-between items-center font-semibold text-text-primary">
                              <span>Zwischentotal nach Akonto:</span>
                              <span>CHF {formatMoney(sia118ViewCalc.restbetragNachAkonto)}</span>
                            </div>
                          </div>
                        )}

                        <div className="p-3 flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-text-primary block">
                              Garantie-Rückbehalt ({sia118ViewCalc.rueckbehaltProzent}% gem. SIA 118 Art. 181)
                            </span>
                            <span className="text-[11px] text-text-secondary">
                              {sia118ViewCalc.abgeloestDurchGarantie
                                ? 'Abgelöst durch Bankgarantie / Versicherungsbürgschaft (Art. 181 Abs. 3)'
                                : `Rügefrist bis ${formatDate(sia118ViewCalc.freigabeDatum)} (2 Jahre gem. Art. 172)`}
                            </span>
                          </div>
                          <span className={`font-bold font-mono ${sia118ViewCalc.abgeloestDurchGarantie ? 'text-text-secondary' : 'text-amber-800'}`}>
                            {sia118ViewCalc.abgeloestDurchGarantie ? 'CHF 0.00 (Bürgschaft)' : `– CHF ${formatMoney(sia118ViewCalc.garantieBetrag)}`}
                          </span>
                        </div>

                        <div className="p-3.5 bg-amber-100/60 flex justify-between items-center">
                          <span className="font-bold text-sm text-amber-950">FÄLLIGER SCHLUSSBETRAG:</span>
                          <span className="font-bold text-base text-amber-950 font-mono">
                            CHF {formatMoney(sia118ViewCalc.faelligerSchlussbetrag)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Schlusstext */}
                  {(isEditing || daten.schlusstext) && (
                    <div className="p-5 border-t border-border bg-surface/20 space-y-3">
                      <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block">
                        Schlusstext
                      </label>
                      {isEditing ? (
                        <>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { label: 'Standard', text: 'Wir bitten um Überweisung des Betrags auf unser Konto innerhalb der Zahlungsfrist.' },
                              { label: 'Dank', text: 'Wir danken Ihnen für den geschätzten Auftrag und bitten um Überweisung auf untenstehendes Konto.' },
                            ].map((tpl) => (
                              <button
                                key={tpl.label}
                                type="button"
                                onClick={() => setEditSchluss(tpl.text)}
                                className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                                  editSchluss === tpl.text
                                    ? 'bg-primary-100 border-primary-300 text-primary-700'
                                    : 'bg-surface border-border text-text-secondary hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200'
                                }`}
                              >
                                {tpl.label}
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={editSchluss}
                            onChange={(e) => setEditSchluss(e.target.value)}
                            className="w-full h-20 px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none"
                            placeholder="Wir bitten um Überweisung des Betrags auf unser Konto innerhalb der Zahlungsfrist."
                          />
                        </>
                      ) : (
                        <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{daten.schlusstext}</p>
                      )}
                    </div>
                  )}

                </div>

              </div>

              {/* ================= RIGHT COLUMN: STICKY BENTO SIDEBAR ================= */}
              <div className={`${!(showLivePreview && isEditing) ? 'lg:col-span-4 lg:sticky lg:top-24' : ''} space-y-5`}>
                
                {/* 1. Live Kalkulation Card */}
                <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                      <IconMoney className="w-4 h-4 text-primary-600" />
                      <span>Kalkulation</span> {isEditing && <span className="text-primary-600 font-semibold">(Live)</span>}
                    </h3>
                    <span className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-600 font-medium rounded-full">
                      CHF
                    </span>
                  </div>

                  <div className="space-y-2.5 text-sm">
                    {activeIsSchluss && activeSia118Calc ? (
                      <>
                        <div className="flex justify-between items-center text-text-secondary">
                          <span>Gesamtwerkpreis</span>
                          <span className="font-semibold text-text-primary">
                            CHF {formatMoney(activeSia118Calc.gesamtwerkpreis)}
                          </span>
                        </div>

                        {activeSia118Calc.akontoAbzuege.length > 0 && (
                          <div className="space-y-1 py-1.5 border-y border-dashed border-border text-xs">
                            <span className="text-text-secondary block font-semibold">Akonto-Abzüge:</span>
                            {activeSia118Calc.akontoAbzuege.map((ak, idx) => (
                              <div key={idx} className="flex justify-between items-center text-red-600 pl-1.5">
                                <span>– {ak.rechnung_nr || `Akonto #${idx + 1}`}</span>
                                <span className="font-mono">– CHF {formatMoney(ak.betrag)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between items-center pt-1 font-medium text-text-primary">
                              <span>Nach Akonto-Abzug</span>
                              <span>CHF {formatMoney(activeSia118Calc.restbetragNachAkonto)}</span>
                            </div>
                          </div>
                        )}

                        {activeSia118Calc.garantieAktiv && (
                          <div className="flex justify-between items-center text-amber-900 font-medium text-xs bg-amber-50/80 p-2 rounded-lg border border-amber-200">
                            <div>
                              <span className="font-bold">Rückbehalt ({activeSia118Calc.rueckbehaltProzent}%)</span>
                              <span className="block text-[10px] text-amber-700">
                                {activeSia118Calc.abgeloestDurchGarantie ? 'SIA 118 Art. 181 Abs. 3 (Bürgschaft)' : 'SIA 118 Art. 181'}
                              </span>
                            </div>
                            <span className="font-mono font-bold">
                              {activeSia118Calc.abgeloestDurchGarantie ? 'CHF 0.00' : `– CHF ${formatMoney(activeSia118Calc.garantieBetrag)}`}
                            </span>
                          </div>
                        )}

                        <div className="pt-3 border-t-2 border-primary-500 flex justify-between items-baseline bg-primary-50/40 p-2.5 rounded-xl border border-primary-200">
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-primary-950 block">Fälliger Betrag</span>
                            <span className="text-[10px] text-primary-700 font-medium">Schlusszahlung</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xl sm:text-2xl font-bold text-primary-950 tracking-tight block font-mono">
                              CHF {formatMoney(activeSia118Calc.faelligerSchlussbetrag)}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center text-text-secondary">
                          <span>Zwischensumme</span>
                          <span className="font-semibold text-text-primary">
                            CHF {formatMoney(isEditing ? editRawTotal : rawTotal)}
                          </span>
                        </div>

                        {(isEditing ? editKonditionen.rabatt : rabatt) > 0 && (
                          <div className="flex justify-between items-center text-red-600 font-medium">
                            <span>Rabatt ({isEditing ? editKonditionen.rabatt : rabatt}%)</span>
                            <span>- CHF {formatMoney(isEditing ? editRabattBetrag : rabattBetrag)}</span>
                          </div>
                        )}

                        {(isEditing ? editKonditionen.mwst : mwst) > 0 && (
                          <div className="flex justify-between items-center text-text-secondary">
                            <span>MwSt ({isEditing ? editKonditionen.mwst : mwst}%)</span>
                            <span className="font-medium text-text-primary">
                              CHF {formatMoney(isEditing ? editMwstBetrag : mwstBetrag)}
                            </span>
                          </div>
                        )}

                        {isEditing && isPauschal && editPauschalpreis && (
                          <div className="flex justify-between items-center text-amber-700 font-medium text-xs bg-amber-50 px-2 py-1 rounded-md">
                            <span className="inline-flex items-center gap-1"><IconFlash className="w-3.5 h-3.5" /> Pauschalpreis fixiert</span>
                            <span>aktiv</span>
                          </div>
                        )}

                        <div className="pt-3 border-t border-border flex justify-between items-baseline">
                          <span className="text-base font-bold text-text-primary">Total</span>
                          <div className="text-right">
                            <span className="text-2xl font-bold text-text-primary tracking-tight block">
                              CHF {formatMoney(isEditing ? editFinalTotal : finalTotal)}
                            </span>
                          </div>
                        </div>
                      </>
                    )}

                    {(isEditing ? editOptionalTotal : optionenTotal) > 0 && (
                      <div className="pt-2 border-t border-dashed border-border flex justify-between text-xs text-text-secondary">
                        <span>Zzgl. Optionen</span>
                        <span className="font-medium">
                          CHF {formatMoney(isEditing ? editOptionalTotal : optionenTotal)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Zahlungseingang & OP-Spiegel Card (für Versendet, Überfällig, Teilbezahlt) */}
                {(status === 'Versendet' || status === 'Überfällig' || status === 'Teilbezahlt') && (
                  <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                        <IconCreditCard className="w-4 h-4 text-primary-600" />
                        <span>Zahlungseingang</span>
                      </h3>
                      {parseFloat(rechnung.bezahlt) > 0 && (
                        <span className="text-xs text-purple-700 bg-purple-50 font-bold px-2 py-0.5 rounded-full border border-purple-200">
                          Teilbezahlt
                        </span>
                      )}
                    </div>

                    {!showPaymentForm ? (
                      status !== 'Bezahlt' && userRole !== 'treuhand' && (
                        <div className="space-y-3">
                          <div className="p-3 bg-surface rounded-xl border border-border/70 space-y-1.5 text-xs">
                            <div className="flex justify-between text-text-secondary">
                              <span>Rechnungsbetrag:</span>
                              <span className="font-semibold text-text-primary">CHF {formatMoney(rechnung.total)}</span>
                            </div>
                            {parseFloat(rechnung.bezahlt) > 0 && (
                              <div className="flex justify-between text-text-secondary">
                                <span>Bisher bezahlt:</span>
                                <span className="font-semibold text-emerald-600">CHF {formatMoney(rechnung.bezahlt)}</span>
                              </div>
                            )}
                            <div className="flex justify-between border-t border-border pt-1.5 font-bold">
                              <span>Noch offen:</span>
                              <span className="text-amber-700">
                                CHF {formatMoney(Math.max(0, (parseFloat(rechnung.total) || 0) - (parseFloat(rechnung.bezahlt) || 0)))}
                              </span>
                            </div>
                          </div>

                          <button 
                            type="button"
                            onClick={() => {
                              const curOpen = Math.max(0, Math.round(((parseFloat(rechnung.total) || 0) - (parseFloat(rechnung.bezahlt) || 0)) * 100) / 100)
                              setPaymentAmount(curOpen > 0 ? curOpen.toFixed(2) : (rechnung.total || 0))
                              setPaymentType('skonto')
                              setShowPaymentForm(true)
                            }}
                            disabled={isUpdating}
                            className="w-full py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer text-center shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <IconMoney className="w-4 h-4" />
                            <span>Zahlung erfassen</span>
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="space-y-3 p-4 bg-emerald-50/70 rounded-xl border border-emerald-200">
                        {parseFloat(rechnung.bezahlt) > 0 && (
                          <div className="text-xs text-emerald-900 bg-white/80 p-2.5 rounded-lg space-y-1 border border-emerald-100">
                            <div className="flex justify-between"><span>Total:</span> <span className="font-semibold">CHF {formatMoney(rechnung.total)}</span></div>
                            <div className="flex justify-between"><span>Bezahlt:</span> <span className="font-semibold">CHF {formatMoney(rechnung.bezahlt)}</span></div>
                            <div className="flex justify-between border-t border-emerald-200/60 pt-1 font-bold">
                              <span>Noch offen:</span> 
                              <span>CHF {formatMoney(Math.max(0, (parseFloat(rechnung.total) || 0) - (parseFloat(rechnung.bezahlt) || 0)))}</span>
                            </div>
                          </div>
                        )}
                        <div>
                          <label className="text-xs font-bold text-emerald-800 block mb-1">Datum</label>
                          <input 
                            type="date"
                            value={paymentDate}
                            onChange={e => setPaymentDate(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-emerald-800 block mb-1">Betrag (CHF)</label>
                          <input 
                            type="number"
                            step="0.05"
                            value={paymentAmount}
                            onChange={e => setPaymentAmount(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 font-semibold"
                          />
                        </div>

                        {/* Skonto / Teilzahlung Option if payment < open amount */}
                        {(() => {
                          const curOpen = Math.max(0, Math.round(((parseFloat(rechnung.total) || 0) - (parseFloat(rechnung.bezahlt) || 0)) * 100) / 100)
                          const curAmount = parseFloat(paymentAmount) || 0
                          const diff = Math.round((curOpen - curAmount) * 100) / 100
                          if (diff > 0.05) {
                            return (
                              <div className="p-2.5 bg-white rounded-lg border border-emerald-200 space-y-2 text-xs">
                                <div className="font-bold text-gray-800 flex justify-between">
                                  <span>Differenz:</span>
                                  <span className="text-amber-700 font-semibold">CHF {diff.toFixed(2)}</span>
                                </div>
                                <label className="flex items-start gap-2 cursor-pointer text-gray-700 hover:bg-gray-50 p-1 rounded transition-colors">
                                  <input 
                                    type="radio" 
                                    name="paymentType" 
                                    value="skonto" 
                                    checked={paymentType === 'skonto'} 
                                    onChange={() => setPaymentType('skonto')}
                                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500" 
                                  />
                                  <div>
                                    <span className="font-semibold text-emerald-900 block">Skonto (Konto 3800)</span>
                                    <span className="text-gray-500 text-[11px]">Rechnung gilt als vollständig ausgeglichen (Art. 41 MWSTG).</span>
                                  </div>
                                </label>
                                <label className="flex items-start gap-2 cursor-pointer text-gray-700 hover:bg-gray-50 p-1 rounded transition-colors">
                                  <input 
                                    type="radio" 
                                    name="paymentType" 
                                    value="teil" 
                                    checked={paymentType === 'teil'} 
                                    onChange={() => setPaymentType('teil')}
                                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500" 
                                  />
                                  <div>
                                    <span className="font-semibold text-purple-900 block">Teilzahlung</span>
                                    <span className="text-gray-500 text-[11px]">Restbetrag von CHF {diff.toFixed(2)} bleibt offen.</span>
                                  </div>
                                </label>
                              </div>
                            )
                          }
                          return null
                        })()}

                        <div className="flex gap-2 pt-1">
                          <button 
                            type="button"
                            onClick={handlePayment}
                            className="flex-1 py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer"
                          >
                            Bestätigen
                          </button>
                          <button 
                            type="button"
                            onClick={() => setShowPaymentForm(false)}
                            className="px-3 py-2 bg-white text-emerald-700 border border-emerald-200 font-bold text-xs rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Rechnungsdaten & Fristen Card */}
                <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                    <IconClock className="w-4 h-4 text-primary-600" />
                    <span>Fristen & Rechnungsdaten</span>
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-text-secondary font-semibold block mb-1">Rechnungsdatum</label>
                      {status === 'Entwurf' && userRole !== 'treuhand' ? (
                        <input 
                          type="date"
                          value={editStammdaten.rechnungsdatum || ''}
                          onChange={(e) => handleStammInputChange('rechnungsdatum', e.target.value)}
                          className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                        />
                      ) : (
                        <div className="text-sm font-semibold text-text-primary px-3 py-2 bg-surface rounded-xl border border-border/60">
                          {formatDate(editStammdaten.rechnungsdatum || rechnung.rechnungsdatum)}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-text-secondary font-semibold block mb-1">Zahlungsfrist (Tage)</label>
                      {status === 'Entwurf' && userRole !== 'treuhand' ? (
                        <input 
                          type="number"
                          value={editStammdaten.zahlungsfrist_tage || 30}
                          onChange={(e) => handleStammInputChange('zahlungsfrist_tage', parseInt(e.target.value) || 30)}
                          className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                        />
                      ) : (
                        <div className="text-sm font-semibold text-text-primary px-3 py-2 bg-surface rounded-xl border border-border/60">
                          {editStammdaten.zahlungsfrist_tage || rechnung.zahlungsfrist_tage || 30} Tage
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-text-secondary font-semibold block">Fälligkeitsdatum</label>
                        {(rechnung.faellig_am || rechnung.daten?.faellig_am) && onNavigate && (
                          <button
                            type="button"
                            onClick={() => onNavigate('kalender', { date: rechnung.faellig_am || rechnung.daten?.faellig_am })}
                            className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Im Kalender ansehen"
                          >
                            <IconCalendar className="w-3.5 h-3.5" />
                            <span>Im Kalender ansehen</span>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </button>
                        )}
                      </div>
                      <div className="px-3 py-2 bg-surface rounded-xl border border-border/60 text-sm font-semibold text-text-primary flex items-center justify-between">
                        <span>{rechnung.faellig_am || rechnung.daten?.faellig_am ? formatDate(rechnung.faellig_am || rechnung.daten?.faellig_am) : 'Wird automatisch berechnet'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Stammdaten (Kunde, Projekt, Bankverbindung) */}
                <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                    <IconBuilding className="w-4 h-4 text-primary-600" />
                    <span>Stammdaten & Zuweisung</span>
                  </h3>

                  <div className="space-y-3 text-sm">
                    {/* Kunde */}
                    <div className="p-3 bg-surface rounded-xl border border-border/60 space-y-0.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block">Kunde</span>
                      <button 
                        type="button"
                        onClick={() => kunde && onNavigate && onNavigate('kunden', { kundeId: kunde.id })}
                        className="font-semibold text-primary-600 hover:text-primary-800 transition-colors text-left truncate block w-full cursor-pointer"
                      >
                        {kunde ? kunde.name : 'Unbekannter Kunde'}
                      </button>
                      {kunde?.ort && <p className="text-xs text-text-secondary truncate">{kunde.ort}</p>}
                    </div>

                    {/* Projekt */}
                    <div className="p-3 bg-surface rounded-xl border border-border/60 space-y-0.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block">Projekt / Baustelle</span>
                      <button 
                        type="button"
                        onClick={() => projekt && onNavigate && onNavigate('projekte', { projektId: projekt.id })}
                        className="font-semibold text-primary-600 hover:text-primary-800 transition-colors text-left truncate block w-full cursor-pointer"
                      >
                        {projekt ? projekt.name : 'Kein Projekt zugeordnet'}
                      </button>
                      {projekt?.adresse && <p className="text-xs text-text-secondary truncate">{projekt.adresse}</p>}
                    </div>

                    {/* Offerte Link */}
                    {rechnung.offerte_id && (
                      <div className="p-3 bg-surface rounded-xl border border-border/60 space-y-0.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block">Ursprungs-Offerte</span>
                        <button 
                          type="button"
                          onClick={() => onNavigate && onNavigate('offerten', { offerteId: rechnung.offerte_id })}
                          className="font-semibold text-primary-600 hover:text-primary-800 transition-colors text-left truncate block w-full underline cursor-pointer"
                        >
                          Offerte #{rechnung.offerte_id} öffnen
                        </button>
                      </div>
                    )}

                    {/* Rechnungstyp */}
                    <div className="p-3 bg-surface rounded-xl border border-border/60 flex items-center justify-between text-xs">
                      <span className="text-text-secondary font-medium">Rechnungstyp:</span>
                      <span className="font-bold text-text-primary capitalize flex items-center gap-1.5">
                        {(rechnung.typ === 'schluss' || daten?.is_schlussrechnung || daten?.sia118?.aktiv) ? (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[11px]">
                            SIA 118 Schlussrechnung
                          </span>
                        ) : (
                          <>
                            {rechnung.typ || 'gesamt'}
                            {rechnung.typ === 'akonto' && rechnung.akonto_prozent && ` (${rechnung.akonto_prozent}%)`}
                          </>
                        )}
                      </span>
                    </div>

                      {/* Bankverbindung */}
                      <div className="p-3 bg-surface rounded-xl border border-border/60 text-xs space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block">Zahlungsverbindung</span>
                        {(settings?.bankverbindung || settings?.qr_iban || settings?.iban) ? (
                          <>
                            <p className="text-text-primary font-mono text-[11px] font-medium">
                              IBAN: {settings.bankverbindung || settings.iban || settings.qr_iban}
                            </p>
                            {settings.qr_iban && settings.qr_iban !== (settings.bankverbindung || settings.iban) && (
                              <p className="text-text-secondary font-mono text-[10px]">
                                QR-IBAN: {settings.qr_iban}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-text-secondary italic">Keine IBAN in den Einstellungen hinterlegt.</p>
                        )}
                      </div>
                  </div>
                </div>

                {/* 5. Interne Notizen Card */}
                <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                      <IconNotes className="w-4 h-4 text-primary-600" />
                      <span>Interne Notizen</span>
                    </h3>
                  </div>
                  <textarea 
                    value={editStammdaten.notizen || ''}
                    onChange={(e) => handleStammInputChange('notizen', e.target.value)}
                    disabled={userRole === 'treuhand' || status !== 'Entwurf'}
                    className="w-full h-24 px-3 py-2 bg-surface border border-border rounded-xl text-xs focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none disabled:opacity-50 disabled:bg-gray-50"
                    placeholder="Absprachen, Zahlungsversprechen, Besonderheiten..."
                  />
                </div>

                {/* 6. Schweizer Mahnwesen & Historie Card */}
                {userRole !== 'treuhand' && (
                  <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                        <IconWarning className="w-4 h-4 text-orange-600" />
                        <span>Mahnwesen & SchKG</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowMahnungModal(true)}
                        className="text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors cursor-pointer"
                      >
                        {rechnung?.daten?.mahnstopp ? 'Mahnstopp anpassen' : 'Mahnung öffnen →'}
                      </button>
                    </div>

                    {rechnung?.daten?.mahnstopp ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span>⏸️</span>
                          <span>Mahnstopp aktiv</span>
                        </div>
                        <p className="text-text-secondary">
                          {rechnung.daten.mahnstopp_grund || 'Automatische Mahnungen sind für diese Rechnung pausiert.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary">Aktuelle Mahnstufe:</span>
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            rechnung?.daten?.mahnstufe >= 3
                              ? 'bg-rose-100 text-rose-800'
                              : rechnung?.daten?.mahnstufe === 2
                                ? 'bg-orange-100 text-orange-800'
                                : rechnung?.daten?.mahnstufe === 1
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-neutral-100 text-neutral-700'
                          }`}>
                            {rechnung?.daten?.mahnstufe ? `Stufe ${rechnung.daten.mahnstufe}` : 'Keine (Normallauf)'}
                          </span>
                        </div>

                        {/* Mahnhistorie Liste */}
                        {Array.isArray(rechnung?.daten?.mahnungen) && rechnung.daten.mahnungen.length > 0 ? (
                          <div className="space-y-2 pt-2 border-t border-border/60">
                            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block">
                              Mahnverlauf ({rechnung.daten.mahnungen.length})
                            </span>
                            {rechnung.daten.mahnungen.map((m, idx) => (
                              <div
                                key={m.id || idx}
                                className="p-2.5 bg-surface rounded-xl border border-border/60 flex items-center justify-between text-xs"
                              >
                                <div>
                                  <div className="font-semibold text-text-primary">
                                    {m.titel || `Mahnung Stufe ${m.stufe}`}
                                  </div>
                                  <div className="text-[11px] text-text-muted">
                                    {formatDate(m.datum)} • Frist: {m.fristTage}T
                                    {m.spesen > 0 && ` • +${formatMoney(m.spesen)} Spesen`}
                                    {m.verzugszins > 0 && ` • +${formatMoney(m.verzugszins)} Zins`}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMahnung(m)
                                    setShowMahnungPrintView(true)
                                  }}
                                  className="p-1.5 hover:bg-neutral-100 rounded-lg text-primary-600 transition-colors cursor-pointer"
                                  title="Mahnung anzeigen & drucken"
                                >
                                  <IconPrinter className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-text-muted italic">
                            Bisher keine Mahnungen erfasst.
                          </p>
                        )}

                        {/* Button für Betreibung bei Stufe 3 */}
                        {(rechnung?.daten?.mahnstufe >= 3 || (rechnung?.daten?.mahnungen || []).some(m => m.stufe >= 3)) && (
                          <button
                            type="button"
                            onClick={() => setShowBetreibungsModal(true)}
                            className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <IconDocument className="w-4 h-4 text-rose-600" />
                            <span>Betreibungsbegehren (Art. 67 SchKG)</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Stammdaten Save Action */}
                {isDirty && userRole !== 'treuhand' && status === 'Entwurf' && (
                  <div className="pt-2 animate-fade-in">
                    <button 
                      type="button"
                      onClick={handleSaveStammdaten}
                      disabled={isUpdating}
                      className="w-full py-2.5 bg-primary-600 text-white font-bold text-sm rounded-xl hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {isUpdating ? 'Wird gespeichert...' : 'Stammdaten speichern'}
                    </button>
                  </div>
                )}

              </div>

            </div>
          </div>
        {isEditing && (
          <div className={`bg-gray-100 rounded-2xl border border-border overflow-hidden sticky top-6 shadow-inner ${
            mobileEditTab === 'preview' ? 'block mb-24 min-h-[calc(100vh-180px)]' : (showLivePreview ? 'hidden xl:block' : 'hidden')
          }`} style={{ height: 'calc(100vh - 120px)' }}>
            <Suspense fallback={<div className="flex h-64 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" /></div>}>
              <RechnungPrintView rechnung={previewRechnung} kunde={kunde} projekt={projekt} settings={settings} previewMode={true} />
            </Suspense>
          </div>
        )}
        </div>
      )}

      {isEditing && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-[240px] bg-surface/95 backdrop-blur-md border-t border-border px-4 py-3 sm:py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] z-40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-slide-up pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <span className="text-xs uppercase tracking-wider font-bold text-text-secondary">Live-Total:</span>
            <span className="text-lg sm:text-xl font-black text-primary-700">
              CHF {formatMoney(editFinalTotal)}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={cancelEditing}
              className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2.5 bg-surface-card border border-border text-text-secondary font-bold text-sm rounded-xl hover:bg-surface transition-colors cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              onClick={saveEditing}
              disabled={isUpdating || userRole === 'treuhand'}
              className="flex-1 sm:flex-initial min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
            >
              {isUpdating ? 'Speichert...' : (
                <>
                  <IconSave className="w-4 h-4" />
                  <span>Änderungen speichern</span>
                </>
              )}
            </button>
          </div>
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
              Möchtest du sie verwerfen oder abbrechen und speichern?
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
            <h3 className="text-xl font-bold text-text-primary mb-2">Rechnung wirklich löschen?</h3>
            <p className="text-text-secondary mb-6 text-sm">
              Bist du sicher? Die Rechnung wird <strong>unwiderruflich</strong> gelöscht.
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
                disabled={isUpdating}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isUpdating ? 'Lösche...' : 'Ja, endgültig löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showKatalogDrawer && (
        <KatalogDrawer
          onClose={() => setShowKatalogDrawer(false)}
          onInsert={handleInsertFromKatalog}
        />
      )}

      {/* Archive Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-amber-200">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
              <IconPackage className="w-7 h-7 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Rechnung archivieren?</h3>
            <p className="text-text-secondary mb-6 text-sm">
              Die Rechnung wird archiviert und aus der Standardübersicht ausgeblendet.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setShowArchiveModal(false)}
                className="flex-1 px-4 py-2.5 bg-surface text-text-primary border border-border rounded-xl hover:bg-neutral-100 font-medium transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button 
                onClick={() => {
                  setShowArchiveModal(false)
                  handleArchive()
                }}
                disabled={isUpdating}
                className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isUpdating ? 'Archiviere...' : 'Archivieren'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-emerald-200">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <IconRefresh className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Rechnung wiederherstellen?</h3>
            <p className="text-text-secondary mb-6 text-sm">
              Die Rechnung wird wieder in die aktive Liste aufgenommen.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setShowRestoreModal(false)}
                className="flex-1 px-4 py-2.5 bg-surface text-text-primary border border-border rounded-xl hover:bg-neutral-100 font-medium transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button 
                onClick={async () => {
                  setShowRestoreModal(false)
                  setIsUpdating(true)
                  try {
                    await supabase.from('rechnungen').update({ is_archived: false }).eq('id', rechnung.id)
                    rechnung.is_archived = false
                    showToast('success', 'Rechnung erfolgreich wiederhergestellt!')
                  } catch (err) {
                    console.error('Fehler beim Wiederherstellen:', err)
                    showToast('error', 'Fehler beim Wiederherstellen.')
                  } finally {
                    setIsUpdating(false)
                  }
                }}
                disabled={isUpdating}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isUpdating ? 'Speichert...' : 'Wiederherstellen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border">
            <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mb-4">
              <IconDuplicate className="w-7 h-7 text-primary-600" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Rechnung duplizieren?</h3>
            <p className="text-text-secondary mb-6 text-sm">
              Es wird eine neue Rechnung mit neu generierter Nummer als Entwurf angelegt.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setShowDuplicateModal(false)}
                className="flex-1 px-4 py-2.5 bg-surface text-text-primary border border-border rounded-xl hover:bg-neutral-100 font-medium transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button 
                onClick={() => {
                  setShowDuplicateModal(false)
                  handleDuplicate()
                }}
                disabled={isUpdating}
                className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isUpdating ? 'Kopiere...' : 'Duplizieren'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard Modal */}
      {showDiscardModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
              <IconWarning className="w-7 h-7 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Bearbeitung abbrechen?</h3>
            <p className="text-text-secondary mb-6 text-sm">
              Alle ungespeicherten Änderungen an Positionen und Texten gehen verloren.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setShowDiscardModal(false)}
                className="flex-1 px-4 py-2.5 bg-surface text-text-primary border border-border rounded-xl hover:bg-neutral-100 font-medium transition-colors cursor-pointer"
              >
                Weiter bearbeiten
              </button>
              <button 
                onClick={() => {
                  setShowDiscardModal(false)
                  setIsEditing(false)
                  setMobileEditTab('form')
                }}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-colors cursor-pointer"
              >
                Änderungen verwerfen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gutschrift Modal (Art. 26 & 41 MWSTG) */}
      {showGutschriftModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface rounded-2xl p-6 max-w-md w-full shadow-2xl border border-primary-200">
            <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center mb-4">
              <IconQrBill className="w-7 h-7 text-primary-700" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Gutschrift erstellen?</h3>
            <p className="text-text-secondary mb-4 text-sm">
              Es wird eine formelle Gutschrift (Art. 26 & 41 MWSTG) mit neuer Belegnummer für Rechnung <strong className="text-text-primary">{rechnung.rechnung_nr || `#${rechnung.id}`}</strong> über <strong className="text-text-primary">CHF {formatMoney(rechnung.total)}</strong> als Entwurf angelegt.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setShowGutschriftModal(false)}
                disabled={isUpdating}
                className="flex-1 px-4 py-2.5 bg-surface text-text-primary border border-border rounded-xl hover:bg-neutral-100 font-medium transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button 
                onClick={handleCreateGutschrift}
                disabled={isUpdating}
                className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-md"
              >
                {isUpdating ? 'Erstelle...' : 'Gutschrift anlegen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Termin Modal for scheduling payment reminders / appointments */}
      {isTerminModalOpen && (
        <TerminModal
          isOpen={isTerminModalOpen}
          onClose={() => {
            setIsTerminModalOpen(false)
            setTerminModalInitial(null)
          }}
          onSave={handleSaveTermin}
          initialData={terminModalInitial}
          projekte={projekt ? [projekt] : []}
          kunden={kunde ? [kunde] : []}
        />
      )}

      {/* Schweizer Mahnwesen Modal */}
      {showMahnungModal && (
        <MahnungModal
          isOpen={showMahnungModal}
          onClose={() => setShowMahnungModal(false)}
          rechnung={rechnung}
          kunde={kunde}
          projekt={projekt}
          settings={settings}
          onSaveMahnung={handleSaveMahnung}
          onOpenPrintView={(m) => {
            setActiveMahnung(m)
            setShowMahnungPrintView(true)
          }}
          onOpenBetreibung={() => setShowBetreibungsModal(true)}
        />
      )}

      {/* Schweizer SchKG Betreibungsbegehren Modal */}
      {showBetreibungsModal && (
        <BetreibungsModal
          isOpen={showBetreibungsModal}
          onClose={() => setShowBetreibungsModal(false)}
          rechnung={rechnung}
          kunde={kunde}
          settings={settings}
        />
      )}

      {/* Feedback Toast */}
      {feedbackToast && (
        <div className={`fixed bottom-6 right-6 z-[110] px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 animate-fade-in ${
          feedbackToast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          {feedbackToast.type === 'error' ? <IconWarning className="w-4 h-4 text-red-600 shrink-0" /> : <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
          <span>{feedbackToast.text}</span>
        </div>
      )}
    </div>
  )
}


