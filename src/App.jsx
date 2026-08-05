import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { injectThemeVariables } from './utils/colors'
import Sidebar from './components/Sidebar'
import DashboardView from './views/DashboardView'
import KundenView from './views/KundenView'
import ProjekteView from './views/ProjekteView'
import OffertenView from './views/OffertenView'
import RechnungenView from './views/RechnungenView'
import KatalogView from './views/KatalogView'
import BuchhaltungView from './views/BuchhaltungView'
import DateienView from './views/DateienView'
import EinstellungenView from './views/EinstellungenView'
import LoginView from './views/LoginView'
import RegistrationWizardView from './views/RegistrationWizardView'
import PaywallScreen from './components/PaywallScreen'
import MobileTabBar from './components/MobileTabBar'
import logoImg from './assets/logo.png'

const views = {
  dashboard: DashboardView,
  kunden: KundenView,
  projekte: ProjekteView,
  offerten: OffertenView,
  rechnungen: RechnungenView,
  buchhaltung: BuchhaltungView,
  dateien: DateienView,
  katalog: KatalogView,
  einstellungen: EinstellungenView,
}

const viewTitles = {
  dashboard: '📊 Dashboard',
  kunden: '👥 Kunden',
  projekte: '🏗️ Projekte',
  offerten: '📄 Offerten',
  rechnungen: '💰 Rechnungen',
  buchhaltung: '📉 Buchhaltung',
  dateien: '📁 Dateien',
  katalog: '🏷️ Leistungskatalog',
  einstellungen: '⚙️ Einstellungen',
}

export default function App() {
  const [session, setSession] = useState(() => {
    return window.location.search.includes('testBypass=true') ? { user: { id: 'test' } } : null
  })
  const [userRole, setUserRole] = useState(null)
  const [isInitializing, setIsInitializing] = useState(!window.location.search.includes('testBypass=true'))
  const [activeView, setActiveView] = useState('dashboard')
  const [viewParams, setViewParams] = useState(null)
  const [globalSettings, setGlobalSettings] = useState(null)
  const [showRegistration, setShowRegistration] = useState(false)
  const [tenantInfo, setTenantInfo] = useState(null)
  const [userName, setUserName] = useState('')

  const handleNavigate = (view, params = null) => {
    setViewParams(params)
    setActiveView(view)
  }

  useEffect(() => {
    if (window.location.search.includes('testBypass=true')) {
      setIsInitializing(false)
      return
    }

    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (!session) setIsInitializing(false)
    })

    // Listen for changes on auth state (log in, log out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fetch user role when session changes
  useEffect(() => {
    async function fetchRole() {
      if (!session || !session.user) return
      if (session.user.id === 'test') {
        setUserRole('admin')
        setIsInitializing(false)
        return
      }

      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role, tenant_id, user_name, tenants(name, trial_ends_at, status)')
          .eq('id', session.user.id)
          .single()
        
        const role = (data && data.role) ? data.role : 'admin' // default fallback
        setUserRole(role)
        if (data && data.user_name) setUserName(data.user_name)
        
        if (data && data.tenants) {
          setTenantInfo(data.tenants)
        }
        
        // If treuhand, override default view to buchhaltung if it's still dashboard
        if (role === 'treuhand' && activeView === 'dashboard') {
          setActiveView('buchhaltung')
        }

        // Fetch Global Settings for theming (Logo, Color)
        // Now fetch correctly by tenant_id
        const { data: settingsData } = await supabase
          .from('einstellungen')
          .select('*')
          .eq('tenant_id', data.tenant_id)
          .single()
          
        if (settingsData) {
          setGlobalSettings(settingsData)
          if (settingsData.primary_color) {
            injectThemeVariables(settingsData.primary_color)
          }
        }
      } catch (err) {
        console.error('Failed to fetch user role:', err)
        setUserRole('admin')
      } finally {
        setIsInitializing(false)
      }
    }
    
    if (session) {
      fetchRole()
    }
  }, [session])

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-text-secondary">Lade CRM...</p>
      </div>
    )
  }

  if (!session) {
    if (showRegistration) {
      return (
        <RegistrationWizardView 
          onRegistrationSuccess={(sess) => {
            setSession(sess)
            setShowRegistration(false)
          }} 
          onGoToLogin={() => setShowRegistration(false)} 
        />
      )
    }
    return <LoginView onLoginSuccess={setSession} onGoToRegistration={() => setShowRegistration(true)} />
  }

  // Check Trial Expiry
  if (tenantInfo && tenantInfo.trial_ends_at && tenantInfo.status === 'trial') {
    const trialEnd = new Date(tenantInfo.trial_ends_at)
    if (new Date() > trialEnd) {
      return <PaywallScreen tenant={tenantInfo} />
    }
  }

  const ActiveComponent = views[activeView]

  // Route Guard für Treuhänder
  const treuhandAllowedViews = ['kunden', 'rechnungen', 'buchhaltung', 'dateien']
  if (userRole === 'treuhand' && !treuhandAllowedViews.includes(activeView)) {
    return (
      <div className="flex min-h-[100dvh] bg-surface">
        <div className="print:hidden">
          <Sidebar activeView={activeView} onNavigate={(view) => handleNavigate(view, null)} userRole={userRole} globalSettings={globalSettings} userName={userName} />
        </div>
        <main className="flex-1 min-w-0 pb-20 md:pb-0 p-5 md:p-8 flex items-center justify-center">
          <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200 text-center max-w-md">
            <h2 className="text-lg font-bold mb-2">Zugriff verweigert</h2>
            <p className="text-sm">Deine Rolle hat keine Berechtigung für diese Ansicht. Bitte navigiere über das Menü zu einer erlaubten Ansicht.</p>
          </div>
        </main>
        <div className="print:hidden">
          <MobileTabBar activeView={activeView} onNavigate={(view) => handleNavigate(view, null)} userRole={userRole} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] bg-surface">
      {/* Sidebar - hidden during print */}
      <div className="print:hidden">
        <Sidebar activeView={activeView} onNavigate={(view) => handleNavigate(view, null)} userRole={userRole} globalSettings={globalSettings} />
      </div>

      {/* Main content area */}
      <main className="flex-1 min-w-0 pb-20 md:pb-0 print:m-0 print:p-0">
        {/* Top bar - hidden during print */}
        <header className="sticky top-0 z-20 bg-surface-card/80 backdrop-blur-md border-b border-border px-6 py-4 md:px-8 print:hidden">
          <div className="flex items-center justify-between">
            {/* Logo replacement for header */}
            <div className="flex items-center gap-3">
              {globalSettings?.logo_url ? (
                <img src={globalSettings.logo_url} alt={globalSettings.firmenname || "Logo"} className="h-10 w-auto object-contain drop-shadow-sm md:hidden" />
              ) : (
                <img src={logoImg} alt="Default Logo" className="h-10 w-auto object-contain drop-shadow-sm md:hidden" />
              )}
              <h1 className="text-xl md:text-2xl font-bold text-text-primary hidden md:block">
                {viewTitles[activeView]}
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              {userRole === 'treuhand' && (
                <span className="hidden sm:inline-flex px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                  Treuhand-Zugang
                </span>
              )}
              <button 
                onClick={async () => await supabase.auth.signOut()}
                className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
              >
                Abmelden
              </button>
            </div>
          </div>
        </header>

        {/* Main View Area */}
        <div className="p-5 md:p-8 w-full max-w-[1600px] mx-auto min-h-screen print:p-0 print:m-0 print:max-w-none">
          <ActiveComponent onNavigate={handleNavigate} viewParams={viewParams} userRole={userRole} globalSettings={globalSettings} />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="print:hidden">
        <MobileTabBar activeView={activeView} onNavigate={(view) => handleNavigate(view, null)} userRole={userRole} />
      </div>
    </div>
  )
}
