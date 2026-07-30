/**
 * Centralized calculation utilities for document totals (Offerten & Rechnungen).
 * Used across DetailViews, PrintViews, WordGenerators, and the RechnungenWizard.
 */

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
  const mwstBetrag = totalNachRabatt * (mwst / 100)

  const parsedPauschal = parseFloat(pauschalpreis || 0)
  const isPauschal = parsedPauschal > 0

  const finalTotal = isPauschal ? parsedPauschal : totalNachRabatt + mwstBetrag

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
