/**
 * SIA 118 Schlussrechnung & Garantie-Rückbehalt Helper
 * 
 * Konform mit Schweizer Baurecht (SIA 118 Art. 154 & Art. 181, OR Art. 363 ff.):
 * - Art. 154 SIA 118: Vollständige Erfassung der Werkleistung & Anrechnung der Abschlagszahlungen (Akonti).
 * - Art. 181 SIA 118: Rückbehalt zur Sicherstellung (5% bis 10%, Standard 5% der Gesamtwerkssumme).
 * - Art. 172 SIA 118: 2-jährige Rügefrist für verdeckte & sichtbare Mängel (Fälligkeit der Garantiefreigabe).
 * - Schweizer 5-Rappen-Rundung nach kaufmännischer Praxis.
 */

/**
 * Rundet einen Betrag kaufmännisch auf 5 Rappen (CHF 0.05).
 * @param {number} amount
 * @returns {number}
 */
export function roundToFiveRappen(amount) {
  if (isNaN(amount) || amount === null || amount === undefined) return 0;
  return Math.round(Number(amount) * 20) / 20;
}

/**
 * Berechnet das Fälligkeitsdatum für die Freigabe des Garantie-Rückbehalts
 * (Standard: 2 Jahre nach Abnahme / Schlussrechnungsdatum gemäss SIA 118 Art. 172/181).
 * @param {string|Date} baseDate
 * @param {number} years - Standard 2 Jahre
 * @returns {string} ISO Date String YYYY-MM-DD
 */
export function calculateGarantieFreigabeDatum(baseDate, years = 2) {
  const d = baseDate ? new Date(baseDate) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
}

/**
 * Berechnet alle Beträge einer SIA 118 Schlussrechnung.
 * 
 * @param {Object} params
 * @param {number} params.gesamtwerkpreis - Werkpreis inkl. MwSt. (vor Akonto- & Rückbehalts-Abzügen)
 * @param {Array<Object>} [params.akontoAbzuege] - Liste bisheriger Akonto-Rechnungen [{ id, rechnung_nr, datum, betrag, titel }]
 * @param {Object} [params.rueckbehalt] - Garantie-Rückbehalt Konfiguration
 * @param {boolean} [params.rueckbehalt.aktiv=true] - Ob 5% Rückbehalt einbehalten wird
 * @param {number} [params.rueckbehalt.prozent=5.0] - Prozentsatz (Standard: 5%)
 * @param {boolean} [params.rueckbehalt.abgeloestDurchGarantie=false] - Ob durch Bürgschaft/Bankgarantie abgelöst
 * @param {string} [params.rueckbehalt.basis='gesamtwerkpreis'] - 'gesamtwerkpreis' (SIA 118 Standard) oder 'restbetrag'
 * @param {string} [params.rechnungsdatum] - Rechnungsdatum für die Fristberechnung
 * @returns {Object} Detaillierte SIA 118 Abrechnung
 */
export function calculateSia118Schlussrechnung({
  gesamtwerkpreis = 0,
  akontoAbzuege = [],
  rueckbehalt = {
    aktiv: true,
    prozent: 5.0,
    abgeloestDurchGarantie: false,
    basis: 'gesamtwerkpreis'
  },
  rechnungsdatum = new Date().toISOString().split('T')[0]
} = {}) {
  const werkpreisBrutto = roundToFiveRappen(parseFloat(gesamtwerkpreis) || 0);

  // 1. Akonto-Abzüge summieren
  const validAkonti = (akontoAbzuege || []).filter(a => a && !a.disabled);
  const totalAkontoAbzug = roundToFiveRappen(
    validAkonti.reduce((sum, a) => sum + (parseFloat(a.betrag) || 0), 0)
  );

  // 2. Zwischentotal nach Akonto
  const restbetragNachAkonto = roundToFiveRappen(Math.max(0, werkpreisBrutto - totalAkontoAbzug));

  // 3. 5% Garantie-Rückbehalt (SIA 118 Art. 181)
  const isRueckbehaltAktiv = Boolean(rueckbehalt?.aktiv && !rueckbehalt?.abgeloestDurchGarantie);
  const rueckbehaltProzent = parseFloat(rueckbehalt?.prozent ?? 5.0);

  let rueckbehaltBetrag = 0;
  if (isRueckbehaltAktiv && rueckbehaltProzent > 0) {
    const basisBetrag = rueckbehalt?.basis === 'restbetrag' ? restbetragNachAkonto : werkpreisBrutto;
    rueckbehaltBetrag = roundToFiveRappen(basisBetrag * (rueckbehaltProzent / 100));
  }

  // 4. Zur Zahlung fälliger Schlussbetrag
  // Mindestens 0 CHF (falls Akonti Werkpreis übersteigen sollten)
  const faelligerSchlussbetrag = roundToFiveRappen(
    Math.max(0, restbetragNachAkonto - rueckbehaltBetrag)
  );

  // 5. Garantiefreigabe-Datum (2 Jahre nach SIA 118 Art. 172)
  const freigabeDatum = calculateGarantieFreigabeDatum(rechnungsdatum, 2);

  return {
    werkpreisBrutto,
    gesamtwerkpreis: werkpreisBrutto,
    akontoAbzuege: validAkonti,
    totalAkontoAbzug,
    totalAkontoAbzuege: totalAkontoAbzug,
    restbetragNachAkonto,
    garantieAktiv: Boolean(rueckbehalt?.aktiv),
    garantieBetrag: rueckbehaltBetrag,
    abgeloestDurchGarantie: Boolean(rueckbehalt?.abgeloestDurchGarantie),
    rueckbehaltProzent,
    freigabeDatum,
    rueckbehalt: {
      aktiv: Boolean(rueckbehalt?.aktiv),
      prozent: rueckbehaltProzent,
      betrag: rueckbehaltBetrag,
      abgeloestDurchGarantie: Boolean(rueckbehalt?.abgeloestDurchGarantie),
      basis: rueckbehalt?.basis || 'gesamtwerkpreis',
      freigabeDatum,
      hinweis: rueckbehalt?.abgeloestDurchGarantie
        ? 'Garantie-Rückbehalt durch Bank-/Versicherungsgarantie (SIA 118 Art. 181 Abs. 3) abgelöst.'
        : `5% Garantie-Rückbehalt nach SIA 118 Art. 181 zur Sicherung der 2-jährigen Rügefrist bis ${freigabeDatum}.`
    },
    faelligerSchlussbetrag
  };
}
