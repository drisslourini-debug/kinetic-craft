import { describe, it, expect } from 'vitest'
import {
  createDefaultAusmassLine,
  calculateLineBaseDim,
  calculateAusmassLine,
  calculateAusmassTotal,
  formatAusmassMasskette,
  DEFAULT_SIA118_SCHWELLE
} from '../ausmassHelper'

describe('ausmassHelper (SIA 118 Art. 141 & Swiss Ausmass)', () => {
  it('creates default ausmass line with expected properties', () => {
    const line = createDefaultAusmassLine({ bezeichnung: 'Wand Süd' })
    expect(line.bezeichnung).toBe('Wand Süd')
    expect(line.anzahl).toBe(1)
    expect(line.abzugSchwelle).toBe(DEFAULT_SIA118_SCHWELLE)
    expect(line.isAbzug).toBe(false)
    expect(line.id).toBeDefined()
  })

  it('calculates 2D area correctly for Length x Height', () => {
    const dim = calculateLineBaseDim({ laenge: 5.0, hoehe: 2.6 })
    expect(dim.value).toBeCloseTo(13.0)
    expect(dim.type).toBe('m²')
  })

  it('calculates 3D volume correctly for Length x Width x Height', () => {
    const dim = calculateLineBaseDim({ laenge: 4.0, breite: 2.5, hoehe: 0.15 })
    expect(dim.value).toBeCloseTo(1.5)
    expect(dim.type).toBe('m³')
  })

  it('calculates 1D length correctly if only Length is given', () => {
    const dim = calculateLineBaseDim({ laenge: 12.5 })
    expect(dim.value).toBe(12.5)
    expect(dim.type).toBe('m')
  })

  it('calculates simple wall addition with anzahl', () => {
    const line = {
      anzahl: 2,
      laenge: 4.5,
      hoehe: 2.6,
      isAbzug: false
    }
    const calc = calculateAusmassLine(line)
    expect(calc.effectiveValue).toBeCloseTo(23.4)
    expect(calc.isAbzug).toBe(false)
    expect(calc.sia118Uebermessen).toBe(false)
  })

  describe('SIA 118 Art. 141 (Öffnungsabzug)', () => {
    it('übermisst (no deduction) small openings <= 2.50 m²', () => {
      // e.g. standard door 0.90 x 2.10 = 1.89 m² <= 2.50 m²
      const doorLine = {
        anzahl: 1,
        laenge: 0.90,
        hoehe: 2.10,
        isAbzug: true,
        forceAbzug: false,
        abzugSchwelle: 2.50
      }
      const calc = calculateAusmassLine(doorLine)
      expect(calc.singleItemArea).toBeCloseTo(1.89)
      expect(calc.sia118Uebermessen).toBe(true)
      expect(calc.effectiveValue).toBe(0) // Not deducted
      expect(calc.statusText).toContain('SIA 118: Übermessen')
    })

    it('deducts openings > 2.50 m²', () => {
      // e.g. large patio sliding window 2.40 x 2.20 = 5.28 m² > 2.50 m²
      const windowLine = {
        anzahl: 1,
        laenge: 2.40,
        hoehe: 2.20,
        isAbzug: true,
        forceAbzug: false,
        abzugSchwelle: 2.50
      }
      const calc = calculateAusmassLine(windowLine)
      expect(calc.singleItemArea).toBeCloseTo(5.28)
      expect(calc.sia118Uebermessen).toBe(false)
      expect(calc.effectiveValue).toBeCloseTo(-5.28)
      expect(calc.statusText).toContain('Abgezogen')
    })

    it('allows overriding SIA 118 with forceAbzug to deduct even if <= 2.50 m²', () => {
      const doorLine = {
        anzahl: 1,
        laenge: 0.90,
        hoehe: 2.00, // 1.80 m²
        isAbzug: true,
        forceAbzug: true,
        abzugSchwelle: 2.50
      }
      const calc = calculateAusmassLine(doorLine)
      expect(calc.sia118Uebermessen).toBe(false)
      expect(calc.effectiveValue).toBeCloseTo(-1.80)
      expect(calc.statusText).toBe('Manuell abgezogen')
    })
  })

  it('calculates full room ausmass total with walls, doors and large windows', () => {
    const lines = [
      // 2 long walls 5m x 2.6m = 26 m²
      { anzahl: 2, laenge: 5.0, hoehe: 2.6, isAbzug: false },
      // 2 short walls 4m x 2.6m = 20.8 m²
      { anzahl: 2, laenge: 4.0, hoehe: 2.6, isAbzug: false },
      // Small door 0.9m x 2.1m = 1.89 m² (SIA 118 übermessen -> 0 effective deduction)
      { anzahl: 1, laenge: 0.9, hoehe: 2.1, isAbzug: true, forceAbzug: false, abzugSchwelle: 2.5 },
      // Big window 3m x 2m = 6 m² (deducted!)
      { anzahl: 1, laenge: 3.0, hoehe: 2.0, isAbzug: true, forceAbzug: false, abzugSchwelle: 2.5 }
    ]

    const total = calculateAusmassTotal(lines)
    // Brutto = 26 + 20.8 = 46.80 m²
    expect(total.bruttoZuschlag).toBeCloseTo(46.80)
    // Übermessen = 1.89 m²
    expect(total.abzuegeUebermessen).toBeCloseTo(1.89)
    // Wirksam = 6.00 m²
    expect(total.abzuegeWirksam).toBeCloseTo(6.00)
    // Netto = 46.80 - 6.00 = 40.80 m²
    expect(total.nettoMenge).toBeCloseTo(40.80)
  })

  it('formats masskette nicely for documentation and print', () => {
    const wallLine = { anzahl: 2, laenge: 4.5, hoehe: 2.6, isAbzug: false }
    expect(formatAusmassMasskette(wallLine)).toBe('2 × 4.50 × 2.60 = 23.40 m²')

    const smallOpening = { anzahl: 1, laenge: 1.0, hoehe: 1.5, isAbzug: true, abzugSchwelle: 2.5 }
    expect(formatAusmassMasskette(smallOpening)).toContain('SIA 118 übermessen')
  })
})
