import { describe, it, expect } from 'vitest';
import { validateIban, validateQrIban } from '../ibanValidator';

describe('ibanValidator', () => {
  describe('validateIban', () => {
    it('Valid Swiss IBAN', () => {
      const result = validateIban('CH93 0076 2011 6238 5295 7');
      expect(result).toEqual({ valid: true });
    });

    it('Invalid checksum', () => {
      const result = validateIban('CH93 0076 2011 6238 5295 0');
      expect(result).toEqual({ valid: false, error: 'Die Prüfziffer der IBAN ist ungültig.' });
    });

    it('Too short', () => {
      const result = validateIban('CH93 0076');
      expect(result).toEqual({ valid: false, error: 'Schweizer IBANs bestehen aus 21 Zeichen.' });
    });

    it('Non-Swiss', () => {
      const result = validateIban('DE89 3704 0044 0532 0130 00');
      expect(result).toEqual({ valid: false, error: 'Nur Schweizer (CH) und Liechtensteiner (LI) IBANs werden unterstützt.' });
    });

    it('Empty string', () => {
      const result = validateIban('');
      expect(result).toEqual({ valid: false, error: 'Ungültiges IBAN-Format. Bitte prüfe die Eingabe.' });
    });
  });

  describe('validateQrIban', () => {
    it('Valid QR-IBAN', () => {
      const result = validateQrIban('CH44 3199 9123 0008 8901 2');
      expect(result).toEqual({ valid: true, isQrIban: true });
    });

    it('Regular IBAN (not QR)', () => {
      const result = validateQrIban('CH93 0076 2011 6238 5295 7');
      expect(result).toEqual({ valid: false, isQrIban: false, error: 'Dies ist keine QR-IBAN. Eine QR-IBAN hat eine Instituts-ID zwischen 30000 und 31999.' });
    });
  });
});
