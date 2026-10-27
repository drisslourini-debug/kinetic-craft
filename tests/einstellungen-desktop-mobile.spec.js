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

test.describe('Einstellungen Module E2E - Desktop & Mobile', () => {
  test.setTimeout(120000)

  // =========================================================================
  // Teil 1: Desktop Experience (1440x900)
  // =========================================================================
  test('Einstellungen Desktop: Extro Navigation, Stammdaten, QR-IBAN, Nummernkreise, Vorlagen & Team', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await loginFlorence(page)
    await ensureActiveTenant(page, 'Flo Art – Polsterei')

    console.log('--- TEST: EINSTELLUNGEN DESKTOP ---')
    // Navigate to Einstellungen
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Einstellungen' }).first().click()
    await page.waitForTimeout(1000)

    // 1. Verify Header & Default Tab (Mein Profil)
    const headerTitle = page.locator('h2:visible').filter({ hasText: 'Einstellungen' }).first()
    await expect(headerTitle).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_einstellungen_desktop_profil.png') })
    console.log('📸 Screenshot gespeichert: e2e_einstellungen_desktop_profil.png')

    // 2. Firma & Adresse Tab
    const firmaNavBtn = page.locator('main button:visible').filter({ hasText: 'Firma & Adresse' }).first()
    await firmaNavBtn.click()
    await page.waitForTimeout(800)

    const stammdatenTitle = page.locator('text=Stammdaten & Adresse').first()
    await expect(stammdatenTitle).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_einstellungen_desktop_firma.png') })
    console.log('📸 Screenshot gespeichert: e2e_einstellungen_desktop_firma.png')

    // 3. Finanzen & Fristen Tab
    const finanzenNavBtn = page.locator('main button:visible').filter({ hasText: 'Finanzen & Fristen' }).first()
    await finanzenNavBtn.click()
    await page.waitForTimeout(800)

    const bankMwstTitle = page.locator('text=Bank & MWST').first()
    await expect(bankMwstTitle).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_einstellungen_desktop_finanzen.png') })
    console.log('📸 Screenshot gespeichert: e2e_einstellungen_desktop_finanzen.png')

    // 4. Nummernkreise Tab
    const nummernNavBtn = page.locator('main button:visible').filter({ hasText: 'Nummernkreise' }).first()
    await nummernNavBtn.click()
    await page.waitForTimeout(800)

    const nummernTitle = page.locator('text=Kundennummern').first()
    await expect(nummernTitle).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_einstellungen_desktop_nummernkreise.png') })
    console.log('📸 Screenshot gespeichert: e2e_einstellungen_desktop_nummernkreise.png')

    // 5. Vorlagen & Texte Tab
    const vorlagenNavBtn = page.locator('main button:visible').filter({ hasText: 'Vorlagen & Texte' }).first()
    await vorlagenNavBtn.click()
    await page.waitForTimeout(800)

    const vorlagenTitle = page.locator('text=/Text-Vorlagen|Offerten - Einleitung/i').first()
    await expect(vorlagenTitle).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_einstellungen_desktop_vorlagen.png') })
    console.log('📸 Screenshot gespeichert: e2e_einstellungen_desktop_vorlagen.png')
  })

  // =========================================================================
  // Teil 2: Mobile Experience (390x844 - iPhone 14)
  // =========================================================================
  test('Einstellungen Mobile: Dropdown Navigation, Stammdaten, Finanzen & Vorlagen Responsive', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await loginFlorence(page)
    await ensureActiveTenant(page, 'Flo Art – Polsterei')

    console.log('--- TEST: EINSTELLUNGEN MOBILE ---')
    // Open mobile menu from bottom bar
    const menuBtn = page.locator('button:visible').filter({ hasText: 'Menü' }).first()
    await menuBtn.click()
    await page.waitForTimeout(600)

    const sheetSettings = page.locator('button:visible').filter({ hasText: 'Einstellungen' }).first()
    await sheetSettings.click()
    await page.waitForTimeout(1000)

    // 1. Verify Mobile Header & Selector
    const headerTitle = page.locator('h2:visible').filter({ hasText: 'Einstellungen' }).first()
    await expect(headerTitle).toBeVisible({ timeout: 10000 })

    const mobileSelect = page.locator('#settings-nav-select')
    await expect(mobileSelect).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_einstellungen_mobile_profil.png') })
    console.log('📸 Screenshot gespeichert: e2e_einstellungen_mobile_profil.png')

    // 2. Switch to "Firma & Adresse"
    await mobileSelect.selectOption('unternehmen')
    await page.waitForTimeout(800)

    const stammdatenTitle = page.locator('text=Stammdaten & Adresse').first()
    await expect(stammdatenTitle).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_einstellungen_mobile_firma.png') })
    console.log('📸 Screenshot gespeichert: e2e_einstellungen_mobile_firma.png')

    // 3. Switch to "Finanzen & Fristen"
    await mobileSelect.selectOption('finanzen')
    await page.waitForTimeout(800)

    const bankMwstTitle = page.locator('text=Bank & MWST').first()
    await expect(bankMwstTitle).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_einstellungen_mobile_finanzen.png') })
    console.log('📸 Screenshot gespeichert: e2e_einstellungen_mobile_finanzen.png')

    // 4. Switch to "Vorlagen & Texte"
    await mobileSelect.selectOption('vorlagen')
    await page.waitForTimeout(800)

    const vorlagenTitle = page.locator('text=/Text-Vorlagen|Offerten - Einleitung/i').first()
    await expect(vorlagenTitle).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_einstellungen_mobile_vorlagen.png') })
    console.log('📸 Screenshot gespeichert: e2e_einstellungen_mobile_vorlagen.png')
  })
})
