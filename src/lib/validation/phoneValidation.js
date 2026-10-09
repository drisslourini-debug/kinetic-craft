import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { z } from 'zod'

/**
 * Normalizes and formats a Swiss or international phone number.
 * Default country is Switzerland ('CH').
 * 
 * @param {string} phoneRaw 
 * @returns {{ isValid: boolean, formatted: string, international: string, national: string, error?: string }}
 */
export function normalizeSwissPhone(phoneRaw) {
  if (!phoneRaw || typeof phoneRaw !== 'string') {
    return { isValid: false, formatted: '', international: '', national: '', error: 'Keine Telefonnummer angegeben' }
  }

  const cleaned = phoneRaw.trim()
  if (!cleaned) {
    return { isValid: false, formatted: '', international: '', national: '', error: 'Keine Telefonnummer angegeben' }
  }

  try {
    const phoneNumber = parsePhoneNumberFromString(cleaned, 'CH')
    if (phoneNumber && phoneNumber.isValid()) {
      return {
        isValid: true,
        formatted: phoneNumber.formatInternational(),
        international: phoneNumber.format('E.164'), // z. B. +41791234567
        national: phoneNumber.formatNational(), // z. B. 079 123 45 67
      }
    }
  } catch (e) {
    // Parsing error
  }

  // Fallback pattern check for standard Swiss numbers (e.g. 079 123 45 67 or +41 79 123 45 67)
  const swissDigitsOnly = cleaned.replace(/[\s\-\.\(\)\/]/g, '')
  if (/^(\+41|0041|0)[1-9][0-9]{8}$/.test(swissDigitsOnly)) {
    return {
      isValid: true,
      formatted: cleaned,
      international: swissDigitsOnly.startsWith('0') ? `+41${swissDigitsOnly.slice(1)}` : swissDigitsOnly,
      national: cleaned,
    }
  }

  return {
    isValid: false,
    formatted: cleaned,
    international: cleaned,
    national: cleaned,
    error: 'Bitte geben Sie eine gültige Telefonnummer ein (z. B. 079 123 45 67 oder +41 44 500 00 00).',
  }
}

/**
 * Zod schema for optional Swiss phone number
 */
export const swissPhoneSchema = z.string().optional().refine((val) => {
  if (!val || val.trim() === '') return true
  return normalizeSwissPhone(val).isValid
}, {
  message: 'Bitte geben Sie eine gültige Schweizer Telefonnummer ein (z. B. 079 123 45 67).',
})

/**
 * Zod schema for required Swiss phone number
 */
export const requiredSwissPhoneSchema = z.string().min(1, 'Bitte geben Sie eine Telefonnummer ein.').refine((val) => {
  return normalizeSwissPhone(val).isValid
}, {
  message: 'Bitte geben Sie eine gültige Schweizer Telefonnummer ein (z. B. 079 123 45 67).',
})

/**
 * Helper to check if a string is a valid Swiss phone number (or empty)
 */
export function isValidSwissPhone(phone) {
  if (!phone || typeof phone !== 'string' || !phone.trim()) return true
  return normalizeSwissPhone(phone).isValid
}


