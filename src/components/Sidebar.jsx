import { useState } from 'react'
import { supabase } from '../lib/supabase'
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'kunden', label: 'Kunden', icon: '👥' },
  { id: 'projekte', label: 'Projekte', icon: '🏗️' },
  { id: 'kalender', label: 'Kalender', icon: '📅' },
  { id: 'offerten', label: 'Offerten', icon: '📄' },
  { id: 'rechnungen', label: 'Rechnungen', icon: '🧾' },
  { id: 'buchhaltung', label: 'Buchhaltung', icon: '📉' },
  { id: 'dateien', label: 'Archiv', icon: '📁' },
  { id: 'katalog', label: 'Katalog', icon: '🏷️' },
  { id: 'einstellungen', label: 'Einstellungen', icon: '⚙️' },
]

export default function Sidebar({ activeView, onNavigate, userRole, globalSettings, userName }) {
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const filteredNavItems = navItems.filter(item => {
    if (userRole === 'treuhand') {
      return !['dashboard', 'projekte', 'kalender', 'offerten', 'katalog', 'einstellungen'].includes(item.id)
    }
    return true
  })

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true)
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setIsLoggingOut(false)
      setShowLogoutModal(false)
    }
  }

  return (
    <>

      {/* Sidebar */}
      <aside
        className={`
          hidden md:flex
          fixed top-0 left-0 z-40 h-screen w-64 bg-sidebar flex-col
          md:sticky md:top-0
        `}
      >
        {/* Brand */}
        <div className="flex flex-col items-center justify-center px-6 py-8 border-b border-white/10">
          {globalSettings?.logo_url ? (
            <img 
              src={globalSettings.logo_url} 
              alt={globalSettings.firmenname || "Logo"} 
              className="w-32 h-auto object-contain brightness-0 invert opacity-90 drop-shadow-md" 
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-2"
            style={{ display: globalSettings?.logo_url ? 'none' : 'flex' }}
          >
            {globalSettings?.firmenname ? globalSettings.firmenname.substring(0,2).toUpperCase() : 'CRM'}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                  transition-all duration-200 cursor-pointer
                  ${isActive
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                    : 'text-text-sidebar hover:bg-sidebar-hover hover:text-white'
                  }
                `}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white text-xs font-bold uppercase">
                {userRole === 'treuhand' ? 'TH' : (userName ? userName.substring(0,2) : 'AD')}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{userRole === 'treuhand' ? 'Treuhand' : (userName || 'Admin')}</p>
                <p className="text-text-sidebar text-xs opacity-50 uppercase">{userRole === 'treuhand' ? 'Zugang' : globalSettings?.firmenname || 'Firma'}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowLogoutModal(true)}
              className="p-2 text-text-sidebar hover:text-white hover:bg-sidebar-hover rounded-lg transition-colors cursor-pointer"
              title="Abmelden"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 animate-scale-in">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Abmelden</h3>
                <p className="text-xs text-gray-500">Möchtest du die Sitzung beenden?</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Möchtest du dich wirklich vom Dashboard abmelden?
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoggingOut && (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isLoggingOut ? 'Wird abgemeldet...' : 'Abmelden'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
