import { describe, it, expect } from 'vitest';
import {
  KMU_KONTEN,
  getKmuAufwandskonto,
  generateBananaJournalCsv,
  generateEstvMwstSummaryCsv,
  generateOpenItemsDebtorsCsv
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
    it('generates valid semicolon-delimited CSV with BOM in kassa mode', () => {
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

    it('supports double-entry bookkeeping (doppelt mode) with FLL 1100 and Skonto 3800', () => {
      const mockAusgaben = [];
      const mockEinnahmen = [
        {
          id: 're-100',
          rechnung_nr: 'RE-2026-100',
          rechnungsdatum: '2026-04-01',
          bezahlt_am: '2026-04-10',
          total: 1000.00,
          bezahlt: 980.00,
          daten: {
            skonto_betrag: 20.00,
            konditionen: { mwst: 8.1 }
          },
          kunden: { name: 'Muster AG' }
        }
      ];

      const csv = generateBananaJournalCsv(mockAusgaben, mockEinnahmen, { mode: 'doppelt' });
      // 1. Fakturierung: 1100 an 3200 (1000.00)
      expect(csv).toContain('1100;3200;1000.00;8.1');
      // 2. Zahlungseingang: 1020 an 1100 (980.00)
      expect(csv).toContain('1020;1100;980.00;0.0;0.00');
      // 3. Skontoabzug: 3800 an 1100 (20.00)
      expect(csv).toContain('3800;1100;20.00;8.1');
    });
  });

  describe('generateEstvMwstSummaryCsv', () => {
    it('calculates Ziffer 200, 302, 400 and Zahllast correctly for effective method', () => {
      const mockEinnahmen = [{ total: 1081.00 }];
      const mockAusgaben = [{ mwst_betrag: 25.00 }];

      const csv = generateEstvMwstSummaryCsv(mockAusgaben, mockEinnahmen, { mwst_methode: 'effektiv' });
      expect(csv).toContain('Ziffer 200;Vereinbarte/Vereinnahmte Entgelte (Gesamtumsatz);1081.00');
      expect(csv).toContain('Ziffer 400;Vorsteuer auf Material- und Dienstleistungsaufwand;25.00');
      expect(csv).toContain('Ziffer 500;');
    });

    it('calculates Saldosteuersatz correctly with 0 Vorsteuerabzug', () => {
      const mockEinnahmen = [{ total: 10000.00 }];
      const mockAusgaben = [{ mwst_betrag: 500.00 }]; // Darf nicht abgezogen werden!

      const csv = generateEstvMwstSummaryCsv(mockAusgaben, mockEinnahmen, {
        mwst_methode: 'saldosteuer',
        saldosteuersatz: 5.9
      });

      expect(csv).toContain('Saldosteuersatzmethode (5.9% - Art. 37 MWSTG)');
      expect(csv).toContain('Ziffer 381;Saldosteuersatz (5.9 % auf Gesamtumsatz);590.00');
      expect(csv).toContain('Ziffer 400;Vorsteuer auf Material- und Dienstleistungsaufwand;0.00');
      expect(csv).toContain('Ziffer 500;Zu bezahlender Betrag (Zahllast an ESTV);590.00');
    });
  });

  describe('generateOpenItemsDebtorsCsv', () => {
    it('creates accurate aging report with 5% Swiss Delkredere calculation', () => {
      const mockInvoices = [
        {
          id: 're-1',
          rechnung_nr: 'RE-2026-001',
          rechnungsdatum: '2026-01-01',
          faellig_am: '2026-01-31',
          total: 2000.00,
          bezahlt: 500.00,
          status: 'Teilbezahlt',
          kunden: { name: 'Kunde Alt' }
        },
        {
          id: 're-2',
          rechnung_nr: 'RE-2026-002',
          rechnungsdatum: '2026-03-01',
          faellig_am: '2026-04-15',
          total: 1000.00,
          bezahlt: 1000.00,
          status: 'Bezahlt',
          kunden: { name: 'Kunde Fertig' }
        }
      ];

      // Reference date: 2026-03-31
      const refDate = new Date('2026-03-31T00:00:00Z');
      const csv = generateOpenItemsDebtorsCsv(mockInvoices, refDate);

      expect(csv.charCodeAt(0)).toBe(0xFEFF);
      expect(csv).toContain('RE-2026-001');
      expect(csv).not.toContain('RE-2026-002'); // voll bezahlt wird ausgeschlossen
      expect(csv).toContain('1500.00'); // offener Betrag
      expect(csv).toContain('Total offene Debitorenforderungen (FLL Konto 1100):;1500.00 CHF');
      expect(csv).toContain('Empfohlenes Delkredere 5% (Konto 1109 / Art. 960e OR):;75.00 CHF');
    });
  });
});
