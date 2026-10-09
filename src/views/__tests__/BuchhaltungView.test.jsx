import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BuchhaltungView from '../BuchhaltungView'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table) => {
      if (table === 'einstellungen') {
        return {
          select: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              mwst_methode: 'effektiv',
              mwst_abrechnungsart: 'vereinbart',
              saldosteuersatz: 5.9,
              konto_bank: '1020',
              konto_debitoren: '1100',
              konto_kreditoren: '2000',
              konto_ertrag: '3200',
              konto_skonto: '3800'
            },
            error: null
          })
        }
      }
      if (table === 'ausgaben') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'ag-1',
                titel: 'Farbe & Pinsel',
                kategorie: 'Material',
                betrag_netto: 200,
                mwst_satz: 8.1,
                mwst_betrag: 16.20,
                betrag_brutto: 216.20,
                beleg_datum: '2026-02-15',
                status: 'Bezahlt'
              }
            ],
            error: null
          })
        }
      }
      if (table === 'rechnungen') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'r-1',
                rechnung_nr: 'RE-2026-001',
                total: 1000,
                bezahlt: 400,
                status: 'Teilbezahlt',
                rechnungsdatum: '2026-02-01',
                faellig_am: '2026-03-01',
                daten: {
                  konditionen: { mwst: 8.1 },
                  zahlungen: [{ datum: '2026-02-10', betrag: 400, typ: 'Teilzahlung' }]
                },
                kunden: { name: 'Musterkunde' }
              }
            ],
            error: null
          })
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      }
    })
  }
}))

vi.mock('../../lib/formatters', () => ({
  formatMoney: (val) => Number(val || 0).toFixed(2),
  formatCurrency: (val) => `CHF ${Number(val || 0).toFixed(2)}`,
  formatDate: (val) => val
}))

describe('BuchhaltungView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders header, Schweizer legal reference OR 957 ff., and tabs', async () => {
    render(<BuchhaltungView onNavigate={vi.fn()} userRole="admin" />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Buchhaltung & Steuern/i })).toBeInTheDocument()
      expect(screen.getAllByText(/OR 957 ff\./i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/Ausgaben & Belege/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/Offene Posten \(OP-Liste\)/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/ESTV MWST \(Formular 200\)/i).length).toBeGreaterThanOrEqual(1)
    })
  })

  it('switches to OP-Liste and displays Swiss Delkredere calculation (Art. 960e OR)', async () => {
    render(<BuchhaltungView onNavigate={vi.fn()} userRole="admin" />)

    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getAllByText('CHF 1000.00').length).toBeGreaterThanOrEqual(1)
    })

    const opTab = screen.getByTestId('tab-op-liste')
    fireEvent.click(opTab)

    await waitFor(() => {
      expect(screen.getAllByText(/Delkredere 5%/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText(/Stichtags-Debitorenspiegel/i)).toBeInTheDocument()
      expect(screen.getAllByText('RE-2026-001').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('CHF 600.00').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('switches to ESTV MWST tab and displays Formular 200 Kennziffern', async () => {
    render(<BuchhaltungView onNavigate={vi.fn()} userRole="admin" />)

    await waitFor(() => {
      expect(screen.getByTestId('tab-estv-mwst')).toBeInTheDocument()
    })

    const estvTab = screen.getByTestId('tab-estv-mwst')
    fireEvent.click(estvTab)

    await waitFor(() => {
      expect(screen.getByText(/Eidgenössische Steuerverwaltung \(ESTV\) - Formular 200/i)).toBeInTheDocument()
      expect(screen.getByText('200')).toBeInTheDocument()
      expect(screen.getByText('289')).toBeInTheDocument()
      expect(screen.getByText('382')).toBeInTheDocument()
      expect(screen.getByText('400')).toBeInTheDocument()
      expect(screen.getByText('500')).toBeInTheDocument()
      // Mobile Kennziffern cards
      expect(screen.getAllByText(/Ziff\. 200/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/Ziff\. 500/i).length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders mobile top bar with scan button and toggles export menu', async () => {
    render(<BuchhaltungView onNavigate={vi.fn()} userRole="admin" />)

    await waitFor(() => {
      expect(screen.getAllByText(/Beleg scannen/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByTitle('Exporte & Treuhand')).toBeInTheDocument()
    })

    const exportBtn = screen.getByTitle('Exporte & Treuhand')
    fireEvent.click(exportBtn)

    await waitFor(() => {
      expect(screen.getByText(/Treuhand-Revisions-ZIP/i)).toBeInTheDocument()
      expect(screen.getByText(/Banana Doppelt \(1100\)/i)).toBeInTheDocument()
      expect(screen.getByText(/ESTV Formular 200 CSV/i)).toBeInTheDocument()
      expect(screen.getByText(/OP-Liste Debitoren CSV/i)).toBeInTheDocument()
    })
  })

  it('opens and closes mobile filter bottom sheet', async () => {
    render(<BuchhaltungView onNavigate={vi.fn()} userRole="admin" />)

    await waitFor(() => {
      expect(screen.getAllByTitle('Filter & Suche').length).toBeGreaterThanOrEqual(1)
    })

    const filterBtns = screen.getAllByTitle('Filter & Suche')
    fireEvent.click(filterBtns[0])

    await waitFor(() => {
      expect(screen.getAllByText(/Filter & Suche/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByPlaceholderText(/Beleg, Projekt, Titel suchen\.\.\./i)).toBeInTheDocument()
    })

    // Close button
    const closeBtn = screen.getByLabelText('Schliessen')
    fireEvent.click(closeBtn)

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/Beleg, Projekt, Titel suchen\.\.\./i)).not.toBeInTheDocument()
    })
  })
})
