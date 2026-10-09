import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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
vi.mock('../../lib/formatters', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    formatMoney: (val) => Number(val || 0).toFixed(2),
    formatCurrency: (val) => `CHF ${Number(val || 0).toFixed(2)}`,
    formatDate: (val) => val,
    formatDateLong: (val) => val
  }
})
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
    const threeDotBtn = screen.getByRole('button', { name: /Aktionsmenü/i })
    threeDotBtn.click()

    await waitFor(() => {
      expect(screen.getByText(/Zahlungserinnerung \/ Termin/i)).toBeInTheDocument()
    })

    const terminBtn = screen.getByText(/Zahlungserinnerung \/ Termin/i)
    terminBtn.click()

    await waitFor(() => {
      expect(screen.getByText(/Neuer Termin erfassen/i)).toBeInTheDocument()
    })
  })

  it('renders mobile tab switcher in edit mode and allows switching between Bearbeiten and A4-Vorschau', async () => {
    render(<RechnungDetailView rechnung={mockRechnung} onBack={vi.fn()} onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.queryByText(/Lädt.../i)).not.toBeInTheDocument()
    })

    const bearbeitenBtn = screen.getByRole('button', { name: /Bearbeiten/i })
    fireEvent.click(bearbeitenBtn)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /A4-Vorschau/i })).toBeInTheDocument()
    })

    const a4TabBtn = screen.getByRole('button', { name: /A4-Vorschau/i })
    fireEvent.click(a4TabBtn)

    // A4 preview zoom controls are active
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Ganze Seite/i })).toBeInTheDocument()
    })
    expect(screen.getAllByRole('button', { name: /100%/i }).length).toBeGreaterThan(0)

    // Can switch back to edit form
    const editTabBtn = screen.getByRole('button', { name: /Bearbeiten/i })
    fireEvent.click(editTabBtn)
    expect(screen.getByText(/Live-Total:/i)).toBeInTheDocument()
  })

  it('renders Swiss Mahnwesen banner and opens MahnungModal for overdue invoice', async () => {
    const overdueRechnung = {
      ...mockRechnung,
      status: 'Überfällig',
      faellig_am: '2026-01-01',
      daten: {
        ...mockRechnung.daten,
        mahnstufe: 0
      }
    }

    render(<RechnungDetailView rechnung={overdueRechnung} onBack={vi.fn()} onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.queryByText(/Lädt.../i)).not.toBeInTheDocument()
    })

    // Banner should be visible
    expect(screen.getByText(/Rechnung überfällig:/i)).toBeInTheDocument()
    expect(screen.getByText(/Mahnung Stufe 1 erstellen/i)).toBeInTheDocument()

    // Clicking Mahnung button opens MahnungModal
    const mahnBtn = screen.getByText(/Mahnung Stufe 1 erstellen/i)
    fireEvent.click(mahnBtn)

    await waitFor(() => {
      expect(screen.getByText(/Schweizer Mahnwesen/i)).toBeInTheDocument()
      expect(screen.getByText(/1\. Mahnstufe wählen/i)).toBeInTheDocument()
    })
  })

  it('automatically opens MahnungModal when viewParams.openMahnung is true', async () => {
    const overdueRechnung = {
      ...mockRechnung,
      status: 'Überfällig',
      faellig_am: '2026-01-01'
    }

    render(
      <RechnungDetailView
        rechnung={overdueRechnung}
        onBack={vi.fn()}
        onNavigate={vi.fn()}
        viewParams={{ openMahnung: true }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Schweizer Mahnwesen/i)).toBeInTheDocument()
    })
  })
})
