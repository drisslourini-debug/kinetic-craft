import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Sidebar from './components/Sidebar'
import DashboardView from './views/DashboardView'
import KundenView from './views/KundenView'
import ProjekteView from './views/ProjekteView'
import OffertenView from './views/OffertenView'
import RechnungenView from './views/RechnungenView'
import KatalogView from './views/KatalogView'
import EinstellungenView from './views/EinstellungenView'
import LoginView from './views/LoginView'
import MobileTabBar from './components/MobileTabBar'
import logoImg from './assets/logo.png'

const views = {
  dashboard: DashboardView,
  kunden: KundenView,
  projekte: ProjekteView,
  offerten: OffertenView,
  rechnungen: RechnungenView,
  katalog: KatalogView,
  einstellungen: EinstellungenView,
}

const viewTitles = {
  dashboard: '📊 Dashboard',
  kunden: '👥 Kunden',
  projekte: '🏗️ Projekte & Objekte',
  offerten: '📄 Offerten',
  rechnungen: '💰 Rechnungen',
  katalog: '🏷️ Leistungskatalog',
  einstellungen: '⚙️ Einstellungen',
}

export default function App() {
  const [session, setSession] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [activeView, setActiveView] = useState('dashboard')
  const [viewParams, setViewParams] = useState(null)

  const handleNavigate = (view, params = null) => {
    setViewParams(params)
    setActiveView(view)
  }

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsInitializing(false)
    })

    // Listen for changes on auth state (log in, log out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-text-secondary">Lade atelier77 CRM...</p>
      </div>
    )
  }

  if (!session) {
    return <LoginView onLoginSuccess={setSession} />
  }

  const ActiveComponent = views[activeView]

  return (
    <div className="flex min-h-[100dvh] bg-surface">
      {/* Sidebar - hidden during print */}
      <div className="print:hidden">
        <Sidebar activeView={activeView} onNavigate={(view) => handleNavigate(view, null)} />
      </div>

      {/* Main content area */}
      <main className="flex-1 min-w-0 pb-20 md:pb-0 print:m-0 print:p-0">
        {/* Top bar - hidden during print */}
        <header className="sticky top-0 z-20 bg-surface-card/80 backdrop-blur-md border-b border-border px-6 py-4 md:px-8 print:hidden">
          <div className="flex items-center justify-between">
            {/* Logo replacement for header */}
            <div className="flex items-center md:hidden">
              <img src={logoImg} alt="Atelier 77 Logo" className="h-8 w-auto drop-shadow-sm" />
            </div>
            
            <h2 className="text-sm font-semibold text-text-secondary hidden md:block">
              {viewTitles[activeView]}
            </h2>
            <div className="flex items-center gap-3">
              {/* Notification bell */}
              <button className="relative w-9 h-9 rounded-lg hover:bg-surface flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {/* Notification dot */}
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-500 rounded-full" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-5 md:p-8 max-w-7xl mx-auto w-full print:p-0 print:m-0 print:max-w-none">
          <ActiveComponent onNavigate={handleNavigate} viewParams={viewParams} />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="print:hidden">
        <MobileTabBar activeView={activeView} onNavigate={(view) => handleNavigate(view, null)} />
      </div>
    </div>
  )
}
