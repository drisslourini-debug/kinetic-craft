/**
 * Centralized calculation utilities for document totals (Offerten & Rechnungen).
 * Used across DetailViews, PrintViews, WordGenerators, and the RechnungenWizard.
 */
export { calculateSia118Schlussrechnung, roundToFiveRappen, calculateGarantieFreigabeDatum } from './sia118Helper'

/**
 * Calculates the line-item total for a single position.
 * @param {Object} pos - Position with menge and einzelpreis
 * @returns {number} The total for this position
 */
export function calculatePositionTotal(pos) {
  return (parseFloat(pos.menge) || 0) * (parseFloat(pos.einzelpreis) || 0)
}

/**
 * Calculates all document totals from a list of positions and conditions.
 * Handles optional items, discounts, VAT, and flat-rate (Pauschalpreis) override.
 *
 * @param {Array} leistungen - Array of position objects with { menge, einzelpreis, optional? }
 * @param {Object} konditionen - Object with { rabatt: number, mwst: number }
 * @param {number|string|null} pauschalpreis - Optional flat-rate override price
 * @returns {{
 *   rawTotal: number,
 *   optionenTotal: number,
 *   rabattBetrag: number,
 *   totalNachRabatt: number,
 *   mwstBetrag: number,
 *   finalTotal: number,
 *   isPauschal: boolean
 * }}
 */
export function calculateDocumentTotals(leistungen, konditionen, pauschalpreis = null) {
  const rabatt = parseFloat(konditionen?.rabatt || 0)
  const mwst = parseFloat(konditionen?.mwst || 0)

  const rawTotal = leistungen
    .filter(p => !p.optional)
    .reduce((sum, pos) => sum + calculatePositionTotal(pos), 0)

  const optionenTotal = leistungen
    .filter(p => p.optional)
    .reduce((sum, pos) => sum + calculatePositionTotal(pos), 0)

  const rabattBetrag = rawTotal * (rabatt / 100)
  const totalNachRabatt = rawTotal - rabattBetrag
  
  // MWST should ideally be accurate to 2 decimals
  const mwstBetrag = Math.round(totalNachRabatt * (mwst / 100) * 100) / 100

  const parsedPauschal = parseFloat(pauschalpreis || 0)
  const isPauschal = parsedPauschal > 0

  let finalTotal = isPauschal ? parsedPauschal : totalNachRabatt + mwstBetrag
  
  // Schweizer 5-Rappen-Rundung für den Endbetrag
  finalTotal = Math.round(finalTotal * 20) / 20

  return {
    rawTotal,
    optionenTotal,
    rabattBetrag,
    totalNachRabatt,
    mwstBetrag,
    finalTotal,
    isPauschal
  }
}

/**
 * Recalculates position numbers (e.g. 1.0, 1.1, 1.2, 2.0, 2.1)
 * based on the title/position structure of the list.
 */
export function recalculatePositions(items) {
  let titleCounter = 0;
  let posCounter = 0;
  return items.map(item => {
    if (item.type === 'title') {
      titleCounter++;
      posCounter = 0;
      return { ...item, posNr: `${titleCounter}.0` };
    } else {
      posCounter++;
      const prefix = titleCounter > 0 ? titleCounter : 1;
      return { ...item, posNr: `${prefix}.${posCounter}` };
    }
  });
}
