import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DashboardView from '../DashboardView'

// Mock Supabase
const mockSettings = {
  firmenname: 'Flo Art – Polsterei',
  plz_ort: '3063 Ittigen',
  kanton: 'BE'
}

const mockRechnungen = [
  {
    id: 101,
    rechnung_nr: 'RE-2026-101',
    total: 2450.00,
    bezahlt: 0,
    faellig_am: '2026-10-01', // overdue
    status: 'Überfällig',
    is_archived: false,
    kunden: { name: 'Beat von Graffenried' },
    daten: {}
  },
  {
    id: 102,
    rechnung_nr: 'RE-2026-102',
    total: 1800.00,
    bezahlt: 1800.00,
    faellig_am: '2026-10-15',
    status: 'Bezahlt',
    bezahlt_am: '2026-10-10',
    is_archived: false,
    kunden: { name: 'Galerie Münstergasse' },
    daten: {
      zahlungen: [
        { datum: '2026-10-05', betrag: 1000.00, typ: 'Teilzahlung' },
        { datum: '2026-10-10', betrag: 800.00, typ: 'Zahlung' }
      ]
    }
  },
  {
    id: 103,
    rechnung_nr: 'RE-2026-103',
    total: 950.00,
    bezahlt: 0,
    faellig_am: '2026-11-30', // future
    status: 'Versendet',
    is_archived: false,
    kunden: { name: 'Café Einstein AG' },
    daten: {}
  }
]

const mockOfferten = [
  {
    id: 301,
    offerte_nr: 'OF-2026-301',
    total: 3200.00,
    status: 'Versendet',
    created_at: '2026-10-15',
    gueltig_bis: '2026-11-15',
    is_archived: false,
    kunden: { name: 'Architekturbüro Bern' }
  }
]

const mockProjekte = [
  {
    id: 401,
    projekt_nr: 'PRJ-401',
    name: 'Neupolsterung Art Déco Sessel',
    status: 'In Arbeit',
    startdatum: '2026-10-01',
    enddatum: '2026-11-01',
    is_archived: false,
    kunden: { name: 'Beat von Graffenried' }
  }
]

const mockTermine = [
  {
    id: 501,
    titel: 'Musterbemusterung Stoffe',
    datum: '2026-10-24',
    typ: 'termin',
    status: 'geplant',
    projekte: { name: 'Neupolsterung Art Déco Sessel' }
  }
]

let supabaseData = {
  settings: mockSettings,
  rechnungen: mockRechnungen,
  offerten: mockOfferten,
  projekte: mockProjekte,
  termine: mockTermine
}

let updateCalls = []

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table) => {
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        in: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        maybeSingle: vi.fn().mockImplementation(() => {
          if (table === 'einstellungen') {
            return Promise.resolve({ data: supabaseData.settings, error: null })
          }
          return Promise.resolve({ data: null, error: null })
        }),
        update: vi.fn((payload) => {
          updateCalls.push({ table, payload })
          return builder
        }),
        then: vi.fn((resolve) => {
          if (table === 'rechnungen') {
            resolve({ data: supabaseData.rechnungen, error: null })
          } else if (table === 'offerten') {
            resolve({ data: supabaseData.offerten, error: null })
          } else if (table === 'projekte') {
            resolve({ data: supabaseData.projekte, error: null })
          } else if (table === 'termine') {
            resolve({ data: supabaseData.termine, error: null })
          } else {
            resolve({ data: [], error: null })
          }
        })
      }
      return builder
    })
  }
}))

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children, data }) => (
    <div data-testid="bar-chart" data-points={data?.length || 0}>
      {children}
    </div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Cell: () => <div data-testid="cell" />
}))

// Mock WeatherWidget
vi.mock('../../components/WeatherWidget', () => ({
  default: ({ plzOrt, compact }) => (
    <div data-testid="weather-widget" data-compact={compact ? 'true' : 'false'}>
      Wetter für {plzOrt}
    </div>
  )
}))

// Mock Calendar
vi.mock('../../components/Calendar', () => ({
  default: ({ events, holidays, onDayClick }) => (
    <div data-testid="calendar-component">
      <div data-testid="calendar-events-count">{events?.length || 0}</div>
      <button data-testid="calendar-day-btn" onClick={() => onDayClick && onDayClick('2026-10-24')}>
        24. Oktober
      </button>
    </div>
  )
}))

// Mock OnboardingChecklistWidget
vi.mock('../../components/dashboard/OnboardingChecklistWidget', () => ({
  default: () => <div data-testid="onboarding-checklist-widget" />
}))

// Mock holidayService
vi.mock('../../lib/holidayService', () => ({
  getHolidays: vi.fn().mockResolvedValue([
    { datum: '2026-01-01', name: 'Neujahr' },
    { datum: '2026-08-01', name: 'Bundesfeiertag' }
  ])
}))

describe('DashboardView - Comprehensive Test Suite (generate-tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateCalls = []
    supabaseData = {
      settings: mockSettings,
      rechnungen: [...mockRechnungen],
      offerten: [...mockOfferten],
      projekte: [...mockProjekte],
      termine: [...mockTermine]
    }
  })

  // =========================================================================
  // Layer 1: Happy Path (Desktop & Mobile Contracts)
  // =========================================================================
  describe('Layer 1: Happy Path (Desktop & Mobile)', () => {
    it('renders greeting with user first name when userName is provided', async () => {
      render(<DashboardView userName="Florence Lourini" onNavigate={vi.fn()} />)
      
      await waitFor(() => {
        expect(screen.getByText(/Willkommen zurück, Florence/i)).toBeInTheDocument()
      })
    })

    it('renders greeting with firmenname fallback when userName is empty', async () => {
      render(<DashboardView userName="" onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByText(/Willkommen bei Flo Art – Polsterei/i)).toBeInTheDocument()
      })
    })

    it('renders desktop KPI stat cards with correct Swiss currency formatting', async () => {
      render(<DashboardView userName="Florence" onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByText('Bezahlter Umsatz (YTD)')).toBeInTheDocument()
        expect(screen.getByText('Ausstehende Zahlungen')).toBeInTheDocument()
        expect(screen.getByText('Offene Offerten')).toBeInTheDocument()
      })

      // Revenue: 1800.00 from installment payments
      expect(screen.getAllByText(/CHF 1[’']800\.00/).length).toBeGreaterThanOrEqual(1)
      // Pending: Overdue (2450) + Sent (950) = 3400.00
      expect(screen.getAllByText(/CHF 3[’']400\.00/).length).toBeGreaterThanOrEqual(1)
    })

    it('renders mobile financial glance widgets for YTD turnover and pending balances', async () => {
      render(<DashboardView userName="Florence" onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByText(`Umsatz ${new Date().getFullYear()}`)).toBeInTheDocument()
        expect(screen.getByText('Ausstehend')).toBeInTheDocument()
        expect(screen.getByText('1 überfällig')).toBeInTheDocument()
      })
    })

    it('renders mobile quick action row with direct navigation links', async () => {
      const onNavigateMock = vi.fn()
      render(<DashboardView userName="Florence" onNavigate={onNavigateMock} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^Offerte$/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /^Rechnung$/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /^Kunde$/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /^Projekt$/i })).toBeInTheDocument()
      })

      // Click quick action "Rechnung"
      fireEvent.click(screen.getByRole('button', { name: /^Rechnung$/i }))
      expect(onNavigateMock).toHaveBeenCalledWith('rechnungen', { action: 'create' })

      // Click quick action "Offerte"
      fireEvent.click(screen.getByRole('button', { name: /^Offerte$/i }))
      expect(onNavigateMock).toHaveBeenCalledWith('offerten', { action: 'create' })
    })

    it('switches mobile segmented tabs between Überfällig, Offerten, and Projekte', async () => {
      render(<DashboardView userName="Florence" onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByText('Aufgaben & Fokus')).toBeInTheDocument()
      })

      // Initial tab: ueberfaellig
      expect(screen.getAllByText(/Seit 01\.10\.2026/).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('#RE-2026-101')).toBeInTheDocument()

      // Switch to Offerten tab
      const offertenTab = document.querySelector('button[data-tab="offen"]')
      expect(offertenTab).toBeTruthy()
      fireEvent.click(offertenTab)

      await waitFor(() => {
        expect(screen.getAllByText('#OF-2026-301').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('Architekturbüro Bern').length).toBeGreaterThanOrEqual(1)
      })

      // Switch to Projekte tab
      const projekteTab = document.querySelector('button[data-tab="inArbeit"]')
      expect(projekteTab).toBeTruthy()
      fireEvent.click(projekteTab)

      await waitFor(() => {
        expect(screen.getAllByText('#PRJ-401').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('Neupolsterung Art Déco Sessel').length).toBeGreaterThanOrEqual(1)
      })
    })

    it('renders revenue development chart for last 6 months', async () => {
      render(<DashboardView userName="Florence" onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByText('Umsatzentwicklung')).toBeInTheDocument()
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
      })

      const chart = screen.getByTestId('bar-chart')
      expect(chart).toHaveAttribute('data-points', '6')
    })

    it('renders calendar with accumulated events from projects, invoices, offerten, and appointments', async () => {
      render(<DashboardView userName="Florence" onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByTestId('calendar-component')).toBeInTheDocument()
      })

      // Events:
      // Project 401: startdatum (1), enddatum (1)
      // Invoice 101, 103 (future/overdue due dates): (2)
      // Offerte 301 (gueltig_bis): (1)
      // Termine 501: (1)
      // Total >= 5 events
      const eventsCountEl = screen.getByTestId('calendar-events-count')
      const count = parseInt(eventsCountEl.textContent || '0', 10)
      expect(count).toBeGreaterThanOrEqual(5)
    })
  })

  // =========================================================================
  // Layer 2: Edge Cases
  // =========================================================================
  describe('Layer 2: Edge Cases', () => {
    it('handles empty database response with 0 turnover and friendly empty states', async () => {
      supabaseData = {
        settings: { firmenname: '', plz_ort: '' },
        rechnungen: [],
        offerten: [],
        projekte: [],
        termine: []
      }

      render(<DashboardView onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByText('Keine überfälligen Rechnungen.')).toBeInTheDocument()
        expect(screen.getByText('Alle Offerten sind beantwortet.')).toBeInTheDocument()
        expect(screen.getByText('Aktuell keine aktiven Projekte.')).toBeInTheDocument()
      })

      // Empty turnover formatted as CHF 0.00
      expect(screen.getAllByText('CHF 0.00').length).toBeGreaterThanOrEqual(1)
    })

    it('handles missing or undefined userName gracefully without throwing', async () => {
      render(<DashboardView userName={undefined} onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByText(/Willkommen bei Flo Art – Polsterei/i)).toBeInTheDocument()
      })
    })

    it('displays "+ X weitere anzeigen" button when more than 3 items exist in desktop column', async () => {
      // Create 5 overdue invoices
      supabaseData.rechnungen = [1, 2, 3, 4, 5].map(i => ({
        id: i,
        rechnung_nr: `RE-2026-${i}`,
        total: 500,
        bezahlt: 0,
        faellig_am: '2026-09-01',
        status: 'Überfällig',
        is_archived: false,
        kunden: { name: `Kunde ${i}` }
      }))

      render(<DashboardView userName="Florence" onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByText('+ 2 weitere anzeigen')).toBeInTheDocument()
      })

      // Click to open Rechnungen list
      const onNavigateMock = vi.fn()
      const moreBtn = screen.getByText('+ 2 weitere anzeigen')
      fireEvent.click(moreBtn)
    })

    it('falls back to total amount for legacy invoices with status Bezahlt without payment history', async () => {
      const currentYear = new Date().getFullYear()
      supabaseData.rechnungen = [
        {
          id: 99,
          rechnung_nr: 'RE-LEGACY-99',
          total: 1250.00,
          bezahlt: 1250.00,
          status: 'Bezahlt',
          bezahlt_am: `${currentYear}-05-15`,
          is_archived: false,
          kunden: { name: 'Alt-Kunde' },
          daten: {} // no zahlungen array
        }
      ]

      render(<DashboardView userName="Florence" onNavigate={vi.fn()} />)

      await waitFor(() => {
        // Must calculate umsatzTotal from total
        expect(screen.getAllByText(/CHF 1[’']250\.00/).length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  // =========================================================================
  // Layer 3: Error Paths
  // =========================================================================
  describe('Layer 3: Error Paths', () => {
    it('recovers and hides loading spinner when Supabase fetch throws an error', async () => {
      const { supabase } = await import('../../lib/supabase')
      const originalFrom = supabase.from
      supabase.from = vi.fn(() => {
        throw new Error('Supabase Network Error 500')
      })

      render(<DashboardView userName="Florence" onNavigate={vi.fn()} />)

      await waitFor(() => {
        // Loading spinner must disappear and UI must not crash
        expect(document.querySelector('.animate-spin')).toBeNull()
      })

      // Restore
      supabase.from = originalFrom
    })

    it('handles holiday service rejection without crashing dashboard rendering', async () => {
      const holidayService = await import('../../lib/holidayService')
      holidayService.getHolidays.mockRejectedValueOnce(new Error('Holiday API Unavailable'))

      render(<DashboardView userName="Florence" onNavigate={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByText(/Willkommen zurück, Florence/i)).toBeInTheDocument()
      })
    })
  })

  // =========================================================================
  // Layer 4: Async & Integration Scenarios
  // =========================================================================
  describe('Layer 4: Async & Integration', () => {
    it('auto-updates invoice status in Supabase when calculateRechnungStatus detects overdue invoice', async () => {
      // Invoice was marked 'Versendet' in DB, but its due date is in the past
      supabaseData.rechnungen = [
        {
          id: 777,
          rechnung_nr: 'RE-2026-777',
          total: 2000,
          bezahlt: 0,
          faellig_am: '2026-01-01', // definitely overdue
          status: 'Versendet', // out of sync
          is_archived: false,
          kunden: { name: 'Muster AG' },
          daten: {}
        }
      ]

      render(<DashboardView userName="Florence" onNavigate={vi.fn()} />)

      await waitFor(() => {
        // Verify update was dispatched to database
        const updateCall = updateCalls.find(c => c.table === 'rechnungen')
        expect(updateCall).toBeDefined()
        expect(updateCall.payload).toEqual({ status: 'Überfällig' })
      })
    })

    it('navigates to invoice with openMahnung parameter when clicking Mahnung senden in desktop action center', async () => {
      const onNavigateMock = vi.fn()
      render(<DashboardView userName="Florence" onNavigate={onNavigateMock} />)

      await waitFor(() => {
        expect(screen.getByText('Überfällige Rechnungen')).toBeInTheDocument()
      })

      const mahnungBtns = screen.getAllByRole('button', { name: /Mahnung senden/i })
      expect(mahnungBtns.length).toBeGreaterThanOrEqual(1)
      
      fireEvent.click(mahnungBtns[0])
      expect(onNavigateMock).toHaveBeenCalledWith('rechnungen', { rechnungId: 101, openMahnung: true })
    })

    it('navigates to kalender when clicking calendar day or full calendar button', async () => {
      const onNavigateMock = vi.fn()
      render(<DashboardView userName="Florence" onNavigate={onNavigateMock} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Vollständigen Kalender öffnen/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /Vollständigen Kalender öffnen/i }))
      expect(onNavigateMock).toHaveBeenCalledWith('kalender')

      // Click specific day on calendar
      const dayBtn = screen.getByTestId('calendar-day-btn')
      fireEvent.click(dayBtn)
      expect(onNavigateMock).toHaveBeenCalledWith('kalender', { date: '2026-10-24' })
    })
  })
})
