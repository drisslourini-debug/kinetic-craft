import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function DashboardView({ onNavigate }) {
  const [stats, setStats] = useState({
    offerten: 0,
    projekte: 0,
    kunden: 0,
    umsatz: 0,
    firmenname: ''
  })
  const [activities, setActivities] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      if (!supabase) return
      
      try {
        setIsLoading(true)
        
        // Fetch Kunden count
        const { count: kundenCount } = await supabase
          .from('kunden')
          .select('*', { count: 'exact', head: true })
          .eq('is_archived', false)
          
        // Fetch Projekte count
        const { count: projekteCount } = await supabase
          .from('projekte')
          .select('*', { count: 'exact', head: true })
          .eq('is_archived', false)
          
        // Fetch Offerten stats
        const { data: offerten } = await supabase
          .from('offerten')
          .select('id, total, status, created_at, kunden(name)')
          .eq('is_archived', false)
          .order('created_at', { ascending: false })
          
        // Fetch Firmenname
        const { data: settings } = await supabase
          .from('einstellungen')
          .select('firmenname')
          .eq('id', 1)
          .single()
          
        const firmenname = settings?.firmenname || ''
        
        let offertenOffen = 0
        let umsatz = 0
        const recentActivities = []
        
        if (offerten) {
          offerten.forEach(o => {
            if (o.status !== 'Abgelehnt' && o.status !== 'Akzeptiert') {
              offertenOffen++
            }
            if (o.status === 'Akzeptiert') {
              umsatz += o.total || 0
            }
            
            // Add to activities (top 5)
            if (recentActivities.length < 5) {
              recentActivities.push({
                action: `Offerte #${o.id} für ${o.kunden?.name || 'Unbekannt'} ${o.status === 'Akzeptiert' ? 'akzeptiert' : 'erstellt'}`,
                time: new Date(o.created_at).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                icon: o.status === 'Akzeptiert' ? '✅' : '📄',
                target: 'offerten',
                targetParams: { offerteId: o.id }
              })
            }
          })
        }
        
        setStats({
          offerten: offertenOffen,
          projekte: projekteCount || 0,
          kunden: kundenCount || 0,
          umsatz: umsatz,
          firmenname: firmenname
        })
        setActivities(recentActivities)
        
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchDashboardData()
  }, [])

  const statCards = [
    { label: 'Offene Offerten', value: stats.offerten.toString(), icon: '📄', trend: 'In Bearbeitung', color: 'from-primary-400 to-primary-600', target: 'offerten' },
    { label: 'Aktive Projekte', value: stats.projekte.toString(), icon: '🏗️', trend: 'Laufende Baustellen', color: 'from-neutral-700 to-neutral-900', target: 'projekte' },
    { label: 'Kunden', value: stats.kunden.toString(), icon: '👥', trend: 'Im CRM erfasst', color: 'from-stone-500 to-stone-700', target: 'kunden' },
    { label: 'Umsatz (Akzeptiert)', value: `CHF ${stats.umsatz.toLocaleString('de-CH', { maximumFractionDigits: 0 })}`, icon: '💰', trend: 'Gesamttotal', color: 'from-primary-600 to-primary-800', target: 'rechnungen' },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-text-primary">
          {stats.firmenname ? `Grüezi beim ${stats.firmenname} Dashboard 👋` : 'Grüezi 👋'}
        </h2>
        <p className="text-text-secondary mt-1">
          Willkommen zurück. Hier ist dein Überblick.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            onClick={() => stat.target && onNavigate && onNavigate(stat.target)}
            className="relative overflow-hidden bg-surface-card rounded-2xl border border-border p-3 sm:p-5 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-text-secondary text-xs sm:text-sm font-medium">{stat.label}</p>
                <p className="text-xl sm:text-2xl font-bold text-text-primary mt-0.5 sm:mt-1">{stat.value}</p>
                <p className="text-[10px] sm:text-xs text-text-secondary mt-1 sm:mt-2">{stat.trend}</p>
              </div>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white text-base sm:text-lg shadow-sm shrink-0 ml-2`}>
                {stat.icon}
              </div>
            </div>
            {/* Decorative accent bar */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.color} opacity-80`} />
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-surface-card rounded-2xl border border-border p-4 sm:p-6 shadow-sm">
        <h3 className="text-base sm:text-lg font-semibold text-text-primary mb-3 sm:mb-4">Schnellzugriff</h3>
        <div className="flex overflow-x-auto sm:grid sm:grid-cols-4 gap-3 pb-2 sm:pb-0 snap-x">
          <button 
            onClick={() => onNavigate && onNavigate('offerten')}
            className="snap-start shrink-0 flex items-center gap-2 sm:gap-3 px-4 py-2.5 sm:py-3 rounded-xl bg-primary-50 text-primary-800 hover:bg-primary-100 transition-colors font-medium text-sm cursor-pointer border border-primary-100 whitespace-nowrap"
          >
            <span className="text-base sm:text-lg">📄</span>
            Zu den Offerten
          </button>
          <button 
            onClick={() => onNavigate && onNavigate('rechnungen')}
            className="snap-start shrink-0 flex items-center gap-2 sm:gap-3 px-4 py-2.5 sm:py-3 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors font-medium text-sm cursor-pointer border border-emerald-100 whitespace-nowrap"
          >
            <span className="text-base sm:text-lg">💰</span>
            Zu den Rechnungen
          </button>
          <button 
            onClick={() => onNavigate && onNavigate('kunden')}
            className="snap-start shrink-0 flex items-center gap-2 sm:gap-3 px-4 py-2.5 sm:py-3 rounded-xl bg-surface text-text-primary hover:bg-neutral-100 transition-colors font-medium text-sm cursor-pointer border border-border whitespace-nowrap"
          >
            <span className="text-base sm:text-lg">👥</span>
            Zu den Kunden
          </button>
          <button 
            onClick={() => onNavigate && onNavigate('projekte')}
            className="snap-start shrink-0 flex items-center gap-2 sm:gap-3 px-4 py-2.5 sm:py-3 rounded-xl bg-surface text-text-primary hover:bg-neutral-100 transition-colors font-medium text-sm cursor-pointer border border-border whitespace-nowrap"
          >
            <span className="text-base sm:text-lg">🏗️</span>
            Zu den Projekten
          </button>
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Letzte Aktivitäten</h3>
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-sm text-text-secondary">Lade Aktivitäten...</div>
          ) : activities.length === 0 ? (
            <div className="text-sm text-text-secondary">Noch keine Aktivitäten vorhanden.</div>
          ) : (
            activities.map((activity, i) => (
              <div 
                key={i} 
                onClick={() => activity.target && onNavigate && onNavigate(activity.target, activity.targetParams)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface transition-colors cursor-pointer active:scale-[0.98]"
              >
                <span className="text-base">{activity.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary font-medium truncate">{activity.action}</p>
                  <p className="text-xs text-text-secondary">{activity.time}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

