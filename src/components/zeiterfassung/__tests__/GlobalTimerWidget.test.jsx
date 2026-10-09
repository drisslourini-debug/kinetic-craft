import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GlobalTimerWidget from '../GlobalTimerWidget'

// Mock supabase
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table) => {
      if (table === 'projekte') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: [
                  { id: '10', name: 'Umbau Küche', kunden: { name: 'Peter Keller' } }
                ],
                error: null
              })
            }))
          }))
        }
      }
      if (table === 'zeiterfassung') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'zeit-1', dauer_stunden: 1.5, status: 'offen' },
                error: null
              })
            }))
          }))
        }
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null })
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

describe('GlobalTimerWidget', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('is completely hidden when idle to avoid blocking UI elements', () => {
    render(<GlobalTimerWidget userName="David Müller" />)

    expect(screen.queryByText('Stopp & Buchen')).not.toBeInTheDocument()
    expect(screen.queryByText('Live-Timer')).not.toBeInTheDocument()
  })

  it('opens start modal via a77-open-timer-start event and allows starting a timer', async () => {
    render(<GlobalTimerWidget userName="David Müller" />)

    // Trigger start modal via custom event
    fireEvent(window, new CustomEvent('a77-open-timer-start', { detail: { projectId: '10' } }))

    await waitFor(() => {
      expect(screen.getByText('Arbeitszeit-Timer starten')).toBeInTheDocument()
    })

    // Wait for projects to load
    await waitFor(() => {
      expect(screen.getByText(/Umbau Küche/i)).toBeInTheDocument()
    })

    // Start timer
    const startBtn = screen.getByText('Timer jetzt starten')
    fireEvent.click(startBtn)

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'atelier77_active_timer',
        expect.stringContaining('Umbau Küche')
      )
    })
  })

  it('renders active timer banner when timer is running in localStorage and supports minimizing', () => {
    const runningTimer = {
      isRunning: true,
      startTime: Date.now() - 3660 * 1000, // 1 hour 1 minute ago
      projektId: '10',
      projektName: 'Umbau Küche',
      mitarbeiterName: 'David Müller',
      taetigkeit: 'Gipserarbeiten',
      ansatz: 95.00
    }
    localStorageMock.setItem('atelier77_active_timer', JSON.stringify(runningTimer))

    render(<GlobalTimerWidget userName="David Müller" />)

    expect(screen.getByText('Stopp & Buchen')).toBeInTheDocument()
    expect(screen.getByText('Umbau Küche')).toBeInTheDocument()

    // Test minimize
    const minimizeBtn = screen.getByTitle('Minimieren')
    fireEvent.click(minimizeBtn)

    expect(screen.queryByText('Umbau Küche')).not.toBeInTheDocument()
    const expandBtn = screen.getByTitle('Timer vergrössern')
    expect(expandBtn).toBeInTheDocument()

    // Test expand
    fireEvent.click(expandBtn)
    expect(screen.getByText('Umbau Küche')).toBeInTheDocument()
  })

  it('opens stop modal and books hours on confirmation', async () => {
    const handleSaved = vi.fn()
    const runningTimer = {
      isRunning: true,
      startTime: Date.now() - 3600 * 1000, // 1 hour ago
      projektId: '10',
      projektName: 'Umbau Küche',
      mitarbeiterName: 'David Müller',
      taetigkeit: 'Gipserarbeiten',
      ansatz: 95.00
    }
    localStorageMock.setItem('atelier77_active_timer', JSON.stringify(runningTimer))

    render(<GlobalTimerWidget userName="David Müller" onEntrySaved={handleSaved} />)

    // Click stop button
    fireEvent.click(screen.getByText('Stopp & Buchen'))

    expect(screen.getByText('Arbeitszeit buchen & stoppen')).toBeInTheDocument()
    expect(screen.getByText('Zu buchende Stunden')).toBeInTheDocument()

    // Confirm book hours
    const bookBtn = screen.getByRole('button', { name: /Zeit buchen/i })
    fireEvent.click(bookBtn)

    await waitFor(() => {
      expect(handleSaved).toHaveBeenCalled()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('atelier77_active_timer')
    })
  })

  it('discards timer when clicking "Timer verwerfen"', () => {
    const runningTimer = {
      isRunning: true,
      startTime: Date.now() - 600 * 1000,
      projektId: '10',
      projektName: 'Umbau Küche',
      mitarbeiterName: 'David Müller',
      taetigkeit: 'Gipserarbeiten',
      ansatz: 95.00
    }
    localStorageMock.setItem('atelier77_active_timer', JSON.stringify(runningTimer))

    render(<GlobalTimerWidget userName="David Müller" />)

    fireEvent.click(screen.getByText('Stopp & Buchen'))
    fireEvent.click(screen.getByText('Timer verwerfen'))

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('atelier77_active_timer')
  })
})
