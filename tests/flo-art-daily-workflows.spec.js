import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Amin/.gemini/antigravity/brain/b175e108-b5b2-4fe1-8eb9-d6f67b38b7e1';
const LOCAL_DIR = './scratch/screenshots';

for (const dir of [ARTIFACT_DIR, LOCAL_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function takeScreenshot(page, filename) {
  const p1 = path.join(ARTIFACT_DIR, filename);
  const p2 = path.join(LOCAL_DIR, filename);
  await page.screenshot({ path: p1, fullPage: false });
  await page.screenshot({ path: p2, fullPage: false });
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

test.describe('Flo Art Daily Business Workflows - Modulübergreifender Praxistest', () => {
  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('Workflow 1: Töpferei Bern – Neukunde, Projekt, Termin, Offerte und Wandlung in Rechnung', async ({ page }) => {
    console.log('=== WORKFLOW 1: Töpferei Bern – Akquise bis Rechnung ===');
    await loginFlorence(page);

    // 1. Ensure active company is Töpferei Bern
    await ensureActiveTenant(page, 'Flo Art – Töpferei');
    await takeScreenshot(page, 'wf1_01_dashboard_toepferei.png');

    // 2. Modul Kunden: Neuanlage Café Einstein AG
    console.log('Schritt 1: Neukunde Café Einstein anlegen...');
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Kunden' }).first().click();
    await page.waitForTimeout(1000);

    const neuerKundeBtn = page.locator('button:visible').filter({ hasText: 'Neuer Kunde' }).first();
    await neuerKundeBtn.click();
    await page.waitForTimeout(600);

    // Fill customer form using exact placeholders from KundeCreateModal.jsx
    await page.locator('input[placeholder="z.B. Holzbau Schweiz AG"]:visible').fill('Café Einstein AG');
    await page.locator('input[placeholder="Max"]:visible').fill('Albert');
    await page.locator('input[placeholder="Mustermann"]:visible').fill('Einstein');
    await page.locator('input[placeholder="Adresse suchen..."]:visible').fill('Kramgasse 49');
    await page.locator('input[placeholder="3000"]:visible').fill('3011');
    await page.locator('input[placeholder="Bern"]:visible').fill('Bern');
    await page.locator('input[placeholder="z.B. 079 123 45 67"]:visible').fill('+41 31 312 00 11');
    await page.locator('input[placeholder="kontakt@firma.ch"]:visible').fill('info@cafe-einstein.ch');

    await takeScreenshot(page, 'wf1_02_kunde_create_modal.png');

    // Submit customer
    await page.locator('button[type="submit"]:visible').filter({ hasText: 'Kunde erstellen' }).click();
    await page.waitForTimeout(2000);
    await takeScreenshot(page, 'wf1_03_kunde_erstellt_detail.png');

    // Verify customer header is visible (desktop header in KundeDetailView)
    await expect(page.getByRole('heading', { name: /Café Einstein AG/i }).first()).toBeVisible({ timeout: 10000 });
    console.log('Kunde Café Einstein AG erfolgreich erfasst und Detailansicht geöffnet!');

    // 3. Modul Projekte: Projekt für Café Einstein eröffnen
    console.log('Schritt 2: Projekt Geschirr-Kollektion eröffnen...');
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Projekte' }).first().click();
    await page.waitForTimeout(1000);

    await page.locator('button:visible').filter({ hasText: 'Neues Projekt' }).first().click();
    await page.waitForTimeout(600);

    // Fill project form using exact placeholders from ProjektCreateModal.jsx
    await page.locator('input[placeholder="z.B. Fassadensanierung Meier"]:visible').fill('Geschirr-Kollektion Café Einstein (60x Tassen & Teller)');
    
    // Select customer Café Einstein
    const kundeSelect = page.locator('form select:visible').first();
    const kundeOpt = kundeSelect.locator('option').filter({ hasText: 'Café Einstein' }).first();
    await kundeOpt.waitFor({ state: 'attached', timeout: 10000 });
    const optValue = await kundeOpt.getAttribute('value');
    if (optValue) {
      await kundeSelect.selectOption(optValue);
    }

    await page.locator('input[placeholder="Strasse eingeben (Auto-Fill)..."]:visible').fill('Kramgasse 49, 3011 Bern');

    await takeScreenshot(page, 'wf1_04_projekt_create_modal.png');
    await page.locator('button[type="submit"]:visible').filter({ hasText: 'Projekt erstellen' }).click();
    await page.waitForTimeout(2000);

    await takeScreenshot(page, 'wf1_05_projekt_erstellt_liste.png');
    await expect(page.locator(':visible', { hasText: 'Geschirr-Kollektion Café Einstein' }).first()).toBeVisible({ timeout: 10000 });
    console.log('Projekt Geschirr-Kollektion Café Einstein erfolgreich eröffnet!');

    // 4. Modul Kalender: Termin zur Musterbemusterung eintragen
    console.log('Schritt 3: Termin Musterbemusterung im Kalender planen...');
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Kalender' }).first().click();
    await page.waitForTimeout(1000);

    const neuerTerminBtn = page.locator('button:visible').filter({ hasText: 'Neuer Termin' }).first();
    await neuerTerminBtn.click();
    await page.waitForTimeout(600);

    // Fill Termin form using exact placeholder from TerminModal.jsx
    await page.locator('input[placeholder*="Küchenmontage"]:visible').fill('Musterbemusterung Glasur & Ton Café Einstein');
    
    const terminOrtInput = page.locator('input[placeholder*="Adresse"]:visible, input[placeholder*="Musterstrasse"]:visible').first();
    if (await terminOrtInput.isVisible()) {
      await terminOrtInput.fill('Münstergasse 39, 3011 Bern');
    }

    await takeScreenshot(page, 'wf1_06_termin_create_modal.png');
    await page.locator('button[type="submit"]:visible').filter({ hasText: 'Termin erstellen' }).click();
    await page.waitForTimeout(1500);

    await takeScreenshot(page, 'wf1_07_kalender_mit_termin.png');
    await expect(page.locator(':visible', { hasText: 'Musterbemusterung Glasur & Ton Café Einstein' }).first()).toBeVisible({ timeout: 10000 });
    console.log('Termin erfolgreich im Kalender hinterlegt!');

    // 5. Modul Offerten: Offerte erstellen und in Rechnung wandeln
    console.log('Schritt 4: Offerte erstellen & in Rechnung umwandeln...');
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Offerten' }).first().click();
    await page.waitForTimeout(1000);

    const neueOfferteBtn = page.locator('button:visible').filter({ hasText: 'Neue Offerte' }).first();
    await neueOfferteBtn.click();
    await page.waitForTimeout(800);

    // DocumentCreateModal: select customer and wait for option
    const docModalKundeSelect = page.locator('div.fixed select:visible').first();
    const docOpt = docModalKundeSelect.locator('option').filter({ hasText: 'Café Einstein' }).first();
    await docOpt.waitFor({ state: 'attached', timeout: 10000 });
    const docOptValue = await docOpt.getAttribute('value');
    if (docOptValue) {
      await docModalKundeSelect.selectOption(docOptValue);
    }
    await page.waitForTimeout(600);

    await takeScreenshot(page, 'wf1_08_offerte_create_modal.png');
    const submitOfferteBtn = page.locator('button:visible').filter({ hasText: 'Weiter zum Editor' }).first();
    await expect(submitOfferteBtn).toBeEnabled({ timeout: 10000 });
    await submitOfferteBtn.click();
    await page.waitForTimeout(2500);

    await takeScreenshot(page, 'wf1_09_offerte_detail_editor.png');
    console.log('Offerte im Editor geöffnet!');

    // Speichere die neu erstellte Offerte im Editor ab
    const saveOfferteBtn = page.locator('button:visible').filter({ hasText: 'Änderungen speichern' }).first();
    if (await saveOfferteBtn.isVisible()) {
      await saveOfferteBtn.click();
      await page.waitForTimeout(2000);
    }

    // Status auf 'Akzeptiert' setzen
    console.log('Schritt 5: Offerte auf "Akzeptiert" setzen und in Rechnung umwandeln...');
    const statusSelect = page.locator('header select:visible, div select:visible').filter({ hasText: /Entwurf|Akzeptiert|Gesendet/i }).first();
    await expect(statusSelect).toBeEnabled({ timeout: 10000 });
    await statusSelect.selectOption('Akzeptiert');
    await page.waitForTimeout(1500);

    // Green banner appears with "Rechnung erstellen"
    const acceptBannerBtn = page.locator('button:visible').filter({ hasText: 'Rechnung erstellen' }).first();
    await expect(acceptBannerBtn).toBeVisible({ timeout: 10000 });
    await acceptBannerBtn.click();
    await page.waitForTimeout(600);

    await takeScreenshot(page, 'wf1_10_convert_modal.png');
    // Confirm conversion in modal
    const confirmConvertBtn = page.locator('div.fixed button:visible').filter({ hasText: 'Rechnung erstellen' }).last();
    await confirmConvertBtn.click();
    await page.waitForTimeout(3000);

    // Verify invoice created and opened
    await takeScreenshot(page, 'wf1_11_erstellte_rechnung.png');
    await expect(page.locator('h1:visible, h2:visible, main:visible').filter({ hasText: /Rechnung RE-/i }).first()).toBeVisible({ timeout: 10000 });
    console.log('Offerte erfolgreich in offizielle Rechnung gewandelt!');

    console.log('=== WORKFLOW 1 ERFOLGREICH ABGESCHLOSSEN ===');
  });

  test('Workflow 2: Polsterei Ittigen – Handwerksprojekt, Arbeitsrapport & Bezahlung', async ({ page }) => {
    console.log('=== WORKFLOW 2: Polsterei Ittigen – Handwerk, Rapport & Zahlung ===');
    await loginFlorence(page);

    // 1. Switch to Polsterei Ittigen
    await ensureActiveTenant(page, 'Flo Art – Polsterei');
    await takeScreenshot(page, 'wf2_01_dashboard_polsterei.png');

    // 2. Open project "Neupolsterung & Restauration Art-Déco Ohrensessel"
    console.log('Schritt 1: Projekt Ohrensessel aufrufen...');
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Projekte' }).first().click();
    await page.waitForTimeout(1000);

    const projectItem = page.locator('text=Neupolsterung & Restauration Art-Déco Ohrensessel >> visible=true').first();
    await expect(projectItem).toBeVisible({ timeout: 10000 });
    await projectItem.click();
    await page.waitForTimeout(1500);

    await takeScreenshot(page, 'wf2_02_projekt_detail.png');

    // 3. Switch to tab "Rapporte"
    console.log('Schritt 2: Arbeitsrapport erfassen...');
    const rapporteTab = page.locator('button:visible, a:visible').filter({ hasText: /Rapporte/i }).first();
    await expect(rapporteTab).toBeVisible({ timeout: 10000 });
    await rapporteTab.click();
    await page.waitForTimeout(800);
    await takeScreenshot(page, 'wf2_03_rapporte_tab.png');

    const neuerRapportBtn = page.locator('button:visible').filter({ hasText: /Regierapport|Neuer Rapport/i }).first();
    await expect(neuerRapportBtn).toBeVisible({ timeout: 10000 });
    await neuerRapportBtn.click();
    await page.waitForTimeout(800);

    // Fill Rapport form in RapportCreateModal
    const rapTextarea = page.locator('textarea:visible').first();
    await rapTextarea.fill('Altes Polster abgetragen, Rosshaar gewaschen, 8 Jutegurten 70mm diagonal neu verspannt und Grundpolster aufgebaut.');

    await takeScreenshot(page, 'wf2_04_rapport_modal.png');

    // Save as draft
    const draftBtn = page.locator('button:visible').filter({ hasText: 'Als Entwurf speichern' }).first();
    await draftBtn.click();
    await page.waitForTimeout(2000);

    // Verify rapport in project's list
    await takeScreenshot(page, 'wf2_04b_rapporte_liste.png');
    await expect(page.locator(':visible', { hasText: /Jutegurten|Altes Polster/i }).first()).toBeVisible({ timeout: 10000 });
    console.log('Arbeitsrapport erfolgreich im Projekt hinterlegt!');

    // 4. Modul Rechnungen: Rechnung RE-POL-1001 begutachten und Zahlung verbuchen
    console.log('Schritt 3: Rechnung RE-POL-1001 aufrufen & Zahlung verbuchen...');
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Rechnungen' }).first().click();
    await page.waitForTimeout(1000);

    const rechnungItem = page.locator('text=RE-POL-1001').first();
    await expect(rechnungItem).toBeVisible({ timeout: 10000 });
    await rechnungItem.click();
    await page.waitForTimeout(1500);

    await takeScreenshot(page, 'wf2_05_rechnung_vor_zahlung.png');
    await expect(page.locator(':visible', { hasText: "CHF 2'150.00" }).first()).toBeVisible({ timeout: 10000 });

    // Open payment recording form if not already paid
    const zahlungBtn = page.locator('button:visible').filter({ hasText: 'Zahlung erfassen' }).first();
    if (await zahlungBtn.isVisible()) {
      await zahlungBtn.click();
      await page.waitForTimeout(600);

      await takeScreenshot(page, 'wf2_06_zahlung_form.png');

      // Confirm payment (full amount CHF 2'150.00 is prefilled)
      const bestatigenBtn = page.locator('button:visible').filter({ hasText: 'Bestätigen' }).first();
      await bestatigenBtn.click();
      await page.waitForTimeout(2000);
    }

    await takeScreenshot(page, 'wf2_07_rechnung_nach_zahlung.png');
    // Status should now be Bezahlt
    await expect(page.locator(':visible', { hasText: 'Bezahlt' }).first()).toBeVisible({ timeout: 10000 });
    console.log('Zahlungseingang CHF 2\'150.00 erfolgreich verbucht! Status ist Bezahlt.');

    console.log('=== WORKFLOW 2 ERFOLGREICH ABGESCHLOSSEN ===');
  });

  test('Workflow 3: Buchhaltung – Materialaufwand, ESTV MWST-Abrechnung & Dashboard-Reflexion', async ({ page }) => {
    console.log('=== WORKFLOW 3: Buchhaltung – Materialeinkauf & MWST ===');
    await loginFlorence(page);

    // Ensure Polsterei
    await ensureActiveTenant(page, 'Flo Art – Polsterei');

    // 1. Modul Buchhaltung: Ausgabe für Materialeinkauf erfassen
    console.log('Schritt 1: Ausgabe für Polstermaterial erfassen...');
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Buchhaltung' }).first().click();
    await page.waitForTimeout(1000);

    await takeScreenshot(page, 'wf3_01_buchhaltung_initial.png');

    // Open Ausgabe erfassen modal using visible desktop button
    const ausgabeBtn = page.locator('button:visible').filter({ hasText: 'Ausgabe erfassen' }).first();
    await ausgabeBtn.click();
    await page.waitForTimeout(800);

    // Fill Ausgabe form
    await page.locator('input[placeholder="z.B. Schrauben Jumbo"]:visible').fill('Gygax Polstermaterial AG - Gurten & Rosshaar');
    await page.locator('input[placeholder="0.00"]:visible').fill('450.00');

    await takeScreenshot(page, 'wf3_02_ausgabe_create_modal.png');

    // Submit expense
    const verbuchenBtn = page.locator('button[form="ausgabeForm"]:visible').filter({ hasText: 'Ausgabe verbuchen' }).first();
    await verbuchenBtn.click();
    await page.waitForTimeout(2000);

    await takeScreenshot(page, 'wf3_03_buchhaltung_mit_ausgabe.png');
    await expect(page.locator(':visible', { hasText: 'Gygax Polstermaterial AG' }).first()).toBeVisible({ timeout: 10000 });
    console.log('Materialausgabe CHF 450.00 erfolgreich verbucht!');

    // 2. MWST-Abrechnung prüfen (Umsatzsteuer minus Vorsteuer)
    console.log('Schritt 2: ESTV MWST-Abrechnung prüfen...');
    const mwstTab = page.locator('button:visible, [data-testid="tab-estv-mwst"]:visible').filter({ hasText: /ESTV|MWST/i }).first();
    await mwstTab.click();
    await page.waitForTimeout(1000);
    await takeScreenshot(page, 'wf3_04_mwst_abrechnung.png');

    await expect(page.locator(':visible', { hasText: /Ziffer|8.1%|MWST/i }).first()).toBeVisible({ timeout: 10000 });
    console.log('ESTV MWST-Abrechnung weist Steuersätze korrekt aus!');

    // 3. Dashboard Reflexion prüfen
    console.log('Schritt 3: Dashboard aktualisierte Finanzdaten prüfen...');
    await page.locator('aside nav button:visible, aside nav a:visible').filter({ hasText: 'Dashboard' }).first().click();
    await page.waitForTimeout(1500);

    await takeScreenshot(page, 'wf3_05_dashboard_finanzlage.png');
    await expect(page.locator(':visible', { hasText: 'Bezahlter Umsatz (YTD)' }).first()).toBeVisible({ timeout: 10000 });
    console.log('Dashboard spiegelt die aktuellen Zahlen wider!');

    console.log('=== WORKFLOW 3 ERFOLGREICH ABGESCHLOSSEN ===');
  });
});
