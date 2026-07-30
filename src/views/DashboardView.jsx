import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatDate, formatCurrency } from '../lib/formatters'

export default function DashboardView({ onNavigate }) {
  const [data, setData] = useState({
    firmenname: '',
    ueberfaellig: [],
    offen: [],
    inArbeit: [],
    umsatzTotal: 0,
    offenTotal: 0,
    chartData: []
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      if (!supabase) return
      
      try {
        setIsLoading(true)
        
        // Fetch Firmenname
        const { data: settings } = await supabase
          .from('einstellungen')
          .select('firmenname')
          .eq('id', 1)
          .single()
          
        const firmenname = settings?.firmenname || ''

        // Fetch Rechnungen for Action Center and KPIs
        const { data: rechnungen } = await supabase
          .from('rechnungen')
          .select('id, rechnung_nr, total, faellig_am, bezahlt_am, status, kunden(name)')
          .eq('is_archived', false)

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
            if (r.status === 'Überfällig') {
              ueberfaellig.push(r)
              offenTotal += r.total || 0
            } else if (r.status === 'Versendet') {
              offenTotal += r.total || 0
            } else if (r.status === 'Bezahlt') {
              // YTD Umsatz
              const dateStr = r.bezahlt_am || r.faellig_am || new Date().toISOString()
              const d = new Date(dateStr)
              
              if (d.getFullYear() === currentYear) {
                umsatzTotal += r.total || 0
              }
              // Chart Umsatz
              const key = `${d.getFullYear()}-${d.getMonth()}`
              if (chartDataMap.has(key)) {
                const monthData = chartDataMap.get(key)
                monthData.Umsatz += r.total || 0
                chartDataMap.set(key, monthData)
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
          .select('id, total, status, created_at, kunden(name)')
          .eq('is_archived', false)
          .in('status', ['Entwurf', 'Versendet'])
          .order('created_at', { ascending: false })

        // Fetch Projekte (In Arbeit)
        const { data: projekte } = await supabase
          .from('projekte')
          .select('id, name, status, kunden(name)')
          .eq('is_archived', false)
          .eq('status', 'In Arbeit')
          .order('created_at', { ascending: false })

        setData({
          firmenname,
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
    }
    
    fetchDashboardData()
  }, [])


  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">
            {data.firmenname ? `Grüezi beim ${data.firmenname} Dashboard 👋` : 'Grüezi 👋'}
          </h2>
          <p className="text-text-secondary mt-1">
            <span className="md:hidden">Dein Action-Center. Hier ist dein Überblick für heute.</span>
            <span className="hidden md:inline">Zahlen, Fakten und anstehende Aufgaben auf einen Blick.</span>
          </p>
        </div>
      </div>

      {/* ---------------- MOBILE ONLY: QUICK ACTIONS ---------------- */}
      <div className="md:hidden grid grid-cols-2 gap-2">
        <button 
          onClick={() => onNavigate && onNavigate('offerten', { action: 'create' })}
          className="flex items-center justify-start gap-2.5 px-3 py-2 bg-white border border-gray-200/60 rounded-xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
        >
          <div className="w-6 h-6 rounded-md bg-primary-600 text-white flex items-center justify-center text-sm shrink-0 shadow-sm">+</div>
          <span className="font-semibold text-text-primary text-xs">Neue Offerte</span>
        </button>
        <button 
          onClick={() => onNavigate && onNavigate('rechnungen', { action: 'create' })}
          className="flex items-center justify-start gap-2.5 px-3 py-2 bg-white border border-gray-200/60 rounded-xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
        >
          <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center text-sm shrink-0 shadow-sm">+</div>
          <span className="font-semibold text-text-primary text-xs">Neue Rechnung</span>
        </button>
        <button 
          onClick={() => onNavigate && onNavigate('kunden', { action: 'create' })}
          className="flex items-center justify-start gap-2.5 px-3 py-2 bg-white border border-gray-200/60 rounded-xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
        >
          <div className="w-6 h-6 rounded-md bg-stone-600 text-white flex items-center justify-center text-sm shrink-0 shadow-sm">+</div>
          <span className="font-semibold text-text-primary text-xs">Neuer Kunde</span>
        </button>
        <button 
          onClick={() => onNavigate && onNavigate('projekte', { action: 'create' })}
          className="flex items-center justify-start gap-2.5 px-3 py-2 bg-white border border-gray-200/60 rounded-xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
        >
          <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-sm shrink-0 shadow-sm">+</div>
          <span className="font-semibold text-text-primary text-xs">Neues Projekt</span>
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
              <div className="bg-white border border-gray-200/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-text-secondary text-sm font-semibold uppercase tracking-wider">Bezahlter Umsatz (YTD)</p>
                  <p className="text-3xl font-bold text-text-primary mt-2">{formatCurrency(data.umsatzTotal)}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center text-xl mt-4">💰</div>
              </div>

              {/* KPI 2: Open Invoices Amount */}
              <div className="bg-white border border-gray-200/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-text-secondary text-sm font-semibold uppercase tracking-wider">Ausstehende Zahlungen</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{formatCurrency(data.offenTotal)}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-xl mt-4">⏳</div>
              </div>

              {/* KPI 3: Pipeline (Open Offers) */}
              <div className="bg-white border border-gray-200/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-text-secondary text-sm font-semibold uppercase tracking-wider">Offene Offerten (Pipeline)</p>
                  <p className="text-3xl font-bold text-text-primary mt-2">{data.offen.length}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl mt-4">📄</div>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="bg-white border border-gray-200/60 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-text-primary mb-6">Umsatzentwicklung (Letzte 6 Monate)</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `CHF ${value/1000}k`} />
                    <Tooltip 
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value) => [formatCurrency(value), 'Umsatz']}
                    />
                    <Bar dataKey="Umsatz" radius={[6, 6, 0, 0]}>
                      {data.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === data.chartData.length - 1 ? '#0284c7' : '#bae6fd'} />
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
                          className="w-full py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-semibold transition-colors mt-1"
                        >
                          Mahnung senden &rarr;
                        </button>
                      </div>
                    ))
                  )}
                  {data.ueberfaellig.length > 3 && (
                    <button 
                      onClick={() => onNavigate && onNavigate('rechnungen')}
                      className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold transition-colors mt-1 border border-gray-200/60 cursor-pointer"
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
                          className="w-full py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-sm font-semibold transition-colors mt-1"
                        >
                          Bearbeiten &rarr;
                        </button>
                      </div>
                    ))
                  )}
                  {data.offen.length > 3 && (
                    <button 
                      onClick={() => onNavigate && onNavigate('offerten')}
                      className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold transition-colors mt-1 border border-gray-200/60 cursor-pointer"
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
                          className="w-full py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-semibold transition-colors mt-1"
                        >
                          Projekt öffnen &rarr;
                        </button>
                      </div>
                    ))
                  )}
                  {data.inArbeit.length > 3 && (
                    <button 
                      onClick={() => onNavigate && onNavigate('projekte')}
                      className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold transition-colors mt-1 border border-gray-200/60 cursor-pointer"
                    >
                      + {data.inArbeit.length - 3} weitere anzeigen
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
