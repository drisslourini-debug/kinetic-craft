import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function CompanySwitcher({
  currentTenant,
  currentSettings,
  onSwitchTenant,
  className = '',
  variant = 'sidebar' // 'sidebar' | 'header'
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [tenants, setTenants] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load user's tenants
  const loadTenants = async () => {
    if (!supabase) return
    setIsLoading(true)
    try {
      // 1. Try RPC function
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_tenants')
      if (!rpcError && rpcData && rpcData.length > 0) {
        setTenants(rpcData)
        return
      }

      // 2. Fallback: Query user_tenants directly
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        const { data: userTenantsData } = await supabase
          .from('user_tenants')
          .select('tenant_id, role, tenants(id, name)')
          .eq('user_id', session.user.id)

        if (userTenantsData && userTenantsData.length > 0) {
          const tenantIds = userTenantsData.map(ut => ut.tenant_id)
          const { data: settingsList } = await supabase
            .from('einstellungen')
            .select('tenant_id, firmenname, ort, primary_color, logo_url')
            .in('tenant_id', tenantIds)

          const combined = userTenantsData.map(ut => {
            const st = settingsList?.find(s => s.tenant_id === ut.tenant_id)
            const activeId = currentTenant?.id || currentSettings?.tenant_id
            return {
              tenant_id: ut.tenant_id,
              name: ut.tenants?.name || 'Betrieb',
              role: ut.role,
              firmenname: st?.firmenname || ut.tenants?.name || 'Betrieb',
              ort: st?.ort || '',
              primary_color: st?.primary_color || '#b88a38',
              logo_url: st?.logo_url || '',
              is_active: ut.tenant_id === activeId
            }
          })
          setTenants(combined)
          return
        }
      }

      // 3. Fallback: If only current tenant is known
      if (currentTenant || currentSettings) {
        setTenants([{
          tenant_id: currentTenant?.id || currentSettings?.tenant_id,
          name: currentTenant?.name || currentSettings?.firmenname || 'Aktiver Betrieb',
          firmenname: currentSettings?.firmenname || currentTenant?.name || 'Aktiver Betrieb',
          ort: currentSettings?.ort || '',
          primary_color: currentSettings?.primary_color || '#b88a38',
          logo_url: currentSettings?.logo_url || '',
          is_active: true
        }])
      }
    } catch (err) {
      console.warn('CompanySwitcher: Failed to load tenants:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTenants()
  }, [currentTenant?.id, currentSettings?.tenant_id])

  const handleSelectTenant = async (tenant) => {
    if (tenant.is_active || isSwitching) return
    setIsSwitching(true)
    try {
      if (onSwitchTenant) {
        await onSwitchTenant(tenant.tenant_id)
      }
      setIsOpen(false)
      await loadTenants()
    } catch (err) {
      console.error('Failed to switch company:', err)
    } finally {
      setIsSwitching(false)
    }
  }

  const activeTenant = tenants.find(t => t.is_active) || {
    firmenname: currentSettings?.firmenname || currentTenant?.name || 'Betrieb auswählen',
    ort: currentSettings?.ort || '',
    primary_color: currentSettings?.primary_color || '#b88a38'
  }

  // Header Variant (for top bar)
  if (variant === 'header') {
    return (
      <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen)
            if (!isOpen) loadTenants()
          }}
          disabled={isSwitching}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200/80 text-xs font-semibold text-text-primary transition-all cursor-pointer shadow-2xs group focus:outline-none focus:ring-2 focus:ring-primary-400"
          title="Betrieb / Standort wechseln"
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs transition-transform group-hover:scale-110"
            style={{ backgroundColor: activeTenant.primary_color || '#b88a38' }}
          />
          <span className="truncate max-w-[150px] sm:max-w-[200px] font-bold">
            {activeTenant.firmenname}
          </span>
          {activeTenant.ort && (
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-md bg-white text-[10px] text-text-secondary border border-neutral-200 uppercase font-mono font-bold">
              {activeTenant.ort}
            </span>
          )}
          {tenants.length > 1 && (
            <svg
              className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/5 border border-border z-50 animate-scale-in">
            <div className="px-3 py-2 border-b border-border mb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Betrieb / Standort wählen
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                Nahtloser Wechsel zwischen Betrieben
              </p>
            </div>

            <div className="space-y-1 max-h-64 overflow-y-auto py-1">
              {tenants.map(t => (
                <button
                  key={t.tenant_id}
                  type="button"
                  onClick={() => handleSelectTenant(t)}
                  disabled={isSwitching}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    t.is_active
                      ? 'bg-neutral-100 font-bold text-text-primary'
                      : 'hover:bg-neutral-50 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: t.primary_color || '#b88a38' }}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{t.firmenname || t.name}</p>
                      {t.ort && (
                        <p className="text-[11px] text-text-muted font-normal">
                          Standort: {t.ort}
                        </p>
                      )}
                    </div>
                  </div>
                  {t.is_active && (
                    <span className="text-primary-600 font-bold shrink-0 ml-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>

            {isSwitching && (
              <div className="px-3 py-2 text-center text-xs text-primary-600 font-medium border-t border-border mt-1">
                Betrieb wird geladen...
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Sidebar Variant
  return (
    <div className={`px-3 py-2 ${className}`} ref={dropdownRef}>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen)
            if (!isOpen) loadTenants()
          }}
          disabled={isSwitching}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer group focus:outline-none"
          title="Betrieb / Standort wechseln"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: activeTenant.primary_color || '#b88a38' }}
            />
            <div className="text-left min-w-0">
              <p className="text-white text-xs font-bold truncate leading-tight">
                {activeTenant.firmenname}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {activeTenant.ort && (
                  <span className="text-[10px] text-amber-400 font-medium">
                    {activeTenant.ort}
                  </span>
                )}
                {tenants.length > 1 && (
                  <span className="text-[9px] text-white/40 uppercase tracking-wider">
                    • {tenants.length} Betriebe
                  </span>
                )}
              </div>
            </div>
          </div>
          {tenants.length > 1 && (
            <svg
              className={`w-3.5 h-3.5 text-white/50 transition-transform duration-200 group-hover:text-white shrink-0 ml-1 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>

        {/* Sidebar Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 right-0 mt-2 origin-top rounded-2xl bg-zinc-900 border border-white/10 p-2 shadow-2xl z-50 animate-scale-in text-white backdrop-blur-md">
            <div className="px-2 py-1.5 border-b border-white/10 mb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                Aktiver Betrieb
              </p>
            </div>

            <div className="space-y-1 max-h-56 overflow-y-auto py-1">
              {tenants.map(t => (
                <button
                  key={t.tenant_id}
                  type="button"
                  onClick={() => handleSelectTenant(t)}
                  disabled={isSwitching}
                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    t.is_active
                      ? 'bg-white/15 font-bold text-white'
                      : 'hover:bg-white/5 text-white/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: t.primary_color || '#b88a38' }}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{t.firmenname || t.name}</p>
                      {t.ort && (
                        <p className="text-[10px] text-white/50">{t.ort}</p>
                      )}
                    </div>
                  </div>
                  {t.is_active && (
                    <span className="text-amber-400 font-bold shrink-0 ml-2">✓</span>
                  )}
                </button>
              ))}
            </div>

            {isSwitching && (
              <div className="px-2 py-1.5 text-center text-xs text-amber-400 font-medium border-t border-white/10 mt-1">
                Wechsle Betrieb...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
