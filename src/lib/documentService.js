/**
 * Centralized document service for generating document numbers and 
 * calculating payment terms across the Atelier 77 Dashboard.
 */

/**
 * Generates the next sequential invoice number in format RE-YYYY-NNN.
 * Queries existing invoices for the current year and increments.
 * 
 * @param {Object} supabase - Supabase client instance
 * @param {number} [startnummer] - Optional starting number (from settings)
 * @returns {Promise<string>} Next invoice number (e.g. "RE-2026-001")
 */
export async function generateNextRechnungNr(supabase, startnummer = null) {
  const year = new Date().getFullYear()
  const { data: existing } = await supabase
    .from('rechnungen')
    .select('rechnung_nr')
    .ilike('rechnung_nr', `RE-${year}-%`)
    .order('rechnung_nr', { ascending: false })
    .limit(1)

  let nextNum = startnummer || 1
  if (existing && existing.length > 0) {
    const parts = existing[0].rechnung_nr.split('-')
    const lastNum = parseInt(parts[2]) || 0
    nextNum = Math.max(nextNum, lastNum + 1)
  }

  return `RE-${year}-${String(nextNum).padStart(3, '0')}`
}

/**
 * Parses a customer's payment term string and returns the number of days.
 * Handles common Swiss German payment term formats.
 * 
 * @param {string|null} zahlungsziel - Payment term string (e.g. "30 Tage Netto", "10 Tage", "Bar/Vorauszahlung")
 * @param {number} [fallback=30] - Default days if no match found
 * @returns {number} Payment term in days
 */
export function parseZahlungsfrist(zahlungsziel, fallback = 30) {
  if (!zahlungsziel) return fallback

  if (zahlungsziel.includes('Bar') || zahlungsziel.includes('Voraus')) return 0
  if (zahlungsziel.includes('10')) return 10
  if (zahlungsziel.includes('14')) return 14
  if (zahlungsziel.includes('30')) return 30
  if (zahlungsziel.includes('60')) return 60

  return fallback
}

/**
 * Calculates a due date based on a start date and payment term in days.
 * 
 * @param {Date|string} startDate - Invoice date
 * @param {number} fristTage - Payment term in days
 * @returns {string} Due date as ISO date string (YYYY-MM-DD)
 */
export function calculateDueDate(startDate, fristTage) {
  const date = new Date(startDate)
  date.setDate(date.getDate() + fristTage)
  return date.toISOString().split('T')[0]
}
