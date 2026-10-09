import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import CameraCapture from '../components/CameraCapture'
import { scanReceipt } from '../services/aiService'
import { IconSparkles, IconPhotoScanner, IconCheck, IconWarning, IconRefresh } from '../components/icons/BrandIcons'

export default function AusgabeCreateModal({ isOpen, onClose, onSave, editData = null, autoTriggerScan = false }) {
  const [formData, setFormData] = useState({
    titel: '',
    beleg_datum: new Date().toISOString().split('T')[0],
    kategorie: '4000 Materialaufwand',
    betrag_brutto: '',
    mwst_satz: '8.1',
    projekt_id: ''
  })
  const [projekte, setProjekte] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [file, setFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  
  const [isPaid, setIsPaid] = useState(true)
  const [faelligAm, setFaelligAm] = useState('')
  const [submitError, setSubmitError] = useState(null)
  const [showCamera, setShowCamera] = useState(false)

  // KI Belegscan State
  const [isAiScanning, setIsAiScanning] = useState(false)
  const [aiScanSuccess, setAiScanSuccess] = useState(false)
  const [aiWarning, setAiWarning] = useState(null)
  const [aiFields, setAiFields] = useState({})
  const fileInputRef = useRef(null)

  // Automatische Berechnungen
  const bruttoNum = parseFloat(formData.betrag_brutto) || 0
  const mwstRate = parseFloat(formData.mwst_satz) || 0
  
  // Brutto = Netto * (1 + mwstRate/100)
  // Netto = Brutto / (1 + mwstRate/100)
  const nettoNum = Math.round((bruttoNum / (1 + (mwstRate / 100))) * 100) / 100
  const mwstBetragNum = Math.round((bruttoNum - nettoNum) * 100) / 100

  useEffect(() => {
    if (isOpen) {
      // Fetch Projekte for dropdown
      const fetchProjekte = async () => {
        const { data } = await supabase
          .from('projekte')
          .select('id, name')
          .eq('is_archived', false)
          .order('name')
        if (data) setProjekte(data)
      }
      fetchProjekte()
      
      // Reset or pre-fill form
      if (editData) {
        setFormData({
          titel: editData.titel || '',
          beleg_datum: editData.beleg_datum ? editData.beleg_datum.split('T')[0] : new Date().toISOString().split('T')[0],
          kategorie: editData.kategorie || '4000 Materialaufwand',
          betrag_brutto: editData.betrag_brutto || '',
          mwst_satz: editData.mwst_satz || '8.1',
          projekt_id: editData.projekt_id || ''
        })
        setIsPaid(editData.status === 'Bezahlt' || !editData.status)
        setFaelligAm(editData.faellig_am || '')
      } else {
        setFormData({
          titel: '',
          beleg_datum: new Date().toISOString().split('T')[0],
          kategorie: '4000 Materialaufwand',
          betrag_brutto: '',
          mwst_satz: '8.1',
          projekt_id: ''
        })
        setIsPaid(true)
        setFaelligAm('')
      }
      setFile(null)
    }
  }, [isOpen, editData])

  useEffect(() => {
    if (isOpen) {
      setIsAiScanning(false)
      setAiScanSuccess(false)
      setAiWarning(null)
      setAiFields({})
      if (autoTriggerScan && fileInputRef.current) {
        setTimeout(() => fileInputRef.current?.click(), 200)
      }
    }
  }, [isOpen, autoTriggerScan])

  const handleRunAiScan = async (fileToScan) => {
    if (!fileToScan) return
    setIsAiScanning(true)
    setSubmitError(null)
    setAiWarning(null)
    setAiScanSuccess(false)
    setFile(fileToScan)

    try {
      const data = await scanReceipt({
        file: fileToScan,
        projekte
      })

      if (data) {
        setFormData(prev => ({
          ...prev,
          titel: data.titel || prev.titel,
          beleg_datum: data.beleg_datum || prev.beleg_datum,
          betrag_brutto: (data.betrag_brutto !== undefined && data.betrag_brutto !== null) ? String(data.betrag_brutto) : prev.betrag_brutto,
          mwst_satz: data.mwst_satz ? String(data.mwst_satz) : prev.mwst_satz,
          kategorie: data.kategorie || prev.kategorie,
          projekt_id: data.projekt_id || prev.projekt_id
        }))

        setAiFields({
          titel: !!data.titel,
          beleg_datum: !!data.beleg_datum,
          betrag_brutto: data.betrag_brutto !== undefined && data.betrag_brutto !== null,
          mwst_satz: !!data.mwst_satz,
          kategorie: !!data.kategorie,
          projekt_id: !!data.projekt_id
        })

        if (data.warnung || data.vertrauen === 'niedrig') {
          setAiWarning(data.warnung || 'Der Beleg war teilweise schwer lesbar. Bitte prüfe die Beträge und den MWST-Satz sorgfältig.')
        } else {
          setAiScanSuccess(true)
        }
      }
    } catch (err) {
      console.error('AI Scan Error:', err)
      setSubmitError('KI-Belegeinlesung fehlgeschlagen: ' + (err.message || 'Unbekannter Fehler'))
    } finally {
      setIsAiScanning(false)
    }
  }

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.titel || !formData.betrag_brutto) return

    setIsSubmitting(true)
    try {
      let belegUrl = null

      if (file) {
        setIsUploading(true)
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_beleg.${fileExt}`
        const filePath = `buchhaltung/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('anhange')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data } = supabase.storage
          .from('anhange')
          .getPublicUrl(filePath)
        
        belegUrl = data.publicUrl
        setIsUploading(false)
      }

      const payload = {
        titel: formData.titel,
        beleg_datum: formData.beleg_datum,
        kategorie: formData.kategorie,
        betrag_brutto: bruttoNum,
        betrag_netto: nettoNum,
        mwst_satz: mwstRate,
        mwst_betrag: mwstBetragNum,
        projekt_id: formData.projekt_id || null,
        status: isPaid ? 'Bezahlt' : 'Offen',
        faellig_am: !isPaid && faelligAm ? faelligAm : null
      }
      
      // Nur beleg_url updaten wenn eine neue Datei hochgeladen wurde, 
      // ansonsten behalten wir die alte (beim Editieren).
      if (belegUrl) {
        payload.beleg_url = belegUrl
      }

      let response;
      if (editData) {
        response = await supabase
          .from('ausgaben')
          .update(payload)
          .eq('id', editData.id)
          .select()
          .single()
      } else {
        response = await supabase
          .from('ausgaben')
          .insert([payload])
          .select()
          .single()
      }

      if (response.error) throw response.error
      onSave(response.data)
      onClose()
    } catch (err) {
      console.error('Error saving ausgabe:', err)
      setSubmitError('Fehler beim Speichern der Ausgabe: ' + (err.message || 'Unbekannter Fehler'))
    } finally {
      setIsSubmitting(false)
      setIsUploading(false)
    }
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(val)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/40 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-t-[28px] sm:rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up sm:animate-scale-up flex flex-col max-h-[92dvh] sm:max-h-[90vh] pb-[env(safe-area-inset-bottom)] sm:pb-0">
        {/* Mobile Pull Handle */}
        <div className="w-full pt-3 pb-1.5 flex justify-center sm:hidden shrink-0 touch-action-manipulation cursor-pointer" onClick={onClose}>
          <div className="w-12 h-1.5 bg-neutral-300 rounded-full" />
        </div>

        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">{editData ? 'Ausgabe bearbeiten' : 'Neue Ausgabe erfassen'}</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{editData ? 'Details der Buchung anpassen' : 'Beleg abtippen und verbuchen'}</p>
          </div>
          <button onClick={onClose} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
            <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto">
          {/* AI Beleg-Scan Action Bar */}
          {!editData && (
            <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-primary-500/10 to-emerald-500/10 border border-amber-500/20 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 font-bold text-sm shrink-0">
                    <IconSparkles className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">KI-Belegeinlesung (Gemini Vision)</h4>
                    <p className="text-xs text-gray-500">Foto oder PDF hochladen – Betrag, MWST, Datum & Händler werden automatisch ausgefüllt.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 hover:text-primary-600 hover:bg-gray-50 text-xs font-semibold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <IconPhotoScanner className="w-4 h-4 text-gray-600" />
                    <span>Kamera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <IconSparkles className="w-3.5 h-3.5 text-slate-950" />
                    <span>Beleg einlesen</span>
                  </button>
                </div>
              </div>

              {isAiScanning && (
                <div className="mt-3 pt-3 border-t border-amber-500/20 flex items-center space-x-3 text-xs text-amber-800 animate-pulse">
                  <div className="w-4 h-4 rounded-full border-2 border-amber-600 border-t-transparent animate-spin" />
                  <span>Gemini KI analysiert Beleg... (Händler, Betrag, MWST, Kategorie & Projekt)</span>
                </div>
              )}

              {aiScanSuccess && !isAiScanning && (
                <div className="mt-3 pt-2 border-t border-emerald-500/20 flex items-center space-x-2 text-xs font-semibold text-emerald-700">
                  <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Beleg erfolgreich erkannt! Bitte die vorausgefüllten Daten kurz prüfen.</span>
                </div>
              )}

              {aiWarning && !isAiScanning && (
                <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-800 flex items-start space-x-2">
                  <IconWarning className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Prüfhinweis: </span>
                    <span>{aiWarning}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {submitError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-start gap-2">
              <IconWarning className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p>{submitError}</p>
            </div>
          )}
          <form id="ausgabeForm" onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-semibold text-gray-700">Titel / Verwendungszweck *</label>
                  {aiFields.titel && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                      <IconSparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>KI</span>
                    </span>
                  )}
                </div>
                <input 
                  type="text"
                  required
                  placeholder="z.B. Schrauben Jumbo"
                  value={formData.titel}
                  onChange={e => setFormData({...formData, titel: e.target.value})}
                  className="w-full px-3 py-3 sm:py-2 min-h-[48px] sm:min-h-0 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base sm:text-sm"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-semibold text-gray-700">Belegdatum *</label>
                  {aiFields.beleg_datum && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                      <IconSparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>KI</span>
                    </span>
                  )}
                </div>
                <input 
                  type="date"
                  required
                  value={formData.beleg_datum}
                  onChange={e => setFormData({...formData, beleg_datum: e.target.value})}
                  className="w-full px-3 py-3 sm:py-2 min-h-[48px] sm:min-h-0 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-semibold text-gray-700">Kategorie *</label>
                  {aiFields.kategorie && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                      <IconSparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>KI</span>
                    </span>
                  )}
                </div>
                <select 
                  value={formData.kategorie}
                  onChange={e => setFormData({...formData, kategorie: e.target.value})}
                  className="w-full px-3 py-3 sm:py-2 min-h-[48px] sm:min-h-0 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-base sm:text-sm"
                >
                  <option value="4000 Materialaufwand">4000 Materialaufwand</option>
                  <option value="4400 Aufwand für Fremdleistungen">4400 Aufwand für Fremdleistungen (Subunternehmer)</option>
                  <option value="6200 Fahrzeug- und Transportaufwand">6200 Fahrzeug- & Transportaufwand</option>
                  <option value="6500 Verwaltungsaufwand">6500 Verwaltungsaufwand (Büro)</option>
                  <option value="6570 Informatikaufwand">6570 Informatikaufwand (Software)</option>
                  <option value="6900 Sonstiger Betriebsaufwand">6900 Sonstiger Betriebsaufwand</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-semibold text-gray-700">Projekt zuordnen (Optional)</label>
                  {aiFields.projekt_id && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                      <IconSparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>KI Match</span>
                    </span>
                  )}
                </div>
                <select 
                  value={formData.projekt_id}
                  onChange={e => setFormData({...formData, projekt_id: e.target.value})}
                  className="w-full px-3 py-3 sm:py-2 min-h-[48px] sm:min-h-0 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-base sm:text-sm"
                >
                  <option value="">Kein Projekt (Allgemeine Firmenausgabe)</option>
                  {projekte.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-semibold text-gray-700">Betrag Brutto (Total) *</label>
                  {aiFields.betrag_brutto && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                      <IconSparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>KI</span>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 sm:text-sm">CHF</span>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={formData.betrag_brutto}
                    onChange={e => setFormData({ ...formData, betrag_brutto: e.target.value })}
                    className="w-full pl-12 px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-shadow text-base sm:text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-semibold text-gray-700">MwSt Satz *</label>
                  {aiFields.mwst_satz && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                      <IconSparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>KI</span>
                    </span>
                  )}
                </div>
                <select
                  required
                  value={formData.mwst_satz}
                  onChange={e => setFormData({ ...formData, mwst_satz: e.target.value })}
                  className="w-full px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-shadow bg-white text-base sm:text-sm"
                >
                  <option value="8.1">8.1% (Standard)</option>
                  <option value="2.6">2.6% (Reduziert)</option>
                  <option value="3.8">3.8% (Sondersatz)</option>
                  <option value="0">0% (MwSt-frei)</option>
                </select>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mt-4">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${isPaid ? 'bg-primary-500' : 'bg-gray-300'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isPaid ? 'transform translate-x-4' : ''}`}></div>
                </div>
                <div className="ml-3 text-sm font-semibold text-gray-700">
                  Ausgabe wurde bereits bezahlt (z.B. Tankquittung)
                </div>
              </label>
              
              {!isPaid && (
                <div className="mt-4 pt-4 border-t border-gray-200 animate-fade-in">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Zahlbar bis (Fällig am) *</label>
                  <input
                    type="date"
                    required={!isPaid}
                    value={faelligAm}
                    onChange={e => setFaelligAm(e.target.value)}
                    className="w-full px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-shadow text-base sm:text-sm"
                  />
                </div>
              )}
            </div>
            </div>

            <div className="pt-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Beleg / Quittung (Optional)</label>
              
              {/* Camera capture button - primarily for mobile */}
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                className="w-full mb-2 min-h-[48px] px-4 py-3 text-base sm:text-sm font-semibold text-primary-700 bg-primary-50 border border-primary-200 rounded-xl hover:bg-primary-100 transition-colors cursor-pointer flex items-center justify-center gap-2 md:hidden"
              >
                <IconPhotoScanner className="w-5 h-5 text-primary-700 inline" />
                <span>Beleg fotografieren</span>
              </button>
              
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:bg-gray-50 transition-colors relative cursor-pointer group">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => {
                    const picked = e.target.files[0]
                    if (picked) {
                      handleRunAiScan(picked)
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-1 text-center">
                  {file ? (
                    <div className="flex flex-col items-center">
                      <svg className="mx-auto h-12 w-12 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-semibold text-gray-900 mt-2">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRunAiScan(file)
                        }}
                        className="mt-2 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <IconRefresh className="w-3.5 h-3.5 text-amber-800" />
                        <span>Mit KI neu einlesen</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <svg className="mx-auto h-12 w-12 text-gray-400 group-hover:text-primary-500 transition-colors" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="flex text-sm text-gray-600 justify-center mt-2">
                        <span className="relative rounded-md font-medium text-primary-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                          Datei auswählen
                        </span>
                        <p className="pl-1">oder via Drag & Drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, PDF bis 10MB • <span className="text-amber-600 font-medium">Wird automatisch von KI erfasst</span></p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <CameraCapture 
              isOpen={showCamera} 
              onClose={() => setShowCamera(false)} 
              onCapture={(blob) => {
                const now = new Date()
                const timestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}`
                const capturedFile = new File([blob], `beleg_${timestamp}.jpg`, { type: 'image/jpeg' })
                handleRunAiScan(capturedFile)
              }}
            />

            <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center border border-gray-200 mt-4">
              <div className="text-sm">
                <p className="text-gray-500">Netto: <span className="font-semibold text-gray-700">{formatCurrency(nettoNum)}</span></p>
                <p className="text-gray-500">MwSt: <span className="font-semibold text-gray-700">{formatCurrency(mwstBetragNum)}</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-0.5">Total Brutto</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(bruttoNum)}</p>
              </div>
            </div>

          </form>
        </div>

        <div className="p-4 sm:p-5 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3 bg-gray-50/50 shrink-0">
          <button 
            type="button" 
            onClick={onClose}
            className="w-full sm:w-auto min-h-[48px] px-4 py-3 sm:py-2 text-base sm:text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Abbrechen
          </button>
          <button 
            type="submit" 
            form="ausgabeForm"
            disabled={isSubmitting || !formData.titel || !formData.betrag_brutto}
            className="w-full sm:w-auto min-h-[48px] px-5 py-3 sm:py-2 text-base sm:text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isUploading ? 'Lädt hoch...' : isSubmitting ? 'Speichert...' : (editData ? 'Änderungen speichern' : 'Ausgabe verbuchen')}
          </button>
        </div>
      </div>
    </div>
  )
}
