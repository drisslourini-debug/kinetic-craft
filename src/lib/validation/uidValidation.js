import { z } from 'zod'

/**
 * Normalizes and validates a Swiss Unternehmens-Identifikationsnummer (UID)
 * Format: CHE-123.456.789 or CHE-123.456.789 MWST
 * 
 * @param {string} rawUid 
 * @returns {{ isValid: boolean, formatted: string }}
 */
export function normalizeSwissUid(rawUid) {
  if (!rawUid || typeof rawUid !== 'string') {
    return { isValid: false, formatted: '' }
  }

  const cleaned = rawUid.trim().toUpperCase()
  if (!cleaned) {
    return { isValid: false, formatted: '' }
  }

  // Matches CHE-xxx.xxx.xxx, 123.456.789, CHExxxxxxxxx, or 123456789 (with optional MWST suffix)
  const uidRegex = /^(CHE[- ]?)?([0-9]{3})[\.\- ]?([0-9]{3})[\.\- ]?([0-9]{3})( ?(MWST|TVA|IVA|HR))?$/i
  const match = cleaned.match(uidRegex)

  if (!match) {
    return { isValid: false, formatted: cleaned }
  }

  const part1 = match[2]
  const part2 = match[3]
  const part3 = match[4]
  const suffix = match[6] ? ` ${match[6].toUpperCase()}` : ''

  const formatted = `CHE-${part1}.${part2}.${part3}${suffix}`
  return {
    isValid: true,
    formatted,
  }
}

/**
 * Optional Swiss UID Zod Schema
 */
export const swissUidSchema = z.string().optional().refine((val) => {
  if (!val || val.trim() === '') return true
  return normalizeSwissUid(val).isValid
}, {
  message: 'Ungültiges Schweizer UID-Format. Erwartet: CHE-123.456.789 (optional mit MWST-Zusatz).',
})

/**
 * Helper to check if a string is a valid Swiss UID (or empty)
 */
export function isValidSwissUid(uid) {
  if (!uid || typeof uid !== 'string' || !uid.trim()) return true
  return normalizeSwissUid(uid).isValid
}

