import { useState } from 'react';
import { generateIcsCalendar, downloadIcsFile } from '../../lib/icalGenerator';

export default function KalenderSyncModal({
  isOpen,
  onClose,
  termine = [],
  firmenname = 'Atelier 77',
  tenantId = null
}) {
  const [copied, setCopied] = useState(false);
  const [copiedWebcal, setCopiedWebcal] = useState(false);

  if (!isOpen) return null;

  const handleExportAll = () => {
    const icsContent = generateIcsCalendar(termine, {
      calendarTitle: `${firmenname} Termine`,
      firmenname
    });
    const filename = `${firmenname.toLowerCase().replace(/\s+/g, '-')}-termine-${new Date().toISOString().split('T')[0]}`;
    downloadIcsFile(filename, icsContent);
  };

  const feedUrl = `${window.location.origin}/api/calendar.ics${tenantId ? `?tenant=${tenantId}` : ''}`;
  const webcalUrl = feedUrl.replace(/^https?:\/\//i, 'webcal://');

  const handleCopyLink = () => {
    navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyWebcal = () => {
    navigator.clipboard.writeText(webcalUrl);
    setCopiedWebcal(true);
    setTimeout(() => setCopiedWebcal(false), 2500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-surface-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-primary-600 to-primary-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">
              🔄
            </div>
            <div>
              <h2 className="text-lg font-bold">Kalender-Synchronisation</h2>
              <p className="text-xs text-white/80">Mit Outlook, Apple Kalender (iPhone) & Google Kalender verbinden</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Quick Export .ics */}
          <div className="p-4 rounded-xl bg-primary-50/50 border border-primary-100 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-primary-950 mb-1">
                📥 Direkter .ics-Export
              </h3>
              <p className="text-xs text-primary-800 leading-relaxed">
                Lädt alle {termine.length} aktuellen Termine als Standard-Kalenderdatei herunter. Doppelklick importiert die Termine sofort in Outlook oder Apple Kalender.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportAll}
              className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-md shadow-primary-600/20 transition-all cursor-pointer shrink-0"
            >
              .ics herunterladen
            </button>
          </div>

          {/* WebCal / Live Subscription */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                📡 Live-Kalender-Abonnement (WebCal / iCal Feed)
              </h3>
              <a
                href={webcalUrl}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                title="Öffnet die Standard-Kalender-App zur automatischen Synchronisation"
              >
                <span>⚡</span> 1-Klick Abonnieren
              </a>
            </div>
            <p className="text-xs text-text-secondary">
              Abonniere diesen Link in deiner bevorzugten Kalender-App (Apple Kalender, Outlook, Google Kalender):
            </p>
            <div className="flex items-center gap-2">
              <input 
                type="text"
                readOnly
                value={feedUrl}
                className="flex-1 px-3 py-2 bg-gray-50 border border-border rounded-xl text-xs text-text-primary font-mono select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-text-primary rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0"
              >
                {copied ? '✓ Kopiert' : 'HTTPS kopieren'}
              </button>
              <button
                type="button"
                onClick={handleCopyWebcal}
                className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0"
              >
                {copiedWebcal ? '✓ Kopiert' : 'webcal://'}
              </button>
            </div>
          </div>

          {/* Instructions Tabs / Accordion */}
          <div className="space-y-3 pt-2 border-t border-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Anleitung nach Kalender-App:
            </h4>

            {/* iPhone / Apple Calendar */}
            <div className="p-3 bg-surface border border-border rounded-xl">
              <div className="flex items-center gap-2 font-semibold text-xs text-text-primary mb-1">
                <span>🍎</span> Apple Kalender (iPhone, iPad, Mac)
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                In den iPhone-Einstellungen auf <strong>Kalender → Accounts → Account hinzufügen → Andere → Kalenderabo hinzufügen</strong> gehen, den Link einfügen und bestätigen. Termine erscheinen sofort im Apple Kalender.
              </p>
            </div>

            {/* Google Calendar */}
            <div className="p-3 bg-surface border border-border rounded-xl">
              <div className="flex items-center gap-2 font-semibold text-xs text-text-primary mb-1">
                <span>🌐</span> Google Kalender
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Im Google Kalender im Browser links bei «Weitere Kalender» auf das <strong>+ Symbol</strong> klicken, <strong>«Per URL»</strong> auswählen und die Kalender-URL einfügen.
              </p>
            </div>

            {/* Outlook */}
            <div className="p-3 bg-surface border border-border rounded-xl">
              <div className="flex items-center gap-2 font-semibold text-xs text-text-primary mb-1">
                <span>📧</span> Microsoft Outlook
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                In Outlook auf <strong>Kalender hinzufügen → Aus dem Web abonnieren</strong> klicken, URL einfügen und einen Namen (z.B. «{firmenname}») vergeben.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-gray-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Schliessen
          </button>
        </div>
      </div>
    </div>
  );
}
