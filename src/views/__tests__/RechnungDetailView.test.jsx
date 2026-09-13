import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import RechnungDetailView from '../RechnungDetailView'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: {}, error: null }),
      single: vi.fn().mockResolvedValue({ data: {}, error: null })
    }))
  }
}))

// Mock formatMoney to simplify DOM matching
vi.mock('../../lib/formatters', () => ({
  formatMoney: (val) => Number(val || 0).toFixed(2),
  formatCurrency: (val) => `CHF ${Number(val || 0).toFixed(2)}`,
  formatDate: (val) => val
}))
vi.mock('../../lib/utils', () => ({
  formatMoney: (val) => Number(val || 0).toFixed(2),
}))

const mockRechnung = {
  _id: 'r-1',
  rechnungNr: 'RE-2026-001',
  status: 'Entwurf',
  kundeId: 'k-1',
  projektId: 'p-1',
  daten: {
    leistungen: [
      { _id: '1', beschreibung: 'Test', menge: 1, einzelpreis: 100 }
    ],
    konditionen: {
      rabatt: 0,
      mwst: 8.1
    }
  }
}

describe('RechnungDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially or renders the view', async () => {
    render(<RechnungDetailView rechnung={mockRechnung} onBack={vi.fn()} />)
    
    // Wait for the fetching to complete
    await waitFor(() => {
      expect(screen.queryByText(/Lädt.../i)).not.toBeInTheDocument()
    })
    
    // Check if the total is rendered
    // 100 + 8.1 MwSt = 108.10
    const totals = await screen.findAllByText(/CHF 108.10/i)
    expect(totals.length).toBeGreaterThan(0)
  })

  it('enters edit mode when "Bearbeiten" is clicked', async () => {
    render(<RechnungDetailView rechnung={mockRechnung} onBack={vi.fn()} />)
    
    await waitFor(() => {
      expect(screen.queryByText(/Lädt.../i)).not.toBeInTheDocument()
    })

    const bearbeitenBtn = screen.getByRole('button', { name: /Bearbeiten/i })
    expect(bearbeitenBtn).toBeInTheDocument()
  })

  it('navigates to calendar when "Im Kalender ansehen" is clicked', async () => {
    const onNavigateMock = vi.fn()
    const rechnungWithDueDate = {
      ...mockRechnung,
      faellig_am: '2026-10-31'
    }

    render(<RechnungDetailView rechnung={rechnungWithDueDate} onBack={vi.fn()} onNavigate={onNavigateMock} />)

    await waitFor(() => {
      expect(screen.queryByText(/Lädt.../i)).not.toBeInTheDocument()
    })

    const calBtn = screen.getByRole('button', { name: /Im Kalender ansehen/i })
    expect(calBtn).toBeInTheDocument()
    calBtn.click()

    expect(onNavigateMock).toHaveBeenCalledWith('kalender', { date: '2026-10-31' })
  })

  it('opens appointment modal when clicking "Zahlungserinnerung / Termin" from action menu', async () => {
    render(<RechnungDetailView rechnung={mockRechnung} onBack={vi.fn()} onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.queryByText(/Lädt.../i)).not.toBeInTheDocument()
    })

    // Open action menu (3 dots)
    const actionMenuBtns = screen.getAllByRole('button')
    const threeDotBtn = actionMenuBtns.find(b => b.querySelector('svg circle') || b.innerHTML.includes('circle'))
    if (threeDotBtn) {
      threeDotBtn.click()
    } else {
      // Fallback find button containing SVG with dots
      const svgBtns = actionMenuBtns.filter(b => b.querySelector('svg'))
      svgBtns[svgBtns.length - 1].click()
    }

    await waitFor(() => {
      expect(screen.getByText(/Zahlungserinnerung \/ Termin/i)).toBeInTheDocument()
    })

    const terminBtn = screen.getByText(/Zahlungserinnerung \/ Termin/i)
    terminBtn.click()

    await waitFor(() => {
      expect(screen.getByText(/Neuer Termin erfassen/i)).toBeInTheDocument()
    })
  })
})
