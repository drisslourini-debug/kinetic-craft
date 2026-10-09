import { useState } from 'react'
import { formatDate } from '../../lib/formatters'
import {
  IconEye,
  IconEdit,
  IconWarning,
  IconDuplicate,
  IconPackage,
  IconRefresh
} from '../icons/BrandIcons'

export default function RechnungHeader({
  rechnung,
  status,
  isUpdating,
  isEditing,
  showLivePreview,
  isDirty,
  onBack,
  onStatusChange,
  onStartEditing,
  onToggleLivePreview,
  onShowPrintView,
  onDuplicate,
  onArchive,
  onRestore,
  onGenerateMahnung,
  userRole
}) {
  const [showActionMenu, setShowActionMenu] = useState(false)

  const handleBackClick = () => {
    onBack() // warning logic is handled in parent
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBackClick}
            className="p-2 rounded-xl hover:bg-surface-card border border-transparent hover:border-border transition-all text-text-secondary hover:text-text-primary cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl md:text-3xl font-bold text-text-primary truncate">
                Rechnung {rechnung.rechnung_nr || `#${rechnung.id}`}
              </h2>
              {isUpdating && <span className="text-xs text-text-secondary">Speichert...</span>}
            </div>
            <p className="text-text-secondary mt-1">Erstellt am {formatDate(rechnung.created_at)}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto mt-3 sm:mt-0">
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            disabled={isUpdating || userRole === 'treuhand'}
            className={`w-full sm:w-auto px-4 py-3 sm:py-2.5 min-h-[48px] text-base sm:text-sm font-bold rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all cursor-pointer focus:ring-primary-500/30 ${
              status === 'Bezahlt' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
              status === 'Versendet' ? 'border-primary-200 bg-primary-50 text-primary-700' :
              status === 'Überfällig' ? 'border-red-200 bg-red-50 text-red-700' :
              status === 'Storniert' ? 'border-gray-300 bg-gray-100 text-gray-800' :
              'border-gray-200 bg-gray-50 text-gray-700'
            }`}
          >
            <option value="Entwurf">Entwurf</option>
            <option value="Versendet">Versendet</option>
            <option value="Bezahlt">Bezahlt</option>
            <option value="Überfällig">Überfällig</option>
            <option value="Storniert">Storniert</option>
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
              <IconEye className="w-4 h-4" />
              <span>{showLivePreview ? 'Live-Vorschau an' : 'Live-Vorschau aus'}</span>
            </button>
          )}
          {!isEditing && userRole !== 'treuhand' && (
            <button
              onClick={onStartEditing}
              className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-4 py-3 sm:py-2.5 min-h-[48px] font-bold text-base sm:text-sm bg-surface border border-primary-200 text-primary-700 rounded-xl hover:bg-primary-50 transition-colors cursor-pointer shadow-sm"
            >
              <IconEdit className="w-4 h-4" />
              <span>Rechnung bearbeiten</span>
            </button>
          )}
          {(status === 'Überfällig' || status === 'Gemahnt') && !isEditing && userRole !== 'treuhand' && (
            <button
              onClick={onGenerateMahnung}
              className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-4 py-3 sm:py-2.5 min-h-[48px] font-bold text-base sm:text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors shadow-md shadow-red-600/20 active:scale-[0.98] cursor-pointer"
            >
              <IconWarning className="w-4 h-4" />
              <span>Mahnung generieren</span>
            </button>
          )}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onShowPrintView}
              className="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 px-4 py-3 sm:py-2.5 min-h-[48px] bg-primary-600 text-white font-bold text-base sm:text-sm rounded-xl hover:bg-primary-700 transition-colors shadow-md shadow-primary-600/20 active:scale-[0.98] cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span className="hidden sm:inline">PDF anzeigen</span>
              <span className="sm:hidden">PDF anzeigen</span>
            </button>
            
            <div className="relative shrink-0">
              <button 
                onClick={() => setShowActionMenu(!showActionMenu)}
                className="w-12 h-12 sm:w-10 sm:h-10 min-h-[48px] flex items-center justify-center bg-surface border border-border text-text-secondary rounded-xl hover:text-text-primary hover:bg-neutral-50 transition-colors cursor-pointer"
                aria-label="Aktionsmenü"
              >
                <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
              </button>
            
            {showActionMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowActionMenu(false)}></div>
                <div className="absolute right-0 top-12 w-56 bg-surface-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-slide-in-right sm:animate-fade-in-up">
                  <div className="p-1">
                    <button 
                      onClick={() => { setShowActionMenu(false); onDuplicate(); }}
                      disabled={isDirty || isEditing}
                      className="w-full text-left px-4 py-3 sm:px-3 sm:py-2 min-h-[48px] sm:min-h-0 text-base sm:text-sm font-medium text-text-primary hover:bg-neutral-100 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <IconDuplicate className="w-4 h-4 text-text-secondary shrink-0" />
                      <span>Duplizieren</span>
                    </button>
                    <button 
                      onClick={() => {
                        setShowActionMenu(false);
                        if (rechnung.is_archived) {
                          onRestore()
                        } else {
                          onArchive()
                        }
                      }}
                      disabled={isEditing}
                      className="w-full text-left px-4 py-3 sm:px-3 sm:py-2 min-h-[48px] sm:min-h-0 text-base sm:text-sm font-medium text-amber-700 hover:bg-amber-50 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2 mt-1 border-t border-border pt-3 sm:pt-2 cursor-pointer"
                    >
                      {rechnung.is_archived ? (
                        <IconRefresh className="w-4 h-4 text-amber-700 shrink-0" />
                      ) : (
                        <IconPackage className="w-4 h-4 text-amber-700 shrink-0" />
                      )}
                      <span>{rechnung.is_archived ? 'Wiederherstellen' : 'Archivieren'}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Warnung bei ungespeicherten Änderungen, falls man Quick Actions nutzen will */}
      {(isDirty || isEditing) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm flex items-start gap-3 mt-4">
          <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <strong>Ungespeicherte Änderungen:</strong> Bitte speichere die Rechnung zuerst ab, bevor du Aktionen ausführst.
          </div>
        </div>
      )}
    </>
  )
}
