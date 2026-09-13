import { describe, it, expect } from 'vitest'
import { sanitizeFilenamePart, generateDocumentFilename } from '../documentNaming'

describe('documentNaming', () => {
  describe('sanitizeFilenamePart', () => {
    it('normalizes German umlauts and sharp s', () => {
      expect(sanitizeFilenamePart('Müller & Söhne Grüße Überfall')).toBe('Mueller-Soehne-Gruesse-Ueberfall')
    })

    it('removes illegal filename characters and extra spaces', () => {
      expect(sanitizeFilenamePart('Neubau / Umbau: Phase *1*?')).toBe('Neubau-Umbau-Phase-1')
    })

    it('collapses multiple hyphens and trims edges', () => {
      expect(sanitizeFilenamePart('---Projekt---Test---')).toBe('Projekt-Test')
    })

    it('handles empty or null values', () => {
      expect(sanitizeFilenamePart('')).toBe('')
      expect(sanitizeFilenamePart(null)).toBe('')
      expect(sanitizeFilenamePart(undefined)).toBe('')
    })
  })

  describe('generateDocumentFilename', () => {
    it('generates full filename with type, number, customer, project, and date', () => {
      const filename = generateDocumentFilename({
        type: 'Offerte',
        docNr: 'OF-2026-001',
        kunde: { firmenname: 'Martin-Spöri GU AG' },
        projekt: { name: 'Neubau Betius' },
        date: '2026-09-13'
      })
      expect(filename).toBe('Offerte_OF-2026-001_Martin-Spoeri-GU-AG_Neubau-Betius_2026-09-13.pdf')
    })

    it('generates filename for invoice without project', () => {
      const filename = generateDocumentFilename({
        type: 'Rechnung',
        docNr: 'RE-2026-042',
        kunde: { vorname: 'Hans', nachname: 'Müller' },
        projekt: null,
        date: '2026-08-01'
      })
      expect(filename).toBe('Rechnung_RE-2026-042_Hans-Mueller_2026-08-01.pdf')
    })

    it('handles customer as string or fallback name', () => {
      const filename = generateDocumentFilename({
        type: 'Offerte',
        docNr: 'OF-100',
        kunde: 'Kunde Test AG',
        date: '2026-01-01'
      })
      expect(filename).toBe('Offerte_OF-100_Kunde-Test-AG_2026-01-01.pdf')
    })

    it('falls back cleanly when customer or docNr is missing', () => {
      const filename = generateDocumentFilename({
        type: 'Offerte',
        date: '2026-05-10'
      })
      expect(filename).toBe('Offerte_2026-05-10.pdf')
    })
  })
})
