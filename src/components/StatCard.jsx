import React from 'react';

const ACCENT_STYLES = {
  emerald: {
    badgeBg: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    iconText: 'text-emerald-600',
    valueText: 'text-text-primary',
    accentRing: 'ring-emerald-500/20 border-emerald-500/40',
  },
  red: {
    badgeBg: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
    iconText: 'text-rose-600',
    valueText: 'text-rose-700',
    accentRing: 'ring-rose-500/20 border-rose-500/40',
  },
  amber: {
    badgeBg: 'bg-amber-500/10 text-amber-800 border-amber-500/20',
    iconText: 'text-amber-600',
    valueText: 'text-text-primary',
    accentRing: 'ring-amber-500/20 border-amber-500/40',
  },
  blue: {
    badgeBg: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
    iconText: 'text-sky-600',
    valueText: 'text-text-primary',
    accentRing: 'ring-sky-500/20 border-sky-500/40',
  },
  primary: {
    badgeBg: 'bg-primary-500/10 text-primary-700 border-primary-500/20',
    iconText: 'text-primary-600',
    valueText: 'text-text-primary',
    accentRing: 'ring-primary-500/20 border-primary-500/40',
  },
  stone: {
    badgeBg: 'bg-stone-500/10 text-stone-700 border-stone-500/20',
    iconText: 'text-stone-600',
    valueText: 'text-text-primary',
    accentRing: 'ring-stone-500/20 border-stone-500/40',
  },
  gray: {
    badgeBg: 'bg-zinc-500/10 text-zinc-700 border-zinc-500/20',
    iconText: 'text-zinc-600',
    valueText: 'text-text-primary',
    accentRing: 'ring-zinc-500/20 border-zinc-500/40',
  }
};

/**
 * 2026 Bento StatCard
 * Sleek, high-precision KPI card without bulky 2018 watermark icons.
 * Features hairline borders, tabular numerals, and refined micro-typography.
 */
export default function StatCard({ 
  title, 
  value, 
  secondaryValue, 
  subtitle, 
  icon, 
  color = 'primary', 
  onClick,
  isActive = false
}) {
  const style = ACCENT_STYLES[color] || ACCENT_STYLES.primary;

  const isChf = typeof value === 'string' && value.startsWith('CHF ');
  const displayAmount = isChf ? value.replace(/^CHF\s*/, '') : value;

  return (
    <div 
      className={`
        relative bg-surface-card rounded-2xl border p-5 transition-all duration-200
        ${isActive 
          ? `border-primary-500 ring-2 ${style.accentRing} shadow-sm` 
          : 'border-border hover:border-zinc-300 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-xs'
        }
        ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex flex-col h-full justify-between">
        {/* Title & Icon Header */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {icon && (
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${style.badgeBg}`}>
                <svg 
                  className={`w-3.5 h-3.5 ${style.iconText}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  dangerouslySetInnerHTML={{ __html: icon }}
                />
              </div>
            )}
            <h3 className="text-text-secondary text-xs font-semibold uppercase tracking-wider truncate">
              {title}
            </h3>
          </div>

          {isActive && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${style.badgeBg}`}>
              Aktiv
            </span>
          )}
        </div>
        
        {/* Main Value with Tabular-Nums */}
        <div className="mt-1">
          <div className={`text-2xl lg:text-3xl font-bold tracking-tight ${style.valueText} flex items-baseline gap-1.5`}>
            {isChf && (
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                CHF
              </span>
            )}
            <span className="tabular-nums">
              {displayAmount}
            </span>
          </div>
          
          {/* Secondary Value (e.g. Count / Subtotal) */}
          {secondaryValue && (
            <div className="text-xs font-semibold mt-1 text-text-secondary tabular-nums">
              {secondaryValue}
            </div>
          )}
          
          {/* Subtitle */}
          {subtitle && (
            <div className="text-xs text-text-muted mt-1.5 font-medium leading-relaxed">
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
