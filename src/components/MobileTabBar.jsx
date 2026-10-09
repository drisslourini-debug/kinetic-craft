import { useState } from 'react';
import { supabase } from '../lib/supabase';
import BottomSheet from './ui/BottomSheet';
import { IconNav } from './icons/BrandIcons';

export default function MobileTabBar({ activeView, onNavigate, userRole }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Left 2 tabs and Right 1 tab + Menu button
  let leftTabs = [
    { id: 'dashboard', label: 'Home' },
    { id: 'kalender', label: 'Kalender' },
  ];
  let rightTabs = [
    { id: 'projekte', label: 'Projekte' },
  ];

  let currentMenuItems = [
    { id: 'kunden', label: 'Kunden', desc: 'Stammdaten & Adressen' },
    { id: 'offerten', label: 'Offerten', desc: 'Angebote & Kalkulationen' },
    { id: 'rechnungen', label: 'Rechnungen', desc: 'Fakturierung & QR-Rechnung' },
    { id: 'buchhaltung', label: 'Buchhaltung', desc: 'Einnahmen, Ausgaben & MWST' },
    { id: 'dateien', label: 'Dateien & Pläne', desc: 'Baudokumentation & Uploads' },
    { id: 'katalog', label: 'Leistungskatalog', desc: 'Preise & Positionen' },
    { id: 'einstellungen', label: 'Einstellungen', desc: 'Firma, Bank & Layout' },
  ];

  if (userRole === 'monteur') {
    leftTabs = [
      { id: 'kalender', label: 'Kalender' },
      { id: 'projekte', label: 'Projekte' },
    ];
    rightTabs = [
      { id: 'dateien', label: 'Fotos & Pläne' },
    ];
    currentMenuItems = [
      { id: 'dashboard', label: 'Home', desc: 'Übersicht' },
      { id: 'kunden', label: 'Kunden', desc: 'Kontaktdaten' },
      { id: 'katalog', label: 'Katalog', desc: 'Material & Arbeit' },
      { id: 'einstellungen', label: 'Mein Profil', desc: 'Benutzerkonto' },
    ];
  } else if (userRole === 'treuhand') {
    leftTabs = [
      { id: 'buchhaltung', label: 'Buchhaltung' },
      { id: 'rechnungen', label: 'Rechnungen' },
    ];
    rightTabs = [
      { id: 'kunden', label: 'Kunden' },
    ];
    currentMenuItems = [
      { id: 'dateien', label: 'Archiv', desc: 'Export & Belege' },
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
    setIsQuickActionsOpen(false);
  };

  return (
    <>
      {/* 1. NATIVE BOTTOM SHEET FÜR BAUSTELLEN-SCHNELLAKTIONEN (Zentraler Button) */}
      <BottomSheet
        isOpen={isQuickActionsOpen}
        onClose={() => setIsQuickActionsOpen(false)}
        title="⚡ Baustellen-Schnellaktionen"
        subtitle="Direktzugriff für Handwerker & Montage"
      >
        <div className="space-y-2.5 pb-2">
          {/* 1. Stempeluhr starten */}
          <button
            type="button"
            onClick={() => {
              setIsQuickActionsOpen(false);
              window.dispatchEvent(new CustomEvent('a77-open-timer-start'));
            }}
            className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-left active:scale-[0.98] transition-all min-h-[56px] touch-action-manipulation cursor-pointer hover:bg-amber-100/60"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-600 text-white flex items-center justify-center text-xl shrink-0 shadow-xs">
              ⏱️
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-bold text-slate-900 block truncate">Stempeluhr starten</span>
              <span className="text-xs text-amber-900 block truncate">Arbeitszeit für Baustelle erfassen</span>
            </div>
            <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">Live</span>
          </button>

          {/* 2. Neuer Tagesrapport */}
          <button
            type="button"
            onClick={() => handleTabClick('projekte', { action: 'create_rapport' })}
            className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-left active:scale-[0.98] transition-all min-h-[56px] touch-action-manipulation cursor-pointer hover:bg-emerald-100/60"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl shrink-0 shadow-xs">
              📝
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-bold text-slate-900 block truncate">Neuer Regierapport</span>
              <span className="text-xs text-emerald-900 block truncate">Stunden, Material & Kundenunterschrift</span>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">Sign</span>
          </button>

          {/* 3. Beleg mit Gemini KI scannen */}
          <button
            type="button"
            onClick={() => handleTabClick('buchhaltung', { action: 'scan_beleg' })}
            className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/80 text-left active:scale-[0.98] transition-all min-h-[56px] touch-action-manipulation cursor-pointer hover:bg-sky-100/60"
          >
            <div className="w-11 h-11 rounded-xl bg-sky-600 text-white flex items-center justify-center text-xl shrink-0 shadow-xs">
              📸
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-bold text-slate-900 block truncate">Beleg mit Gemini KI scannen</span>
              <span className="text-xs text-sky-900 block truncate">Quittung fotografieren & automatische OCR</span>
            </div>
            <span className="text-xs font-semibold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">KI</span>
          </button>

          {/* 4. Neue Offerte & Neue Rechnung */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleTabClick('offerten', { action: 'create' })}
              className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-slate-200 text-left active:scale-[0.98] transition-all min-h-[50px] touch-action-manipulation cursor-pointer hover:border-amber-300"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold shrink-0 text-sm">
                📄
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 block truncate">Neue Offerte</span>
                <span className="text-[10px] text-slate-500 block truncate">Kalkulieren</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('rechnungen', { action: 'create' })}
              className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-slate-200 text-left active:scale-[0.98] transition-all min-h-[50px] touch-action-manipulation cursor-pointer hover:border-amber-300"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold shrink-0 text-sm">
                🧾
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 block truncate">Neue Rechnung</span>
                <span className="text-[10px] text-slate-500 block truncate">Swiss QR-Bill</span>
              </div>
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* 2. NATIVE BOTTOM SHEET FÜR SEKUNDÄRE MODULE & WEITERE AKTIONEN */}
      <BottomSheet
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        title="Menü & Module"
        subtitle="Vollständige Übersicht aller Bereiche"
      >
        {/* Quick Action Buttons */}
        {userRole !== 'treuhand' && (
          <div className="mb-3">
            <h4 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2">Stammdaten Schnellzugriff</h4>
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
          <h4 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2">Alle Module</h4>
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
                    <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center shrink-0">
                      <IconNav id={item.id} className="w-5 h-5 text-amber-800" />
                    </div>
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
            <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Abmelden</span>
          </button>
        </div>
      </BottomSheet>

      {/* 3. FIXIERTE BOTTOM NAVIGATION BAR MIT ZENTRIERTEM SCHNELLAKTIONS-BUTTON */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-surface-card/95 backdrop-blur-lg border-t border-border pb-[env(safe-area-inset-bottom)] md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between h-16 px-1 max-w-md mx-auto">
          {/* Left Tabs */}
          {leftTabs.map((tab) => {
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className="flex-1 flex flex-col items-center justify-center h-full min-h-[48px] touch-action-manipulation relative active:scale-90 transition-transform cursor-pointer"
              >
                <span className={`transition-all duration-200 ${isActive ? 'scale-110 -translate-y-0.5' : 'opacity-70'}`}>
                  <IconNav id={tab.id} className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-slate-600'}`} />
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

          {/* Central Elevated Quick-Action Button (+) */}
          {userRole !== 'treuhand' && (
            <div className="flex-1 flex flex-col items-center justify-center relative">
              <button
                type="button"
                onClick={() => setIsQuickActionsOpen(true)}
                aria-label="Baustellen-Schnellaktionen öffnen"
                className="w-12 h-12 -mt-5 rounded-full bg-gradient-to-tr from-amber-600 via-amber-700 to-yellow-600 text-white shadow-lg shadow-amber-900/30 flex items-center justify-center text-2xl font-bold active:scale-95 hover:scale-105 transition-all cursor-pointer ring-4 ring-white"
              >
                <span className="leading-none pb-0.5">+</span>
              </button>
              <span className="text-[10px] font-bold text-amber-800 mt-1">Aktion</span>
            </div>
          )}

          {/* Right Tabs */}
          {rightTabs.map((tab) => {
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className="flex-1 flex flex-col items-center justify-center h-full min-h-[48px] touch-action-manipulation relative active:scale-90 transition-transform cursor-pointer"
              >
                <span className={`transition-all duration-200 ${isActive ? 'scale-110 -translate-y-0.5' : 'opacity-70'}`}>
                  <IconNav id={tab.id} className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-slate-600'}`} />
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
            <svg className={`w-5 h-5 transition-all duration-200 ${isMenuOpen ? 'scale-110 text-primary-600' : 'text-slate-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
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
              Möchtest du dich wirklich vom Dashboard abmelden?
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
