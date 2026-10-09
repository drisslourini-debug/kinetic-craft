import React, { useState, useEffect } from 'react'
import { IconSwissFlag } from '../icons/BrandIcons'

export default function DsgBanner({ onOpenDatenschutz }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('kinetic_dsg_banner_dismissed')
      if (!dismissed) {
        setIsVisible(true)
      }
    } catch {
      // In case of private browsing or localStorage blocked
      setIsVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    try {
      localStorage.setItem('kinetic_dsg_banner_dismissed', 'true')
    } catch {
      // ignore
    }
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <aside 
      aria-label="Datenschutz-Hinweis"
      className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 max-w-md w-[calc(100%-2rem)] p-4 sm:p-5 bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-2xl shadow-2xl transition-all animate-fade-in"
    >
      <div className="flex flex-col gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <IconSwissFlag className="w-4 h-4 rounded shadow-xs shrink-0 mt-0.5" />
          <p className="text-slate-300 leading-relaxed">
            <strong className="text-white font-semibold">Schweizer Datenschutz (DSG):</strong> Wir respektieren Ihre Privatsphäre. Kinetic Craft ist zu 100% werbefrei und setzt keine Drittanbieter-Marketing-Tracker ein. Wir nutzen ausschliesslich technisch notwendige Sitzungsspeicherungen.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 pt-1 border-t border-slate-800/80">
          <button
            onClick={onOpenDatenschutz}
            className="text-amber-300 hover:text-amber-200 underline font-medium px-2 py-1 cursor-pointer transition-colors"
          >
            Details (DSE)
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 active:bg-amber-800 text-white font-semibold transition-all shadow-sm cursor-pointer"
          >
            Einverstanden
          </button>
        </div>
      </div>
    </aside>
  )
}
