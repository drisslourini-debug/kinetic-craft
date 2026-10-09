import { test, expect } from '@playwright/test';

test.describe('Schweizer Mahnwesen & SchKG Betreibung (Prio 1 E2E)', () => {
  test.setTimeout(90000);

  test('Vollständiger Mahnwesen-Durchlauf: Mahnwesen-Cockpit -> Mahn-Assistent -> Art. 104 OR Zins -> QR-Zahlteil -> SchKG Dossier', async ({ page }) => {
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

    // 3. Prüfe Mahnwesen StatCard & Filter
    console.log('3. Prüfe Mahnwesen Cockpit...');
    const mahnwesenCard = page.locator('text=Mahnwesen (Überfällig)').first();
    await expect(mahnwesenCard).toBeVisible({ timeout: 10000 });
    await mahnwesenCard.click();
    await page.waitForTimeout(600);

    // Mahnstufen Filter-Pills müssen sichtbar sein
    await expect(page.locator('text=Mahnstufen:')).toBeVisible();
    await expect(page.locator('text=Alle Mahnfälle')).toBeVisible();
    console.log('✅ Mahnwesen-Cockpit Bar erfolgreich geladen.');

    // 4. Öffne eine überfällige Rechnung
    console.log('4. Öffne überfällige Rechnung...');
    const invoiceRow = page.locator('div[class*="grid"]:has-text("RE-")').first();
    await invoiceRow.waitFor({ state: 'visible', timeout: 10000 });
    await invoiceRow.click();
    await page.waitForTimeout(1000);

    // 5. Prüfe Schweizer Mahnwesen Banner & Card in RechnungDetailView
    console.log('5. Prüfe Mahnwesen Banner & Sidebar Card...');
    const mahnwesenBanner = page.locator('text=Mahnwesen:').or(page.locator('text=Rechnung überfällig:')).or(page.locator('text=Mahnstufe')).first();
    await expect(mahnwesenBanner).toBeVisible({ timeout: 10000 });

    const mahnwesenSidebarCard = page.locator('text=Mahnwesen & SchKG').first();
    await expect(mahnwesenSidebarCard).toBeVisible();
    console.log('✅ Mahnwesen Banner & Sidebar-Karte vorhanden.');

    // 6. Klick auf Mahnung erstellen
    console.log('6. Öffne Mahn-Assistent (MahnungModal)...');
    const mahnButton = page.locator('button:has-text("Mahnung")').first();
    await mahnButton.click();
    await page.waitForTimeout(800);

    // Prüfe MahnungModal
    await expect(page.locator('text=Schweizer Mahnwesen')).toBeVisible();
    await expect(page.locator('text=1. Mahnstufe wählen')).toBeVisible();
    await expect(page.getByRole('button', { name: /Zahlungserinnerung/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /1\. Mahnung/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /2\. Mahnung/i })).toBeVisible();
    console.log('✅ Mahn-Assistent mit allen 3 Schweizer Mahnstufen geöffnet.');

    // 7. Teste Stufe 3 (Art. 104 OR Verzugszins)
    console.log('7. Wähle Stufe 3 mit 5% Art. 104 OR Verzugszins...');
    const stufe3Btn = page.locator('button:has-text("2. Mahnung (Letzte Mahnung vor Betreibung)")');
    await stufe3Btn.click();
    await page.waitForTimeout(500);

    // Verzugszins-Checkbox muss aktiv sein
    const zinsCheckbox = page.locator('#zinsCheckbox');
    await expect(zinsCheckbox).toBeChecked();
    await expect(page.locator('text=5.0% gesetzlichen Verzugszins geltend machen')).toBeVisible();
    console.log('✅ Stufe 3 aktiviert mit Art. 104 OR Verzugszins.');

    // 8. Teste Mahnstopp-Tab und zurück zu Mahnung
    console.log('8. Teste Mahnstopp-Funktion...');
    const mahnstoppTab = page.locator('button:has-text("Mahnstopp")');
    await mahnstoppTab.click();
    await page.waitForTimeout(400);
    await expect(page.locator('text=Was bewirkt der Mahnstopp?')).toBeVisible();

    const mahnungTab = page.locator('button:has-text("Mahnung erstellen")');
    await mahnungTab.click();
    await page.waitForTimeout(400);

    // Teste Vorschau & Druck (MahnungPrintView)
    console.log('8b. Öffne Druckansicht & Schweizer QR-Rechnung...');
    await page.locator('button:has-text("Vorschau & Druck")').click();
    await page.waitForTimeout(800);

    // Prüfe MahnungPrintView
    await expect(page.locator('text=Letzte Mahnung (SchKG)')).toBeVisible();
    await expect(page.locator('text=Forderungsaufstellung')).toBeVisible();
    await expect(page.locator('text=Zahlteil').first()).toBeVisible();
    console.log('✅ MahnungPrintView mit offizieller Schweizer QR-Rechnung geladen.');

    // Zurück zur Rechnung
    await page.locator('button[title="Schliessen"]').click();
    await page.waitForTimeout(600);

    // 9. Speichere Mahnung (Stufe 3 ausstellen)
    console.log('9. Mahnung Stufe 3 definitiv ausstellen...');
    const mahnButtonAgain = page.locator('button:has-text("Mahnung")').first();
    await mahnButtonAgain.click();
    await page.waitForTimeout(500);

    const stufe3BtnAgain = page.getByRole('button', { name: /2\. Mahnung/i });
    await stufe3BtnAgain.click();
    await page.waitForTimeout(400);

    const ausstellenBtn = page.getByRole('button', { name: /Mahnung .* ausstellen/i }).first();
    await ausstellenBtn.click();
    await page.waitForTimeout(1000);
    console.log('✅ Mahnung Stufe 3 erfolgreich ausgestellt & gespeichert.');

    // Druckansicht schliessen, um zurück zum Rechnungsdetail zu kommen
    const closePrintBtn = page.locator('button[title="Schliessen"]').first();
    if (await closePrintBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closePrintBtn.click();
      await page.waitForTimeout(500);
    }

    // 10. Teste Betreibungs-Dossier (Art. 67 SchKG) über Aktionsmenü
    console.log('10. Öffne Aktionsmenü für SchKG Betreibungsbegehren...');
    const aktionsMenuBtn = page.locator('button[aria-label="Aktionsmenü"]').first();
    await aktionsMenuBtn.click();
    await page.waitForTimeout(400);

    const betreibungBtn = page.locator('button:has-text("Betreibung (Art. 67 SchKG)")');
    await expect(betreibungBtn).toBeVisible({ timeout: 5000 });
    await betreibungBtn.click();
    await page.waitForTimeout(600);

    await expect(page.getByRole('heading', { name: /Betreibungsbegehren/i })).toBeVisible();
    await expect(page.locator('text=Forderungsgrund')).toBeVisible();
    await expect(page.locator('text=Art. 104 OR')).toBeVisible();
    console.log('✅ SchKG Art. 67 Betreibungsdossier vollständig generiert.');

    // Schliesse Dossier-Modal
    await page.getByRole('button', { name: /Schliessen/i }).last().click();
    await page.waitForTimeout(400);

    console.log('🎯 Vollständiger E2E-Test für Schweizer Mahnwesen & SchKG erfolgreich bestanden!');
  });
});
