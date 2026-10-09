import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/formatters'
import SignaturePad from './SignaturePad'
import { useModalHistory } from '../../hooks/useModalHistory'
import {
  IconRapport,
  IconClose,
  IconCheck,
  IconWarning,
  IconPackage,
  IconDigitalSignature
} from '../icons/BrandIcons'

export default function RapportCreateModal({
  isOpen,
  onClose,
  onSaveSuccess,
  projekt,
  kunde,
  userName = '',
  initialStunden = null
}) {
  useModalHistory(isOpen, onClose, 'rapport_create_modal')

  const [datum, setDatum] = useState(() => new Date().toISOString().split('T')[0])
  const [monteurName, setMonteurName] = useState(userName || 'Monteur')
  const [beschreibung, setBeschreibung] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [activeStep, setActiveStep] = useState('work') // 'work' | 'material' | 'sign'

  const [stunden, setStunden] = useState(() => {
    if (initialStunden && Array.isArray(initialStunden) && initialStunden.length > 0) {
      return initialStunden
    }
    return [
      { id: '1', mitarbeiter: userName || 'Monteur', taetigkeit: 'Regiearbeiten', stunden: 2.0, ansatz: 95.00 }
    ]
  })

  const [material, setMaterial] = useState([])
  const [signature, setSignature] = useState({ signatureData: null, signerName: '', hasSignature: false })
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setDatum(new Date().toISOString().split('T')[0])
      setMonteurName(userName || 'Monteur')
      setBeschreibung('')
      setActiveStep('work')
      if (initialStunden && Array.isArray(initialStunden) && initialStunden.length > 0) {
        setStunden(initialStunden)
      } else {
        setStunden([
          { id: String(Date.now()), mitarbeiter: userName || 'Monteur', taetigkeit: 'Regiearbeiten', stunden: 2.0, ansatz: 95.00 }
        ])
      }
      setMaterial([])
      setSignature({
        signatureData: null,
        signerName: kunde?.name || kunde?.firmenname || '',
        hasSignature: false
      })
      setErrorMessage(null)
    }
  }, [isOpen, userName, kunde])

  if (!isOpen) return null

  // Hour rows management
  const handleAddHourRow = () => {
    setStunden((prev) => [
      ...prev,
      { id: String(Date.now()), mitarbeiter: monteurName, taetigkeit: '', stunden: 1.0, ansatz: 95.00 }
    ])
  }

  const handleHourChange = (id, field, value) => {
    setStunden((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    )
  }

  const handleRemoveHourRow = (id) => {
    setStunden((prev) => prev.filter((row) => row.id !== id))
  }

  // Material rows management
  const handleAddMaterialRow = () => {
    setMaterial((prev) => [
      ...prev,
      { id: String(Date.now()), artikel: '', menge: 1, einheit: 'Stk', preis: 0.00 }
    ])
  }

  const handleMaterialChange = (id, field, value) => {
    setMaterial((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    )
  }

  const handleRemoveMaterialRow = (id) => {
    setMaterial((prev) => prev.filter((row) => row.id !== id))
  }

  // Calculate totals
  const totalStunden = stunden.reduce((acc, curr) => acc + (parseFloat(curr.stunden) || 0), 0)
  const totalStundenKosten = stunden.reduce(
    (acc, curr) => acc + (parseFloat(curr.stunden) || 0) * (parseFloat(curr.ansatz) || 0),
    0
  )
  const totalMaterialKosten = material.reduce(
    (acc, curr) => acc + (parseFloat(curr.menge) || 0) * (parseFloat(curr.preis) || 0),
    0
  )
  const totalGesamt = totalStundenKosten + totalMaterialKosten

  const handleSave = async (completeAndSign = false) => {
    setErrorMessage(null)

    if (completeAndSign && !signature.hasSignature) {
      setErrorMessage('Bitte lassen Sie den Kunden vor dem Abschliessen unterschreiben.')
      setActiveStep('sign')
      return
    }

    setIsSaving(true)
    try {
      const year = new Date(datum).getFullYear()
      const randomSuffix = Math.floor(1000 + Math.random() * 9000)
      const generatedNr = `RAP-${year}-${randomSuffix}`

      const payload = {
        rapport_nr: generatedNr,
        projekt_id: projekt?.id || null,
        kunden_id: projekt?.kunden_id || kunde?.id || null,
        datum,
        monteur_name: monteurName,
        titel: `Regierapport ${projekt?.name ? '- ' + projekt.name : ''}`,
        beschreibung,
        stunden,
        material,
        status: completeAndSign ? 'Unterschrieben' : 'Entwurf',
        unterschrift_data: signature.signatureData,
        unterzeichner_name: signature.signerName,
        unterschrieben_am: completeAndSign ? new Date().toISOString() : null,
        is_archived: false
      }

      // Try Supabase insert
      let savedRapport = null
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('rapporte')
            .insert([payload])
            .select('*')
            .single()

          if (!error && data) {
            savedRapport = data
          }
        } catch (dbErr) {
          console.warn('Supabase rapporte insert fallback:', dbErr)
        }
      }

      // Fallback if table not yet created in remote DB
      if (!savedRapport) {
        savedRapport = {
          ...payload,
          id: `local_rap_${Date.now()}`
        }
        // Save to localStorage
        const stored = JSON.parse(localStorage.getItem('atelier77_rapporte') || '[]')
        stored.unshift(savedRapport)
        localStorage.setItem('atelier77_rapporte', JSON.stringify(stored))
      }

      if (onSaveSuccess) {
        onSaveSuccess(savedRapport)
      }
      onClose()
    } catch (err) {
      console.error('Fehler beim Speichern des Rapports:', err)
      setErrorMessage(err.message || 'Fehler beim Speichern.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-surface-card border border-border w-full max-w-3xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <IconRapport className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                Neuer Regierapport
              </h2>
              <p className="text-xs text-text-secondary truncate max-w-sm sm:max-w-md">
                {projekt?.name || 'Baustelle'} · {kunde?.name || kunde?.firmenname || 'Kunde'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-neutral-100 text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Schliessen"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-border bg-neutral-50 px-6 pt-2 gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveStep('work')}
            className={`pb-2.5 border-b-2 transition-all cursor-pointer ${
              activeStep === 'work' ? 'border-amber-500 text-amber-900' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            1. Stunden & Arbeiten ({totalStunden.toFixed(1)} h)
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('material')}
            className={`pb-2.5 border-b-2 transition-all cursor-pointer ${
              activeStep === 'material' ? 'border-amber-500 text-amber-900' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            2. Material ({material.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('sign')}
            className={`pb-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeStep === 'sign' ? 'border-amber-500 text-amber-900' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <span>3. Kundenunterschrift</span>
            {signature.hasSignature && <IconCheck className="w-3.5 h-3.5 text-emerald-600" />}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-2">
              <IconWarning className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: WORK & HOURS */}
          {activeStep === 'work' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Ausführungsdatum
                  </label>
                  <input
                    type="date"
                    value={datum}
                    onChange={(e) => setDatum(e.target.value)}
                    className="w-full bg-white border border-border rounded-xl px-3.5 py-2 text-sm text-text-primary focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Ausführender Monteur / Handwerker
                  </label>
                  <input
                    type="text"
                    value={monteurName}
                    onChange={(e) => setMonteurName(e.target.value)}
                    placeholder="Name des Handwerkers"
                    className="w-full bg-white border border-border rounded-xl px-3.5 py-2 text-sm text-text-primary focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Arbeitsbeschreibung / Tätigkeit
                </label>
                <textarea
                  rows={3}
                  value={beschreibung}
                  onChange={(e) => setBeschreibung(e.target.value)}
                  placeholder="z. B. Wanddurchbruch verputzt, Risse im Treppenhaus armiert und gespachtelt..."
                  className="w-full bg-white border border-border rounded-xl p-3 text-sm text-text-primary focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Hours Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-text-secondary tracking-wider">
                    Arbeitsstunden
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddHourRow}
                    className="text-xs text-amber-600 hover:text-amber-700 font-bold cursor-pointer"
                  >
                    + Zeile hinzufügen
                  </button>
                </div>

                <div className="space-y-2.5">
                  {stunden.map((row) => (
                    <div key={row.id} className="flex items-center gap-2 bg-neutral-50 p-2.5 rounded-2xl border border-border">
                      <input
                        type="text"
                        placeholder="Tätigkeit"
                        value={row.taetigkeit}
                        onChange={(e) => handleHourChange(row.id, 'taetigkeit', e.target.value)}
                        className="flex-1 bg-white border border-border rounded-xl px-3 py-1.5 text-xs text-text-primary focus:outline-hidden focus:border-amber-500"
                      />
                      <div className="flex items-center gap-1 w-24">
                        <input
                          type="number"
                          step="0.5"
                          min="0.25"
                          placeholder="Std"
                          value={row.stunden}
                          onChange={(e) => handleHourChange(row.id, 'stunden', parseFloat(e.target.value) || 0)}
                          className="w-full bg-white border border-border rounded-xl px-2.5 py-1.5 text-xs text-text-primary text-right focus:outline-hidden focus:border-amber-500 font-bold"
                        />
                        <span className="text-xs text-text-secondary">h</span>
                      </div>
                      <div className="flex items-center gap-1 w-28">
                        <input
                          type="number"
                          step="5"
                          min="0"
                          placeholder="Ansatz"
                          value={row.ansatz}
                          onChange={(e) => handleHourChange(row.id, 'ansatz', parseFloat(e.target.value) || 0)}
                          className="w-full bg-white border border-border rounded-xl px-2.5 py-1.5 text-xs text-text-primary text-right focus:outline-hidden focus:border-amber-500"
                        />
                        <span className="text-xs text-text-secondary">CHF</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveHourRow(row.id)}
                        className="w-8 h-8 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-neutral-100 flex items-center justify-center cursor-pointer"
                        aria-label="Zeile entfernen"
                      >
                        <IconClose className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: MATERIAL */}
          {activeStep === 'material' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase text-text-secondary tracking-wider">
                    Verbrauchtes Material & Kleinmaschinen
                  </h4>
                  <p className="text-[11px] text-text-secondary">Erfassen Sie Material, das zusätzlich verrechnet wird.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddMaterialRow}
                  className="text-xs text-amber-600 hover:text-amber-700 font-bold cursor-pointer"
                >
                  + Material hinzufügen
                </button>
              </div>

              {material.length === 0 ? (
                <div className="text-center py-6 text-xs text-text-secondary border-2 border-dashed border-border rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center mx-auto mb-2 text-text-muted">
                    <IconPackage className="w-5 h-5" />
                  </div>
                  <p className="font-semibold">Kein Material hinzugefügt</p>
                  <p className="mt-1">Klicken Sie oben auf &quot;+ Material hinzufügen&quot;, falls Material verrechnet werden soll.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {material.map((row) => (
                    <div key={row.id} className="flex items-center gap-2 bg-neutral-50 p-2.5 rounded-2xl border border-border">
                      <input
                        type="text"
                        placeholder="Artikel / Bezeichnung (z. B. Tiefgrund 5L)"
                        value={row.artikel}
                        onChange={(e) => handleMaterialChange(row.id, 'artikel', e.target.value)}
                        className="flex-1 bg-white border border-border rounded-xl px-3 py-1.5 text-xs text-text-primary focus:outline-hidden focus:border-amber-500"
                      />
                      <input
                        type="number"
                        step="1"
                        min="0.1"
                        placeholder="Menge"
                        value={row.menge}
                        onChange={(e) => handleMaterialChange(row.id, 'menge', parseFloat(e.target.value) || 0)}
                        className="w-16 bg-white border border-border rounded-xl px-2 py-1.5 text-xs text-text-primary text-right focus:outline-hidden focus:border-amber-500"
                      />
                      <input
                        type="text"
                        placeholder="Einheit"
                        value={row.einheit}
                        onChange={(e) => handleMaterialChange(row.id, 'einheit', e.target.value)}
                        className="w-16 bg-white border border-border rounded-xl px-2 py-1.5 text-xs text-text-primary text-center focus:outline-hidden focus:border-amber-500"
                      />
                      <div className="flex items-center gap-1 w-24">
                        <input
                          type="number"
                          step="1"
                          placeholder="CHF"
                          value={row.preis}
                          onChange={(e) => handleMaterialChange(row.id, 'preis', parseFloat(e.target.value) || 0)}
                          className="w-full bg-white border border-border rounded-xl px-2 py-1.5 text-xs text-text-primary text-right focus:outline-hidden focus:border-amber-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMaterialRow(row.id)}
                        className="w-8 h-8 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-neutral-100 flex items-center justify-center cursor-pointer"
                        aria-label="Zeile entfernen"
                      >
                        <IconClose className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: SIGNATURE */}
          {activeStep === 'sign' && (
            <div className="space-y-4">
              <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                  <span>Zusammenfassung vor Abnahme:</span>
                  <span className="text-sm font-extrabold">{formatCurrency(totalGesamt)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-amber-800">
                  <p>Arbeitszeit: <strong>{totalStunden.toFixed(1)} Std</strong> ({formatCurrency(totalStundenKosten)})</p>
                  <p>Material: <strong>{material.length} Positionen</strong> ({formatCurrency(totalMaterialKosten)})</p>
                </div>
                <p className="text-[10px] text-amber-700 leading-tight">
                  Mit der Unterschrift bestätigt der Kunde die ordnungsgemässe Ausführung der Regiearbeiten und die Richtigkeit der angegebenen Stunden und Materialien.
                </p>
              </div>

              <SignaturePad
                onSignatureChange={(sig) => setSignature(sig)}
                initialName={signature.signerName || kunde?.name || kunde?.firmenname || ''}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              Als Entwurf speichern
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {activeStep !== 'sign' ? (
              <button
                type="button"
                onClick={() => setActiveStep(activeStep === 'work' ? 'material' : 'sign')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-md transition-all cursor-pointer"
              >
                Weiter →
              </button>
            ) : (
              <button
                type="button"
                disabled={isSaving || !signature.hasSignature}
                onClick={() => handleSave(true)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2 ${
                  signature.hasSignature && !isSaving
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
                    : 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
                }`}
              >
                {isSaving ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Wird signiert...</span>
                  </>
                ) : (
                  <>
                    <IconDigitalSignature className="w-4 h-4" />
                    <span>Rapport abschliessen & signieren</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
