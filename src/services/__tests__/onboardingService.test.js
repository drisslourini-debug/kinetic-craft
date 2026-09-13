import { describe, it, expect } from 'vitest'
import { BRANCHEN, DEMO_DATA_PRESETS } from '../onboardingService'

describe('onboardingService', () => {
  it('defines the required Swiss trade branches with default colors and icons', () => {
    expect(BRANCHEN.length).toBeGreaterThanOrEqual(6)
    
    const branchIds = BRANCHEN.map(b => b.id)
    expect(branchIds).toContain('maler_gipser')
    expect(branchIds).toContain('schreinerei')
    expect(branchIds).toContain('sanitaer_heizung')
    expect(branchIds).toContain('elektro')
    expect(branchIds).toContain('gartenbau')
    expect(branchIds).toContain('bau_renovation')

    BRANCHEN.forEach(b => {
      expect(b.name).toBeTruthy()
      expect(b.icon).toBeTruthy()
      expect(b.defaultColor).toMatch(/^#[0-9a-fA-F]{6}$/)
    })
  })

  it('contains valid Swiss demo data for every defined branch', () => {
    BRANCHEN.forEach(branch => {
      const preset = DEMO_DATA_PRESETS[branch.id]
      expect(preset, `Preset for branch ${branch.id} should exist`).toBeDefined()
      
      // Swiss customer checks
      expect(preset.kunde).toBeDefined()
      expect(preset.kunde.land).toBe('Schweiz')
      expect(preset.kunde.plz).toMatch(/^\d{4}$/) // Swiss 4-digit PLZ
      expect(preset.kunde.notizen).toContain('[MUSTERDATEN]')
      expect(preset.kunde.telefon).toMatch(/^\+41/)

      // Swiss project checks
      expect(preset.projekt).toBeDefined()
      expect(preset.projekt.name).toBeTruthy()
      expect(preset.projekt.notizen).toContain('[MUSTERDATEN]')

      // Swiss offerte checks
      expect(preset.offerte).toBeDefined()
      expect(preset.offerte.leistungen.length).toBeGreaterThan(0)
      expect(preset.offerte.notizen).toContain('[MUSTERDATEN]')

      preset.offerte.leistungen.forEach(item => {
        expect(item.beschreibung).toBeTruthy()
        expect(item.menge).toBeGreaterThan(0)
        expect(item.einzelpreis).toBeGreaterThan(0)
        expect(item.total).toBe(Math.round(item.menge * item.einzelpreis * 100) / 100)
      })
    })
  })
})
