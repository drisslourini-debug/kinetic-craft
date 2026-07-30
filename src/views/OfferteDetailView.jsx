import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import OffertePrintView from './OffertePrintView'
import KatalogDrawer from '../components/KatalogDrawer'
import OfferteDuplicateModal from '../components/OfferteDuplicateModal'

export default function OfferteDetailView({ offerte, onBack, onNavigate, viewParams }) {
  const [kunde, setKunde] = useState(null)
  const [projekt, setProjekt] = useState(null)
  const [status, setStatus] = useState(offerte.status || 'Entwurf')
  const [isUpdating, setIsUpdating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('stammdaten')
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
  const [textVorlagen, setTextVorlagen] = useState([])
  const [projekteList, setProjekteList] = useState([])

  const [showKatalogDrawer, setShowKatalogDrawer] = useState(false)
  const [showKatalogMenu, setShowKatalogMenu] = useState(false)
  const [showLivePreview, setShowLivePreview] = useState(false)
  const [showNewPositionForm, setShowNewPositionForm] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [newPosData, setNewPosData] = useState({
    beschreibung: '', menge: '', einheit: 'Stück (Stk)', einzelpreis: '', bruttopreis: '', kategorie: 'Waren', saveToKatalog: false
  })

  useEffect(() => {
    if (viewParams?.edit && !isEditing && !isLoading) {
      startEditing()
    }
  }, [viewParams, isLoading, isEditing])

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
  }, [isEditing, editKundeId])

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
    if (!window.confirm('Offerte wirklich archivieren?')) return
    setIsUpdating(true)
    try {
      await supabase.from('offerten').update({ is_archived: true }).eq('id', offerte.id)
      onBack()
    } catch (err) {
      console.error('Fehler beim Archivieren:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleConvertToRechnung = async () => {
    if (!window.confirm('Diese Offerte in eine Rechnung umwandeln?')) return
    setIsUpdating(true)
    try {
      // Generate next rechnung_nr: RE-YYYY-NNN
      const year = new Date().getFullYear()
      const { data: existing } = await supabase
        .from('rechnungen')
        .select('rechnung_nr')
        .ilike('rechnung_nr', `RE-${year}-%`)
        .order('rechnung_nr', { ascending: false })
        .limit(1)
      
      let nextNum = 1
      if (existing && existing.length > 0) {
        const lastNr = existing[0].rechnung_nr
        const parts = lastNr.split('-')
        nextNum = parseInt(parts[2]) + 1
      }
      const rechnungNr = `RE-${year}-${String(nextNum).padStart(3, '0')}`

      // Calculate faellig_am based on customer's payment term
      let fristTage = 30
      if (kunde?.zahlungsziel) {
        if (kunde.zahlungsziel.includes('10')) fristTage = 10
        else if (kunde.zahlungsziel.includes('14')) fristTage = 14
        else if (kunde.zahlungsziel.includes('30')) fristTage = 30
        else if (kunde.zahlungsziel.includes('Bar') || kunde.zahlungsziel.includes('Voraus')) fristTage = 0
      }

      const rechnungsdatum = new Date()
      const faelligAm = new Date(rechnungsdatum)
      faelligAm.setDate(faelligAm.getDate() + fristTage)

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
          faellig_am: faelligAm.toISOString().split('T')[0],
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
        
        alert(`Rechnung ${rechnungNr} wurde erstellt! Navigiere zur Rechnung...`)
        // Navigate to the new Rechnung
        if (onNavigate) {
          onNavigate('rechnungen', { rechnungId: newRechnung[0].id })
        } else {
          window.location.reload()
        }
      }
    } catch (err) {
      console.error('Fehler beim Umwandeln:', err)
      alert('Fehler beim Umwandeln in Rechnung: ' + err.message)
    } finally {
      setIsUpdating(false)
    }
  }

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

  const startEditing = () => {
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
    if (!window.confirm('Änderungen verwerfen?')) return
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
    } catch (err) {
      console.error('Fehler beim Upload:', err)
      alert('Upload fehlgeschlagen: ' + err.message)
    } finally {
      setIsUploading(false)
      // reset file input
      event.target.value = ''
    }
  }

  const deleteAttachment = async (path) => {
    if (!window.confirm('Anhang wirklich löschen?')) return
    
    // We remove it from the list. The actual file can be deleted from storage if needed.
    // Let's also delete it from storage to keep it clean.
    try {
      await supabase.storage.from('anhange').remove([path])
      setEditAnhange(prev => prev.filter(a => a.path !== path))
    } catch (err) {
      console.error('Fehler beim Löschen:', err)
      alert('Fehler beim Löschen: ' + err.message)
    }
  }

  const saveEditing = async () => {
    setIsUpdating(true)
    try {
      const cleanLeistungen = editLeistungen.map(({ _id, ...pos }) => pos)
      
      const calcTotal = cleanLeistungen
        .filter(p => !p.optional)
        .reduce((sum, p) => sum + (parseFloat(p.menge) || 0) * (parseFloat(p.einzelpreis) || 0), 0)
      const rabattBetrag = calcTotal * (editKonditionen.rabatt / 100)
      const nachRabatt = calcTotal - rabattBetrag
      const mwstBetrag = nachRabatt * (editKonditionen.mwst / 100)
      const finalTotal = isPauschal && editPauschalpreis ? parseFloat(editPauschalpreis) : nachRabatt + mwstBetrag

      const updatedDaten = {
        ...offerte.daten,
        leistungen: cleanLeistungen,
        konditionen: {
          rabatt: editKonditionen.rabatt,
          mwst: editKonditionen.mwst,
          gueltigkeit: editKonditionen.gueltigkeit,
          zahlungsfrist: editKonditionen.zahlungsfrist
        },
        einleitungstext: editEinleitung || null,
        schlusstext: editSchluss || null,
        pauschalpreis: isPauschal ? parseFloat(editPauschalpreis) || null : null,
        ausfuehrung: editAusfuehrung,
        anhange: editAnhange
      }

      await supabase
        .from('offerten')
        .update({ daten: updatedDaten, total: finalTotal, kunden_id: editKundeId, projekt_id: editProjektId || null })
        .eq('id', offerte.id)
      
      offerte.daten = updatedDaten
      offerte.total = finalTotal
      offerte.kunden_id = editKundeId
      offerte.projekt_id = editProjektId || null

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
      alert('Offerte gespeichert!')
    } catch (err) {
      console.error('Fehler beim Speichern:', err)
      alert('Fehler beim Speichern der Offerte.')
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

  const addPosition = () => {
    setEditLeistungen(prev => recalculatePositions([...prev, {
      _id: Date.now(),
      type: 'position',
      posNr: '',
      beschreibung: '',
      menge: '',
      einheit: '',
      einzelpreis: '',
      kategorie: '',
      optional: false,
    }]))
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
    if (!newPosData.beschreibung) {
      alert('Bitte einen Namen/Beschreibung eingeben.');
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

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('de-CH', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  // Parse daten safely
  const daten = offerte.daten || {}
  const leistungen = daten.leistungen || []
  const rabatt = parseFloat(daten.konditionen?.rabatt || 0)
  const mwst = parseFloat(daten.konditionen?.mwst || 0)
  
  const rawTotal = leistungen
    .filter(p => !p.optional)
    .reduce((sum, pos) => sum + (parseFloat(pos.menge) || 0) * (parseFloat(pos.einzelpreis) || 0), 0)
  const rabattBetrag = rawTotal * (rabatt / 100)
  const totalNachRabatt = rawTotal - rabattBetrag
  const mwstBetrag = totalNachRabatt * (mwst / 100)
  const finalTotal = daten.pauschalpreis ? parseFloat(daten.pauschalpreis) : totalNachRabatt + mwstBetrag

  // Edit-mode live calculation
  const editRawTotal = editLeistungen
    .filter(p => !p.optional)
    .reduce((sum, p) => sum + (parseFloat(p.menge) || 0) * (parseFloat(p.einzelpreis) || 0), 0)
  const editRabattBetrag = editRawTotal * (editKonditionen.rabatt / 100)
  const editNachRabatt = editRawTotal - editRabattBetrag
  const editMwstBetrag = editNachRabatt * (editKonditionen.mwst / 100)
  const editFinalTotal = isPauschal && editPauschalpreis ? parseFloat(editPauschalpreis) : editNachRabatt + editMwstBetrag
  const editOptionalTotal = editLeistungen
    .filter(p => p.optional)
    .reduce((sum, p) => sum + (parseFloat(p.menge) || 0) * (parseFloat(p.einzelpreis) || 0), 0)

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
    return <OffertePrintView offerte={offerte} kunde={kunde} projekt={projekt} onClose={() => setShowPrintView(false)} />
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
            <p className="text-text-secondary mt-1">Erstellt am {formatDate(offerte.created_at)}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isUpdating}
            className={`px-4 py-2.5 text-sm font-bold rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all cursor-pointer focus:ring-primary-500/30 hidden sm:block ${
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
              className={`hidden xl:inline-flex items-center gap-2 px-4 py-2.5 font-bold text-sm rounded-xl transition-colors shadow-sm cursor-pointer border ${
                showLivePreview 
                  ? 'bg-primary-50 text-primary-700 border-primary-200' 
                  : 'bg-surface text-text-secondary border-border hover:bg-surface-card hover:text-text-primary'
              }`}
              title="Split-Screen Live-Vorschau (nur Desktop)"
            >
              {showLivePreview ? '👁️ Live-Vorschau an' : '👁️ Live-Vorschau aus'}
            </button>
          )}
          {!isEditing && (
            <button
              onClick={startEditing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface border border-primary-200 text-primary-700 font-bold text-sm rounded-xl hover:bg-primary-50 transition-colors cursor-pointer shadow-sm"
            >
              ✏️ Offerte bearbeiten
            </button>
          )}
          <button
            onClick={() => setShowPrintView(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white font-bold text-sm rounded-xl hover:bg-primary-700 transition-colors shadow-md shadow-primary-600/20 active:scale-[0.98] cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span className="hidden sm:inline">PDF generieren</span>
            <span className="sm:hidden">PDF</span>
          </button>

          {/* Secondary Actions Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowActionMenu(!showActionMenu)}
              className="w-10 h-10 flex items-center justify-center bg-surface border border-border text-text-secondary rounded-xl hover:text-text-primary hover:bg-neutral-50 transition-colors shrink-0 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
            </button>
            
            {showActionMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowActionMenu(false)}></div>
                <div className="absolute right-0 top-12 w-56 bg-surface-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-slide-in-right sm:animate-fade-in-up">
                  <div className="p-1">
                    {daten.docUrl && (
                      <a 
                        href={daten.docUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={() => setShowActionMenu(false)}
                        className="w-full text-left px-3 py-2 text-sm font-medium text-text-primary hover:bg-neutral-100 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <span className="text-lg">📄</span> Google Doc öffnen
                      </a>
                    )}
                    <button 
                      onClick={() => { setShowActionMenu(false); handleDuplicate(); }}
                      disabled={isEditing}
                      className="w-full text-left px-3 py-2 text-sm font-medium text-text-primary hover:bg-neutral-100 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span className="text-lg">📋</span> Duplizieren
                    </button>
                    {status === 'Akzeptiert' && (
                      <button
                        onClick={() => { setShowActionMenu(false); handleConvertToRechnung(); }}
                        disabled={isEditing}
                        className="w-full text-left px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <span className="text-lg">🧾</span> In Rechnung umwandeln
                      </button>
                    )}
                    <button 
                      onClick={async () => {
                        setShowActionMenu(false);
                        if (offerte.is_archived) {
                          if (!window.confirm('Offerte wiederherstellen?')) return
                          setIsUpdating(true)
                          try {
                            await supabase.from('offerten').update({ is_archived: false }).eq('id', offerte.id)
                            window.location.reload()
                          } catch (err) {
                            console.error('Fehler beim Wiederherstellen:', err)
                          } finally {
                            setIsUpdating(false)
                          }
                        } else {
                          handleArchive();
                        }
                      }}
                      disabled={isEditing}
                      className="w-full text-left px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span className="text-lg">📦</span> {offerte.is_archived ? 'Wiederherstellen' : 'Archivieren'}
                    </button>
                  </div>
                  {/* Mobile Status Select embedded in action menu */}
                  <div className="sm:hidden border-t border-border p-3 bg-surface">
                    <label className="text-xs font-bold uppercase tracking-wider text-text-secondary block mb-2">Status</label>
                    <select
                      value={status}
                      onChange={(e) => {
                        handleStatusChange(e.target.value)
                        setShowActionMenu(false)
                      }}
                      disabled={isUpdating}
                      className="w-full px-3 py-2 text-sm font-bold rounded-lg border-2 border-border focus:outline-none focus:border-primary-400 bg-surface"
                    >
                      <option value="Entwurf">Entwurf</option>
                      <option value="Versendet">Versendet</option>
                      <option value="In Überarbeitung">In Überarbeitung</option>
                      <option value="Akzeptiert">Akzeptiert</option>
                      <option value="Abgelehnt">Abgelehnt</option>
                      <option value="Verrechnet">Verrechnet</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* End Header Actions */}
      {isLoading ? (
        <div className="p-8 text-center text-text-secondary">Lade Daten...</div>
      ) : (
        <div className={showLivePreview ? "grid grid-cols-1 xl:grid-cols-2 gap-6" : ""}>
        <div className="space-y-8 animate-fade-in">
          
          {/* STAMMDATEN & INFO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm space-y-6">
                <h3 className="text-lg font-bold text-text-primary">Stammdaten</h3>
                
                <div>
                  <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold flex items-center gap-1"><span>👤</span> Kunde</label>
                  {isEditing && (status === 'Entwurf' || status === 'In Überarbeitung') ? (
                    <select
                      value={editKundeId}
                      onChange={(e) => setEditKundeId(e.target.value)}
                      className="mt-1.5 w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm font-medium focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                    >
                      <option value="">Bitte wählen...</option>
                      {kundenList.map(k => (
                        <option key={k.id} value={k.id}>{k.name}</option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <div className="mt-1.5 font-medium text-text-primary">{kunde ? kunde.name : (offerte.kunden_name || 'Unbekannt')}</div>
                      {kunde && kunde.ort && <div className="text-sm text-text-secondary">{kunde.ort}</div>}
                    </>
                  )}
                </div>

                <div className="pt-4 border-t border-border">
                  <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold flex items-center gap-1"><span>🏗️</span> Projekt / Baustelle</label>
                  {isEditing && (status === 'Entwurf' || status === 'In Überarbeitung') ? (
                    <select
                      value={editProjektId}
                      onChange={(e) => setEditProjektId(e.target.value)}
                      disabled={!editKundeId}
                      className="mt-1.5 w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm font-medium focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 disabled:opacity-50"
                    >
                      <option value="">Kein Projekt zugeordnet</option>
                      {projekteList.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <div className="mt-1.5 font-medium text-text-primary">{projekt ? projekt.name : 'Kein Projekt zugeordnet'}</div>
                      {projekt && projekt.adresse && <div className="text-sm text-text-secondary">{projekt.adresse}</div>}
                    </>
                  )}
                </div>

                {/* Editable Ausfuehrung inline inside Stammdaten grid block */}
                {isEditing ? (
                  <div className="pt-4 border-t border-border space-y-3">
                    <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold flex items-center gap-1"><span>📅</span> Ausführung</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-text-secondary uppercase">Start</label>
                        <input
                          type="text"
                          value={editAusfuehrung.start}
                          onChange={(e) => setEditAusfuehrung({ ...editAusfuehrung, start: e.target.value })}
                          className="w-full px-2 py-1.5 bg-surface border border-border rounded-lg text-sm"
                          placeholder="z.B. Nächste Woche"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-text-secondary uppercase">Dauer</label>
                        <input
                          type="text"
                          value={editAusfuehrung.dauer}
                          onChange={(e) => setEditAusfuehrung({ ...editAusfuehrung, dauer: e.target.value })}
                          className="w-full px-2 py-1.5 bg-surface border border-border rounded-lg text-sm"
                          placeholder="z.B. 1-2 Tage"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  (daten.ausfuehrung?.start || daten.ausfuehrung?.dauer) && (
                    <div className="pt-4 border-t border-border">
                      <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold flex items-center gap-1"><span>📅</span> Ausführung</label>
                      <div className="mt-1.5 text-sm text-text-primary">
                        {daten.ausfuehrung.start && <>Start: <span className="font-medium">{daten.ausfuehrung.start}</span><br /></>}
                        {daten.ausfuehrung.dauer && <>Dauer: <span className="font-medium">{daten.ausfuehrung.dauer}</span></>}
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="space-y-6">
                <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
                  <h3 className="text-lg font-bold text-text-primary mb-2">Fristen</h3>
                  
                  {isEditing ? (
                    <>
                      <div>
                        <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1.5">Gültigkeit Offerte</label>
                        <select 
                          value={editKonditionen.gueltigkeit}
                          onChange={(e) => setEditKonditionen({ ...editKonditionen, gueltigkeit: e.target.value })}
                          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                        >
                          <option value="10 Tage">10 Tage</option>
                          <option value="14 Tage">14 Tage</option>
                          <option value="30 Tage">30 Tage</option>
                          <option value="60 Tage">60 Tage</option>
                          <option value="90 Tage">90 Tage</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1.5">Zahlungsfrist (Rechnung)</label>
                        <select 
                          value={editKonditionen.zahlungsfrist}
                          onChange={(e) => setEditKonditionen({ ...editKonditionen, zahlungsfrist: e.target.value })}
                          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                        >
                          <option value="10 Tage Netto">10 Tage Netto</option>
                          <option value="14 Tage Netto">14 Tage Netto</option>
                          <option value="30 Tage Netto">30 Tage Netto</option>
                          <option value="14 Tage 2% Skonto, 30 Tage Netto">14 Tage 2% Skonto, 30 Tage Netto</option>
                          <option value="Vorauskasse">Vorauskasse</option>
                          <option value="Barzahlung bei Abschluss">Barzahlung bei Abschluss</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Gültigkeit</label>
                        <div className="text-sm font-medium text-text-primary">{daten.konditionen?.gueltigkeit || '30 Tage'}</div>
                      </div>
                      <div>
                        <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Zahlungsfrist</label>
                        <div className="text-sm font-medium text-text-primary">{daten.konditionen?.zahlungsfrist || '30 Tage Netto'}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-text-primary mb-4">Interne Notizen</h3>
                  <textarea 
                    defaultValue={offerte.notizen || ''}
                    onBlur={(e) => handleUpdate('notizen', e.target.value)}
                    className="w-full h-32 px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none"
                    placeholder="Absprachen, Rückrufe, Besonderheiten zur Offerte..."
                  />
                </div>
              </div>
            </div>

          {/* LEISTUNGEN & KALKULATION */}
          <div className="space-y-6">
              
              {/* Edit-Mode Toggle */}
              {isEditing && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
                      <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                      Bearbeitungsmodus
                    </span>
                  </div>
                </div>
              )}

              {/* Einleitungstext (only in edit mode) */}
              {isEditing && (
                <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm">
                  <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">Einleitungstext (erscheint auf dem PDF)</label>
                  <div className="flex flex-wrap gap-2 mb-3">
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
              {/* Show existing einleitungstext in read mode */}
              {!isEditing && daten.einleitungstext && (
                <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm">
                  <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">Einleitungstext</label>
                  <p className="text-sm text-text-primary whitespace-pre-wrap">{daten.einleitungstext}</p>
                </div>
              )}

              <div className="w-full space-y-8">

                {/* ===== LEISTUNGEN TABLE (READ / EDIT) ===== */}
                <div className="w-full">
                  <div className="bg-surface-card rounded-2xl border border-border overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-border bg-surface flex items-center justify-between">
                      <h3 className="text-lg font-bold text-text-primary">Leistungsverzeichnis</h3>
                      {isEditing && (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={addTitle}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-card text-text-primary border border-border font-semibold text-xs rounded-lg hover:bg-surface transition-colors cursor-pointer"
                          >
                            ➕ Titel
                          </button>
                          <div className="flex items-center relative">
                            <button
                              onClick={() => setShowNewPositionForm(true)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 border border-primary-200 border-r-0 font-semibold text-xs rounded-l-lg hover:bg-primary-100 transition-colors cursor-pointer"
                            >
                              ➕ Position hinzufügen
                            </button>
                            <button
                              onClick={() => setShowKatalogMenu(!showKatalogMenu)}
                              className="inline-flex items-center px-2 py-1.5 bg-primary-50 text-primary-700 border border-primary-200 font-semibold text-xs rounded-r-lg hover:bg-primary-100 transition-colors cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            
                            {showKatalogMenu && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowKatalogMenu(false)}></div>
                                <div className="absolute right-0 top-full mt-1 w-48 bg-surface rounded-xl shadow-lg border border-border overflow-hidden z-50 py-1">
                                  <button 
                                    onClick={() => {
                                      setShowKatalogMenu(false)
                                      setShowKatalogDrawer(true)
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-card transition-colors flex items-center gap-2"
                                  >
                                    <span>📖</span> Aus Katalog einfügen
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
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
                            <div className="hidden sm:grid grid-cols-[60px_1fr_80px_80px_100px_120px] gap-4 px-5 py-3 bg-surface-card text-xs font-semibold text-text-secondary uppercase tracking-wider">
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
                                <div key={idx} className={`p-4 sm:px-5 sm:py-3 hover:bg-primary-50/30 transition-colors ${isKategorie ? 'bg-surface-card border-b-2 border-border/50 shadow-sm mt-2' : isInfo ? 'bg-surface' : ''} ${pos.optional ? 'opacity-60' : ''}`}>
                                  
                                  {/* --- MOBILE COMPACT VIEW --- */}
                                  <div className="sm:hidden flex justify-between items-start w-full gap-3">
                                    <div className="flex flex-col min-w-0 flex-1">
                                      <div className={`text-sm text-text-primary ${isKategorie ? 'font-bold text-base' : 'font-medium'}`}>
                                        <span className="font-bold text-text-secondary mr-2">{pos.posNr || (idx + 1)}</span>
                                        {pos.beschreibung}
                                        {pos.optional && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Option</span>}
                                      </div>
                                      {!isInfo && (
                                        <div className="text-xs text-text-secondary mt-1">
                                          {pos.menge} {pos.einheit} à CHF {(parseFloat(pos.einzelpreis) || 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                                        </div>
                                      )}
                                    </div>
                                    {!isInfo && (
                                      <div className="text-sm font-bold text-text-primary shrink-0 pt-0.5 whitespace-nowrap">
                                        CHF {posTotal.toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                                      </div>
                                    )}
                                  </div>

                                  {/* --- DESKTOP TABLE VIEW --- */}
                                  <div className="hidden sm:grid sm:grid-cols-[60px_1fr_80px_80px_100px_120px] gap-4 items-center">
                                    <div className="text-xs font-bold text-text-secondary">
                                      {pos.posNr || (idx + 1)}
                                    </div>
                                    <div className={`text-sm text-text-primary ${isKategorie ? 'font-bold text-base' : 'font-medium'}`}>
                                      {pos.beschreibung}
                                      {pos.optional && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">Option</span>}
                                    </div>
                                    {!isInfo ? (
                                      <>
                                        <div className="text-sm text-text-secondary text-right">{pos.menge}</div>
                                        <div className="text-sm text-text-secondary">{pos.einheit}</div>
                                        <div className="text-sm text-text-secondary text-right">CHF {(parseFloat(pos.einzelpreis) || 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</div>
                                        <div className="text-sm font-bold text-text-primary text-right">CHF {posTotal.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</div>
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
                              {/* Row: Order controls + Description */}
                              <div className="flex items-start gap-3">
                                {/* Move & Delete */}
                                <div className="flex flex-col gap-0.5 pt-1">
                                  <button
                                    onClick={() => movePosition(idx, -1)}
                                    disabled={idx === 0}
                                    className="p-1 rounded hover:bg-surface text-text-secondary hover:text-text-primary disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                                    title="Nach oben"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                  </button>
                                  <button
                                    onClick={() => movePosition(idx, 1)}
                                    disabled={idx === editLeistungen.length - 1}
                                    className="p-1 rounded hover:bg-surface text-text-secondary hover:text-text-primary disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                                    title="Nach unten"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                  </button>
                                </div>

                                {/* Position Number (Read Only Auto-Calc) */}
                                <div className="shrink-0 w-12 pt-2 text-center">
                                  <span className="text-xs font-bold text-text-secondary">{pos.posNr}</span>
                                </div>

                                {/* Description Field */}
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    value={pos.beschreibung}
                                    onChange={(e) => updatePosition(pos._id, 'beschreibung', e.target.value)}
                                    className={`w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 ${pos.type === 'title' ? 'font-bold text-base' : 'font-medium'}`}
                                    placeholder={pos.type === 'title' ? 'Titel (z.B. Gipserarbeiten)' : 'Beschreibung / Leistung...'}
                                  />
                                </div>

                                {/* Optional Toggle */}
                                <label className="flex items-center gap-1.5 cursor-pointer pt-2 shrink-0" title="Als optionale Position markieren">
                                  <input
                                    type="checkbox"
                                    checked={pos.optional || false}
                                    onChange={(e) => updatePosition(pos._id, 'optional', e.target.checked)}
                                    className="accent-amber-500"
                                  />
                                  <span className="text-xs text-text-secondary font-medium">Optional</span>
                                </label>

                                {/* Delete */}
                                <button
                                  onClick={() => deletePosition(pos._id)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-text-secondary hover:text-red-600 transition-colors cursor-pointer shrink-0 mt-1"
                                  title="Position löschen"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>

                                {/* Row: Menge, Einheit, Preis, Total (only if not title) */}
                                {pos.type !== 'title' && (
                                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pl-10">
                                    <div>
                                      <label className="text-xs text-text-secondary font-semibold block mb-1">Menge</label>
                                      <input
                                        type="number"
                                        step="any"
                                        value={pos.menge}
                                        onChange={(e) => updatePosition(pos._id, 'menge', e.target.value)}
                                        className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-border focus:bg-surface focus:border-primary-400 rounded-lg text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-primary-400"
                                        placeholder="0"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-text-secondary font-semibold block mb-1">Einheit</label>
                                      <input
                                        type="text"
                                        value={pos.einheit || ''}
                                        onChange={(e) => updatePosition(pos._id, 'einheit', e.target.value)}
                                        className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-border focus:bg-surface focus:border-primary-400 rounded-lg text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-primary-400"
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
                                            const mwst = editKonditionen.mwst || 0;
                                            updatePosition(pos._id, 'bruttopreis', (netto * (1 + mwst / 100)).toFixed(2));
                                          } else {
                                            updatePosition(pos._id, 'bruttopreis', '');
                                          }
                                        }}
                                        className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-border focus:bg-surface focus:border-primary-400 rounded-lg text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-primary-400"
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
                                            const mwst = editKonditionen.mwst || 0;
                                            updatePosition(pos._id, 'einzelpreis', (brutto / (1 + mwst / 100)).toFixed(2));
                                          } else {
                                            updatePosition(pos._id, 'einzelpreis', '');
                                          }
                                        }}
                                        className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-border focus:bg-surface focus:border-primary-400 rounded-lg text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-primary-400"
                                        placeholder="0.00"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-text-secondary font-semibold block mb-1">Total</label>
                                      <div className="px-3 py-2 bg-surface border border-border rounded-lg text-sm font-bold text-text-primary">
                                        CHF {((parseFloat(pos.menge) || 0) * (parseFloat(pos.einzelpreis) || 0)).toLocaleString('de-CH', { minimumFractionDigits: 2 })}
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
                              <div className="flex gap-2 w-full sm:w-auto">
                                <button 
                                  onClick={() => setShowNewPositionForm(false)}
                                  className="flex-1 sm:flex-none px-4 py-2 text-sm font-semibold text-text-secondary bg-surface border border-border rounded-xl hover:bg-surface-card transition-colors"
                                >
                                  Abbrechen
                                </button>
                                <button 
                                  onClick={handleAddNewPosition}
                                  className="flex-1 sm:flex-none px-6 py-2 text-sm font-bold text-white bg-primary-600 rounded-xl hover:bg-primary-700 shadow-sm transition-colors"
                                >
                                  Hinzufügen
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ===== FUSSBEREICH: KONDITIONEN, TEXTE & KALKULATION ===== */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                  
                  {/* Left Column: Konditionen & Schlusstext */}
                  <div className="space-y-6">
                    {/* Konditionen */}
                    {isEditing && (
                      <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-text-primary">Konditionen</h3>
                        <div className="grid grid-cols-2 gap-3">
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

                        {/* Pauschalpreis Toggle */}
                        <div className="pt-3 border-t border-border">
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
                  
                  {/* Right Column: Kalkulation Summary Box */}
                  <div>
                    <div className="bg-surface-card rounded-2xl p-6 shadow-sm border border-border sticky top-6">
                      <h3 className="text-text-secondary text-sm font-semibold mb-6">Kalkulation {isEditing && '(Live)'}</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-text-secondary">Zwischensumme</span>
                          <span className="text-text-primary">CHF {(isEditing ? editRawTotal : rawTotal).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {(isEditing ? editKonditionen.rabatt : rabatt) > 0 && (
                          <div className="flex justify-between text-sm text-red-600 font-medium">
                            <span>Rabatt ({isEditing ? editKonditionen.rabatt : rabatt}%)</span>
                            <span>- CHF {(isEditing ? editRabattBetrag : rabattBetrag).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {(isEditing ? editKonditionen.mwst : mwst) > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-text-secondary">MwSt ({isEditing ? editKonditionen.mwst : mwst}%)</span>
                            <span className="text-text-primary">CHF {(isEditing ? editMwstBetrag : mwstBetrag).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {isEditing && isPauschal && editPauschalpreis && (
                          <div className="flex justify-between text-sm text-amber-600 font-medium">
                            <span>⚡ Pauschalpreis</span>
                            <span>aktiv</span>
                          </div>
                        )}
                        <div className="pt-4 mt-4 border-t border-border flex justify-between items-center">
                          <span className="font-bold text-xl text-text-primary">Total</span>
                          <span className="font-black text-3xl tracking-tight text-text-primary">CHF {(isEditing ? editFinalTotal : finalTotal).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {isEditing && editOptionalTotal > 0 && (
                          <div className="pt-3 mt-1 border-t border-border/50 flex justify-between text-xs text-text-secondary">
                            <span>Optionale Positionen</span>
                            <span>CHF {editOptionalTotal.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>
            </div>

          

          {/* Full Width Schlusstext & Anhänge */}
          <div className="space-y-6 pt-6">
            {/* Schlusstext */}
                    {isEditing && (
                      <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm">
                        <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">Schlusstext (erscheint auf dem PDF)</label>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {[
                            { label: 'Standard', text: 'Wir danken Ihnen für das Vertrauen und stehen für Fragen gerne zur Verfügung.' },
                            { label: 'Mit Gültigkeit', text: 'Diese Offerte ist 30 Tage gültig. Materialpreisänderungen bleiben vorbehalten. Wir danken Ihnen für das Vertrauen und freuen uns auf Ihren Auftrag.' },
                            { label: 'Ausführlich', text: 'Die Offerte versteht sich exkl. allfälliger Gerüstkosten und bauseitiger Vorleistungen. Materialpreisänderungen bleiben vorbehalten. Nicht offerierte Arbeiten werden nach Aufwand verrechnet. Wir danken Ihnen für das Vertrauen und stehen für Fragen gerne zur Verfügung.' },
                          ].map((tpl) => (
                            <button
                              key={tpl.label}
                              onClick={() => setEditSchluss(tpl.text)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
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
                          placeholder="Wir danken Ihnen für das Vertrauen und stehen für Fragen gerne zur Verfügung."
                        />
                      </div>
                    )}
                    {!isEditing && daten.schlusstext && (
                      <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm">
                        <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">Schlusstext</label>
                        <p className="text-sm text-text-primary whitespace-pre-wrap">{daten.schlusstext}</p>
                      </div>
                    )}

                    {/* Anhänge */}
                    <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block">Anhänge (z.B. AGBs, Pläne)</label>
                        {isEditing && (
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
                              {isEditing && (
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
                        <p className="text-sm text-text-secondary text-center py-4">Keine Anhänge vorhanden.</p>
                      )}
                    </div>
          </div>

          {/* Action Buttons removed from bottom - now in top menu */}
        </div>

        {showLivePreview && isEditing && (
          <div className="hidden xl:block bg-gray-100 rounded-2xl border border-border overflow-y-auto sticky top-6 shadow-inner" style={{ height: 'calc(100vh - 120px)' }}>
            <OffertePrintView offerte={previewOfferte} kunde={kunde} projekt={projekt} previewMode={true} />
          </div>
        )}
        </div>
      )}

      {isEditing && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-[240px] bg-surface/80 backdrop-blur-md border-t border-border p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 flex items-center justify-end gap-3 animate-slide-up">
          <button
            onClick={cancelEditing}
            className="px-5 py-2.5 bg-surface-card border border-border text-text-secondary font-bold text-sm rounded-xl hover:bg-surface transition-colors cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            onClick={saveEditing}
            disabled={isUpdating}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
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

      {showDuplicateModal && (
        <OfferteDuplicateModal
          currentOfferte={offerte}
          onClose={() => setShowDuplicateModal(false)}
          onSuccess={(newId) => {
            setShowDuplicateModal(false)
            onNavigate('offerten', { offerteId: newId, edit: true })
          }}
        />
      )}
    </div>
  )
}
