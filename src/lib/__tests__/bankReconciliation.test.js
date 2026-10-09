import { describe, it, expect } from 'vitest'
import { reconcileTransactionsWithInvoices } from '../bankReconciliation'
import { generateQrReference } from '../qrHelper'

describe('bankReconciliation', () => {
  const qrRefInv1 = generateQrReference(12, 101)
  const qrRefInv2 = generateQrReference(15, 102)

  const sampleInvoices = [
    {
      id: 101,
      kunden_id: 12,
      rechnung_nr: 'RE-2026-101',
      total: 1000.00,
      bezahlt: 0,
      status: 'Versendet',
      kunden: { name: 'Peter Keller', firmenname: 'Keller Bau' },
      daten: { qr_reference: qrRefInv1, zahlungen: [] }
    },
    {
      id: 102,
      kunden_id: 15,
      rechnung_nr: 'RE-2026-102',
      total: 2500.00,
      bezahlt: 0,
      status: 'Versendet',
      kunden: { name: 'Maria Meier' },
      daten: { qr_reference: qrRefInv2, zahlungen: [] }
    },
    {
      id: 103,
      kunden_id: 20,
      rechnung_nr: 'RE-2026-103',
      total: 500.00,
      bezahlt: 500.00,
      status: 'Bezahlt',
      kunden: { name: 'Felix Graf' },
      daten: { 
        zahlungen: [
          { datum: '2026-10-01', betrag: 500.00, typ: 'Zahlung', bank_tx_id: 'PREV-TX-99' }
        ] 
      }
    }
  ]

  it('matches exact payment with 100% confidence by QR reference', () => {
    const transactions = [
      {
        id: 'tx1',
        datum: '2026-10-04',
        betrag: 1000.00,
        waehrung: 'CHF',
        transaktionsId: 'TX-NEW-1',
        qrReferenz: qrRefInv1,
        einzahler: 'Peter Keller',
        mitteilung: ''
      }
    ]

    const result = reconcileTransactionsWithInvoices(transactions, sampleInvoices)
    expect(result.matchedCount).toBe(1)
    expect(result.totalCount).toBe(1)
    expect(result.reconciledItems[0].statusCategory).toBe('matched')
    expect(result.reconciledItems[0].suggestedAction).toBe('voll')
    expect(result.reconciledItems[0].matchedInvoice.id).toBe(101)
    expect(result.reconciledItems[0].isSelected).toBe(true)
  })

  it('suggests Skonto (Konto 3800) when underpayment is within 3% tolerance', () => {
    // 2% Skonto on 1000 CHF = 20 CHF diff -> Paid 980 CHF
    const transactions = [
      {
        id: 'tx_skonto',
        datum: '2026-10-04',
        betrag: 980.00,
        waehrung: 'CHF',
        transaktionsId: 'TX-SKONTO-1',
        qrReferenz: qrRefInv1,
        einzahler: 'Keller Bau',
        mitteilung: '2% Skonto abgezogen'
      }
    ]

    const result = reconcileTransactionsWithInvoices(transactions, sampleInvoices)
    expect(result.reviewCount).toBe(1)
    const item = result.reconciledItems[0]
    expect(item.statusCategory).toBe('review')
    expect(item.suggestedAction).toBe('skonto')
    expect(item.skontoBetrag).toBe(20.00)
    expect(item.matchedInvoice.id).toBe(101)
  })

  it('suggests Teilzahlung when underpayment is larger than 3%', () => {
    // Paid 1500 CHF on 2500 CHF invoice -> 1000 CHF open
    const transactions = [
      {
        id: 'tx_teil',
        datum: '2026-10-04',
        betrag: 1500.00,
        waehrung: 'CHF',
        transaktionsId: 'TX-TEIL-1',
        qrReferenz: qrRefInv2,
        einzahler: 'Maria Meier',
        mitteilung: '1. Rate'
      }
    ]

    const result = reconcileTransactionsWithInvoices(transactions, sampleInvoices)
    expect(result.reviewCount).toBe(1)
    const item = result.reconciledItems[0]
    expect(item.statusCategory).toBe('review')
    expect(item.suggestedAction).toBe('teil')
    expect(item.difference).toBe(1000.00)
    expect(item.matchedInvoice.id).toBe(102)
  })

  it('matches via fuzzy text search when QR-reference is missing but invoice number is in remittance', () => {
    const transactions = [
      {
        id: 'tx_fuzzy',
        datum: '2026-10-04',
        betrag: 2500.00,
        waehrung: 'CHF',
        transaktionsId: 'TX-FUZZY-1',
        qrReferenz: null,
        einzahler: 'Frau Meier',
        mitteilung: 'Begleichung für RE-2026-102 danke'
      }
    ]

    const result = reconcileTransactionsWithInvoices(transactions, sampleInvoices)
    expect(result.matchedCount).toBe(1)
    const item = result.reconciledItems[0]
    expect(item.matchedInvoice.id).toBe(102)
    expect(item.matchType).toBe('fuzzy_text')
  })

  it('detects already booked transactions to prevent double booking', () => {
    const transactions = [
      {
        id: 'tx_duplicate',
        datum: '2026-10-01',
        betrag: 500.00,
        waehrung: 'CHF',
        transaktionsId: 'PREV-TX-99', // Matches existing bank_tx_id
        qrReferenz: null,
        einzahler: 'Felix Graf',
        mitteilung: 'Zahlung 103'
      }
    ]

    const result = reconcileTransactionsWithInvoices(transactions, sampleInvoices)
    expect(result.alreadyBookedCount).toBe(1)
    const item = result.reconciledItems[0]
    expect(item.statusCategory).toBe('already_booked')
    expect(item.isAlreadyBooked).toBe(true)
    expect(item.isSelected).toBe(false)
  })

  it('marks unknown payments as unmatched', () => {
    const transactions = [
      {
        id: 'tx_unknown',
        datum: '2026-10-04',
        betrag: 77.00,
        waehrung: 'CHF',
        transaktionsId: 'TX-UNKNOWN',
        qrReferenz: null,
        einzahler: 'Unbekannter Absender',
        mitteilung: 'Flohmarkt Einnahme'
      }
    ]

    const result = reconcileTransactionsWithInvoices(transactions, sampleInvoices)
    expect(result.unmatchedCount).toBe(1)
    const item = result.reconciledItems[0]
    expect(item.statusCategory).toBe('unmatched')
    expect(item.matchedInvoice).toBeNull()
    expect(item.isSelected).toBe(false)
  })
})
