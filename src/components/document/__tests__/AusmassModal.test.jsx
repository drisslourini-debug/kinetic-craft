import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AusmassModal from '../AusmassModal'

describe('AusmassModal', () => {
  const dummyPosition = {
    posNr: '1.1',
    npk_code: '675.211.200',
    beschreibung: 'Wandanstrich Dispersion 2x deckend',
    einheit: 'm²',
    menge: 0,
    ausmass_details: []
  }

  it('renders correctly when open', () => {
    render(
      <AusmassModal
        isOpen={true}
        onClose={vi.fn()}
        position={dummyPosition}
        onSaveAusmass={vi.fn()}
      />
    )

    expect(screen.getByText(/Schweizer Bau-Ausmass & SIA 118 Rechner/i)).toBeInTheDocument()
    expect(screen.getByText(/Wandanstrich Dispersion 2x deckend/i)).toBeInTheDocument()
    expect(screen.getByText(/NPK 675.211.200/i)).toBeInTheDocument()
    expect(screen.getAllByText(/SIA 118/i).length).toBeGreaterThanOrEqual(1)
  })

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <AusmassModal
        isOpen={false}
        onClose={vi.fn()}
        position={dummyPosition}
        onSaveAusmass={vi.fn()}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('adds quick template lines when clicked (e.g. Raum Vorlage)', () => {
    render(
      <AusmassModal
        isOpen={true}
        onClose={vi.fn()}
        position={dummyPosition}
        onSaveAusmass={vi.fn()}
      />
    )

    const raumButton = screen.getByRole('button', { name: /\+ Raum/i })
    fireEvent.click(raumButton)

    // Should create template lines including Wand Nord/Süd and Tür T1
    expect(screen.getByDisplayValue('Wand Nord/Süd')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Tür T1')).toBeInTheDocument()
    // Tür T1 is 1.89m² <= 2.50m², so SIA 118 übermessen badge appears
    expect(screen.getAllByText(/übermessen/i).length).toBeGreaterThanOrEqual(1)
  })

  it('adds quick template for Decke', () => {
    render(
      <AusmassModal
        isOpen={true}
        onClose={vi.fn()}
        position={dummyPosition}
        onSaveAusmass={vi.fn()}
      />
    )

    const deckeButton = screen.getByRole('button', { name: /\+ Decke/i })
    fireEvent.click(deckeButton)

    expect(screen.getByDisplayValue('Deckenfläche')).toBeInTheDocument()
  })

  it('saves calculated netto menge on Übernehmen', () => {
    const handleSaveAusmass = vi.fn()
    render(
      <AusmassModal
        isOpen={true}
        onClose={vi.fn()}
        position={{
          ...dummyPosition,
          ausmass_details: [
            {
              id: '1',
              bezeichnung: 'Fläche Wohnzimmer',
              laenge: 5,
              breite: 4,
              hoehe: null,
              anzahl: 1,
              isAbzug: false,
              forceAbzug: false
            }
          ]
        }}
        onSaveAusmass={handleSaveAusmass}
      />
    )

    // Netto should be 20.00
    expect(screen.getAllByText(/20\.00/i).length).toBeGreaterThanOrEqual(1)

    const saveButton = screen.getByRole('button', { name: /Ausmass übernehmen/i })
    fireEvent.click(saveButton)

    expect(handleSaveAusmass).toHaveBeenCalledTimes(1)
    const [savedMenge, savedDetails] = handleSaveAusmass.mock.calls[0]
    expect(savedMenge).toBe(20)
    expect(savedDetails.length).toBe(1)
    expect(savedDetails[0].bezeichnung).toBe('Fläche Wohnzimmer')
  })

  it('supports read-only mode for inspecting without editing', () => {
    render(
      <AusmassModal
        isOpen={true}
        onClose={vi.fn()}
        readOnly={true}
        position={{
          ...dummyPosition,
          ausmass_details: [
            {
              id: '1',
              bezeichnung: 'Bestehende Messung',
              laenge: 10,
              breite: 2,
              hoehe: null,
              anzahl: 1,
              isAbzug: false,
              forceAbzug: false
            }
          ]
        }}
        onSaveAusmass={vi.fn()}
      />
    )

    // Schnell-Vorlagen buttons should not be present in read-only
    expect(screen.queryByRole('button', { name: /\+ Raum/i })).toBeNull()
    // Should display the row values in display value
    expect(screen.getByDisplayValue('Bestehende Messung')).toBeInTheDocument()
    // Save button should not be present, only close button
    expect(screen.queryByRole('button', { name: /Menge in Position übernehmen/i })).toBeNull()
    expect(screen.getAllByRole('button', { name: /Schliessen/i }).length).toBeGreaterThanOrEqual(1)
  })
})
