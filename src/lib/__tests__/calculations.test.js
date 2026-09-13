import { describe, it, expect } from 'vitest'
import { calculatePositionTotal, calculateDocumentTotals, recalculatePositions } from '../calculations'

describe('calculations.js', () => {
  describe('calculatePositionTotal', () => {
    it('calculates the total correctly', () => {
      expect(calculatePositionTotal({ menge: 2, einzelpreis: 10.5 })).toBe(21)
      expect(calculatePositionTotal({ menge: '3.5', einzelpreis: '10' })).toBe(35)
    })

    it('handles missing or invalid values (Edge Cases)', () => {
      expect(calculatePositionTotal({})).toBe(0)
      expect(calculatePositionTotal({ menge: null, einzelpreis: undefined })).toBe(0)
      expect(calculatePositionTotal({ menge: 'abc', einzelpreis: 10 })).toBe(0)
    })
  })

  describe('calculateDocumentTotals', () => {
    const leistungen = [
      { menge: 1, einzelpreis: 100 }, // 100
      { menge: 2, einzelpreis: 50 },  // 100
      { menge: 1, einzelpreis: 50, optional: true }, // 50 (optional)
    ]

    it('calculates totals without rabatt or mwst', () => {
      const totals = calculateDocumentTotals(leistungen, {})
      expect(totals.rawTotal).toBe(200)
      expect(totals.optionenTotal).toBe(50)
      expect(totals.rabattBetrag).toBe(0)
      expect(totals.totalNachRabatt).toBe(200)
      expect(totals.mwstBetrag).toBe(0)
      expect(totals.finalTotal).toBe(200)
      expect(totals.isPauschal).toBe(false)
    })

    it('calculates totals with rabatt', () => {
      const totals = calculateDocumentTotals(leistungen, { rabatt: 10 })
      expect(totals.rawTotal).toBe(200)
      expect(totals.rabattBetrag).toBe(20)
      expect(totals.totalNachRabatt).toBe(180)
      expect(totals.mwstBetrag).toBe(0)
      expect(totals.finalTotal).toBe(180)
    })

    it('calculates totals with mwst', () => {
      const totals = calculateDocumentTotals(leistungen, { mwst: 8.1 })
      expect(totals.rawTotal).toBe(200)
      expect(totals.totalNachRabatt).toBe(200)
      expect(totals.mwstBetrag).toBe(16.2)
      expect(totals.finalTotal).toBe(216.2)
    })

    it('calculates totals with rabatt AND mwst', () => {
      const totals = calculateDocumentTotals(leistungen, { rabatt: 10, mwst: 8.1 })
      expect(totals.rawTotal).toBe(200)
      expect(totals.rabattBetrag).toBe(20)
      expect(totals.totalNachRabatt).toBe(180)
      expect(totals.mwstBetrag).toBe(180 * 0.081) // 14.58
      expect(totals.finalTotal).toBe(194.6) // Swiss 5-cent rounding: 194.58 -> 194.60
    })

    it('uses pauschalpreis instead of calculated total when active', () => {
      const totals = calculateDocumentTotals(leistungen, { mwst: 8.1 }, 500)
      expect(totals.isPauschal).toBe(true)
      expect(totals.rawTotal).toBe(200)
      expect(totals.finalTotal).toBe(500) // Pauschalpreis overwrites everything
    })

    it('handles empty leistungen gracefully', () => {
      const totals = calculateDocumentTotals([], { rabatt: 10, mwst: 8.1 })
      expect(totals.rawTotal).toBe(0)
      expect(totals.finalTotal).toBe(0)
      expect(totals.optionenTotal).toBe(0)
    })
  })

  describe('recalculatePositions', () => {
    it('renumbers simple positions correctly', () => {
      const items = [
        { type: 'position' },
        { type: 'position' },
      ]
      const updated = recalculatePositions(items)
      expect(updated[0].posNr).toBe('1.1')
      expect(updated[1].posNr).toBe('1.2')
    })

    it('renumbers with titles (categories)', () => {
      const items = [
        { type: 'title', beschreibung: 'Title 1' },
        { type: 'position' },
        { type: 'position' },
        { type: 'title', beschreibung: 'Title 2' },
        { type: 'position' },
      ]
      const updated = recalculatePositions(items)
      expect(updated[0].posNr).toBe('1.0')
      expect(updated[1].posNr).toBe('1.1')
      expect(updated[2].posNr).toBe('1.2')
      expect(updated[3].posNr).toBe('2.0')
      expect(updated[4].posNr).toBe('2.1')
    })
  })
})
