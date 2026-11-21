import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { injectThemeVariables } from '../utils/colors'
import AddressAutocomplete from '../components/AddressAutocomplete'
import ZefixAutocomplete from '../components/ZefixAutocomplete'
import { BRANCHEN, finalizeTenantRegistration } from '../services/onboardingService'
import KineticLogoMark from '../components/KineticLogoMark'
import {
  TradeIcon,
  IconQrBill,
  IconFlash,
  IconPalette,
  IconShieldCheck,
  IconDatenschutz,
  IconCreditCard,
  IconSearch,
  IconDigitalSignature,
  IconLightbulb,
  IconUser,
  IconBuilding,
  IconCheck,
} from '../components/icons/BrandIcons'
import {
  calculatePasswordStrength,
  registrationStep1Schema,
  registrationStep2Schema,
  validateWithSchema,
} from '../lib/validation/authSchemas'
import { normalizeSwissPhone } from '../lib/validation/phoneValidation'
import { normalizeSwissUid } from '../lib/validation/uidValidation'

const COLOR_PRESETS = [
  { name: 'Handwerk Gold (Standard)', value: '#b88a38' },
  { name: 'Corporate Blau', value: '#2563eb' },
  { name: 'Schiefer Anthrazit', value: '#334155' },
  { name: 'Waldgrün', value: '#059669' },
  { name: 'Weinrot', value: '#9f1239' },
  { name: 'Kinetic Cyan', value: '#0ea5e9' },
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

const DRAFT_STORAGE_KEY = 'kinetic_registration_draft_v1'

function loadSavedDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.warn('Could not read registration draft:', e)
  }
  return null
}

function mapRegistrationError(err) {
  if (!err) return null
  const msg = typeof err === 'string' ? err : (err.message || '')
  if (msg.includes('User already registered')) {
    return 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits. Bitte melden Sie sich an.'
  }
  if (msg.includes('Password should be at least')) {
    return 'Das Passwort muss für Schweizer Finanzsoftware-Sicherheit mindestens 12 Zeichen lang sein.'
  }
  if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
    return 'Zu viele Registrierungsversuche in kurzer Zeit. Bitte warten Sie einen Moment.'
  }
  return msg || 'Registrierung fehlgeschlagen. Bitte prüfen Sie Ihre Eingaben.'
}

export default function RegistrationWizardView({ 
  onRegistrationSuccess, 
  onGoToLogin, 
  onBackToLanding,
  onOpenImpressum,
  onOpenDatenschutz
}) {
  const initialDraft = useRef(loadSavedDraft()).current

  const [step, setStep] = useState(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    if (hash.includes('step=')) {
      const match = hash.match(/step=(\d+)/)
      if (match && match[1]) {
        const s = parseInt(match[1], 10)
        if (s >= 1 && s <= 4) return s
      }
    }
    if (initialDraft?.step && initialDraft.step >= 1 && initialDraft.step <= 4) {
      return initialDraft.step
    }
    return 1
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [inviteToken, setInviteToken] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  
  // Zefix vs Manual Toggle
  const [isManualCompany, setIsManualCompany] = useState(false)

  // Logo file state for real upload
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')

  // Resend confirmation state
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendStatus, setResendStatus] = useState(null)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('?')) {
      const queryParams = new URLSearchParams(hash.split('?')[1])
      const token = queryParams.get('token')
      if (token) setInviteToken(token)
    }
  }, [])

  // Comprehensive Form State initialized with draft
  const [formData, setFormData] = useState(() => {
    const defaults = {
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
      primary_color: '#b88a38',
      createDemoData: true,
    }
    if (initialDraft?.formData) {
      return { ...defaults, ...initialDraft.formData }
    }
    return defaults
  })

  // Auto-persist draft to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
        step,
        formData,
      }))
    } catch {
      // ignore
    }
  }, [formData, step])

  const changeStep = (newStep) => {
    setStep(newStep)
    if (typeof window !== 'undefined') {
      window.location.hash = `#register?step=${newStep}`
    }
  }

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
      setError('Bitte wählen Sie eine gültige Bilddatei (PNG, JPG, SVG, WebP).')
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
      ort: item.ort || prev.ort,
      strasse: item.strasse || prev.strasse,
      plz: item.plz || prev.plz
    }))
  }

  const handleNext = () => {
    setError(null)
    const cleanEmail = formData.email.trim()

    if (step === 1) {
      if (inviteToken) {
        const fullName = `${formData.vorname} ${formData.nachname}`.trim()
        if (!fullName || !cleanEmail || !formData.password || formData.password.length < 12) {
          setError('Bitte Vor- und Nachname, eine gültige E-Mail sowie ein Passwort mit mindestens 12 Zeichen eingeben.')
          return
        }
        handleRegister(new Event('submit'))
        return
      }

      const val1 = validateWithSchema(registrationStep1Schema, {
        fullName: `${formData.vorname} ${formData.nachname}`.trim(),
        email: cleanEmail,
        password: formData.password,
      })

      if (!val1.isValid) {
        setError(val1.errorMessage)
        return
      }

      if (!formData.agbAccepted) {
        setError('Bitte bestätigen Sie die AGB und die Schweizer Datenschutzbestimmungen (DSG).')
        return
      }
    }

    if (step === 2) {
      const val2 = validateWithSchema(registrationStep2Schema, {
        firmenname: formData.firmenname,
        ort: formData.ort,
        kanton: formData.kanton,
        strasse: formData.strasse,
        plz: formData.plz,
        telefon: formData.telefon,
        uid: formData.uid,
        gewerk: formData.branche,
      })

      if (!val2.isValid) {
        setError(val2.errorMessage)
        return
      }

      // Normalization of phone and UID
      if (formData.telefon) {
        const phoneNorm = normalizeSwissPhone(formData.telefon)
        if (phoneNorm.isValid) {
          setFormData(prev => ({ ...prev, telefon: phoneNorm.national }))
        }
      }

      if (formData.uid) {
        const uidNorm = normalizeSwissUid(formData.uid)
        if (uidNorm.isValid) {
          setFormData(prev => ({ ...prev, uid: uidNorm.formatted }))
        }
      }
    }

    changeStep(step + 1)
  }

  const handleResendConfirmation = async () => {
    if (resendCooldown > 0 || isResending) return
    setIsResending(true)
    setResendStatus(null)
    try {
      const cleanEmail = formData.email.trim().toLowerCase()
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/#login` : undefined
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: redirectUrl
        }
      })
      if (resendErr) throw resendErr
      setResendStatus({ 
        type: 'success', 
        message: 'Bestätigungs-E-Mail wurde erneut gesendet. Bitte prüfen Sie auch Ihren Spam-Ordner.' 
      })
      setResendCooldown(60)
    } catch (err) {
      console.warn('Resend confirmation error:', err)
      setResendStatus({ 
        type: 'error', 
        message: mapRegistrationError(err) || 'E-Mail konnte nicht erneut gesendet werden.' 
      })
    } finally {
      setIsResending(false)
    }
  }

  const handleRegister = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!inviteToken && step !== 3) return

    setIsLoading(true)
    setError(null)

    const cleanEmail = formData.email.trim().toLowerCase()
    const fullName = `${formData.vorname} ${formData.nachname}`.trim()
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/#login` : undefined

    try {
      // 1. Supabase Auth Signup with dynamic redirect & complete Swiss metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            vorname: formData.vorname.trim(),
            nachname: formData.nachname.trim(),
            firmenname: formData.firmenname.trim(),
            uid: formData.uid.trim(),
            strasse: formData.strasse.trim(),
            plz: formData.plz.trim(),
            ort: formData.ort.trim(),
            kanton: formData.kanton,
            telefon: formData.telefon.trim(),
            branche: formData.branche,
            primary_color: formData.primary_color,
            create_demo_data: formData.createDemoData
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.')

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
      try {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY)
      } catch {}

      if (authData.session) {
        onRegistrationSuccess(authData.session)
      } else {
        // Fallback if email confirmation is required
        changeStep(4)
      }
    } catch (err) {
      console.error('Registration error:', err)
      setError(mapRegistrationError(err))
    } finally {
      setIsLoading(false)
    }
  }

  const stepTitles = [
    { num: 1, label: 'Konto' },
    { num: 2, label: 'Firma' },
    { num: 3, label: 'Handwerk & Design' }
  ]

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#0b0b0e] apple-pro-canvas text-[#F5F5F7] font-sans flex flex-col justify-between selection:bg-[#D6BA94]/30 selection:text-white pb-12 relative">
      {/* Precision Grid Background Layer */}
      <div className="pointer-events-none absolute inset-0 apple-precision-grid opacity-60" />

      {/* FLOATING GLASS HEADER (Identical to Landing Page Base Design) */}
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
              {onGoToLogin && (
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="px-3.5 sm:px-4 py-1.5 text-xs font-medium text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 rounded-full transition-all cursor-pointer"
                >
                  Bereits registriert? Anmelden
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* CENTERED REGISTRATION STAGE */}
      <main className="max-w-[620px] w-full mx-auto px-4 sm:px-6 my-auto pt-6 pb-6 relative z-10">
        
        {/* Stage Header Info */}
        <div className="text-center sm:text-left mb-6">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <span className="text-[11px] font-medium tracking-wide px-2.5 py-0.5 rounded-full bg-white/[0.08] text-[#E8D3B5] border border-white/10">
              <span>Schweizer Handwerker-Software</span>
            </span>
            <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#D6BA94]/15 text-[#E8D3B5] border border-[#D6BA94]/30">
              14 Tage kostenlos testen
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            {inviteToken ? 'Team-Einladung annehmen' : 'Neues Betriebskonto erstellen'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1 leading-relaxed">
            {inviteToken 
              ? 'Erstellen Sie Ihr persönliches Login für das Team.' 
              : 'In 2 Minuten startklar. Keine Kreditkarte erforderlich.'}
          </p>
        </div>

        {/* Wizard Stepper Pills in Titanium Style */}
        {step < 4 && !inviteToken && (
          <div className="mb-6 p-3 rounded-2xl bg-[#121216]/90 border border-white/12 backdrop-blur-md">
            <div className="flex items-center justify-between mb-2.5">
              {stepTitles.map(s => (
                <div key={s.num} className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                    step === s.num
                      ? 'bg-[#D6BA94] text-[#0B0B0E] shadow-sm ring-2 ring-[#D6BA94]/40'
                      : step > s.num
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-white/[0.06] text-neutral-400 border border-white/10'
                  }`}>
                    {step > s.num ? <IconCheck className="w-3.5 h-3.5" /> : s.num}
                  </span>
                  <span className={`text-xs ${
                    step >= s.num ? 'text-white font-medium' : 'text-neutral-400 font-normal'
                  } hidden sm:inline`}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map(i => (
                <div 
                  key={i} 
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    step >= i ? 'bg-[#D6BA94]' : 'bg-white/[0.08]'
                  }`} 
                />
              ))}
            </div>
          </div>
        )}

        {/* Form Stage Card */}
        <div className="bg-[#121216] apple-glass-stage rounded-3xl border border-white/12 p-6 sm:p-9 shadow-2xl relative">
          
          {error && (
            <div className="mb-5 text-xs text-red-300 bg-red-950/40 p-3.5 rounded-xl border border-red-500/30 flex items-start gap-2.5 animate-fade-in">
              <span className="font-bold text-red-400">!</span>
              <p className="leading-snug">{error}</p>
            </div>
          )}

          {/* STEP 1: Personal Account */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  {inviteToken ? 'Ihr Benutzerkonto' : 'Schritt 1: Ihr persönliches Profil'}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Mit diesen Angaben werden Sie als Inhaber/Ansprechpartner auf Dokumenten geführt.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Vorname <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="given-name"
                    value={formData.vorname}
                    onChange={e => setFormData({ ...formData, vorname: e.target.value })}
                    placeholder="Beat"
                    className="w-full px-3.5 py-2.5 bg-[#181820] border border-white/15 rounded-xl text-white placeholder:text-neutral-500 focus:bg-[#1e1e28] focus:border-[#D6BA94] focus:ring-1 focus:ring-[#D6BA94]/30 focus:outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Nachname <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="family-name"
                    value={formData.nachname}
                    onChange={e => setFormData({ ...formData, nachname: e.target.value })}
                    placeholder="Muster"
                    className="w-full px-3.5 py-2.5 bg-[#181820] border border-white/15 rounded-xl text-white placeholder:text-neutral-500 focus:bg-[#1e1e28] focus:border-[#D6BA94] focus:ring-1 focus:ring-[#D6BA94]/30 focus:outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Geschäftliche E-Mail <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="beat@schreinerei-muster.ch"
                  className="w-full px-3.5 py-2.5 bg-[#181820] border border-white/15 rounded-xl text-white placeholder:text-neutral-500 focus:bg-[#1e1e28] focus:border-[#D6BA94] focus:ring-1 focus:ring-[#D6BA94]/30 focus:outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Passwort <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mindestens 12 Zeichen"
                    className="w-full pl-3.5 pr-11 py-2.5 bg-[#181820] border border-white/15 rounded-xl text-white placeholder:text-neutral-500 focus:bg-[#1e1e28] focus:border-[#D6BA94] focus:ring-1 focus:ring-[#D6BA94]/30 focus:outline-none transition-all text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-white cursor-pointer"
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
                            passwordStrength.score >= idx ? passwordStrength.color : 'bg-white/[0.08]'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-neutral-400">
                      <span>Sicherheit: <strong className="text-white">{passwordStrength.label}</strong></span>
                      <span>Mind. 12 Zeichen (Finanzsoftware-Standard)</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Telefon / Mobile (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs text-neutral-400 font-semibold">
                    +41
                  </div>
                  <input
                    type="tel"
                    value={formData.telefon}
                    onChange={e => setFormData({ ...formData, telefon: e.target.value })}
                    placeholder="079 123 45 67"
                    className="w-full pl-11 pr-3.5 py-2.5 bg-[#181820] border border-white/15 rounded-xl text-white placeholder:text-neutral-500 focus:bg-[#1e1e28] focus:border-[#D6BA94] focus:ring-1 focus:ring-[#D6BA94]/30 focus:outline-none transition-all text-sm"
                  />
                </div>
              </div>

              {/* Legal DSG Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.agbAccepted}
                    onChange={e => setFormData({ ...formData, agbAccepted: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded bg-[#181820] border-white/20 text-[#D6BA94] focus:ring-0 cursor-pointer shrink-0"
                  />
                  <span className="text-xs text-neutral-400 leading-normal">
                    Ich akzeptiere die{' '}
                    <button 
                      type="button" 
                      onClick={onOpenImpressum} 
                      className="text-[#D6BA94] font-medium underline hover:text-white cursor-pointer"
                    >
                      Nutzungsbedingungen
                    </button>
                    {' '}und die{' '}
                    <button 
                      type="button" 
                      onClick={onOpenDatenschutz} 
                      className="text-[#D6BA94] font-medium underline hover:text-white cursor-pointer"
                    >
                      Datenschutzerklärung
                    </button>
                    {' '}nach Schweizer Datenschutzgesetz (DSG).
                  </span>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleNext}
                  className="apple-titanium-btn w-full py-3.5 rounded-xl font-semibold text-sm text-[#0B0B0E] cursor-pointer shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2"
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
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  Schritt 2: Ihr Betrieb & Schweizer Standort
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Wird oben auf Ihren Offerten, Rechnungen und im QR-Zahlteil gedruckt.
                </p>
              </div>

              {/* Mode Selector: Zefix vs Manual */}
              <div className="flex items-center justify-between p-1 bg-[#181820] rounded-xl border border-white/12 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setIsManualCompany(false)}
                  className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    !isManualCompany ? 'bg-white/15 text-white shadow-xs border border-white/20' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <IconSearch className="w-3.5 h-3.5 text-[#D6BA94] shrink-0" />
                  <span>Im Zefix suchen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualCompany(true)}
                  className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isManualCompany ? 'bg-white/15 text-white shadow-xs border border-white/20' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <IconDigitalSignature className="w-3.5 h-3.5 text-[#D6BA94] shrink-0" />
                  <span>Manuell erfassen</span>
                </button>
              </div>

              {/* Zefix Search Field if in Zefix mode */}
              {!isManualCompany && (
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Schweizer Handelsregister-Suche (Zefix)
                  </label>
                  <ZefixAutocomplete
                    onSelect={handleZefixSelect}
                    darkTheme={true}
                    className="w-full px-3.5 py-2.5 bg-[#181820] border border-[#D6BA94]/40 rounded-xl text-white placeholder:text-neutral-500 focus:bg-[#1e1e28] focus:border-[#D6BA94] focus:ring-1 focus:ring-[#D6BA94]/30 focus:outline-none transition-all text-sm"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1.5">
                    <IconLightbulb className="w-3.5 h-3.5 text-[#D6BA94] shrink-0" />
                    <span>Gibt Firmenname, UID und Sitz automatisch aus dem Handelsregister ein.</span>
                  </p>
                </div>
              )}

              {/* Company Name */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Firmenname <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.firmenname}
                  onChange={e => setFormData({ ...formData, firmenname: e.target.value })}
                  placeholder="z.B. Musterbau & Schreinerei GmbH"
                  className="w-full px-3.5 py-2.5 bg-[#181820] border border-white/15 rounded-xl text-white placeholder:text-neutral-500 focus:bg-[#1e1e28] focus:border-[#D6BA94] focus:ring-1 focus:ring-[#D6BA94]/30 focus:outline-none transition-all text-sm font-semibold"
                />
              </div>

              {/* UID-Nummer */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  UID-Nummer (Unternehmens-Identifikation)
                </label>
                <input
                  type="text"
                  value={formData.uid}
                  onChange={e => setFormData({ ...formData, uid: e.target.value })}
                  placeholder="CHE-123.456.789 MWST"
                  className="w-full px-3.5 py-2.5 bg-[#181820] border border-white/15 rounded-xl text-white placeholder:text-neutral-500 focus:bg-[#1e1e28] focus:border-[#D6BA94] focus:ring-1 focus:ring-[#D6BA94]/30 focus:outline-none transition-all text-sm font-mono"
                />
              </div>

              {/* Street with geo.admin.ch Autocomplete */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Strasse & Hausnummer (Schweizer Adresssuche)
                </label>
                <AddressAutocomplete
                  value={formData.strasse}
                  darkTheme={true}
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
                  className="w-full px-3.5 py-2.5 bg-[#181820] border border-white/15 rounded-xl text-white placeholder:text-neutral-500 focus:bg-[#1e1e28] focus:border-[#D6BA94] focus:ring-1 focus:ring-[#D6BA94]/30 focus:outline-none transition-all text-sm"
                />
              </div>

              {/* PLZ, Ort & Kanton */}
              <div className="grid grid-cols-12 gap-2.5 sm:gap-3">
                <div className="col-span-4 sm:col-span-3">
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    PLZ
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={formData.plz}
                    onChange={e => setFormData({ ...formData, plz: e.target.value })}
                    placeholder="3000"
                    className="w-full px-3.5 py-2.5 bg-[#181820] border border-white/15 rounded-xl text-white placeholder:text-neutral-500 focus:bg-[#1e1e28] focus:border-[#D6BA94] focus:ring-1 focus:ring-[#D6BA94]/30 focus:outline-none transition-all text-sm font-mono"
                  />
                </div>

                <div className="col-span-8 sm:col-span-6">
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Ort <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ort}
                    onChange={e => setFormData({ ...formData, ort: e.target.value })}
                    placeholder="Bern"
                    className="w-full px-3.5 py-2.5 bg-[#181820] border border-white/15 rounded-xl text-white placeholder:text-neutral-500 focus:bg-[#1e1e28] focus:border-[#D6BA94] focus:ring-1 focus:ring-[#D6BA94]/30 focus:outline-none transition-all text-sm"
                  />
                </div>

                <div className="col-span-12 sm:col-span-3">
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Kanton
                  </label>
                  <select
                    value={formData.kanton}
                    onChange={e => setFormData({ ...formData, kanton: e.target.value })}
                    className="w-full px-2.5 py-2.5 bg-[#181820] border border-white/15 rounded-xl text-white focus:bg-[#1e1e28] focus:border-[#D6BA94] focus:ring-1 focus:ring-[#D6BA94]/30 focus:outline-none transition-all text-sm font-medium cursor-pointer"
                  >
                    {SWISS_CANTONS.map(c => (
                      <option key={c.code} value={c.code} className="bg-[#181820] text-white">{c.code} – {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => changeStep(1)}
                  className="w-1/3 py-3 bg-white/[0.06] hover:bg-white/10 text-white font-medium rounded-xl border border-white/12 transition-colors cursor-pointer text-xs"
                >
                  Zurück
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="apple-titanium-btn w-2/3 py-3.5 rounded-xl font-semibold text-sm text-[#0B0B0E] cursor-pointer shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2"
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
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  Schritt 3: Branche, Branding & Musterdaten
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Wählen Sie Ihr Handwerk. Wir passen Ihre Vorlagen und das Design sofort an.
                </p>
              </div>

              {/* Trade / Branch Tile Grid */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-2">
                  In welchem Bereich sind Sie tätig?
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
                            ? 'border-[#D6BA94] bg-[#D6BA94]/15 shadow-sm ring-1 ring-[#D6BA94]/40 text-white'
                            : 'border-white/12 bg-[#181820] hover:bg-[#20202a] hover:border-white/25 text-[#F5F5F7]'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-[#D6BA94]/20 text-[#D6BA94]' : 'bg-white/[0.06] text-white/70'
                        }`}>
                          <TradeIcon tradeId={b.id} className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate">{b.name}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Primary Color Presets */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-2">
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
                          ? 'ring-2 ring-offset-2 ring-offset-[#0B0B0E] ring-[#D6BA94] scale-105'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: preset.value }}
                      title={preset.name}
                    >
                      {formData.primary_color.toLowerCase() === preset.value.toLowerCase() && (
                        <IconCheck className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 p-2.5 border border-white/12 rounded-xl bg-[#181820]">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={e => handleColorChange(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-white/20 p-0 bg-transparent"
                  />
                  <div className="flex-1 text-xs">
                    <span className="text-neutral-400 font-medium mr-2">Eigene HEX-Farbe:</span>
                    <span className="font-mono uppercase font-semibold text-white">{formData.primary_color}</span>
                  </div>
                </div>
              </div>

              {/* Real File Upload for Logo */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Firmenlogo (Optional – auf Offerten & Rechnungen)
                </label>
                
                {logoPreview ? (
                  <div className="flex items-center justify-between p-3.5 bg-[#181820] border border-white/12 rounded-xl">
                    <div className="flex items-center gap-3">
                      <img src={logoPreview} alt="Logo Vorschau" className="h-12 w-auto max-w-[120px] object-contain rounded p-1 bg-white border border-border" />
                      <div>
                        <p className="text-xs font-semibold text-white">{logoFile?.name || 'Logo hinterlegt'}</p>
                        <p className="text-[11px] text-emerald-400 font-medium">Bereit für Upload</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                      title="Logo entfernen"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-white/20 hover:border-[#D6BA94] rounded-xl bg-[#181820] hover:bg-[#20202a] transition-all cursor-pointer">
                    <svg className="w-7 h-7 text-neutral-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="text-xs font-semibold text-white">Logo hochladen (PNG, JPG, SVG)</span>
                    <span className="text-[11px] text-neutral-400 mt-0.5">Oder einfach später im Cockpit hinterlegen</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/svg+xml, image/webp"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Swiss Demo Data Toggle in Titanium Style */}
              <div className="p-3.5 rounded-xl bg-[#D6BA94]/10 border border-[#D6BA94]/25">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.createDemoData}
                    onChange={e => setFormData({ ...formData, createDemoData: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded bg-[#181820] border-white/20 text-[#D6BA94] focus:ring-0 cursor-pointer shrink-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-[#E8D3B5] block">
                      Mit Schweizer Musterdaten für meine Branche starten (empfohlen)
                    </span>
                    <span className="text-[11px] text-neutral-300 leading-tight block mt-0.5">
                      Erstellt 1 Musterkunden und 1 fertige Muster-Offerte in CHF zum direkten Testen. Mit 1 Klick wieder entfernbar.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => changeStep(2)}
                  disabled={isLoading}
                  className="w-1/3 py-3.5 bg-white/[0.06] hover:bg-white/10 text-white font-medium rounded-xl border border-white/12 transition-colors cursor-pointer disabled:opacity-50 text-xs"
                >
                  Zurück
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="apple-titanium-btn w-2/3 flex justify-center items-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-[#0B0B0E] cursor-pointer shadow-lg active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-wait"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-[#0B0B0E]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Konto wird eingerichtet...</span>
                    </>
                  ) : (
                    <span>CRM jetzt starten</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: Email Verification Notice Fallback in Space Black Titanium Style */}
          {step === 4 && (
            <div className="text-center py-6 animate-fade-in space-y-5">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <IconCheck className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-white mb-2">Fast geschafft!</h3>
                <p className="text-sm text-neutral-400 max-w-sm mx-auto leading-relaxed">
                  Wir haben Ihnen einen Aktivierungslink an <strong className="text-white">{formData.email}</strong> gesendet. Bitte klicken Sie auf den Link in der E-Mail, um Ihren Mandanten und Ihr Login zu aktivieren.
                </p>
              </div>

              {resendStatus && (
                <div className={`p-3 rounded-xl text-xs max-w-sm mx-auto flex items-start gap-2 text-left ${
                  resendStatus.type === 'success' 
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-red-950/40 text-red-300 border border-red-500/30'
                }`}>
                  {resendStatus.type === 'success' ? (
                    <IconCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <span className="font-bold text-red-400">!</span>
                  )}
                  <span>{resendStatus.message}</span>
                </div>
              )}

              <div className="p-3.5 bg-[#181820] border border-white/12 rounded-xl text-xs text-neutral-400 max-w-sm mx-auto text-left space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-white">
                  <IconLightbulb className="w-4 h-4 text-[#D6BA94] shrink-0" />
                  <span>Keine E-Mail erhalten?</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  Bitte überprüfen Sie auch Ihren Spam- oder Werbeordner. Die Zustellung dauert in der Regel weniger als eine Minute.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2.5 max-w-xs mx-auto">
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={isResending || resendCooldown > 0}
                  className="w-full py-2.5 bg-white/[0.06] border border-white/12 hover:bg-white/[0.12] text-white font-medium text-xs rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {isResending ? (
                    <span>E-Mail wird gesendet...</span>
                  ) : resendCooldown > 0 ? (
                    <span>Erneut senden in {resendCooldown}s</span>
                  ) : (
                    <span>Aktivierungs-E-Mail erneut senden</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => changeStep(1)}
                  className="text-xs font-medium text-[#D6BA94] hover:text-[#e8d3b5] underline underline-offset-2 transition-colors cursor-pointer py-1"
                >
                  E-Mail-Adresse korrigieren
                </button>

                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="apple-titanium-btn w-full mt-2 py-3 text-[#0B0B0E] font-semibold rounded-xl shadow-lg transition-colors cursor-pointer text-xs"
                >
                  Direkt zur Anmeldung
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation info */}
        {step < 4 && (
          <p className="mt-6 text-center text-sm text-neutral-400">
            Sie haben bereits ein Konto?{' '}
            <button 
              type="button"
              onClick={onGoToLogin} 
              className="text-[#D6BA94] hover:text-[#e8d3b5] font-semibold transition-colors cursor-pointer underline underline-offset-2"
            >
              Hier anmelden
            </button>
          </p>
        )}

        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-4 text-xs text-neutral-400/80">
          <button
            type="button"
            onClick={onOpenImpressum}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Impressum
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={onOpenDatenschutz}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Datenschutz (DSG)
          </button>
        </div>

      </main>
    </div>
  )
}
