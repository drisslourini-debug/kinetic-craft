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
      className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 max-w-md w-[calc(100%-2rem)] p-5 apple-glass-stage text-[#F5F5F7] rounded-[24px] transition-all animate-fade-in-up"
    >
      <div className="flex flex-col gap-3.5 text-xs">
        <div className="flex items-start gap-3">
          <IconSwissFlag className="w-4 h-4 rounded shadow-xs shrink-0 mt-0.5" />
          <p className="text-[#A1A1A6] leading-relaxed">
            <strong className="text-white font-semibold">Schweizer Datenschutz (DSG):</strong> Wir respektieren Ihre Privatsphäre. Kinetic Craft ist zu 100% werbefrei und setzt keine Drittanbieter-Marketing-Tracker ein. Wir nutzen ausschliesslich technisch notwendige Sitzungsspeicherungen.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
          <button
            onClick={onOpenDatenschutz}
            className="text-[#E8D3B5] hover:text-white underline font-medium px-2 py-1 cursor-pointer transition-colors"
          >
            Details (DSE)
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-1.5 rounded-full apple-starlight-btn font-semibold transition-all cursor-pointer"
          >
            Einverstanden
          </button>
        </div>
      </div>
    </aside>
  )
}
