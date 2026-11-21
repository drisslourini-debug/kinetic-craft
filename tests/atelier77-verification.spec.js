import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = './scratch/screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Atelier 77 Customer Onboarding Verification', () => {

  test('1. Leandro Lüthi: Login, Dashboard, Termine & Projekte', async ({ browser }) => {
    test.setTimeout(60000);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    console.log('Navigating to login for Leandro Lüthi...');
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

    console.log('Waiting for Leandro Dashboard...');
    await page.waitForSelector('text=Willkommen zurück, Leandro', { timeout: 15000 });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'atelier77_01_leandro_dashboard.png') });

    // Verify Projekte View
    await page.locator('button:has-text("Projekte")').first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'atelier77_02_leandro_projekte.png') });

    // Verify Kalender View
    await page.locator('button:has-text("Kalender")').first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'atelier77_03_leandro_kalender.png') });

    await context.close();
    console.log('✅ Leandro Lüthi test completed successfully.');
  });

  test('2. Lorina Schmid: Login, Dashboard, Rechnungen & Offerten', async ({ browser }) => {
    test.setTimeout(60000);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    console.log('Navigating to login for Lorina Schmid...');
    await page.goto('/#login');
    await page.waitForLoadState('networkidle');

    const einloggenBtn = page.getByRole('button', { name: /Einloggen/i }).first();
    if (await einloggenBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await einloggenBtn.click();
      await page.waitForTimeout(500);
    }

    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill('info@atelier-77.ch');

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('Lorina77!');

    await page.getByRole('button', { name: /Anmelden/i }).click();

    console.log('Waiting for Lorina Dashboard...');
    await page.waitForSelector('text=Willkommen zurück, Lorina', { timeout: 15000 });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'atelier77_04_lorina_dashboard.png') });

    // Verify Rechnungen View
    await page.locator('button:has-text("Rechnungen")').first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'atelier77_05_lorina_rechnungen.png') });

    // Verify Offerten View
    await page.locator('button:has-text("Offerten")').first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'atelier77_06_lorina_offerten.png') });

    await context.close();
    console.log('✅ Lorina Schmid test completed successfully.');
  });

});
