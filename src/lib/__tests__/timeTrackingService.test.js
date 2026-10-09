import { describe, it, expect } from 'vitest'
import {
  formatSeconds,
  roundHours,
  calculateBudgetStatus,
  timeEntriesToRapportHours,
  timeEntriesToInvoiceItems
} from '../timeTrackingService'

describe('timeTrackingService', () => {
  describe('formatSeconds', () => {
    it('formats seconds under 1 hour as MM:SS', () => {
      expect(formatSeconds(45)).toBe('00:45')
      expect(formatSeconds(125)).toBe('02:05')
      expect(formatSeconds(3599)).toBe('59:59')
    })

    it('formats durations over 1 hour as HH:MM:SS', () => {
      expect(formatSeconds(3600)).toBe('01:00:00')
      expect(formatSeconds(3665)).toBe('01:01:05')
      expect(formatSeconds(86400)).toBe('24:00:00')
    })

    it('handles negative or null values gracefully', () => {
      expect(formatSeconds(0)).toBe('00:00')
      expect(formatSeconds(-10)).toBe('00:00')
      expect(formatSeconds(null)).toBe('00:00')
    })
  })

  describe('roundHours', () => {
    it('rounds to 15-minute intervals by default', () => {
      expect(roundHours(1.12, '15min')).toBe(1.0)
      expect(roundHours(1.13, '15min')).toBe(1.25)
      expect(roundHours(1.37, '15min')).toBe(1.25)
      expect(roundHours(1.38, '15min')).toBe(1.5)
    })

    it('supports 30-minute intervals', () => {
      expect(roundHours(1.20, '30min')).toBe(1.0)
      expect(roundHours(1.30, '30min')).toBe(1.5)
    })

    it('supports exact rounding to 2 decimals', () => {
      expect(roundHours(1.234, 'exact')).toBe(1.23)
      expect(roundHours(1.236, 'exact')).toBe(1.24)
    })
  })

  describe('calculateBudgetStatus', () => {
    it('returns emerald when spent hours are well within budget (<80%)', () => {
      const status = calculateBudgetStatus(20, 50)
      expect(status.percentage).toBe(40)
      expect(status.remainingHours).toBe(30)
      expect(status.isOverBudget).toBe(false)
      expect(status.color).toBe('emerald')
    })

    it('returns amber when spent hours are between 80% and 100%', () => {
      const status = calculateBudgetStatus(42, 50)
      expect(status.percentage).toBe(84)
      expect(status.remainingHours).toBe(8)
      expect(status.isOverBudget).toBe(false)
      expect(status.color).toBe('amber')
    })

    it('returns rose when spent hours exceed the budget (>100%)', () => {
      const status = calculateBudgetStatus(55.5, 50)
      expect(status.percentage).toBe(111)
      expect(status.remainingHours).toBe(0)
      expect(status.isOverBudget).toBe(true)
      expect(status.color).toBe('rose')
      expect(status.label).toContain('5.5 h überschritten')
    })

    it('handles zero budget gracefully', () => {
      const status = calculateBudgetStatus(10, 0)
      expect(status.percentage).toBe(0)
      expect(status.label).toContain('Kein Budget')
    })
  })

  describe('timeEntriesToRapportHours', () => {
    it('maps time entries to rapport hour line items with rounded hours', () => {
      const entries = [
        { id: 1, mitarbeiter_name: 'Fabian', taetigkeit: 'Aushub', dauer_stunden: 3.12, ansatz: 90 },
        { id: 2, mitarbeiter_name: 'Urs', taetigkeit: 'Betonieren', dauer_stunden: 2.38, ansatz: 95 }
      ]

      const rapportHours = timeEntriesToRapportHours(entries)
      expect(rapportHours).toHaveLength(2)
      expect(rapportHours[0]).toEqual({
        id: '1',
        mitarbeiter: 'Fabian',
        taetigkeit: 'Aushub',
        stunden: 3.0,
        ansatz: 90
      })
      expect(rapportHours[1].stunden).toBe(2.5)
    })
  })

  describe('timeEntriesToInvoiceItems', () => {
    it('maps time entries to invoice line items with proper CHF totals', () => {
      const entries = [
        { id: 10, mitarbeiter_name: 'Fabian', taetigkeit: 'Malerarbeiten', dauer_stunden: 4.0, ansatz: 95.0, datum: '2026-10-06' }
      ]

      const items = timeEntriesToInvoiceItems(entries, 'Umbau Villa')
      expect(items).toHaveLength(1)
      expect(items[0]).toEqual(expect.objectContaining({
        titel: 'Malerarbeiten',
        menge: 4.0,
        einheit: 'Std',
        ansatz: 95.0,
        total: 380.0,
        typ: 'leistung'
      }))
    })
  })
})
