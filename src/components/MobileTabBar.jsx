import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function MobileTabBar({ activeView, onNavigate, userRole }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  let currentMainTabs = [
    { id: 'dashboard', label: 'Home', icon: '📊' },
    { id: 'kunden', label: 'Kunden', icon: '👥' },
    { id: 'projekte', label: 'Projekte', icon: '🏗️' },
    { id: 'offerten', label: 'Offerten', icon: '📄' },
  ];

  let currentMenuItems = [
    { id: 'kalender', label: 'Kalender', icon: '📅' },
    { id: 'rechnungen', label: 'Rechnungen', icon: '💰' },
    { id: 'buchhaltung', label: 'Buchhaltung', icon: '📉' },
    { id: 'dateien', label: 'Archiv', icon: '📁' },
    { id: 'katalog', label: 'Katalog', icon: '🏷️' },
    { id: 'einstellungen', label: 'Einstellungen', icon: '⚙️' },
  ];

  if (userRole === 'treuhand') {
    currentMainTabs = [
      { id: 'buchhaltung', label: 'Buchhaltung', icon: '📉' },
      { id: 'kunden', label: 'Kunden', icon: '👥' },
      { id: 'rechnungen', label: 'Rechnungen', icon: '🧾' },
    ];
    currentMenuItems = [
      { id: 'dateien', label: 'Archiv', icon: '📁' },
    ];
  }

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const handleTabClick = (id) => {
    onNavigate(id);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Mobile More Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setIsMenuOpen(false)}>
          <div 
            className="absolute bottom-[80px] left-4 right-4 bg-surface-card rounded-3xl shadow-xl overflow-hidden border border-border pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 bg-surface border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-text-primary">Mehr</h3>
              <button onClick={() => setIsMenuOpen(false)} className="text-text-secondary min-h-[48px] w-12 flex items-center justify-center rounded-lg hover:bg-surface-card transition-colors cursor-pointer">
                ✕
              </button>
            </div>
            <div className="p-2">
              {currentMenuItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl text-left transition-colors cursor-pointer ${
                    activeView === item.id ? 'bg-primary-50 text-primary-700' : 'text-text-primary hover:bg-surface'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium text-base">{item.label}</span>
                </button>
              ))}
              <div className="h-px bg-border my-2 mx-4" />
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setShowLogoutModal(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-4 rounded-xl text-left text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <span className="text-xl">🚪</span>
                <span className="font-medium text-base">Abmelden</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-surface-card/90 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {currentMainTabs.map(tab => {
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className="flex flex-col items-center justify-center w-16 h-12 cursor-pointer relative"
              >
                <span className={`text-xl transition-transform duration-200 ${isActive ? 'scale-110 mb-0.5' : 'scale-100 opacity-70 mb-1'}`}>
                  {tab.icon}
                </span>
                <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-primary-600' : 'text-text-secondary'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary-600 rounded-full" />
                )}
              </button>
            );
          })}

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex flex-col items-center justify-center w-16 h-12 cursor-pointer relative"
          >
            <span className={`text-xl transition-transform duration-200 ${isMenuOpen ? 'scale-110 mb-0.5' : 'scale-100 opacity-70 mb-1'}`}>
              ☰
            </span>
            <span className={`text-[10px] font-medium transition-colors ${isMenuOpen ? 'text-primary-600' : 'text-text-secondary'}`}>
              Menü
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in md:hidden">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 animate-scale-in">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
  );
}
