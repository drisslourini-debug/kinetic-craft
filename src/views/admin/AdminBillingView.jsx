import { useState, useEffect } from 'react'
import { 
  fetchPlatformInvoices, 
  createPlatformInvoice, 
  markPlatformInvoicePaid, 
  fetchTenants,
  updateTenant
} from '../../services/adminService'
import { formatCurrency, formatDate } from '../../lib/formatters'
import { 
  IconDocument, 
  IconCheck, 
  IconEuro, 
  IconClock, 
  IconWarning 
} from '../../components/icons/BrandIcons'

export default function AdminBillingView() {
  const [invoices, setInvoices] = useState([])
  const [tenants, setTenants] = useState([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [feedback, setFeedback] = useState(null)

  // New Invoice Form State
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [amountChf, setAmountChf] = useState(49.00)
  const [planName, setPlanName] = useState('Kinetic Craft Professional')
  const [dueDateDays, setDueDateDays] = useState(30)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [invData, tenData] = await Promise.all([
        fetchPlatformInvoices(),
        fetchTenants()
      ])
      setInvoices(invData)
      setTenants(tenData)
      if (tenData.length > 0 && !selectedTenantId) {
        setSelectedTenantId(tenData[0].id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateInvoice = async (e) => {
    e.preventDefault()
    if (!selectedTenantId) return
    setIsSubmitting(true)

    try {
      const res = await createPlatformInvoice({
        tenantId: selectedTenantId,
        amountChf: parseFloat(amountChf) || 49.00,
        planName,
        dueDateDays: parseInt(dueDateDays, 10) || 30,
        notes,
      })

      if (res.success) {
        setShowCreateModal(false)
        setFeedback('Lizenzrechnung mit QR-Referenz erfolgreich angelegt.')
        setTimeout(() => setFeedback(null), 3500)
        loadData()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarkPaid = async (inv) => {
    const confirmed = window.confirm(`Rechnung ${inv.invoice_number} über ${formatCurrency(inv.amount_chf)} als bezahlt markieren und Mandant auf 'Aktiv' schalten?`)
    if (!confirmed) return

    try {
      const res = await markPlatformInvoicePaid(inv.id)
      if (res.success) {
        // Automatically activate tenant subscription
        await updateTenant(inv.tenant_id, { status: 'active' })
        setFeedback(`Zahlung für ${inv.tenant_name} verbucht. Mandant ist nun voll aktiv.`)
        setTimeout(() => setFeedback(null), 3500)
        loadData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const filteredInvoices = invoices.filter(inv => {
    if (filterStatus === 'all') return true
    return inv.status === filterStatus
  })

  const totalRevenue = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + (parseFloat(i.amount_chf) || 0), 0)

  const openVolume = invoices
    .filter(i => i.status === 'open')
    .reduce((sum, i) => sum + (parseFloat(i.amount_chf) || 0), 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <IconEuro className="w-6 h-6 text-emerald-400" />
            <span>Plattform-Abrechnung & Lizenzen</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Abonnements, Schweizer QR-Lizenzrechnungen und Zahlungsüberwachung
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
        >
          <span>+ Neue QR-Lizenzrechnung</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-600/50 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <IconCheck className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Revenue Mini KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900/90 p-4 rounded-xl border border-zinc-800">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Verbuchter Umsatz</span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono mt-1">
            {formatCurrency(totalRevenue)}
          </div>
        </div>

        <div className="bg-zinc-900/90 p-4 rounded-xl border border-zinc-800">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Offene Forderungen</span>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-400 font-mono mt-1">
            {formatCurrency(openVolume)}
          </div>
        </div>

        <div className="bg-zinc-900/90 p-4 rounded-xl border border-zinc-800">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Standard-Tarif</span>
          <div className="text-xl sm:text-2xl font-extrabold text-white font-mono mt-1">
            CHF 49.00 <span className="text-xs font-normal text-zinc-400">/ Mt.</span>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden">
        <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {['all', 'open', 'paid', 'overdue'].map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer capitalize ${
                  filterStatus === st ? 'bg-zinc-700 text-white font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {st === 'all' ? 'Alle' : st}
              </button>
            ))}
          </div>
          <span className="text-zinc-400">{filteredInvoices.length} Rechnungen</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-zinc-500 text-xs">Rechnungen werden geladen...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-xs">Keine Lizenzrechnungen gefunden.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Rechnungs-Nr.</th>
                  <th className="py-3 px-4">Kundenbetrieb</th>
                  <th className="py-3 px-4">Tarif & Betrag</th>
                  <th className="py-3 px-4">Fälligkeit</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {inv.invoice_number}
                    </td>

                    <td className="py-3 px-4 font-bold text-zinc-200">
                      {inv.tenant_name}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      {formatCurrency(inv.amount_chf)}
                    </td>

                    <td className="py-3 px-4 text-zinc-300">
                      {formatDate(inv.due_date)}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        inv.status === 'paid'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : inv.status === 'open'
                          ? 'bg-amber-950 text-amber-400 border-amber-800'
                          : 'bg-rose-950 text-rose-400 border-rose-800'
                      }`}>
                        {inv.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {inv.status === 'open' && (
                        <button
                          type="button"
                          onClick={() => handleMarkPaid(inv)}
                          className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          ✓ Bezahlt markieren
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create License Invoice */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 text-left shadow-2xl text-zinc-100">
            <h3 className="text-lg font-bold text-white mb-4">Neue Lizenzrechnung erstellen</h3>
            
            <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Betrieb / Mandant</label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full p-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-hidden"
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.firmenname} ({t.status})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Betrag in CHF</label>
                  <input
                    type="number"
                    step="0.05"
                    value={amountChf}
                    onChange={(e) => setAmountChf(e.target.value)}
                    className="w-full p-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Zahlungsziel</label>
                  <select
                    value={dueDateDays}
                    onChange={(e) => setDueDateDays(e.target.value)}
                    className="w-full p-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-hidden"
                  >
                    <option value="14">14 Tage</option>
                    <option value="30">30 Tage Netto</option>
                    <option value="60">60 Tage</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Tarifbezeichnung</label>
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full p-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Optionale Notizen</label>
                <textarea
                  rows={2}
                  placeholder="z. B. Quartalsabrechnung Q4..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-hidden resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded-xl shadow cursor-pointer"
                >
                  {isSubmitting ? 'Wird erstellt...' : 'Rechnung anlegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
