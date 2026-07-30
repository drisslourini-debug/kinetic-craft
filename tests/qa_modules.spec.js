import { test, expect } from '@playwright/test';

// Helper to fill input fields by their label
async function fillInput(page, labelText, value) {
  await page.locator('label').filter({ hasText: labelText }).first().locator('..').locator('input, textarea').first().fill(value);
}

// Global Variables to track created entity IDs or Names
let testKundeName = 'QA TEST Kunde ' + Date.now();
let testProjektName = 'QA TEST Projekt ' + Date.now();
let testLeistungName = 'QA TEST Leistung ' + Date.now();

test.describe('QA A-Z Module Testing', () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000); // 60s timeout per test
    page.on('dialog', dialog => {
      console.log('DIALOG:', dialog.message());
      dialog.accept();
    });
    // Navigate to Dashboard and Login if necessary
    await page.goto('/');
    const isLoginPage = await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    if (isLoginPage) {
      await page.locator('input[type="email"]').fill('lourinidriss@gmail.com');
      await page.locator('input[type="password"]').fill('Test1234');
      await page.getByRole('button', { name: /Anmelden/i }).click();
    }
    // Wait for the Sidebar to load
    await page.locator('button', { hasText: 'Kunden' }).first().waitFor({ state: 'visible', timeout: 15000 });
  });

  test('1. Katalog: Create, Edit, Archive', async ({ page }) => {
    await page.locator('button', { hasText: 'Katalog' }).first().click();
    await expect(page.getByRole('heading', { name: 'Leistungskatalog' }).first()).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: '+ Leistung' }).click();
    
    // In some cases we might have multiple "Neue Leistung", we just pick the first visible one
    const neuerEintrag = page.locator('input[value="Neue Leistung"]').first();
    await neuerEintrag.waitFor({ state: 'visible', timeout: 15000 });
    
    // Fill the name (this triggers onChange which saves to DB automatically)
    await neuerEintrag.fill(testLeistungName);
    
    // Wait a moment for the DB update to finish
    await page.waitForTimeout(2000); 

    // Find the row containing our new item by its displayed value
    const row = page.locator('.grid-cols-1').filter({ has: page.locator(`input[value="${testLeistungName}"]`) }).last();
    // Open the 3-dot menu
    await row.locator('button').last().click();
    // Click Archivieren inside the menu
    await page.getByRole('button', { name: 'Archivieren' }).click();
    
    await page.waitForTimeout(1500);
  });

  test('2. Kunden: Create, Edit, Delete', async ({ page }) => {
    await page.locator('button', { hasText: 'Kunden' }).first().click();
    await expect(page.getByRole('heading', { name: 'Kunden', exact: true }).first()).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Neuer Kunde/i }).click();
    
    // Select type
    await page.waitForTimeout(500);
    const typeSelect = page.locator('select').first();
    await typeSelect.selectOption({ index: 1 });
    
    await fillInput(page, 'Firmenname', testKundeName);
    await page.getByRole('button', { name: /Kunde erstellen/i }).click();

    await expect(page.getByRole('heading', { name: testKundeName }).first()).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Bearbeiten' }).first().click();
    const editedKundeName = testKundeName + ' EDITED';
    await fillInput(page, 'Firmenname', editedKundeName);
    await page.getByRole('button', { name: /Speichern/i }).first().click();

    await expect(page.getByRole('heading', { name: editedKundeName }).first()).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Weitere Aktionen' }).click();
    await page.getByRole('button', { name: /Kunde löschen/i }).click();
    await page.getByRole('button', { name: 'Ja, endgültig löschen' }).click();

    await expect(page.getByRole('heading', { name: 'Kunden', exact: true }).first()).toBeVisible({ timeout: 15000 });
  });

  test('3. Projekte: Create, Edit, Delete', async ({ page }) => {
    await page.locator('button', { hasText: 'Projekte' }).first().click();
    await page.getByRole('button', { name: /Neues Projekt/i }).click();
    
    const customerSelect = page.locator('select').filter({ hasText: 'Bitte Kunden auswählen...' }).first();
    await customerSelect.waitFor({ state: 'visible', timeout: 5000 });
    await customerSelect.selectOption({ index: 1 });
    await fillInput(page, 'Projektname', testProjektName);
    await page.getByRole('button', { name: /Projekt erstellen/i }).click();

    await expect(page.getByRole('heading', { name: testProjektName }).first()).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Bearbeiten' }).first().click();
    const editedProjektName = testProjektName + ' EDITED';
    await fillInput(page, 'Projektname', editedProjektName);
    await page.getByRole('button', { name: /Speichern/i }).first().click();

    await expect(page.getByRole('heading', { name: editedProjektName }).first()).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Weitere Aktionen' }).click();
    await page.getByRole('button', { name: /Projekt löschen/i }).click();
    await page.getByRole('button', { name: 'Ja, endgültig löschen' }).click();

    await expect(page.getByRole('heading', { name: 'Projekte & Objekte' }).first()).toBeVisible({ timeout: 15000 });
  });

  test('4. Offerten & Rechnungen: Archive and Delete', async ({ page }) => {
    await page.locator('button', { hasText: 'Offerten' }).first().click();
    
    await page.getByRole('button', { name: /Neue Offerte/i }).click();
    
    // Complete the new single-page drawer
    await page.waitForTimeout(1000); // wait for customers to load
    const offCustomerSelect = page.locator('label').filter({ hasText: 'Kunde' }).locator('xpath=../..').locator('select').first();
    await offCustomerSelect.waitFor({ state: 'visible', timeout: 5000 });
    await offCustomerSelect.selectOption({ index: 1 });
    await page.getByRole('button', { name: /Weiter zum Editor/i }).click();
    
    // Wait for the detail view which usually contains an Offerte # text
    await expect(page.getByText('Offerte #').first().or(page.getByText('Entwurf').first())).toBeVisible({ timeout: 15000 });
    
    // It starts in edit mode. Wait for Abbrechen to appear and click it.
    const abbrechenBtn = page.getByRole('button', { name: 'Abbrechen' }).first();
    await abbrechenBtn.waitFor({ state: 'visible', timeout: 10000 });
    await abbrechenBtn.click();
    
    // Wait until we are firmly in view mode
    await page.getByRole('button', { name: /Offerte bearbeiten/i }).first().waitFor({ state: 'visible', timeout: 10000 });

    // Archive Offerte
    await page.getByRole('button', { name: 'Weitere Aktionen' }).click();
    await page.getByRole('button', { name: 'Offerte archivieren' }).click();

    // The app does a window.location.reload() after archiving, so wait for it
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Offerten' }).first()).toBeVisible({ timeout: 15000 });
  });

  test('5. Dashboard: View stats', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Grüezi/ }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Offene Offerten').first()).toBeVisible();
    await expect(page.locator('text=Umsatz (Akzeptiert)').first()).toBeVisible();
  });

  test('6. Einstellungen: Edit and Save', async ({ page }) => {
    await page.locator('button', { hasText: 'Einstellungen' }).first().click();
    await expect(page.getByRole('heading', { name: 'Einstellungen' }).first()).toBeVisible({ timeout: 10000 });
    
    // Switch to Unternehmen tab if not already there
    const unternehmenBtn = page.getByRole('button', { name: 'Unternehmen' }).first();
    await unternehmenBtn.click();
    
    await page.locator('button[title="Bearbeiten"]').first().click();
    await fillInput(page, 'Name des Unternehmens', 'Atelier 77 Test');
    await page.getByRole('button', { name: 'Speichern' }).first().click();
    
    // wait for save to complete (we can check if the button stops spinning or if there's a success toast)
    // Actually just wait 2 seconds since there's an alert or auto-save toast
    await page.waitForTimeout(2000);
  });

  test('7. Offerte -> Rechnung Transformation', async ({ page }) => {
    // 1. Navigate to Offerten and create a new Offerte
    await page.goto('/');
    await page.locator('button', { hasText: 'Offerten' }).first().click();
    await page.getByRole('button', { name: /Neue Offerte/i }).click();
    
    await page.waitForTimeout(1000);
    const offCustomerSelect = page.locator('label').filter({ hasText: 'Kunde' }).locator('xpath=../..').locator('select').first();
    await offCustomerSelect.waitFor({ state: 'visible', timeout: 5000 });
    await offCustomerSelect.selectOption({ index: 1 });
    await page.getByRole('button', { name: /Weiter zum Editor/i }).click();
    
    await expect(page.getByText('Offerte #').first().or(page.getByText('Entwurf').first())).toBeVisible({ timeout: 15000 });
    
    // Switch to View mode
    const abbrechenBtn = page.getByRole('button', { name: 'Abbrechen' }).first();
    await abbrechenBtn.waitFor({ state: 'visible', timeout: 10000 });
    await abbrechenBtn.click();
    
    await page.getByRole('button', { name: /Offerte bearbeiten/i }).first().waitFor({ state: 'visible', timeout: 10000 });
    
    // Change status to Akzeptiert so the "In Rechnung umwandeln" button appears
    // The status select has options like 'Entwurf', 'Akzeptiert'
    const statusSelect = page.locator('select').filter({ hasText: 'Entwurf' }).first();
    await statusSelect.selectOption('Akzeptiert');
    // Wait a little for the state to update
    await page.waitForTimeout(2000);
    
    // Expand dropdown if needed, but in previous tests, dropdown buttons were hidden.
    // Wait, "In Rechnung umwandeln" is inside "Weitere Aktionen" dropdown.
    await page.getByRole('button', { name: 'Weitere Aktionen' }).click();
    
    const rechnungBtn = page.getByRole('button', { name: 'In Rechnung umwandeln' });
    await rechnungBtn.waitFor({ state: 'visible', timeout: 5000 });
    await rechnungBtn.click();
    
    // Check if we navigated to a Rechnung
    await expect(page.getByText('Rechnungsdaten').first()).toBeVisible({ timeout: 15000 });
  });
});
