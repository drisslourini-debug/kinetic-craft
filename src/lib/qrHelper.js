/**
 * Helper functions for Swiss QR-Bill logic.
 */

/**
 * Checks if the given IBAN is a QR-IBAN.
 * A QR-IBAN in Switzerland has an IID (Institution Identification)
 * between 30000 and 31999 at positions 5 to 9.
 * @param {string} iban 
 * @returns {boolean}
 */
export function isQrIban(iban) {
  if (!iban) return false
  const cleanIban = iban.replace(/\s+/g, '').toUpperCase()
  if (!cleanIban.startsWith('CH') && !cleanIban.startsWith('LI')) return false
  if (cleanIban.length !== 21) return false
  
  const iid = parseInt(cleanIban.substring(4, 9), 10)
  return iid >= 30000 && iid <= 31999
}

/**
 * Calculates the Modulo 10 recursive checksum for a given numeric string.
 * @param {string} numberStr 
 * @returns {string} The checksum digit (0-9)
 */
export function calculateModulo10Recursive(numberStr) {
  const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5]
  let carry = 0
  
  for (let i = 0; i < numberStr.length; i++) {
    const digit = parseInt(numberStr.charAt(i), 10)
    carry = table[(carry + digit) % 10]
  }
  
  return ((10 - carry) % 10).toString()
}

/**
 * Generates a valid 27-digit QR Reference based on a customer ID and invoice ID.
 * Format: 26 digits padded with zeros + 1 check digit.
 * @param {string|number} kundenId 
 * @param {string|number} rechnungId 
 * @returns {string} 27-digit QR Reference
 */
export function generateQrReference(kundenId, rechnungId) {
  // Convert to strings and remove non-numeric chars
  const kIdStr = String(kundenId).replace(/\D/g, '') || '0'
  const rIdStr = String(rechnungId).replace(/\D/g, '') || '0'
  
  // Format: e.g. Customer ID (10 digits) + Invoice ID (16 digits)
  // But just zero-padding up to 26 digits is standard practice for simple systems
  const combined = kIdStr + rIdStr
  const padded = combined.padStart(26, '0')
  
  const checksum = calculateModulo10Recursive(padded)
  return padded + checksum
}
