import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminLayout from '../AdminLayout'

// Mock adminService
vi.mock('../../../services/adminService', () => ({
  fetchPlatformKpis: vi.fn().mockResolvedValue({
    total_tenants: 8,
    active_tenants: 5,
    trial_tenants: 3,
    suspended_tenants: 0,
    mrr: 245,
    open_tickets: 2,
    total_kunden: 42,
    total_rechnungen: 110,
  }),
  fetchTenants: vi.fn().mockResolvedValue([
    {
      id: 't-1',
      name: 'Flo Art Töpferei',
      firmenname: 'Flo Art Töpferei',
      status: 'active',
      price_chf: 49.00,
      email: 'florence@floart.ch',
      ort: 'Bern',
      kanton: 'BE',
      trial_ends_at: null,
    },
    {
      id: 't-2',
      name: 'Maler Müller GmbH',
      firmenname: 'Maler Müller GmbH',
      status: 'trial',
      price_chf: 49.00,
      email: 'info@maler-mueller.ch',
      ort: 'Zürich',
      kanton: 'ZH',
      trial_ends_at: new Date(Date.now() + 10 * 86400000).toISOString(),
    }
  ]),
  fetchSupportTickets: vi.fn().mockResolvedValue([
    {
      id: 'ticket-1',
      tenant_name: 'Flo Art Töpferei',
      title: 'Frage zu QR-Rechnung',
      category: 'billing',
      priority: 'high',
      status: 'open',
      created_at: new Date().toISOString(),
    }
  ]),
  fetchTicketMessages: vi.fn().mockResolvedValue([]),
  fetchPlatformInvoices: vi.fn().mockResolvedValue([]),
  fetchCrmNotes: vi.fn().mockResolvedValue([]),
  impersonateTenant: vi.fn().mockResolvedValue({ success: true }),
  updateTenant: vi.fn().mockResolvedValue({ success: true }),
  extendTenantTrial: vi.fn().mockResolvedValue({ success: true }),
}))

describe('AdminLayout & Dark-Ops Platform Cockpit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dark ops brand, live clock, and navigation items', async () => {
    render(<AdminLayout initialTab="cockpit" />)

    expect(screen.getByText('Kinetic Craft')).toBeInTheDocument()
    expect(screen.getByText('OPS')).toBeInTheDocument()
    expect(screen.getByText('Cockpit & KPIs')).toBeInTheDocument()
    expect(screen.getByText('Mandanten & Betriebe')).toBeInTheDocument()
    expect(screen.getByText('Support-Tickets')).toBeInTheDocument()
    expect(screen.getByText('Lizenzen & Abrechnung')).toBeInTheDocument()
    expect(screen.getByText('CRM-Betreuung & Notizen')).toBeInTheDocument()

    // Verify Cockpit view loaded
    await waitFor(() => {
      expect(screen.getByText('Kinetic Craft Operations')).toBeInTheDocument()
    })
  })

  it('switches between tabs when navigation buttons are clicked', async () => {
    render(<AdminLayout initialTab="cockpit" />)

    // Click on Mandanten & Betriebe
    const tenantsBtn = screen.getByRole('button', { name: /Mandanten & Betriebe/i })
    fireEvent.click(tenantsBtn)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Firma, Ort oder E-Mail suchen.../i)).toBeInTheDocument()
    })

    // Click on Support-Tickets
    const ticketsBtn = screen.getByRole('button', { name: /Support-Tickets/i })
    fireEvent.click(ticketsBtn)

    await waitFor(() => {
      expect(screen.getByText(/Support-Tickets & Postfach/i)).toBeInTheDocument()
    })
  })
})
