import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FirstLoginWelcomeModal from '../FirstLoginWelcomeModal'

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
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true })
Object.defineProperty(global, 'localStorage', { value: localStorageMock, configurable: true })

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}))

describe('FirstLoginWelcomeModal', () => {
  const mockTenant = { id: '00000000-0000-0000-0000-000000000001', name: 'Muster Schreinerei AG' }
  const mockSettings = { id: 1, tenant_id: '00000000-0000-0000-0000-000000000001', firmenname: 'Muster Schreinerei AG', standard_mwst: 8.1, qr_iban: '' }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  it('renders Step 1 with QR-IBAN and bank fields when open', () => {
    render(
      <FirstLoginWelcomeModal
        isOpen={true}
        onClose={vi.fn()}
        globalSettings={mockSettings}
        tenantInfo={mockTenant}
        onNavigate={vi.fn()}
      />
    )

    expect(screen.getByText('Willkommen bei Kinetic Craft')).toBeInTheDocument()
    expect(screen.getByText(/Bankverbindung & QR-IBAN/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('CH93 3000 0000 0000 0000 0')).toBeInTheDocument()
  })

  it('advances from Step 1 to Step 2 and saves to Step 3', async () => {
    const mockRefresh = vi.fn().mockResolvedValue()
    const mockNavigate = vi.fn()

    render(
      <FirstLoginWelcomeModal
        isOpen={true}
        onClose={vi.fn()}
        globalSettings={mockSettings}
        refreshGlobalSettings={mockRefresh}
        tenantInfo={mockTenant}
        onNavigate={mockNavigate}
      />
    )

    // Step 1 -> Step 2
    const nextBtn = screen.getByText(/Weiter zu MWST & UID/i)
    fireEvent.click(nextBtn)

    expect(screen.getByText(/Mehrwertsteuer \(MWST\) & Schweizer UID/i)).toBeInTheDocument()
    expect(screen.getByText(/MWST-pflichtig/i)).toBeInTheDocument()

    // Step 2 -> Save & Step 3
    const saveBtn = screen.getByText(/Einstellungen speichern/i)
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByText('Ihr Betrieb ist einsatzbereit!')).toBeInTheDocument()
    })

    expect(mockRefresh).toHaveBeenCalled()
  })

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <FirstLoginWelcomeModal
        isOpen={false}
        onClose={vi.fn()}
        globalSettings={mockSettings}
        tenantInfo={mockTenant}
        onNavigate={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })
})
