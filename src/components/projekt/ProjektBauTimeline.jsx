import React from 'react'
import { formatDate } from '../../lib/formatters'
import { BAUPHASEN, resolveProjektPhase } from './ProjektBauphasenStepper'
import { IconCalendar, IconLocation, IconUser } from '../icons/BrandIcons'

export default function ProjektBauTimeline({
  projekte = [],
  onSelectProjekt
}) {
  const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
  const currentMonthIdx = new Date().getMonth()

  return (
    <div className="bento-card overflow-hidden">
      <div className="p-4 border-b border-border/80 flex items-center justify-between bg-zinc-50/50">
        <div>
          <h3 className="text-sm font-bold text-text-primary tracking-tight">
            Baustellen-Terminplan & Bauphasen-Timeline
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Zeitlicher Verlauf und Meilensteine aller aktiven Objekte ({projekte.length} Projekte).
          </p>
        </div>
        <span className="text-xs font-semibold text-[#b88a38] bg-[#b88a38]/10 px-2.5 py-1 rounded-full border border-[#b88a38]/20">
          Jahr {new Date().getFullYear()}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Timeline Months Header */}
          <div className="grid grid-cols-12 border-b border-border text-[11px] font-semibold text-text-muted text-center py-2 bg-zinc-50/80">
            {months.map((m, idx) => (
              <div 
                key={m} 
                className={`py-1 border-r border-border/40 last:border-r-0 ${
                  idx === currentMonthIdx ? 'text-[#b88a38] font-bold bg-[#b88a38]/5' : ''
                }`}
              >
                {m} {idx === currentMonthIdx && '•'}
              </div>
            ))}
          </div>

          {/* Timeline Project Rows */}
          <div className="divide-y divide-border">
            {projekte.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted">
                Keine Projekte im Bauphasen-Kalender eingetragen.
              </div>
            ) : (
              projekte.map((p, idx) => {
                const phaseId = resolveProjektPhase(p)
                const currentPhase = BAUPHASEN.find(ph => ph.id === phaseId)

                // Calculate rough start/end month placement for visual bar
                let startM = 0
                let endM = 11
                if (p.startdatum) {
                  const s = new Date(p.startdatum)
                  if (!isNaN(s.getTime())) startM = Math.max(0, Math.min(11, s.getMonth()))
                } else {
                  startM = (idx % 6)
                }

                if (p.enddatum) {
                  const e = new Date(p.enddatum)
                  if (!isNaN(e.getTime())) endM = Math.max(startM, Math.min(11, e.getMonth()))
                } else {
                  endM = Math.min(11, startM + 3)
                }

                const leftPercent = (startM / 12) * 100
                const widthPercent = Math.max(8, ((endM - startM + 1) / 12) * 100)

                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectProjekt && onSelectProjekt(p)}
                    className="p-3.5 hover:bg-zinc-50 transition-colors cursor-pointer group flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-text-primary group-hover:text-[#b88a38] transition-colors truncate">
                          {p.name}
                        </span>
                        {p.kunden?.name && (
                          <span className="text-[11px] text-text-muted truncate hidden sm:inline">
                            ({p.kunden.name})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#b88a38]/10 text-[#9e7428] border border-[#b88a38]/20">
                          {currentPhase?.label || 'In Ausführung'}
                        </span>
                        <span className="text-[11px] text-text-muted font-mono">
                          {p.startdatum ? formatDate(p.startdatum) : 'Start offen'}
                          {p.enddatum ? ` – ${formatDate(p.enddatum)}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Timeline Bar Track */}
                    <div className="relative h-6 bg-zinc-100 rounded-lg overflow-hidden border border-zinc-200/60">
                      <div
                        className="absolute top-0.5 bottom-0.5 rounded-md bg-gradient-to-r from-[#b88a38] to-[#9e7428] shadow-xs flex items-center px-2 text-[10px] font-bold text-white transition-all group-hover:brightness-110"
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`
                        }}
                      >
                        <span className="truncate drop-shadow-xs">
                          {p.name}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
