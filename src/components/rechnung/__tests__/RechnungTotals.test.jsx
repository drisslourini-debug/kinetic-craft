import React from 'react'
import { render, screen } from '@testing-library/react'
import RechnungTotals from '../RechnungTotals'
import { describe, it, expect, vi } from 'vitest'

// Mock formatMoney
vi.mock('../../../lib/formatters', () => ({
  formatMoney: (val) => Number(val).toFixed(2),
  formatCurrency: (val) => `CHF ${Number(val).toFixed(2)}`
}))

describe('RechnungTotals', () => {
  it('renders correctly without rabatt and mwst', () => {
    const props = {
      isEditing: false,
      rawTotal: 1000,
      rabattProzent: 0,
      rabattBetrag: 0,
      mwstProzent: 0,
      mwstBetrag: 0,
      isPauschalActive: false,
      finalTotal: 1000,
      optionalTotal: 0
    }
    render(<RechnungTotals {...props} />)
    
    // Check that Zwischensumme and Total are present
    expect(screen.getByText('Zwischensumme')).toBeInTheDocument()
    // It should render 1000.00 twice (Zwischensumme and Total)
    const amounts = screen.getAllByText(/CHF 1000.00/i)
    expect(amounts).toHaveLength(2)
  })

  it('renders rabatt section if rabatt > 0', () => {
    const props = {
      isEditing: false,
      rawTotal: 1000,
      rabattProzent: 10,
      rabattBetrag: 100,
      mwstProzent: 0,
      mwstBetrag: 0,
      isPauschalActive: false,
      finalTotal: 900,
      optionalTotal: 0
    }
    render(<RechnungTotals {...props} />)
    
    expect(screen.getByText(/Rabatt \(10%\)/i)).toBeInTheDocument()
    expect(screen.getByText(/- CHF 100.00/i)).toBeInTheDocument()
    expect(screen.getByText(/CHF 900.00/i)).toBeInTheDocument()
  })

  it('renders mwst section if mwst > 0', () => {
    const props = {
      isEditing: false,
      rawTotal: 1000,
      rabattProzent: 0,
      rabattBetrag: 0,
      mwstProzent: 8.1,
      mwstBetrag: 81,
      isPauschalActive: false,
      finalTotal: 1081,
      optionalTotal: 0
    }
    render(<RechnungTotals {...props} />)
    
    expect(screen.getByText(/MwSt \(8.1%\)/i)).toBeInTheDocument()
    expect(screen.getByText(/CHF 81.00/i)).toBeInTheDocument()
    expect(screen.getByText(/CHF 1081.00/i)).toBeInTheDocument()
  })

  it('renders pauschalpreis indicator if active and editing', () => {
    const props = {
      isEditing: true,
      rawTotal: 1000,
      rabattProzent: 0,
      rabattBetrag: 0,
      mwstProzent: 0,
      mwstBetrag: 0,
      isPauschalActive: true, // pauschal is active
      finalTotal: 5000,
      optionalTotal: 0
    }
    render(<RechnungTotals {...props} />)
    
    expect(screen.getByText(/Pauschalpreis/i)).toBeInTheDocument()
    expect(screen.getByText(/CHF 5000.00/i)).toBeInTheDocument()
  })

  it('renders optional totals if present and editing', () => {
    const props = {
      isEditing: true,
      rawTotal: 1000,
      rabattProzent: 0,
      rabattBetrag: 0,
      mwstProzent: 0,
      mwstBetrag: 0,
      isPauschalActive: false,
      finalTotal: 1000,
      optionalTotal: 250
    }
    render(<RechnungTotals {...props} />)
    
    expect(screen.getByText(/Optionale Positionen/i)).toBeInTheDocument()
    expect(screen.getByText(/CHF 250.00/i)).toBeInTheDocument()
  })
})
