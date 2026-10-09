import React from 'react'

/**
 * High-Precision 2026 Micro-Dot Status Badge
 * Replaces generic solid bonbon boxes with elegant hairline status pills + live dot indicators.
 */
export default function StatusBadge({ status, size = 'sm', className = '' }) {
  if (!status) return null

  const s = String(status).trim()

  // Configuration mapping based on status semantics
  let config = {
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-500/20',
    text: 'text-zinc-700',
    dot: 'bg-zinc-500',
    pulse: false,
    label: s
  }

  const sLower = s.toLowerCase()

  if (sLower === 'überfällig' || sLower === 'ueberfaellig') {
    config = {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/25',
      text: 'text-rose-700',
      dot: 'bg-rose-500',
      pulse: true,
      label: 'Überfällig'
    }
  } else if (sLower === 'gemahnt') {
    config = {
      bg: 'bg-rose-500/15',
      border: 'border-rose-500/35',
      text: 'text-rose-800',
      dot: 'bg-rose-600',
      pulse: true,
      label: 'Gemahnt'
    }
  } else if (sLower === 'bezahlt' || sLower === 'angenommen' || sLower === 'aktiv' || sLower === 'abgeschlossen') {
    config = {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/25',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
      pulse: false,
      label: s
    }
  } else if (sLower === 'teilbezahlt' || sLower === 'in bearbeitung' || sLower === 'in arbeit') {
    config = {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/25',
      text: 'text-amber-800',
      dot: 'bg-amber-500',
      pulse: false,
      label: s
    }
  } else if (sLower === 'versendet' || sLower === 'offen' || sLower === 'in prüfung') {
    config = {
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/25',
      text: 'text-sky-700',
      dot: 'bg-sky-500',
      pulse: false,
      label: s
    }
  } else if (sLower === 'entwurf' || sLower === 'neu') {
    config = {
      bg: 'bg-zinc-500/10',
      border: 'border-zinc-500/20',
      text: 'text-zinc-600',
      dot: 'bg-zinc-400',
      pulse: false,
      label: s
    }
  } else if (sLower === 'storniert' || sLower === 'abgelehnt' || sLower === 'archiviert') {
    config = {
      bg: 'bg-neutral-500/10',
      border: 'border-neutral-500/20',
      text: 'text-neutral-500',
      dot: 'bg-neutral-400',
      pulse: false,
      label: s
    }
  }

  const isXs = size === 'xs'
  const isLg = size === 'lg'

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium tracking-tight rounded-full border
        transition-colors select-none
        ${config.bg} ${config.border} ${config.text}
        ${isXs ? 'px-2 py-0.5 text-[10px]' : isLg ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'}
        ${className}
      `}
    >
      <span className="relative flex items-center justify-center shrink-0">
        {config.pulse && (
          <span className={`animate-ping absolute inline-flex h-2 w-2 rounded-full opacity-75 ${config.dot}`} />
        )}
        <span className={`relative inline-flex rounded-full ${isXs ? 'h-1.5 w-1.5' : 'h-1.5 w-1.5'} ${config.dot}`} />
      </span>
      <span className="truncate">{config.label}</span>
    </span>
  )
}
