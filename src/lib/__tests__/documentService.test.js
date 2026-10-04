import { describe, it, expect, vi } from 'vitest';
import {
  generateNextRechnungNr,
  generateNextOfferteNr,
  parseZahlungsfrist,
  calculateDueDate
} from '../documentService';

describe('documentService', () => {
  const currentYear = new Date().getFullYear();

  describe('generateNextRechnungNr', () => {
    it('uses atomic RPC when available', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: `RE-${currentYear}-0042`,
          error: null
        })
      };

      const result = await generateNextRechnungNr(mockSupabase);
      expect(result).toBe(`RE-${currentYear}-0042`);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_next_document_number', {
        p_doc_type: 'rechnung',
        p_year: currentYear
      });
    });

    it('falls back to table query when RPC fails', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockRejectedValue(new Error('RPC not found')),
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [{ rechnung_nr: `RE-${currentYear}-0005` }]
          })
        }))
      };

      const result = await generateNextRechnungNr(mockSupabase);
      expect(result).toBe(`RE-${currentYear}-006`);
    });
  });

  describe('generateNextOfferteNr', () => {
    it('uses atomic RPC when available', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: `OF-${currentYear}-1042`,
          error: null
        })
      };

      const result = await generateNextOfferteNr(mockSupabase);
      expect(result).toBe(`OF-${currentYear}-1042`);
    });

    it('falls back to table query when RPC fails', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockRejectedValue(new Error('RPC not found')),
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [{ offerte_nr: `OF-${currentYear}-1010` }]
          })
        }))
      };

      const result = await generateNextOfferteNr(mockSupabase);
      expect(result).toBe(`OF-${currentYear}-1011`);
    });
  });

  describe('parseZahlungsfrist', () => {
    it('parses standard Swiss payment terms', () => {
      expect(parseZahlungsfrist('30 Tage Netto')).toBe(30);
      expect(parseZahlungsfrist('10 Tage')).toBe(10);
      expect(parseZahlungsfrist('14 Tage')).toBe(14);
      expect(parseZahlungsfrist('60 Tage')).toBe(60);
      expect(parseZahlungsfrist('Barzahlung')).toBe(0);
      expect(parseZahlungsfrist('Vorauszahlung')).toBe(0);
      expect(parseZahlungsfrist(null)).toBe(30);
    });
  });

  describe('calculateDueDate', () => {
    it('adds fristTage to given start date', () => {
      expect(calculateDueDate('2026-03-01', 30)).toBe('2026-03-31');
      expect(calculateDueDate('2026-03-01', 10)).toBe('2026-03-11');
    });
  });
});
