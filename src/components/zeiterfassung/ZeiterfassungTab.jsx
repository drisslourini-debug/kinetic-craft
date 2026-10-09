import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDate } from '../../lib/formatters'
import { calculateBudgetStatus, roundHours } from '../../lib/timeTrackingService'
import {
  IconCheck,
  IconClock,
  IconEdit,
  IconTrash,
  IconClose,
  IconPlus,
  IconRapport,
  IconQrBill,
  IconBriefcase
} from '../icons/BrandIcons'

const ENTRIES_STORAGE_KEY = 'atelier77_zeiterfassung'
const TIMER_STORAGE_KEY = 'atelier77_active_timer'

export default function ZeiterfassungTab({
  projekt,
  kunde,
  userRole = 'admin',
  userName = '',
  onCreateRapportFromHours,
  onCreateInvoiceFromHours,
  onShowToast
}) {
  const [entries, setEntries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'open' | 'billed'
  const [selectedIds, setSelectedIds] = useState([])

  // Budget state (persisted on project if saved)
  const [budgetHours, setBudgetHours] = useState(() => parseFloat(projekt?.budget_stunden) || 40)
  const [isEditingBudget, setIsEditingBudget] = useState(false)
  const [budgetDraft, setBudgetDraft] = useState(budgetHours)

  // Manual Entry Form
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0])
  const [manualWorker, setManualWorker] = useState(userName || 'Monteur')
  const [manualTask, setManualTask] = useState('Regiearbeiten vor Ort')
  const [manualHours, setManualHours] = useState('2.0')
  const [manualRate, setManualRate] = useState('95.00')
  const [manualBillable, setManualBillable] = useState(true)
  const [isSavingManual, setIsSavingManual] = useState(false)

  // Load project time entries
  const loadEntries = async () => {
    if (!projekt?.id) return
    setIsLoading(true)

    try {
      let dbEntries = []
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('zeiterfassung')
            .select('*')
            .eq('projekt_id', projekt.id)
            .order('datum', { ascending: false })
          if (!error && data) dbEntries = data
        } catch (dbErr) {
          console.warn('zeiterfassung load fallback:', dbErr)
        }
      }

      // Merge with localStorage
      const stored = JSON.parse(localStorage.getItem(ENTRIES_STORAGE_KEY) || '[]')
      const localForProject = stored.filter((e) => String(e.projekt_id) === String(projekt.id))

      const merged = [...dbEntries]
      localForProject.forEach((le) => {
        if (!merged.some((m) => String(m.id) === String(le.id))) {
          merged.push(le)
        }
      })

      // Sort descending by date
      merged.sort((a, b) => new Date(b.datum || b.created_at) - new Date(a.datum || a.created_at))
      setEntries(merged)
    } catch (err) {
      console.error('Error loading time entries:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadEntries()

    const handleEntryCreated = () => loadEntries()
    window.addEventListener('a77-time-entry-created', handleEntryCreated)
    return () => window.removeEventListener('a77-time-entry-created', handleEntryCreated)
  }, [projekt?.id])

  // Calculations
  const totalSpentHours = useMemo(() => {
    return entries.reduce((acc, curr) => acc + (parseFloat(curr.dauer_stunden) || 0), 0)
  }, [entries])

  const openEntries = useMemo(() => {
    return entries.filter((e) => e.status === 'offen' || !e.status)
  }, [entries])

  const filteredEntries = useMemo(() => {
    if (filter === 'open') return openEntries
    if (filter === 'billed') return entries.filter((e) => e.status === 'im_rapport' || e.status === 'verrechnet')
    return entries
  }, [entries, filter, openEntries])

  const budgetStatus = useMemo(() => {
    return calculateBudgetStatus(totalSpentHours, budgetHours)
  }, [totalSpentHours, budgetHours])

  // Handlers
  const handleSaveBudget = async () => {
    const val = Math.max(0, parseFloat(budgetDraft) || 0)
    setBudgetHours(val)
    setIsEditingBudget(false)

    if (supabase && projekt?.id) {
      try {
        await supabase.from('projekte').update({ budget_stunden: val }).eq('id', projekt.id)
      } catch (err) {
        console.warn('Failed to update project budget in DB:', err)
      }
    }
    if (onShowToast) onShowToast('success', 'Projektbudget aktualisiert.')
  }

  const handleCreateManualEntry = async (e) => {
    e.preventDefault()
    setIsSavingManual(true)

    try {
      const hours = roundHours(parseFloat(manualHours) || 0, '15min')
      const rate = parseFloat(manualRate) || 95.00

      const newEntry = {
        projekt_id: projekt.id,
        kunden_id: projekt.kunden_id,
        mitarbeiter_name: manualWorker || 'Monteur',
        taetigkeit: manualTask || 'Regiearbeiten',
        datum: manualDate,
        dauer_stunden: hours,
        ansatz: rate,
        verrechenbar: manualBillable,
        status: 'offen',
        created_at: new Date().toISOString()
      }

      let saved = null
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('zeiterfassung')
            .insert([newEntry])
            .select('*')
            .single()
          if (!error && data) saved = data
        } catch (dbErr) {
          console.warn('DB manual insert fallback:', dbErr)
        }
      }

      if (!saved) {
        saved = { ...newEntry, id: `local_mzeit_${Date.now()}` }
      }

      const stored = JSON.parse(localStorage.getItem(ENTRIES_STORAGE_KEY) || '[]')
      stored.unshift(saved)
      localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(stored))

      setEntries((prev) => [saved, ...prev])
      setShowManualForm(false)
      setManualTask('Regiearbeiten vor Ort')
      setManualHours('2.0')
      if (onShowToast) onShowToast('success', `${hours} Std. erfasst.`)
    } catch (err) {
      console.error('Manual time entry error:', err)
    } finally {
      setIsSavingManual(false)
    }
  }

  const handleDeleteEntry = async (id) => {
    try {
      if (supabase && typeof id === 'number') {
        await supabase.from('zeiterfassung').delete().eq('id', id)
      }
      const stored = JSON.parse(localStorage.getItem(ENTRIES_STORAGE_KEY) || '[]')
      const updated = stored.filter((e) => String(e.id) !== String(id))
      localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(updated))

      setEntries((prev) => prev.filter((e) => String(e.id) !== String(id)))
      setSelectedIds((prev) => prev.filter((i) => String(i) !== String(id)))
      if (onShowToast) onShowToast('success', 'Zeiteintrag gelöscht.')
    } catch (err) {
      console.error('Delete time entry error:', err)
    }
  }

  const handleStartTimerForThisProject = () => {
    const newTimer = {
      isRunning: true,
      startTime: Date.now(),
      projektId: projekt.id,
      projektName: projekt.name,
      kundeName: kunde?.name || '',
      mitarbeiterName: userName || 'Monteur',
      taetigkeit: 'Regiearbeiten vor Ort',
      ansatz: 95.00
    }
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(newTimer))
    window.dispatchEvent(new CustomEvent('a77-timer-updated'))
    if (onShowToast) onShowToast('success', `Live-Timer für "${projekt.name}" gestartet!`)
  }

  const handleSelectAllOpen = () => {
    if (selectedIds.length === openEntries.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(openEntries.map((e) => e.id))
    }
  }

  const selectedEntries = useMemo(() => {
    return entries.filter((e) => selectedIds.includes(e.id))
  }, [entries, selectedIds])

  const selectedHoursTotal = useMemo(() => {
    return selectedEntries.reduce((sum, e) => sum + (parseFloat(e.dauer_stunden) || 0), 0)
  }, [selectedEntries])

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* 1. SOLL/IST BUDGET MONITORING CARD */}
      <div className="bg-surface-card border border-border p-5 sm:p-6 rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⏱️</span>
              <h3 className="text-base font-bold text-text-primary">Stunden-Budget & Soll/Ist-Vergleich</h3>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  budgetStatus.color === 'rose'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : budgetStatus.color === 'amber'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {budgetStatus.label}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Verfolge den Arbeitsaufwand live gegen das vereinbarte Offert-Budget.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStartTimerForThisProject}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <span>▶️</span>
              <span>Timer für dieses Projekt starten</span>
            </button>
          </div>
        </div>

        {/* Progress Bar & KPIs */}
        <div className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-neutral-50 p-3.5 rounded-xl border border-border">
              <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">Geleistete Stunden</span>
              <div className="text-xl font-black text-text-primary mt-0.5">{totalSpentHours.toFixed(2)} h</div>
            </div>

            <div className="bg-neutral-50 p-3.5 rounded-xl border border-border flex items-center justify-between">
              <div>
                <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">Projekt-Budget</span>
                {isEditingBudget ? (
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number"
                      step="5"
                      value={budgetDraft}
                      onChange={(e) => setBudgetDraft(e.target.value)}
                      className="w-20 bg-white border border-border rounded-lg px-2 py-1 text-sm font-bold text-text-primary"
                    />
                    <button
                      type="button"
                      onClick={handleSaveBudget}
                      className="px-2 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded-lg cursor-pointer flex items-center justify-center"
                      title="Budget speichern"
                      aria-label="Speichern"
                    >
                      <IconCheck className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-xl font-black text-text-primary mt-0.5">{budgetHours} h</div>
                )}
              </div>
              {!isEditingBudget && userRole !== 'treuhand' && (
                <button
                  type="button"
                  onClick={() => {
                    setBudgetDraft(budgetHours)
                    setIsEditingBudget(true)
                  }}
                  className="text-xs text-text-secondary hover:text-primary-600 cursor-pointer font-medium flex items-center gap-1"
                >
                  <IconEdit className="w-3.5 h-3.5" />
                  <span>Ändern</span>
                </button>
              )}
            </div>

            <div className="bg-neutral-50 p-3.5 rounded-xl border border-border">
              <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">
                {budgetStatus.isOverBudget ? 'Überschreitung' : 'Verbleibend'}
              </span>
              <div
                className={`text-xl font-black mt-0.5 ${
                  budgetStatus.isOverBudget ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {budgetStatus.isOverBudget
                  ? `+${(totalSpentHours - budgetHours).toFixed(2)} h`
                  : `${budgetStatus.remainingHours} h`}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-text-secondary mb-1.5">
              <span>Fortschritt</span>
              <span>{budgetStatus.percentage}%</span>
            </div>
            <div className="w-full bg-neutral-200 h-3 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  budgetStatus.color === 'rose'
                    ? 'bg-rose-500'
                    : budgetStatus.color === 'amber'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, budgetStatus.percentage)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. STUNDENJOURNAL / TRACKED ENTRIES */}
      <div className="bg-surface-card border border-border rounded-2xl overflow-hidden shadow-xs">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface/50">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-text-primary">Stundenjournal ({entries.length})</h4>

            {/* Filter Pills */}
            <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  filter === 'all' ? 'bg-white text-text-primary shadow-xs' : 'text-text-secondary'
                }`}
              >
                Alle
              </button>
              <button
                type="button"
                onClick={() => setFilter('open')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  filter === 'open' ? 'bg-white text-text-primary shadow-xs' : 'text-text-secondary'
                }`}
              >
                Offen ({openEntries.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('billed')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  filter === 'billed' ? 'bg-white text-text-primary shadow-xs' : 'text-text-secondary'
                }`}
              >
                Abgerechnet
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {userRole !== 'treuhand' && (
              <>
                <button
                  type="button"
                  onClick={handleStartTimerForThisProject}
                  className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
                  title="Live-Timer für dieses Projekt starten"
                >
                  <IconClock className="w-4 h-4" />
                  <span>Live-Timer starten</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualForm(!showManualForm)}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-text-primary rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {showManualForm ? (
                    <>
                      <IconClose className="w-3.5 h-3.5" />
                      <span>Schliessen</span>
                    </>
                  ) : (
                    <>
                      <IconPlus className="w-3.5 h-3.5" />
                      <span>Manuell erfassen</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Manual Entry Collapsible Form */}
        {showManualForm && (
          <form onSubmit={handleCreateManualEntry} className="p-4 bg-amber-50/50 border-b border-amber-200 animate-fade-in space-y-3">
            <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <IconEdit className="w-4 h-4 text-amber-700" />
              <span>Manuelle Zeiterfassung</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Datum</label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  required
                  className="w-full bg-white border border-border rounded-xl px-2.5 py-1.5 text-xs text-text-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Mitarbeiter</label>
                <input
                  type="text"
                  value={manualWorker}
                  onChange={(e) => setManualWorker(e.target.value)}
                  className="w-full bg-white border border-border rounded-xl px-2.5 py-1.5 text-xs text-text-primary"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Tätigkeit</label>
                <input
                  type="text"
                  value={manualTask}
                  onChange={(e) => setManualTask(e.target.value)}
                  placeholder="z. B. Montage, Vorbereitung..."
                  required
                  className="w-full bg-white border border-border rounded-xl px-2.5 py-1.5 text-xs text-text-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Stunden</label>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  value={manualHours}
                  onChange={(e) => setManualHours(e.target.value)}
                  required
                  className="w-full bg-white border border-border rounded-xl px-2.5 py-1.5 text-xs text-text-primary font-bold text-right"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Ansatz (CHF)</label>
                <input
                  type="number"
                  step="5"
                  value={manualRate}
                  onChange={(e) => setManualRate(e.target.value)}
                  className="w-full bg-white border border-border rounded-xl px-2.5 py-1.5 text-xs text-text-primary text-right"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-secondary">
                <input
                  type="checkbox"
                  checked={manualBillable}
                  onChange={(e) => setManualBillable(e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span>Verrechenbar (CHF {manualRate}/h)</span>
              </label>

              <button
                type="submit"
                disabled={isSavingManual}
                className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                {isSavingManual ? (
                  'Speichert...'
                ) : (
                  <>
                    <IconCheck className="w-3.5 h-3.5" />
                    <span>Buchen</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Batch Action Bar (if items selected) */}
        {selectedIds.length > 0 && userRole !== 'treuhand' && (
          <div className="p-3 bg-primary-50 border-b border-primary-200 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
            <div className="text-xs font-bold text-primary-900 flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <IconCheck className="w-4 h-4 text-primary-600" />
                <span>{selectedIds.length} Einträge ausgewählt</span>
              </div>
              <span className="text-primary-700 font-semibold">({selectedHoursTotal.toFixed(2)} Std.)</span>
            </div>

            <div className="flex items-center gap-2">
              {onCreateRapportFromHours && (
                <button
                  type="button"
                  onClick={() => onCreateRapportFromHours(selectedEntries)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <IconRapport className="w-4 h-4" />
                  <span>In Regierapport übernehmen</span>
                </button>
              )}

              {onCreateInvoiceFromHours && (
                <button
                  type="button"
                  onClick={() => onCreateInvoiceFromHours(selectedEntries)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <IconQrBill className="w-4 h-4" />
                  <span>Direkt in Rechnung stellen</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Entries List / Table */}
        {isLoading ? (
          <div className="p-8 text-center text-xs text-text-secondary animate-pulse">Lade Zeiterfassung...</div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-text-muted mb-1">
              <IconClock className="w-6 h-6" />
            </div>
            <h5 className="text-sm font-bold text-text-primary">Keine Zeiteinträge vorhanden</h5>
            <p className="text-xs text-text-secondary max-w-sm">
              Starte oben den Live-Timer oder trage Arbeitszeiten manuell ein.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-text-secondary font-bold uppercase tracking-wider text-[10px] border-b border-border">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={openEntries.length > 0 && selectedIds.length === openEntries.length}
                      onChange={handleSelectAllOpen}
                      className="rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
                      title="Alle offenen auswählen"
                    />
                  </th>
                  <th className="p-3">Datum & Mitarbeiter</th>
                  <th className="p-3">Tätigkeit</th>
                  <th className="p-3 text-right">Dauer</th>
                  <th className="p-3 text-right">Betrag (CHF)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEntries.map((e) => {
                  const hours = parseFloat(e.dauer_stunden) || 0
                  const rate = parseFloat(e.ansatz) || 95.00
                  const amount = hours * rate
                  const isOpen = e.status === 'offen' || !e.status
                  const isSelected = selectedIds.includes(e.id)

                  return (
                    <tr
                      key={e.id}
                      className={`hover:bg-neutral-50/70 transition-colors ${
                        isSelected ? 'bg-primary-50/30' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        {isOpen ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedIds((prev) =>
                                prev.includes(e.id) ? prev.filter((i) => i !== e.id) : [...prev, e.id]
                              )
                            }}
                            className="rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
                          />
                        ) : (
                          <div className="flex justify-center">
                            <IconCheck className="w-4 h-4 text-neutral-300" />
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-medium text-text-primary">
                        <div>{formatDate(e.datum)}</div>
                        <div className="text-[10px] text-text-secondary">{e.mitarbeiter_name || 'Monteur'}</div>
                      </td>
                      <td className="p-3 text-text-primary">
                        <div className="font-semibold">{e.taetigkeit || 'Regiearbeiten'}</div>
                        {e.start_zeit && (
                          <div className="text-[10px] text-text-secondary">
                            {e.start_zeit} - {e.end_zeit || 'laufend'}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold text-text-primary">
                        {hours.toFixed(2)} h
                      </td>
                      <td className="p-3 text-right font-medium text-text-secondary">
                        {formatCurrency(amount)}
                      </td>
                      <td className="p-3 text-center">
                        {e.status === 'verrechnet' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <IconBriefcase className="w-3 h-3" />
                            <span>Verrechnet</span>
                          </span>
                        ) : e.status === 'im_rapport' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <IconRapport className="w-3 h-3" />
                            <span>Im Rapport</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <IconClock className="w-3 h-3" />
                            <span>Offen</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {isOpen && userRole !== 'treuhand' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(e.id)}
                            className="text-neutral-400 hover:text-red-600 transition-colors p-1 cursor-pointer rounded-lg hover:bg-red-50 inline-flex items-center justify-center"
                            title="Eintrag löschen"
                            aria-label="Eintrag löschen"
                          >
                            <IconTrash className="w-4 h-4" />
                          </button>
                        )}
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
