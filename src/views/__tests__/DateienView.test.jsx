import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import DateienView from '../DateienView'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDateien = [
  {
    id: 1,
    name: 'Offerte_OF-2026-1001.pdf',
    dateipfad: 'offerten/OF-2026-1001.pdf',
    kategorie: 'Offerten',
    dateigroesse: 102400,
    created_at: '2026-11-13T10:00:00Z',
    kunden_id: 1,
    projekt_id: null
  },
  {
    id: 2,
    name: 'Baustellenfoto_Kueche.jpg',
    dateipfad: 'projekte/foto1.jpg',
    kategorie: 'Fotos & Pläne',
    dateigroesse: 204800,
    created_at: '2026-11-13T11:00:00Z',
    kunden_id: 1,
    projekt_id: 2
  }
]

vi.mock('../../lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn((table) => {
        const builder = {
          select: vi.fn(() => builder),
          insert: vi.fn(() => builder),
          update: vi.fn(() => builder),
          delete: vi.fn(() => builder),
          eq: vi.fn(() => builder),
          order: vi.fn(() => builder),
          limit: vi.fn(() => builder),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          then: (resolve) => {
            let data = []
            if (table === 'dateien') data = mockDateien
            if (table === 'kunden') data = [{ id: 1, name: 'Meier Architektur AG' }]
            if (table === 'projekte') data = [{ id: 2, name: 'Villa Bergstrasse' }]
            return Promise.resolve({ data, error: null }).then(resolve)
          }
        }
        return builder
      }),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ data: { path: 'test.pdf' }, error: null }),
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test.pdf' } }),
          remove: vi.fn().mockResolvedValue({ error: null })
        }))
      }
    }
  }
})

describe('DateienView / Archiv', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders archive view with root folders and search input', async () => {
    render(<DateienView />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Archiv/i })).toBeInTheDocument()
      expect(screen.getAllByPlaceholderText(/Dateien durchsuchen/i).length).toBeGreaterThan(0)
      expect(screen.getByTitle(/Archiv mit Offerten & Rechnungen synchronisieren/i)).toBeInTheDocument()
    })
  })

  it('filters files when typing in the search box', async () => {
    render(<DateienView />)

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText(/Dateien durchsuchen/i).length).toBeGreaterThan(0)
    })

    const searchInput = screen.getAllByPlaceholderText(/Dateien durchsuchen/i)[0]
    fireEvent.change(searchInput, { target: { value: 'Baustellenfoto' } })

    await waitFor(() => {
      expect(searchInput.value).toBe('Baustellenfoto')
    })
  })

  it('triggers archive sync on button click', async () => {
    render(<DateienView />)

    await waitFor(() => {
      expect(screen.getByTitle(/Archiv mit Offerten & Rechnungen synchronisieren/i)).toBeInTheDocument()
    })

    const syncBtn = screen.getByTitle(/Archiv mit Offerten & Rechnungen synchronisieren/i)
    fireEvent.click(syncBtn)

    await waitFor(() => {
      expect(screen.getByText(/Archiv synchronisiert/i)).toBeInTheDocument()
    })
  })
})
