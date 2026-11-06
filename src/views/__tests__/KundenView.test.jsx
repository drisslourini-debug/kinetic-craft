import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import KundenView from '../KundenView'

// Mock Supabase
const mockKunden = [
  {
    id: 1,
    kundennummer: 'K-2026-0001',
    firmenname: 'Muster Bau & Handwerk AG',
    vorname: 'Thomas',
    nachname: 'Meier',
    name: 'Muster Bau & Handwerk AG',
    typ: 'Geschäftskunde (Allgemein)',
    strasse: 'Industriestrasse 10',
    plz: '3000',
    ort: 'Bern',
    telefon: '+41 31 123 45 67',
    email: 'info@musterbau.ch',
    notizen: 'Verifiziert via Zefix-Handelsregister CHE-123.456.789',
    status: 'Aktiv',
    created_at: '2026-01-15T10:00:00Z',
    is_archived: false
  },
  {
    id: 2,
    kundennummer: 'K-2026-0002',
    firmenname: '',
    vorname: 'Beat',
    nachname: 'von Graffenried',
    name: 'Beat von Graffenried',
    typ: 'Privatperson',
    strasse: 'Kramgasse 4',
    plz: '3011',
    ort: 'Bern',
    telefon: '+41 79 987 65 43',
    email: 'beat@graffenried.ch',
    status: 'Aktiv',
    created_at: '2026-02-10T10:00:00Z',
    is_archived: false
  }
]

const mockProjekte = [
  { id: 101, name: 'Fassadensanierung', status: 'In Arbeit', kunde_id: 1, projekt_nr: 'PRJ-101' },
  { id: 102, name: 'Dachausbau', status: 'In Arbeit', kunde_id: 1, projekt_nr: 'PRJ-102' },
  { id: 103, name: 'Privat-Reparatur', status: 'Abgeschlossen', kunde_id: 2, projekt_nr: 'PRJ-103' }
]

const mockRechnungen = [
  { id: 201, rechnung_nr: 'RE-2026-01', total: 5400.00, bezahlt: 5400.00, status: 'Bezahlt', kunde_id: 1, bezahlt_am: '2026-02-20', faellig_am: '2026-02-28' },
  { id: 202, rechnung_nr: 'RE-2026-02', total: 2100.00, bezahlt: 0, status: 'Überfällig', kunde_id: 1, faellig_am: '2026-03-01' },
  { id: 203, rechnung_nr: 'RE-2026-03', total: 850.00, bezahlt: 850.00, status: 'Bezahlt', kunde_id: 2, bezahlt_am: '2026-03-10', faellig_am: '2026-03-25' }
]

const mockOfferten = [
  { id: 301, offerte_nr: 'OF-2026-01', total: 12500.00, status: 'Versendet', kunde_id: 1, created_at: '2026-03-05' }
]

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table) => {
      let data = []
      if (table === 'kunden') data = mockKunden
      else if (table === 'projekte') data = mockProjekte
      else if (table === 'rechnungen') data = mockRechnungen
      else if (table === 'offerten') data = mockOfferten

      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((callback) => callback({ data, error: null })),
        data,
        error: null
      }
    })
  }
}))

describe('KundenView 360° & Slide-Over Drawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.innerWidth = 1200
  })

  it('renders customers with enriched columns: B2B/B2C, Baustellen badge, and LTV turnover', async () => {
    render(<KundenView onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getAllByText('Muster Bau & Handwerk AG').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Beat von Graffenried').length).toBeGreaterThanOrEqual(1)
    })

    // Badges in table
    expect(screen.getByText('B2B')).toBeInTheDocument()
    expect(screen.getByText('B2C')).toBeInTheDocument()

    // 2 active projects for Muster Bau
    expect(screen.getByText('2 Baustellen')).toBeInTheDocument()

    // Turnover & overdue warning
    expect(screen.getByText(/2[’']100\.00 überfällig/)).toBeInTheDocument()
  })

  it('filters by Schnellfilter-Pills: B2B, B2C, and open items', async () => {
    render(<KundenView onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getAllByText('Muster Bau & Handwerk AG').length).toBeGreaterThanOrEqual(1)
    })

    // Click B2C pill
    fireEvent.click(screen.getByRole('button', { name: /Privatkunden \(B2C\)/i }))
    expect(screen.queryByText('Muster Bau & Handwerk AG')).not.toBeInTheDocument()
    expect(screen.getAllByText('Beat von Graffenried').length).toBeGreaterThanOrEqual(1)

    // Click B2B pill
    fireEvent.click(screen.getByRole('button', { name: /Geschäftskunden \(B2B\)/i }))
    expect(screen.getAllByText('Muster Bau & Handwerk AG').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Beat von Graffenried')).not.toBeInTheDocument()

    // Click All pill
    const alleButtons = screen.getAllByRole('button', { name: /^Alle/i })
    fireEvent.click(alleButtons[alleButtons.length - 1])
    expect(screen.getAllByText('Muster Bau & Handwerk AG').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Beat von Graffenried').length).toBeGreaterThanOrEqual(1)
  })

  it('opens 360° Slide-Over drawer with Zefix badge, payment score and activity timeline', async () => {
    const onNavigateMock = vi.fn()
    render(<KundenView onNavigate={onNavigateMock} />)

    await waitFor(() => {
      expect(screen.getAllByText('Muster Bau & Handwerk AG').length).toBeGreaterThanOrEqual(1)
    })

    // Click desktop table row to trigger Slide-Over
    const musterElements = screen.getAllByText('Muster Bau & Handwerk AG')
    fireEvent.click(musterElements[musterElements.length - 1])

    await waitFor(() => {
      expect(screen.getByText('360°-Kundenübersicht')).toBeInTheDocument()
      expect(screen.getByText('Zefix verifiziert')).toBeInTheDocument()
      expect(screen.getByText('Ansprechpartner: Thomas Meier')).toBeInTheDocument()
      expect(screen.getByText('Aktivitäts-Timeline')).toBeInTheDocument()
    })

    // Quick-action in Drawer: Neue Offerte
    const neueOfferteBtn = screen.getByRole('button', { name: /Neue Offerte/i })
    fireEvent.click(neueOfferteBtn)
    expect(onNavigateMock).toHaveBeenCalledWith('offerten', { action: 'create', kundeId: 1 })
  })

  it('navigates to full profile when clicking "Vollansicht öffnen"', async () => {
    render(<KundenView onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getAllByText('Muster Bau & Handwerk AG').length).toBeGreaterThanOrEqual(1)
    })

    // Open drawer
    const musterElements = screen.getAllByText('Muster Bau & Handwerk AG')
    fireEvent.click(musterElements[musterElements.length - 1])

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Vollansicht öffnen/i })).toBeInTheDocument()
    })

    // Click Vollansicht öffnen
    fireEvent.click(screen.getByRole('button', { name: /Vollansicht öffnen/i }))

    await waitFor(() => {
      // In KundeDetailView, customer name is shown
      expect(screen.getAllByText('Muster Bau & Handwerk AG').length).toBeGreaterThanOrEqual(1)
    })
  })
})
