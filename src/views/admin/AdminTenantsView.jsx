import { useState, useEffect } from 'react'
import { fetchTenants, updateTenant, extendTenantTrial, impersonateTenant } from '../../services/adminService'
import { formatDate } from '../../lib/formatters'
import { 
  IconUsers, 
  IconCheck, 
  IconClock, 
  IconWarning, 
  IconSearch,
  IconEdit,
  IconMail
} from '../../components/icons/BrandIcons'

export default function AdminTenantsView({ onOpenCrmNotes }) {
  const [tenants, setTenants] = useState([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTenant, setSelectedTenant] = useState(null)
  const [actionFeedback, setActionFeedback] = useState(null)

  const loadTenants = async () => {
    setIsLoading(true)
    try {
      const data = await fetchTenants()
      setTenants(data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTenants()
  }, [])

  const handleExtendTrial = async (tenantId) => {
    const res = await extendTenantTrial(tenantId, 14)
    if (res.success) {
      setActionFeedback(`Testphase für Betrieb erfolgreich um 14 Tage verlängert.`)
      setTimeout(() => setActionFeedback(null), 3500)
      loadTenants()
    }
  }

  const handleActivateTenant = async (tenantId) => {
    const res = await updateTenant(tenantId, { status: 'active' })
    if (res.success) {
      setActionFeedback(`Betrieb erfolgreich auf 'Aktiv' (Vollabonnement) gesetzt.`)
      setTimeout(() => setActionFeedback(null), 3500)
      loadTenants()
    }
  }

  const handleImpersonate = async (tenant) => {
    const confirmed = window.confirm(`Möchtest du dich direkt als "${tenant.firmenname}" einloggen, um Support zu leisten?`)
    if (!confirmed) return

    const res = await impersonateTenant(tenant.id, tenant.firmenname)
    if (res.success) {
      window.location.href = '/'
    } else {
      alert(`Fehler beim Mandantenwechsel: ${res.error}`)
    }
  }

  const filteredTenants = tenants.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      t.firmenname?.toLowerCase().includes(term) ||
      t.email?.toLowerCase().includes(term) ||
      t.ort?.toLowerCase().includes(term) ||
      t.contact_name?.toLowerCase().includes(term)
    )
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <IconUsers className="w-6 h-6 text-amber-400" />
            <span>Mandanten & Betriebe</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            {tenants.length} Handwerksbetriebe im Kinetic Craft System
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <IconSearch className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Firma, Ort oder E-Mail suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {actionFeedback && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-600/50 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <IconCheck className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { key: 'all', label: 'Alle' },
          { key: 'trial', label: 'Testphase' },
          { key: 'active', label: 'Aktiv' },
          { key: 'suspended', label: 'Gesperrt / Inaktiv' },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterStatus(tab.key)}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filterStatus === tab.key
                ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tenants Table */}
      <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-zinc-500 text-xs">Mandanten werden geladen...</div>
        ) : filteredTenants.length === 0 ? (
          <div className="p-10 text-center text-zinc-500 text-xs">
            Keine Betriebe mit diesem Filter gefunden.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Betrieb / Firma</th>
                  <th className="py-3 px-4">Standort</th>
                  <th className="py-3 px-4">Plan & Status</th>
                  <th className="py-3 px-4">Testphase bis</th>
                  <th className="py-3 px-4 text-right">Aktionen & Support</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredTenants.map(tenant => {
                  const isTrial = tenant.status === 'trial'
                  const trialEnd = tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : null
                  const daysLeft = trialEnd ? Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24)) : 0

                  return (
                    <tr key={tenant.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{tenant.firmenname}</div>
                        <div className="text-[11px] text-zinc-400">
                          {tenant.email || 'Keine E-Mail hinterlegt'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-zinc-300">
                        {tenant.ort ? `${tenant.ort} (${tenant.kanton || 'CH'})` : 'Schweiz'}
                      </td>

                      <td className="py-3.5 px-4">
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
                          <span className="text-[11px] text-zinc-400 font-mono">
                            CHF {tenant.price_chf || '49.00'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isTrial ? (
                          <div className="text-xs">
                            <span className={daysLeft <= 3 ? 'text-rose-400 font-bold' : 'text-amber-400'}>
                              {formatDate(tenant.trial_ends_at)}
                            </span>
                            <span className="block text-[10px] text-zinc-400">
                              {daysLeft > 0 ? `(noch ${daysLeft} Tage)` : '(abgelaufen)'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* 1-Click Support Login */}
                          <button
                            type="button"
                            onClick={() => handleImpersonate(tenant)}
                            title="Als Mandant einloggen (Support-Diagnose)"
                            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <span>⚡ Support-Login</span>
                          </button>

                          {/* Quick Trial Extension */}
                          {isTrial && (
                            <button
                              type="button"
                              onClick={() => handleExtendTrial(tenant.id)}
                              title="Testphase um 14 Tage verlängern"
                              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[11px] font-medium border border-zinc-700 transition-colors cursor-pointer"
                            >
                              +14 Tage
                            </button>
                          )}

                          {/* Activate Button */}
                          {tenant.status !== 'active' && (
                            <button
                              type="button"
                              onClick={() => handleActivateTenant(tenant.id)}
                              title="Als zahlender Betrieb freischalten"
                              className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                            >
                              Freischalten
                            </button>
                          )}

                          {/* CRM Notes */}
                          <button
                            type="button"
                            onClick={() => onOpenCrmNotes(tenant)}
                            title="Kundenhistorie & Betreuungsnotizen"
                            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[11px] border border-zinc-700 transition-colors cursor-pointer"
                          >
                            📝 Notizen
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
