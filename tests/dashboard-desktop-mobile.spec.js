import { test, expect } from '@playwright/test'
import path from 'path'

const ARTIFACT_DIR = 'C:/Users/Amin/.gemini/antigravity/brain/b175e108-b5b2-4fe1-8eb9-d6f67b38b7e1'

async function loginFlorence(page) {
  await page.goto('/#login')
  await page.waitForLoadState('networkidle')
  const emailInput = page.locator('input[type="email"]').first()
  await emailInput.waitFor({ state: 'visible', timeout: 10000 })
  await emailInput.fill('lourini@bluewin.ch')
  const passwordInput = page.locator('input[type="password"]').first()
  await passwordInput.fill('FloArt2026!')
  await page.getByRole('button', { name: /Anmelden/i }).click()
  await page.locator('text=/Willkommen|Hallo/i').first().waitFor({ state: 'visible', timeout: 15000 })
}

async function ensureActiveTenant(page, targetName) {
  const isTargetAlready = await page.locator('header, aside, main').filter({ hasText: targetName }).first().isVisible()
  if (isTargetAlready) return

  const switcherBtn = page.getByTitle('Betrieb / Standort wechseln').first()
  if (await switcherBtn.isVisible()) {
    await switcherBtn.click()
    await page.waitForTimeout(600)

    const targetOption = page.locator('button:visible').filter({ hasText: targetName }).last()
    await targetOption.click()
    await page.waitForTimeout(1500)
  }
}

test.describe('Dashboard E2E - Desktop & Mobile Deep Dive', () => {
  test.setTimeout(120000)

  // =========================================================================
  // Teil 1: Desktop Experience (1440x900)
  // =========================================================================
  test('Dashboard Desktop: Header, KPI StatCards, Chart, 3-Spalten Action Center & Kalender', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await loginFlorence(page)
    await ensureActiveTenant(page, 'Flo Art – Polsterei')
    await page.waitForTimeout(1000)

    console.log('--- DESKTOP DASHBOARD TEST ---')

    // 1. Desktop Header
    const desktopHeading = page.locator('h2:visible').filter({ hasText: /Willkommen/i }).first()
    await expect(desktopHeading).toBeVisible({ timeout: 10000 })
    console.log('Desktop Header sichtbar:', await desktopHeading.textContent())

    // 2. Desktop KPI StatCards
    const kpiUmsatz = page.locator('text=Bezahlter Umsatz (YTD)').first()
    await expect(kpiUmsatz).toBeVisible()
    const kpiAusstehend = page.locator('text=Ausstehende Zahlungen').first()
    await expect(kpiAusstehend).toBeVisible()
    const kpiOfferten = page.locator('text=Offene Offerten').first()
    await expect(kpiOfferten).toBeVisible()

    // 3. Umsatzentwicklung Chart
    const chartHeading = page.locator('text=Umsatzentwicklung').first()
    await expect(chartHeading).toBeVisible()
    const chartContainer = page.locator('div.bento-card svg.recharts-surface').first()
    await expect(chartContainer).toBeVisible({ timeout: 5000 })

    // 4. Desktop Action Center (3 Spalten)
    const actionCenterTitle = page.locator('text=Deine Aufgaben (Action-Center)').first()
    await expect(actionCenterTitle).toBeVisible()

    const colUeberfaellig = page.locator('h3:visible').filter({ hasText: 'Überfällige Rechnungen' }).first()
    await expect(colUeberfaellig).toBeVisible()
    const colFeedback = page.locator('h3:visible').filter({ hasText: 'Wartet auf Feedback' }).first()
    await expect(colFeedback).toBeVisible()
    const colInArbeit = page.locator('h3:visible').filter({ hasText: 'In Bearbeitung' }).first()
    await expect(colInArbeit).toBeVisible()

    // 5. Terminkalender
    const calendarSection = page.locator('h2:visible').filter({ hasText: 'Terminkalender' }).first()
    await expect(calendarSection).toBeVisible()
    const fullCalendarBtn = page.getByRole('button', { name: /Vollständigen Kalender öffnen/i }).first()
    await expect(fullCalendarBtn).toBeVisible()

    // Screenshot Desktop
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_dashboard_desktop_full.png'), fullPage: false })
    console.log('📸 Screenshot gespeichert: e2e_dashboard_desktop_full.png')

    // 6. Navigation aus StatCard testen
    await kpiOfferten.click()
    await page.waitForTimeout(1000)
    await expect(page.locator('h1:visible, h2:visible').filter({ hasText: /Offerten/i }).first()).toBeVisible({ timeout: 5000 })

    // Zurück zum Dashboard
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Dashboard' }).first().click()
    await page.waitForTimeout(1000)
    await expect(desktopHeading).toBeVisible()
    console.log('Desktop Dashboard Navigation erfolgreich verifiziert!')
  })

  // =========================================================================
  // Teil 2: Mobile Experience (390x844 - iPhone 14)
  // =========================================================================
  test('Dashboard Mobile: Header, Glance Widgets, Quick Action Row & Segmented Task Tabs', async ({ page }) => {
    // iPhone 14 Viewport
    await page.setViewportSize({ width: 390, height: 844 })
    await loginFlorence(page)
    await ensureActiveTenant(page, 'Flo Art – Polsterei')
    await page.waitForTimeout(1000)

    console.log('--- MOBILE DASHBOARD TEST (390x844) ---')

    // 1. Mobile Header (< md)
    const mobileHeading = page.locator('h1:visible').filter({ hasText: /Hallo/i }).first()
    await expect(mobileHeading).toBeVisible({ timeout: 10000 })
    console.log('Mobile Greeting:', await mobileHeading.textContent())

    // 2. Mobile Financial Glance Widgets
    const mobileUmsatz = page.locator('text=Bezahlt (YTD)').first()
    await expect(mobileUmsatz).toBeVisible()
    const mobileAusstehend = page.locator('text=Ausstehend').first()
    await expect(mobileAusstehend).toBeVisible()

    // 3. Mobile Quick Action Row (4 Icons)
    const quickOfferte = page.locator('button:visible').filter({ hasText: /^Offerte$/i }).first()
    await expect(quickOfferte).toBeVisible()
    const quickRechnung = page.locator('button:visible').filter({ hasText: /^Rechnung$/i }).first()
    await expect(quickRechnung).toBeVisible()
    const quickKunde = page.locator('button:visible').filter({ hasText: /^Kunde$/i }).first()
    await expect(quickKunde).toBeVisible()
    const quickProjekt = page.locator('button:visible').filter({ hasText: /^Projekt$/i }).first()
    await expect(quickProjekt).toBeVisible()

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_dashboard_mobile_glance_and_quickactions.png') })
    console.log('📸 Screenshot gespeichert: e2e_dashboard_mobile_glance_and_quickactions.png')

    // 4. Mobile Segmented Control: Aufgaben & Fokus
    const aufgabenHeading = page.locator('text=Aufgaben & Fokus').first()
    await expect(aufgabenHeading).toBeVisible()

    // Tab 1: Überfällig (Default)
    const tabUeberfaellig = page.locator('button[data-tab="ueberfaellig"]:visible').first()
    await expect(tabUeberfaellig).toBeVisible()
    await tabUeberfaellig.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_dashboard_mobile_tab_ueberfaellig.png') })
    console.log('📸 Screenshot gespeichert: e2e_dashboard_mobile_tab_ueberfaellig.png')

    // Tab 2: Offerten
    const tabOfferten = page.locator('button[data-tab="offen"]:visible').first()
    await expect(tabOfferten).toBeVisible()
    await tabOfferten.click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_dashboard_mobile_tab_offerten.png') })
    console.log('📸 Screenshot gespeichert: e2e_dashboard_mobile_tab_offerten.png')

    // Tab 3: Projekte
    const tabProjekte = page.locator('button[data-tab="inArbeit"]:visible').first()
    await expect(tabProjekte).toBeVisible()
    await tabProjekte.click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_dashboard_mobile_tab_projekte.png') })
    console.log('📸 Screenshot gespeichert: e2e_dashboard_mobile_tab_projekte.png')

    // 5. Test Quick Action: Klick auf "Rechnung" öffnet Rechnungs-Erstellung
    await quickRechnung.click()
    await page.waitForTimeout(1000)
    const docModalTitle = page.locator('div.fixed h2:visible').filter({ hasText: /Neue Rechnung erstellen/i }).first()
    await expect(docModalTitle).toBeVisible({ timeout: 5000 })

    // Modal schliessen
    const closeBtn = page.locator('button:visible').filter({ hasText: /Abbrechen/i }).first()
    if (await closeBtn.isVisible()) {
      await closeBtn.click()
      await page.waitForTimeout(500)
    }

    console.log('🌟 DASHBOARD DESKTOP & MOBILE VOLLSTÄNDIG ERFOLGREICH GETESTET!')
  })
})
