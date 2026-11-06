import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProjektCockpit from '../ProjektCockpit'

describe('ProjektCockpit Component', () => {
  const mockProjekt = {
    id: 'p-1',
    name: 'Sanierung Altstadt Bern',
    adresse: 'Postgasse 14, 3011 Bern',
    status: 'In Arbeit',
    startdatum: '2026-10-01'
  }

  const mockTermine = [
    { id: 't-1', titel: 'Gerüst stellen', datum: '2026-10-15', uhrzeit: '08:00', status: 'Bestätigt', ort: 'Postgasse 14' }
  ]

  const mockZeiterfassung = [
    { id: 'z-1', taetigkeit: 'Fassadenreinigung', mitarbeiter_name: 'Peter', datum: '2026-10-14', dauer_stunden: 3.5, verrechenbar: true }
  ]

  const mockRapporte = [
    { id: 'r-1', rapport_nr: 'RAP-2026-001', datum: '2026-10-12', beschreibung: 'Sockel abdichten', status: 'Unterschrieben' }
  ]

  const mockAusgaben = [
    { id: 'a-1', lieferant: 'Malerbedarf Bern AG', beleg_datum: '2026-10-10', betrag_brutto: 240.50 }
  ]

  it('renders Operatives & Finanzen and Fotodoku sections', () => {
    render(
      <ProjektCockpit
        projekt={mockProjekt}
        termine={mockTermine}
        zeiterfassungEntries={mockZeiterfassung}
        rapporte={mockRapporte}
        ausgaben={mockAusgaben}
      />
    )

    // Left column checks
    expect(screen.getByText('Terminierte Baustelleneinsätze')).toBeInTheDocument()
    expect(screen.getByText('Gerüst stellen')).toBeInTheDocument()
    expect(screen.getByText('Zeiterfassung & Gestempelte Stunden')).toBeInTheDocument()
    expect(screen.getByText('Fassadenreinigung')).toBeInTheDocument()
    expect(screen.getByText('Regierapporte & Baustellenberichte')).toBeInTheDocument()
    expect(screen.getByText('#RAP-2026-001')).toBeInTheDocument()
    expect(screen.getByText('Materialausgaben & Belege')).toBeInTheDocument()
    expect(screen.getByText('Malerbedarf Bern AG')).toBeInTheDocument()

    // Right column checks
    expect(screen.getByText('Baustellen-Fotodokumentation')).toBeInTheDocument()
    expect(screen.getByText(/Fotos per Drag & Drop hier ablegen/i)).toBeInTheDocument()
  })

  it('triggers invoice creation when "In Rechnung stellen" is clicked on signed rapport', () => {
    const onInvoiceMock = vi.fn()
    render(
      <ProjektCockpit
        projekt={mockProjekt}
        rapporte={mockRapporte}
        onCreateInvoiceFromRapport={onInvoiceMock}
      />
    )

    const invoiceBtn = screen.getByRole('button', { name: /In Rechnung stellen/i })
    expect(invoiceBtn).toBeInTheDocument()
    fireEvent.click(invoiceBtn)

    expect(onInvoiceMock).toHaveBeenCalledWith(mockRapporte[0])
  })

  it('toggles photo filter between Vorher, Nachher, and Alle', () => {
    render(
      <ProjektCockpit
        projekt={mockProjekt}
      />
    )

    const vorherBtn = screen.getByRole('button', { name: /Filter Vorher/i })
    fireEvent.click(vorherBtn)
    expect(screen.getByText('Baustelle_Vorher_2484.jpg')).toBeInTheDocument()

    const nachherBtn = screen.getByRole('button', { name: /Filter Nachher/i })
    fireEvent.click(nachherBtn)
    expect(screen.getByText('Baustelle_Nachher_2491.jpg')).toBeInTheDocument()
  })
})
