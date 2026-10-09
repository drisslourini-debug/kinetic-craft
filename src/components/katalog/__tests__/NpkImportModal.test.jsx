import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NpkImportModal from '../NpkImportModal'

describe('NpkImportModal', () => {
  it('renders correctly when open', () => {
    render(
      <NpkImportModal
        isOpen={true}
        onClose={vi.fn()}
        activeKategorie={{ id: 1, name: 'Malerarbeiten' }}
        onImport={vi.fn()}
      />
    )

    expect(screen.getByText(/Schweizer NPK \/ CRB Vorlagen importieren/i)).toBeInTheDocument()
    expect(screen.getByText(/Alle Kapitel/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /675/i })).toBeInTheDocument()
  })

  it('filters positions by search input', () => {
    render(
      <NpkImportModal
        isOpen={true}
        onClose={vi.fn()}
        activeKategorie={{ id: 1, name: 'Malerarbeiten' }}
        onImport={vi.fn()}
      />
    )

    const searchInput = screen.getByPlaceholderText(/NPK-Code, Suchbegriff/i)
    fireEvent.change(searchInput, { target: { value: 'Glasfasergewebe' } })

    expect(screen.getByText(/Glasfasergewebe kleben und beschichten/i)).toBeInTheDocument()
    expect(screen.queryByText(/Bodenbeschichtung 2K-Epoxidharz/i)).toBeNull()
  })

  it('filters positions when clicking chapter chips', () => {
    render(
      <NpkImportModal
        isOpen={true}
        onClose={vi.fn()}
        activeKategorie={{ id: 1, name: 'Malerarbeiten' }}
        onImport={vi.fn()}
      />
    )

    const bodenChapterButton = screen.getByRole('button', { name: /681/i })
    fireEvent.click(bodenChapterButton)

    expect(screen.getByText(/NPK 681.210.100/i)).toBeInTheDocument()
    expect(screen.queryByText(/NPK 675.211.200/i)).toBeNull()
  })

  it('toggles selection and submits to onImport', async () => {
    const handleImport = vi.fn().mockResolvedValue()
    const handleClose = vi.fn()

    render(
      <NpkImportModal
        isOpen={true}
        onClose={handleClose}
        activeKategorie={{ id: 1, name: 'Malerarbeiten' }}
        onImport={handleImport}
      />
    )

    // Initially 0 selected, import button disabled
    const importBtn = screen.getByRole('button', { name: /Keine Positionen gewählt/i })
    expect(importBtn).toBeDisabled()

    // Click on a position to select it
    const posRow = screen.getByText(/Wandanstrich Dispersion 2x deckend/i).closest('div')
    fireEvent.click(posRow)

    const submitBtn = screen.getByRole('button', { name: /1 Position importieren/i })
    expect(submitBtn).not.toBeDisabled()

    // Submit import
    fireEvent.click(submitBtn)

    expect(handleImport).toHaveBeenCalledTimes(1)
    const [payload] = handleImport.mock.calls[0]
    expect(payload.positions.length).toBe(1)
    expect(payload.positions[0].npkCode).toBe('675.211.200')
    expect(payload.targetMode).toBe('current')
  })
})
