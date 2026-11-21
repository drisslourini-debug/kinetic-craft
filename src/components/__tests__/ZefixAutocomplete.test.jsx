import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ZefixAutocomplete from '../ZefixAutocomplete'

describe('ZefixAutocomplete Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('renders input with Swiss commercial registry placeholder', () => {
    render(<ZefixAutocomplete onSelect={vi.fn()} />)
    const input = screen.getByPlaceholderText(/Firma im Schweizer Handelsregister suchen/i)
    expect(input).toBeInTheDocument()
  })

  it('performs debounced search and renders matching results from /api/zefix', async () => {
    const mockCompanies = [
      {
        ehraid: 12345,
        name: 'Maler Meister AG',
        seat: 'Bern',
        uidFormatted: 'CHE-111.222.333',
        legalForm: { name: { de: 'Aktiengesellschaft (AG)' } }
      }
    ]

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/zefix?search=Maler')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ list: mockCompanies, total: 1 })
        })
      }
      return Promise.resolve({ ok: false, status: 404 })
    })

    const handleSelect = vi.fn()
    render(<ZefixAutocomplete onSelect={handleSelect} />)

    const input = screen.getByPlaceholderText(/Firma im Schweizer Handelsregister suchen/i)
    fireEvent.change(input, { target: { value: 'Maler' } })

    await waitFor(() => {
      expect(screen.getByText('Maler Meister AG')).toBeInTheDocument()
    })

    expect(screen.getByText(/Bern · CHE-111.222.333 · Aktiengesellschaft \(AG\)/i)).toBeInTheDocument()

    // Click company
    fireEvent.click(screen.getByText('Maler Meister AG'))

    await waitFor(() => {
      expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining({
        firmenname: 'Maler Meister AG',
        ort: 'Bern',
        uid: 'CHE-111.222.333',
        rechtsform: 'Aktiengesellschaft (AG)',
        land: 'Schweiz'
      }))
    })
  })

  it('displays accurate no-results state and allows manual adoption when search returns 0 results', async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        json: async () => ({ list: [], total: 0 })
      })
    })

    const handleSelect = vi.fn()
    render(<ZefixAutocomplete onSelect={handleSelect} />)

    const input = screen.getByPlaceholderText(/Firma im Schweizer Handelsregister suchen/i)
    fireEvent.change(input, { target: { value: 'adstatus ag' } })

    await waitFor(() => {
      expect(screen.getByText(/Keine Einträge für «adstatus ag» im Schweizer Handelsregister gefunden/i)).toBeInTheDocument()
    })

    const adoptBtn = screen.getByRole('button', { name: /als Firmenname übernehmen/i })
    expect(adoptBtn).toBeInTheDocument()

    fireEvent.click(adoptBtn)

    expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining({
      firmenname: 'adstatus ag',
      land: 'Schweiz'
    }))
  })
})
