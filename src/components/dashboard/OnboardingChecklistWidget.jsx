import React, { useState, useEffect } from 'react'
import { checkOnboardingStatus, cleanupDemoData } from '../../services/onboardingService'
import { IconSwissFlag, IconLightbulb, IconCheck } from '../icons/BrandIcons'

export default function OnboardingChecklistWidget({ 
  globalSettings, 
  onNavigate, 
  onOpenCreateKunde, 
  onOpenCreateOfferte,
  onRefreshData 
}) {
  const [status, setStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCleaning, setIsCleaning] = useState(false)
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem('a77_onboarding_minimized')
    if (saved !== null) return saved === 'true'
    return typeof window !== 'undefined' && window.innerWidth < 768
  })
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('a77_onboarding_dismissed') === 'true'
  })
  const [message, setMessage] = useState(null)

  const loadStatus = async () => {
    setIsLoading(true)
    const res = await checkOnboardingStatus(globalSettings)
    if (res) {
      setStatus(res)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadStatus()
  }, [globalSettings])

  const toggleMinimize = () => {
    const next = !isMinimized
    setIsMinimized(next)
    localStorage.setItem('a77_onboarding_minimized', String(next))
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('a77_onboarding_dismissed', 'true')
  }

  const handleCleanupDemo = async () => {
    if (!window.confirm('Möchtest du alle Schweizer Musterdaten (Demo-Kunde, Demo-Projekt & Demo-Offerte) wirklich jetzt entfernen?')) {
      return
    }

    setIsCleaning(true)
    setMessage(null)
    try {
      const res = await cleanupDemoData()
      if (res.success) {
        setMessage({ type: 'success', text: 'Musterdaten wurden erfolgreich entfernt!' })
        if (onRefreshData) onRefreshData()
        await loadStatus()
      } else {
        setMessage({ type: 'error', text: 'Fehler beim Entfernen der Musterdaten.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Ein unerwarteter Fehler ist aufgetreten.' })
    } finally {
      setIsCleaning(false)
      setTimeout(() => setMessage(null), 4000)
    }
  }

  const handleStepAction = (action) => {
    if (action === 'finanzen') {
      onNavigate('einstellungen')
    } else if (action === 'kunde') {
      if (onOpenCreateKunde) {
        onOpenCreateKunde()
      } else {
        onNavigate('kunden')
      }
    } else if (action === 'offerte') {
      if (onOpenCreateOfferte) {
        onOpenCreateOfferte()
      } else {
        onNavigate('offerten')
      }
    } else if (action === 'logo') {
      onNavigate('einstellungen')
    } else if (action === 'team') {
      onNavigate('einstellungen')
    }
  }

  // If dismissed and all completed, don't show
  if (isDismissed || (status?.allCompleted && !status?.hasDemoData && isMinimized)) {
    return null
  }

  if (isLoading && !status) {
    return null
  }

  return (
    <div className="mb-4 sm:mb-8 bg-white border border-primary-200/80 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
      {/* Top Banner Header */}
      <div 
        className={`bg-gradient-to-r from-primary-50 via-amber-50/40 to-white px-3.5 py-2.5 sm:px-5 sm:py-4 flex items-center justify-between gap-2.5 border-b border-primary-100 ${
          isMinimized ? 'cursor-pointer hover:bg-primary-50/50' : ''
        }`}
        onClick={isMinimized ? toggleMinimize : undefined}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-primary-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
            <IconSwissFlag className="w-5 h-5 rounded-xs" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-text-primary text-xs sm:text-base truncate">
                <span className="sm:hidden">Erste Schritte im CRM</span>
                <span className="hidden sm:inline">Erste Schritte im Kinetic Craft CRM</span>
              </h3>
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-100 text-primary-800 shrink-0">
                {status?.completedCount || 0}/{status?.totalSteps || 5} ({status?.progressPercent || 0}%)
              </span>
            </div>
            {!isMinimized && (
              <p className="text-[11px] sm:text-xs text-text-secondary mt-0.5 leading-snug">
                Richte deinen Betrieb ein, um rechtskonforme Offerten und Schweizer QR-Rechnungen zu erstellen.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={toggleMinimize}
            className="px-2 py-1 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-black/5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
          >
            {isMinimized ? (
              <>
                <span className="hidden sm:inline">Aufklappen</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Minimieren</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 text-text-secondary/60 hover:text-text-secondary hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
            title="Diesen Leitfaden ausblenden"
            aria-label="Leitfaden ausblenden"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* Progress Bar Line */}
      <div className="w-full bg-gray-100 h-1.5 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-primary-500 to-emerald-500 h-full transition-all duration-500 ease-out"
          style={{ width: `${status?.progressPercent || 0}%` }}
        />
      </div>

      {/* Notification Toast */}
      {message && (
        <div className={`px-5 py-2.5 text-xs font-semibold border-b ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Expanded Checklist Body */}
      {!isMinimized && (
        <div className="p-5 space-y-4">
          {/* Demo Data Banner if active */}
          {status?.hasDemoData && (
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start sm:items-center gap-2 text-amber-900 font-medium">
                <IconLightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                <span>
                  <strong>Schweizer Musterdaten aktiv:</strong> Wir haben eine Beispiel-Offerte und einen Test-Kunden für deine Branche hinterlegt. Du kannst diese jederzeit rückstandslos bereinigen.
                </span>
              </div>
              <button
                type="button"
                onClick={handleCleanupDemo}
                disabled={isCleaning}
                className="shrink-0 px-3 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 rounded-lg font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isCleaning ? 'Wird bereinigt...' : 'Musterdaten jetzt entfernen'}
              </button>
            </div>
          )}

          {/* Checklist Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {status?.steps.map((step, idx) => (
              <div 
                key={step.id} 
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  step.completed 
                    ? 'bg-emerald-50/40 border-emerald-200/70 text-text-primary' 
                    : 'bg-surface border-border hover:border-primary-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 ${
                    step.completed 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-gray-100 text-text-secondary border border-gray-300'
                  }`}>
                    {step.completed ? <IconCheck className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <div>
                    <h4 className={`text-sm font-semibold leading-tight ${step.completed ? 'text-text-secondary' : 'text-text-primary'}`}>
                      {step.label}
                    </h4>
                    <p className="text-xs text-text-secondary mt-1">
                      {step.id === 'bank' && 'QR-IBAN für Schweizer QR-Rechnungen erforderlich.'}
                      {step.id === 'kunde' && 'Lege deinen ersten echten Auftraggeber an.'}
                      {step.id === 'offerte' && 'Erstelle dein erstes Angebot mit Schweizer MWST.'}
                      {step.id === 'logo' && 'Erscheint auf deinen PDF-Dokumenten & Rechnungen.'}
                      {step.id === 'team' && 'Gewähre deinem Treuhänder oder Team Zugang.'}
                    </p>
                  </div>
                </div>

                {!step.completed && (
                  <button
                    type="button"
                    onClick={() => handleStepAction(step.action)}
                    className="self-end mt-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Erledigen</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                )}

                {step.completed && (
                  <span className="self-end text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <span>Erledigt</span>
                    <IconCheck className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
