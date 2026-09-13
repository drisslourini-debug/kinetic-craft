import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { injectThemeVariables } from '../utils/colors'
import AddressAutocomplete from '../components/AddressAutocomplete'
import ZefixAutocomplete from '../components/ZefixAutocomplete'
import { BRANCHEN, finalizeTenantRegistration } from '../services/onboardingService'

const COLOR_PRESETS = [
  { name: 'Kinetic Cyan', value: '#0ea5e9' },
  { name: 'Nordic Teal', value: '#0d9488' },
  { name: 'Corporate Blau', value: '#2563eb' },
  { name: 'Schiefer Anthrazit', value: '#334155' },
  { name: 'Waldgrün', value: '#059669' },
  { name: 'Weinrot', value: '#9f1239' },
]

const SWISS_CANTONS = [
  { code: 'AG', name: 'Aargau' },
  { code: 'AI', name: 'Appenzell Innerrhoden' },
  { code: 'AR', name: 'Appenzell Ausserrhoden' },
  { code: 'BE', name: 'Bern' },
  { code: 'BL', name: 'Basel-Landschaft' },
  { code: 'BS', name: 'Basel-Stadt' },
  { code: 'FR', name: 'Freiburg' },
  { code: 'GE', name: 'Genf' },
  { code: 'GL', name: 'Glarus' },
  { code: 'GR', name: 'Graubünden' },
  { code: 'JU', name: 'Jura' },
  { code: 'LU', name: 'Luzern' },
  { code: 'NE', name: 'Neuenburg' },
  { code: 'NW', name: 'Nidwalden' },
  { code: 'OW', name: 'Obwalden' },
  { code: 'SG', name: 'St. Gallen' },
  { code: 'SH', name: 'Schaffhausen' },
  { code: 'SO', name: 'Solothurn' },
  { code: 'SZ', name: 'Schwyz' },
  { code: 'TG', name: 'Thurgau' },
  { code: 'TI', name: 'Tessin' },
  { code: 'UR', name: 'Uri' },
  { code: 'VD', name: 'Waadt' },
  { code: 'VS', name: 'Wallis' },
  { code: 'ZG', name: 'Zug' },
  { code: 'ZH', name: 'Zürich' },
]

function calculatePasswordStrength(pass) {
  if (!pass) return { score: 0, label: '', color: 'bg-gray-200' }
  let score = 0
  if (pass.length >= 8) score += 1
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1
  if (/[0-9]/.test(pass)) score += 1
  if (/[^A-Za-z0-9]/.test(pass) || pass.length >= 12) score += 1

  switch (score) {
    case 1:
      return { score: 1, label: 'Schwach', color: 'bg-red-500' }
    case 2:
      return { score: 2, label: 'Mittel', color: 'bg-amber-500' }
    case 3:
      return { score: 3, label: 'Gut', color: 'bg-blue-500' }
    case 4:
      return { score: 4, label: 'Sehr stark', color: 'bg-emerald-500' }
    default:
      return { score: 0, label: 'Zu kurz (mind. 8 Zeichen)', color: 'bg-red-400' }
  }
}

function mapRegistrationError(err) {
  if (!err) return null
  const msg = typeof err === 'string' ? err : (err.message || '')
  if (msg.includes('User already registered')) {
    return 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits. Bitte melde dich an.'
  }
  if (msg.includes('Password should be at least')) {
    return 'Das Passwort muss mindestens 8 Zeichen lang sein.'
  }
  if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
    return 'Zu viele Registrierungsversuche in kurzer Zeit. Bitte warte einen Moment.'
  }
  return msg || 'Registrierung fehlgeschlagen. Bitte prüfe deine Eingaben.'
}

export default function RegistrationWizardView({ onRegistrationSuccess, onGoToLogin, onBackToLanding }) {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [inviteToken, setInviteToken] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  
  // Zefix vs Manual Toggle
  const [isManualCompany, setIsManualCompany] = useState(false)

  // Logo file state for real upload
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')

  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('?')) {
      const queryParams = new URLSearchParams(hash.split('?')[1])
      const token = queryParams.get('token')
      if (token) setInviteToken(token)
    }
  }, [])

  // Comprehensive Form State
  const [formData, setFormData] = useState({
    // Step 1: User & Security
    vorname: '',
    nachname: '',
    email: '',
    password: '',
    telefon: '',
    agbAccepted: false,
    
    // Step 2: Company & Swiss Location
    firmenname: '',
    uid: '',
    strasse: '',
    plz: '',
    ort: '',
    kanton: 'BE',
    
    // Step 3: Trade, Branding & Demo
    branche: 'maler_gipser',
    primary_color: '#0ea5e9',
    createDemoData: true
  })

  const passwordStrength = calculatePasswordStrength(formData.password)

  const handleColorChange = (color) => {
    setFormData(prev => ({ ...prev, primary_color: color }))
    injectThemeVariables(color)
  }

  const handleBranchSelect = (branch) => {
    setFormData(prev => ({
      ...prev,
      branche: branch.id,
      primary_color: branch.defaultColor
    }))
    injectThemeVariables(branch.defaultColor)
  }

  const handleLogoFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Bitte wähle eine gültige Bilddatei (PNG, JPG, SVG, WebP).')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Das Logo darf maximal 5MB gross sein.')
      return
    }

    setError(null)
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview('')
  }

  // Handle Zefix Selection
  const handleZefixSelect = (item) => {
    setFormData(prev => ({
      ...prev,
      firmenname: item.firmenname || prev.firmenname,
      uid: item.uid || prev.uid,
      ort: item.ort || prev.ort
    }))
  }

  const handleNext = () => {
    setError(null)
    const cleanEmail = formData.email.trim()

    if (step === 1) {
      if (inviteToken) {
        const fullName = `${formData.vorname} ${formData.nachname}`.trim()
        if (!fullName || !cleanEmail || !formData.password || formData.password.length < 6) {
          setError('Bitte Vor- und Nachname, eine gültige E-Mail sowie ein Passwort (mind. 6 Zeichen) eingeben.')
          return
        }
        handleRegister(new Event('submit'))
        return
      }

      if (!formData.vorname.trim() || !formData.nachname.trim()) {
        setError('Bitte gib deinen Vor- und Nachnamen ein.')
        return
      }
      if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        setError('Bitte gib eine gültige geschäftliche E-Mail-Adresse ein.')
        return
      }
      if (!formData.password || formData.password.length < 8) {
        setError('Das Passwort muss für Schweizer Sicherheitsstandards mindestens 8 Zeichen lang sein.')
        return
      }
      if (!formData.agbAccepted) {
        setError('Bitte stimme den AGB und den Schweizer Datenschutzbestimmungen (revDSG) zu.')
        return
      }
    }

    if (step === 2) {
      if (!formData.firmenname.trim()) {
        setError('Bitte gib deinen Firmen- oder Betriebsnamen ein.')
        return
      }
      if (!formData.ort.trim()) {
        setError('Bitte gib mindestens den Standort (Ort) deiner Firma an.')
        return
      }
    }

    setStep(step + 1)
  }

  const handleRegister = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!inviteToken && step !== 3) return

    setIsLoading(true)
    setError(null)

    const cleanEmail = formData.email.trim().toLowerCase()
    const fullName = `${formData.vorname} ${formData.nachname}`.trim()

    try {
      // 1. Supabase Auth Signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: formData.password,
        options: {
          data: {
            full_name: fullName,
            firmenname: formData.firmenname
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Registrierung fehlgeschlagen. Bitte versuche es erneut.')

      const userId = authData.user.id

      if (inviteToken) {
        // Team Invitation Flow
        const { error: rpcError } = await supabase.rpc('accept_invitation', {
          p_token: inviteToken,
          p_user_name: fullName
        })
        if (rpcError) {
          throw new Error(`Konnte Einladung nicht annehmen: ${rpcError.message}`)
        }
      } else {
        // Upload Logo to Storage if chosen
        let uploadedLogoUrl = ''
        if (logoFile) {
          try {
            const fileExt = logoFile.name.split('.').pop()
            const fileName = `${Date.now()}_logo.${fileExt}`
            const filePath = `logos/${userId}/${fileName}`

            const { error: uploadError } = await supabase.storage
              .from('public_assets')
              .upload(filePath, logoFile)

            if (!uploadError) {
              const { data: publicUrlData } = supabase.storage
                .from('public_assets')
                .getPublicUrl(filePath)
              uploadedLogoUrl = publicUrlData?.publicUrl || ''
            }
          } catch (storageErr) {
            console.warn('Logo upload warning:', storageErr)
          }
        }

        // New Tenant Registration RPC
        const { error: rpcError } = await supabase.rpc('register_new_tenant', {
          p_firmenname: formData.firmenname.trim(),
          p_primary_color: formData.primary_color,
          p_logo_url: uploadedLogoUrl,
          p_user_name: fullName || cleanEmail.split('@')[0]
        })

        if (rpcError) {
          console.warn('register_new_tenant RPC warning:', rpcError)
        }

        // Finalize Swiss Settings, Profile & Demo Data
        await finalizeTenantRegistration({
          userId,
          vorname: formData.vorname.trim(),
          nachname: formData.nachname.trim(),
          firmenname: formData.firmenname.trim(),
          strasse: formData.strasse.trim(),
          plz: formData.plz.trim(),
          ort: formData.ort.trim(),
          kanton: formData.kanton,
          uid: formData.uid.trim(),
          telefon: formData.telefon.trim(),
          branche: formData.branche,
          primaryColor: formData.primary_color,
          logoUrl: uploadedLogoUrl,
          createDemoData: formData.createDemoData
        })
      }

      // Success Navigation
      if (authData.session) {
        onRegistrationSuccess(authData.session)
      } else {
        // Fallback if email confirmation is required
        setStep(4)
      }
    } catch (err) {
      console.error('Registration error:', err)
      setError(mapRegistrationError(err))
    } finally {
      setIsLoading(false)
    }
  }

  const stepTitles = [
    { num: 1, label: 'Konto', icon: '👤' },
    { num: 2, label: 'Firma', icon: '🏢' },
    { num: 3, label: 'Handwerk & Design', icon: '🎨' }
  ]

  return (
    <div className="min-h-screen bg-surface flex">
      {/* LEFT COLUMN: Swiss Quality & Branding Showcase (Desktop Only) */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Subtle Decorative Background Glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-500/20 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-500/20 rounded-full filter blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-tr from-sky-400 via-teal-400 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-500/30 border border-white/20">
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
                <span className="font-bold tracking-tight text-xl text-sky-400">Craft</span>
              </div>
              <span className="text-xs block text-sky-300/80 font-semibold tracking-wider uppercase">by Kinetic Schweiz</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-white/90 mb-6">
            <span>🇨🇭</span>
            <span>Entwickelt für das Schweizer Handwerk</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Von der Offerte bis zur QR-Rechnung in Rekordzeit.
          </h1>
          <p className="mt-4 text-slate-300 text-sm leading-relaxed max-w-md">
            Die All-in-One Software für Schweizer Handwerker, Schreiner, Maler, Sanitär und Bauprofis. Präzise, schnell und 100% rechtskonform.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="relative z-10 space-y-4 my-8">
          <div className="flex items-start gap-3.5 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-xs">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-300 flex items-center justify-center shrink-0 text-base">
              🧾
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Schweizer QR-Rechnung</h3>
              <p className="text-xs text-slate-400 mt-0.5">Offizielle QR-Rechnungen mit QR-Referenz und automatischer Verbuchung.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-xs">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0 text-base">
              ⚡
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Zefix & GeoAdmin Integration</h3>
              <p className="text-xs text-slate-400 mt-0.5">Firmenstammdaten & Adressen direkt aus den Registern der Eidgenossenschaft.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-xs">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 text-base">
              🎨
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Vollwertige Schweizer PDF-Offerten</h3>
              <p className="text-xs text-slate-400 mt-0.5">Elegante A4-Layouts mit deinem Logo, MWST-Abrechnung und Firmen-Design.</p>
            </div>
          </div>
        </div>

        {/* Swiss Trust & Compliance Footer */}
        <div className="relative z-10 pt-6 border-t border-white/10">
          <div className="grid grid-cols-2 gap-3 text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>🇨🇭 Gehostet in der Schweiz</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>🔒 256-Bit SSL Verschlüsselung</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>🛡️ Schweizer revDSG konform</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>💳 Keine Kreditkarte nötig</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Wizard Form */}
      <div className="flex-1 flex flex-col justify-center py-10 px-4 sm:px-8 lg:px-16 overflow-y-auto">
        <div className="max-w-[540px] w-full mx-auto">
          
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

          {/* Header */}
          <div className="text-center sm:text-left mb-6">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="lg:hidden flex items-center gap-2">
                <div className="h-10 w-10 bg-gradient-to-tr from-sky-400 via-teal-400 to-indigo-500 rounded-xl flex items-center justify-center text-white font-black text-sm">
                  KC
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-base text-text-primary leading-tight">Kinetic Craft</span>
                  <span className="text-[10px] text-gray-400">by Kinetic Schweiz</span>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-sky-50 text-sky-700 rounded-full border border-sky-200">
                14 Tage kostenlos testen
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
              {inviteToken ? 'Team-Einladung annehmen' : 'Neues Betriebskonto erstellen'}
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              {inviteToken 
                ? 'Erstelle dein persönliches Login für das Team.' 
                : 'In 2 Minuten startklar. Keine Kreditkarte erforderlich.'}
            </p>
          </div>

          {/* Wizard Stepper */}
          {step < 4 && !inviteToken && (
            <div className="mb-6 bg-white p-3.5 rounded-2xl border border-border shadow-xs">
              <div className="flex items-center justify-between mb-2.5">
                {stepTitles.map(s => (
                  <div key={s.num} className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step === s.num
                        ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-sm ring-2 ring-sky-200'
                        : step > s.num
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-400'
                    }`}>
                      {step > s.num ? '✓' : s.num}
                    </span>
                    <span className={`text-xs font-bold hidden sm:inline ${
                      step >= s.num ? 'text-text-primary' : 'text-text-secondary/50'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map(i => (
                  <div 
                    key={i} 
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      step >= i ? 'bg-gradient-to-r from-sky-500 to-teal-500' : 'bg-gray-100'
                    }`} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Card Container */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-border/80 shadow-md">
            
            {error && (
              <div className="mb-5 text-sm text-red-600 bg-red-50 p-3.5 rounded-xl border border-red-200 flex items-start gap-2.5 animate-fade-in">
                <svg className="w-5 h-5 shrink-0 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="leading-snug">{error}</p>
              </div>
            )}

            {/* STEP 1: Personal Account */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h3 className="text-lg font-bold text-text-primary">
                    {inviteToken ? 'Dein Benutzerkonto' : 'Schritt 1: Dein persönliches Profil'}
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Mit diesen Angaben wirst du als Inhaber/Ansprechpartner auf Dokumenten geführt.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">
                      Vorname <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoComplete="given-name"
                      value={formData.vorname}
                      onChange={e => setFormData({ ...formData, vorname: e.target.value })}
                      placeholder="Beat"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-text-primary text-sm placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">
                      Nachname <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoComplete="family-name"
                      value={formData.nachname}
                      onChange={e => setFormData({ ...formData, nachname: e.target.value })}
                      placeholder="Muster"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-text-primary text-sm placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">
                    Geschäftliche E-Mail <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="beat@schreinerei-muster.ch"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-text-primary text-sm placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">
                    Passwort <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Mindestens 8 Zeichen"
                      className="w-full pl-3.5 pr-11 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-text-primary text-sm placeholder:text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-secondary hover:text-text-primary cursor-pointer"
                      title={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {formData.password && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4].map(idx => (
                          <div
                            key={idx}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                              passwordStrength.score >= idx ? passwordStrength.color : 'bg-gray-100'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-text-secondary">
                        <span>Sicherheit: <strong>{passwordStrength.label}</strong></span>
                        <span>Mind. 8 Zeichen</span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">
                    Telefon / Mobile (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs text-text-secondary font-semibold">
                      🇨🇭 +41
                    </div>
                    <input
                      type="tel"
                      value={formData.telefon}
                      onChange={e => setFormData({ ...formData, telefon: e.target.value })}
                      placeholder="79 123 45 67"
                      className="w-full pl-16 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-text-primary text-sm placeholder:text-gray-400"
                    />
                  </div>
                </div>

                {/* Legal revDSG Checkbox */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.agbAccepted}
                      onChange={e => setFormData({ ...formData, agbAccepted: e.target.checked })}
                      className="mt-1 h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded cursor-pointer shrink-0"
                    />
                    <span className="text-xs text-text-secondary leading-normal">
                      Ich akzeptiere die <strong>AGB</strong> und die <strong>Datenschutzerklärung</strong> nach neuem Schweizer Datenschutzgesetz (revDSG).
                    </span>
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-md shadow-sky-500/20 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{inviteToken ? 'Einladung jetzt annehmen' : 'Weiter zu Firmendaten'}</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Company & Location */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h3 className="text-lg font-bold text-text-primary">
                    Schritt 2: Dein Betrieb & Schweizer Standort
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Wird oben auf deinen Offerten, Rechnungen und im QR-Zahlteil gedruckt.
                  </p>
                </div>

                {/* Mode Selector: Zefix vs Manual */}
                <div className="flex items-center justify-between p-1 bg-gray-100 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setIsManualCompany(false)}
                    className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      !isManualCompany ? 'bg-white text-text-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span>🔍 Im Zefix Handelsregister suchen</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsManualCompany(true)}
                    className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isManualCompany ? 'bg-white text-text-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span>✍️ Manuell erfassen</span>
                  </button>
                </div>

                {/* Zefix Search Field if in Zefix mode */}
                {!isManualCompany && (
                  <div>
                    <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">
                      Schweizer Handelsregister-Suche (Zefix)
                    </label>
                    <ZefixAutocomplete
                      onSelect={handleZefixSelect}
                      className="w-full px-3.5 py-2.5 bg-sky-50/40 border border-sky-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30 text-text-primary text-sm placeholder:text-gray-400"
                    />
                    <p className="text-[11px] text-text-secondary mt-1">
                      💡 Gibt automatisch Firmenname, UID und Sitz aus dem Handelsregister des Bundes ein.
                    </p>
                  </div>
                )}

                {/* Company Name */}
                <div>
                  <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">
                    Firmenname <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firmenname}
                    onChange={e => setFormData({ ...formData, firmenname: e.target.value })}
                    placeholder="z.B. Musterbau & Schreinerei GmbH"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-text-primary text-sm font-semibold placeholder:text-gray-400"
                  />
                </div>

                {/* UID-Nummer */}
                <div>
                  <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">
                    UID-Nummer (Unternehmens-Identifikation)
                  </label>
                  <input
                    type="text"
                    value={formData.uid}
                    onChange={e => setFormData({ ...formData, uid: e.target.value })}
                    placeholder="CHE-123.456.789 MWST"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-text-primary text-sm placeholder:text-gray-400"
                  />
                </div>

                {/* Street with geo.admin.ch Autocomplete */}
                <div>
                  <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">
                    Strasse & Hausnummer (Schweizer Adresssuche)
                  </label>
                  <AddressAutocomplete
                    value={formData.strasse}
                    onChange={(val, details) => {
                      if (details) {
                        setFormData(prev => ({
                          ...prev,
                          strasse: details.strasse || val,
                          plz: details.plz || prev.plz,
                          ort: details.ort || prev.ort
                        }))
                      } else {
                        setFormData(prev => ({ ...prev, strasse: val }))
                      }
                    }}
                    placeholder="Gewerbestrasse 10"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-text-primary text-sm placeholder:text-gray-400"
                  />
                </div>

                {/* PLZ, Ort & Kanton */}
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-4">
                    <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">
                      PLZ
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={formData.plz}
                      onChange={e => setFormData({ ...formData, plz: e.target.value })}
                      placeholder="3000"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-text-primary text-sm placeholder:text-gray-400"
                    />
                  </div>

                  <div className="col-span-5">
                    <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">
                      Ort <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.ort}
                      onChange={e => setFormData({ ...formData, ort: e.target.value })}
                      placeholder="Bern"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-text-primary text-sm placeholder:text-gray-400"
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">
                      Kanton
                    </label>
                    <select
                      value={formData.kanton}
                      onChange={e => setFormData({ ...formData, kanton: e.target.value })}
                      className="w-full px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-text-primary text-sm font-semibold"
                    >
                      {SWISS_CANTONS.map(c => (
                        <option key={c.code} value={c.code}>{c.code}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 py-3 bg-gray-100 text-text-secondary font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Zurück
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-2/3 py-3.5 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-md shadow-sky-500/20 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Weiter zu Handwerk & Design</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Craft, Branding & Demo Data */}
            {step === 3 && (
              <form onSubmit={handleRegister} className="space-y-5 animate-fade-in">
                <div>
                  <h3 className="text-lg font-bold text-text-primary">
                    Schritt 3: Branche, Branding & Musterdaten
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Wähle dein Handwerk. Wir passen deine Vorlagen und das Design sofort an.
                  </p>
                </div>

                {/* Trade / Branch Tile Grid */}
                <div>
                  <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-2">
                    In welchem Bereich bist du tätig?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {BRANCHEN.map(b => {
                      const isSelected = formData.branche === b.id
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleBranchSelect(b)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                            isSelected
                              ? 'border-sky-500 bg-sky-50/70 shadow-xs ring-2 ring-sky-500/20'
                              : 'border-border bg-gray-50/50 hover:bg-white hover:border-gray-300'
                          }`}
                        >
                          <span className="text-xl">{b.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-text-primary truncate">{b.name}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Primary Color Presets */}
                <div>
                  <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-2">
                    Akzentfarbe (Corporate Identity)
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2.5">
                    {COLOR_PRESETS.map(preset => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handleColorChange(preset.value)}
                        className={`h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          formData.primary_color.toLowerCase() === preset.value.toLowerCase()
                            ? 'ring-2 ring-offset-2 ring-sky-500 scale-105'
                            : 'opacity-85 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: preset.value }}
                        title={preset.name}
                      >
                        {formData.primary_color.toLowerCase() === preset.value.toLowerCase() && (
                          <span className="text-white text-xs font-bold">✓</span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 p-2.5 border border-gray-200 rounded-xl bg-gray-50">
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={e => handleColorChange(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-gray-300 p-0"
                    />
                    <div className="flex-1 text-xs">
                      <span className="text-text-secondary font-medium mr-2">Eigene HEX-Farbe:</span>
                      <span className="font-mono uppercase font-bold text-text-primary">{formData.primary_color}</span>
                    </div>
                  </div>
                </div>

                {/* Real File Upload for Logo */}
                <div>
                  <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">
                    Firmenlogo (Optional – auf Offerten & Rechnungen)
                  </label>
                  
                  {logoPreview ? (
                    <div className="flex items-center justify-between p-3.5 bg-surface-card border border-border rounded-xl">
                      <div className="flex items-center gap-3">
                        <img src={logoPreview} alt="Logo Vorschau" className="h-12 w-auto max-w-[120px] object-contain rounded p-1 bg-white border border-border" />
                        <div>
                          <p className="text-xs font-bold text-text-primary">{logoFile?.name || 'Logo hinterlegt'}</p>
                          <p className="text-[11px] text-emerald-600 font-semibold">Bereit für Upload</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Logo entfernen"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 hover:border-sky-400 rounded-xl bg-gray-50/50 hover:bg-sky-50/20 transition-all cursor-pointer">
                      <svg className="w-8 h-8 text-text-secondary/50 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <span className="text-xs font-bold text-text-primary">Logo hochladen (PNG, JPG, SVG)</span>
                      <span className="text-[11px] text-text-secondary mt-0.5">Oder einfach später im Dashboard hinterlegen</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/svg+xml, image/webp"
                        onChange={handleLogoFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Swiss Demo Data Toggle */}
                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.createDemoData}
                      onChange={e => setFormData({ ...formData, createDemoData: e.target.checked })}
                      className="mt-0.5 h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded cursor-pointer shrink-0"
                    />
                    <div>
                      <span className="text-xs font-bold text-amber-950 block">
                        Mit Schweizer Musterdaten für meine Branche starten (empfohlen)
                      </span>
                      <span className="text-[11px] text-amber-900/80 leading-tight block mt-0.5">
                        Erstellt 1 Musterkunden und 1 fertige Muster-Offerte in CHF, damit du das System sofort ausprobieren kannst. Mit 1 Klick wieder entfernbar.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={isLoading}
                    className="w-1/3 py-3.5 bg-gray-100 text-text-secondary font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Zurück
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-2/3 flex justify-center items-center gap-2 py-3.5 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-md shadow-sky-500/20 active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-wait cursor-pointer text-sm"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Konto wird eingerichtet...</span>
                      </>
                    ) : (
                      <span>CRM jetzt starten 🇨🇭</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4: Email Verification Notice Fallback */}
            {step === 4 && (
              <div className="text-center py-6 animate-fade-in space-y-5">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-3xl font-bold">
                  ✓
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-text-primary mb-2">Fast geschafft!</h3>
                  <p className="text-sm text-text-secondary max-w-sm mx-auto">
                    Wir haben dir eine Bestätigungs-E-Mail an <strong>{formData.email}</strong> gesendet. Bitte klicke auf den Link in der E-Mail, um dein Konto zu aktivieren.
                  </p>
                </div>
                <div className="pt-2 flex flex-col gap-2.5 max-w-xs mx-auto">
                  <button
                    type="button"
                    onClick={onGoToLogin}
                    className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-md shadow-sky-500/20 transition-colors cursor-pointer"
                  >
                    Zurück zur Anmeldung
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Footer Navigation */}
          {step < 4 && (
            <p className="mt-6 text-center text-sm text-text-secondary font-medium">
              Du hast bereits einen Account?{' '}
              <button 
                type="button"
                onClick={onGoToLogin} 
                className="text-sky-600 hover:text-sky-800 font-bold transition-colors cursor-pointer"
              >
                Hier anmelden
              </button>
            </p>
          )}

        </div>
      </div>
    </div>
  )
}
