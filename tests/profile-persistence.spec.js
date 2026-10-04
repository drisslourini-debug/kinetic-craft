import { test, expect } from '@playwright/test';

test('Verify profile name changes persist and update sidebar immediately and after reload', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. Log in as info@atelier-77.ch
  await page.goto('/#login');
  await page.waitForLoadState('networkidle');

  const einloggenBtn = page.getByRole('button', { name: /Einloggen/i }).first();
  if (await einloggenBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await einloggenBtn.click();
    await page.waitForTimeout(500);
  }

  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill('info@atelier-77.ch');

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill('Test1234');

  await page.getByRole('button', { name: /Anmelden/i }).click();

  // Wait for Dashboard to load
  await page.waitForSelector('text=Dashboard', { timeout: 15000 });
  await page.waitForTimeout(1500);

  // 2. Navigate to Einstellungen
  await page.locator('button:has-text("Einstellungen")').first().click();
  await page.waitForTimeout(1000);

  // Mein Profil should be open by default
  const nameSection = page.locator('div:has-text("Persönliche Angaben")').first();
  await expect(nameSection).toBeVisible();

  // Click edit button for Persönliche Angaben
  const editBtn = page.locator('button[title="Bearbeiten"]').first();
  await editBtn.click();
  await page.waitForTimeout(500);

  // Enter new name "Lorina"
  const nameInput = page.locator('input[placeholder*="Martin Spöri"]').first();
  await nameInput.waitFor({ state: 'visible', timeout: 5000 });
  await nameInput.fill('Lorina');

  // Click Save
  const saveBtn = page.getByRole('button', { name: /Speichern/i }).first();
  await saveBtn.click();

  // Verify toast
  await expect(page.locator('text=Name erfolgreich aktualisiert')).toBeVisible({ timeout: 5000 });

  // Verify sidebar immediately reflects "Lorina"
  const sidebarUser = page.locator('aside p.text-white.text-sm.font-medium').first();
  await expect(sidebarUser).toHaveText('Lorina');

  // 3. Reload the page
  console.log('Reloading page to test persistence...');
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Verify sidebar still shows "Lorina" after reload
  const sidebarUserAfterReload = page.locator('aside p.text-white.text-sm.font-medium').first();
  await expect(sidebarUserAfterReload).toHaveText('Lorina');

  // Verify "Mein Profil" in Einstellungen still shows "Lorina"
  await page.locator('button:has-text("Einstellungen")').first().click();
  await page.waitForTimeout(1000);

  const profileCardName = page.locator('h3.text-xl.font-bold:has-text("Lorina")').first();
  await expect(profileCardName).toBeVisible();

  console.log('Persistence test passed successfully!');
});
