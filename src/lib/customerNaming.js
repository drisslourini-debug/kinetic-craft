/**
 * Helper functions for customer numbering, salutations, and address formatting.
 */

export const ANREDE_OPTIONS = [
  'Firma',
  'Herr',
  'Frau',
  'Diverse'
]

/**
 * Extracts the integer number part from a customer number string like "K-1042" or "1042".
 */
export function extractCustomerNumberDigits(kundennummer = '') {
  if (!kundennummer) return null
  const match = String(kundennummer).match(/(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Generates the next customer number given existing customers and settings.
 */
export function generateNextCustomerNumber({
  prefix = 'K-',
  startNumber = 1000,
  existingCustomers = []
} = {}) {
  const effectiveStart = Number.isInteger(Number(startNumber)) && Number(startNumber) > 0 ? Number(startNumber) : 1000
  const effectivePrefix = prefix !== undefined && prefix !== null ? String(prefix) : 'K-'

  let maxNr = effectiveStart - 1

  if (Array.isArray(existingCustomers)) {
    for (const kunde of existingCustomers) {
      if (!kunde || !kunde.kundennummer) continue
      const nr = extractCustomerNumberDigits(kunde.kundennummer)
      if (nr !== null && nr > maxNr) {
        maxNr = nr
      }
    }
  }

  const nextNr = maxNr + 1
  return `${effectivePrefix}${nextNr}`
}

/**
 * Returns a formal German salutation text based on anrede and names.
 * Useful for Offerten, Rechnungen, and Briefverkehr.
 */
export function formatAnredeSalutation({ anrede = '', vorname = '', nachname = '', firmenname = '' } = {}) {
  const cleanNachname = (nachname || '').trim()
  const cleanAnrede = (anrede || '').trim()

  if (cleanAnrede === 'Herr' && cleanNachname) {
    return `Sehr geehrter Herr ${cleanNachname}`
  }
  if (cleanAnrede === 'Frau' && cleanNachname) {
    return `Sehr geehrte Frau ${cleanNachname}`
  }
  if (firmenname && cleanAnrede === 'Firma') {
    return 'Sehr geehrte Damen und Herren'
  }
  if (cleanNachname) {
    return `Guten Tag ${cleanNachname}`
  }
  return 'Sehr geehrte Damen und Herren'
}

/**
 * Formats a combined address string from separate components.
 */
export function formatFullAddress({ strasse = '', plz = '', ort = '', land = 'Schweiz' } = {}) {
  const parts = []
  if (strasse) parts.push(strasse)
  const plzOrt = [plz, ort].filter(Boolean).join(' ')
  if (plzOrt) parts.push(plzOrt)
  if (land && land !== 'Schweiz') parts.push(land)
  return parts.join(', ')
}
