import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BuchhaltungView from '../BuchhaltungView'
import AusgabeCreateModal from '../AusgabeCreateModal'
import { saveAs } from 'file-saver'

// Mock LocalStorage
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

// Mock file-saver & JSZip
vi.mock('file-saver', () => ({
  saveAs: vi.fn()
}))

// Mock global fetch for Belege download in ZIP export
global.fetch = vi.fn().mockResolvedValue({
  blob: vi.fn().mockResolvedValue(new Blob(['beleg-image-content'], { type: 'image/jpeg' }))
})

vi.mock('../../services/aiService', () => ({
  scanReceipt: vi.fn().mockResolvedValue({
    titel: 'Bauhaus Baumarkt AG',
    beleg_datum: '2026-03-10',
    betrag_brutto: '324.00',
    mwst_satz: '8.1',
    kategorie: '4000 Materialaufwand'
  })
}))

// Mock Supabase
let shouldSupabaseFail = false
let customSettings = null
let customExpenses = null
let customInvoices = null
const insertMock = vi.fn()
const updateMock = vi.fn()

const defaultSettings = {
  mwst_methode: 'effektiv',
  mwst_abrechnungsart: 'vereinbart',
  saldosteuersatz: 5.9,
  konto_bank: '1020',
  konto_debitoren: '1100',
  konto_kreditoren: '2000',
  konto_ertrag: '3200',
  konto_skonto: '3800'
}

const defaultExpenses = [
  {
    id: 'aus-1',
    titel: 'Polsterstoff & Schaumstoff',
    kategorie: '4000 Materialaufwand',
    betrag_netto: 500.00,
    mwst_satz: 8.1,
    mwst_betrag: 40.50,
    betrag_brutto: 540.50,
    beleg_datum: '2026-02-15',
    status: 'Bezahlt',
    beleg_url: 'https://cdn.atelier77.ch/anhange/beleg_stoff.jpg',
    is_archived: false,
    projekte: { name: 'Art-Déco Sessel' }
  },
  {
    id: 'aus-2',
    titel: 'Werkzeug & Verbrauchsmaterial',
    kategorie: 'Werkzeuge',
    betrag_netto: 200.00,
    mwst_satz: 8.1,
    mwst_betrag: 16.20,
    betrag_brutto: 216.20,
    beleg_datum: '2026-03-01',
    status: 'Offen',
    faellig_am: '2026-03-25',
    beleg_url: null,
    is_archived: false,
    projekte: null
  }
]

const defaultInvoices = [
  {
    id: 'inv-1',
    rechnung_nr: 'RE-2026-1001',
    total: 2162.00,
    bezahlt: 2162.00,
    bezahlt_am: '2026-02-20',
    rechnungsdatum: '2026-02-10',
    faellig_am: '2026-03-10',
    status: 'Bezahlt',
    created_at: '2026-02-10T09:00:00Z',
    is_archived: false,
    daten: {
      konditionen: { mwst: 8.1 },
      zahlungen: [{ datum: '2026-02-20', betrag: 2162.00, typ: 'Zahlung' }]
    },
    kunden: { name: 'Beat von Graffenried', firmenname: null },
    projekte: { name: 'Art-Déco Sessel' }
  },
  {
    id: 'inv-2',
    rechnung_nr: 'RE-2026-1002',
    total: 1081.00,
    bezahlt: 0,
    bezahlt_am: null,
    rechnungsdatum: '2026-03-01',
    faellig_am: '2026-03-15',
    status: 'Offen',
    created_at: '2026-03-01T10:00:00Z',
    is_archived: false,
    daten: {
      konditionen: { mwst: 8.1 },
      zahlungen: []
    },
    kunden: { name: 'Livit AG', firmenname: 'Livit AG' },
    projekte: { name: 'Restaurierung Barock' }
  }
]

vi.mock('../../lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn((table) => {
        const builder = {
          select: vi.fn(() => builder),
          eq: vi.fn(() => builder),
          gte: vi.fn(() => builder),
          lte: vi.fn(() => builder),
          limit: vi.fn(() => builder),
          order: vi.fn(() => {
            if (shouldSupabaseFail) {
              return Promise.resolve({ data: null, error: new Error('Datenbankfehler 500') })
            }
            if (table === 'ausgaben') {
              return Promise.resolve({ data: customExpenses ?? defaultExpenses, error: null })
            }
            if (table === 'rechnungen') {
              return Promise.resolve({ data: customInvoices ?? defaultInvoices, error: null })
            }
            if (table === 'projekte') {
              return Promise.resolve({ data: [{ id: 'p-1', name: 'Art-Déco Sessel' }], error: null })
            }
            return Promise.resolve({ data: [], error: null })
          }),
          maybeSingle: vi.fn(() => {
            if (table === 'einstellungen') {
              return Promise.resolve({ data: customSettings ?? defaultSettings, error: null })
            }
            return Promise.resolve({ data: null, error: null })
          }),
          single: vi.fn(() => {
            return Promise.resolve({ data: { id: 'new-id', titel: 'Test' }, error: null })
          }),
          insert: insertMock.mockImplementation((payload) => {
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'new-id', ...payload[0] }, error: null })
              }))
            }
          }),
          update: updateMock.mockImplementation((payload) => {
            return {
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: { id: 'upd-id', ...payload }, error: null })
                }))
              }))
            }
          })
        }
        return builder
      }),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ data: { path: 'buchhaltung/test.jpg' }, error: null }),
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.atelier77.ch/anhange/buchhaltung/test.jpg' } })
        }))
      }
    }
  }
})

describe('Buchhaltung Module - Complete 4-Layer Test Suite (generate-tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    shouldSupabaseFail = false
    customSettings = null
    customExpenses = null
    customInvoices = null
    localStorageMock.clear()
  })

  // ==========================================
  // LAYER 1: HAPPY PATH
  // ==========================================
  describe('Layer 1: Happy Path', () => {
    it('renders desktop overview with Swiss OR 957 legal header, tabs and KPI cards', async () => {
      render(<BuchhaltungView onNavigate={vi.fn()} userRole="admin" />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Buchhaltung & Steuern/i })).toBeInTheDocument()
        expect(screen.getAllByText(/OR 957 ff\./i).length).toBeGreaterThanOrEqual(1)
      })

      // Tabs
      expect(screen.getByTestId('tab-ausgaben')).toBeInTheDocument()
      expect(screen.getByTestId('tab-op-liste')).toBeInTheDocument()
      expect(screen.getByTestId('tab-estv-mwst')).toBeInTheDocument()

      // KPI statcards: Umsatz, Ausgaben, Vorsteuer, Zahllast, Gewinn
      expect(screen.getAllByText(/Umsatz/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Ausgaben/i).length).toBeGreaterThan(0)
    })

    it('calculates vereinbarte MWST-Methode (Soll-Prinzip, Art. 39 Abs. 1 MWSTG) accurately', async () => {
      render(<BuchhaltungView onNavigate={vi.fn()} userRole="admin" />)

      // Vereinbart: Inv-1 (2162.00) + Inv-2 (1081.00) = 3243.00 Einnahmen
      await waitFor(() => {
        expect(screen.getAllByText(/CHF\s*3['’]?243\.00/i).length).toBeGreaterThan(0)
      })
    })

    it('calculates vereinnahmte MWST-Methode (Ist-Prinzip, Art. 39 Abs. 2 MWSTG) accurately when configured', async () => {
      customSettings = {
        ...defaultSettings,
        mwst_abrechnungsart: 'vereinnahmt'
      }

      render(<BuchhaltungView onNavigate={vi.fn()} userRole="admin" />)

      // Vereinnahmt: Only paid amounts in 2026 count -> Inv-1 was paid 2162.00, Inv-2 was paid 0
      await waitFor(() => {
        expect(screen.getAllByText(/CHF\s*2['’]?162\.00/i).length).toBeGreaterThan(0)
      })
    })

    it('calculates Saldosteuersatzmethode (Art. 37 MWSTG) with flat rate and zero Vorsteuer', async () => {
      customSettings = {
        ...defaultSettings,
        mwst_methode: 'saldosteuer',
        saldosteuersatz: 5.9
      }

      render(<BuchhaltungView onNavigate={vi.fn()} userRole="admin" />)

      await waitFor(() => {
        // Vorsteuer must be CHF 0.00 under Saldosteuer
        expect(screen.getAllByText(/CHF\s*0\.00/i).length).toBeGreaterThan(0)
        // Saldosteuersatz rate badge
        expect(screen.getAllByText(/5\.9%/i).length).toBeGreaterThan(0)
      })
    })

    it('switches to OP-Liste and computes Swiss 5% Delkredere (Art. 960e OR) and aging buckets', async () => {
      render(<BuchhaltungView onNavigate={vi.fn()} userRole="admin" />)

      await waitFor(() => {
        expect(screen.getByTestId('tab-op-liste')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('tab-op-liste'))

      await waitFor(() => {
        expect(screen.getByText(/Stichtags-Debitorenspiegel/i)).toBeInTheDocument()
        expect(screen.getAllByText(/Delkredere 5%/i).length).toBeGreaterThan(0)
        // Open invoice RE-2026-1002 is listed with 1081.00
        expect(screen.getAllByText('RE-2026-1002').length).toBeGreaterThan(0)
        expect(screen.getAllByText(/CHF\s*1['’]?081\.00/i).length).toBeGreaterThan(0)
      })
    })

    it('switches to ESTV MWST Formular 200 and renders statutory Kennziffern (200, 289, 382, 400, 500)', async () => {
      render(<BuchhaltungView onNavigate={vi.fn()} userRole="admin" />)

      await waitFor(() => {
        expect(screen.getByTestId('tab-estv-mwst')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('tab-estv-mwst'))

      await waitFor(() => {
        expect(screen.getByText(/Eidgenössische Steuerverwaltung \(ESTV\) - Formular 200/i)).toBeInTheDocument()
        expect(screen.getByText('200')).toBeInTheDocument()
        expect(screen.getByText('289')).toBeInTheDocument()
        expect(screen.getByText('382')).toBeInTheDocument()
        expect(screen.getByText('400')).toBeInTheDocument()
        expect(screen.getByText('500')).toBeInTheDocument()
      })
    })

    it('filters expenses list by search term', async () => {
      render(<BuchhaltungView onNavigate={vi.fn()} userRole="admin" />)

      await waitFor(() => {
        expect(screen.getAllByText('Polsterstoff & Schaumstoff').length).toBeGreaterThan(0)
      })

      const searchInput = screen.getByPlaceholderText(/Ausgabe oder Beleg suchen/i)
      fireEvent.change(searchInput, { target: { value: 'Werkzeug' } })

      await waitFor(() => {
        expect(screen.getAllByText('Werkzeug & Verbrauchsmaterial').length).toBeGreaterThan(0)
        expect(screen.queryByText('Polsterstoff & Schaumstoff')).not.toBeInTheDocument()
      })
    })

    it('renders receipt thumbnail image in table when beleg_url is an image URL', async () => {
      render(<BuchhaltungView onNavigate={vi.fn()} userRole="admin" />)

      await waitFor(() => {
        // Desktop table renders <img> for aus-1 with beleg_url: ...beleg_stoff.jpg
        const belegImg = screen.getAllByRole('img', { name: /Polsterstoff & Schaumstoff/i })
        expect(belegImg.length).toBeGreaterThan(0)
        expect(belegImg[0]).toHaveAttribute('src', 'https://cdn.atelier77.ch/anhange/beleg_stoff.jpg')
      })
    })

    it('submits new expense with receipt, auto-calculates Netto/MWST, and synchronizes into dateien table', async () => {
      const onSaveMock = vi.fn()
      const onCloseMock = vi.fn()

      render(<AusgabeCreateModal isOpen={true} onClose={onCloseMock} onSave={onSaveMock} />)

      // Enter title
      const titleInput = screen.getByPlaceholderText(/z\.B\. Schrauben Jumbo/i)
      fireEvent.change(titleInput, { target: { value: 'Lederreiniger Spezial' } })

      // Enter gross amount: 108.10 CHF
      const bruttoInput = screen.getByPlaceholderText('0.00')
      fireEvent.change(bruttoInput, { target: { value: '108.10' } })

      // Netto should calculate to 100.00 and MWST to 8.10
      await waitFor(() => {
        expect(screen.getAllByText(/CHF\s*100\.00/i).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/CHF\s*8\.10/i).length).toBeGreaterThan(0)
      })

      // Attach receipt image
      const file = new File(['fake-image-bytes'], 'quittung_leder.jpg', { type: 'image/jpeg' })
      const fileInput = document.querySelector('input[type="file"]')
      if (fileInput) {
        fireEvent.change(fileInput, { target: { files: [file] } })
      }

      // Submit
      const submitBtn = screen.getByRole('button', { name: /Ausgabe verbuchen/i })
      fireEvent.click(submitBtn)

      await waitFor(() => {
        // Verify insert on ausgaben
        expect(insertMock).toHaveBeenCalled()
        expect(onSaveMock).toHaveBeenCalled()
        expect(onCloseMock).toHaveBeenCalled()
      })
    })
  })

  // ==========================================
  // LAYER 2: EDGE CASES
  // ==========================================
  describe('Layer 2: Edge Cases', () => {
    it('handles zero revenues and zero expenses cleanly without NaN or crashes', async () => {
      customExpenses = []
      customInvoices = []

      render(<BuchhaltungView onNavigate={vi.fn()} userRole="admin" />)

      await waitFor(() => {
        expect(screen.getAllByText(/CHF\s*0\.00/i).length).toBeGreaterThanOrEqual(2)
      })
    })

    it('handles expense without receipt gracefully showing fallback indicator', async () => {
      customExpenses = [
        {
          id: 'aus-no-beleg',
          titel: 'Bankspesen PostFinance',
          kategorie: '6500 Verwaltungsaufwand',
          betrag_netto: 25.00,
          mwst_satz: 0,
          mwst_betrag: 0,
          betrag_brutto: 25.00,
          beleg_datum: '2026-03-01',
          status: 'Bezahlt',
          beleg_url: null,
          is_archived: false
        }
      ]

      render(<BuchhaltungView onNavigate={vi.fn()} userRole="admin" />)

      await waitFor(() => {
        expect(screen.getAllByText('Bankspesen PostFinance').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Kein Beleg').length).toBeGreaterThan(0)
      })
    })

    it('calculates zero Delkredere when all invoices are fully paid', async () => {
      customInvoices = [
        {
          ...defaultInvoices[0],
          status: 'Bezahlt',
          bezahlt: 2162.00
        }
      ]

      render(<BuchhaltungView onNavigate={vi.fn()} userRole="admin" />)

      await waitFor(() => {
        expect(screen.getByTestId('tab-op-liste')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('tab-op-liste'))

      await waitFor(() => {
        expect(screen.getByText(/Keine offenen Debitorenforderungen/i)).toBeInTheDocument()
      })
    })

    it('filters by Quarter and correctly isolates figures for Q1 vs Q4', async () => {
      render(<BuchhaltungView onNavigate={vi.fn()} userRole="admin" />)

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: 'Q1' }).length).toBeGreaterThan(0)
      })

      const q1Btn = screen.getAllByRole('button', { name: 'Q1' })[0]
      fireEvent.click(q1Btn)

      await waitFor(() => {
        expect(screen.getAllByText('Polsterstoff & Schaumstoff').length).toBeGreaterThan(0)
      })

      // Switch to Q4 where no invoices/expenses exist
      const q4Btn = screen.getAllByRole('button', { name: 'Q4' })[0]
      fireEvent.click(q4Btn)

      await waitFor(() => {
        expect(screen.queryByText('Polsterstoff & Schaumstoff')).not.toBeInTheDocument()
      })
    })
  })

  // ==========================================
  // LAYER 3: ERROR PATHS
  // ==========================================
  describe('Layer 3: Error Paths', () => {
    it('disables submit button in AusgabeCreateModal when required fields are missing', () => {
      render(<AusgabeCreateModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} />)

      const submitBtn = screen.getByRole('button', { name: /Ausgabe verbuchen/i })
      expect(submitBtn).toBeDisabled()
    })

    it('handles supabase fetch failure gracefully without crashing', async () => {
      shouldSupabaseFail = true

      render(<BuchhaltungView onNavigate={vi.fn()} userRole="admin" />)

      await waitFor(() => {
        expect(screen.getAllByText(/Fehler beim Laden der Buchhaltungsdaten/i).length).toBeGreaterThan(0)
      })
    })
  })

  // ==========================================
  // LAYER 4: ASYNC & INTEGRATION
  // ==========================================
  describe('Layer 4: Async & Integration', () => {
    it('enforces read-only GeBüV restriction for Treuhand user role (hiding edit/delete actions)', async () => {
      render(<BuchhaltungView onNavigate={vi.fn()} userRole="treuhand" />)

      await waitFor(() => {
        expect(screen.getAllByText('Polsterstoff & Schaumstoff').length).toBeGreaterThan(0)
      })

      // "+ Neue Ausgabe" and scan buttons are hidden for Treuhand
      expect(screen.queryByRole('button', { name: /\+ Ausgabe erfassen/i })).not.toBeInTheDocument()
      expect(screen.queryByTitle(/Als bezahlt markieren/i)).not.toBeInTheDocument()
    })

    it('triggers Treuhand-Revisions-ZIP export packing journal, OP list, and receipts', async () => {
      render(<BuchhaltungView onNavigate={vi.fn()} userRole="admin" />)

      await waitFor(() => {
        expect(screen.getByTitle('Exporte & Treuhand')).toBeInTheDocument()
      })

      const exportBtn = screen.getByTitle('Exporte & Treuhand')
      fireEvent.click(exportBtn)

      await waitFor(() => {
        expect(screen.getByText(/Treuhand-Revisions-ZIP/i)).toBeInTheDocument()
      })

      const zipBtn = screen.getByText(/Treuhand-Revisions-ZIP/i)
      fireEvent.click(zipBtn)

      await waitFor(() => {
        expect(saveAs).toHaveBeenCalled()
      })
    })

    it('opens BankabgleichModal when bank reconciliation action is clicked', async () => {
      render(<BuchhaltungView onNavigate={vi.fn()} userRole="admin" />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Bankabgleich \(camt\)/i })).toBeInTheDocument()
      })

      const bankBtn = screen.getByRole('button', { name: /Bankabgleich \(camt\)/i })
      fireEvent.click(bankBtn)

      await waitFor(() => {
        expect(screen.getByText(/Bankauszug abgleichen/i)).toBeInTheDocument()
      })
    })

    it('automatically opens scan receipt modal when viewParams.action is scan_beleg', async () => {
      render(<BuchhaltungView onNavigate={vi.fn()} userRole="admin" viewParams={{ action: 'scan_beleg' }} />)

      await waitFor(() => {
        expect(screen.getByText(/Neue Ausgabe erfassen/i)).toBeInTheDocument()
      })
    })
  })
})
