import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  parseLocation,
  formatUrl,
  registerUnsavedGuard,
  checkHasUnsavedChanges,
  VALID_VIEWS,
  VIEW_ID_PARAM_MAP,
} from '../router'

describe('router library', () => {
  it('has valid views configured', () => {
    expect(VALID_VIEWS).toContain('dashboard')
    expect(VALID_VIEWS).toContain('kunden')
    expect(VALID_VIEWS).toContain('projekte')
    expect(VALID_VIEWS).toContain('offerten')
    expect(VALID_VIEWS).toContain('rechnungen')
  })

  describe('parseLocation', () => {
    it('parses root as dashboard', () => {
      expect(parseLocation('/', '')).toEqual({ view: 'dashboard', params: {} })
      expect(parseLocation('', '')).toEqual({ view: 'dashboard', params: {} })
    })

    it('parses /dashboard as dashboard', () => {
      expect(parseLocation('/dashboard', '')).toEqual({ view: 'dashboard', params: {} })
    })

    it('parses /kunden as kunden view', () => {
      expect(parseLocation('/kunden', '')).toEqual({ view: 'kunden', params: {} })
    })

    it('parses /kunden/:id as kunden view with kundeId', () => {
      expect(parseLocation('/kunden/k-1234', '')).toEqual({
        view: 'kunden',
        params: { kundeId: 'k-1234' },
      })
    })

    it('parses /projekte/:id as projekte view with projektId', () => {
      expect(parseLocation('/projekte/p-5678', '')).toEqual({
        view: 'projekte',
        params: { projektId: 'p-5678' },
      })
    })

    it('parses /offerten/:id as offerten view with offerteId', () => {
      expect(parseLocation('/offerten/off-999', '')).toEqual({
        view: 'offerten',
        params: { offerteId: 'off-999' },
      })
    })

    it('parses /rechnungen/:id as rechnungen view with rechnungId', () => {
      expect(parseLocation('/rechnungen/rec-888', '')).toEqual({
        view: 'rechnungen',
        params: { rechnungId: 'rec-888' },
      })
    })

    it('parses query params correctly', () => {
      expect(parseLocation('/kunden', '?action=create&tab=stammdaten')).toEqual({
        view: 'kunden',
        params: { action: 'create', tab: 'stammdaten' },
      })
    })

    it('falls back to dashboard for unknown views', () => {
      expect(parseLocation('/unknown-path', '')).toEqual({
        view: 'dashboard',
        params: {},
      })
    })
  })

  describe('formatUrl', () => {
    it('formats dashboard as /', () => {
      expect(formatUrl('dashboard')).toBe('/')
    })

    it('formats view without params', () => {
      expect(formatUrl('kunden')).toBe('/kunden')
      expect(formatUrl('projekte')).toBe('/projekte')
    })

    it('formats view with id in clean path', () => {
      expect(formatUrl('kunden', { kundeId: '123' })).toBe('/kunden/123')
      expect(formatUrl('projekte', { projektId: '456' })).toBe('/projekte/456')
      expect(formatUrl('offerten', { offerteId: '789' })).toBe('/offerten/789')
      expect(formatUrl('rechnungen', { rechnungId: 'abc' })).toBe('/rechnungen/abc')
    })

    it('appends other params as query string', () => {
      expect(formatUrl('kunden', { action: 'create' })).toBe('/kunden?action=create')
      expect(
        formatUrl('projekte', { projektId: '456', tab: 'dokumente' })
      ).toBe('/projekte/456?tab=dokumente')
    })
  })

  describe('unsaved guard', () => {
    it('registers and checks unsaved changes', () => {
      expect(checkHasUnsavedChanges()).toBe(false)

      const unregister = registerUnsavedGuard(() => true)
      expect(checkHasUnsavedChanges()).toBe(true)

      unregister()
      expect(checkHasUnsavedChanges()).toBe(false)
    })
  })
})
