import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RapportDetailModal from '../RapportDetailModal'

// Mock supabase
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      }))
    }))
  }
}))

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString()
    }),
    clear: vi.fn(() => {
      store = {}
    })
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })

describe('RapportDetailModal', () => {
  const mockProjekt = { id: 'p1', name: 'Neubau MFH Sonnenberg', adresse: 'Sonnenweg 4, 8000 Zürich' }
  const mockKunde = { id: 'k1', name: 'Marc Wäckerli', email: 'marc@waeckerli.ch' }
  const mockRapport = {
    id: 'rap-101',
    rapport_nr: 'RAP-2026-0042',
    datum: '2026-10-06',
    monteur_name: 'Silvan Frei',
    beschreibung: 'Sanitärinstallation Hauptleitung montiert und druckgeprüft.',
    status: 'Unterschrieben',
    stunden: [
      { id: '1', mitarbeiter: 'Silvan Frei', taetigkeit: 'Montage Druckleitung', stunden: 4.5, ansatz: 110.00 }
    ],
    material: [
      { id: '1', artikel: 'Edelstahlrohr 28mm', menge: 6, einheit: 'm', preis: 24.50 }
    ],
    unterschrift_data: 'data:image/png;base64,sampleSignatureData',
    unterzeichner_name: 'Marc Wäckerli',
    unterschrieben_am: '2026-10-06T11:30:00Z'
  }

  beforeEach(() => {
    localStorageMock.clear()
    window.print = vi.fn()
  })

  it('renders rapport details, hours, material, and client signature', () => {
    render(
      <RapportDetailModal
        isOpen={true}
        onClose={vi.fn()}
        rapport={mockRapport}
        projekt={mockProjekt}
        kunde={mockKunde}
      />
    )

    // Header & Info (RAP-2026-0042 appears in title bar and document)
    expect(screen.getAllByText('RAP-2026-0042').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Unterschrieben')).toBeInTheDocument()
    expect(screen.getByText(/Neubau MFH Sonnenberg/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Marc Wäckerli/i).length).toBeGreaterThanOrEqual(1)

    // Hours row
    expect(screen.getByText('Montage Druckleitung')).toBeInTheDocument()
    expect(screen.getByText(/4\.5\s*h/i)).toBeInTheDocument()

    // Material row
    expect(screen.getByText('Edelstahlrohr 28mm')).toBeInTheDocument()
    expect(screen.getByText(/6\s*m/i)).toBeInTheDocument()

    // Signature
    expect(screen.getByAltText('Kundenunterschrift')).toBeInTheDocument()
    expect(screen.getByText(/Abgenommen durch: Marc Wäckerli/i)).toBeInTheDocument()
  })

  it('triggers window.print when clicking print button', () => {
    render(
      <RapportDetailModal
        isOpen={true}
        onClose={vi.fn()}
        rapport={mockRapport}
        projekt={mockProjekt}
        kunde={mockKunde}
      />
    )

    const printBtn = screen.getByText(/Drucken \/ PDF/i)
    fireEvent.click(printBtn)

    expect(window.print).toHaveBeenCalledTimes(1)
  })

  it('converts to invoice when clicking "In Rechnung übernehmen"', async () => {
    const handleConvertToInvoice = vi.fn()
    const handleClose = vi.fn()

    render(
      <RapportDetailModal
        isOpen={true}
        onClose={handleClose}
        rapport={{ ...mockRapport }}
        projekt={mockProjekt}
        kunde={mockKunde}
        onConvertToInvoice={handleConvertToInvoice}
      />
    )

    const convertBtn = screen.getByText(/In Rechnung übernehmen/i)
    expect(convertBtn).toBeInTheDocument()

    fireEvent.click(convertBtn)

    await waitFor(() => {
      expect(handleConvertToInvoice).toHaveBeenCalledWith(expect.objectContaining({
        id: 'rap-101',
        status: 'Verrechnet'
      }))
      expect(handleClose).toHaveBeenCalled()
    })
  })

  it('does not display "In Rechnung übernehmen" button if already billed (Verrechnet)', () => {
    render(
      <RapportDetailModal
        isOpen={true}
        onClose={vi.fn()}
        rapport={{ ...mockRapport, status: 'Verrechnet' }}
        projekt={mockProjekt}
        kunde={mockKunde}
        onConvertToInvoice={vi.fn()}
      />
    )

    expect(screen.queryByText(/In Rechnung übernehmen/i)).not.toBeInTheDocument()
  })
})
