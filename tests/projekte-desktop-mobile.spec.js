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

test.describe('Projekte Module E2E - Desktop & Mobile', () => {
  test.setTimeout(120000)

  // =========================================================================
  // Teil 1: Desktop Experience (1440x900)
  // =========================================================================
  test('Projekte Desktop: Listenansicht, StatCards, ProjektDetail Tabs & Zurück-Navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await loginFlorence(page)
    await ensureActiveTenant(page, 'Flo Art – Polsterei')

    console.log('--- TEST: PROJEKTE DESKTOP ---')
    // 1. Navigate to Projekte via Sidebar
    const projekteNavBtn = page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Projekte' }).first()
    await projekteNavBtn.click()
    await page.waitForTimeout(1000)

    // 2. Verify Desktop Header and StatCards
    const headerTitle = page.locator('h2:visible').filter({ hasText: 'Projekte & Objekte' }).first()
    await expect(headerTitle).toBeVisible({ timeout: 10000 })

    await expect(page.locator('text=Alle Projekte').first()).toBeVisible()
    await expect(page.locator('text=In Arbeit').first()).toBeVisible()

    // Capture Desktop List Screenshot
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_projekte_desktop_list.png') })
    console.log('📸 Screenshot gespeichert: e2e_projekte_desktop_list.png')

    // 3. Open Detail View of first project row
    const projectRow = page.locator('main .divide-y > div').first()
    if (await projectRow.isVisible()) {
      await projectRow.click()
    } else {
      await page.locator('main button:has-text("Details anzeigen")').first().click()
    }
    await page.waitForTimeout(1000)

    // 4. Verify ProjectDetailView is loaded and cycle through tabs inside main
    const mainView = page.locator('main')
    const tabProjektdaten = mainView.getByRole('button', { name: /Projektdaten/i }).first()
    await expect(tabProjektdaten).toBeVisible({ timeout: 10000 })

    const tabTermine = mainView.getByRole('button', { name: /Termine/i }).first()
    if (await tabTermine.isVisible()) {
      await tabTermine.click()
      await page.waitForTimeout(400)
    }

    const tabRapporte = mainView.getByRole('button', { name: /Rapporte/i }).first()
    if (await tabRapporte.isVisible()) {
      await tabRapporte.click()
      await page.waitForTimeout(400)
    }

    const tabOfferten = mainView.getByRole('button', { name: /Offerten/i }).first()
    if (await tabOfferten.isVisible()) {
      await tabOfferten.click()
      await page.waitForTimeout(400)
    }

    await tabProjektdaten.click()
    await page.waitForTimeout(400)

    // Capture Detail View Screenshot
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_projekt_desktop_detail_tabs.png') })
    console.log('📸 Screenshot gespeichert: e2e_projekt_desktop_detail_tabs.png')

    // 5. Navigate back to project list
    const backBtn = mainView.getByRole('button', { name: /Zurück zur Übersicht/i }).first()
    await backBtn.click()
    await page.waitForTimeout(1000)

    // Verify back on project list
    await expect(headerTitle).toBeVisible({ timeout: 10000 })
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_projekte_desktop_returned.png') })
    console.log('📸 Screenshot gespeichert: e2e_projekte_desktop_returned.png')
  })

  // =========================================================================
  // Teil 2: Mobile Experience (390x844 - iPhone 14)
  // =========================================================================
  test('Projekte Mobile: BottomBar Navigation, ProjektCards, Detail Tabs & Back Button', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await loginFlorence(page)
    await ensureActiveTenant(page, 'Flo Art – Polsterei')

    console.log('--- TEST: PROJEKTE MOBILE ---')
    // 1. Navigate via Mobile TabBar
    const mobileTabBar = page.locator('nav.md\\:hidden, div.fixed.bottom-0').first()
    await mobileTabBar.waitFor({ state: 'visible', timeout: 15000 })

    const projekteTab = mobileTabBar.locator('button:has-text("Projekte")').first()
    await projekteTab.click()
    await page.waitForTimeout(1000)

    // 2. Verify Mobile Header
    const mobileHeader = page.locator('h1:visible').filter({ hasText: 'Projekte & Objekte' }).first()
    await expect(mobileHeader).toBeVisible({ timeout: 10000 })

    // Capture Mobile List Screenshot
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_projekte_mobile_list.png') })
    console.log('📸 Screenshot gespeichert: e2e_projekte_mobile_list.png')

    // 3. Tap first Project Card to open Mobile Detail View
    const firstCard = page.locator('main button:visible').filter({ hasText: /Details anzeigen/i }).first()
    if (await firstCard.isVisible()) {
      await firstCard.click()
    } else {
      const anyCard = page.locator('main .bg-surface-card, main .border-border').first()
      await anyCard.click()
    }
    await page.waitForTimeout(1000)

    // 4. Verify Mobile Detail Header and Back button
    const mobileBackBtn = page.locator('button:visible').filter({ hasText: 'Projekte' }).first()
    await expect(mobileBackBtn).toBeVisible({ timeout: 10000 })

    // Capture Mobile Detail View Screenshot
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_projekt_mobile_detail.png') })
    console.log('📸 Screenshot gespeichert: e2e_projekt_mobile_detail.png')

    // 5. Navigate back to list
    await mobileBackBtn.click()
    await page.waitForTimeout(1000)

    // Verify back on mobile list
    await expect(mobileHeader).toBeVisible({ timeout: 10000 })
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_projekte_mobile_returned.png') })
    console.log('📸 Screenshot gespeichert: e2e_projekte_mobile_returned.png')
  })
})
