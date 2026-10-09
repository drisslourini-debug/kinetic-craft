/**
 * Schweizer Bau-Ausmass & SIA 118 Art. 141 Berechnungs-Engine
 *
 * Regeln gemäss Schweizer Baupraxis & SIA 118 Art. 141:
 * 1. Grundformel: Anzahl × Länge × (Breite | Höhe) × Faktor.
 * 2. SIA 118 Art. 141 (Ausmassregeln für Abzüge):
 *    Öffnungen (z.B. Fenster, Türen, Aussparungen) bis und mit 2.50 m² Einzelfläche
 *    werden standardmässig "übermessen", d.h. nicht abgezogen, da der handwerkliche
 *    Mehraufwand für Laibungen und Kanten den Materialabzug kompensiert.
 *    Grössere Öffnungen (> 2.50 m²) werden in Abzug gebracht.
 *    Auf Wunsch kann eine Öffnung dennoch manuell zum Abzug gezwungen werden (forceAbzug).
 */

export const DEFAULT_SIA118_SCHWELLE = 2.50 // m² gemäss SIA 118 Art. 141

/**
 * Erstellt eine neue leere Ausmass-Zeile
 */
export function createDefaultAusmassLine(initial = {}) {
  return {
    id: `ausmass-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    bezeichnung: initial.bezeichnung || 'Wand / Fläche',
    anzahl: initial.anzahl !== undefined ? initial.anzahl : 1,
    laenge: initial.laenge !== undefined ? initial.laenge : '',
    breite: initial.breite !== undefined ? initial.breite : '',
    hoehe: initial.hoehe !== undefined ? initial.hoehe : '',
    faktor: initial.faktor !== undefined ? initial.faktor : 1,
    isAbzug: !!initial.isAbzug,
    forceAbzug: !!initial.forceAbzug,
    abzugSchwelle: initial.abzugSchwelle || DEFAULT_SIA118_SCHWELLE,
    bemerkung: initial.bemerkung || ''
  }
}

/**
 * Berechnet die Basisfläche oder das Volumen einer einzelnen Zeile
 */
export function calculateLineBaseDim(line) {
  const l = parseFloat(line.laenge) || 0
  const b = parseFloat(line.breite) || 0
  const h = parseFloat(line.hoehe) || 0

  if (l > 0 && b > 0 && h > 0) {
    // 3D Kubatur (m³)
    return { value: l * b * h, type: 'm³' }
  } else if (l > 0 && (h > 0 || b > 0)) {
    // 2D Fläche (m²)
    const secondDim = h > 0 ? h : b
    return { value: l * secondDim, type: 'm²' }
  } else if (l > 0) {
    // 1D Länge oder Stück
    return { value: l, type: 'm' }
  }
  return { value: 0, type: 'm²' }
}

/**
 * Berechnet eine einzelne Ausmass-Zeile inklusive SIA 118 Art. 141 Abzugsprüfung
 */
export function calculateAusmassLine(line, options = {}) {
  const anzahl = parseFloat(line.anzahl) || 1
  const faktor = parseFloat(line.faktor) || 1
  const schwelle = parseFloat(line.abzugSchwelle) || DEFAULT_SIA118_SCHWELLE
  const { value: baseDim, type } = calculateLineBaseDim(line)

  // Einzelfläche eines Elements (z.B. eines einzelnen Fensters)
  const singleItemArea = baseDim * faktor
  // Gesamte Bruttofläche dieser Zeile
  const rawTotal = Math.round(anzahl * singleItemArea * 1000) / 1000

  if (!line.isAbzug) {
    return {
      rawTotal,
      singleItemArea,
      effectiveValue: rawTotal,
      isAbzug: false,
      sia118Uebermessen: false,
      statusText: 'Zuschlag',
      type
    }
  }

  // Abzug-Logik nach SIA 118 Art. 141:
  // Ist die Einzelfläche <= Schwelle (2.50 m²) und nicht manuell forciert?
  const sia118Uebermessen = singleItemArea <= schwelle && !line.forceAbzug

  return {
    rawTotal,
    singleItemArea,
    effectiveValue: sia118Uebermessen ? 0 : -Math.abs(rawTotal),
    isAbzug: true,
    sia118Uebermessen,
    statusText: sia118Uebermessen 
      ? `SIA 118: Übermessen (≤ ${schwelle.toFixed(2)} m²)` 
      : line.forceAbzug 
        ? 'Manuell abgezogen' 
        : `Abgezogen (> ${schwelle.toFixed(2)} m²)`,
    type
  }
}

/**
 * Berechnet die Summen aller Ausmass-Zeilen für eine Position
 */
export function calculateAusmassTotal(lines = [], options = {}) {
  let bruttoZuschlag = 0
  let abzuegeUebermessen = 0
  let abzuegeWirksam = 0
  let dominantType = 'm²'

  lines.forEach(line => {
    const calc = calculateAusmassLine(line, options)
    if (calc.type) dominantType = calc.type

    if (!line.isAbzug) {
      bruttoZuschlag += calc.effectiveValue
    } else {
      if (calc.sia118Uebermessen) {
        abzuegeUebermessen += calc.rawTotal
      } else {
        abzuegeWirksam += Math.abs(calc.effectiveValue)
      }
    }
  })

  // Netto-Menge (nie negativ)
  const nettoMenge = Math.max(0, Math.round((bruttoZuschlag - abzuegeWirksam) * 100) / 100)

  return {
    bruttoZuschlag: Math.round(bruttoZuschlag * 100) / 100,
    abzuegeUebermessen: Math.round(abzuegeUebermessen * 100) / 100,
    abzuegeWirksam: Math.round(abzuegeWirksam * 100) / 100,
    nettoMenge,
    type: dominantType,
    lineCount: lines.length
  }
}

/**
 * Formatiert die mathematische Masskette lesbar für das Ausmassblatt
 * z.B. "2 × 4.50 × 2.60 m = 23.40 m²" oder "1 × (1.20 × 1.40 m) = 1.68 m² [SIA 118 übermessen]"
 */
export function formatAusmassMasskette(line) {
  const calc = calculateAusmassLine(line)
  const anzahl = parseFloat(line.anzahl) || 1
  const l = parseFloat(line.laenge) || 0
  const b = parseFloat(line.breite) || 0
  const h = parseFloat(line.hoehe) || 0

  let dims = []
  if (l > 0) dims.push(l.toFixed(2))
  if (b > 0) dims.push(b.toFixed(2))
  if (h > 0) dims.push(h.toFixed(2))

  const dimsStr = dims.length > 0 ? dims.join(' × ') : '0.00'
  const countStr = anzahl !== 1 ? `${anzahl} × ` : ''

  if (line.isAbzug) {
    if (calc.sia118Uebermessen) {
      return `${countStr}(${dimsStr}) = -${calc.rawTotal.toFixed(2)} ${calc.type} [SIA 118 übermessen (≤ 2.5 m²)]`
    }
    return `${countStr}(${dimsStr}) = -${Math.abs(calc.effectiveValue).toFixed(2)} ${calc.type}`
  }

  return `${countStr}${dimsStr} = ${calc.effectiveValue.toFixed(2)} ${calc.type}`
}
