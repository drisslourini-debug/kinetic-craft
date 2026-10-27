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

describe('statusLogic - calculateRechnungStatus', () => {
  const referenceDate = new Date('2026-10-23T12:00:00Z')

  it('keeps terminal state "Bezahlt" unconditionally (GeBüV protection)', () => {
    const r = { status: 'Bezahlt', total: 1000, bezahlt: 500, faellig_am: '2026-10-01' }
    expect(calculateRechnungStatus(r, referenceDate)).toBe('Bezahlt')
  })

  it('keeps terminal state "Storniert" unconditionally (GeBüV protection)', () => {
    const r = { status: 'Storniert', total: 1000, bezahlt: 0, faellig_am: '2026-10-01' }
    expect(calculateRechnungStatus(r, referenceDate)).toBe('Storniert')
  })

  it('automatically sets "Bezahlt" when payment reaches total within 5-Rp tolerance', () => {
    // Exact payment
    expect(calculateRechnungStatus({
      status: 'Versendet',
      total: 540.00,
      bezahlt: 540.00,
      faellig_am: '2026-10-30'
    }, referenceDate)).toBe('Bezahlt')

    // Within 5 Rappen (CHF 0.05) rounding difference
    expect(calculateRechnungStatus({
      status: 'Überfällig',
      total: 540.00,
      bezahlt: 539.95,
      faellig_am: '2026-10-01'
    }, referenceDate)).toBe('Bezahlt')

    // Overpayment
    expect(calculateRechnungStatus({
      status: 'Gemahnt',
      total: 540.00,
      bezahlt: 550.00,
      faellig_am: '2026-10-01'
    }, referenceDate)).toBe('Bezahlt')
  })

  it('preserves "Entwurf" status if unpaid and un-dunned', () => {
    const r = { status: 'Entwurf', total: 2000, bezahlt: 0, faellig_am: '2026-10-01' }
    expect(calculateRechnungStatus(r, referenceDate)).toBe('Entwurf')
  })

  it('maintains "Gemahnt" status on partial payment so dunning process continues for remainder', () => {
    const r = {
      status: 'Gemahnt',
      total: 1000,
      bezahlt: 400, // partial payment of 400
      faellig_am: '2026-10-01', // overdue
      daten: { mahnstufe: 2 }
    }
    expect(calculateRechnungStatus(r, referenceDate)).toBe('Gemahnt')
  })

  it('maintains "Überfällig" status on partial payment if overdue and un-dunned', () => {
    const r = {
      status: 'Versendet',
      total: 1000,
      bezahlt: 300,
      faellig_am: '2026-10-15', // past referenceDate
    }
    expect(calculateRechnungStatus(r, referenceDate)).toBe('Überfällig')
  })

  it('sets "Teilbezahlt" when payment received before due date and un-dunned', () => {
    const r = {
      status: 'Versendet',
      total: 1000,
      bezahlt: 250,
      faellig_am: '2026-11-15', // in future
    }
    expect(calculateRechnungStatus(r, referenceDate)).toBe('Teilbezahlt')
  })

  it('keeps "Versendet" if not overdue and no payments received', () => {
    const r = {
      status: 'Versendet',
      total: 1000,
      bezahlt: 0,
      faellig_am: '2026-11-15', // in future
    }
    expect(calculateRechnungStatus(r, referenceDate)).toBe('Versendet')
  })
})

describe('statusLogic - Permissions & Locks', () => {
  it('enforces canEditRechnung: only Entwurf can be edited', () => {
    expect(canEditRechnung({ status: 'Entwurf' })).toBe(true)
    expect(canEditRechnung({ status: 'Versendet' })).toBe(false)
    expect(canEditRechnung({ status: 'Teilbezahlt' })).toBe(false)
    expect(canEditRechnung({ status: 'Überfällig' })).toBe(false)
    expect(canEditRechnung({ status: 'Gemahnt' })).toBe(false)
    expect(canEditRechnung({ status: 'Bezahlt' })).toBe(false)
    expect(canEditRechnung({ status: 'Storniert' })).toBe(false)
  })

  it('enforces canDeleteRechnung: only Entwurf can be deleted (no number gaps)', () => {
    expect(canDeleteRechnung({ status: 'Entwurf' })).toBe(true)
    expect(canDeleteRechnung({ status: 'Versendet' })).toBe(false)
    expect(canDeleteRechnung({ status: 'Bezahlt' })).toBe(false)
    expect(canDeleteRechnung({ status: 'Storniert' })).toBe(false)
  })

  it('enforces canStornierenRechnung: unpaid, non-cancelled invoices can be cancelled', () => {
    expect(canStornierenRechnung({ status: 'Entwurf' })).toBe(true)
    expect(canStornierenRechnung({ status: 'Versendet' })).toBe(true)
    expect(canStornierenRechnung({ status: 'Teilbezahlt' })).toBe(true)
    expect(canStornierenRechnung({ status: 'Überfällig' })).toBe(true)
    expect(canStornierenRechnung({ status: 'Gemahnt' })).toBe(true)
    expect(canStornierenRechnung({ status: 'Bezahlt' })).toBe(false)
    expect(canStornierenRechnung({ status: 'Storniert' })).toBe(false)
  })

  it('enforces canEditOfferte: only Entwurf & In Überarbeitung', () => {
    expect(canEditOfferte({ status: 'Entwurf' })).toBe(true)
    expect(canEditOfferte({ status: 'In Überarbeitung' })).toBe(true)
    expect(canEditOfferte({ status: 'Versendet' })).toBe(false)
    expect(canEditOfferte({ status: 'Akzeptiert' })).toBe(false)
    expect(canEditOfferte({ status: 'Verrechnet' })).toBe(false)
    expect(canEditOfferte({ status: 'Abgelehnt' })).toBe(false)
  })

  it('enforces canDeleteOfferte: only Entwurf & In Überarbeitung', () => {
    expect(canDeleteOfferte({ status: 'Entwurf' })).toBe(true)
    expect(canDeleteOfferte({ status: 'In Überarbeitung' })).toBe(true)
    expect(canDeleteOfferte({ status: 'Akzeptiert' })).toBe(false)
    expect(canDeleteOfferte({ status: 'Verrechnet' })).toBe(false)
  })

  it('detects permanently locked offerten (Verrechnet or linked invoice)', () => {
    expect(isOffertePermanentlyLocked({ status: 'Verrechnet' })).toBe(true)
    expect(isOffertePermanentlyLocked({ status: 'Akzeptiert', rechnung_id: 'rec-123' })).toBe(true)
    expect(isOffertePermanentlyLocked({ status: 'Entwurf' })).toBe(false)
    expect(isOffertePermanentlyLocked({ status: 'Versendet' })).toBe(false)
  })
})
