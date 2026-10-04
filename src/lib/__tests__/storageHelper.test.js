import { describe, it, expect, vi } from 'vitest';
import { getTenantStoragePath, extractStoragePath, getFileAccessUrl } from '../storageHelper';

describe('storageHelper', () => {
  describe('getTenantStoragePath', () => {
    it('creates path with tenant_id and filename', () => {
      const path = getTenantStoragePath('tenant-123', 'baustelle.jpg', 'fotos');
      expect(path).toMatch(/^tenant-123\/fotos\/\d+_[a-z0-9]+_baustelle\.jpg$/);
    });

    it('falls back to common when tenantId is null', () => {
      const path = getTenantStoragePath(null, 'plan.pdf');
      expect(path).toMatch(/^common\/uploads\/\d+_[a-z0-9]+_plan\.pdf$/);
    });

    it('sanitizes special characters in filename', () => {
      const path = getTenantStoragePath('t1', 'Mein Plan (neu) #2!.pdf');
      expect(path).not.toContain(' ');
      expect(path).not.toContain('#');
      expect(path).not.toContain('!');
      expect(path).toContain('Mein_Plan__neu___2_.pdf');
    });
  });

  describe('extractStoragePath', () => {
    it('extracts path from public url', () => {
      const url = 'https://abc.supabase.co/storage/v1/object/public/anhange/tenant-1/uploads/test.pdf';
      expect(extractStoragePath(url)).toBe('tenant-1/uploads/test.pdf');
    });

    it('extracts path from signed url with query parameters', () => {
      const url = 'https://abc.supabase.co/storage/v1/object/sign/anhange/tenant-1/uploads/test.pdf?token=xyz123';
      expect(extractStoragePath(url)).toBe('tenant-1/uploads/test.pdf');
    });

    it('returns raw path when already relative', () => {
      expect(extractStoragePath('tenant-1/uploads/test.pdf')).toBe('tenant-1/uploads/test.pdf');
    });

    it('handles empty input gracefully', () => {
      expect(extractStoragePath('')).toBe('');
      expect(extractStoragePath(null)).toBe('');
    });
  });

  describe('getFileAccessUrl', () => {
    it('calls createSignedUrl and returns signedUrl', async () => {
      const mockSupabase = {
        storage: {
          from: vi.fn(() => ({
            createSignedUrl: vi.fn().mockResolvedValue({
              data: { signedUrl: 'https://example.com/signed-url' },
              error: null
            }),
            getPublicUrl: vi.fn()
          }))
        }
      };

      const result = await getFileAccessUrl(mockSupabase, 'tenant-1/file.pdf', 1800);
      expect(result).toBe('https://example.com/signed-url');
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('anhange');
    });

    it('falls back to getPublicUrl if createSignedUrl errors', async () => {
      const mockSupabase = {
        storage: {
          from: vi.fn(() => ({
            createSignedUrl: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Signing disabled')
            }),
            getPublicUrl: vi.fn(() => ({
              data: { publicUrl: 'https://example.com/public-url' }
            }))
          }))
        }
      };

      const result = await getFileAccessUrl(mockSupabase, 'tenant-1/file.pdf');
      expect(result).toBe('https://example.com/public-url');
    });
  });
});
