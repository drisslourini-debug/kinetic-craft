import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import KundeDetailView from '../KundeDetailView'

const mockKunde = {
  id: 42,
  kundennummer: 'K-1001',
  name: 'Maler Meister AG Beat Meier',
  firmenname: 'Maler Meister AG',
  vorname: 'Beat',
  nachname: 'Meier',
  anrede: 'Firma',
  typ: 'Geschäftskunde (Allgemein)',
  strasse: 'Hauptstrasse 12',
  plz: '8570',
  ort: 'Weinfelden',
  land: 'Schweiz',
  telefon: '+41 71 622 33 44',
  email: 'beat@maler-meister.ch',
  website: 'https://maler-meister.ch',
  notizen: 'Zuverlässiger Maler-Partner',
  status: 'Aktiv',
  zahlungsziel: '30 Tage netto',
  is_archived: false,
  tenant_id: '78d4896d-6288-4f5a-9f4b-b99c9d88cdd4',
  // Enriched UI properties that are NOT database columns
  projekteList: [{ id: 1, name: 'Fassadenanstrich', status: 'In Arbeit' }],
  rechnungenList: [{ id: 10, total: 4500, bezahlt: 4500, status: 'Bezahlt' }],
  offertenList: [],
  aktiveProjekteCount: 1,
  totalUmsatz: 4500,
  offenTotal: 0,
  ueberfaelligTotal: 0,
  ueberfaelligCount: 0,
  isB2B: true,
  isZefixVerified: true,
  zahlungsmoral: { label: 'Top', score: 'Sehr gut' }
}

const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ data: null, error: null })
})

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table) => {
      if (table === 'kunden') {
        return {
          update: (...args) => mockUpdate(...args),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      }
    }),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.url/doc.pdf' } }))
      }))
    }
  }
}))

describe('KundeDetailView Audit & Sanitization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders customer header, tabs and contact data correctly', async () => {
    render(<KundeDetailView kunde={mockKunde} onBack={vi.fn()} onNavigate={vi.fn()} />)

    expect(screen.getAllByText('Maler Meister AG Beat Meier').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('K-1001').length).toBeGreaterThanOrEqual(1)

    await waitFor(() => {
      expect(screen.getAllByTitle('Bearbeiten').length).toBeGreaterThan(0)
    })
  })

  it('strips non-DB enriched properties when saving stammdaten to prevent PGRST204 errors', async () => {
    render(<KundeDetailView kunde={mockKunde} onBack={vi.fn()} onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getAllByTitle('Bearbeiten').length).toBeGreaterThan(0)
    })

    // Find and click the edit button on the first SettingsBlock (Stammdaten)
    const editBtns = screen.getAllByTitle('Bearbeiten')
    fireEvent.click(editBtns[0])

    // Find the save button
    const saveBtn = screen.getByRole('button', { name: /Speichern/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled()
    })

    const savedPayload = mockUpdate.mock.calls[0][0]
    
    // Verify valid columns are kept
    expect(savedPayload.firmenname).toBe('Maler Meister AG')
    expect(savedPayload.vorname).toBe('Beat')
    expect(savedPayload.kundennummer).toBe('K-1001')

    // Verify enriched UI properties are strictly stripped
    expect(savedPayload.projekteList).toBeUndefined()
    expect(savedPayload.rechnungenList).toBeUndefined()
    expect(savedPayload.offertenList).toBeUndefined()
    expect(savedPayload.aktiveProjekteCount).toBeUndefined()
    expect(savedPayload.totalUmsatz).toBeUndefined()
    expect(savedPayload.offenTotal).toBeUndefined()
    expect(savedPayload.ueberfaelligTotal).toBeUndefined()
    expect(savedPayload.ueberfaelligCount).toBeUndefined()
    expect(savedPayload.isB2B).toBeUndefined()
    expect(savedPayload.isZefixVerified).toBeUndefined()
    expect(savedPayload.zahlungsmoral).toBeUndefined()
    expect(savedPayload.id).toBeUndefined()
  })

  it('navigates to new project, new offer and new invoice with prefilled customer id', async () => {
    const onNavigateMock = vi.fn()
    render(<KundeDetailView kunde={mockKunde} onBack={vi.fn()} onNavigate={onNavigateMock} />)

    await waitFor(() => {
      expect(screen.getAllByTitle('Bearbeiten').length).toBeGreaterThan(0)
    })

    // Switch to projekte tab and click "+ Erstes Projekt erstellen"
    fireEvent.click(screen.getByText('Projekte'))
    const newProjBtn = await screen.findByText(/\+ Erstes Projekt erstellen/i)
    fireEvent.click(newProjBtn)
    expect(onNavigateMock).toHaveBeenCalledWith('projekte', { action: 'create', kundeId: 42 })

    // Switch to offerten tab and click "+ Erste Offerte erstellen"
    fireEvent.click(screen.getByText('Offerten'))
    const newOffBtn = await screen.findByText(/\+ Erste Offerte erstellen/i)
    fireEvent.click(newOffBtn)
    expect(onNavigateMock).toHaveBeenCalledWith('offerten', { action: 'create', kundeId: 42 })

    // Switch to finanzen tab and click "+ Neue Rechnung"
    fireEvent.click(screen.getByText('Finanzen'))
    const newRechBtn = await screen.findByText(/\+ Neue Rechnung/i)
    fireEvent.click(newRechBtn)
    expect(onNavigateMock).toHaveBeenCalledWith('rechnungen', { action: 'create', kundeId: 42 })
  })
})
