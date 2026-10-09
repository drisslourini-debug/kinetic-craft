import React, { useEffect } from 'react'
import { LEGAL_CONFIG } from '../../config/legalConfig'
import { IconDatenschutz } from '../icons/BrandIcons'

export default function DatenschutzModal({ isOpen, onClose, onOpenImpressum }) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="datenschutz-title"
    >
      <div 
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <IconDatenschutz className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <h2 id="datenschutz-title" className="text-base font-bold text-slate-900">
                Datenschutzerklärung (DSE)
              </h2>
              <p className="text-xs text-slate-500">
                Konform mit dem Schweizer Bundesgesetz über den Datenschutz (DSG, SR 235.1)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
            aria-label="Schliessen"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 max-h-[75vh] overflow-y-auto space-y-6 text-sm text-slate-700 leading-relaxed">
          {/* Einleitung & Verantwortliche Stelle */}
          <section className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm">
              1. Verantwortliche Stelle & Kontakt
            </h3>
            <p className="text-xs text-slate-600">
              Verantwortlich für die Datenbearbeitung im Sinne des Schweizer Datenschutzgesetzes (DSG) ist:
            </p>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-800 space-y-1">
              <p className="font-bold">{LEGAL_CONFIG.firmenname} ({LEGAL_CONFIG.rechtsform})</p>
              <p>{LEGAL_CONFIG.domizil.strasse}, {LEGAL_CONFIG.domizil.plz} {LEGAL_CONFIG.domizil.ort}, {LEGAL_CONFIG.domizil.land}</p>
              <p>E-Mail für Datenschutzanfragen: <a href={`mailto:${LEGAL_CONFIG.kontakt.email}`} className="text-amber-700 font-semibold hover:underline">{LEGAL_CONFIG.kontakt.email}</a></p>
            </div>
          </section>

          {/* Hosting & Architektur Transparenz */}
          <section className="space-y-2.5">
            <h3 className="font-bold text-slate-900 text-sm">
              2. Hosting & Technische Infrastruktur
            </h3>
            <p className="text-xs text-slate-600">
              Zum Schutz Ihrer Geschäfts- und Kundendaten setzt Kinetic Craft auf eine getrennte, moderne Cloud-Architektur mit strikten Sicherheitsstandards:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl space-y-1">
                <span className="font-bold text-amber-900 block">Frontend & CDN-Auslieferung</span>
                <p className="text-slate-600">
                  Auslieferung der Webanwendung über das Vercel Edge Network (Server-Standorte Frankfurt/EU). Keine Speicherung geschäftlicher Daten im Frontend-Cache.
                </p>
              </div>
              <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl space-y-1">
                <span className="font-bold text-amber-900 block">Datenbank & Authentifizierung</span>
                <p className="text-slate-600">
                  Verwaltete PostgreSQL-Instanz bei Supabase Inc. (ISO/IEC 27001 zertifiziert). Strikte Mandanten-Trennung (Row-Level Security), verschlüsselt mit TLS 1.3 (in transit) und AES-256 (at rest).
                </p>
              </div>
            </div>
          </section>

          {/* Keine Tracking-Cookies */}
          <section className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm">
              3. Cookies & Lokale Speicherung (Session-Hygiene)
            </h3>
            <p className="text-xs text-slate-600">
              Kinetic Craft verzichtet konsequent auf Marketing-, Analyse- oder Drittanbieter-Tracking-Tools (wie Google Analytics, Werbenetzwerke oder Social-Media-Pixel).
            </p>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1.5">
              <p>
                <strong>Technisch notwendige Daten:</strong> Es werden ausschliesslich zwingend erforderliche Sitzungsdaten (z. B. das Authentifizierungs-Token für den Login) im Browserspeicher (Session/Local Storage) abgelegt.
              </p>
              <p>
                <strong>Session-Hygiene:</strong> Beim Abmelden werden alle temporären Einstellungen und Sitzungsschlüssel restlos aus Ihrem lokalen Browser gelöscht.
              </p>
            </div>
          </section>

          {/* Bearbeitung von Kundendaten */}
          <section className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm">
              4. Bearbeitung von Personendaten im Auftrag (Auftragsdaten)
            </h3>
            <p className="text-xs text-slate-600">
              Sie als Handwerksbetrieb erfassen in Kinetic Craft Daten Ihrer eigenen Kunden (z. B. für Offerten, QR-Rechnungen, Baustellen-Rapporte). Im Verhältnis zu Ihren Kunden bleiben Sie der Verantwortliche; Kinetic Craft agiert als technischer Auftragsbearbeiter gemäss Art. 9 DSG.
            </p>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pl-1">
              <li>Daten werden ausschliesslich zur Bereitstellung der Software-Dienstleistung verarbeitet.</li>
              <li>Keine Weitergabe oder Monetarisierung Ihrer Kunden- und Betriebsdaten an Dritte.</li>
              <li>Exportfunktion für Treuhänder und KMU jederzeit im Excel-/CSV-/PDF-Format gewährleistet.</li>
            </ul>
          </section>

          {/* Rechte gemäss DSG */}
          <section className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm">
              5. Ihre Rechte gemäss Schweizer Datenschutzgesetz (DSG)
            </h3>
            <p className="text-xs text-slate-600">
              Ihnen stehen gemäss Art. 25–32 DSG folgende Rechte zu:
            </p>
            <ul className="grid sm:grid-cols-2 gap-2 text-xs text-slate-700">
              <li className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <strong>Auskunftsrecht (Art. 25 DSG):</strong> Transparente Einsicht in alle über Sie bearbeiteten Daten.
              </li>
              <li className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <strong>Recht auf Datenübertragbarkeit (Art. 28 DSG):</strong> Herausgabe Ihrer Daten in einem gängigen elektronischen Format.
              </li>
              <li className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <strong>Berichtigung & Löschung (Art. 32 DSG):</strong> Korrektur unrichtiger Daten oder Löschung bei Kündigung.
              </li>
              <li className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <strong>Widerspruchsrecht:</strong> Jederzeitige Beendigung der Verarbeitung unberechtigter Daten.
              </li>
            </ul>
          </section>

          {/* Aktualität */}
          <section className="border-t border-slate-100 pt-4 text-xs text-slate-500 flex justify-between items-center">
            <span>Stand der Erklärung: Oktober 2026</span>
            <span>Version: 1.2 (DSG-konform)</span>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          {onOpenImpressum ? (
            <button
              onClick={() => {
                onClose()
                onOpenImpressum()
              }}
              className="text-xs text-amber-700 hover:text-amber-800 font-semibold underline cursor-pointer"
            >
              ← Zum Impressum
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Verstanden & Schliessen
          </button>
        </div>
      </div>
    </div>
  )
}
