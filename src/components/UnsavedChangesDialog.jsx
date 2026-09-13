export default function UnsavedChangesDialog({ isOpen, onConfirm, onCancel }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-surface-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-changes-title"
      >
        <div className="flex items-center gap-3 text-amber-600 mb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 id="unsaved-changes-title" className="text-lg font-bold text-text-primary">
            Ungespeicherte Änderungen
          </h3>
        </div>

        <p className="text-sm text-text-secondary leading-relaxed mb-6">
          Du hast ungespeicherte Eingaben. Wenn du zurückgehst oder die Ansicht verlässt, gehen deine nicht gespeicherten Änderungen verloren.
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
          >
            Weiter bearbeiten
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Änderungen verwerfen
          </button>
        </div>
      </div>
    </div>
  )
}
