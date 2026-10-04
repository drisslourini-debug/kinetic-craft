import { describe, it, expect } from 'vitest'
import { isQrIban, calculateModulo10Recursive, generateQrReference } from '../qrHelper'

describe('qrHelper', () => {
  describe('isQrIban', () => {
    it('identifies valid Swiss QR-IBAN with IID between 30000 and 31999', () => {
      expect(isQrIban('CH44 3199 9123 0008 8901 2')).toBe(true)
      expect(isQrIban('CH4430000123000889012')).toBe(true)
    })

    it('identifies non-QR regular Swiss IBAN', () => {
      expect(isQrIban('CH93 0076 2011 6238 5295 7')).toBe(false)
      expect(isQrIban('CH1209000000100000014')).toBe(false)
    })

    it('handles empty or invalid inputs', () => {
      expect(isQrIban('')).toBe(false)
      expect(isQrIban(null)).toBe(false)
      expect(isQrIban('DE89370400440532013000')).toBe(false)
    })
  })

  describe('calculateModulo10Recursive', () => {
    it('computes expected recursive modulo 10 checksum', () => {
      // 00000000000000000000000012 -> checksum digit 1
      expect(calculateModulo10Recursive('00000000000000000000000012')).toBe('1')
    })
  })

  describe('generateQrReference', () => {
    it('always generates exactly 27 numeric digits for small integer IDs', () => {
      const ref = generateQrReference(1, 2)
      expect(ref.length).toBe(27)
      expect(/^\d{27}$/.test(ref)).toBe(true)
      expect(ref).toBe('000000000000000000000000121')
    })

    it('always generates exactly 27 numeric digits for long UUID strings', () => {
      const kundenUuid = '08cb9f1e-35aa-4fee-b5ff-c23880e04352'
      const rechnungUuid = '2bbe5282-d4ad-4f9a-ab29-9d36928d60e7'
      const ref = generateQrReference(kundenUuid, rechnungUuid)
      expect(ref.length).toBe(27)
      expect(/^\d{27}$/.test(ref)).toBe(true)
    })

    it('handles missing or non-numeric arguments safely', () => {
      const ref = generateQrReference(null, undefined)
      expect(ref.length).toBe(27)
      expect(/^\d{27}$/.test(ref)).toBe(true)
    })
  })
})
