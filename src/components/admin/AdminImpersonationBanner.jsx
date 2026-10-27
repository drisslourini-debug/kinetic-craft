import { useState, useEffect } from 'react'
import { getImpersonationState, exitImpersonation } from '../../services/adminService'
import { pushRoute } from '../../lib/router'

export default function AdminImpersonationBanner({ onExit }) {
  const [impersonation, setImpersonation] = useState(null)

  useEffect(() => {
    const state = getImpersonationState()
    setImpersonation(state)
  }, [])

  if (!impersonation) return null

  const handleReturnToAdmin = () => {
    pushRoute('admin', {})
  }

  const handleEndSession = async () => {
    exitImpersonation()
    setImpersonation(null)
    if (onExit) {
      await onExit()
    } else {
      pushRoute('admin', {})
      window.location.reload()
    }
  }

  return (
    <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white px-4 py-2.5 text-xs sm:text-sm font-medium shadow-md sticky top-0 z-[9999] flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/50">
      <div className="flex items-center gap-2">
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-100"></span>
        </span>
        <span className="font-bold uppercase tracking-wider text-[11px] bg-amber-950/40 px-2 py-0.5 rounded border border-amber-400/30">
          Support-Modus aktiv
        </span>
        <span className="hidden sm:inline text-amber-100">
          Eingeloggt als Mandant:
        </span>
        <strong className="text-white underline decoration-amber-300 underline-offset-2">
          {impersonation.tenantName || 'Mandant'}
        </strong>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleReturnToAdmin}
          className="px-3 py-1 bg-white text-amber-900 hover:bg-amber-50 font-bold rounded-lg shadow-xs transition-colors cursor-pointer text-xs flex items-center gap-1.5"
        >
          <span>Admin-Cockpit</span>
          <span>↗</span>
        </button>
        <button
          type="button"
          onClick={handleEndSession}
          className="px-2.5 py-1 bg-amber-900/60 hover:bg-amber-950 text-amber-100 font-semibold rounded-lg border border-amber-500/40 transition-colors cursor-pointer text-xs"
        >
          Beenden ✕
        </button>
      </div>
    </div>
  )
}
