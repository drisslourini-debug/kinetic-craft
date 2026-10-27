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

test.describe('Buchhaltung Module E2E - Desktop & Mobile', () => {
  test.setTimeout(120000)

  // =========================================================================
  // Teil 1: Desktop Experience (1440x900)
  // =========================================================================
  test('Buchhaltung Desktop: Kennzahlen, OP-Liste Delkredere, ESTV Formular 200, Beleg-Modal & Export', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await loginFlorence(page)
    await ensureActiveTenant(page, 'Flo Art – Polsterei')

    console.log('--- TEST: BUCHHALTUNG DESKTOP ---')
    // 1. Navigate to Buchhaltung via Sidebar
    const buchhaltungNavBtn = page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Buchhaltung' }).first()
    await buchhaltungNavBtn.click()
    await page.waitForTimeout(1000)

    // 2. Verify Desktop Header and StatCards inside main
    const mainView = page.locator('main')
    const headerTitle = page.locator('h2:visible').filter({ hasText: /Buchhaltung/i }).first()
    await expect(headerTitle).toBeVisible({ timeout: 10000 })

    await expect(mainView.locator(':visible').filter({ hasText: /OR 957 ff\./i }).first()).toBeVisible()
    await expect(mainView.locator(':visible').filter({ hasText: 'Umsatz' }).first()).toBeVisible()
    await expect(mainView.locator(':visible').filter({ hasText: 'Aufwand' }).first()).toBeVisible()

    // Capture Desktop Overview Screenshot
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_buchhaltung_desktop_overview.png') })
    console.log('📸 Screenshot gespeichert: e2e_buchhaltung_desktop_overview.png')

    // 3. Switch to OP-Liste (Debitorenspiegel / Delkredere)
    const opListeTab = mainView.locator('button:visible').filter({ hasText: /Offene Posten/i }).first()
    await opListeTab.click()
    await page.waitForTimeout(600)

    await expect(mainView.locator(':visible').filter({ hasText: /Stichtags-Debitorenspiegel/i }).first()).toBeVisible({ timeout: 10000 })
    await expect(mainView.locator(':visible').filter({ hasText: /Delkredere 5%/i }).first()).toBeVisible()

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_buchhaltung_desktop_op_liste.png') })
    console.log('📸 Screenshot gespeichert: e2e_buchhaltung_desktop_op_liste.png')

    // 4. Switch to ESTV MWST (Formular 200)
    const estvTab = mainView.locator('button:visible').filter({ hasText: /ESTV MWST/i }).first()
    await estvTab.click()
    await page.waitForTimeout(600)

    await expect(mainView.locator(':visible').filter({ hasText: /Eidgenössische Steuerverwaltung/i }).first()).toBeVisible({ timeout: 10000 })
    await expect(mainView.locator(':visible').filter({ hasText: '200' }).first()).toBeVisible()
    await expect(mainView.locator(':visible').filter({ hasText: '500' }).first()).toBeVisible()

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_buchhaltung_desktop_estv_mwst.png') })
    console.log('📸 Screenshot gespeichert: e2e_buchhaltung_desktop_estv_mwst.png')

    // 5. Switch back to Ausgaben & Belege
    const ausgabenTab = mainView.locator('button:visible').filter({ hasText: /Ausgaben & Belege/i }).first()
    await ausgabenTab.click()
    await page.waitForTimeout(600)

    // 6. Open "Ausgabe erfassen" Modal & Verify Auto-Calculations
    const newAusgabeBtn = mainView.locator('button:visible').filter({ hasText: /Ausgabe erfassen/i }).first()
    if (await newAusgabeBtn.isVisible()) {
      await newAusgabeBtn.click()
      await page.waitForTimeout(500)

      const modalTitle = page.locator(':visible').filter({ hasText: /Neue Ausgabe erfassen/i }).first()
      await expect(modalTitle).toBeVisible({ timeout: 5000 })

      // Type title and amount
      await page.locator('input[placeholder*="Schrauben"]').fill('Polstergarn & Nadeln Bern')
      await page.locator('input[placeholder="0.00"]').fill('216.20')
      await page.waitForTimeout(400)

      await expect(page.locator(':visible').filter({ hasText: 'CHF 200.00' }).first()).toBeVisible()
      await expect(page.locator(':visible').filter({ hasText: 'CHF 16.20' }).first()).toBeVisible()

      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_buchhaltung_desktop_modal.png') })
      console.log('📸 Screenshot gespeichert: e2e_buchhaltung_desktop_modal.png')

      // Close modal via Abbrechen
      await page.locator('button:has-text("Abbrechen")').first().click()
      await page.waitForTimeout(500)
    }

    // 7. Open Export Dropdown
    const exportBtn = page.locator('button:visible').filter({ hasText: 'Exporte & Treuhand' }).first()
    await exportBtn.click()
    await page.waitForTimeout(400)

    await expect(page.locator(':visible').filter({ hasText: 'Treuhand-Revisions-ZIP' }).first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator(':visible').filter({ hasText: /Banana Doppelt/i }).first()).toBeVisible()

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_buchhaltung_desktop_export_menu.png') })
    console.log('📸 Screenshot gespeichert: e2e_buchhaltung_desktop_export_menu.png')

    // Close export dropdown
    await page.keyboard.press('Escape')
  })

  // =========================================================================
  // Teil 2: Mobile Experience (390x844 - iPhone 14)
  // =========================================================================
  test('Buchhaltung Mobile: BottomBar Menü, Kennzahlen, OP-Liste, ESTV & Filter Sheet', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await loginFlorence(page)
    await ensureActiveTenant(page, 'Flo Art – Polsterei')

    console.log('--- TEST: BUCHHALTUNG MOBILE ---')
    // 1. Open mobile bottom bar menu
    const menuBtn = page.locator('button:visible').filter({ hasText: 'Menü' }).first()
    await menuBtn.click()
    await page.waitForTimeout(600)

    const sheetBuchhaltung = page.locator('button:visible').filter({ hasText: 'Buchhaltung' }).first()
    await sheetBuchhaltung.click()
    await page.waitForTimeout(1000)

    // 2. Verify Mobile Header and KPIs
    const mobileHeader = page.locator('h2:visible').filter({ hasText: /Buchhaltung/i }).first()
    await expect(mobileHeader).toBeVisible({ timeout: 10000 })

    await expect(page.locator(':visible').filter({ hasText: /OR 957 ff\./i }).first()).toBeVisible()

    // Capture Mobile Overview Screenshot
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_buchhaltung_mobile_overview.png') })
    console.log('📸 Screenshot gespeichert: e2e_buchhaltung_mobile_overview.png')

    // 3. Switch to OP-Liste on mobile
    const mobileOpTab = page.locator('button:visible').filter({ hasText: /OP-Liste/i }).first()
    await mobileOpTab.click()
    await page.waitForTimeout(600)

    await expect(page.locator(':visible').filter({ hasText: /Stichtags-Debitorenspiegel/i }).first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator(':visible').filter({ hasText: /Delkredere 5%/i }).first()).toBeVisible()

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_buchhaltung_mobile_op_liste.png') })
    console.log('📸 Screenshot gespeichert: e2e_buchhaltung_mobile_op_liste.png')

    // 4. Switch to ESTV MWST on mobile
    const mobileEstvTab = page.locator('button:visible').filter({ hasText: /ESTV MWST/i }).first()
    await mobileEstvTab.click()
    await page.waitForTimeout(600)

    await expect(page.locator(':visible').filter({ hasText: /Ziff\. 200|Formular 200/i }).first()).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_buchhaltung_mobile_estv_mwst.png') })
    console.log('📸 Screenshot gespeichert: e2e_buchhaltung_mobile_estv_mwst.png')

    // 5. Switch back to Ausgaben and Open Mobile Filter Sheet
    const mobileAusgabenTab = page.locator('button:visible').filter({ hasText: /Ausgaben/i }).first()
    await mobileAusgabenTab.click()
    await page.waitForTimeout(600)

    const filterBtn = page.getByTitle('Filter & Suche').first()
    if (await filterBtn.isVisible()) {
      await filterBtn.click()
      await page.waitForTimeout(500)

      await expect(page.locator('input[placeholder*="Beleg, Projekt"]').first()).toBeVisible({ timeout: 5000 })

      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_buchhaltung_mobile_filter_sheet.png') })
      console.log('📸 Screenshot gespeichert: e2e_buchhaltung_mobile_filter_sheet.png')

      const closeFilter = page.locator('button[aria-label="Schliessen"]').first()
      if (await closeFilter.isVisible()) {
        await closeFilter.click()
      } else {
        await page.keyboard.press('Escape')
      }
    }
  })
})
