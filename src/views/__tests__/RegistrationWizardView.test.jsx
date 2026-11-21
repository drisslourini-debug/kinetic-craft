import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RegistrationWizardView from '../RegistrationWizardView'

const sessionStorageStore = {}
const sessionStorageMock = {
  getItem: vi.fn((key) => sessionStorageStore[key] ?? null),
  setItem: vi.fn((key, value) => {
    sessionStorageStore[key] = String(value)
  }),
  removeItem: vi.fn((key) => {
    delete sessionStorageStore[key]
  }),
  clear: vi.fn(() => {
    Object.keys(sessionStorageStore).forEach((k) => delete sessionStorageStore[k])
  }),
}
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock, configurable: true })

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn().mockResolvedValue({
        data: { user: { id: 'usr-1' }, session: null },
        error: null,
      }),
      resend: vi.fn().mockResolvedValue({
        data: {},
        error: null,
      }),
    },
    rpc: vi.fn().mockResolvedValue({ error: null }),
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) })) })),
      insert: vi.fn().mockResolvedValue({ data: [], error: null }),
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    })),
  },
}))

describe('RegistrationWizardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.hash = ''
  })

  it('renders Step 1 with user account inputs and validation', async () => {
    render(
      <RegistrationWizardView
        onRegistrationSuccess={vi.fn()}
        onGoToLogin={vi.fn()}
      />
    )

    expect(screen.getByText(/Neues Betriebskonto erstellen/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Beat')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Muster')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('beat@schreinerei-muster.ch')).toBeInTheDocument()

    // Clicking next without inputs shows validation error
    const nextBtn = screen.getByText(/Weiter zu Firmendaten/i)
    fireEvent.click(nextBtn)

    expect(screen.getByText(/Bitte geben Sie Ihren vollständigen Vor- und Nachnamen ein/i)).toBeInTheDocument()
  })

  it('shows resend button and email-correction link on Step 4 (email verification screen)', async () => {
    // Set step to 4 via hash
    window.location.hash = '#register?step=4'

    render(
      <RegistrationWizardView
        onRegistrationSuccess={vi.fn()}
        onGoToLogin={vi.fn()}
      />
    )

    expect(screen.getByText('Fast geschafft!')).toBeInTheDocument()
    expect(screen.getByText('Aktivierungs-E-Mail erneut senden')).toBeInTheDocument()
    expect(screen.getByText('E-Mail-Adresse korrigieren')).toBeInTheDocument()

    // Test clicking "E-Mail-Adresse korrigieren" brings back to Step 1
    const correctLink = screen.getByText('E-Mail-Adresse korrigieren')
    fireEvent.click(correctLink)

    expect(screen.getByPlaceholderText('Beat')).toBeInTheDocument()
  })
})
