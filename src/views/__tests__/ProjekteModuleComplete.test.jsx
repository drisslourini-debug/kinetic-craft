import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ProjekteView from '../ProjekteView'
import ProjektCreateModal from '../ProjektCreateModal'

// Robust Mock for LocalStorage
const localStorageStore = {}
const localStorageMock = {
  getItem: vi.fn((key) => localStorageStore[key] ?? null),
  setItem: vi.fn((key, value) => {
    localStorageStore[key] = String(value)
  }),
  removeItem: vi.fn((key) => {
    delete localStorageStore[key]
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k])
  }),
  key: vi.fn((idx) => Object.keys(localStorageStore)[idx] ?? null),
  get length() {
    return Object.keys(localStorageStore).length
  }
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true })
Object.defineProperty(global, 'localStorage', { value: localStorageMock, configurable: true })

// Mock Projects
const mockKunden = [
  { id: 'k-1', name: 'Beat von Graffenried', email: 'beat@graffenried.ch', telefon: '+41 31 300 00 00' },
  { id: 'k-2', name: 'Galerie Bern AG', email: 'info@galerie-bern.ch' }
]

const mockProjects = [
  {
    id: 'p-1',
    name: 'Neupolsterung Art-Déco Sessel',
    adresse: 'Kramgasse 12, 3011 Bern',
    status: 'In Arbeit',
    kunden_id: 'k-1',
    kategorie: 'Umbau / Renovation',
    startdatum: '2026-10-01',
    enddatum: '2026-10-31',
    is_archived: false,
    created_at: '2026-10-01T08:00:00Z',
    kunden: { name: 'Beat von Graffenried' }
  },
  {
    id: 'p-2',
    name: 'Restaurierung Barock-Chaiselongue',
    adresse: 'Spitalgasse 4, 3011 Bern',
    status: 'Abgeschlossen',
    kunden_id: 'k-2',
    kategorie: 'Reparatur / Service',
    startdatum: '2026-09-01',
    enddatum: '2026-09-25',
    is_archived: false,
    created_at: '2026-09-01T09:00:00Z',
    kunden: { name: 'Galerie Bern AG' }
  },
  {
    id: 'p-3',
    name: 'Lederbezug Chesterfield Sofa (Archiv)',
    adresse: 'Marktgasse 20, 3011 Bern',
    status: 'Abgeschlossen',
    kunden_id: 'k-1',
    kategorie: 'Sanierung',
    startdatum: '2026-08-01',
    enddatum: '2026-08-20',
    is_archived: true,
    created_at: '2026-08-01T10:00:00Z',
    kunden: { name: 'Beat von Graffenried' }
  }
]

let shouldSupabaseFail = false
let customProjectsData = null
const insertMock = vi.fn()
const updateMock = vi.fn()

vi.mock('../../lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn((table) => {
        const builder = {
          select: vi.fn((columns, options) => {
            if (options?.head) {
              return {
                eq: vi.fn().mockResolvedValue({ count: 4, error: null })
              }
            }
            return builder
          }),
          eq: vi.fn((col, val) => {
            if (table === 'kunden' && col === 'id') {
              return {
                single: vi.fn().mockResolvedValue({
                  data: mockKunden.find(k => k.id === val) || mockKunden[0],
                  error: null
                })
              }
            }
            return builder
          }),
          order: vi.fn(() => {
            if (shouldSupabaseFail) {
              return Promise.resolve({ data: null, error: new Error('Datenbank Abfragefehler 500') })
            }
            if (table === 'projekte') {
              return Promise.resolve({ data: customProjectsData ?? mockProjects, error: null })
            }
            if (table === 'kunden') {
              return Promise.resolve({ data: mockKunden, error: null })
            }
            if (table === 'offerten') {
              return Promise.resolve({
                data: [{ id: 'of-1', offerte_nr: 'OF-2026-1001', titel: 'Polsterung Offerte', total: 2450.00, status: 'Angenommen' }],
                error: null
              })
            }
            if (table === 'rechnungen') {
              return Promise.resolve({
                data: [{ id: 're-1', rechnung_nr: 'RE-2026-1001', titel: 'Abschlagsrechnung', total: 1200.00, bezahlt: 1200.00, status: 'Bezahlt' }],
                error: null
              })
            }
            if (table === 'ausgaben') {
              return Promise.resolve({
                data: [{ id: 'aus-1', beleg_nr: 'BEL-01', lieferant: 'Leder AG', betrag_brutto: 450.00, beleg_datum: '2026-10-05' }],
                error: null
              })
            }
            if (table === 'dateien') {
              return Promise.resolve({
                data: [{ id: 'dat-1', name: 'Zustand_Vorher.jpg', dateityp: 'image/jpeg', groesse: 245000, created_at: '2026-10-02' }],
                error: null
              })
            }
            if (table === 'termine') {
              return Promise.resolve({
                data: [{ id: 'ter-1', titel: 'Anprobe vor Ort', datum: '2026-10-20', uhrzeit: '14:00', status: 'Geplant', typ: 'Kundenbesuch' }],
                error: null
              })
            }
            if (table === 'rapporte') {
              return Promise.resolve({
                data: [{ id: 'rap-1', rapport_nr: 'RAP-001', beschreibung: 'Gurten spannen', datum: '2026-10-18', stunden: [{ stunden: 6.5 }], status: 'Unterschrieben' }],
                error: null
              })
            }
            return Promise.resolve({ data: [], error: null })
          }),
          insert: vi.fn((data) => {
            insertMock(data)
            return {
              select: vi.fn().mockResolvedValue({
                data: [{ id: 'p-new-1', ...data[0], kunden: { name: 'Beat von Graffenried' } }],
                error: null
              })
            }
          }),
          update: vi.fn((data) => {
            updateMock(data)
            return {
              eq: vi.fn().mockResolvedValue({ data: null, error: null })
            }
          }),
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: null, error: null })
          }))
        }
        return builder
      })
    }
  }
})

describe('Projekte Module - Complete 4-Layer Test Suite (generate-tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    shouldSupabaseFail = false
    customProjectsData = null
  })

  // ==========================================
  // LAYER 1: HAPPY PATH
  // ==========================================
  describe('Layer 1: Happy Path', () => {
    it('renders desktop project list with header, KPI statcards, and project items', async () => {
      render(<ProjekteView userName="Florence Lourini" />)

      await waitFor(() => {
        expect(screen.getAllByRole('heading', { name: /Projekte & Objekte/i }).length).toBeGreaterThan(0)
      })

      // KPI StatCards
      expect(screen.getByText('Alle Projekte')).toBeInTheDocument()
      expect(screen.getAllByText('In Arbeit').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Abgeschlossen').length).toBeGreaterThan(0)

      // Project rows
      expect(screen.getAllByText('Neupolsterung Art-Déco Sessel').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Restaurierung Barock-Chaiselongue').length).toBeGreaterThan(0)
    })

    it('filters project list by search term', async () => {
      render(<ProjekteView userName="Florence Lourini" />)

      await waitFor(() => {
        expect(screen.getAllByText('Neupolsterung Art-Déco Sessel').length).toBeGreaterThan(0)
      })

      const searchInput = screen.getAllByPlaceholderText(/Projekte suchen nach Name, Adresse oder Kunde/i)[0]
      fireEvent.change(searchInput, { target: { value: 'Barock' } })

      await waitFor(() => {
        expect(screen.getAllByText('Restaurierung Barock-Chaiselongue').length).toBeGreaterThan(0)
        expect(screen.queryByText('Neupolsterung Art-Déco Sessel')).not.toBeInTheDocument()
      })

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } })
      await waitFor(() => {
        expect(screen.getAllByText('Neupolsterung Art-Déco Sessel').length).toBeGreaterThan(0)
      })
    })

    it('filters projects by mobile segmented status tabs', async () => {
      render(<ProjekteView userName="Florence Lourini" />)

      await waitFor(() => {
        expect(screen.getAllByText('Neupolsterung Art-Déco Sessel').length).toBeGreaterThan(0)
      })

      // Click "In Arbeit" tab on mobile segment control
      const inArbeitTab = screen.getByRole('button', { name: /In Arbeit/i })
      fireEvent.click(inArbeitTab)

      await waitFor(() => {
        expect(screen.getAllByText('Neupolsterung Art-Déco Sessel').length).toBeGreaterThan(0)
        expect(screen.queryByText('Restaurierung Barock-Chaiselongue')).not.toBeInTheDocument()
      })
    })

    it('opens project detail view when a project card is clicked', async () => {
      render(<ProjekteView userName="Florence Lourini" />)

      await waitFor(() => {
        expect(screen.getAllByText('Neupolsterung Art-Déco Sessel').length).toBeGreaterThan(0)
      })

      // Click "Details anzeigen →"
      const detailBtn = screen.getAllByText(/Details anzeigen/i)[0]
      fireEvent.click(detailBtn)

      await waitFor(() => {
        // Detail view back button & customer info
        expect(screen.getByRole('button', { name: /Projekte/i })).toBeInTheDocument()
        expect(screen.getAllByText('Kramgasse 12, 3011 Bern').length).toBeGreaterThan(0)
      })
    })

    it('switches between detail tabs (Projektdaten, Termine, Zeiten, Rapporte, Offerten, Rechnungen, Dateien)', async () => {
      render(<ProjekteView userName="Florence Lourini" viewParams={{ projektId: 'p-1' }} />)

      await waitFor(() => {
        expect(screen.getAllByText('Neupolsterung Art-Déco Sessel').length).toBeGreaterThan(0)
      })

      // Switch to "Termine" tab
      const termineTab = screen.getByText('Termine')
      fireEvent.click(termineTab)

      await waitFor(() => {
        expect(screen.getAllByText(/Anprobe vor Ort/i).length).toBeGreaterThan(0)
      })

      // Switch to "Rapporte" tab
      const rapporteTab = screen.getByText('Rapporte')
      fireEvent.click(rapporteTab)

      await waitFor(() => {
        expect(screen.getByText('Regierapporte & Baustellenberichte')).toBeInTheDocument()
        expect(screen.getAllByText(/Gurten spannen/i).length).toBeGreaterThan(0)
      })

      // Switch to "Offerten" tab
      const offertenTab = screen.getByText('Offerten')
      fireEvent.click(offertenTab)

      await waitFor(() => {
        expect(screen.getAllByText(/OF-2026-1001/i).length).toBeGreaterThan(0)
      })

      // Switch to "Rechnungen" tab
      const rechnungenTab = screen.getByText('Rechnungen')
      fireEvent.click(rechnungenTab)

      await waitFor(() => {
        expect(screen.getAllByText(/RE-2026-1001/i).length).toBeGreaterThan(0)
      })
    })

    it('opens create modal, submits valid project details, and persists to supabase', async () => {
      const onSuccessMock = vi.fn()
      render(<ProjektCreateModal onClose={vi.fn()} onSuccess={onSuccessMock} />)

      await waitFor(() => {
        expect(screen.getByText('Beat von Graffenried')).toBeInTheDocument()
      })

      // Fill in project name
      const nameInput = screen.getByPlaceholderText(/z\.B\. Fassadensanierung Meier/i)
      fireEvent.change(nameInput, { target: { value: 'Neuer Empire Sekretär' } })

      // Select customer (first combobox)
      const comboboxes = screen.getAllByRole('combobox')
      fireEvent.change(comboboxes[0], { target: { value: 'k-1' } })

      // Fill address
      const adresseInput = screen.getByPlaceholderText(/Strasse eingeben/i)
      fireEvent.change(adresseInput, { target: { value: 'Aarbergergasse 5, 3011 Bern' } })

      // Submit
      const submitBtn = screen.getByRole('button', { name: /Projekt erstellen/i })
      expect(submitBtn).not.toBeDisabled()
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(insertMock).toHaveBeenCalledWith(expect.arrayContaining([
          expect.objectContaining({
            name: 'Neuer Empire Sekretär',
            kunden_id: 'k-1',
            adresse: 'Aarbergergasse 5, 3011 Bern',
            status: 'Aktiv'
          })
        ]))
      })
      expect(onSuccessMock).toHaveBeenCalled()
    })
  })

  // ==========================================
  // LAYER 2: EDGE CASES
  // ==========================================
  describe('Layer 2: Edge Cases', () => {
    it('handles project with zero financial records without crashing or NaN', async () => {
      const emptyFinanceProject = {
        ...mockProjects[0],
        id: 'p-zero'
      }
      customProjectsData = [emptyFinanceProject]

      render(<ProjekteView userName="Florence Lourini" viewParams={{ projektId: 'p-zero' }} />)

      await waitFor(() => {
        expect(screen.getAllByText('Neupolsterung Art-Déco Sessel').length).toBeGreaterThan(0)
      })

      // Rendite and finance stats should display without NaN
      expect(screen.queryByText(/NaN/i)).not.toBeInTheDocument()
    })

    it('renders empty state when search term matches zero projects', async () => {
      render(<ProjekteView userName="Florence Lourini" />)

      await waitFor(() => {
        expect(screen.getAllByText('Neupolsterung Art-Déco Sessel').length).toBeGreaterThan(0)
      })

      const searchInput = screen.getAllByPlaceholderText(/Projekte suchen nach Name, Adresse oder Kunde/i)[0]
      fireEvent.change(searchInput, { target: { value: 'UnbekannteBaustelleX99' } })

      await waitFor(() => {
        expect(screen.getAllByText('Keine Projekte gefunden').length).toBeGreaterThan(0)
        expect(screen.getAllByText(/Passe deine Suchbegriffe an oder lege ein neues Projekt an/i).length).toBeGreaterThan(0)
      })
    })

    it('toggles archived projects checkbox and displays archived items', async () => {
      render(<ProjekteView userName="Florence Lourini" />)

      await waitFor(() => {
        expect(screen.getAllByText('Neupolsterung Art-Déco Sessel').length).toBeGreaterThan(0)
      })

      // Archived project is not visible by default
      expect(screen.queryByText('Lederbezug Chesterfield Sofa (Archiv)')).not.toBeInTheDocument()

      // Toggle "Archivierte einblenden"
      const archiveCheckbox = screen.getByRole('checkbox', { name: /Archivierte einblenden/i })
      fireEvent.click(archiveCheckbox)

      await waitFor(() => {
        expect(screen.getAllByText('Lederbezug Chesterfield Sofa (Archiv)').length).toBeGreaterThan(0)
      })
    })

    it('handles project with no address gracefully rendering placeholder', async () => {
      const noAddressProject = {
        ...mockProjects[0],
        id: 'p-no-addr',
        adresse: null
      }
      customProjectsData = [noAddressProject]

      render(<ProjekteView userName="Florence Lourini" viewParams={{ projektId: 'p-no-addr' }} />)

      await waitFor(() => {
        expect(screen.getAllByText('Neupolsterung Art-Déco Sessel').length).toBeGreaterThan(0)
      })

      expect(screen.getAllByText('Keine Baustellenadresse').length).toBeGreaterThan(0)
    })
  })

  // ==========================================
  // LAYER 3: ERROR PATHS
  // ==========================================
  describe('Layer 3: Error Paths', () => {
    it('disables submit button and prevents creation when required fields are missing', async () => {
      render(<ProjektCreateModal onClose={vi.fn()} onSuccess={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByText('Beat von Graffenried')).toBeInTheDocument()
      })

      // Submit button is disabled when name and customer are empty
      const submitBtn = screen.getByRole('button', { name: /Projekt erstellen/i })
      expect(submitBtn).toBeDisabled()
      expect(insertMock).not.toHaveBeenCalled()
    })

    it('handles supabase fetch failure gracefully without uncaught exceptions', async () => {
      shouldSupabaseFail = true
      render(<ProjekteView userName="Florence Lourini" />)

      await waitFor(() => {
        expect(screen.getAllByRole('heading', { name: /Projekte & Objekte/i }).length).toBeGreaterThan(0)
      })

      // Should not crash and render empty fallback state
      expect(screen.getAllByText('Keine Projekte gefunden').length).toBeGreaterThan(0)
    })

    it('hides create and edit actions when userRole is treuhand', async () => {
      render(<ProjekteView userName="Florence Lourini" userRole="treuhand" />)

      await waitFor(() => {
        expect(screen.getAllByRole('heading', { name: /Projekte & Objekte/i }).length).toBeGreaterThan(0)
      })

      // "+ Neues Projekt" button must not be visible for treuhand
      expect(screen.queryByRole('button', { name: /\+ Neues Projekt/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Per Sprache \(KI\)/i })).not.toBeInTheDocument()
    })
  })

  // ==========================================
  // LAYER 4: ASYNC & INTEGRATION
  // ==========================================
  describe('Layer 4: Async & Integration', () => {
    it('links 3-dot dropdown action to calendar with project dates', async () => {
      const onNavigateMock = vi.fn()
      render(<ProjekteView onNavigate={onNavigateMock} />)

      await waitFor(() => {
        expect(screen.getAllByText('Neupolsterung Art-Déco Sessel').length).toBeGreaterThan(0)
      })

      // Find 3-dots action button
      const buttons = screen.getAllByRole('button')
      const menuBtn = buttons.find(b => b.getAttribute('aria-label') === 'Aktionsmenü' || b.getAttribute('title') === 'Aktionsmenü')
      expect(menuBtn).toBeDefined()
      fireEvent.click(menuBtn)

      await waitFor(() => {
        expect(screen.getAllByText(/Im Kalender anzeigen/i).length).toBeGreaterThan(0)
      })

      fireEvent.click(screen.getAllByText(/Im Kalender anzeigen/i)[0])

      expect(onNavigateMock).toHaveBeenCalledWith('kalender', {
        date: '2026-10-01',
        projektId: 'p-1'
      })
    })

    it('handles direct deep-link navigation via viewParams.projektId', async () => {
      render(<ProjekteView userName="Florence Lourini" viewParams={{ projektId: 'p-2' }} />)

      await waitFor(() => {
        // Direct detail view for project p-2
        expect(screen.getAllByText('Restaurierung Barock-Chaiselongue').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Spitalgasse 4, 3011 Bern').length).toBeGreaterThan(0)
      })
    })

    it('navigates back from detail view to project list when back button is clicked', async () => {
      render(<ProjekteView userName="Florence Lourini" />)

      await waitFor(() => {
        expect(screen.getAllByText('Neupolsterung Art-Déco Sessel').length).toBeGreaterThan(0)
      })

      // Open detail view
      const detailBtn = screen.getAllByText(/Details anzeigen/i)[0]
      fireEvent.click(detailBtn)

      const backBtn = await screen.findByRole('button', { name: /Projekte/i })
      fireEvent.click(backBtn)

      await waitFor(() => {
        expect(screen.getAllByRole('heading', { name: /Projekte & Objekte/i }).length).toBeGreaterThan(0)
      })
    })
  })
})
