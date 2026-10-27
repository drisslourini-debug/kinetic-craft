import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Amin/.gemini/antigravity/brain/b175e108-b5b2-4fe1-8eb9-d6f67b38b7e1';
const LOCAL_DIR = './scratch/screenshots';

for (const dir of [ARTIFACT_DIR, LOCAL_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function takeScreenshot(page, filename, locator = null) {
  const p1 = path.join(ARTIFACT_DIR, filename);
  const p2 = path.join(LOCAL_DIR, filename);
  if (locator) {
    await locator.screenshot({ path: p1 });
    await locator.screenshot({ path: p2 });
  } else {
    await page.screenshot({ path: p1, fullPage: false });
    await page.screenshot({ path: p2, fullPage: false });
  }
  console.log(`Saved screenshot: ${filename}`);
}

async function loginFlorence(page) {
  await page.goto('/#login');
  await page.waitForLoadState('networkidle');
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill('lourini@bluewin.ch');
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill('FloArt2026!');
  await page.getByRole('button', { name: /Anmelden/i }).click();
  await page.waitForSelector('text=Flo Art', { timeout: 15000 });
}

async function ensureActiveTenant(page, targetName) {
  const isTargetAlready = await page.locator('header, aside').filter({ hasText: targetName }).first().isVisible();
  if (isTargetAlready) return;

  const switcherBtn = page.getByTitle('Betrieb / Standort wechseln').first();
  await switcherBtn.click();
  await page.waitForTimeout(600);

  const targetOption = page.locator('button:visible').filter({ hasText: targetName }).last();
  await targetOption.click();
  await page.waitForTimeout(2000);
}

test.describe('Vollständiger Lebenszyklus: Offerte -> Rechnung -> Mahnung Stufe 1, 2, 3 -> SchKG Betreibung', () => {
  test.setTimeout(180000);

  test('Kompletter Praxislauf mit Neuanlage, Umwandlung, Mahnstufen & Betreibungsbegehren', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await loginFlorence(page);

    // 1. Betrieb: Flo Art – Polsterei aktivieren
    console.log('1. Betrieb Polsterei Ittigen wählen...');
    await ensureActiveTenant(page, 'Flo Art – Polsterei');
    await takeScreenshot(page, 'e2e_01_dashboard_polsterei.png');

    // 2. Modul Offerten: Brandneue Offerte erstellen
    console.log('2. Neue Offerte erstellen...');
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Offerten' }).first().click();
    await page.waitForTimeout(1000);

    const neueOfferteBtn = page.locator('button:visible').filter({ hasText: 'Neue Offerte erstellen' }).first();
    await expect(neueOfferteBtn).toBeVisible({ timeout: 10000 });
    await neueOfferteBtn.click();
    await page.waitForTimeout(800);

    // DocumentCreateModal: Kunde und Projekt auswählen
    const kundeSelect = page.locator('div.fixed select:visible').first();
    const kundeOpt = kundeSelect.locator('option').filter({ hasText: /Beat|Graffenried/i }).first();
    await kundeOpt.waitFor({ state: 'attached', timeout: 10000 });
    const kundeOptVal = await kundeOpt.getAttribute('value');
    if (kundeOptVal) {
      await kundeSelect.selectOption(kundeOptVal);
    }
    await page.waitForTimeout(600);

    // Titel anpassen
    const titleInput = page.locator('input[placeholder*="Offerte für"], input[value*="Offerte"]:visible').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill('Offerte: Meister-Neupolsterung & Samtbezug Art-Déco Fauteuil');
    }

    await takeScreenshot(page, 'e2e_02_offerte_create_modal.png');

    const weiterBtn = page.locator('button:visible').filter({ hasText: 'Weiter zum Editor' }).first();
    await expect(weiterBtn).toBeEnabled({ timeout: 10000 });
    await weiterBtn.click();
    await page.waitForTimeout(2000);

    // 3. Im Offerten-Editor: Details prüfen & speichern
    console.log('3. Offerte im Editor prüfen & anpassen...');
    await expect(page.locator('text=/Offerte OF-|OF-2026/i').first()).toBeVisible({ timeout: 10000 });

    // Speichere die Offerte
    const saveBtn = page.locator('button:visible').filter({ hasText: 'Änderungen speichern' }).first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
    }
    await takeScreenshot(page, 'e2e_03_offerte_editor.png');

    // 4. Offerte PDF-Vorschau & Download testen
    console.log('4. Offerte PDF-Vorschau & Zero-Shift Download prüfen...');
    const printOfferteBtn = page.locator('button:visible', { hasText: 'PDF anzeigen' }).first();
    await expect(printOfferteBtn).toBeVisible();
    await printOfferteBtn.click();
    await page.waitForTimeout(1500);

    const pdfContainer = page.locator('#pdf-pages-container');
    await expect(pdfContainer).toBeVisible();

    const offPage1 = pdfContainer.locator('.a4-page').first();
    const boxBeforeOff = await offPage1.boundingBox();
    expect(boxBeforeOff.x).toBeGreaterThan(100);

    // Prüfe Schweizer Fensterbrief rechts & 4-Spalten Fusszeile
    const offAddressWrapper = offPage1.locator('.a4-address-window-wrapper');
    await expect(offAddressWrapper).toBeVisible();
    const offAddrStyle = await offAddressWrapper.getAttribute('style');
    expect(offAddrStyle).toContain('justify-content: flex-end');

    const offFooter = offPage1.locator('.a4-document-footer');
    await expect(offFooter).toBeVisible();
    const offFooterText = await offFooter.innerText();
    expect(offFooterText).toContain('Flo Art');
    expect(offFooterText).toContain('IBAN:');
    expect(offFooterText).not.toContain('...');
    expect(offFooterText).toContain('Seite 1 von');

    await takeScreenshot(page, 'e2e_04_offerte_pdf_preview.png', offPage1);

    // Teste PDF-Download der Offerte mit 0px Shift
    const offDownloadPromise = page.waitForEvent('download', { timeout: 30000 });
    const offDownloadBtn = page.getByRole('button', { name: /PDF herunterladen/i });
    await offDownloadBtn.click();

    await page.waitForTimeout(200);
    const boxDuringOff = await offPage1.boundingBox();
    expect(Math.abs(boxDuringOff.x - boxBeforeOff.x)).toBeLessThan(5);

    const offDownload = await offDownloadPromise;
    const offPdfPath = path.resolve('./scratch/lifecycle_downloaded_offerte.pdf');
    await offDownload.saveAs(offPdfPath);
    expect(fs.existsSync(offPdfPath)).toBe(true);
    expect(fs.statSync(offPdfPath).size).toBeGreaterThan(100000);
    console.log(`Offerte PDF erfolgreich heruntergeladen (${fs.statSync(offPdfPath).size} Bytes) mit 0px Shift!`);

    // Schliesse PDF-Vorschau
    await page.locator('button:visible').filter({ hasText: /Zurück/i }).first().click();
    await page.waitForTimeout(1000);

    // 5. Offerte auf "Akzeptiert" setzen und in Rechnung umwandeln
    console.log('5. Offerte akzeptieren und in Rechnung umwandeln...');
    const statusSelect = page.locator('header select:visible, div select:visible').filter({ hasText: /Entwurf|Akzeptiert|Gesendet/i }).first();
    await expect(statusSelect).toBeEnabled({ timeout: 10000 });
    await statusSelect.selectOption('Akzeptiert');
    await page.waitForTimeout(1500);

    const convertBannerBtn = page.locator('button:visible').filter({ hasText: 'Rechnung erstellen' }).first();
    await expect(convertBannerBtn).toBeVisible({ timeout: 10000 });
    await convertBannerBtn.click();
    await page.waitForTimeout(600);

    await takeScreenshot(page, 'e2e_05_convert_modal.png');

    // Im Bestätigungsdialog auf "Rechnung erstellen" klicken
    const confirmConvertBtn = page.locator('div.fixed button:visible').filter({ hasText: 'Rechnung erstellen' }).last();
    await confirmConvertBtn.click();
    await page.waitForTimeout(3000);

    // 6. Neu erstellte Rechnung prüfen
    console.log('6. Neu erstellte Rechnung prüfen...');
    await expect(page.locator('h1:visible, h2:visible, main:visible').filter({ hasText: /Rechnung RE-/i }).first()).toBeVisible({ timeout: 10000 });
    await takeScreenshot(page, 'e2e_06_rechnung_detail.png');

    // 7. Rechnung PDF-Vorschau & Schweizer QR-Bill (SIX Standard)
    console.log('7. Rechnung PDF & QR-Bill (SIX Standard) prüfen...');
    const printRechnungBtn = page.locator('button:visible').filter({ hasText: /PDF anzeigen|Drucken/i }).first();
    await expect(printRechnungBtn).toBeVisible();
    await printRechnungBtn.click();
    await page.waitForTimeout(1500);

    const rPagesContainer = page.locator('#pdf-pages-container');
    await expect(rPagesContainer).toBeVisible();
    const rPages = rPagesContainer.locator('.a4-page');
    const rPageCount = await rPages.count();
    console.log(`Rechnung gerenderte Seiten: ${rPageCount}`);
    expect(rPageCount).toBeGreaterThanOrEqual(1);

    // Page 1: Rechnungs-Titel, Tabelle, 4-Spalten Fusszeile
    const rPage1 = rPages.nth(0);
    const rBoxBefore = await rPage1.boundingBox();
    expect(rBoxBefore.x).toBeGreaterThan(100);

    const rFooter = rPage1.locator('.a4-document-footer');
    if (await rFooter.isVisible().catch(() => false)) {
      const rFooterText = await rFooter.innerText();
      expect(rFooterText).toContain('Flo Art');
      expect(rFooterText).toContain('IBAN:');
      expect(rFooterText).not.toContain('...');
    }
    await takeScreenshot(page, 'e2e_07_rechnung_pdf_page1.png', rPage1);

    // QR-Bill nach Schweizer SIX-Standard (auf Page 1 unten oder separater Page 2)
    await expect(rPagesContainer.locator('text=/Zahlteil|Empfangsschein/i').first()).toBeVisible();
    await expect(rPagesContainer.locator('svg').first()).toBeVisible();
    await takeScreenshot(page, 'e2e_08_rechnung_pdf_qr_page.png');

    // Teste PDF-Download der Rechnung mit 0px Shift
    const rDownloadPromise = page.waitForEvent('download', { timeout: 30000 });
    const rDownloadBtn = page.getByRole('button', { name: /PDF herunterladen/i });
    await rDownloadBtn.click();

    await page.waitForTimeout(200);
    const rBoxDuring = await rPage1.boundingBox();
    expect(Math.abs(rBoxDuring.x - rBoxBefore.x)).toBeLessThan(5);

    const rDownload = await rDownloadPromise;
    const rPdfPath = path.resolve('./scratch/lifecycle_downloaded_rechnung.pdf');
    await rDownload.saveAs(rPdfPath);
    expect(fs.existsSync(rPdfPath)).toBe(true);
    expect(fs.statSync(rPdfPath).size).toBeGreaterThan(100000);
    console.log(`Rechnung PDF erfolgreich heruntergeladen (${fs.statSync(rPdfPath).size} Bytes) mit 0px Shift!`);

    // Schliesse PDF-Vorschau
    await page.locator('button:visible').filter({ hasText: /Zurück/i }).first().click();
    await page.waitForTimeout(1000);

    // Helper: MahnungModal öffnen
    const openMahnModal = async () => {
      const direct = page.locator('button:visible').filter({ hasText: /Mahnung öffnen|Mahnstufe|Mahnen/i }).first();
      if (await direct.isVisible({ timeout: 2000 }).catch(() => false)) {
        await direct.click();
      } else {
        const menuBtn = page.locator('button[aria-label="Aktionsmenü"]:visible').first();
        await menuBtn.click();
        await page.waitForTimeout(400);
        const item = page.locator('button:visible').filter({ hasText: /Mahnwesen \(Stufen 1–3\)/i }).first();
        await item.click();
      }
      await page.waitForTimeout(800);
      await expect(page.locator('text=Schweizer Mahnwesen').first()).toBeVisible();
    };

    // 8. Mahnung Stufe 1: Zahlungserinnerung
    console.log('8. Mahnung Stufe 1 (Zahlungserinnerung) testen...');
    await openMahnModal();

    // Wähle Stufe 1
    const stufe1Btn = page.locator('button:visible').filter({ hasText: /Zahlungserinnerung/i }).first();
    await stufe1Btn.click();
    await page.waitForTimeout(500);

    await takeScreenshot(page, 'e2e_09_mahnung_modal_stufe1.png');

    // Vorschau & Druck für Stufe 1
    const vorschauBtn1 = page.locator('button:visible').filter({ hasText: 'Vorschau & Druck' }).first();
    await vorschauBtn1.click();
    await page.waitForTimeout(1500);

    const mContainer1 = page.locator('#mahnung-pages-container');
    await expect(mContainer1).toBeVisible();
    await expect(mContainer1.locator('text=/Zahlungserinnerung/i').first()).toBeVisible();

    // Zero-Shift Download Stufe 1
    const m1Page1 = mContainer1.locator('.a4-page').first();
    const m1BoxBefore = await m1Page1.boundingBox();
    const m1DownloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await page.getByRole('button', { name: /PDF herunterladen/i }).click();
    await page.waitForTimeout(200);
    const m1BoxDuring = await m1Page1.boundingBox();
    expect(Math.abs(m1BoxDuring.x - m1BoxBefore.x)).toBeLessThan(5);
    const m1Download = await m1DownloadPromise;
    const m1PdfPath = path.resolve('./scratch/lifecycle_downloaded_mahnung_stufe1.pdf');
    await m1Download.saveAs(m1PdfPath);
    expect(fs.statSync(m1PdfPath).size).toBeGreaterThan(100000);
    console.log(`Mahnung Stufe 1 PDF erfolgreich (${fs.statSync(m1PdfPath).size} Bytes)!`);

    // Schliesse Druckansicht
    await page.locator('button:visible').filter({ hasText: /Zurück/i }).first().click();
    await page.waitForTimeout(800);

    // Stufe 1 ausstellen (falls Modal noch offen oder neu öffnen)
    if (!await page.locator('text=Schweizer Mahnwesen').isVisible()) {
      await openMahnModal();
      await page.locator('button:visible').filter({ hasText: /Zahlungserinnerung/i }).first().click();
      await page.waitForTimeout(400);
    }
    const ausstellenBtn1 = page.locator('button:visible').filter({ hasText: /Mahnung.*ausstellen/i }).first();
    await ausstellenBtn1.click();
    await page.waitForTimeout(1500);
    console.log('Mahnung Stufe 1 erfolgreich ausgestellt!');
    await takeScreenshot(page, 'e2e_10_rechnung_gemahnt_stufe1.png');

    // 9. Mahnung Stufe 2: 1. Mahnung (mit CHF 20.00 Spesen)
    console.log('9. Mahnung Stufe 2 (1. Mahnung mit Spesen) testen...');
    await openMahnModal();

    const stufe2Btn = page.locator('button:visible').filter({ hasText: /1\. Mahnung/i }).first();
    await stufe2Btn.click();
    await page.waitForTimeout(500);

    // Prüfe Mahnspesen
    await expect(page.locator('text=Mahnspesen:').first()).toBeVisible();
    await expect(page.locator('text=+ CHF 20.00').first()).toBeVisible();

    await takeScreenshot(page, 'e2e_11_mahnung_modal_stufe2.png');

    // Vorschau & Druck für Stufe 2
    const vorschauBtn2 = page.locator('button:visible').filter({ hasText: 'Vorschau & Druck' }).first();
    await vorschauBtn2.click();
    await page.waitForTimeout(1500);

    const mContainer2 = page.locator('#mahnung-pages-container');
    await expect(mContainer2).toBeVisible();
    await expect(mContainer2.locator('text=/1\. Mahnung/i').first()).toBeVisible();
    await expect(mContainer2.locator('text=/Mahnspesen/i').first()).toBeVisible();

    // Zero-Shift Download Stufe 2
    const m2Page1 = mContainer2.locator('.a4-page').first();
    const m2BoxBefore = await m2Page1.boundingBox();
    const m2DownloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await page.getByRole('button', { name: /PDF herunterladen/i }).click();
    await page.waitForTimeout(200);
    const m2BoxDuring = await m2Page1.boundingBox();
    expect(Math.abs(m2BoxDuring.x - m2BoxBefore.x)).toBeLessThan(5);
    const m2Download = await m2DownloadPromise;
    const m2PdfPath = path.resolve('./scratch/lifecycle_downloaded_mahnung_stufe2.pdf');
    await m2Download.saveAs(m2PdfPath);
    expect(fs.statSync(m2PdfPath).size).toBeGreaterThan(100000);
    console.log(`Mahnung Stufe 2 PDF erfolgreich (${fs.statSync(m2PdfPath).size} Bytes)!`);

    // Schliesse Druckansicht
    await page.locator('button:visible').filter({ hasText: /Zurück/i }).first().click();
    await page.waitForTimeout(800);

    // Stufe 2 ausstellen
    if (!await page.locator('text=Schweizer Mahnwesen').isVisible()) {
      await openMahnModal();
      await page.locator('button:visible').filter({ hasText: /1\. Mahnung/i }).first().click();
      await page.waitForTimeout(400);
    }
    const ausstellenBtn2 = page.locator('button:visible').filter({ hasText: /Mahnung.*ausstellen/i }).first();
    await ausstellenBtn2.click();
    await page.waitForTimeout(1500);
    console.log('Mahnung Stufe 2 erfolgreich ausgestellt!');
    await takeScreenshot(page, 'e2e_12_rechnung_gemahnt_stufe2.png');

    // 10. Mahnung Stufe 3: 2. Mahnung / Letzte Mahnung mit SchKG-Betreibungsandrohung & Art. 104 OR Verzugszins
    console.log('10. Mahnung Stufe 3 (Letzte Mahnung mit SchKG-Androhung & Verzugszins) testen...');
    await openMahnModal();

    const stufe3Btn = page.locator('button:visible').filter({ hasText: /2\. Mahnung/i }).first();
    await stufe3Btn.click();
    await page.waitForTimeout(500);

    // Prüfe Verzugszins nach Art. 104 OR & Betreibungshinweis
    const zinsCheckbox = page.locator('#zinsCheckbox');
    await expect(zinsCheckbox).toBeChecked();
    await expect(page.locator('text=5.0% gesetzlichen Verzugszins geltend machen')).toBeVisible();
    await expect(page.locator('text=SchKG Betreibungs-Rechtshinweis')).toBeVisible();

    await takeScreenshot(page, 'e2e_13_mahnung_modal_stufe3.png');

    // Vorschau & Druck für Stufe 3
    const vorschauBtn3 = page.locator('button:visible').filter({ hasText: 'Vorschau & Druck' }).first();
    await vorschauBtn3.click();
    await page.waitForTimeout(1500);

    const mContainer3 = page.locator('#mahnung-pages-container');
    await expect(mContainer3).toBeVisible();
    await expect(mContainer3.locator('text=/Letzte Mahnung/i').first()).toBeVisible();
    await expect(mContainer3.locator('text=/Forderungsaufstellung nach Schweizer Recht/i').first()).toBeVisible();

    // Zero-Shift Download Stufe 3
    const m3Page1 = mContainer3.locator('.a4-page').first();
    const m3BoxBefore = await m3Page1.boundingBox();
    const m3DownloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await page.getByRole('button', { name: /PDF herunterladen/i }).click();
    await page.waitForTimeout(200);
    const m3BoxDuring = await m3Page1.boundingBox();
    expect(Math.abs(m3BoxDuring.x - m3BoxBefore.x)).toBeLessThan(5);
    const m3Download = await m3DownloadPromise;
    const m3PdfPath = path.resolve('./scratch/lifecycle_downloaded_mahnung_stufe3.pdf');
    await m3Download.saveAs(m3PdfPath);
    expect(fs.statSync(m3PdfPath).size).toBeGreaterThan(100000);
    console.log(`Mahnung Stufe 3 PDF erfolgreich (${fs.statSync(m3PdfPath).size} Bytes)!`);

    // Schliesse Druckansicht
    await page.locator('button:visible').filter({ hasText: /Zurück/i }).first().click();
    await page.waitForTimeout(800);

    // Stufe 3 ausstellen
    if (!await page.locator('text=Schweizer Mahnwesen').isVisible()) {
      await openMahnModal();
      await page.locator('button:visible').filter({ hasText: /2\. Mahnung/i }).first().click();
      await page.waitForTimeout(400);
    }
    const ausstellenBtn3 = page.locator('button:visible').filter({ hasText: /Mahnung.*ausstellen/i }).first();
    await ausstellenBtn3.click();
    await page.waitForTimeout(1500);
    console.log('Mahnung Stufe 3 erfolgreich ausgestellt!');
    await takeScreenshot(page, 'e2e_14_rechnung_gemahnt_stufe3.png');

    // 11. SchKG Betreibungsbegehren (Art. 67 SchKG) öffnen & prüfen
    console.log('11. Betreibungsbegehren (Art. 67 SchKG) öffnen & validieren...');
    // Aktionsmenü öffnen
    const aktionsMenuBtn = page.locator('button[aria-label="Aktionsmenü"]:visible').first();
    await aktionsMenuBtn.click();
    await page.waitForTimeout(500);

    const betreibungBtn = page.locator('button:visible').filter({ hasText: /Betreibung \(Art\. 67 SchKG\)/i }).first();
    await expect(betreibungBtn).toBeVisible({ timeout: 5000 });
    await betreibungBtn.click();
    await page.waitForTimeout(800);

    // Prüfe BetreibungsModal Dossier
    await expect(page.getByRole('heading', { name: /Betreibungsbegehren \(Art\. 67 SchKG\)/i })).toBeVisible();
    await expect(page.locator('text=Offizielles Dossier für das zuständige Betreibungsamt')).toBeVisible();
    await expect(page.locator('text=1. Gläubiger')).toBeVisible();
    await expect(page.locator('text=2. Schuldner')).toBeVisible();
    await expect(page.locator('text=3. Forderung')).toBeVisible();
    await expect(page.locator('text=Forderungsgrund')).toBeVisible();
    await expect(page.locator('text=4. Beilagen für das Betreibungsamt')).toBeVisible();

    // Teste Kopierfunktion
    const copyBtn = page.locator('button:visible').filter({ hasText: /Text kopieren/i }).first();
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=Kopiert!').first()).toBeVisible();

    await takeScreenshot(page, 'e2e_15_schkg_betreibungsbegehren_dossier.png');

    // Schliesse Betreibungsmodal
    await page.locator('button:visible').filter({ hasText: /Schliessen/i }).last().click();
    await page.waitForTimeout(500);

    console.log('🎯 VOLLSTÄNDIGER LEBENSZYKLUS ERFOLGREICH ABGESCHLOSSEN!');
  });
});
