import { describe, it, expect } from 'vitest'
import {
  NPK_KAPITEL,
  NPK_POSITIONEN,
  getNpkChapters,
  getNpkPositionsByChapter,
  searchNpkCatalog
} from '../npkCatalog'

describe('npkCatalog (Schweizer Normpositionenkatalog CRB / NPK)', () => {
  it('contains standard Swiss construction chapters (111, 112, 211, 671, 675, 681)', () => {
    const chapters = getNpkChapters()
    expect(chapters.length).toBeGreaterThanOrEqual(6)
    const codes = chapters.map(c => c.code)
    expect(codes).toContain('111')
    expect(codes).toContain('112')
    expect(codes).toContain('671')
    expect(codes).toContain('675')
    expect(codes).toContain('681')
  })

  it('filters positions by chapter code correctly', () => {
    const malerPositions = getNpkPositionsByChapter('675')
    expect(malerPositions.length).toBeGreaterThan(0)
    malerPositions.forEach(p => {
      expect(p.kapitelCode).toBe('675')
      expect(p.npkCode.startsWith('675.')).toBe(true)
      expect(p.richtpreis).toBeGreaterThan(0)
      expect(p.einheit).toBeDefined()
    })
  })

  it('searches positions by keyword and code', () => {
    const searchByCode = searchNpkCatalog('675.211')
    expect(searchByCode.length).toBeGreaterThanOrEqual(1)
    expect(searchByCode[0].titel).toContain('Wandanstrich')

    const searchByText = searchNpkCatalog('Dispersion')
    expect(searchByText.length).toBeGreaterThanOrEqual(1)

    const searchByChapter = searchNpkCatalog('Boden', '681')
    expect(searchByChapter.length).toBeGreaterThanOrEqual(1)
    expect(searchByChapter[0].kapitelCode).toBe('681')
  })
})
