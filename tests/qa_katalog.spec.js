import { test, expect } from '@playwright/test';

test.describe('QA Katalog', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const isLoginPage = await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    if (isLoginPage) {
      await page.locator('input[type="email"]').fill('lourinidriss@gmail.com');
      await page.locator('input[type="password"]').fill('Test1234');
      await page.getByRole('button', { name: /Anmelden/i }).click();
    }
    await page.locator('button', { hasText: 'Katalog' }).first().waitFor({ state: 'visible', timeout: 15000 });
  });

  test('Katalog: Create, Edit, Archive', async ({ page }) => {
    // Navigate to Katalog
    await page.locator('button', { hasText: 'Katalog' }).first().click();
    await expect(page.getByRole('heading', { name: 'Leistungskatalog' }).first()).toBeVisible({ timeout: 10000 });

    const testLeistungName = 'QA TEST Leistung ' + Date.now();

    // Create New Leistung (Creates a row with "Neue Leistung")
    await page.getByRole('button', { name: /Neue Leistung/i }).click();
    
    // Wait for the new row to appear. It will have input value="Neue Leistung"
    const neuerEintrag = page.locator('input[value="Neue Leistung"]').first();
    await neuerEintrag.waitFor({ state: 'visible', timeout: 5000 });
    
    // Edit the name (auto-saves on change)
    await neuerEintrag.fill(testLeistungName);
    
    // Verify it updated by pressing Tab or clicking away to trigger blur/change if needed, though React onChange should be instant
    await neuerEintrag.press('Tab');
    await page.waitForTimeout(1000); // Wait for DB update

    // Find the row containing our new name and click its Archive button
    // The archive button has title="Archivieren"
    const row = page.locator(`div:has(input[value="${testLeistungName}"])`).last();
    await row.locator('button[title="Archivieren"]').click();
    
    // Wait for DB update
    await page.waitForTimeout(1000);

    // Assuming archived items are hidden or marked, verify it's archived
    // The button should now have title="Wiederherstellen" if we click "Archivierte anzeigen", or it disappears
    // If there is an "Archivierte anzeigen" toggle, let's see if we can just verify the "Archivieren" button is gone from this row
    await expect(row.locator('button[title="Archivieren"]')).not.toBeVisible();
  });
});
