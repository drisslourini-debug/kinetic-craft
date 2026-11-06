import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProjektKanbanBoard from '../ProjektKanbanBoard'

describe('ProjektKanbanBoard Component', () => {
  const mockProjekte = [
    {
      id: 'p-1',
      name: 'Fassadensanierung Thun',
      status: 'In Arbeit',
      bauphase: 'in_ausfuehrung',
      kunden: { name: 'Muster AG' }
    },
    {
      id: 'p-2',
      name: 'Malerarbeiten Spiez',
      status: 'Abgeschlossen',
      bauphase: 'abgerechnet',
      kunden: { name: 'Hans Meier' }
    }
  ]

  it('renders 5 phase columns and organizes projects into their respective columns', () => {
    render(<ProjektKanbanBoard projekte={mockProjekte} />)

    expect(screen.getByText('Offerte angenommen')).toBeInTheDocument()
    expect(screen.getByText('Material bestellt')).toBeInTheDocument()
    expect(screen.getByText('In Ausführung (Aktiv)')).toBeInTheDocument()
    expect(screen.getByText('Abnahme & Regie')).toBeInTheDocument()
    expect(screen.getByText('Abgerechnet')).toBeInTheDocument()

    expect(screen.getByText('Fassadensanierung Thun')).toBeInTheDocument()
    expect(screen.getByText('Malerarbeiten Spiez')).toBeInTheDocument()
  })

  it('calls onSelectProjekt when a card is clicked', () => {
    const onSelectMock = vi.fn()
    render(<ProjektKanbanBoard projekte={mockProjekte} onSelectProjekt={onSelectMock} />)

    fireEvent.click(screen.getByText('Fassadensanierung Thun'))
    expect(onSelectMock).toHaveBeenCalledWith(mockProjekte[0])
  })
})
