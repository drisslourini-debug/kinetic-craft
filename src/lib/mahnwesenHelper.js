/**
 * mahnwesenHelper.js
 * 
 * Schweizer Mahnwesen & SchKG-Vorbereitung für Handwerker & KMU.
 * Konform mit OR Art. 102 ff. (Schuldnerverzug), OR Art. 104 (5% gesetzlicher Verzugszins)
 * und SchKG Art. 67 (Betreibungsbegehren).
 */

/**
 * Standard-Mahnstufen nach Schweizer Handwerker-Praxis.
 */
export const DEFAULT_MAHNSTUFEN = {
  1: {
    stufe: 1,
    key: 'erinnerung',
    name: 'Zahlungserinnerung',
    kurz: 'Erinnerung',
    fristTage: 10,
    spesen: 0.00,
    zinsAktiv: false,
    titel: 'Freundliche Zahlungserinnerung',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    beschreibung: 'Höfliche Erinnerung an die noch offene Rechnung ohne Mahnspesen.'
  },
  2: {
    stufe: 2,
    key: 'mahnung_1',
    name: '1. Mahnung',
    kurz: '1. Mahnung',
    fristTage: 10,
    spesen: 20.00,
    zinsAktiv: false,
    titel: '1. Mahnung',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
    beschreibung: 'Bestimmte Mahnung mit CHF 20.– Spesenaufwand zur Deckung der Umtriebe.'
  },
  3: {
    stufe: 3,
    key: 'mahnung_2',
    name: '2. Mahnung (Letzte Mahnung vor Betreibung)',
    kurz: 'Letzte Mahnung',
    fristTage: 5,
    spesen: 30.00,
    zinsAktiv: true,
    titel: '2. und letzte Mahnung vor Einleitung der Betreibung',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 font-semibold',
    beschreibung: 'Letzte Mahnung mit CHF 30.– Spesen, 5% gesetzlichem Verzugszins p.a. (Art. 104 OR) und Betreibungsandrohung (SchKG).'
  }
};

/**
 * Runden auf die nächsten 5 Rappen (Schweizer Standard bei Bargeld / Barbeträgen / Abrechnungen)
 * @param {number} amount 
 * @returns {number}
 */
export function roundToFiveRappen(amount) {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round(amount * 20) / 20;
}

/**
 * Berechnet die Anzahl Tage Verzug ab Fälligkeitsdatum bis zum Stichtag.
 * @param {string|Date} faelligAm 
 * @param {string|Date} stichtag 
 * @returns {number} Verzugstage (>= 0)
 */
export function calculateVerzugstage(faelligAm, stichtag = new Date()) {
  if (!faelligAm) return 0;
  
  const due = new Date(faelligAm);
  due.setHours(0, 0, 0, 0);
  
  const target = new Date(stichtag);
  target.setHours(0, 0, 0, 0);
  
  const diffTime = target.getTime() - due.getTime();
  if (diffTime <= 0) return 0;
  
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Berechnet den gesetzlichen Verzugszins nach Art. 104 Abs. 1 OR.
 * Schweizer Usance: Kaufmännische Zinsmethode (30/360) oder taggenau bezogen auf 360 Tage im Jahr.
 * Formel: (Restbetrag * Zinssatz * Verzugstage) / 360
 * 
 * @param {number} restbetrag - Noch offener Rechnungsbetrag
 * @param {number} verzugstage - Anzahl Verzugstage seit Fälligkeit
 * @param {number} zinssatz - Zinssatz p.a. (Standard: 0.05 für 5%)
 * @returns {number} Zinsbetrag gerundet auf 5 Rappen
 */
export function calculateVerzugszins(restbetrag, verzugstage, zinssatz = 0.05) {
  const netto = parseFloat(restbetrag) || 0;
  const tage = parseInt(verzugstage, 10) || 0;
  const zins = parseFloat(zinssatz) || 0.05;

  if (netto <= 0 || tage <= 0 || zins <= 0) {
    return 0;
  }

  const rawInterest = (netto * zins * tage) / 360;
  return roundToFiveRappen(rawInterest);
}

/**
 * Berechnet die Gesamtsumme einer Mahnung.
 * Gesamtforderung = Restbetrag (Hauptforderung) + Mahnspesen + Verzugszins
 * 
 * @param {Object} params 
 * @param {number} params.restbetrag
 * @param {number} params.spesen
 * @param {number} params.verzugszins
 * @returns {number} Gesamtforderung
 */
export function calculateMahnungTotal({ restbetrag = 0, spesen = 0, verzugszins = 0 }) {
  const total = (parseFloat(restbetrag) || 0) + (parseFloat(spesen) || 0) + (parseFloat(verzugszins) || 0);
  return roundToFiveRappen(total);
}

/**
 * Ermittelt den automatischen Mahnvorschlag für eine Rechnung.
 * 
 * @param {Object} rechnung - Rechnungs-Objekt
 * @param {Date} [currentDate=new Date()]
 * @returns {Object} Empfehlung mit naechsteStufe, verzugstage, vorschlagText, zins, spesen, isActionNeeded
 */
export function getMahnVorschlag(rechnung, currentDate = new Date()) {
  if (!rechnung) {
    return { status: 'ungueltig', isActionNeeded: false, empfehlung: 'Keine Rechnungsdaten vorhanden' };
  }

  // 1. Bereits erledigte oder geschützte Zustände
  if (rechnung.status === 'Bezahlt' || rechnung.status === 'Storniert') {
    return {
      status: 'erledigt',
      isActionNeeded: false,
      empfehlung: 'Rechnung ist ausgeglichen oder storniert.'
    };
  }

  // 2. Mahnstopp aktiv?
  if (rechnung.daten?.mahnstopp) {
    return {
      status: 'mahnstopp',
      isActionNeeded: false,
      mahnstoppGrund: rechnung.daten.mahnstopp_grund || 'Mahnstopp manuell aktiviert',
      mahnstoppDatum: rechnung.daten.mahnstopp_datum || null,
      empfehlung: `Mahnstopp aktiv (${rechnung.daten.mahnstopp_grund || 'Begründung siehe Notiz'}).`
    };
  }

  const total = parseFloat(rechnung.total || 0);
  const bezahlt = parseFloat(rechnung.bezahlt || 0);
  const restbetrag = Math.max(0, total - bezahlt);

  if (restbetrag <= 0.05) {
    return {
      status: 'erledigt',
      isActionNeeded: false,
      empfehlung: 'Rechnung ist vollständig bezahlt.'
    };
  }

  const verzugstage = calculateVerzugstage(rechnung.faellig_am, currentDate);
  const aktuelleMahnstufe = parseInt(rechnung.daten?.mahnstufe || 0, 10);
  const mahnhistorie = Array.isArray(rechnung.daten?.mahnungen) ? rechnung.daten.mahnungen : [];
  const letzteMahnung = mahnhistorie.length > 0 ? mahnhistorie[mahnhistorie.length - 1] : null;

  // Tage seit der letzten Mahnung
  let tageSeitLetzterMahnung = 0;
  if (letzteMahnung && letzteMahnung.datum) {
    const lastDate = new Date(letzteMahnung.datum);
    lastDate.setHours(0, 0, 0, 0);
    const curr = new Date(currentDate);
    curr.setHours(0, 0, 0, 0);
    tageSeitLetzterMahnung = Math.max(0, Math.floor((curr.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)));
  }

  // Wenn noch gar nicht fällig
  if (verzugstage <= 0 && aktuelleMahnstufe === 0) {
    return {
      status: 'im_plan',
      isActionNeeded: false,
      verzugstage: 0,
      empfehlung: 'Zahlungsfrist läuft noch.'
    };
  }

  // Nächste Stufe ermitteln
  let naechsteStufe = 1;
  let isReadyForNext = false;
  let spesen = 0;
  let zins = 0;
  let warnung = '';

  if (aktuelleMahnstufe === 0) {
    // Noch keine Mahnung -> Stufe 1 fällig
    naechsteStufe = 1;
    isReadyForNext = true;
    spesen = DEFAULT_MAHNSTUFEN[1].spesen;
  } else if (aktuelleMahnstufe === 1) {
    naechsteStufe = 2;
    // Wenn seit der 1. Mahnung mindestens 10 Tage vergangen sind (oder Nachfrist abgelaufen)
    const fristVorher = letzteMahnung?.fristTage || 10;
    isReadyForNext = tageSeitLetzterMahnung >= fristVorher;
    spesen = DEFAULT_MAHNSTUFEN[2].spesen;
    if (!isReadyForNext) {
      warnung = `Nachfrist von Stufe 1 läuft noch (${fristVorher - tageSeitLetzterMahnung} Tage verbleibend).`;
    }
  } else if (aktuelleMahnstufe === 2) {
    naechsteStufe = 3;
    const fristVorher = letzteMahnung?.fristTage || 10;
    isReadyForNext = tageSeitLetzterMahnung >= fristVorher;
    spesen = DEFAULT_MAHNSTUFEN[3].spesen;
    zins = calculateVerzugszins(restbetrag, verzugstage, 0.05);
    if (!isReadyForNext) {
      warnung = `Nachfrist von Stufe 2 läuft noch (${fristVorher - tageSeitLetzterMahnung} Tage verbleibend).`;
    }
  } else {
    // Bereits Stufe 3 erreicht -> Betreibungsbegehren prüfen
    const fristVorher = letzteMahnung?.fristTage || 5;
    const betreibungBereit = tageSeitLetzterMahnung >= fristVorher;
    zins = calculateVerzugszins(restbetrag, verzugstage, 0.05);
    return {
      status: 'betreibung_bereit',
      isActionNeeded: betreibungBereit,
      aktuelleMahnstufe: 3,
      naechsteStufe: 'betreibung',
      verzugstage,
      tageSeitLetzterMahnung,
      restbetrag,
      spesen: DEFAULT_MAHNSTUFEN[3].spesen,
      verzugszins: zins,
      empfehlung: betreibungBereit 
        ? 'Letzte Mahnfrist abgelaufen. Betreibungsbegehren (Art. 67 SchKG) kann eingeleitet werden.'
        : `Letzte Mahnfrist läuft noch (${fristVorher - tageSeitLetzterMahnung} Tage verbleibend bis zur Betreibung).`
    };
  }

  const stufenConfig = DEFAULT_MAHNSTUFEN[naechsteStufe];
  if (stufenConfig.zinsAktiv) {
    zins = calculateVerzugszins(restbetrag, verzugstage, 0.05);
  }

  return {
    status: isReadyForNext ? 'mahnung_faellig' : 'mahnfrist_laeuft',
    isActionNeeded: isReadyForNext,
    aktuelleMahnstufe,
    naechsteStufe,
    verzugstage,
    tageSeitLetzterMahnung,
    restbetrag,
    spesen,
    verzugszins: zins,
    warnung,
    empfehlung: isReadyForNext
      ? `${stufenConfig.name} fällig (seit ${verzugstage} Tagen überfällig).`
      : warnung || `Mahnfrist für Stufe ${aktuelleMahnstufe} läuft noch.`
  };
}

/**
 * Erzeugt rechtssichere Schweizer Standard-Mahntexte mit Platzhaltern.
 * 
 * @param {number} stufe - 1, 2 oder 3
 * @param {Object} options
 * @param {Object} options.rechnung
 * @param {Object} options.kunde
 * @param {Object} options.settings
 * @param {string} options.fristDatumStr
 * @param {number} options.restbetrag
 * @param {number} options.spesen
 * @param {number} options.verzugszins
 * @param {number} options.gesamtforderung
 * @returns {Object} { betreff, einleitung, aufstellungTitel, mahnhinweis, schlussformel }
 */
export function generateMahntext(stufe, {
  rechnung = {},
  kunde = {},
  settings = {},
  fristDatumStr = '',
  restbetrag = 0,
  spesen = 0,
  verzugszins = 0,
  gesamtforderung = 0
}) {
  const docNr = rechnung.rechnung_nr || `RE-${rechnung.id || ''}`;
  const rechnungsDatumStr = rechnung.rechnungsdatum 
    ? new Date(rechnung.rechnungsdatum).toLocaleDateString('de-CH') 
    : '';
  const faelligDatumStr = rechnung.faellig_am 
    ? new Date(rechnung.faellig_am).toLocaleDateString('de-CH') 
    : '';

  const anrede = kunde.geschlecht === 'w' 
    ? `Sehr geehrte Frau ${kunde.nachname || ''}`.trim()
    : kunde.geschlecht === 'm'
      ? `Sehr geehrter Herr ${kunde.nachname || ''}`.trim()
      : kunde.firmenname 
        ? `Sehr geehrte Damen und Herren`
        : `Sehr geehrte Kundin, sehr geehrter Kunde`;

  const firmenname = settings.firmenname || 'Handwerksbetrieb';

  if (stufe === 1) {
    return {
      titel: 'Freundliche Zahlungserinnerung',
      betreff: `Zahlungserinnerung zu Rechnung ${docNr}`,
      einleitung: `${anrede}\n\nBei der Durchsicht unserer Buchhaltung haben wir festgestellt, dass für die oben genannte Rechnung vom ${rechnungsDatumStr} (fällig gewesen am ${faelligDatumStr}) bisher kein Zahlungseingang verbucht werden konnte.\n\nSicherlich handelt es sich hierbei lediglich um ein Versehen. Wir bitten Sie höflich, den offenen Betrag bis zum ${fristDatumStr} auf unser unten aufgeführtes Bankkonto zu überweisen.`,
      mahnhinweis: 'Sollte sich Ihre Zahlung mit diesem Schreiben gekreuzt haben, betrachten Sie diese Erinnerung bitte als gegenstandslos.',
      schlussformel: `Wir danken Ihnen für Ihr Vertrauen und die gute Zusammenarbeit.\n\nFreundliche Grüsse\n${firmenname}`
    };
  }

  if (stufe === 2) {
    return {
      titel: '1. Mahnung',
      betreff: `1. Mahnung zu Rechnung ${docNr}`,
      einleitung: `${anrede}\n\nTrotz unserer vorangegangenen Zahlungserinnerung konnten wir für die Rechnung ${docNr} vom ${rechnungsDatumStr} bis heute keinen vollständigen Zahlungseingang feststellen.\n\nWir fordern Sie hiermit auf, den ausstehenden Betrag zuzüglich der angefallenen Mahnspesen von CHF ${spesen.toFixed(2)} bis spätestens ${fristDatumStr} auf unser Bankkonto zu überweisen.`,
      mahnhinweis: 'Bitte beachten Sie, dass bei weiterem Zahlungsverzug zusätzliche Gebühren sowie der gesetzliche Verzugszins nach Art. 104 OR geltend gemacht werden müssen.',
      schlussformel: `Bitte benachrichtigen Sie uns umgehend, falls Sie Fragen zur Rechnung haben.\n\nFreundliche Grüsse\n${firmenname}`
    };
  }

  // Stufe 3 (Letzte Mahnung vor Betreibung)
  return {
    titel: '2. und letzte Mahnung vor Einleitung der Betreibung',
    betreff: `LETZTE MAHNUNG vor Betreibung zu Rechnung ${docNr}`,
    einleitung: `${anrede}\n\nTrotz mehrfacher Mahnungen ist die Forderung aus der Rechnung ${docNr} vom ${rechnungsDatumStr} noch immer nicht beglichen worden.\n\nWir setzen Ihnen hiermit eine letzte Zahlungsfrist bis zum:\n👉 ${fristDatumStr} (Verfalltag nach Art. 102 OR)\n\nzur Begleichung des offenen Gesamtbetrags inklusive Mahnspesen und gesetzlichem Verzugszins (Art. 104 OR).`,
    mahnhinweis: `⚠️ WICHTIGER RECHTSHINWEIS:\nSollte die Zahlung bis zum genannten Datum nicht bei uns eingegangen sein, werden wir ohne weitere Vorankündigung das offizielle BETREIBUNGSBEGEHREN beim zuständigen Betreibungsamt nach Art. 67 SchKG einreichen. Sämtliche daraus entstehenden Betreibungskosten, amtlichen Gebühren und Verzugszinsen gehen vollumfänglich zu Ihren Lasten.`,
    schlussformel: `Nutzen Sie diese letzte Gelegenheit zur gütlichen Einigung und Vermeidung eines Betreibungsverfahrens.\n\nMit förmlichem Gruss\n${firmenname}`
  };
}

/**
 * Erzeugt die standardisierten Daten für das Schweizer Betreibungsbegehren (Art. 67 SchKG).
 * Bereit zur Übergabe an das kantonale Betreibungsamt oder als Dossier-Export.
 * 
 * @param {Object} params
 * @param {Object} params.rechnung
 * @param {Object} params.kunde
 * @param {Object} params.settings
 * @returns {Object} SchKG Betreibungsbegehren Datenblatt
 */
export function generateBetreibungsbegehrenData({ rechnung, kunde, settings }) {
  const total = parseFloat(rechnung?.total || 0);
  const bezahlt = parseFloat(rechnung?.bezahlt || 0);
  const restforderung = Math.max(0, total - bezahlt);
  
  const faelligAm = rechnung?.faellig_am || rechnung?.rechnungsdatum || new Date().toISOString().split('T')[0];
  const zinsBeginn = faelligAm; // Nach Art. 102 Abs. 2 OR Verzug ab Verfalltag
  
  const mahnhistorie = Array.isArray(rechnung?.daten?.mahnungen) ? rechnung.daten.mahnungen : [];
  const totalSpesen = mahnhistorie.reduce((sum, m) => sum + (parseFloat(m.spesen) || 0), 0);
  
  const docNr = rechnung?.rechnung_nr || `RE-${rechnung?.id || ''}`;
  const rechnungsDatum = rechnung?.rechnungsdatum || '';

  return {
    art: 'Betreibungsbegehren nach Art. 67 SchKG',
    glaeubiger: {
      name: settings?.firmenname || '',
      rechtsform: settings?.rechtsform || '',
      strasse: settings?.strasse || '',
      plz: settings?.plz || (settings?.plz_ort || '').split(' ')[0] || '',
      ort: settings?.ort || (settings?.plz_ort || '').split(' ').slice(1).join(' ') || '',
      iban: settings?.qr_iban || settings?.bankverbindung || settings?.firma_iban || '',
      vertretenDurch: settings?.geschaeftsfuehrer || settings?.kontaktperson || ''
    },
    schuldner: {
      name: kunde?.firmenname || `${kunde?.vorname || ''} ${kunde?.nachname || ''}`.trim() || kunde?.name || '',
      strasse: kunde?.strasse || '',
      plz: kunde?.plz || (kunde?.plz_ort || '').split(' ')[0] || '',
      ort: kunde?.ort || (kunde?.plz_ort || '').split(' ').slice(1).join(' ') || '',
      land: kunde?.land || 'Schweiz',
      telefon: kunde?.telefon || kunde?.mobile || '',
      email: kunde?.email || ''
    },
    forderung: {
      ursprungstotal: total,
      bereitsBezahlt: bezahlt,
      grundforderung: roundToFiveRappen(restforderung),
      waehrung: 'CHF',
      zins: {
        satz: 5.0, // Art. 104 Abs. 1 OR
        zinsbeginn: zinsBeginn,
        hinweis: '5% Verzugszins seit Fälligkeitstag nach Art. 104 OR'
      },
      mahnspesen: roundToFiveRappen(totalSpesen),
      forderungsgrund: `Forderung aus Handwerkerleistungen / Werkvertrag gemäss Rechnung ${docNr} vom ${rechnungsDatum}. Mahnungen blieben erfolglos.`
    },
    anhangBelege: [
      `Originalrechnung ${docNr}`,
      ...mahnhistorie.map((m, idx) => `${m.titel || 'Mahnung Stufe ' + m.stufe} vom ${m.datum || ''}`)
    ]
  };
}
