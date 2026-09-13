import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ProjektCreateModal from '../ProjektCreateModal'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockKunden = [
  { id: 'k-1', name: 'Muster AG' }
]

const insertMock = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table) => {
      if (table === 'kunden') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockKunden, error: null })
        }
      }
      if (table === 'projekte') {
        return {
          insert: insertMock.mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [{ id: 'p-new', name: 'Neues Dach', startdatum: '2026-09-01', enddatum: '2026-10-01' }],
              error: null
            })
          })
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      }
    })
  }
}))

describe('ProjektCreateModal Calendar Dates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders startdatum and enddatum inputs and submits them to supabase', async () => {
    const onSuccessMock = vi.fn()
    render(<ProjektCreateModal onClose={vi.fn()} onSuccess={onSuccessMock} />)

    await waitFor(() => {
      expect(screen.getByText('Muster AG')).toBeInTheDocument()
    })

    // Fill project name
    const nameInput = screen.getByPlaceholderText(/z\.B\. Fassadensanierung Meier/i)
    fireEvent.change(nameInput, { target: { value: 'Neues Dach' } })

    // Select customer
    const kundenSelect = screen.getAllByRole('combobox')[0]
    fireEvent.change(kundenSelect, { target: { value: 'k-1' } })

    // Fill start and end date
    const dateInputs = document.querySelectorAll('input[type="date"]')
    expect(dateInputs.length).toBe(2)

    fireEvent.change(dateInputs[0], { target: { value: '2026-09-01' } })
    fireEvent.change(dateInputs[1], { target: { value: '2026-10-01' } })

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Projekt erstellen/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          name: 'Neues Dach',
          kunden_id: 'k-1',
          startdatum: '2026-09-01',
          enddatum: '2026-10-01',
          status: 'Aktiv'
        })
      ]))
    })
    expect(onSuccessMock).toHaveBeenCalled()
  })
})
