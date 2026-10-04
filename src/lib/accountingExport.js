/**
 * Schweizer Treuhand- & Buchhaltungsexport (Banana Buchhaltung & Schweizer KMU-Kontenrahmen)
 * Konform mit Schweizer Rechnungslegungsrecht (OR 957 ff.), GeBüV und ESTV-Mehrwertsteuer-Praxis.
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
  SKONTO_ERLOESMINDERUNG: '3800',
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
 * Unterstützt wahlweise:
 * - 'kassa' (Einfaches Kassenbuch: Bank an Ertrag)
 * - 'doppelt' (Vollständige doppelte Buchhaltung: Faktura 1100 an 3200 + Zahlung 1020 an 1100 + Skonto 3800 an 1100)
 */
export function generateBananaJournalCsv(ausgaben = [], einnahmen = [], options = {}) {
  const mode = options.mode || 'kassa';
  const accounts = {
    bank: options.konto_bank || KMU_KONTEN.BANK,
    debitoren: options.konto_debitoren || KMU_KONTEN.DEBITOREN,
    kreditoren: options.konto_kreditoren || KMU_KONTEN.KREDITOREN,
    ertrag: options.konto_ertrag || KMU_KONTEN.ERTRAG_HANDWERK,
    skonto: options.konto_skonto || KMU_KONTEN.SKONTO_ERLOESMINDERUNG
  };

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

  if (mode === 'doppelt') {
    // 1. Fakturierung der Einnahmen: FLL (1100) an Ertrag (3200)
    for (const r of einnahmen) {
      const rechnungsDatum = formatDate(r.rechnungsdatum || r.created_at);
      const belegNr = r.rechnung_nr || `RE-${r.id}`;
      const descFaktura = `Faktura ${belegNr} - ${r.projekte?.name || r.kunden?.name || 'Kunde'}`;
      const totalBetrag = parseFloat(r.total || 0).toFixed(2);
      const mwstRate = parseFloat(r.daten?.konditionen?.mwst || 8.1);
      const mwstAnteil = (parseFloat(totalBetrag) * (mwstRate / 100) / (1 + (mwstRate / 100))).toFixed(2);

      rows.push([
        rechnungsDatum,
        `"${belegNr}"`,
        `"${descFaktura.replace(/"/g, '""')}"`,
        accounts.debitoren,
        accounts.ertrag,
        totalBetrag,
        mwstRate.toFixed(1),
        mwstAnteil
      ].join(';'));

      // 2. Zahlungseingang: Bank (1020) an FLL (1100)
      const bezahltBetrag = parseFloat(r.bezahlt || 0);
      if (bezahltBetrag > 0) {
        const zahlungsDatum = formatDate(r.bezahlt_am || r.rechnungsdatum || r.created_at);
        const descZahlung = `Zahlungseingang ${belegNr} - ${r.kunden?.name || 'Kunde'}`;

        rows.push([
          zahlungsDatum,
          `"${belegNr}"`,
          `"${descZahlung.replace(/"/g, '""')}"`,
          accounts.bank,
          accounts.debitoren,
          bezahltBetrag.toFixed(2),
          '0.0',
          '0.00'
        ].join(';'));

        // 3. Skonto / Abzug (Konto 3800 an 1100)
        const skonto = parseFloat(r.daten?.skonto_betrag || 0);
        if (skonto > 0) {
          const descSkonto = `Skonto/Abzug ${belegNr} (Art. 41 MWSTG)`;
          const skontoMwst = (skonto * (mwstRate / 100) / (1 + (mwstRate / 100))).toFixed(2);
          rows.push([
            zahlungsDatum,
            `"${belegNr}"`,
            `"${descSkonto.replace(/"/g, '""')}"`,
            accounts.skonto,
            accounts.debitoren,
            skonto.toFixed(2),
            mwstRate.toFixed(1),
            skontoMwst
          ].join(';'));
        }
      }
    }
  } else {
    // Kassenbuch-Modus: Direkt Bank (1020) an Ertrag (3200)
    for (const r of einnahmen) {
      const datum = formatDate(r.bezahlt_am || r.rechnungsdatum || r.created_at);
      const belegNr = r.rechnung_nr || `RE-${r.id}`;
      const desc = `Rechnung ${belegNr} - ${r.projekte?.name || r.kunden?.name || 'Kunde'}`;
      const betrag = parseFloat(r.total || 0).toFixed(2);
      const mwstRate = parseFloat(r.daten?.konditionen?.mwst || 8.1);
      const mwstAnteil = (parseFloat(betrag) * (mwstRate / 100) / (1 + (mwstRate / 100))).toFixed(2);

      rows.push([
        datum,
        `"${belegNr}"`,
        `"${desc.replace(/"/g, '""')}"`,
        accounts.bank,
        accounts.ertrag,
        betrag,
        mwstRate.toFixed(1),
        mwstAnteil
      ].join(';'));
    }
  }

  // 2. Ausgaben (Aufwand an Bank/Kasse/Kreditoren)
  for (const a of ausgaben) {
    const datum = formatDate(a.beleg_datum || a.created_at);
    const belegNr = a.id ? `AG-${String(a.id).slice(-6)}` : 'AG';
    const desc = `${a.titel || 'Ausgabe'}${a.projekte?.name ? ` (Projekt: ${a.projekte.name})` : ''}`;
    const betrag = parseFloat(a.betrag_brutto || a.betrag_netto || 0).toFixed(2);
    const sollKonto = getKmuAufwandskonto(a.kategorie);
    const habenKonto = a.status === 'Bezahlt' ? accounts.bank : accounts.kreditoren;

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
 * Berücksichtigt 'effektiv' (mit Vorsteuer) vs. 'saldosteuer' (ohne Vorsteuer)
 */
export function generateEstvMwstSummaryCsv(ausgaben = [], einnahmen = [], options = {}) {
  const isSaldo = options.mwst_methode === 'saldosteuer';
  const saldorate = parseFloat(options.saldosteuersatz || 5.9);

  // Berechnung Umsatz
  let totalUmsatz = 0;
  for (const r of einnahmen) {
    totalUmsatz += parseFloat(r.total || 0);
  }

  // Berechnung Vorsteuer
  let totalVorsteuer = 0;
  if (!isSaldo) {
    for (const a of ausgaben) {
      totalVorsteuer += parseFloat(a.mwst_betrag || 0);
    }
  }

  // Geschuldete Steuer
  let geschuldeteMwst = 0;
  if (isSaldo) {
    // Bei Saldosteuersatz: Pauschaler Steuersatz auf Bruttoumsatz inkl. MWST
    geschuldeteMwst = totalUmsatz * (saldorate / 100);
  } else {
    // Effektive Methode (8.1% Normalsatz)
    const nettoUmsatz = totalUmsatz / 1.081;
    geschuldeteMwst = totalUmsatz - nettoUmsatz;
  }

  const zahllast = geschuldeteMwst - totalVorsteuer;

  const lines = [
    'ESTV MWST-Abrechnung (Formular 200) - Übersicht nach Schweizer Recht',
    `Erstellt am:;${new Date().toLocaleDateString('de-CH')}`,
    `Abrechnungsmethode:;${isSaldo ? `Saldosteuersatzmethode (${saldorate}% - Art. 37 MWSTG)` : 'Effektive Methode (Art. 36 MWSTG)'}`,
    `Abrechnungsart:;${options.mwst_abrechnungsart === 'vereinnahmt' ? 'Vereinnahmt (nach Zahlungseingang)' : 'Vereinbart (nach Rechnungsdatum)'}`,
    '',
    'Kennziffer;Bezeichnung;Betrag CHF',
    `Ziffer 200;Vereinbarte/Vereinnahmte Entgelte (Gesamtumsatz);${totalUmsatz.toFixed(2)}`,
    `Ziffer 220;Leistungen im Ausland / von der Steuer befreit;0.00`,
    `Ziffer 289;Steuerbarer Gesamtumsatz (Ziffer 200 abzüglich Ziffer 220);${totalUmsatz.toFixed(2)}`,
    isSaldo 
      ? `Ziffer 381;Saldosteuersatz (${saldorate} % auf Gesamtumsatz);${geschuldeteMwst.toFixed(2)}`
      : `Ziffer 302;Leistungen zum Normalsatz (8.1 %);${geschuldeteMwst.toFixed(2)}`,
    `Ziffer 382;Total geschuldete MWST;${geschuldeteMwst.toFixed(2)}`,
    `Ziffer 400;Vorsteuer auf Material- und Dienstleistungsaufwand;${totalVorsteuer.toFixed(2)}`,
    `Ziffer 405;Vorsteuer auf Investitionen und übrigem Betriebsaufwand;0.00`,
    `Ziffer 410;Total Vorsteuerabzug;${totalVorsteuer.toFixed(2)}`,
    `Ziffer 500;${zahllast >= 0 ? 'Zu bezahlender Betrag (Zahllast an ESTV)' : 'Guthaben der steuerpflichtigen Person'};${Math.abs(zahllast).toFixed(2)}`
  ];

  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Erstellt eine Schweizer Stichtags-OP-Liste (Offene Posten Debitoren / FLL Aging-Report)
 * Zur Bilanzierung per 31.12. und Festlegung von Delkredere / Wertberichtigungen (Art. 960e OR).
 */
export function generateOpenItemsDebtorsCsv(rechnungen = [], stichtag = new Date()) {
  const refDate = new Date(stichtag);

  const headers = [
    'Rechnungsnummer',
    'Kunde',
    'Projekt',
    'Rechnungsdatum',
    'FaelligAm',
    'Rechnungsbetrag CHF',
    'BereitsBezahlt CHF',
    'OffenerBetrag CHF',
    'TageUeberfaellig',
    'Altersstruktur',
    'Status'
  ];

  const rows = [];
  let totalOffen = 0;

  for (const r of rechnungen) {
    if (r.status === 'Storniert' || r.status === 'Entwurf') continue;

    const total = parseFloat(r.total || 0);
    const bezahlt = parseFloat(r.bezahlt || 0);
    const offen = Math.max(0, Math.round((total - bezahlt) * 100) / 100);

    if (offen <= 0.05) continue; // Vollständig bezahlt

    totalOffen += offen;

    const faelligStr = r.faellig_am || r.rechnungsdatum || r.created_at;
    const faelligDate = new Date(faelligStr);
    const diffTime = refDate.getTime() - faelligDate.getTime();
    const tageUeberfaellig = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    let altersstruktur = 'Noch nicht fällig';
    if (tageUeberfaellig > 90) altersstruktur = '> 90 Tage (Betreibung prüfen)';
    else if (tageUeberfaellig > 60) altersstruktur = '61–90 Tage überfällig';
    else if (tageUeberfaellig > 30) altersstruktur = '31–60 Tage überfällig';
    else if (tageUeberfaellig > 0) altersstruktur = '1–30 Tage überfällig';

    rows.push([
      `"${r.rechnung_nr || r.id}"`,
      `"${(r.kunden?.name || r.kunden_name || 'Kunde').replace(/"/g, '""')}"`,
      `"${(r.projekte?.name || r.projekt_name || '').replace(/"/g, '""')}"`,
      formatDate(r.rechnungsdatum || r.created_at),
      formatDate(faelligStr),
      total.toFixed(2),
      bezahlt.toFixed(2),
      offen.toFixed(2),
      tageUeberfaellig,
      `"${altersstruktur}"`,
      r.status || 'Offen'
    ].join(';'));
  }

  // Schweizer Delkredere-Schätzung (Pauschale 5% auf inländische Forderungen)
  const delkredere5Prozent = (totalOffen * 0.05).toFixed(2);

  const summaryLines = [
    '',
    `Total offene Debitorenforderungen (FLL Konto 1100):;${totalOffen.toFixed(2)} CHF`,
    `Empfohlenes Delkredere 5% (Konto 1109 / Art. 960e OR):;${delkredere5Prozent} CHF`,
    `Netto-Forderungen nach Delkredere:;${(totalOffen - parseFloat(delkredere5Prozent)).toFixed(2)} CHF`
  ];

  return '\uFEFF' + [headers.join(';'), ...rows, ...summaryLines].join('\r\n');
}
