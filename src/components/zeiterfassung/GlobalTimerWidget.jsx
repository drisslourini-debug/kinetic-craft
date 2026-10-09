import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { formatSeconds, roundHours } from '../../lib/timeTrackingService'
import { IconClose, IconLightbulb, IconClock, IconCheck } from '../icons/BrandIcons'

const TIMER_STORAGE_KEY = 'atelier77_active_timer'
const ENTRIES_STORAGE_KEY = 'atelier77_zeiterfassung'

export default function GlobalTimerWidget({
  userName = '',
  currentProjectId = null,
  currentProjectName = '',
  onEntrySaved
}) {
  const [activeTimer, setActiveTimer] = useState(() => {
    try {
      const saved = localStorage.getItem(TIMER_STORAGE_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isStartModalOpen, setIsStartModalOpen] = useState(false)
  const [isStopModalOpen, setIsStopModalOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [projects, setProjects] = useState([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)

  // Start Modal Form
  const [selectedProjectId, setSelectedProjectId] = useState(currentProjectId || '')
  const [taetigkeit, setTaetigkeit] = useState('Regiearbeiten')
  const [mitarbeiterName, setMitarbeiterName] = useState(userName || 'Monteur')
  const [ansatz, setAnsatz] = useState(95.00)

  // Stop Modal Form
  const [stopNotes, setStopNotes] = useState('')
  const [roundingMode, setRoundingMode] = useState('15min')
  const [isBillable, setIsBillable] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Interval reference
  const intervalRef = useRef(null)

  // Sync elapsed seconds based on absolute timestamp
  useEffect(() => {
    const updateElapsed = () => {
      if (activeTimer?.isRunning && activeTimer?.startTime) {
        const now = Date.now()
        const diffSec = Math.max(0, Math.floor((now - activeTimer.startTime) / 1000))
        setElapsedSeconds(diffSec)
      } else {
        setElapsedSeconds(0)
      }
    }

    updateElapsed()

    if (activeTimer?.isRunning) {
      intervalRef.current = setInterval(updateElapsed, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [activeTimer])

  // Listen to external timer updates (e.g. cross-tab or project view start)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === TIMER_STORAGE_KEY) {
        try {
          setActiveTimer(e.newValue ? JSON.parse(e.newValue) : null)
        } catch {
          setActiveTimer(null)
        }
      }
    }

    const handleCustomUpdate = () => {
      try {
        const saved = localStorage.getItem(TIMER_STORAGE_KEY)
        setActiveTimer(saved ? JSON.parse(saved) : null)
      } catch {
        setActiveTimer(null)
      }
    }

    const handleOpenStart = (e) => {
      if (e?.detail?.projectId) {
        setSelectedProjectId(e.detail.projectId)
      }
      setIsStartModalOpen(true)
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('a77-timer-updated', handleCustomUpdate)
    window.addEventListener('a77-open-timer-start', handleOpenStart)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('a77-timer-updated', handleCustomUpdate)
      window.removeEventListener('a77-open-timer-start', handleOpenStart)
    }
  }, [])

  // Load active projects for start modal
  useEffect(() => {
    if (!isStartModalOpen) return

    const loadProjects = async () => {
      setIsLoadingProjects(true)
      try {
        let list = []
        if (supabase) {
          const { data, error } = await supabase
            .from('projekte')
            .select('id, name, kunden_id, kunden(name)')
            .eq('status', 'Aktiv')
            .order('name')
          if (!error && data) list = data
        }
        if (list.length === 0) {
          // Fallback to current project if available
          if (currentProjectId) {
            list = [{ id: currentProjectId, name: currentProjectName || 'Aktuelles Projekt' }]
          }
        }
        setProjects(list)
        if (currentProjectId) {
          setSelectedProjectId(currentProjectId)
        } else if (list.length > 0 && !selectedProjectId) {
          setSelectedProjectId(list[0].id)
        }
      } catch (err) {
        console.warn('Projects loading for timer:', err)
      } finally {
        setIsLoadingProjects(false)
      }
    }

    loadProjects()
  }, [isStartModalOpen, currentProjectId, currentProjectName, selectedProjectId])

  const handleStartTimer = (e) => {
    e?.preventDefault()
    if (!selectedProjectId) return

    const project = projects.find((p) => String(p.id) === String(selectedProjectId))
    const projektName = project ? project.name : currentProjectName || 'Projekt'
    const kundeName = project?.kunden?.name || ''

    const newTimer = {
      isRunning: true,
      startTime: Date.now(),
      projektId: selectedProjectId,
      projektName,
      kundeName,
      mitarbeiterName: mitarbeiterName || userName || 'Monteur',
      taetigkeit: taetigkeit || 'Regiearbeiten',
      ansatz: parseFloat(ansatz) || 95.00
    }

    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(newTimer))
    setActiveTimer(newTimer)
    setIsStartModalOpen(false)
    window.dispatchEvent(new CustomEvent('a77-timer-updated'))
  }

  const handleOpenStopModal = () => {
    if (!activeTimer) return
    setStopNotes(activeTimer.taetigkeit || '')
    setIsStopModalOpen(true)
  }

  const handleDiscardTimer = () => {
    localStorage.removeItem(TIMER_STORAGE_KEY)
    setActiveTimer(null)
    setElapsedSeconds(0)
    setIsStopModalOpen(false)
    window.dispatchEvent(new CustomEvent('a77-timer-updated'))
  }

  const handleSaveTimeEntry = async () => {
    if (!activeTimer) return
    setIsSaving(true)

    try {
      const rawHours = elapsedSeconds / 3600
      const finalHours = roundHours(rawHours, roundingMode)

      const startDateTime = new Date(activeTimer.startTime)
      const endDateTime = new Date()

      const newEntry = {
        projekt_id: activeTimer.projektId,
        kunden_id: null,
        mitarbeiter_name: activeTimer.mitarbeiterName || 'Monteur',
        taetigkeit: stopNotes || activeTimer.taetigkeit || 'Regiearbeiten',
        datum: startDateTime.toISOString().split('T')[0],
        start_zeit: startDateTime.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }),
        end_zeit: endDateTime.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }),
        dauer_stunden: finalHours,
        ansatz: activeTimer.ansatz || 95.00,
        verrechenbar: isBillable,
        status: 'offen',
        created_at: new Date().toISOString()
      }

      // Try Supabase insert
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
          console.warn('zeiterfassung DB insert fallback to localStorage:', dbErr)
        }
      }

      // Local storage fallback
      if (!saved) {
        saved = { ...newEntry, id: `local_zeit_${Date.now()}` }
      }

      const stored = JSON.parse(localStorage.getItem(ENTRIES_STORAGE_KEY) || '[]')
      stored.unshift(saved)
      localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(stored))

      // Clean active timer
      localStorage.removeItem(TIMER_STORAGE_KEY)
      setActiveTimer(null)
      setElapsedSeconds(0)
      setIsStopModalOpen(false)

      window.dispatchEvent(new CustomEvent('a77-timer-updated'))
      window.dispatchEvent(new CustomEvent('a77-time-entry-created', { detail: saved }))

      if (onEntrySaved) {
        onEntrySaved(saved)
      }
    } catch (err) {
      console.error('Fehler beim Speichern der Zeiterfassung:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Calculate live hours for stop modal
  const rawHoursForModal = elapsedSeconds / 3600
  const roundedHoursForModal = roundHours(rawHoursForModal, roundingMode)

  return (
    <>
      {/* FLOATING ACTION PILL (BOTTOM-RIGHT, ABOVE MOBILE TAB BAR) - ONLY WHEN RUNNING */}
      {activeTimer?.isRunning && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 print:hidden flex items-center">
          {isMinimized ? (
            /* Compact Minimized Pill - Non-intrusive live ticker */
            <div className="flex items-center gap-2 bg-neutral-900/95 backdrop-blur-md text-white border border-neutral-700/80 px-3 py-1.5 rounded-full shadow-2xl animate-fade-in-up text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
              <span className="font-mono font-bold text-emerald-400 text-xs">
                {formatSeconds(elapsedSeconds)}
              </span>
              <button
                type="button"
                onClick={() => setIsMinimized(false)}
                className="ml-1 p-1 hover:bg-neutral-800 rounded-full text-neutral-300 hover:text-white transition-colors cursor-pointer text-[10px]"
                title="Timer vergrössern"
                aria-label="Timer vergrössern"
              >
                ▲
              </button>
            </div>
          ) : (
            /* Full Capsule with details, stop button and minimize action */
            <div className="flex items-center gap-2.5 sm:gap-3 bg-neutral-900/95 backdrop-blur-md text-white border border-neutral-700/80 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full shadow-2xl animate-fade-in-up">
              {/* Live pulsating dot */}
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
              </span>

              {/* Time display */}
              <span className="font-mono text-sm font-bold tracking-wider text-emerald-400">
                {formatSeconds(elapsedSeconds)}
              </span>

              {/* Project name */}
              <div className="hidden sm:flex flex-col border-l border-neutral-700 pl-3">
                <span className="text-xs font-semibold max-w-[140px] truncate text-neutral-200">
                  {activeTimer.projektName}
                </span>
                <span className="text-[10px] text-neutral-400 max-w-[140px] truncate">
                  {activeTimer.taetigkeit || activeTimer.mitarbeiterName}
                </span>
              </div>

              {/* Stop button */}
              <button
                type="button"
                onClick={handleOpenStopModal}
                className="ml-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-full transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
              >
                Stopp & Buchen
              </button>

              {/* Minimize button */}
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="p-1 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer text-xs"
                title="Minimieren"
                aria-label="Timer minimieren"
              >
                —
              </button>
            </div>
          )}
        </div>
      )}

      {/* START TIMER MODAL */}
      {isStartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface-card border border-border w-full max-w-md rounded-3xl shadow-2xl p-6 overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">⏱️</span>
                <h3 className="text-base font-bold text-text-primary">Arbeitszeit-Timer starten</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStartModalOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-neutral-100 text-text-secondary flex items-center justify-center cursor-pointer"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStartTimer} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Projekt wählen *
                </label>
                {isLoadingProjects ? (
                  <div className="text-xs text-text-secondary py-2">Projekte werden geladen...</div>
                ) : (
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    required
                    className="w-full bg-white border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:outline-hidden focus:border-amber-500 font-medium"
                  >
                    <option value="" disabled>Projekt auswählen...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.kunden?.name ? `(${p.kunden.name})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Mitarbeiter / Monteur
                </label>
                <input
                  type="text"
                  value={mitarbeiterName}
                  onChange={(e) => setMitarbeiterName(e.target.value)}
                  placeholder="Name des Handwerkers"
                  className="w-full bg-white border border-border rounded-xl px-3.5 py-2 text-sm text-text-primary focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Tätigkeit / Arbeitsschritt
                </label>
                <input
                  type="text"
                  value={taetigkeit}
                  onChange={(e) => setTaetigkeit(e.target.value)}
                  placeholder="z. B. Montage Unterputzkästen, Vorbereitung..."
                  className="w-full bg-white border border-border rounded-xl px-3.5 py-2 text-sm text-text-primary focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                    Stundenansatz (CHF)
                  </label>
                  <input
                    type="number"
                    step="5"
                    value={ansatz}
                    onChange={(e) => setAnsatz(e.target.value)}
                    className="w-full bg-white border border-border rounded-xl px-3.5 py-2 text-sm text-text-primary text-right focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <div className="text-[11px] text-text-secondary pb-2 flex items-center gap-1.5">
                    <IconLightbulb className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>Läuft im Hintergrund & bei Standby weiter.</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsStartModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={!selectedProjectId}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <IconClock className="w-4 h-4" />
                  <span>Timer jetzt starten</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOP TIMER MODAL */}
      {isStopModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface-card border border-border w-full max-w-lg rounded-3xl shadow-2xl p-6 overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <IconClock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">Arbeitszeit buchen & stoppen</h3>
                  <p className="text-xs text-text-secondary">{activeTimer?.projektName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStopModalOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-neutral-100 text-text-secondary flex items-center justify-center cursor-pointer"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              {/* Summary KPIs */}
              <div className="bg-neutral-50 p-4 rounded-2xl border border-border grid grid-cols-2 gap-4 text-center">
                <div>
                  <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">Gemessene Zeit</span>
                  <div className="text-lg font-mono font-bold text-neutral-800">{formatSeconds(elapsedSeconds)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">Zu buchende Stunden</span>
                  <div className="text-lg font-bold text-emerald-600">{roundedHoursForModal} h</div>
                </div>
              </div>

              {/* Rounding Mode Toggle */}
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Rundung nach Schweizer Handwerker-Praxis
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '15min', label: '15 Min. (0.25h)' },
                    { id: '30min', label: '30 Min. (0.5h)' },
                    { id: 'exact', label: 'Minutengenau' }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setRoundingMode(mode.id)}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                        roundingMode === mode.id
                          ? 'bg-primary-50 border-primary-500 text-primary-900 shadow-xs'
                          : 'bg-white border-border text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity description */}
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Ausgeführte Arbeiten / Notiz
                </label>
                <textarea
                  rows="3"
                  value={stopNotes}
                  onChange={(e) => setStopNotes(e.target.value)}
                  placeholder="Detaillierte Beschreibung der Tätigkeit..."
                  className="w-full bg-white border border-border rounded-xl p-3 text-sm text-text-primary focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Billable Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-text-primary">
                <input
                  type="checkbox"
                  checked={isBillable}
                  onChange={(e) => setIsBillable(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span>Kundenverrechenbare Arbeitszeit</span>
              </label>

              {/* Actions Footer */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={handleDiscardTimer}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer py-2"
                >
                  Timer verwerfen
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsStopModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    Weiterlaufen lassen
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveTimeEntry}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {isSaving ? (
                      'Wird gebucht...'
                    ) : (
                      <>
                        <IconCheck className="w-4 h-4" />
                        <span>Zeit buchen</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
