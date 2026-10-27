import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Amin/.gemini/antigravity/brain/b175e108-b5b2-4fe1-8eb9-d6f67b38b7e1';
const LOCAL_DIR = './scratch/screenshots';

for (const dir of [ARTIFACT_DIR, LOCAL_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
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

test.describe('Flo Art Full CRM Audit - Florence Lourini', () => {
  test.setTimeout(300000);

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('Module 0 & 1: Login, Dashboard & Company Switcher Audit', async ({ page }) => {
    console.log('--- AUDIT: Modul 0 - Login ---');
    await loginFlorence(page);

    console.log('--- AUDIT: Modul 1 - Dashboard ---');
    await page.waitForTimeout(1500);
    await takeScreenshot(page, 'audit_01_dashboard_initial.png');

    const welcome = page.locator('text=/Willkommen zurück|Guten Tag/i').first();
    await expect(welcome).toBeVisible();

    const switcherBtns = page.getByTitle('Betrieb / Standort wechseln');
    await expect(switcherBtns.first()).toBeVisible();

    const isPolstereiInitial = await page.locator('text=Flo Art – Polsterei').first().isVisible();
    console.log(`Initial active company: ${isPolstereiInitial ? 'Polsterei' : 'Töpferei'}`);

    // Switcher Dropdown Test
    await switcherBtns.first().click();
    await page.waitForTimeout(600);
    await takeScreenshot(page, 'audit_02_company_switcher_dropdown.png');

    if (isPolstereiInitial) {
      await page.locator('button').filter({ hasText: 'Flo Art – Töpferei' }).last().click();
      await page.waitForTimeout(2000);
      await expect(page.locator('text=Flo Art – Töpferei').first()).toBeVisible();
      await expect(page.locator('text=Bern').first()).toBeVisible();
      await takeScreenshot(page, 'audit_03_dashboard_toepferei.png');

      await switcherBtns.first().click();
      await page.waitForTimeout(600);
      await page.locator('button').filter({ hasText: 'Flo Art – Polsterei' }).last().click();
      await page.waitForTimeout(2000);
      await expect(page.locator('text=Flo Art – Polsterei').first()).toBeVisible();
      await expect(page.locator('text=Ittigen').first()).toBeVisible();
      await takeScreenshot(page, 'audit_04_dashboard_polsterei.png');
    } else {
      await page.locator('button').filter({ hasText: 'Flo Art – Polsterei' }).last().click();
      await page.waitForTimeout(2000);
      await expect(page.locator('text=Flo Art – Polsterei').first()).toBeVisible();
      await expect(page.locator('text=Ittigen').first()).toBeVisible();
      await takeScreenshot(page, 'audit_04_dashboard_polsterei.png');

      await switcherBtns.first().click();
      await page.waitForTimeout(600);
      await page.locator('button').filter({ hasText: 'Flo Art – Töpferei' }).last().click();
      await page.waitForTimeout(2000);
      await expect(page.locator('text=Flo Art – Töpferei').first()).toBeVisible();
      await expect(page.locator('text=Bern').first()).toBeVisible();
      await takeScreenshot(page, 'audit_03_dashboard_toepferei.png');
    }

    await expect(page.locator('text=Bezahlter Umsatz (YTD)').first()).toBeVisible();
    await expect(page.locator('text=Ausstehende Zahlungen').first()).toBeVisible();
    await expect(page.locator('text=Offene Offerten').first()).toBeVisible();
    console.log('Modul 0 & 1 passed successfully!');
  });

  test('Module 2: Kunden (Customers) Audit', async ({ page }) => {
    await loginFlorence(page);
    console.log('--- AUDIT: Modul 2 - Kunden ---');
    await page.locator('aside nav button, aside nav a').filter({ hasText: 'Kunden' }).first().click();
    await page.waitForTimeout(1500);

    await takeScreenshot(page, 'audit_05_kunden_liste.png');
    await expect(page.locator('h1, h2').filter({ hasText: /Kunden/i }).first()).toBeVisible();

    const neuerKundeBtn = page.getByRole('button', { name: /Neuer Kunde/i }).first();
    await expect(neuerKundeBtn).toBeVisible();
    await neuerKundeBtn.click();
    await page.waitForTimeout(800);

    await takeScreenshot(page, 'audit_06_kunden_create_modal.png');
    await expect(page.locator('text=Neuen Kunden anlegen').first()).toBeVisible();

    // Close modal
    const closeBtn = page.locator('button').filter({ hasText: /Abbrechen/i }).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(600);

    // Click on customer row if present
    const customerItem = page.locator('text=/Beat Von Graffenried|Galerie Münstergasse/i').first();
    if (await customerItem.isVisible()) {
      await customerItem.click();
      await page.waitForTimeout(1200);
      await takeScreenshot(page, 'audit_07_kunde_detail.png');
      await expect(page.locator('text=Stammdaten').first()).toBeVisible();

      const backBtn = page.getByRole('button', { name: /Zurück|Kunden/i }).first();
      if (await backBtn.isVisible()) {
        await backBtn.click();
        await page.waitForTimeout(800);
      }
    }
    console.log('Modul 2 passed successfully!');
  });

  test('Module 3: Projekte (Projects) Audit', async ({ page }) => {
    await loginFlorence(page);
    console.log('--- AUDIT: Modul 3 - Projekte ---');
    await page.locator('aside nav button, aside nav a').filter({ hasText: 'Projekte' }).first().click();
    await page.waitForTimeout(1500);

    await takeScreenshot(page, 'audit_08_projekte_liste.png');
    await expect(page.locator('h1, h2').filter({ hasText: /Projekte/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Neues Projekt/i }).first()).toBeVisible();

    // Open modal
    await page.getByRole('button', { name: /Neues Projekt/i }).first().click();
    await page.waitForTimeout(800);
    await takeScreenshot(page, 'audit_09_projekt_create_modal.png');

    await expect(page.locator('text=Neues Projekt anlegen').first()).toBeVisible();
    const closeBtn = page.locator('button').filter({ hasText: /Abbrechen/i }).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(600);

    // Open project detail by clicking project name
    const projectItem = page.locator('text=/Sessel|Keramik|Restaurierung/i').first();
    if (await projectItem.isVisible()) {
      await projectItem.click();
      await page.waitForTimeout(1200);
      await takeScreenshot(page, 'audit_10_projekt_detail.png');

      await expect(page.locator('text=/Projektdaten|Zeiten|Rapporte/i').first()).toBeVisible();

      const backBtn = page.getByRole('button', { name: /Zurück|Projekte/i }).first();
      if (await backBtn.isVisible()) {
        await backBtn.click();
        await page.waitForTimeout(800);
      }
    }
    console.log('Modul 3 passed successfully!');
  });

  test('Module 4: Kalender (Calendar) Audit', async ({ page }) => {
    await loginFlorence(page);
    console.log('--- AUDIT: Modul 4 - Kalender ---');
    await page.locator('aside nav button, aside nav a').filter({ hasText: 'Kalender' }).first().click();
    await page.waitForTimeout(1500);

    await takeScreenshot(page, 'audit_11_kalender_ansicht.png');
    await expect(page.locator('h1, h2, h3').filter({ hasText: /Kalender|Termine/i }).first()).toBeVisible();

    const neuerTerminBtn = page.getByRole('button', { name: /Neuer Termin/i }).first();
    if (await neuerTerminBtn.isVisible()) {
      await neuerTerminBtn.click();
      await page.waitForTimeout(800);
      await takeScreenshot(page, 'audit_12_termin_modal.png');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
    console.log('Modul 4 passed successfully!');
  });

  test('Module 5 & 6: Offerten & Rechnungen (Quotes & Invoices & QR-Bill) Audit', async ({ page }) => {
    await loginFlorence(page);

    // Offerten
    console.log('--- AUDIT: Modul 5 - Offerten ---');
    await page.locator('aside nav button, aside nav a').filter({ hasText: 'Offerten' }).first().click();
    await page.waitForTimeout(1500);
    await takeScreenshot(page, 'audit_13_offerten_liste.png');
    await expect(page.locator('h1, h2').filter({ hasText: /Offerten/i }).first()).toBeVisible();

    // Rechnungen
    console.log('--- AUDIT: Modul 6 - Rechnungen ---');
    await page.locator('aside nav button, aside nav a').filter({ hasText: 'Rechnungen' }).first().click();
    await page.waitForTimeout(1500);
    await takeScreenshot(page, 'audit_14_rechnungen_liste.png');
    await expect(page.locator('h1, h2').filter({ hasText: /Rechnungen/i }).first()).toBeVisible();

    // Open first invoice (e.g. RE-POL-1001 or RE-TOP-1001)
    const invoiceItem = page.locator('text=/RE-POL-|RE-TOP-/i').first();
    if (await invoiceItem.isVisible()) {
      await invoiceItem.click();
      await page.waitForTimeout(1500);
      await takeScreenshot(page, 'audit_15_rechnung_detail.png');

      await expect(page.locator('text=/Rechnung|RE-/i').first()).toBeVisible();

      const backBtn = page.getByRole('button', { name: /Zurück|Rechnungen/i }).first();
      if (await backBtn.isVisible()) {
        await backBtn.click();
        await page.waitForTimeout(800);
      }
    }
    console.log('Modul 5 & 6 passed successfully!');
  });

  test('Module 7: Buchhaltung (Accounting & MWST) Audit', async ({ page }) => {
    await loginFlorence(page);
    console.log('--- AUDIT: Modul 7 - Buchhaltung ---');
    await page.locator('aside nav button, aside nav a').filter({ hasText: 'Buchhaltung' }).first().click();
    await page.waitForTimeout(1500);

    await takeScreenshot(page, 'audit_16_buchhaltung_uebersicht.png');
    await expect(page.locator('h1, h2').filter({ hasText: /Buchhaltung/i }).first()).toBeVisible();

    // Check tabs
    const tabs = ['Übersicht', 'Einnahmen', 'Ausgaben', 'MWST-Abrechnung', 'Treuhand-Export'];
    for (const tab of tabs) {
      const tabEl = page.locator('button, a').filter({ hasText: new RegExp(`^${tab}$`, 'i') }).first();
      if (await tabEl.isVisible()) {
        console.log(`Tab visible: ${tab}`);
      }
    }

    console.log('Modul 7 passed successfully!');
  });

  test('Module 8: Archiv (Files Storage) Audit', async ({ page }) => {
    await loginFlorence(page);
    console.log('--- AUDIT: Modul 8 - Archiv / Dateien ---');
    await page.locator('aside nav button, aside nav a').filter({ hasText: /Archiv|Dateien/i }).first().click();
    await page.waitForTimeout(1500);

    await takeScreenshot(page, 'audit_18_archiv_dateien.png');
    await expect(page.locator('h1, h2').filter({ hasText: /Archiv|Dateien/i }).first()).toBeVisible();
    console.log('Modul 8 passed successfully!');
  });

  test('Module 9: Katalog (Service Catalog) Audit', async ({ page }) => {
    await loginFlorence(page);
    console.log('--- AUDIT: Modul 9 - Katalog ---');
    await page.locator('aside nav button, aside nav a').filter({ hasText: 'Katalog' }).first().click();
    await page.waitForTimeout(1500);

    await takeScreenshot(page, 'audit_19_katalog_liste.png');
    await expect(page.locator('h1, h2').filter({ hasText: /Leistungskatalog/i }).first()).toBeVisible();

    // Verify categories column and CHF prices
    await expect(page.locator('text=Kategorien').first()).toBeVisible();
    await expect(page.locator('text=CHF').first()).toBeVisible();

    console.log('Modul 9 passed successfully!');
  });

  test('Module 10: Einstellungen (Settings & Multi-Tenant Branding) Audit', async ({ page }) => {
    await loginFlorence(page);
    console.log('--- AUDIT: Modul 10 - Einstellungen ---');
    await page.locator('aside nav button, aside nav a').filter({ hasText: 'Einstellungen' }).first().click();
    await page.waitForTimeout(1500);

    await takeScreenshot(page, 'audit_20_einstellungen_firmendaten.png');
    await expect(page.locator('h1, h2').filter({ hasText: /Einstellungen/i }).first()).toBeVisible();

    // Check Firmenname contains Flo Art
    await expect(page.locator('text=/Flo Art/i').first()).toBeVisible();

    // Check Standardwerte tab for Bankverbindung & QR-IBAN
    const standardwerteTab = page.locator('button, a').filter({ hasText: /Standardwerte/i }).first();
    if (await standardwerteTab.isVisible()) {
      await standardwerteTab.click();
      await page.waitForTimeout(800);
      await takeScreenshot(page, 'audit_21_einstellungen_standardwerte.png');
      await expect(page.locator('text=/IBAN|QR-IBAN/i').first()).toBeVisible();
    }

    // Check Nummernkreise tab
    const nummernkreiseTab = page.locator('button, a').filter({ hasText: /Nummernkreise/i }).first();
    if (await nummernkreiseTab.isVisible()) {
      await nummernkreiseTab.click();
      await page.waitForTimeout(800);
      await takeScreenshot(page, 'audit_22_einstellungen_nummernkreise.png');
      await expect(page.locator('text=/Präfix|Startnummer/i').first()).toBeVisible();
    }

    console.log('Modul 10 passed successfully!');
  });
});
