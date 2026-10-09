import { test, expect } from '@playwright/test';

test.describe('Kalender RFC-5545 iCalendar Schnittstelle', () => {
  test('Kalender-Sync Modal stellt korrekten webcal:// Link mit Tenant-ID bereit', async ({ page }) => {
    await page.goto('/#login');
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('max@muster-malerei.ch');
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('Test1234');
    await page.getByRole('button', { name: /Anmelden/i }).click();

    await page.waitForSelector('text=Dashboard', { timeout: 15000 });

    // Navigiere zu Kalender
    await page.locator('button:has-text("Kalender")').first().click();
    await page.waitForTimeout(1000);

    // Klick auf Sync & Export Button
    const syncBtn = page.getByRole('button', { name: /Sync/i }).first();
    await syncBtn.waitFor({ state: 'visible', timeout: 8000 });
    await syncBtn.click();
    await page.waitForTimeout(800);

    // Prüfe Modal
    const modalHeading = page.getByRole('heading', { name: /Kalender-Synchronisation/i });
    await expect(modalHeading).toBeVisible();

    // Prüfe Webcal-Link
    const webcalLink = page.locator('a[href^="webcal://"], input[value*="webcal://"]').first();
    await expect(webcalLink).toBeVisible();

    const linkHref = await webcalLink.getAttribute('href') || await webcalLink.getAttribute('value');
    console.log('Generierter Kalender-Feed URL:', linkHref);
    expect(linkHref).toContain('api/calendar');
    expect(linkHref).toContain('tenant=');
    console.log('✅ iCal-Schnittstelle liefert korrekten webcal-Link mit Mandantentrennung.');
  });
});
