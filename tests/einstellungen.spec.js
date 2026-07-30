import { test, expect } from '@playwright/test';

test.describe('Einstellungen - Hardtests & Stresstests', () => {

  // Before each test, go to Einstellungen page
  test.beforeEach(async ({ page }) => {
    await page.goto('/?testBypass=true');
    // Klicke in der Sidebar auf Einstellungen
    await page.getByRole('button', { name: /Einstellungen/i }).click();
    
    // Wait for the page to load by checking if Firmenname is visible (or bearbeiten button)
    await page.getByRole('heading', { name: 'Stammdaten & Adresse' }).waitFor();
  });

  test('1. XSS und SQL-Injection in Firmenname', async ({ page }) => {
    // Klicke auf den Bearbeiten Button im ersten Block (Stammdaten)
    const bearbeitenBtns = await page.getByRole('button', { name: 'Bearbeiten' }).all();
    await bearbeitenBtns[0].click();

    // SQL Injection
    const sqlPayload = "' OR 1=1; DROP TABLE kunden;--";
    const firmennameInput = page.getByLabel('Firmenname');
    await firmennameInput.fill(sqlPayload);
    
    // XSS Payload
    const xssPayload = "<script>alert('XSS')</script>";
    const strasseInput = page.getByLabel('Strasse & Nr.');
    await strasseInput.fill(xssPayload);

    // Save
    await page.getByRole('button', { name: 'Speichern' }).click();
    await page.waitForTimeout(1000); // Wait for save

    // Reload page to verify data persistence and UI stability
    await page.reload();
    await page.getByRole('button', { name: /Einstellungen/i }).click();
    await page.getByRole('heading', { name: 'Stammdaten & Adresse' }).waitFor();

    // Check if UI is broken by XSS (if alert fired, page might hang, but playwright catches it)
    // Check if SQL injection destroyed the DB (we expect the literal string to be saved)
    await expect(page.getByText(sqlPayload)).toBeVisible();
    await expect(page.getByText(xssPayload)).toBeVisible();
  });

  test('2. Extremwerte (10.000 Zeichen)', async ({ page }) => {
    const bearbeitenBtns = await page.getByRole('button', { name: 'Bearbeiten' }).all();
    await bearbeitenBtns[0].click();

    const longString = 'A'.repeat(10000);
    const firmennameInput = page.getByLabel('Firmenname');
    await firmennameInput.fill(longString);

    await page.getByRole('button', { name: 'Speichern' }).click();
    await page.waitForTimeout(2000); // Give it time to save a big payload

    await page.reload();
    await page.getByRole('button', { name: /Einstellungen/i }).click();
    await page.getByRole('heading', { name: 'Stammdaten & Adresse' }).waitFor();

    // Es sollte geladen werden, auch wenn es ewig lang ist.
    // Playwright `toHaveValue` or checking the text on the page might be slow, but we can check if it's there.
    const textContent = await page.content();
    expect(textContent).toContain(longString);
  });

  test('3. Invalid Formats (Nummernkreise)', async ({ page }) => {
    // Wechsel zum Tab "Nummern & Fristen"
    await page.getByText('Nummern & Fristen').click();
    await page.getByLabel('Startnummer Offerten').waitFor();

    const bearbeitenBtns = await page.getByRole('button', { name: 'Bearbeiten' }).all();
    // Das erste Bearbeiten im aktuellen Tab sollte der Block sein
    await bearbeitenBtns[0].click();

    const startnummerInput = page.getByLabel('Startnummer Offerten');
    
    // Typen von Buchstaben in Number Field
    // Da React <input type="number"> Buchstaben ignoriert (außer 'e'), testen wir 'e' und andere Zeichen
    await startnummerInput.fill('100e5');
    
    // Set Zahlungsfrist to negative
    const zahlungsfristInput = page.getByLabel('Zahlungsfrist (Tage)');
    await zahlungsfristInput.fill('-10');

    await page.getByRole('button', { name: 'Speichern' }).click();
    await page.waitForTimeout(1000);

    // Verify
    await page.reload();
    await page.getByRole('button', { name: /Einstellungen/i }).click();
    await page.getByText('Nummern & Fristen').click();
    await page.getByLabel('Startnummer Offerten').waitFor();

    // Das System speichert es möglicherweise als NaN oder negativen Wert. 
    // Wir protokollieren das Ergebnis im Report.
  });

  test('4. Massenerstellung & Löschen (Stresstest Textvorlagen)', async ({ page }) => {
    test.setTimeout(120000); // 2 Minuten für diesen Stresstest

    // Wechsel zum Tab "Texte & Vorlagen"
    await page.getByText('Texte & Vorlagen').click();
    await page.getByRole('heading', { name: 'Offerten Vorlagen' }).waitFor();

    const targetCount = 50;

    // Massenerstellung
    for (let i = 0; i < targetCount; i++) {
      // "+ Neue Vorlage" beim ersten Block (Offerte Einleitung)
      const newBtns = await page.getByRole('button', { name: '+ Neue Vorlage' }).all();
      await newBtns[0].click();

      // Modal füllen
      await page.getByLabel('Titel der Vorlage').fill(`Stress Test ${i}`);
      await page.getByLabel('Text').fill(`Dies ist ein automatisiert generierter Stresstest-Text Nummer ${i}. Er wird verwendet, um die Performance des State-Managements und der Supabase-Anbindung unter Belastung zu prüfen.`);
      
      await page.getByRole('button', { name: 'Speichern', exact: true }).click();
      
      // Kurze Wartezeit, um React render-Zyklus nicht zu überholen
      await page.waitForTimeout(200);
    }

    // Lösch-Stresstest (lösche 20 davon)
    const deleteBtns = await page.getByRole('button').filter({ has: page.locator('svg') }).all();
    // In der UI haben Lösch-Buttons SVG Icons. Wir klicken einfach sehr schnell auf die ersten 20.
    // Wir müssen vorsichtig sein, da jeder Klick ein Confirmation-Muss auslöst? 
    // In Settings: handleDeleteTemplate hat ein window.confirm!
    // Also Dialog auto-accept einrichten:
    page.on('dialog', dialog => dialog.accept());

    let deleted = 0;
    // Neu holen, um aktuelle DOM-Nodes zu haben
    const currentDeleteBtns = await page.locator('button').filter({ hasText: '' }).all();
    
    for (const btn of currentDeleteBtns) {
      if (deleted >= 20) break;
      const isVisible = await btn.isVisible();
      // Wenn es aussieht wie ein Trash-Icon (Hat z.B. d="M19 7l-.867...")
      const html = await btn.innerHTML();
      if (isVisible && html.includes('M19 7l-.867')) {
        await btn.click();
        await page.waitForTimeout(100);
        deleted++;
      }
    }
    
    // Warten, bis DB Sync durch ist
    await page.waitForTimeout(3000);
  });

});
