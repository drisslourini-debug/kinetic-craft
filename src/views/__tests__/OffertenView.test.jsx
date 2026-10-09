import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import OffertenView from '../OffertenView'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockOfferten = [
  {
    id: 101,
    offerte_nr: 'OF-2026-101',
    status: 'Entwurf',
    total: 1200,
    created_at: '2026-09-01',
    kunden_id: 1,
    kunden: { name: 'Dr. Meyer Immobilien AG' },
    projekte: { name: 'Renovation Bad', adresse: 'Zürich' },
    daten: {
      titel: 'Offerte für Dr. Meyer',
      leistungen: [
        { _id: 1, type: 'position', posNr: '1.1', beschreibung: 'Malerarbeiten', menge: '10', einheit: 'm²', einzelpreis: '50' }
      ],
      konditionen: { rabatt: 0, mwst: 8.1 }
    }
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
          ilike: vi.fn(() => builder),
          order: vi.fn(() => builder),
          limit: vi.fn(() => builder),
          single: vi.fn().mockResolvedValue({ 
            data: table === 'offerten' ? mockOfferten[0] : (table === 'kunden' ? { id: 1, name: 'Dr. Meyer Immobilien AG' } : null), 
            error: null 
          }),
          maybeSingle: vi.fn().mockResolvedValue({ data: {}, error: null }),
          then: (resolve) => {
            const data = table === 'offerten' ? mockOfferten : (table === 'kunden' ? [{ id: 1, name: 'Dr. Meyer Immobilien AG' }] : [])
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

describe('OffertenView Direct Editor Transition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders overview with existing offerten', async () => {
    render(<OffertenView />)

    await waitFor(() => {
      expect(screen.getByText('Dr. Meyer Immobilien AG')).toBeInTheDocument()
      expect(screen.getByText('OF-2026-101')).toBeInTheDocument()
    })
  })

  it('opens DocumentCreateModal when viewParams.action is "create"', async () => {
    render(<OffertenView viewParams={{ action: 'create' }} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Neue Offerte erstellen/i })).toBeInTheDocument()
    })
  })

  it('opens OfferteDetailView directly in edit mode when viewParams has edit=true and matching offerteId', async () => {
    render(<OffertenView viewParams={{ offerteId: '101', edit: true }} />)

    await waitFor(() => {
      // OfferteDetailView is mounted
      expect(screen.getByText(/Offerte #101/i)).toBeInTheDocument()
      // In edit mode, "Offerte bearbeiten" is active and editing elements appear
      expect(screen.getByText(/Live-Vorschau/i)).toBeInTheDocument()
    })
  })

  it('navigates to new offerte with edit: true and replace: true when created via modal', async () => {
    const onNavigateMock = vi.fn()
    render(<OffertenView viewParams={{ action: 'create', kundeId: '1' }} onNavigate={onNavigateMock} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Neue Offerte erstellen/i })).toBeInTheDocument()
    })

    const submitBtn = screen.getByRole('button', { name: /Weiter zum Editor/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(onNavigateMock).toHaveBeenCalledWith('offerten', expect.objectContaining({
        edit: true
      }), { replace: true })
    })
  })
})
