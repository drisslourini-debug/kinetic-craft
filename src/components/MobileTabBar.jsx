import { useState } from 'react';
import { supabase } from '../lib/supabase';

const mainTabs = [
  { id: 'dashboard', label: 'Home', icon: '📊' },
  { id: 'kunden', label: 'Kunden', icon: '👥' },
  { id: 'projekte', label: 'Projekte', icon: '🏗️' },
  { id: 'offerten', label: 'Offerten', icon: '📄' },
];

const menuItems = [
  { id: 'rechnungen', label: 'Rechnungen', icon: '💰' },
  { id: 'buchhaltung', label: 'Buchhaltung', icon: '📉' },
  { id: 'katalog', label: 'Katalog', icon: '🏷️' },
  { id: 'einstellungen', label: 'Einstellungen', icon: '⚙️' },
];

export default function MobileTabBar({ activeView, onNavigate }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    if (window.confirm('Möchtest du dich wirklich abmelden?')) {
      await supabase.auth.signOut();
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
              <button onClick={() => setIsMenuOpen(false)} className="text-text-secondary p-1">
                ✕
              </button>
            </div>
            <div className="p-2">
              {menuItems.map(item => (
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
                onClick={handleLogout}
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
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface-card/90 backdrop-blur-md border-t border-border md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.05)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around px-2 pt-2 pb-1">
          {mainTabs.map(tab => {
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
      </div>
    </>
  );
}
