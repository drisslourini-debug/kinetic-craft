/**
 * Converts a signed Regierapport into invoice line items (Leistungen / Material).
 */

/**
 * Transforms hours and materials from a rapport into invoice position items.
 * 
 * @param {Object} rapport 
 * @returns {Array<{
 *   id: string,
 *   titel: string,
 *   beschreibung: string,
 *   menge: number,
 *   einheit: string,
 *   ansatz: number,
 *   total: number,
 *   typ: 'leistung'|'material'
 * }>}
 */
export function convertRapportToInvoiceItems(rapport) {
  if (!rapport) return []
  const items = []
  const rapNr = rapport.rapport_nr || 'Rapport'

  // 1. Process Stunden (Labor hours)
  const stundenList = Array.isArray(rapport.stunden) ? rapport.stunden : []
  stundenList.forEach((s, idx) => {
    const hours = parseFloat(s.stunden) || 0
    const rate = parseFloat(s.ansatz) || 0
    if (hours > 0) {
      const mitarbeiterText = s.mitarbeiter ? ` (${s.mitarbeiter})` : ''
      items.push({
        id: `rap_std_${rapport.id || 'new'}_${idx}_${Date.now()}`,
        titel: s.taetigkeit || `Regiearbeit gemäss ${rapNr}`,
        beschreibung: `Regiestunden gemäss ${rapNr}${mitarbeiterText}${s.beschreibung ? ': ' + s.beschreibung : ''}`,
        menge: hours,
        einheit: 'Std',
        ansatz: rate,
        total: Math.round(hours * rate * 100) / 100,
        typ: 'leistung'
      })
    }
  })

  // 2. Process Material
  const materialList = Array.isArray(rapport.material) ? rapport.material : []
  materialList.forEach((m, idx) => {
    const qty = parseFloat(m.menge) || 0
    const price = parseFloat(m.preis) || 0
    if (qty > 0) {
      items.push({
        id: `rap_mat_${rapport.id || 'new'}_${idx}_${Date.now()}`,
        titel: m.artikel || `Material gemäss ${rapNr}`,
        beschreibung: `Verbrauchtes Material gemäss ${rapNr}`,
        menge: qty,
        einheit: m.einheit || 'Stk',
        ansatz: price,
        total: Math.round(qty * price * 100) / 100,
        typ: 'material'
      })
    }
  })

  return items
}

/**
 * Calculates the total sum of a rapport.
 * @param {Object} rapport 
 * @returns {number}
 */
export function calculateRapportTotal(rapport) {
  if (!rapport) return 0
  const items = convertRapportToInvoiceItems(rapport)
  const sum = items.reduce((acc, curr) => acc + curr.total, 0)
  return Math.round(sum * 100) / 100
}
