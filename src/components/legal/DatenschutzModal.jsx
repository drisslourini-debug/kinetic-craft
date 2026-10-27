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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="datenschutz-title"
    >
      <div
        className="relative w-full max-w-3xl apple-glass-stage rounded-[28px] overflow-hidden border border-white/15 my-8 text-[#F5F5F7]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-2.5">
            <IconDatenschutz className="w-6 h-6 text-[#D6BA94] shrink-0" />
            <div>
              <h2 id="datenschutz-title" className="text-base font-semibold text-white tracking-[-0.02em]">
                Datenschutzerklärung (DSE)
              </h2>
              <p className="text-xs text-[#A1A1A6]">
                Konform mit dem Schweizer Bundesgesetz über den Datenschutz (DSG, SR 235.1)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#A1A1A6] hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            aria-label="Schliessen"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 max-h-[75vh] overflow-y-auto space-y-6 text-sm text-[#F5F5F7]/90 leading-relaxed">
          {/* Einleitung & Verantwortliche Stelle */}
          <section className="space-y-2">
            <h3 className="font-semibold text-white text-sm">
              1. Verantwortliche Stelle & Kontakt
            </h3>
            <p className="text-xs text-[#A1A1A6]">
              Verantwortlich für die Datenbearbeitung im Sinne des Schweizer Datenschutzgesetzes (DSG) ist:
            </p>
            <div className="bg-white/[0.04] p-4 rounded-2xl border border-white/10 text-xs text-[#F5F5F7] space-y-1">
              <p className="font-semibold text-white">{LEGAL_CONFIG.firmenname} ({LEGAL_CONFIG.rechtsform})</p>
              <p>{LEGAL_CONFIG.domizil.strasse}, {LEGAL_CONFIG.domizil.plz} {LEGAL_CONFIG.domizil.ort}, {LEGAL_CONFIG.domizil.land}</p>
              <p>
                E-Mail für Datenschutzanfragen:{' '}
                <a href={`mailto:${LEGAL_CONFIG.kontakt.email}`} className="text-[#D6BA94] font-semibold hover:underline">
                  {LEGAL_CONFIG.kontakt.email}
                </a>
              </p>
            </div>
          </section>

          {/* Hosting & Architektur Transparenz */}
          <section className="space-y-2.5">
            <h3 className="font-semibold text-white text-sm">
              2. Hosting & Technische Infrastruktur
            </h3>
            <p className="text-xs text-[#A1A1A6]">
              Zum Schutz Ihrer Geschäfts- und Kundendaten setzt Kinetic Craft auf eine getrennte, moderne Cloud-Architektur mit strikten Sicherheitsstandards:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-[#D6BA94]/10 border border-[#D6BA94]/25 rounded-2xl space-y-1">
                <span className="font-semibold text-[#E8D3B5] block">Frontend & CDN-Auslieferung</span>
                <p className="text-[#A1A1A6]">
                  Auslieferung der Webanwendung über das Vercel Edge Network (Server-Standorte Frankfurt/EU). Keine Speicherung geschäftlicher Daten im Frontend-Cache.
                </p>
              </div>
              <div className="p-3.5 bg-[#D6BA94]/10 border border-[#D6BA94]/25 rounded-2xl space-y-1">
                <span className="font-semibold text-[#E8D3B5] block">Datenbank & Authentifizierung</span>
                <p className="text-[#A1A1A6]">
                  Verwaltete PostgreSQL-Instanz bei Supabase Inc. (ISO/IEC 27001 zertifiziert). Strikte Mandanten-Trennung (Row-Level Security), verschlüsselt mit TLS 1.3 (in transit) und AES-256 (at rest).
                </p>
              </div>
            </div>
          </section>

          {/* Keine Tracking-Cookies */}
          <section className="space-y-2">
            <h3 className="font-semibold text-white text-sm">
              3. Cookies & Lokale Speicherung (Session-Hygiene)
            </h3>
            <p className="text-xs text-[#A1A1A6]">
              Kinetic Craft verzichtet konsequent auf Marketing-, Analyse- oder Drittanbieter-Tracking-Tools (wie Google Analytics, Werbenetzwerke oder Social-Media-Pixel).
            </p>
            <div className="bg-white/[0.04] p-3.5 rounded-2xl border border-white/10 text-xs text-[#A1A1A6] space-y-1.5">
              <p>
                <strong className="text-white">Technisch notwendige Daten:</strong> Es werden ausschliesslich zwingend erforderliche Sitzungsdaten (z. B. das Authentifizierungs-Token für den Login) im Browserspeicher (Session/Local Storage) abgelegt.
              </p>
              <p>
                <strong className="text-white">Session-Hygiene:</strong> Beim Abmelden werden alle temporären Einstellungen und Sitzungsschlüssel restlos aus Ihrem lokalen Browser gelöscht.
              </p>
            </div>
          </section>

          {/* Bearbeitung von Kundendaten */}
          <section className="space-y-2">
            <h3 className="font-semibold text-white text-sm">
              4. Bearbeitung von Personendaten im Auftrag (Auftragsdaten)
            </h3>
            <p className="text-xs text-[#A1A1A6]">
              Sie als Handwerksbetrieb erfassen in Kinetic Craft Daten Ihrer eigenen Kunden (z. B. für Offerten, QR-Rechnungen, Baustellen-Rapporte). Im Verhältnis zu Ihren Kunden bleiben Sie der Verantwortliche; Kinetic Craft agiert als technischer Auftragsbearbeiter gemäss Art. 9 DSG.
            </p>
            <ul className="list-disc list-inside text-xs text-[#A1A1A6] space-y-1 pl-1">
              <li>Daten werden ausschliesslich zur Bereitstellung der Software-Dienstleistung verarbeitet.</li>
              <li>Keine Weitergabe oder Monetarisierung Ihrer Kunden- und Betriebsdaten an Dritte.</li>
              <li>Exportfunktion für Treuhänder und KMU jederzeit im Excel-/CSV-/PDF-Format gewährleistet.</li>
            </ul>
          </section>

          {/* Rechte gemäss DSG */}
          <section className="space-y-2">
            <h3 className="font-semibold text-white text-sm">
              5. Ihre Rechte gemäss Schweizer Datenschutzgesetz (DSG)
            </h3>
            <p className="text-xs text-[#A1A1A6]">
              Ihnen stehen gemäss Art. 25–32 DSG folgende Rechte zu:
            </p>
            <ul className="grid sm:grid-cols-2 gap-2.5 text-xs text-[#F5F5F7]/90">
              <li className="bg-white/[0.04] p-3 rounded-xl border border-white/10">
                <strong className="text-[#E8D3B5]">Auskunftsrecht (Art. 25 DSG):</strong> Transparente Einsicht in alle über Sie bearbeiteten Daten.
              </li>
              <li className="bg-white/[0.04] p-3 rounded-xl border border-white/10">
                <strong className="text-[#E8D3B5]">Recht auf Datenübertragbarkeit (Art. 28 DSG):</strong> Herausgabe Ihrer Daten in einem gängigen elektronischen Format.
              </li>
              <li className="bg-white/[0.04] p-3 rounded-xl border border-white/10">
                <strong className="text-[#E8D3B5]">Berichtigung & Löschung (Art. 32 DSG):</strong> Korrektur unrichtiger Daten oder Löschung bei Kündigung.
              </li>
              <li className="bg-white/[0.04] p-3 rounded-xl border border-white/10">
                <strong className="text-[#E8D3B5]">Widerspruchsrecht:</strong> Jederzeitige Beendigung der Verarbeitung unberechtigter Daten.
              </li>
            </ul>
          </section>

          {/* Aktualität */}
          <section className="border-t border-white/10 pt-4 text-xs text-[#A1A1A6] flex justify-between items-center">
            <span>Stand der Erklärung: Oktober 2026</span>
            <span>Version: 1.2 (DSG-konform)</span>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-black/40 border-t border-white/10">
          {onOpenImpressum ? (
            <button
              onClick={() => {
                onClose()
                onOpenImpressum()
              }}
              className="text-xs text-[#D6BA94] hover:text-white font-semibold underline cursor-pointer"
            >
              ← Zum Impressum
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 text-xs sm:text-sm font-semibold apple-starlight-btn rounded-full transition-colors cursor-pointer"
          >
            Verstanden & Schliessen
          </button>
        </div>
      </div>
    </div>
  )
}
