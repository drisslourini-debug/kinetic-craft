import React, { useState, useEffect } from 'react'
import { checkOnboardingStatus, cleanupDemoData } from '../../services/onboardingService'

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
    return localStorage.getItem('a77_onboarding_minimized') === 'true'
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
    <div className="mb-8 bg-white border border-primary-200/80 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-primary-50 via-amber-50/40 to-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-primary-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
            🇨🇭
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-text-primary text-base">
                Erste Schritte im Kinetic Craft CRM
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-100 text-primary-800">
                {status?.completedCount || 0} von {status?.totalSteps || 5} erledigt ({status?.progressPercent || 0}%)
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Richte deinen Betrieb ein, um rechtskonforme Offerten und Schweizer QR-Rechnungen zu erstellen.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={toggleMinimize}
            className="px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-black/5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
          >
            {isMinimized ? (
              <>
                <span>Aufklappen</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </>
            ) : (
              <>
                <span>Minimieren</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 text-text-secondary/60 hover:text-text-secondary hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
            title="Diesen Leitfaden ausblenden"
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
                <span className="text-base">💡</span>
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
                    {step.completed ? '✓' : idx + 1}
                  </div>
                  <div>
                    <h4 className={`text-sm font-semibold leading-tight ${step.completed ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
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
                    <span>✓</span>
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
