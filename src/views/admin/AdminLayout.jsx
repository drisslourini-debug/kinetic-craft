import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { pushRoute } from '../../lib/router'
import { 
  fetchPlatformKpis 
} from '../../services/adminService'
import AdminCockpitView from './AdminCockpitView'
import AdminTenantsView from './AdminTenantsView'
import AdminTicketsView from './AdminTicketsView'
import AdminBillingView from './AdminBillingView'
import AdminCrmNotesView from './AdminCrmNotesView'
import { 
  IconUsers, 
  IconDocument, 
  IconMail, 
  IconEuro, 
  IconEdit, 
  IconArrowRight
} from '../../components/icons/BrandIcons'

export default function AdminLayout({ initialTab = 'cockpit' }) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [selectedTenantForCrm, setSelectedTenantForCrm] = useState(null)
  const [openTicketCount, setOpenTicketCount] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [timeString, setTimeString] = useState('')

  useEffect(() => {
    setActiveTab(initialTab || 'cockpit')
  }, [initialTab])

  // Live Swiss Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTimeString(now.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Check open ticket count for badge
  useEffect(() => {
    async function loadBadge() {
      try {
        const kpis = await fetchPlatformKpis()
        if (kpis?.open_tickets) {
          setOpenTicketCount(kpis.open_tickets)
        }
      } catch (_) {}
    }
    loadBadge()
  }, [])

  const handleNavigateTab = (tab) => {
    setActiveTab(tab)
    setMobileMenuOpen(false)
    window.location.hash = `#admin/${tab}`
  }

  const handleOpenCrmForTenant = (tenant) => {
    setSelectedTenantForCrm(tenant)
    handleNavigateTab('crm')
  }

  const handleSwitchToClientDashboard = () => {
    pushRoute('dashboard', {})
  }

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    window.location.href = '/'
  }

  const navItems = [
    { key: 'cockpit', label: 'Cockpit & KPIs', icon: IconDocument },
    { key: 'tenants', label: 'Mandanten & Betriebe', icon: IconUsers },
    { key: 'tickets', label: 'Support-Tickets', icon: IconMail, badge: openTicketCount },
    { key: 'billing', label: 'Lizenzen & Abrechnung', icon: IconEuro },
    { key: 'crm', label: 'CRM-Betreuung & Notizen', icon: IconEdit },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-amber-500 selection:text-zinc-950">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 bg-zinc-900 border-r border-zinc-800/80 flex-col justify-between shrink-0 h-screen sticky top-0 p-4">
        <div className="space-y-6">
          {/* Brand Logo */}
          <div className="px-2 pt-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 text-zinc-950 font-black text-sm">
                KC
              </div>
              <div>
                <div className="font-extrabold text-sm text-white tracking-tight flex items-center gap-1.5">
                  <span>Kinetic Craft</span>
                  <span className="text-[9px] font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.2 rounded font-bold">
                    OPS
                  </span>
                </div>
                <div className="text-[10px] text-zinc-400 font-medium">
                  Super-Admin Platform CRM
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon
              const isActive = activeTab === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavigateTab(item.key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/10'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-950' : 'text-zinc-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge > 0 && (
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-zinc-950 text-amber-300' : 'bg-rose-500 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Bottom Profile & Actions */}
        <div className="pt-4 border-t border-zinc-800/80 space-y-2">
          <div className="px-2 py-1.5 bg-zinc-950/60 rounded-xl border border-zinc-800 text-[11px]">
            <div className="text-zinc-400">Angemeldet als Super-Admin:</div>
            <div className="font-mono font-bold text-amber-400 truncate">
              support@ki-netic.ch
            </div>
          </div>

          <button
            type="button"
            onClick={handleSwitchToClientDashboard}
            className="w-full py-2 px-3 bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-white rounded-xl text-xs font-medium border border-zinc-700/60 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Kunden-Dashboard</span>
            <IconArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-1.5 text-center text-xs text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer font-medium"
          >
            Abmelden
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-14 bg-zinc-900/60 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
            >
              ☰
            </button>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
                OPS LIVE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
            <span className="hidden sm:inline bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
              🇨🇭 Zürich: {timeString}
            </span>
          </div>
        </header>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-zinc-900 border-b border-zinc-800 p-4 space-y-2 animate-fade-in">
            {navItems.map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNavigateTab(item.key)}
                className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold ${
                  activeTab === item.key ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-300'
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={handleSwitchToClientDashboard}
                className="w-full text-left p-2 text-xs text-amber-400"
              >
                Zum Kunden-Dashboard ↗
              </button>
            </div>
          </div>
        )}

        {/* View Component Render */}
        <main className="flex-1">
          {activeTab === 'cockpit' && (
            <AdminCockpitView
              onNavigateTab={handleNavigateTab}
              onSelectTenant={handleOpenCrmForTenant}
            />
          )}

          {activeTab === 'tenants' && (
            <AdminTenantsView
              onOpenCrmNotes={handleOpenCrmForTenant}
            />
          )}

          {activeTab === 'tickets' && (
            <AdminTicketsView />
          )}

          {activeTab === 'billing' && (
            <AdminBillingView />
          )}

          {activeTab === 'crm' && (
            <AdminCrmNotesView
              initialTenant={selectedTenantForCrm}
            />
          )}
        </main>
      </div>
    </div>
  )
}
