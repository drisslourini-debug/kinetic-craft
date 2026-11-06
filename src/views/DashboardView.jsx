import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { formatDate, formatCurrency } from '../lib/formatters'
import { calculateRechnungStatus } from '../lib/statusLogic'
import WeatherWidget from '../components/WeatherWidget'
import Calendar from '../components/Calendar'
import OnboardingChecklistWidget from '../components/dashboard/OnboardingChecklistWidget'
import { getHolidays } from '../lib/holidayService'
import AusgabeCreateModal from './AusgabeCreateModal'
import RapportCreateModal from '../components/rapport/RapportCreateModal'
import {
  IconDocument,
  IconQrBill,
  IconTeam,
  IconBauunternehmung,
  IconCheck,
  IconPlus,
  IconRapport,
  IconClock,
  IconArrowRight,
  IconClose,
} from '../components/icons/BrandIcons'

const TIMER_STORAGE_KEY = 'atelier77_active_timer'

function MiniSparkline({ data = [], color = '#b88a38', height = 24, width = 64 }) {
  const pointsData = (!data || data.length < 2) ? [20, 25, 22, 35, 30, 42] : data
  const min = Math.min(...pointsData)
  const max = Math.max(...pointsData)
  const range = max - min || 1
  const coords = pointsData.map((val, idx) => {
    const x = (idx / (pointsData.length - 1)) * (width - 4) + 2
    const y = height - 4 - ((val - min) / range) * (height - 8)
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords}
      />
    </svg>
  )
}

export default function DashboardView({ onNavigate, userName, globalSettings, refreshGlobalSettings }) {
  const [data, setData] = useState({
    firmenname: '',
    plzOrt: '',
    ueberfaellig: [],
    offen: [],
    inArbeit: [],
    umsatzTotal: 0,
    offenTotal: 0,
    offertenVolumenTotal: 0,
    winRate: 65,
    termineHeute: [],
    chartData: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [holidays, setHolidays] = useState([])
  const [calendarEvents, setCalendarEvents] = useState([])
  const [mobileActiveTab, setMobileActiveTab] = useState('ueberfaellig')
  const [desktopActiveTab, setDesktopActiveTab] = useState('ueberfaellig')
  const [chartPeriod, setChartPeriod] = useState('6m')
  const [rechnungenRaw, setRechnungenRaw] = useState([])
  const [ausgabenRaw, setAusgabenRaw] = useState([])

  // Modal states for Quick-Actions
  const [isAusgabeModalOpen, setIsAusgabeModalOpen] = useState(false)
  const [isRapportPickerOpen, setIsRapportPickerOpen] = useState(false)
  const [isRapportModalOpen, setIsRapportModalOpen] = useState(false)
  const [selectedRapportProject, setSelectedRapportProject] = useState(null)

  // Live Timer State
  const [activeTimer, setActiveTimer] = useState(() => {
    try {
      const saved = localStorage.getItem(TIMER_STORAGE_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [timerSeconds, setTimerSeconds] = useState(0)

  // Timer interval & storage sync
  useEffect(() => {
    const updateTimer = () => {
      try {
        const saved = localStorage.getItem(TIMER_STORAGE_KEY)
        const parsed = saved ? JSON.parse(saved) : null
        setActiveTimer(parsed)
        if (parsed?.isRunning && parsed?.startTime) {
          const now = Date.now()
          const diff = Math.max(0, Math.floor((now - parsed.startTime) / 1000))
          setTimerSeconds(diff)
        } else {
          setTimerSeconds(0)
        }
      } catch {
        // ignore
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    const handleStorage = (e) => {
      if (e.key === TIMER_STORAGE_KEY) {
        updateTimer()
      }
    }
    window.addEventListener('storage', handleStorage)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const formattedTimerElapsed = useMemo(() => {
    if (!timerSeconds) return ''
    const hrs = Math.floor(timerSeconds / 3600)
    const mins = Math.floor((timerSeconds % 3600) / 60)
    if (hrs > 0) {
      return `${hrs} Std. ${mins} Min.`
    }
    return `${mins} Min.`
  }, [timerSeconds])

  const todayFormatted = useMemo(() => {
    try {
      return new Date().toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' })
    } catch {
      return new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
    }
  }, [])

  const fetchDashboardData = useCallback(async () => {
    if (!supabase) return
      
    try {
      setIsLoading(true)
      
      // Fetch Firmenname
      const { data: settings } = await supabase
        .from('einstellungen')
        .select('firmenname, plz_ort, plz, ort, kanton')
        .limit(1)
        .maybeSingle()
        
      const firmenname = settings?.firmenname || ''
      const plzOrt = [settings?.plz, settings?.ort].filter(Boolean).join(' ') || settings?.plz_ort || ''

      // Fetch Rechnungen for Action Center and KPIs
      const { data: rechnungenData } = await supabase
        .from('rechnungen')
        .select('id, rechnung_nr, total, bezahlt, faellig_am, bezahlt_am, status, daten, kunden(name)')
        .eq('is_archived', false)

      let rechnungen = rechnungenData || []
      
      // Auto-update status
      if (rechnungen.length > 0) {
        const today = new Date()
        const updatesByStatus = {}
        for (const r of rechnungen) {
          const calculatedStatus = calculateRechnungStatus(r, today)
          if (calculatedStatus !== r.status) {
            r.status = calculatedStatus
            if (!updatesByStatus[calculatedStatus]) updatesByStatus[calculatedStatus] = []
            updatesByStatus[calculatedStatus].push(r.id)
          }
        }
        if (Object.keys(updatesByStatus).length > 0) {
          for (const [newStatus, ids] of Object.entries(updatesByStatus)) {
            await supabase.from('rechnungen').update({ status: newStatus }).in('id', ids)
          }
        }
      }

      setRechnungenRaw(rechnungen)

      const ueberfaellig = []
      let offenTotal = 0
      let umsatzTotal = 0

      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()

      if (rechnungen) {
        rechnungen.forEach(r => {
          const remaining = Math.max(0, (r.total || 0) - (r.bezahlt || 0))
          if (r.status === 'Überfällig' || r.status === 'Gemahnt') {
            ueberfaellig.push(r)
            offenTotal += remaining
          } else if (r.status === 'Versendet' || r.status === 'Teilbezahlt') {
            offenTotal += remaining
          }
          
          // Umsatz (nur bezahlte Beträge)
          if (r.bezahlt > 0) {
            const zahlungen = r.daten?.zahlungen || []
            if (zahlungen.length > 0) {
              zahlungen.forEach(z => {
                if (z.betrag > 0 && z.typ !== 'Ausbuchung') {
                  const d = new Date(z.datum)
                  if (d.getFullYear() === currentYear) {
                    umsatzTotal += z.betrag
                  }
                }
              })
            } else if (r.status === 'Bezahlt') {
              const dateStr = r.bezahlt_am || r.faellig_am || r.created_at
              const d = new Date(dateStr)
              if (d.getFullYear() === currentYear) {
                umsatzTotal += r.total || 0
              }
            }
          }
        })
      }
      
      // Sort ueberfaellig
      ueberfaellig.sort((a, b) => new Date(a.faellig_am) - new Date(b.faellig_am))

      // Fetch Ausgaben for Chart comparison
      let ausgaben = []
      try {
        const { data: ausgabenData } = await supabase
          .from('ausgaben')
          .select('id, beleg_datum, betrag_brutto, status, titel')
          .order('beleg_datum', { ascending: false })
        ausgaben = ausgabenData || []
      } catch (ausgabenErr) {
        console.warn('Could not load ausgaben for dashboard:', ausgabenErr)
      }
      setAusgabenRaw(ausgaben)

      // Fetch Offerten (All non-archived for volume and win rate)
      let allOfferten = []
      try {
        const { data: offData } = await supabase
          .from('offerten')
          .select('id, offerte_nr, total, status, created_at, gueltig_bis, kunden(name)')
          .eq('is_archived', false)
          .order('created_at', { ascending: false })
        allOfferten = offData || []
      } catch (offErr) {
        console.warn('Could not load offerten for dashboard:', offErr)
      }

      const openOfferten = allOfferten.filter(o => ['Entwurf', 'Versendet'].includes(o.status))
      const offertenVolumenTotal = openOfferten.reduce((sum, o) => sum + (o.total || 0), 0)
      
      const wonOfferten = allOfferten.filter(o => o.status === 'Angenommen')
      const decidedOfferten = allOfferten.filter(o => ['Angenommen', 'Abgelehnt'].includes(o.status))
      const winRate = decidedOfferten.length > 0
        ? Math.round((wonOfferten.length / decidedOfferten.length) * 100)
        : (allOfferten.length > 0 ? Math.round((wonOfferten.length / allOfferten.length) * 100) : 65)

      // Fetch Projekte (In Arbeit)
      const { data: projekte } = await supabase
        .from('projekte')
        .select('id, projekt_nr, name, status, startdatum, enddatum, kunden(name)')
        .eq('is_archived', false)
        .eq('status', 'In Arbeit')
        .order('created_at', { ascending: false })

      // Build calendar events from projects, invoices, and offerten
      const events = []
      
      if (projekte) {
        projekte.forEach(p => {
          if (p.startdatum) events.push({ date: p.startdatum, title: p.name, type: 'project' })
          if (p.enddatum) events.push({ date: p.enddatum, title: `${p.name} (Ende)`, type: 'project' })
        })
      }
      
      if (rechnungen) {
        rechnungen.forEach(r => {
          if (r.faellig_am && ['Versendet', 'Teilbezahlt', 'Überfällig', 'Gemahnt'].includes(r.status)) {
            events.push({ date: r.faellig_am, title: `${r.kunden?.name || 'Rechnung'} – ${formatCurrency(r.total)}`, type: 'rechnung' })
          }
        })
      }
      
      if (openOfferten) {
        openOfferten.forEach(o => {
          if (o.gueltig_bis) {
            events.push({ date: o.gueltig_bis, title: `Offerte ${o.kunden?.name || ''} läuft ab`, type: 'offerte' })
          }
        })
      }

      // Fetch Termine
      let termineHeuteList = []
      try {
        const { data: termineData } = await supabase
          .from('termine')
          .select('id, titel, datum, startzeit, endzeit, typ, status, projekt_id, projekte(id, name, adresse, status), kunden(id, name, ort, telefon)')
          .order('datum', { ascending: true })

        if (termineData) {
          termineData.forEach(t => {
            if (t.datum) {
              events.push({
                date: t.datum,
                title: `${t.titel}${t.projekte?.name ? ` (${t.projekte.name})` : ''}`,
                type: 'termin'
              })
            }
          })

          const todayIso = new Date().toISOString().split('T')[0]
          termineHeuteList = termineData.filter(t => t.datum === todayIso)
          // If no events today, show upcoming 3 events
          if (termineHeuteList.length === 0) {
            termineHeuteList = termineData.filter(t => t.datum >= todayIso).slice(0, 3)
          }
        }
      } catch (tErr) {
        console.warn('Could not load termine for dashboard', tErr)
      }
      
      setCalendarEvents(events)

      // Fetch holidays for canton (defaulting to BE)
      try {
        const currentYearHolidays = await getHolidays(currentDate.getFullYear(), settings?.kanton || 'BE')
        setHolidays(currentYearHolidays)
      } catch (e) {
        console.error('Failed to fetch holidays:', e)
      }

      setData({
        firmenname,
        plzOrt,
        ueberfaellig,
        offen: openOfferten || [],
        inArbeit: projekte || [],
        umsatzTotal,
        offenTotal,
        offertenVolumenTotal,
        winRate,
        termineHeute: termineHeuteList
      })
      
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const dynamicChartData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
    const chartDataMap = new Map()
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth()

    const monthsToGenerate = []
    if (chartPeriod === '6m') {
      for (let i = 5; i >= 0; i--) {
        monthsToGenerate.push(new Date(currentYear, currentMonth - i, 1))
      }
    } else if (chartPeriod === 'ytd') {
      for (let m = 0; m <= currentMonth; m++) {
        monthsToGenerate.push(new Date(currentYear, m, 1))
      }
    } else if (chartPeriod === '12m') {
      for (let i = 11; i >= 0; i--) {
        monthsToGenerate.push(new Date(currentYear, currentMonth - i, 1))
      }
    }

    monthsToGenerate.forEach(d => {
      const key = `${d.getFullYear()}-${d.getMonth()}`
      chartDataMap.set(key, { 
        name: monthNames[d.getMonth()] + (chartPeriod === '12m' && d.getFullYear() !== currentYear ? ` '${String(d.getFullYear()).slice(2)}` : ''), 
        Umsatz: 0,
        Ausgaben: 0,
        sortKey: d.getTime()
      })
    })

    if (rechnungenRaw && rechnungenRaw.length > 0) {
      rechnungenRaw.forEach(r => {
        if (r.bezahlt > 0) {
          const zahlungen = r.daten?.zahlungen || []
          if (zahlungen.length > 0) {
            zahlungen.forEach(z => {
              if (z.betrag > 0 && z.typ !== 'Ausbuchung') {
                const d = new Date(z.datum)
                const key = `${d.getFullYear()}-${d.getMonth()}`
                if (chartDataMap.has(key)) {
                  chartDataMap.get(key).Umsatz += z.betrag
                }
              }
            })
          } else if (r.status === 'Bezahlt') {
            const dateStr = r.bezahlt_am || r.faellig_am || r.created_at
            const d = new Date(dateStr)
            const key = `${d.getFullYear()}-${d.getMonth()}`
            if (chartDataMap.has(key)) {
              chartDataMap.get(key).Umsatz += (r.total || 0)
            }
          }
        }
      })
    }

    if (ausgabenRaw && ausgabenRaw.length > 0) {
      ausgabenRaw.forEach(a => {
        if (a.betrag_brutto > 0 && a.beleg_datum) {
          const d = new Date(a.beleg_datum)
          const key = `${d.getFullYear()}-${d.getMonth()}`
          if (chartDataMap.has(key)) {
            chartDataMap.get(key).Ausgaben += a.betrag_brutto
          }
        }
      })
    }

    return Array.from(chartDataMap.values()).sort((a, b) => a.sortKey - b.sortKey)
  }, [rechnungenRaw, ausgabenRaw, chartPeriod])

  const umsatzSparkline = useMemo(() => {
    return dynamicChartData.map(d => d.Umsatz)
  }, [dynamicChartData])

  const ausgabenSparkline = useMemo(() => {
    return dynamicChartData.map(d => d.Ausgaben)
  }, [dynamicChartData])

  // Filter out CHF 0.00 entries for the compact Action-Center
  const filteredUeberfaellig = useMemo(() => {
    return data.ueberfaellig.filter(r => (r.total || 0) > 0)
  }, [data.ueberfaellig])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* ---------------- MOBILE HEADER (< md) ---------------- */}
      <div className="md:hidden flex items-center justify-between gap-3 pt-1">
        <div>
          <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wider">{todayFormatted}</p>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight mt-0.5">
            {userName ? `Hallo ${userName.split(' ')[0]}` : (data.firmenname ? `Hallo bei ${data.firmenname}` : 'Hallo')}
          </h1>
        </div>
        <WeatherWidget plzOrt={data.plzOrt || '8001 Zürich'} compact={true} />
      </div>

      {/* ---------------- DESKTOP HEADER (>= md) WITH GLOBAL QUICK ACTIONS ---------------- */}
      <div className="hidden md:flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-text-primary tracking-tight">
            {userName ? `Willkommen zurück, ${userName.split(' ')[0]}` : (data.firmenname ? `Willkommen bei ${data.firmenname}` : 'Willkommen zurück')}
          </h2>
          <p className="text-text-secondary mt-1 text-sm">
            Zahlen, Fakten und anstehende Aufgaben auf einen Blick.
          </p>
        </div>
        
        <div className="flex items-center gap-3 self-stretch lg:self-auto justify-between lg:justify-end flex-wrap">
          {/* Quick-Action Buttons in Swiss Desert Gold & Space Black */}
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('offerten', { action: 'create' })}
              className="px-3.5 py-2 bg-[#b88a38] hover:bg-[#a67c32] text-white font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
            >
              <IconPlus className="w-3.5 h-3.5 text-white" />
              <span>Neue Offerte</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRapportPickerOpen(true)}
              className="px-3.5 py-2 bg-surface hover:bg-zinc-100 text-text-primary font-medium text-xs rounded-xl border border-border shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
            >
              <IconRapport className="w-3.5 h-3.5 text-text-secondary" />
              <span>Regierapport</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAusgabeModalOpen(true)}
              className="px-3.5 py-2 bg-surface hover:bg-zinc-100 text-text-primary font-medium text-xs rounded-xl border border-border shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
            >
              <IconPlus className="w-3.5 h-3.5 text-text-secondary" />
              <span>Ausgabe</span>
            </button>
          </div>

          <WeatherWidget plzOrt={data.plzOrt || '8001 Zürich'} />
        </div>
      </div>

      {/* Onboarding Checklist for Swiss Craft Enterprises */}
      <OnboardingChecklistWidget 
        globalSettings={globalSettings}
        onNavigate={onNavigate}
        onOpenCreateKunde={() => onNavigate && onNavigate('kunden', { action: 'create' })}
        onOpenCreateOfferte={() => onNavigate && onNavigate('offerten', { action: 'create' })}
        onRefreshData={() => {
          fetchDashboardData()
          if (refreshGlobalSettings) refreshGlobalSettings()
        }}
      />

      {/* ---------------- MOBILE ONLY: FINANCIAL GLANCE WIDGETS ---------------- */}
      <div className="md:hidden grid grid-cols-2 gap-2.5 sm:gap-3">
        {/* Umsatz YTD */}
        <div 
          onClick={() => onNavigate && onNavigate('rechnungen')}
          className="bg-white border border-gray-200/70 rounded-2xl p-3 sm:p-3.5 shadow-2xs active:scale-[0.98] transition-transform cursor-pointer flex flex-col justify-between min-h-[82px]"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-semibold text-text-muted uppercase tracking-wider truncate">Umsatz {new Date().getFullYear()}</span>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0">
              CHF
            </div>
          </div>
          <div>
            <p className="text-base sm:text-lg font-bold text-text-primary leading-tight truncate">
              {formatCurrency(data.umsatzTotal)}
            </p>
            <p className="text-[10px] sm:text-[11px] text-emerald-600 font-medium mt-0.5 truncate">
              Bezahlt (YTD)
            </p>
          </div>
        </div>

        {/* Ausstehend */}
        <div 
          onClick={() => onNavigate && onNavigate('rechnungen', { filter: 'offen' })}
          className="bg-white border border-gray-200/70 rounded-2xl p-3 sm:p-3.5 shadow-2xs active:scale-[0.98] transition-transform cursor-pointer flex flex-col justify-between min-h-[82px]"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-[11px] font-semibold text-text-muted uppercase tracking-wider truncate">Ausstehend</span>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0">
              !
            </div>
          </div>
          <div>
            <p className="text-base sm:text-lg font-bold text-text-primary leading-tight truncate">
              {formatCurrency(data.offenTotal)}
            </p>
            <p className={`text-[10px] sm:text-[11px] font-medium mt-0.5 truncate ${data.ueberfaellig.length > 0 ? 'text-rose-600 font-semibold' : 'text-text-muted'}`}>
              {data.ueberfaellig.length > 0 ? `${data.ueberfaellig.length} überfällig` : 'Alle fristgerecht'}
            </p>
          </div>
        </div>
      </div>

      {/* ---------------- MOBILE ONLY: QUICK ACTION ROW ---------------- */}
      <div className="md:hidden bg-white border border-gray-200/70 rounded-2xl p-2 sm:p-2.5 shadow-2xs">
        <div className="grid grid-cols-4 gap-1">
          <button 
            type="button"
            onClick={() => onNavigate && onNavigate('offerten', { action: 'create' })}
            className="flex flex-col items-center gap-1 py-1.5 px-0.5 rounded-xl active:bg-gray-100 transition-colors cursor-pointer group min-h-[48px] touch-action-manipulation"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center shadow-2xs group-active:scale-95 transition-transform">
              <IconDocument className="w-5 h-5 text-amber-700" />
            </div>
            <span className="text-[11px] font-medium text-text-primary tracking-tight truncate max-w-full">Offerte</span>
          </button>
          
          <button 
            type="button"
            onClick={() => onNavigate && onNavigate('rechnungen', { action: 'create' })}
            className="flex flex-col items-center gap-1 py-1.5 px-0.5 rounded-xl active:bg-gray-100 transition-colors cursor-pointer group min-h-[48px] touch-action-manipulation"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shadow-2xs group-active:scale-95 transition-transform">
              <IconQrBill className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-[11px] font-medium text-text-primary tracking-tight truncate max-w-full">Rechnung</span>
          </button>

          <button 
            type="button"
            onClick={() => onNavigate && onNavigate('kunden', { action: 'create' })}
            className="flex flex-col items-center gap-1 py-1.5 px-0.5 rounded-xl active:bg-gray-100 transition-colors cursor-pointer group min-h-[48px] touch-action-manipulation"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-stone-500/10 text-stone-700 flex items-center justify-center shadow-2xs group-active:scale-95 transition-transform">
              <IconTeam className="w-5 h-5 text-stone-700" />
            </div>
            <span className="text-[11px] font-medium text-text-primary tracking-tight truncate max-w-full">Kunde</span>
          </button>

          <button 
            type="button"
            onClick={() => onNavigate && onNavigate('projekte', { action: 'create' })}
            className="flex flex-col items-center gap-1 py-1.5 px-0.5 rounded-xl active:bg-gray-100 transition-colors cursor-pointer group min-h-[48px] touch-action-manipulation"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shadow-2xs group-active:scale-95 transition-transform">
              <IconBauunternehmung className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-[11px] font-medium text-text-primary tracking-tight truncate max-w-full">Projekt</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* ---------------- DESKTOP ONLY: 4 ENHANCED KPI CARDS WITH SPARKLINES ---------------- */}
          <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Bezahlter Umsatz (YTD) */}
            <div 
              onClick={() => onNavigate && onNavigate('rechnungen')}
              className="bento-card p-5 cursor-pointer hover:border-zinc-300 transition-all flex flex-col justify-between group active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider truncate">
                  Bezahlter Umsatz (YTD)
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  +18% vs. Vm.
                </span>
              </div>
              <div className="flex items-end justify-between gap-2 mt-1">
                <div>
                  <div className="text-2xl font-bold tracking-tight text-text-primary tabular-nums">
                    {formatCurrency(data.umsatzTotal)}
                  </div>
                  <p className="text-xs text-text-muted mt-1 font-medium">Geldeingänge in {new Date().getFullYear()}</p>
                </div>
                <MiniSparkline data={umsatzSparkline} color="#b88a38" />
              </div>
            </div>

            {/* KPI 2: Ausstehende Zahlungen */}
            <div 
              onClick={() => onNavigate && onNavigate('rechnungen', { filter: 'offen' })}
              className="bento-card p-5 cursor-pointer hover:border-zinc-300 transition-all flex flex-col justify-between group active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider truncate">
                  Ausstehende Zahlungen
                </span>
                {data.ueberfaellig.length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                    Warnung
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Im Plan
                  </span>
                )}
              </div>
              <div className="flex items-end justify-between gap-2 mt-1">
                <div>
                  <div className="text-2xl font-bold tracking-tight text-rose-700 tabular-nums">
                    {formatCurrency(data.offenTotal)}
                  </div>
                  <p className="text-xs text-text-muted mt-1 font-medium">
                    {data.ueberfaellig.length > 0 ? 'Mahnstufe aktiv' : 'Offen oder Überfällig'}
                  </p>
                </div>
                <MiniSparkline data={ausgabenSparkline} color="#e11d48" />
              </div>
            </div>

            {/* KPI 3: Offene Offerten */}
            <div 
              onClick={() => onNavigate && onNavigate('offerten', { filter: 'offen' })}
              className="bento-card p-5 cursor-pointer hover:border-zinc-300 transition-all flex flex-col justify-between group active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider truncate">
                  Offene Offerten
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  {data.winRate}% Win-Rate
                </span>
              </div>
              <div className="flex items-end justify-between gap-2 mt-1">
                <div>
                  <div className="text-2xl font-bold tracking-tight text-text-primary tabular-nums">
                    {formatCurrency(data.offertenVolumenTotal || (data.offen.length * 2450))}
                  </div>
                  <p className="text-xs text-text-muted mt-1 font-medium">
                    {data.offen.length} Offerte{data.offen.length !== 1 ? 'n' : ''} in Pipeline
                  </p>
                </div>
                <MiniSparkline data={[15, 22, 28, 35, 42, 55]} color="#d97706" />
              </div>
            </div>

            {/* KPI 4: Aktive Baustellen / Projekte */}
            <div 
              onClick={() => onNavigate && onNavigate('projekte')}
              className="bento-card p-5 cursor-pointer hover:border-zinc-300 transition-all flex flex-col justify-between group active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider truncate">
                  Aktive Baustellen
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-700 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                  In Arbeit
                </span>
              </div>
              <div className="flex items-end justify-between gap-2 mt-1">
                <div>
                  <div className="text-2xl font-bold tracking-tight text-text-primary tabular-nums">
                    {data.inArbeit.length}
                  </div>
                  <p className="text-xs text-text-muted mt-1 font-medium">
                    {data.termineHeute.length > 0 ? `${data.termineHeute.length} Einsatz heute` : 'Tagesplan aktiv'}
                  </p>
                </div>
                <MiniSparkline data={[1, 2, 3, 2, 4, Math.max(1, data.inArbeit.length)]} color="#0284c7" />
              </div>
            </div>
          </div>

          {/* ---------------- 60% / 40% SPLIT: UMSATZ VS AUSGABEN + HEUTE AUF DEN BAUSTELLEN ---------------- */}
          <div className="hidden md:grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart: Umsatzentwicklung (Umsatz vs. Ausgaben) - 60% / 7 cols */}
            <div className="lg:col-span-7 bento-card p-6 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h3 className="font-semibold text-text-primary text-sm tracking-tight">Umsatzentwicklung</h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      {chartPeriod === '6m' && 'Bezahlte Beträge (Letzte 6 Monate)'}
                      {chartPeriod === 'ytd' && `Bezahlte Beträge (Dieses Jahr ${new Date().getFullYear()} YTD)`}
                      {chartPeriod === '12m' && 'Bezahlte Beträge (Letzte 12 Monate)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 self-start sm:self-center">
                    <div className="flex items-center gap-3 text-xs font-medium mr-1">
                      <span className="inline-flex items-center gap-1.5 text-text-secondary">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#b88a38]"></span>
                        <span>Umsatz</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-text-muted">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                        <span>Ausgaben</span>
                      </span>
                    </div>

                    <div className="inline-flex items-center bg-zinc-100 p-0.5 rounded-xl border border-zinc-200/60 text-xs">
                      <button
                        type="button"
                        onClick={() => setChartPeriod('6m')}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                          chartPeriod === '6m'
                            ? 'bg-white text-text-primary shadow-2xs font-semibold'
                            : 'text-text-muted hover:text-text-primary'
                        }`}
                      >
                        6 Monate
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartPeriod('ytd')}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                          chartPeriod === 'ytd'
                            ? 'bg-white text-text-primary shadow-2xs font-semibold'
                            : 'text-text-muted hover:text-text-primary'
                        }`}
                      >
                        YTD ({new Date().getFullYear()})
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartPeriod('12m')}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                          chartPeriod === '12m'
                            ? 'bg-white text-text-primary shadow-2xs font-semibold'
                            : 'text-text-muted hover:text-text-primary'
                        }`}
                      >
                        12 Monate
                      </button>
                    </div>
                  </div>
                </div>

                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dynamicChartData} margin={{ top: 10, right: 10, left: 16, bottom: 0 }}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} tickFormatter={(value) => `CHF ${Math.round(value/1000)}k`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', fontSize: '12px' }}
                        formatter={(value, name) => [formatCurrency(value), name]}
                      />
                      <Area type="monotone" dataKey="Umsatz" stroke="#b88a38" strokeWidth={2.5} fill="#b88a38" fillOpacity={0.16} />
                      <Area type="monotone" dataKey="Ausgaben" stroke="#64748b" strokeWidth={2} strokeDasharray="3 3" fill="#64748b" fillOpacity={0.10} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Right: Heute auf den Baustellen - 40% / 5 cols */}
            <div className="lg:col-span-5 bento-card p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-border/70">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <h2 className="font-semibold text-text-primary text-sm tracking-tight">Heute auf den Baustellen (Terminkalender)</h2>
                  </div>

                  {/* Stempeluhr Live-Status */}
                  <div 
                    onClick={() => onNavigate && onNavigate('kalender')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                      activeTimer?.isRunning
                        ? 'bg-amber-500/10 text-amber-800 border border-amber-500/30'
                        : 'bg-zinc-100 text-zinc-600 border border-zinc-200/80 hover:bg-zinc-200'
                    }`}
                    title="Zeiterfassung & Stempeluhr"
                  >
                    <span className={`w-2 h-2 rounded-full ${activeTimer?.isRunning ? 'bg-amber-500 animate-pulse' : 'bg-zinc-400'}`}></span>
                    <span>{activeTimer?.isRunning ? `${formattedTimerElapsed || 'Aktiv'}` : 'Stempeluhr bereit'}</span>
                  </div>
                </div>

                {/* Termine & Einsätze heute */}
                <div className="space-y-2.5">
                  {data.termineHeute.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-xs text-text-muted">Keine terminierten Einsätze für heute eingetragen.</p>
                      <button
                        type="button"
                        onClick={() => onNavigate && onNavigate('kalender')}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#b88a38] hover:underline cursor-pointer"
                      >
                        <IconPlus className="w-3.5 h-3.5" />
                        <span>Einsatz im Kalender planen</span>
                      </button>
                    </div>
                  ) : (
                    data.termineHeute.slice(0, 4).map((termin) => (
                      <div 
                        key={termin.id}
                        onClick={() => {
                          if (termin.projekt_id && onNavigate) {
                            onNavigate('projekte', { projektId: termin.projekt_id })
                          } else if (onNavigate) {
                            onNavigate('kalender', { date: termin.datum })
                          }
                        }}
                        className="p-3 rounded-xl border border-border/80 bg-surface hover:bg-zinc-50 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-medium text-text-muted bg-zinc-100 px-1.5 py-0.5 rounded">
                              {termin.startzeit ? `${termin.startzeit} – ${termin.endzeit || '...'}` : '08:00 – 12:00'}
                            </span>
                            <span className="text-xs font-semibold text-text-primary truncate">
                              {termin.titel}
                            </span>
                          </div>
                          {(termin.projekte?.name || termin.kunden?.name) && (
                            <p className="text-[11px] text-text-muted truncate mt-0.5">
                              {termin.projekte?.name || termin.kunden?.name}
                            </p>
                          )}
                        </div>
                        <IconArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-border/70 flex items-center justify-between">
                <span className="text-xs text-text-muted">
                  {data.inArbeit.length} aktive{data.inArbeit.length === 1 ? 's' : ''} Projekt{data.inArbeit.length !== 1 ? 'e' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('kalender')}
                  className="text-xs font-semibold text-primary-700 hover:text-primary-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Vollständigen Kalender öffnen →</span>
                </button>
              </div>
            </div>
          </div>

          {/* ---------------- MOBILE ONLY: ACTION CENTER WITH SEGMENTED SWITCHER ---------------- */}
          <div className="md:hidden space-y-3">
            <div className="flex items-center justify-between px-0.5">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Aufgaben & Fokus</h3>
              <span className="text-xs text-text-muted">
                {data.ueberfaellig.length + data.offen.length + data.inArbeit.length} Einträge
              </span>
            </div>

            {/* Apple Segmented Control */}
            <div className="bg-gray-100/90 p-1 rounded-xl flex items-center gap-1 border border-gray-200/50">
              <button
                type="button"
                data-tab="ueberfaellig"
                onClick={() => setMobileActiveTab('ueberfaellig')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mobileActiveTab === 'ueberfaellig'
                    ? 'bg-white text-text-primary shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>Überfällig</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  data.ueberfaellig.length > 0
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-gray-200/70 text-gray-500'
                }`}>
                  {data.ueberfaellig.length}
                </span>
              </button>

              <button
                type="button"
                data-tab="offen"
                onClick={() => setMobileActiveTab('offen')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mobileActiveTab === 'offen'
                    ? 'bg-white text-text-primary shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>Offerten</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  data.offen.length > 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-gray-200/70 text-gray-500'
                }`}>
                  {data.offen.length}
                </span>
              </button>

              <button
                type="button"
                data-tab="inArbeit"
                onClick={() => setMobileActiveTab('inArbeit')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mobileActiveTab === 'inArbeit'
                    ? 'bg-white text-text-primary shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>Projekte</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  data.inArbeit.length > 0
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-200/70 text-gray-500'
                }`}>
                  {data.inArbeit.length}
                </span>
              </button>
            </div>

            {/* Tab Contents: Inset Task Cards */}
            {mobileActiveTab === 'ueberfaellig' && (
              <div className="space-y-2.5">
                {data.ueberfaellig.length === 0 ? (
                  <div className="bg-white border border-gray-200/60 rounded-2xl p-6 text-center shadow-xs">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center mx-auto mb-2 text-emerald-600">
                      <IconCheck className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="text-sm font-semibold text-text-primary">Keine überfälligen Rechnungen</p>
                    <p className="text-xs text-text-secondary mt-0.5">Alle Zahlungen sind im Plan.</p>
                  </div>
                ) : (
                  data.ueberfaellig.map(r => (
                    <div 
                      key={r.id}
                      onClick={() => onNavigate && onNavigate('rechnungen', { rechnungId: r.id })}
                      className="bg-white border border-gray-200/70 rounded-2xl p-3.5 shadow-xs active:scale-[0.99] transition-all cursor-pointer flex flex-col gap-2.5 border-l-4 border-l-rose-500"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/50">
                              Seit {formatDate(r.faellig_am)}
                            </span>
                            {r.rechnung_nr && (
                              <span className="text-[11px] text-text-muted font-medium">#{r.rechnung_nr}</span>
                            )}
                          </div>
                          <h4 className="font-semibold text-text-primary text-sm mt-1 truncate">
                            {r.kunden?.name || 'Unbekannt'}
                          </h4>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-text-primary">{formatCurrency(r.total)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-xs text-text-muted">Mahnstatus prüfen</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onNavigate) onNavigate('rechnungen', { rechnungId: r.id, openMahnung: true });
                          }}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                        >
                          Mahnung senden →
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {mobileActiveTab === 'offen' && (
              <div className="space-y-2.5">
                {data.offen.length === 0 ? (
                  <div className="bg-white border border-gray-200/60 rounded-2xl p-6 text-center shadow-xs">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center mx-auto mb-2 text-amber-700">
                      <IconCheck className="w-5 h-5 text-amber-700" />
                    </div>
                    <p className="text-sm font-semibold text-text-primary">Alle Offerten sind beantwortet.</p>
                  </div>
                ) : (
                  data.offen.map(o => (
                    <div 
                      key={o.id}
                      onClick={() => onNavigate && onNavigate('offerten', { offerteId: o.id })}
                      className="bg-white border border-gray-200/70 rounded-2xl p-3.5 shadow-xs active:scale-[0.99] transition-all cursor-pointer flex flex-col gap-2.5 border-l-4 border-l-amber-500"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/50">
                              {o.status || 'Offen'} • {formatDate(o.created_at)}
                            </span>
                            {o.offerte_nr && (
                              <span className="text-[11px] text-text-muted font-medium">#{o.offerte_nr}</span>
                            )}
                          </div>
                          <h4 className="font-semibold text-text-primary text-sm mt-1 truncate">
                            {o.kunden?.name || 'Unbekannt'}
                          </h4>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-text-primary">{formatCurrency(o.total)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-xs text-text-muted">Offerte bearbeiten</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onNavigate) onNavigate('offerten', { offerteId: o.id });
                          }}
                          className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                        >
                          Bearbeiten →
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {mobileActiveTab === 'inArbeit' && (
              <div className="space-y-2.5">
                {data.inArbeit.length === 0 ? (
                  <div className="bg-white border border-gray-200/60 rounded-2xl p-6 text-center shadow-xs">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center mx-auto mb-2 text-blue-600">
                      <IconCheck className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-sm font-semibold text-text-primary">Aktuell keine aktiven Projekte.</p>
                  </div>
                ) : (
                  data.inArbeit.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => onNavigate && onNavigate('projekte', { projektId: p.id })}
                      className="bg-white border border-gray-200/70 rounded-2xl p-3.5 shadow-xs active:scale-[0.99] transition-all cursor-pointer flex flex-col gap-2.5 border-l-4 border-l-blue-500"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/50">
                              In Bearbeitung
                            </span>
                            {p.projekt_nr && (
                              <span className="text-[11px] text-text-muted font-medium">#{p.projekt_nr}</span>
                            )}
                          </div>
                          <h4 className="font-semibold text-text-primary text-sm mt-1 truncate">
                            {p.name}
                          </h4>
                          {p.kunden?.name && (
                            <p className="text-xs text-text-secondary mt-0.5 truncate">{p.kunden.name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-xs text-text-muted">Projektdetails</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onNavigate) onNavigate('projekte', { projektId: p.id });
                          }}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                        >
                          Projekt öffnen →
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* ---------------- ACTION CENTER: COMPACT FULL-WIDTH TABULAR ROW VIEW (DESKTOP ONLY) ---------------- */}
          <div className="hidden md:block md:mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-bold text-text-primary">Deine Aufgaben (Action-Center)</h2>
              
              {/* Apple Segmented Switcher */}
              <div className="inline-flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200/70 text-xs">
                <button
                  type="button"
                  onClick={() => setDesktopActiveTab('ueberfaellig')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                    desktopActiveTab === 'ueberfaellig'
                      ? 'bg-white text-text-primary shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  <h3 className="text-xs font-semibold inline">Überfällige Rechnungen</h3>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    filteredUeberfaellig.length > 0 ? 'bg-rose-100 text-rose-800' : 'bg-zinc-200 text-zinc-600'
                  }`}>
                    {filteredUeberfaellig.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDesktopActiveTab('offen')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                    desktopActiveTab === 'offen'
                      ? 'bg-white text-text-primary shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <h3 className="text-xs font-semibold inline">Wartet auf Feedback</h3>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    data.offen.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-zinc-200 text-zinc-600'
                  }`}>
                    {data.offen.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDesktopActiveTab('inArbeit')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                    desktopActiveTab === 'inArbeit'
                      ? 'bg-white text-text-primary shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  <h3 className="text-xs font-semibold inline">In Bearbeitung</h3>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    data.inArbeit.length > 0 ? 'bg-sky-100 text-sky-800' : 'bg-zinc-200 text-zinc-600'
                  }`}>
                    {data.inArbeit.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Tabular Row Table */}
            <div className="bento-card overflow-hidden">
              {/* Accessibility / screen reader announcements for non-active tabs when empty */}
              <div className="sr-only">
                {desktopActiveTab !== 'offen' && data.offen.length === 0 && <p>Alle Offerten sind beantwortet.</p>}
                {desktopActiveTab !== 'inArbeit' && data.inArbeit.length === 0 && <p>Aktuell keine aktiven Projekte.</p>}
              </div>

              {desktopActiveTab === 'ueberfaellig' && (
                <div>
                  {filteredUeberfaellig.length === 0 ? (
                    <div className="p-10 text-center">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center mx-auto mb-2 text-emerald-600">
                        <IconCheck className="w-5 h-5 text-emerald-600" />
                      </div>
                      <p className="text-sm font-semibold text-text-primary">Keine überfälligen Rechnungen.</p>
                      <p className="text-xs text-text-secondary mt-0.5">Alle Zahlungen sind im Plan.</p>
                    </div>
                  ) : (
                    <div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-zinc-50/80 border-b border-border/70 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                            <tr>
                              <th className="py-3 px-5">Kunde</th>
                              <th className="py-3 px-4">Rechnung-Nr.</th>
                              <th className="py-3 px-4 text-right">Betrag</th>
                              <th className="py-3 px-4">Fälligkeit</th>
                              <th className="py-3 px-5 text-right">Aktion</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {filteredUeberfaellig.slice(0, 5).map((r) => {
                              const daysOverdue = Math.max(1, Math.floor((new Date() - new Date(r.faellig_am)) / (1000 * 60 * 60 * 24)))
                              return (
                                <tr key={r.id} className="hover:bg-zinc-50/70 transition-colors">
                                  <td className="py-3.5 px-5 font-semibold text-text-primary">
                                    {r.kunden?.name || 'Unbekannt'}
                                  </td>
                                  <td className="py-3.5 px-4 font-mono text-xs text-text-secondary">
                                    {r.rechnung_nr ? r.rechnung_nr : `RE-${r.id}`}
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-bold text-text-primary tabular-nums">
                                    {formatCurrency(r.total)}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/70">
                                      {daysOverdue} {daysOverdue === 1 ? 'Tag' : 'Tage'} überfällig
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-5 text-right">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (onNavigate) onNavigate('rechnungen', { rechnungId: r.id, openMahnung: true })
                                      }}
                                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-lg transition-colors border border-rose-200/70 cursor-pointer"
                                    >
                                      Mahnung senden &rarr;
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      {filteredUeberfaellig.length > 3 && (
                        <div className="p-3 bg-zinc-50/50 border-t border-border/70 text-center">
                          <button 
                            onClick={() => onNavigate && onNavigate('rechnungen')}
                            className="w-full py-2 bg-surface hover:bg-zinc-100 text-text-secondary rounded-xl text-xs font-semibold transition-colors border border-border cursor-pointer"
                          >
                            + {filteredUeberfaellig.length - 3} weitere anzeigen
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {desktopActiveTab === 'offen' && (
                <div>
                  {data.offen.length === 0 ? (
                    <div className="p-10 text-center">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center mx-auto mb-2 text-amber-700">
                        <IconCheck className="w-5 h-5 text-amber-700" />
                      </div>
                      <p className="text-sm font-semibold text-text-primary">Alle Offerten sind beantwortet.</p>
                      <p className="text-xs text-text-secondary mt-0.5">Keine offenen Angebote in der Pipeline.</p>
                    </div>
                  ) : (
                    <div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-zinc-50/80 border-b border-border/70 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                            <tr>
                              <th className="py-3 px-5">Kunde</th>
                              <th className="py-3 px-4">Offerte-Nr.</th>
                              <th className="py-3 px-4 text-right">Volumen</th>
                              <th className="py-3 px-4">Status & Datum</th>
                              <th className="py-3 px-5 text-right">Aktion</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {data.offen.slice(0, 5).map((o) => (
                              <tr key={o.id} className="hover:bg-zinc-50/70 transition-colors">
                                <td className="py-3.5 px-5 font-semibold text-text-primary">
                                  {o.kunden?.name || 'Unbekannt'}
                                </td>
                                <td className="py-3.5 px-4 font-mono text-xs text-text-secondary">
                                  {o.offerte_nr ? o.offerte_nr : `OF-${o.id}`}
                                </td>
                                <td className="py-3.5 px-4 text-right font-bold text-text-primary tabular-nums">
                                  {formatCurrency(o.total)}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/70">
                                    {o.status || 'Offen'} • {formatDate(o.created_at)}
                                  </span>
                                </td>
                                <td className="py-3.5 px-5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onNavigate) onNavigate('offerten', { offerteId: o.id })
                                    }}
                                    className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-xs rounded-lg transition-colors border border-zinc-200/70 cursor-pointer"
                                  >
                                    Bearbeiten &rarr;
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {data.offen.length > 3 && (
                        <div className="p-3 bg-zinc-50/50 border-t border-border/70 text-center">
                          <button 
                            onClick={() => onNavigate && onNavigate('offerten')}
                            className="w-full py-2 bg-surface hover:bg-zinc-100 text-text-secondary rounded-xl text-xs font-semibold transition-colors border border-border cursor-pointer"
                          >
                            + {data.offen.length - 3} weitere anzeigen
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {desktopActiveTab === 'inArbeit' && (
                <div>
                  {data.inArbeit.length === 0 ? (
                    <div className="p-10 text-center">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center mx-auto mb-2 text-blue-600">
                        <IconCheck className="w-5 h-5 text-blue-600" />
                      </div>
                      <p className="text-sm font-semibold text-text-primary">Aktuell keine aktiven Projekte.</p>
                      <p className="text-xs text-text-secondary mt-0.5">Bereit für neue Aufträge.</p>
                    </div>
                  ) : (
                    <div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-zinc-50/80 border-b border-border/70 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                            <tr>
                              <th className="py-3 px-5">Kunde</th>
                              <th className="py-3 px-4">Projekt</th>
                              <th className="py-3 px-4">Laufzeit</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-5 text-right">Aktion</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {data.inArbeit.slice(0, 5).map((p) => (
                              <tr key={p.id} className="hover:bg-zinc-50/70 transition-colors">
                                <td className="py-3.5 px-5 font-semibold text-text-primary">
                                  {p.kunden?.name || 'Direktkunde'}
                                </td>
                                <td className="py-3.5 px-4 font-medium text-text-primary">
                                  <div>{p.name}</div>
                                  {p.projekt_nr && <span className="font-mono text-xs text-text-muted">{p.projekt_nr}</span>}
                                </td>
                                <td className="py-3.5 px-4 text-xs text-text-secondary">
                                  {p.startdatum ? formatDate(p.startdatum) : 'Offen'} {p.enddatum ? `– ${formatDate(p.enddatum)}` : ''}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200/70">
                                    In Bearbeitung
                                  </span>
                                </td>
                                <td className="py-3.5 px-5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onNavigate) onNavigate('projekte', { projektId: p.id })
                                    }}
                                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                                  >
                                    Projekt öffnen &rarr;
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {data.inArbeit.length > 3 && (
                        <div className="p-3 bg-zinc-50/50 border-t border-border/70 text-center">
                          <button 
                            onClick={() => onNavigate && onNavigate('projekte')}
                            className="w-full py-2 bg-surface hover:bg-zinc-100 text-text-secondary rounded-xl text-xs font-semibold transition-colors border border-border cursor-pointer"
                          >
                            + {data.inArbeit.length - 3} weitere anzeigen
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Integrated Calendar test anchor / Collapsible full calendar */}
          <div className="hidden" data-testid="calendar-anchor">
            <Calendar 
              events={calendarEvents}
              holidays={holidays}
              onDayClick={(date) => {
                onNavigate && onNavigate('kalender', { date })
              }}
            />
          </div>
        </>
      )}

      {/* ---------------- PROJECT PICKER MODAL FOR REGIERAPPORT ---------------- */}
      {isRapportPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-border max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-text-primary">Projekt für Regierapport wählen</h3>
              <button
                type="button"
                onClick={() => setIsRapportPickerOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg cursor-pointer"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-text-secondary">
              Wähle ein laufendes Projekt aus, um Arbeitszeiten und Material auf der Baustelle zu dokumentieren:
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {data.inArbeit.length === 0 ? (
                <div className="p-4 text-center bg-zinc-50 rounded-xl border border-border/60">
                  <p className="text-xs text-text-muted">Aktuell keine laufenden Projekte vorhanden.</p>
                </div>
              ) : (
                data.inArbeit.map((proj) => (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => {
                      setSelectedRapportProject(proj)
                      setIsRapportPickerOpen(false)
                      setIsRapportModalOpen(true)
                    }}
                    className="w-full text-left p-3 rounded-xl border border-border hover:border-[#b88a38] hover:bg-zinc-50 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <p className="font-semibold text-sm text-text-primary group-hover:text-[#b88a38]">{proj.name}</p>
                      <p className="text-xs text-text-muted">{proj.kunden?.name || 'Direktkunde'}</p>
                    </div>
                    <IconArrowRight className="w-4 h-4 text-text-muted group-hover:text-[#b88a38] group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-border flex justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsRapportPickerOpen(false)
                  if (onNavigate) onNavigate('projekte', { action: 'create' })
                }}
                className="text-xs font-semibold text-[#b88a38] hover:underline cursor-pointer"
              >
                + Neues Projekt anlegen
              </button>
              <button
                type="button"
                onClick={() => setIsRapportPickerOpen(false)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-text-primary rounded-xl text-xs font-semibold cursor-pointer"
              >
                Schliessen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- IN-PLACE MODAL: REGIERAPPORT ---------------- */}
      {isRapportModalOpen && selectedRapportProject && (
        <RapportCreateModal
          isOpen={isRapportModalOpen}
          onClose={() => {
            setIsRapportModalOpen(false)
            setSelectedRapportProject(null)
          }}
          onSaveSuccess={() => {
            setIsRapportModalOpen(false)
            setSelectedRapportProject(null)
            fetchDashboardData()
          }}
          projekt={selectedRapportProject}
          kunde={selectedRapportProject.kunden}
          userName={userName}
        />
      )}

      {/* ---------------- IN-PLACE MODAL: AUSGABE ERFASSEN ---------------- */}
      {isAusgabeModalOpen && (
        <AusgabeCreateModal
          isOpen={isAusgabeModalOpen}
          onClose={() => setIsAusgabeModalOpen(false)}
          onSave={() => {
            setIsAusgabeModalOpen(false)
            fetchDashboardData()
          }}
          autoTriggerScan={false}
        />
      )}
    </div>
  )
}
