import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RapportCreateModal from '../RapportCreateModal'

// Mock supabase
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'rap-123',
              rapport_nr: 'RAP-2026-0001',
              status: 'Unterschrieben'
            },
            error: null
          })
        }))
      }))
    }))
  }
}))

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString()
    }),
    clear: vi.fn(() => {
      store = {}
    })
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })

describe('RapportCreateModal', () => {
  const mockProjekt = { id: 'p1', name: 'Sanierung Bad', adresse: 'Bahnhofstrasse 12, 8001 Zürich' }
  const mockKunde = { id: 'k1', name: 'Hans Muster', firmenname: 'Muster AG' }

  beforeEach(() => {
    localStorageMock.clear()
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      scale: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn()
    }))
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mockSignature')
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 400,
      height: 200,
      right: 400,
      bottom: 200
    }))
  })

  it('renders Step 1 (Arbeiten & Stunden) when opened', () => {
    render(
      <RapportCreateModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveSuccess={vi.fn()}
        projekt={mockProjekt}
        kunde={mockKunde}
        userName="Marco Rossi"
      />
    )

    expect(screen.getByText('Neuer Regierapport')).toBeInTheDocument()
    expect(screen.getByText(/Sanierung Bad/i)).toBeInTheDocument()
    expect(screen.getByText(/1\. Stunden & Arbeiten/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Wanddurchbruch/i)).toBeInTheDocument()
  })

  it('allows adding hours and navigating to step 2 (Material)', () => {
    render(
      <RapportCreateModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveSuccess={vi.fn()}
        projekt={mockProjekt}
        kunde={mockKunde}
        userName="Marco Rossi"
      />
    )

    // Add description
    const descInput = screen.getByPlaceholderText(/Wanddurchbruch/i)
    fireEvent.change(descInput, { target: { value: 'Leitungen verlegt und angeschlossen' } })

    // Click "Weiter →" button to go to Material
    const nextBtn = screen.getByText('Weiter →')
    fireEvent.click(nextBtn)

    expect(screen.getByText(/2\. Material/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /\+ Material hinzufügen/i })).toBeInTheDocument()
  })

  it('allows adding material rows in step 2', () => {
    render(
      <RapportCreateModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveSuccess={vi.fn()}
        projekt={mockProjekt}
        kunde={mockKunde}
        userName="Marco Rossi"
      />
    )

    // Step 1 -> Step 2
    fireEvent.click(screen.getByText('Weiter →'))

    // Click Add Material
    const addMatBtn = screen.getByRole('button', { name: /\+ Material hinzufügen/i })
    fireEvent.click(addMatBtn)

    expect(screen.getByPlaceholderText(/Tiefgrund/i)).toBeInTheDocument()
  })

  it('allows saving directly as draft without signature', async () => {
    const handleSuccess = vi.fn()
    const handleClose = vi.fn()

    render(
      <RapportCreateModal
        isOpen={true}
        onClose={handleClose}
        onSaveSuccess={handleSuccess}
        projekt={mockProjekt}
        kunde={mockKunde}
        userName="Marco Rossi"
      />
    )

    const draftBtn = screen.getByText(/Als Entwurf speichern/i)
    fireEvent.click(draftBtn)

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalled()
      expect(handleClose).toHaveBeenCalled()
    })
  })

  it('disables complete button in step 3 before signing', async () => {
    render(
      <RapportCreateModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveSuccess={vi.fn()}
        projekt={mockProjekt}
        kunde={mockKunde}
        userName="Marco Rossi"
      />
    )

    // Step 1 -> Step 2
    fireEvent.click(screen.getByText('Weiter →'))

    // Step 2 -> Step 3
    fireEvent.click(screen.getByText('Weiter →'))

    expect(screen.getByText(/3\. Kundenunterschrift/i)).toBeInTheDocument()

    // "Rapport abschliessen & signieren" button should be disabled
    const completeBtn = screen.getByText(/Rapport abschliessen & signieren/i)
    expect(completeBtn.closest('button')).toBeDisabled()
  })

  it('completes successfully with customer signature in step 3', async () => {
    const handleSuccess = vi.fn()
    const handleClose = vi.fn()

    const { container } = render(
      <RapportCreateModal
        isOpen={true}
        onClose={handleClose}
        onSaveSuccess={handleSuccess}
        projekt={mockProjekt}
        kunde={mockKunde}
        userName="Marco Rossi"
      />
    )

    // Go to step 3
    fireEvent.click(screen.getByText('Weiter →'))
    fireEvent.click(screen.getByText('Weiter →'))

    // Draw signature
    const canvas = container.querySelector('canvas')
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 })
    fireEvent.pointerMove(canvas, { clientX: 50, clientY: 50 })
    fireEvent.pointerUp(canvas)

    // Complete and sign button is now enabled
    const completeBtn = screen.getByText(/Rapport abschliessen & signieren/i)
    expect(completeBtn.closest('button')).not.toBeDisabled()
    fireEvent.click(completeBtn)

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalled()
      expect(handleClose).toHaveBeenCalled()
    })
  })
})
