import { useState } from 'react'
import { formatDate } from '../../lib/formatters'

export default function OfferteHeader({
  offerte,
  status,
  isUpdating,
  isEditing,
  showLivePreview,
  onBack,
  onStatusChange,
  onStartEditing,
  onToggleLivePreview,
  onShowPrintView,
  onDuplicate,
  onConvertToRechnung,
  onArchive,
  onRestore,
  onPlanTermin
}) {
  const [showActionMenu, setShowActionMenu] = useState(false)
  const daten = offerte?.daten || {}

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-surface-card border border-transparent hover:border-border transition-all text-text-secondary hover:text-text-primary cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Offerte #{offerte.id}</h2>
            {isUpdating && <span className="text-xs text-text-secondary">Speichert...</span>}
          </div>
          <p className="text-text-secondary mt-1">Erstellt am {formatDate(offerte.created_at)}</p>
        </div>
      </div>
      
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto mt-3 sm:mt-0">
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            disabled={isUpdating}
            className={`w-full sm:w-auto px-4 py-3 sm:py-2.5 min-h-[48px] text-base sm:text-sm font-bold rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all cursor-pointer focus:ring-primary-500/30 ${
              status === 'Entwurf' ? 'border-gray-200 bg-gray-50 text-gray-700' :
              status === 'Akzeptiert' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
              status === 'Versendet' ? 'border-primary-200 bg-primary-50 text-primary-700' :
              status === 'In Überarbeitung' ? 'border-amber-200 bg-amber-50 text-amber-700' :
              status === 'Abgelehnt' ? 'border-red-200 bg-red-50 text-red-700' :
              'border-gray-200 bg-gray-50 text-gray-700'
            }`}
          >
            <option value="Entwurf">Entwurf</option>
            <option value="Versendet">Versendet</option>
            <option value="In Überarbeitung">In Überarbeitung</option>
            <option value="Akzeptiert">Akzeptiert</option>
            <option value="Abgelehnt">Abgelehnt</option>
            <option value="Verrechnet">Verrechnet</option>
          </select>
        
        {/* Main Action: PDF View or Edit */}
        {isEditing && (
          <button
            onClick={onToggleLivePreview}
            className={`flex-1 sm:flex-none inline-flex justify-center items-center gap-2 px-4 py-3 sm:py-2.5 min-h-[48px] font-bold text-base sm:text-sm rounded-xl transition-colors shadow-sm cursor-pointer border ${
              showLivePreview 
                ? 'bg-primary-50 text-primary-700 border-primary-200' 
                : 'bg-surface text-text-secondary border-border hover:bg-surface-card hover:text-text-primary'
            }`}
            title="Split-Screen Live-Vorschau (nur Desktop)"
          >
            {showLivePreview ? '👁️ Live-Vorschau an' : '👁️ Live-Vorschau aus'}
          </button>
        )}
        {/* Lock Edit Button for certain statuses */}
        {!isEditing && (
          <button
            onClick={onStartEditing}
            disabled={['Versendet', 'Akzeptiert', 'Abgelehnt', 'Verrechnet'].includes(status)}
            className={`w-full sm:w-auto inline-flex justify-center items-center gap-2 px-4 py-3 sm:py-2.5 min-h-[48px] font-bold text-base sm:text-sm rounded-xl transition-colors shadow-sm cursor-pointer ${
              ['Versendet', 'Akzeptiert', 'Abgelehnt', 'Verrechnet'].includes(status)
                ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                : 'bg-surface border border-primary-200 text-primary-700 hover:bg-primary-50'
            }`}
            title={['Versendet', 'Akzeptiert', 'Abgelehnt', 'Verrechnet'].includes(status) ? 'Im aktuellen Status gesperrt' : 'Offerte bearbeiten'}
          >
            {['Versendet', 'Akzeptiert', 'Abgelehnt', 'Verrechnet'].includes(status) ? '🔒 Gesperrt' : '✏️ Offerte bearbeiten'}
          </button>
        )}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onShowPrintView}
            className="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 px-4 py-3 sm:py-2.5 min-h-[48px] bg-primary-600 text-white font-bold text-base sm:text-sm rounded-xl hover:bg-primary-700 transition-colors shadow-md shadow-primary-600/20 active:scale-[0.98] cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span className="hidden sm:inline">PDF generieren</span>
            <span className="sm:hidden">PDF generieren</span>
          </button>

          {/* Secondary Actions Dropdown */}
          <div className="relative shrink-0">
            <button 
              onClick={() => setShowActionMenu(!showActionMenu)}
              className="w-12 h-12 sm:w-10 sm:h-10 min-h-[48px] flex items-center justify-center bg-surface border border-border text-text-secondary rounded-xl hover:text-text-primary hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
            </button>
          
          {showActionMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowActionMenu(false)}></div>
              <div className="absolute right-0 top-12 w-56 bg-surface-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-slide-in-right sm:animate-fade-in-up">
                <div className="p-1">
                  {daten.docUrl && (
                    <a 
                      href={daten.docUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => setShowActionMenu(false)}
                      className="w-full text-left px-4 py-3 sm:px-3 sm:py-2 min-h-[48px] sm:min-h-0 text-base sm:text-sm font-medium text-text-primary hover:bg-neutral-100 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span className="text-xl sm:text-lg">📄</span> Google Doc öffnen
                    </a>
                  )}
                  <button 
                    onClick={() => { setShowActionMenu(false); onDuplicate(); }}
                    disabled={isEditing}
                    className="w-full text-left px-4 py-3 sm:px-3 sm:py-2 min-h-[48px] sm:min-h-0 text-base sm:text-sm font-medium text-text-primary hover:bg-neutral-100 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-xl sm:text-lg">📋</span> Duplizieren
                  </button>

                  <button 
                    onClick={() => { setShowActionMenu(false); if (onPlanTermin) onPlanTermin('Aufmass'); }}
                    disabled={isEditing}
                    className="w-full text-left px-4 py-3 sm:px-3 sm:py-2 min-h-[48px] sm:min-h-0 text-base sm:text-sm font-medium text-text-primary hover:bg-neutral-100 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-xl sm:text-lg">📐</span> Aufmass / Besichtigung planen
                  </button>

                  <button 
                    onClick={() => { setShowActionMenu(false); if (onPlanTermin) onPlanTermin('Kundentermin'); }}
                    disabled={isEditing}
                    className="w-full text-left px-4 py-3 sm:px-3 sm:py-2 min-h-[48px] sm:min-h-0 text-base sm:text-sm font-medium text-text-primary hover:bg-neutral-100 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-xl sm:text-lg">👥</span> Kundentermin im Kalender
                  </button>

                  {status === 'Akzeptiert' && (
                    <button
                      onClick={() => { setShowActionMenu(false); onConvertToRechnung(); }}
                      disabled={isEditing}
                      className="w-full text-left px-4 py-3 sm:px-3 sm:py-2 min-h-[48px] sm:min-h-0 text-base sm:text-sm font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span className="text-xl sm:text-lg">🧾</span> In Rechnung umwandeln
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setShowActionMenu(false);
                      if (offerte.is_archived) {
                        onRestore()
                      } else {
                        onArchive()
                      }
                    }}
                    disabled={isEditing}
                    className="w-full text-left px-4 py-3 sm:px-3 sm:py-2 min-h-[48px] sm:min-h-0 text-base sm:text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 mt-1 border-t border-border pt-3 sm:pt-2 cursor-pointer"
                  >
                    <span className="text-xl sm:text-lg">{offerte.is_archived ? '♻️' : '🗑️'}</span> 
                    {offerte.is_archived ? 'Wiederherstellen' : 'Archivieren'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
