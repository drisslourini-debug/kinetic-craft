import { test, expect } from '@playwright/test';

test.describe('Datenschutz revDSG & Session-Hygiene', () => {
  test('Keine Google-Fonts Requests (kein IP-Leak) & LocalStorage Bereinigung bei Logout', async ({ page }) => {
    const leakedRequests = [];

    page.on('request', request => {
      const url = request.url();
      if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
        leakedRequests.push(url);
      }
    });

    // 1. Seite aufrufen
    await page.goto('/#login');
    await page.waitForLoadState('networkidle');

    // Prüfe: Keine externen Google Fonts Anfragen
    expect(leakedRequests.length).toBe(0);
    console.log('✅ revDSG: 0 Anfragen an Google Fonts Server (Schutz der IP-Adresse bestätigt).');

    // 2. Login
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('max@muster-malerei.ch');
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('Test1234');
    await page.getByRole('button', { name: /Anmelden/i }).click();

    await page.waitForSelector('text=Dashboard', { timeout: 15000 });
    console.log('✅ Erfolgreich angemeldet.');

    // 3. Einstellungen aufrufen, damit lokale Caches gesetzt werden
    await page.locator('button:has-text("Einstellungen")').first().click();
    await page.waitForTimeout(1500);

    // 4. Abmelden über Sidebar Logout
    const logoutTrigger = page.locator('button[title="Abmelden"]').first();
    if (await logoutTrigger.isVisible()) {
      await logoutTrigger.click();
      await page.waitForTimeout(500);
      const confirmBtn = page.locator('.fixed.z-50 button:has-text("Abmelden")').first();
      await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
      await confirmBtn.click();
    } else {
      const mobileLogout = page.getByRole('button', { name: /Abmelden/i }).first();
      await mobileLogout.click();
    }
    await page.waitForTimeout(1500);
    console.log('✅ Erfolgreich abgemeldet.');

    // 5. Prüfe localStorage: Alle atelier77_einstellungen* Keys müssen gelöscht sein
    const storageKeys = await page.evaluate(() => Object.keys(localStorage));
    const cachedSettings = storageKeys.filter(k => k.startsWith('atelier77_einstellungen'));
    expect(cachedSettings.length).toBe(0);
    console.log('✅ Session-Hygiene: Keine Mandanten-Einstellungen im LocalStorage nach Abmeldung.');
  });
});
