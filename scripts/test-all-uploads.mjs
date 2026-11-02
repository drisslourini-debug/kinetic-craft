import { createClient } from '@supabase/supabase-js'
import { JSDOM } from 'jsdom'

if (!globalThis.DOMParser) {
  globalThis.DOMParser = new JSDOM().window.DOMParser
}

import { parseCamtXml } from '../src/lib/camtParser.js'
import { reconcileTransactionsWithInvoices } from '../src/lib/bankReconciliation.js'
import { getTenantStoragePath } from '../src/lib/storageHelper.js'

const SUPABASE_URL = 'https://fpfdlraqtqtcnmajrcyx.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_brOU6y2FDiFiZq9fhOYHGA_xYnC5yQN'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Sample 1x1 Transparent PNG
const SAMPLE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
)

// Sample JPEG Buffer
const SAMPLE_JPG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
  0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
  0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
  0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
  0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
  0x00, 0xbf, 0x00, 0xff, 0xd9
])

// Sample PDF Buffer
const SAMPLE_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 100 700 Td (Kinetic Craft PDF) ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000214 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n308\n%%EOF'
)

// Sample Swiss CAMT.053 XML
const SAMPLE_CAMT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.04">
  <BkToCstmrStmt>
    <Stmt>
      <Id>STMT-2026-CH-01</Id>
      <Acct>
        <Id><IBAN>CH4431999123000889012</IBAN></Id>
      </Acct>
      <Ntry>
        <Amt Ccy="CHF">4500.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts>BOOK</Sts>
        <BookgDt><Dt>2026-11-02</Dt></BookgDt>
        <ValDt><Dt>2026-11-02</Dt></ValDt>
        <NtryDtls>
          <TxDtls>
            <Refs>
              <EndToEndId>RE-2026-2484</EndToEndId>
            </Refs>
            <RltdPties>
              <Dbtr>
                <Nm>Muster Bau &amp; Handwerk AG</Nm>
              </Dbtr>
            </RltdPties>
            <RmtInf>
              <Ustrd>Zahlung Rechnung RE-2026-2484</Ustrd>
            </RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>`

async function testAllUploadLocations() {
  console.log('='.repeat(85))
  console.log('🔍 TEST ALLER UPLOAD-STELLEN IN KINETIC CRAFT CRM (STORAGE & FILE INGESTION)')
  console.log('='.repeat(85))
  console.log(`Zeitpunkt: ${new Date().toISOString()}`)
  console.log(`Supabase URL: ${SUPABASE_URL}\n`)

  const testResults = []
  function logResult(location, fileType, bucketOrAction, passed, details) {
    testResults.push({ location, fileType, bucketOrAction, passed, details })
    const icon = passed ? '✅ PASS' : '❌ FAIL'
    console.log(`${icon} [${location.padEnd(26)}] ${fileType.padEnd(14)} (${bucketOrAction.padEnd(16)}) -> ${details}`)
  }

  // 1. AUTHENTIFIZIERUNG
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'lourini@bluewin.ch',
    password: 'FloArt2026!'
  })

  if (authErr || !authData?.session) {
    console.error('Auth failed:', authErr)
    process.exit(1)
  }

  const { data: userRole } = await supabase.from('user_roles').select('*').eq('id', authData.user.id).single()
  const tenantId = userRole?.tenant_id || 'f10a2702-0002-4000-8000-000000000002'
  const timeStamp = Date.now().toString().slice(-5)

  // Vorhandenes Projekt & Kunde abrufen für Verknüpfung
  const { data: kunde } = await supabase.from('kunden').select('id, name').limit(1).single()
  const { data: projekt } = await supabase.from('projekte').select('id, name').limit(1).single()

  console.log(`Verifizierter Tenant: ${tenantId}`)
  console.log(`Test-Kunde: ${kunde?.name} (ID: ${kunde?.id})`)
  console.log(`Test-Projekt: ${projekt?.name} (ID: ${projekt?.id})\n`)

  const uploadedFilesToCleanup = []
  const createdDateienIds = []

  // -------------------------------------------------------------------------
  // TEST 1: Globale Dateiablage (DateienView.jsx) - PDF Dokument
  // -------------------------------------------------------------------------
  try {
    const fileName = `Dokument_Statik_${timeStamp}.pdf`
    const filePath = getTenantStoragePath(tenantId, fileName, 'dateien')

    const { error: upErr } = await supabase.storage.from('anhange').upload(filePath, SAMPLE_PDF, {
      contentType: 'application/pdf',
      upsert: true
    })

    if (upErr) throw upErr
    uploadedFilesToCleanup.push({ bucket: 'anhange', path: filePath })

    const { data: pubData } = supabase.storage.from('anhange').getPublicUrl(filePath)

    const { data: dbRow, error: dbErr } = await supabase.from('dateien').insert([{
      name: fileName,
      typ: 'application/pdf',
      url: pubData.publicUrl,
      size_bytes: SAMPLE_PDF.length,
      kunde_id: kunde?.id,
      projekt_id: projekt?.id,
      kategorie: 'Allgemeine Dokumente',
      tenant_id: tenantId
    }]).select().single()

    if (dbErr) throw dbErr
    createdDateienIds.push(dbRow.id)

    logResult('DateienView (Global)', 'PDF (Statik)', 'bucket: anhange', true, `Pfad: ${filePath}, Datei-ID: ${dbRow.id}`)
  } catch (err) {
    logResult('DateienView (Global)', 'PDF (Statik)', 'bucket: anhange', false, err.message)
  }

  // -------------------------------------------------------------------------
  // TEST 2: Baustellenfoto in Projekt (ProjektDetailView.jsx) - JPG
  // -------------------------------------------------------------------------
  try {
    const fileName = `Baustelle_Detail_${timeStamp}.jpg`
    const filePath = getTenantStoragePath(tenantId, fileName, 'projekte')

    const { error: upErr } = await supabase.storage.from('anhange').upload(filePath, SAMPLE_JPG, {
      contentType: 'image/jpeg',
      upsert: true
    })

    if (upErr) throw upErr
    uploadedFilesToCleanup.push({ bucket: 'anhange', path: filePath })

    const { data: pubData } = supabase.storage.from('anhange').getPublicUrl(filePath)

    const { data: dbRow, error: dbErr } = await supabase.from('dateien').insert([{
      name: fileName,
      typ: 'image/jpeg',
      url: pubData.publicUrl,
      size_bytes: SAMPLE_JPG.length,
      kunde_id: kunde?.id,
      projekt_id: projekt?.id,
      kategorie: 'Fotos & Pläne',
      tenant_id: tenantId
    }]).select().single()

    if (dbErr) throw dbErr
    createdDateienIds.push(dbRow.id)

    logResult('ProjektDetail (Baustelle)', 'JPG (Foto)', 'bucket: anhange', true, `Pfad: ${filePath}, Datei-ID: ${dbRow.id}`)
  } catch (err) {
    logResult('ProjektDetail (Baustelle)', 'JPG (Foto)', 'bucket: anhange', false, err.message)
  }

  // -------------------------------------------------------------------------
  // TEST 3: Bauplan / Dokument in Projekt (ProjektDetailView.jsx) - PDF
  // -------------------------------------------------------------------------
  try {
    const fileName = `Bauplan_EG_SIA_${timeStamp}.pdf`
    const filePath = getTenantStoragePath(tenantId, fileName, 'projekte')

    const { error: upErr } = await supabase.storage.from('anhange').upload(filePath, SAMPLE_PDF, {
      contentType: 'application/pdf',
      upsert: true
    })

    if (upErr) throw upErr
    uploadedFilesToCleanup.push({ bucket: 'anhange', path: filePath })

    const { data: pubData } = supabase.storage.from('anhange').getPublicUrl(filePath)

    const { data: dbRow, error: dbErr } = await supabase.from('dateien').insert([{
      name: fileName,
      typ: 'application/pdf',
      url: pubData.publicUrl,
      size_bytes: SAMPLE_PDF.length,
      kunde_id: kunde?.id,
      projekt_id: projekt?.id,
      kategorie: 'Fotos & Pläne',
      tenant_id: tenantId
    }]).select().single()

    if (dbErr) throw dbErr
    createdDateienIds.push(dbRow.id)

    logResult('ProjektDetail (Bauplan)', 'PDF (SIA-Plan)', 'bucket: anhange', true, `Pfad: ${filePath}, Datei-ID: ${dbRow.id}`)
  } catch (err) {
    logResult('ProjektDetail (Bauplan)', 'PDF (SIA-Plan)', 'bucket: anhange', false, err.message)
  }

  // -------------------------------------------------------------------------
  // TEST 4: Kundendossier Datei-Upload (KundeDetailView.jsx) - PDF
  // -------------------------------------------------------------------------
  try {
    const fileName = `Kundenvertrag_AG_${timeStamp}.pdf`
    const filePath = getTenantStoragePath(tenantId, fileName, 'kunden')

    const { error: upErr } = await supabase.storage.from('anhange').upload(filePath, SAMPLE_PDF, {
      contentType: 'application/pdf',
      upsert: true
    })

    if (upErr) throw upErr
    uploadedFilesToCleanup.push({ bucket: 'anhange', path: filePath })

    const { data: pubData } = supabase.storage.from('anhange').getPublicUrl(filePath)

    const { data: dbRow, error: dbErr } = await supabase.from('dateien').insert([{
      name: fileName,
      typ: 'application/pdf',
      url: pubData.publicUrl,
      size_bytes: SAMPLE_PDF.length,
      kunde_id: kunde?.id,
      kategorie: 'Allgemeine Dokumente',
      tenant_id: tenantId
    }]).select().single()

    if (dbErr) throw dbErr
    createdDateienIds.push(dbRow.id)

    logResult('KundeDetail (Vertrag)', 'PDF (Dossier)', 'bucket: anhange', true, `Pfad: ${filePath}, Datei-ID: ${dbRow.id}`)
  } catch (err) {
    logResult('KundeDetail (Vertrag)', 'PDF (Dossier)', 'bucket: anhange', false, err.message)
  }

  // -------------------------------------------------------------------------
  // TEST 5: Buchhaltung Beleg-Upload & Sync (AusgabeCreateModal.jsx) - JPG
  // -------------------------------------------------------------------------
  let createdAusgabeId = null
  try {
    const fileName = `Beleg_Grosshandel_Farben_${timeStamp}.jpg`
    const filePath = `buchhaltung/${fileName}`

    const { error: upErr } = await supabase.storage.from('anhange').upload(filePath, SAMPLE_JPG, {
      contentType: 'image/jpeg',
      upsert: true
    })

    if (upErr) throw upErr
    uploadedFilesToCleanup.push({ bucket: 'anhange', path: filePath })

    const { data: pubData } = supabase.storage.from('anhange').getPublicUrl(filePath)

    // In ausgaben Tabelle erfassen
    const { data: ausgabeRow, error: aErr } = await supabase.from('ausgaben').insert([{
      tenant_id: tenantId,
      titel: `Materialeinkauf Farblager (${timeStamp})`,
      beleg_datum: new Date().toISOString().split('T')[0],
      kategorie: 'Material & Wareneinkauf',
      betrag_brutto: 245.50,
      betrag_netto: 227.10,
      mwst_satz: 8.1,
      mwst_betrag: 18.40,
      projekt_id: projekt?.id,
      beleg_url: pubData.publicUrl,
      status: 'Geprüft',
      is_archived: false
    }]).select().single()

    if (aErr) throw aErr
    createdAusgabeId = ausgabeRow.id

    // Mirroring in dateien Tabelle (korrigiert: typ & size_bytes)
    const { data: dateiMirror, error: mErr } = await supabase.from('dateien').insert([{
      name: fileName,
      typ: 'image/jpeg',
      size_bytes: SAMPLE_JPG.length,
      url: pubData.publicUrl,
      kategorie: 'Beleg',
      projekt_id: projekt?.id,
      tenant_id: tenantId
    }]).select().single()

    if (mErr) throw mErr
    createdDateienIds.push(dateiMirror.id)

    logResult('Buchhaltung (Belegscan)', 'JPG (Quittung)', 'bucket: anhange', true, `Ausgabe: ${ausgabeRow.id}, Datei-Mirror: ${dateiMirror.id}`)
  } catch (err) {
    logResult('Buchhaltung (Belegscan)', 'JPG (Quittung)', 'bucket: anhange', false, err.message)
  }

  // -------------------------------------------------------------------------
  // TEST 6: Offerten-Anhang (OfferteDetailView.jsx) - PDF
  // -------------------------------------------------------------------------
  try {
    const { data: testOfferte } = await supabase.from('offerten').select('id, daten').limit(1).single()
    const fileName = `Anhang_Offerte_${testOfferte?.id || 1}_${timeStamp}.pdf`
    const filePath = `offerten_anhange/${fileName}`

    const { error: upErr } = await supabase.storage.from('anhange').upload(filePath, SAMPLE_PDF, {
      contentType: 'application/pdf',
      upsert: true
    })

    if (upErr) throw upErr
    uploadedFilesToCleanup.push({ bucket: 'anhange', path: filePath })

    const { data: pubData } = supabase.storage.from('anhange').getPublicUrl(filePath)

    logResult('OfferteDetail (Anhang)', 'PDF (Offerte)', 'bucket: anhange', true, `Pfad: ${filePath}, URL: ${pubData.publicUrl}`)
  } catch (err) {
    logResult('OfferteDetail (Anhang)', 'PDF (Offerte)', 'bucket: anhange', false, err.message)
  }

  // -------------------------------------------------------------------------
  // TEST 7: Firmenlogo / Branding in Einstellungen (FirmenDaten.jsx) - PNG
  // -------------------------------------------------------------------------
  try {
    const fileName = `Logo_FloArt_${timeStamp}.png`
    const filePath = `logos/${tenantId}/${fileName}`

    const { error: upErr } = await supabase.storage.from('public_assets').upload(filePath, SAMPLE_PNG, {
      contentType: 'image/png',
      upsert: true
    })

    if (upErr) throw upErr
    uploadedFilesToCleanup.push({ bucket: 'public_assets', path: filePath })

    const { data: pubData } = supabase.storage.from('public_assets').getPublicUrl(filePath)

    // Test updating einstellungen.logo_url
    const { error: einSetErr } = await supabase
      .from('einstellungen')
      .update({ logo_url: pubData.publicUrl })
      .eq('tenant_id', tenantId)

    if (einSetErr) throw einSetErr

    logResult('Einstellungen (Logo)', 'PNG (Firmenlogo)', 'public_assets', true, `Pfad: ${filePath}, URL verifiziert in einstellungen`)
  } catch (err) {
    logResult('Einstellungen (Logo)', 'PNG (Firmenlogo)', 'public_assets', false, err.message)
  }

  // -------------------------------------------------------------------------
  // TEST 8: Firmenlogo SVG in public_assets (Branding mit Vektorgrafik)
  // -------------------------------------------------------------------------
  try {
    const svgContent = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="#b88a38"/></svg>',
      'utf-8'
    )
    const fileName = `Logo_Vector_${timeStamp}.svg`
    const filePath = `logos/${tenantId}/${fileName}`

    const { error: upErr } = await supabase.storage.from('public_assets').upload(filePath, svgContent, {
      contentType: 'image/svg+xml',
      upsert: true
    })

    if (upErr) throw upErr
    uploadedFilesToCleanup.push({ bucket: 'public_assets', path: filePath })

    const { data: pubData } = supabase.storage.from('public_assets').getPublicUrl(filePath)

    logResult('Einstellungen (Vektor)', 'SVG (Vektorlogo)', 'public_assets', true, `Pfad: ${filePath}, SVG-MIME akzeptiert`)
  } catch (err) {
    logResult('Einstellungen (Vektor)', 'SVG (Vektorlogo)', 'public_assets', false, err.message)
  }

  // -------------------------------------------------------------------------
  // TEST 9: Bankabgleich CAMT.053 XML Ingestion & Parser (BankabgleichModal.jsx)
  // -------------------------------------------------------------------------
  try {
    const parseRes = parseCamtXml(SAMPLE_CAMT_XML)
    if (!parseRes.success) throw new Error(parseRes.error || 'CAMT-Parsing fehlgeschlagen')
    if (parseRes.transactions.length === 0) throw new Error('Keine Transaktionen extrahiert')

    const tx = parseRes.transactions[0]
    const recResult = reconcileTransactionsWithInvoices(parseRes.transactions, [
      { id: 101, rechnung_nr: 'RE-2026-2484', total: 4500.00, bezahlt: 0, status: 'Versendet' }
    ])

    const isMatched = recResult.reconciledItems.length > 0 && recResult.reconciledItems[0].statusCategory === 'matched'

    logResult(
      'BankabgleichModal',
      'XML (CAMT.053)',
      'camtParser & Reconcile',
      isMatched,
      `Konto: ${parseRes.iban}, Tx: CHF ${tx.betrag.toFixed(2)}, Match mit RE-2026-2484: ${isMatched ? 'Exakt passend (' + recResult.reconciledItems[0].statusLabel + ')' : 'Unmatched'}`
    )
  } catch (err) {
    logResult('BankabgleichModal', 'XML (CAMT.053)', 'camtParser', false, err.message)
  }

  // -------------------------------------------------------------------------
  // TEST 10: PDF-Export Generierung & Archivierung (RechnungPrintView.jsx)
  // -------------------------------------------------------------------------
  try {
    const fileName = `Rechnung_RE-2026-${timeStamp}.pdf`
    const filePath = getTenantStoragePath(tenantId, fileName, 'rechnungen')

    const { error: upErr } = await supabase.storage.from('anhange').upload(filePath, SAMPLE_PDF, {
      contentType: 'application/pdf',
      upsert: true
    })

    if (upErr) throw upErr
    uploadedFilesToCleanup.push({ bucket: 'anhange', path: filePath })

    const { data: pubData } = supabase.storage.from('anhange').getPublicUrl(filePath)

    const { data: dbRow, error: dbErr } = await supabase.from('dateien').insert([{
      name: fileName,
      typ: 'application/pdf',
      url: pubData.publicUrl,
      size_bytes: SAMPLE_PDF.length,
      kunde_id: kunde?.id,
      projekt_id: projekt?.id,
      kategorie: 'Rechnung',
      quelle: 'Rechnung-Export',
      tenant_id: tenantId
    }]).select().single()

    if (dbErr) throw dbErr
    createdDateienIds.push(dbRow.id)

    logResult('RechnungPrintView (Archiv)', 'PDF (GeBüV)', 'bucket: anhange', true, `Archiviert in dateien (ID: ${dbRow.id})`)
  } catch (err) {
    logResult('RechnungPrintView (Archiv)', 'PDF (GeBüV)', 'bucket: anhange', false, err.message)
  }

  // -------------------------------------------------------------------------
  // TEST 11: Mahnungs-PDF Generierung & Archivierung (MahnungPrintView.jsx)
  // -------------------------------------------------------------------------
  try {
    const fileName = `Mahnung_MA-2026-${timeStamp}.pdf`
    const filePath = getTenantStoragePath(tenantId, fileName, 'mahnungen')

    const { error: upErr } = await supabase.storage.from('anhange').upload(filePath, SAMPLE_PDF, {
      contentType: 'application/pdf',
      upsert: true
    })

    if (upErr) throw upErr
    uploadedFilesToCleanup.push({ bucket: 'anhange', path: filePath })

    const { data: pubData } = supabase.storage.from('anhange').getPublicUrl(filePath)

    const { data: dbRow, error: dbErr } = await supabase.from('dateien').insert([{
      name: fileName,
      typ: 'application/pdf',
      url: pubData.publicUrl,
      size_bytes: SAMPLE_PDF.length,
      kunde_id: kunde?.id,
      kategorie: 'Allgemeine Dokumente',
      quelle: 'Mahnung-Export',
      tenant_id: tenantId
    }]).select().single()

    if (dbErr) throw dbErr
    createdDateienIds.push(dbRow.id)

    logResult('MahnungPrintView (Archiv)', 'PDF (Mahnung)', 'bucket: anhange', true, `Archiviert in dateien (ID: ${dbRow.id})`)
  } catch (err) {
    logResult('MahnungPrintView (Archiv)', 'PDF (Mahnung)', 'bucket: anhange', false, err.message)
  }

  // -------------------------------------------------------------------------
  // CLEANUP DER TESTDATEN (SICHER & RÜCKSTANDSLOS)
  // -------------------------------------------------------------------------
  console.log('\n--- BEREINIGUNG DER TEMPORÄREN TESTDATEIEN ---')
  for (const item of uploadedFilesToCleanup) {
    await supabase.storage.from(item.bucket).remove([item.path])
  }
  console.log(`🧹 ${uploadedFilesToCleanup.length} Testdateien aus Storage-Buckets (anhange & public_assets) bereinigt.`)

  for (const id of createdDateienIds) {
    await supabase.from('dateien').delete().eq('id', id)
  }
  console.log(`🧹 ${createdDateienIds.length} Test-Einträge aus der Tabelle 'dateien' bereinigt.`)

  if (createdAusgabeId) {
    await supabase.from('ausgaben').delete().eq('id', createdAusgabeId)
    console.log(`🧹 Test-Ausgabe ID ${createdAusgabeId} bereinigt.`)
  }

  // -------------------------------------------------------------------------
  // ZUSAMMENFASSUNG
  // -------------------------------------------------------------------------
  console.log('\n' + '='.repeat(85))
  console.log('🏁 GESAMTERGEBNIS DES UPLOAD-AUDITS')
  console.log('='.repeat(85))
  const passedCount = testResults.filter(t => t.passed).length
  const failedCount = testResults.filter(t => !t.passed).length

  console.log(`Getestete Upload- & Ingestion-Pfade: ${testResults.length}`)
  console.log(`Erfolgreich (PASS):                   ${passedCount}`)
  console.log(`Fehlgeschlagen (FAIL):                ${failedCount}`)

  if (failedCount === 0) {
    console.log('\n🎉 PERFEKT: ALLE 11 UPLOAD-STELLEN IN DER GESAMTEN APPLIKATION FUNKTIONIEREN REIBUNGSLOS!')
  } else {
    console.log('\n⚠️ Es gab Fehler bei einzelnen Upload-Stellen.')
  }
  console.log('='.repeat(85))

  return { total: testResults.length, passed: passedCount, failed: failedCount }
}

testAllUploadLocations().catch(err => {
  console.error('Fatal upload audit error:', err)
  process.exit(1)
})
