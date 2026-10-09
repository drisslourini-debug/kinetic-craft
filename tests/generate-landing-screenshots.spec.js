import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const TARGET_DIR = './public/screenshots';

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

test('Capture high-res screenshots for landing page with Swiss Musterdaten', async ({ page }) => {
  test.setTimeout(120000);

  // 1. Desktop Viewport (1440x900)
  await page.setViewportSize({ width: 1440, height: 900 });

  // 0. Authenticate as max@muster-malerei.ch to load full Swiss Musterdaten
  console.log('Authenticating as max@muster-malerei.ch to load Swiss Musterdaten...');
  await page.goto('/#login');
  await page.waitForLoadState('networkidle');

  const einloggenBtn = page.getByRole('button', { name: /Einloggen/i }).first();
  if (await einloggenBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
    await einloggenBtn.click();
    await page.waitForTimeout(500);
  }

  const emailInput = page.locator('input[type="email"]').first();
  if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await emailInput.fill('max@muster-malerei.ch');
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('Test1234');
    await page.getByRole('button', { name: /Anmelden/i }).click();
    await page.waitForSelector('text=Dashboard', { timeout: 15000 });
    console.log('✅ Logged in successfully as max@muster-malerei.ch');
  } else {
    // Fallback if already logged in or session restored
    await page.goto('/');
    await page.waitForTimeout(2000);
  }

  // 1. Dashboard Bento
  console.log('Capturing Dashboard Bento with Muster Malerei Bern AG Musterdaten...');
  const dashboardBtn = page.locator('button:has-text("Dashboard")').first();
  if (await dashboardBtn.isVisible().catch(() => false)) {
    await dashboardBtn.click();
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: path.join(TARGET_DIR, '01_hero_dashboard.png') });
  await page.screenshot({ path: path.join(TARGET_DIR, '01_hero_dashboard_bento.png') });

  // 2. Rechnungen & Floating Print Toolbar
  console.log('Capturing Rechnungen & A4 Print Toolbar...');
  const rechnungenBtn = page.locator('button:has-text("Rechnungen")').first();
  if (await rechnungenBtn.isVisible().catch(() => false)) {
    await rechnungenBtn.click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(TARGET_DIR, '02_offerten_rechnungen.png') });
    await page.screenshot({ path: path.join(TARGET_DIR, '02_offerte_rechnung_toolbar.png') });
  }

  // 3. Kunden & Baustellen
  console.log('Capturing Kunden...');
  const kundenBtn = page.locator('button:has-text("Kunden")').first();
  if (await kundenBtn.isVisible().catch(() => false)) {
    await kundenBtn.click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(TARGET_DIR, '03_kunden_baustellen.png') });
    await page.screenshot({ path: path.join(TARGET_DIR, '03_kunden_baustellen_bento.png') });
  }

  // 4. Projekte
  console.log('Capturing Projekte...');
  const projekteBtn = page.locator('button:has-text("Projekte")').first();
  if (await projekteBtn.isVisible().catch(() => false)) {
    await projekteBtn.click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(TARGET_DIR, '03b_projekt_detail_bento.png') });
  }

  // 5. Kalender
  console.log('Capturing Kalender...');
  const kalenderBtn = page.locator('button:has-text("Kalender")').first();
  if (await kalenderBtn.isVisible().catch(() => false)) {
    await kalenderBtn.click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(TARGET_DIR, '04_kalender_planung.png') });
  }

  // 6. Buchhaltung & Banana Export
  console.log('Capturing Buchhaltung & Schweizer Treuhand...');
  const buchhaltungBtn = page.locator('button:has-text("Buchhaltung")').first();
  if (await buchhaltungBtn.isVisible().catch(() => false)) {
    await buchhaltungBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(TARGET_DIR, '05_buchhaltung_belege.png') });
  }

  // 7. Mobile Viewport (iPhone: 390x844)
  console.log('Capturing Mobile Baustelle view...');
  await page.setViewportSize({ width: 390, height: 844 });
  if (await dashboardBtn.isVisible().catch(() => false)) {
    await dashboardBtn.click();
    await page.waitForTimeout(2500);
  }
  await page.screenshot({ path: path.join(TARGET_DIR, '06_mobile_baustelle.png') });

  console.log('All fresh screenshots with Musterdaten captured successfully!');
});
