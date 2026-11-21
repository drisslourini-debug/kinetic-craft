import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fpfdlraqtqtcnmajrcyx.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZmRscmFxdHF0Y25tYWpyY3l4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzOTk5MywiZXhwIjoyMTAwMTE1OTkzfQ.8S8CiMvOFosImncenIptaaPBSNJmEfJ6YmC9XbLG7wA';
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const TENANT_ID = 'ce510545-c59b-4f0d-b89b-89f756cbb378';

async function main() {
  console.log('--- Starte automatische Archivierung & PDF-Erstellung für Atelier 77 ---');

  // 1. Offerten & Rechnungen ermitteln
  const { data: offerten, error: offErr } = await supabase
    .from('offerten')
    .select('id, offerte_nr, pdf_url')
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false });

  const { data: rechnungen, error: rechErr } = await supabase
    .from('rechnungen')
    .select('id, rechnung_nr, daten, pdf_url')
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false });

  if (offErr || rechErr) {
    console.error('DB Error:', offErr || rechErr);
    process.exit(1);
  }

  console.log(`Gefunden: ${offerten.length} Offerten, ${rechnungen.length} Rechnungen`);

  // Browser starten
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Login als Leandro
  console.log('Login als Leandro Lüthi...');
  await page.goto('http://localhost:5173/#login');
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

  // Offerten archivieren
  for (const off of offerten) {
    if (off.pdf_url) {
      console.log(`Offerte ${off.offerte_nr} (#${off.id}) hat bereits PDF: ${off.pdf_url}`);
      continue;
    }

    console.log(`Archiviere Offerte ${off.offerte_nr} (#${off.id})...`);
    await page.goto(`http://localhost:5173/offerten?offerteId=${off.id}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Klick auf "PDF anzeigen"
    const pdfBtn = page.locator('button:has-text("PDF anzeigen"), button[title="PDF anzeigen"]').first();
    await pdfBtn.waitFor({ state: 'visible', timeout: 5000 });
    await pdfBtn.click();
    await page.waitForTimeout(1000);

    // Klick auf "Archivieren"
    const archiveBtn = page.locator('button:has-text("Archivieren")').first();
    await archiveBtn.waitFor({ state: 'visible', timeout: 5000 });
    await archiveBtn.click();

    // Warten bis Speichern abgeschlossen
    await page.waitForSelector('text=PDF wurde erfolgreich', { timeout: 15000 });
    console.log(`✓ Offerte ${off.offerte_nr} erfolgreich archiviert!`);
    await page.waitForTimeout(500);
  }

  // Rechnungen archivieren
  for (const rech of rechnungen) {
    if (rech.pdf_url || rech.daten?.pdf_url) {
      console.log(`Rechnung ${rech.rechnung_nr} (#${rech.id}) hat bereits PDF`);
      continue;
    }

    console.log(`Archiviere Rechnung ${rech.rechnung_nr} (#${rech.id})...`);
    await page.goto(`http://localhost:5173/rechnungen?rechnungId=${rech.id}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Klick auf "PDF anzeigen"
    const pdfBtn = page.locator('button:has-text("PDF anzeigen"), button[title="PDF anzeigen"]').first();
    await pdfBtn.waitFor({ state: 'visible', timeout: 5000 });
    await pdfBtn.click();
    await page.waitForTimeout(1000);

    // Klick auf "Archivieren"
    const archiveBtn = page.locator('button:has-text("Archivieren")').first();
    await archiveBtn.waitFor({ state: 'visible', timeout: 5000 });
    await archiveBtn.click();

    // Warten bis Speichern abgeschlossen
    await page.waitForSelector('text=PDF wurde erfolgreich', { timeout: 15000 });
    console.log(`✓ Rechnung ${rech.rechnung_nr} erfolgreich archiviert!`);
    await page.waitForTimeout(500);
  }

  await browser.close();
  console.log('--- Alle Offerten und Rechnungen erfolgreich archiviert! ---');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
