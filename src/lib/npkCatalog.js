/**
 * Schweizer Normpositionenkatalog (CRB / NPK) Vorlagen
 * Speziell für das Schweizer Bauhaupt- und Ausbaugewerbe:
 * - 111: Baustelleneinrichtung & Allgemeine Vorarbeiten
 * - 112: Gerüste & temporäre Schutzmassnahmen
 * - 211: Baumeisterarbeiten & Mauerwerk
 * - 671: Verputze, Trockenbau & Stukkaturen
 * - 675: Maler-, Tapezierer- und Beschichtungsarbeiten
 * - 681: Bodenbeläge & Parkett
 */

export const NPK_KAPITEL = [
  {
    code: '111',
    titel: '111 Baustelleneinrichtung & Vorbereitungen',
    beschreibung: 'Baustelleneinrichtung, Schutzmassnahmen, Entsorgung und Magazinierung'
  },
  {
    code: '112',
    titel: '112 Gerüste und temporäre Schutzabdeckungen',
    beschreibung: 'Fassadengerüste, Rollgerüste, Abdeckungen und Einhausungen'
  },
  {
    code: '211',
    titel: '211 Baumeister- und Maurerarbeiten',
    beschreibung: 'Maurerarbeiten, Zementüberzüge, Risssanierungen und Ausbesserungen'
  },
  {
    code: '671',
    titel: '671 Verputze und Trockenbau',
    beschreibung: 'Grundputze, Deckputze, Weissputz, Trockenbauwände und Deckenbekleidungen'
  },
  {
    code: '675',
    titel: '675 Maler-, Tapezierer- und Beschichtungsarbeiten',
    beschreibung: 'Innen- und Aussenanstriche, Lackierarbeiten, Tapezieren und Risssanierung'
  },
  {
    code: '681',
    titel: '681 Bodenbelagsarbeiten',
    beschreibung: 'Bodenbeschichtungen, Parkett, Sockelleisten und Oberflächenversiegelung'
  }
]

export const NPK_POSITIONEN = [
  // --- 111 Baustelleneinrichtung ---
  {
    npkCode: '111.100.110',
    kapitelCode: '111',
    titel: 'Baustelleneinrichtung und Vorbereitung',
    beschreibung: 'Einrichten der Baustelle, Einrichten von Gerätemagazin und Werkzeuglager.',
    details: 'Inkl. Vorhalten von Schutzmaterial, Kleinwerkzeugen und tägliche Reinigung des Arbeitsbereichs.',
    einheit: 'Pauschale (Psch)',
    richtpreis: 350.00,
    kategorie: 'Baustelle'
  },
  {
    npkCode: '111.210.200',
    kapitelCode: '111',
    titel: 'Abdecken von Bodenbelägen (Schutzvlies)',
    beschreibung: 'Abdecken bestehender Bodenbeläge mit diffusionsoffenem, rutschhemmendem Schutzvlies.',
    details: 'Stosskanten mit geeignetem Klebeband sauber staubdicht verklebt. Inkl. Abräumen und fachgerechter Entsorgung.',
    einheit: 'Quadratmeter (m²)',
    richtpreis: 4.80,
    kategorie: 'Vorbereitung'
  },
  {
    npkCode: '111.220.150',
    kapitelCode: '111',
    titel: 'Abkleben von Fenstern, Türen und Einbauten',
    beschreibung: 'Abkleben von Bauteilen mit UV-beständigem Klebeband und Schutzfolie.',
    details: 'Schutz von Fensterelementen, Rahmen, Sockelleisten und Einbauschränken gegen Farbspritzer und Staub.',
    einheit: 'Meter (m)',
    richtpreis: 3.50,
    kategorie: 'Vorbereitung'
  },
  {
    npkCode: '111.510.100',
    kapitelCode: '111',
    titel: 'Bauschutt- und Materialentsorgung',
    beschreibung: 'Fachgerechte Entsorgung von Farb- und Putzresten, Alttapeten und Abdeckmaterial.',
    details: 'Gemäss VVEA (Verordnung über die Vermeidung und die Entsorgung von Abfällen) inkl. Transportgebühren.',
    einheit: 'Pauschale (Psch)',
    richtpreis: 240.00,
    kategorie: 'Entsorgung'
  },

  // --- 112 Gerüste ---
  {
    npkCode: '112.110.100',
    kapitelCode: '112',
    titel: 'Rollgerüst / Arbeitsbühne bis 4.00 m Arbeitshöhe',
    beschreibung: 'Bereitstellung, Auf- und Abbau sowie Vorhalten eines Aluminium-Rollgerüsts.',
    details: 'Gemäss SUVA-Sicherheitsvorschriften, inkl. Geländer, Bordbretter und Zwischenböden.',
    einheit: 'Woche (Wo)',
    richtpreis: 180.00,
    kategorie: 'Gerüst'
  },
  {
    npkCode: '112.210.300',
    kapitelCode: '112',
    titel: 'Fassadengerüst leicht (Malergerüst)',
    beschreibung: 'Fassadengerüst Lastklasse 3 (bis 200 kg/m²), inkl. Verankerung, Konsolen und Schutznetz.',
    details: 'Aufstellen, Miete für 4 Wochen, statische Verankerung und Demontage gemäss SIA 118 und SUVA.',
    einheit: 'Quadratmeter (m²)',
    richtpreis: 16.50,
    kategorie: 'Gerüst'
  },

  // --- 211 Baumeisterarbeiten ---
  {
    npkCode: '211.310.100',
    kapitelCode: '211',
    titel: 'Mauerwerk-Ausbesserungen und Ausmörtelungen',
    beschreibung: 'Lokales Ausbrechen von schadhaftem Mauerwerk und Schliessen mit Reparaturmörtel.',
    details: 'Inkl. Tiefengrundierung, Haftbrücke und planebenem Ausgleich zum Bestandsmauerwerk.',
    einheit: 'Stunde (h)',
    richtpreis: 98.00,
    kategorie: 'Maurerarbeiten'
  },

  // --- 671 Verputze und Trockenbau ---
  {
    npkCode: '671.111.100',
    kapitelCode: '671',
    titel: 'Grundputz mineralisch auf Mauerwerk (15 mm)',
    beschreibung: 'Mineralischer Grundputz auf Ziegel- oder Kalksandsteinmauerwerk maschinell oder von Hand aufgebracht.',
    details: 'Inkl. Vorbehandlung des Untergrunds, planeben abziehen und für Deckputz aufrauen.',
    einheit: 'Quadratmeter (m²)',
    richtpreis: 36.00,
    kategorie: 'Gipserarbeiten'
  },
  {
    npkCode: '671.221.200',
    kapitelCode: '671',
    titel: 'Weissputz glatt abgezogen (Q3 / Q4)',
    beschreibung: 'Gipsglattstrich (Weissputz) auf vorbereiteten Grundputz oder Betonflächen zweilagig aufziehen.',
    details: 'Fein abgezogen und filzfrei geglättet für hochwertige Malerarbeiten nach SIA 242 Oberflächengüte Q3.',
    einheit: 'Quadratmeter (m²)',
    richtpreis: 28.50,
    kategorie: 'Gipserarbeiten'
  },
  {
    npkCode: '671.311.100',
    kapitelCode: '671',
    titel: 'Abrieb mineralisch 1.5 mm (Vollabrieb/Negativabrieb)',
    beschreibung: 'Mineralischer Strukturputz Korngrösse 1.5 mm auftragen und gleichmässig rund verreiben.',
    details: 'Inkl. Grundieranstrich quarzhaltig. Farbe Naturweiss oder nach Farbtonkarte.',
    einheit: 'Quadratmeter (m²)',
    richtpreis: 24.00,
    kategorie: 'Gipserarbeiten'
  },
  {
    npkCode: '671.411.200',
    kapitelCode: '671',
    titel: 'Gipskarton-Vorsatzschale metallunterkonstruiert',
    beschreibung: 'Trockenbauwand auf Metallständerwerk (CW/UW 50), einfach beplankt mit Gipskartonplatten 12.5 mm.',
    details: 'Inkl. Mineralwoll-Dämmung 40 mm, Fugen verspachtelt und bandagiert in Qualitätsstufe Q2.',
    einheit: 'Quadratmeter (m²)',
    richtpreis: 78.00,
    kategorie: 'Trockenbau'
  },

  // --- 675 Maler-, Tapezierer- und Beschichtungsarbeiten ---
  {
    npkCode: '675.111.100',
    kapitelCode: '675',
    titel: 'Untergrund vorbereiten, reinigen und fluatieren',
    beschreibung: 'Untergrund mechanisch abbürsten, lose Altanstriche entfernen und Tiefengrund LF applizieren.',
    details: 'Staubbindend und saugfähigkeitsregulierend, Vorbereitung für Folgeanstriche gemäss SIA 257.',
    einheit: 'Quadratmeter (m²)',
    richtpreis: 6.50,
    kategorie: 'Malerarbeiten'
  },
  {
    npkCode: '675.211.200',
    kapitelCode: '675',
    titel: 'Wandanstrich Dispersion 2x deckend (Klasse 1)',
    beschreibung: 'Hochwertiger Dispersionsanstrich stumpfmatt, Nassabriebklasse 1, 2-fach gerollt auf Wände.',
    details: 'Inkl. Kantenausbildung, kleineren Spachtelausbesserungen bis 2 mm und Farbentstaubung.',
    einheit: 'Quadratmeter (m²)',
    richtpreis: 18.50,
    kategorie: 'Malerarbeiten'
  },
  {
    npkCode: '675.311.200',
    kapitelCode: '675',
    titel: 'Deckenanstrich Dispersion hochdeckend stumpfmatt',
    beschreibung: 'Deckenflächen 2-fach mit streiflichtunempfindlicher Decken-Dispersion beschichten.',
    details: 'Weiss, lösungsmittelfrei, hochdeckend. Inkl. sauberer Randbeschnitt zu angrenzenden Bauteilen.',
    einheit: 'Quadratmeter (m²)',
    richtpreis: 21.00,
    kategorie: 'Malerarbeiten'
  },
  {
    npkCode: '675.421.150',
    kapitelCode: '675',
    titel: 'Lackierung Holzwerk (Türzargen & Türen)',
    beschreibung: 'Türzargen und Türblätter beidseitig schleifen, vorlackieren und 2-fach mit PU-Acryllack seidenmatt lackieren.',
    details: 'Wasserverdünnbar, vergilbungsbeständig, inkl. Abkleben von Beschlägen und Dichtungen.',
    einheit: 'Stück (Stk)',
    richtpreis: 145.00,
    kategorie: 'Malerarbeiten'
  },
  {
    npkCode: '675.511.100',
    kapitelCode: '675',
    titel: 'Glasfasergewebe kleben und beschichten',
    beschreibung: 'Wandflächen mit Glasfasertapete (Design fein/mittel) nahtlos tapezieren und 2-fach mit Seidenglanzdispersion streichen.',
    details: 'Inkl. Glasfaserkleber, Gewebezuschnitt und stossgenauer Verlegung. Strapazierfähig und rissüberbrückend.',
    einheit: 'Quadratmeter (m²)',
    richtpreis: 34.00,
    kategorie: 'Malerarbeiten'
  },
  {
    npkCode: '675.611.300',
    kapitelCode: '675',
    titel: 'Fassadenanstrich Silikonharz 2x (Witterungsschutz)',
    beschreibung: 'Hochdiffusionsfähiger Silikonharzanstrich auf Aussenputz oder Mauerwerk, 2-fach aufgetragen.',
    details: 'Mit Filmschutz gegen Algen- und Pilzbefall, schlagregendicht gemäss DIN EN 1062, Farbton nach Wahl.',
    einheit: 'Quadratmeter (m²)',
    richtpreis: 26.50,
    kategorie: 'Fassade'
  },

  // --- 681 Bodenbelagsarbeiten ---
  {
    npkCode: '681.210.100',
    kapitelCode: '681',
    titel: 'Bodenbeschichtung 2K-Epoxidharz Garagen/Keller',
    beschreibung: '2-Komponenten Epoxidharzbeschichtung für Keller- oder Gewerbeböden, 2-lagig appliziert.',
    details: 'Inkl. mechanischer Untergrundvorbereitung (Kugelstrahlen/Schleifen), Grundierung und Versiegelung rutschhemmend R10.',
    einheit: 'Quadratmeter (m²)',
    richtpreis: 48.00,
    kategorie: 'Boden'
  },
  {
    npkCode: '681.310.200',
    kapitelCode: '681',
    titel: 'Parkettboden schleifen und versiegeln (3x Lack)',
    beschreibung: 'Bestandsparkett staubarm im 3-Stufen-Verfahren schleifen, Kitten von Fugen und 3-facher Wasserlackversiegelung.',
    details: 'Inkl. Randschliff und umweltfreundlichem 2K-Parkettlack matt/halbmatt für hohe Beanspruchung.',
    einheit: 'Quadratmeter (m²)',
    richtpreis: 55.00,
    kategorie: 'Boden'
  }
]

/**
 * Gibt alle Schweizer NPK-Kapitel zurück
 */
export function getNpkChapters() {
  return NPK_KAPITEL
}

/**
 * Holt alle NPK-Positionen eines bestimmten Kapitels (z.B. '675')
 */
export function getNpkPositionsByChapter(kapitelCode) {
  if (!kapitelCode) return NPK_POSITIONEN
  return NPK_POSITIONEN.filter(pos => pos.kapitelCode === kapitelCode)
}

/**
 * Durchsucht den NPK-Katalog nach Freitext oder NPK-Code
 */
export function searchNpkCatalog(term, kapitelCode = null) {
  let list = kapitelCode ? getNpkPositionsByChapter(kapitelCode) : NPK_POSITIONEN
  if (!term || !term.trim()) return list
  const lower = term.toLowerCase().trim()
  return list.filter(pos => 
    pos.npkCode.toLowerCase().includes(lower) ||
    pos.titel.toLowerCase().includes(lower) ||
    (pos.details && pos.details.toLowerCase().includes(lower)) ||
    (pos.beschreibung && pos.beschreibung.toLowerCase().includes(lower))
  )
}
