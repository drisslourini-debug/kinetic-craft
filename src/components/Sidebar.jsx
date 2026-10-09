import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { IconNav } from './icons/BrandIcons'
import KineticLogoMark from './KineticLogoMark'

const navItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'kunden', label: 'Kunden' },
  { id: 'projekte', label: 'Projekte' },
  { id: 'kalender', label: 'Kalender' },
  { id: 'offerten', label: 'Offerten' },
  { id: 'rechnungen', label: 'Rechnungen' },
  { id: 'buchhaltung', label: 'Buchhaltung' },
  { id: 'dateien', label: 'Archiv' },
  { id: 'katalog', label: 'Katalog' },
  { id: 'einstellungen', label: 'Einstellungen' },
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
          h-full w-60 lg:w-64 bg-sidebar flex-col shrink-0
          border-r border-white/[0.08] select-none
        `}
      >
        {/* Brand */}
        <div className="px-4 py-5 border-b border-white/[0.07] flex items-center justify-center">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="w-full flex items-center justify-center cursor-pointer group focus:outline-none transition-transform hover:scale-[1.02]"
            title="Zum Dashboard"
          >
            {globalSettings?.logo_url ? (
              <img 
                src={globalSettings.logo_url} 
                alt={globalSettings.firmenname || "Firmenlogo"} 
                className="max-h-12 w-auto max-w-[200px] object-contain drop-shadow-sm transition-opacity group-hover:opacity-95" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className="flex items-center gap-3"
              style={{ display: globalSettings?.logo_url ? 'none' : 'flex' }}
            >
              <KineticLogoMark className="w-9 h-9 text-white shrink-0 group-hover:rotate-3 transition-transform" />
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-extrabold text-base tracking-tight text-white">Kinetic</span>
                  <span className="font-bold text-base tracking-tight text-amber-400">Craft</span>
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-amber-400/15 text-amber-300 border border-amber-400/30">
                    CRM
                  </span>
                </div>
                <span className="text-[10px] font-medium text-white/50 mt-1 tracking-wide">
                  by Kinetic Schweiz
                </span>
              </div>
            </div>
          </button>
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
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium
                  transition-all duration-150 cursor-pointer group text-left
                  ${isActive
                    ? 'bg-white/[0.08] text-white font-semibold border border-white/[0.06] shadow-2xs'
                    : 'text-text-sidebar hover:bg-white/[0.04] hover:text-white'
                  }
                `}
              >
                <span className="shrink-0 transition-transform group-hover:scale-105">
                  <IconNav 
                    id={item.id} 
                    className={`w-4 h-4 transition-colors ${isActive ? 'text-primary-400' : 'text-zinc-400 group-hover:text-zinc-200'}`} 
                  />
                </span>
                <span className="truncate">{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400 shadow-[0_0_8px_rgba(196,161,98,0.6)]" />
                )}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-white/[0.07] bg-white/[0.01]">
          <div className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.03] transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-white text-[11px] font-bold uppercase shrink-0">
                {userRole === 'treuhand' ? 'TH' : (userName ? userName.substring(0,2) : 'AD')}
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate leading-tight">
                  {userRole === 'treuhand' ? 'Treuhand' : (userName || 'Admin')}
                </p>
                <p className="text-text-sidebar/60 text-[10px] uppercase font-mono tracking-wider truncate mt-0.5">
                  {userRole === 'treuhand' ? 'Treuhand-Zugang' : 'Betriebsleitung'}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowLogoutModal(true)}
              className="p-1.5 text-text-sidebar hover:text-rose-400 hover:bg-white/[0.05] rounded-lg transition-colors cursor-pointer shrink-0 ml-1"
              title="Abmelden"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
