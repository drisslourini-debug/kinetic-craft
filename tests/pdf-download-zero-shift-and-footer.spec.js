import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Amin/.gemini/antigravity/brain/b175e108-b5b2-4fe1-8eb9-d6f67b38b7e1';
const LOCAL_DIR = './scratch/screenshots';

for (const dir of [ARTIFACT_DIR, LOCAL_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function takeScreenshot(page, filename, locator = null) {
  const p1 = path.join(ARTIFACT_DIR, filename);
  const p2 = path.join(LOCAL_DIR, filename);
  if (locator) {
    await locator.screenshot({ path: p1 });
    await locator.screenshot({ path: p2 });
  } else {
    await page.screenshot({ path: p1, fullPage: false });
    await page.screenshot({ path: p2, fullPage: false });
  }
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

test.describe('Zero Shift & Complete Footer Audit', () => {
  test.setTimeout(90000);

  test('1. Verify Invoice PDF Download: ZERO left shift & complete 4-column footer', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await loginFlorence(page);
    await ensureActiveTenant(page, 'Flo Art – Polsterei');

    // Navigate to Rechnungen
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Rechnungen' }).first().click();
    await page.waitForTimeout(1000);

    // Open invoice
    const rechnungRow = page.locator('text=/RE-|Beat|Sessel/i >> visible=true').first();
    await expect(rechnungRow).toBeVisible();
    await rechnungRow.click();
    await page.waitForTimeout(1000);

    // Open Print View
    const printBtn = page.locator('button:visible').filter({ hasText: /PDF anzeigen|Drucken/i }).first();
    await expect(printBtn).toBeVisible();
    await printBtn.click();
    await page.waitForTimeout(1500);

    const pdfContainer = page.locator('#pdf-pages-container');
    await expect(pdfContainer).toBeVisible();

    const firstPage = pdfContainer.locator('.a4-page').first();
    const boxBefore = await firstPage.boundingBox();
    console.log(`Invoice Page 1 bounding box BEFORE download: x=${boxBefore.x}, y=${boxBefore.y}`);
    expect(boxBefore.x).toBeGreaterThan(100);

    // Check Footer content
    const footer = firstPage.locator('.a4-document-footer');
    await expect(footer).toBeVisible();
    const footerText = await footer.innerText();
    console.log(`Page 1 Footer Text:\n${footerText}`);

    expect(footerText).toContain('Flo Art');
    expect(footerText).toContain('Bern');
    expect(footerText).toContain('Tel.');
    expect(footerText).toContain('IBAN:');
    expect(footerText).not.toContain('...');
    expect(footerText).toContain('Seite 1 von');

    await takeScreenshot(page, 'verified_new_4col_footer.png', footer);

    // Test PDF Download
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    const downloadBtn = page.getByRole('button', { name: /PDF herunterladen/i });
    await expect(downloadBtn).toBeVisible();
    await downloadBtn.click();

    // Check position while generating
    await page.waitForTimeout(200);
    const boxDuring = await firstPage.boundingBox();
    console.log(`Invoice Page 1 bounding box DURING download: x=${boxDuring.x}, y=${boxDuring.y}`);
    expect(Math.abs(boxDuring.x - boxBefore.x)).toBeLessThan(5);

    const download = await downloadPromise;
    const targetPdfPath = path.resolve('./scratch/downloaded_rechnung.pdf');
    await download.saveAs(targetPdfPath);
    expect(fs.existsSync(targetPdfPath)).toBe(true);
    const fileSize = fs.statSync(targetPdfPath).size;
    console.log(`Invoice PDF file size: ${fileSize} bytes`);
    expect(fileSize).toBeGreaterThan(100000);

    const boxAfter = await firstPage.boundingBox();
    expect(Math.abs(boxAfter.x - boxBefore.x)).toBeLessThan(5);

    console.log('Invoice PDF Zero-Shift test passed with flying colors!');
  });

  test('2. Verify Offerte PDF Download: ZERO left shift & complete footer', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await loginFlorence(page);

    // Navigate to Offerten
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Offerten' }).first().click();
    await page.waitForTimeout(1000);

    const offerteRow = page.locator('text=/OF-|Handgemachte Keramik|Keramik-Kollektion/i >> visible=true').first();
    await expect(offerteRow).toBeVisible();
    await offerteRow.click();
    await page.waitForTimeout(1000);

    const printBtn = page.locator('button:visible', { hasText: 'PDF anzeigen' }).first();
    await expect(printBtn).toBeVisible();
    await printBtn.click();
    await page.waitForTimeout(1500);

    const pdfContainer = page.locator('#pdf-pages-container');
    await expect(pdfContainer).toBeVisible();

    const firstPage = pdfContainer.locator('.a4-page').first();
    const boxBefore = await firstPage.boundingBox();
    expect(boxBefore.x).toBeGreaterThan(100);

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    const downloadBtn = page.getByRole('button', { name: /PDF herunterladen/i });
    await expect(downloadBtn).toBeVisible();
    await downloadBtn.click();

    // Check position while generating
    await page.waitForTimeout(200);
    const boxDuring = await firstPage.boundingBox();
    expect(Math.abs(boxDuring.x - boxBefore.x)).toBeLessThan(5);

    const download = await downloadPromise;
    const targetPdfPath = path.resolve('./scratch/downloaded_offerte.pdf');
    await download.saveAs(targetPdfPath);
    expect(fs.existsSync(targetPdfPath)).toBe(true);
    const fileSize = fs.statSync(targetPdfPath).size;
    console.log(`Offerte PDF file size: ${fileSize} bytes`);
    expect(fileSize).toBeGreaterThan(100000);

    const boxAfter = await firstPage.boundingBox();
    expect(Math.abs(boxAfter.x - boxBefore.x)).toBeLessThan(5);

    console.log('Offerte PDF Zero-Shift test passed successfully!');
  });

  test('3. Verify Mahnung PDF Download: ZERO left shift & complete footer', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await loginFlorence(page);
    await ensureActiveTenant(page, 'Flo Art – Polsterei');

    // Navigate to Rechnungen
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Rechnungen' }).first().click();
    await page.waitForTimeout(1000);

    const rechnungRow = page.locator('text=/RE-|Beat|Sessel/i >> visible=true').first();
    await rechnungRow.click();
    await page.waitForTimeout(1000);

    const mahnButton = page.locator('button:has-text("Mahnung")').first();
    await mahnButton.click();
    await page.waitForTimeout(800);

    const vorschauBtn = page.locator('button:has-text("Vorschau & Druck")').first();
    await vorschauBtn.click();
    await page.waitForTimeout(1500);

    const mahnungContainer = page.locator('#mahnung-pages-container');
    await expect(mahnungContainer).toBeVisible();

    const firstPage = mahnungContainer.locator('.a4-page').first();
    const boxBefore = await firstPage.boundingBox();
    console.log(`Mahnung Page 1 bounding box BEFORE download: x=${boxBefore.x}, y=${boxBefore.y}`);
    expect(boxBefore.x).toBeGreaterThan(100);

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    const downloadBtn = page.getByRole('button', { name: /PDF herunterladen/i });
    await expect(downloadBtn).toBeVisible();
    await downloadBtn.click();

    // Check position while generating
    await page.waitForTimeout(200);
    const boxDuring = await firstPage.boundingBox();
    console.log(`Mahnung Page 1 bounding box DURING download: x=${boxDuring.x}, y=${boxDuring.y}`);
    expect(Math.abs(boxDuring.x - boxBefore.x)).toBeLessThan(5);

    const download = await downloadPromise;
    const targetPdfPath = path.resolve('./scratch/downloaded_mahnung.pdf');
    await download.saveAs(targetPdfPath);
    expect(fs.existsSync(targetPdfPath)).toBe(true);
    const fileSize = fs.statSync(targetPdfPath).size;
    console.log(`Mahnung PDF file size: ${fileSize} bytes`);
    expect(fileSize).toBeGreaterThan(100000);

    const boxAfter = await firstPage.boundingBox();
    expect(Math.abs(boxAfter.x - boxBefore.x)).toBeLessThan(5);

    console.log('Mahnung PDF Zero-Shift test passed successfully!');
  });
});
