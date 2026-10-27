import { describe, it, expect } from 'vitest'
import {
  calculateRechnungStatus,
  canEditRechnung,
  canDeleteRechnung,
  canStornierenRechnung,
  canEditOfferte,
  canDeleteOfferte,
  isOffertePermanentlyLocked
} from '../statusLogic'

describe('Deep Status Scenarios - Exhaustive Lifecycle Matrix & Edge Cases', () => {
  const referenceDate = new Date('2026-10-23T12:00:00Z')

  describe('1. Offerten Status Matrix & Permission Rules', () => {
    const offerteStates = [
      { status: 'Entwurf', canEdit: true, canDelete: true, locked: false },
      { status: 'In Überarbeitung', canEdit: true, canDelete: true, locked: false },
      { status: 'Versendet', canEdit: false, canDelete: false, locked: false },
      { status: 'Akzeptiert', canEdit: false, canDelete: false, locked: false },
      { status: 'Verrechnet', canEdit: false, canDelete: false, locked: true },
      { status: 'Abgelehnt', canEdit: false, canDelete: false, locked: false },
    ]

    offerteStates.forEach(({ status, canEdit, canDelete, locked }) => {
      it(`evaluates permissions correctly for Offerte status "${status}"`, () => {
        const off = { status }
        expect(canEditOfferte(off)).toBe(canEdit)
        expect(canDeleteOfferte(off)).toBe(canDelete)
        expect(isOffertePermanentlyLocked(off)).toBe(locked)
      })
    })

    it('locks Offerte permanently whenever rechnung_id is set regardless of status string', () => {
      expect(isOffertePermanentlyLocked({ status: 'Akzeptiert', rechnung_id: 'rec-uuid-99' })).toBe(true)
      expect(isOffertePermanentlyLocked({ status: 'Entwurf', rechnung_id: 'rec-uuid-101' })).toBe(true)
      expect(isOffertePermanentlyLocked({ status: 'Versendet', rechnung_id: null })).toBe(false)
    })
  })

  describe('2. Rechnungen Status Matrix & GeBüV Permission Rules', () => {
    const rechnungStates = [
      { status: 'Entwurf', canEdit: true, canDelete: true, canStorno: true },
      { status: 'Versendet', canEdit: false, canDelete: false, canStorno: true },
      { status: 'Teilbezahlt', canEdit: false, canDelete: false, canStorno: true },
      { status: 'Überfällig', canEdit: false, canDelete: false, canStorno: true },
      { status: 'Gemahnt', canEdit: false, canDelete: false, canStorno: true },
      { status: 'Bezahlt', canEdit: false, canDelete: false, canStorno: false },
      { status: 'Storniert', canEdit: false, canDelete: false, canStorno: false },
    ]

    rechnungStates.forEach(({ status, canEdit, canDelete, canStorno }) => {
      it(`evaluates GeBüV permissions correctly for Rechnung status "${status}"`, () => {
        const rec = { status }
        expect(canEditRechnung(rec)).toBe(canEdit)
        expect(canDeleteRechnung(rec)).toBe(canDelete)
        expect(canStornierenRechnung(rec)).toBe(canStorno)
      })
    })
  })

  describe('3. Multi-Step Partial Payment Scenarios (Real-world day-to-day transactions)', () => {
    it('progresses correctly through 3 installments: Versendet -> Teilbezahlt -> Teilbezahlt -> Bezahlt', () => {
      const invoice = {
        status: 'Versendet',
        total: 1500.00,
        bezahlt: 0,
        faellig_am: '2026-11-30' // in future
      }

      // Step 0: Initial state
      expect(calculateRechnungStatus(invoice, referenceDate)).toBe('Versendet')

      // Step 1: Client pays 1st installment of CHF 500
      invoice.bezahlt = 500.00
      invoice.status = calculateRechnungStatus(invoice, referenceDate)
      expect(invoice.status).toBe('Teilbezahlt')
      expect(canEditRechnung(invoice)).toBe(false)
      expect(canDeleteRechnung(invoice)).toBe(false)

      // Step 2: Client pays 2nd installment of CHF 500 (total paid: 1000, remaining: 500)
      invoice.bezahlt = 1000.00
      invoice.status = calculateRechnungStatus(invoice, referenceDate)
      expect(invoice.status).toBe('Teilbezahlt')

      // Step 3: Client pays 3rd installment of CHF 500 (total paid: 1500, remaining: 0)
      invoice.bezahlt = 1500.00
      invoice.status = calculateRechnungStatus(invoice, referenceDate)
      expect(invoice.status).toBe('Bezahlt')
      expect(canEditRechnung(invoice)).toBe(false)
      expect(canDeleteRechnung(invoice)).toBe(false)
      expect(canStornierenRechnung(invoice)).toBe(false)

      // Step 4: GeBüV terminal lock: Subsequent recalculation must stay 'Bezahlt'
      expect(calculateRechnungStatus(invoice, new Date('2026-12-31'))).toBe('Bezahlt')
    })
  })

  describe('4. Swiss 5-Rappen Rounding Tolerance Edge Cases (CHF 0.05 rule)', () => {
    it('considers difference of <= CHF 0.05 as fully settled (Bezahlt)', () => {
      // 5 Rappen short on CHF 785.45
      const invoice = {
        status: 'Versendet',
        total: 785.45,
        bezahlt: 785.40,
        faellig_am: '2026-10-30'
      }
      expect(calculateRechnungStatus(invoice, referenceDate)).toBe('Bezahlt')
    })

    it('requires exact payment when difference is 6 Rappen (> CHF 0.05)', () => {
      // 6 Rappen short on CHF 785.45
      const invoiceFuture = {
        status: 'Versendet',
        total: 785.45,
        bezahlt: 785.39,
        faellig_am: '2026-10-30' // in future
      }
      expect(calculateRechnungStatus(invoiceFuture, referenceDate)).toBe('Teilbezahlt')

      const invoiceOverdue = {
        status: 'Versendet',
        total: 785.45,
        bezahlt: 785.39,
        faellig_am: '2026-10-10' // in past
      }
      expect(calculateRechnungStatus(invoiceOverdue, referenceDate)).toBe('Überfällig')
    })

    it('handles exact boundary on CHF 120.00', () => {
      expect(calculateRechnungStatus({
        status: 'Versendet',
        total: 120.00,
        bezahlt: 119.95, // diff 0.05 exactly
        faellig_am: '2026-10-10'
      }, referenceDate)).toBe('Bezahlt')

      expect(calculateRechnungStatus({
        status: 'Versendet',
        total: 120.00,
        bezahlt: 119.94, // diff 0.06
        faellig_am: '2026-10-10'
      }, referenceDate)).toBe('Überfällig')
    })
  })

  describe('5. Overdue & Dunning Retention Scenarios (Mahnwesen Stufen 1 bis 3)', () => {
    it('sets Überfällig if past due date and unpaid', () => {
      const invoice = {
        status: 'Versendet',
        total: 2500.00,
        bezahlt: 0,
        faellig_am: '2026-10-15' // 8 days past referenceDate
      }
      expect(calculateRechnungStatus(invoice, referenceDate)).toBe('Überfällig')
    })

    it('retains Überfällig when partial payment is received on an overdue invoice without dunning', () => {
      const invoice = {
        status: 'Versendet',
        total: 2500.00,
        bezahlt: 500.00, // partial payment
        faellig_am: '2026-10-15' // overdue
      }
      // Must NOT revert to 'Teilbezahlt', since remaining 2000 is overdue!
      expect(calculateRechnungStatus(invoice, referenceDate)).toBe('Überfällig')
    })

    it('sets Gemahnt when mahnstufe 1 is registered', () => {
      const invoice = {
        status: 'Überfällig',
        total: 2500.00,
        bezahlt: 0,
        faellig_am: '2026-10-15',
        daten: { mahnstufe: 1 }
      }
      expect(calculateRechnungStatus(invoice, referenceDate)).toBe('Gemahnt')
    })

    it('retains Gemahnt when a partial payment is made during active dunning', () => {
      const invoice = {
        status: 'Gemahnt',
        total: 2500.00,
        bezahlt: 1000.00, // customer paid 1000, 1500 still open
        faellig_am: '2026-10-15',
        daten: { mahnstufe: 2 }
      }
      // CRITICAL: Dunning must continue for the remainder, do not revert to Teilbezahlt
      expect(calculateRechnungStatus(invoice, referenceDate)).toBe('Gemahnt')
    })

    it('flips from Gemahnt to Bezahlt when the remaining balance is paid in full', () => {
      const invoice = {
        status: 'Gemahnt',
        total: 2500.00,
        bezahlt: 2500.00,
        faellig_am: '2026-10-15',
        daten: { mahnstufe: 3, betreibungsandrohung: true }
      }
      expect(calculateRechnungStatus(invoice, referenceDate)).toBe('Bezahlt')
    })

    it('respects the full due date until 23:59:59.999 before marking as Überfällig', () => {
      const invoice = {
        status: 'Versendet',
        total: 1000.00,
        bezahlt: 0,
        faellig_am: '2026-10-23'
      }

      // Middle of the day on due date: Still Versendet
      const duringDueDate = new Date('2026-10-23T14:30:00')
      expect(calculateRechnungStatus(invoice, duringDueDate)).toBe('Versendet')

      // Exactly at end of day on due date: Still Versendet
      const endOfDueDate = new Date('2026-10-23T23:59:59')
      expect(calculateRechnungStatus(invoice, endOfDueDate)).toBe('Versendet')

      // Next morning at 00:00:01: Now Überfällig
      const nextMorning = new Date('2026-10-24T00:00:01')
      expect(calculateRechnungStatus(invoice, nextMorning)).toBe('Überfällig')
    })
  })

  describe('6. Storno & Cancellation GeBüV Immutability', () => {
    it('allows Storno from Versendet, Teilbezahlt, Überfällig, and Gemahnt, but NEVER from Bezahlt or Storniert', () => {
      expect(canStornierenRechnung({ status: 'Versendet' })).toBe(true)
      expect(canStornierenRechnung({ status: 'Teilbezahlt' })).toBe(true)
      expect(canStornierenRechnung({ status: 'Überfällig' })).toBe(true)
      expect(canStornierenRechnung({ status: 'Gemahnt' })).toBe(true)
      expect(canStornierenRechnung({ status: 'Bezahlt' })).toBe(false)
      expect(canStornierenRechnung({ status: 'Storniert' })).toBe(false)
    })

    it('never changes Storniert status back under any circumstance', () => {
      const invoice = {
        status: 'Storniert',
        total: 3000.00,
        bezahlt: 3000.00, // Even if a payment is subsequently booked or synced
        faellig_am: '2026-10-01',
        daten: { storno_grund: 'Fehlfakturierung' }
      }
      expect(calculateRechnungStatus(invoice, referenceDate)).toBe('Storniert')
      expect(canEditRechnung(invoice)).toBe(false)
      expect(canDeleteRechnung(invoice)).toBe(false)
      expect(canStornierenRechnung(invoice)).toBe(false)
    })
  })

  describe('7. Unsaved & Entwurf Protection', () => {
    it('preserves Entwurf even if past due date if unpaid and un-dunned', () => {
      const draftInvoice = {
        status: 'Entwurf',
        total: 1000.00,
        bezahlt: 0,
        faellig_am: '2026-09-01' // in the past, but not yet sent
      }
      expect(calculateRechnungStatus(draftInvoice, referenceDate)).toBe('Entwurf')
      expect(canEditRechnung(draftInvoice)).toBe(true)
      expect(canDeleteRechnung(draftInvoice)).toBe(true)
    })
  })

  describe('8. Batch Calculation for Accounting Lists (RechnungenView simulation)', () => {
    it('correctly maps an heterogeneous list of invoices without state cross-contamination', () => {
      const invoices = [
        { id: 1, status: 'Entwurf', total: 500, bezahlt: 0, faellig_am: '2026-10-01' },
        { id: 2, status: 'Versendet', total: 1000, bezahlt: 0, faellig_am: '2026-11-15' },
        { id: 3, status: 'Versendet', total: 2000, bezahlt: 500, faellig_am: '2026-11-15' },
        { id: 4, status: 'Versendet', total: 1200, bezahlt: 0, faellig_am: '2026-10-10' },
        { id: 5, status: 'Versendet', total: 3000, bezahlt: 1000, faellig_am: '2026-10-10' },
        { id: 6, status: 'Überfällig', total: 800, bezahlt: 0, faellig_am: '2026-10-01', daten: { mahnstufe: 1 } },
        { id: 7, status: 'Gemahnt', total: 950, bezahlt: 950, faellig_am: '2026-10-01', daten: { mahnstufe: 2 } },
        { id: 8, status: 'Bezahlt', total: 400, bezahlt: 400, faellig_am: '2026-10-01' },
        { id: 9, status: 'Storniert', total: 600, bezahlt: 0, faellig_am: '2026-10-01' },
        { id: 10, status: 'Versendet', total: 100, bezahlt: 99.96, faellig_am: '2026-10-01' } // 4 Rappen diff <= 0.05
      ]

      const updated = invoices.map(r => ({
        ...r,
        calculatedStatus: calculateRechnungStatus(r, referenceDate)
      }))

      expect(updated[0].calculatedStatus).toBe('Entwurf')
      expect(updated[1].calculatedStatus).toBe('Versendet')
      expect(updated[2].calculatedStatus).toBe('Teilbezahlt')
      expect(updated[3].calculatedStatus).toBe('Überfällig')
      expect(updated[4].calculatedStatus).toBe('Überfällig')
      expect(updated[5].calculatedStatus).toBe('Gemahnt')
      expect(updated[6].calculatedStatus).toBe('Bezahlt')
      expect(updated[7].calculatedStatus).toBe('Bezahlt')
      expect(updated[8].calculatedStatus).toBe('Storniert')
      expect(updated[9].calculatedStatus).toBe('Bezahlt')
    })
  })
})
