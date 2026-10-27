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

test.describe('Swiss Commercial PDF Layout Verification', () => {
  test.setTimeout(60000);

  test('Verify Invoice RE-2026-1003 / Rechnungen Print View Layout', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await loginFlorence(page);

    // Switch to Polsterei
    await ensureActiveTenant(page, 'Flo Art – Polsterei');

    // 1. Navigate to Rechnungen
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Rechnungen' }).first().click();
    await page.waitForTimeout(1000);

    // 2. Click on the invoice row
    const rechnungRow = page.locator('text=/RE-|Café|Keramik|Sessel|Beat/i >> visible=true').first();
    await expect(rechnungRow).toBeVisible();
    await rechnungRow.click();
    await page.waitForTimeout(1000);

    // 3. Open Print View
    const printBtn = page.locator('button:visible').filter({ hasText: /PDF anzeigen|Drucken/i }).first();
    await expect(printBtn).toBeVisible();
    await printBtn.click();
    await page.waitForTimeout(1500);

    // Check pages container
    const pdfContainer = page.locator('#pdf-pages-container');
    await expect(pdfContainer).toBeVisible();

    // Verify all rendered pages in container: Exactly 2 pages
    const pages = pdfContainer.locator('.a4-page');
    const pageCount = await pages.count();
    console.log(`Rendered .a4-page elements count: ${pageCount}`);
    expect(pageCount).toBe(2);

    // Check Page 1: Address window alignment (must be on the right for Swiss Post DIN 5008 B)
    const addressBox = pages.nth(0).locator('.a4-address-window');
    await expect(addressBox).toBeVisible();
    const addressParent = pages.nth(0).locator('.a4-address-window-wrapper');
    const parentStyle = await addressParent.getAttribute('style');
    console.log(`Address wrapper style: ${parentStyle}`);
    expect(parentStyle).toContain('justify-content: flex-end');

    // Check Document Meta: Ensure "Gültigkeit" is NOT displayed on invoice
    const metaText = await pages.nth(0).locator('.a4-document-meta').innerText();
    console.log('Page 1 Meta Text:\n', metaText);
    expect(metaText.toLowerCase()).not.toContain('gültigkeit');

    // Check Intro Text: Must NOT be "Gerne unterbreiten wir Ihnen folgende Offerte:"
    const page1Content = await pages.nth(0).innerText();
    expect(page1Content).not.toContain('folgende Offerte:');
    expect(page1Content).toMatch(/Wir danken für Ihren geschätzten Auftrag|in Rechnung/i);

    // Check Page 2: QR-Bill
    const qrPage = pages.nth(1);
    await expect(qrPage.locator('text=/Zahlteil|Empfangsschein/i').first()).toBeVisible();
    await expect(qrPage.locator('svg').first()).toBeVisible();

    // Take high-res screenshots of Page 1 and Page 2
    await pages.nth(0).scrollIntoViewIfNeeded();
    await takeScreenshot(page, 'b3_12_rechnung_pdf_preview_page1.png', pages.nth(0));

    await pages.nth(1).scrollIntoViewIfNeeded();
    await takeScreenshot(page, 'b3_13_rechnung_pdf_preview_page2.png', pages.nth(1));

    console.log('PDF Layout verification completed successfully!');
  });

  test('Verify Einstellungen: Fenster-Position Selector', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginFlorence(page);

    // Navigate to Einstellungen
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Einstellungen' }).first().click();
    await page.waitForTimeout(1000);

    // Navigate to "Unternehmen" tab
    const unternehmenBtn = page.locator('button:visible').filter({ hasText: /Unternehmen|Firma & Adresse/i }).first();
    await expect(unternehmenBtn).toBeVisible();
    await unternehmenBtn.click();
    await page.waitForTimeout(800);

    // Verify Read-Only view of Fensterbrief-Position
    const fensterRow = page.locator('text=Fensterbrief-Position');
    await expect(fensterRow).toBeVisible();
    const fensterValue = page.locator('text=Fenster rechts (Schweizer Standard · DIN 5008 B)');
    await expect(fensterValue).toBeVisible();

    // Click "Bearbeiten" on the PDF & Briefpapier Gestaltung block
    const pdfBlockHeader = page.locator('h3:has-text("PDF & Briefpapier Gestaltung")');
    await expect(pdfBlockHeader).toBeVisible();
    const pdfBlock = page.locator('div.bg-surface-card', { has: pdfBlockHeader });
    const pdfBlockEditBtn = pdfBlock.locator('button[title="Bearbeiten"]').first();
    await expect(pdfBlockEditBtn).toBeVisible();
    await pdfBlockEditBtn.click();
    await page.waitForTimeout(500);

    // Verify Schweizer Fensterbrief-Position card in edit mode
    const fensterCard = page.locator('text=Schweizer Fensterbrief-Position (Kuvert)');
    await expect(fensterCard).toBeVisible();

    const rechtsOption = page.locator('text=Fenster rechts (Schweizer Standard)');
    const linksOption = page.locator('text=Fenster links (International)');
    await expect(rechtsOption).toBeVisible();
    await expect(linksOption).toBeVisible();

    await takeScreenshot(page, 'b3_14_einstellungen_fenster_position.png');
    console.log('Einstellungen Fenster-Position verification passed!');
  });
});
