import { useState } from 'react';
import { supabase } from '../lib/supabase';
import BottomSheet from './ui/BottomSheet';

export default function MobileTabBar({ activeView, onNavigate, userRole }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  let currentMainTabs = [
    { id: 'dashboard', label: 'Home', icon: '📊' },
    { id: 'kalender', label: 'Kalender', icon: '📅' },
    { id: 'projekte', label: 'Projekte', icon: '🏗️' },
    { id: 'kunden', label: 'Kunden', icon: '👥' },
  ];

  let currentMenuItems = [
    { id: 'offerten', label: 'Offerten', icon: '📄', desc: 'Angebote & Kalkulationen' },
    { id: 'rechnungen', label: 'Rechnungen', icon: '💰', desc: 'Fakturierung & QR-Rechnung' },
    { id: 'buchhaltung', label: 'Buchhaltung', icon: '📉', desc: 'Einnahmen, Ausgaben & MWST' },
    { id: 'dateien', label: 'Dateien & Pläne', icon: '📁', desc: 'Baudokumentation & Uploads' },
    { id: 'katalog', label: 'Leistungskatalog', icon: '🏷️', desc: 'Preise & Positionen' },
    { id: 'einstellungen', label: 'Einstellungen', icon: '⚙️', desc: 'Firma, Bank & Layout' },
  ];

  if (userRole === 'monteur') {
    currentMainTabs = [
      { id: 'kalender', label: 'Kalender', icon: '📅' },
      { id: 'projekte', label: 'Projekte', icon: '🏗️' },
      { id: 'dateien', label: 'Fotos & Pläne', icon: '📷' },
      { id: 'kunden', label: 'Kunden', icon: '👥' },
    ];
    currentMenuItems = [
      { id: 'dashboard', label: 'Home', icon: '📊', desc: 'Übersicht' },
      { id: 'katalog', label: 'Katalog', icon: '🏷️', desc: 'Material & Arbeit' },
      { id: 'einstellungen', label: 'Mein Profil', icon: '⚙️', desc: 'Benutzerkonto' },
    ];
  } else if (userRole === 'treuhand') {
    currentMainTabs = [
      { id: 'buchhaltung', label: 'Buchhaltung', icon: '📉' },
      { id: 'kunden', label: 'Kunden', icon: '👥' },
      { id: 'rechnungen', label: 'Rechnungen', icon: '🧾' },
    ];
    currentMenuItems = [
      { id: 'dateien', label: 'Archiv', icon: '📁', desc: 'Export & Belege' },
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

  const handleTabClick = (id, params = null) => {
    onNavigate(id, params);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Native Bottom Sheet für sekundäre Module & Quick-Actions */}
      <BottomSheet
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        title="Menü & Aktionen"
        subtitle="Schnellzugriff auf alle Bereiche"
      >
        {/* Quick Action Buttons */}
        {userRole !== 'treuhand' && (
          <div className="mb-3">
            <h4 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2">Schnellaktionen</h4>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleTabClick('kunden', { action: 'create' })}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-primary-50 border border-primary-200/70 text-primary-900 active:scale-95 transition-all text-left min-h-[48px] touch-action-manipulation cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-primary-500 text-white flex items-center justify-center text-sm font-bold shadow-xs shrink-0">
                  +
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold block truncate">Neuer Kunde</span>
                  <span className="text-[10px] text-primary-700 block truncate">Stammdaten</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('projekte', { action: 'create' })}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-emerald-900 active:scale-95 transition-all text-left min-h-[48px] touch-action-manipulation cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shadow-xs shrink-0">
                  +
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold block truncate">Neues Projekt</span>
                  <span className="text-[10px] text-emerald-700 block truncate">Auftrag anlegen</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Sekundäre Module */}
        <div>
          <h4 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2">Module</h4>
          <div className="space-y-1.5">
            {currentMenuItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left transition-all active:scale-[0.98] min-h-[52px] touch-action-manipulation cursor-pointer ${
                    isActive ? 'bg-primary-500 text-white font-semibold shadow-xs' : 'bg-surface hover:bg-neutral-100 text-text-primary border border-border/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">{item.icon}</span>
                    <div className="min-w-0">
                      <span className={`text-sm block truncate ${isActive ? 'text-white font-bold' : 'text-text-primary font-semibold'}`}>
                        {item.label}
                      </span>
                      {item.desc && (
                        <span className={`text-xs block truncate ${isActive ? 'text-white/80' : 'text-text-secondary'}`}>
                          {item.desc}
                        </span>
                      )}
                    </div>
                  </div>
                  <svg className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-text-secondary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>

        {/* Abmelden Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              setShowLogoutModal(true);
            }}
            className="w-full flex items-center justify-center gap-2.5 p-3.5 rounded-2xl text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 font-semibold text-sm transition-all active:scale-[0.98] min-h-[48px] touch-action-manipulation cursor-pointer"
          >
            <span className="text-lg">🚪</span>
            <span>Abmelden</span>
          </button>
        </div>
      </BottomSheet>

      {/* Fixierte Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-surface-card/95 backdrop-blur-lg border-t border-border pb-[env(safe-area-inset-bottom)] md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-around h-16 px-1">
          {currentMainTabs.map((tab) => {
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className="flex-1 flex flex-col items-center justify-center h-full min-h-[48px] touch-action-manipulation relative active:scale-90 transition-transform cursor-pointer"
              >
                <span className={`text-xl transition-all duration-200 ${isActive ? 'scale-115 -translate-y-0.5' : 'opacity-65'}`}>
                  {tab.icon}
                </span>
                <span className={`text-[11px] font-semibold mt-0.5 transition-colors ${isActive ? 'text-primary-600 font-bold' : 'text-text-secondary'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-1 w-5 h-1 bg-primary-600 rounded-full" />
                )}
              </button>
            );
          })}

          {/* Menü Button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center h-full min-h-[48px] touch-action-manipulation relative active:scale-90 transition-transform cursor-pointer"
          >
            <span className={`text-xl transition-all duration-200 ${isMenuOpen ? 'scale-115 text-primary-600' : 'opacity-65'}`}>
              ☰
            </span>
            <span className={`text-[11px] font-semibold mt-0.5 ${isMenuOpen ? 'text-primary-600 font-bold' : 'text-text-secondary'}`}>
              Menü
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs md:hidden animate-fade-in">
          <div className="bg-surface-card rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-border animate-scale-up">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary">Abmelden</h3>
                <p className="text-xs text-text-secondary">Sitzung wirklich beenden?</p>
              </div>
            </div>
            
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              Möchtest du dich wirklich vom Atelier 77 Dashboard abmelden?
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                className="w-full py-3 text-sm font-bold text-text-secondary bg-surface hover:bg-neutral-200/80 rounded-2xl border border-border transition-colors cursor-pointer min-h-[48px]"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
                className="w-full py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 rounded-2xl transition-all shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[48px]"
              >
                {isLoggingOut && (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
