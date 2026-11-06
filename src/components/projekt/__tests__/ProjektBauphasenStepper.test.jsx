import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProjektBauphasenStepper, { BAUPHASEN, resolveProjektPhase } from '../ProjektBauphasenStepper'

describe('ProjektBauphasenStepper Component', () => {
  it('renders all 5 Swiss construction phases', () => {
    render(<ProjektBauphasenStepper currentPhase="in_ausfuehrung" />)

    expect(screen.getByText('Offerte angenommen')).toBeInTheDocument()
    expect(screen.getByText('Material bestellt')).toBeInTheDocument()
    expect(screen.getByText('In Ausführung (Aktiv)')).toBeInTheDocument()
    expect(screen.getByText('Abnahme & Regie')).toBeInTheDocument()
    expect(screen.getByText('Abgerechnet')).toBeInTheDocument()
  })

  it('calls onPhaseChange when clicking an inactive step', () => {
    const onPhaseChangeMock = vi.fn()
    render(
      <ProjektBauphasenStepper
        currentPhase="offerte_angenommen"
        onPhaseChange={onPhaseChangeMock}
      />
    )

    const step3Btn = screen.getByRole('button', { name: /In Ausführung/i })
    fireEvent.click(step3Btn)

    expect(onPhaseChangeMock).toHaveBeenCalledWith('in_ausfuehrung')
  })

  it('correctly resolves phases based on project properties', () => {
    expect(resolveProjektPhase({ status: 'Abgeschlossen' })).toBe('abgerechnet')
    expect(resolveProjektPhase({ status: 'In Arbeit' })).toBe('in_ausfuehrung')
    expect(resolveProjektPhase({ status: 'In Planung' }, [], [{ status: 'Unterschrieben' }])).toBe('abnahme_regie')
    expect(resolveProjektPhase({ status: 'In Planung' }, [], [], [{ id: 1 }])).toBe('material_bestellt')
    expect(resolveProjektPhase({ status: 'In Planung' })).toBe('offerte_angenommen')
  })
})
