import { useState } from 'react'
import { formatCurrency, formatDate } from '../../lib/formatters'
import { calculateRapportTotal } from '../../lib/rapportToInvoice'
import { supabase } from '../../lib/supabase'
import { useModalHistory } from '../../hooks/useModalHistory'
import {
  IconRapport,
  IconPrinter,
  IconClose,
  IconWarning,
  IconQrBill
} from '../icons/BrandIcons'

export default function RapportDetailModal({
  isOpen,
  onClose,
  rapport,
  projekt,
  kunde,
  globalSettings,
  onConvertToInvoice
}) {
  useModalHistory(isOpen, onClose, 'rapport_detail_modal')
  const [isUpdating, setIsUpdating] = useState(false)

  if (!isOpen || !rapport) return null

  const stundenList = Array.isArray(rapport.stunden) ? rapport.stunden : []
  const materialList = Array.isArray(rapport.material) ? rapport.material : []
  const totalSum = calculateRapportTotal(rapport)

  const handlePrint = () => {
    window.print()
  }

  const handleCreateInvoice = async () => {
    if (!onConvertToInvoice) return
    setIsUpdating(true)
    try {
      // Mark rapport as 'Verrechnet'
      if (supabase && rapport.id && !rapport.id.startsWith('local_')) {
        await supabase
          .from('rapporte')
          .update({ status: 'Verrechnet' })
          .eq('id', rapport.id)
      } else {
        // Update localStorage
        const stored = JSON.parse(localStorage.getItem('atelier77_rapporte') || '[]')
        const updated = stored.map(r => r.id === rapport.id ? { ...r, status: 'Verrechnet' } : r)
        localStorage.setItem('atelier77_rapporte', JSON.stringify(updated))
      }
      rapport.status = 'Verrechnet'
      onConvertToInvoice(rapport)
      onClose()
    } catch (err) {
      console.error('Fehler beim Übernehmen in Rechnung:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in print:p-0 print:bg-white">
      <div 
        className="bg-white border border-border w-full max-w-4xl max-h-[95vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden print:border-none print:shadow-none print:max-h-none print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (hidden in print) */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface/50 print:hidden">
          <div className="flex items-center gap-3">
            <IconRapport className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <span>{rapport.rapport_nr}</span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    rapport.status === 'Verrechnet'
                      ? 'bg-blue-100 text-blue-800'
                      : rapport.status === 'Unterschrieben'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {rapport.status}
                </span>
              </h2>
              <p className="text-xs text-text-secondary">
                Erstellt am {formatDate(rapport.datum)} durch {rapport.monteur_name || 'Monteur'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-neutral-50 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <IconPrinter className="w-4 h-4" />
              <span>Drucken / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl hover:bg-neutral-100 text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
            >
              <IconClose className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable A4 Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 bg-white print:p-0 print:space-y-6">
          {/* Document Header */}
          <div className="flex justify-between items-start border-b border-neutral-200 pb-6">
            <div>
              {globalSettings?.logo_url ? (
                <img
                  src={globalSettings.logo_url}
                  alt={globalSettings.firmenname || 'Logo'}
                  className="h-12 w-auto object-contain mb-2"
                />
              ) : (
                <h1 className="text-xl font-black text-neutral-900 tracking-tight">
                  {globalSettings?.firmenname || 'Muster Malerei Bern AG'}
                </h1>
              )}
              <p className="text-xs text-neutral-500">
                {globalSettings?.firmenadresse || ''} · {globalSettings?.firmenplz || ''} {globalSettings?.firmenort || ''}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs uppercase tracking-wider text-neutral-400 font-bold block">Dokument</span>
              <p className="text-xl font-black text-neutral-900">{rapport.rapport_nr}</p>
              <p className="text-xs text-neutral-500 mt-1">Datum: {formatDate(rapport.datum)}</p>
            </div>
          </div>

          {/* Project & Client Address Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-neutral-50/80 p-4 rounded-2xl border border-neutral-200/70 text-xs">
            <div>
              <span className="font-bold text-neutral-400 uppercase tracking-wider text-[10px] block mb-1">
                Kunde / Auftraggeber
              </span>
              <p className="font-bold text-neutral-900 text-sm">{kunde?.name || kunde?.firmenname || '—'}</p>
              {kunde?.strasse && <p className="text-neutral-600">{kunde.strasse}</p>}
              {(kunde?.plz || kunde?.ort) && (
                <p className="text-neutral-600">{kunde.plz} {kunde.ort}</p>
              )}
            </div>

            <div>
              <span className="font-bold text-neutral-400 uppercase tracking-wider text-[10px] block mb-1">
                Baustelle / Projekt
              </span>
              <p className="font-bold text-neutral-900 text-sm">{projekt?.name || '—'}</p>
              {projekt?.adresse && <p className="text-neutral-600">{projekt.adresse}</p>}
              <p className="text-neutral-500 mt-1">Ausführender: <strong>{rapport.monteur_name || 'Monteur'}</strong></p>
            </div>
          </div>

          {/* Description */}
          {rapport.beschreibung && (
            <div className="space-y-1 text-xs">
              <span className="font-bold text-neutral-400 uppercase tracking-wider text-[10px]">
                Ausgeführte Regiearbeiten
              </span>
              <div className="bg-white p-3 rounded-xl border border-neutral-200 text-neutral-800 leading-relaxed whitespace-pre-wrap">
                {rapport.beschreibung}
              </div>
            </div>
          )}

          {/* Hours Table */}
          {stundenList.length > 0 && (
            <div className="space-y-2">
              <span className="font-bold text-neutral-400 uppercase tracking-wider text-[10px]">
                Arbeitszeit / Regiestunden
              </span>
              <table className="w-full text-left text-xs border border-neutral-200 rounded-xl overflow-hidden">
                <thead className="bg-neutral-100/70 text-neutral-600 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="p-2.5">Mitarbeiter / Tätigkeit</th>
                    <th className="p-2.5 text-right w-24">Stunden</th>
                    <th className="p-2.5 text-right w-28">Ansatz (CHF)</th>
                    <th className="p-2.5 text-right w-28">Betrag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {stundenList.map((s, idx) => {
                    const rowTotal = (parseFloat(s.stunden) || 0) * (parseFloat(s.ansatz) || 0)
                    return (
                      <tr key={idx} className="hover:bg-neutral-50/50">
                        <td className="p-2.5 text-neutral-800">
                          <span className="font-semibold">{s.taetigkeit || 'Regiearbeit'}</span>
                          {s.mitarbeiter && <span className="text-neutral-500 ml-1.5">({s.mitarbeiter})</span>}
                        </td>
                        <td className="p-2.5 text-right font-medium">{parseFloat(s.stunden || 0).toFixed(1)} h</td>
                        <td className="p-2.5 text-right text-neutral-600">{parseFloat(s.ansatz || 0).toFixed(2)}</td>
                        <td className="p-2.5 text-right font-bold text-neutral-900">{formatCurrency(rowTotal)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Material Table */}
          {materialList.length > 0 && (
            <div className="space-y-2">
              <span className="font-bold text-neutral-400 uppercase tracking-wider text-[10px]">
                Verbrauchtes Material & Kleinmaschinen
              </span>
              <table className="w-full text-left text-xs border border-neutral-200 rounded-xl overflow-hidden">
                <thead className="bg-neutral-100/70 text-neutral-600 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="p-2.5">Artikel / Bezeichnung</th>
                    <th className="p-2.5 text-right w-24">Menge</th>
                    <th className="p-2.5 text-right w-28">Preis (CHF)</th>
                    <th className="p-2.5 text-right w-28">Betrag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {materialList.map((m, idx) => {
                    const rowTotal = (parseFloat(m.menge) || 0) * (parseFloat(m.preis) || 0)
                    return (
                      <tr key={idx} className="hover:bg-neutral-50/50">
                        <td className="p-2.5 font-semibold text-neutral-800">{m.artikel}</td>
                        <td className="p-2.5 text-right font-medium">{m.menge} {m.einheit || 'Stk'}</td>
                        <td className="p-2.5 text-right text-neutral-600">{parseFloat(m.preis || 0).toFixed(2)}</td>
                        <td className="p-2.5 text-right font-bold text-neutral-900">{formatCurrency(rowTotal)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Gesamttotal */}
          <div className="flex justify-end pt-2">
            <div className="bg-neutral-50 border border-neutral-200 p-3 rounded-xl min-w-[240px] text-right space-y-1">
              <span className="text-xs text-neutral-500 uppercase tracking-wider font-bold">Rapport-Total (exkl. MWST)</span>
              <div className="text-xl font-black text-neutral-900">{formatCurrency(totalSum)}</div>
            </div>
          </div>

          {/* Signature Box */}
          <div className="pt-6 border-t border-neutral-200">
            <span className="font-bold text-neutral-400 uppercase tracking-wider text-[10px] block mb-2">
              Kundenabnahme & Digitale Unterschrift vor Ort
            </span>

            <div className="border border-neutral-200 rounded-2xl p-4 bg-neutral-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-xs">
                <p className="font-bold text-neutral-900">
                  Abgenommen durch: {rapport.unterzeichner_name || kunde?.name || 'Kunde'}
                </p>
                <p className="text-neutral-500">
                  Zeitstempel: {rapport.unterschrieben_am ? formatDate(rapport.unterschrieben_am) + ' um ' + new Date(rapport.unterschrieben_am).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) : 'Ausstehend'}
                </p>
                <p className="text-[10px] text-neutral-400 max-w-sm">
                  Die ausgeführten Regiearbeiten und Materialien wurden ordnungsgemäss geprüft und freigegeben.
                </p>
              </div>

              {rapport.unterschrift_data ? (
                <div className="border border-neutral-300 bg-white rounded-xl p-2 h-20 w-48 flex items-center justify-center">
                  <img
                    src={rapport.unterschrift_data}
                    alt="Kundenunterschrift"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="border border-dashed border-amber-300 bg-amber-50 rounded-xl p-3 text-amber-800 text-xs font-semibold flex items-center gap-1.5">
                  <IconWarning className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Noch nicht signiert</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions (hidden in print) */}
        <div className="px-6 py-4 border-t border-border bg-surface/50 flex items-center justify-between print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            Schliessen
          </button>

          {rapport.status !== 'Verrechnet' && onConvertToInvoice && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleCreateInvoice}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <IconQrBill className="w-4 h-4" />
              <span>In Rechnung übernehmen ({formatCurrency(totalSum)})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
