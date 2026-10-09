import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import RechnungDetailView from '../RechnungDetailView'
import DocumentCreateModal from '../../components/DocumentCreateModal'
import { calculateSia118Schlussrechnung } from '../../lib/sia118Helper'

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table) => {
      if (table === 'rechnungen') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              { id: '101', rechnung_nr: 'RE-2026-001', rechnungsdatum: '2026-01-15', total: 10000, typ: 'akonto' },
              { id: '102', rechnung_nr: 'RE-2026-002', rechnungsdatum: '2026-02-15', total: 15000, typ: 'akonto' }
            ],
            error: null
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [{ id: '999', rechnung_nr: 'RE-2026-999', typ: 'schluss', total: 12500 }],
              error: null
            })
          })
        }
      }
      if (table === 'kunden') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [{ id: 'k1', name: 'Bauherr Muster' }], error: null }),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'k1', name: 'Bauherr Muster' }, error: null })
        }
      }
      if (table === 'projekte') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [{ id: 'p1', name: 'Neubau Villa', kunden_id: 'k1' }], error: null }),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'p1', name: 'Neubau Villa' }, error: null })
        }
      }
      if (table === 'einstellungen') {
        return {
          select: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { firmenname: 'Atelier 77', startnummer_rechnungen: 1000 }, error: null })
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      }
    })
  }
}))

describe('SIA 118 Schlussrechnung Calculation & Views', () => {
  it('calculates SIA 118 Schlussrechnung correctly with 2 akontos and 5% retention', () => {
    const calc = calculateSia118Schlussrechnung({
      gesamtwerkpreis: 50000,
      akontoAbzuege: [
        { rechnung_nr: 'RE-2026-001', betrag: 15000 },
        { rechnung_nr: 'RE-2026-002', betrag: 20000 }
      ],
      rueckbehalt: {
        aktiv: true,
        prozent: 5.0,
        abgeloestDurchGarantie: false,
        basis: 'gesamtwerkpreis'
      },
      rechnungsdatum: '2026-06-01'
    })

    expect(calc.gesamtwerkpreis).toBe(50000)
    expect(calc.totalAkontoAbzuege).toBe(35000)
    expect(calc.restbetragNachAkonto).toBe(15000)
    // 5% of 50000 = 2500
    expect(calc.garantieBetrag).toBe(2500)
    // 15000 - 2500 = 12500
    expect(calc.faelligerSchlussbetrag).toBe(12500)
    expect(calc.freigabeDatum).toBe('2028-06-01')
  })

  it('renders SIA 118 Card in View Mode with Akonto deductions and Guarantee retention', async () => {
    const mockRechnung = {
      id: 'demo-schluss',
      rechnung_nr: 'RE-2026-118',
      typ: 'schluss',
      status: 'Entwurf',
      total: 12500,
      rechnungsdatum: '2026-06-01',
      daten: {
        is_schlussrechnung: true,
        gesamtwerkpreis: 50000,
        leistungen: [
          { id: '1', posNr: '1', beschreibung: 'Gipser- und Malerarbeiten gemäss Devis', menge: 1, einheit: 'Pauschal', einzelpreis: 50000 }
        ],
        konditionen: { rabatt: 0, mwst: 0 },
        akonto_abzuege: [
          { rechnung_nr: 'RE-2026-001', datum: '2026-02-01', betrag: 15000 },
          { rechnung_nr: 'RE-2026-002', datum: '2026-04-01', betrag: 20000 }
        ],
        sia118: {
          aktiv: true,
          rueckbehalt: {
            aktiv: true,
            prozent: 5.0,
            abgeloestDurchGarantie: false,
            basis: 'gesamtwerkpreis'
          }
        }
      }
    }

    render(
      <RechnungDetailView
        rechnung={mockRechnung}
        onBack={vi.fn()}
        onNavigate={vi.fn()}
        userRole="admin"
      />
    )

    // Check SIA 118 Badges and Titles
    expect(await screen.findByText('SIA 118 Schlussabrechnung & Baugarantie')).toBeInTheDocument()
    expect(screen.getByText('Art. 154 (Akonto)')).toBeInTheDocument()
    expect(screen.getByText('Art. 181 (5% Garantie)')).toBeInTheDocument()

    // Check deducted Akonto lines
    expect(screen.getByText(/– Akonto RE-2026-001/i)).toBeInTheDocument()
    expect(screen.getByText(/– Akonto RE-2026-002/i)).toBeInTheDocument()

    // Check Fälliger Schlussbetrag
    expect(screen.getAllByText(/FÄLLIGER SCHLUSSBETRAG/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/12[’']500\.00/i).length).toBeGreaterThan(0)
  })

  it('allows selecting SIA 118 Schlussrechnung in DocumentCreateModal', async () => {
    render(
      <DocumentCreateModal
        type="rechnung"
        isOpen={true}
        initialKundeId="k1"
        initialProjektId="p1"
        initialRechnungTyp="schluss"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Bauherr Muster')).toBeInTheDocument()
    })

    // Check that SIA 118 button is selected and info banner is rendered
    expect(screen.getByText('SIA 118 Schluss')).toBeInTheDocument()
    expect(screen.getByText(/SIA 118 Konformität:/i)).toBeInTheDocument()
    expect(screen.getByText(/Frühere Akonto-Rechnungen des Projekts werden automatisch angerechnet/i)).toBeInTheDocument()
  })
})
