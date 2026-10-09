import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ImpressumModal from '../ImpressumModal'
import DatenschutzModal from '../DatenschutzModal'
import DsgBanner from '../DsgBanner'

// Mock localStorage for test environment
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString()
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

describe('ImpressumModal (Swiss Compliance UWG Art. 3)', () => {
  it('renders company name, UID, Swiss address, and disclaimer', () => {
    const onClose = vi.fn()
    render(<ImpressumModal isOpen={true} onClose={onClose} />)

    expect(screen.getByText(/Kinetic Idrissi/i)).toBeInTheDocument()
    expect(screen.getAllByText(/CHE-123\.456\.789/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Schweiz/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Haftungsausschluss/i)).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<ImpressumModal isOpen={true} onClose={onClose} />)

    const closeBtns = screen.getAllByRole('button', { name: /schliessen/i })
    fireEvent.click(closeBtns[0])
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not render when isOpen is false', () => {
    const { container } = render(<ImpressumModal isOpen={false} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('DatenschutzModal (Swiss DSG Compliance)', () => {
  it('renders Swiss DSG terminology, Vercel Edge EU, and Supabase ISO 27001 info', () => {
    const onClose = vi.fn()
    render(<DatenschutzModal isOpen={true} onClose={onClose} />)

    expect(screen.getByText(/Schweizer Datenschutzgesetz \(DSG\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Vercel Edge Network/i)).toBeInTheDocument()
    expect(screen.getByText(/Supabase Inc\./i)).toBeInTheDocument()
    expect(screen.getByText(/ISO\/IEC 27001/i)).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<DatenschutzModal isOpen={true} onClose={onClose} />)

    const closeBtn = screen.getByRole('button', { name: /verstanden & schliessen/i })
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('DsgBanner', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('renders privacy banner when not yet dismissed', () => {
    const onOpenDatenschutz = vi.fn()
    render(<DsgBanner onOpenDatenschutz={onOpenDatenschutz} />)

    expect(screen.getByText(/Schweizer Datenschutz \(DSG\)/i)).toBeInTheDocument()
    expect(screen.getByText(/100% werbefrei/i)).toBeInTheDocument()
  })

  it('triggers onOpenDatenschutz when clicking more info link', () => {
    const onOpenDatenschutz = vi.fn()
    render(<DsgBanner onOpenDatenschutz={onOpenDatenschutz} />)

    const detailsBtn = screen.getByRole('button', { name: /details \(dse\)/i })
    fireEvent.click(detailsBtn)
    expect(onOpenDatenschutz).toHaveBeenCalledTimes(1)
  })

  it('dismisses banner and sets localStorage item when acknowledged', () => {
    render(<DsgBanner onOpenDatenschutz={vi.fn()} />)

    const acceptBtn = screen.getByRole('button', { name: /einverstanden/i })
    fireEvent.click(acceptBtn)

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'kinetic_dsg_banner_dismissed',
      'true'
    )
    expect(screen.queryByText(/Schweizer Datenschutz \(DSG\)/i)).not.toBeInTheDocument()
  })
})
