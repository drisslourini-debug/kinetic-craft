import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import OffertePrintView from './OffertePrintView'

export default function OfferteDetailView({ offerte, onBack }) {
  const [kunde, setKunde] = useState(null)
  const [projekt, setProjekt] = useState(null)
  const [status, setStatus] = useState(offerte.status || 'Entwurf')
  const [isUpdating, setIsUpdating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('stammdaten')
  const [showPrintView, setShowPrintView] = useState(false)

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editLeistungen, setEditLeistungen] = useState([])
  const [editKonditionen, setEditKonditionen] = useState({ rabatt: 0, mwst: 0 })
  const [editEinleitung, setEditEinleitung] = useState('')
  const [editSchluss, setEditSchluss] = useState('')
  const [editPauschalpreis, setEditPauschalpreis] = useState(null)
  const [isPauschal, setIsPauschal] = useState(false)

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

  const handleDuplicate = async () => {
    if (!window.confirm('Diese Offerte wirklich kopieren?')) return
    setIsUpdating(true)
    try {
      const { data, error } = await supabase
        .from('offerten')
        .insert([{
          kunden_id: offerte.kunden_id,
          projekt_id: offerte.projekt_id,
          total: offerte.total,
          daten: offerte.daten,
          status: 'Entwurf'
        }])
        .select()
      if (error) throw error
      if (data && data.length > 0) {
        alert('Offerte erfolgreich dupliziert! (Die Seite lädt jetzt neu)')
        window.location.reload()
      }
    } catch (err) {
      console.error('Fehler beim Duplizieren:', err)
      alert('Fehler beim Duplizieren')
    } finally {
      setIsUpdating(false)
    }
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

  // ===== EDIT MODE FUNCTIONS =====
  const startEditing = () => {
    const daten = offerte.daten || {}
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
        },
        einleitungstext: editEinleitung || null,
        schlusstext: editSchluss || null,
        pauschalpreis: isPauschal ? parseFloat(editPauschalpreis) || null : null,
      }

      await supabase
        .from('offerten')
        .update({ daten: updatedDaten, total: finalTotal })
        .eq('id', offerte.id)
      
      offerte.daten = updatedDaten
      offerte.total = finalTotal
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
            className={`px-4 py-2.5 text-sm font-bold rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all cursor-pointer focus:ring-primary-500/30 ${
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
          
          <button
            onClick={() => setShowPrintView(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white font-semibold text-sm rounded-xl hover:bg-primary-700 transition-colors shadow-sm cursor-pointer"
          >
            🖨️ Vorschau
          </button>
          
          {daten.docUrl && (
            <a 
              href={daten.docUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-card border border-border text-text-primary font-semibold text-sm rounded-xl hover:bg-surface transition-colors shadow-sm cursor-pointer"
            >
              📄 Google Doc
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        {['stammdaten', 'leistungen'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-2 text-sm font-semibold capitalize border-b-2 transition-colors cursor-pointer ${
              activeTab === tab 
                ? 'border-primary-500 text-primary-600' 
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
            }`}
          >
            {tab === 'stammdaten' ? 'Stammdaten & Info' : `Leistungen & Kalkulation`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-text-secondary">Lade Daten...</div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          
          {/* TAB: STAMMDATEN */}
          {activeTab === 'stammdaten' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm space-y-6">
                <h3 className="text-lg font-bold text-text-primary">Stammdaten</h3>
                
                <div>
                  <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold flex items-center gap-1"><span>👤</span> Kunde</label>
                  <div className="mt-1.5 font-medium text-text-primary">{kunde ? kunde.name : (offerte.kunden_name || 'Unbekannt')}</div>
                  {kunde && kunde.ort && <div className="text-sm text-text-secondary">{kunde.ort}</div>}
                </div>

                <div className="pt-4 border-t border-border">
                  <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold flex items-center gap-1"><span>🏗️</span> Projekt / Baustelle</label>
                  <div className="mt-1.5 font-medium text-text-primary">{projekt ? projekt.name : 'Kein Projekt zugeordnet'}</div>
                  {projekt && projekt.adresse && <div className="text-sm text-text-secondary">{projekt.adresse}</div>}
                </div>

                {daten.ausfuehrung && daten.ausfuehrung.start && (
                  <div className="pt-4 border-t border-border">
                    <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold flex items-center gap-1"><span>📅</span> Ausführung</label>
                    <div className="mt-1.5 text-sm text-text-primary">
                      Start: <span className="font-medium">{daten.ausfuehrung.start}</span>
                    </div>
                    {daten.ausfuehrung.dauer && (
                      <div className="text-sm text-text-primary mt-1">
                        Dauer: <span className="font-medium">{daten.ausfuehrung.dauer}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-text-primary mb-4">Gültigkeit</h3>
                  <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1.5">Gültig bis</label>
                  <input 
                    type="date"
                    defaultValue={offerte.gueltig_bis || ''}
                    onBlur={(e) => handleUpdate('gueltig_bis', e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                  />
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
          )}

          {/* TAB: LEISTUNGEN */}
          {activeTab === 'leistungen' && (
            <div className="space-y-6">
              
              {/* Edit-Mode Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isEditing && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
                      <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                      Bearbeitungsmodus
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing ? (
                    <button
                      onClick={startEditing}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white font-semibold text-sm rounded-xl hover:bg-primary-700 transition-colors shadow-sm cursor-pointer"
                    >
                      ✏️ Offerte bearbeiten
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={cancelEditing}
                        className="px-4 py-2.5 bg-surface-card border border-border text-text-secondary font-semibold text-sm rounded-xl hover:bg-surface transition-colors cursor-pointer"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={saveEditing}
                        disabled={isUpdating}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-semibold text-sm rounded-xl hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {isUpdating ? 'Speichert...' : '💾 Änderungen speichern'}
                      </button>
                    </>
                  )}
                </div>
              </div>

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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ===== LEISTUNGEN TABLE (READ / EDIT) ===== */}
                <div className="lg:col-span-2">
                  <div className="bg-surface-card rounded-2xl border border-border overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-border bg-surface flex items-center justify-between">
                      <h3 className="text-lg font-bold text-text-primary">Leistungsverzeichnis</h3>
                      {isEditing && (
                        <button
                          onClick={addPosition}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 border border-primary-200 font-semibold text-xs rounded-lg hover:bg-primary-100 transition-colors cursor-pointer"
                        >
                          ➕ Position hinzufügen
                        </button>
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
                                <div key={idx} className={`p-5 sm:px-5 sm:py-3 grid grid-cols-1 sm:grid-cols-[60px_1fr_80px_80px_100px_120px] gap-2 sm:gap-4 items-center hover:bg-primary-50/30 transition-colors ${isKategorie ? 'bg-primary-50/50 border-l-3 border-l-primary-400' : isInfo ? 'bg-surface' : ''} ${pos.optional ? 'opacity-60' : ''}`}>
                                  {/* Pos Nr */}
                                  <div className="text-xs font-bold text-text-secondary">
                                    <span className="sm:hidden font-semibold">Pos: </span>
                                    {pos.posNr || (idx + 1)}
                                  </div>
                                  
                                  <div className={`text-sm text-text-primary ${isKategorie ? 'font-bold text-base' : 'font-medium'}`}>
                                    {pos.beschreibung}
                                    {pos.optional && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">Option</span>}
                                  </div>
                                  
                                  {!isInfo ? (
                                    <div className="flex flex-col sm:contents gap-1.5 mt-2 sm:mt-0">
                                      <div className="flex justify-between sm:block text-sm text-text-secondary sm:text-right">
                                        <span className="sm:hidden font-semibold">Menge:</span>
                                        <span>{pos.menge}</span>
                                      </div>
                                      <div className="flex justify-between sm:block text-sm text-text-secondary">
                                        <span className="sm:hidden font-semibold">Einheit:</span>
                                        <span>{pos.einheit}</span>
                                      </div>
                                      <div className="flex justify-between sm:block text-sm text-text-secondary sm:text-right">
                                        <span className="sm:hidden font-semibold">Preis:</span>
                                        <span>CHF {(parseFloat(pos.einzelpreis) || 0).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
                                      </div>
                                      <div className="flex justify-between sm:block text-sm font-bold text-text-primary sm:text-right border-t border-border sm:border-0 pt-2 sm:pt-0 mt-1 sm:mt-0">
                                        <span className="sm:hidden text-text-secondary uppercase text-xs tracking-wider">Total</span>
                                        <span>CHF {posTotal.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="sm:col-span-4"></div>
                                  )}
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

                                {/* Position Number (free text) */}
                                <div className="shrink-0 w-16">
                                  <input
                                    type="text"
                                    value={pos.posNr || ''}
                                    onChange={(e) => updatePosition(pos._id, 'posNr', e.target.value)}
                                    className="w-full px-2 py-2 bg-surface border border-border rounded-lg text-xs font-bold text-center focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                                    placeholder="1.0"
                                    title="Positionsnummer (z.B. 1.0, 1.1, 2.0)"
                                  />
                                </div>

                                {/* Description Field */}
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    value={pos.beschreibung}
                                    onChange={(e) => updatePosition(pos._id, 'beschreibung', e.target.value)}
                                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm font-medium focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                                    placeholder="Beschreibung / Kategorie-Titel..."
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
                                    CHF {((parseFloat(pos.menge) || 0) * (parseFloat(pos.einzelpreis) || 0)).toLocaleString('de-CH', { minimumFractionDigits: 2 })}
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
                        <span>CHF {(isEditing ? editRawTotal : rawTotal).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      {(isEditing ? editKonditionen.rabatt : rabatt) > 0 && (
                        <div className="flex justify-between text-sm text-red-300 font-medium">
                          <span>Rabatt ({isEditing ? editKonditionen.rabatt : rabatt}%)</span>
                          <span>- CHF {(isEditing ? editRabattBetrag : rabattBetrag).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {(isEditing ? editKonditionen.mwst : mwst) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-primary-100">MwSt ({isEditing ? editKonditionen.mwst : mwst}%)</span>
                          <span>CHF {(isEditing ? editMwstBetrag : mwstBetrag).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                        <span className="font-bold text-2xl tracking-tight">CHF {(isEditing ? editFinalTotal : finalTotal).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      {isEditing && editOptionalTotal > 0 && (
                        <div className="pt-3 mt-1 border-t border-white/10 flex justify-between text-xs text-primary-200">
                          <span>Optionale Positionen</span>
                          <span>CHF {editOptionalTotal.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Schlusstext (only in edit mode) */}
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
            </div>
          )}

          {/* Action Buttons for Duplicating / Archiving */}
          <div className="pt-8 mt-4 border-t border-border flex justify-between items-center">
            {offerte.is_archived ? (
              <button 
                onClick={async () => {
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
                }}
                className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                Offerte wiederherstellen
              </button>
            ) : (
              <button 
                onClick={handleArchive}
                className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors cursor-pointer"
              >
                Offerte archivieren
              </button>
            )}
            <button 
              onClick={handleDuplicate}
              className="px-4 py-2 bg-surface-card border border-border text-text-primary rounded-lg text-sm font-bold hover:bg-primary-50 transition-colors cursor-pointer flex items-center gap-2"
            >
              <span>📑</span> Offerte duplizieren
            </button>
          </div>
          
        </div>
      )}
    </div>
  )
}
