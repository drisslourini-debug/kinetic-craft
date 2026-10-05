import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scanReceipt, parseVoice, fileToBase64 } from '../aiService';

describe('aiService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('fileToBase64', () => {
    it('converts a blob/file to base64 object', async () => {
      const blob = new Blob(['sample receipt content'], { type: 'text/plain' });
      const res = await fileToBase64(blob);
      expect(res).toBeDefined();
      expect(res.base64).toBeDefined();
      expect(typeof res.base64).toBe('string');
      expect(res.mimeType).toBe('text/plain');
    });
  });

  describe('scanReceipt', () => {
    it('sends base64 to /api/ai/scan-receipt and returns parsed data', async () => {
      const mockResult = {
        titel: 'Jumbo Aarau',
        beleg_datum: '2026-10-04',
        betrag_brutto: 185.50,
        mwst_satz: '8.1',
        kategorie: '4000 Materialaufwand',
        projekt_id: null,
        vertrauen: 'hoch',
        warnung: null,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockResult }),
      });

      const res = await scanReceipt({
        base64: 'fake-base64-data',
        mimeType: 'image/jpeg',
        projekte: [{ id: 'p1', name: 'Maler Renovation', adresse: 'Bahnhofstr. 1' }],
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/ai/scan-receipt', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }));

      expect(res.titel).toBe('Jumbo Aarau');
      expect(res.betrag_brutto).toBe(185.50);
      expect(res.mwst_satz).toBe('8.1');
    });

    it('throws error when server returns success false or non-ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: 'Ungültiges Bildformat' }),
      });

      await expect(
        scanReceipt({ base64: 'corrupt', mimeType: 'image/jpeg' })
      ).rejects.toThrow('Ungültiges Bildformat');
    });
  });

  describe('parseVoice', () => {
    it('parses speech prompt for offerte mode', async () => {
      const mockOfferte = {
        einleitung: 'Gerne offerieren wir Ihnen:',
        schluss: 'Freundliche Grüsse',
        positionen: [
          { type: 'title', beschreibung: '1.0 Vorarbeiten' },
          { type: 'position', beschreibung: 'Abdecken mit Vlies', menge: 60, einheit: 'm²', einzelpreis: 8.5 },
        ],
        vertrauen: 'hoch',
        warnung: null,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockOfferte }),
      });

      const res = await parseVoice({
        textPrompt: 'Vorarbeiten: Abdecken mit Vlies 60m2',
        mode: 'offerte',
        katalog: [{ id: 'k1', titel: 'Abdecken', einheit: 'm²', preis: 8.5 }],
      });

      expect(res.positionen).toHaveLength(2);
      expect(res.positionen[1].menge).toBe(60);
      expect(res.positionen[1].einheit).toBe('m²');
    });

    it('parses speech prompt for projekt mode', async () => {
      const mockProjekt = {
        name: 'Fassadensanierung Poststrasse',
        kunden_id: 'k-100',
        kategorie: 'Sanierung',
        adresse: 'Poststrasse 12, 8001 Zürich',
        startdatum: '2026-10-12',
        enddatum: '2026-10-30',
        vertrauen: 'hoch',
        warnung: null,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockProjekt }),
      });

      const res = await parseVoice({
        textPrompt: 'Neues Projekt Fassadensanierung für Kunde Müller',
        mode: 'projekt',
        kunden: [{ id: 'k-100', name: 'Müller Hans' }],
      });

      expect(res.name).toBe('Fassadensanierung Poststrasse');
      expect(res.kunden_id).toBe('k-100');
      expect(res.kategorie).toBe('Sanierung');
    });
  });
});
