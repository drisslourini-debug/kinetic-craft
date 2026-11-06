import React, { useState } from 'react'
import { BAUPHASEN, resolveProjektPhase } from './ProjektBauphasenStepper'
import { formatDate } from '../../lib/formatters'
import { IconLocation, IconUser, IconCalendar, IconBauunternehmung } from '../icons/BrandIcons'

export default function ProjektKanbanBoard({
  projekte = [],
  onSelectProjekt,
  onUpdateProjektPhase
}) {
  const [draggedProjektId, setDraggedProjektId] = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)

  // Group projects by phase
  const columns = BAUPHASEN.map(phase => {
    const items = projekte.filter(p => {
      const pPhase = resolveProjektPhase(p)
      return pPhase === phase.id
    })
    return {
      ...phase,
      items
    }
  })

  const handleDragStart = (e, projektId) => {
    e.dataTransfer.setData('text/plain', String(projektId))
    setDraggedProjektId(projektId)
  }

  const handleDragOver = (e, colId) => {
    e.preventDefault()
    if (dragOverCol !== colId) {
      setDragOverCol(colId)
    }
  }

  const handleDrop = (e, colId) => {
    e.preventDefault()
    setDragOverCol(null)
    const projektId = e.dataTransfer.getData('text/plain') || draggedProjektId
    setDraggedProjektId(null)
    if (projektId && onUpdateProjektPhase) {
      onUpdateProjektPhase(projektId, colId)
    }
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-[1100px] items-start">
        {columns.map(col => {
          const isOver = dragOverCol === col.id

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex-1 min-w-[220px] rounded-2xl border transition-all flex flex-col max-h-[calc(100vh-280px)] ${
                isOver
                  ? 'border-[#b88a38] bg-[#b88a38]/5 ring-2 ring-[#b88a38]/20'
                  : 'border-border/80 bg-zinc-50/60'
              }`}
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-border/70 flex items-center justify-between bg-white/70 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#b88a38]" />
                  <h4 className="text-xs font-bold text-text-primary tracking-tight">
                    {col.label}
                  </h4>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                  {col.items.length}
                </span>
              </div>

              {/* Column Card Body */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1">
                {col.items.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-zinc-200 rounded-xl">
                    <p className="text-[11px] text-text-muted">Keine Baustellen in dieser Phase</p>
                  </div>
                ) : (
                  col.items.map(p => (
                    <div
                      key={p.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, p.id)}
                      onClick={() => onSelectProjekt && onSelectProjekt(p)}
                      className="bg-white border border-border/80 rounded-xl p-3 shadow-2xs hover:shadow-sm hover:border-[#b88a38]/60 transition-all cursor-grab active:cursor-grabbing select-none group relative"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-mono font-medium text-text-muted bg-zinc-100 px-1.5 py-0.2 rounded">
                          #{p.projekt_nr || 'PROJ'}
                        </span>
                        {p.startdatum && (
                          <span className="text-[10px] text-text-muted flex items-center gap-1">
                            <IconCalendar className="w-3 h-3 text-text-muted" />
                            <span>{formatDate(p.startdatum)}</span>
                          </span>
                        )}
                      </div>

                      <h5 className="text-xs font-bold text-text-primary group-hover:text-[#b88a38] transition-colors line-clamp-2">
                        {p.name}
                      </h5>

                      {p.adresse && (
                        <p className="text-[11px] text-text-secondary flex items-center gap-1 mt-1 truncate">
                          <IconLocation className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span className="truncate">{p.adresse}</span>
                        </p>
                      )}

                      <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-text-muted">
                        <span className="flex items-center gap-1 truncate font-medium">
                          <IconUser className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span className="truncate">{p.kunden?.name || 'Direktkunde'}</span>
                        </span>
                        
                        <span className="text-[10px] font-semibold text-text-secondary">
                          {p.status || 'Aktiv'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
