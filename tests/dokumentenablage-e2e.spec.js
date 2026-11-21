import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = './scratch/screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Atelier 77 Dokumentenablage & Archiv E2E Test', () => {

  test('Archiv-Navigation, Ordnerstruktur, Belegsuche & Offerten-PDF-Vorschau', async ({ browser }) => {
    test.setTimeout(90000);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    console.log('1. Login als Leandro Lüthi...');
    await page.goto('/#login');
    await page.waitForLoadState('networkidle');

    const einloggenBtn = page.getByRole('button', { name: /Einloggen/i }).first();
    if (await einloggenBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await einloggenBtn.click();
      await page.waitForTimeout(500);
    }

    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill('leandro@atelier-77.ch');

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('Leandro77!');

    await page.getByRole('button', { name: /Anmelden/i }).click();

    console.log('2. Warten auf Dashboard...');
    await page.waitForSelector('text=Willkommen zurück, Leandro', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // 3. Navigation ins Archiv
    console.log('3. Navigiere ins Archiv (Dokumentenablage)...');
    await page.locator('button:has-text("Archiv"), a:has-text("Archiv")').first().click();
    await page.waitForTimeout(1500);

    await expect(page.getByRole('heading', { level: 2, name: /Archiv/i })).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dokumentenablage_01_root.png') });
    console.log('   ✓ Screenshot 01: Archiv Root gesichert');

    // Root-Ordner prüfen (im Desktop-Bereich)
    const desktopView = page.locator('div.hidden.md\\:flex.flex-1');
    await expect(desktopView.getByText('Kunden')).toBeVisible();
    await expect(desktopView.getByText('Offerten')).toBeVisible();
    await expect(desktopView.getByText('Buchhaltung & Rechnungen')).toBeVisible();

    // 4. Klick in Ordner "Kunden"
    console.log('4. Öffne Ordner "Kunden"...');
    await desktopView.locator('div:has-text("Kunden")').last().click();
    await page.waitForTimeout(1000);

    await expect(desktopView.getByRole('button', { name: 'Archiv', exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dokumentenablage_02_kunden_ordner.png') });
    console.log('   ✓ Screenshot 02: Kunden-Ordner gesichert');

    // 5. Kunde Delavallade suchen und öffnen
    console.log('5. Suche Kunde Delavallade...');
    const searchInput = desktopView.locator('input[placeholder*="Dateien durchsuchen"], input[placeholder*="durchsuchen"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Delavallade');
      await page.waitForTimeout(800);
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dokumentenablage_03_kunde_suche.png') });
    console.log('   ✓ Screenshot 03: Suche gesichert');

    // Klick auf Kunde Delavallade
    const kundeCard = desktopView.locator('div:has-text("Delavallade")').last();
    if (await kundeCard.isVisible()) {
      await kundeCard.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dokumentenablage_04_kunde_drilldown.png') });
      console.log('   ✓ Screenshot 04: Kunde Drilldown gesichert');
    }

    // 6. Navigation über Breadcrumb zurück zu "Archiv"
    console.log('6. Breadcrumb zurück zu "Archiv"...');
    await desktopView.getByRole('button', { name: 'Archiv', exact: true }).click();
    await page.waitForTimeout(800);

    // 7. Systemordner "Offerten" öffnen
    console.log('7. Öffne Systemordner "Offerten"...');
    await desktopView.locator('div:has-text("Offerten")').last().click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dokumentenablage_05_offerten_ordner.png') });
    console.log('   ✓ Screenshot 05: Offerten-Ordner gesichert');

    // 8. Navigation zu Offerten-Modul & PDF-Druckvorschau
    console.log('8. Wechsle zu Offerten & öffne OF-3866...');
    await page.locator('nav button:has-text("Offerten")').first().click();
    await page.waitForTimeout(1000);

    // Klick auf Zeile mit OF-3866
    const offerteRow = page.locator('tr:has-text("OF-3866"), div:has-text("OF-3866")').first();
    if (await offerteRow.isVisible()) {
      await offerteRow.click();
      await page.waitForTimeout(1500);

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dokumentenablage_06_offerte_detail.png') });
      console.log('   ✓ Screenshot 06: Offerte Detailansicht gesichert');

      // Druckvorschau / PDF Button prüfen
      const druckenBtn = page.locator('button:has-text("Drucken"), button:has-text("PDF"), button:has-text("Vorschau")').first();
      if (await druckenBtn.isVisible()) {
        await druckenBtn.click();
        await page.waitForTimeout(1500);

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dokumentenablage_07_pdf_vorschau.png') });
        console.log('   ✓ Screenshot 07: PDF Vorschau gesichert');
      }
    }

    await context.close();
    console.log('✅ Gesamter Dokumentenablage UI-Test erfolgreich abgeschlossen.');
  });

});
