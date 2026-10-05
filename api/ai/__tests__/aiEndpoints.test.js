import { describe, it, expect, vi, beforeEach } from 'vitest';
import scanReceiptHandler from '../scan-receipt.js';
import voiceParseHandler from '../voice-parse.js';
import { parseRequestBody, sendJson } from '../_helpers.js';

import fs from 'fs';

describe('Vercel Serverless AI Endpoints', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('CORS and Method Validation', () => {
    it('handles OPTIONS preflight for scan-receipt', async () => {
      const req = { method: 'OPTIONS' };
      const res = {
        statusCode: 0,
        headers: {},
        setHeader(k, v) { this.headers[k] = v; },
        end: vi.fn(),
      };

      await scanReceiptHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('rejects GET requests with 405 Method Not Allowed', async () => {
      const req = { method: 'GET' };
      let endData = '';
      const res = {
        statusCode: 0,
        headers: {},
        setHeader(k, v) { this.headers[k] = v; },
        end: (data) => { endData = data; },
      };

      await scanReceiptHandler(req, res);
      expect(res.statusCode).toBe(405);
      expect(JSON.parse(endData).error).toBe('Method Not Allowed');
    });

    it('returns 500 if GEMINI_API_KEY is not set', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const origEnv = process.env.GEMINI_API_KEY;
      const origViteEnv = process.env.VITE_GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      delete process.env.VITE_GEMINI_API_KEY;

      const req = { method: 'POST', body: { image: 'test' } };
      let endData = '';
      const res = {
        statusCode: 0,
        headers: {},
        setHeader(k, v) { this.headers[k] = v; },
        end: (data) => { endData = data; },
      };

      await scanReceiptHandler(req, res);
      expect(res.statusCode).toBe(500);
      expect(JSON.parse(endData).error).toContain('GEMINI_API_KEY');

      process.env.GEMINI_API_KEY = origEnv;
      process.env.VITE_GEMINI_API_KEY = origViteEnv;
    });
  });

  describe('_helpers', () => {
    it('parseRequestBody handles already parsed object', async () => {
      const req = { body: { test: 123 } };
      const parsed = await parseRequestBody(req);
      expect(parsed).toEqual({ test: 123 });
    });

    it('sendJson serializes JSON and sets status', () => {
      const res = {
        statusCode: 0,
        headers: {},
        setHeader(k, v) { this.headers[k] = v; },
        end: vi.fn(),
      };
      sendJson(res, 201, { created: true });
      expect(res.statusCode).toBe(201);
      expect(res.headers['Content-Type']).toBe('application/json');
      expect(res.end).toHaveBeenCalledWith(JSON.stringify({ created: true }));
    });
  });
});
