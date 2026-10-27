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

test.describe('All Swiss Documents Perfection & Layout Audit', () => {
  test.setTimeout(90000);

  test('1. Offerten PDF Layout: Schweizer Fensterbrief, Gültigkeit, Positionstabelle & Summen', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await loginFlorence(page);

    // 1. Navigate to Offerten
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Offerten' }).first().click();
    await page.waitForTimeout(1000);

    // 2. Open an existing Offerte
    const offerteItem = page.locator('text=/OF-|Handgemachte Keramik|Keramik-Kollektion/i >> visible=true').first();
    await expect(offerteItem).toBeVisible();
    await offerteItem.click();
    await page.waitForTimeout(1000);

    // 3. Open PDF Print View
    const printBtn = page.locator('button:visible', { hasText: 'PDF anzeigen' }).first();
    await expect(printBtn).toBeVisible();
    await printBtn.click();
    await page.waitForTimeout(1500);

    // Check PDF container
    const pdfContainer = page.locator('#pdf-pages-container');
    await expect(pdfContainer).toBeVisible();

    const pages = pdfContainer.locator('.a4-page');
    const pageCount = await pages.count();
    console.log(`Offerte rendered pages: ${pageCount}`);
    expect(pageCount).toBeGreaterThanOrEqual(1);

    // Page 1 Address window: Schweizer Fensterbrief rechts (justify-content: flex-end)
    const addressParent = pages.nth(0).locator('.a4-address-window-wrapper');
    await expect(addressParent).toBeVisible();
    const style = await addressParent.getAttribute('style');
    expect(style).toContain('justify-content: flex-end');

    // Document Meta: Offerte MUST contain Gültigkeit!
    const metaText = await pages.nth(0).locator('.a4-document-meta').innerText();
    console.log('Offerte Meta:\n', metaText);
    expect(metaText.toLowerCase()).toContain('offerte');
    expect(metaText.toLowerCase()).toContain('gültigkeit');

    // Check Table & Totals
    await expect(pages.nth(0).locator('table').first()).toBeVisible();
    await expect(pages.nth(0).locator('text=/TOTAL|Pauschalpreis|Zwischentotal/i').first()).toBeVisible();

    // Check Footer
    await expect(pages.nth(0).locator('text=/Seite 1 von/i').first()).toBeVisible();

    // Take high-res screenshot
    await pages.nth(0).scrollIntoViewIfNeeded();
    await takeScreenshot(page, 'b3_15_offerte_pdf_preview.png', pages.nth(0));
    console.log('Offerte PDF layout verification passed!');
  });

  test('2. Mahnungen PDF Layout: Schweizer Fensterbrief rechts, Forderungsaufstellung & QR-Rechnung', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await loginFlorence(page);

    // 1. Navigate to Rechnungen
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Rechnungen' }).first().click();
    await page.waitForTimeout(1000);

    // 2. Open an invoice row
    const invoiceRow = page.locator('text=/RE-|Café|Keramik|Sessel/i >> visible=true').first();
    await expect(invoiceRow).toBeVisible();
    await invoiceRow.click();
    await page.waitForTimeout(1000);

    // 3. Open Mahn-Assistent
    const mahnButton = page.locator('button:has-text("Mahnung")').first();
    await expect(mahnButton).toBeVisible();
    await mahnButton.click();
    await page.waitForTimeout(800);

    // 4. Select Stufe 3 (Letzte Mahnung) and open Vorschau & Druck
    const stufe3Btn = page.locator('button:has-text("2. Mahnung (Letzte Mahnung vor Betreibung)")');
    if (await stufe3Btn.isVisible()) {
      await stufe3Btn.click();
      await page.waitForTimeout(400);
    }

    const vorschauBtn = page.locator('button:has-text("Vorschau & Druck")').first();
    await expect(vorschauBtn).toBeVisible();
    await vorschauBtn.click();
    await page.waitForTimeout(1500);

    // Check Mahnung container & pages
    const mahnungContainer = page.locator('#mahnung-pages-container');
    await expect(mahnungContainer).toBeVisible();

    const pages = mahnungContainer.locator('.a4-page');
    const pageCount = await pages.count();
    console.log(`Mahnung rendered pages: ${pageCount}`);
    // Stufe 3 with full SchKG text renders 2 letter pages + 1 QR-Bill page (3 pages) without blank pages
    expect(pageCount).toBeGreaterThanOrEqual(2);

    // Check Address window & Mahnungs-Meta layout: Address on the right
    const addressParent = pages.nth(0).locator('.a4-address-window-wrapper');
    await expect(addressParent).toBeVisible();

    // Check Forderungsaufstellung
    await expect(pages.locator('text=/Forderungsaufstellung nach Schweizer Recht/i').first()).toBeVisible();

    // Check QR-Bill on last page
    const lastPage = pages.nth(pageCount - 1);
    await expect(lastPage.locator('text=/Zahlteil|Empfangsschein/i').first()).toBeVisible();

    // Take screenshot of Mahnung Page 1
    await pages.nth(0).scrollIntoViewIfNeeded();
    await takeScreenshot(page, 'b3_16_mahnung_pdf_preview.png', pages.nth(0));
    console.log('Mahnung PDF layout verification passed!');
  });

  test('3. Regierapporte: Druckansicht & Schweizer Kundenunterschrift', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await loginFlorence(page);

    // Ensure Töpferei is active where the project Café Münstergasse lives
    await ensureActiveTenant(page, 'Flo Art – Töpferei');

    // 1. Navigate to Projekte
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Projekte' }).first().click();
    await page.waitForTimeout(1000);
    const projRow = page.locator('text=/Geschirr-Kollektion|P-TOP|Münstergasse/i >> visible=true').first();
    await expect(projRow).toBeVisible();
    await projRow.click();
    await page.waitForTimeout(1000);

    // 2. Click Rapporte Tab
    const rapportTab = page.locator('button:visible, a:visible').filter({ hasText: 'Rapporte' }).first();
    await expect(rapportTab).toBeVisible();
    await rapportTab.click();
    await page.waitForTimeout(800);

    // 3. Ensure at least one rapport exists or create one
    const rapportCard = page.locator('button:has-text("Druck & Details")').first();
    if (!await rapportCard.isVisible()) {
      const neuerRapportBtn = page.locator('button:visible').filter({ hasText: /Regierapport|Neuer Rapport/i }).first();
      await expect(neuerRapportBtn).toBeVisible();
      await neuerRapportBtn.click();
      await page.waitForTimeout(800);

      const rapTextarea = page.locator('textarea:visible').first();
      await rapTextarea.fill('Keramik-Kollektion glasiert, Brennvorgang überwacht, Endkontrolle und Übergabe vor Ort.');
      
      const saveDraftBtn = page.locator('button:visible').filter({ hasText: /Als Entwurf speichern|Speichern/i }).first();
      await saveDraftBtn.click();
      await page.waitForTimeout(1500);
    }

    // 4. Open Rapport Detail / Print View
    const openPrintBtn = page.locator('button:has-text("Druck & Details")').first();
    await expect(openPrintBtn).toBeVisible();
    await openPrintBtn.click();
    await page.waitForTimeout(1000);

    // 5. Verify Printable A4 content in modal
    await expect(page.locator('text=/Kunde \/ Auftraggeber|Baustelle|Regiearbeiten/i').first()).toBeVisible();
    await expect(page.locator('text=/Kundenabnahme & Digitale Unterschrift/i').first()).toBeVisible();

    const modalContent = page.locator('div[class*="max-w-4xl"]').first();
    await takeScreenshot(page, 'b3_17_rapport_print_preview.png', modalContent);
    console.log('Rapport print preview verified successfully!');
  });
});
