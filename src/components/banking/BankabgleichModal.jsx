import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDate } from '../../lib/formatters'
import { parseCamtXml } from '../../lib/camtParser'
import { reconcileTransactionsWithInvoices } from '../../lib/bankReconciliation'
import { useModalHistory } from '../../hooks/useModalHistory'
import {
  IconBank,
  IconClose,
  IconWarning,
  IconDocument,
  IconLightbulb,
  IconCheck
} from '../icons/BrandIcons'

export default function BankabgleichModal({ isOpen, onClose, onSuccess, invoices = [] }) {
  useModalHistory(isOpen, onClose, 'bankabgleich_modal')

  const [step, setStep] = useState('upload') // 'upload' | 'reconcile'
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [fileError, setFileError] = useState(null)
  const [fileName, setFileName] = useState('')
  const [reconciliationResult, setReconciliationResult] = useState(null)
  const [items, setItems] = useState([])
  const fileInputRef = useRef(null)

  // Reset when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('upload')
      setFileError(null)
      setFileName('')
      setReconciliationResult(null)
      setItems([])
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleFileUpload = async (file) => {
    if (!file) return
    setFileError(null)
    setFileName(file.name)
    setIsProcessingFile(true)

    try {
      const text = await file.text()
      const parseRes = parseCamtXml(text)

      if (!parseRes.success) {
        throw new Error(parseRes.error || 'Datei konnte nicht verarbeitet werden.')
      }

      if (parseRes.transactions.length === 0) {
        throw new Error('Keine Zahlungseingänge (Gutschriften) in der Bankdatei gefunden.')
      }

      // Reconcile with available invoices
      const recResult = reconcileTransactionsWithInvoices(parseRes.transactions, invoices)
      setReconciliationResult(recResult)
      setItems(recResult.reconciledItems)
      setStep('reconcile')
    } catch (err) {
      console.error('Fehler beim Bankabgleich:', err)
      setFileError(err.message || 'Die Datei konnte nicht gelesen werden.')
    } finally {
      setIsProcessingFile(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleItemToggle = (index) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item
        if (item.isAlreadyBooked) return item // Already booked cannot be toggled
        return { ...item, isSelected: !item.isSelected }
      })
    )
  }

  const handleSelectAll = (checked) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.isAlreadyBooked) return item
        return { ...item, isSelected: checked }
      })
    )
  }

  const handleActionChange = (index, newAction) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item
        return {
          ...item,
          action: newAction,
          isSelected: newAction !== 'none'
        }
      })
    )
  }

  const handleManualInvoiceAssign = (index, invoiceId) => {
    const targetInvoice = invoices.find((inv) => String(inv.id) === String(invoiceId))
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item
        if (!targetInvoice) {
          return {
            ...item,
            matchedInvoice: null,
            statusCategory: 'unmatched',
            statusLabel: 'Offen / Nicht erkannt',
            action: 'none',
            isSelected: false
          }
        }

        const open = Math.max(
          0,
          Math.round(((parseFloat(targetInvoice.total) || 0) - (parseFloat(targetInvoice.bezahlt) || 0)) * 100) / 100
        )
        const diff = Math.round((open - item.transaction.betrag) * 100) / 100
        let suggestedAction = 'voll'
        let skontoBetrag = 0
        let statusLabel = 'Manuell zugewiesen'
        let statusCategory = 'matched'

        if (Math.abs(diff) <= 0.05) {
          suggestedAction = 'voll'
        } else if (diff > 0.05) {
          const percentDiff = open > 0 ? (diff / open) * 100 : 0
          if (percentDiff <= 3.01) {
            suggestedAction = 'skonto'
            skontoBetrag = diff
            statusLabel = `Skonto (${percentDiff.toFixed(1)}%)`
            statusCategory = 'review'
          } else {
            suggestedAction = 'teil'
            statusLabel = `Teilzahlung (Rest: CHF ${diff.toFixed(2)})`
            statusCategory = 'review'
          }
        }

        return {
          ...item,
          matchedInvoice: targetInvoice,
          difference: diff,
          skontoBetrag,
          action: suggestedAction,
          statusLabel,
          statusCategory,
          isSelected: true
        }
      })
    )
  }

  const handleSaveBookings = async () => {
    const selectedItems = items.filter((it) => it.isSelected && it.matchedInvoice && !it.isAlreadyBooked)
    if (selectedItems.length === 0) return

    setIsSaving(true)
    let successCount = 0
    let totalBooked = 0

    try {
      for (const item of selectedItems) {
        const inv = item.matchedInvoice
        const tx = item.transaction
        const currentPaid = parseFloat(inv.bezahlt) || 0
        const total = parseFloat(inv.total) || 0
        const amount = tx.betrag
        const paymentDate = tx.datum || new Date().toISOString().split('T')[0]
        const open = Math.max(0, Math.round((total - currentPaid) * 100) / 100)
        const diff = Math.round((open - amount) * 100) / 100

        let newStatus = 'Bezahlt'
        let skontoBetrag = parseFloat(inv.daten?.skonto_betrag || 0)
        const newPaid = currentPaid + amount

        const existingZahlungen = Array.isArray(inv.daten?.zahlungen) ? [...inv.daten.zahlungen] : []

        if (item.action === 'teil' || (diff > 0.05 && item.action !== 'skonto')) {
          newStatus = 'Teilbezahlt'
          existingZahlungen.push({
            datum: paymentDate,
            betrag: amount,
            typ: 'Teilzahlung',
            bank_tx_id: tx.transaktionsId
          })
        } else if (item.action === 'skonto' || (diff > 0.05 && item.action === 'skonto')) {
          newStatus = 'Bezahlt'
          const appliedSkonto = item.skontoBetrag > 0 ? item.skontoBetrag : diff
          skontoBetrag += appliedSkonto
          existingZahlungen.push({
            datum: paymentDate,
            betrag: amount,
            typ: 'Zahlung',
            bank_tx_id: tx.transaktionsId
          })
          existingZahlungen.push({
            datum: paymentDate,
            betrag: appliedSkonto,
            typ: 'Skonto',
            bank_tx_id: `${tx.transaktionsId}_skonto`
          })
        } else {
          newStatus = 'Bezahlt'
          existingZahlungen.push({
            datum: paymentDate,
            betrag: amount,
            typ: 'Zahlung',
            bank_tx_id: tx.transaktionsId
          })
        }

        const updatedDaten = {
          ...(inv.daten || {}),
          zahlungen: existingZahlungen,
          skonto_betrag: skontoBetrag > 0 ? skontoBetrag : undefined
        }

        const { error } = await supabase
          .from('rechnungen')
          .update({
            bezahlt: newPaid,
            bezahlt_am: paymentDate,
            status: newStatus,
            daten: updatedDaten
          })
          .eq('id', inv.id)

        if (error) {
          console.error(`Fehler bei Rechnung ${inv.rechnung_nr}:`, error)
        } else {
          successCount++
          totalBooked += amount
        }
      }

      if (onSuccess) {
        onSuccess({ count: successCount, totalAmount: totalBooked })
      }
      onClose()
    } catch (err) {
      console.error('Fehler bei der Stapel-Verbuchung:', err)
      setFileError('Einige Rechnungen konnten nicht gespeichert werden.')
    } finally {
      setIsSaving(false)
    }
  }

  const selectedCount = items.filter((it) => it.isSelected && it.matchedInvoice && !it.isAlreadyBooked).length
  const selectedSum = items
    .filter((it) => it.isSelected && it.matchedInvoice && !it.isAlreadyBooked)
    .reduce((acc, curr) => acc + curr.transaction.betrag, 0)

  const openInvoices = invoices.filter((i) => i.status !== 'Bezahlt' && i.status !== 'Storniert')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-surface-card border border-border w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
              <IconBank className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                Bankauszug abgleichen (camt.054 / 053)
              </h2>
              <p className="text-xs text-text-secondary">
                Zahlungseingänge automatisch einlesen und Schweizer QR-Rechnungen auf &quot;Bezahlt&quot; setzen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-neutral-100 text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 'upload' && (
            <div className="space-y-4">
              {fileError && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-start gap-3">
                  <IconWarning className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold mb-0.5">Fehler beim Einlesen</p>
                    <p>{fileError}</p>
                  </div>
                </div>
              )}

              {/* Drag and Drop Box */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200
                  ${isProcessingFile ? 'border-sky-400 bg-sky-50/50' : 'border-border hover:border-sky-500 hover:bg-neutral-50/80'}
                `}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                  accept=".xml,.camt,.camt054,.camt053"
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-400 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-sky-500/20 mb-4 animate-bounce-short">
                  <IconDocument className="w-8 h-8 text-white" />
                </div>

                {isProcessingFile ? (
                  <div className="space-y-2">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-sky-500 border-t-transparent" />
                    <p className="text-sm font-semibold text-text-primary">Bankauszug wird analysiert...</p>
                    <p className="text-xs text-text-secondary">{fileName}</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-w-md">
                    <p className="text-base font-bold text-text-primary">
                      Kontoauszug hier ablegen oder Datei auswählen
                    </p>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Unterstützt die offiziellen Schweizer Bank-Formate <strong className="text-text-primary">camt.054</strong> (QR-Gutschriften) und <strong className="text-text-primary">camt.053</strong> von PostFinance, Raiffeisen, UBS, Kantonalbanken und allen anderen Schweizer Banken.
                    </p>
                    <span className="inline-block px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full text-[11px] font-medium mt-2 border border-neutral-200">
                      .xml / .camt
                    </span>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="p-4 bg-sky-50/70 border border-sky-100 rounded-2xl flex items-start gap-3 text-sky-900 text-xs">
                <IconLightbulb className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Wie funktioniert der Abgleich?</p>
                  <p className="text-sky-800 leading-relaxed">
                    Die Datei wird <strong>sicher direkt im Browser</strong> ausgelesen. Kinetic Craft prüft die 27-stellige Schweizer QR-Referenznummer jeder Überweisung und gleicht sie mit offenen Rechnungen ab. Skontoabzüge (bis zu 3%) werden automatisch erkannt.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 'reconcile' && reconciliationResult && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-surface p-3.5 rounded-2xl border border-border">
                  <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Eingänge</p>
                  <p className="text-lg font-bold text-text-primary mt-1">
                    {formatCurrency(reconciliationResult.totalAmount)}
                  </p>
                  <p className="text-[11px] text-text-secondary">{reconciliationResult.totalCount} Transaktionen</p>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200/60 p-3.5 rounded-2xl">
                  <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Exakte Treffer</p>
                  <p className="text-lg font-bold text-emerald-900 mt-1">{reconciliationResult.matchedCount}</p>
                  <p className="text-[11px] text-emerald-700">QR-Referenz 100%</p>
                </div>

                <div className="bg-amber-50/70 border border-amber-200/60 p-3.5 rounded-2xl">
                  <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Zu Prüfen</p>
                  <p className="text-lg font-bold text-amber-900 mt-1">{reconciliationResult.reviewCount}</p>
                  <p className="text-[11px] text-amber-700">Skonto / Teilzahlung</p>
                </div>

                <div className="bg-neutral-50 border border-neutral-200 p-3.5 rounded-2xl">
                  <p className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider">Offen / Duplikate</p>
                  <p className="text-lg font-bold text-neutral-800 mt-1">
                    {reconciliationResult.unmatchedCount + reconciliationResult.alreadyBookedCount}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    {reconciliationResult.alreadyBookedCount > 0 ? `${reconciliationResult.alreadyBookedCount} bereits verbucht` : 'Nicht zugeordnet'}
                  </p>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="border border-border rounded-2xl overflow-hidden shadow-xs">
                <div className="bg-neutral-50 border-b border-border px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="select_all_tx"
                      checked={items.filter(i => !i.isAlreadyBooked).every(i => i.isSelected)}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4 cursor-pointer"
                    />
                    <label htmlFor="select_all_tx" className="text-xs font-semibold text-text-primary cursor-pointer">
                      Alle auswählen
                    </label>
                  </div>
                  <button
                    onClick={() => setStep('upload')}
                    className="text-xs text-sky-600 hover:text-sky-700 font-medium cursor-pointer"
                  >
                    ← Andere Datei wählen
                  </button>
                </div>

                <div className="divide-y divide-border overflow-x-auto max-h-[360px] overflow-y-auto">
                  {items.map((item, index) => {
                    const tx = item.transaction
                    const inv = item.matchedInvoice

                    return (
                      <div
                        key={tx.id}
                        className={`p-3.5 sm:px-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-colors ${
                          item.isAlreadyBooked
                            ? 'bg-neutral-50/80 opacity-60'
                            : item.isSelected
                            ? 'bg-sky-50/20'
                            : 'hover:bg-neutral-50/50'
                        }`}
                      >
                        {/* Left: Checkbox & Payment Details */}
                        <div className="flex items-start gap-3 min-w-[240px]">
                          <input
                            type="checkbox"
                            disabled={item.isAlreadyBooked}
                            checked={item.isSelected}
                            onChange={() => handleItemToggle(index)}
                            className="mt-1 rounded text-sky-600 focus:ring-sky-500 h-4 w-4 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-text-primary">{formatDate(tx.datum)}</span>
                              <span className="font-bold text-emerald-700">{formatCurrency(tx.betrag)}</span>
                            </div>
                            <p className="text-text-primary font-medium truncate max-w-[200px] sm:max-w-[260px]">
                              {tx.einzahler || 'Zahlungsempfänger/Einzahler'}
                            </p>
                            {tx.mitteilung && (
                              <p className="text-[11px] text-text-secondary truncate max-w-[240px] italic">
                                &quot;{tx.mitteilung}&quot;
                              </p>
                            )}
                            {tx.qrReferenz && (
                              <p className="text-[10px] font-mono text-neutral-400 truncate">
                                Ref: {tx.qrReferenz}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Center: Matched Invoice */}
                        <div className="flex-1 md:px-3">
                          {inv ? (
                            <div className="bg-white border border-border p-2 rounded-xl space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-text-primary">
                                  {inv.rechnung_nr}
                                </span>
                                <span className="text-[11px] font-medium text-text-secondary">
                                  Total: {formatCurrency(inv.total)}
                                </span>
                              </div>
                              <p className="text-[11px] text-text-secondary truncate">
                                Kunde: {inv.kunden?.name || inv.kunden?.firmenname || '—'}
                              </p>
                              {item.difference > 0.05 && (
                                <p className="text-[10px] text-amber-700 font-medium">
                                  Differenz: CHF {item.difference.toFixed(2)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <select
                                value=""
                                onChange={(e) => handleManualInvoiceAssign(index, e.target.value)}
                                className="w-full bg-white border border-dashed border-amber-300 rounded-xl px-2.5 py-1.5 text-xs text-amber-900 focus:outline-hidden focus:border-amber-500 cursor-pointer"
                              >
                                <option value="">Manuell Rechnung zuweisen...</option>
                                {openInvoices.map((opInv) => (
                                  <option key={opInv.id} value={opInv.id}>
                                    {opInv.rechnung_nr} — {opInv.kunden?.name || opInv.kunden?.firmenname} (Offen: CHF {(parseFloat(opInv.total) - parseFloat(opInv.bezahlt || 0)).toFixed(2)})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        {/* Right: Action Selector & Status Badge */}
                        <div className="flex items-center gap-2 justify-end shrink-0">
                          {inv && !item.isAlreadyBooked && (
                            <select
                              value={item.action}
                              onChange={(e) => handleActionChange(index, e.target.value)}
                              className="bg-white border border-border rounded-xl px-2 py-1 text-xs text-text-primary font-medium cursor-pointer"
                            >
                              <option value="voll">Voll bezahlt</option>
                              <option value="skonto">Skonto (Konto 3800)</option>
                              <option value="teil">Teilzahlung</option>
                              <option value="none">Ignorieren</option>
                            </select>
                          )}

                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                              item.statusCategory === 'matched'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : item.statusCategory === 'review'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : item.statusCategory === 'already_booked'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                            }`}
                          >
                            {item.statusLabel}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            Abbrechen
          </button>

          {step === 'reconcile' && (
            <button
              type="button"
              disabled={selectedCount === 0 || isSaving}
              onClick={handleSaveBookings}
              className={`
                px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2
                ${
                  selectedCount > 0 && !isSaving
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
                    : 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
                }
              `}
            >
              {isSaving ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Wird verbucht...</span>
                </>
              ) : (
                <>
                  <IconCheck className="w-4 h-4" />
                  <span>
                    {selectedCount} {selectedCount === 1 ? 'Rechnung' : 'Rechnungen'} verbuchen ({formatCurrency(selectedSum)})
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
