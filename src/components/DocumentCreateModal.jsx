import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { generateNextRechnungNr, generateNextOfferteNr } from '../lib/documentService'
import { IconDocument, IconQrBill } from './icons/BrandIcons'

export default function DocumentCreateModal({ 
  type, 
  isOpen, 
  onClose, 
  onNavigate,
  onSuccess,
  initialKundeId = '',
  initialProjektId = '',
  initialRechnungTyp = 'standard'
}) {
  // type can be 'offerte' or 'rechnung'
  
  const [kunden, setKunden] = useState([])
  const [projekte, setProjekte] = useState([])
  const [settings, setSettings] = useState(null)
  
  const [selectedKundeId, setSelectedKundeId] = useState('')
  const [selectedProjektId, setSelectedProjektId] = useState('')
  const [rechnungTyp, setRechnungTyp] = useState(initialRechnungTyp || 'standard') // 'standard' | 'akonto' | 'schluss'
  const [akontoProzent, setAkontoProzent] = useState(30)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  
  const [isCreatingKunde, setIsCreatingKunde] = useState(false)
  const [newKundeName, setNewKundeName] = useState('')
  const [isCreatingKundeLoading, setIsCreatingKundeLoading] = useState(false)
  
  const [isCreatingProjekt, setIsCreatingProjekt] = useState(false)
  const [newProjektName, setNewProjektName] = useState('')
  const [isCreatingProjektLoading, setIsCreatingProjektLoading] = useState(false)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isOfferte = type === 'offerte'
  const docTypeLabel = isOfferte ? 'Offerte' : 'Rechnung'
  const docTypeIcon = isOfferte ? <IconDocument className="w-5 h-5 text-primary-600" /> : <IconQrBill className="w-5 h-5 text-primary-600" />

  useEffect(() => {
    if (isOpen) {
      loadInitialData()
      setSelectedKundeId(initialKundeId ? String(initialKundeId) : '')
      setSelectedProjektId(initialProjektId ? String(initialProjektId) : '')
      setRechnungTyp(initialRechnungTyp || 'standard')
      setAkontoProzent(30)
      setTitle('')
      setDate(new Date().toISOString().split('T')[0])
      setError('')
    }
  }, [isOpen, initialKundeId, initialProjektId, initialRechnungTyp])

  useEffect(() => {
    if (selectedKundeId && supabase) {
      supabase.from('projekte').select('*').eq('kunden_id', selectedKundeId).order('name', { ascending: true })
        .then(({ data }) => setProjekte(data || []))
    } else {
      setProjekte([])
    }
    
    // Auto-update title if not manually changed
    if (selectedKundeId) {
      const kundeName = kunden.find(k => k.id === selectedKundeId)?.name || ''
      const customPrefix = isOfferte 
        ? 'Offerte' 
        : (rechnungTyp === 'schluss' 
          ? 'SIA 118 Schlussrechnung' 
          : (rechnungTyp === 'akonto' ? `Akonto-Rechnung (${akontoProzent}%)` : 'Rechnung'))

      setTitle(prevTitle => {
        if (!prevTitle || 
            prevTitle.startsWith('Offerte für') || 
            prevTitle.startsWith('Rechnung für') ||
            prevTitle.startsWith('SIA 118 Schlussrechnung für') ||
            prevTitle.startsWith('Akonto-Rechnung')) {
          return `${customPrefix} für ${kundeName}`
        }
        return prevTitle
      })
    }
  }, [selectedKundeId, kunden, docTypeLabel, isOfferte, rechnungTyp, akontoProzent])

  async function loadInitialData() {
    if (!supabase) return
    const [kData, sData] = await Promise.all([
      supabase.from('kunden').select('*').order('name', { ascending: true }),
      supabase.from('einstellungen').select('*').limit(1).maybeSingle()
    ])
    if (kData.data) setKunden(kData.data)
    if (sData.data) setSettings(sData.data)
  }

  const handleCreateKunde = async () => {
    if (!newKundeName.trim()) return
    setIsCreatingKundeLoading(true)
    setError('')
    try {
      const { data, error } = await supabase.from('kunden').insert([{ name: newKundeName.trim() }]).select()
      if (error) throw error
      if (data && data.length > 0) {
        setKunden(prev => [...prev, data[0]].sort((a,b) => a.name.localeCompare(b.name)))
        setSelectedKundeId(data[0].id)
        setIsCreatingKunde(false)
        setNewKundeName('')
      }
    } catch(err) {
      console.error(err)
      setError('Kunde konnte nicht erstellt werden.')
    } finally {
      setIsCreatingKundeLoading(false)
    }
  }

  const handleCreateProjekt = async () => {
    if (!newProjektName.trim() || !selectedKundeId) return
    setIsCreatingProjektLoading(true)
    setError('')
    try {
      const { data, error } = await supabase.from('projekte').insert([{ 
        kunden_id: selectedKundeId,
        name: newProjektName.trim(),
        status: 'Aktiv'
      }]).select()
      if (error) throw error
      if (data && data.length > 0) {
        setProjekte(prev => [...prev, data[0]].sort((a,b) => a.name.localeCompare(b.name)))
        setSelectedProjektId(data[0].id)
        setIsCreatingProjekt(false)
        setNewProjektName('')
      }
    } catch(err) {
      console.error(err)
      setError('Projekt konnte nicht erstellt werden.')
    } finally {
      setIsCreatingProjektLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!selectedKundeId) {
      setError('Bitte wähle zuerst einen Kunden aus.')
      return
    }
    
    setIsSubmitting(true)
    setError('')
    
    try {
      const table = isOfferte ? 'offerten' : 'rechnungen'
      const nrField = isOfferte ? 'offerte_nr' : 'rechnung_nr'
      
      const docNr = isOfferte 
        ? await generateNextOfferteNr(supabase, settings?.startnummer_offerten)
        : await generateNextRechnungNr(supabase, settings?.startnummer_rechnungen)

      // Base Draft Data
      const draftData = {
        kunden_id: selectedKundeId,
        projekt_id: selectedProjektId || null,
        status: 'Entwurf',
        total: 0,
        [nrField]: docNr,
        daten: {
          titel: title,
          datum: date,
          leistungen: [],
          konditionen: { rabatt: settings?.standard_rabatt || 0, mwst: settings?.standard_mwst || 8.1 },
          texte: { 
            einleitungstext: isOfferte 
              ? 'Sehr geehrte Damen und Herren,\n\nwir bedanken uns für Ihre Anfrage und bieten Ihnen folgende Leistungen an:' 
              : 'Sehr geehrte Damen und Herren,\n\nwir stellen Ihnen folgende Leistungen in Rechnung:', 
            schlusstext: isOfferte 
              ? 'Wir hoffen, unser Angebot entspricht Ihren Vorstellungen.' 
              : 'Bitte überweisen Sie den Betrag innert der Zahlungsfrist auf unser Konto.' 
          },
          pauschalpreis: null
        }
      }
      
      if (isOfferte) {
        const gueltigBis = new Date(new Date(date).getTime() + (settings?.gueltigkeit_offerten_tage || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        draftData.gueltig_bis = gueltigBis
        draftData.daten.gueltig_bis = gueltigBis
        draftData.daten.ausfuehrung = { start: '', dauer: '', notizen: '' }
      } else {
        const faelligAm = new Date(new Date(date).getTime() + (settings?.zahlungsfrist_tage || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        draftData.faellig_am = faelligAm
        draftData.daten.faellig_am = faelligAm

        if (rechnungTyp === 'schluss') {
          draftData.typ = 'schluss'
          draftData.daten.is_schlussrechnung = true
          
          let akontos = []
          if (selectedProjektId && supabase) {
            try {
              const { data: projInvoices } = await supabase
                .from('rechnungen')
                .select('id, rechnung_nr, rechnungsdatum, total, typ, status')
                .eq('projekt_id', selectedProjektId)
                .neq('status', 'Storniert')
              
              if (projInvoices && projInvoices.length > 0) {
                akontos = projInvoices.map(r => ({
                  rechnung_id: r.id,
                  rechnung_nr: r.rechnung_nr || `RE-${r.id}`,
                  datum: r.rechnungsdatum || null,
                  betrag: parseFloat(r.total || 0),
                  titel: r.typ === 'akonto' ? 'Akonto-Rechnung' : 'Bisherige Rechnung'
                }))
              }
            } catch (pErr) {
              console.warn('Could not load previous project invoices:', pErr)
            }
          }

          draftData.daten.akonto_abzuege = akontos
          draftData.daten.sia118 = {
            aktiv: true,
            rueckbehalt: {
              aktiv: true,
              prozent: 5.0,
              abgeloestDurchGarantie: false,
              basis: 'gesamtwerkpreis'
            }
          }
          draftData.daten.texte = {
            einleitungstext: 'Wir bedanken uns für das entgegengebrachte Vertrauen bei der Ausführung der Arbeiten und unterbreiten Ihnen hiermit die SIA 118 Schlussrechnung:',
            schlusstext: 'Der fällige Schlussbetrag ist innert der vereinbarten Zahlungsfrist zu begleichen. Der Garantie-Rückbehalt von 5% wird nach Ablauf der 2-jährigen Rügefrist gemäss SIA 118 Art. 172 freigegeben.'
          }
        } else if (rechnungTyp === 'akonto') {
          draftData.typ = 'akonto'
          draftData.akonto_prozent = parseFloat(akontoProzent) || 30
          draftData.daten.texte = {
            einleitungstext: `Gemäss unserer Vereinbarung stellen wir Ihnen folgende Akontorechnung (${parseFloat(akontoProzent) || 30}%):`,
            schlusstext: 'Bitte überweisen Sie den Betrag innert der Zahlungsfrist auf unser Konto.'
          }
        } else {
          draftData.typ = 'standard'
        }
      }

      const { data, error: insertErr } = await supabase
        .from(table)
        .insert([draftData])
        .select('*, kunden(name), projekte(name, adresse)')
        
      if (insertErr) throw insertErr
      
      if (data && data.length > 0) {
        const createdDoc = data[0]
        if (onSuccess) {
          onSuccess(createdDoc)
        } else {
          onClose()
          if (onNavigate) {
            onNavigate(table, { [`${type}Id`]: createdDoc.id, edit: true }, { replace: true })
          }
        }
      }
    } catch (err) {
      console.error(`Fehler beim Erstellen der ${docTypeLabel}:`, err)
      setError(`${docTypeLabel} konnte nicht erstellt werden. Details: ${err.message || JSON.stringify(err)}`)
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div 
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 transition-opacity animate-fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 pointer-events-none">
        <div className="bg-white rounded-t-[28px] sm:rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92dvh] sm:max-h-[90vh] overflow-hidden pointer-events-auto transform transition-all animate-slide-up sm:animate-scale-up border border-border pb-[env(safe-area-inset-bottom)] sm:pb-0">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-5 border-b border-border bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xl border border-primary-100">
                {docTypeIcon}
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-text-primary">Neue {docTypeLabel} erstellen</h2>
                <p className="text-xs text-text-muted hidden sm:block">Grunddaten festlegen &mdash; Positionen folgen im Editor</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              aria-label="Modal schliessen"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-start gap-3">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-text-primary">
                      Kunde <span className="text-red-500">*</span>
                    </label>
                    {!isCreatingKunde && (
                      <button 
                        type="button" 
                        onClick={() => setIsCreatingKunde(true)}
                        className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors"
                      >
                        + Neu
                      </button>
                    )}
                  </div>
                  {isCreatingKunde ? (
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <input 
                        autoFocus
                        type="text"
                        value={newKundeName}
                        onChange={(e) => setNewKundeName(e.target.value)}
                        placeholder="Name des neuen Kunden..."
                        className="w-full sm:flex-1 px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-surface border border-border focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-xl text-base sm:text-sm font-medium text-text-primary outline-none transition-all"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateKunde()}
                      />
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                          type="button"
                          onClick={() => { setIsCreatingKunde(false); setNewKundeName(''); }}
                          className="flex-1 sm:flex-none px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-neutral-100 text-text-secondary hover:text-text-primary font-bold text-base sm:text-sm rounded-xl transition-colors"
                        >
                          Abbrechen
                        </button>
                        <button 
                          type="button"
                          onClick={handleCreateKunde}
                          disabled={isCreatingKundeLoading || !newKundeName.trim()}
                          className="flex-1 sm:flex-none px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-primary-600 text-white font-bold text-base sm:text-sm rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
                        >
                          {isCreatingKundeLoading ? '...' : 'Speichern'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <select 
                      value={selectedKundeId}
                      onChange={(e) => setSelectedKundeId(e.target.value)}
                      className="w-full px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-surface border border-border focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-xl text-base sm:text-sm font-medium text-text-primary outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">-- Kunde auswählen --</option>
                      {kunden.map(k => (
                        <option key={k.id} value={k.id}>{k.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-text-primary">
                      Projekt / Baustelle <span className="text-text-secondary font-normal ml-1">(Optional)</span>
                    </label>
                    {selectedKundeId && !isCreatingProjekt && (
                      <button 
                        type="button" 
                        onClick={() => setIsCreatingProjekt(true)}
                        className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors"
                      >
                        + Neu
                      </button>
                    )}
                  </div>
                  {isCreatingProjekt ? (
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <input 
                        autoFocus
                        type="text"
                        value={newProjektName}
                        onChange={(e) => setNewProjektName(e.target.value)}
                        placeholder="Name des neuen Projekts..."
                        className="w-full sm:flex-1 px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-surface border border-border focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-xl text-base sm:text-sm font-medium text-text-primary outline-none transition-all"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateProjekt()}
                      />
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                          type="button"
                          onClick={() => { setIsCreatingProjekt(false); setNewProjektName(''); }}
                          className="flex-1 sm:flex-none px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-neutral-100 text-text-secondary hover:text-text-primary font-bold text-base sm:text-sm rounded-xl transition-colors"
                        >
                          Abbrechen
                        </button>
                        <button 
                          type="button"
                          onClick={handleCreateProjekt}
                          disabled={isCreatingProjektLoading || !newProjektName.trim()}
                          className="flex-1 sm:flex-none px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-primary-600 text-white font-bold text-base sm:text-sm rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
                        >
                          {isCreatingProjektLoading ? '...' : 'Speichern'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <select 
                      value={selectedProjektId}
                      onChange={(e) => setSelectedProjektId(e.target.value)}
                      disabled={!selectedKundeId || projekte.length === 0}
                      className="w-full px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-surface border border-border focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-xl text-base sm:text-sm font-medium text-text-primary outline-none transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:bg-gray-50"
                    >
                      <option value="">-- Kein Projekt --</option>
                      {projekte.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {!isOfferte && (
                  <div>
                    <label className="block text-sm font-bold text-text-primary mb-2">
                      Rechnungstyp
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setRechnungTyp('standard')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          rechnungTyp === 'standard'
                            ? 'border-primary-500 bg-primary-50/50 ring-2 ring-primary-500/20'
                            : 'border-border bg-surface hover:bg-neutral-50'
                        }`}
                      >
                        <div className="text-sm font-bold text-text-primary">Standard</div>
                        <div className="text-xs text-text-secondary mt-0.5">Einzel- oder Gesamtrechnung</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRechnungTyp('akonto')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          rechnungTyp === 'akonto'
                            ? 'border-primary-500 bg-primary-50/50 ring-2 ring-primary-500/20'
                            : 'border-border bg-surface hover:bg-neutral-50'
                        }`}
                      >
                        <div className="text-sm font-bold text-text-primary">Akonto</div>
                        <div className="text-xs text-text-secondary mt-0.5">Abschlagsrechnung mit %</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRechnungTyp('schluss')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                          rechnungTyp === 'schluss'
                            ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                            : 'border-border bg-surface hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-text-primary">SIA 118 Schluss</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">Art. 181</span>
                        </div>
                        <div className="text-xs text-text-secondary mt-0.5">Akonto-Abzug & 5% Garantie</div>
                      </button>
                    </div>

                    {rechnungTyp === 'akonto' && (
                      <div className="mt-3 p-3 bg-primary-50/40 rounded-xl border border-primary-100 flex items-center justify-between flex-wrap gap-2">
                        <label className="text-xs font-semibold text-text-secondary">
                          Akonto-Anteil:
                        </label>
                        <div className="flex items-center gap-1.5">
                          {[20, 30, 40, 50].map(pct => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setAkontoProzent(pct)}
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                akontoProzent === pct
                                  ? 'bg-primary-600 text-white border-primary-600'
                                  : 'bg-white text-text-secondary border-border hover:bg-neutral-50'
                              }`}
                            >
                              {pct}%
                            </button>
                          ))}
                          <div className="flex items-center gap-1 ml-1">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={akontoProzent}
                              onChange={(e) => setAkontoProzent(parseFloat(e.target.value) || 0)}
                              className="w-16 px-2 py-1 bg-white border border-border rounded-lg text-xs font-bold text-right"
                            />
                            <span className="text-xs text-text-secondary">%</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {rechnungTyp === 'schluss' && (
                      <div className="mt-3 p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                        <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>
                          <strong>SIA 118 Konformität:</strong> Frühere Akonto-Rechnungen des Projekts werden automatisch angerechnet. Ein 5% Garantie-Rückbehalt (SIA 118 Art. 181) wird berechnet oder kann durch Bankbürgschaft abgelöst werden.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-text-primary mb-2">
                    Titel / Betreff
                  </label>
                  <input 
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={`z.B. ${docTypeLabel} für Renovation...`}
                    className="w-full px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-surface border border-border focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-xl text-base sm:text-sm font-medium text-text-primary outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-text-primary mb-2">
                    Datum
                  </label>
                  <input 
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-surface border border-border focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-xl text-base sm:text-sm font-medium text-text-primary outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-border bg-neutral-50 flex flex-col sm:flex-row justify-end gap-3 sticky bottom-0 z-10">
              <button 
                onClick={onClose}
                className="w-full sm:w-auto min-h-[48px] px-6 py-3 sm:py-2.5 bg-white border border-border text-text-secondary hover:text-text-primary font-bold text-base sm:text-sm rounded-xl hover:bg-neutral-50 transition-colors shadow-sm cursor-pointer"
              >
                Abbrechen
              </button>
              
              <button 
                onClick={handleCreate}
                disabled={isSubmitting || !selectedKundeId}
                className="w-full sm:w-auto min-h-[48px] px-8 py-3 sm:py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold text-base sm:text-sm rounded-xl hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-primary-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Erstelle...
                  </>
                ) : (
                  <>
                    Weiter zum Editor
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </>
                )}
              </button>
            </div>
        </div>
      </div>
    </>
  )
}
