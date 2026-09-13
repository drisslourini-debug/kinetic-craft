import { useState } from 'react';
import { formatDate, formatCurrency } from '../../lib/formatters';
import { getTerminTypConfig, getTerminStatusConfig, TERMIN_STATUSSE } from '../../lib/kalenderConstants';
import { getGoogleCalendarUrl, downloadIcsFile, generateIcsCalendar } from '../../lib/icalGenerator';

export default function TerminDetailModal({
  isOpen,
  onClose,
  termin,
  onEdit,
  onDelete,
  onStatusChange,
  onNavigate
}) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen || !termin) return null;

  const isProjectEvent = Boolean(termin.isSyntheticProject);
  const isInvoiceEvent = Boolean(termin.isSyntheticInvoice);
  const isQuoteEvent = Boolean(termin.isSyntheticQuote);

  let headerColor = '#3b82f6';
  let headerIcon = '📅';
  let headerLabel = 'Termin';
  let headerTitle = termin.titel;

  if (isProjectEvent) {
    headerColor = '#4f46e5';
    headerIcon = '🏗️';
    headerLabel = 'Projekt-Laufzeit';
    headerTitle = termin.projekte?.name || termin.titel.replace(/^🏗️\s*/, '');
  } else if (isInvoiceEvent) {
    headerColor = '#e11d48';
    headerIcon = '💰';
    headerLabel = 'Rechnungs-Fälligkeit';
    headerTitle = termin.rechnung_nr ? `Rechnung ${termin.rechnung_nr}` : termin.titel;
  } else if (isQuoteEvent) {
    headerColor = '#0284c7';
    headerIcon = '📄';
    headerLabel = 'Offerten-Frist';
    headerTitle = termin.titel.replace(/^📄\s*/, '');
  } else {
    const typConfig = getTerminTypConfig(termin.typ);
    headerColor = typConfig.color || '#3b82f6';
    headerIcon = typConfig.icon || '📅';
    headerLabel = typConfig.label;
  }

  const statusConfig = getTerminStatusConfig(termin.status);

  const handleStatusClick = async (newStatus) => {
    if (!onStatusChange || isUpdatingStatus || isProjectEvent || isInvoiceEvent || isQuoteEvent) return;
    try {
      setIsUpdatingStatus(true);
      await onStatusChange(termin.id, newStatus);
    } catch (err) {
      console.error('Status update error:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleExportIcs = () => {
    const ics = generateIcsCalendar([termin]);
    downloadIcsFile(`termin-${termin.datum}-${(termin.titel || 'termin').replace(/\s+/g, '_')}`, ics);
  };

  const googleUrl = getGoogleCalendarUrl(termin);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-surface-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Type Accent Color */}
        <div 
          className="p-6 border-b border-border text-white relative transition-colors"
          style={{ backgroundColor: headerColor }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner">
                {headerIcon}
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-white/80 bg-black/20 px-2.5 py-0.5 rounded-full">
                  {headerLabel}
                </span>
                <h2 className="text-xl font-bold mt-1 text-white leading-snug drop-shadow-sm">
                  {headerTitle}
                </h2>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Status Badge & Quick Status Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50/80 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Status:</span>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${statusConfig.badgeClass}`}>
                {termin.status || 'Geplant'}
              </span>
            </div>

            {!isProjectEvent && !isInvoiceEvent && !isQuoteEvent && onStatusChange && (
              <div className="flex items-center gap-1">
                {TERMIN_STATUSSE.filter(s => s.id !== termin.status).slice(0, 3).map(s => (
                  <button
                    key={s.id}
                    disabled={isUpdatingStatus}
                    onClick={() => handleStatusClick(s.id)}
                    className="px-2 py-1 text-[11px] font-semibold bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-text-secondary hover:text-text-primary transition-colors cursor-pointer disabled:opacity-50"
                  >
                    → {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date & Time Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-surface border border-border rounded-xl">
              <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                {isInvoiceEvent ? 'Fällig am' : isQuoteEvent ? 'Gültig bis' : isProjectEvent ? 'Laufzeit' : '📅 Datum'}
              </span>
              <p className="text-sm font-bold text-text-primary">
                {formatDate(termin.datum)}
                {termin.end_datum && termin.end_datum !== termin.datum && (
                  <span className="text-text-secondary font-normal"> bis {formatDate(termin.end_datum)}</span>
                )}
              </p>
            </div>

            <div className="p-3 bg-surface border border-border rounded-xl">
              <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                {termin.total !== undefined ? 'Betrag / Total' : '⏰ Uhrzeit'}
              </span>
              <p className="text-sm font-bold text-text-primary">
                {termin.total !== undefined ? (
                  formatCurrency(termin.total)
                ) : termin.ganztaegig ? (
                  <span className="text-primary-700 bg-primary-50 px-2 py-0.5 rounded text-xs font-semibold">Ganztägig</span>
                ) : (
                  `${termin.startzeit || '08:00'} – ${termin.endzeit || '12:00'} Uhr`
                )}
              </p>
            </div>
          </div>

          {/* Special Preview: Invoice Event */}
          {isInvoiceEvent && (
            <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-rose-900 block">Zahlungsziel</span>
                  <p className="text-xs text-rose-700">
                    Fällig am {formatDate(termin.datum)} ({termin.kunden?.name ? `Kunde: ${termin.kunden.name}` : ''})
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-rose-600 block">Betrag</span>
                  <span className="text-base font-bold text-rose-900 font-mono">{formatCurrency(termin.total)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-rose-100">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigate && onNavigate('rechnungen', { rechnungId: termin.originalId });
                  }}
                  className="flex-1 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
                >
                  🧾 Rechnung öffnen →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit && onEdit({
                      datum: termin.datum,
                      titel: `Zahlungserinnerung ${termin.rechnung_nr || ''}`,
                      typ: 'Intern',
                      kunden_id: termin.kunden?.id
                    });
                  }}
                  className="px-3 py-2 bg-white hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  + Notiz/Termin planen
                </button>
              </div>
            </div>
          )}

          {/* Special Preview: Quote Event */}
          {isQuoteEvent && (
            <div className="p-4 bg-sky-50/60 border border-sky-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-sky-900 block">Angebotsfrist</span>
                  <p className="text-xs text-sky-700">
                    Gültig bis {formatDate(termin.datum)} ({termin.kunden?.name ? `Kunde: ${termin.kunden.name}` : ''})
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-sky-600 block">Offert-Total</span>
                  <span className="text-base font-bold text-sky-900 font-mono">{formatCurrency(termin.total)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-sky-100">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigate && onNavigate('offerten', { offerteId: termin.originalId });
                  }}
                  className="flex-1 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
                >
                  📄 Offerte öffnen →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit && onEdit({
                      datum: termin.datum,
                      titel: `Nachfassen Offerte #${termin.originalId}`,
                      typ: 'Kundentermin',
                      kunden_id: termin.kunden?.id
                    });
                  }}
                  className="px-3 py-2 bg-white hover:bg-sky-100 border border-sky-200 text-sky-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  + Nachfassen planen
                </button>
              </div>
            </div>
          )}

          {/* Special Preview: Project Event */}
          {isProjectEvent && (
            <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-3">
              <div>
                <span className="text-xs font-bold text-indigo-900 block">Projektlaufzeit</span>
                <p className="text-xs text-indigo-700">
                  {formatDate(termin.datum)} bis {formatDate(termin.end_datum)}
                  {termin.ort && <span className="ml-1">📍 {termin.ort}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-indigo-100">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigate && onNavigate('projekte', { projektId: termin.originalId, activeTab: 'termine' });
                  }}
                  className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
                >
                  🏗️ Zum Projekt springen →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit && onEdit({
                      datum: termin.datum,
                      titel: `Montage ${termin.projekte?.name || ''}`,
                      typ: 'Montage',
                      projekt_id: termin.originalId,
                      kunden_id: termin.projekte?.kunden_id,
                      ort: termin.ort || ''
                    });
                  }}
                  className="px-3 py-2 bg-white hover:bg-indigo-100 border border-indigo-200 text-indigo-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  + Termin erfassen
                </button>
              </div>
            </div>
          )}

          {/* Project Connection for normal appointments */}
          {!isProjectEvent && (termin.projekte || termin.projekt_id) && (
            <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block">
                  🏗️ Projekt
                </span>
                <p className="text-sm font-bold text-indigo-950 mt-0.5">
                  {termin.projekte?.name || termin.projektName || 'Zugeordnetes Projekt'}
                </p>
                {termin.projekte?.adresse && (
                  <p className="text-xs text-indigo-600 mt-0.5">📍 {termin.projekte.adresse}</p>
                )}
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigate('projekte', { 
                      projektId: termin.projekt_id || termin.projekte?.id,
                      activeTab: 'termine'
                    });
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Zum Projekt →
                </button>
              )}
            </div>
          )}

          {/* Customer Connection */}
          {(termin.kunden || termin.kunden_id) && (
            <div className="p-3 bg-surface border border-border rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block">
                  👥 Kunde / Ansprechpartner
                </span>
                <p className="text-sm font-semibold text-text-primary mt-0.5">
                  {termin.kunden?.name || termin.kundeName || 'Kunde'}
                </p>
              </div>
              {onNavigate && (termin.kunden_id || termin.kunden?.id) && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigate('kunden', { kundeId: termin.kunden_id || termin.kunden?.id });
                  }}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-800 transition-colors cursor-pointer"
                >
                  Kunde öffnen →
                </button>
              )}
            </div>
          )}

          {/* Location / Address */}
          {termin.ort && !isProjectEvent && (
            <div className="p-3 bg-surface border border-border rounded-xl">
              <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                📍 Ort / Baustellenadresse
              </span>
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-primary font-medium">{termin.ort}</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(termin.ort)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-primary-600 hover:text-primary-800 transition-colors shrink-0 ml-2"
                >
                  In Maps ↗
                </a>
              </div>
            </div>
          )}

          {/* Description / Notes */}
          {termin.beschreibung && !isInvoiceEvent && !isQuoteEvent && !isProjectEvent && (
            <div className="p-3 bg-surface border border-border rounded-xl">
              <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                📝 Notizen & Arbeitsanweisungen
              </span>
              <p className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">
                {termin.beschreibung}
              </p>
            </div>
          )}

          {/* External sync links */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              📅 In Google Kalender öffnen
            </a>
            <button
              type="button"
              onClick={handleExportIcs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              📥 .ics herunterladen
            </button>
          </div>

          {/* Delete confirmation */}
          {showDeleteConfirm && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 animate-fade-in">
              <p className="text-xs font-semibold text-rose-800">
                Termin wirklich löschen?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (onDelete) {
                      await onDelete(termin.id);
                      onClose();
                    }
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Ja, löschen
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-gray-50/50 flex items-center justify-between">
          <div>
            {!isProjectEvent && !isInvoiceEvent && !isQuoteEvent && !showDeleteConfirm && onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                🗑️ Löschen
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isProjectEvent && !isInvoiceEvent && !isQuoteEvent && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(termin);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-text-primary rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                ✏️ Bearbeiten
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              Schliessen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
