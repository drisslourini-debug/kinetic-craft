import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { formatDate, formatCurrency } from '../lib/formatters'
import { calculateRechnungStatus } from '../lib/statusLogic'
import StatCard from '../components/StatCard'
import WeatherWidget from '../components/WeatherWidget'
import Calendar from '../components/Calendar'
import OnboardingChecklistWidget from '../components/dashboard/OnboardingChecklistWidget'
import StatusBadge from '../components/ui/StatusBadge'
import { getHolidays } from '../lib/holidayService'
import {
  IconDocument,
  IconQrBill,
  IconTeam,
  IconBauunternehmung,
  IconCalendar,
  IconCheck,
} from '../components/icons/BrandIcons'

export default function DashboardView({ onNavigate, userName, globalSettings, refreshGlobalSettings }) {
  const [data, setData] = useState({
    firmenname: '',
    plzOrt: '',
    ueberfaellig: [],
    offen: [],
    inArbeit: [],
    umsatzTotal: 0,
    offenTotal: 0,
    chartData: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [holidays, setHolidays] = useState([])
  const [calendarEvents, setCalendarEvents] = useState([])
  const [mobileActiveTab, setMobileActiveTab] = useState('ueberfaellig')

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
        // Because of RLS, this will automatically only return the einstellungen for the current tenant
        const { data: settings } = await supabase
          .from('einstellungen')
          .select('firmenname, plz_ort')
          .limit(1)
          .maybeSingle()
          
        const firmenname = settings?.firmenname || ''
        const plzOrt = settings?.plz_ort || ''

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

        const ueberfaellig = []
        let offenTotal = 0
        let umsatzTotal = 0

        const currentDate = new Date()
        const currentYear = currentDate.getFullYear()
        
        // Chart data init (last 6 months)
        const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
        const chartDataMap = new Map()
        
        for (let i = 5; i >= 0; i--) {
          const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
          const key = `${d.getFullYear()}-${d.getMonth()}`
          chartDataMap.set(key, { 
            name: monthNames[d.getMonth()], 
            Umsatz: 0,
            sortKey: d.getTime()
          })
        }

        if (rechnungen) {
          rechnungen.forEach(r => {
            // Offene Beträge berechnen
            if (r.status === 'Überfällig' || r.status === 'Gemahnt') {
              ueberfaellig.push(r)
              offenTotal += Math.max(0, (r.total || 0) - (r.bezahlt || 0))
            } else if (r.status === 'Versendet' || r.status === 'Teilbezahlt') {
              offenTotal += Math.max(0, (r.total || 0) - (r.bezahlt || 0))
            }
            
            // Umsatz & Chart (nur bezahlte Beträge)
            if (r.bezahlt > 0) {
              const zahlungen = r.daten?.zahlungen || []
              
              if (zahlungen.length > 0) {
                // Präzise Berechnung über Einzelzahlungen
                zahlungen.forEach(z => {
                  if (z.betrag > 0 && z.typ !== 'Ausbuchung') {
                    const d = new Date(z.datum)
                    if (d.getFullYear() === currentYear) {
                      umsatzTotal += z.betrag
                    }
                    const key = `${d.getFullYear()}-${d.getMonth()}`
                    if (chartDataMap.has(key)) {
                      const monthData = chartDataMap.get(key)
                      monthData.Umsatz += z.betrag
                    }
                  }
                })
              } else if (r.status === 'Bezahlt') {
                // Fallback für alte Rechnungen ohne Detailhistorie
                const dateStr = r.bezahlt_am || r.faellig_am || r.created_at
                const d = new Date(dateStr)
                if (d.getFullYear() === currentYear) {
                  umsatzTotal += r.total || 0
                }
                const key = `${d.getFullYear()}-${d.getMonth()}`
                if (chartDataMap.has(key)) {
                  const monthData = chartDataMap.get(key)
                  monthData.Umsatz += r.total || 0
                }
              }
            }
          })
        }
        
        // Sort ueberfaellig
        ueberfaellig.sort((a, b) => new Date(a.faellig_am) - new Date(b.faellig_am))
        
        const chartData = Array.from(chartDataMap.values()).sort((a, b) => a.sortKey - b.sortKey)

        // Fetch Offerten (Offen)
        const { data: offerten } = await supabase
          .from('offerten')
          .select('id, total, status, created_at, gueltig_bis, kunden(name)')
          .eq('is_archived', false)
          .in('status', ['Entwurf', 'Versendet'])
          .order('created_at', { ascending: false })

        // Fetch Projekte (In Arbeit)
        const { data: projekte } = await supabase
          .from('projekte')
          .select('id, name, status, startdatum, enddatum, kunden(name)')
          .eq('is_archived', false)
          .eq('status', 'In Arbeit')
          .order('created_at', { ascending: false })

        // Build calendar events from projects, invoices, and offerten
        const events = []
        
        // Project events
        if (projekte) {
          projekte.forEach(p => {
            if (p.startdatum) {
              events.push({ date: p.startdatum, title: p.name, type: 'project' })
            }
            if (p.enddatum) {
              events.push({ date: p.enddatum, title: `${p.name} (Ende)`, type: 'project' })
            }
          })
        }
        
        // Invoice due date events
        if (rechnungen) {
          rechnungen.forEach(r => {
            if (r.faellig_am && (r.status === 'Versendet' || r.status === 'Teilbezahlt' || r.status === 'Überfällig' || r.status === 'Gemahnt')) {
              events.push({ date: r.faellig_am, title: `${r.kunden?.name || 'Rechnung'} – ${formatCurrency(r.total)}`, type: 'rechnung' })
            }
          })
        }
        
        // Offerte expiry events
        if (offerten) {
          offerten.forEach(o => {
            if (o.gueltig_bis) {
              events.push({ date: o.gueltig_bis, title: `Offerte ${o.kunden?.name || ''} läuft ab`, type: 'offerte' })
            }
          })
        }

        // Fetch Termine
        try {
          const { data: termineData } = await supabase
            .from('termine')
            .select('id, titel, datum, typ, status, projekte(name)')
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
          offen: offerten || [],
          inArbeit: projekte || [],
          umsatzTotal,
          offenTotal,
          chartData
        })
        
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        setIsLoading(false)
      }
  }, [])

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

      {/* ---------------- DESKTOP HEADER (>= md) ---------------- */}
      <div className="hidden md:flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">
            {userName ? `Willkommen zurück, ${userName.split(' ')[0]}` : (data.firmenname ? `Willkommen bei ${data.firmenname}` : 'Willkommen zurück')}
          </h2>
          <p className="text-text-secondary mt-1">
            Zahlen, Fakten und anstehende Aufgaben auf einen Blick.
          </p>
        </div>
        <WeatherWidget plzOrt={data.plzOrt || '8001 Zürich'} />
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
          onClick={() => onNavigate && onNavigate('rechnungen')}
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
          {/* ---------------- DESKTOP ONLY: KPI WIDGETS & CHARTS ---------------- */}
          <div className="hidden md:flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-6">
              {/* KPI 1: YTD Revenue */}
              <StatCard 
                title="Bezahlter Umsatz (YTD)"
                value={formatCurrency(data.umsatzTotal)}
                subtitle={`Geldeingänge in ${new Date().getFullYear()}`}
                icon='<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />'
                color="emerald"
                onClick={() => onNavigate && onNavigate('rechnungen')}
              />

              <StatCard 
                title="Ausstehende Zahlungen"
                value={formatCurrency(data.offenTotal)}
                subtitle="Offen oder Überfällig"
                icon='<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />'
                color="red"
                onClick={() => onNavigate && onNavigate('rechnungen')}
              />

              <StatCard 
                title="Offene Offerten"
                value={data.offen.length}
                subtitle="Pipeline"
                icon='<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />'
                color="amber"
                onClick={() => onNavigate && onNavigate('offerten')}
              />
            </div>

            {/* Revenue Chart */}
            <div className="bento-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-text-primary text-sm tracking-tight">Umsatzentwicklung</h3>
                  <p className="text-xs text-text-muted mt-0.5">Bezahlte Beträge (Letzte 6 Monate)</p>
                </div>
                <span className="text-[11px] font-mono text-text-muted px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200/60">
                  CHF kumuliert
                </span>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: 24, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} tickFormatter={(value) => `CHF ${Math.round(value/1000)}k`} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', fontSize: '12px' }}
                      formatter={(value) => [formatCurrency(value), 'Umsatz']}
                    />
                    <Bar dataKey="Umsatz" radius={[6, 6, 0, 0]}>
                      {data.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === data.chartData.length - 1 ? '#b88a38' : '#e8dbc3'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
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
                    <p className="text-sm font-semibold text-text-primary">Keine offenen Offerten</p>
                    <p className="text-xs text-text-secondary mt-0.5">Alle Angebote wurden beantwortet.</p>
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
                    <p className="text-sm font-semibold text-text-primary">Keine laufenden Projekte</p>
                    <p className="text-xs text-text-secondary mt-0.5">Bereit für neue Aufträge.</p>
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

          {/* ---------------- ACTION CENTER (DESKTOP ONLY >= md) ---------------- */}
          <div className="hidden md:block md:mt-8">
            <h2 className="hidden md:block text-xl font-bold text-text-primary mb-6">Deine Aufgaben (Action-Center)</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Column 1: Überfällig */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                  <h3 className="font-bold text-text-primary">Überfällige Rechnungen</h3>
                  <span className="ml-auto bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{data.ueberfaellig.length}</span>
                </div>
                
                <div className="flex flex-col gap-3">
                  {data.ueberfaellig.length === 0 ? (
                    <div className="bento-card p-6 text-center">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center mx-auto mb-2 text-emerald-600">
                        <IconCheck className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="text-xs font-medium text-text-secondary">Keine überfälligen Rechnungen.</p>
                    </div>
                  ) : (
                    data.ueberfaellig.slice(0, 3).map(r => (
                      <div 
                        key={r.id}
                        onClick={() => onNavigate && onNavigate('rechnungen', { rechnungId: r.id })}
                        className="bento-card p-4 hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col gap-3 relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <StatusBadge status="Überfällig" size="xs" />
                              <span className="text-[10px] text-text-muted font-medium">Seit {formatDate(r.faellig_am)}</span>
                            </div>
                            <p className="font-semibold text-text-primary text-sm line-clamp-1">{r.kunden?.name || 'Unbekannt'}</p>
                          </div>
                          <p className="font-bold text-rose-600 text-sm tabular-nums shrink-0">{formatCurrency(r.total)}</p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if(onNavigate) onNavigate('rechnungen', { rechnungId: r.id, openMahnung: true })
                          }}
                          className="w-full py-2 px-3 flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-rose-200/60"
                        >
                          Mahnung senden &rarr;
                        </button>
                      </div>
                    ))
                  )}
                  {data.ueberfaellig.length > 3 && (
                    <button 
                      onClick={() => onNavigate && onNavigate('rechnungen')}
                      className="w-full py-2 bg-surface hover:bg-zinc-100 text-text-secondary rounded-xl text-xs font-semibold transition-colors border border-border cursor-pointer"
                    >
                      + {data.ueberfaellig.length - 3} weitere anzeigen
                    </button>
                  )}
                </div>
              </div>

              {/* Column 2: Offen / Feedback */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                  <h3 className="font-semibold text-text-primary text-sm">Wartet auf Feedback</h3>
                  <span className="ml-auto bg-zinc-100 text-zinc-600 text-xs font-mono font-medium px-2 py-0.5 rounded-full">{data.offen.length}</span>
                </div>
                
                <div className="flex flex-col gap-3">
                  {data.offen.length === 0 ? (
                    <div className="bento-card p-6 text-center">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center mx-auto mb-2 text-amber-700">
                        <IconCheck className="w-4 h-4 text-amber-700" />
                      </div>
                      <p className="text-xs font-medium text-text-secondary">Alle Offerten sind beantwortet.</p>
                    </div>
                  ) : (
                    data.offen.slice(0, 3).map(o => (
                      <div 
                        key={o.id}
                        onClick={() => onNavigate && onNavigate('offerten', { offerteId: o.id })}
                        className="bento-card p-4 hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col gap-3 relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <StatusBadge status={o.status || 'Offen'} size="xs" />
                              <span className="text-[10px] text-text-muted font-medium">{formatDate(o.created_at)}</span>
                            </div>
                            <p className="font-semibold text-text-primary text-sm line-clamp-1">{o.kunden?.name || 'Unbekannt'}</p>
                          </div>
                          <p className="font-bold text-text-primary text-sm tabular-nums shrink-0">{formatCurrency(o.total)}</p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if(onNavigate) onNavigate('offerten', { offerteId: o.id })
                          }}
                          className="w-full py-2 px-3 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-zinc-200/60"
                        >
                          Bearbeiten &rarr;
                        </button>
                      </div>
                    ))
                  )}
                  {data.offen.length > 3 && (
                    <button 
                      onClick={() => onNavigate && onNavigate('offerten')}
                      className="w-full py-2 bg-surface hover:bg-zinc-100 text-text-secondary rounded-xl text-xs font-semibold transition-colors border border-border cursor-pointer"
                    >
                      + {data.offen.length - 3} weitere anzeigen
                    </button>
                  )}
                </div>
              </div>

              {/* Column 3: In Bearbeitung */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <h3 className="font-semibold text-text-primary text-sm">In Bearbeitung</h3>
                  <span className="ml-auto bg-zinc-100 text-zinc-600 text-xs font-mono font-medium px-2 py-0.5 rounded-full">{data.inArbeit.length}</span>
                </div>
                
                <div className="flex flex-col gap-3">
                  {data.inArbeit.length === 0 ? (
                    <div className="bento-card p-6 text-center">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center mx-auto mb-2 text-blue-600">
                        <IconCheck className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-xs font-medium text-text-secondary">Aktuell keine aktiven Projekte.</p>
                    </div>
                  ) : (
                    data.inArbeit.slice(0, 3).map(p => (
                      <div 
                        key={p.id}
                        onClick={() => onNavigate && onNavigate('projekte', { projektId: p.id })}
                        className="bento-card p-4 hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col gap-3 relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <StatusBadge status="In Arbeit" size="xs" />
                              {p.projekt_nr && (
                                <span className="font-mono text-[10px] text-text-muted">#{p.projekt_nr}</span>
                              )}
                            </div>
                            <p className="font-semibold text-text-primary text-sm line-clamp-1">{p.name}</p>
                            <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">{p.kunden?.name}</p>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if(onNavigate) onNavigate('projekte', { projektId: p.id })
                          }}
                          className="w-full py-2 px-3 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                        >
                          Projekt öffnen &rarr;
                        </button>
                      </div>
                    ))
                  )}
                  {data.inArbeit.length > 3 && (
                    <button 
                      onClick={() => onNavigate && onNavigate('projekte')}
                      className="w-full min-h-[48px] py-3 flex items-center justify-center sm:py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-base sm:text-sm font-semibold transition-colors mt-1 border border-gray-200/60 cursor-pointer"
                    >
                      + {data.inArbeit.length - 3} weitere anzeigen
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Section - Desktop Only */}
          <div className="hidden md:block mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <IconCalendar className="w-5 h-5 text-amber-700" />
                <span>Terminkalender</span>
              </h2>
              <button
                onClick={() => onNavigate && onNavigate('kalender')}
                className="px-3.5 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                Vollständigen Kalender öffnen →
              </button>
            </div>
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
    </div>
  )
}
