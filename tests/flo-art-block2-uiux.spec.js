import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Amin/.gemini/antigravity/brain/b175e108-b5b2-4fe1-8eb9-d6f67b38b7e1';
const LOCAL_DIR = './scratch/screenshots';

for (const dir of [ARTIFACT_DIR, LOCAL_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function takeScreenshot(page, filename) {
  const p1 = path.join(ARTIFACT_DIR, filename);
  const p2 = path.join(LOCAL_DIR, filename);
  await page.screenshot({ path: p1, fullPage: false });
  await page.screenshot({ path: p2, fullPage: false });
  console.log(`Saved screenshot: ${filename}`);
}

async function loginFlorence(page) {
  await page.goto('/#login');
  await page.waitForLoadState('networkidle');
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill('lourini@bluewin.ch');
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill('FloArt2026!');
  await page.getByRole('button', { name: /Anmelden/i }).click();
  await page.waitForSelector('text=Flo Art', { timeout: 15000 });
}

async function ensureActiveTenant(page, targetName) {
  const isTargetAlready = await page.locator('header, aside').filter({ hasText: targetName }).first().isVisible();
  if (isTargetAlready) return;

  const switcherBtn = page.getByTitle('Betrieb / Standort wechseln').first();
  await switcherBtn.click();
  await page.waitForTimeout(600);

  const targetOption = page.locator('button:visible').filter({ hasText: targetName }).last();
  await targetOption.click();
  await page.waitForTimeout(2000);
}

test.describe('Block 2 UI/UX Quality Gate: Werkstatt & Auftragsabwicklung', () => {
  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('01. Modul 3: Projekte & Baustellen UX Deep Dive', async ({ page }) => {
    console.log('--- UI/UX AUDIT: Modul 3 Projekte ---');
    await loginFlorence(page);

    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Projekte' }).first().click();
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'b2_01_projekte_liste.png');

    // 1. Check Toolbar, Search & Filter Chips
    await expect(page.locator('h1, h2').filter({ hasText: /Projekte/i }).first()).toBeVisible();
    const searchInput = page.locator('input[placeholder*="Projekte suchen nach Name"]:visible').first();
    await expect(searchInput).toBeVisible();

    // 2. Projekt erstellen Modal & Validierung
    const neuesProjektBtn = page.locator('button:visible').filter({ hasText: 'Neues Projekt' }).first();
    await neuesProjektBtn.click();
    await page.waitForTimeout(500);
    await takeScreenshot(page, 'b2_02_projekt_create_modal.png');

    // Try submit empty to verify validation error
    const createBtn = page.locator('button[type="submit"]:visible', { hasText: 'Projekt erstellen' }).first();
    await expect(createBtn).toBeDisabled();

    // Select customer and enter name to verify button becomes enabled
    const kundeSelect = page.locator('select:visible').first();
    await kundeSelect.selectOption({ index: 1 });
    const nameInput = page.locator('input[placeholder*="Fassadensanierung"]:visible').first();
    await nameInput.fill('Flo Art Testprojekt Münstergasse');
    await expect(createBtn).toBeEnabled();

    // Close modal
    await page.locator('button:visible', { hasText: 'Abbrechen' }).first().click();
    await page.waitForTimeout(500);

    // 3. Open project detail view
    const projectRow = page.locator('text=/Geschirr-Kollektion|Keramik|Sessel/i >> visible=true').first();
    await expect(projectRow).toBeVisible();
    await projectRow.click();
    await page.waitForTimeout(1500);
    await takeScreenshot(page, 'b2_03_projekt_detail_overview.png');

    // 4. Verify all 8 Project Tabs
    await expect(page.locator('button:visible, a:visible').filter({ hasText: 'Projektdaten' }).first()).toBeVisible();
    await expect(page.locator('button:visible, a:visible').filter({ hasText: 'Termine' }).first()).toBeVisible();
    await expect(page.locator('button:visible, a:visible').filter({ hasText: 'Zeiten' }).first()).toBeVisible();
    await expect(page.locator('button:visible, a:visible').filter({ hasText: 'Rapporte' }).first()).toBeVisible();
    await expect(page.locator('button:visible, a:visible').filter({ hasText: 'Offerten' }).first()).toBeVisible();
    await expect(page.locator('button:visible, a:visible').filter({ hasText: 'Rechnungen' }).first()).toBeVisible();
    await expect(page.locator('button:visible, a:visible').filter({ hasText: 'Ausgaben' }).first()).toBeVisible();
    await expect(page.locator('button:visible, a:visible').filter({ hasText: 'Dateien' }).first()).toBeVisible();

    console.log('Modul 3 Projekte UX erfüllt alle Kriterien!');
  });

  test('02. Modul 4: Kalender, Termine & Bern-Feiertage UX', async ({ page }) => {
    console.log('--- UI/UX AUDIT: Modul 4 Kalender ---');
    await loginFlorence(page);

    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Kalender' }).first().click();
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'b2_04_kalender_monat.png');

    // 1. Calendar Title & View mode switchers
    await expect(page.locator('h1, h2').filter({ hasText: /Kalender/i }).first()).toBeVisible();
    const wocheBtn = page.locator('button:visible', { hasText: 'Woche' }).first();
    if (await wocheBtn.isVisible()) {
      await wocheBtn.click();
      await page.waitForTimeout(600);
      await takeScreenshot(page, 'b2_05_kalender_woche.png');

      // Switch back to Month
      await page.locator('button:visible', { hasText: 'Monat' }).first().click();
      await page.waitForTimeout(600);
    }

    // 2. Open "+ Neuer Termin" Modal
    const neuerTerminBtn = page.locator('button:visible').filter({ hasText: 'Neuer Termin' }).first();
    await neuerTerminBtn.click();
    await page.waitForTimeout(500);
    await takeScreenshot(page, 'b2_06_termin_modal.png');

    await expect(page.locator('text=Neuer Termin erfassen >> visible=true').first()).toBeVisible();
    await expect(page.locator('input[placeholder*="Küchenmontage"]:visible')).toBeVisible();

    // Close modal
    await page.locator('button:visible', { hasText: 'Abbrechen' }).first().click();
    await page.waitForTimeout(500);

    console.log('Modul 4 Kalender UX erfüllt alle Kriterien!');
  });

  test('03. Modul 5: Offerten-Cockpit & Editor UX', async ({ page }) => {
    console.log('--- UI/UX AUDIT: Modul 5 Offerten ---');
    await loginFlorence(page);

    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Offerten' }).first().click();
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'b2_07_offerten_liste.png');

    // 1. Filter chips & Search bar
    await expect(page.locator('h1, h2').filter({ hasText: /Offerten/i }).first()).toBeVisible();
    await expect(page.locator('input[placeholder*="Offerten suchen"]:visible').first()).toBeVisible();

    // 2. Open an existing Offerte
    const offerteItem = page.locator('text=/OF-|Handgemachte Keramik/i >> visible=true').first();
    await expect(offerteItem).toBeVisible();
    await offerteItem.click();
    await page.waitForTimeout(1500);
    await takeScreenshot(page, 'b2_08_offerte_detail.png');

    // 3. Verify Document Actions & Totals
    await expect(page.locator('text=/Total|Gesamtbetrag/i >> visible=true').first()).toBeVisible();
    await expect(page.locator('text=/8.1%|MWST/i >> visible=true').first()).toBeVisible();
    await expect(page.locator('button:visible', { hasText: 'PDF anzeigen' }).first()).toBeVisible();

    console.log('Modul 5 Offerten UX erfüllt alle Kriterien!');
  });

  test('04. Modul 9: Katalog & Leistungsverzeichnis UX', async ({ page }) => {
    console.log('--- UI/UX AUDIT: Modul 9 Katalog ---');
    await loginFlorence(page);

    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Katalog' }).first().click();
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'b2_09_katalog_liste.png');

    // 1. Check Catalog Header & Items
    await expect(page.locator('h1, h2').filter({ hasText: /Leistungskatalog/i }).first()).toBeVisible();
    await expect(page.locator('input[placeholder*="Leistungen suchen"]:visible').first()).toBeVisible();

    // 2. Open Category Modal (+ Neu)
    const neueKatBtn = page.locator('button:visible').filter({ hasText: '+ Neu' }).first();
    if (await neueKatBtn.isVisible()) {
      await neueKatBtn.click();
      await page.waitForTimeout(500);
      await takeScreenshot(page, 'b2_10_katalog_cat_modal.png');
      await expect(page.locator('h3:has-text("Neue Kategorie erstellen")')).toBeVisible();
      await page.locator('button:visible', { hasText: 'Abbrechen' }).first().click();
      await page.waitForTimeout(500);
    }

    // 3. Open NPK Modal
    const npkBtn = page.locator('button:visible').filter({ hasText: /NPK/i }).first();
    if (await npkBtn.isVisible()) {
      await npkBtn.click();
      await page.waitForTimeout(500);
      await takeScreenshot(page, 'b2_11_katalog_npk_modal.png');
      await expect(page.locator('text=/NPK|Schweizer Bau-/i >> visible=true').first()).toBeVisible();
      const closeNpkBtn = page.locator('button:visible').filter({ hasText: /Abbrechen|Schliessen/i }).first();
      if (await closeNpkBtn.isVisible()) {
        await closeNpkBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(500);
    }

    console.log('Modul 9 Katalog UX erfüllt alle Kriterien!');
  });
});
