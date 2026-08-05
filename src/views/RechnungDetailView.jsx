import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import RechnungPrintView from './RechnungPrintView'
import { generateRechnungWord } from '../lib/rechnungWordGenerator'
import { formatCurrency, formatMoney, formatDate } from '../lib/formatters'
import { calculateDocumentTotals } from '../lib/calculations'
import { generateNextRechnungNr } from '../lib/documentService'
import KatalogDrawer from '../components/KatalogDrawer'

export default function RechnungDetailView({ rechnung, onBack, onNavigate, userRole }) {
  const [kunde, setKunde] = useState(null)
  const [projekt, setProjekt] = useState(null)
  const [settings, setSettings] = useState(null)
  const [status, setStatus] = useState(rechnung.status || 'Entwurf')
  const [isUpdating, setIsUpdating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showPrintView, setShowPrintView] = useState(false)
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [showKatalogDrawer, setShowKatalogDrawer] = useState(false)

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

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editLeistungen, setEditLeistungen] = useState([])
  const [editKonditionen, setEditKonditionen] = useState({ rabatt: 0, mwst: 0 })
  const [editEinleitung, setEditEinleitung] = useState('')
  const [editSchluss, setEditSchluss] = useState('')
  const [editPauschalpreis, setEditPauschalpreis] = useState(null)
  const [isPauschal, setIsPauschal] = useState(false)
  const [showLivePreview, setShowLivePreview] = useState(false)

  useEffect(() => {
    async function loadDetails() {
      if (!supabase || !rechnung) return
      
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
          .limit(1)
          .single()
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
    setStatus(newStatus)
    setIsUpdating(true)
    
    try {
      await supabase
        .from('rechnungen')
        .update({ status: newStatus })
        .eq('id', rechnung.id)
    } catch (err) {
      console.error('Failed to update status:', err)
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
    } catch (err) {
      console.error('Failed to update stammdaten:', err)
      alert('Fehler beim Speichern.')
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
    if (!window.confirm('Rechnung wirklich archivieren?')) return
    setIsUpdating(true)
    try {
      await supabase.from('rechnungen').update({ is_archived: true }).eq('id', rechnung.id)
      onBack()
    } catch (err) {
      console.error('Fehler beim Archivieren:', err)
      alert('Fehler beim Archivieren.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDuplicate = async () => {
    if (!window.confirm('Diese Rechnung wirklich kopieren?')) return
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
        alert(`Rechnung ${newNr} dupliziert!`)
        window.location.reload()
      }
    } catch (err) {
      console.error('Fehler beim Duplizieren:', err)
      alert('Fehler beim Duplizieren')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (status !== 'Entwurf') {
      alert('Achtung: Nur Entwürfe können endgültig gelöscht werden. Bitte storniere oder archiviere diese Rechnung stattdessen.')
      setShowDeleteWarning(false)
      return
    }
    
    setIsUpdating(true)
    try {
      await supabase.from('rechnungen').delete().eq('id', rechnung.id)
      onBack()
    } catch (err) {
      console.error('Fehler beim Löschen:', err)
      alert('Fehler beim Löschen der Rechnung.')
    } finally {
      setIsUpdating(false)
      setShowDeleteWarning(false)
    }
  }

  const handlePayment = async () => {
    setIsUpdating(true)
    try {
      await supabase
        .from('rechnungen')
        .update({ 
          bezahlt: parseFloat(paymentAmount), 
          bezahlt_am: paymentDate, 
          status: 'Bezahlt' 
        })
        .eq('id', rechnung.id)
      
      setStatus('Bezahlt')
      setShowPaymentForm(false)
      rechnung.bezahlt = parseFloat(paymentAmount)
      rechnung.bezahlt_am = paymentDate
      rechnung.status = 'Bezahlt'
      alert('Zahlung erfolgreich erfasst!')
    } catch (err) {
      console.error('Fehler beim Erfassen der Zahlung:', err)
      alert('Fehler beim Speichern der Zahlung.')
    } finally {
      setIsUpdating(false)
    }
  }

  // ===== EDIT MODE FUNCTIONS =====
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
    setIsEditing(true)
  }

  const cancelEditing = () => {
    if (!window.confirm('Änderungen verwerfen?')) return
    setIsEditing(false)
  }

  const saveEditing = async () => {
    setIsUpdating(true)
    try {
      const cleanLeistungen = editLeistungen.map(({ _id, ...pos }) => pos)
      
      const { finalTotal } = calculateDocumentTotals(cleanLeistungen, editKonditionen, isPauschal ? editPauschalpreis : null)

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
      }

      await supabase
        .from('rechnungen')
        .update({ daten: updatedDaten, total: finalTotal })
        .eq('id', rechnung.id)
      
      rechnung.daten = updatedDaten
      rechnung.total = finalTotal
      setIsEditing(false)
      alert('Rechnung gespeichert!')
    } catch (err) {
      console.error('Fehler beim Speichern:', err)
      alert('Fehler beim Speichern der Rechnung.')
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
      beschreibung: item.titel,
      menge: '',
      einheit: item.einheit,
      einzelpreis: item.preis,
      kategorie: item.kategorie,
      optional: false,
    }))
    setEditLeistungen(prev => [...prev, ...newPositions])
    setShowKatalogDrawer(false)
  }

  if (!rechnung) return null


  // Parse daten safely
  const daten = rechnung.daten || {}
  const leistungen = daten.leistungen || []
  const { rawTotal, rabattBetrag, totalNachRabatt, mwstBetrag, finalTotal } = calculateDocumentTotals(leistungen, daten.konditionen, daten.pauschalpreis)
  const rabatt = parseFloat(daten.konditionen?.rabatt || 0)
  const mwst = parseFloat(daten.konditionen?.mwst || 0)

  // Edit-mode live calculation
  const editTotals = calculateDocumentTotals(editLeistungen, editKonditionen, isPauschal ? editPauschalpreis : null)
  const editRawTotal = editTotals.rawTotal
  const editRabattBetrag = editTotals.rabattBetrag
  const editMwstBetrag = editTotals.mwstBetrag
  const editFinalTotal = editTotals.finalTotal
  const editOptionalTotal = editTotals.optionenTotal
  const editNachRabatt = editTotals.totalNachRabatt

  const previewRechnung = isEditing ? {
    ...rechnung,
    daten: {
      ...rechnung.daten,
      leistungen: editLeistungen.map(({ _id, ...pos }) => pos),
      konditionen: editKonditionen,
      einleitungstext: editEinleitung,
      schlusstext: editSchluss,
      pauschalpreis: isPauschal ? editPauschalpreis : null
    },
    total: editFinalTotal
  } : rechnung;

  if (showPrintView) {
    return <RechnungPrintView rechnung={rechnung} kunde={kunde} projekt={projekt} settings={settings} onClose={() => setShowPrintView(false)} />
  }

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBackClick}
            className="p-2 rounded-xl hover:bg-surface-card border border-transparent hover:border-border transition-all text-text-secondary hover:text-text-primary cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl md:text-3xl font-bold text-text-primary truncate">
                Rechnung {rechnung.rechnung_nr || `#${rechnung.id}`}
              </h2>
              {isUpdating && <span className="text-xs text-text-secondary">Speichert...</span>}
            </div>
            <p className="text-text-secondary mt-1">Erstellt am {formatDate(rechnung.created_at)}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isUpdating || userRole === 'treuhand'}
            className={`px-4 py-3 sm:py-2.5 min-h-[48px] sm:min-h-0 text-base sm:text-sm font-bold rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all cursor-pointer focus:ring-primary-500/30 ${
              status === 'Entwurf' ? 'bg-neutral-100 text-text-primary border-transparent hover:bg-neutral-200' :
              status === 'Versendet' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' :
              status === 'Bezahlt' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' :
              status === 'Überfällig' ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' :
              'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
            }`}
          >
            <option value="Entwurf">Entwurf</option>
            <option value="Versendet">Versendet</option>
            <option value="Bezahlt">Bezahlt</option>
            <option value="Überfällig">Überfällig</option>
            <option value="Storniert">Storniert</option>
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
          {!isEditing && userRole !== 'treuhand' && status === 'Entwurf' && (
            <button
              onClick={startEditing}
              className="inline-flex items-center gap-2 px-4 py-3 sm:py-2.5 min-h-[48px] sm:min-h-0 bg-surface border border-primary-200 text-primary-700 font-bold text-base sm:text-sm rounded-xl hover:bg-primary-50 transition-colors cursor-pointer shadow-sm"
            >
              ✏️ Rechnung bearbeiten
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
            <button 
              onClick={() => setShowActionMenu(!showActionMenu)}
              className="p-3 sm:p-2 min-w-[48px] min-h-[48px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center bg-surface border border-border text-text-secondary rounded-xl hover:text-text-primary hover:bg-neutral-50 transition-colors shrink-0 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
            </button>
            
            {showActionMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowActionMenu(false)}></div>
                <div className="absolute right-0 top-12 w-56 bg-surface-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-slide-in-right sm:animate-fade-in-up">
                  <div className="p-1">
                    <button 
                      onClick={() => { setShowActionMenu(false); handleDuplicate(); }}
                      disabled={isDirty || isEditing}
                      className="w-full text-left px-3 py-2 text-sm font-medium text-text-primary hover:bg-neutral-100 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span className="text-lg">📋</span> Duplizieren
                    </button>
                    <button 
                      onClick={async () => {
                        setShowActionMenu(false);
                        if (rechnung.is_archived) {
                          if (!window.confirm('Rechnung wiederherstellen?')) return
                          setIsUpdating(true)
                          try {
                            await supabase.from('rechnungen').update({ is_archived: false }).eq('id', rechnung.id)
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
                      <span className="text-lg">📦</span> {rechnung.is_archived ? 'Wiederherstellen' : 'Archivieren'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          )}
        </div>
      </div>

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

      

      {isLoading ? (
        <div className="flex flex-col gap-4 p-6 w-full animate-pulse bg-surface-card rounded-2xl border border-border shadow-sm"><div className="h-6 bg-gray-200 rounded w-1/4"></div><div className="h-20 bg-gray-200 rounded w-full"></div><div className="h-20 bg-gray-200 rounded w-full"></div></div>
      ) : (
        <div className={showLivePreview && isEditing ? "grid grid-cols-1 xl:grid-cols-2 gap-6" : ""}>
        <div className="space-y-8 animate-fade-in">
          
          {/* TAB: STAMMDATEN */}
          
          <div className={`grid grid-cols-1 ${!(showLivePreview && isEditing) ? 'md:grid-cols-2' : ''} gap-6`}>
              <div className="space-y-6">
                <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm space-y-6">
                  <h3 className="text-lg font-bold text-text-primary">Stammdaten</h3>
                  
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-primary-600 mb-3 flex items-center gap-2"><span>👤</span> Kunde</label>
                    <div 
                      className="mt-1.5 font-medium text-primary-600 hover:text-primary-800 cursor-pointer transition-colors"
                      onClick={() => kunde && onNavigate && onNavigate('kunden', { kundeId: kunde.id })}
                    >{kunde ? kunde.name : 'Unbekannt'}</div>
                    {kunde && kunde.ort && <div className="text-sm text-text-secondary">{kunde.ort}</div>}
                  </div>

                  <div className="pt-4 border-t border-border">
                    <label className="text-xs font-bold uppercase tracking-wider text-primary-600 mb-3 flex items-center gap-2"><span>🏗️</span> Projekt / Baustelle</label>
                    <div 
                      className="mt-1.5 font-medium text-primary-600 hover:text-primary-800 cursor-pointer transition-colors"
                      onClick={() => projekt && onNavigate && onNavigate('projekte', { projektId: projekt.id })}
                    >{projekt ? projekt.name : 'Kein Projekt zugeordnet'}</div>
                    {projekt && projekt.adresse && <div className="text-sm text-text-secondary">{projekt.adresse}</div>}
                  </div>

                  {rechnung.offerte_id && (
                    <div className="pt-4 border-t border-border">
                      <label className="text-xs font-bold uppercase tracking-wider text-primary-600 mb-3 flex items-center gap-2"><span>📄</span> Offerte</label>
                      <button 
                        onClick={() => onNavigate && onNavigate('offerten', { offerteId: rechnung.offerte_id })}
                        className="mt-1.5 text-sm text-primary-600 hover:text-primary-800 underline cursor-pointer"
                      >
                        Offerte #{rechnung.offerte_id} ansehen
                      </button>
                    </div>
                  )}

                  <div className="pt-4 border-t border-border">
                    <label className="text-xs font-bold uppercase tracking-wider text-primary-600 mb-3 flex items-center gap-2"><span>💰</span> Rechnungstyp</label>
                    <div className="mt-1.5 text-sm text-text-primary capitalize font-medium">
                      {rechnung.typ || 'gesamt'}
                      {rechnung.typ === 'akonto' && rechnung.akonto_prozent && ` (${rechnung.akonto_prozent}%)`}
                    </div>
                  </div>
                </div>

                {/* Payment Action */}
                {(status === 'Versendet' || status === 'Überfällig') && (
                  <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
                    <h3 className="text-lg font-bold text-text-primary">Zahlungseingang</h3>
                    {!showPaymentForm ? (
                      status !== 'Bezahlt' && userRole !== 'treuhand' && (
                        <button 
                          onClick={() => setShowPaymentForm(true)}
                          disabled={isUpdating}
                          className="w-full py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-emerald-600 text-white font-bold text-base sm:text-sm rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer text-center"
                        >
                          💰 Zahlung erfassen
                        </button>
                      )
                    ) : (
                      <div className="space-y-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div>
                          <label className="text-xs font-bold text-emerald-800 block mb-1">Datum</label>
                          <input 
                            type="date"
                            value={paymentDate}
                            onChange={e => setPaymentDate(e.target.value)}
                            className="w-full px-3 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-white border border-emerald-200 rounded-lg text-base sm:text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-emerald-800 block mb-1">Betrag (CHF)</label>
                          <input 
                            type="number"
                            step="0.05"
                            value={paymentAmount}
                            onChange={e => setPaymentAmount(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={handlePayment}
                            className="flex-1 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-emerald-600 text-white font-bold text-base sm:text-sm rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer"
                          >
                            Bestätigen
                          </button>
                          <button 
                            onClick={() => setShowPaymentForm(false)}
                            className="px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-white text-emerald-700 border border-emerald-200 font-bold text-base sm:text-sm rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {status === 'Bezahlt' && rechnung.bezahlt_am && (
                  <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6 shadow-sm space-y-2">
                    <h3 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
                      <span>✅</span> Vollständig bezahlt
                    </h3>
                    <p className="text-emerald-700 text-sm">
                      Zahlungseingang: {formatDate(rechnung.bezahlt_am)}
                    </p>
                    <p className="text-emerald-700 font-bold">
                      Betrag: CHF {formatMoney(rechnung.bezahlt)}
                    </p>
                  </div>
                )}
                
                <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-text-primary mb-4">Interne Notizen</h3>
                  <textarea 
                    value={editStammdaten.notizen || ''}
                    onChange={(e) => handleStammInputChange('notizen', e.target.value)}
                    disabled={userRole === 'treuhand' || status !== 'Entwurf'}
                    className="w-full h-32 px-3 py-3 sm:py-2 bg-surface border border-border rounded-lg text-base sm:text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none disabled:opacity-50 disabled:bg-gray-50"
                    placeholder="Absprachen, Zahlungsversprechen, Besonderheiten..."
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
                  <h3 className="text-lg font-bold text-text-primary">Rechnungsdaten</h3>
                  
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-primary-600 mb-2 block">Rechnungsdatum</label>
                    <input 
                      type="date"
                      value={editStammdaten.rechnungsdatum || ''}
                      onChange={(e) => handleStammInputChange('rechnungsdatum', e.target.value)}
                      disabled={userRole === 'treuhand' || status !== 'Entwurf'}
                      className="w-full px-3 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-surface border border-border rounded-lg text-base sm:text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 disabled:opacity-50 disabled:bg-gray-50"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-primary-600 mb-2 block">Zahlungsfrist (Tage)</label>
                    <input 
                      type="number"
                      value={editStammdaten.zahlungsfrist_tage || 30}
                      onChange={(e) => handleStammInputChange('zahlungsfrist_tage', parseInt(e.target.value) || 30)}
                      disabled={userRole === 'treuhand' || status !== 'Entwurf'}
                      className="w-full px-3 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-surface border border-border rounded-lg text-base sm:text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 disabled:opacity-50 disabled:bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-primary-600 mb-2 block">Fälligkeitsdatum (automatisch)</label>
                    <div className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-secondary bg-gray-50">
                      {rechnung.faellig_am ? formatDate(rechnung.faellig_am) : 'Wird beim Speichern berechnet'}
                    </div>
                  </div>
                </div>
                
                <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-text-primary mb-4">Bankverbindung</h3>
                  {settings?.iban ? (
                    <div className="text-sm space-y-1">
                      <p className="text-text-secondary">IBAN: <span className="font-medium text-text-primary">{settings.iban}</span></p>
                      {settings.bank_name && <p className="text-text-secondary">Bank: <span className="font-medium text-text-primary">{settings.bank_name}</span></p>}
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary italic">Keine Bankverbindung in den Einstellungen hinterlegt.</p>
                  )}
                </div>


              </div>

              <div className={`flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 ${!(showLivePreview && isEditing) ? 'md:col-span-2' : ''}`}>
                <div>
                  {isDirty && userRole !== 'treuhand' && (
                    <span className="text-sm text-amber-600 font-medium animate-pulse">
                      Es gibt ungespeicherte Änderungen in den Stammdaten
                    </span>
                  )}
                </div>
                {userRole !== 'treuhand' && status === 'Entwurf' && (
                  <button 
                    onClick={handleSaveStammdaten}
                    disabled={!isDirty || isUpdating}
                    className="w-full sm:w-auto px-6 py-3 sm:py-2.5 min-h-[48px] sm:min-h-0 bg-primary-600 text-white font-bold text-base sm:text-sm rounded-xl hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary-600/20"
                  >
                    {isUpdating ? 'Wird gespeichert...' : 'Änderungen speichern'}
                  </button>
                )}
              </div>
            </div>

            {/* TAB: LEISTUNGEN */}
          <div className="space-y-6 mt-6">
              {/* Einleitungstext (only in edit mode) */}
              {isEditing && (
                <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm">
                  <label className="text-xs font-bold uppercase tracking-wider text-primary-600 mb-3 flex items-center gap-2">Einleitungstext (erscheint auf dem PDF)</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[
                      { label: 'Standard', text: 'Wir erlauben uns, für unsere Arbeiten wie folgt Rechnung zu stellen:' },
                      { label: 'Akonto', text: 'Wir erlauben uns, für das oben genannte Projekt folgende Akontorechnung zu stellen:' },
                      { label: 'Schlussrechnung', text: 'Wir danken für den geschätzten Auftrag und stellen für die ausgeführten Arbeiten wie folgt Rechnung:' },
                    ].map((tpl) => (
                      <button
                        key={tpl.label}
                        onClick={() => setEditEinleitung(tpl.text)}
                        className={`px-3 py-3 sm:py-1.5 min-h-[48px] sm:min-h-0 text-sm sm:text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
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
                    className="w-full h-24 sm:h-20 px-3 py-3 sm:py-2 bg-surface border border-border rounded-lg text-base sm:text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none"
                    placeholder="Wir erlauben uns, für unsere Arbeiten wie folgt Rechnung zu stellen:"
                  />
                </div>
              )}
              {/* Show existing einleitungstext in read mode */}
              {!isEditing && daten.einleitungstext && (
                <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm">
                  <label className="text-xs font-bold uppercase tracking-wider text-primary-600 mb-3 flex items-center gap-2">Einleitungstext</label>
                  <p className="text-sm text-text-primary whitespace-pre-wrap">{daten.einleitungstext}</p>
                </div>
              )}

              <div className={`grid grid-cols-1 ${!(showLivePreview && isEditing) ? 'lg:grid-cols-3' : ''} gap-6`}>

                {/* ===== LEISTUNGEN TABLE (READ / EDIT) ===== */}
                <div className={!(showLivePreview && isEditing) ? 'lg:col-span-2' : ''}>
                  <div className="bg-surface-card rounded-2xl border border-border overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <h3 className="text-lg font-bold text-text-primary">Leistungsverzeichnis</h3>
                      {isEditing && (
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3">
                          <button
                            onClick={addPosition}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-3 min-h-[48px] bg-primary-50 text-primary-700 border border-primary-200 font-semibold text-base sm:text-xs sm:py-1.5 sm:min-h-0 rounded-lg hover:bg-primary-100 transition-colors cursor-pointer"
                          >
                            ➕ Position
                          </button>
                          <button
                            onClick={() => setShowKatalogDrawer(true)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-3 min-h-[48px] bg-primary-50 text-primary-700 border border-primary-200 font-semibold text-base sm:text-xs sm:py-1.5 sm:min-h-0 rounded-lg hover:bg-primary-100 transition-colors cursor-pointer"
                          >
                            📖 Katalog
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
                            <div className="hidden sm:grid grid-cols-[60px_1fr_80px_80px_100px_120px] gap-4 px-5 py-3 bg-surface-card text-xs font-semibold text-text-secondary uppercase tracking-wider">
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
                                <div key={idx} className={`p-4 sm:px-5 sm:py-3 hover:bg-primary-50/30 transition-colors ${isKategorie ? 'bg-primary-50/50 border-l-3 border-l-primary-400' : isInfo ? 'bg-surface' : ''} ${pos.optional ? 'opacity-60' : ''}`}>
                                  
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
                                        <div className="text-sm text-text-secondary text-right">CHF {formatMoney(pos.einzelpreis)}</div>
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
                                    className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded hover:bg-surface text-text-secondary hover:text-text-primary disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                                    title="Nach oben"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                  </button>
                                  <button
                                    onClick={() => movePosition(idx, 1)}
                                    disabled={idx === editLeistungen.length - 1}
                                    className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded hover:bg-surface text-text-secondary hover:text-text-primary disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                                    title="Nach unten"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                  </button>
                                </div>

                                {/* Position Number (free text) */}
                                <div className="shrink-0 w-14">
                                  <input
                                    type="text"
                                    value={pos.posNr || ''}
                                    onChange={(e) => updatePosition(pos._id, 'posNr', e.target.value)}
                                    className="w-full px-2 py-2 min-h-[40px] bg-surface border border-border rounded-lg text-xs font-bold text-center focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                                    placeholder="1.0"
                                    title="Positionsnummer"
                                  />
                                </div>

                                {/* Preview text */}
                                <div className="flex-1 text-sm font-medium text-text-primary truncate">{pos.beschreibung || <span className="text-text-secondary italic">Beschreibung...</span>}</div>

                                {/* Optional Toggle */}
                                <label className="flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[44px] px-2" title="Optionale Position">
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
                                  className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-red-50 text-text-secondary hover:text-red-600 transition-colors cursor-pointer shrink-0"
                                  title="Position löschen"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
                                  className="w-full px-3 py-2.5 min-h-[44px] bg-surface border border-border rounded-lg text-base sm:text-sm font-medium focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none transition-all"
                                  placeholder="Beschreibung / Kategorie-Titel..."
                                />
                              </div>

                              {/* Row: Menge, Einheit, Preis, Total */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pl-14">
                                <div>
                                  <label className="text-xs text-text-secondary font-semibold block mb-1">Menge</label>
                                  <input
                                    type="number"
                                    step="any"
                                    value={pos.menge}
                                    onChange={(e) => updatePosition(pos._id, 'menge', e.target.value)}
                                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                                    placeholder="0"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-text-secondary font-semibold block mb-1">Einheit</label>
                                  <input
                                    type="text"
                                    value={pos.einheit || ''}
                                    onChange={(e) => updatePosition(pos._id, 'einheit', e.target.value)}
                                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                                    placeholder="m², Stk, h..."
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-text-secondary font-semibold block mb-1">Einzelpreis (CHF)</label>
                                  <input
                                    type="number"
                                    step="0.05"
                                    value={pos.einzelpreis}
                                    onChange={(e) => updatePosition(pos._id, 'einzelpreis', e.target.value)}
                                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-text-secondary font-semibold block mb-1">Total</label>
                                  <div className="px-3 py-2 bg-surface border border-border rounded-lg text-sm font-bold text-text-primary">
                                    CHF {formatMoney((parseFloat(pos.menge) || 0) * (parseFloat(pos.einzelpreis) || 0))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ===== KALKULATION SIDEBAR ===== */}
                <div>
                  {/* Edit mode: Konditionen + Pauschal */}
                  {isEditing && (
                    <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm mb-4 space-y-4">
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

                  {/* Kalkulation Summary Box */}
                  <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-6 shadow-md text-white sticky top-6">
                    <h3 className="text-primary-100 text-sm font-semibold mb-6">Kalkulation {isEditing && '(Live)'}</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-primary-100">Zwischensumme</span>
                        <span>CHF {formatMoney(isEditing ? editRawTotal : rawTotal)}</span>
                      </div>
                      {(isEditing ? editKonditionen.rabatt : rabatt) > 0 && (
                        <div className="flex justify-between text-sm text-red-300 font-medium">
                          <span>Rabatt ({isEditing ? editKonditionen.rabatt : rabatt}%)</span>
                          <span>- CHF {formatMoney(isEditing ? editRabattBetrag : rabattBetrag)}</span>
                        </div>
                      )}
                      {(isEditing ? editKonditionen.mwst : mwst) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-primary-100">MwSt ({isEditing ? editKonditionen.mwst : mwst}%)</span>
                          <span>CHF {formatMoney(isEditing ? editMwstBetrag : mwstBetrag)}</span>
                        </div>
                      )}
                      {isEditing && isPauschal && editPauschalpreis && (
                        <div className="flex justify-between text-sm text-amber-300 font-medium">
                          <span>⚡ Pauschalpreis</span>
                          <span>aktiv</span>
                        </div>
                      )}
                      <div className="pt-4 mt-4 border-t border-white/20 flex justify-between items-center">
                        <span className="font-bold text-lg">Total</span>
                        <span className="font-bold text-2xl tracking-tight">CHF {formatMoney(isEditing ? editFinalTotal : finalTotal)}</span>
                      </div>
                      {isEditing && editOptionalTotal > 0 && (
                        <div className="pt-3 mt-1 border-t border-white/10 flex justify-between text-xs text-primary-200">
                          <span>Optionale Positionen</span>
                          <span>CHF {formatMoney(editOptionalTotal)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Schlusstext (only in edit mode) */}
              {isEditing && (
                <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm">
                  <label className="text-xs font-bold uppercase tracking-wider text-primary-600 mb-3 flex items-center gap-2">Schlusstext (erscheint auf dem PDF)</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[
                      { label: 'Standard', text: 'Wir bitten um Überweisung des Betrags auf unser Konto innerhalb der Zahlungsfrist.' },
                      { label: 'Dank', text: 'Wir danken Ihnen für den geschätzten Auftrag und bitten um Überweisung auf untenstehendes Konto.' },
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
                    placeholder="Wir bitten um Überweisung des Betrags auf unser Konto innerhalb der Zahlungsfrist."
                  />
                </div>
              )}
              {!isEditing && daten.schlusstext && (
                <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm">
                  <label className="text-xs font-bold uppercase tracking-wider text-primary-600 mb-3 flex items-center gap-2">Schlusstext</label>
                  <p className="text-sm text-text-primary whitespace-pre-wrap">{daten.schlusstext}</p>
                </div>
              )}
            </div>
            {/* Action Buttons removed from bottom - now in top menu */}
        </div>

        {showLivePreview && isEditing && (
          <div className="hidden xl:block bg-gray-100 rounded-2xl border border-border overflow-y-auto sticky top-6 shadow-inner" style={{ height: 'calc(100vh - 120px)' }}>
            <RechnungPrintView rechnung={previewRechnung} kunde={kunde} projekt={projekt} settings={settings} previewMode={true} />
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
            disabled={isUpdating || userRole === 'treuhand'}
            className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold text-base sm:text-sm rounded-xl hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
          >
            {isUpdating ? 'Speichert...' : '💾 Änderungen speichern'}
          </button>
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
    </div>
  )
}


