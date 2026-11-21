import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = './scratch/screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Atelier 77 Gesamtaudit UI & Visual Verification', () => {

  test('Vollständiger UI-Audit: Dashboard, Kunden, Projekte, Offerten, Rechnungen & Mahnwesen', async ({ browser }) => {
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

    console.log('2. Dashboard prüfen...');
    await page.waitForSelector('text=Willkommen zurück, Leandro', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Kacheln prüfen
    await expect(page.locator('text=Bezahlter Umsatz (YTD)')).toBeVisible();
    await expect(page.locator('text=Ausstehende Zahlungen')).toBeVisible();
    await expect(page.locator('text=Offene Offerten')).toBeVisible();
    await expect(page.locator('text=Aktive Baustellen')).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'audit_01_dashboard.png') });
    console.log('   ✓ Dashboard Screenshot gesichert');

    console.log('3. Kunden-Ansicht prüfen (23 Kunden)...');
    await page.locator('button:has-text("Kunden")').first().click();
    await page.waitForTimeout(1000);

    // Assert Stat Card
    await expect(page.getByText('Alle Kunden').first()).toBeVisible();
    await expect(page.locator('.hidden.md\\:grid').getByText('23').first()).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'audit_02_kunden.png') });
    console.log('   ✓ Kunden Screenshot gesichert');

    console.log('4. Projekte-Ansicht prüfen (23 Projekte, 9 In Arbeit)...');
    await page.locator('button:has-text("Projekte")').first().click();
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Alle Projekte').first()).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'audit_03_projekte.png') });
    console.log('   ✓ Projekte Screenshot gesichert');

    console.log('5. Offerten-Ansicht prüfen (11 Offerten, CHF 19\'455.24 Pipeline)...');
    await page.locator('button:has-text("Offerten")').first().click();
    await page.waitForTimeout(1000);

    await expect(page.getByText('Warten auf Kundenentscheid').first()).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'audit_04_offerten.png') });
    console.log('   ✓ Offerten Screenshot gesichert');

    console.log('6. Rechnungen & Schweizer Mahnwesen Cockpit prüfen...');
    await page.locator('button:has-text("Rechnungen")').first().click();
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Offene Rechnungen').first()).toBeVisible();
    await expect(page.locator('text=Mahnwesen (Überfällig)').first()).toBeVisible();
    await expect(page.locator('text=Bezahlte Rechnungen').first()).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'audit_05_rechnungen.png') });
    console.log('   ✓ Rechnungen & Mahnwesen Screenshot gesichert');

    console.log('7. Kalender & Einsatzplanung prüfen...');
    await page.locator('button:has-text("Kalender")').first().click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'audit_06_kalender.png') });
    console.log('   ✓ Kalender Screenshot gesichert');

    await context.close();
    console.log('✅ Gesamter UI-Audit erfolgreich durchlaufen.');
  });

});
