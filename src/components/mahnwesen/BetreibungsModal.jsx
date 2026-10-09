import React, { useState } from 'react'
import { generateBetreibungsbegehrenData } from '../../lib/mahnwesenHelper'
import { formatMoney } from '../../lib/formatters'
import { IconDocument, IconPrinter, IconCheck, IconWarning } from '../icons/BrandIcons'

function IconClose({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export default function BetreibungsModal({
  isOpen,
  onClose,
  rechnung,
  kunde,
  settings
}) {
  const [copied, setCopied] = useState(false)

  if (!isOpen || !rechnung) return null

  const dossier = generateBetreibungsbegehrenData({ rechnung, kunde, settings })

  const handleCopyText = () => {
    const textToCopy = `
BETREIBUNGSBEGEHREN (Art. 67 SchKG)
=====================================
GLÄUBIGER:
${dossier.glaeubiger.name}
${dossier.glaeubiger.strasse}
${dossier.glaeubiger.plz} ${dossier.glaeubiger.ort}
IBAN: ${dossier.glaeubiger.iban}
Vertreten durch: ${dossier.glaeubiger.vertretenDurch || '-'}

SCHULDNER:
${dossier.schuldner.name}
${dossier.schuldner.strasse}
${dossier.schuldner.plz} ${dossier.schuldner.ort}
Land: ${dossier.schuldner.land}

FORDERUNG:
Grundforderung: CHF ${formatMoney(dossier.forderung.grundforderung)}
Zinslauf: ${dossier.forderung.zins.satz}% seit ${dossier.forderung.zins.zinsbeginn} (Art. 104 OR)
Mahnspesen: CHF ${formatMoney(dossier.forderung.mahnspesen)}

FORDERUNGSGRUND:
${dossier.forderung.forderungsgrund}

BEILIEGENDE BELEGE:
${dossier.anhangBelege.map(b => `- ${b}`).join('\n')}
    `.trim()

    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  const handlePrintDossier = () => {
    window.print()
  }

  return (
    <div 
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-rose-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-white/20 rounded-lg">
              <IconDocument className="w-5 h-5 text-white" />
            </span>
            <div>
              <h2 className="text-base font-bold">Betreibungsbegehren (Art. 67 SchKG)</h2>
              <p className="text-xs text-rose-100">
                Offizielles Dossier für das zuständige Betreibungsamt
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-xl transition-colors text-white cursor-pointer"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto text-sm text-text-primary">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-900 flex items-start gap-3">
            <IconWarning className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Rechtlicher Hinweis nach Art. 67 SchKG:</p>
              <p className="mt-1">
                Dieses Begehren kann direkt beim örtlich zuständigen Betreibungsamt des Wohnsitzes bzw. Sitzes des Schuldners eingereicht werden.
                Der Verzugszins von 5% p.a. läuft von Gesetzes wegen ab dem vertraglich vereinbarten Fälligkeitstag (Verfalltag).
              </p>
            </div>
          </div>

          {/* Gläubiger & Schuldner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary block mb-1">
                1. Gläubiger (Ihr Betrieb)
              </span>
              <p className="font-semibold text-text-primary">{dossier.glaeubiger.name}</p>
              <p className="text-xs text-text-secondary">{dossier.glaeubiger.strasse}</p>
              <p className="text-xs text-text-secondary">{dossier.glaeubiger.plz} {dossier.glaeubiger.ort}</p>
              <p className="text-xs text-text-secondary font-mono mt-1">IBAN: {dossier.glaeubiger.iban}</p>
            </div>

            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary block mb-1">
                2. Schuldner (Kunde)
              </span>
              <p className="font-semibold text-text-primary">{dossier.schuldner.name}</p>
              <p className="text-xs text-text-secondary">{dossier.schuldner.strasse}</p>
              <p className="text-xs text-text-secondary">{dossier.schuldner.plz} {dossier.schuldner.ort}</p>
              <p className="text-xs text-text-secondary">{dossier.schuldner.land}</p>
            </div>
          </div>

          {/* Forderung */}
          <div className="bg-white border border-border rounded-xl p-4 shadow-sm space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary block mb-2">
              3. Forderungsaufstellung (SchKG-konform)
            </span>
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span>Grundforderung (Handwerkerlohn):</span>
              <span className="font-bold text-text-primary">CHF {formatMoney(dossier.forderung.grundforderung)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span>Gesetzlicher Verzugszins (Art. 104 OR):</span>
              <span className="font-medium text-rose-700">5.0% seit {dossier.forderung.zins.zinsbeginn}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span>Geltend gemachte Mahnspesen:</span>
              <span>CHF {formatMoney(dossier.forderung.mahnspesen)}</span>
            </div>
            <div className="pt-2">
              <span className="text-xs font-semibold text-text-secondary block mb-1">Forderungsgrund:</span>
              <p className="bg-neutral-50 p-2.5 rounded-lg text-xs font-mono text-neutral-800 border border-neutral-200">
                {dossier.forderung.forderungsgrund}
              </p>
            </div>
          </div>

          {/* Beilagen */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary block mb-1.5">
              4. Beilagen für das Betreibungsamt
            </span>
            <ul className="list-disc list-inside text-xs text-text-secondary space-y-1">
              {dossier.anhangBelege.map((beleg, i) => (
                <li key={i}>{beleg}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-50 border-t border-border flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary cursor-pointer"
          >
            Schliessen
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-xl transition-all cursor-pointer"
            >
              {copied ? <IconCheck className="w-4 h-4 text-emerald-600" /> : <IconDocument className="w-4 h-4" />}
              <span>{copied ? 'Kopiert!' : 'Text kopieren'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrintDossier}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
            >
              <IconPrinter className="w-4 h-4" />
              <span>Dossier Drucken</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
