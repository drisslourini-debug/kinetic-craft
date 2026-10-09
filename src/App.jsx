import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { supabase } from './lib/supabase'
import { injectThemeVariables } from './utils/colors'
import {
  parseLocation,
  initRouter,
  pushRoute,
  getCurrentHistoryIndex,
  setHistoryIndex,
  checkHasUnsavedChanges,
} from './lib/router'
import UnsavedChangesDialog from './components/UnsavedChangesDialog'
import Sidebar from './components/Sidebar'
import MobileTabBar from './components/MobileTabBar'
import CommandBar from './components/CommandBar'
import GlobalTimerWidget from './components/zeiterfassung/GlobalTimerWidget'
import { IconNav, IconWarning } from './components/icons/BrandIcons'

const DashboardView = lazy(() => import('./views/DashboardView'))
const KundenView = lazy(() => import('./views/KundenView'))
const ProjekteView = lazy(() => import('./views/ProjekteView'))
const KalenderView = lazy(() => import('./views/KalenderView'))
const OffertenView = lazy(() => import('./views/OffertenView'))
const RechnungenView = lazy(() => import('./views/RechnungenView'))
const KatalogView = lazy(() => import('./views/KatalogView'))
const BuchhaltungView = lazy(() => import('./views/BuchhaltungView'))
const DateienView = lazy(() => import('./views/DateienView'))
const EinstellungenView = lazy(() => import('./views/EinstellungenView'))
const LandingPageView = lazy(() => import('./views/LandingPageView'))
const LoginView = lazy(() => import('./views/LoginView'))
const RegistrationWizardView = lazy(() => import('./views/RegistrationWizardView'))
const PaywallScreen = lazy(() => import('./components/PaywallScreen'))
const ImpressumModal = lazy(() => import('./components/legal/ImpressumModal'))
const DatenschutzModal = lazy(() => import('./components/legal/DatenschutzModal'))

function ViewLoader() {
  return (
    <div className="flex h-[50vh] w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
    </div>
  )
}

const views = {
  dashboard: DashboardView,
  kunden: KundenView,
  projekte: ProjekteView,
  kalender: KalenderView,
  offerten: OffertenView,
  rechnungen: RechnungenView,
  buchhaltung: BuchhaltungView,
  dateien: DateienView,
  katalog: KatalogView,
  einstellungen: EinstellungenView,
}

const viewTitles = {
  dashboard: 'Dashboard',
  kunden: 'Kunden',
  projekte: 'Projekte',
  kalender: 'Kalender',
  offerten: 'Offerten',
  rechnungen: 'Rechnungen',
  buchhaltung: 'Buchhaltung',
  dateien: 'Dateien',
  katalog: 'Leistungskatalog',
  einstellungen: 'Einstellungen',
}

export default function App() {
  const [session, setSession] = useState(() => {
    return (import.meta.env.DEV && window.location.search.includes('testBypass=true')) ? { user: { id: 'test' } } : null
  })
  const [userRole, setUserRole] = useState(null)
  const [isInitializing, setIsInitializing] = useState(() => {
    return !(import.meta.env.DEV && window.location.search.includes('testBypass=true'))
  })

  const initialRoute = parseLocation()
  const [activeView, setActiveView] = useState(initialRoute.view)
  const [viewParams, setViewParams] = useState(initialRoute.params)
  const [globalSettings, setGlobalSettings] = useState(null)
  const [authScreen, setAuthScreen] = useState(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    if (hash === '#login') return 'login'
    if (hash === '#register' || hash.startsWith('#register?')) return 'register'
    return 'landing'
  })
  const [legalModal, setLegalModal] = useState(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    if (hash === '#impressum') return 'impressum'
    if (hash === '#datenschutz') return 'datenschutz'
    return null
  })
  const [tenantInfo, setTenantInfo] = useState(null)
  const [userName, setUserName] = useState('')
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false)
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false)

  // Listen to network status (Baustellen-Offline-Erkennung)
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // ⌘K / Ctrl+K keyboard shortcut listener for CommandBar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsCommandBarOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Hash change listener for landing, login, register, and legal modals
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash === '#impressum') {
        setLegalModal('impressum')
      } else if (hash === '#datenschutz') {
        setLegalModal('datenschutz')
      } else {
        setLegalModal(null)
        if (hash === '#login') setAuthScreen('login')
        else if (hash === '#register' || hash.startsWith('#register?')) setAuthScreen('register')
        else if (hash === '#landing' || !hash) {
          setAuthScreen('landing')
        }
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const handleOpenImpressum = () => {
    setLegalModal('impressum')
    window.location.hash = '#impressum'
  }

  const handleOpenDatenschutz = () => {
    setLegalModal('datenschutz')
    window.location.hash = '#datenschutz'
  }

  const handleCloseLegalModal = () => {
    setLegalModal(null)
    if (window.location.hash === '#impressum' || window.location.hash === '#datenschutz') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }

  // Dialog for unsaved changes confirmation
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState(null)
  const currentRouteRef = useRef({ view: initialRoute.view, params: initialRoute.params })
  useEffect(() => {
    currentRouteRef.current = { view: activeView, params: viewParams }
  }, [activeView, viewParams])

  // Initialize router state on startup & listen to popstate
  useEffect(() => {
    initRouter()

    const handlePopState = (event) => {
      const { view: nextView, params: nextParams } = parseLocation()
      const current = currentRouteRef.current
      const isSameRoute = nextView === current.view && JSON.stringify(nextParams) === JSON.stringify(current.params)

      const hasUnsaved = checkHasUnsavedChanges()
      const prevIndex = getCurrentHistoryIndex()
      const nextIndex = event.state?.historyIndex ?? 0

      // Only warn if navigating AWAY from the current page/view
      if (hasUnsaved && !isSameRoute) {
        setPendingNavigation({
          type: 'popstate',
          nextIndex,
          prevIndex,
          state: event.state,
        })
        setUnsavedDialogOpen(true)
        return
      }

      setHistoryIndex(nextIndex)
      setActiveView(nextView)
      setViewParams(nextParams)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleNavigate = (view, params = null, options = {}) => {
    const hasUnsaved = checkHasUnsavedChanges()
    if (hasUnsaved && !options.skipGuard) {
      setPendingNavigation({
        type: 'push',
        view,
        params,
        options,
      })
      setUnsavedDialogOpen(true)
      return
    }

    pushRoute(view, params || {}, options)
    setViewParams(params)
    setActiveView(view)
  }

  const handleConfirmDiscard = () => {
    setUnsavedDialogOpen(false)
    if (!pendingNavigation) return

    if (pendingNavigation.type === 'popstate') {
      setHistoryIndex(pendingNavigation.nextIndex)
      const { view, params } = parseLocation()
      setActiveView(view)
      setViewParams(params)
    } else if (pendingNavigation.type === 'push') {
      pushRoute(pendingNavigation.view, pendingNavigation.params || {}, {
        ...pendingNavigation.options,
        skipGuard: true,
      })
      setViewParams(pendingNavigation.params)
      setActiveView(pendingNavigation.view)
    }
    setPendingNavigation(null)
  }

  const handleCancelDiscard = () => {
    setUnsavedDialogOpen(false)
    if (!pendingNavigation) return

    if (pendingNavigation.type === 'popstate') {
      const { nextIndex, prevIndex } = pendingNavigation
      if (nextIndex < prevIndex) {
        window.history.forward()
      } else if (nextIndex > prevIndex) {
        window.history.back()
      }
    }
    setPendingNavigation(null)
  }

  const refreshGlobalSettings = async () => {
    if (!session?.user?.id) return;
    try {
      const { data: roleData } = await supabase.from('user_roles').select('tenant_id').eq('id', session.user.id).maybeSingle();
      if (roleData?.tenant_id) {
        const { data: settingsData } = await supabase.from('einstellungen').select('*').eq('tenant_id', roleData.tenant_id).limit(1).maybeSingle();
        if (settingsData) {
          setGlobalSettings(settingsData);
          if (settingsData.primary_color) {
            injectThemeVariables(settingsData.primary_color);
          }
        }
      }
    } catch (e) {
      console.error('Failed to refresh global settings:', e);
    }
  }

  useEffect(() => {
    if (import.meta.env.DEV && window.location.search.includes('testBypass=true')) {
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
      if (import.meta.env.DEV && session.user.id === 'test') {
        setUserRole('admin')
        setIsInitializing(false)
        return
      }

      try {
        let { data } = await supabase
          .from('user_roles')
          .select('role, tenant_id, user_name, tenants(name, trial_ends_at, status)')
          .eq('id', session.user.id)
          .maybeSingle()

        // Auto-heal / Auto-link if tenant_id is missing:
        if (!data?.tenant_id && session.user.id !== 'test') {
          const urlParams = new URLSearchParams(window.location.search)
          const hashParams = window.location.hash ? new URLSearchParams(window.location.hash.split('?')[1] || '') : null
          const inviteToken = urlParams.get('token') || hashParams?.get('token')

          if (inviteToken) {
            try {
              const { error: acceptErr } = await supabase.rpc('accept_invitation', {
                p_token: inviteToken,
                p_user_name: session.user.user_metadata?.full_name || (session.user?.email ? session.user.email.split('@')[0] : 'Admin')
              })
              if (!acceptErr) {
                const retryRes = await supabase
                  .from('user_roles')
                  .select('role, tenant_id, user_name, tenants(name, trial_ends_at, status)')
                  .eq('id', session.user.id)
                  .maybeSingle()
                if (retryRes.data) {
                  data = retryRes.data
                }
              }
            } catch (invErr) {
              console.warn('Auto accept invitation notice:', invErr)
            }
          }
        }
        
        const role = (data && data.role) ? data.role : 'monteur' // sicherer Standard-Fallback
        setUserRole(role)
        if (session.user.user_metadata?.full_name) {
          setUserName(session.user.user_metadata.full_name)
        } else if (data && data.user_name) {
          setUserName(data.user_name)
        } else if (session.user.email) {
          setUserName(session.user.email.split('@')[0])
        }
        
        if (data && data.tenants) {
          setTenantInfo(data.tenants)
        }
        
        // If treuhand, override default view to buchhaltung if it's still dashboard
        if (role === 'treuhand') {
          setActiveView(prev => (prev === 'dashboard' ? 'buchhaltung' : prev))
        }

        // Fetch Global Settings for theming (Logo, Color)
        // Now fetch correctly by tenant_id only if tenant_id exists
        if (data?.tenant_id) {
          const { data: settingsData } = await supabase
            .from('einstellungen')
            .select('*')
            .eq('tenant_id', data.tenant_id)
            .limit(1)
            .maybeSingle()
            
          if (settingsData) {
            setGlobalSettings(settingsData)
            if (settingsData.primary_color) {
              injectThemeVariables(settingsData.primary_color)
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch user role:', err)
        setUserRole('monteur')
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
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
        <div className="relative flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-400 via-teal-400 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-sky-500/25 animate-pulse">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4v16" />
              <path d="M4 12l9-8" />
              <path d="M4 12l10 8" />
              <circle cx="18" cy="6" r="2" fill="currentColor" />
            </svg>
          </div>
          <div className="absolute -inset-2 rounded-3xl border-2 border-sky-500/20 animate-ping opacity-30 pointer-events-none" />
        </div>
        <div className="flex items-center gap-2.5 text-text-secondary text-sm font-medium">
          <svg className="animate-spin h-4 w-4 text-sky-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Kinetic Craft wird geladen...</span>
        </div>
      </div>
    )
  }

  const handleLoginSuccess = (sess) => {
    setSession(sess)
    setAuthScreen('landing')
    if (targetRouteRef.current && targetRouteRef.current.view !== 'dashboard') {
      handleNavigate(targetRouteRef.current.view, targetRouteRef.current.params, { replace: true })
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } finally {
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('atelier77_einstellungen')) {
            localStorage.removeItem(key)
          }
        })
      } catch {}
      setUserRole(null)
      setTenantInfo(null)
      setGlobalSettings(null)
      window.location.hash = ''
      setAuthScreen('landing')
      handleNavigate('dashboard', null, { replace: true })
    }
  }

  if (!session) {
    let authContent = null
    if (authScreen === 'register') {
      authContent = (
        <RegistrationWizardView 
          onRegistrationSuccess={handleLoginSuccess} 
          onGoToLogin={() => {
            window.location.hash = '#login'
            setAuthScreen('login')
          }} 
          onBackToLanding={() => {
            window.location.hash = ''
            setAuthScreen('landing')
          }}
          onOpenImpressum={handleOpenImpressum}
          onOpenDatenschutz={handleOpenDatenschutz}
        />
      )
    } else if (authScreen === 'login') {
      authContent = (
        <LoginView 
          onLoginSuccess={handleLoginSuccess} 
          onGoToRegistration={() => {
            window.location.hash = '#register'
            setAuthScreen('register')
          }} 
          onBackToLanding={() => {
            window.location.hash = ''
            setAuthScreen('landing')
          }}
          onOpenImpressum={handleOpenImpressum}
          onOpenDatenschutz={handleOpenDatenschutz}
        />
      )
    } else {
      authContent = (
        <LandingPageView 
          onGoToLogin={() => {
            window.location.hash = '#login'
            setAuthScreen('login')
          }} 
          onGoToRegistration={() => {
            window.location.hash = '#register'
            setAuthScreen('register')
          }} 
          onOpenImpressum={handleOpenImpressum}
          onOpenDatenschutz={handleOpenDatenschutz}
        />
      )
    }

    return (
      <Suspense fallback={<ViewLoader />}>
        {authContent}
        <ImpressumModal 
          isOpen={legalModal === 'impressum'} 
          onClose={handleCloseLegalModal} 
          onOpenDatenschutz={handleOpenDatenschutz} 
        />
        <DatenschutzModal 
          isOpen={legalModal === 'datenschutz'} 
          onClose={handleCloseLegalModal} 
          onOpenImpressum={handleOpenImpressum} 
        />
      </Suspense>
    )
  }

  // Check Trial Expiry
  if (tenantInfo && tenantInfo.trial_ends_at && tenantInfo.status === 'trial') {
    const trialEnd = new Date(tenantInfo.trial_ends_at)
    if (new Date() > trialEnd) {
      return (
        <Suspense fallback={<ViewLoader />}>
          <PaywallScreen tenant={tenantInfo} />
        </Suspense>
      )
    }
  }

  const ActiveComponent = views[activeView]

  // Route Guard für Treuhänder
  const treuhandAllowedViews = ['kunden', 'rechnungen', 'buchhaltung', 'dateien']
  if (userRole === 'treuhand' && !treuhandAllowedViews.includes(activeView)) {
    return (
      <div className="flex h-[100dvh] w-full bg-surface overflow-hidden print:h-auto print:overflow-visible">
        <div className="print:hidden shrink-0 h-full">
          <Sidebar activeView={activeView} onNavigate={(view) => handleNavigate(view, null)} userRole={userRole} globalSettings={globalSettings} userName={userName} />
        </div>
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto print:h-auto print:overflow-visible">
          <main className="flex-1 min-w-0 pb-20 md:pb-0 p-5 md:p-8 flex items-center justify-center">
            <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200 text-center max-w-md">
              <h2 className="text-lg font-bold mb-2">Zugriff verweigert</h2>
              <p className="text-sm">Deine Rolle hat keine Berechtigung für diese Ansicht. Bitte navigiere über das Menü zu einer erlaubten Ansicht.</p>
            </div>
          </main>
        </div>
        <div className="print:hidden">
          <MobileTabBar activeView={activeView} onNavigate={(view) => handleNavigate(view, null)} userRole={userRole} />
        </div>
        <UnsavedChangesDialog
          isOpen={unsavedDialogOpen}
          onConfirm={handleConfirmDiscard}
          onCancel={handleCancelDiscard}
        />
      </div>
    )
  }

  return (
    <div className="flex h-[100dvh] w-full bg-surface overflow-hidden print:h-auto print:overflow-visible">
      {/* Sidebar - hidden during print */}
      <div className="print:hidden shrink-0 h-full">
        <Sidebar activeView={activeView} onNavigate={(view) => handleNavigate(view, null)} userRole={userRole} globalSettings={globalSettings} userName={userName} />
      </div>

      {/* Main content scrollable column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto overflow-x-hidden print:h-auto print:overflow-visible">
        
        {/* Baustellen-Offline-Banner (Keller/Rohbau ohne Mobilfunkempfang) */}
        {isOffline && (
          <div className="bg-amber-900 text-amber-100 text-xs px-4 py-2 flex items-center justify-center gap-2 border-b border-amber-800 backdrop-blur-xs sticky top-0 z-30 animate-fade-in print:hidden shadow-md">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="font-bold">📡 Offline-Modus aktiv:</span>
            <span>Änderungen und Rapporte werden lokal im Browser gesichert & bei Empfang synchronisiert.</span>
          </div>
        )}

        {/* Top bar - hidden during print */}
        <header className="sticky top-0 z-20 bg-surface-card/85 backdrop-blur-md border-b border-border px-4 py-3 md:px-8 md:py-4 print:hidden pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between">
            {/* Logo replacement for header */}
            <div className="flex items-center gap-3 min-w-0">
              {globalSettings?.logo_url ? (
                <img src={globalSettings.logo_url} alt={globalSettings.firmenname || "Logo"} className="h-9 w-auto object-contain drop-shadow-xs md:hidden" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm shadow-xs md:hidden shrink-0">
                  {globalSettings?.firmenname ? globalSettings.firmenname.substring(0,2).toUpperCase() : 'CRM'}
                </div>
              )}
              <h1 className="text-lg md:text-2xl font-bold text-text-primary truncate flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center shrink-0 md:hidden">
                  <IconNav id={activeView} className="w-4 h-4 text-amber-800" />
                </span>
                <span>{viewTitles[activeView]}</span>
              </h1>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              {/* 2026 Spotlight Search Trigger */}
              <button 
                type="button"
                onClick={() => setIsCommandBarOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs text-text-muted hover:border-zinc-300 hover:text-text-secondary transition-all cursor-pointer shadow-2xs"
                title="Spotlight Suche öffnen (⌘K)"
              >
                <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="font-medium text-text-secondary">Suchen...</span>
                <span className="kbd-badge text-[10px]">⌘K</span>
              </button>

              {userRole === 'treuhand' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  Treuhand
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 text-text-secondary text-xs font-semibold rounded-full border border-neutral-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {globalSettings?.firmenname || 'Kinetic Craft'}
                </span>
              )}
              <button 
                onClick={handleLogout}
                className="md:hidden px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer min-h-[36px] flex items-center"
              >
                Abmelden
              </button>
            </div>
          </div>
        </header>

        {/* Main View Area */}
        <main className="flex-1 min-w-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8 print:m-0 print:p-0">
          <div className="p-4 sm:p-6 md:p-8 w-full max-w-[1600px] mx-auto min-h-full print:p-0 print:m-0 print:max-w-none">
            {!tenantInfo && session?.user?.id !== 'test' && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3.5 text-amber-900 shadow-sm animate-fade-in print:hidden">
                <IconWarning className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-bold text-amber-950 mb-0.5">Kein Mandant (Tenant) zugewiesen</p>
                  <p className="text-amber-800 text-xs leading-relaxed">
                    Deinem Benutzerkonto ist in der Datenbank noch kein Mandant zugeordnet. Dadurch blockiert Supabase (RLS) das Speichern neuer Datensätze. Führe das Skript <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold text-amber-900">supabase_fix_user_roles.sql</code> im Supabase SQL Editor aus oder lade die Seite neu.
                  </p>
                </div>
              </div>
            )}
            <Suspense fallback={<ViewLoader />}>
              <ActiveComponent 
                onNavigate={handleNavigate} 
                viewParams={viewParams} 
                userRole={userRole} 
                globalSettings={globalSettings} 
                refreshGlobalSettings={refreshGlobalSettings} 
                userName={userName}
                onUserNameChange={(newName) => setUserName(newName)}
              />
            </Suspense>
          </div>
        </main>
      </div>
      {/* Global Live-Timer Widget for Craftsmen & Site Workers */}
      <GlobalTimerWidget
        userName={userName}
        currentProjectId={viewParams?.projektId || null}
      />

      {/* Mobile Bottom Navigation */}
      <div className="print:hidden">
        <MobileTabBar activeView={activeView} onNavigate={(view, params) => handleNavigate(view, params)} userRole={userRole} />
      </div>

      {/* Unsaved Changes Confirmation Dialog */}
      <UnsavedChangesDialog
        isOpen={unsavedDialogOpen}
        onConfirm={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
      />

      {/* Swiss Legal Modals (Hash #impressum / #datenschutz) */}
      <ImpressumModal 
        isOpen={legalModal === 'impressum'} 
        onClose={handleCloseLegalModal} 
        onOpenDatenschutz={handleOpenDatenschutz} 
      />
      <DatenschutzModal 
        isOpen={legalModal === 'datenschutz'} 
        onClose={handleCloseLegalModal} 
        onOpenImpressum={handleOpenImpressum} 
      />
      {/* 2026 Spotlight Command Bar */}
      <CommandBar 
        isOpen={isCommandBarOpen} 
        onClose={() => setIsCommandBarOpen(false)} 
        onNavigate={handleNavigate} 
      />
    </div>
  )
}
