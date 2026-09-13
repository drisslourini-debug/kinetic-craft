import { describe, it, expect } from 'vitest'
import {
  extractCustomerNumberDigits,
  generateNextCustomerNumber,
  formatAnredeSalutation,
  formatFullAddress,
  ANREDE_OPTIONS
} from '../customerNaming'

describe('customerNaming helper', () => {
  it('extracts digits correctly', () => {
    expect(extractCustomerNumberDigits('K-1001')).toBe(1001)
    expect(extractCustomerNumberDigits('KD-9999')).toBe(9999)
    expect(extractCustomerNumberDigits('1050')).toBe(1050)
    expect(extractCustomerNumberDigits('')).toBeNull()
    expect(extractCustomerNumberDigits(null)).toBeNull()
  })

  it('generates start number when no existing customers', () => {
    expect(generateNextCustomerNumber({ prefix: 'K-', startNumber: 1000, existingCustomers: [] }))
      .toBe('K-1000')
  })

  it('increments highest number found among customers', () => {
    const customers = [
      { kundennummer: 'K-1000' },
      { kundennummer: 'K-1005' },
      { kundennummer: 'K-1002' }
    ]
    expect(generateNextCustomerNumber({ prefix: 'K-', startNumber: 1000, existingCustomers: customers }))
      .toBe('K-1006')
  })

  it('respects startNumber if existing max is smaller', () => {
    const customers = [
      { kundennummer: 'K-50' }
    ]
    expect(generateNextCustomerNumber({ prefix: 'K-', startNumber: 1000, existingCustomers: customers }))
      .toBe('K-1000')
  })

  it('formats formal salutations correctly', () => {
    expect(formatAnredeSalutation({ anrede: 'Herr', nachname: 'Müller' }))
      .toBe('Sehr geehrter Herr Müller')
    expect(formatAnredeSalutation({ anrede: 'Frau', nachname: 'Meier' }))
      .toBe('Sehr geehrte Frau Meier')
    expect(formatAnredeSalutation({ anrede: 'Firma', firmenname: 'Holzbau AG' }))
      .toBe('Sehr geehrte Damen und Herren')
    expect(formatAnredeSalutation({ anrede: 'Diverse', nachname: 'Schmidt' }))
      .toBe('Guten Tag Schmidt')
  })

  it('formats full address cleanly', () => {
    expect(formatFullAddress({ strasse: 'Musterweg 1', plz: '3000', ort: 'Bern', land: 'Schweiz' }))
      .toBe('Musterweg 1, 3000 Bern')
    expect(formatFullAddress({ strasse: 'Grenzweg 5', plz: '79100', ort: 'Freiburg', land: 'Deutschland' }))
      .toBe('Grenzweg 5, 79100 Freiburg, Deutschland')
  })
})
