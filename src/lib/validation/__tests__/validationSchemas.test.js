import { describe, it, expect } from 'vitest'
import {
  passwordSchema,
  calculatePasswordStrength,
  registrationStep1Schema,
  registrationStep2Schema,
  registrationStep3Schema,
  validateWithSchema,
} from '../authSchemas'
import { normalizeSwissPhone, isValidSwissPhone } from '../phoneValidation'
import { normalizeSwissUid, isValidSwissUid } from '../uidValidation'

describe('Password Security & Validation', () => {
  it('rejects passwords shorter than 12 characters (B2B Financial Standard)', () => {
    const shortResult = validateWithSchema(passwordSchema, 'Short123!')
    expect(shortResult.isValid).toBe(false)
    expect(shortResult.errorMessage).toMatch(/mindestens 12 zeichen/i)
  })

  it('accepts compliant passwords with 12 or more characters and complexity', () => {
    const validResult = validateWithSchema(passwordSchema, 'SicherPasswort2026!')
    expect(validResult.isValid).toBe(true)
    expect(validResult.data).toBe('SicherPasswort2026!')
  })

  it('accurately calculates password strength score', () => {
    expect(calculatePasswordStrength('weak').score).toBeLessThanOrEqual(1)
    expect(calculatePasswordStrength('MediumPassword12').score).toBeGreaterThanOrEqual(2)
    expect(calculatePasswordStrength('SuperStrongSecret!2026#CHF').score).toBe(4)
  })
})

describe('Swiss Phone Number Normalization', () => {
  it('normalizes local Swiss phone format to standard Swiss representation', () => {
    const res = normalizeSwissPhone('079 123 45 67')
    expect(res.isValid).toBe(true)
    expect(res.formatted).toBe('+41 79 123 45 67')
    expect(res.national).toBe('079 123 45 67')
    expect(res.international).toBe('+41791234567')
  })

  it('normalizes Swiss numbers without spaces', () => {
    const res = normalizeSwissPhone('0441234567')
    expect(res.isValid).toBe(true)
    expect(res.formatted).toBe('+41 44 123 45 67')
  })

  it('handles already international formatted Swiss numbers', () => {
    const res = normalizeSwissPhone('+41791234567')
    expect(res.isValid).toBe(true)
    expect(res.formatted).toBe('+41 79 123 45 67')
  })

  it('validates Swiss numbers correctly', () => {
    expect(isValidSwissPhone('079 123 45 67')).toBe(true)
    expect(isValidSwissPhone('')).toBe(true) // optional phone
    expect(isValidSwissPhone('12345')).toBe(false)
  })
})

describe('Swiss Enterprise UID Normalization', () => {
  it('normalizes compact numbers into CHE-xxx.xxx.xxx format', () => {
    expect(normalizeSwissUid('CHE123456789').formatted).toBe('CHE-123.456.789')
    expect(normalizeSwissUid('123.456.789').formatted).toBe('CHE-123.456.789')
    expect(normalizeSwissUid('123456789').formatted).toBe('CHE-123.456.789')
  })

  it('preserves valid already formatted CHE UID', () => {
    expect(normalizeSwissUid('CHE-123.456.789').formatted).toBe('CHE-123.456.789')
    expect(normalizeSwissUid('CHE-123.456.789 MWST').formatted).toBe('CHE-123.456.789 MWST')
  })

  it('validates Swiss UID format', () => {
    expect(isValidSwissUid('CHE-123.456.789')).toBe(true)
    expect(isValidSwissUid('')).toBe(true) // optional UID
    expect(isValidSwissUid('CHE-123.45')).toBe(false)
  })
})

describe('Registration Step Schemas', () => {
  it('validates step 1 with all valid fields', () => {
    const validData = {
      fullName: 'Beat Muster',
      email: 'handwerker@betrieb.ch',
      password: 'SicheresPasswort2026!',
    }
    const result = validateWithSchema(registrationStep1Schema, validData)
    expect(result.isValid).toBe(true)
    expect(result.data.email).toBe('handwerker@betrieb.ch')
  })

  it('fails step 1 when email is invalid', () => {
    const invalidData = {
      fullName: 'Beat Muster',
      email: 'invalid-email',
      password: 'SicheresPasswort2026!',
    }
    const result = validateWithSchema(registrationStep1Schema, invalidData)
    expect(result.isValid).toBe(false)
    expect(result.errorMessage).toMatch(/e-mail/i)
  })

  it('validates step 2 company data with valid Swiss canton', () => {
    const validData = {
      firmenname: 'Maler Meister GmbH',
      ort: 'Zürich',
      kanton: 'ZH',
      strasse: 'Bahnhofstrasse 10',
      plz: '8001',
      telefon: '079 123 45 67',
      uid: 'CHE-123.456.789',
      gewerk: 'maler',
    }
    const result = validateWithSchema(registrationStep2Schema, validData)
    expect(result.isValid).toBe(true)
    expect(result.data.firmenname).toBe('Maler Meister GmbH')
  })

  it('rejects step 2 when mandatory company name is missing', () => {
    const invalidData = {
      firmenname: 'A',
      ort: 'Zürich',
      kanton: 'ZH',
      gewerk: 'maler',
    }
    const result = validateWithSchema(registrationStep2Schema, invalidData)
    expect(result.isValid).toBe(false)
    expect(result.errorMessage).toMatch(/firmen/i)
  })

  it('validates step 3 terms agreement', () => {
    const validStep3 = validateWithSchema(registrationStep3Schema, { acceptTerms: true })
    expect(validStep3.isValid).toBe(true)

    const invalidStep3 = validateWithSchema(registrationStep3Schema, { acceptTerms: false })
    expect(invalidStep3.isValid).toBe(false)
    expect(invalidStep3.errorMessage).toMatch(/datenschutz/i)
  })
})
