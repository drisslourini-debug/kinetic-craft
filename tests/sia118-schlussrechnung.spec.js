import { test, expect } from '@playwright/test';

test.describe('SIA 118 Schlussrechnung & Garantie-Rückbehalt (Prio 2 E2E)', () => {
  test.setTimeout(90000);

  test('Vollständiger SIA 118 Workflow: Typ-Auswahl -> Akonto-Abzug -> 5% Rückbehalt -> Fälliger Betrag -> A4 & QR-Bill', async ({ page }) => {
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

    // 2. Navigiere zu Rechnungen
    console.log('2. Navigiere zu Rechnungen...');
    await page.locator('button:has-text("Rechnungen")').first().click();
    await page.waitForTimeout(1000);

    // 3. Öffne DocumentCreateModal über Desktop Button
    console.log('3. Öffne DocumentCreateModal...');
    const createBtn = page.locator('button:has-text("Neue Rechnung erstellen"):visible').first();
    await createBtn.waitFor({ state: 'visible', timeout: 10000 });
    await createBtn.click();
    await page.waitForTimeout(600);

    // Prüfe Modal und Typ-Auswahl
    await expect(page.getByRole('heading', { name: /Neue Rechnung erstellen/i })).toBeVisible({ timeout: 8000 });
    await expect(page.locator('button:has-text("SIA 118 Schluss")')).toBeVisible();

    // Wähle Kunde
    const kundeSelect = page.locator('select:has(option:has-text("Kunde auswählen"))').first();
    await kundeSelect.selectOption({ index: 1 });
    await page.waitForTimeout(300);

    // Wähle SIA 118 Schlussrechnung Typ
    console.log('4. Wähle SIA 118 Schlussrechnung Typ...');
    await page.locator('button:has-text("SIA 118 Schluss")').click();
    await expect(page.locator('text=SIA 118 Konformität:')).toBeVisible();

    // Weiter zum Editor
    const weiterBtn = page.getByRole('button', { name: /Weiter zum Editor/i });
    await weiterBtn.click();
    await page.waitForTimeout(2000);

    // 5. Im Editor: Position erfassen
    console.log('5. Bearbeite Schlussrechnung im Editor...');
    await expect(page.locator('text=Leistungsverzeichnis')).toBeVisible({ timeout: 10000 });

    // Position hinzufügen
    const addPosBtn = page.locator('button:has-text("Position hinzufügen")').first();
    if (await addPosBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addPosBtn.click();
      await page.waitForTimeout(300);
    }

    // Position ausfüllen
    const descField = page.locator('textarea[placeholder*="Beschreibung"]').first();
    await descField.fill('Maler- und Fassadenarbeiten Neubau Villa');

    const mengeField = page.locator('input[placeholder="0"]').first();
    await mengeField.fill('1');

    const preisField = page.locator('input[placeholder="0.00"]').first();
    await preisField.fill('40000');

    // MwSt auf 0 setzen für einfache Nachvollziehbarkeit
    const mwstInput = page.locator('input[type="number"][step="0.1"]').first();
    if (await mwstInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await mwstInput.fill('0');
    }

    // 6. SIA 118 Sektion prüfen & Akonto hinzufügen
    console.log('6. Konfiguriere SIA 118 Akonto-Abzug & 5% Garantie-Rückbehalt...');
    await expect(page.locator('label:has-text("SIA 118 Schlussrechnung")')).toBeVisible();

    // Akonto manuell hinzufügen
    const addAkontoBtn = page.locator('button:has-text("+ Akonto hinzufügen")');
    await addAkontoBtn.click();
    await page.waitForTimeout(300);

    // Akonto Betrag und Nummer ausfüllen
    const akontoNrInput = page.locator('input[placeholder*="Rechnungs-Nr."]').first();
    await akontoNrInput.fill('RE-2026-AK1');

    const akontoBetragInput = page.locator('input[type="number"][placeholder="0.00"]').last();
    await akontoBetragInput.fill('15000');

    // Live Kalkulation prüfen:
    await page.waitForTimeout(600);
    console.log('Prüfe Live Kalkulation...');
    await expect(page.locator('text=Fälliger Betrag')).toBeVisible();

    // 7. Speichern
    console.log('7. Speichere Schlussrechnung...');
    const saveBtn = page.locator('button:has-text("Änderungen speichern")').first();
    await saveBtn.click();
    await page.waitForTimeout(1500);

    // 8. Prüfe View-Mode
    console.log('8. Prüfe View Mode der SIA 118 Schlussrechnung...');
    await expect(page.locator('text=SIA 118 Schlussabrechnung & Baugarantie')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Art. 154 (Akonto)')).toBeVisible();
    await expect(page.locator('text=Art. 181 (5% Garantie)')).toBeVisible();
    await expect(page.locator('text=RE-2026-AK1').first()).toBeVisible();

    // 9. Prüfe Druckansicht / A4 Vorschau
    console.log('9. Öffne Druckansicht & prüfe Schweizer QR-Bill...');
    const printBtn = page.locator('button[aria-label="PDF anzeigen"], button[title="PDF anzeigen"]').first();
    await printBtn.click();
    await page.waitForTimeout(2000);

    // In Druckansicht: Titel und SIA 118 Tabelle sichtbar
    await expect(page.locator('text=Schlussrechnung nach SIA 118').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Anrechnung bisherige Akonto-Rechnungen:').first()).toBeVisible();
    await expect(page.locator('text=FÄLLIGER SCHLUSSBETRAG').first()).toBeVisible();
    await expect(page.locator('text=/FÄLLIGER SCHLUSSBETRAG.*23/').first()).toBeVisible();

    // QR Zahlteil prüfen
    await expect(page.locator('text=Zahlteil').first()).toBeVisible();
    await expect(page.locator('text=/23[’\'\\s]000\\.00/').first()).toBeVisible();

    console.log('✅ SIA 118 Schlussrechnung E2E-Test erfolgreich abgeschlossen!');
  });
});
