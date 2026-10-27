import React, { useEffect } from 'react'
import { LEGAL_CONFIG } from '../../config/legalConfig'
import { IconSwissFlag } from '../icons/BrandIcons'

export default function ImpressumModal({ isOpen, onClose, onOpenDatenschutz }) {
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
      aria-labelledby="impressum-title"
    >
      <div
        className="relative w-full max-w-2xl apple-glass-stage rounded-[28px] overflow-hidden border border-white/15 my-8 text-[#F5F5F7]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-2.5">
            <IconSwissFlag className="w-6 h-6 rounded shadow-xs shrink-0" />
            <div>
              <h2 id="impressum-title" className="text-base font-semibold text-white tracking-[-0.02em]">
                Impressum
              </h2>
              <p className="text-xs text-[#A1A1A6]">
                Angaben gemäss Art. 3 Abs. 1 lit. s UWG (Schweizer Lauterkeitsrecht)
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
          {/* Angaben zur Betreiberin */}
          <div className="space-y-2 bg-white/[0.04] p-4 rounded-2xl border border-white/10">
            <h3 className="font-semibold text-[#E8D3B5] text-xs uppercase tracking-wider">
              Betreiberin der Webseite & Software
            </h3>
            <div className="space-y-1 text-[#F5F5F7]">
              <p className="font-semibold text-base text-white">{LEGAL_CONFIG.firmenname}</p>
              <p className="text-xs text-[#A1A1A6]">{LEGAL_CONFIG.rechtsform}</p>
              <p>{LEGAL_CONFIG.domizil.strasse}</p>
              <p>{LEGAL_CONFIG.domizil.plz} {LEGAL_CONFIG.domizil.ort}</p>
              <p>{LEGAL_CONFIG.domizil.land}</p>
            </div>
          </div>

          {/* Kontakt */}
          <div className="space-y-2">
            <h3 className="font-semibold text-[#E8D3B5] text-xs uppercase tracking-wider">
              Kontakt & Support
            </h3>
            <ul className="space-y-1.5">
              <li>
                <span className="font-medium text-[#A1A1A6] mr-2">E-Mail:</span>
                <a href={`mailto:${LEGAL_CONFIG.kontakt.email}`} className="text-[#D6BA94] hover:underline font-semibold">
                  {LEGAL_CONFIG.kontakt.email}
                </a>
              </li>
              <li>
                <span className="font-medium text-[#A1A1A6] mr-2">Telefon:</span>
                <span className="font-semibold text-white">{LEGAL_CONFIG.kontakt.telefon}</span>
              </li>
              <li>
                <span className="font-medium text-[#A1A1A6] mr-2">Webseite:</span>
                <span className="font-semibold text-white">{LEGAL_CONFIG.kontakt.web}</span>
              </li>
            </ul>
          </div>

          {/* Register & MWST */}
          <div className="space-y-2 border-t border-white/10 pt-4">
            <h3 className="font-semibold text-[#E8D3B5] text-xs uppercase tracking-wider">
              Handelsregister & Unternehmens-Identifikation (UID)
            </h3>
            <p>
              <span className="font-medium text-[#A1A1A6] mr-2">Unternehmens-Identifikationsnummer (UID):</span>
              <span className="font-mono font-semibold text-white">{LEGAL_CONFIG.unternehmensIdentifikation.uid}</span>
            </p>
            <p>
              <span className="font-medium text-[#A1A1A6] mr-2">Mehrwertsteuer-Nummer:</span>
              <span className="font-mono font-semibold text-white">{LEGAL_CONFIG.unternehmensIdentifikation.mwst}</span>
            </p>
            <p>
              <span className="font-medium text-[#A1A1A6] mr-2">Zuständiges Registeramt:</span>
              <span className="text-white">{LEGAL_CONFIG.unternehmensIdentifikation.handelsregisteramt}</span>
            </p>
          </div>

          {/* Haftungsausschluss */}
          <div className="space-y-3 border-t border-white/10 pt-4">
            <h3 className="font-semibold text-[#E8D3B5] text-xs uppercase tracking-wider">
              Haftungsausschluss
            </h3>
            <div className="text-xs text-[#A1A1A6] space-y-2">
              <p>
                <strong className="text-white">Haftung für Inhalte:</strong> Die Inhalte dieser Webapplikation werden mit grösstmöglicher Sorgfalt erstellt. Die Betreiberin übernimmt jedoch keine Gewähr für die Richtigkeit, Vollständigkeit und Aktualität der bereitgestellten Inhalte und Vorlagen.
              </p>
              <p>
                <strong className="text-white">Haftung für Links:</strong> Verweise und Links auf Webseiten Dritter liegen ausserhalb unseres Verantwortungsbereichs. Es wird jegliche Verantwortung für solche Webseiten abgelehnt. Der Zugriff und die Nutzung solcher Webseiten erfolgen auf eigene Gefahr des Nutzers.
              </p>
              <p>
                <strong className="text-white">Urheberrechte:</strong> Die Urheber- und alle anderen Rechte an Inhalten, Bildern, Fotos oder anderen Dateien auf der Webseite gehören ausschliesslich der Betreiberin oder den speziell genannten Rechtsinhabern. Für die Reproduktion jeglicher Elemente ist die schriftliche Zustimmung im Voraus einzuholen.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-black/40 border-t border-white/10">
          {onOpenDatenschutz ? (
            <button
              onClick={() => {
                onClose()
                onOpenDatenschutz()
              }}
              className="text-xs text-[#D6BA94] hover:text-white font-semibold underline cursor-pointer"
            >
              Zur Datenschutzerklärung (DSG) →
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 text-xs sm:text-sm font-semibold apple-starlight-btn rounded-full transition-colors cursor-pointer"
          >
            Schliessen
          </button>
        </div>
      </div>
    </div>
  )
}
