import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import CameraCapture from '../components/CameraCapture'

export default function AusgabeCreateModal({ isOpen, onClose, onSave, editData = null }) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{editData ? 'Ausgabe bearbeiten' : 'Neue Ausgabe erfassen'}</h3>
            <p className="text-sm text-gray-500 mt-1">{editData ? 'Details der Buchung anpassen' : 'Beleg abtippen und verbuchen'}</p>
          </div>
          <button onClick={onClose} className="p-3 sm:p-2 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            <svg className="w-5 h-5 sm:w-5 sm:h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto">
          {submitError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <p>{submitError}</p>
            </div>
          )}
          <form id="ausgabeForm" onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Titel / Verwendungszweck *</label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Belegdatum *</label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Kategorie *</label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Projekt zuordnen (Optional)</label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Betrag Brutto (Total) *</label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">MwSt Satz *</label>
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
                📸 Beleg fotografieren
              </button>
              
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:bg-gray-50 transition-colors relative cursor-pointer group">
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => setFile(e.target.files[0])}
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
                      <p className="text-xs text-gray-500">PNG, JPG, PDF bis 10MB</p>
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
                setFile(capturedFile)
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
