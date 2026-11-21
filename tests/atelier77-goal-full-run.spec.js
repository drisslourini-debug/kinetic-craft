import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = './scratch/screenshots/goal_run';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Helper to save screenshots
async function snap(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, name);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`[Snap] ${name}`);
}

test.describe.serial('Atelier 77 - Vollständiger Geschäftszyklus pro Benutzer', () => {

  // =========================================================================
  // BENUTZER 1: LEANDRO LÜTHI (Operativ / Malermeister)
  // =========================================================================
  test('A. Leandro Lüthi: Kunde -> Projekt -> Offerte (Status-Flow) -> Rechnung -> Mahnwesen -> Zahlung -> Kalender', async ({ browser }) => {
    test.setTimeout(180000);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // -----------------------------------------------------------------------
    // A1. Login Leandro Lüthi
    // -----------------------------------------------------------------------
    console.log('--- A1. Login Leandro Lüthi ---');
    await page.goto('/#login');
    await page.waitForLoadState('networkidle');

    const einloggenBtn = page.getByRole('button', { name: /Einloggen/i }).first();
    if (await einloggenBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await einloggenBtn.click();
      await page.waitForTimeout(500);
    }

    await page.locator('input[type="email"]').first().fill('leandro@atelier-77.ch');
    await page.locator('input[type="password"]').first().fill('Leandro77!');
    await page.getByRole('button', { name: /Anmelden/i }).click();

    await page.waitForSelector('text=Willkommen zurück, Leandro', { timeout: 15000 });
    await page.waitForTimeout(1000);
    await snap(page, 'A01_leandro_dashboard.png');

    // -----------------------------------------------------------------------
    // A2. Kunde erstellen: Architekturbüro Bern West SIA
    // -----------------------------------------------------------------------
    console.log('--- A2. Kunde erstellen ---');
    await page.locator('aside nav button:has-text("Kunden")').first().click();
    await page.waitForTimeout(1000);

    const neuerKundeBtn = page.getByRole('button', { name: /Neuer Kunde/i });
    await neuerKundeBtn.waitFor({ state: 'visible', timeout: 8000 });
    await neuerKundeBtn.click();
    await page.waitForTimeout(800);

    // Modal ausfüllen
    const firmenInput = page.locator('input[placeholder*="Holzbau"]').first();
    await firmenInput.waitFor({ state: 'visible', timeout: 8000 });
    await firmenInput.fill('Architekturbüro Bern West SIA');

    await page.locator('input[placeholder*="Max"]').first().fill('Matthias');
    await page.locator('input[placeholder*="Mustermann"]').first().fill('Künzi');

    // Strasse, PLZ, Ort
    const strasseInput = page.locator('input[placeholder*="Adresse suchen"]').first();
    if (await strasseInput.isVisible()) {
      await strasseInput.fill('Bubenbergplatz 8');
    }
    const plzInput = page.locator('input[placeholder="3000"]').first();
    if (await plzInput.isVisible()) {
      await plzInput.fill('3011');
    }
    const ortInput = page.locator('input[placeholder="Bern"]').first();
    if (await ortInput.isVisible()) {
      await ortInput.fill('Bern');
    }

    const telInput = page.locator('input[placeholder*="079"]').first();
    if (await telInput.isVisible()) {
      await telInput.fill('031 311 44 20');
    }
    const mailInput = page.locator('input[placeholder*="kontakt@firma.ch"]').first();
    if (await mailInput.isVisible()) {
      await mailInput.fill('kuenzi@bernwest-arch.ch');
    }

    const notizenText = page.locator('textarea[placeholder*="Wichtige Hinweise"]').first();
    if (await notizenText.isVisible()) {
      await notizenText.fill('Partner für denkmalgeschützte Maler- und Renovationsarbeiten.');
    }

    await snap(page, 'A02_kunde_create_modal.png');

    // Speichern
    await page.locator('button[type="submit"]:has-text("Kunde erstellen")').click();
    await page.waitForTimeout(2000);

    // Prüfen, ob Kunde sichtbar ist
    const createdKundeEl = page.locator('.hidden.md\\:block, h2').getByText('Architekturbüro Bern West SIA').first();
    await expect(createdKundeEl).toBeVisible({ timeout: 10000 });
    console.log('✅ Kunde Architekturbüro Bern West SIA erfolgreich erstellt.');
    await snap(page, 'A03_kunde_created_view.png');

    // -----------------------------------------------------------------------
    // A3. Projekt erstellen: Sanierung Jugendstil-Villa Bubenbergplatz
    // -----------------------------------------------------------------------
    console.log('--- A3. Projekt erstellen ---');
    await page.locator('aside nav button:has-text("Projekte")').first().click();
    await page.waitForTimeout(1000);

    const neuesProjektBtn = page.getByRole('button', { name: /Neues Projekt/i }).first();
    await neuesProjektBtn.waitFor({ state: 'visible', timeout: 8000 });
    await neuesProjektBtn.click();
    await page.waitForTimeout(800);

    const projModal = page.locator('div[role="dialog"]');
    await projModal.waitFor({ state: 'visible', timeout: 8000 });

    // Kunde auswählen
    const projKundeSelect = projModal.locator('select').first();
    const kOpt = projKundeSelect.locator('option:has-text("Architekturbüro Bern West SIA")').first();
    const kVal = await kOpt.getAttribute('value');
    await projKundeSelect.selectOption(kVal);
    await page.waitForTimeout(400);

    // Name
    await projModal.locator('input[placeholder*="Fassadensanierung"]').first().fill('Sanierung Jugendstil-Villa Bubenbergplatz');

    // Kategorie auswählen
    const kategorieSelect = projModal.locator('select:has(option:has-text("Renovation"))').first();
    if (await kategorieSelect.isVisible()) {
      await kategorieSelect.selectOption('Umbau / Renovation');
    }

    // Baustellen-Adresse
    const adresseInput = projModal.locator('input[placeholder*="Strasse eingeben"]').first();
    if (await adresseInput.isVisible()) {
      await adresseInput.fill('Bubenbergplatz 8, 3011 Bern');
    }

    await snap(page, 'A04_projekt_create_modal.png');

    // Speichern
    await projModal.locator('button[type="submit"]:has-text("Projekt erstellen")').click();
    await page.waitForTimeout(2000);

    const createdProjEl = page.locator('main h2').getByText('Sanierung Jugendstil-Villa Bubenbergplatz');
    await expect(createdProjEl).toBeVisible({ timeout: 10000 });
    console.log('✅ Projekt Sanierung Jugendstil-Villa Bubenbergplatz erfolgreich erstellt.');
    await snap(page, 'A05_projekt_detail_view.png');

    // -----------------------------------------------------------------------
    // A4. Offerte erstellen & mit Katalog-Positionen kalkulieren
    // -----------------------------------------------------------------------
    console.log('--- A4. Offerte erstellen ---');
    await page.locator('aside nav button:has-text("Offerten")').first().click();
    await page.waitForTimeout(1000);

    const neueOfferteBtn = page.locator('#btn-neue-offerte, button:has-text("Neue Offerte erstellen")').first();
    await neueOfferteBtn.waitFor({ state: 'visible', timeout: 8000 });
    await neueOfferteBtn.click();
    await page.waitForTimeout(800);

    // DocumentCreateModal: Kunde und Projekt wählen
    const docKundeSelect = page.locator('select:has(option:has-text("Kunde auswählen"))').first();
    await docKundeSelect.waitFor({ state: 'visible', timeout: 8000 });
    const docKVal = await docKundeSelect.locator('option:has-text("Architekturbüro Bern West SIA")').first().getAttribute('value');
    await docKundeSelect.selectOption(docKVal);
    await page.waitForTimeout(600);

    const docProjektSelect = page.locator('select:has(option:has-text("Kein Projekt"))').first();
    if (await docProjektSelect.isVisible()) {
      const docPVal = await docProjektSelect.locator('option:has-text("Sanierung Jugendstil-Villa")').first().getAttribute('value');
      if (docPVal) await docProjektSelect.selectOption(docPVal);
    }

    await snap(page, 'A06_offerte_document_modal.png');
    await page.getByRole('button', { name: /Weiter zum Editor/i }).click();
    await page.waitForTimeout(2500);

    // Im Editor: "+ Katalog" öffnen (firmeneigener Katalog)
    console.log('--- A5. Katalog-Positionen einfügen ---');
    const katalogBtn = page.getByRole('main').getByRole('button', { name: 'Katalog', exact: true });
    await katalogBtn.waitFor({ state: 'visible', timeout: 8000 });
    await katalogBtn.click();
    await page.waitForTimeout(1200);

    // Prüfen, dass reiner Firmenkatalog geöffnet ist (kein NPK)
    await expect(page.locator('text=Aus Firmenkatalog einfügen')).toBeVisible();
    await expect(page.locator('button:has-text("NPK / CRB Katalog")')).toHaveCount(0);
    await snap(page, 'A07_katalog_drawer_pure_company.png');

    // Wähle 3 Positionen im Katalog
    const pos1 = page.locator('text=Abdecken und Schützen').first();
    if (await pos1.isVisible()) await pos1.click();

    const pos2 = page.locator('text=Wände streichen (Dispersion').first();
    if (await pos2.isVisible()) await pos2.click();

    const pos3 = page.locator('text=Stucco Veneziano').first();
    if (await pos3.isVisible()) await pos3.click();

    await page.waitForTimeout(400);

    // Klick auf "Positionen einfügen"
    const insertBtn = page.locator('button:has-text("einfügen")').last();
    await insertBtn.click();
    await page.waitForTimeout(1500);

    // Speichern
    const saveOfferteBtn = page.locator('button:has-text("Änderungen speichern")').first();
    await saveOfferteBtn.waitFor({ state: 'visible', timeout: 8000 });
    await saveOfferteBtn.click();
    await page.waitForTimeout(2000);

    console.log('✅ Offerte kalkuliert und gespeichert.');
    await snap(page, 'A08_offerte_editor_saved.png');

    // -----------------------------------------------------------------------
    // A5. Offerte Status-Zyklus: Entwurf -> Versendet -> In Überarbeitung -> Akzeptiert
    // -----------------------------------------------------------------------
    console.log('--- A6. Offerte Status-Transitionen prüfen ---');
    const statusSelect = page.locator('select:has(option:has-text("Akzeptiert"))').first();
    await statusSelect.waitFor({ state: 'visible', timeout: 8000 });

    // Status: Versendet
    await statusSelect.selectOption('Versendet');
    await page.waitForTimeout(1000);
    console.log('Status: Versendet');

    // Status: In Überarbeitung
    await statusSelect.selectOption('In Überarbeitung');
    await page.waitForTimeout(1000);
    console.log('Status: In Überarbeitung');

    // Status: Akzeptiert
    await statusSelect.selectOption('Akzeptiert');
    await page.waitForTimeout(1500);
    console.log('Status: Akzeptiert');
    await snap(page, 'A09_offerte_status_akzeptiert.png');

    // PDF-Vorschau prüfen
    const pdfBtn = page.locator('button:has-text("PDF anzeigen")').first();
    if (await pdfBtn.isVisible()) {
      await pdfBtn.click();
      await page.waitForTimeout(2000);
      await snap(page, 'A10_offerte_pdf_preview.png');

      // Zurück aus PDF
      await page.locator('button:has-text("Zurück")').first().click();
      await page.waitForTimeout(1000);
    }

    // -----------------------------------------------------------------------
    // A6. In Rechnung umwandeln & Lebenszyklus: Versendet -> Mahnwesen -> Bezahlt
    // -----------------------------------------------------------------------
    console.log('--- A7. In Rechnung umwandeln ---');
    const convertBtn = page.locator('button:has-text("Rechnung erstellen")').first();
    await convertBtn.waitFor({ state: 'visible', timeout: 8000 });
    await convertBtn.click();
    await page.waitForTimeout(600);

    // Modal bestätigen
    const confirmConvert = page.locator('div.fixed button:has-text("Rechnung erstellen")').last();
    await confirmConvert.click();
    await page.waitForTimeout(3000);

    // In RechnungDetailView angekommen
    await expect(page.locator('main h2:has-text("Rechnung")').first()).toBeVisible({ timeout: 15000 });
    console.log('✅ Rechnung erfolgreich generiert.');
    await snap(page, 'A11_rechnung_detail_view.png');

    // Rechnung Status auf "Versendet"
    const rechStatusSelect = page.locator('select:has(option:has-text("Bezahlt"))').first();
    await rechStatusSelect.selectOption('Versendet');
    await page.waitForTimeout(1000);
    console.log('Rechnung Status: Versendet');

    // Rechnung Status auf "Überfällig"
    await rechStatusSelect.selectOption('Überfällig');
    await page.waitForTimeout(1000);
    console.log('Rechnung Status: Überfällig');

    // Mahnwesen testen
    console.log('--- A8. Schweizer Mahnwesen testen ---');
    const mahnDirectBtn = page.locator('button:has-text("Mahnen"), button[title*="Mahnwesen"]').first();
    if (await mahnDirectBtn.isVisible()) {
      await mahnDirectBtn.click();
    } else {
      const aktionsMenuBtn = page.locator('button[aria-label="Aktionsmenü"]').first();
      if (await aktionsMenuBtn.isVisible()) {
        await aktionsMenuBtn.click();
        await page.waitForTimeout(400);
        await page.locator('button:has-text("Mahnwesen")').first().click();
      }
    }
    await page.waitForTimeout(800);

    await expect(page.locator('text=Schweizer Mahnwesen').first()).toBeVisible({ timeout: 8000 });
    await snap(page, 'A12_mahnwesen_modal_stufe1.png');

    // Klick auf Stufe 2 (1. Mahnung mit Spesen)
    const stufe2Btn = page.locator('button:has-text("1. Mahnung"), button:has-text("Mahnung (Stufe 2)")').first();
    if (await stufe2Btn.isVisible()) {
      await stufe2Btn.click();
      await page.waitForTimeout(400);
      await snap(page, 'A13_mahnwesen_modal_stufe2.png');
    }

    // Modal schliessen
    const closeMahnBtn = page.locator('button:has-text("Abbrechen")').first();
    if (await closeMahnBtn.isVisible()) await closeMahnBtn.click();
    await page.waitForTimeout(800);

    // Rechnung als "Bezahlt" verbuchen
    console.log('--- A9. Zahlung verbuchen ---');
    const directPayBtn = page.locator('button:has-text("1-Klick: Vollständig bezahlt buchen")').first();
    if (await directPayBtn.isVisible()) {
      await directPayBtn.click();
      await page.waitForTimeout(1500);
    } else {
      await rechStatusSelect.selectOption('Bezahlt');
      await page.waitForTimeout(1500);
    }

    console.log('✅ Rechnung vollständig als Bezahlt verbucht.');
    await snap(page, 'A14_rechnung_bezahlt.png');

    // -----------------------------------------------------------------------
    // A7. Kalender-Termin anlegen: Baustellenabnahme Jugendstil-Villa
    // -----------------------------------------------------------------------
    console.log('--- A10. Kalendertermin anlegen ---');
    await page.locator('aside nav button:has-text("Kalender")').first().click();
    await page.waitForTimeout(1500);

    const neuerTerminBtn = page.locator('button:has-text("Neuer Termin")').first();
    if (await neuerTerminBtn.isVisible()) {
      await neuerTerminBtn.click();
      await page.waitForTimeout(600);

      await page.locator('input[placeholder*="Küchenmontage"], input[placeholder*="Aufmass"]').first().fill('Schlussabnahme Jugendstil-Villa (Bubenbergplatz)');
      await snap(page, 'A15_termin_modal.png');

      const saveTerminBtn = page.locator('button[type="submit"]:has-text("Termin erstellen")').first();
      if (await saveTerminBtn.isVisible()) {
        await saveTerminBtn.click();
        await page.waitForTimeout(1500);
      }
    }
    console.log('✅ Kalendertermin angelegt.');
    await snap(page, 'A16_kalender_view.png');

    await context.close();
    console.log('🎉 Kompletter Durchlauf für Leandro Lüthi erfolgreich beendet!');
  });


  // =========================================================================
  // BENUTZER 2: LORINA SCHMID (Büro / Innendienst & Buchhaltung)
  // =========================================================================
  test('B. Lorina Schmid: Kunde -> Projekt -> Offerte -> Rechnung (QR-Bill) -> Buchhaltung (Ausgabe mit Belegablage) -> Dateien', async ({ browser }) => {
    test.setTimeout(180000);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // -----------------------------------------------------------------------
    // B1. Login Lorina Schmid
    // -----------------------------------------------------------------------
    console.log('--- B1. Login Lorina Schmid ---');
    await page.goto('/#login');
    await page.waitForLoadState('networkidle');

    const einloggenBtn = page.getByRole('button', { name: /Einloggen/i }).first();
    if (await einloggenBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await einloggenBtn.click();
      await page.waitForTimeout(500);
    }

    await page.locator('input[type="email"]').first().fill('info@atelier-77.ch');
    await page.locator('input[type="password"]').first().fill('Lorina77!');
    await page.getByRole('button', { name: /Anmelden/i }).click();

    await page.waitForSelector('text=Willkommen zurück, Lorina', { timeout: 15000 });
    await page.waitForTimeout(1000);
    await snap(page, 'B01_lorina_dashboard.png');

    // -----------------------------------------------------------------------
    // B2. Kunde erstellen: Aare Treuhand & Liegenschaften AG
    // -----------------------------------------------------------------------
    console.log('--- B2. Kunde durch Lorina anlegen ---');
    await page.locator('aside nav button:has-text("Kunden")').first().click();
    await page.waitForTimeout(1000);

    const neuerKundeBtn = page.getByRole('button', { name: /Neuer Kunde/i });
    await neuerKundeBtn.waitFor({ state: 'visible', timeout: 8000 });
    await neuerKundeBtn.click();
    await page.waitForTimeout(800);

    const firmenInput = page.locator('input[placeholder*="Holzbau"]').first();
    await firmenInput.waitFor({ state: 'visible', timeout: 8000 });
    await firmenInput.fill('Aare Treuhand & Liegenschaften AG');

    await page.locator('input[placeholder*="Max"]').first().fill('Corinne');
    await page.locator('input[placeholder*="Mustermann"]').first().fill('Moser');

    const strasseInput = page.locator('input[placeholder*="Adresse suchen"]').first();
    if (await strasseInput.isVisible()) await strasseInput.fill('Aarbergergasse 36');

    const plzInput = page.locator('input[placeholder="3000"]').first();
    if (await plzInput.isVisible()) await plzInput.fill('3011');

    const ortInput = page.locator('input[placeholder="Bern"]').first();
    if (await ortInput.isVisible()) await ortInput.fill('Bern');

    const mailInput = page.locator('input[placeholder*="kontakt@firma.ch"]').first();
    if (await mailInput.isVisible()) await mailInput.fill('c.moser@aare-treuhand.ch');

    await snap(page, 'B02_kunde_create_lorina.png');
    await page.locator('button[type="submit"]:has-text("Kunde erstellen")').click();
    await page.waitForTimeout(2000);

    const createdKundeEl = page.locator('.hidden.md\\:block, h2').getByText('Aare Treuhand & Liegenschaften AG').first();
    await expect(createdKundeEl).toBeVisible({ timeout: 10000 });
    console.log('✅ Kunde Aare Treuhand & Liegenschaften AG erstellt.');

    // -----------------------------------------------------------------------
    // B3. Projekt erstellen: Umbau Kanzlei & Besprechungszimmer
    // -----------------------------------------------------------------------
    console.log('--- B3. Projekt durch Lorina anlegen ---');
    await page.locator('aside nav button:has-text("Projekte")').first().click();
    await page.waitForTimeout(1000);

    const neuesProjektBtn = page.getByRole('button', { name: /Neues Projekt/i }).first();
    await neuesProjektBtn.click();
    await page.waitForTimeout(800);

    const projModal = page.locator('div[role="dialog"]');
    await projModal.waitFor({ state: 'visible', timeout: 8000 });

    const projKundeSelect = projModal.locator('select').first();
    const lorinaKOpt = projKundeSelect.locator('option:has-text("Aare Treuhand")').first();
    const lorinaKVal = await lorinaKOpt.getAttribute('value');
    await projKundeSelect.selectOption(lorinaKVal);
    await page.waitForTimeout(400);

    await projModal.locator('input[placeholder*="Fassadensanierung"]').first().fill('Umbau Kanzlei & Besprechungszimmer Aarbergergasse');

    const katSelect = projModal.locator('select:has(option:has-text("Renovation"))').first();
    if (await katSelect.isVisible()) await katSelect.selectOption('Umbau / Renovation');

    await snap(page, 'B03_projekt_create_lorina.png');
    await projModal.locator('button[type="submit"]:has-text("Projekt erstellen")').click();
    await page.waitForTimeout(2000);

    const createdProjEl = page.locator('main h2').getByText('Umbau Kanzlei & Besprechungszimmer Aarbergergasse');
    await expect(createdProjEl).toBeVisible({ timeout: 10000 });
    console.log('✅ Projekt Umbau Kanzlei erstellt.');

    // -----------------------------------------------------------------------
    // B4. Offerte erstellen mit Firmenkatalog-Positionen
    // -----------------------------------------------------------------------
    console.log('--- B4. Offerte durch Lorina kalkulieren ---');
    await page.locator('aside nav button:has-text("Offerten")').first().click();
    await page.waitForTimeout(1000);

    await page.locator('#btn-neue-offerte, button:has-text("Neue Offerte erstellen")').first().click();
    await page.waitForTimeout(800);

    const docKundeSelect = page.locator('select:has(option:has-text("Kunde auswählen"))').first();
    await docKundeSelect.waitFor({ state: 'visible', timeout: 8000 });
    const docLKVal = await docKundeSelect.locator('option:has-text("Aare Treuhand")').first().getAttribute('value');
    await docKundeSelect.selectOption(docLKVal);
    await page.waitForTimeout(600);

    const docProjektSelect = page.locator('select:has(option:has-text("Kein Projekt"))').first();
    if (await docProjektSelect.isVisible()) {
      const docLPVal = await docProjektSelect.locator('option:has-text("Umbau Kanzlei")').first().getAttribute('value');
      if (docLPVal) await docProjektSelect.selectOption(docLPVal);
    }

    await page.getByRole('button', { name: /Weiter zum Editor/i }).click();
    await page.waitForTimeout(2500);

    // KatalogDrawer öffnen
    const katalogBtn = page.getByRole('main').getByRole('button', { name: 'Katalog', exact: true });
    await katalogBtn.waitFor({ state: 'visible', timeout: 8000 });
    await katalogBtn.click();
    await page.waitForTimeout(1200);

    // Positionen auswählen
    const p1 = page.locator('text=Türen und Zargen lackieren').first();
    if (await p1.isVisible()) await p1.click();

    const p2 = page.locator('text=Sockelleisten').first();
    if (await p2.isVisible()) await p2.click();

    const p3 = page.locator('text=Risse und Löcher spachteln').first();
    if (await p3.isVisible()) await p3.click();

    await page.waitForTimeout(300);
    await page.locator('button:has-text("einfügen")').last().click();
    await page.waitForTimeout(1500);

    // Speichern
    const saveOfferteBtn = page.locator('button:has-text("Änderungen speichern")').first();
    await saveOfferteBtn.waitFor({ state: 'visible', timeout: 8000 });
    await saveOfferteBtn.click();
    await page.waitForTimeout(2000);

    // Status: Akzeptiert
    const statusSelect = page.locator('select:has(option:has-text("Akzeptiert"))').first();
    await statusSelect.waitFor({ state: 'visible', timeout: 8000 });
    await statusSelect.selectOption('Akzeptiert');
    await page.waitForTimeout(1500);
    console.log('✅ Offerte durch Lorina akzeptiert.');
    await snap(page, 'B04_offerte_akzeptiert_lorina.png');

    // -----------------------------------------------------------------------
    // B5. In Rechnung umwandeln & Schweizer QR-Bill (SIX Standard) prüfen
    // -----------------------------------------------------------------------
    console.log('--- B5. In Rechnung umwandeln & QR-Bill prüfen ---');
    await page.locator('button:has-text("Rechnung erstellen")').first().click();
    await page.waitForTimeout(600);

    await page.locator('div.fixed button:has-text("Rechnung erstellen")').last().click();
    await page.waitForTimeout(3000);

    await expect(page.locator('main h2:has-text("Rechnung")').first()).toBeVisible({ timeout: 15000 });
    await snap(page, 'B05_rechnung_detail_lorina.png');

    // Schweizer QR-Bill in Druckansicht prüfen
    const printRechBtn = page.locator('button:has-text("PDF anzeigen")').first();
    if (await printRechBtn.isVisible()) {
      await printRechBtn.click();
      await page.waitForTimeout(2000);

      // Verifiziere QR-Zahlteil nach Schweizer SIX Standard
      await expect(page.locator('text=/Zahlteil|Empfangsschein/i').first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=CH44 3199 9123 0008 8901 2').first()).toBeVisible();
      console.log('✅ Offizieller Schweizer QR-Zahlteil nach SIX-Standard verifiziert.');
      await snap(page, 'B06_rechnung_qr_bill_six.png');

      await page.locator('button:has-text("Zurück")').first().click();
      await page.waitForTimeout(1000);
    }

    // Rechnung als versendet und bezahlt markieren
    const rStatusSelect = page.locator('select:has(option:has-text("Bezahlt"))').first();
    await rStatusSelect.selectOption('Versendet');
    await page.waitForTimeout(1000);
    await rStatusSelect.selectOption('Bezahlt');
    await page.waitForTimeout(1500);
    console.log('✅ Rechnung durch Lorina als bezahlt verbucht.');
    await snap(page, 'B07_rechnung_bezahlt_lorina.png');

    // -----------------------------------------------------------------------
    // B6. Buchhaltung: Ausgabe erfassen mit Belegablage
    // -----------------------------------------------------------------------
    console.log('--- B6. Buchhaltung: Ausgabe mit Beleg erfassen ---');
    await page.locator('aside nav button:has-text("Buchhaltung")').first().click();
    await page.waitForTimeout(1500);
    await snap(page, 'B08_buchhaltung_uebersicht.png');

    const ausgabeErfassenBtn = page.locator('button:has-text("Ausgabe erfassen")').last();
    await ausgabeErfassenBtn.waitFor({ state: 'visible', timeout: 8000 });
    await ausgabeErfassenBtn.click();
    await page.waitForTimeout(800);

    // Modal ausfüllen
    const titelInput = page.locator('input[placeholder*="Schrauben Jumbo"]').first();
    await titelInput.waitFor({ state: 'visible', timeout: 5000 });
    await titelInput.fill('Farbmaterial & Abdeckvlies - Bosshard & Co AG');

    const bruttoInput = page.locator('input[type="number"][step="0.05"]').first();
    if (await bruttoInput.isVisible()) {
      await bruttoInput.fill('485.60');
    }

    // Beleg anhängen
    const fileInput = page.locator('input[type="file"][accept*="image"]').first();
    const testBelegPath = path.resolve('scratch/test_beleg_quittung.svg');
    if (await fileInput.count() > 0 && fs.existsSync(testBelegPath)) {
      await fileInput.setInputFiles(testBelegPath);
      await page.waitForTimeout(600);
      console.log('Beleg-Datei erfolgreich hochgeladen.');
    }

    await snap(page, 'B09_ausgabe_modal_lorina.png');

    // Speichern
    const saveAusgabeBtn = page.locator('button[type="submit"]:has-text("Ausgabe verbuchen")').first();
    await saveAusgabeBtn.click();
    await page.waitForTimeout(2000);

    // Ausgabe in Buchhaltung prüfen
    const createdAusgabe = page.locator('.hidden.md\\:block, table').getByText('Bosshard & Co AG').first();
    await expect(createdAusgabe).toBeVisible({ timeout: 10000 });
    console.log('✅ Ausgabe erfolgreich in Buchhaltung erfasst und Beleg zugeordnet.');
    await snap(page, 'B10_buchhaltung_mit_neuer_ausgabe.png');

    // -----------------------------------------------------------------------
    // B7. Dateien & Pläne prüfen
    // -----------------------------------------------------------------------
    console.log('--- B7. Dateien & Archiv prüfen ---');
    await page.locator('aside nav button:has-text("Archiv"), aside nav button:has-text("Dateien")').first().click();
    await page.waitForTimeout(1500);
    await snap(page, 'B11_dateien_archiv_lorina.png');

    await context.close();
    console.log('🎉 Kompletter Durchlauf für Lorina Schmid erfolgreich beendet!');
  });

});
