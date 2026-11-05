import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-123', email: 'support@ki-netic.ch' } }, error: null })
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      }))
    })),
    rpc: vi.fn().mockResolvedValue({ data: { success: true }, error: null })
  }
}))

import { 
  checkIsSuperAdmin, 
  SUPERADMIN_EMAIL,
  impersonateTenant,
  getImpersonationState,
  exitImpersonation
} from '../adminService'

// Mock localStorage for Node 22 / Vitest compatibility
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = String(value)
    }),
    removeItem: vi.fn(key => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    })
  }
})()

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true })
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, configurable: true })

describe('adminService - Platform Super-Admin & Impersonation', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('recognizes support@ki-netic.ch as superadmin', async () => {
    const user = { id: 'admin-123', email: 'support@ki-netic.ch' }
    const isSuper = await checkIsSuperAdmin(user)
    expect(isSuper).toBe(true)
  })

  it('rejects regular customer emails from superadmin privileges', async () => {
    const regularUser = { id: 'user-456', email: 'maler.meier@bluewin.ch' }
    const isSuper = await checkIsSuperAdmin(regularUser)
    expect(isSuper).toBe(false)
  })

  it('correctly handles impersonation session state in localStorage', async () => {
    expect(getImpersonationState()).toBeNull()

    const mockTenantId = 'tenant-test-uuid-777'
    const mockTenantName = 'Schreinerei Muster AG'

    const res = await impersonateTenant(mockTenantId, mockTenantName)
    expect(res.success).toBe(true)

    const activeState = getImpersonationState()
    expect(activeState).not.toBeNull()
    expect(activeState.tenantId).toBe(mockTenantId)
    expect(activeState.tenantName).toBe(mockTenantName)

    exitImpersonation()
    expect(getImpersonationState()).toBeNull()
  })
})
