import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ZeiterfassungTab from '../ZeiterfassungTab'

// Mock supabase
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table) => {
      if (table === 'zeiterfassung') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: '1',
                    projekt_id: 'p1',
                    mitarbeiter_name: 'Silvan',
                    taetigkeit: 'Montage Spülkasten',
                    datum: '2026-10-06',
                    dauer_stunden: 3.5,
                    ansatz: 95.0,
                    status: 'offen'
                  },
                  {
                    id: '2',
                    projekt_id: 'p1',
                    mitarbeiter_name: 'Silvan',
                    taetigkeit: 'Druckprüfung',
                    datum: '2026-10-05',
                    dauer_stunden: 1.5,
                    ansatz: 95.0,
                    status: 'im_rapport'
                  }
                ],
                error: null
              })
            }))
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: '3',
                  projekt_id: 'p1',
                  mitarbeiter_name: 'Silvan',
                  taetigkeit: 'Verrohrung',
                  datum: '2026-10-06',
                  dauer_stunden: 2.0,
                  ansatz: 95.0,
                  status: 'offen'
                },
                error: null
              })
            }))
          })),
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null })
          }))
        }
      }
      return {
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
      }
    })
  }
}))

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    })
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })

describe('ZeiterfassungTab', () => {
  const mockProjekt = { id: 'p1', kunden_id: 'k1', name: 'Sanierung Nasszelle', budget_stunden: 20 }
  const mockKunde = { id: 'k1', name: 'Reto Schmid' }

  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('renders budget monitoring card and time entries table', async () => {
    render(
      <ZeiterfassungTab
        projekt={mockProjekt}
        kunde={mockKunde}
        userName="Silvan"
      />
    )

    // Budget card
    expect(screen.getByText('Stunden-Budget & Soll/Ist-Vergleich')).toBeInTheDocument()
    expect(screen.getAllByText(/20\s*h/i).length).toBeGreaterThanOrEqual(1)

    // Table rows
    await waitFor(() => {
      expect(screen.getByText('Montage Spülkasten')).toBeInTheDocument()
      expect(screen.getByText(/3\.50\s*h/i)).toBeInTheDocument()
      expect(screen.getByText('Offen')).toBeInTheDocument()
      expect(screen.getByText('Im Rapport')).toBeInTheDocument()
    })
  })

  it('allows manual time entry via collapsible form', async () => {
    render(
      <ZeiterfassungTab
        projekt={mockProjekt}
        kunde={mockKunde}
        userName="Silvan"
      />
    )

    // Open manual form
    const toggleBtn = screen.getByRole('button', { name: /Manuell erfassen/i })
    fireEvent.click(toggleBtn)

    expect(screen.getByText('Manuelle Zeiterfassung')).toBeInTheDocument()

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Buchen/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.queryByText('Manuelle Zeiterfassung')).not.toBeInTheDocument()
    })
  })

  it('selects open entries and triggers rapport conversion callback', async () => {
    const handleCreateRapport = vi.fn()
    render(
      <ZeiterfassungTab
        projekt={mockProjekt}
        kunde={mockKunde}
        userName="Silvan"
        onCreateRapportFromHours={handleCreateRapport}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Montage Spülkasten')).toBeInTheDocument()
    })

    // Click checkbox of the open entry
    const checkboxes = screen.getAllByRole('checkbox')
    // First checkbox in header (select all), second checkbox is row 1
    fireEvent.click(checkboxes[1])

    // Batch bar appears
    expect(screen.getByText(/In Regierapport übernehmen/i)).toBeInTheDocument()

    fireEvent.click(screen.getByText(/In Regierapport übernehmen/i))
    expect(handleCreateRapport).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: '1', taetigkeit: 'Montage Spülkasten' })
      ])
    )
  })

  it('triggers invoice conversion callback for selected hours', async () => {
    const handleCreateInvoice = vi.fn()
    render(
      <ZeiterfassungTab
        projekt={mockProjekt}
        kunde={mockKunde}
        userName="Silvan"
        onCreateInvoiceFromHours={handleCreateInvoice}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Montage Spülkasten')).toBeInTheDocument()
    })

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])

    const invBtn = screen.getByText(/Direkt in Rechnung stellen/i)
    fireEvent.click(invBtn)

    expect(handleCreateInvoice).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: '1', taetigkeit: 'Montage Spülkasten' })
      ])
    )
  })

  it('starts live timer for this project when clicking header button', () => {
    render(
      <ZeiterfassungTab
        projekt={mockProjekt}
        kunde={mockKunde}
        userName="Silvan"
      />
    )

    const startBtn = screen.getByText('Timer für dieses Projekt starten')
    fireEvent.click(startBtn)

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'atelier77_active_timer',
      expect.stringContaining('Sanierung Nasszelle')
    )
  })
})
