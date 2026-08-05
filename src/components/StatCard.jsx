import React from 'react';

const COLOR_MAP = {
  emerald: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
    watermark: 'text-emerald-100',
  },
  red: {
    bg: 'bg-red-100',
    text: 'text-red-600',
    iconBg: 'bg-red-100',
    iconText: 'text-red-600',
    watermark: 'text-red-100',
  },
  amber: {
    bg: 'bg-amber-100',
    text: 'text-amber-600',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-600',
    watermark: 'text-amber-100',
  },
  blue: {
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
    watermark: 'text-blue-100',
  },
  primary: {
    bg: 'bg-primary-100',
    text: 'text-primary-600',
    iconBg: 'bg-primary-100',
    iconText: 'text-primary-600',
    watermark: 'text-primary-100',
  },
  stone: {
    bg: 'bg-stone-100',
    text: 'text-stone-600',
    iconBg: 'bg-stone-100',
    iconText: 'text-stone-600',
    watermark: 'text-stone-100',
  },
  gray: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    iconBg: 'bg-gray-100',
    iconText: 'text-gray-600',
    watermark: 'text-gray-100',
  }
};

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
  const colors = COLOR_MAP[color] || COLOR_MAP.primary;

  const activeClasses = isActive 
    ? `border-${color}-400 ring-4 ring-${color}-400/20 shadow-md` 
    : `border-border hover:border-${color}-300 hover:shadow-md`;

  return (
    <div 
      className={`bg-surface-card rounded-2xl border-2 p-5 relative overflow-hidden group transition-all ${activeClasses} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {/* Watermark Icon */}
      <svg 
        className={`absolute -right-4 -bottom-4 w-24 h-24 ${colors.watermark} opacity-60 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
        dangerouslySetInnerHTML={{ __html: icon }}
      />
      
      <div className="relative z-10">
        {/* Title Row */}
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-8 h-8 rounded-lg ${colors.iconBg} flex items-center justify-center shrink-0`}>
            <svg 
              className={`w-4 h-4 ${colors.iconText}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              dangerouslySetInnerHTML={{ __html: icon }}
            />
          </div>
          <h3 className="text-text-secondary text-sm font-semibold uppercase tracking-wider truncate">
            {title}
          </h3>
          {isActive && (
            <span className={`ml-2 text-[10px] ${colors.iconBg} ${colors.iconText} px-1.5 py-0.5 rounded uppercase font-bold`}>
              Aktiv
            </span>
          )}
        </div>
        
        {/* Main Value */}
        <p className={`text-3xl font-bold ${colors.text}`}>
          {value}
        </p>
        
        {/* Secondary Value (e.g. Count/Amount mix) */}
        {secondaryValue && (
          <div className={`text-sm font-bold mt-1 ${colors.text}`}>
            {secondaryValue}
          </div>
        )}
        
        {/* Subtitle */}
        {subtitle && (
          <div className="text-xs text-text-secondary mt-1">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
