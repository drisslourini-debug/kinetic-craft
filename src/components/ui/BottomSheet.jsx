import { useEffect } from 'react';
import { useModalHistory } from '../../hooks/useModalHistory';

export default function BottomSheet({ isOpen, onClose, title, subtitle, children, footer }) {
  useModalHistory(isOpen, onClose, 'bottom_sheet');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Container */}
      <div 
        className="relative w-full bg-surface-card rounded-t-[28px] border-t border-border shadow-2xl flex flex-col max-h-[92dvh] animate-slide-up overflow-hidden pb-[env(safe-area-inset-bottom)]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header with Title and Round Close Button (No drag handle) */}
        <div className="px-5 py-3.5 border-b border-border/80 flex items-center justify-between shrink-0 bg-surface/50">
          <div className="min-w-0 pr-2">
            {title ? (
              <h3 className="text-base font-bold text-text-primary tracking-tight truncate">{title}</h3>
            ) : (
              <div />
            )}
            {subtitle && <p className="text-xs text-text-secondary mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 text-text-secondary hover:text-text-primary transition-all cursor-pointer shrink-0"
            aria-label="Schliessen"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
          {children}
        </div>

        {/* Sticky Footer Action Bar (falls vorhanden) */}
        {footer && (
          <div className="p-4 border-t border-border bg-surface/90 backdrop-blur-md shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
