import React from 'react'
import { IconCheck } from '../icons/BrandIcons'

export const BAUPHASEN = [
  { id: 'offerte_angenommen', label: 'Offerte angenommen', step: 1 },
  { id: 'material_bestellt', label: 'Material bestellt', step: 2 },
  { id: 'in_ausfuehrung', label: 'In Ausführung (Aktiv)', step: 3 },
  { id: 'abnahme_regie', label: 'Abnahme & Regie', step: 4 },
  { id: 'abgerechnet', label: 'Abgerechnet', step: 5 }
]

export function resolveProjektPhase(projekt, rechnungen = [], rapporte = [], ausgaben = []) {
  if (projekt?.bauphase) {
    const found = BAUPHASEN.find(p => p.id === projekt.bauphase)
    if (found) return found.id
  }
  
  if (projekt?.status === 'Abgeschlossen') return 'abgerechnet'
  if (rechnungen.length > 0 && rechnungen.some(r => r.status === 'Bezahlt')) return 'abgerechnet'
  if (rapporte.length > 0 && rapporte.some(r => r.status === 'Unterschrieben')) return 'abnahme_regie'
  if (projekt?.status === 'In Arbeit' || projekt?.status === 'Aktiv') return 'in_ausfuehrung'
  if (ausgaben.length > 0) return 'material_bestellt'
  
  return 'offerte_angenommen'
}

export default function ProjektBauphasenStepper({
  currentPhase = 'in_ausfuehrung',
  onPhaseChange,
  readOnly = false,
  className = ''
}) {
  const currentStepIndex = BAUPHASEN.findIndex(p => p.id === currentPhase)
  const activeIndex = currentStepIndex !== -1 ? currentStepIndex : 2 // default to 'in_ausfuehrung' (index 2)

  return (
    <div className={`w-full bg-surface border border-border/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs ${className}`}>
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
          Bauphasen-Pipeline (SIA 118 / Bauprozess)
        </span>
        <span className="text-xs font-semibold text-[#b88a38] bg-[#b88a38]/10 px-2.5 py-0.5 rounded-full border border-[#b88a38]/20">
          Phase {activeIndex + 1} von {BAUPHASEN.length}: {BAUPHASEN[activeIndex]?.label}
        </span>
      </div>

      {/* Stepper Bar */}
      <div className="relative">
        {/* Progress track line behind steps */}
        <div className="absolute top-4 sm:top-4 left-6 right-6 h-0.5 bg-zinc-200 -translate-y-1/2 z-0 hidden sm:block" />
        <div 
          className="absolute top-4 sm:top-4 left-6 h-0.5 bg-[#b88a38] -translate-y-1/2 z-0 transition-all duration-300 hidden sm:block"
          style={{ width: `${(activeIndex / (BAUPHASEN.length - 1)) * 100}%` }}
        />

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 relative z-10">
          {BAUPHASEN.map((phase, idx) => {
            const isCompleted = idx < activeIndex
            const isCurrent = idx === activeIndex
            const isFuture = idx > activeIndex

            return (
              <button
                key={phase.id}
                type="button"
                disabled={readOnly}
                onClick={() => onPhaseChange && onPhaseChange(phase.id)}
                className={`flex flex-col sm:items-center text-left sm:text-center p-2 rounded-xl transition-all cursor-pointer group ${
                  readOnly ? 'cursor-default' : 'hover:bg-zinc-50'
                }`}
                title={readOnly ? phase.label : `Zu Phase "${phase.label}" wechseln`}
              >
                {/* Step Circle */}
                <div className="flex items-center gap-2 sm:gap-0 sm:flex-col sm:items-center">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                      isCompleted
                        ? 'bg-[#b88a38] text-white shadow-xs'
                        : isCurrent
                          ? 'bg-zinc-900 text-white ring-4 ring-[#b88a38]/25 shadow-xs'
                          : 'bg-zinc-100 text-zinc-500 border border-zinc-200/80 group-hover:border-zinc-300'
                    }`}
                  >
                    {isCompleted ? (
                      <IconCheck className="w-4 h-4 text-white stroke-[2.5]" />
                    ) : (
                      <span>{phase.step}</span>
                    )}
                  </div>

                  {/* Step Label */}
                  <div className="mt-0 sm:mt-2 min-w-0">
                    <p
                      className={`text-xs truncate font-medium transition-colors ${
                        isCurrent
                          ? 'text-text-primary font-bold'
                          : isCompleted
                            ? 'text-text-secondary font-medium'
                            : 'text-text-muted'
                      }`}
                    >
                      {phase.label}
                    </p>
                    <span className="text-[10px] text-text-muted block sm:hidden">
                      {isCompleted ? 'Abgeschlossen' : isCurrent ? 'Aktuelle Phase' : 'Ausstehend'}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
