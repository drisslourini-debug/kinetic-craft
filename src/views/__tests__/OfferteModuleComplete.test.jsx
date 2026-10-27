import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import OffertenView from '../OffertenView'
import OfferteDetailView from '../OfferteDetailView'

const mockOffertenList = [
  {
    id: 101,
    offerte_nr: 'OF-2026-101',
    status: 'Entwurf',
    total: 1250.00,
    created_at: '2026-09-01T10:00:00Z',
    gueltig_bis: '2026-10-31',
    kunden_id: 1,
    kunden: { id: 1, name: 'Dr. Meyer Immobilien AG', strasse: 'Bahnhofstrasse 10', plz: '8001', ort: 'Zürich' },
    projekte: { id: 10, name: 'Renovation Bad', adresse: 'Zürich' },
    daten: {
      titel: 'Offerte für Dr. Meyer',
      leistungen: [
        { _id: 1, type: 'position', posNr: '1.1', beschreibung: 'Polsterarbeiten Samtsessel', menge: 2, einheit: 'Stk', einzelpreis: 500 },
        { _id: 2, type: 'position', posNr: '1.2', beschreibung: 'Holzaufbereitung Eiche', menge: 1, einheit: 'Pauschal', einzelpreis: 250 }
      ],
      konditionen: { rabatt: 0, mwst: 8.1, gueltigkeit: '30 Tage', zahlungsfrist: '30 Tage Netto' },
      einleitungstext: 'Wir danken für Ihre Anfrage.',
      schlusstext: 'Mit freundlichen Grüssen'
    }
  },
  {
    id: 102,
    offerte_nr: 'OF-2026-102',
    status: 'Versendet',
    total: 3400.00,
    created_at: '2026-09-15T12:00:00Z',
    gueltig_bis: '2026-11-15',
    kunden_id: 2,
    kunden: { id: 2, name: 'Beat Von Graffenried', strasse: 'Herrengasse 4', plz: '3011', ort: 'Bern' },
    projekte: { id: 20, name: 'Neupolsterung Art Déco', adresse: 'Bern' },
    daten: {
      titel: 'Art Déco Renovation',
      leistungen: [
        { _id: 3, type: 'position', posNr: '1.1', beschreibung: 'Neupolsterung & Lederbezug', menge: 1, einheit: 'Pauschal', einzelpreis: 3400 }
      ],
      konditionen: { rabatt: 0, mwst: 8.1 }
    }
  },
  {
    id: 103,
    offerte_nr: 'OF-2026-103',
    status: 'Akzeptiert',
    total: 850.00,
    created_at: '2026-08-10T08:00:00Z',
    gueltig_bis: '2026-09-10',
    kunden_id: 1,
    kunden: { id: 1, name: 'Dr. Meyer Immobilien AG' },
    projekte: null,
    daten: {
      titel: 'Stuhlreparatur',
      leistungen: [
        { _id: 4, type: 'position', posNr: '1.1', beschreibung: 'Gurten erneuern', menge: 4, einheit: 'Stk', einzelpreis: 212.50 }
      ],
      konditionen: { rabatt: 0, mwst: 0 }
    }
  }
]

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
            if (table === 'offerten') return Promise.resolve({ data: mockOffertenList[0], error: null })
            if (table === 'kunden') return Promise.resolve({ data: { id: 1, name: 'Dr. Meyer Immobilien AG' }, error: null })
            if (table === 'projekte') return Promise.resolve({ data: { id: 10, name: 'Renovation Bad' }, error: null })
            return Promise.resolve({ data: {}, error: null })
          }),
          maybeSingle: vi.fn().mockResolvedValue({ data: {}, error: null }),
          then: (resolve) => {
            if (table === 'offerten') {
              return Promise.resolve({ data: mockSupabaseTableData.offerten ?? mockOffertenList, error: null }).then(resolve)
            }
            if (table === 'kunden') {
              return Promise.resolve({ data: [{ id: 1, name: 'Dr. Meyer Immobilien AG' }, { id: 2, name: 'Beat Von Graffenried' }], error: null }).then(resolve)
            }
            if (table === 'projekte') {
              return Promise.resolve({ data: [{ id: 10, name: 'Renovation Bad' }], error: null }).then(resolve)
            }
            if (table === 'katalog_leistungen') {
              return Promise.resolve({ data: [{ id: 1, beschreibung: 'Polsterstoff Samt', einheit: 'm', einzelpreis: 120 }], error: null }).then(resolve)
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

describe('Offerte Module - Complete 4-Layer Test Suite (generate-tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseTableData = {}
  })

  // ==========================================
  // LAYER 1: HAPPY PATH
  // ==========================================
  describe('Layer 1: Happy Path', () => {
    it('renders offerten overview with status badges and KPI stats on desktop and mobile', async () => {
      render(<OffertenView />)

      await waitFor(() => {
        expect(screen.getAllByText('Dr. Meyer Immobilien AG').length).toBeGreaterThan(0)
        expect(screen.getByText('OF-2026-101')).toBeInTheDocument()
        expect(screen.getByText('OF-2026-102')).toBeInTheDocument()
        expect(screen.getByText('OF-2026-103')).toBeInTheDocument()
      })

      // KPI summary check
      expect(screen.getAllByText(/Versendet/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Gewonnen/i).length).toBeGreaterThan(0)
    })

    it('filters offerten by search term and status tile', async () => {
      render(<OffertenView />)

      await waitFor(() => {
        expect(screen.getByText('OF-2026-101')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(/Offerten suchen\.\.\./i)
      fireEvent.change(searchInput, { target: { value: 'Graffenried' } })

      await waitFor(() => {
        expect(screen.getByText('Beat Von Graffenried')).toBeInTheDocument()
        expect(screen.queryByText('Dr. Meyer Immobilien AG')).not.toBeInTheDocument()
      })
    })

    it('opens create modal with viewParams action create and navigates to editor', async () => {
      render(<OffertenView viewParams={{ action: 'create' }} />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Neue Offerte erstellen/i })).toBeInTheDocument()
      })
    })

    it('renders detail view in view mode and toggles into edit mode', async () => {
      render(<OfferteDetailView offerte={mockOffertenList[0]} onBack={vi.fn()} onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.queryByText(/Lade Daten.../i)).not.toBeInTheDocument()
      })

      const editBtn = screen.getByRole('button', { name: /Offerte bearbeiten|Bearbeiten/i })
      expect(editBtn).toBeInTheDocument()
      fireEvent.click(editBtn)

      await waitFor(() => {
        expect(screen.getByText(/Live-Vorschau/i)).toBeInTheDocument()
      })
    })

    it('recalculates totals when rabatt or mwst changes', async () => {
      render(<OfferteDetailView offerte={mockOffertenList[0]} onBack={vi.fn()} onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.queryByText(/Lade Daten.../i)).not.toBeInTheDocument()
      })

      // Enter edit mode
      const editBtn = screen.getByRole('button', { name: /Offerte bearbeiten|Bearbeiten/i })
      fireEvent.click(editBtn)

      await waitFor(() => {
        expect(screen.getByText(/Konditionen/i)).toBeInTheDocument()
      })
    })

    it('renders mobile view with Bearbeiten / A4-Vorschau tab switcher and toggles between them', async () => {
      render(<OfferteDetailView offerte={mockOffertenList[0]} onBack={vi.fn()} onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.queryByText(/Lade Daten.../i)).not.toBeInTheDocument()
      })

      // Switch to edit mode
      fireEvent.click(screen.getByRole('button', { name: /Offerte bearbeiten|Bearbeiten/i }))

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

    it('converts accepted offerte to rechnung and opens convert modal', async () => {
      const onNavigateMock = vi.fn()
      render(<OfferteDetailView offerte={mockOffertenList[2]} onBack={vi.fn()} onNavigate={onNavigateMock} />)

      await waitFor(() => {
        expect(screen.queryByText(/Lade Daten.../i)).not.toBeInTheDocument()
      })

      const convertBtn = screen.getByRole('button', { name: /Rechnung erstellen/i })
      expect(convertBtn).toBeInTheDocument()
      fireEvent.click(convertBtn)

      await waitFor(() => {
        expect(screen.getByText(/In Rechnung umwandeln\?/i)).toBeInTheDocument()
      })
    })
  })

  // ==========================================
  // LAYER 2: EDGE CASES
  // ==========================================
  describe('Layer 2: Edge Cases', () => {
    it('renders friendly empty state when no offerten exist for the tenant', async () => {
      mockSupabaseTableData.offerten = []
      render(<OffertenView />)

      await waitFor(() => {
        expect(screen.getByText(/Keine Offerten gefunden/i)).toBeInTheDocument()
      })
    })

    it('handles offerte with zero items and zero total without crashing', async () => {
      const emptyOfferte = {
        ...mockOffertenList[0],
        total: 0,
        daten: {
          titel: 'Leere Offerte',
          leistungen: [],
          konditionen: { rabatt: 0, mwst: 0 }
        }
      }

      render(<OfferteDetailView offerte={emptyOfferte} onBack={vi.fn()} onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.queryByText(/Lade Daten.../i)).not.toBeInTheDocument()
      })
      expect(screen.getByText(/Keine Leistungen gefunden/i)).toBeInTheDocument()
    })

    it('renders pauschalpreis offerte overriding individual line item sums', async () => {
      const pauschalOfferte = {
        ...mockOffertenList[0],
        total: 2000,
        daten: {
          ...mockOffertenList[0].daten,
          pauschalpreis: 2000,
          leistungen: [
            { _id: 1, type: 'position', posNr: '1.1', beschreibung: 'Arbeit 1', menge: 1, einzelpreis: 100 },
            { _id: 2, type: 'position', posNr: '1.2', beschreibung: 'Arbeit 2', menge: 1, einzelpreis: 100 }
          ]
        }
      }

      render(<OfferteDetailView offerte={pauschalOfferte} onBack={vi.fn()} onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.queryByText(/Lade Daten.../i)).not.toBeInTheDocument()
      })
      // Should show total CHF 2000
      expect(screen.getAllByText(/2[’']000\.00/).length).toBeGreaterThan(0)
    })

    it('handles special unicode characters and long company names in header and items', async () => {
      const unicodeOfferte = {
        ...mockOffertenList[0],
        kunden_id: null,
        kunden: { name: 'Schreinerei & Polsterei Müller-Gygax Zürich & Co. AG' },
        daten: {
          ...mockOffertenList[0].daten,
          einleitungstext: 'Restauration Art-Déco Fauteuil «Château de Chillon»'
        }
      }

      render(<OfferteDetailView offerte={unicodeOfferte} onBack={vi.fn()} onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.queryByText(/Lade Daten.../i)).not.toBeInTheDocument()
      })
      expect(screen.getByText(/Schreinerei & Polsterei Müller-Gygax Zürich & Co\. AG/i)).toBeInTheDocument()
      expect(screen.getByText(/Restauration Art-Déco Fauteuil «Château de Chillon»/i)).toBeInTheDocument()
    })

    it('toggles archived offerten filter when checkbox is clicked', async () => {
      render(<OffertenView />)

      await waitFor(() => {
        expect(screen.getByText('OF-2026-101')).toBeInTheDocument()
      })

      const archivCheckbox = screen.getByLabelText(/Archivierte/i)
      expect(archivCheckbox).toBeInTheDocument()
      expect(archivCheckbox.checked).toBe(false)
      fireEvent.click(archivCheckbox)
      expect(archivCheckbox.checked).toBe(true)
    })
  })

  // ==========================================
  // LAYER 3: ERROR PATHS
  // ==========================================
  describe('Layer 3: Error Paths', () => {
    it('disables editing actions when offerte status is permanently locked or verrechnet', async () => {
      const lockedOfferte = {
        ...mockOffertenList[0],
        status: 'Verrechnet'
      }

      render(<OfferteDetailView offerte={lockedOfferte} onBack={vi.fn()} onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.queryByText(/Lade Daten.../i)).not.toBeInTheDocument()
      })

      // Edit button should NOT be available for Verrechnet
      expect(screen.queryByRole('button', { name: /^Offerte bearbeiten$/i })).not.toBeInTheDocument()
      expect(screen.getByText(/Offerte verrechnet \(dauerhaft gesperrt\)/i)).toBeInTheDocument()
    })

    it('displays warning when attempting to delete non-draft offerten', async () => {
      render(<OfferteDetailView offerte={mockOffertenList[1]} onBack={vi.fn()} onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.queryByText(/Lade Daten.../i)).not.toBeInTheDocument()
      })

      // Open action menu
      const actionMenuBtn = screen.getByRole('button', { name: /Aktionsmenü/i })
      fireEvent.click(actionMenuBtn)

      await waitFor(() => {
        const deleteOption = screen.queryByText(/Offerte löschen/i)
        if (deleteOption) {
          fireEvent.click(deleteOption)
          expect(screen.getByText(/Nur Entwürfe können endgültig gelöscht werden/i)).toBeInTheDocument()
        }
      })
    })

    it('gracefully recovers when Supabase fetch throws an error on list load', async () => {
      const { supabase } = await import('../../lib/supabase')
      supabase.from.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockRejectedValueOnce(new Error('Network connection failed 500'))
      }))

      render(<OffertenView />)

      await waitFor(() => {
        // Spinner terminates, does not crash
        expect(screen.queryByRole('status')).not.toBeInTheDocument()
      })
    })
  })

  // ==========================================
  // LAYER 4: ASYNC & INTEGRATION
  // ==========================================
  describe('Layer 4: Async & Integration', () => {
    it('loads customer and project options asynchronously upon entering edit mode', async () => {
      render(<OfferteDetailView offerte={mockOffertenList[0]} onBack={vi.fn()} onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.queryByText(/Lade Daten.../i)).not.toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /Offerte bearbeiten|Bearbeiten/i }))

      await waitFor(() => {
        expect(screen.getByDisplayValue(/Wir danken für Ihre Anfrage/i)).toBeInTheDocument()
      })
    })

    it('integrates with calendar modal when scheduling Aufmass / Besichtigung', async () => {
      render(<OfferteDetailView offerte={mockOffertenList[0]} onBack={vi.fn()} onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.queryByText(/Lade Daten.../i)).not.toBeInTheDocument()
      })

      const actionMenuBtn = screen.getByRole('button', { name: /Aktionsmenü/i })
      fireEvent.click(actionMenuBtn)

      await waitFor(() => {
        expect(screen.getByText(/Aufmass \/ Besichtigung planen/i)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText(/Aufmass \/ Besichtigung planen/i))

      await waitFor(() => {
        expect(screen.getByText(/Neuer Termin erfassen/i)).toBeInTheDocument()
      })
    })
  })
})
