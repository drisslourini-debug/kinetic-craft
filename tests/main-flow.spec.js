import { test, expect } from '@playwright/test';

test('End-to-End Flow: Create Kunde -> Projekt -> Offerte -> Rechnung', async ({ page }) => {
  test.setTimeout(90000); // 90 seconds timeout

  // Helper to find an input based on its preceding label text
  const fillInput = async (labelText, value) => {
    await page.locator(`div:has(label:has-text("${labelText}")) >> input`).first().fill(value);
  };

  // 1. Navigate to Dashboard
  await page.goto('/');
  
  const isLoginPage = await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
  
  if (isLoginPage) {
    await page.locator('input[type="email"]').fill('lourinidriss@gmail.com');
    await page.locator('input[type="password"]').fill('Test1234');
    await page.getByRole('button', { name: /Anmelden/i }).click();
  }

  // Wait for the Sidebar to load
  await page.locator('button', { hasText: 'Kunden' }).first().waitFor({ state: 'visible', timeout: 15000 });
  
  // Click on "Kunden" in the sidebar
  await page.locator('button', { hasText: 'Kunden' }).first().click();

  // Wait for the Kunden view to load
  await expect(page.getByRole('heading', { name: 'Kunden', exact: true })).toBeVisible();

  // Click "+ Neuer Kunde"
  await page.getByRole('button', { name: /Neuer Kunde/i }).click();

  // Select "Unternehmen / Firma" from Kundentyp
  await page.locator('div:has(label:has-text("Kundentyp")) >> select').selectOption({ label: 'Unternehmen / Firma' }).catch(() => {
    return page.locator('div:has(label:has-text("Kundentyp")) >> select').selectOption({ index: 2 });
  });

  // Fill out the KundeCreateModal using our robust helper
  await fillInput('Firmenname', 'Livit AG');
  await fillInput('Strasse', 'Schwarztorstrasse 26');
  await fillInput('PLZ', '3007');
  await fillInput('Ort', 'Bern');
  await fillInput('E-Mail', 'bern@livit.ch');
  
  // Save customer
  await page.getByRole('button', { name: /Speichern/i }).click();

  // We should be redirected to the KundeDetailView
  await expect(page.getByRole('heading', { name: /Livit AG/i })).toBeVisible({ timeout: 10000 });

  // 2. Create Project
  // Navigate to Projekte using Sidebar
  await page.locator('button', { hasText: 'Projekte' }).first().click();
  // Click "+ Neues Projekt"
  await page.getByRole('button', { name: /Neues Projekt/i }).click();
  
  // Select Kunde in ProjektCreateModal
  await page.locator('div:has(label:has-text("Kunde")) >> select').selectOption({ label: 'Livit AG' }).catch(() => {});

  // Fill out ProjektCreateModal
  await fillInput('Projektname', 'Wohnungssanierung 3. OG');
  await fillInput('Adresse', 'Schwarztorstrasse 26, 3007 Bern'); 
  
  // Save Project
  await page.getByRole('button', { name: /Projekt erstellen/i }).click();

  // Redirected to ProjektDetailView
  await expect(page.getByRole('heading', { name: /Wohnungssanierung 3. OG/i })).toBeVisible({ timeout: 10000 });

  // 3. Create Offerte
  await page.locator('button', { hasText: 'Offerten' }).first().click();
  await page.getByRole('button', { name: /Neue Offerte/i }).click();

  // OffertenWizard Step 1: Kunde 
  await page.locator('select').first().selectOption({ label: 'Livit AG' }).catch(() => {});
  await page.getByRole('button', { name: /Weiter/i }).click();

  // Step 2: Projekt 
  await page.locator('select').first().selectOption({ label: 'Wohnungssanierung 3. OG' }).catch(() => {});
  await page.getByRole('button', { name: /Weiter/i }).click();

  // Step 3: Leistungen
  await page.getByRole('button', { name: /Neue Position/i }).click();
  await page.waitForTimeout(500); 
  await page.locator('input[placeholder*="eschreibung"]').fill('Wände streichen').catch(() => {});
  await page.locator('input[placeholder*="0"]').first().fill('50').catch(() => {});
  await page.locator('input[placeholder*="0.00"]').fill('25').catch(() => {});
  await page.getByRole('button', { name: /Speichern/i }).click();
  await page.getByRole('button', { name: /Weiter/i }).click();

  // Step 4: Texte
  await page.locator('button:has-text("Standard")').first().click(); // Einleitung
  await page.locator('button:has-text("Standard")').nth(1).click(); // Schluss
  await page.getByRole('button', { name: /Weiter/i }).click();

  // Step 5: Abschluss
  await page.getByRole('button', { name: /Offerte speichern/i }).click();

  // Wait until Offerte detail view appears
  await expect(page.getByText('Gerne unterbreiten wir Ihnen folgende Offerte:')).toBeVisible({ timeout: 15000 });
  
  // 4. Create Rechnung
  // Click "Rechnung erstellen"
  await page.getByRole('button', { name: /Rechnung erstellen/i }).click();

  // RechnungenWizard Step 1: Referenz (Offerte should be preselected)
  await page.getByRole('button', { name: /Weiter/i }).click();

  // Step 2: Rechnungsdetails
  await page.getByRole('button', { name: /Weiter/i }).click();

  // Step 3: Leistungen
  await page.getByRole('button', { name: /Weiter/i }).click();

  // Step 4: Texte
  await page.locator('button:has-text("Standard")').first().click(); // Einleitung
  await page.locator('button:has-text("Standard")').nth(1).click(); // Schluss
  await page.getByRole('button', { name: /Weiter/i }).click();

  // Step 5: Abschluss
  await page.getByRole('button', { name: /Rechnung speichern/i }).click();

  // Wait until Rechnung detail view appears
  await expect(page.getByText('Gerne stellen wir Ihnen folgende Arbeiten in Rechnung:')).toBeVisible({ timeout: 15000 });
  
  console.log("End-to-End Test completed successfully!");
});
