import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { validateIban, validateQrIban } from '../../lib/ibanValidator'
import {
  IconSwissFlag,
  IconQrBill,
  IconCheck,
  IconLightbulb,
  IconBuilding,
  IconUser,
} from '../icons/BrandIcons'

const formatIban = (val) => {
  if (!val) return ''
  const clean = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return clean.match(/.{1,4}/g)?.join(' ') || clean
}

export default function FirstLoginWelcomeModal({
  isOpen,
  onClose,
  globalSettings,
  refreshGlobalSettings,
  tenantInfo,
  onNavigate,
  onOpenCreateKunde,
}) {
  const [step, setStep] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  // Step 1: Bank & QR-IBAN
  const [qrIban, setQrIban] = useState(globalSettings?.qr_iban || '')
  const [bankverbindung, setBankverbindung] = useState(globalSettings?.bankverbindung || '')

  // Step 2: MWST & UID
  const [isMwstPflichtig, setIsMwstPflichtig] = useState(
    globalSettings?.standard_mwst !== 0
  )
  const [standardMwst, setStandardMwst] = useState(
    globalSettings?.standard_mwst || 8.1
  )
  const [uid, setUid] = useState(globalSettings?.uid || '')

  if (!isOpen) return null

  const qrValidation = qrIban ? validateQrIban(qrIban) : { valid: false }
  const ibanValidation = bankverbindung ? validateIban(bankverbindung) : { valid: false }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const cleanQr = qrIban.replace(/\s+/g, '').toUpperCase()
      const cleanIban = bankverbindung.replace(/\s+/g, '').toUpperCase()
      const mwstVal = isMwstPflichtig ? Number(standardMwst) || 8.1 : 0

      const payload = {
        qr_iban: cleanQr,
        bankverbindung: cleanIban,
        standard_mwst: mwstVal,
        uid: uid.trim(),
      }

      if (tenantInfo?.id || globalSettings?.tenant_id) {
        const targetTenantId = tenantInfo?.id || globalSettings?.tenant_id
        const { error: upsertErr } = await supabase
          .from('einstellungen')
          .update(payload)
          .eq('tenant_id', targetTenantId)

        if (upsertErr) throw upsertErr
      } else if (globalSettings?.id) {
        const { error: updateErr } = await supabase
          .from('einstellungen')
          .update(payload)
          .eq('id', globalSettings.id)

        if (updateErr) throw updateErr
      }

      // Mark locally so user isn't prompted repeatedly
      try {
        const tId = tenantInfo?.id || globalSettings?.tenant_id
        if (tId) {
          localStorage.setItem(`kinetic_first_login_done_${tId}`, 'true')
          localStorage.setItem(`kc_seen_welcome_${tId}`, 'true')
        }
      } catch {}

      if (refreshGlobalSettings) {
        await refreshGlobalSettings()
      }
      return true
    } catch (err) {
      console.error('Failed to save onboarding settings:', err)
      setError('Die Einstellungen konnten nicht gespeichert werden: ' + (err.message || ''))
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const handleNextStep = async () => {
    setError(null)
    if (step === 1) {
      setStep(2)
    } else if (step === 2) {
      const success = await handleSaveSettings()
      if (success) {
        setStep(3)
      }
    }
  }

  const handleFinishWithAction = async (action) => {
    onClose()
    if (action === 'offerte') {
      onNavigate('offerten')
    } else if (action === 'kunde') {
      if (onOpenCreateKunde) {
        onOpenCreateKunde()
      } else {
        onNavigate('kunden')
      }
    } else {
      onNavigate('dashboard')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-[#101014]/95 rounded-3xl border border-white/12 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh] text-[#F5F5F7]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Swiss Precision Branding */}
        <div className="bg-white/[0.03] border-b border-white/10 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D6BA94]/15 border border-[#D6BA94]/30 text-[#D6BA94] flex items-center justify-center font-bold text-sm shrink-0">
              <IconSwissFlag className="w-5 h-5 rounded-xs" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-base">
                  Willkommen bei Kinetic Craft
                </h3>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#D6BA94]/15 text-[#D6BA94] border border-[#D6BA94]/30">
                  Schweiz
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {tenantInfo?.name || globalSettings?.firmenname || 'Ihr Betrieb'} ist startklar.
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-medium text-neutral-400">
              Schritt {step} von 3
            </span>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="w-full bg-white/10 h-1.5 overflow-hidden">
          <div 
            className="bg-[#D6BA94] h-full transition-all duration-300 ease-out"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
              <span className="font-bold">!</span>
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Bank & QR-IBAN */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <IconQrBill className="w-4 h-4 text-[#D6BA94] shrink-0" />
                  <span>Schritt 1: Bankverbindung & QR-IBAN für Schweizer Rechnungen</span>
                </h4>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Damit Ihre Rechnungen den offiziellen 105 mm Schweizer QR-Zahlteil nach ISO 20022 enthalten, hinterlegen Sie hier Ihre QR-IBAN oder Standard-IBAN.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-1.5">
                  QR-IBAN (Empfohlen für QR-Rechnung mit Referenz)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={qrIban}
                    onChange={(e) => setQrIban(formatIban(e.target.value))}
                    placeholder="CH93 3000 0000 0000 0000 0"
                    className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl focus:bg-white/[0.07] focus:outline-none focus:border-[#D6BA94] focus:ring-2 focus:ring-[#D6BA94]/20 text-white text-sm font-mono placeholder:text-neutral-500 transition-colors"
                  />
                </div>
                {qrIban && (
                  <div className="mt-1.5 text-xs">
                    {qrValidation.valid ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                        <IconCheck className="w-3.5 h-3.5" />
                        <span>Gültige Schweizer QR-IBAN (IID {qrIban.replace(/\s+/g,'').substring(4,9)})</span>
                      </span>
                    ) : (
                      <span className="text-[#D6BA94] text-[11px] font-medium flex items-center gap-1.5">
                        <IconLightbulb className="w-3.5 h-3.5 shrink-0" />
                        <span>{qrValidation.error || 'Hinweis: Eine QR-IBAN besitzt die Instituts-ID 30000–31999.'}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-1.5">
                  Normale IBAN (Zusätzlich oder als Standard)
                </label>
                <input
                  type="text"
                  value={bankverbindung}
                  onChange={(e) => setBankverbindung(formatIban(e.target.value))}
                  placeholder="CH93 0000 0000 0000 0000 0"
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl focus:bg-white/[0.07] focus:outline-none focus:border-[#D6BA94] focus:ring-2 focus:ring-[#D6BA94]/20 text-white text-sm font-mono placeholder:text-neutral-500 transition-colors"
                />
                {bankverbindung && ibanValidation.valid && (
                  <span className="mt-1 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                    <IconCheck className="w-3.5 h-3.5" />
                    <span>Gültige Schweizer IBAN</span>
                  </span>
                )}
              </div>

              <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-neutral-300 flex items-start gap-2.5">
                <IconLightbulb className="w-4 h-4 text-[#D6BA94] shrink-0 mt-0.5" />
                <span className="leading-snug">
                  Sie finden Ihre QR-IBAN im E-Banking Ihrer Hausbank (z. B. PostFinance, Raiffeisen, UBS, ZKB). Sie können diese Angabe auch später in den Einstellungen ändern.
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: MWST & UID */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <IconBuilding className="w-4 h-4 text-[#D6BA94] shrink-0" />
                  <span>Schritt 2: Mehrwertsteuer (MWST) & Schweizer UID</span>
                </h4>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Legen Sie fest, wie die Schweizer Mehrwertsteuer auf Ihren Offerten und Rechnungen ausgewiesen wird.
                </p>
              </div>

              {/* MWST Options */}
              <div className="space-y-2.5">
                <label className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  isMwstPflichtig ? 'border-[#D6BA94] bg-[#D6BA94]/10 ring-1 ring-[#D6BA94]/30' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}>
                  <input
                    type="radio"
                    name="mwstOption"
                    checked={isMwstPflichtig}
                    onChange={() => setIsMwstPflichtig(true)}
                    className="mt-0.5 h-4 w-4 accent-[#D6BA94]"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      MWST-pflichtig (Reguläre MWST-Abrechnung)
                    </span>
                    <span className="text-[11px] text-neutral-400 leading-snug block mt-0.5">
                      Ausweis von 8.1% Normalsatz (bzw. 2.6% Reduziert) auf allen Rechnungen.
                    </span>
                  </div>
                </label>

                <label className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  !isMwstPflichtig ? 'border-[#D6BA94] bg-[#D6BA94]/10 ring-1 ring-[#D6BA94]/30' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}>
                  <input
                    type="radio"
                    name="mwstOption"
                    checked={!isMwstPflichtig}
                    onChange={() => setIsMwstPflichtig(false)}
                    className="mt-0.5 h-4 w-4 accent-[#D6BA94]"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      MWST-befreit (Kleinunternehmen nach Art. 10 MWSTG)
                    </span>
                    <span className="text-[11px] text-neutral-400 leading-snug block mt-0.5">
                      Jahresumsatz unter CHF 100'000. Rechnungen werden ohne MWST (0.0%) ausgestellt.
                    </span>
                  </div>
                </label>
              </div>

              {/* UID-Nummer */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-1.5">
                  Unternehmens-Identifikationsnummer (UID)
                </label>
                <input
                  type="text"
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  placeholder="CHE-123.456.789 MWST"
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl focus:bg-white/[0.07] focus:outline-none focus:border-[#D6BA94] focus:ring-2 focus:ring-[#D6BA94]/20 text-white text-sm font-mono placeholder:text-neutral-500 transition-colors"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Wird auf dem Briefkopf und im QR-Zahlteil als Absender-Identifikation gedruckt.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Ready for Business & Action Selector */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in text-center py-2">
              <div className="w-14 h-14 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <IconCheck className="w-7 h-7" />
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white">
                  Ihr Betrieb ist einsatzbereit!
                </h4>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1 leading-relaxed">
                  Die Schweizer Rechnungsstandards (SIA 118, ISO 20022 QR-Bill & MWSTG) sind eingerichtet. Wählen Sie, wie Sie starten möchten:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
                <button
                  type="button"
                  onClick={() => handleFinishWithAction('offerte')}
                  className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-[#D6BA94]/40 transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/[0.06] text-[#D6BA94] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <IconQrBill className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-white">Muster-Offerte testen</h5>
                    <p className="text-[11px] text-neutral-400 mt-0.5">Offerte & Schweizer PDF-Druck ausprobieren</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleFinishWithAction('kunde')}
                  className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-[#D6BA94]/40 transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/[0.06] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                    <IconUser className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-white">Ersten Kunden anlegen</h5>
                    <p className="text-[11px] text-neutral-400 mt-0.5">Echten Auftraggeber erfassen</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleFinishWithAction('dashboard')}
                  className="p-3.5 rounded-2xl border border-[#D6BA94]/40 bg-[#D6BA94]/10 hover:bg-[#D6BA94]/15 transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#D6BA94] text-neutral-950 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <IconSwissFlag className="w-4 h-4 rounded-xs" />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-[#D6BA94]">Zum Cockpit</h5>
                    <p className="text-[11px] text-neutral-400 mt-0.5">Dashboard mit Onboarding-Checkliste öffnen</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {step < 3 && (
          <div className="bg-white/[0.02] border-t border-white/10 px-6 py-4 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                disabled={isSaving}
                className="px-4 py-2.5 text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
              >
                Zurück
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-3 py-2 text-xs font-medium text-neutral-400 hover:text-white cursor-pointer transition-colors"
              >
                Später ausfüllen
              </button>
            )}

            <button
              type="button"
              onClick={handleNextStep}
              disabled={isSaving}
              className="apple-titanium-btn px-5 py-2.5 bg-[#D6BA94] hover:bg-[#c4a67e] text-neutral-950 font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <span>Wird gespeichert...</span>
              ) : (
                <>
                  <span>{step === 1 ? 'Weiter zu MWST & UID' : 'Einstellungen speichern'}</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
