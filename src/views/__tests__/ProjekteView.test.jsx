import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ProjekteView from '../ProjekteView'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockProjects = [
  {
    id: 'p-10',
    name: 'Dachstockausbau Winterthur',
    status: 'In Planung',
    startdatum: '2026-08-01',
    enddatum: '2026-09-15',
    kunden_id: 'k-1',
    kunden: { name: 'Peter Keller' },
    created_at: '2026-07-01'
  }
]

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockProjects, error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null })
    }))
  }
}))

vi.mock('../../lib/formatters', () => ({
  formatDate: (d) => d
}))

describe('ProjekteView Calendar Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders project list and opens 3-dot dropdown with calendar options', async () => {
    const onNavigateMock = vi.fn()
    render(<ProjekteView onNavigate={onNavigateMock} />)

    await waitFor(() => {
      expect(screen.getByText('Dachstockausbau Winterthur')).toBeInTheDocument()
    })

    // Find the 3-dots button for the project
    const buttons = screen.getAllByRole('button')
    const menuBtn = buttons.find(b => b.querySelector('svg circle') || b.querySelector('svg path'))
    fireEvent.click(menuBtn)

    await waitFor(() => {
      expect(screen.getByText(/Im Kalender anzeigen/i)).toBeInTheDocument()
      expect(screen.getByText(/Termin erfassen/i)).toBeInTheDocument()
    })

    // Click "Im Kalender anzeigen"
    const calLink = screen.getByText(/Im Kalender anzeigen/i)
    fireEvent.click(calLink)

    expect(onNavigateMock).toHaveBeenCalledWith('kalender', {
      date: '2026-08-01',
      projektId: 'p-10'
    })
  })

  it('navigates to calendar create modal when clicking "Termin erfassen"', async () => {
    const onNavigateMock = vi.fn()
    render(<ProjekteView onNavigate={onNavigateMock} />)

    await waitFor(() => {
      expect(screen.getByText('Dachstockausbau Winterthur')).toBeInTheDocument()
    })

    const buttons = screen.getAllByRole('button')
    const menuBtn = buttons.find(b => b.querySelector('svg circle') || b.querySelector('svg path'))
    fireEvent.click(menuBtn)

    await waitFor(() => {
      expect(screen.getByText(/Termin erfassen/i)).toBeInTheDocument()
    })

    const createTerminBtn = screen.getByText(/Termin erfassen/i)
    fireEvent.click(createTerminBtn)

    expect(onNavigateMock).toHaveBeenCalledWith('kalender', {
      action: 'create',
      projektId: 'p-10',
      date: '2026-08-01'
    })
  })
})
