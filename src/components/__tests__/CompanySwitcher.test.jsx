import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CompanySwitcher from '../CompanySwitcher'
import { supabase } from '../../lib/supabase'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user-123' } } }
      })
    }
  }
}))

describe('CompanySwitcher Component', () => {
  const mockTenants = [
    {
      tenant_id: 'f10a2701-0001-4000-8000-000000000001',
      name: 'Flo Art – Töpferei',
      firmenname: 'Flo Art – Töpferei',
      ort: 'Bern',
      primary_color: '#FF6B35',
      role: 'admin',
      is_active: true
    },
    {
      tenant_id: 'f10a2702-0002-4000-8000-000000000002',
      name: 'Flo Art – Polsterei',
      firmenname: 'Flo Art – Polsterei',
      ort: 'Ittigen',
      primary_color: '#6B3A8E',
      role: 'admin',
      is_active: false
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    supabase.rpc.mockResolvedValue({
      data: mockTenants,
      error: null
    })
  })

  it('renders current tenant in header variant with location badge', async () => {
    await act(async () => {
      render(
        <CompanySwitcher
          currentTenant={{ id: mockTenants[0].tenant_id, name: mockTenants[0].name }}
          currentSettings={{ firmenname: 'Flo Art – Töpferei', ort: 'Bern', primary_color: '#FF6B35' }}
          variant="header"
        />
      )
    })

    expect(screen.getByText('Flo Art – Töpferei')).toBeInTheDocument()
    expect(screen.getByText('Bern')).toBeInTheDocument()
  })

  it('renders current tenant in sidebar variant and indicates multi-business count', async () => {
    await act(async () => {
      render(
        <CompanySwitcher
          currentTenant={{ id: mockTenants[0].tenant_id, name: mockTenants[0].name }}
          currentSettings={{ firmenname: 'Flo Art – Töpferei', ort: 'Bern', primary_color: '#FF6B35' }}
          variant="sidebar"
        />
      )
    })

    expect(screen.getByText('Flo Art – Töpferei')).toBeInTheDocument()
    expect(screen.getByText('Bern')).toBeInTheDocument()
    expect(screen.getByText(/2 Betriebe/i)).toBeInTheDocument()
  })

  it('opens dropdown and displays all available business divisions on click', async () => {
    await act(async () => {
      render(
        <CompanySwitcher
          currentTenant={{ id: mockTenants[0].tenant_id, name: mockTenants[0].name }}
          currentSettings={{ firmenname: 'Flo Art – Töpferei', ort: 'Bern', primary_color: '#FF6B35' }}
          variant="sidebar"
        />
      )
    })

    const triggerBtn = screen.getByTitle('Betrieb / Standort wechseln')
    await act(async () => {
      fireEvent.click(triggerBtn)
    })

    expect(screen.getByText('Aktiver Betrieb')).toBeInTheDocument()
    expect(screen.getByText('Flo Art – Polsterei')).toBeInTheDocument()
    expect(screen.getByText('Ittigen')).toBeInTheDocument()
  })

  it('calls onSwitchTenant when a different company is clicked', async () => {
    const handleSwitch = vi.fn().mockResolvedValue({ success: true })

    await act(async () => {
      render(
        <CompanySwitcher
          currentTenant={{ id: mockTenants[0].tenant_id, name: mockTenants[0].name }}
          currentSettings={{ firmenname: 'Flo Art – Töpferei', ort: 'Bern', primary_color: '#FF6B35' }}
          onSwitchTenant={handleSwitch}
          variant="header"
        />
      )
    })

    const triggerBtn = screen.getByTitle('Betrieb / Standort wechseln')
    await act(async () => {
      fireEvent.click(triggerBtn)
    })

    const polstereiBtn = screen.getByText('Flo Art – Polsterei')
    await act(async () => {
      fireEvent.click(polstereiBtn)
    })

    expect(handleSwitch).toHaveBeenCalledWith('f10a2702-0002-4000-8000-000000000002')
  })
})
