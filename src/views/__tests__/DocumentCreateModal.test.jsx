import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import DocumentCreateModal from '../../components/DocumentCreateModal'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockKunden = [
  { id: '101', name: 'Muster AG' }
]

const mockProjekte = [
  { id: '202', kunden_id: '101', name: 'Projekt Neubau' }
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
      if (table === 'einstellungen') {
        return {
          select: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ 
            data: { startnummer_offerten: 1000, startnummer_rechnungen: 2000 }, 
            error: null 
          })
        }
      }
      if (table === 'projekte') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockProjekte, error: null })
        }
      }
      if (table === 'offerten' || table === 'rechnungen') {
        return {
          select: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          insert: insertMock.mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [{ 
                id: 999, 
                offerte_nr: 'OF-2026-1001',
                kunden_id: '101',
                kunden: { name: 'Muster AG' },
                projekte: { name: 'Projekt Neubau', adresse: 'Bahnhofstrasse 1' }
              }],
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

describe('DocumentCreateModal Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('preselects initialKundeId and initialProjektId if provided', async () => {
    render(
      <DocumentCreateModal 
        type="offerte"
        isOpen={true}
        initialKundeId="101"
        initialProjektId="202"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Muster AG')).toBeInTheDocument()
    })

    const kundeSelect = screen.getAllByRole('combobox')[0]
    expect(kundeSelect.value).toBe('101')
  })

  it('creates offerte and calls onSuccess with the created document without triggering onClose', async () => {
    const onCloseMock = vi.fn()
    const onSuccessMock = vi.fn()

    render(
      <DocumentCreateModal 
        type="offerte"
        isOpen={true}
        initialKundeId="101"
        onClose={onCloseMock}
        onSuccess={onSuccessMock}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Muster AG')).toBeInTheDocument()
    })

    const submitBtn = screen.getByRole('button', { name: /Weiter zum Editor/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalled()
      expect(onSuccessMock).toHaveBeenCalledWith(expect.objectContaining({
        id: 999,
        kunden_id: '101'
      }))
    })

    // onClose must NOT be called on success, preventing history.back() race condition
    expect(onCloseMock).not.toHaveBeenCalled()
  })
})
