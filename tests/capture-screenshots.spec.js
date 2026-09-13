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

test('Capture Screenshots of all new features', async ({ page }) => {
  test.setTimeout(120000);

  // Set desktop viewport
  await page.setViewportSize({ width: 1440, height: 900 });

  // -------------------------------------------------------------
  // 1. Dashboard: Weather Widget & Terminkalender
  // -------------------------------------------------------------
  console.log('1. Navigating to Dashboard...');
  await page.goto('/?testBypass=true');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Take Full Dashboard Screenshot
  await saveBoth(page, '01_dashboard_uebersicht.png');

  // Weather Widget Close-up
  const weatherWidget = page.locator('div:has-text("°C")').first();
  if (await weatherWidget.isVisible().catch(() => false)) {
    await saveBoth(weatherWidget, '02_weather_widget.png');
  }

  // Calendar Close-up
  const calendarSection = page.locator('div:has-text("Terminkalender")').last();
  if (await calendarSection.isVisible().catch(() => false)) {
    await saveBoth(calendarSection, '03_terminkalender.png');
  }

  // -------------------------------------------------------------
  // 2. Einstellungen: IBAN-Validierung & Kanton-Auswahl
  // -------------------------------------------------------------
  console.log('2. Navigating to Einstellungen...');
  await page.locator('button:has-text("Einstellungen")').first().click();
  await page.waitForTimeout(1000);

  // Click "Finanzen & Fristen" sub-item
  const finanzenBtn = page.locator('button:has-text("Finanzen & Fristen")').first();
  await finanzenBtn.waitFor({ state: 'visible', timeout: 10000 });
  await finanzenBtn.click();
  await page.waitForTimeout(1000);

  // Click the first "Bearbeiten" button (for Bank & MWST)
  let bearbeitenButtons = page.getByRole('button', { name: /Bearbeiten/i });
  await bearbeitenButtons.first().click();
  await page.waitForTimeout(500);

  // Fill invalid QR-IBAN to show real-time error message from ibantools
  const qrInput = page.locator('input[placeholder*="CH44"]').first();
  await qrInput.fill('CH44 0000 0000 0000 0000 0');
  await page.waitForTimeout(600);

  // Capture Bank & MWST section with live validation error
  const bankCard = page.locator('text=Bank & MWST').locator('xpath=ancestor::div[contains(@class, "bg-surface-card") or contains(@class, "rounded")]').first();
  await saveBoth(bankCard, '04_einstellungen_iban_validierung.png');

  // Cancel edit of Bank & MWST to restore "Bearbeiten" buttons
  await page.getByRole('button', { name: /Abbrechen/i }).first().click();
  await page.waitForTimeout(500);

  // Click the second "Bearbeiten" button (for Fristen & Konditionen)
  bearbeitenButtons = page.getByRole('button', { name: /Bearbeiten/i });
  await bearbeitenButtons.nth(1).click();
  await page.waitForTimeout(500);

  // Select Canton ZH in the dropdown
  const kantonSelect = page.locator('select').filter({ hasText: 'Zürich' }).first();
  if (await kantonSelect.isVisible().catch(() => false)) {
    await kantonSelect.selectOption('ZH');
    await page.waitForTimeout(500);
  }

  const fristenCard = page.locator('text=Fristen & Konditionen').locator('xpath=ancestor::div[contains(@class, "bg-surface-card") or contains(@class, "rounded")]').first();
  await saveBoth(fristenCard, '05_einstellungen_kanton_feiertage.png');

  // Cancel edit
  await page.getByRole('button', { name: /Abbrechen/i }).first().click().catch(() => {});
  await page.waitForTimeout(500);

  // -------------------------------------------------------------
  // 3. Kunden Modal: Zefix Firmensuche
  // -------------------------------------------------------------
  console.log('3. Navigating to Kunden modal for Zefix lookup...');
  await page.locator('button:has-text("Kunden")').first().click();
  await page.waitForTimeout(1000);

  const neuerKundeBtn = page.getByRole('button', { name: /Neuer Kunde/i });
  await neuerKundeBtn.waitFor({ state: 'visible', timeout: 10000 });
  await neuerKundeBtn.click();

  const modal = page.locator('.bg-white.rounded-3xl, div[role="dialog"]').first();
  await modal.waitFor({ state: 'visible', timeout: 10000 });

  // Click accordion header for Zefix to expand it
  const zefixHeader = page.getByText(/Firmensuche \(Handelsregister/i).first();
  await zefixHeader.click();
  await page.waitForTimeout(600);

  const zefixInput = page.locator('input[placeholder*="Handelsregister"]').first();
  if (await zefixInput.isVisible()) {
    await zefixInput.fill('Maler');
    await page.waitForTimeout(2500);
  }
  await saveBoth(modal, '06_zefix_firmensuche_modal.png');

  // Close modal
  await page.getByRole('button', { name: /Abbrechen/i }).click().catch(() => {});
  await page.waitForTimeout(500);

  // -------------------------------------------------------------
  // 4. Mobile Ansicht: Beleg fotografieren (Kamera) in Buchhaltung & Dateien
  // -------------------------------------------------------------
  console.log('4. Testing Mobile Camera feature...');
  await page.setViewportSize({ width: 390, height: 844 }); // iPhone 13/14 size
  await page.goto('/?testBypass=true');
  await page.waitForTimeout(1500);

  // Open "☰ Menü" in MobileTabBar
  const menuBtn = page.getByRole('button', { name: /Menü/i }).first();
  await menuBtn.waitFor({ state: 'visible', timeout: 5000 });
  await menuBtn.click();
  await page.waitForTimeout(600);

  // Click "Buchhaltung" in menu
  const buchhaltungItem = page.getByRole('button', { name: /Buchhaltung/i }).first();
  await buchhaltungItem.click();
  await page.waitForTimeout(1500);

  // Click "Ausgabe erfassen"
  const addAusgabeBtn = page.getByRole('button', { name: /Ausgabe erfassen/i }).first();
  if (await addAusgabeBtn.isVisible()) {
    await addAusgabeBtn.click();
    await page.waitForTimeout(800);

    const modalForm = page.locator('.bg-white.rounded-2xl').first();
    await saveBoth(modalForm, '07_mobile_kamera_button.png');

    // Click camera button
    const cameraBtn = page.getByRole('button', { name: /Beleg fotografieren/i }).first();
    if (await cameraBtn.isVisible()) {
      await cameraBtn.click();
      await page.waitForTimeout(1000);
      await saveBoth(page, '08_mobile_kamera_modal.png');

      const closeCam = page.getByRole('button', { name: /Schliessen/i }).first();
      await closeCam.click().catch(() => {});
      await page.waitForTimeout(500);
    }

    // Close Ausgabe modal
    await page.getByRole('button', { name: /Abbrechen/i }).first().click().catch(() => {});
    await page.waitForTimeout(500);
  }

  // Check Archiv for the mobile Foto-Button
  console.log('5. Testing Archiv mobile camera button...');
  await menuBtn.click();
  await page.waitForTimeout(600);
  const archivItem = page.getByRole('button', { name: /Archiv/i }).first();
  await archivItem.click();
  await page.waitForTimeout(1500);
  await saveBoth(page, '09_mobile_archiv_foto_button.png');

  console.log('All screenshots captured successfully!');
});
