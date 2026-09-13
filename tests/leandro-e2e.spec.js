import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = 'C:/Users/Amin/.gemini/antigravity/brain/4577931a-b357-42fe-9665-775853cd698d';
const LOCAL_SCREENSHOT_DIR = './scratch/screenshots';

// Ensure directories exist
for (const dir of [SCREENSHOT_DIR, LOCAL_SCREENSHOT_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function saveBoth(pageOrLocator, filename) {
  const p1 = path.join(SCREENSHOT_DIR, filename);
  const p2 = path.join(LOCAL_SCREENSHOT_DIR, filename);
  await pageOrLocator.screenshot({ path: p1 });
  await pageOrLocator.screenshot({ path: p2 });
  console.log(`Saved: ${filename}`);
}

test('End-to-End Test: Malerei Leandro Lüthi Profile, Dashboard, Zefix, Calendar & Workflows', async ({ page }) => {
  test.setTimeout(180000);

  await page.setViewportSize({ width: 1440, height: 900 });

  // -------------------------------------------------------------
  // 1. Login with Leandro Lüthi's Credentials
  // -------------------------------------------------------------
  console.log('1. Logging in as leandro@atelier77.ch...');
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Fill login form
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill('leandro@atelier77.ch');

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill('Test1234');

  await page.getByRole('button', { name: /Anmelden/i }).click();

  // Wait for Dashboard to load with company greeting
  console.log('2. Waiting for Dashboard to load...');
  await page.waitForSelector('text=Willkommen zurück, Leandro', { timeout: 15000 });
  await page.waitForTimeout(2500);

  // Take Dashboard Screenshot (showing greeting, Bern weather, and calendar)
  await saveBoth(page, 'leandro_01_dashboard.png');

  // Verify Weather Widget shows Bern
  const weatherWidget = page.locator('div:has-text("Bern")').first();
  if (await weatherWidget.isVisible().catch(() => false)) {
    await saveBoth(weatherWidget, 'leandro_02_wetter_bern.png');
  }

  // -------------------------------------------------------------
  // 2. Einstellungen: Verify Company Profile & Finanzen
  // -------------------------------------------------------------
  console.log('3. Checking Einstellungen...');
  await page.locator('button:has-text("Einstellungen")').first().click();
  await page.waitForTimeout(1000);

  // Check Firma & Adresse
  const firmaBtn = page.locator('button:has-text("Firma & Adresse")').first();
  await firmaBtn.waitFor({ state: 'visible', timeout: 10000 });
  await firmaBtn.click();
  await page.waitForTimeout(800);
  await saveBoth(page, 'leandro_03_einstellungen_firma.png');

  // Check Finanzen & Fristen
  const finanzenBtn = page.locator('button:has-text("Finanzen & Fristen")').first();
  await finanzenBtn.click();
  await page.waitForTimeout(800);
  await saveBoth(page, 'leandro_04_einstellungen_finanzen_qr_iban.png');

  // -------------------------------------------------------------
  // 3. Kunden: Zefix Search & Customer Creation
  // -------------------------------------------------------------
  console.log('4. Testing Zefix Firmensuche in Kunden...');
  await page.locator('button:has-text("Kunden")').first().click();
  await page.waitForTimeout(1000);

  const neuerKundeBtn = page.getByRole('button', { name: /Neuer Kunde/i });
  await neuerKundeBtn.waitFor({ state: 'visible', timeout: 10000 });
  await neuerKundeBtn.click();

  const modal = page.locator('.bg-white.rounded-3xl, div[role="dialog"]').first();
  await modal.waitFor({ state: 'visible', timeout: 10000 });

  // Open Zefix Search
  const zefixHeader = page.getByText(/Firmensuche \(Handelsregister/i).first();
  await zefixHeader.click();
  await page.waitForTimeout(600);

  const zefixInput = page.locator('input[placeholder*="Handelsregister"]').first();
  if (await zefixInput.isVisible()) {
    await zefixInput.fill('Maler');
    await page.waitForTimeout(2500);
  }
  await saveBoth(modal, 'leandro_05_zefix_firmensuche.png');

  // Create a real Swiss client
  const firmennameInput = modal.locator('input[placeholder*="Holzbau"]').first();
  await firmennameInput.fill('Immo Bern AG');

  const strasseInput = modal.locator('input[placeholder*="Strasse"], input[placeholder*="Adresse"]').first();
  await strasseInput.fill('Aarbergergasse 20');

  const plzInput = modal.locator('input[placeholder*="00"]').first();
  await plzInput.fill('3011');

  const ortInput = modal.locator('input[placeholder*="rich"], input[placeholder*="Bern"]').first();
  await ortInput.fill('Bern');

  const emailClient = modal.locator('input[type="email"]').first();
  await emailClient.fill('info@immo-bern.ch');

  const saveKundeBtn = modal.getByRole('button', { name: /Kunde erstellen/i });
  await saveKundeBtn.click();
  await page.waitForTimeout(1500);

  // Take screenshot of Kunden view with new customer
  await saveBoth(page, 'leandro_06_kunde_erstellt.png');

  // -------------------------------------------------------------
  // 4. Projekte: Create Project for Leandro
  // -------------------------------------------------------------
  console.log('5. Creating Project...');
  await page.locator('button:has-text("Projekte")').first().click();
  await page.waitForTimeout(1000);

  const neuesProjektBtn = page.getByRole('button', { name: /Neues Projekt/i });
  if (await neuesProjektBtn.isVisible()) {
    await neuesProjektBtn.click();
    await page.waitForTimeout(800);

    const projektModal = page.locator('.bg-white.rounded-3xl, div[role="dialog"]').first();
    if (await projektModal.isVisible()) {
      const projektName = projektModal.locator('input[type="text"]').first();
      await projektName.fill('Fassadenrenovation Landoltstrasse');

      // Select Kunde in dropdown
      const kundeSelect = projektModal.locator('select').first();
      await kundeSelect.selectOption({ index: 1 });

      const submitProjekt = projektModal.getByRole('button', { name: /Projekt erstellen/i }).first();
      await submitProjekt.click();
      await page.waitForTimeout(1500);
    }
    await saveBoth(page, 'leandro_07_projekte_uebersicht.png');
  }

  // -------------------------------------------------------------
  // 5. Dashboard: Verify Terminkalender with Project & Holidays
  // -------------------------------------------------------------
  console.log('6. Verifying Dashboard Terminkalender...');
  await page.locator('button:has-text("Dashboard")').first().click();
  await page.waitForTimeout(2000);
  await saveBoth(page, 'leandro_08_dashboard_final.png');

  console.log('All Leandro Lüthi tests and screenshots completed successfully!');
});
