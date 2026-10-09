/**
 * Kinetic Craft - Rechtliche Stammdaten & Schweizer Compliance-Konfiguration
 * Gemäss Art. 3 Abs. 1 lit. s UWG (Schweizer Lauterkeitsrecht) und Schweizer Datenschutzgesetz (DSG).
 */

export const LEGAL_CONFIG = {
  // Betreiberdaten (Art. 3 Abs. 1 lit. s UWG)
  firmenname: 'Kinetic Idrissi',
  inhaber: 'M. Idrissi',
  rechtsform: 'Schweizer Einzelfirma (Einzelunternehmen)',
  domizil: {
    strasse: 'Musterstrasse 1', // Kann bei Bedarf mit der exakten Domiziladresse ergänzt werden
    plz: '8000',
    ort: 'Zürich',
    land: 'Schweiz',
  },
  kontakt: {
    email: 'support@ki-netic.ch',
    telefon: '+41 44 500 00 00',
    web: 'kinetic-craft.ch',
  },
  unternehmensIdentifikation: {
    uid: 'CHE-123.456.789', // Handelsregister-UID
    mwst: 'CHE-123.456.789 MWST',
    handelsregisteramt: 'Kanton Zürich',
  },

  // Architektur & Hosting Transparenz
  hosting: {
    frontend: {
      provider: 'Vercel Inc.',
      standort: 'Edge Network (EU / Frankfurt)',
      beschreibung: 'Auslieferung der verschlüsselten Web-Applikation via modernem CDN/Edge-Netzwerk.',
    },
    datenhaltung: {
      provider: 'Supabase Inc.',
      zertifizierung: 'ISO/IEC 27001, SOC 2 Typ II',
      verschluesselung: 'AES-256 (At-Rest) und TLS 1.3 (In-Transit)',
      standort: 'Frankfurt am Main (EU-Central-1) / Schweiz-kompatibel',
      beschreibung: 'Strikte Tenant-Trennung (Row-Level Security) und datenschutzkonforme Speicherung gemäss Schweizer DSG.',
    },
    backup: {
      intervall: 'Täglich automatisiert',
      verschluesselung: 'Punktgenaue Wiederherstellung (PITR) & AES-256',
    },
  },

  // Gesetzliche Grundlagen
  gesetze: {
    datenschutz: 'Schweizer Bundesgesetz über den Datenschutz (DSG, SR 235.1)',
    uwg: 'Bundesgesetz gegen den unlauteren Wettbewerb (UWG, Art. 3 Abs. 1 lit. s)',
    mwst: 'Bundesgesetz über die Mehrwertsteuer (MWSTG, SR 641.20)',
    qrStandard: 'Schweizer QR-Rechnung Standard (ISO 20022 / SIX Interbank Clearing)',
  },
}
