import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

function mapAuthError(err) {
  if (!err) return null
  const msg = typeof err === 'string' ? err : (err.message || '')
  if (msg.includes('Invalid login credentials')) {
    return 'E-Mail oder Passwort ist nicht korrekt. Bitte prüfe deine Eingaben.'
  }
  if (msg.includes('Email not confirmed')) {
    return 'Deine E-Mail-Adresse wurde noch nicht bestätigt. Bitte prüfe deinen Posteingang.'
  }
  if (msg.includes('Rate limit') || msg.includes('over_email_send_rate_limit')) {
    return 'Zu viele Versuche in kurzer Zeit. Bitte warte kurz vor dem nächsten Versuch.'
  }
  if (msg.includes('User not found')) {
    return 'Kein Benutzer mit dieser E-Mail-Adresse gefunden.'
  }
  return msg || 'Anmeldung fehlgeschlagen. Bitte prüfe deine Zugangsdaten.'
}

export default function LoginView({ onLoginSuccess, onGoToRegistration, onBackToLanding }) {
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
      setResetError('Bitte gib deine E-Mail-Adresse ein.')
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
    <div className="min-h-screen bg-surface flex">
      {/* LEFT COLUMN: Swiss Quality & Trust (Desktop Only) */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative Atmosphere Glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/20 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-yellow-500/15 rounded-full filter blur-3xl pointer-events-none" />

        {/* Brand & Heading */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/30 border border-white/20">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4v16" />
                <path d="M4 12l9-8" />
                <path d="M4 12l10 8" />
                <circle cx="18" cy="6" r="2" fill="currentColor" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-tight text-xl text-white">Kinetic</span>
                <span className="font-bold tracking-tight text-xl text-amber-400">Craft</span>
              </div>
              <span className="text-xs block text-amber-300/80 font-semibold tracking-wider uppercase">by Kinetic Schweiz</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-white/90 mb-6">
            <span>🇨🇭</span>
            <span>Schweizer Handwerker-Standard</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Präzision & Effizienz für deinen Betrieb.
          </h1>
          <p className="mt-4 text-slate-300 text-sm leading-relaxed max-w-md">
            Melde dich an, um Offerten, Ausmasse, Schweizer QR-Rechnungen und Projekte nahtlos zu verwalten.
          </p>
        </div>

        {/* Swiss Trust Feature Badges */}
        <div className="relative z-10 space-y-4 my-8">
          <div className="flex items-start gap-3.5 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-xs">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 text-base">
              🧾
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Rechtskonforme QR-Rechnungen</h3>
              <p className="text-xs text-slate-400 mt-0.5">Automatischer Druck mit QR-Referenz, IID und Bankenabgleich.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-xs">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/20 text-yellow-300 flex items-center justify-center shrink-0 text-base">
              🔒
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Schweizer Datenschutz (revDSG)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Sichere Mandantentrennung und höchste Sicherheitsstandards.</p>
            </div>
          </div>
        </div>

        {/* Footer Trust Signals */}
        <div className="relative z-10 pt-6 border-t border-white/10">
          <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>🇨🇭 Hosted in Switzerland</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>🔒 256-Bit SSL Verschlüsselung</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>⚡ Schweizer Handelsregister</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>👥 Treuhand- & Team-Zugang</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Login Card */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-8 lg:px-16 overflow-y-auto">
        <div className="max-w-[440px] w-full mx-auto">
          
          {/* Mobile Header Branding */}
          <div className="lg:hidden flex justify-center mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-amber-500/20">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4v16" />
                  <path d="M4 12l9-8" />
                  <path d="M4 12l10 8" />
                  <circle cx="18" cy="6" r="2" fill="currentColor" />
                </svg>
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-lg text-text-primary leading-tight">Kinetic</span>
                  <span className="font-extrabold text-lg text-amber-600 leading-tight">Craft</span>
                </div>
                <span className="text-[10px] text-gray-400 font-semibold">by Kinetic Schweiz</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-7 sm:p-10 shadow-xl rounded-3xl border border-border/80 relative overflow-hidden">
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600" />

            {onBackToLanding && (
              <button
                type="button"
                onClick={onBackToLanding}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary mb-4 transition-colors cursor-pointer"
              >
                <span>←</span>
                <span>Zurück zur Website</span>
              </button>
            )}

            <div className="text-center sm:text-left mb-8">
              <div className="flex items-center gap-2 mb-1.5 justify-center sm:justify-start">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Kinetic Craft
                </span>
                <span className="text-xs text-text-secondary">by Kinetic Schweiz</span>
              </div>
              <h2 className="text-2xl font-bold text-text-primary tracking-tight">
                Willkommen zurück
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                Melde dich an, um auf dein Kinetic Craft Handwerker-CRM zuzugreifen.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleLogin}>
              <div>
                <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">
                  Geschäftliche E-Mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-secondary">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-text-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all placeholder:text-gray-400"
                    placeholder="beat@firma.ch"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">
                  Passwort
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-secondary">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-text-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all placeholder:text-gray-400"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                    title={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded cursor-pointer"
                  />
                  <span className="ml-2 text-xs font-medium text-text-secondary">
                    Angemeldet bleiben
                  </span>
                </label>

                <button
                  type="button"
                  onClick={openResetModal}
                  className="text-xs font-bold text-amber-600 hover:text-amber-800 transition-colors cursor-pointer"
                >
                  Passwort vergessen?
                </button>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3.5 rounded-xl border border-red-200 flex items-start gap-2.5 animate-fade-in">
                  <svg className="w-5 h-5 shrink-0 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="leading-snug">{error}</p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full min-h-[48px] flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-md text-sm font-bold text-white ${
                    isLoading 
                      ? 'bg-amber-400 cursor-wait' 
                      : 'bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/20 hover:shadow-lg active:scale-[0.99]'
                  } transition-all duration-200 cursor-pointer`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Wird angemeldet...</span>
                    </>
                  ) : (
                    <span>Anmelden 🇨🇭</span>
                  )}
                </button>
              </div>
            </form>
          </div>
          
          {/* Footer info & switch to registration */}
          <div className="mt-8 text-center space-y-3">
            <p className="text-sm text-text-secondary font-medium">
              Noch keinen Betrieb registriert?{' '}
              <button 
                type="button"
                onClick={onGoToRegistration} 
                className="text-amber-600 hover:text-amber-800 font-bold transition-colors cursor-pointer"
              >
                Jetzt 14 Tage kostenlos testen
              </button>
            </p>
            <p className="text-xs text-text-secondary/60 font-medium">
              &copy; {new Date().getFullYear()} Kinetic Craft · Kinetic Schweiz
            </p>
          </div>
        </div>

        {/* Password Reset Modal */}
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-border relative">
              <button
                onClick={() => setShowResetModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                title="Schließen"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-text-primary">Passwort zurücksetzen</h3>
                <p className="text-sm text-text-secondary mt-1">
                  Gib deine geschäftliche E-Mail-Adresse ein. Wir senden dir einen sicheren Schweizer Reset-Link.
                </p>
              </div>

              {resetSuccess ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-sm">
                    <p className="font-semibold mb-1">E-Mail wurde versendet!</p>
                    <p>Bitte prüfe deinen Posteingang und klicke auf den Link in der E-Mail.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl shadow-md shadow-amber-500/20 transition-colors cursor-pointer"
                  >
                    Zurück zur Anmeldung
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1">
                      Geschäftliche E-Mail
                    </label>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="beat@firma.ch"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-text-primary text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    />
                  </div>

                  {resetError && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 text-left">
                      {resetError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowResetModal(false)}
                      disabled={resetLoading}
                      className="w-1/2 py-3 bg-gray-100 text-text-secondary font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-1/2 py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl shadow-md shadow-amber-500/20 transition-colors flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
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
    </div>
  )
}
