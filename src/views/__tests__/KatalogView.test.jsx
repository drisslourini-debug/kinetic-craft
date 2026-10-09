import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import KatalogView from '../KatalogView'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockKategorien = [
  { id: 'kat-1', name: 'Malerarbeiten', sort_order: 0 },
  { id: 'kat-2', name: 'Gipserarbeiten', sort_order: 1 }
]

const mockLeistungen = [
  {
    id: 'lei-1',
    kategorie_id: 'kat-1',
    beschreibung: 'Wände streichen zweifach Dispersion',
    einheit: 'm²',
    einzelpreis: 34.50,
    ertragskonto: '3400 Dienstleistungserlöse',
    sort_order: 0,
    is_archived: false
  },
  {
    id: 'lei-2',
    kategorie_id: 'kat-1',
    beschreibung: 'Abdecken und Schützen mit Vlies',
    einheit: 'lfm',
    einzelpreis: 8.50,
    ertragskonto: '3400 Dienstleistungserlöse',
    sort_order: 1,
    is_archived: false
  }
]

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table) => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(() => {
        if (table === 'katalog_kategorien') {
          return Promise.resolve({ data: mockKategorien, error: null })
        }
        return Promise.resolve({ data: mockLeistungen, error: null })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{
            id: 'lei-new',
            kategorie_id: 'kat-1',
            beschreibung: 'Neuer Posten',
            einheit: 'Stk',
            einzelpreis: 50,
            sort_order: 2,
            ertragskonto: '3400 Dienstleistungserlöse',
            is_archived: false
          }],
          error: null
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    }))
  }
}))

describe('KatalogView Mobile Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders category dropdown and position cards correctly', async () => {
    render(<KatalogView userRole="admin" />)

    await waitFor(() => {
      // Check category in dropdown trigger
      expect(screen.getAllByText('Malerarbeiten').length).toBeGreaterThan(0)
      // Check position description
      expect(screen.getAllByText(/Wände streichen zweifach Dispersion/i).length).toBeGreaterThan(0)
    })
  })

  it('opens category dropdown and displays create category button', async () => {
    render(<KatalogView userRole="admin" />)

    await waitFor(() => {
      expect(screen.getAllByText('Malerarbeiten').length).toBeGreaterThan(0)
    })

    // Click the category dropdown trigger
    const trigger = screen.getAllByRole('button').find(b => b.textContent?.includes('Malerarbeiten'))
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.getByText('Neue Kategorie erstellen')).toBeInTheDocument()
      expect(screen.getAllByText('Gipserarbeiten').length).toBeGreaterThan(0)
    })

    // Click "+ Neue Kategorie erstellen" button
    const createBtn = screen.getByText('Neue Kategorie erstellen')
    fireEvent.click(createBtn)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/z\.B\. Malerarbeiten/i)).toBeInTheDocument()
    })
  })

  it('opens bottom sheet when tapping a position card on mobile', async () => {
    render(<KatalogView userRole="admin" />)

    await waitFor(() => {
      expect(screen.getAllByText(/Wände streichen zweifach Dispersion/i).length).toBeGreaterThan(0)
    })

    // Click on the position card
    const cardTitle = screen.getAllByText(/Wände streichen zweifach Dispersion/i)[0]
    fireEvent.click(cardTitle)

    await waitFor(() => {
      // Bottom sheet header should be visible
      expect(screen.getByText('Leistung bearbeiten')).toBeInTheDocument()
    })
  })

  it('opens bottom sheet for new item when tapping + Leistung', async () => {
    render(<KatalogView userRole="admin" />)

    await waitFor(() => {
      expect(screen.getAllByText('Malerarbeiten').length).toBeGreaterThan(0)
    })

    // Find and click the mobile "+ Leistung" button
    const addBtns = screen.getAllByRole('button', { name: /\+.*leistung/i })
    fireEvent.click(addBtns[0])

    await waitFor(() => {
      expect(screen.getByText('Neue Leistung erfassen')).toBeInTheDocument()
    })
  })

  it('updates unit input when clicking quick unit chips', async () => {
    render(<KatalogView userRole="admin" />)

    await waitFor(() => {
      expect(screen.getAllByText(/Wände streichen zweifach Dispersion/i).length).toBeGreaterThan(0)
    })

    const cardTitle = screen.getAllByText(/Wände streichen zweifach Dispersion/i)[0]
    fireEvent.click(cardTitle)

    await waitFor(() => {
      expect(screen.getByText('Leistung bearbeiten')).toBeInTheDocument()
    })

    // Click on the 'Pauschal' chip
    const pauschalChip = screen.getByRole('button', { name: 'Pauschal' })
    fireEvent.click(pauschalChip)

    expect(screen.getByDisplayValue('Pauschal')).toBeInTheDocument()
  })

  it('toggles sort mode and displays up/down buttons on mobile cards', async () => {
    render(<KatalogView userRole="admin" />)

    await waitFor(() => {
      expect(screen.getAllByText('Malerarbeiten').length).toBeGreaterThan(0)
    })

    // Click sort mode toggle
    const sortBtn = screen.getByRole('button', { name: /Sortieren/i })
    fireEvent.click(sortBtn)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Fertig/i })).toBeInTheDocument()
      expect(screen.getAllByText('↑').length).toBeGreaterThan(0)
      expect(screen.getAllByText('↓').length).toBeGreaterThan(0)
    })
  })

  it('opens category actions sheet when clicking category menu button', async () => {
    render(<KatalogView userRole="admin" />)

    await waitFor(() => {
      expect(screen.getAllByText('Malerarbeiten').length).toBeGreaterThan(0)
    })

    const catActionBtn = screen.getByTitle('Kategorie-Aktionen')
    fireEvent.click(catActionBtn)

    await waitFor(() => {
      expect(screen.getByText(/Kategorie umbenennen/i)).toBeInTheDocument()
      expect(screen.getByText(/Kategorie löschen/i)).toBeInTheDocument()
      expect(screen.getByText(/Nach links/i)).toBeInTheDocument()
    })
  })
})
