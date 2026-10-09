import { test, expect } from '@playwright/test';

test.describe('Schweizer NPK / CRB & SIA 118 Ausmass Workflow (Prio 3 E2E)', () => {
  test.setTimeout(90000);

  test('Vollständiger NPK & Ausmass Workflow: NPK Kapitel -> KatalogDrawer -> Ausmass Rechner (SIA 118) -> A4 Beilage', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    page.on('console', msg => console.log(`[BROWSER ${msg.type()}]:`, msg.text()));
    page.on('pageerror', err => console.log('[BROWSER UNCAUGHT]:', err.message));

    // 1. Login
    console.log('1. Einloggen...');
    await page.goto('/#login');
    await page.waitForLoadState('networkidle');

    const einloggenBtn = page.getByRole('button', { name: /Einloggen/i }).first();
    if (await einloggenBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await einloggenBtn.click();
      await page.waitForTimeout(500);
    }

    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill('max@muster-malerei.ch');

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('Test1234');

    await page.getByRole('button', { name: /Anmelden/i }).click();
    await page.waitForSelector('text=Dashboard', { timeout: 15000 });
    console.log('✅ Dashboard erreicht.');

    // 2. Navigiere zu Offerten
    console.log('2. Navigiere zu Offerten...');
    await page.locator('button:has-text("Offerten")').first().click();
    await page.waitForTimeout(1000);

    // 3. Neue Offerte erstellen
    console.log('3. Öffne DocumentCreateModal...');
    const createBtn = page.locator('button:has-text("Neue Offerte erstellen"):visible').first();
    await createBtn.waitFor({ state: 'visible', timeout: 10000 });
    await createBtn.click();
    await page.waitForTimeout(600);

    // Wähle Kunde
    const kundeSelect = page.locator('select:has(option:has-text("Kunde auswählen"))').first();
    await kundeSelect.selectOption({ index: 1 });
    await page.waitForTimeout(300);

    // Klick auf "Weiter zum Editor"
    const weiterBtn = page.getByRole('button', { name: /Weiter zum Editor/i });
    await weiterBtn.waitFor({ state: 'visible', timeout: 8000 });
    await weiterBtn.click();
    await expect(page.locator('text=Leistungsverzeichnis')).toBeVisible({ timeout: 15000 });
    console.log('✅ Offerte Editor geöffnet.');

    // 4. Teste "+ NPK Kapitel" Button
    console.log('4. Teste NPK Kapitel hinzufügen...');
    const npkKapitelBtn = page.locator('button:has-text("+ NPK Kapitel")').first();
    await npkKapitelBtn.waitFor({ state: 'visible', timeout: 8000 });
    await npkKapitelBtn.click();
    await page.waitForTimeout(400);

    // Wähle Kapitel 675 aus dem Dropdown
    const chapterItem = page.locator('button:has-text("675 Maler-, Tapezierer-")').first();
    await chapterItem.waitFor({ state: 'visible', timeout: 5000 });
    await chapterItem.click();
    await page.waitForTimeout(500);

    // Prüfe, ob das Kapitel in der Tabelle erscheint
    await expect(page.locator('text=[NPK 675]')).toBeVisible();
    console.log('✅ NPK Kapitel 675 erfolgreich in Leistungsverzeichnis eingefügt.');

    // 5. Teste "+ Aus Katalog" (NPK Drawer)
    console.log('5. Teste Katalog Drawer & NPK Tab...');
    const katalogBtn = page.locator('button:has-text("+ Aus Katalog")').first();
    await katalogBtn.click();
    await page.waitForTimeout(600);

    // Prüfe, ob NPK Drawer geöffnet ist und Schweizer Tab aktiv ist
    await expect(page.locator('text=Schweizer NPK / CRB')).toBeVisible();
    
    // Wähle eine NPK Position
    const npkItem = page.locator('text=675.211.200').first();
    await npkItem.waitFor({ state: 'visible', timeout: 5000 });
    await npkItem.click();
    await page.waitForTimeout(300);

    // Klick auf "Ausgewählte einfügen"
    const insertBtn = page.locator('button:has-text("Ausgewählte einfügen")');
    await insertBtn.click();
    await page.waitForTimeout(600);

    // Prüfe NPK Code Badge in der Zeile
    await expect(page.locator('text=NPK 675.211.200').first()).toBeVisible();
    console.log('✅ NPK Position 675.211.200 aus Katalog eingefügt.');

    // 6. Teste Schweizer Ausmass Rechner (SIA 118)
    console.log('6. Öffne Ausmass Rechner...');
    const ausmassBtn = page.locator('button:has-text("📐 Ausmass")').first();
    await ausmassBtn.waitFor({ state: 'visible', timeout: 5000 });
    await ausmassBtn.click();
    await page.waitForTimeout(500);

    // Prüfe Modal Header
    await expect(page.locator('text=Schweizer Bau-Ausmass & SIA 118 Rechner')).toBeVisible();
    await expect(page.locator('text=SIA 118 Art. 141 Normregel')).toBeVisible();

    // Wende Schnell-Vorlage "+ Raum 4 Wände" an
    console.log('7. Wende Raum-Vorlage an...');
    const raumTplBtn = page.locator('button:has-text("+ Raum 4 Wände")').first();
    await raumTplBtn.click();
    await page.waitForTimeout(400);

    // Prüfe ob Berechnungen & SIA 118 Übermessen angezeigt werden
    await expect(page.locator('text=SIA 118: Übermessen').first()).toBeVisible();
    await expect(page.locator('text=Berechnete Netto-Menge')).toBeVisible();

    // Klick auf "Menge & Ausmass übernehmen"
    const saveAusmassBtn = page.locator('button:has-text("Ausmass übernehmen")').first();
    await saveAusmassBtn.click();
    await page.waitForTimeout(600);

    // Prüfe ob grünes Ausmass-Pill in der Tabelle sichtbar ist
    await expect(page.locator('text=Ausmass:').first()).toBeVisible();
    console.log('✅ Ausmass erfolgreich berechnet und übernommen.');

    // 7. A4 Druckvorschau & Ausmass-Beilage prüfen
    console.log('8. Prüfe A4 Vorschau & Ausmass-Beilage...');
    // Im Desktop Split-Screen ist die A4 Vorschau live sichtbar
    await expect(page.locator('text=Ausmass-Beilage gemäss SIA 118').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Massenberechnung & Detailliertes Ausmass').first()).toBeVisible();
    console.log('✅ A4 Ausmass-Beilage gemäss SIA 118 erfolgreich gerendert.');

    // Speichere die Offerte
    console.log('Speichere Offerte...');
    const saveChangesBtn = page.locator('button:has-text("Änderungen speichern")').first();
    await saveChangesBtn.click();
    await page.waitForTimeout(1500);

    // 8. Teste Leistungskatalog NPK Import
    console.log('9. Navigiere zum Leistungskatalog...');
    await page.locator('button:has-text("Katalog")').first().click();
    await page.waitForTimeout(1000);

    const npkImportHeaderBtn = page.locator('button:has-text("NPK / CRB Vorlagen")').first();
    await npkImportHeaderBtn.waitFor({ state: 'visible', timeout: 8000 });
    await npkImportHeaderBtn.click();
    await page.waitForTimeout(500);

    // Prüfe NPK Import Modal
    await expect(page.locator('text=Schweizer NPK / CRB Vorlagen importieren')).toBeVisible();
    await expect(page.locator('text=675 Maler-, Tapezierer-')).toBeVisible();

    // Schliesse Modal
    await page.locator('button[aria-label="Schliessen"]').first().click();
    await page.waitForTimeout(300);

    console.log('🎉 E2E Test für Schweizer NPK / CRB & SIA 118 Ausmass erfolgreich abgeschlossen!');
  });
});
