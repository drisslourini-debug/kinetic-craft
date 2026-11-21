import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = './scratch/screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Dokumentenablage & Offerten/Rechnungen PDF Öffnen-Test', () => {

  test('Archiv Offerten & Rechnungen: Vollständige Klick- und Öffnungsprüfung', async ({ browser }) => {
    test.setTimeout(60000);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    console.log('1. Login als Leandro Lüthi...');
    await page.goto('/#login');
    await page.waitForLoadState('networkidle');

    const einloggenBtn = page.getByRole('button', { name: /Einloggen/i }).first();
    if (await einloggenBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await einloggenBtn.click();
      await page.waitForTimeout(500);
    }

    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('leandro@atelier-77.ch');
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('Leandro77!');
    await page.getByRole('button', { name: /Anmelden/i }).click();

    await page.waitForSelector('text=Willkommen zurück, Leandro', { timeout: 15000 });
    console.log('✓ Login erfolgreich.');

    // 2. Navigiere ins Archiv
    console.log('2. Navigiere ins Archiv...');
    await page.locator('button:has-text("Archiv"), a:has-text("Archiv")').first().click();
    await page.waitForTimeout(1000);

    const desktopView = page.locator('div.hidden.md\\:flex.flex-1');
    await expect(desktopView.getByRole('button', { name: 'Archiv', exact: true })).toBeVisible();

    // 3. Öffne Systemordner "Offerten"
    console.log('3. Öffne Ordner "Offerten"...');
    await desktopView.locator('div:has-text("Offerten")').last().click();
    await page.waitForTimeout(1200);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'archive_offerten_all_pdfs.png') });
    console.log('   ✓ Screenshot: Archiv Offerten gesichert');

    // Prüfe, dass OF-392 und OF-3866 sichtbar sind
    await expect(desktopView.getByText('OF-392')).toBeVisible();
    await expect(desktopView.getByText('OF-3866')).toBeVisible();

    // 4. Klick auf Offerte OF-392 Karte zum Öffnen des PDFs abfangen
    console.log('4. Klick auf OF-392 Karte zum Öffnen des PDFs...');
    const of392Card = desktopView.locator('div:has-text("OF-392")').last();
    await expect(of392Card).toBeVisible();

    const [download] = await Promise.all([
      context.waitForEvent('download', { timeout: 10000 }),
      of392Card.click()
    ]);

    console.log('   ✓ Download/PDF erfolgreich geöffnet:', download.suggestedFilename());
    console.log('   ✓ Download URL:', download.url());
    expect(download.url()).toContain('anhange');
    expect(download.url()).toContain('OF-392');
    expect(download.url()).toContain('.pdf');

    // Prüfe HTTP Status des PDFs
    const res = await page.request.get(download.url());
    console.log('   ✓ PDF HTTP Status:', res.status());
    expect(res.status()).toBe(200);

    // 5. Breadcrumb zurück zu Archiv
    console.log('5. Zurück zu Archiv...');
    await desktopView.getByRole('button', { name: 'Archiv', exact: true }).click();
    await page.waitForTimeout(800);

    // 6. Öffne Ordner "Buchhaltung & Rechnungen"
    console.log('6. Öffne Ordner "Buchhaltung & Rechnungen"...');
    await desktopView.locator('div:has-text("Buchhaltung & Rechnungen")').last().click();
    await page.waitForTimeout(1200);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'archive_rechnungen_all_pdfs.png') });
    console.log('   ✓ Screenshot: Archiv Rechnungen gesichert');

    // Prüfe, dass RE-384 sichtbar ist
    const re384Card = desktopView.locator('div:has-text("RE-384")').last();
    await expect(re384Card).toBeVisible();

    // 7. Klick auf Rechnung RE-384 Karte zum Öffnen des PDFs
    console.log('7. Klick auf RE-384 Karte zum Öffnen des PDFs...');
    const [downloadRech] = await Promise.all([
      context.waitForEvent('download', { timeout: 10000 }),
      re384Card.click()
    ]);

    console.log('   ✓ Rechnung PDF Download abgefangen:', downloadRech.suggestedFilename());
    expect(downloadRech.url()).toContain('anhange');
    expect(downloadRech.url()).toContain('RE-384');
    expect(downloadRech.url()).toContain('.pdf');

    const resRech = await page.request.get(downloadRech.url());
    console.log('   ✓ Rechnung PDF HTTP Status:', resRech.status());
    expect(resRech.status()).toBe(200);

    // 8. Wechsle ins Offerten-Modul -> OF-392 Detailansicht -> Badge "Im Archiv gesichert"
    console.log('8. Wechsle ins Offerten-Modul zu OF-392...');
    await page.goto('/offerten?offerteId=2951');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const archivBadge = page.locator('button:has-text("Im Archiv gesichert")').first();
    await expect(archivBadge).toBeVisible();

    // Klick auf das Badge öffnet ebenfalls das PDF
    console.log('9. Klick auf Archiv-Badge in Offerte Detail...');
    const [downloadBadge] = await Promise.all([
      context.waitForEvent('download', { timeout: 10000 }),
      archivBadge.click()
    ]);
    console.log('   ✓ Popup aus Badge Download abgefangen:', downloadBadge.suggestedFilename());
    expect(downloadBadge.url()).toContain('OF-392');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'offerte_detail_archiv_badge.png') });
    console.log('   ✓ Screenshot: Offerte Detail mit Archiv-Badge gesichert');

    await context.close();
    console.log('🎉 Vollständiger Test erfolgreich: Alle Offerten und Rechnungen öffnen sich als PDF mit HTTP 200!');
  });

});
