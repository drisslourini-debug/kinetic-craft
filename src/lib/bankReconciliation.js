/**
 * Bank Reconciliation Engine for Swiss QR-Bills & ISO 20022 camt transactions
 * 
 * Implements 3-tier matching:
 * 1. Exact 27-digit QR-Reference match (100% confidence)
 * 2. Fuzzy text match (Invoice number / Customer name in remittance text)
 * 3. Manual / Unmatched exception queue
 * 
 * Handles intelligent difference logic:
 * - Difference <= 0.05 CHF -> Full payment
 * - Difference <= 3.0% -> Cash discount (Skonto Art. 41 MWSTG / Konto 3800)
 * - Difference > 3.0% -> Partial payment (Teilzahlung)
 * - Detects duplicates via bank transaction ID or existing booked payments
 */

import { generateQrReference } from './qrHelper'

/**
 * Normalizes strings for fuzzy comparison (lowercase, trims, removes special characters)
 * @param {string} str 
 * @returns {string}
 */
function cleanSearchString(str) {
  if (!str) return ''
  return str.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Reconciles parsed bank transactions against the list of open and existing invoices.
 * 
 * @param {Array<Object>} transactions Parsed transactions from camtParser
 * @param {Array<Object>} invoices List of invoices from database
 * @returns {{
 *   totalAmount: number,
 *   totalCount: number,
 *   matchedCount: number,
 *   reviewCount: number,
 *   unmatchedCount: number,
 *   alreadyBookedCount: number,
 *   reconciledItems: Array<Object>
 * }}
 */
export function reconcileTransactionsWithInvoices(transactions = [], invoices = []) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      totalAmount: 0,
      totalCount: 0,
      matchedCount: 0,
      reviewCount: 0,
      unmatchedCount: 0,
      alreadyBookedCount: 0,
      reconciledItems: []
    }
  }

  // Pre-calculate QR references, index invoices and map existing transaction IDs
  const invoiceMapByQr = new Map()
  const invoiceMapByTxId = new Map()
  const invoiceList = []

  for (const inv of invoices) {
    const kundenId = inv.kunden_id || (inv.kunden && inv.kunden.id) || 0
    const rechnungId = inv.id
    const expectedQrRef = inv.daten?.qr_reference || generateQrReference(kundenId, rechnungId)
    const totalAmount = parseFloat(inv.total) || 0
    const bezahltAmount = parseFloat(inv.bezahlt) || 0
    const openAmount = Math.max(0, Math.round((totalAmount - bezahltAmount) * 100) / 100)

    const preparedInv = {
      ...inv,
      totalAmount,
      bezahltAmount,
      calculatedQrRef: expectedQrRef,
      cleanRechnungNr: cleanSearchString(inv.rechnung_nr),
      cleanKundeName: cleanSearchString(inv.kunden?.name || inv.kunden?.firmenname || ''),
      openAmount
    }

    if (expectedQrRef) {
      invoiceMapByQr.set(expectedQrRef.replace(/\s+/g, ''), preparedInv)
    }

    // Index all existing bank_tx_id from previous reconciliation
    const existingZahlungen = Array.isArray(inv.daten?.zahlungen) ? inv.daten.zahlungen : []
    for (const z of existingZahlungen) {
      if (z.bank_tx_id) {
        invoiceMapByTxId.set(z.bank_tx_id, preparedInv)
      }
    }

    invoiceList.push(preparedInv)
  }

  let matchedCount = 0
  let reviewCount = 0
  let unmatchedCount = 0
  let alreadyBookedCount = 0
  let totalAmount = 0

  const reconciledItems = transactions.map((tx) => {
    totalAmount += tx.betrag

    let isAlreadyBooked = false
    let matchedInvoice = null
    let matchType = 'none' // 'qr_reference', 'fuzzy_text', 'none'
    let matchConfidence = 0

    // Priority 0: Check if this bank transaction ID was already booked anywhere
    if (tx.transaktionsId && invoiceMapByTxId.has(tx.transaktionsId)) {
      matchedInvoice = invoiceMapByTxId.get(tx.transaktionsId)
      isAlreadyBooked = true
      matchType = 'duplicate_tx_id'
      matchConfidence = 1.0
    }

    // Priority 1: Check by QR reference
    if (!matchedInvoice && tx.qrReferenz) {
      const cleanRef = tx.qrReferenz.replace(/\s+/g, '')
      if (invoiceMapByQr.has(cleanRef)) {
        matchedInvoice = invoiceMapByQr.get(cleanRef)
        matchType = 'qr_reference'
        matchConfidence = 1.0
      }
    }

    // Priority 2: Fuzzy matching via remittance info or debtor name
    if (!matchedInvoice && (tx.mitteilung || tx.einzahler)) {
      const cleanText = cleanSearchString(`${tx.mitteilung || ''} ${tx.einzahler || ''}`)

      for (const inv of invoiceList) {
        const rechnungNrMatch = inv.cleanRechnungNr && cleanText.includes(inv.cleanRechnungNr)
        const rechnungDigits = inv.rechnung_nr ? inv.rechnung_nr.replace(/\D/g, '') : ''
        const digitsMatch = rechnungDigits.length >= 3 && cleanText.includes(rechnungDigits)
        const kundeMatch = inv.cleanKundeName && inv.cleanKundeName.length >= 3 && cleanText.includes(inv.cleanKundeName)
        const openAmountMatch = Math.abs(inv.openAmount - tx.betrag) <= 0.05
        const totalAmountMatch = Math.abs(inv.totalAmount - tx.betrag) <= 0.05

        if (rechnungNrMatch || (digitsMatch && (openAmountMatch || totalAmountMatch))) {
          matchedInvoice = inv
          matchType = 'fuzzy_text'
          matchConfidence = 0.9
          break
        } else if (kundeMatch && (openAmountMatch || totalAmountMatch)) {
          matchedInvoice = inv
          matchType = 'fuzzy_text'
          matchConfidence = 0.8
          break
        }
      }
    }

    // Check if matched invoice is already booked even without explicit txId
    if (matchedInvoice && !isAlreadyBooked) {
      const existingZahlungen = Array.isArray(matchedInvoice.daten?.zahlungen) ? matchedInvoice.daten.zahlungen : []
      const hasIdenticalBooking = existingZahlungen.some(
        z => z.datum === tx.datum && Math.abs((parseFloat(z.betrag) || 0) - tx.betrag) < 0.01
      )
      const isAlreadyFullyPaid = matchedInvoice.status === 'Bezahlt' && matchedInvoice.openAmount === 0

      if (hasIdenticalBooking && isAlreadyFullyPaid) {
        isAlreadyBooked = true
      }
    }

    // Determine financial differences & suggestions
    let diff = 0
    let suggestedAction = 'voll' // 'voll', 'skonto', 'teil', 'none'
    let skontoBetrag = 0
    let statusLabel = 'Nicht zugeordnet'
    let statusCategory = 'unmatched' // 'matched', 'review', 'unmatched', 'already_booked'
    let isSelected = false

    if (isAlreadyBooked) {
      alreadyBookedCount++
      statusCategory = 'already_booked'
      statusLabel = 'Bereits verbucht'
      suggestedAction = 'none'
      isSelected = false
    } else if (matchedInvoice) {
      const open = matchedInvoice.openAmount
      diff = Math.round((open - tx.betrag) * 100) / 100

      if (Math.abs(diff) <= 0.05) {
        // Exact match
        suggestedAction = 'voll'
        statusLabel = 'Exakt passend'
        statusCategory = 'matched'
        matchedCount++
        isSelected = true
      } else if (diff > 0.05) {
        // Underpayment
        const percentDiff = open > 0 ? (diff / open) * 100 : 0
        if (percentDiff <= 3.01) {
          // Skonto deduction within 3% tolerance
          suggestedAction = 'skonto'
          skontoBetrag = diff
          statusLabel = `Skonto (${percentDiff.toFixed(1)}%)`
          statusCategory = 'review'
          reviewCount++
          isSelected = true
        } else {
          // Partial payment
          suggestedAction = 'teil'
          statusLabel = `Teilzahlung (Rest: CHF ${diff.toFixed(2)})`
          statusCategory = 'review'
          reviewCount++
          isSelected = true
        }
      } else {
        // Overpayment
        suggestedAction = 'voll'
        statusLabel = `Überzahlung (+CHF ${Math.abs(diff).toFixed(2)})`
        statusCategory = 'review'
        reviewCount++
        isSelected = true
      }
    } else {
      unmatchedCount++
      statusCategory = 'unmatched'
      statusLabel = 'Offen / Nicht erkannt'
      suggestedAction = 'none'
      isSelected = false
    }

    return {
      transaction: tx,
      matchedInvoice,
      matchType,
      matchConfidence,
      statusCategory,
      statusLabel,
      suggestedAction, // 'voll' | 'skonto' | 'teil' | 'none'
      action: suggestedAction, // can be modified by user
      skontoBetrag,
      difference: diff,
      isSelected,
      isAlreadyBooked
    }
  })

  return {
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalCount: transactions.length,
    matchedCount,
    reviewCount,
    unmatchedCount,
    alreadyBookedCount,
    reconciledItems
  }
}
