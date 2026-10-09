import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SignaturePad from '../SignaturePad'

describe('SignaturePad', () => {
  beforeEach(() => {
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
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mockSignData')
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 400,
      height: 200,
      right: 400,
      bottom: 200
    }))
  })

  it('renders input for customer name and canvas', () => {
    render(<SignaturePad initialName="Beatrix Brunner" onSignatureChange={vi.fn()} />)

    expect(screen.getByDisplayValue('Beatrix Brunner')).toBeInTheDocument()
    expect(screen.getByText(/Hier unterschreiben/i)).toBeInTheDocument()
  })

  it('handles name changes', () => {
    const handleSigChange = vi.fn()
    render(<SignaturePad initialName="Hans Muster" onSignatureChange={handleSigChange} />)

    const input = screen.getByDisplayValue('Hans Muster')
    fireEvent.change(input, { target: { value: 'Max Frisch' } })
    expect(input.value).toBe('Max Frisch')
  })

  it('allows drawing with pointer events and triggers onSignatureChange', () => {
    const handleSigChange = vi.fn()
    const { container } = render(<SignaturePad initialName="Hans Muster" onSignatureChange={handleSigChange} />)

    const canvas = container.querySelector('canvas')
    expect(canvas).toBeInTheDocument()

    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 })
    fireEvent.pointerMove(canvas, { clientX: 50, clientY: 50 })
    fireEvent.pointerUp(canvas)

    expect(handleSigChange).toHaveBeenCalledWith(expect.objectContaining({
      signatureData: 'data:image/png;base64,mockSignData',
      signerName: 'Hans Muster',
      hasSignature: true
    }))
  })

  it('clears signature when clear button is clicked', () => {
    const handleSigChange = vi.fn()
    const { container } = render(<SignaturePad initialName="Hans Muster" onSignatureChange={handleSigChange} />)

    const canvas = container.querySelector('canvas')
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 })
    fireEvent.pointerMove(canvas, { clientX: 50, clientY: 50 })
    fireEvent.pointerUp(canvas)

    const clearBtn = screen.getByText(/Unterschrift löschen/i)
    expect(clearBtn).toBeInTheDocument()

    fireEvent.click(clearBtn)
    expect(handleSigChange).toHaveBeenLastCalledWith(expect.objectContaining({
      signatureData: null,
      signerName: 'Hans Muster',
      hasSignature: false
    }))
  })
})
