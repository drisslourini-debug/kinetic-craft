import { test, expect } from '@playwright/test';

test.describe('Mobile Baustellen-Flow & Monteur-Szenario', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14/15 Viewport

  test('Mobile TabBar zeigt Kalender & Projekte, Zoom ist erlaubt', async ({ page }) => {
    // 1. Prüfe Viewport Meta-Tag auf Pinch-to-Zoom Erlaubnis
    await page.goto('/#login');
    await page.waitForLoadState('domcontentloaded');

    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
    console.log('Viewport Meta:', viewportMeta);
    expect(viewportMeta).not.toContain('user-scalable=0');
    expect(viewportMeta).not.toContain('user-scalable=no');
    expect(viewportMeta).not.toContain('maximum-scale=1.0');
    console.log('✅ Pinch-to-Zoom für Handwerker & Baupläne ist freigegeben.');

    // 2. Login
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill('max@muster-malerei.ch');

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('Test1234');
    await page.getByRole('button', { name: /Anmelden/i }).click();

    // 3. Prüfe MobileTabBar
    const mobileTabBar = page.locator('nav.md\\:hidden, div.fixed.bottom-0').first();
    await mobileTabBar.waitFor({ state: 'visible', timeout: 15000 });
    console.log('✅ Mobile TabBar auf Smartphone gerendert.');

    // Prüfe Buttons in der TabBar: Kalender & Projekte
    const kalenderTab = mobileTabBar.locator('button:has-text("Kalender")');
    const projekteTab = mobileTabBar.locator('button:has-text("Projekte")');
    await expect(kalenderTab).toBeVisible();
    await expect(projekteTab).toBeVisible();
    console.log('✅ Kalender & Projekte sind Direkt-Tabs in der mobilen Leiste.');

    // Klick auf Kalender-Tab
    await kalenderTab.click();
    await page.waitForTimeout(1000);
    await expect(page.getByRole('heading', { name: /Kalender/i }).first()).toBeVisible();
    console.log('✅ Mobiler Kalender erfolgreich aufgerufen.');

    // Klick auf Projekte-Tab
    await projekteTab.click();
    await page.waitForTimeout(1000);
    await expect(page.getByRole('heading', { name: /Projekte/i }).first()).toBeVisible();
    console.log('✅ Mobile Projektübersicht erfolgreich aufgerufen.');
  });
});
