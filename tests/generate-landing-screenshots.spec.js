import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const TARGET_DIR = './public/screenshots';

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

test('Capture high-res screenshots for landing page', async ({ page }) => {
  test.setTimeout(90000);

  // 1. Desktop Viewport (1440x900)
  await page.setViewportSize({ width: 1440, height: 900 });

  // Dashboard
  console.log('Capturing Dashboard...');
  await page.goto('/?testBypass=true');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(TARGET_DIR, '01_hero_dashboard.png') });

  // Offerten
  console.log('Capturing Offerten...');
  const offertenBtn = page.locator('button:has-text("Offerten")').first();
  if (await offertenBtn.isVisible().catch(() => false)) {
    await offertenBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(TARGET_DIR, '02_offerten_rechnungen.png') });
  }

  // Projekte / Baustellen
  console.log('Capturing Projekte...');
  const projekteBtn = page.locator('button:has-text("Projekte")').first();
  if (await projekteBtn.isVisible().catch(() => false)) {
    await projekteBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(TARGET_DIR, '03_kunden_baustellen.png') });
  }

  // Kalender
  console.log('Capturing Kalender...');
  const kalenderBtn = page.locator('button:has-text("Kalender")').first();
  if (await kalenderBtn.isVisible().catch(() => false)) {
    await kalenderBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(TARGET_DIR, '04_kalender_planung.png') });
  }

  // Buchhaltung
  console.log('Capturing Buchhaltung...');
  const buchhaltungBtn = page.locator('button:has-text("Buchhaltung")').first();
  if (await buchhaltungBtn.isVisible().catch(() => false)) {
    await buchhaltungBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(TARGET_DIR, '05_buchhaltung_belege.png') });
  }

  // 2. Mobile Viewport (iPhone: 390x844)
  console.log('Capturing Mobile Baustelle view...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?testBypass=true');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(TARGET_DIR, '06_mobile_baustelle.png') });

  console.log('All screenshots captured successfully!');
});
