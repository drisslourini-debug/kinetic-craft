import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../lib/formatters'
import { calculateDocumentTotals } from '../lib/calculations'
import { generateNextRechnungNr, parseZahlungsfrist, calculateDueDate } from '../lib/documentService'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { useModalHistory } from '../hooks/useModalHistory'
const OffertePrintView = lazy(() => import('./OffertePrintView'))
import KatalogDrawer from '../components/KatalogDrawer'
import DocumentDuplicateModal from '../components/DocumentDuplicateModal'
import TerminModal from '../components/kalender/TerminModal'
import VoiceWaveformModal from '../components/ui/VoiceWaveformModal'

export default function OfferteDetailView({ offerte, onBack, onNavigate, viewParams, userRole }) {
  const [kunde, setKunde] = useState(null)
  const [projekt, setProjekt] = useState(null)
  const [status, setStatus] = useState(offerte.status || 'Entwurf')
  const [isUpdating, setIsUpdating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showPrintView, setShowPrintView] = useState(false)
  const [showActionMenu, setShowActionMenu] = useState(false)

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editLeistungen, setEditLeistungen] = useState([])

  const [editKonditionen, setEditKonditionen] = useState({ rabatt: 0, mwst: 0 })
  const [editEinleitung, setEditEinleitung] = useState('')
  const [editSchluss, setEditSchluss] = useState('')
  const [editPauschalpreis, setEditPauschalpreis] = useState(null)
  const [isPauschal, setIsPauschal] = useState(false)
  const [editAusfuehrung, setEditAusfuehrung] = useState({ start: '', dauer: '', notizen: '' })
  const [editAnhange, setEditAnhange] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  
  const [editKundeId, setEditKundeId] = useState('')
  const [editProjektId, setEditProjektId] = useState('')
  const [kundenList, setKundenList] = useState([])
  const [projekteList, setProjekteList] = useState([])

  const [showKatalogDrawer, setShowKatalogDrawer] = useState(false)
  const [showLivePreview, setShowLivePreview] = useState(false)
  const [showNewPositionForm, setShowNewPositionForm] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [deleteAttachmentTarget, setDeleteAttachmentTarget] = useState(null)
  const [feedbackToast, setFeedbackToast] = useState(null)
  const [isTerminModalOpen, setIsTerminModalOpen] = useState(false)
  const [terminModalInitial, setTerminModalInitial] = useState(null)
  const [showVoiceModal, setShowVoiceModal] = useState(false)
  const [katalogList, setKatalogList] = useState([])

  useUnsavedChanges(isEditing)
  useModalHistory(showPrintView, () => setShowPrintView(false), 'print_offerte')
  useModalHistory(showKatalogDrawer, () => setShowKatalogDrawer(false), 'katalog_drawer')
  useModalHistory(showVoiceModal, () => setShowVoiceModal(false), 'voice_modal')

  const showToast = (type, text) => {
    setFeedbackToast({ type, text })
    setTimeout(() => setFeedbackToast(null), 3500)
  }

  const [newPosData, setNewPosData] = useState({
    beschreibung: '', menge: '', einheit: 'Stück (Stk)', einzelpreis: '', bruttopreis: '', kategorie: 'Waren', saveToKatalog: false
  })

  const recalculatePositions = (items) => {
    let titleCounter = 0;
    let posCounter = 0;
    return items.map(item => {
      if (item.type === 'title') {
        titleCounter++;
        posCounter = 0;
        return { ...item, posNr: `${titleCounter}.0` };
      } else {
        posCounter++;
        const prefix = titleCounter > 0 ? titleCounter : 1;
        return { ...item, posNr: `${prefix}.${posCounter}` };
      }
    });
  }

  const startEditing = useCallback(() => {
    const daten = offerte.daten || {}
    let currentLeistungen = (daten.leistungen || []).map((pos, i) => {
      let isTitle = pos.type === 'title'
      if (!isTitle && pos.posNr && String(pos.posNr).endsWith('.0') && !pos.einzelpreis && !pos.menge) {
        isTitle = true;
      }
      return {
        ...pos,
        type: isTitle ? 'title' : (pos.type || 'position'),
        _id: Date.now() + i,
        optional: pos.optional || false,
      }
    })
    currentLeistungen = recalculatePositions(currentLeistungen)
    setEditLeistungen(currentLeistungen)
    setEditKundeId(offerte.kunden_id || '')
    setEditProjektId(offerte.projekt_id || '')
    setEditKonditionen({
      rabatt: parseFloat(daten.konditionen?.rabatt || 0),
      mwst: parseFloat(daten.konditionen?.mwst || 0),
      gueltigkeit: daten.konditionen?.gueltigkeit || '30 Tage',
      zahlungsfrist: daten.konditionen?.zahlungsfrist || '30 Tage Netto'
    })
    setEditEinleitung(daten.einleitungstext || '')
    setEditSchluss(daten.schlusstext || '')
    setEditPauschalpreis(daten.pauschalpreis || null)
    setIsPauschal(!!daten.pauschalpreis && parseFloat(daten.pauschalpreis) > 0)
    setEditAusfuehrung({
      start: daten.ausfuehrung?.start || '',
      dauer: daten.ausfuehrung?.dauer || '',
      notizen: daten.ausfuehrung?.notizen || ''
    })
    setEditAnhange(daten.anhange || [])
    setIsEditing(true)
  }, [offerte])

  useEffect(() => {
    if (viewParams?.edit && !isEditing && !isLoading) {
      if (status === 'Entwurf' || status === 'In Überarbeitung') {
        startEditing()
      }
    }
  }, [viewParams, isLoading, isEditing, status, startEditing])

  useEffect(() => {
    async function loadKatalogData() {
      try {
        const { data: katData } = await supabase.from('katalog_leistungen').select('id, titel, beschreibung, einheit, preis').order('titel')
        if (katData) setKatalogList(katData)
      } catch (e) {
        console.warn('Katalog konnte nicht geladen werden:', e)
      }
    }
    loadKatalogData()
  }, [])

  const handleVoicePositionsExtracted = (data) => {
    if (!isEditing) {
      startEditing()
    }
    if (data.einleitung && !editEinleitung) {
      setEditEinleitung(data.einleitung)
    }
    if (data.schluss && !editSchluss) {
      setEditSchluss(data.schluss)
    }

    if (Array.isArray(data.positionen) && data.positionen.length > 0) {
      const formatted = data.positionen.map((pos, idx) => ({
        _id: Date.now() + idx,
        type: pos.type === 'title' ? 'title' : 'position',
        beschreibung: pos.beschreibung || '',
        menge: pos.menge !== undefined && pos.menge !== null ? String(pos.menge) : '',
        einheit: pos.einheit || 'm²',
        einzelpreis: pos.einzelpreis !== undefined && pos.einzelpreis !== null ? String(pos.einzelpreis) : '',
        optional: !!pos.optional
      }))

      setEditLeistungen(prev => recalculatePositions([...prev, ...formatted]))
      showToast('success', `✨ ${formatted.length} Positionen per Sprache kalkuliert und eingefügt!`)
    }
  }

  // Lade Kunden und Projekte wenn im Bearbeitungsmodus
  useEffect(() => {
    async function loadEditData() {
      if (isEditing && (status === 'Entwurf' || status === 'In Überarbeitung')) {
        const { data: kData } = await supabase.from('kunden').select('id, name, ort').order('name')
        if (kData) setKundenList(kData)
      }
    }
    loadEditData()
  }, [isEditing, status])

  useEffect(() => {
    async function loadEditProjects() {
      if (isEditing && editKundeId) {
        const { data: pData } = await supabase.from('projekte').select('id, name, adresse').eq('kunden_id', editKundeId).order('name')
        if (pData) {
          setProjekteList(pData)
          if (editProjektId && !pData.some(p => p.id === editProjektId)) setEditProjektId('')
        }
      } else {
        setProjekteList([])
      }
    }
    loadEditProjects()
  }, [isEditing, editKundeId, editProjektId])

  useEffect(() => {
    async function loadDetails() {
      if (!supabase || !offerte) return
      
      try {
        setIsLoading(true)
        
        if (offerte.kunden_id) {
          const { data: kData } = await supabase
            .from('kunden')
            .select('*')
            .eq('id', offerte.kunden_id)
            .single()
          if (kData) setKunde(kData)
        }

        if (offerte.projekt_id) {
          const { data: pData } = await supabase
            .from('projekte')
            .select('*')
            .eq('id', offerte.projekt_id)
            .single()
          if (pData) setProjekt(pData)
        }
      } catch (err) {
        console.error('Error loading offerte details:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadDetails()
  }, [offerte])

  const handleStatusChange = async (newStatus) => {
    if (!supabase) return
    setStatus(newStatus)
    setIsUpdating(true)
    
    try {
      await supabase
        .from('offerten')
        .update({ status: newStatus })
        .eq('id', offerte.id)
    } catch (err) {
      console.error('Failed to update status:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUpdate = async (field, value) => {
    setIsUpdating(true)
    try {
      await supabase
        .from('offerten')
        .update({ [field]: value })
        .eq('id', offerte.id)
    } catch (err) {
      console.error(`Failed to update ${field}:`, err)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDuplicate = () => {
    setShowDuplicateModal(true)
  }

  const handleArchive = async () => {
    setIsUpdating(true)
    try {
      const { error } = await supabase.from('offerten').update({ is_archived: true }).eq('id', offerte.id)
      if (error) throw error
      offerte.is_archived = true
      showToast('success', 'Offerte archiviert.')
      setShowArchiveModal(false)
      onBack()
    } catch (err) {
      console.error('Fehler beim Archivieren:', err)
      showToast('error', 'Fehler beim Archivieren der Offerte.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRestore = async () => {
    setIsUpdating(true)
    try {
      const { error } = await supabase.from('offerten').update({ is_archived: false }).eq('id', offerte.id)
      if (error) throw error
      offerte.is_archived = false
      showToast('success', 'Offerte aus dem Archiv wiederhergestellt.')
    } catch (err) {
      console.error('Fehler beim Wiederherstellen:', err)
      showToast('error', 'Fehler beim Wiederherstellen der Offerte.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteOfferte = async () => {
    setIsUpdating(true)
    try {
      const { error } = await supabase.from('offerten').delete().eq('id', offerte.id)
      if (error) throw error
      showToast('success', 'Offerte unwiderruflich gelöscht.')
      setShowDeleteModal(false)
      onBack()
    } catch (err) {
      console.error('Fehler beim Löschen:', err)
      showToast('error', 'Fehler beim Löschen der Offerte.')
    } finally {
      setIsUpdating(false)
    }
  }

  const openPlanTermin = async (type = 'Besprechung') => {
    if (kundenList.length === 0) {
      const { data: kData } = await supabase.from('kunden').select('id, name, ort').order('name')
      if (kData) setKundenList(kData)
    }
    if (projekteList.length === 0) {
      const { data: pData } = await supabase.from('projekte').select('id, name, adresse').order('name')
      if (pData) setProjekteList(pData)
    }

    setTerminModalInitial({
      titel: `${type}: Offerte #${offerte.id} - ${kunde?.name || offerte.kunden_name || ''}`.trim(),
      typ: type.includes('Montage') ? 'Montage' : (type.includes('Aufmass') ? 'Aufmass' : 'Besprechung'),
      datum: new Date().toISOString().split('T')[0],
      kunden_id: offerte.kunden_id ? String(offerte.kunden_id) : '',
      projekt_id: offerte.projekt_id ? String(offerte.projekt_id) : '',
      ort: projekt?.adresse || kunde?.adresse || (kunde ? `${kunde.strasse || ''}, ${kunde.plz || ''} ${kunde.ort || ''}`.trim() : ''),
      beschreibung: `Termin bezüglich Offerte #${offerte.id}`
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

  const confirmConvertToRechnung = async () => {
    setShowConvertModal(false)
    setIsUpdating(true)
    try {
      const rechnungNr = await generateNextRechnungNr(supabase)

      // Calculate faellig_am based on customer's payment term
      const fristTage = parseZahlungsfrist(kunde?.zahlungsziel)
      const rechnungsdatum = new Date()
      const faelligAm = calculateDueDate(rechnungsdatum, fristTage)

      const { data: newRechnung, error } = await supabase
        .from('rechnungen')
        .insert([{
          rechnung_nr: rechnungNr,
          kunden_id: offerte.kunden_id,
          projekt_id: offerte.projekt_id,
          offerte_id: offerte.id,
          typ: 'gesamt',
          total: offerte.total,
          daten: offerte.daten,
          rechnungsdatum: rechnungsdatum.toISOString().split('T')[0],
          zahlungsfrist_tage: fristTage,
          faellig_am: faelligAm,
          status: 'Entwurf'
        }])
        .select()
      
      if (error) throw error
      
      if (newRechnung && newRechnung.length > 0) {
        // Update offerte: set status to 'Verrechnet' and link to rechnung
        await supabase
          .from('offerten')
          .update({ status: 'Verrechnet', rechnung_id: newRechnung[0].id })
          .eq('id', offerte.id)
        
        showToast('success', `Rechnung ${rechnungNr} wurde erfolgreich erstellt!`)
        // Navigate to the new Rechnung
        if (onNavigate) {
          onNavigate('rechnungen', { rechnungId: newRechnung[0].id })
        }
      }
    } catch (err) {
      console.error('Fehler beim Umwandeln:', err)
      showToast('error', 'Fehler beim Umwandeln in Rechnung: ' + (err.message || 'Unbekannter Fehler'))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleInsertFromKatalog = (items) => {
    if (!items || items.length === 0) return

    let currentLeistungen = [...editLeistungen]
    
    // Group imported items by category
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.kategorie]) acc[item.kategorie] = []
      acc[item.kategorie].push(item)
      return acc
    }, {})

    Object.entries(grouped).forEach(([kategorie, catItems]) => {
      // Check if title already exists
      const titleExists = currentLeistungen.some(p => p.type === 'title' && p.beschreibung === kategorie)
      
      if (!titleExists) {
        currentLeistungen.push({
          _id: Date.now() + Math.random(),
          type: 'title',
          beschreibung: kategorie,
          posNr: '',
          menge: '',
          einheit: '',
          einzelpreis: '',
          optional: false
        })
      }

      // Add items
      catItems.forEach((item) => {
        currentLeistungen.push({
          _id: Date.now() + Math.random(),
          type: 'position',
          kategorie,
          beschreibung: item.titel,
          menge: '', 
          einheit: item.einheit,
          einzelpreis: item.preis,
          optional: false
        })
      })
    })

    setEditLeistungen(recalculatePositions(currentLeistungen))
    setShowKatalogDrawer(false)
  }

  const cancelEditing = () => {
    setShowDiscardModal(true)
  }

  const confirmDiscardChanges = () => {
    setShowDiscardModal(false)
    setIsEditing(false)
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${offerte.id}_${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('anhange')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('anhange')
        .getPublicUrl(filePath)

      const newAttachment = {
        name: file.name,
        url: data.publicUrl,
        path: filePath,
        size: file.size,
        type: file.type
      }

      setEditAnhange(prev => [...prev, newAttachment])
      showToast('success', 'Datei erfolgreich hochgeladen.')
    } catch (err) {
      console.error('Fehler beim Upload:', err)
      showToast('error', 'Upload fehlgeschlagen: ' + (err.message || 'Unbekannter Fehler'))
    } finally {
      setIsUploading(false)
      // reset file input
      event.target.value = ''
    }
  }

  const deleteAttachment = (path) => {
    setDeleteAttachmentTarget(path)
  }

  const confirmDeleteAttachment = async () => {
    if (!deleteAttachmentTarget) return
    const path = deleteAttachmentTarget
    try {
      await supabase.storage.from('anhange').remove([path])
      setEditAnhange(prev => prev.filter(a => a.path !== path))
      showToast('success', 'Anhang erfolgreich gelöscht.')
    } catch (err) {
      console.error('Fehler beim Löschen:', err)
      showToast('error', 'Fehler beim Löschen: ' + (err.message || 'Unbekannter Fehler'))
    } finally {
      setDeleteAttachmentTarget(null)
    }
  }

  const saveEditing = async () => {
    setIsUpdating(true)
    try {
      const cleanLeistungen = editLeistungen.map(({ _id, ...pos }) => pos)
      
      const { finalTotal } = calculateDocumentTotals(cleanLeistungen, editKonditionen, isPauschal ? editPauschalpreis : null)

      let calculatedGueltigBis = offerte.gueltig_bis || offerte.daten?.gueltig_bis || null
      if (editKonditionen.gueltigkeit) {
        const match = String(editKonditionen.gueltigkeit).match(/\d+/)
        const days = match ? parseInt(match[0], 10) : 30
        const baseDate = offerte.daten?.datum || offerte.created_at || new Date().toISOString()
        calculatedGueltigBis = new Date(new Date(baseDate).getTime() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }

      const updatedDaten = {
        ...offerte.daten,
        leistungen: cleanLeistungen,
        konditionen: {
          rabatt: editKonditionen.rabatt,
          mwst: editKonditionen.mwst,
          gueltigkeit: editKonditionen.gueltigkeit,
          zahlungsfrist: editKonditionen.zahlungsfrist
        },
        gueltig_bis: calculatedGueltigBis,
        einleitungstext: editEinleitung || null,
        schlusstext: editSchluss || null,
        pauschalpreis: isPauschal ? parseFloat(editPauschalpreis) || null : null,
        ausfuehrung: editAusfuehrung,
        anhange: editAnhange
      }

      await supabase
        .from('offerten')
        .update({
          daten: updatedDaten,
          total: finalTotal,
          kunden_id: editKundeId,
          projekt_id: editProjektId || null,
          gueltig_bis: calculatedGueltigBis
        })
        .eq('id', offerte.id)
      
      offerte.daten = updatedDaten
      offerte.total = finalTotal
      offerte.kunden_id = editKundeId
      offerte.projekt_id = editProjektId || null
      offerte.gueltig_bis = calculatedGueltigBis

      if (editKundeId) {
        const { data: kData } = await supabase.from('kunden').select('*').eq('id', editKundeId).single()
        if (kData) setKunde(kData)
      }
      if (editProjektId) {
        const { data: pData } = await supabase.from('projekte').select('*').eq('id', editProjektId).single()
        if (pData) setProjekt(pData)
      } else {
        setProjekt(null)
      }

      setIsEditing(false)
      showToast('success', 'Offerte erfolgreich gespeichert!')
    } catch (err) {
      console.error('Fehler beim Speichern:', err)
      showToast('error', 'Fehler beim Speichern der Offerte.')
    } finally {
      setIsUpdating(false)
    }
  }

  const updatePosition = (id, field, value) => {
    setEditLeistungen(prev => prev.map(p => p._id === id ? { ...p, [field]: value } : p))
  }

  const deletePosition = (id) => {
    setEditLeistungen(prev => recalculatePositions(prev.filter(p => p._id !== id)))
  }

  const addTitle = () => {
    setEditLeistungen(prev => recalculatePositions([...prev, {
      _id: Date.now(),
      type: 'title',
      posNr: '',
      beschreibung: 'Neuer Titel',
      menge: '',
      einheit: '',
      einzelpreis: '',
      optional: false,
    }]))
  }

  const movePosition = (index, direction) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= editLeistungen.length) return
    const updated = [...editLeistungen]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp
    setEditLeistungen(recalculatePositions(updated))
  }

  const handleNettoChange = (val) => {
    const netto = parseFloat(val);
    if (isNaN(netto)) {
      setNewPosData(prev => ({ ...prev, einzelpreis: val, bruttopreis: '' }));
      return;
    }
    const mwst = editKonditionen.mwst || 0;
    const brutto = netto * (1 + mwst / 100);
    setNewPosData(prev => ({ ...prev, einzelpreis: val, bruttopreis: brutto.toFixed(2) }));
  }

  const handleBruttoChange = (val) => {
    const brutto = parseFloat(val);
    if (isNaN(brutto)) {
      setNewPosData(prev => ({ ...prev, bruttopreis: val, einzelpreis: '' }));
      return;
    }
    const mwst = editKonditionen.mwst || 0;
    const netto = brutto / (1 + mwst / 100);
    setNewPosData(prev => ({ ...prev, bruttopreis: val, einzelpreis: netto.toFixed(2) }));
  }

  const handleAddNewPosition = async () => {
    if (!newPosData.beschreibung?.trim()) {
      showToast('error', 'Bitte einen Namen/Beschreibung eingeben.')
      return;
    }

    const pos = {
      _id: Date.now(),
      type: 'position',
      posNr: '',
      beschreibung: newPosData.beschreibung,
      menge: newPosData.menge,
      einheit: newPosData.einheit,
      einzelpreis: newPosData.einzelpreis,
      kategorie: newPosData.kategorie,
      optional: false,
    };

    setEditLeistungen(prev => recalculatePositions([...prev, pos]));

    if (newPosData.saveToKatalog) {
      try {
        let katId;
        const { data: katData } = await supabase.from('katalog_kategorien').select('id').eq('name', 'Neu (Ad-hoc)').single();
        if (katData) {
          katId = katData.id;
        } else {
          const { data: newKat } = await supabase.from('katalog_kategorien').insert([{ name: 'Neu (Ad-hoc)', sort_order: 999 }]).select();
          if (newKat && newKat.length > 0) katId = newKat[0].id;
        }
        
        if (katId) {
          await supabase.from('katalog_leistungen').insert([{
            kategorie_id: katId,
            titel: newPosData.beschreibung,
            einheit: newPosData.einheit,
            preis: newPosData.einzelpreis ? parseFloat(newPosData.einzelpreis) : 0,
            sort_order: 999
          }]);
        }
      } catch (err) {
        console.error('Fehler beim Speichern in den Katalog:', err);
      }
    }

    setShowNewPositionForm(false);
    setNewPosData({ beschreibung: '', menge: '', einheit: 'Stück (Stk)', einzelpreis: '', bruttopreis: '', kategorie: 'Waren', saveToKatalog: false });
  }

  if (!offerte) return null


  // Parse daten safely
  const daten = offerte.daten || {}
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

  const previewOfferte = isEditing ? {
    ...offerte,
    daten: {
      ...offerte.daten,
      leistungen: editLeistungen.map(({ _id, ...pos }) => pos),
      konditionen: editKonditionen,
      einleitungstext: editEinleitung,
      schlusstext: editSchluss,
      pauschalpreis: isPauschal ? editPauschalpreis : null,
      ausfuehrung: editAusfuehrung
    },
    total: editFinalTotal
  } : offerte;

  if (showPrintView) {
    return (
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" /></div>}>
        <OffertePrintView offerte={offerte} kunde={kunde} projekt={projekt} onClose={() => setShowPrintView(false)} />
      </Suspense>
    )
  }

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-surface-card border border-transparent hover:border-border transition-all text-text-secondary hover:text-text-primary cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Offerte #{offerte.id}</h2>
              {isUpdating && <span className="text-xs text-text-secondary">Speichert...</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="text-text-secondary text-sm">Erstellt am {formatDate(offerte.created_at)}</p>
              {offerte.pdf_url ? (
                <a
                  href={offerte.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  title="Archiviertes PDF anzeigen"
                >
                  <span>📁</span> Im Archiv gesichert
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPrintView(true)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                  title="PDF generieren und im Archiv ablegen"
                >
                  <span>📁</span> Noch nicht archiviert
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isUpdating || isEditing || userRole === 'treuhand'}
            className={`px-4 py-3 sm:py-2.5 min-h-[48px] sm:min-h-0 text-base sm:text-sm font-bold rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all cursor-pointer focus:ring-primary-500/30 hidden sm:block ${
              status === 'Akzeptiert' || status === 'Verrechnet' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
              status === 'Versendet' ? 'border-primary-200 bg-primary-50 text-primary-700' :
              status === 'In Überarbeitung' ? 'border-amber-200 bg-amber-50 text-amber-700' :
              status === 'Abgelehnt' ? 'border-red-200 bg-red-50 text-red-700' :
              'border-gray-200 bg-gray-50 text-gray-700'
            }`}
          >
            <option value="Entwurf">Entwurf</option>
            <option value="Versendet">Versendet</option>
            <option value="In Überarbeitung">In Überarbeitung</option>
            <option value="Akzeptiert">Akzeptiert</option>
            <option value="Abgelehnt">Abgelehnt</option>
            <option value="Verrechnet">Verrechnet</option>
          </select>
          {/* Main Action: PDF View or Edit */}
          {isEditing && (
            <button
              onClick={() => setShowLivePreview(!showLivePreview)}
              className={`hidden xl:inline-flex items-center gap-2 px-4 py-3 sm:py-2.5 min-h-[48px] sm:min-h-0 font-bold text-base sm:text-sm rounded-xl transition-colors shadow-sm cursor-pointer border ${
                showLivePreview ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-surface border-border text-text-secondary'
              }`}
              title="Split-Screen Live-Vorschau (nur Desktop)"
            >
              {showLivePreview ? '👁️ Live-Vorschau an' : '👁️ Live-Vorschau aus'}
            </button>
          )}
          {userRole !== 'treuhand' && (status === 'Entwurf' || status === 'In Überarbeitung') && (
            <button
              onClick={() => setShowVoiceModal(true)}
              className="inline-flex items-center gap-2 px-4 py-3 sm:py-2.5 min-h-[48px] sm:min-h-0 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-base sm:text-sm rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
              title="Offerte per Sprache diktieren & durch KI berechnen"
            >
              <span>🎙️</span>
              <span>Sprach-Diktat (KI)</span>
            </button>
          )}
          {!isEditing && userRole !== 'treuhand' && (status === 'Entwurf' || status === 'In Überarbeitung') && (
            <button
              onClick={startEditing}
              className="inline-flex items-center gap-2 px-4 py-3 sm:py-2.5 min-h-[48px] sm:min-h-0 bg-surface border border-primary-200 text-primary-700 font-bold text-base sm:text-sm rounded-xl hover:bg-primary-50 transition-colors cursor-pointer shadow-sm"
            >
              ✏️ Offerte bearbeiten
            </button>
          )}
          <button
            onClick={() => setShowPrintView(true)}
            className="inline-flex items-center gap-2 px-4 py-3 sm:py-2.5 min-h-[48px] sm:min-h-0 bg-primary-600 text-white font-bold text-base sm:text-sm rounded-xl hover:bg-primary-700 transition-colors shadow-md shadow-primary-600/20 active:scale-[0.98] cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span className="hidden sm:inline">PDF anzeigen</span>
            <span className="sm:hidden">PDF</span>
          </button>
          {userRole !== 'treuhand' && (
            <div className="relative">
              <button aria-label="Aktionsmenü" onClick={() => setShowActionMenu(!showActionMenu)} className="p-3 sm:p-2 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 bg-surface-card hover:bg-neutral-50 rounded-xl sm:rounded-lg border border-border shadow-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
              </button>
              {showActionMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowActionMenu(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-border overflow-hidden z-50 animate-fade-in">
                    <div className="p-1">
                      {!isEditing && (status === 'Entwurf' || status === 'In Überarbeitung') && (
                        <button onClick={() => { setShowActionMenu(false); startEditing(); }} className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-neutral-50 rounded-lg flex items-center gap-2 transition-colors cursor-pointer">
                          <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          Bearbeiten
                        </button>
                      )}
                      <button onClick={() => { setShowActionMenu(false); handleDuplicate(); }} className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-neutral-50 rounded-lg flex items-center gap-2 transition-colors cursor-pointer">
                        <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                        Duplizieren
                      </button>
                      {status === 'Akzeptiert' && (
                        <button onClick={() => { setShowActionMenu(false); setShowConvertModal(true); }} className="w-full text-left px-3 py-2 text-sm text-primary-600 font-semibold hover:bg-primary-50 rounded-lg flex items-center gap-2 transition-colors cursor-pointer mt-1 border-t border-border pt-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          Rechnung erstellen
                        </button>
                      )}
                      <button 
                        onClick={() => { setShowActionMenu(false); openPlanTermin('Aufmass / Besichtigung'); }} 
                        className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-neutral-50 rounded-lg flex items-center gap-2 transition-colors cursor-pointer mt-1 border-t border-border pt-2"
                      >
                        <span className="text-sm">📏</span>
                        Aufmass / Besichtigung planen
                      </button>
                      <button 
                        onClick={() => { setShowActionMenu(false); openPlanTermin('Kundentermin'); }} 
                        className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-neutral-50 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <span className="text-sm">📅</span>
                        Kundentermin im Kalender
                      </button>
                      {offerte.is_archived ? (
                        <button 
                          onClick={() => { setShowActionMenu(false); handleRestore(); }} 
                          className="w-full text-left px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center gap-2 transition-colors cursor-pointer mt-1 border-t border-border pt-2"
                        >
                          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          Aus Archiv wiederherstellen
                        </button>
                      ) : (
                        <button 
                          onClick={() => { setShowActionMenu(false); setShowArchiveModal(true); }} 
                          className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-neutral-50 rounded-lg flex items-center gap-2 transition-colors cursor-pointer mt-1 border-t border-border pt-2"
                        >
                          <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                          Archivieren
                        </button>
                      )}
                      {(status === 'Entwurf' || status === 'In Überarbeitung') && (
                        <button onClick={() => { setShowActionMenu(false); setShowDeleteModal(true); }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors cursor-pointer mt-1 border-t border-border pt-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          Löschen
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Acceptance / Conversion Action Banner */}
      {status === 'Akzeptiert' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl shrink-0">
              🎉
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-900">Auftrag erteilt / Offerte akzeptiert!</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Plane jetzt die Montage im Kalender oder erstelle direkt das Projekt und die Rechnung.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => openPlanTermin('Montage')}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>📅 Montagetermin planen</span>
            </button>
            {!offerte.projekt_id && (
              <button
                onClick={() => onNavigate && onNavigate('projekte', { action: 'create', kundeId: offerte.kunden_id, name: offerte.daten?.titel || `Projekt zu Offerte #${offerte.id}` })}
                className="px-3.5 py-2 bg-white hover:bg-emerald-100/50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>🏗️ Projekt anlegen</span>
              </button>
            )}
            <button
              onClick={() => setShowConvertModal(true)}
              className="px-3.5 py-2 bg-white hover:bg-emerald-100/50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>📄 Rechnung erstellen</span>
            </button>
          </div>
        </div>
      )}

      {/* Archived Banner */}
      {offerte.is_archived && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl shrink-0">
              📁
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">Diese Offerte ist archiviert.</p>
              <p className="text-xs text-amber-700 mt-0.5">Die Offerte wird in der regulären Übersicht ausgeblendet.</p>
            </div>
          </div>
          <button
            onClick={handleRestore}
            disabled={isUpdating}
            className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Aus Archiv wiederherstellen
          </button>
        </div>
      )}

      {/* End Header Actions */}
      {isLoading ? (
        <div className="p-8 text-center text-text-secondary">Lade Daten...</div>
      ) : (
        <div className={showLivePreview && isEditing ? "grid grid-cols-1 xl:grid-cols-2 gap-6" : ""}>
        <div className="animate-fade-in">
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

              {/* Das Dokument: Einleitung + Leistungsverzeichnis + Konditionen */}
              <div className="bg-surface-card rounded-2xl border border-border shadow-xs overflow-hidden">
                
                {/* Einleitungstext Header */}
                {isEditing && (
                  <div className="p-5 border-b border-border bg-surface/40 space-y-3">
                    <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block">
                      Einleitungstext (erscheint auf dem PDF)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Standard', text: 'Gerne unterbreiten wir Ihnen folgende Offerte:' },
                        { label: 'Förmlich', text: 'Bezugnehmend auf unsere Besichtigung vor Ort erlauben wir uns, Ihnen folgende Offerte zu unterbreiten:' },
                        { label: 'Persönlich', text: 'Vielen Dank für Ihre Anfrage und das entgegengebrachte Vertrauen. Gerne offerieren wir Ihnen die gewünschten Arbeiten wie folgt:' },
                      ].map((tpl) => (
                        <button
                          key={tpl.label}
                          onClick={() => setEditEinleitung(tpl.text)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
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
                      className="w-full h-20 px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none"
                      placeholder="Gerne unterbreiten wir Ihnen folgende Offerte:"
                    />
                  </div>
                )}
                {!isEditing && daten.einleitungstext && (
                  <div className="p-5 border-b border-border bg-surface/30">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block mb-1">Einleitung</span>
                    <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{daten.einleitungstext}</p>
                  </div>
                )}

                {/* Table Header Bar */}
                <div className="p-5 border-b border-border bg-surface/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">Leistungsverzeichnis</h3>
                    <p className="text-xs text-text-secondary">Positionen, Mengen und Einheitspreise der Offerte</p>
                  </div>
                  {isEditing && (
                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5">
                      <button
                        onClick={addTitle}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-surface text-text-primary border border-border font-semibold text-xs rounded-lg hover:bg-surface-card transition-colors cursor-pointer shadow-2xs"
                      >
                        ➕ Titel
                      </button>
                      <button
                        onClick={() => {
                          const pos = {
                            _id: Date.now(),
                            type: 'position',
                            posNr: '',
                            beschreibung: '',
                            menge: '',
                            einheit: 'Stück (Stk)',
                            einzelpreis: '',
                            optional: false,
                          };
                          setEditLeistungen(prev => [...prev, pos]);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-surface text-text-primary border border-border font-semibold text-xs rounded-lg hover:bg-surface-card transition-colors cursor-pointer shadow-2xs"
                      >
                        ➕ Leere Pos.
                      </button>
                      <button
                        onClick={() => setShowNewPositionForm(true)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 bg-primary-50 text-primary-700 border border-primary-200 font-semibold text-xs rounded-lg hover:bg-primary-100 transition-colors cursor-pointer shadow-2xs"
                      >
                        ➕ Position
                      </button>
                      <button
                        onClick={() => setShowKatalogDrawer(true)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 bg-primary-50 text-primary-700 border border-primary-200 font-semibold text-xs rounded-lg hover:bg-primary-100 transition-colors cursor-pointer shadow-2xs"
                      >
                        📖 Katalog
                      </button>
                      <button
                        onClick={() => setShowVoiceModal(true)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-lg transition-all active:scale-95 cursor-pointer shadow-2xs"
                        title="Positionen per Sprache diktieren & durch KI berechnen"
                      >
                        <span>🎙️</span>
                        <span>Sprache (KI)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* ===== READ MODE ===== */}
                {!isEditing && (
                  <>
                    {leistungen.length === 0 ? (
                      <div className="p-8 text-center text-text-secondary">Keine Leistungen gefunden.</div>
                    ) : (
                      <div className="divide-y divide-border">
                        <div className="hidden sm:grid grid-cols-[60px_1fr_80px_80px_100px_120px] gap-4 px-5 py-3 bg-surface/50 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          <span>Pos.</span>
                          <span>Beschreibung</span>
                          <span className="text-right">Menge</span>
                          <span>Einh.</span>
                          <span className="text-right">Preis</span>
                          <span className="text-right">Total</span>
                        </div>
                        
                        {leistungen.map((pos, idx) => {
                          const isKategorie = pos.type === 'title'
                          const posTotal = isKategorie ? 0 : ((parseFloat(pos.menge) || 0) * (parseFloat(pos.einzelpreis) || 0))
                          const isInfo = isKategorie || ((pos.menge === '' || pos.menge === undefined || pos.menge === null) && (pos.einzelpreis === '' || pos.einzelpreis === undefined || pos.einzelpreis === null))
                          
                          return (
                            <div key={idx} className={`p-4 sm:px-5 sm:py-3 hover:bg-primary-50/20 transition-colors ${isKategorie ? 'bg-surface/60 border-b-2 border-border/50 font-bold' : isInfo ? 'bg-surface' : ''} ${pos.optional ? 'opacity-60' : ''}`}>
                              
                              {/* --- MOBILE COMPACT VIEW --- */}
                              <div className="sm:hidden flex justify-between items-start w-full gap-3">
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className={`text-sm text-text-primary ${isKategorie ? 'font-bold text-base text-primary-900' : 'font-medium'}`}>
                                    <span className="font-bold text-text-secondary mr-2">{pos.posNr || (idx + 1)}</span>
                                    {pos.beschreibung}
                                    {pos.optional && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Option</span>}
                                  </div>
                                  {!isInfo && (
                                    <div className="text-xs text-text-secondary mt-1">
                                      {pos.menge} {pos.einheit} à {formatCurrency(parseFloat(pos.einzelpreis) || 0)}
                                    </div>
                                  )}
                                </div>
                                {!isInfo && (
                                  <div className="text-sm font-bold text-text-primary shrink-0 pt-0.5 whitespace-nowrap">
                                    {formatCurrency(posTotal)}
                                  </div>
                                )}
                              </div>

                              {/* --- DESKTOP TABLE VIEW --- */}
                              <div className="hidden sm:grid sm:grid-cols-[60px_1fr_80px_80px_100px_120px] gap-4 items-center">
                                <div className="text-xs font-bold text-text-secondary">
                                  {pos.posNr || (idx + 1)}
                                </div>
                                <div className={`text-sm text-text-primary ${isKategorie ? 'font-bold text-base text-primary-900' : 'font-medium'}`}>
                                  {pos.beschreibung}
                                  {pos.optional && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">Option</span>}
                                </div>
                                {!isInfo ? (
                                  <>
                                    <div className="text-sm text-text-secondary text-right">{pos.menge}</div>
                                    <div className="text-sm text-text-secondary">{pos.einheit}</div>
                                    <div className="text-sm text-text-secondary text-right">{formatCurrency(parseFloat(pos.einzelpreis) || 0)}</div>
                                    <div className="text-sm font-bold text-text-primary text-right">{formatCurrency(posTotal)}</div>
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

                {/* ===== EDIT MODE ===== */}
                {isEditing && (
                  <div className="divide-y divide-border">
                    {editLeistungen.length === 0 ? (
                      <div className="p-8 text-center text-text-secondary">
                        Keine Positionen. Klicke auf "Position hinzufügen" um zu starten.
                      </div>
                    ) : (
                      editLeistungen.map((pos, idx) => (
                        <div key={pos._id} className={`p-4 space-y-3 ${pos.optional ? 'bg-amber-50/30' : ''}`}>
                          {/* Row 1: Controls + PosNr + Optional + Delete */}
                          <div className="flex items-center gap-2">
                            {/* Move */}
                            <div className="flex flex-col gap-0.5 shrink-0">
                              <button
                                onClick={() => movePosition(idx, -1)}
                                disabled={idx === 0}
                                className="p-1 min-w-[28px] min-h-[28px] flex items-center justify-center rounded hover:bg-surface text-text-secondary hover:text-text-primary disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                                title="Nach oben"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                              </button>
                              <button
                                onClick={() => movePosition(idx, 1)}
                                disabled={idx === editLeistungen.length - 1}
                                className="p-1 min-w-[28px] min-h-[28px] flex items-center justify-center rounded hover:bg-surface text-text-secondary hover:text-text-primary disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                                title="Nach unten"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                              </button>
                            </div>

                            {/* Position Number */}
                            <div className="shrink-0 w-8 text-center">
                              <span className="text-xs font-bold text-text-secondary">{pos.posNr}</span>
                            </div>

                            {/* Spacer */}
                            <div className="flex-1 text-sm font-medium text-text-primary truncate">{pos.beschreibung || <span className="text-text-secondary italic">Keine Beschreibung</span>}</div>

                            {/* Optional Toggle */}
                            <label className="flex items-center gap-1.5 cursor-pointer shrink-0 px-2" title="Als optionale Position markieren">
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
                              onClick={() => deletePosition(pos._id)}
                              className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg hover:bg-red-50 text-text-secondary hover:text-red-600 transition-colors cursor-pointer shrink-0"
                              title="Position löschen"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>

                          {/* Row 2: Description */}
                          <div className="pl-2 sm:pl-10">
                            <textarea
                              value={pos.beschreibung}
                              onChange={(e) => updatePosition(pos._id, 'beschreibung', e.target.value)}
                              rows={1}
                              onFocus={(e) => { e.target.rows = Math.max(2, Math.ceil(e.target.value.length / 40)); }}
                              onBlur={(e) => { e.target.rows = 1; }}
                              className={`w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none transition-all ${pos.type === 'title' ? 'font-bold text-base' : 'font-medium'}`}
                              placeholder={pos.type === 'title' ? 'Titel (z.B. Gipserarbeiten)' : 'Beschreibung / Leistung...'}
                            />
                          </div>

                          {/* Row: Menge, Einheit, Preis, Total */}
                          {pos.type !== 'title' && (
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pl-2 sm:pl-10">
                              <div>
                                <label className="text-xs text-text-secondary font-semibold block mb-1">Menge</label>
                                <input
                                  type="number"
                                  step="any"
                                  value={pos.menge}
                                  onChange={(e) => updatePosition(pos._id, 'menge', e.target.value)}
                                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-sm transition-colors focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-text-secondary font-semibold block mb-1">Einheit</label>
                                <input
                                  type="text"
                                  value={pos.einheit || ''}
                                  onChange={(e) => updatePosition(pos._id, 'einheit', e.target.value)}
                                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-sm transition-colors focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                                  placeholder="m², Stk, h..."
                                />
                              </div>
                              <div>
                                <label className="text-xs text-text-secondary font-semibold block mb-1">Netto (CHF)</label>
                                <input
                                  type="number"
                                  step="0.05"
                                  value={pos.einzelpreis}
                                  onChange={(e) => {
                                    const netto = parseFloat(e.target.value);
                                    updatePosition(pos._id, 'einzelpreis', e.target.value);
                                    if (!isNaN(netto)) {
                                      const mwstRate = editKonditionen.mwst || 0;
                                      updatePosition(pos._id, 'bruttopreis', (netto * (1 + mwstRate / 100)).toFixed(2));
                                    } else {
                                      updatePosition(pos._id, 'bruttopreis', '');
                                    }
                                  }}
                                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-sm transition-colors focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                                  placeholder="0.00"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-text-secondary font-semibold block mb-1">Brutto (CHF)</label>
                                <input
                                  type="number"
                                  step="0.05"
                                  value={pos.bruttopreis || ''}
                                  onChange={(e) => {
                                    const brutto = parseFloat(e.target.value);
                                    updatePosition(pos._id, 'bruttopreis', e.target.value);
                                    if (!isNaN(brutto)) {
                                      const mwstRate = editKonditionen.mwst || 0;
                                      updatePosition(pos._id, 'einzelpreis', (brutto / (1 + mwstRate / 100)).toFixed(2));
                                    } else {
                                      updatePosition(pos._id, 'einzelpreis', '');
                                    }
                                  }}
                                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-sm transition-colors focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                                  placeholder="0.00"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-text-secondary font-semibold block mb-1">Total</label>
                                <div className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm font-bold text-text-primary flex items-center h-[38px]">
                                  {formatCurrency((parseFloat(pos.menge) || 0) * (parseFloat(pos.einzelpreis) || 0))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    
                    {/* THE NEW AD-HOC FORM */}
                    {showNewPositionForm && (
                      <div className="p-5 border-t border-border bg-primary-50/30 animate-fade-in space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-primary-700">Neuer Artikel</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="text-xs text-text-secondary font-semibold block mb-1">Name / Beschreibung</label>
                            <input
                              type="text"
                              value={newPosData.beschreibung}
                              onChange={(e) => setNewPosData(prev => ({ ...prev, beschreibung: e.target.value }))}
                              className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
                              placeholder="z.B. Decke streichen"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <label className="text-xs text-text-secondary font-semibold block mb-1">Typ</label>
                            <select 
                              value={newPosData.kategorie}
                              onChange={(e) => setNewPosData(prev => ({ ...prev, kategorie: e.target.value }))}
                              className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
                            >
                              <option value="Waren">Waren</option>
                              <option value="Dienstleistungen">Dienstleistungen</option>
                              <option value="Zusätzliches Einkommen">Zusätzliches Einkommen</option>
                              <option value="Andere">Andere</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-text-secondary font-semibold block mb-1">Einheit</label>
                            <select 
                              value={newPosData.einheit}
                              onChange={(e) => setNewPosData(prev => ({ ...prev, einheit: e.target.value }))}
                              className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
                            >
                              <option value="Stück (Stk)">Stück (Stk)</option>
                              <option value="Stunde (h)">Stunde (h)</option>
                              <option value="Tag (d)">Tag (d)</option>
                              <option value="Monat (mo)">Monat (mo)</option>
                              <option value="Pauschalpreis">Pauschalpreis</option>
                              <option value="Kilogramm (kg)">Kilogramm (kg)</option>
                              <option value="Quadratmeter (m²)">Quadratmeter (m²)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-text-secondary font-semibold block mb-1">Menge</label>
                            <input
                              type="number"
                              step="any"
                              value={newPosData.menge}
                              onChange={(e) => setNewPosData(prev => ({ ...prev, menge: e.target.value }))}
                              className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs text-text-secondary font-semibold block mb-1">MwSt.-Kategorie</label>
                            <select className="w-full px-3 py-2 bg-gray-50 border border-border rounded-lg text-sm text-text-secondary cursor-not-allowed" disabled>
                              <option>Normaler Satz {editKonditionen.mwst || 0}%</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-text-secondary font-semibold block mb-1">Nettopreis CHF</label>
                            <input
                              type="number"
                              step="0.05"
                              value={newPosData.einzelpreis}
                              onChange={(e) => handleNettoChange(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-text-secondary font-semibold block mb-1">Bruttopreis CHF</label>
                            <input
                              type="number"
                              step="0.05"
                              value={newPosData.bruttopreis}
                              onChange={(e) => handleBruttoChange(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newPosData.saveToKatalog}
                              onChange={(e) => setNewPosData(prev => ({ ...prev, saveToKatalog: e.target.checked }))}
                              className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                            />
                            <span className="text-sm font-semibold text-text-primary">Artikel in Artikelliste speichern</span>
                          </label>
                          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <button 
                              onClick={() => setShowNewPositionForm(false)}
                              className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-text-secondary bg-surface border border-border rounded-xl hover:bg-surface-card transition-colors cursor-pointer"
                            >
                              Abbrechen
                            </button>
                            <button 
                              onClick={handleAddNewPosition}
                              className="w-full sm:w-auto px-6 py-2 text-sm font-bold text-white bg-primary-600 rounded-xl hover:bg-primary-700 shadow-sm transition-colors cursor-pointer"
                            >
                              Hinzufügen
                            </button>
                          </div>
                        </div>
                      </div>
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

              </div>

              {/* Schlusstext Card */}
              {(isEditing || daten.schlusstext) && (
                <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-xs space-y-3">
                  <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block">
                    Schlusstext {isEditing ? '(erscheint auf dem PDF)' : ''}
                  </label>
                  {isEditing ? (
                    <>
                      <div className="flex flex-wrap gap-2 mb-1">
                        {[
                          { label: 'Standard', text: 'Wir danken Ihnen für das Vertrauen und stehen für Fragen gerne zur Verfügung.' },
                          { label: 'Mit Gültigkeit', text: 'Diese Offerte ist 30 Tage gültig. Materialpreisänderungen bleiben vorbehalten. Wir danken Ihnen für das Vertrauen und freuen uns auf Ihren Auftrag.' },
                          { label: 'Ausführlich', text: 'Die Offerte versteht sich exkl. allfälliger Gerüstkosten und bauseitiger Vorleistungen. Materialpreisänderungen bleiben vorbehalten. Nicht offerierte Arbeiten werden nach Aufwand verrechnet. Wir danken Ihnen für das Vertrauen und stehen für Fragen gerne zur Verfügung.' },
                        ].map((tpl) => (
                          <button
                            key={tpl.label}
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
                        placeholder="Wir danken Ihnen für das Vertrauen..."
                      />
                    </>
                  ) : (
                    <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{daten.schlusstext}</p>
                  )}
                </div>
              )}

              {/* Anhänge Card */}
              <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block">
                      Anhänge & Beilagen
                    </label>
                    <p className="text-xs text-text-secondary mt-0.5">z.B. AGB, Skizzen oder Pläne</p>
                  </div>
                  {isEditing && userRole !== 'treuhand' && (
                    <div>
                      <input 
                        type="file" 
                        id="file-upload" 
                        className="hidden" 
                        onChange={handleFileUpload}
                        disabled={isUploading}
                      />
                      <label 
                        htmlFor="file-upload"
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                          isUploading ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-wait' : 'bg-surface border-border text-text-secondary hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200'
                        }`}
                      >
                        {isUploading ? 'Lädt hoch...' : '📎 Datei hochladen'}
                      </label>
                    </div>
                  )}
                </div>
                
                {(isEditing ? editAnhange : (daten.anhange || [])).length > 0 ? (
                  <div className="space-y-2">
                    {(isEditing ? editAnhange : (daten.anhange || [])).map((anhang, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className="text-lg">📄</span>
                          <div className="truncate">
                            <a href={anhang.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary-600 hover:underline truncate block">
                              {anhang.name}
                            </a>
                            <span className="text-xs text-text-secondary">
                              {(anhang.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>
                        {isEditing && userRole !== 'treuhand' && (
                          <button
                            onClick={() => deleteAttachment(anhang.path)}
                            className="p-1.5 text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Anhang löschen"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary py-2 italic">Keine Anhänge vorhanden.</p>
                )}
              </div>

            </div>

            {/* ================= RIGHT COLUMN: STICKY BENTO SIDEBAR ================= */}
            <div className={`${!(showLivePreview && isEditing) ? 'lg:col-span-4 lg:sticky lg:top-24' : ''} space-y-5`}>
              
              {/* 1. Live Kalkulation Card */}
              <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                    <span>💰</span> Kalkulation {isEditing && <span className="text-primary-600 font-semibold">(Live)</span>}
                  </h3>
                  <span className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-600 font-medium rounded-full">
                    CHF
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Zwischensumme</span>
                    <span className="font-medium text-text-primary">{formatCurrency(isEditing ? editRawTotal : rawTotal)}</span>
                  </div>
                  
                  {(isEditing ? editKonditionen.rabatt : rabatt) > 0 && (
                    <div className="flex justify-between text-sm text-red-600 font-medium">
                      <span>Rabatt ({isEditing ? editKonditionen.rabatt : rabatt}%)</span>
                      <span>- {formatCurrency(isEditing ? editRabattBetrag : rabattBetrag)}</span>
                    </div>
                  )}
                  
                  {(isEditing ? editKonditionen.mwst : mwst) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">MwSt ({isEditing ? editKonditionen.mwst : mwst}%)</span>
                      <span className="font-medium text-text-primary">{formatCurrency(isEditing ? editMwstBetrag : mwstBetrag)}</span>
                    </div>
                  )}
                  
                  {isEditing && isPauschal && editPauschalpreis && (
                    <div className="flex justify-between text-sm text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-lg">
                      <span>⚡ Pauschalpreis</span>
                      <span>aktiv</span>
                    </div>
                  )}
                  
                  <div className="pt-3.5 mt-2 border-t border-border flex justify-between items-baseline">
                    <span className="font-bold text-lg text-text-primary">Total</span>
                    <span className="font-black text-2xl sm:text-3xl tracking-tight text-primary-700">
                      {formatCurrency(isEditing ? editFinalTotal : finalTotal)}
                    </span>
                  </div>
                  
                  {(isEditing ? editOptionalTotal : optionenTotal) > 0 && (
                    <div className="pt-2 border-t border-border/50 flex justify-between text-xs text-text-secondary">
                      <span>Optionale Positionen</span>
                      <span className="font-medium">{formatCurrency(isEditing ? editOptionalTotal : optionenTotal)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Stammdaten Card */}
              <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                    <span>📋</span> Stammdaten
                  </h3>
                  {kunde && (
                    <span className="text-[11px] font-mono font-medium text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-100">
                      {kunde.kundennummer || `K-${kunde.id}`}
                    </span>
                  )}
                </div>

                {/* Kunde */}
                <div>
                  <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold flex items-center gap-1 mb-1.5">
                    <span>👤</span> Kunde
                  </label>
                  {isEditing && (status === 'Entwurf' || status === 'In Überarbeitung') ? (
                    <select
                      value={editKundeId}
                      onChange={(e) => setEditKundeId(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm font-medium focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                    >
                      <option value="">Bitte wählen...</option>
                      {kundenList.map(k => (
                        <option key={k.id} value={k.id}>{k.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="bg-surface/60 rounded-xl p-3 border border-border/60">
                      <div className="font-semibold text-text-primary text-sm">{kunde ? kunde.name : (offerte.kunden_name || 'Unbekannt')}</div>
                      {kunde && kunde.ort && <div className="text-xs text-text-secondary mt-0.5">📍 {kunde.ort}</div>}
                      {kunde && kunde.email && <div className="text-xs text-text-secondary mt-0.5">✉️ {kunde.email}</div>}
                    </div>
                  )}
                </div>

                {/* Projekt */}
                <div>
                  <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold flex items-center gap-1 mb-1.5">
                    <span>🏗️</span> Projekt / Baustelle
                  </label>
                  {isEditing && (status === 'Entwurf' || status === 'In Überarbeitung') ? (
                    <select
                      value={editProjektId}
                      onChange={(e) => setEditProjektId(e.target.value)}
                      disabled={!editKundeId}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm font-medium focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 disabled:opacity-50"
                    >
                      <option value="">Kein Projekt zugeordnet</option>
                      {projekteList.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="bg-surface/60 rounded-xl p-3 border border-border/60">
                      <div className="font-semibold text-text-primary text-sm">{projekt ? projekt.name : 'Kein Projekt zugeordnet'}</div>
                      {projekt && projekt.adresse && <div className="text-xs text-text-secondary mt-0.5">📍 {projekt.adresse}</div>}
                    </div>
                  )}
                </div>

                {/* Ausführung */}
                {isEditing ? (
                  <div className="pt-2 border-t border-border/60 space-y-2">
                    <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold flex items-center gap-1">
                      <span>📅</span> Geplante Ausführung
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-text-secondary uppercase font-medium">Start</label>
                        <input
                          type="text"
                          value={editAusfuehrung.start}
                          onChange={(e) => setEditAusfuehrung({ ...editAusfuehrung, start: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs"
                          placeholder="z.B. Nächste Woche"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-text-secondary uppercase font-medium">Dauer</label>
                        <input
                          type="text"
                          value={editAusfuehrung.dauer}
                          onChange={(e) => setEditAusfuehrung({ ...editAusfuehrung, dauer: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs"
                          placeholder="z.B. 2-3 Tage"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  (daten.ausfuehrung?.start || daten.ausfuehrung?.dauer) && (
                    <div className="pt-2 border-t border-border/60">
                      <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold flex items-center gap-1 mb-1">
                        <span>📅</span> Ausführung
                      </label>
                      <div className="text-xs text-text-primary bg-surface/60 p-2.5 rounded-lg border border-border/60 space-y-0.5">
                        {daten.ausfuehrung.start && <div>Start: <span className="font-medium">{daten.ausfuehrung.start}</span></div>}
                        {daten.ausfuehrung.dauer && <div>Dauer: <span className="font-medium">{daten.ausfuehrung.dauer}</span></div>}
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* 3. Fristen & Gültigkeit Card */}
              <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                    <span>⏱️</span> Fristen
                  </h3>
                </div>
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Gültigkeit Offerte</label>
                      <select 
                        value={editKonditionen.gueltigkeit}
                        onChange={(e) => setEditKonditionen({ ...editKonditionen, gueltigkeit: e.target.value })}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                      >
                        <option value="10 Tage">10 Tage</option>
                        <option value="14 Tage">14 Tage</option>
                        <option value="30 Tage">30 Tage</option>
                        <option value="60 Tage">60 Tage</option>
                        <option value="90 Tage">90 Tage</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Zahlungsfrist (Rechnung)</label>
                      <select 
                        value={editKonditionen.zahlungsfrist}
                        onChange={(e) => setEditKonditionen({ ...editKonditionen, zahlungsfrist: e.target.value })}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                      >
                        <option value="10 Tage Netto">10 Tage Netto</option>
                        <option value="14 Tage Netto">14 Tage Netto</option>
                        <option value="30 Tage Netto">30 Tage Netto</option>
                        <option value="60 Tage Netto">60 Tage Netto</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold">Gültigkeit</span>
                        {(offerte.gueltig_bis || daten.gueltig_bis) && onNavigate && (
                          <button
                            type="button"
                            onClick={() => onNavigate('kalender', { date: offerte.gueltig_bis || daten.gueltig_bis })}
                            className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Im Kalender ansehen"
                          >
                            <span>📅 Im Kalender ansehen</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </button>
                        )}
                      </div>
                      <div className="font-medium text-text-primary flex items-center gap-2">
                        <span>{daten.konditionen?.gueltigkeit || '30 Tage'}</span>
                        {(offerte.gueltig_bis || daten.gueltig_bis) && (
                          <span className="text-xs text-text-secondary">
                            (bis {formatDate(offerte.gueltig_bis || daten.gueltig_bis)})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border/50">
                      <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-0.5">Zahlungsfrist</span>
                      <span className="font-medium text-text-primary">{daten.konditionen?.zahlungsfrist || '30 Tage Netto'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Interne Notizen Card */}
              <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-xs space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-border/60">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                    <span>📝</span> Interne Notizen
                  </h3>
                  <span className="text-[10px] text-text-secondary font-medium">Auto-Save</span>
                </div>
                <textarea 
                  defaultValue={offerte.notizen || ''}
                  onBlur={(e) => handleUpdate('notizen', e.target.value)}
                  className="w-full h-24 px-3 py-2 bg-surface border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none"
                  placeholder="Interne Absprachen, Notizen zur Offerte..."
                />
              </div>

            </div>

          </div>
        </div>

        {showLivePreview && isEditing && (
          <div className="hidden xl:block bg-gray-100 rounded-2xl border border-border overflow-y-auto sticky top-6 shadow-inner" style={{ height: 'calc(100vh - 120px)' }}>
            <Suspense fallback={<div className="flex h-64 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" /></div>}>
              <OffertePrintView offerte={previewOfferte} kunde={kunde} projekt={projekt} previewMode={true} />
            </Suspense>
          </div>
        )}
        </div>
      )}

      {isEditing && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-[240px] bg-surface/80 backdrop-blur-md border-t border-border p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 animate-slide-up">
          <button
            onClick={cancelEditing}
            className="w-full sm:w-auto min-h-[48px] px-5 py-3 bg-surface-card border border-border text-text-secondary font-bold text-base sm:text-sm rounded-xl hover:bg-surface transition-colors cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            onClick={saveEditing}
            disabled={isUpdating}
            className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold text-base sm:text-sm rounded-xl hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
          >
            {isUpdating ? 'Speichert...' : '💾 Änderungen speichern'}
          </button>
        </div>
      )}

      {showKatalogDrawer && (
        <KatalogDrawer
          onClose={() => setShowKatalogDrawer(false)}
          onInsert={handleInsertFromKatalog}
        />
      )}

      <VoiceWaveformModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onSuccess={handleVoicePositionsExtracted}
        title="Offerte per Sprache kalkulieren"
        subtitle="Diktieren Sie Ausmasse, Leistungen und Mengen auf Schweizerdeutsch oder Hochdeutsch (z.B. 'Böden mit Vlies abdecken 65m2, Wände schleifen und 2-mal weiss streichen ca. 180m2')."
        mode="offerte"
        contextData={{ katalog: katalogList }}
      />

      {showDuplicateModal && (
        <DocumentDuplicateModal
          type="offerte"
          currentDocument={offerte}
          onClose={() => setShowDuplicateModal(false)}
          onSuccess={(newId) => {
            setShowDuplicateModal(false)
            onNavigate('offerten', { offerteId: newId, edit: true })
          }}
        />
      )}

      {/* Archive Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowArchiveModal(false)}>
          <div className="bg-surface-card rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl mb-4">
              📁
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Offerte archivieren?</h3>
            <p className="text-text-secondary text-sm mb-6 leading-relaxed">
              Möchtest du die Offerte <strong>#{offerte.offerte_nr || offerte.id}</strong> wirklich archivieren? Sie wird in der Hauptliste ausgeblendet und kann jederzeit wiederhergestellt werden.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={() => setShowArchiveModal(false)}
                className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={handleArchive}
                disabled={isUpdating}
                className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-5 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {isUpdating ? 'Wird archiviert...' : 'Ja, archivieren'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-surface-card rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-2xl mb-4">
              🗑️
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Offerte löschen?</h3>
            <p className="text-text-secondary text-sm mb-6 leading-relaxed">
              Möchtest du diese Offerte wirklich unwiderruflich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDeleteOfferte}
                disabled={isUpdating}
                className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {isUpdating ? 'Löscht...' : 'Unwiderruflich löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Rechnung Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowConvertModal(false)}>
          <div className="bg-surface-card rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl mb-4">
              🧾
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">In Rechnung umwandeln?</h3>
            <p className="text-text-secondary text-sm mb-6 leading-relaxed">
              Möchtest du aus dieser Offerte eine neue Rechnung erstellen? Der Status der Offerte wechselt automatisch auf &quot;Verrechnet&quot;.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={() => setShowConvertModal(false)}
                className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmConvertToRechnung}
                disabled={isUpdating}
                className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {isUpdating ? 'Erstellt...' : 'Rechnung erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard Changes Modal */}
      {showDiscardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowDiscardModal(false)}>
          <div className="bg-surface-card rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl mb-4">
              ⚠️
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Änderungen verwerfen?</h3>
            <p className="text-text-secondary text-sm mb-6 leading-relaxed">
              Möchtest du den Bearbeitungsmodus wirklich verlassen? Alle nicht gespeicherten Änderungen an dieser Offerte gehen verloren.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={() => setShowDiscardModal(false)}
                className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
              >
                Weiter bearbeiten
              </button>
              <button
                onClick={confirmDiscardChanges}
                className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                Änderungen verwerfen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Attachment Modal */}
      {deleteAttachmentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setDeleteAttachmentTarget(null)}>
          <div className="bg-surface-card rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-2xl mb-4">
              📎
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Anhang löschen?</h3>
            <p className="text-text-secondary text-sm mb-6 leading-relaxed">
              Möchtest du diese Datei wirklich aus den Anhängen entfernen?
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={() => setDeleteAttachmentTarget(null)}
                className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmDeleteAttachment}
                className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                Anhang löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Termin Modal for scheduling appointments */}
      {isTerminModalOpen && (
        <TerminModal
          isOpen={isTerminModalOpen}
          onClose={() => {
            setIsTerminModalOpen(false)
            setTerminModalInitial(null)
          }}
          onSave={handleSaveTermin}
          initialData={terminModalInitial}
          projekte={projekteList.length > 0 ? projekteList : (projekt ? [projekt] : [])}
          kunden={kundenList.length > 0 ? kundenList : (kunde ? [kunde] : [])}
        />
      )}

      {/* Feedback Toast */}
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
