import { describe, it, expect } from 'vitest';
import {
  KMU_KONTEN,
  getKmuAufwandskonto,
  generateBananaJournalCsv,
  generateEstvMwstSummaryCsv
} from '../accountingExport';

describe('accountingExport', () => {
  describe('getKmuAufwandskonto', () => {
    it('maps material and paint to 4000', () => {
      expect(getKmuAufwandskonto('Material')).toBe(KMU_KONTEN.AUFWAND_MATERIAL);
      expect(getKmuAufwandskonto('Farbe & Lacke')).toBe(KMU_KONTEN.AUFWAND_MATERIAL);
    });

    it('maps subcontracts to 4400', () => {
      expect(getKmuAufwandskonto('Fremdleistungen')).toBe(KMU_KONTEN.AUFWAND_FREMDLEISTUNG);
      expect(getKmuAufwandskonto('Subunternehmer')).toBe(KMU_KONTEN.AUFWAND_FREMDLEISTUNG);
    });

    it('maps tools and machines to 4500', () => {
      expect(getKmuAufwandskonto('Werkzeug & Maschinen')).toBe(KMU_KONTEN.AUFWAND_WERKZEUG);
    });

    it('maps vehicle and fuel to 6200', () => {
      expect(getKmuAufwandskonto('Fahrzeug / Benzin')).toBe(KMU_KONTEN.AUFWAND_FAHRZEUG);
    });

    it('falls back to 6700 for unknown categories', () => {
      expect(getKmuAufwandskonto('')).toBe(KMU_KONTEN.AUFWAND_SONSTIG);
      expect(getKmuAufwandskonto('Diverses')).toBe(KMU_KONTEN.AUFWAND_SONSTIG);
    });
  });

  describe('generateBananaJournalCsv', () => {
    it('generates valid semicolon-delimited CSV with BOM', () => {
      const mockAusgaben = [
        {
          id: 'ag-1',
          beleg_datum: '2026-03-15',
          titel: 'Farbe weiss 25kg',
          kategorie: 'Material',
          betrag_brutto: 162.15,
          mwst_satz: 8.1,
          mwst_betrag: 12.15,
          status: 'Bezahlt',
          projekte: { name: 'Umbau Villa' }
        }
      ];

      const mockEinnahmen = [
        {
          id: 're-1',
          rechnung_nr: 'RE-2026-001',
          bezahlt_am: '2026-03-20',
          total: 1081.00,
          projekte: { name: 'Umbau Villa' }
        }
      ];

      const csv = generateBananaJournalCsv(mockAusgaben, mockEinnahmen);
      expect(csv.charCodeAt(0)).toBe(0xFEFF); // UTF-8 BOM
      expect(csv).toContain('Datum;Beleg;Beschreibung;KontoSoll;KontoHaben;Betrag;MwStSatz;MwStBetrag');
      expect(csv).toContain('1020;3200;1081.00;8.1');
      expect(csv).toContain('4000;1020;162.15;8.1;12.15');
    });
  });

  describe('generateEstvMwstSummaryCsv', () => {
    it('calculates Ziffer 200, 302, 400 and Zahllast correctly', () => {
      const mockEinnahmen = [{ total: 1081.00 }];
      const mockAusgaben = [{ mwst_betrag: 25.00 }];

      const csv = generateEstvMwstSummaryCsv(mockAusgaben, mockEinnahmen);
      expect(csv).toContain('Ziffer 200;Vereinbarte/Vereinnahmte Entgelte (Gesamtumsatz);1081.00');
      expect(csv).toContain('Ziffer 400;Vorsteuer auf Material- und Dienstleistungsaufwand;25.00');
      expect(csv).toContain('Ziffer 500;');
    });
  });
});
