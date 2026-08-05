import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import OfferteLeistungsTabelle from '../OfferteLeistungsTabelle'
import { describe, it, expect, vi } from 'vitest'

// Mock formatMoney since it is used in the component
vi.mock('../../../lib/utils', () => ({
  formatMoney: (val) => Number(val).toFixed(2)
}))

describe('OfferteLeistungsTabelle', () => {
  const defaultProps = {
    isEditing: true,
    leistungen: [],
    editLeistungen: [],
    onChangeLeistungen: vi.fn(),
    mwst: 8.1,
  }

  it('renders empty state correctly in read mode', () => {
    render(<OfferteLeistungsTabelle {...defaultProps} isEditing={false} />)
    expect(screen.getByText(/Keine Leistungen gefunden/i)).toBeInTheDocument()
  })

  it('renders "Position hinzufügen" button in edit mode', () => {
    render(<OfferteLeistungsTabelle {...defaultProps} />)
    const addButton = screen.getByRole('button', { name: /Position hinzufügen/i })
    expect(addButton).toBeInTheDocument()
  })

  it('adds a new position when form is submitted', () => {
    const onChangeSpy = vi.fn()
    render(<OfferteLeistungsTabelle {...defaultProps} onChangeLeistungen={onChangeSpy} />)
    
    const addButton = screen.getByRole('button', { name: /Position hinzufügen/i })
    fireEvent.click(addButton)
    
    const descInput = screen.getByPlaceholderText(/Was wird geliefert/i)
    fireEvent.change(descInput, { target: { value: 'Test Position' } })
    
    // The submit button is "Hinzufügen"
    const submitBtn = screen.getByText('Hinzufügen')
    fireEvent.click(submitBtn)
    
    expect(onChangeSpy).toHaveBeenCalledTimes(1)
    const updatedList = onChangeSpy.mock.calls[0][0]
    expect(updatedList).toHaveLength(1)
    expect(updatedList[0].beschreibung).toBe('Test Position')
  })

  it('can edit a position description', () => {
    const onChangeSpy = vi.fn()
    const editLeistungen = [
      { _id: '123', beschreibung: 'Alt', type: 'position' }
    ]
    render(<OfferteLeistungsTabelle {...defaultProps} editLeistungen={editLeistungen} onChangeLeistungen={onChangeSpy} />)
    
    const descInput = screen.getByPlaceholderText(/Beschreibung.../i)
    fireEvent.change(descInput, { target: { value: 'Neu' } })
    
    expect(onChangeSpy).toHaveBeenCalledTimes(1)
    expect(onChangeSpy.mock.calls[0][0][0].beschreibung).toBe('Neu')
  })

  it('can delete an existing position', () => {
    const onChangeSpy = vi.fn()
    const editLeistungen = [
      { _id: '123', beschreibung: 'To Delete', type: 'position' }
    ]
    render(<OfferteLeistungsTabelle {...defaultProps} editLeistungen={editLeistungen} onChangeLeistungen={onChangeSpy} />)
    
    // Find delete button (has title "Löschen")
    const deleteBtn = screen.getByTitle('Löschen')
    fireEvent.click(deleteBtn)
    
    // Should call onChangeLeistungen with empty array
    expect(onChangeSpy).toHaveBeenCalledTimes(1)
    expect(onChangeSpy.mock.calls[0][0]).toHaveLength(0)
  })
})
