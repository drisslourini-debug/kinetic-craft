import { describe, it, expect } from 'vitest';
import {
  roundToFiveRappen,
  calculateGarantieFreigabeDatum,
  calculateSia118Schlussrechnung
} from '../sia118Helper';

describe('SIA 118 Helper Engine', () => {
  describe('roundToFiveRappen', () => {
    it('rounds to nearest 0.05 CHF', () => {
      expect(roundToFiveRappen(10.02)).toBe(10.00);
      expect(roundToFiveRappen(10.03)).toBe(10.05);
      expect(roundToFiveRappen(10.07)).toBe(10.05);
      expect(roundToFiveRappen(10.08)).toBe(10.10);
      expect(roundToFiveRappen(10.12)).toBe(10.10);
    });

    it('handles edge cases safely', () => {
      expect(roundToFiveRappen(0)).toBe(0);
      expect(roundToFiveRappen(null)).toBe(0);
      expect(roundToFiveRappen(undefined)).toBe(0);
      expect(roundToFiveRappen(NaN)).toBe(0);
    });
  });

  describe('calculateGarantieFreigabeDatum', () => {
    it('calculates 2 years in advance according to SIA 118 Art. 172', () => {
      expect(calculateGarantieFreigabeDatum('2026-10-15', 2)).toBe('2028-10-15');
      expect(calculateGarantieFreigabeDatum('2025-01-01', 5)).toBe('2030-01-01');
    });
  });

  describe('calculateSia118Schlussrechnung', () => {
    it('calculates standard SIA 118 Schlussrechnung with Akonti and 5% retention from total work price', () => {
      const result = calculateSia118Schlussrechnung({
        gesamtwerkpreis: 50000,
        akontoAbzuege: [
          { rechnung_nr: 'RE-2026-001', betrag: 15000 },
          { rechnung_nr: 'RE-2026-002', betrag: 20000 }
        ],
        rueckbehalt: {
          aktiv: true,
          prozent: 5.0,
          abgeloestDurchGarantie: false,
          basis: 'gesamtwerkpreis'
        },
        rechnungsdatum: '2026-10-01'
      });

      // Total Werkleistung: 50'000.00
      expect(result.werkpreisBrutto).toBe(50000);
      // Total Akonto: 15'000 + 20'000 = 35'000
      expect(result.totalAkontoAbzug).toBe(35000);
      // Restbetrag nach Akonto: 50'000 - 35'000 = 15'000
      expect(result.restbetragNachAkonto).toBe(15000);
      // 5% Rückbehalt von 50'000 = 2'500.00
      expect(result.rueckbehalt.betrag).toBe(2500);
      expect(result.rueckbehalt.aktiv).toBe(true);
      expect(result.rueckbehalt.freigabeDatum).toBe('2028-10-01');
      // Fälliger Schlussbetrag: 15'000 - 2'500 = 12'500.00
      expect(result.faelligerSchlussbetrag).toBe(12500);
    });

    it('handles bank guarantee / warranty bond release (no retention deducted)', () => {
      const result = calculateSia118Schlussrechnung({
        gesamtwerkpreis: 30000,
        akontoAbzuege: [
          { rechnung_nr: 'RE-2026-101', betrag: 10000 }
        ],
        rueckbehalt: {
          aktiv: true,
          prozent: 5.0,
          abgeloestDurchGarantie: true,
          basis: 'gesamtwerkpreis'
        }
      });

      expect(result.rueckbehalt.abgeloestDurchGarantie).toBe(true);
      expect(result.rueckbehalt.betrag).toBe(0);
      // Fälliger Betrag is full rest without retention deduction: 30'000 - 10'000 = 20'000
      expect(result.faelligerSchlussbetrag).toBe(20000);
    });

    it('ignores disabled Akonto deductions', () => {
      const result = calculateSia118Schlussrechnung({
        gesamtwerkpreis: 20000,
        akontoAbzuege: [
          { rechnung_nr: 'RE-2026-001', betrag: 5000, disabled: false },
          { rechnung_nr: 'RE-2026-002', betrag: 7000, disabled: true }
        ],
        rueckbehalt: { aktiv: false }
      });

      expect(result.totalAkontoAbzug).toBe(5000);
      expect(result.faelligerSchlussbetrag).toBe(15000);
    });

    it('applies Swiss 5-Rappen-Rundung correctly on fractional percentages', () => {
      const result = calculateSia118Schlussrechnung({
        gesamtwerkpreis: 12345.67,
        akontoAbzuege: [{ betrag: 3000 }],
        rueckbehalt: {
          aktiv: true,
          prozent: 5.0,
          abgeloestDurchGarantie: false,
          basis: 'gesamtwerkpreis'
        }
      });

      // 5% of 12'345.67 = 617.2835 -> rounded to 617.30
      expect(result.rueckbehalt.betrag).toBe(617.30);
      // Werkpreis: 12'345.67 rounded to 12'345.65
      expect(result.werkpreisBrutto).toBe(12345.65);
      // Rest nach Akonto: 12'345.65 - 3'000 = 9'345.65
      expect(result.restbetragNachAkonto).toBe(9345.65);
      // Schlussbetrag: 9'345.65 - 617.30 = 8'728.35
      expect(result.faelligerSchlussbetrag).toBe(8728.35);
    });
  });
});
