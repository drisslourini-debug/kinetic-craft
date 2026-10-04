/**
 * Schweizer Treuhand- & Buchhaltungsexport (Banana Buchhaltung & Schweizer KMU-Kontenrahmen)
 * Konform mit Schweizer Rechnungslegungsrecht (OR 957 ff.) und ESTV-Mehrwertsteuer-Praxis.
 */

import { formatDate } from './formatters';

// Schweizer Kontenrahmen KMU (Standard für Handwerksbetriebe)
export const KMU_KONTEN = {
  BANK: '1020',
  KASSE: '1000',
  DEBITOREN: '1100',
  KREDITOREN: '2000',
  MWST_GESCHULDET: '2200',
  VORSTEUER_MATERIAL: '1170',
  VORSTEUER_INVESTITION: '1171',
  ERTRAG_HANDWERK: '3200',
  ERTRAG_DIENSTLEISTUNG: '3400',
  AUFWAND_MATERIAL: '4000',
  AUFWAND_FREMDLEISTUNG: '4400',
  AUFWAND_WERKZEUG: '4500',
  AUFWAND_FAHRZEUG: '6200',
  AUFWAND_VERSICHERUNG: '6300',
  AUFWAND_VERWALTUNG: '6500',
  AUFWAND_WERBUNG: '6600',
  AUFWAND_SONSTIG: '6700'
};

/**
 * Ermittelt das passende KMU-Aufwandskonto anhand der Ausgabenkategorie
 */
export function getKmuAufwandskonto(kategorie) {
  if (!kategorie) return KMU_KONTEN.AUFWAND_SONSTIG;
  const kat = kategorie.toLowerCase();
  if (kat.includes('material') || kat.includes('farbe') || kat.includes('gips')) return KMU_KONTEN.AUFWAND_MATERIAL;
  if (kat.includes('fremd') || kat.includes('subunternehmer')) return KMU_KONTEN.AUFWAND_FREMDLEISTUNG;
  if (kat.includes('werkzeug') || kat.includes('maschine') || kat.includes('geraet')) return KMU_KONTEN.AUFWAND_WERKZEUG;
  if (kat.includes('auto') || kat.includes('fahrzeug') || kat.includes('benzin') || kat.includes('diesel')) return KMU_KONTEN.AUFWAND_FAHRZEUG;
  if (kat.includes('versicherung')) return KMU_KONTEN.AUFWAND_VERSICHERUNG;
  if (kat.includes('werbung') || kat.includes('marketing') || kat.includes('website')) return KMU_KONTEN.AUFWAND_WERBUNG;
  if (kat.includes('büro') || kat.includes('buero') || kat.includes('telefon') || kat.includes('software')) return KMU_KONTEN.AUFWAND_VERWALTUNG;
  return KMU_KONTEN.AUFWAND_SONSTIG;
}

/**
 * Generiert ein Banana-Buchhaltungs-kompatibles Buchungsjournal (.csv) mit Semikolon-Trennung.
 * Banana Format: Datum;Beleg;Beschreibung;KontoSoll;KontoHaben;Betrag;MwStCode
 */
export function generateBananaJournalCsv(ausgaben = [], einnahmen = []) {
  const headers = [
    'Datum',
    'Beleg',
    'Beschreibung',
    'KontoSoll',
    'KontoHaben',
    'Betrag',
    'MwStSatz',
    'MwStBetrag'
  ];

  const rows = [];

  // 1. Einnahmen (Debitorenbuchung / Zahlungseingang auf Bank)
  for (const r of einnahmen) {
    const datum = formatDate(r.bezahlt_am || r.rechnungsdatum || r.created_at);
    const belegNr = r.rechnung_nr || `RE-${r.id}`;
    const desc = `Rechnung ${belegNr} - ${r.projekte?.name || r.kunden?.name || 'Kunde'}`;
    const betrag = parseFloat(r.total || 0).toFixed(2);
    
    // Soll: Bank (1020) an Haben: Ertrag Handwerk (3200)
    rows.push([
      datum,
      `"${belegNr}"`,
      `"${desc.replace(/"/g, '""')}"`,
      KMU_KONTEN.BANK,
      KMU_KONTEN.ERTRAG_HANDWERK,
      betrag,
      '8.1',
      (parseFloat(betrag) * 0.081 / 1.081).toFixed(2)
    ].join(';'));
  }

  // 2. Ausgaben (Aufwand an Bank/Kasse)
  for (const a of ausgaben) {
    const datum = formatDate(a.beleg_datum || a.created_at);
    const belegNr = a.id ? `AG-${String(a.id).slice(-6)}` : 'AG';
    const desc = `${a.titel || 'Ausgabe'}${a.projekte?.name ? ` (Projekt: ${a.projekte.name})` : ''}`;
    const betrag = parseFloat(a.betrag_brutto || a.betrag_netto || 0).toFixed(2);
    const sollKonto = getKmuAufwandskonto(a.kategorie);
    const habenKonto = a.status === 'Bezahlt' ? KMU_KONTEN.BANK : KMU_KONTEN.KREDITOREN;

    rows.push([
      datum,
      `"${belegNr}"`,
      `"${desc.replace(/"/g, '""')}"`,
      sollKonto,
      habenKonto,
      betrag,
      a.mwst_satz ?? 0,
      (parseFloat(a.mwst_betrag) || 0).toFixed(2)
    ].join(';'));
  }

  return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
}

/**
 * Erstellt eine Kennziffern-Aufstellung für das offizielle Schweizer MWST-Formular 200 (ESTV)
 */
export function generateEstvMwstSummaryCsv(ausgaben = [], einnahmen = []) {
  // Berechnung Umsatz
  let totalUmsatz = 0;
  for (const r of einnahmen) {
    totalUmsatz += parseFloat(r.total || 0);
  }

  // Berechnung Vorsteuer
  let totalVorsteuer = 0;
  for (const a of ausgaben) {
    totalVorsteuer += parseFloat(a.mwst_betrag || 0);
  }

  // Geschuldete Steuer (Normalsatz 8.1% auf Netto-Umsatz)
  const nettoUmsatz = totalUmsatz / 1.081;
  const geschuldeteMwst = totalUmsatz - nettoUmsatz;
  const zahllast = geschuldeteMwst - totalVorsteuer;

  const lines = [
    'ESTV MWST-Abrechnung (Formular 200) - Übersicht nach Schweizer Recht',
    `Erstellt am:;${new Date().toLocaleDateString('de-CH')}`,
    '',
    'Kennziffer;Bezeichnung;Betrag CHF',
    `Ziffer 200;Vereinbarte/Vereinnahmte Entgelte (Gesamtumsatz);${totalUmsatz.toFixed(2)}`,
    `Ziffer 220;Leistungen im Ausland / von der Steuer befreit;0.00`,
    `Ziffer 289;Steuerbarer Gesamtumsatz (Ziffer 200 abzüglich Ziffer 220);${totalUmsatz.toFixed(2)}`,
    `Ziffer 302;Leistungen zum Normalsatz (8.1 %);${geschuldeteMwst.toFixed(2)}`,
    `Ziffer 382;Total geschuldete MWST;${geschuldeteMwst.toFixed(2)}`,
    `Ziffer 400;Vorsteuer auf Material- und Dienstleistungsaufwand;${totalVorsteuer.toFixed(2)}`,
    `Ziffer 405;Vorsteuer auf Investitionen und übrigem Betriebsaufwand;0.00`,
    `Ziffer 410;Total Vorsteuerabzug;${totalVorsteuer.toFixed(2)}`,
    `Ziffer 500;${zahllast >= 0 ? 'Zu bezahlender Betrag (Zahllast an ESTV)' : 'Guthaben der steuerpflichtigen Person'};${Math.abs(zahllast).toFixed(2)}`
  ];

  return '\uFEFF' + lines.join('\r\n');
}
