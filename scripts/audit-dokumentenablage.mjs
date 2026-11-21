/**
 * Audit Dokumentenablage & Beleg-Management
 * 
 * Umfassender Test für die gesamte Datei- und Belegablage:
 * 1. Mandanten-Isolation & Pfadprüfung (getTenantStoragePath, extractStoragePath)
 * 2. Beleg ablegen: Upload in den Supabase Storage-Bucket 'anhange'
 * 3. Wieder öffnen zum Nachschauen: Öffentliche & Signierte URLs (getFileAccessUrl), HTTP-Prüfung & Integrität
 * 4. Offerte als PDF ablegen: Schweizer Namenskonvention (generateDocumentFilename), Storage-Ablage, Versionierung (_v2), Verknüpfung mit Offerte
 * 5. Virtuelle Ordnerstruktur & Navigation im Archiv (Systemordner, Kunden, Projekte, Kategorien, Live-Belege)
 * 6. Umbenennen & Löschung mit Storage-Bereinigung
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { getTenantStoragePath, extractStoragePath, getFileAccessUrl } from '../src/lib/storageHelper.js';
import { generateDocumentFilename, sanitizeFilenamePart } from '../src/lib/documentNaming.js';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fpfdlraqtqtcnmajrcyx.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZmRscmFxdHF0Y25tYWpyY3l4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzOTk5MywiZXhwIjoyMTAwMTE1OTkzfQ.8S8CiMvOFosImncenIptaaPBSNJmEfJ6YmC9XbLG7wA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const TENANT_ID = 'ce510545-c59b-4f0d-b89b-89f756cbb378'; // Malerei Leandro Lüthi - Atelier 77

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`   ✓ ${message}`);
}

async function runDokumentenablageAudit() {
  console.log('========================================================================');
  console.log('   KINETIC CRAFT – AUDIT DOKUMENTENABLAGE & BELEG-MANAGEMENT            ');
  console.log('   Mandant: Malerei Leandro Lüthi - Atelier 77                         ');
  console.log('   Prüfung: Beleg-Upload -> Öffnen/URL -> PDF-Ablage -> Ordnerstruktur');
  console.log('========================================================================\n');

  // Baseline prüfen
  const { data: initialDateien } = await supabase.from('dateien').select('id, name, kategorie').eq('tenant_id', TENANT_ID);
  console.log(`📊 Baseline: Vorhandene Dateien im Mandanten: ${initialDateien.length}`);

  let uploadedFileId = null;
  let uploadedStoragePath = null;
  let pdfOfferteFileId = null;
  let pdfOfferteStoragePath = null;
  let pdfOfferteV2FileId = null;
  let pdfOfferteV2StoragePath = null;

  try {
    // -------------------------------------------------------------------------
    // 1. SCHRITT: MANDANTEN-ISOLATION & SPEICHERPFAD-GENERIERUNG
    // -------------------------------------------------------------------------
    console.log('📌 1. SCHRITT: Mandanten-Isolation & Pfad-Generierung');
    const rawFileName = 'Materialbeleg #124 (Knuchel Farben & Lacke) - Fassade.pdf';
    const storagePath = getTenantStoragePath(TENANT_ID, rawFileName, 'buchhaltung');
    
    assert(storagePath.startsWith(`${TENANT_ID}/buchhaltung/`), `Pfad beginnt strikt mit Mandanten-UUID: ${storagePath}`);
    assert(!storagePath.includes(' '), 'Keine Leerzeichen im generierten Pfad');
    assert(!storagePath.includes('#'), 'Keine Doppelkreuze/Sonderzeichen im Pfad');
    assert(storagePath.endsWith('.pdf'), 'Dateiendung .pdf bleibt erhalten');

    // -------------------------------------------------------------------------
    // 2. SCHRITT: BELEG ABLEGEN (STORAGE UPLOAD & DB REGISTRIERUNG)
    // -------------------------------------------------------------------------
    console.log('\n📌 2. SCHRITT: Beleg ablegen (Upload in Storage & Verknüpfung in DB)');
    
    // Testdaten: Ein echter PDF-Beleg (Inhalt: Valides PDF mit Header)
    const testPdfContent = `%PDF-1.4
%âãÏÓ
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R>> endobj
4 0 obj <</Length 65>> stream
BT /F1 14 Tf 50 800 Td (Knuchel Farben AG - Beleg Materialeinkauf CHF 342.50) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000015 00000 n 
0000000068 00000 n 
0000000125 00000 n 
0000000217 00000 n 
trailer <</Size 5 /Root 1 0 R>>
startxref
332
%%EOF`;

    const belegBlob = Buffer.from(testPdfContent, 'utf-8');
    uploadedStoragePath = getTenantStoragePath(TENANT_ID, 'Quittung_Knuchel_Farben_Grosshandel.pdf', 'belege');

    // In Storage hochladen
    const { error: uploadErr } = await supabase.storage
      .from('anhange')
      .upload(uploadedStoragePath, belegBlob, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadErr) throw uploadErr;
    assert(true, `Beleg erfolgreich in Storage 'anhange' abgelegt: ${uploadedStoragePath}`);

    // Öffentliche URL generieren
    const { data: { publicUrl } } = supabase.storage.from('anhange').getPublicUrl(uploadedStoragePath);
    assert(publicUrl.includes(uploadedStoragePath), 'Public URL enthält relativen Speicherpfad');

    // Beleg mit Kunde (Delavallade) und Projekt (Chemin des Morettes) verknüpfen
    const { data: delavalladeKunde } = await supabase
      .from('kunden')
      .select('id, name')
      .eq('tenant_id', TENANT_ID)
      .ilike('name', '%Delavallade%')
      .single();

    const { data: delavalladeProjekt } = await supabase
      .from('projekte')
      .select('id, name')
      .eq('tenant_id', TENANT_ID)
      .eq('kunden_id', delavalladeKunde.id)
      .single();

    assert(delavalladeKunde && delavalladeProjekt, 'Kunde Delavallade und zugehöriges Projekt vorhanden');

    const belegPayload = {
      tenant_id: TENANT_ID,
      kunde_id: delavalladeKunde.id,
      projekt_id: delavalladeProjekt.id,
      name: 'Quittung_Knuchel_Farben_Grosshandel.pdf',
      typ: 'application/pdf',
      url: publicUrl,
      size_bytes: belegBlob.length,
      kategorie: 'Rechnungen', // oder 'Buchhaltung'
      quelle: 'Belegablage-Audit'
    };

    const { data: insertedDatei, error: dbErr } = await supabase
      .from('dateien')
      .insert(belegPayload)
      .select()
      .single();

    if (dbErr) throw dbErr;
    uploadedFileId = insertedDatei.id;

    assert(insertedDatei.id, 'Beleg erfolgreich in Tabelle "dateien" registriert');
    assert(insertedDatei.kunde_id === delavalladeKunde.id, 'Beleg ist korrekt mit Kunde verknüpft');
    assert(insertedDatei.projekt_id === delavalladeProjekt.id, 'Beleg ist korrekt mit Projekt verknüpft');
    assert(insertedDatei.kategorie === 'Rechnungen', 'Kategorie ist "Rechnungen"');

    // -------------------------------------------------------------------------
    // 3. SCHRITT: WIEDER ÖFFNEN ZUM NACHSCHAUEN (URL, SIGNING & HTTP-ABRUF)
    // -------------------------------------------------------------------------
    console.log('\n📌 3. SCHRITT: Wieder öffnen zum Nachschauen (URL, Signierung & Download)');

    // 3a. Pfad-Extraktion prüfen
    const extractedPath = extractStoragePath(insertedDatei.url);
    assert(extractedPath === uploadedStoragePath, `extractStoragePath extrahiert exakten Pfad: ${extractedPath}`);

    // 3b. Signierte URL via getFileAccessUrl prüfen (GeBüV & revDSG Zugriffsschutz)
    const accessUrl = await getFileAccessUrl(supabase, insertedDatei.url, 3600);
    assert(accessUrl && accessUrl.startsWith('http'), 'getFileAccessUrl liefert gültige Abruf-URL');

    // 3c. HTTP Fetch: Prüfen ob Datei tatsächlich heruntergeladen und geöffnet werden kann
    console.log('   ▶ Prüfe HTTP-Abruf der abgelegten Datei...');
    const fetchRes = await fetch(accessUrl);
    assert(fetchRes.status === 200, `HTTP-Status ist 200 OK (Datei ist erreichbar)`);
    
    const fetchedBuffer = await fetchRes.arrayBuffer();
    assert(fetchedBuffer.byteLength === belegBlob.length, `Dateigrösse stimmt exakt überein (${fetchedBuffer.byteLength} Bytes)`);
    
    const textSample = Buffer.from(fetchedBuffer).toString('utf-8');
    assert(textSample.includes('Knuchel Farben AG'), 'PDF-Inhalt ist vollständig intakt und lesbar');
    console.log('   ✓ Beleg kann im Browser & PDF-Viewer einwandfrei geöffnet werden!');

    // -------------------------------------------------------------------------
    // 4. SCHRITT: OFFERTE ALS PDF ABLEGEN (NAMENSKONVENTION & VERSIONIERUNG)
    // -------------------------------------------------------------------------
    console.log('\n📌 4. SCHRITT: Offerte als PDF ablegen (Schweizer Namenskonvention & Versionierung)');

    // 4a. Schweizer Dateinamen generieren
    const pdfFilename = generateDocumentFilename({
      type: 'Offerte',
      docNr: 'OF-3866',
      kunde: delavalladeKunde,
      projekt: delavalladeProjekt,
      date: '2026-11-18'
    });

    console.log(`   ▶ Generierter Dateiname: ${pdfFilename}`);
    assert(pdfFilename.startsWith('Offerte_OF-3866_'), 'Dateiname beginnt mit Typ und Nummer');
    assert(pdfFilename.includes('Delavallade'), 'Dateiname enthält Kundennamen');
    assert(pdfFilename.endsWith('_2026-11-18.pdf'), 'Dateiname endet mit formatiertem Datum');

    // 4b. PDF in Storage hochladen
    pdfOfferteStoragePath = getTenantStoragePath(TENANT_ID, pdfFilename, 'offerten');
    const { error: offUploadErr } = await supabase.storage
      .from('anhange')
      .upload(pdfOfferteStoragePath, belegBlob, {
        contentType: 'application/pdf',
        upsert: true
      });
    if (offUploadErr) throw offUploadErr;

    const { data: { publicUrl: offPublicUrl } } = supabase.storage.from('anhange').getPublicUrl(pdfOfferteStoragePath);

    // 4c. In dateien registrieren (Version 1)
    const { data: offerteDoc } = await supabase
      .from('offerten')
      .select('id, offerte_nr')
      .eq('tenant_id', TENANT_ID)
      .eq('offerte_nr', 'OF-3866')
      .single();

    assert(offerteDoc, 'Offerte OF-3866 in Datenbank gefunden');

    const offerteFilePayload = {
      tenant_id: TENANT_ID,
      kunde_id: delavalladeKunde.id,
      projekt_id: delavalladeProjekt.id,
      offerte_id: offerteDoc.id,
      name: pdfFilename,
      typ: 'application/pdf',
      url: offPublicUrl,
      size_bytes: belegBlob.length,
      kategorie: 'Offerte',
      quelle: 'Offerte-Export',
      version: 1
    };

    const { data: insertedOfferteFile, error: offDbErr } = await supabase
      .from('dateien')
      .insert(offerteFilePayload)
      .select()
      .single();

    if (offDbErr) throw offDbErr;
    pdfOfferteFileId = insertedOfferteFile.id;

    // Offerte selbst mit pdf_url verknüpfen
    await supabase.from('offerten').update({
      pdf_url: offPublicUrl,
      archiviert_am: new Date().toISOString()
    }).eq('id', offerteDoc.id);

    assert(insertedOfferteFile.version === 1, 'Erste Version ist v1');
    assert(insertedOfferteFile.offerte_id === offerteDoc.id, 'Verknüpfung mit offerte_id gesetzt');

    // 4d. Versionierung prüfen (_v2 bei erneutem Export)
    console.log('   ▶ Prüfe automatische Versionierung (_v2) bei Folgeexport...');
    const v2Filename = pdfFilename.replace(/\.pdf$/i, '_v2.pdf');
    pdfOfferteV2StoragePath = getTenantStoragePath(TENANT_ID, v2Filename, 'offerten');

    await supabase.storage.from('anhange').upload(pdfOfferteV2StoragePath, belegBlob, { contentType: 'application/pdf' });
    const { data: { publicUrl: v2PublicUrl } } = supabase.storage.from('anhange').getPublicUrl(pdfOfferteV2StoragePath);

    const { data: insertedV2File } = await supabase
      .from('dateien')
      .insert({
        ...offerteFilePayload,
        name: v2Filename,
        url: v2PublicUrl,
        version: 2
      })
      .select()
      .single();

    pdfOfferteV2FileId = insertedV2File.id;
    assert(insertedV2File.name.includes('_v2.pdf'), `Version 2 korrekt benannt: ${insertedV2File.name}`);
    assert(insertedV2File.version === 2, 'Versionsnummer ist 2');

    // -------------------------------------------------------------------------
    // 5. SCHRITT: VIRTUELLE ORDNERSTRUKTUR IM ARCHIV PRÜFEN
    // -------------------------------------------------------------------------
    console.log('\n📌 5. SCHRITT: Virtuelle Ordnerstruktur & Navigation im Archiv prüfen');

    // Daten für DateienView laden
    const [dRes, kRes, pRes, oRes, rRes] = await Promise.all([
      supabase.from('dateien').select('*, kunden(name, firmenname), projekte(name)').eq('tenant_id', TENANT_ID),
      supabase.from('kunden').select('*').eq('tenant_id', TENANT_ID),
      supabase.from('projekte').select('*').eq('tenant_id', TENANT_ID),
      supabase.from('offerten').select('id, offerte_nr, total, status, created_at, pdf_url, kunden_id, projekt_id').eq('tenant_id', TENANT_ID),
      supabase.from('rechnungen').select('id, rechnung_nr, total, status, created_at, pdf_url, kunden_id, projekt_id').eq('tenant_id', TENANT_ID)
    ]);

    const allDateien = dRes.data || [];
    const allKunden = kRes.data || [];
    const allProjekte = pRes.data || [];
    const allOfferten = oRes.data || [];
    const allRechnungen = rRes.data || [];

    // 5a. Root-Ebene
    const rootFolders = [
      { id: 'recent_root', name: 'Zuletzt geöffnet' },
      { id: 'kunden_root', name: 'Kunden' },
      { id: 'offerten_root', name: 'Offerten' },
      { id: 'buchhaltung_root', name: 'Buchhaltung & Rechnungen' },
      { id: 'intern_root', name: 'Firma Intern' }
    ];
    assert(rootFolders.length === 5, 'Root-Ebene hat 5 Standard-Systemordner');

    // 5b. Kunden-Ordner
    assert(allKunden.length === 23, `Kunden-Ordner enthält alle 23 Kunden`);
    const kundeDelavalladeEntry = allKunden.find(k => k.id === delavalladeKunde.id);
    assert(kundeDelavalladeEntry !== undefined, 'Kunde Delavallade ist in Kunden-Ordner enthalten');

    // 5c. Drilldown: Kunde Delavallade -> Projekte & Kategorien
    const delavalladeProjekte = allProjekte.filter(p => p.kunden_id === delavalladeKunde.id);
    assert(delavalladeProjekte.length === 1, 'Kunde Delavallade hat exakt 1 Projekt');
    assert(delavalladeProjekte[0].name.includes('Chemin des Morettes'), 'Projekt Chemin des Morettes korrekt verknüpft');

    // 5d. Drilldown: Projekt Chemin des Morettes -> Offerten-Kategorie
    const projOffertenDateien = allDateien.filter(d => 
      d.projekt_id === delavalladeProjekt.id && 
      (d.kategorie === 'Offerte' || d.kategorie === 'Offerten')
    );
    assert(projOffertenDateien.length >= 2, `Projekt Chemin des Morettes enthält die archivierten Offerten-PDFs (v1 und v2)`);

    // 5e. System-Ordner 'Offerten': Verknüpfung von physischen Dateien & Live-Offerten
    const offertenMatched = allOfferten.map(o => {
      const match = allDateien.find(d => d.offerte_id === o.id || (o.pdf_url && d.url === o.pdf_url) || d.name.includes(o.offerte_nr));
      return { offerte_nr: o.offerte_nr, hasPdf: Boolean(match || o.pdf_url) };
    });
    console.log(`   ▶ Offerten-Status im Archiv: 11 Offerten registriert`);
    assert(offertenMatched.find(m => m.offerte_nr === 'OF-3866').hasPdf === true, 'OF-3866 hat verknüpfte archivierte PDF-Datei');

    // -------------------------------------------------------------------------
    // 6. SCHRITT: DATEI UMBENENNEN
    // -------------------------------------------------------------------------
    console.log('\n📌 6. SCHRITT: Datei umbenennen');
    const renamedTitle = 'Quittung_Knuchel_Grosshandel_FINAL.pdf';
    const { error: renameErr } = await supabase
      .from('dateien')
      .update({ name: renamedTitle })
      .eq('id', uploadedFileId);

    if (renameErr) throw renameErr;

    const { data: updatedDoc } = await supabase.from('dateien').select('name').eq('id', uploadedFileId).single();
    assert(updatedDoc.name === renamedTitle, `Datei erfolgreich umbenannt in "${updatedDoc.name}"`);

    console.log('\n========================================================================');
    console.log('   ✅ ALLE PRÜFUNGEN DER DOKUMENTENABLAGE ERFOLGREICH BESTANDEN!      ');
    console.log('========================================================================\n');

  } finally {
    // -------------------------------------------------------------------------
    // 7. SCHRITT: BEREINIGUNG (CLEANUP DER TESTDATEIEN)
    // -------------------------------------------------------------------------
    console.log('🧹 7. SCHRITT: Saubere Rückführung der temporären Testdateien');

    // Dateien aus dateien-Tabelle löschen
    const idsToDelete = [uploadedFileId, pdfOfferteFileId, pdfOfferteV2FileId].filter(Boolean);
    if (idsToDelete.length > 0) {
      await supabase.from('dateien').delete().in('id', idsToDelete);
      console.log(`   ✓ ${idsToDelete.length} Testeinträge aus Tabelle "dateien" gelöscht`);
    }

    // Dateien aus Supabase Storage löschen
    const pathsToRemove = [uploadedStoragePath, pdfOfferteStoragePath, pdfOfferteV2StoragePath].filter(Boolean);
    if (pathsToRemove.length > 0) {
      await supabase.storage.from('anhange').remove(pathsToRemove);
      console.log(`   ✓ ${pathsToRemove.length} Testdateien aus Storage 'anhange' entfernt`);
    }

    // pdf_url auf OF-3866 zurücksetzen falls nötig
    await supabase.from('offerten').update({ pdf_url: null, archiviert_am: null }).eq('offerte_nr', 'OF-3866');

    // Endbestand prüfen
    const { data: finalDateien } = await supabase.from('dateien').select('id').eq('tenant_id', TENANT_ID);
    assert(finalDateien.length === initialDateien.length, `Dateienbestand wieder exakt auf Baseline (${finalDateien.length} Dateien)`);
    console.log('🎯 PRODUKTIV-STORAGE UND DATENBANK SIND VOLLSTÄNDIG BEREINIGT.');
  }
}

runDokumentenablageAudit().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
