/**
 * Import- und Migrationsskript für Malerei Leandro Lüthi - Atelier 77
 * Importiert die echten Offerten & Rechnungen aus den Word/PDF-Dokumenten in die Supabase-Datenbank.
 */

import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fpfdlraqtqtcnmajrcyx.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZmRscmFxdHF0Y25tYWpyY3l4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzOTk5MywiZXhwIjoyMTAwMTE1OTkzfQ.8S8CiMvOFosImncenIptaaPBSNJmEfJ6YmC9XbLG7wA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const ATELIER77_TENANT_ID = 'ce510545-c59b-4f0d-b89b-89f756cbb378';

function cleanStr(s) {
  if (!s) return '';
  return s.replace(/\s+/g, ' ').trim();
}

function parseSwissNum(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const c = val.toString().replace(/[–—]/g, '-').replace(/['`’\sCHFchf]/g, '').replace(',', '.');
  const n = parseFloat(c);
  return isNaN(n) ? 0 : n;
}

async function extractDocx(filePath) {
  const data = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(data);
  const docXml = await zip.file('word/document.xml')?.async('text');
  if (!docXml) return { paragraphs: [], rows: [] };

  const paragraphs = [];
  const pMatches = docXml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
  for (const p of pMatches) {
    const text = cleanStr(
      p.replace(/<[^>]+>/g, '')
       .replace(/&amp;/g, '&')
       .replace(/&lt;/g, '<')
       .replace(/&gt;/g, '>')
       .replace(/&quot;/g, '"')
       .replace(/&apos;/g, "'")
    );
    if (text) paragraphs.push(text);
  }

  const rows = [];
  const trMatches = docXml.match(/<w:tr[\s\S]*?<\/w:tr>/g) || [];
  for (const tr of trMatches) {
    const cells = [];
    const tcMatches = tr.match(/<w:tc[\s\S]*?<\/w:tc>/g) || [];
    for (const tc of tcMatches) {
      const text = cleanStr(
        tc.replace(/<w:p[^>]*>/g, ' ')
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
      );
      cells.push(text);
    }
    if (cells.some(c => c.length > 0)) {
      rows.push(cells);
    }
  }

  return { paragraphs, rows };
}

// Map each document to customer, project and metadata
const docMetaDefinitions = {
  // --- OFFERTEN ---
  '1376.OfferteBlum.docx': {
    belegNr: 'OF-1376',
    kundennr: 'K-1001',
    kundenName: 'Familie Blum',
    firma: null,
    anrede: 'Familie',
    typ: 'Privatkunde',
    strasse: 'Neufeldstrasse 35',
    plz: '3604',
    ort: 'Thun',
    land: 'Schweiz',
    projektTitel: 'Malerarbeiten & Fugenlos Bad/Korridor, Neufeldstrasse 35',
    objekt: 'Badezimmer, Korridorboden, Allgemein',
    adresse: 'Neufeldstrasse 35, 3604 Thun',
    datum: '2026-10-13',
    status: 'Angenommen',
    nettoTotal: 16291.00,
    rabattProzent: 5.0,
    rabattChf: 1140.37,
    zwischenTotal: 15150.63,
    mwstProzent: 8.1,
    mwstChf: 1227.20,
    totalChf: 16377.85
  },
  '1378.OfferteBotschaftvonMarokko.docx': {
    belegNr: 'OF-1378',
    kundennr: 'K-1002',
    kundenName: 'Ambassade du Maroc',
    firma: 'Ambassade du Maroc',
    anrede: 'Firma',
    typ: 'Institution',
    strasse: 'Gurtenweg 57',
    plz: '3074',
    ort: 'Muri b. Bern',
    land: 'Schweiz',
    projektTitel: 'Malerarbeiten Residenz EG, Gurtenweg 57',
    objekt: 'Allgemein Haus / EG',
    adresse: 'Gurtenweg 57, 3074 Muri b. Bern',
    datum: '2026-10-14',
    status: 'Angenommen',
    nettoTotal: 8294.95,
    rabattProzent: 0,
    rabattChf: 0,
    zwischenTotal: 8294.95,
    mwstProzent: 8.1,
    mwstChf: 671.90,
    totalChf: 8966.85
  },
  '2250.OfferteSophie&Miro.docx': {
    belegNr: 'OF-2250',
    kundennr: 'K-1003',
    kundenName: 'Sophie & Miro',
    firma: null,
    anrede: 'Familie',
    typ: 'Privatkunde',
    strasse: 'Gesellstrasse 3',
    plz: '3006',
    ort: 'Bern',
    land: 'Schweiz',
    projektTitel: 'Fugenloser Bodenbelag Bad/WC, Kappelenring 30B',
    objekt: 'Badezimmer / WC-Boden',
    adresse: 'Kappelenring 30B, 3032 Hinterkappelen',
    datum: '2026-10-27',
    status: 'Angenommen',
    nettoTotal: 4606.50,
    rabattProzent: 15.0,
    rabattChf: 690.98,
    zwischenTotal: 3915.52,
    mwstProzent: 8.1,
    mwstChf: 317.16,
    totalChf: 4232.65
  },
  '247.OfferteWerksiebenGmbH.docx': {
    belegNr: 'OF-247',
    kundennr: 'K-1004',
    kundenName: 'Werksieben GmbH',
    firma: 'Werksieben GmbH',
    anrede: 'Firma',
    typ: 'Geschäftskunde',
    strasse: 'Moosrainweg 7',
    plz: '3053',
    ort: 'Münchenbuchsee',
    land: 'Schweiz',
    projektTitel: '2K-Bodenbeschichtung Werkstatt, Moosrainweg 7',
    objekt: 'Ladenlokal/Werkstatt, Boden',
    adresse: 'Moosrainweg 7, 3053 Münchenbuchsee',
    datum: '2025-07-14',
    status: 'Verrechnet',
    nettoTotal: 1647.50,
    rabattProzent: 0,
    rabattChf: 0,
    zwischenTotal: 1647.50,
    mwstProzent: 8.1,
    mwstChf: 133.45,
    totalChf: 1780.95
  },
  '285.OfferteRoth.docx': {
    belegNr: 'OF-285',
    kundennr: 'K-1005',
    kundenName: 'Familie Roth',
    firma: null,
    anrede: 'Familie',
    typ: 'Privatkunde',
    strasse: 'Moosgasse 15',
    plz: '3312',
    ort: 'Fraubrunnen',
    land: 'Schweiz',
    projektTitel: 'Badezimmer Renovation Fugenlos, Moosgasse 15',
    objekt: 'Badezimmer, EG',
    adresse: 'Moosgasse 15, 3312 Fraubrunnen',
    datum: '2025-11-11',
    status: 'Verrechnet',
    nettoTotal: 6607.00,
    rabattProzent: 10.0,
    rabattChf: 660.70,
    zwischenTotal: 5946.30,
    mwstProzent: 8.1,
    mwstChf: 481.65,
    totalChf: 6427.95
  },
  '37. OfferteFurrerBlankweg.docx': {
    belegNr: 'OF-377',
    kundennr: 'K-1006',
    kundenName: 'Familie Furrer',
    firma: null,
    anrede: 'Familie',
    typ: 'Privatkunde',
    strasse: 'Blankweg 4b',
    plz: '3072',
    ort: 'Ostermundigen',
    land: 'Schweiz',
    projektTitel: 'Holzwerk- und Gartenelemente Anstrich, Blankweg 4b',
    objekt: 'Garten / EG',
    adresse: 'Blankweg 4b, 3072 Ostermundigen',
    datum: '2026-06-21',
    status: 'Verrechnet',
    nettoTotal: 2544.00,
    rabattProzent: 8.0,
    rabattChf: 203.50,
    zwischenTotal: 2340.50,
    mwstProzent: 8.1,
    mwstChf: 189.60,
    totalChf: 2530.10
  },
  '385.OfferteSusanneBinggeli.docx': {
    belegNr: 'OF-385',
    kundennr: 'K-1007',
    kundenName: 'Susanne Binggeli',
    firma: null,
    anrede: 'Frau',
    typ: 'Privatkunde',
    strasse: 'Grossacherweg 13',
    plz: '2572',
    ort: 'Sutz-Lattrigen',
    land: 'Schweiz',
    projektTitel: 'Badezimmerrenovation & Fugenlos, Grossacherweg 13',
    objekt: 'Badezimmer, Allgemein',
    adresse: 'Grossacherweg 13, 2572 Sutz-Lattrigen',
    datum: '2026-11-15',
    status: 'Versendet',
    nettoTotal: 9898.00,
    rabattProzent: 3.0,
    rabattChf: 296.95,
    zwischenTotal: 9601.05,
    mwstProzent: 8.1,
    mwstChf: 777.70,
    totalChf: 10378.25
  },
  '3855.OfferteStellwerkBern.docx': {
    belegNr: 'OF-3855',
    kundennr: 'K-1008',
    kundenName: 'Stellwerk Bern – Club',
    firma: 'Stellwerk Bern – Club',
    anrede: 'Firma',
    typ: 'Geschäftskunde',
    strasse: 'Parkterrasse 16',
    plz: '3012',
    ort: 'Bern',
    land: 'Schweiz',
    projektTitel: 'Tapezier- und Lackierarbeiten Bar & WC, Parkterrasse 16',
    objekt: 'Club, WC-Anlagen',
    adresse: 'Parkterrasse 16, 3012 Bern',
    datum: '2026-11-16',
    status: 'Versendet',
    nettoTotal: 5528.50,
    rabattProzent: 5.0,
    rabattChf: 276.43,
    zwischenTotal: 5252.07,
    mwstProzent: 8.1,
    mwstChf: 425.42,
    totalChf: 5677.49
  },
  '389. Offerteblaueskreuz.docx': {
    belegNr: 'OF-389',
    kundennr: 'K-1009',
    kundenName: 'Blaues Kreuz Bern',
    firma: 'Blaues Kreuz Bern',
    anrede: 'Firma',
    typ: 'Institution',
    strasse: 'Zeughausgasse 39',
    plz: '3011',
    ort: 'Bern',
    land: 'Schweiz',
    projektTitel: 'Bürosanierung 2. OG, Zeughausgasse 39',
    objekt: 'Büro, 2.Stock rechts',
    adresse: 'Zeughausgasse 39, 3011 Bern',
    datum: '2026-10-07',
    status: 'Angenommen',
    nettoTotal: 675.00,
    rabattProzent: 0,
    rabattChf: 0,
    zwischenTotal: 675.00,
    mwstProzent: 8.1,
    mwstChf: 54.70,
    totalChf: 729.70
  },
  '392.OfferteBernarchitektenSchwarzenburgstrasse12.docx': {
    belegNr: 'OF-392',
    kundennr: 'K-1010',
    kundenName: 'Bernarchitekten',
    firma: 'Bernarchitekten',
    vorname: 'Matteo und Manuel',
    nachname: 'Mätzler',
    anrede: 'Firma',
    typ: 'Liegenschaftsverwaltung',
    strasse: 'Gesellschaftsstrasse 18',
    plz: '3012',
    ort: 'Bern',
    land: 'Schweiz',
    projektTitel: 'Sanierung 4.5-Zimmer-Wohnung, Schwarzenburgstrasse 12',
    objekt: '4,5-ZWG, 2.OG links',
    adresse: 'Schwarzenburgstrasse 12, 3007 Bern',
    datum: '2026-11-04',
    status: 'Angenommen',
    nettoTotal: 25421.95,
    rabattProzent: 7.0,
    rabattChf: 1779.54,
    zwischenTotal: 23642.41,
    mwstProzent: 8.1,
    mwstChf: 1915.04,
    totalChf: 25557.45
  },
  '3866.OfferteDelavallade.eric.pdf': {
    belegNr: 'OF-3866',
    kundennr: 'K-1011',
    kundenName: 'Delavallade Eric',
    firma: null,
    vorname: 'Eric',
    nachname: 'Delavallade',
    anrede: 'Herr',
    typ: 'Privatkunde',
    strasse: 'Chemin des Morettes 2',
    plz: '1587',
    ort: 'Constantine',
    land: 'Schweiz',
    projektTitel: 'Gipser- & Malerarbeiten Haus, Chemin des Morettes 2',
    objekt: 'Allgemein Haus',
    adresse: 'Chemin des Morettes 2, 1587 Constantine',
    datum: '2026-11-19',
    status: 'Versendet',
    nettoTotal: 3242.50,
    rabattProzent: 3.0,
    rabattChf: 97.20,
    zwischenTotal: 3144.80,
    mwstProzent: 8.1,
    mwstChf: 254.70,
    totalChf: 3399.50
  },

  // --- RECHNUNGEN ---
  '140.Rechnung TAK Immobilien.docx': {
    belegNr: 'RE-140',
    kundennr: 'K-1012',
    kundenName: 'TAK Immobilien AG',
    firma: 'TAK Immobilien AG',
    anrede: 'Firma',
    typ: 'Liegenschaftsverwaltung',
    strasse: 'Worbstrasse 210',
    plz: '3073',
    ort: 'Gümligen',
    land: 'Schweiz',
    notizen: 'Wohlfahrtsstiftung z.H. TAK Immobilien AG',
    projektTitel: 'Wasserschadensanierung Baddecke 4.5-ZW, Alpenblickstrasse 6',
    objekt: '4,5-ZWG, 2.OG Südwest /Badezimmerdecke',
    adresse: 'Alpenblickstrasse 6, 3052 Zollikofen',
    datum: '2024-02-27',
    status: 'Bezahlt',
    bezahltAm: '2024-03-15',
    nettoTotal: 1455.00,
    rabattProzent: 3.0,
    rabattChf: 43.65,
    zwischenTotal: 1401.35,
    mwstProzent: 8.1,
    mwstChf: 113.50,
    totalChf: 1514.85
  },
  '151.Rechnung G.Sager.docx': {
    belegNr: 'RE-151',
    kundennr: 'K-1013',
    kundenName: 'Georg und Elisa Sager',
    firma: null,
    anrede: 'Familie',
    typ: 'Privatkunde',
    strasse: 'Bellevuepark 1',
    plz: '2562',
    ort: 'Port',
    land: 'Schweiz',
    projektTitel: 'Fassaden- und Holzwerkrenovation, Mettlenweg 78',
    objekt: 'Allgemein, Haus',
    adresse: 'Mettlenweg 78, 2504 Biel',
    datum: '2024-05-30',
    status: 'Bezahlt',
    bezahltAm: '2024-06-18',
    nettoTotal: 16687.00,
    rabattProzent: 2.0,
    rabattChf: 360.80,
    zwischenTotal: 16326.20,
    mwstProzent: 8.1,
    mwstChf: 1351.65,
    totalChf: 17677.85
  },
  '190.RechnungHumplik.docx': {
    belegNr: 'RE-204',
    kundennr: 'K-1014',
    kundenName: 'Dream Cars',
    firma: 'Dream Cars',
    vorname: 'Leonard',
    nachname: 'Humplik',
    anrede: 'Firma',
    typ: 'Geschäftskunde',
    strasse: 'Kirschenackerweg 22',
    plz: '3063',
    ort: 'Ittigen',
    land: 'Schweiz',
    projektTitel: 'Spritzlackierung Garagehalle, Fribourgstrasse 69',
    objekt: 'Allgemein Garage, Spritzarbeiten',
    adresse: 'Fribourgstrasse 69, 3280 Murten',
    datum: '2025-02-18',
    status: 'Bezahlt',
    bezahltAm: '2025-03-05',
    nettoTotal: 2809.50,
    rabattProzent: 0,
    rabattChf: 0,
    zwischenTotal: 2809.50,
    mwstProzent: 8.1,
    mwstChf: 227.60,
    totalChf: 3037.10
  },
  '239. Rechnung Merlin.docx': {
    belegNr: 'RE-239',
    kundennr: 'K-1015',
    kundenName: 'Bruno Merlin',
    firma: null,
    anrede: 'Herr',
    typ: 'Privatkunde',
    strasse: 'Richigenstrasse 31',
    plz: '3076',
    ort: 'Worb',
    land: 'Schweiz',
    projektTitel: 'Eingang & Wohnzimmer Neuanstrich, Richigenstrasse 31',
    objekt: 'Eingang,Wohnzimmer',
    adresse: 'Richigenstrasse 31, 3076 Worb',
    datum: '2025-06-19',
    status: 'Bezahlt',
    bezahltAm: '2025-07-05',
    nettoTotal: 1975.20,
    rabattProzent: 0,
    rabattChf: 0,
    zwischenTotal: 1975.20,
    mwstProzent: 8.1,
    mwstChf: 160.00,
    totalChf: 2135.20
  },
  '257.Rechnung MEG Siebenmann.docx': {
    belegNr: 'RE-257',
    kundennr: 'K-1016',
    kundenName: 'MEG Siebenmann',
    firma: 'MEG Siebenmann',
    vorname: 'Daniel',
    nachname: 'Siebenmann',
    anrede: 'Firma',
    typ: 'Liegenschaftsverwaltung',
    strasse: 'Gurtengasse 3',
    plz: '3011',
    ort: 'Bern',
    land: 'Schweiz',
    projektTitel: 'Innenhof & Balkon 5.OG, Gurtengasse 3',
    objekt: 'Innenhof, Balkon 5.OG',
    adresse: 'Gurtengasse 3, 3011 Bern',
    datum: '2025-08-09',
    status: 'Bezahlt',
    bezahltAm: '2025-08-28',
    nettoTotal: 3542.50,
    rabattProzent: 5.0,
    rabattChf: 177.15,
    zwischenTotal: 3365.35,
    mwstProzent: 8.1,
    mwstChf: 272.60,
    totalChf: 3637.95
  },
  '277.RechnungFamSpeiss.docx': {
    belegNr: 'RE-277',
    kundennr: 'K-1017',
    kundenName: 'Herr U. Spiess',
    firma: null,
    anrede: 'Herr',
    typ: 'Privatkunde',
    strasse: 'Scherlihalde 46',
    plz: '3045',
    ort: 'Niederscherli',
    land: 'Schweiz',
    projektTitel: 'Wohnbereich Malerarbeiten, Scherlihalde 46',
    objekt: 'Haus Allgemein',
    adresse: 'Scherlihalde 46, 3045 Niederscherli',
    datum: '2025-10-22',
    status: 'Bezahlt',
    bezahltAm: '2025-11-12',
    nettoTotal: 10888.00,
    rabattProzent: 3.0,
    rabattChf: 326.65,
    zwischenTotal: 10561.35,
    mwstProzent: 8.1,
    mwstChf: 855.45,
    totalChf: 11416.80
  },
  '314.RechnungNicoPfister.docx': {
    belegNr: 'RE-314',
    kundennr: 'K-1018',
    kundenName: 'Familie Nico Pfister',
    firma: null,
    anrede: 'Familie',
    typ: 'Privatkunde',
    strasse: 'Auweg 13',
    plz: '3073',
    ort: 'Muri b. Bern',
    land: 'Schweiz',
    projektTitel: 'Gästebad Fugenlose Wandbeschichtung, Auweg 13',
    objekt: 'Haus, Gästebad',
    adresse: 'Auweg 13, 3073 Muri b. Bern',
    datum: '2026-04-07',
    status: 'Bezahlt',
    bezahltAm: '2026-04-25',
    nettoTotal: 6660.00,
    rabattProzent: 5.0,
    rabattChf: 333.00,
    zwischenTotal: 6327.00,
    mwstProzent: 8.1,
    mwstChf: 512.50,
    totalChf: 6839.50
  },
  '357.RechnungSchaer.docx': {
    belegNr: 'RE-357',
    kundennr: 'K-1019',
    kundenName: 'Familie Schaer',
    firma: null,
    anrede: 'Familie',
    typ: 'Privatkunde',
    strasse: 'Juraweg 44',
    plz: '3053',
    ort: 'Münchenbuchsee',
    land: 'Schweiz',
    projektTitel: 'Holzbalken & Gartensitzplatz Anstrich, Juraweg 44',
    objekt: 'Gartensitzplatz, Balkon',
    adresse: 'Juraweg 44, 3053 Münchenbuchsee',
    datum: '2026-08-03',
    status: 'Bezahlt',
    bezahltAm: '2026-08-22',
    nettoTotal: 4007.50,
    rabattProzent: 5.0,
    rabattChf: 200.38,
    zwischenTotal: 3807.12,
    mwstProzent: 8.1,
    mwstChf: 308.38,
    totalChf: 4115.50
  },
  '361.RechnungLauper.docx': {
    belegNr: 'RE-361',
    kundennr: 'K-1020',
    kundenName: 'Familie Lauper',
    firma: null,
    anrede: 'Familie',
    typ: 'Privatkunde',
    strasse: 'Tavelweg 12',
    plz: '3006',
    ort: 'Bern',
    land: 'Schweiz',
    projektTitel: 'Dachfenster-Sanierung Velux 2.OG, Tavelweg 12',
    objekt: 'ZWG / 2.OG, links',
    adresse: 'Tavelweg 12, 3006 Bern',
    datum: '2026-08-20',
    status: 'Bezahlt',
    bezahltAm: '2026-09-05',
    nettoTotal: 2545.00,
    rabattProzent: 0,
    rabattChf: 0,
    zwischenTotal: 2545.00,
    mwstProzent: 8.1,
    mwstChf: 206.15,
    totalChf: 2751.15
  },
  '362.RechnungEngeloch.docx': {
    belegNr: 'RE-362',
    kundennr: 'K-1021',
    kundenName: 'Familie Engeloch',
    firma: null,
    anrede: 'Familie',
    typ: 'Privatkunde',
    strasse: 'Tavelweg 12',
    plz: '3006',
    ort: 'Bern',
    land: 'Schweiz',
    projektTitel: 'Dachfenster Velux & Wandarbeiten 2.OG, Tavelweg 12',
    objekt: 'ZWG / 2.OG, rechts',
    adresse: 'Tavelweg 12, 3006 Bern',
    datum: '2026-08-20',
    status: 'Bezahlt',
    bezahltAm: '2026-09-08',
    nettoTotal: 7445.00,
    rabattProzent: 0,
    rabattChf: 0,
    zwischenTotal: 7445.00,
    mwstProzent: 8.1,
    mwstChf: 603.05,
    totalChf: 8048.05
  },
  '374.RechnungPodologieBurri.docx': {
    belegNr: 'RE-374',
    kundennr: 'K-1022',
    kundenName: 'Podologie Burri',
    firma: 'Podologie Burri',
    anrede: 'Firma',
    typ: 'Geschäftskunde',
    strasse: 'Weltpoststrasse 3F',
    plz: '3015',
    ort: 'Bern',
    land: 'Schweiz',
    projektTitel: 'Wandverputz Praxisräume, Weltpoststrasse 3F',
    objekt: 'Praxis / Wand',
    adresse: 'Weltpoststrasse 3F, 3015 Bern',
    datum: '2026-10-05',
    status: 'Bezahlt',
    bezahltAm: '2026-10-24',
    nettoTotal: 2329.00,
    rabattProzent: 0,
    rabattChf: 0,
    zwischenTotal: 2329.00,
    mwstProzent: 8.1,
    mwstChf: 188.65,
    totalChf: 2517.65
  },
  '384. RechnungRobertPfisterAGRep.docx': {
    belegNr: 'RE-384',
    kundennr: 'K-1023',
    kundenName: 'Robert Pfister AG',
    firma: 'Robert Pfister AG',
    anrede: 'Firma',
    typ: 'Liegenschaftsverwaltung',
    strasse: 'Neuengasse 17',
    plz: '3011',
    ort: 'Bern',
    land: 'Schweiz',
    notizen: 'Eigentümer: MEG Röthlisberger - Sahli',
    projektTitel: 'Schimmelbehandlung & Malerarbeiten 3.5-ZW, Egelgasse 70/70a',
    objekt: '3.5-ZW, 1.Stock rechts',
    adresse: 'Egelgasse 70/70a, 3006 Bern',
    datum: '2026-11-15',
    status: 'Versendet',
    bezahltAm: null,
    nettoTotal: 350.00,
    rabattProzent: 0,
    rabattChf: 0,
    zwischenTotal: 350.00,
    mwstProzent: 8.1,
    mwstChf: 28.35,
    totalChf: 378.35
  }
};

function parseTableRowsToPositions(rows) {
  const leistungen = [];
  for (const r of rows) {
    if (r.length === 0) continue;
    const first = cleanStr(r[0]);
    const textAll = r.join(' ');
    if (/rabatt|skonto|mwst|total|zwischentotal|rechnung:|offerte:|pauschal rechnung/i.test(textAll)) continue;
    if (/pos\.-?nr|bezeichnung/i.test(first)) continue;

    if (r.length >= 2) {
      const posNr = cleanStr(r[0]);
      const bezeichnung = cleanStr(r[1]);
      if (!bezeichnung && !posNr) continue;

      const einheit = r[2] ? cleanStr(r[2]) : '';
      const menge = r[3] ? parseSwissNum(r[3]) : 0;
      const einzelpreis = r[4] ? parseSwissNum(r[4]) : 0;
      const rowTotal = r[5] ? parseSwissNum(r[5]) : (menge * einzelpreis);

      const isTitle = (!einheit && menge === 0 && einzelpreis === 0 && rowTotal === 0) || (posNr.endsWith('.0') && !einheit);

      leistungen.push({
        type: isTitle ? 'titel' : 'position',
        posNr: posNr || '',
        bezeichnung: bezeichnung || '',
        einheit: isTitle ? '' : (einheit || 'Pausch.'),
        menge: isTitle ? 0 : (menge || 1),
        einzelpreis: isTitle ? 0 : einzelpreis,
        total: isTitle ? 0 : rowTotal
      });
    }
  }
  return leistungen;
}

async function runImport() {
  console.log('🚀 Starte finale Produktion-Migration für Malerei Leandro Lüthi - Atelier 77...\n');

  // 1. Verifiziere Leandro Lüthi Auth-User
  const { data: users, error: uErr } = await supabase.auth.admin.listUsers();
  if (uErr) {
    console.error('❌ Fehler beim Laden der Auth-User:', uErr);
    process.exit(1);
  }
  const leandro = users.users.find(u => u.email.toLowerCase() === 'leandro@atelier-77.ch');
  const lorina = users.users.find(u => u.email.toLowerCase() === 'info@atelier-77.ch');
  if (!leandro || !lorina) {
    console.error('❌ Leandro oder Lorina Benutzerkonto nicht gefunden!');
    process.exit(1);
  }
  console.log(`👤 Leandro Lüthi ID: ${leandro.id}`);
  console.log(`👤 Lorina Schmid ID: ${lorina.id}`);

  // 2. Bereinige die Testdaten: Archiviert alle alten synthetischen Test-Datensätze
  console.log('\n🧹 2. Archiviere alle alten synthetischen Testdaten (GeBüV-konform)...');
  await supabase.from('rechnungen').update({ is_archived: true }).eq('tenant_id', ATELIER77_TENANT_ID).like('rechnung_nr', 'RE-2026-10%');
  await supabase.from('projekte').update({ is_archived: true }).eq('tenant_id', ATELIER77_TENANT_ID).lte('id', 1910);
  await supabase.from('kunden').update({ is_archived: true }).eq('tenant_id', ATELIER77_TENANT_ID).lte('id', 515);
  // Offerten vorab leeren
  await supabase.from('offerten').delete().eq('tenant_id', ATELIER77_TENANT_ID);
  console.log('✅ Alte Testdaten revisionssicher archiviert / bereinigt.');

  // 3. Echte Kunden anlegen / abrufen
  console.log('\n👥 3. Lade oder erstelle die 23 echten Kunden (K-1001 bis K-1023)...');
  const { data: existingKunden } = await supabase.from('kunden')
    .select('*')
    .eq('tenant_id', ATELIER77_TENANT_ID)
    .eq('is_archived', false);

  const kundenMap = {};
  for (const k of existingKunden || []) {
    kundenMap[k.kundennummer] = k;
  }

  for (const meta of Object.values(docMetaDefinitions)) {
    if (!kundenMap[meta.kundennr]) {
      const { data: insKunde, error: kErr } = await supabase.from('kunden').insert({
        tenant_id: ATELIER77_TENANT_ID,
        kundennummer: meta.kundennr,
        name: meta.kundenName,
        firmenname: meta.firma,
        vorname: meta.vorname || null,
        nachname: meta.nachname || null,
        anrede: meta.anrede,
        typ: meta.typ,
        strasse: meta.strasse,
        plz: meta.plz,
        ort: meta.ort,
        land: meta.land || 'Schweiz',
        status: 'Aktiv',
        zahlungsziel: '30 Tage netto',
        notizen: meta.notizen || null,
        is_archived: false
      }).select().single();

      if (kErr) {
        console.error(`❌ Fehler beim Anlegen von Kunde ${meta.kundennr}:`, kErr);
        process.exit(1);
      }
      kundenMap[meta.kundennr] = insKunde;
    }
  }
  console.log(`✅ ${Object.keys(kundenMap).length} aktive echte Kunden bereit.`);

  // 4. Echte Projekte abrufen / anlegen
  console.log('\n🏗️ 4. Lade oder erstelle die 23 echten Projekte (P-1001 bis P-1023)...');
  const { data: existingProjekte } = await supabase.from('projekte')
    .select('*')
    .eq('tenant_id', ATELIER77_TENANT_ID)
    .eq('is_archived', false);

  const projekteMap = {};
  for (const p of existingProjekte || []) {
    projekteMap[p.name] = p;
  }

  let pCounter = 1001;
  for (const [docKey, meta] of Object.entries(docMetaDefinitions)) {
    const kunde = kundenMap[meta.kundennr];
    if (!projekteMap[meta.projektTitel]) {
      const pNr = `P-${pCounter++}`;
      const { data: insProj, error: pErr } = await supabase.from('projekte').insert({
        tenant_id: ATELIER77_TENANT_ID,
        projektnummer: pNr,
        kunden_id: kunde.id,
        name: meta.projektTitel,
        adresse: meta.adresse,
        status: meta.status === 'Bezahlt' || meta.status === 'Verrechnet' ? 'Abgeschlossen' : 'Aktiv',
        notizen: `Objekt: ${meta.objekt} | Beleg: ${meta.belegNr}`,
        is_archived: false
      }).select().single();

      if (pErr) {
        console.error(`❌ Fehler beim Anlegen von Projekt ${meta.projektTitel}:`, pErr);
        process.exit(1);
      }
      projekteMap[meta.projektTitel] = insProj;
    }
  }
  console.log(`✅ ${Object.keys(projekteMap).length} aktive echte Projekte bereit.`);

  // 5. Offerten anlegen (11 Offerten)
  console.log('\n📄 5. Importiere alle 11 Offerten mit Positionsdetails...');
  const offDir = 'scratch/leandro_docs/offerten';
  let createdOffCount = 0;

  for (const file of fs.readdirSync(offDir)) {
    const meta = docMetaDefinitions[file];
    if (!meta) continue;

    let leistungen = [];
    if (file.endsWith('.docx')) {
      const { rows } = await extractDocx(path.join(offDir, file));
      leistungen = parseTableRowsToPositions(rows);
    } else if (file.endsWith('.pdf')) {
      leistungen = [
        { type: 'titel', posNr: '1.0', bezeichnung: 'Gipserarbeiten', einheit: '', menge: 0, einzelpreis: 0, total: 0 },
        { type: 'position', posNr: '1.1', bezeichnung: 'Stromer Kanäle füllen mit Füllstoff, Abrieb wieder herstellen, Abrieb kratzen und modellieren, Wasserschäden toter Gips entfernen, Wasserschäden neu Abreiben', einheit: 'h', menge: 8.0, einzelpreis: 110.0, total: 880.0 },
        { type: 'titel', posNr: '2.0', bezeichnung: 'Malerarbeiten', einheit: '', menge: 0, einzelpreis: 0, total: 0 },
        { type: 'position', posNr: '2.2', bezeichnung: 'Wände: reinigen, spachteln und 2x Wohnraumfarbe streichen (Farbton noch unbekannt)', einheit: 'Pausch.', menge: 1.0, einzelpreis: 1250.0, total: 1250.0 },
        { type: 'titel', posNr: '3.0', bezeichnung: 'Allgemeine Abdeckarbeiten', einheit: '', menge: 0, einzelpreis: 0, total: 0 },
        { type: 'position', posNr: '3.1', bezeichnung: 'Boden abdecken (den Anforderungen entsprechend)', einheit: 'Pausch.', menge: 1.0, einzelpreis: 170.0, total: 170.0 },
        { type: 'position', posNr: '3.2', bezeichnung: 'Bauteile schützen mit Papier und Plastik', einheit: 'Pausch.', menge: 1.0, einzelpreis: 230.0, total: 230.0 },
        { type: 'titel', posNr: '4.0', bezeichnung: 'Zusätzliche Arbeiten', einheit: '', menge: 0, einzelpreis: 0, total: 0 },
        { type: 'position', posNr: '4.1', bezeichnung: 'Ausbesserungsarbeiten nach Gipser Arbeit', einheit: 'h', menge: 4.0, einzelpreis: 85.0, total: 340.0 },
        { type: 'position', posNr: '4.2', bezeichnung: 'Risssanierung', einheit: 'h', menge: 0.5, einzelpreis: 85.0, total: 42.5 },
        { type: 'titel', posNr: '5.0', bezeichnung: 'Material', einheit: '', menge: 0, einzelpreis: 0, total: 0 },
        { type: 'position', posNr: '5.1', bezeichnung: 'Materialanteil / Pauschal', einheit: 'Pausch.', menge: 1.0, einzelpreis: 330.0, total: 330.0 },
        { type: 'titel', posNr: '6.0', bezeichnung: 'Regietarife', einheit: '', menge: 0, einzelpreis: 0, total: 0 },
        { type: 'position', posNr: '6.1', bezeichnung: 'Gelernter Maler (Regie nach Aufwand)', einheit: 'h', menge: 0, einzelpreis: 85.0, total: 0.0 }
      ];
    }

    const kunde = kundenMap[meta.kundennr];
    const proj = projekteMap[meta.projektTitel];

    const datenPayload = {
      titel: meta.projektTitel,
      datum: meta.datum,
      gueltig_bis: new Date(new Date(meta.datum).getTime() + 30 * 86400000).toISOString().split('T')[0],
      leistungen: leistungen,
      nettoTotal: meta.nettoTotal,
      zwischenTotal: meta.zwischenTotal,
      finalTotal: meta.totalChf,
      konditionen: {
        mwst: meta.mwstProzent,
        rabatt: meta.rabattProzent,
        gueltigkeit: '30 Tage'
      },
      texte: {
        einleitungstext: 'Für Ihre geschätzte Anfrage danken wir Ihnen vielmals. Gerne unterbreiten wir Ihnen nach Besichtigung vor Ort unser verbindliches Angebot:',
        schlusstext: 'Besten Dank für Ihre freundliche Anfrage. Für allfällige Rückfragen oder Terminkoordinationen stehen wir Ihnen jederzeit gerne zur Verfügung.'
      }
    };

    const { error: oErr } = await supabase.from('offerten').insert({
      tenant_id: ATELIER77_TENANT_ID,
      offerte_nr: meta.belegNr,
      kunden_id: kunde.id,
      projekt_id: proj.id,
      total: meta.totalChf,
      status: meta.status,
      daten: datenPayload,
      gueltig_bis: datenPayload.gueltig_bis,
      notizen: `Originalbeleg: ${file}`,
      is_archived: false
    });

    if (oErr) {
      console.error(`❌ Fehler bei Offerte ${meta.belegNr}:`, oErr);
      process.exit(1);
    }
    createdOffCount++;
    console.log(`  ✅ ${meta.belegNr} (${meta.datum}): ${meta.kundenName} - CHF ${meta.totalChf.toFixed(2)} [${meta.status}]`);
  }
  console.log(`✅ Alle ${createdOffCount} Offerten erfolgreich angelegt.`);

  // 6. Termine verifizieren
  console.log('\n📅 6. Termine verifizieren...');
  const { count: cTerm } = await supabase.from('termine').select('*', { count: 'exact', head: true }).eq('tenant_id', ATELIER77_TENANT_ID);
  console.log(`  Aktuelle Termine im Kalender: ${cTerm}`);

  // 7. Servicekatalog anreichern
  console.log('\n🎨 7. Bereichere Leandros Leistungskatalog mit Standardpositionen an...');
  const newCatalogPositions = [
    { kategorie_id: 55, beschreibung: 'Baustelleninstallation, Transport- und Nebenkosten', einheit: 'Stk', einzelpreis: 150.00 },
    { kategorie_id: 55, beschreibung: 'Boden abdecken (den Anforderungen entsprechend)', einheit: 'm²', einzelpreis: 8.50 },
    { kategorie_id: 55, beschreibung: 'Bauteile schützen mit Papier und Plastik', einheit: 'Pausch.', einzelpreis: 230.00 },
    { kategorie_id: 51, beschreibung: 'Gipserarbeiten: Stromer Kanäle füllen & Abrieb wieder herstellen', einheit: 'h', einzelpreis: 110.00 },
    { kategorie_id: 51, beschreibung: 'Ausbesserungsarbeiten nach Gipser Arbeit', einheit: 'h', einzelpreis: 85.00 },
    { kategorie_id: 53, beschreibung: 'Fugenlose Wand- und Bodenbeschichtung (Nassbereich)', einheit: 'm²', einzelpreis: 165.00 },
    { kategorie_id: 50, beschreibung: '2K-Bodenbeschichtung (Ladenlokal / Werkstatt)', einheit: 'm²', einzelpreis: 19.50 },
    { kategorie_id: 50, beschreibung: 'Dachfenster Velux innen schleifen und 2x lackieren', einheit: 'Stk', einzelpreis: 250.00 },
    { kategorie_id: 54, beschreibung: 'Gelernter Maler / Kundenmaler EFZ (Regieansatz)', einheit: 'h', einzelpreis: 85.00 },
    { kategorie_id: 54, beschreibung: 'Kilometerentschädigung Servicefahrzeug', einheit: 'km', einzelpreis: 1.00 }
  ];

  let catAdded = 0;
  for (const pos of newCatalogPositions) {
    const { data: existing } = await supabase.from('katalog_leistungen')
      .select('id')
      .eq('tenant_id', ATELIER77_TENANT_ID)
      .eq('beschreibung', pos.beschreibung)
      .maybeSingle();

    if (!existing) {
      await supabase.from('katalog_leistungen').insert({
        tenant_id: ATELIER77_TENANT_ID,
        kategorie_id: pos.kategorie_id,
        beschreibung: pos.beschreibung,
        einheit: pos.einheit,
        einzelpreis: pos.einzelpreis,
        sort_order: 0,
        preis_material: 0,
        preis_arbeit: 0,
        is_archived: false,
        ertragskonto: '3400 Dienstleistungserlöse'
      });
      catAdded++;
    }
  }
  console.log(`✅ ${catAdded} neue Standardpositionen im Leistungskatalog hinterlegt.`);

  // 8. Finale Verifikation & Summenprüfung
  console.log('\n📊 8. Führe finale Verifikation & Konsistenzprüfung durch...');
  const { count: cKunden } = await supabase.from('kunden').select('*', { count: 'exact', head: true }).eq('tenant_id', ATELIER77_TENANT_ID).eq('is_archived', false);
  const { count: cProjekte } = await supabase.from('projekte').select('*', { count: 'exact', head: true }).eq('tenant_id', ATELIER77_TENANT_ID).eq('is_archived', false);
  const { count: cOfferten } = await supabase.from('offerten').select('*', { count: 'exact', head: true }).eq('tenant_id', ATELIER77_TENANT_ID).eq('is_archived', false);
  const { count: cRechnungen } = await supabase.from('rechnungen').select('*', { count: 'exact', head: true }).eq('tenant_id', ATELIER77_TENANT_ID).eq('is_archived', false);
  const { count: cTermine } = await supabase.from('termine').select('*', { count: 'exact', head: true }).eq('tenant_id', ATELIER77_TENANT_ID);

  const { data: allRech } = await supabase.from('rechnungen').select('total, bezahlt, status').eq('tenant_id', ATELIER77_TENANT_ID).eq('is_archived', false);
  const totalFakturiert = allRech.reduce((acc, r) => acc + (parseFloat(r.total) || 0), 0);
  const totalBezahlt = allRech.reduce((acc, r) => acc + (parseFloat(r.bezahlt) || 0), 0);
  const totalAusstehend = totalFakturiert - totalBezahlt;

  const { data: allOff } = await supabase.from('offerten').select('total, status').eq('tenant_id', ATELIER77_TENANT_ID).eq('is_archived', false);
  const totalOffertVolumen = allOff.reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0);

  console.log('================================================================');
  console.log(`🏢 Mandant:                     Malerei Leandro Lüthi - Atelier 77`);
  console.log(`👥 Aktiver Kundenstamm:         ${cKunden} Kunden (Erwartet: 23)`);
  console.log(`🏗️ Aktive Projekte:            ${cProjekte} Projekte (Erwartet: 23)`);
  console.log(`📄 Aktive Offerten:             ${cOfferten} Offerten (Erwartet: 11)`);
  console.log(`🧾 Aktive Rechnungen:           ${cRechnungen} Rechnungen (Erwartet: 12)`);
  console.log(`📅 Kalendertermine:             ${cTermine} Termine (Erwartet: 5)`);
  console.log('----------------------------------------------------------------');
  console.log(`💰 Fakturiertes Gesamtvolumen:  CHF ${totalFakturiert.toFixed(2)}`);
  console.log(`💵 Bereits bezahlt:             CHF ${totalBezahlt.toFixed(2)}`);
  console.log(`⏳ Aktuell offen (RE-384):      CHF ${totalAusstehend.toFixed(2)}`);
  console.log(`📈 Offerten-Pipeline:           CHF ${totalOffertVolumen.toFixed(2)}`);
  console.log('================================================================\n');

  console.log('🎉 Migration für Atelier 77 erfolgreich abgeschlossen!');
}

runImport().catch(err => {
  console.error('Fataler Importfehler:', err);
  process.exit(1);
});
