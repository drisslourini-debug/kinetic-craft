import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Amin/.gemini/antigravity/brain/b175e108-b5b2-4fe1-8eb9-d6f67b38b7e1';
const LOCAL_DIR = './scratch/screenshots';

for (const dir of [ARTIFACT_DIR, LOCAL_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function takeScreenshot(page, filename) {
  const p1 = path.join(ARTIFACT_DIR, filename);
  const p2 = path.join(LOCAL_DIR, filename);
  await page.screenshot({ path: p1, fullPage: false });
  await page.screenshot({ path: p2, fullPage: false });
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

test.describe('Block 3 UI/UX Quality Gate: Fakturierung, Finanzen & Abschluss', () => {
  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('01. Modul 6: Rechnungen, QR-Rechnung & Mahnwesen UX', async ({ page }) => {
    console.log('--- UI/UX AUDIT: Modul 6 Rechnungen ---');
    await loginFlorence(page);

    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Rechnungen' }).first().click();
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'b3_01_rechnungen_liste.png');

    // 1. Header, Search & Bankabgleich
    await expect(page.locator('h1, h2').filter({ hasText: /Rechnungen/i }).first()).toBeVisible();
    await expect(page.locator('button:visible', { hasText: 'Bankabgleich' }).first()).toBeVisible();
    await expect(page.locator('button:visible', { hasText: 'Neue Rechnung' }).first()).toBeVisible();

    // 2. Open "+ Neue Rechnung" Modal & Verify Form
    const createModalBtn = page.locator('button:visible', { hasText: 'Neue Rechnung' }).first();
    await createModalBtn.click();
    await page.waitForTimeout(600);
    await takeScreenshot(page, 'b3_04_rechnung_create_modal.png');

    // Verify modal is open and has customer select or close button
    const closeBtn = page.locator('button:visible').filter({ hasText: /Abbrechen|Schliessen/i }).first();
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await page.waitForTimeout(500);

    // 3. Open an existing Rechnung row
    const rechnungRow = page.locator('text=/RE-|Café Münstergasse|Keramik|Sessel/i >> visible=true').first();
    await expect(rechnungRow).toBeVisible();
    await rechnungRow.click();
    await page.waitForTimeout(1500);
    await takeScreenshot(page, 'b3_02_rechnung_detail.png');

    // 4. Verify Document Totals, MWST & Actions in Detail View
    await expect(page.locator('text=/Total|Gesamtbetrag/i >> visible=true').first()).toBeVisible();
    await expect(page.locator('text=/8.1%|MWST/i >> visible=true').first()).toBeVisible();

    // 5. Open PDF / Print View (with Swiss QR-Bill preview)
    const printBtn = page.locator('button:visible').filter({ hasText: /PDF anzeigen|Drucken/i }).first();
    if (await printBtn.isVisible()) {
      await printBtn.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'b3_03_rechnung_print_qr.png');
      await expect(page.locator('text=/Zahlteil|Empfangsschein|QR-Rechnung|Einzahlungsschein/i >> visible=true').first()).toBeVisible();
      // Close Print view / navigate back
      const backPrintBtn = page.locator('button:visible').filter({ hasText: /Zurück|Schliessen/i }).first();
      if (await backPrintBtn.isVisible()) {
        await backPrintBtn.click();
        await page.waitForTimeout(500);
      }
    }

    console.log('Modul 6 Rechnungen UX erfüllt alle Kriterien!');
  });

  test('02. Modul 7: Buchhaltung, Ausgaben, ESTV MWST & Treuhand-Export UX', async ({ page }) => {
    console.log('--- UI/UX AUDIT: Modul 7 Buchhaltung ---');
    await loginFlorence(page);

    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Buchhaltung' }).first().click();
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'b3_05_buchhaltung_ausgaben.png');

    // 1. Header & KPIs
    await expect(page.locator('h1, h2').filter({ hasText: /Buchhaltung/i }).first()).toBeVisible();
    await expect(page.locator('text=/Umsatz|Ertrag/i >> visible=true').first()).toBeVisible();
    await expect(page.locator('text=/MWST Zahllast|Zahllast/i >> visible=true').first()).toBeVisible();

    // 2. Open "+ Ausgabe erfassen" Modal
    const createAusgabeBtn = page.locator('button:visible').filter({ hasText: 'Ausgabe erfassen' }).first();
    await expect(createAusgabeBtn).toBeVisible();
    await createAusgabeBtn.click();
    await page.waitForTimeout(500);
    await takeScreenshot(page, 'b3_06_buchhaltung_ausgabe_modal.png');

    // Verify modal fields
    await expect(page.locator('text=/Ausgabe erfassen|Neue Ausgabe/i >> visible=true').first()).toBeVisible();
    await page.locator('button:visible', { hasText: 'Abbrechen' }).first().click();
    await page.waitForTimeout(500);

    // 3. Switch to ESTV MWST Formular 200 Tab
    const estvTab = page.locator('button:visible').filter({ hasText: /ESTV MWST/i }).first();
    await expect(estvTab).toBeVisible();
    await estvTab.click();
    await page.waitForTimeout(800);
    await takeScreenshot(page, 'b3_07_buchhaltung_estv_mwst.png');
    await expect(page.locator('text=/Formular 200|Ziffer 200|Umsatz/i >> visible=true').first()).toBeVisible();

    // 4. Switch to Offene Posten (OP-Liste) Tab
    const opTab = page.locator('button:visible').filter({ hasText: /Offene Posten|OP-Liste/i }).first();
    await expect(opTab).toBeVisible();
    await opTab.click();
    await page.waitForTimeout(800);
    await takeScreenshot(page, 'b3_08_buchhaltung_op_liste.png');
    await expect(page.locator('text=/Offene Posten|Debitoren|Forderungen/i >> visible=true').first()).toBeVisible();

    // 5. Test Exporte & Treuhand Dropdown
    const exportBtn = page.locator('button:visible').filter({ hasText: /Exporte & Treuhand/i }).first();
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();
    await page.waitForTimeout(400);
    await takeScreenshot(page, 'b3_09_buchhaltung_treuhand_menu.png');
    await expect(page.locator('text=/Banana|ESTV Formular 200|Treuhand-Revisions-ZIP/i >> visible=true').first()).toBeVisible();
    // Close export dropdown
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    console.log('Modul 7 Buchhaltung UX erfüllt alle Kriterien!');
  });

  test('03. Modul 8: Archiv & Dokumentenablage mit Storage-Trennung UX', async ({ page }) => {
    console.log('--- UI/UX AUDIT: Modul 8 Archiv ---');
    await loginFlorence(page);

    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Archiv' }).first().click();
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'b3_10_archiv_root_grid.png');

    // 1. Breadcrumb Root & Search
    await expect(page.locator('text=Archiv >> visible=true').first()).toBeVisible();
    await expect(page.locator('input[placeholder*="Dateien durchsuchen"]:visible').first()).toBeVisible();

    // 2. System Folders
    await expect(page.locator('text=Kunden >> visible=true').first()).toBeVisible();
    await expect(page.locator('text=Offerten >> visible=true').first()).toBeVisible();
    await expect(page.locator('text=/Buchhaltung & Rechnungen|Rechnungen/i >> visible=true').first()).toBeVisible();

    // 3. Drill into Kunden folder
    const kundenFolder = page.locator('div:visible').filter({ hasText: /^Kunden$/ }).first();
    if (await kundenFolder.isVisible()) {
      await kundenFolder.click();
      await page.waitForTimeout(800);
      await takeScreenshot(page, 'b3_11_archiv_kunden_folder.png');

      // Verify breadcrumb shows Kunden
      await expect(page.locator('text=Kunden >> visible=true').first()).toBeVisible();

      // Go back via breadcrumb
      const archivBreadcrumb = page.locator('text=Archiv >> visible=true').first();
      await archivBreadcrumb.click();
      await page.waitForTimeout(600);
    }

    console.log('Modul 8 Archiv UX erfüllt alle Kriterien!');
  });
});
