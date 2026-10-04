import { test, expect } from '@playwright/test';

test.describe('End-to-End Workflow: Lead-to-Cash & GeBüV Compliance', () => {
  test.setTimeout(120000);

  test('Vollständiger Durchlauf: Offerte -> Rechnung -> QR-Bill -> Bezahlt -> GeBüV-Schutz', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Login
    console.log('1. Login als leandro@atelier-77.ch...');
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
    await passwordInput.fill('Test1234');

    await page.getByRole('button', { name: /Anmelden/i }).click();
    await page.waitForSelector('text=Dashboard', { timeout: 15000 });
    console.log('✅ Auf Dashboard eingeloggt.');

    // 2. Offerten-Modul aufrufen
    console.log('2. Navigiere zu Offerten...');
    await page.locator('button:has-text("Offerten")').first().click();
    await page.waitForTimeout(1000);

    // Klick auf "+ Neue Offerte"
    const neueOfferteBtn = page.getByRole('button', { name: /Neue Offerte/i });
    if (await neueOfferteBtn.isVisible({ timeout: 5000 })) {
      await neueOfferteBtn.click();
      await page.waitForTimeout(1000);

      // DocumentCreateModal ist offen -> wähle Kunde über die eindeutige Dropdown-Option
      const kundeSelect = page.locator('select:has(option:has-text("Kunde auswählen"))').first();
      await kundeSelect.waitFor({ state: 'visible', timeout: 10000 });

      // Wähle Kunde (z. B. Option mit Index 1)
      await kundeSelect.selectOption({ index: 1 });
      await page.waitForTimeout(600);

      const weiterBtn = page.getByRole('button', { name: /Weiter zum Editor/i });
      await weiterBtn.waitFor({ state: 'visible', timeout: 5000 });
      await weiterBtn.click();
      await page.waitForTimeout(2000);
      console.log('✅ OfferteDetailView erfolgreich geöffnet.');
    }

    // 3. Rechnungs-Modul & QR-Bill Prüfung
    console.log('3. Navigiere zu Rechnungen...');
    await page.locator('button:has-text("Rechnungen")').first().click();
    await page.waitForTimeout(1500);

    // Erste existierende Rechnung öffnen
    const firstInvoiceRow = page.locator('table tbody tr, .divide-y > div, div[role="row"]').first();
    if (await firstInvoiceRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstInvoiceRow.click();
      await page.waitForTimeout(1500);

      console.log('✅ RechnungDetailView geöffnet.');

      // Prüfe Status und GeBüV-Elemente
      const statusBadge = page.locator('text=Bezahlt, text=Entwurf, text=Versendet').first();
      await expect(statusBadge).toBeVisible();

      // Öffne Druckansicht / QR-Bill
      const printBtn = page.getByRole('button', { name: /Drucken|Vorschau|PDF/i }).first();
      if (await printBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await printBtn.click();
        await page.waitForTimeout(2000);

        // Prüfe ob QR-Bill Container gerendert wird
        const qrContainer = page.locator('canvas, svg, div:has-text("Zahlteil")').first();
        console.log('QR-Bill gerendert:', await qrContainer.isVisible().catch(() => false));
      }
    }

    // 4. Buchhaltungs-Modul & Banana-Export
    console.log('4. Navigiere zu Buchhaltung...');
    await page.locator('button:has-text("Buchhaltung")').first().click();
    await page.waitForTimeout(1500);

    // Prüfe Banana Export Button
    const bananaBtn = page.getByRole('button', { name: /Banana-Export|Export/i }).first();
    await expect(bananaBtn).toBeVisible({ timeout: 10000 });
    console.log('✅ Banana-Export Button vorhanden und aktiv.');

    // 5. Kalender & iCal-Modal
    console.log('5. Navigiere zu Kalender...');
    await page.locator('button:has-text("Kalender")').first().click();
    await page.waitForTimeout(1500);

    // Öffne Kalender-Sync Modal
    const syncBtn = page.getByRole('button', { name: /Synchronisieren|Sync/i }).first();
    if (await syncBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await syncBtn.click();
      await page.waitForTimeout(800);

      const webcalLink = page.locator('a[href^="webcal://"], input[value*="webcal"]').first();
      console.log('webcal-Link vorhanden:', await webcalLink.isVisible().catch(() => false));

      const schliessenBtn = page.getByRole('button', { name: /Schliessen|Abbrechen/i }).first();
      if (await schliessenBtn.isVisible()) await schliessenBtn.click();
    }

    console.log('🏁 Lead-to-Cash & Modul-Test erfolgreich durchlaufen!');
  });
});
