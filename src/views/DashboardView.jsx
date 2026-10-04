import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { formatDate, formatCurrency } from '../lib/formatters'
import { calculateRechnungStatus } from '../lib/statusLogic'
import StatCard from '../components/StatCard'
import WeatherWidget from '../components/WeatherWidget'
import Calendar from '../components/Calendar'
import OnboardingChecklistWidget from '../components/dashboard/OnboardingChecklistWidget'
import { getHolidays } from '../lib/holidayService'

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">
            {userName ? `Willkommen zurück, ${userName.split(' ')[0]} 👋` : (data.firmenname ? `Willkommen bei ${data.firmenname} 👋` : 'Willkommen zurück 👋')}
          </h2>
          <p className="text-text-secondary mt-1">
            <span className="md:hidden">Dein Action-Center. Hier ist dein Überblick für heute.</span>
            <span className="hidden md:inline">Zahlen, Fakten und anstehende Aufgaben auf einen Blick.</span>
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

      {/* ---------------- MOBILE ONLY: QUICK ACTIONS ---------------- */}
      <div className="md:hidden grid grid-cols-2 gap-2">
        <button 
          onClick={() => onNavigate && onNavigate('offerten', { action: 'create' })}
          className="flex items-center justify-start gap-2.5 px-3 py-3 min-h-[48px] bg-white border border-gray-200/60 rounded-xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all cursor-pointer"
        >
          <div className="w-6 h-6 rounded-md bg-primary-600 text-white flex items-center justify-center text-sm shrink-0 shadow-sm">+</div>
          <span className="font-semibold text-text-primary text-sm sm:text-xs">Neue Offerte</span>
        </button>
        <button 
          onClick={() => onNavigate && onNavigate('rechnungen', { action: 'create' })}
          className="flex items-center justify-start gap-2.5 px-3 py-3 min-h-[48px] bg-white border border-gray-200/60 rounded-xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all cursor-pointer"
        >
          <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center text-sm shrink-0 shadow-sm">+</div>
          <span className="font-semibold text-text-primary text-sm sm:text-xs">Neue Rechnung</span>
        </button>
        <button 
          onClick={() => onNavigate && onNavigate('kunden', { action: 'create' })}
          className="flex items-center justify-start gap-2.5 px-3 py-3 min-h-[48px] bg-white border border-gray-200/60 rounded-xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all cursor-pointer"
        >
          <div className="w-6 h-6 rounded-md bg-stone-600 text-white flex items-center justify-center text-sm shrink-0 shadow-sm">+</div>
          <span className="font-semibold text-text-primary text-sm sm:text-xs">Neuer Kunde</span>
        </button>
        <button 
          onClick={() => onNavigate && onNavigate('projekte', { action: 'create' })}
          className="flex items-center justify-start gap-2.5 px-3 py-3 min-h-[48px] bg-white border border-gray-200/60 rounded-xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all cursor-pointer"
        >
          <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-sm shrink-0 shadow-sm">+</div>
          <span className="font-semibold text-text-primary text-sm sm:text-xs">Neues Projekt</span>
        </button>
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
            <div className="bg-white border border-gray-200/60 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-text-primary mb-6">Umsatzentwicklung (Letzte 6 Monate)</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: 24, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `CHF ${Math.round(value/1000)}k`} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value) => [formatCurrency(value), 'Umsatz']}
                    />
                    <Bar dataKey="Umsatz" radius={[8, 8, 0, 0]}>
                      {data.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === data.chartData.length - 1 ? '#b88a38' : '#e4d3b6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ---------------- ACTION CENTER (BOTH DESKTOP & MOBILE) ---------------- */}
          <div className="md:mt-8">
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
                    <div className="bg-white border border-gray-200/60 rounded-2xl p-6 text-center shadow-sm">
                      <span className="text-2xl mb-2 block">🎉</span>
                      <p className="text-sm text-text-secondary">Keine überfälligen Rechnungen.</p>
                    </div>
                  ) : (
                    data.ueberfaellig.slice(0, 3).map(r => (
                      <div 
                        key={r.id}
                        onClick={() => onNavigate && onNavigate('rechnungen', { rechnungId: r.id })}
                        className="bg-white border border-gray-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col gap-3 border-l-[4px] border-l-red-500"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider">Seit {formatDate(r.faellig_am)}</p>
                            <p className="font-bold text-text-primary mt-1 line-clamp-1">{r.kunden?.name || 'Unbekannt'}</p>
                          </div>
                          <p className="font-bold text-text-primary ml-2">{formatCurrency(r.total)}</p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if(onNavigate) onNavigate('rechnungen', { rechnungId: r.id })
                          }}
                          className="w-full min-h-[48px] py-3 sm:py-2 flex items-center justify-center bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-base sm:text-sm font-semibold transition-colors mt-1 cursor-pointer"
                        >
                          Mahnung senden &rarr;
                        </button>
                      </div>
                    ))
                  )}
                  {data.ueberfaellig.length > 3 && (
                    <button 
                      onClick={() => onNavigate && onNavigate('rechnungen')}
                      className="w-full min-h-[48px] py-3 flex items-center justify-center sm:py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-base sm:text-sm font-semibold transition-colors mt-1 border border-gray-200/60 cursor-pointer"
                    >
                      + {data.ueberfaellig.length - 3} weitere anzeigen
                    </button>
                  )}
                </div>
              </div>

              {/* Column 2: Offen / Feedback */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                  <h3 className="font-bold text-text-primary">Wartet auf Feedback</h3>
                  <span className="ml-auto bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{data.offen.length}</span>
                </div>
                
                <div className="flex flex-col gap-3">
                  {data.offen.length === 0 ? (
                    <div className="bg-white border border-gray-200/60 rounded-2xl p-6 text-center shadow-sm">
                      <span className="text-2xl mb-2 block">✨</span>
                      <p className="text-sm text-text-secondary">Alle Offerten sind beantwortet.</p>
                    </div>
                  ) : (
                    data.offen.slice(0, 3).map(o => (
                      <div 
                        key={o.id}
                        onClick={() => onNavigate && onNavigate('offerten', { offerteId: o.id })}
                        className="bg-white border border-gray-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col gap-3 border-l-[4px] border-l-amber-400"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">{o.status} • {formatDate(o.created_at)}</p>
                            <p className="font-bold text-text-primary mt-1 line-clamp-1">{o.kunden?.name || 'Unbekannt'}</p>
                          </div>
                          <p className="font-bold text-text-primary ml-2">{formatCurrency(o.total)}</p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if(onNavigate) onNavigate('offerten', { offerteId: o.id })
                          }}
                          className="w-full min-h-[48px] py-3 flex items-center justify-center sm:py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-base sm:text-sm font-semibold transition-colors mt-1 cursor-pointer"
                        >
                          Bearbeiten &rarr;
                        </button>
                      </div>
                    ))
                  )}
                  {data.offen.length > 3 && (
                    <button 
                      onClick={() => onNavigate && onNavigate('offerten')}
                      className="w-full min-h-[48px] py-3 flex items-center justify-center sm:py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-base sm:text-sm font-semibold transition-colors mt-1 border border-gray-200/60 cursor-pointer"
                    >
                      + {data.offen.length - 3} weitere anzeigen
                    </button>
                  )}
                </div>
              </div>

              {/* Column 3: In Bearbeitung */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <h3 className="font-bold text-text-primary">In Bearbeitung</h3>
                  <span className="ml-auto bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{data.inArbeit.length}</span>
                </div>
                
                <div className="flex flex-col gap-3">
                  {data.inArbeit.length === 0 ? (
                    <div className="bg-white border border-gray-200/60 rounded-2xl p-6 text-center shadow-sm">
                      <span className="text-2xl mb-2 block">🏖️</span>
                      <p className="text-sm text-text-secondary">Aktuell keine aktiven Projekte.</p>
                    </div>
                  ) : (
                    data.inArbeit.slice(0, 3).map(p => (
                      <div 
                        key={p.id}
                        onClick={() => onNavigate && onNavigate('projekte', { projektId: p.id })}
                        className="bg-white border border-gray-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col gap-3 border-l-[4px] border-l-emerald-500"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Aktives Projekt</p>
                            <p className="font-bold text-text-primary mt-1 line-clamp-1">{p.name}</p>
                            <p className="text-sm text-text-secondary mt-0.5 line-clamp-1">{p.kunden?.name}</p>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if(onNavigate) onNavigate('projekte', { projektId: p.id })
                          }}
                          className="w-full min-h-[48px] py-3 flex items-center justify-center sm:py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-base sm:text-sm font-semibold transition-colors mt-1 cursor-pointer"
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
              <h2 className="text-xl font-bold text-text-primary">📅 Terminkalender</h2>
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
