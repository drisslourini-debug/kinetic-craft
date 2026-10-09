import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import RechnungenView from '../RechnungenView'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRechnungen = [
  {
    id: 201,
    rechnung_nr: 'RE-2026-201',
    status: 'Versendet',
    total: 2500,
    bezahlt: 0,
    created_at: '2026-09-01',
    faellig_am: '2026-12-31',
    kunden_id: 1,
    kunden: { name: 'Dr. Meyer Immobilien AG' },
    projekte: { name: 'Renovation Bad', adresse: 'Zürich' },
    daten: {
      titel: 'Rechnung für Dr. Meyer',
      leistungen: [
        { _id: 1, type: 'position', posNr: '1.1', beschreibung: 'Malerarbeiten', menge: '10', einheit: 'm²', einzelpreis: '250' }
      ]
    }
  },
  {
    id: 202,
    rechnung_nr: 'RE-2026-202',
    status: 'Überfällig',
    total: 1500,
    bezahlt: 0,
    created_at: '2026-08-01',
    faellig_am: '2026-08-31',
    kunden_id: 2,
    kunden: { name: 'Hans Muster' },
    projekte: { name: 'Gartenbau', adresse: 'Bern' }
  },
  {
    id: 203,
    rechnung_nr: 'RE-2026-203',
    status: 'Bezahlt',
    total: 3000,
    bezahlt: 3000,
    created_at: '2026-07-01',
    faellig_am: '2026-07-31',
    bezahlt_am: '2026-07-20',
    kunden_id: 1,
    kunden: { name: 'Dr. Meyer Immobilien AG' },
    projekte: { name: 'Renovation Bad', adresse: 'Zürich' }
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
          in: vi.fn(() => builder),
          ilike: vi.fn(() => builder),
          order: vi.fn(() => builder),
          limit: vi.fn(() => builder),
          single: vi.fn().mockResolvedValue({ 
            data: table === 'rechnungen' ? mockRechnungen[0] : (table === 'kunden' ? { id: 1, name: 'Dr. Meyer Immobilien AG' } : null), 
            error: null 
          }),
          maybeSingle: vi.fn().mockResolvedValue({ data: {}, error: null }),
          then: (resolve) => {
            const data = table === 'rechnungen' ? mockRechnungen : (table === 'kunden' ? [{ id: 1, name: 'Dr. Meyer Immobilien AG' }] : [])
            return Promise.resolve({ data, error: null }).then(resolve)
          }
        }
        return builder
      })
    }
  }
})

vi.mock('../../lib/formatters', () => ({
  formatMoney: (val) => Number(val || 0).toFixed(2),
  formatCurrency: (val) => `CHF ${val}`,
  formatDate: (val) => val,
  formatMonthYear: (val) => val,
}))

describe('RechnungenView Responsive & Mobile UX', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders overview with existing rechnungen', async () => {
    render(<RechnungenView />)

    await waitFor(() => {
      expect(screen.getAllByText('Dr. Meyer Immobilien AG').length).toBeGreaterThan(0)
      expect(screen.getByText('RE-2026-201')).toBeInTheDocument()
      expect(screen.getByText('RE-2026-202')).toBeInTheDocument()
    })
  })

  it('renders mobile 3-column KPI tiles and filters when clicked', async () => {
    render(<RechnungenView />)

    await waitFor(() => {
      expect(screen.getByText('RE-2026-201')).toBeInTheDocument()
    })

    // Click on mobile KPI button "Überfällig"
    const ueberfaelligButtons = screen.getAllByRole('button', { name: /Überfällig/i })
    fireEvent.click(ueberfaelligButtons[0])

    await waitFor(() => {
      expect(screen.getByText('RE-2026-202')).toBeInTheDocument()
      expect(screen.queryByText('RE-2026-201')).not.toBeInTheDocument()
    })
  })

  it('toggles mobile chart visibility on toggle button click', async () => {
    render(<RechnungenView />)

    const toggleButton = screen.getByRole('button', { name: /Umsatz 2026/i })
    expect(toggleButton).toBeInTheDocument()

    // Initially says "Anzeigen"
    expect(screen.getByText('Anzeigen')).toBeInTheDocument()

    // Click to expand
    fireEvent.click(toggleButton)
    expect(screen.getByText('Ausblenden')).toBeInTheDocument()

    // Click to collapse
    fireEvent.click(toggleButton)
    expect(screen.getByText('Anzeigen')).toBeInTheDocument()
  })

  it('filters rechnungen via search input', async () => {
    render(<RechnungenView />)

    await waitFor(() => {
      expect(screen.getByText('RE-2026-201')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/Rechnungen suchen nach/i)
    fireEvent.change(searchInput, { target: { value: 'Muster' } })

    await waitFor(() => {
      expect(screen.getByText('Hans Muster')).toBeInTheDocument()
      expect(screen.queryByText('Dr. Meyer Immobilien AG')).not.toBeInTheDocument()
    })
  })

  it('opens DocumentCreateModal when viewParams.action is "create"', async () => {
    render(<RechnungenView viewParams={{ action: 'create' }} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Neue Rechnung erstellen/i })).toBeInTheDocument()
    })
  })

  it('renders Mahnwesen Cockpit and stage navigation when Mahnwesen filter is active', async () => {
    render(<RechnungenView />)

    await waitFor(() => {
      expect(screen.getByText('RE-2026-202')).toBeInTheDocument()
    })

    // Click on Mahnwesen StatCard
    const mahnwesenCard = screen.getByText('Mahnwesen (Überfällig)')
    fireEvent.click(mahnwesenCard)

    await waitFor(() => {
      expect(screen.getByText('Mahnstufen:')).toBeInTheDocument()
      expect(screen.getByText(/Alle Mahnfälle/i)).toBeInTheDocument()
      expect(screen.getByText(/Erinnerung/i)).toBeInTheDocument()
    })
  })
})
