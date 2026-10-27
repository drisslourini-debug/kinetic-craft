import { useState, useEffect } from 'react'
import { fetchPlatformKpis, fetchTenants, fetchSupportTickets } from '../../services/adminService'
import { formatCurrency, formatDate } from '../../lib/formatters'
import { 
  IconUsers, 
  IconDocument, 
  IconCheck, 
  IconClock, 
  IconWarning, 
  IconEuro, 
  IconMail,
  IconArrowRight
} from '../../components/icons/BrandIcons'

export default function AdminCockpitView({ onNavigateTab, onSelectTenant }) {
  const [kpis, setKpis] = useState(null)
  const [recentTenants, setRecentTenants] = useState([])
  const [openTickets, setOpenTickets] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const [kpisData, tenantsData, ticketsData] = await Promise.all([
          fetchPlatformKpis(),
          fetchTenants(),
          fetchSupportTickets('open')
        ])
        setKpis(kpisData)
        setRecentTenants((tenantsData || []).slice(0, 5))
        setOpenTickets((ticketsData || []).slice(0, 5))
      } catch (err) {
        console.error('Failed to load cockpit data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-zinc-900/60 rounded-2xl border border-zinc-800/60" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-zinc-900/60 rounded-2xl border border-zinc-800/60" />
          <div className="h-64 bg-zinc-900/60 rounded-2xl border border-zinc-800/60" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
              Plattform-Betrieb: Normal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Kinetic Craft Operations
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Zentrale Übersicht aller Mandanten, Lizenzen und Support-Aktivitäten
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigateTab('tenants')}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold border border-zinc-700 transition-colors cursor-pointer"
          >
            Alle Mandanten ({kpis?.total_tenants || 0})
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('tickets')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <IconMail className="w-4 h-4 text-zinc-950" />
            <span>Tickets ({kpis?.open_tickets || 0})</span>
          </button>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR Card */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 rounded-2xl border border-zinc-800 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Monatlicher Umsatz (MRR)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <IconEuro className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
            {formatCurrency(kpis?.mrr || 0)}
          </div>
          <div className="mt-2 text-[11px] text-zinc-400 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">{kpis?.active_tenants || 0}</span>
            <span>aktive Betriebe mit Lizenz</span>
          </div>
        </div>

        {/* Active vs Trial Tenants */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 rounded-2xl border border-zinc-800 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Testphasen aktiv
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <IconClock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono tracking-tight">
            {kpis?.trial_tenants || 0}
          </div>
          <div className="mt-2 text-[11px] text-zinc-400 flex items-center gap-1">
            <span>von insgesamt</span>
            <span className="text-zinc-200 font-semibold">{kpis?.total_tenants || 0} Mandanten</span>
          </div>
        </div>

        {/* Support Tickets */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 rounded-2xl border border-zinc-800 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Offene Anfragen
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-950/60 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <IconWarning className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
            {kpis?.open_tickets || 0}
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            {kpis?.open_tickets === 0 ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <IconCheck className="w-3.5 h-3.5" /> Alle Anfragen beantwortet
              </span>
            ) : (
              <span className="text-rose-400 font-semibold">Erfordert Aufmerksamkeit</span>
            )}
          </div>
        </div>

        {/* Platform Volume */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 rounded-2xl border border-zinc-800 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Rechnungen erfasst
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <IconDocument className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
            {kpis?.total_rechnungen || 0}
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            <span>bei <strong className="text-zinc-200">{kpis?.total_kunden || 0}</strong> Kundenkontakten</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Neueste Mandanten & Offene Support-Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tenants */}
        <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <IconUsers className="w-4 h-4 text-amber-400" />
                <span>Neueste Mandanten</span>
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab('tenants')}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Alle anzeigen</span>
                <IconArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentTenants.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">Noch keine Mandanten registriert.</p>
            ) : (
              <div className="space-y-2.5">
                {recentTenants.map(tenant => (
                  <div
                    key={tenant.id}
                    onClick={() => {
                      if (onSelectTenant) onSelectTenant(tenant)
                      onNavigateTab('tenants')
                    }}
                    className="p-3 bg-zinc-950/60 hover:bg-zinc-800/80 rounded-xl border border-zinc-800/60 flex items-center justify-between transition-all cursor-pointer group"
                  >
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                        {tenant.firmenname}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {tenant.ort ? `${tenant.ort} (${tenant.kanton || 'CH'})` : 'Schweiz'} &middot; {tenant.email || 'Keine E-Mail'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        tenant.status === 'active' 
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : tenant.status === 'trial'
                          ? 'bg-amber-950 text-amber-400 border-amber-800'
                          : 'bg-rose-950 text-rose-400 border-rose-800'
                      }`}>
                        {tenant.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Open Support Tickets */}
        <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <IconMail className="w-4 h-4 text-rose-400" />
                <span>Offene Support-Tickets</span>
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab('tickets')}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Alle Tickets</span>
                <IconArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {openTickets.length === 0 ? (
              <div className="py-8 text-center text-zinc-500">
                <IconCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                <p className="text-xs">Alle Support-Tickets sind aktuell erledigt!</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {openTickets.map(ticket => (
                  <div
                    key={ticket.id}
                    onClick={() => onNavigateTab('tickets')}
                    className="p-3 bg-zinc-950/60 hover:bg-zinc-800/80 rounded-xl border border-zinc-800/60 flex items-center justify-between transition-all cursor-pointer group"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                        {ticket.title}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Firma: <strong className="text-zinc-300">{ticket.tenant_name}</strong> &middot; {formatDate(ticket.created_at)}
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 border ${
                      ticket.priority === 'urgent'
                        ? 'bg-rose-950 text-rose-400 border-rose-800 animate-pulse'
                        : ticket.priority === 'high'
                        ? 'bg-amber-950 text-amber-400 border-amber-800'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                    }`}>
                      {ticket.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
