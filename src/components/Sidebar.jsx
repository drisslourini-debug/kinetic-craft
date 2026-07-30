import { useState } from 'react'
import { supabase } from '../lib/supabase'
import logoImg from '../assets/logo.png'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'kunden', label: 'Kunden', icon: '👥' },
  { id: 'projekte', label: 'Projekte', icon: '🏗️' },
  { id: 'offerten', label: 'Offerten', icon: '📄' },
  { id: 'rechnungen', label: 'Rechnungen', icon: '🧾' },
  { id: 'buchhaltung', label: 'Buchhaltung', icon: '📉' },
  { id: 'dateien', label: 'Archiv', icon: '📁' },
  { id: 'katalog', label: 'Katalog', icon: '🏷️' },
  { id: 'einstellungen', label: 'Einstellungen', icon: '⚙️' },
]

export default function Sidebar({ activeView, onNavigate }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    if (window.confirm('Möchtest du dich wirklich abmelden?')) {
      await supabase.auth.signOut()
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
          <img src={logoImg} alt="Atelier 77 Logo" className="w-32 h-auto object-contain brightness-0 invert opacity-90 drop-shadow-md" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id)
                  setMobileOpen(false)
                }}
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
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white text-xs font-bold">
                LB
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">Leandro B.</p>
                <p className="text-text-sidebar text-xs opacity-50">Admin</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
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
    </>
  )
}
