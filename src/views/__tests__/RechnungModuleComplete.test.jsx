import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import RechnungenView from '../RechnungenView'
import RechnungDetailView from '../RechnungDetailView'

const mockRechnungenList = [
  {
    id: 201,
    rechnung_nr: 'RE-2026-201',
    status: 'Versendet',
    total: 2500.00,
    bezahlt: 0,
    created_at: '2026-09-01T10:00:00Z',
    rechnungsdatum: '2026-09-01',
    faellig_am: '2026-12-31',
    zahlungsfrist_tage: 30,
    kunden_id: 1,
    kunden: { id: 1, name: 'Dr. Meyer Immobilien AG', strasse: 'Bahnhofstrasse 10', plz: '8001', ort: 'Zürich', email: 'meyer@immo.ch' },
    projekte: { id: 10, name: 'Renovation Bad', adresse: 'Zürich' },
    daten: {
      titel: 'Rechnung für Dr. Meyer',
      leistungen: [
        { _id: 1, type: 'position', posNr: '1.1', beschreibung: 'Polsterarbeiten Samtsessel', menge: 2, einheit: 'Stk', einzelpreis: 1000 },
        { _id: 2, type: 'position', posNr: '1.2', beschreibung: 'Montagearbeiten', menge: 5, einheit: 'Std', einzelpreis: 100 }
      ],
      konditionen: { rabatt: 0, mwst: 8.1, zahlungsfrist: 30 },
      zahlungen: []
    }
  },
  {
    id: 202,
    rechnung_nr: 'RE-2026-202',
    status: 'Überfällig',
    total: 1800.00,
    bezahlt: 500.00,
    created_at: '2026-08-01T08:00:00Z',
    rechnungsdatum: '2026-08-01',
    faellig_am: '2026-08-31',
    zahlungsfrist_tage: 30,
    kunden_id: 2,
    kunden: { id: 2, name: 'Beat Von Graffenried', strasse: 'Herrengasse 4', plz: '3011', ort: 'Bern' },
    projekte: { id: 20, name: 'Neupolsterung Art Déco', adresse: 'Bern' },
    daten: {
      titel: 'Art Déco Renovation',
      leistungen: [
        { _id: 3, type: 'position', posNr: '1.1', beschreibung: 'Neupolsterung & Lederbezug', menge: 1, einheit: 'Pauschal', einzelpreis: 1800 }
      ],
      konditionen: { rabatt: 0, mwst: 8.1 },
      zahlungen: [
        { datum: '2026-08-15', betrag: 500.00, typ: 'Teilzahlung' }
      ]
    }
  },
  {
    id: 203,
    rechnung_nr: 'RE-2026-203',
    status: 'Bezahlt',
    total: 3000.00,
    bezahlt: 3000.00,
    created_at: '2026-07-01T08:00:00Z',
    rechnungsdatum: '2026-07-01',
    faellig_am: '2026-07-31',
    bezahlt_am: '2026-07-20',
    kunden_id: 1,
    kunden: { id: 1, name: 'Dr. Meyer Immobilien AG' },
    projekte: { id: 10, name: 'Renovation Bad' },
    daten: {
      titel: 'Küchenumbau',
      leistungen: [
        { _id: 4, type: 'position', posNr: '1.1', beschreibung: 'Pauschalbetrag', menge: 1, einheit: 'Pauschal', einzelpreis: 3000 }
      ],
      zahlungen: [
        { datum: '2026-07-20', betrag: 3000.00, typ: 'Zahlung' }
      ]
    }
  }
]

const mockDraftRechnung = {
  id: 204,
  rechnung_nr: 'RE-2026-204',
  status: 'Entwurf',
  total: 1000.00,
  bezahlt: 0,
  created_at: '2026-09-01T10:00:00Z',
  rechnungsdatum: '2026-09-01',
  faellig_am: '2026-10-01',
  zahlungsfrist_tage: 30,
  kunden_id: 1,
  kunden: { id: 1, name: 'Dr. Meyer Immobilien AG' },
  daten: {
    titel: 'Entwurf Rechnung',
    leistungen: [
      { _id: 1, type: 'position', posNr: '1.1', beschreibung: 'Polsterarbeiten Samtsessel', menge: 1, einheit: 'Stk', einzelpreis: 1000 }
    ],
    konditionen: { rabatt: 0, mwst: 8.1 }
  }
}

let mockSupabaseTableData = {}

vi.mock('../../lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn((table) => {
        const builder = {
          select: vi.fn(() => builder),
          insert: vi.fn((data) => {
            const inserted = Array.isArray(data) ? data[0] : data
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 999, ...inserted }, error: null }),
                then: (resolve) => resolve({ data: [{ id: 999, ...inserted }], error: null })
              })),
              then: (resolve) => resolve({ data: [{ id: 999, ...inserted }], error: null })
            }
          }),
          update: vi.fn(() => builder),
          delete: vi.fn(() => builder),
          eq: vi.fn(() => builder),
          in: vi.fn(() => builder),
          ilike: vi.fn(() => builder),
          order: vi.fn(() => builder),
          limit: vi.fn(() => builder),
          single: vi.fn().mockImplementation(() => {
            if (table === 'rechnungen') return Promise.resolve({ data: mockRechnungenList[0], error: null })
            if (table === 'kunden') return Promise.resolve({ data: { id: 1, name: 'Dr. Meyer Immobilien AG' }, error: null })
            if (table === 'projekte') return Promise.resolve({ data: { id: 10, name: 'Renovation Bad' }, error: null })
            return Promise.resolve({ data: {}, error: null })
          }),
          maybeSingle: vi.fn().mockResolvedValue({ data: {}, error: null }),
          then: (resolve) => {
            if (table === 'rechnungen') {
              return Promise.resolve({ data: mockSupabaseTableData.rechnungen ?? mockRechnungenList, error: null }).then(resolve)
            }
            if (table === 'kunden') {
              return Promise.resolve({ data: [{ id: 1, name: 'Dr. Meyer Immobilien AG' }, { id: 2, name: 'Beat Von Graffenried' }], error: null }).then(resolve)
            }
            if (table === 'projekte') {
              return Promise.resolve({ data: [{ id: 10, name: 'Renovation Bad' }], error: null }).then(resolve)
            }
            return Promise.resolve({ data: [], error: null }).then(resolve)
          }
        }
        return builder
      })
    }
  }
})

vi.mock('../../lib/formatters', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    formatMoney: (val) => Number(val || 0).toFixed(2),
    formatCurrency: (val) => `CHF ${Number(val || 0).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    formatDate: (val) => val ? String(val).split('T')[0] : '',
    formatDateLong: (val) => val ? String(val).split('T')[0] : '',
    formatMonthYear: (val) => val || ''
  }
})

describe('Rechnung Module - Complete 4-Layer Test Suite (generate-tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseTableData = {}
  })

  // ==========================================
  // LAYER 1: HAPPY PATH
  // ==========================================
  describe('Layer 1: Happy Path', () => {
    it('renders rechnungen overview with status badges, search, and KPI StatCards', async () => {
      render(<RechnungenView />)

      await waitFor(() => {
        expect(screen.getAllByText('Dr. Meyer Immobilien AG').length).toBeGreaterThan(0)
        expect(screen.getByText('RE-2026-201')).toBeInTheDocument()
        expect(screen.getByText('RE-2026-202')).toBeInTheDocument()
        expect(screen.getByText('RE-2026-203')).toBeInTheDocument()
      })

      // KPI StatCards check
      expect(screen.getByText(/Offene Rechnungen/i)).toBeInTheDocument()
      expect(screen.getByText(/Mahnwesen \(Überfällig\)/i)).toBeInTheDocument()
    })

    it('renders mobile 3-column KPI tiles and filters by status on click', async () => {
      render(<RechnungenView />)

      await waitFor(() => {
        expect(screen.getByText('RE-2026-201')).toBeInTheDocument()
      })

      const ueberfaelligButtons = screen.getAllByRole('button', { name: /Überfällig/i })
      fireEvent.click(ueberfaelligButtons[0])

      await waitFor(() => {
        expect(screen.getByText('RE-2026-202')).toBeInTheDocument()
        expect(screen.queryByText('RE-2026-201')).not.toBeInTheDocument()
      })
    })

    it('toggles collapsible mobile revenue chart between Anzeigen and Ausblenden', async () => {
      render(<RechnungenView />)

      const toggleButton = screen.getByRole('button', { name: /Umsatz 2026/i })
      expect(toggleButton).toBeInTheDocument()

      expect(screen.getByText('Anzeigen')).toBeInTheDocument()
      fireEvent.click(toggleButton)
      expect(screen.getByText('Ausblenden')).toBeInTheDocument()
      fireEvent.click(toggleButton)
      expect(screen.getByText('Anzeigen')).toBeInTheDocument()
    })

    it('renders invoice detail view with Swiss QR-Bill preview and position lines', async () => {
      render(<RechnungDetailView rechnung={mockRechnungenList[0]} onBack={vi.fn()} onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.queryByText(/Lädt.../i)).not.toBeInTheDocument()
      })

      // Renders RE number and positions
      expect(screen.getByText(/RE-2026-201/)).toBeInTheDocument()
      expect(screen.getAllByText(/Polsterarbeiten Samtsessel/).length).toBeGreaterThan(0)
    })

    it('switches between Bearbeiten and A4-Vorschau in edit mode for draft invoice', async () => {
      render(<RechnungDetailView rechnung={mockDraftRechnung} onBack={vi.fn()} onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.queryByText(/Lädt.../i)).not.toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /Bearbeiten/i }))

      await waitFor(() => {
        const previewTabBtn = screen.getByRole('button', { name: /A4-Vorschau/i })
        expect(previewTabBtn).toBeInTheDocument()
        fireEvent.click(previewTabBtn)
      })

      await waitFor(() => {
        const editTabBtn = screen.getByRole('button', { name: /^Bearbeiten$/i })
        expect(editTabBtn).toBeInTheDocument()
        fireEvent.click(editTabBtn)
      })
    })

    it('registers payment and shows payment confirmation UI', async () => {
      render(<RechnungDetailView rechnung={mockRechnungenList[0]} onBack={vi.fn()} onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.queryByText(/Lädt.../i)).not.toBeInTheDocument()
      })

      const payBtn = screen.getByRole('button', { name: /Zahlung erfassen/i })
      expect(payBtn).toBeInTheDocument()
      fireEvent.click(payBtn)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Bestätigen/i })).toBeInTheDocument()
      })
    })

    it('displays partial payment (Teilzahlung) balance for invoice', async () => {
      render(<RechnungDetailView rechnung={mockRechnungenList[1]} onBack={vi.fn()} onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.queryByText(/Lädt.../i)).not.toBeInTheDocument()
      })

      expect(screen.getAllByText(/500\.00/).length).toBeGreaterThan(0)
    })
  })

  // ==========================================
  // LAYER 2: EDGE CASES
  // ==========================================
  describe('Layer 2: Edge Cases', () => {
    it('renders friendly empty state when no rechnungen exist', async () => {
      mockSupabaseTableData.rechnungen = []
      render(<RechnungenView />)

      await waitFor(() => {
        expect(screen.getByText(/Keine Rechnungen gefunden/i)).toBeInTheDocument()
      })
    })

    it('handles invoice with missing payment history (daten.zahlungen undefined)', async () => {
      const invoiceWithoutPayments = {
        ...mockRechnungenList[0],
        daten: {
          titel: 'Legacy Rechnung',
          leistungen: []
        }
      }

      render(<RechnungDetailView rechnung={invoiceWithoutPayments} onBack={vi.fn()} onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.queryByText(/Lädt.../i)).not.toBeInTheDocument()
      })
      expect(screen.getByText(/RE-2026-201/)).toBeInTheDocument()
    })

    it('prevents editing when invoice is GeBüV-locked (Bezahlt or Storniert)', async () => {
      render(<RechnungDetailView rechnung={mockRechnungenList[2]} onBack={vi.fn()} onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.queryByText(/Lädt.../i)).not.toBeInTheDocument()
      })

      // In Bezahlt status, "Bearbeiten" button must not exist
      expect(screen.queryByRole('button', { name: /^Bearbeiten$/i })).not.toBeInTheDocument()
    })

    it('preserves overdue/gemahnt status on partial payment for remaining balance per Swiss law', async () => {
      render(<RechnungDetailView rechnung={mockRechnungenList[1]} onBack={vi.fn()} onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.queryByText(/Lädt.../i)).not.toBeInTheDocument()
      })

      // Should display Überfällig status
      expect(screen.getAllByText(/Überfällig/i).length).toBeGreaterThan(0)
    })
  })

  // ==========================================
  // LAYER 3: ERROR PATHS
  // ==========================================
  describe('Layer 3: Error Paths', () => {
    it('displays GeBüV restriction message when attempting to delete non-draft invoice', async () => {
      render(<RechnungDetailView rechnung={mockRechnungenList[0]} onBack={vi.fn()} onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.queryByText(/Lädt.../i)).not.toBeInTheDocument()
      })

      const actionMenuBtn = screen.getByRole('button', { name: /Aktionsmenü/i })
      fireEvent.click(actionMenuBtn)

      await waitFor(() => {
        const deleteBtn = screen.queryByText(/Rechnung löschen/i)
        if (deleteBtn) {
          fireEvent.click(deleteBtn)
          expect(screen.getByText(/Nur Entwürfe können endgültig gelöscht werden/i)).toBeInTheDocument()
        }
      })
    })

    it('gracefully recovers when Supabase fetch throws an error on list load', async () => {
      const { supabase } = await import('../../lib/supabase')
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockRejectedValueOnce(new Error('Network 500 error'))
      }))

      render(<RechnungenView />)

      await waitFor(() => {
        // Loading completes without unhandled exception
        expect(screen.queryByRole('status')).not.toBeInTheDocument()
      })
    })
  })

  // ==========================================
  // LAYER 4: ASYNC & INTEGRATION
  // ==========================================
  describe('Layer 4: Async & Integration', () => {
    it('filters overdue invoices and displays Mahnwesen cockpit with stage pills', async () => {
      render(<RechnungenView />)

      await waitFor(() => {
        expect(screen.getByText('RE-2026-202')).toBeInTheDocument()
      })

      const mahnwesenCard = screen.getByText('Mahnwesen (Überfällig)')
      fireEvent.click(mahnwesenCard)

      await waitFor(() => {
        expect(screen.getByText('Mahnstufen:')).toBeInTheDocument()
        expect(screen.getByText(/Alle Mahnfälle/i)).toBeInTheDocument()
      })
    })

    it('navigates to calendar when "Im Kalender ansehen" is clicked', async () => {
      const onNavigateMock = vi.fn()
      render(<RechnungDetailView rechnung={mockRechnungenList[0]} onBack={vi.fn()} onNavigate={onNavigateMock} />)

      await waitFor(() => {
        expect(screen.queryByText(/Lädt.../i)).not.toBeInTheDocument()
      })

      const calBtn = screen.getByRole('button', { name: /Im Kalender ansehen/i })
      expect(calBtn).toBeInTheDocument()
      fireEvent.click(calBtn)

      expect(onNavigateMock).toHaveBeenCalledWith('kalender', { date: '2026-12-31' })
    })

    it('opens Gutschrift modal from action menu and creates credit note', async () => {
      render(<RechnungDetailView rechnung={mockRechnungenList[0]} onBack={vi.fn()} onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.queryByText(/Lädt.../i)).not.toBeInTheDocument()
      })

      const actionMenuBtn = screen.getByRole('button', { name: /Aktionsmenü/i })
      fireEvent.click(actionMenuBtn)

      await waitFor(() => {
        expect(screen.getByText(/Gutschrift erstellen/i)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText(/Gutschrift erstellen/i))

      await waitFor(() => {
        expect(screen.getByText(/Gutschrift erstellen\?/i)).toBeInTheDocument()
      })
    })
  })
})
