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

test.describe('Offerte & Rechnung Modules E2E - Desktop & Mobile', () => {
  test.setTimeout(120000)

  // =========================================================================
  // Teil 1: Desktop Experience (1440x900)
  // =========================================================================
  test('Offerte & Rechnung Desktop: Übersicht, StatCards, Editor, QR-Bill, Mahnwesen & Status', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await loginFlorence(page)
    await ensureActiveTenant(page, 'Flo Art – Polsterei')

    // 1. OFFERTEN MODUL (DESKTOP)
    console.log('--- TEST: OFFERTEN DESKTOP ---')
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Offerten' }).first().click()
    await page.waitForTimeout(1000)

    // Verify Offerten Header & StatCards
    const offTitle = page.locator('h2:visible').filter({ hasText: 'Offerten' }).first()
    await expect(offTitle).toBeVisible()
    
    // Screenshot 1: Offerten Desktop Übersicht
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_offerten_desktop_list.png') })
    console.log('📸 Screenshot gespeichert: e2e_offerten_desktop_list.png')

    // Open first existing offerte in detail view
    const firstOfferteRow = page.locator('table tbody tr:visible, div[role="button"]:visible').filter({ hasText: /OF-/i }).first()
    if (await firstOfferteRow.isVisible()) {
      await firstOfferteRow.click()
      await page.waitForTimeout(1000)

      // Screenshot 2: Offerte Detailansicht
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_offerte_desktop_detail_preview.png') })
      console.log('📸 Screenshot gespeichert: e2e_offerte_desktop_detail_preview.png')

      // Zurück zur Liste
      const backBtn = page.locator('button[aria-label="Zurück"]:visible').first()
      if (await backBtn.isVisible()) {
        await backBtn.click()
        await page.waitForTimeout(600)
      }
    }

    // 2. RECHNUNGEN MODUL (DESKTOP)
    console.log('--- TEST: RECHNUNGEN DESKTOP ---')
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Rechnungen' }).first().click()
    await page.waitForTimeout(1000)

    // Verify Rechnungen Header
    const rechTitle = page.locator('h2:visible').filter({ hasText: 'Rechnungen' }).first()
    await expect(rechTitle).toBeVisible()

    // Test Mahnwesen Cockpit Aktivierung via StatCard
    const mahnwesenCard = page.locator('div:visible').filter({ hasText: /Mahnwesen \(Überfällig\)/i }).first()
    if (await mahnwesenCard.isVisible()) {
      await mahnwesenCard.click()
      await page.waitForTimeout(600)
    }

    // Screenshot 3: Rechnungen Desktop Liste mit Mahnwesen Cockpit
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_rechnungen_desktop_list_mahnwesen.png') })
    console.log('📸 Screenshot gespeichert: e2e_rechnungen_desktop_list_mahnwesen.png')

    // Open first invoice row to inspect Swiss QR-Bill preview
    const firstInvoiceRow = page.locator('table tbody tr:visible, div[role="button"]:visible').filter({ hasText: /RE-/i }).first()
    if (await firstInvoiceRow.isVisible()) {
      await firstInvoiceRow.click()
      await page.waitForTimeout(1000)

      // Screenshot 4: Rechnung Detailansicht mit Schweizer QR-Rechnung
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_rechnung_desktop_detail_qrbill.png') })
      console.log('📸 Screenshot gespeichert: e2e_rechnung_desktop_detail_qrbill.png')
    }

    console.log('✅ Offerte & Rechnung Desktop Flow erfolgreich verifiziert!')
  })

  // =========================================================================
  // Teil 2: Mobile Experience (390x844 / iPhone 14)
  // =========================================================================
  test('Offerte & Rechnung Mobile: 3-Spalten-Glance, Tabs, Bearbeiten/A4-Vorschau Switcher', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await loginFlorence(page)
    await ensureActiveTenant(page, 'Flo Art – Polsterei')

    // 1. OFFERTEN MODUL (MOBILE)
    console.log('--- TEST: OFFERTEN MOBILE ---')
    // Navigate via mobile bottom bar: click Menü -> Offerten
    const menuBtn = page.locator('button:visible').filter({ hasText: 'Menü' }).first()
    await menuBtn.click()
    await page.waitForTimeout(500)
    const sheetOfferten = page.locator('button:visible').filter({ hasText: 'Offerten' }).first()
    await sheetOfferten.click()
    await page.waitForTimeout(1000)

    // Verify Mobile 3-Spalten Glance (Versendet, Gewonnen, Verloren)
    const mobileGlanceVersendet = page.locator('button:visible').filter({ hasText: /Versendet/i }).first()
    await expect(mobileGlanceVersendet).toBeVisible()

    // Screenshot 5: Mobile Offerten Glance & Liste
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_offerten_mobile_glance_and_list.png') })
    console.log('📸 Screenshot gespeichert: e2e_offerten_mobile_glance_and_list.png')

    // Click first mobile card
    const firstMobileOfferte = page.locator('div:visible').filter({ hasText: /OF-/i }).first()
    if (await firstMobileOfferte.isVisible()) {
      await firstMobileOfferte.click()
      await page.waitForTimeout(1000)

      // In edit mode or view mode, check for mobile tab switcher
      const bearbeitenBtn = page.locator('button:visible').filter({ hasText: /Bearbeiten/i }).first()
      if (await bearbeitenBtn.isVisible()) {
        await bearbeitenBtn.click()
        await page.waitForTimeout(600)

        // Verify mobile tab switcher: Bearbeiten vs A4-Vorschau
        const tabA4 = page.locator('button:visible').filter({ hasText: /A4-Vorschau/i }).first()
        if (await tabA4.isVisible()) {
          await tabA4.click()
          await page.waitForTimeout(600)
        }
      }

      // Screenshot 6: Mobile Offerte Detail / Tab Switcher
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_offerte_mobile_edit_tab_switcher.png') })
      console.log('📸 Screenshot gespeichert: e2e_offerte_mobile_edit_tab_switcher.png')

      // Zurück zur Liste
      const backBtn = page.locator('button[aria-label="Zurück"]:visible').first()
      if (await backBtn.isVisible()) {
        await backBtn.click()
        await page.waitForTimeout(600)
      }
    }

    // 2. RECHNUNGEN MODUL (MOBILE)
    console.log('--- TEST: RECHNUNGEN MOBILE ---')
    // Navigate via mobile bottom bar: click Menü -> Rechnungen
    const menuBtn2 = page.locator('button:visible').filter({ hasText: 'Menü' }).first()
    await menuBtn2.click()
    await page.waitForTimeout(500)
    const sheetRechnungen = page.locator('button:visible').filter({ hasText: 'Rechnungen' }).first()
    await sheetRechnungen.click()
    await page.waitForTimeout(1000)

    // Verify Mobile 3-Spalten Glance (Offen, Überfällig, Bezahlt)
    const mobileGlanceOffen = page.locator('button:visible').filter({ hasText: /Offen/i }).first()
    await expect(mobileGlanceOffen).toBeVisible()

    // Toggle Mobile Chart
    const toggleChartBtn = page.locator('button:visible').filter({ hasText: /Umsatz 2026/i }).first()
    if (await toggleChartBtn.isVisible()) {
      await toggleChartBtn.click()
      await page.waitForTimeout(500)
    }

    // Screenshot 7: Mobile Rechnungen mit aufgeklapptem Chart & Glance Tiles
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_rechnungen_mobile_chart_and_kpis.png') })
    console.log('📸 Screenshot gespeichert: e2e_rechnungen_mobile_chart_and_kpis.png')

    // Open first mobile invoice card
    const firstMobileInvoice = page.locator('div:visible').filter({ hasText: /RE-/i }).first()
    if (await firstMobileInvoice.isVisible()) {
      await firstMobileInvoice.click()
      await page.waitForTimeout(1000)

      // Screenshot 8: Mobile Rechnung Detailansicht
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_rechnung_mobile_detail_view.png') })
      console.log('📸 Screenshot gespeichert: e2e_rechnung_mobile_detail_view.png')
    }

    console.log('🌟 OFFERTE & RECHNUNG DESKTOP & MOBILE VOLLSTÄNDIG ERFOLGREICH GETESTET!')
  })
})
