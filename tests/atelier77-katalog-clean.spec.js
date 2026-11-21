import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = './scratch/screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test('Atelier 77: Verify pure company catalog in KatalogView & KatalogDrawer', async ({ browser }) => {
  test.setTimeout(60000);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('1. Logging in as Leandro...');
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

  await page.waitForSelector('text=Willkommen zurück, Leandro', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // 2. Open Katalog View
  console.log('2. Opening Katalog...');
  await page.locator('button:has-text("Katalog")').first().click();
  await page.waitForTimeout(1500);

  // Verify NPK buttons are GONE
  await expect(page.locator('button:has-text("NPK / CRB Vorlagen")')).toHaveCount(0);
  await expect(page.locator('button:has-text("Aus NPK importieren")')).toHaveCount(0);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'atelier77_katalog_no_npk.png') });
  console.log('Saved: atelier77_katalog_no_npk.png');

  // 3. Open Offerten and click first item to open editor
  console.log('3. Opening Offerten list...');
  await page.locator('button:has-text("Offerten")').first().click();
  await page.waitForTimeout(1500);

  // Click item with OFF-2026-1008
  const item = page.locator('text=OFF-2026-1008').first();
  await item.waitFor({ state: 'visible', timeout: 10000 });
  await item.click();
  await page.waitForTimeout(2000);

  // Click "Offerte bearbeiten" to enter edit mode
  console.log('4. Entering edit mode...');
  const editBtn = page.locator('button:has-text("Offerte bearbeiten")').first();
  await editBtn.waitFor({ state: 'visible', timeout: 8000 });
  await editBtn.click();
  await page.waitForTimeout(1000);

  // Click the "+ Katalog" button in OfferteDetailView
  console.log('5. Opening KatalogDrawer inside OfferteDetailView...');
  const katalogBtn = page.getByRole('main').getByRole('button', { name: 'Katalog', exact: true });
  await katalogBtn.waitFor({ state: 'visible', timeout: 8000 });
  await katalogBtn.click();
  await page.waitForTimeout(1500);

  // Verify KatalogDrawer is open and has NO NPK tab
  await expect(page.locator('text=Aus Firmenkatalog einfügen')).toBeVisible();
  await expect(page.locator('button:has-text("NPK / CRB Katalog")')).toHaveCount(0);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'atelier77_katalog_drawer_no_npk.png') });
  console.log('Saved: atelier77_katalog_drawer_no_npk.png');

  await context.close();
  console.log('✅ Clean catalog verification completed.');
});
