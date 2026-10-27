import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import EinstellungenView from '../EinstellungenView'

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

// Mock Clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue()
  },
  configurable: true
})

// Default Mock Settings Data
const mockSettings = {
  id: 'sett-flo-art',
  tenant_id: 't-flo-art',
  firmenname: 'Flo Art – Polsterei',
  inhaber: 'Florence Lourini',
  strasse: 'Kramgasse 45',
  plz: '3011',
  ort: 'Bern',
  plz_ort: '3011 Bern',
  land: 'Schweiz',
  email: 'lourini@bluewin.ch',
  telefon: '+41 31 311 00 00',
  uid: 'CHE-109.876.543',
  hr_nummer: 'CH-036.1.098.765-4',
  gerichtsstand: 'Bern',
  bankverbindung: 'CH93 0076 2011 6238 5295 7',
  qr_iban: 'CH44 3199 9123 0008 8901 2',
  standard_mwst: 8.1,
  mwst_methode: 'effektiv',
  mwst_abrechnungsart: 'vereinbart',
  zahlungsfrist_tage: 30,
  startnummer_offerten: 1000,
  startnummer_rechnungen: 1000,
  startnummer_kunden: 1000,
  prefix_kunden: 'K-',
  startnummer_projekte: 1000,
  prefix_projekte: 'P-',
  primary_color: '#b88a38',
  logo_url: null,
  text_vorlagen: [
    { id: 't-1', category: 'offerte_einleitung', label: 'Standard', text: 'Gerne unterbreiten wir Ihnen folgende Offerte:' },
    { id: 't-2', category: 'offerte_schluss', label: 'Standard', text: 'Wir freuen uns auf Ihre geschätzte Auftragserteilung.' },
    { id: 't-3', category: 'rechnung_einleitung', label: 'Standard', text: 'Wir stellen Ihnen folgende Arbeiten in Rechnung:' },
    { id: 't-4', category: 'rechnung_schluss', label: 'Standard', text: 'Zahlbar rein netto innert 30 Tagen.' }
  ]
}

let mockCustomSettings = null

vi.mock('../../lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: {
                id: 'u-flo-1',
                email: 'lourini@bluewin.ch',
                user_metadata: { full_name: 'Florence Lourini' }
              }
            }
          }
        }),
        updateUser: vi.fn().mockResolvedValue({ data: {}, error: null })
      },
      from: vi.fn((table) => {
        const builder = {
          select: vi.fn(() => builder),
          insert: vi.fn(() => builder),
          update: vi.fn(() => builder),
          delete: vi.fn(() => builder),
          eq: vi.fn(() => builder),
          limit: vi.fn(() => builder),
          single: vi.fn().mockResolvedValue({ data: mockCustomSettings ?? mockSettings, error: null }),
          maybeSingle: vi.fn().mockImplementation(() => {
            if (table === 'user_roles') {
              return Promise.resolve({
                data: {
                  tenant_id: 't-flo-art',
                  user_name: 'Florence Lourini',
                  tenants: { id: 't-flo-art', name: 'Flo Art – Polsterei', status: 'active', trial_ends_at: null }
                },
                error: null
              })
            }
            if (table === 'einstellungen') {
              return Promise.resolve({ data: mockCustomSettings ?? mockSettings, error: null })
            }
            return Promise.resolve({ data: {}, error: null })
          }),
          then: (resolve) => {
            if (table === 'einstellungen') {
              return Promise.resolve({ data: mockCustomSettings ?? mockSettings, error: null }).then(resolve)
            }
            return Promise.resolve({ data: [], error: null }).then(resolve)
          }
        }
        return builder
      }),
      rpc: vi.fn((proc) => {
        if (proc === 'get_team_members') {
          return Promise.resolve({
            data: {
              active: [{ id: 'u-1', name: 'Florence Lourini', email: 'florence@flo-art.ch', role: 'Inhaber', status: 'Aktiv' }],
              pending: []
            },
            error: null
          })
        }
        if (proc === 'create_invitation') {
          return Promise.resolve({ data: 'mock-invite-token-123', error: null })
        }
        return Promise.resolve({ data: null, error: null })
      }),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ error: null }),
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/logo.png' } })
        }))
      }
    }
  }
})

describe('Einstellungen Module - Complete 4-Layer Test Suite (generate-tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    mockCustomSettings = null
  })

  // ==========================================
  // LAYER 1: HAPPY PATH
  // ==========================================
  describe('Layer 1: Happy Path', () => {
    it('renders einstellungen with Extro sidebar navigation and company header', async () => {
      render(<EinstellungenView userName="Florence Lourini" />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Einstellungen' })).toBeInTheDocument()
      })

      // Check Extro Navigation sidebar tabs
      expect(screen.getAllByText('Mein Profil').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Firma & Adresse').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Finanzen & Fristen').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Nummernkreise').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Vorlagen & Texte').length).toBeGreaterThan(0)
    })

    it('switches settings tabs via mobile dropdown selector on small screens', async () => {
      render(<EinstellungenView userName="Florence Lourini" />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Einstellungen' })).toBeInTheDocument()
      })

      const mobileSelect = screen.getByRole('combobox', { name: /Bereich auswählen/i })
      expect(mobileSelect).toBeInTheDocument()

      // Switch to "Finanzen & Fristen"
      fireEvent.change(mobileSelect, { target: { value: 'finanzen' } })

      await waitFor(() => {
        expect(screen.getByText('Bank & MWST')).toBeInTheDocument()
      })

      // Switch to "Nummernkreise"
      fireEvent.change(mobileSelect, { target: { value: 'nummernkreise' } })

      await waitFor(() => {
        expect(screen.getByText('Startnummer Offerten')).toBeInTheDocument()
      })
    })

    it('edits and displays company address and stammdaten', async () => {
      render(<EinstellungenView userName="Florence Lourini" />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Einstellungen' })).toBeInTheDocument()
      })

      // Navigate to "Firma & Adresse"
      const firmaBtn = screen.getByRole('button', { name: /Firma & Adresse/i })
      fireEvent.click(firmaBtn)

      await waitFor(() => {
        expect(screen.getByText('Stammdaten & Adresse')).toBeInTheDocument()
        expect(screen.getAllByText('Flo Art – Polsterei').length).toBeGreaterThan(0)
      })

      // Click "Bearbeiten" on Stammdaten block
      const editBtns = screen.getAllByTitle('Bearbeiten')
      fireEvent.click(editBtns[0])

      await waitFor(() => {
        expect(screen.getByDisplayValue('Flo Art – Polsterei')).toBeInTheDocument()
      })
    })

    it('validates and displays Swiss IBAN and QR-IBAN with live validation indicators', async () => {
      render(<EinstellungenView userName="Florence Lourini" />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Einstellungen' })).toBeInTheDocument()
      })

      // Navigate to "Finanzen & Fristen"
      const finanzenBtn = screen.getByRole('button', { name: /Finanzen & Fristen/i })
      fireEvent.click(finanzenBtn)

      await waitFor(() => {
        expect(screen.getByText('Bank & MWST')).toBeInTheDocument()
      })

      // Click "Bearbeiten" on Bank & MWST block
      const editBtns = screen.getAllByTitle('Bearbeiten')
      fireEvent.click(editBtns[0])

      await waitFor(() => {
        expect(screen.getByLabelText(/Bankverbindung \(Normale IBAN\)/i)).toBeInTheDocument()
      })

      // Enter valid Swiss QR-IBAN
      const qrIbanInput = screen.getByLabelText(/QR-IBAN \(speziell für QR-Rechnungen mit QR-Referenz\)/i)
      fireEvent.change(qrIbanInput, { target: { value: 'CH44 3199 9123 0008 8901 2' } })

      await waitFor(() => {
        expect(screen.getByText(/Gültige Schweizer QR-IBAN/i)).toBeInTheDocument()
      })
    })

    it('configures start numbers and prefixes for documents and customers in Nummernkreise', async () => {
      render(<EinstellungenView userName="Florence Lourini" />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Einstellungen' })).toBeInTheDocument()
      })

      // Navigate to "Nummernkreise"
      const nummernBtn = screen.getByRole('button', { name: /Nummernkreise/i })
      fireEvent.click(nummernBtn)

      await waitFor(() => {
        expect(screen.getByText(/Präfix «K-», Start bei 1000/i)).toBeInTheDocument()
        expect(screen.getByText(/z\.B\. K-1000/i)).toBeInTheDocument()
      })

      // Click "Bearbeiten" on Nummernkreise block
      const editBtns = screen.getAllByTitle('Bearbeiten')
      fireEvent.click(editBtns[0])

      await waitFor(() => {
        expect(screen.getByLabelText(/Präfix Kundennummer/i)).toBeInTheDocument()
      })
    })

    it('adds and saves a new document text template in Vorlagen & Texte', async () => {
      render(<EinstellungenView userName="Florence Lourini" />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Einstellungen' })).toBeInTheDocument()
      })

      // Navigate to "Vorlagen & Texte"
      const vorlagenBtn = screen.getByRole('button', { name: /Vorlagen & Texte/i })
      fireEvent.click(vorlagenBtn)

      await waitFor(() => {
        expect(screen.getByText('Offerten - Einleitung')).toBeInTheDocument()
      })

      // Click "+ Neue Vorlage" for Offerte Einleitung
      const newTemplateBtns = screen.getAllByRole('button', { name: /\+ Neue Vorlage/i })
      fireEvent.click(newTemplateBtns[0])

      await waitFor(() => {
        expect(screen.getByText(/Neue Vorlage erstellen/i)).toBeInTheDocument()
      })

      // Fill in title and text
      fireEvent.change(screen.getByPlaceholderText(/Standard, Förmlich/i), {
        target: { value: 'Frühlings-Rabatt' }
      })
      fireEvent.change(screen.getByPlaceholderText(/Der Textbaustein/i), {
        target: { value: 'Sehr geehrte Kunden, profitieren Sie von unserem Frühlingsangebot:' }
      })

      // Save
      fireEvent.click(screen.getByRole('button', { name: /Vorlage speichern/i }))

      await waitFor(() => {
        expect(screen.getByText('Frühlings-Rabatt')).toBeInTheDocument()
      })
    })
  })

  // ==========================================
  // LAYER 2: EDGE CASES
  // ==========================================
  describe('Layer 2: Edge Cases', () => {
    it('displays invalid format warning when non-QR IBAN is entered in QR-IBAN field', async () => {
      render(<EinstellungenView userName="Florence Lourini" />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Einstellungen' })).toBeInTheDocument()
      })

      const finanzenBtn = screen.getByRole('button', { name: /Finanzen & Fristen/i })
      fireEvent.click(finanzenBtn)
      await waitFor(() => expect(screen.getByText('Bank & MWST')).toBeInTheDocument())

      const editBtns = screen.getAllByTitle('Bearbeiten')
      fireEvent.click(editBtns[0])
      await waitFor(() => expect(screen.getByLabelText(/QR-IBAN/i)).toBeInTheDocument())

      // Standard IBAN (IID 00762 not in 30000-31999) entered in QR-IBAN field
      const qrIbanInput = screen.getByLabelText(/QR-IBAN/i)
      fireEvent.change(qrIbanInput, { target: { value: 'CH93 0076 2011 6238 5295 7' } })

      await waitFor(() => {
        expect(screen.getByText(/Keine QR-IBAN/i)).toBeInTheDocument()
      })
    })

    it('handles empty settings response by seeding default Swiss values and templates', async () => {
      mockCustomSettings = {
        ...mockSettings,
        text_vorlagen: []
      }

      render(<EinstellungenView userName="Florence Lourini" />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Einstellungen' })).toBeInTheDocument()
      })

      const vorlagenBtn = screen.getByRole('button', { name: /Vorlagen & Texte/i })
      fireEvent.click(vorlagenBtn)

      await waitFor(() => {
        // Seeding populates default Swiss templates
        expect(screen.getAllByText(/Standard/i).length).toBeGreaterThan(0)
      })
    })

    it('cancels edit mode without persisting draft changes when Abbrechen is clicked', async () => {
      render(<EinstellungenView userName="Florence Lourini" />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Einstellungen' })).toBeInTheDocument()
      })

      const firmaBtn = screen.getByRole('button', { name: /Firma & Adresse/i })
      fireEvent.click(firmaBtn)
      await waitFor(() => expect(screen.getByText('Stammdaten & Adresse')).toBeInTheDocument())

      const editBtns = screen.getAllByTitle('Bearbeiten')
      fireEvent.click(editBtns[0])
      await waitFor(() => expect(screen.getByDisplayValue('Flo Art – Polsterei')).toBeInTheDocument())

      // Change name in draft
      const nameInput = screen.getByDisplayValue('Flo Art – Polsterei')
      fireEvent.change(nameInput, { target: { value: 'Geänderter Firmenname' } })

      // Cancel edit
      fireEvent.click(screen.getByRole('button', { name: /Abbrechen/i }))

      await waitFor(() => {
        // Must show original name
        expect(screen.getAllByText('Flo Art – Polsterei').length).toBeGreaterThan(0)
        expect(screen.queryByText('Geänderter Firmenname')).not.toBeInTheDocument()
      })
    })
  })

  // ==========================================
  // LAYER 3: ERROR PATHS
  // ==========================================
  describe('Layer 3: Error Paths', () => {
    it('displays error toast when database update throws an exception on save', async () => {
      render(<EinstellungenView userName="Florence Lourini" />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Einstellungen' })).toBeInTheDocument()
      })

      const firmaBtn = screen.getByRole('button', { name: /Firma & Adresse/i })
      fireEvent.click(firmaBtn)
      await waitFor(() => expect(screen.getByText('Stammdaten & Adresse')).toBeInTheDocument())

      // Override update on Supabase to simulate failure
      const { supabase } = await import('../../lib/supabase')
      const origFrom = supabase.from
      supabase.from = vi.fn((table) => {
        const b = origFrom(table)
        if (table === 'einstellungen') {
          return {
            ...b,
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: { message: 'Datenbank Schreibfehler 500' } })
            })
          }
        }
        return b
      })

      const editBtns = screen.getAllByTitle('Bearbeiten')
      fireEvent.click(editBtns[0])
      await waitFor(() => expect(screen.getByRole('button', { name: /Speichern/i })).toBeInTheDocument())

      fireEvent.click(screen.getByRole('button', { name: /Speichern/i }))

      await waitFor(() => {
        expect(screen.getByText(/Fehler beim Speichern/i)).toBeInTheDocument()
      })
      supabase.from = origFrom
    })

    it('restricts editing for Treuhänder role (read-only mode)', async () => {
      render(<EinstellungenView userName="Florence Lourini" userRole="treuhand" />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Einstellungen' })).toBeInTheDocument()
      })

      const firmaBtn = screen.getByRole('button', { name: /Firma & Adresse/i })
      fireEvent.click(firmaBtn)

      await waitFor(() => {
        expect(screen.getByText('Stammdaten & Adresse')).toBeInTheDocument()
      })

      // Treuhänder has no edit button on Firma & Adresse
      expect(screen.queryByTitle('Bearbeiten')).not.toBeInTheDocument()
    })

    it('rejects empty template submission with validation error toast', async () => {
      render(<EinstellungenView userName="Florence Lourini" />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Einstellungen' })).toBeInTheDocument()
      })

      const vorlagenBtn = screen.getByRole('button', { name: /Vorlagen & Texte/i })
      fireEvent.click(vorlagenBtn)

      await waitFor(() => {
        expect(screen.getByText('Offerten - Einleitung')).toBeInTheDocument()
      })

      const newTemplateBtns = screen.getAllByRole('button', { name: /\+ Neue Vorlage/i })
      fireEvent.click(newTemplateBtns[0])

      await waitFor(() => {
        expect(screen.getByText(/Neue Vorlage erstellen/i)).toBeInTheDocument()
      })

      // Submit without title or text
      fireEvent.click(screen.getByRole('button', { name: /Vorlage speichern/i }))

      await waitFor(() => {
        expect(screen.getByText(/Bitte fülle Titel und Text aus/i)).toBeInTheDocument()
      })
    })
  })

  // ==========================================
  // LAYER 4: ASYNC & INTEGRATION
  // ==========================================
  describe('Layer 4: Async & Integration', () => {
    it('loads active team members and renders them in Team & Benutzer tab', async () => {
      render(<EinstellungenView userName="Florence Lourini" />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Einstellungen' })).toBeInTheDocument()
      })

      const teamBtn = screen.getByRole('button', { name: /Team & Benutzer/i })
      fireEvent.click(teamBtn)

      await waitFor(() => {
        expect(screen.getByText('florence@flo-art.ch')).toBeInTheDocument()
        expect(screen.getByText('Inhaber')).toBeInTheDocument()
      })
    })

    it('invites a new team member and displays generated invitation link', async () => {
      render(<EinstellungenView userName="Florence Lourini" />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Einstellungen' })).toBeInTheDocument()
      })

      const teamBtn = screen.getByRole('button', { name: /Team & Benutzer/i })
      fireEvent.click(teamBtn)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Mitglied einladen/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /Mitglied einladen/i }))

      await waitFor(() => {
        expect(screen.getByText(/Neues Mitglied einladen/i)).toBeInTheDocument()
      })

      // Fill in email
      fireEvent.change(screen.getByPlaceholderText(/mitarbeiter@firma\.ch/i), {
        target: { value: 'neuer.mitarbeiter@flo-art.ch' }
      })

      // Submit invite
      fireEvent.click(screen.getByRole('button', { name: /Einladung erstellen/i }))

      await waitFor(() => {
        expect(screen.getByText(/Einladung erfolgreich erstellt/i)).toBeInTheDocument()
        expect(screen.getByText(/Einladungslink generiert!/i)).toBeInTheDocument()
      })
    })

    it('updates user full name in auth metadata and propagates to parent callback', async () => {
      const parentNameChangeMock = vi.fn()
      render(<EinstellungenView userName="Florence Lourini" onUserNameChange={parentNameChangeMock} />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Einstellungen' })).toBeInTheDocument()
      })

      // Currently on "Mein Profil" tab
      expect(screen.getByText('Persönliche Angaben')).toBeInTheDocument()
      expect(screen.getAllByText('Florence Lourini').length).toBeGreaterThan(0)

      // Click "Bearbeiten" on profile
      const editProfileBtns = screen.getAllByTitle('Bearbeiten')
      fireEvent.click(editProfileBtns[0])

      await waitFor(() => {
        expect(screen.getByDisplayValue('Florence Lourini')).toBeInTheDocument()
      })

      // Change name and save
      const nameInput = screen.getByDisplayValue('Florence Lourini')
      fireEvent.change(nameInput, { target: { value: 'Florence Lourini-Gygax' } })

      const saveBtn = screen.getByRole('button', { name: /Speichern/i })
      fireEvent.click(saveBtn)

      await waitFor(() => {
        expect(parentNameChangeMock).toHaveBeenCalledWith('Florence Lourini-Gygax')
      })
    })
  })
})
