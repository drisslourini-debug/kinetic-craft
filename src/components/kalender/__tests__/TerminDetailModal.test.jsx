import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import TerminDetailModal from '../TerminDetailModal'
import { describe, it, expect, vi } from 'vitest'

describe('TerminDetailModal', () => {
  it('renders synthetic invoice event with quick actions and navigates to invoice', () => {
    const onNavigateMock = vi.fn()
    const onCloseMock = vi.fn()

    const invoiceTermin = {
      id: 'rech-42',
      originalId: 42,
      isSyntheticInvoice: true,
      rechnung_nr: 'RE-2026-0042',
      titel: '💰 Rechnung RE-2026-0042 (CHF 1\'500.00)',
      datum: '2026-11-20',
      end_datum: '2026-11-20',
      status: 'Versendet',
      typ: 'Frist',
      total: 1500,
      kunden: { name: 'Alpha Immobilien AG' }
    }

    render(
      <TerminDetailModal
        isOpen={true}
        termin={invoiceTermin}
        onClose={onCloseMock}
        onNavigate={onNavigateMock}
      />
    )

    expect(screen.getByText(/Rechnungs-Fälligkeit/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Alpha Immobilien AG/i).length).toBeGreaterThan(0)

    const openBtn = screen.getByRole('button', { name: /Rechnung öffnen/i })
    expect(openBtn).toBeInTheDocument()
    fireEvent.click(openBtn)

    expect(onNavigateMock).toHaveBeenCalledWith('rechnungen', { rechnungId: 42 })
    expect(onCloseMock).toHaveBeenCalled()
  })

  it('renders synthetic quote event and allows navigation and scheduling', () => {
    const onNavigateMock = vi.fn()
    const onEditMock = vi.fn()

    const quoteTermin = {
      id: 'off-15',
      originalId: 15,
      isSyntheticQuote: true,
      titel: 'Offerte #15',
      datum: '2026-10-31',
      end_datum: '2026-10-31',
      status: 'Versendet',
      typ: 'Frist',
      total: 3200,
      kunden: { id: 'k-9', name: 'Beta Architekten' }
    }

    render(
      <TerminDetailModal
        isOpen={true}
        termin={quoteTermin}
        onClose={vi.fn()}
        onNavigate={onNavigateMock}
        onEdit={onEditMock}
      />
    )

    expect(screen.getByText(/Offerten-Frist/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Beta Architekten/i).length).toBeGreaterThan(0)

    const openBtn = screen.getByRole('button', { name: /Offerte öffnen/i })
    fireEvent.click(openBtn)
    expect(onNavigateMock).toHaveBeenCalledWith('offerten', { offerteId: 15 })

    const nachfassenBtn = screen.getByRole('button', { name: /\+ Nachfassen planen/i })
    fireEvent.click(nachfassenBtn)
    expect(onEditMock).toHaveBeenCalled()
  })

  it('renders synthetic project event and navigates to project', () => {
    const onNavigateMock = vi.fn()

    const projectTermin = {
      id: 'proj-99',
      originalId: 99,
      isSyntheticProject: true,
      titel: '🏗️ Umbau Villa Zürichberg',
      datum: '2026-05-01',
      end_datum: '2026-08-31',
      status: 'In Bearbeitung',
      typ: 'Projekt',
      projekt_id: 99,
      ort: 'Bergstrasse 10, 8044 Zürich',
      projekte: {
        id: 99,
        name: 'Umbau Villa Zürichberg',
        adresse: 'Bergstrasse 10, 8044 Zürich',
        kunden: { name: 'Familie Weber' }
      },
      kunden: { name: 'Familie Weber' }
    }

    render(
      <TerminDetailModal
        isOpen={true}
        termin={projectTermin}
        onClose={vi.fn()}
        onNavigate={onNavigateMock}
      />
    )

    expect(screen.getByText(/Projekt-Laufzeit/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Umbau Villa Zürichberg/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Bergstrasse 10, 8044 Zürich/i).length).toBeGreaterThan(0)

    const openBtn = screen.getByRole('button', { name: /Zum Projekt springen/i })
    fireEvent.click(openBtn)
    expect(onNavigateMock).toHaveBeenCalledWith('projekte', { projektId: 99, activeTab: 'termine' })
  })
})
