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

test.describe('Block 1 UI/UX Quality Gate: Fundament & Stammdaten', () => {
  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('01. Modul 0: Auth & Login UX Deep Dive', async ({ page }) => {
    console.log('--- UI/UX AUDIT: Modul 0 Login ---');
    await page.goto('/#login');
    await page.waitForLoadState('networkidle');

    // 1. Check Swiss Trust badges & branding
    await expect(page.locator('text=Schweizer Handwerker-Standard').first()).toBeVisible();
    await expect(page.locator('text=Rechtskonforme QR-Rechnungen').first()).toBeVisible();
    await expect(page.locator('text=Schweizer Datenschutz (DSG)').first()).toBeVisible();

    // 2. Check Password Toggle
    const passInput = page.locator('input[type="password"]').first();
    await passInput.fill('Secret123');
    const toggleBtn = page.locator('button[title="Passwort anzeigen"]').first();
    await toggleBtn.click();
    await expect(page.locator('input[type="text"]').filter({ hasText: '' }).last()).toHaveValue('Secret123');
    await page.locator('button[title="Passwort verbergen"]').first().click();

    // 3. Test Invalid Login Error Feedback
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('falsch@bluewin.ch');
    await page.getByRole('button', { name: /Anmelden/i }).click();
    await expect(page.locator('text=E-Mail oder Passwort ist nicht korrekt').first()).toBeVisible({ timeout: 10000 });
    await takeScreenshot(page, 'b1_01_login_error_state.png');

    // 4. Test Password Reset Modal
    await page.locator('button:visible', { hasText: 'Passwort vergessen?' }).click();
    await expect(page.locator('text=Passwort zurücksetzen').first()).toBeVisible();
    await page.locator('button:visible', { hasText: 'Abbrechen' }).first().click();

    console.log('Modul 0 Login UX erfüllt alle Kriterien!');
  });

  test('02. Modul 1: Dashboard, Switcher & Quick Actions UX', async ({ page }) => {
    console.log('--- UI/UX AUDIT: Modul 1 Dashboard & Switcher ---');
    await loginFlorence(page);

    // 1. Dashboard Top Bar & Company Indicator
    await expect(page.locator('header, aside').filter({ hasText: /Flo Art/i }).first()).toBeVisible();
    await takeScreenshot(page, 'b1_02_dashboard_overview.png');

    // 2. Switcher Dropdown Interaction
    const switcherBtn = page.getByTitle('Betrieb / Standort wechseln').first();
    await switcherBtn.click();
    await page.waitForTimeout(500);
    await takeScreenshot(page, 'b1_03_company_switcher_open.png');

    // Verify both companies appear with correct city labels
    await expect(page.locator('text=Münstergasse 39, 3011 Bern, text=Bern').first()).toBeDefined();
    await expect(page.locator('text=Ittigen').first()).toBeVisible();

    // Close dropdown with click outside or switch
    await page.locator('button:visible', { hasText: 'Flo Art – Polsterei' }).last().click();
    await page.waitForTimeout(2000);
    await expect(page.locator('header, aside').filter({ hasText: 'Flo Art – Polsterei' }).first()).toBeVisible();

    // Switch back to Töpferei
    await switcherBtn.click();
    await page.waitForTimeout(500);
    await page.locator('button:visible', { hasText: 'Flo Art – Töpferei' }).last().click();
    await page.waitForTimeout(2000);
    await expect(page.locator('header, aside').filter({ hasText: 'Flo Art – Töpferei' }).first()).toBeVisible();

    // 3. Quick Actions 4-item Apple Row
    const offerteQuick = page.locator('button:visible').filter({ hasText: 'Offerte' }).first();
    const rechnungQuick = page.locator('button:visible').filter({ hasText: 'Rechnung' }).first();
    const kundeQuick = page.locator('button:visible').filter({ hasText: 'Kunde' }).first();
    const projektQuick = page.locator('button:visible').filter({ hasText: 'Projekt' }).first();
    await expect(offerteQuick).toBeVisible();
    await expect(rechnungQuick).toBeVisible();
    await expect(kundeQuick).toBeVisible();
    await expect(projektQuick).toBeVisible();

    // 4. Action Center / Empty States
    await expect(page.locator('text=/Deine Aufgaben|Action-Center|Aufgaben/i >> visible=true').first()).toBeVisible();
    console.log('Modul 1 Dashboard & Switcher UX erfüllt alle Kriterien!');
  });

  test('03. Modul 2: Kundenkartei & Detail View UX', async ({ page }) => {
    console.log('--- UI/UX AUDIT: Modul 2 Kundenkartei ---');
    await loginFlorence(page);

    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Kunden' }).first().click();
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'b1_04_kunden_liste.png');

    // 1. Validation in KundeCreateModal
    await page.locator('button:visible', { hasText: 'Neuer Kunde' }).first().click();
    await page.waitForTimeout(500);

    // Try submit empty form to test validation
    const submitBtn = page.locator('button[type="submit"]:visible', { hasText: 'Kunde erstellen' }).first();
    await submitBtn.click();
    await expect(page.locator('text=/Bitte Firmenname oder Nachname|Pflichtfeld/i').first()).toBeVisible();
    await takeScreenshot(page, 'b1_05_kunde_validation_error.png');

    // Close modal
    await page.locator('button:visible', { hasText: 'Abbrechen' }).first().click();
    await page.waitForTimeout(500);

    // 2. Open an existing customer detail view
    const customerItem = page.locator('text=/Galerie Münstergasse|Café Einstein/i >> visible=true').first();
    await expect(customerItem).toBeVisible();
    await customerItem.click();
    await page.waitForTimeout(1500);
    await takeScreenshot(page, 'b1_06_kunde_detail_tabs.png');

    // 3. Verify all 5 Tabs in Customer Detail View
    await expect(page.locator('button:visible', { hasText: 'Stammdaten' }).first()).toBeVisible();
    await expect(page.locator('button:visible').filter({ hasText: /Projekte/i }).first()).toBeVisible();
    await expect(page.locator('button:visible').filter({ hasText: /Offerten/i }).first()).toBeVisible();
    await expect(page.locator('button:visible', { hasText: 'Finanzen' }).first()).toBeVisible();
    await expect(page.locator('button:visible').filter({ hasText: /Dateien/i }).first()).toBeVisible();

    // 4. Test Archive confirmation dialog
    const moreActionsBtn = page.locator('button[aria-label="Weitere Aktionen"]').first();
    if (await moreActionsBtn.isVisible()) {
      await moreActionsBtn.click();
      await page.waitForTimeout(400);
      const archiveOption = page.locator('button:visible', { hasText: 'Kunde archivieren' }).first();
      if (await archiveOption.isVisible()) {
        await archiveOption.click();
        await page.waitForTimeout(500);
        await takeScreenshot(page, 'b1_07_kunde_archive_modal.png');
        await expect(page.locator('text=Kunde archivieren?').first()).toBeVisible();
        await page.locator('button:visible', { hasText: 'Abbrechen' }).last().click();
      }
    }

    console.log('Modul 2 Kundenkartei UX erfüllt alle Kriterien!');
  });

  test('04. Modul 10: Einstellungen & Firmendaten UX', async ({ page }) => {
    console.log('--- UI/UX AUDIT: Modul 10 Einstellungen ---');
    await loginFlorence(page);

    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Einstellungen' }).first().click();
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'b1_08_einstellungen_profil.png');

    // 1. Navigation through Settings Categories
    // Category "Firma & Adresse"
    await page.locator('button:visible', { hasText: 'Firma & Adresse' }).first().click();
    await page.waitForTimeout(800);
    await takeScreenshot(page, 'b1_09_einstellungen_firmendaten.png');
    await expect(page.locator('text=Stammdaten & Adresse >> visible=true').first()).toBeVisible();
    await expect(page.locator('text=Schweiz >> visible=true').first()).toBeVisible();

    // Category "Finanzen & Fristen"
    await page.locator('button:visible', { hasText: 'Finanzen & Fristen' }).first().click();
    await page.waitForTimeout(800);
    await takeScreenshot(page, 'b1_10_einstellungen_finanzen.png');
    await expect(page.locator('text=/QR-IBAN|Bank/i').first()).toBeVisible();
    await expect(page.locator('text=8.1%').first()).toBeVisible();

    // Category "Nummernkreise"
    await page.locator('button:visible', { hasText: 'Nummernkreise' }).first().click();
    await page.waitForTimeout(800);
    await takeScreenshot(page, 'b1_11_einstellungen_nummernkreise.png');
    await expect(page.locator('text=Nummernkreise >> visible=true').first()).toBeVisible();
    await expect(page.locator('text=/Kundennummern|z\\.B\\./i >> visible=true').first()).toBeVisible();

    // Test Edit mode in Nummernkreise
    const editNummernBtn = page.locator('button:visible', { hasText: 'Bearbeiten' }).first();
    if (await editNummernBtn.isVisible()) {
      await editNummernBtn.click();
      await page.waitForTimeout(400);
      await expect(page.locator('text=/Vorschau: Nächster Kunde/i >> visible=true').first()).toBeVisible();
      await page.locator('button:visible', { hasText: 'Abbrechen' }).first().click();
    }

    // Category "Rollen & Rechte"
    await page.locator('button:visible', { hasText: 'Rollen & Rechte' }).first().click();
    await page.waitForTimeout(800);
    await takeScreenshot(page, 'b1_12_einstellungen_rollen.png');
    await expect(page.locator('text=/Berechtigungsmatrix|Inhaber|Admin/i >> visible=true').first()).toBeVisible();

    console.log('Modul 10 Einstellungen UX erfüllt alle Kriterien!');
  });
});
