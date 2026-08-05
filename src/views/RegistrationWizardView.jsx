import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { injectThemeVariables } from '../utils/colors'

export default function RegistrationWizardView({ onRegistrationSuccess, onGoToLogin }) {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [inviteToken, setInviteToken] = useState(null)

  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('?')) {
      const queryParams = new URLSearchParams(hash.split('?')[1])
      const token = queryParams.get('token')
      if (token) setInviteToken(token)
    }
  }, [])

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    firmenname: '',
    primary_color: '#b88a38', // Default Atelier 77 Gold/Brown
    logo_url: ''
  })

  const handleColorChange = (color) => {
    setFormData({...formData, primary_color: color})
    injectThemeVariables(color)
  }

  const handleNext = () => {
    if (step === 1 && (!formData.email || !formData.password || formData.password.length < 6 || (inviteToken && !formData.name))) {
      setError(inviteToken ? 'Bitte Name, gültige E-Mail und ein Passwort (min. 6 Zeichen) eingeben.' : 'Bitte gültige E-Mail und ein Passwort (min. 6 Zeichen) eingeben.')
      return
    }
    if (step === 1 && inviteToken) {
      handleRegister(new Event('submit'))
      return
    }
    if (step === 2 && !formData.firmenname) {
      setError('Bitte gib den Namen deiner Firma ein.')
      return
    }
    setError(null)
    setStep(step + 1)
  }

  const handleRegister = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!inviteToken && step !== 3) return

    setIsLoading(true)
    setError(null)

    try {
      // 1. Supabase Auth Signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Registrierung fehlgeschlagen.')

      if (inviteToken) {
        // Handle Team Invitation
        const { data: rpcData, error: rpcError } = await supabase.rpc('accept_invitation', {
          p_token: inviteToken,
          p_user_name: formData.name
        })
        if (rpcError) {
          console.error("RPC Error:", rpcError)
          throw new Error(`Konnte Einladung nicht verarbeiten: ${rpcError.message}`)
        }
      } else {
        // Handle New Tenant Registration
        const { data: rpcData, error: rpcError } = await supabase.rpc('register_new_tenant', {
          p_firmenname: formData.firmenname,
          p_primary_color: formData.primary_color,
          p_logo_url: formData.logo_url,
          p_user_name: formData.email.split('@')[0]
        })

        if (rpcError) {
          console.error("RPC Error:", rpcError)
          throw new Error(`Konnte Firmen-Mandant nicht erstellen: ${rpcError.message}`)
        }
      }

      // Success
      if (authData.session) {
        onRegistrationSuccess(authData.session)
      } else {
        // Fallback if email confirmation is required by Supabase settings
        setError('Registrierung erfolgreich! Bitte überprüfe deine E-Mails, um den Account zu bestätigen.')
        setStep(4) // Success step without auto-login
      }

    } catch (err) {
      setError(err.message || 'Ein unerwarteter Fehler ist aufgetreten.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 z-0 pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 z-0 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 bg-primary-600 rounded-2xl flex items-center justify-center text-white text-3xl shadow-lg font-bold">
            A
          </div>
        </div>
        <h2 className="text-3xl font-bold text-text-primary tracking-tight">
          {inviteToken ? 'Team-Einladung akzeptieren' : '14 Tage kostenlos testen'}
        </h2>
        <p className="mt-2 text-sm text-text-secondary font-medium">
          Keine Kreditkarte erforderlich. Voller Zugriff.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-[480px] relative z-10">
        <div className="bg-white py-8 px-6 shadow-2xl sm:rounded-3xl sm:px-10 border border-border overflow-hidden">
          
          {/* Progress Bar */}
          {step < 4 && (
            <div className="flex items-center gap-2 mb-8">
              {[1, 2, 3].map(i => (
                <div key={i} className={`h-2 flex-1 rounded-full transition-colors ${step >= i ? 'bg-primary-500' : 'bg-gray-100'}`} />
              ))}
            </div>
          )}

          {error && (
            <div className="mb-6 text-sm text-red-600 bg-red-50 p-3.5 rounded-xl border border-red-100 flex items-start gap-2">
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <p>{error}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-xl font-bold text-text-primary">
                {inviteToken ? 'Erstelle deinen Account' : 'Erstelle deinen Account'}
              </h3>
              {inviteToken && (
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1.5">Dein Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                    placeholder="Vorname Nachname"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1.5">E-Mail Adresse</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  placeholder="name@firma.ch"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1.5">Passwort</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  placeholder="Mindestens 6 Zeichen"
                />
              </div>
              <button
                onClick={handleNext}
                className="w-full py-3.5 bg-primary-600 text-white font-bold rounded-xl shadow-md hover:bg-primary-700 transition-colors"
              >
                Weiter
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-xl font-bold text-text-primary">Wie heisst deine Firma?</h3>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1.5">Firmenname</label>
                <input
                  type="text"
                  value={formData.firmenname}
                  onChange={e => setFormData({...formData, firmenname: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  placeholder="z.B. Musterbau AG"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="w-1/3 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Zurück
                </button>
                <button
                  onClick={handleNext}
                  className="w-2/3 py-3.5 bg-primary-600 text-white font-bold rounded-xl shadow-md hover:bg-primary-700 transition-colors"
                >
                  Weiter
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleRegister} className="space-y-6 animate-fade-in">
              <h3 className="text-xl font-bold text-text-primary">Personalisiere dein CRM</h3>
              
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1.5">Hauptfarbe</label>
                <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl bg-gray-50">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={e => handleColorChange(e.target.value)}
                    className="w-12 h-12 rounded cursor-pointer"
                  />
                  <div>
                    <p className="text-sm font-medium text-text-primary">Farbe wählen</p>
                    <p className="text-xs text-text-secondary">Wird für Buttons und Menüs verwendet</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1.5">Logo URL (Optional)</label>
                <input
                  type="url"
                  value={formData.logo_url}
                  onChange={e => setFormData({...formData, logo_url: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  placeholder="https://deine-website.ch/logo.png"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={isLoading}
                  className="w-1/3 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Zurück
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-2/3 flex justify-center items-center gap-2 py-3.5 bg-primary-600 text-white font-bold rounded-xl shadow-md hover:bg-primary-700 transition-colors disabled:opacity-70 disabled:cursor-wait"
                >
                  {isLoading ? 'Wird erstellt...' : 'CRM starten!'}
                </button>
              </div>
            </form>
          )}

          {step === 4 && (
            <div className="text-center py-8 animate-fade-in space-y-6">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-4xl">
                ✓
              </div>
              <div>
                <h3 className="text-2xl font-bold text-text-primary mb-2">Fast geschafft!</h3>
                <p className="text-text-secondary">
                  Wir haben dir eine E-Mail gesendet. Bitte klicke auf den Link darin, um deinen Account zu aktivieren.
                </p>
              </div>
              <button
                onClick={onGoToLogin}
                className="w-full py-3.5 bg-primary-600 text-white font-bold rounded-xl shadow-md hover:bg-primary-700 transition-colors"
              >
                Zurück zum Login
              </button>
            </div>
          )}

        </div>
        
        {step < 4 && (
          <p className="mt-8 text-center text-sm text-text-secondary font-medium">
            Du hast bereits einen Account?{' '}
            <button onClick={onGoToLogin} className="text-primary-600 hover:text-primary-800 font-bold transition-colors">
              Hier anmelden
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
