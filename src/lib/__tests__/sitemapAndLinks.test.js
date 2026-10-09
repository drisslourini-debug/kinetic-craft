import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { VALID_VIEWS } from '../router'
import { LEGAL_CONFIG } from '../../config/legalConfig'

describe('Sitemap & Links & Navigation Audit', () => {
  const publicDir = path.resolve(__dirname, '../../../public')

  describe('sitemap.xml', () => {
    it('exists and is valid XML', () => {
      const sitemapPath = path.join(publicDir, 'sitemap.xml')
      expect(fs.existsSync(sitemapPath)).toBe(true)

      const content = fs.readFileSync(sitemapPath, 'utf-8')
      expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(content).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
      expect(content).toContain('</urlset>')
    })

    it('contains all essential public landing and legal URLs', () => {
      const sitemapPath = path.join(publicDir, 'sitemap.xml')
      const content = fs.readFileSync(sitemapPath, 'utf-8')

      const expectedUrls = [
        'https://kinetic-craft.vercel.app/',
        'https://kinetic-craft.vercel.app/#funktionen',
        'https://kinetic-craft.vercel.app/#ki-superpowers',
        'https://kinetic-craft.vercel.app/#einblicke',
        'https://kinetic-craft.vercel.app/#baustellen-cockpit',
        'https://kinetic-craft.vercel.app/#rechner',
        'https://kinetic-craft.vercel.app/#gewerke',
        'https://kinetic-craft.vercel.app/#tarife',
        'https://kinetic-craft.vercel.app/#anfrage',
        'https://kinetic-craft.vercel.app/#faq',
        'https://kinetic-craft.vercel.app/#impressum',
        'https://kinetic-craft.vercel.app/#datenschutz',
      ]

      expectedUrls.forEach(url => {
        expect(content).toContain(`<loc>${url}</loc>`)
      })
    })
  })

  describe('robots.txt', () => {
    it('exists and references the sitemap', () => {
      const robotsPath = path.join(publicDir, 'robots.txt')
      expect(fs.existsSync(robotsPath)).toBe(true)

      const content = fs.readFileSync(robotsPath, 'utf-8')
      expect(content).toContain('User-agent: *')
      expect(content).toContain('Allow: /')
      expect(content).toContain('Sitemap: https://kinetic-craft.vercel.app/sitemap.xml')
    })
  })

  describe('Landing Page Anchor Links Integrity', () => {
    it('all href="#..." anchor links in LandingPageView resolve to existing element IDs', () => {
      const landingViewPath = path.resolve(__dirname, '../../views/LandingPageView.jsx')
      const content = fs.readFileSync(landingViewPath, 'utf-8')

      // Extract all href="#something"
      const hrefMatches = [...content.matchAll(/href="#([a-zA-Z0-9_-]+)"/g)].map(m => m[1])
      expect(hrefMatches.length).toBeGreaterThan(0)

      // Extract all id="something"
      const idMatches = new Set([...content.matchAll(/id="([a-zA-Z0-9_-]+)"/g)].map(m => m[1]))

      // Every anchor href must exist as an element id
      const uniqueHrefs = [...new Set(hrefMatches)]
      uniqueHrefs.forEach(targetId => {
        expect(
          idMatches.has(targetId),
          `Anchor href="#${targetId}" has no matching id="${targetId}" in LandingPageView.jsx`
        ).toBe(true)
      })
    })
  })

  describe('Router & Navigation Configuration', () => {
    it('all core modules are present in VALID_VIEWS without typos', () => {
      const expectedModules = [
        'dashboard',
        'kunden',
        'projekte',
        'kalender',
        'offerten',
        'rechnungen',
        'buchhaltung',
        'dateien',
        'katalog',
        'einstellungen',
      ]

      expectedModules.forEach(mod => {
        expect(VALID_VIEWS).toContain(mod)
      })
      expect(VALID_VIEWS.length).toBe(10)
    })
  })

  describe('Legal Config & Email Integrity', () => {
    it('LEGAL_CONFIG contains valid Swiss contact info and email', () => {
      expect(LEGAL_CONFIG.kontakt.email).toBe('support@ki-netic.ch')
      expect(LEGAL_CONFIG.kontakt.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      expect(LEGAL_CONFIG.firmenname).toBe('Kinetic Idrissi')
      expect(LEGAL_CONFIG.domizil.land).toBe('Schweiz')
    })
  })
})
