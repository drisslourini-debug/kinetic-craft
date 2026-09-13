import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import OfferteDetailView from '../OfferteDetailView'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: {}, error: null }),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null })
    }))
  }
}))

vi.mock('../../lib/formatters', () => ({
  formatMoney: (val) => Number(val || 0).toFixed(2),
  formatCurrency: (val) => `CHF ${Number(val || 0).toFixed(2)}`,
  formatDate: (val) => val
}))

const mockOfferte = {
  id: 'of-1',
  kunden_id: 'k-1',
  projekt_id: 'p-1',
  kunden_name: 'Muster Kunde',
  status: 'Entwurf',
  gueltig_bis: '2026-10-15',
  created_at: '2026-09-15',
  daten: {
    titel: 'Wohnungsrenovierung',
    leistungen: [
      { _id: '1', beschreibung: 'Malerarbeiten', menge: 10, einheit: 'm2', einzelpreis: 50 }
    ],
    konditionen: {
      rabatt: 0,
      mwst: 8.1,
      gueltigkeit: '30 Tage',
      zahlungsfrist: '30 Tage Netto'
    },
    gueltig_bis: '2026-10-15'
  }
}

describe('OfferteDetailView Calendar Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders offerte and shows "Im Kalender ansehen" link', async () => {
    const onNavigateMock = vi.fn()
    render(<OfferteDetailView offerte={mockOfferte} onBack={vi.fn()} onNavigate={onNavigateMock} />)

    await waitFor(() => {
      expect(screen.queryByText(/Lade Daten.../i)).not.toBeInTheDocument()
    })

    const calBtn = screen.getByRole('button', { name: /Im Kalender ansehen/i })
    expect(calBtn).toBeInTheDocument()
    fireEvent.click(calBtn)

    expect(onNavigateMock).toHaveBeenCalledWith('kalender', { date: '2026-10-15' })
  })

  it('opens appointment modal when clicking "Aufmass / Besichtigung planen" from action menu', async () => {
    render(<OfferteDetailView offerte={mockOfferte} onBack={vi.fn()} onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.queryByText(/Lade Daten.../i)).not.toBeInTheDocument()
    })

    // Open action menu (3 dots)
    const threeDotBtn = screen.getByRole('button', { name: /Aktionsmenü/i })
    fireEvent.click(threeDotBtn)

    await waitFor(() => {
      expect(screen.getByText(/Aufmass \/ Besichtigung planen/i)).toBeInTheDocument()
    })

    const aufmassBtn = screen.getByText(/Aufmass \/ Besichtigung planen/i)
    fireEvent.click(aufmassBtn)

    await waitFor(() => {
      expect(screen.getByText(/Neuer Termin erfassen/i)).toBeInTheDocument()
    })
  })

  it('displays acceptance banner and allows scheduling Montagetermin when status is Akzeptiert', async () => {
    const acceptedOfferte = {
      ...mockOfferte,
      status: 'Akzeptiert'
    }

    render(<OfferteDetailView offerte={acceptedOfferte} onBack={vi.fn()} onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/Auftrag erteilt \/ Offerte akzeptiert!/i)).toBeInTheDocument()
    })

    const montageBtn = screen.getByRole('button', { name: /Montagetermin planen/i })
    expect(montageBtn).toBeInTheDocument()

    fireEvent.click(montageBtn)

    await waitFor(() => {
      expect(screen.getByText(/Neuer Termin erfassen/i)).toBeInTheDocument()
    })
  })
})
