import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import KineticLogoMark from '../components/KineticLogoMark'
import {
  IconCheck,
} from '../components/icons/BrandIcons'

function mapAuthError(err) {
  if (!err) return null
  const msg = typeof err === 'string' ? err : (err.message || '')
  if (msg.includes('Invalid login credentials')) {
    return 'E-Mail oder Passwort ist nicht korrekt. Bitte prüfen Sie Ihre Eingaben.'
  }
  if (msg.includes('Email not confirmed')) {
    return 'Ihre E-Mail-Adresse wurde noch nicht bestätigt. Bitte prüfen Sie Ihren Posteingang.'
  }
  if (msg.includes('Rate limit') || msg.includes('over_email_send_rate_limit')) {
    return 'Zu viele Versuche in kurzer Zeit. Bitte warten Sie einen Moment vor dem nächsten Versuch.'
  }
  if (msg.includes('User not found')) {
    return 'Kein Benutzer mit dieser E-Mail-Adresse gefunden.'
  }
  return msg || 'Anmeldung fehlgeschlagen. Bitte prüfen Sie Ihre Zugangsdaten.'
}

export default function LoginView({ 
  onLoginSuccess, 
  onGoToRegistration, 
  onBackToLanding,
  onOpenImpressum,
  onOpenDatenschutz
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Password Reset Modal State
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [resetError, setResetError] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const cleanEmail = email.trim().toLowerCase()

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (error) throw error
      if (data.session) {
        onLoginSuccess(data.session)
      }
    } catch (err) {
      setError(mapAuthError(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordReset = async (e) => {
    e.preventDefault()
    const cleanEmail = resetEmail.trim().toLowerCase()
    if (!cleanEmail) {
      setResetError('Bitte geben Sie Ihre E-Mail-Adresse ein.')
      return
    }

    setResetLoading(true)
    setResetError(null)
    setResetSuccess(false)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/`,
      })
      if (error) throw error
      setResetSuccess(true)
    } catch (err) {
      setResetError(mapAuthError(err))
    } finally {
      setResetLoading(false)
    }
  }

  const openResetModal = () => {
    setResetEmail(email.trim())
    setResetError(null)
    setResetSuccess(false)
    setShowResetModal(true)
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#0b0b0e] apple-pro-canvas text-[#F5F5F7] font-sans flex flex-col justify-between selection:bg-[#D6BA94]/30 selection:text-white pb-10 relative">
      {/* Precision Grid Background Layer */}
      <div className="pointer-events-none absolute inset-0 apple-precision-grid opacity-60" />

      {/* FLOATING GLASS HEADER (Aligned with Landing Page Base Design) */}
      <header className="sticky top-0 z-40 pt-3 pb-2 px-3 sm:px-6 lg:px-8 relative">
        <div className="max-w-5xl mx-auto">
          <div className="apple-glass-pill rounded-full px-4 sm:px-6 h-15 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <KineticLogoMark className="w-8 h-8 text-white shrink-0" />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm sm:text-base tracking-[-0.02em] text-white">Kinetic</span>
                  <span className="font-semibold text-sm sm:text-base tracking-[-0.02em] text-[#D6BA94]">Craft</span>
                  <span className="text-[10px] font-medium tracking-wide px-2 py-0.5 rounded-full bg-white/[0.08] text-[#E8D3B5] border border-white/10 hidden sm:inline">
                    Schweiz
                  </span>
                </div>
                <span className="text-[10px] font-normal text-neutral-400 -mt-0.5 hidden xs:inline">
                  by Kinetic Schweiz
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {onBackToLanding && (
                <button
                  type="button"
                  onClick={onBackToLanding}
                  className="px-3 sm:px-4 py-1.5 text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/[0.08] rounded-full transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>←</span>
                  <span className="hidden sm:inline">Zurück zur Website</span>
                  <span className="sm:hidden">Website</span>
                </button>
              )}
              {onGoToRegistration && (
                <button
                  type="button"
                  onClick={onGoToRegistration}
                  className="px-3.5 sm:px-4 py-1.5 text-xs font-medium text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 rounded-full transition-all cursor-pointer"
                >
                  14 Tage testen
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* CENTERED LOGIN STAGE */}
      <main className="max-w-[460px] w-full mx-auto px-4 sm:px-6 my-auto pt-6 pb-6 relative z-10">
        <div className="bg-[#121216] apple-glass-stage rounded-3xl border border-white/12 p-7 sm:p-9 shadow-2xl relative">
          
          <div className="text-center sm:text-left mb-7">
            <div className="flex items-center gap-2 mb-2 justify-center sm:justify-start">
              <span className="text-[11px] font-medium tracking-wide px-2.5 py-0.5 rounded-full bg-white/[0.08] text-[#E8D3B5] border border-white/10">
                <span>Kinetic Craft CRM</span>
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">
              Willkommen zurück
            </h1>
            <p className="mt-1.5 text-sm text-neutral-400 leading-relaxed">
              Melden Sie sich an, um auf Ihre Offerten, Rechnungen und Projekte zuzugreifen.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Geschäftliche E-Mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#181820] border border-white/15 rounded-xl text-sm text-white placeholder:text-neutral-500 focus:bg-[#1e1e28] focus:border-[#D6BA94] focus:ring-1 focus:ring-[#D6BA94]/30 focus:outline-none transition-all"
                  placeholder="beat@firma.ch"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Passwort
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-[#181820] border border-white/15 rounded-xl text-sm text-white placeholder:text-neutral-500 focus:bg-[#1e1e28] focus:border-[#D6BA94] focus:ring-1 focus:ring-[#D6BA94]/30 focus:outline-none transition-all font-mono"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded bg-[#181820] border-white/20 text-[#D6BA94] focus:ring-0 cursor-pointer"
                />
                <span className="ml-2 text-xs font-normal text-neutral-300">
                  Angemeldet bleiben
                </span>
              </label>

              <button
                type="button"
                onClick={openResetModal}
                className="text-xs font-medium text-[#D6BA94] hover:text-[#e8d3b5] hover:underline transition-colors cursor-pointer"
              >
                Passwort vergessen?
              </button>
            </div>

            {error && (
              <div className="text-xs text-red-300 bg-red-950/40 p-3 rounded-xl border border-red-500/30 flex items-start gap-2 animate-fade-in">
                <span className="font-bold text-red-400">!</span>
                <p className="leading-snug">{error}</p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="apple-titanium-btn w-full min-h-[46px] flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-[#0B0B0E] cursor-pointer shadow-lg active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-wait"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-[#0B0B0E]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Wird angemeldet...</span>
                  </>
                ) : (
                  <span>Anmelden</span>
                )}
              </button>
            </div>
          </form>

          {/* Trust points inside card */}
          <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 gap-2 text-[11px] text-neutral-400">
            <div className="flex items-center gap-1.5">
              <IconCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Schweizer DSG & GeBüV</span>
            </div>
            <div className="flex items-center gap-1.5">
              <IconCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>256-Bit SSL Verschlüsselt</span>
            </div>
          </div>
        </div>

        {/* Footer info & switch to registration */}
        <div className="mt-6 text-center space-y-2.5">
          <p className="text-sm text-neutral-400">
            Noch keinen Betrieb registriert?{' '}
            <button 
              type="button"
              onClick={onGoToRegistration} 
              className="text-[#D6BA94] hover:text-[#e8d3b5] font-semibold transition-colors cursor-pointer hover:underline"
            >
              Jetzt 14 Tage kostenlos testen
            </button>
          </p>
          <div className="flex items-center justify-center gap-3 text-xs text-neutral-400/80 pt-1">
            <button 
              type="button" 
              onClick={onOpenDatenschutz}
              className="hover:text-white underline cursor-pointer"
            >
              Datenschutz (DSG)
            </button>
            <span>•</span>
            <button 
              type="button" 
              onClick={onOpenImpressum}
              className="hover:text-white underline cursor-pointer"
            >
              Impressum
            </button>
          </div>
        </div>
      </main>

      {/* Password Reset Modal in Space Black Titanium Glass Style */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121216] apple-glass-stage rounded-3xl border border-white/15 max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-[#F5F5F7]">
            <button
              onClick={() => setShowResetModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Schliessen"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-white/[0.06] border border-white/10 text-[#D6BA94] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white">Passwort zurücksetzen</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Geben Sie Ihre geschäftliche E-Mail-Adresse ein. Wir senden Ihnen einen sicheren Schweizer Reset-Link.
              </p>
            </div>

            {resetSuccess ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-950/40 text-emerald-300 rounded-xl border border-emerald-500/30 text-xs">
                  <p className="font-semibold mb-1">E-Mail wurde versendet!</p>
                  <p>Bitte prüfen Sie Ihren Posteingang und klicken Sie auf den Link in der E-Mail.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="apple-titanium-btn w-full py-3 text-[#0B0B0E] font-semibold rounded-xl shadow-lg transition-colors cursor-pointer text-xs"
                >
                  Zurück zur Anmeldung
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Geschäftliche E-Mail
                  </label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="beat@firma.ch"
                    className="w-full px-3.5 py-2.5 bg-[#181820] border border-white/15 rounded-xl text-white text-sm placeholder:text-neutral-500 focus:bg-[#1e1e28] focus:border-[#D6BA94] focus:outline-none"
                  />
                </div>

                {resetError && (
                  <div className="text-xs text-red-300 bg-red-950/40 p-3 rounded-xl border border-red-500/30 text-left">
                    {resetError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    disabled={resetLoading}
                    className="w-1/2 py-2.5 bg-white/[0.06] hover:bg-white/10 text-white font-medium rounded-xl border border-white/10 transition-colors cursor-pointer text-xs"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="apple-titanium-btn w-1/2 py-2.5 text-[#0B0B0E] font-semibold rounded-xl shadow-lg transition-colors flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 text-xs"
                  >
                    {resetLoading ? 'Senden...' : 'Link senden'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
