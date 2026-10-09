import { describe, it, expect } from 'vitest'
import { convertRapportToInvoiceItems, calculateRapportTotal } from '../rapportToInvoice'

describe('rapportToInvoice', () => {
  const sampleRapport = {
    id: 'rap-123',
    rapport_nr: 'RAP-2026-0001',
    stunden: [
      { mitarbeiter: 'Max Muster', taetigkeit: 'Risse spachteln', stunden: 3.5, ansatz: 95.00 },
      { mitarbeiter: 'Marco Keller', taetigkeit: 'Abdeckarbeiten', stunden: 2.0, ansatz: 85.00 }
    ],
    material: [
      { artikel: 'Tiefgrund 5L', menge: 2, einheit: 'Kanister', preis: 45.00 },
      { artikel: 'Abdeckvlies 50m', menge: 1, einheit: 'Rolle', preis: 65.50 }
    ]
  }

  it('converts hours and material into invoice items with correct totals', () => {
    const items = convertRapportToInvoiceItems(sampleRapport)
    expect(items).toHaveLength(4)

    // Check hour items
    expect(items[0].titel).toBe('Risse spachteln')
    expect(items[0].menge).toBe(3.5)
    expect(items[0].ansatz).toBe(95.00)
    expect(items[0].total).toBe(332.50)
    expect(items[0].typ).toBe('leistung')

    // Check material items
    expect(items[2].titel).toBe('Tiefgrund 5L')
    expect(items[2].menge).toBe(2)
    expect(items[2].total).toBe(90.00)
    expect(items[2].typ).toBe('material')
  })

  it('calculates the overall net total of a rapport', () => {
    // 332.50 + 170.00 + 90.00 + 65.50 = 658.00
    const total = calculateRapportTotal(sampleRapport)
    expect(total).toBe(658.00)
  })

  it('handles empty or malformed rapport gracefully', () => {
    expect(convertRapportToInvoiceItems(null)).toEqual([])
    expect(calculateRapportTotal(null)).toBe(0)
    expect(convertRapportToInvoiceItems({ stunden: [], material: [] })).toEqual([])
  })
})
