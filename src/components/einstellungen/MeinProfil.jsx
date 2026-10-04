import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { SettingsBlock, SettingsRow, InputField } from '../ui/SettingsComponents'

export default function MeinProfil({ userRole, userName, onUserNameChange }) {
  const [sessionUser, setSessionUser] = useState(null)
  const [profileName, setProfileName] = useState(userName || '')
  const [isEditingName, setIsEditingName] = useState(false)
  const [isSavingName, setIsSavingName] = useState(false)

  // Password change state
  const [isEditingPassword, setIsEditingPassword] = useState(false)
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  // Preferences
  const [language, setLanguage] = useState('de-CH')
  const [notifyDueInvoices, setNotifyDueInvoices] = useState(true)
  const [notifyWeeklyReport, setNotifyWeeklyReport] = useState(false)

  const [toast, setToast] = useState(null)
  const showToast = (type, text) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSessionUser(session.user)
        const storedName = session.user.user_metadata?.full_name || userName || ''
        if (storedName) {
          setProfileName(storedName)
        }
        if (session.user.user_metadata?.notify_due !== undefined) {
          setNotifyDueInvoices(session.user.user_metadata.notify_due)
        }
        if (session.user.user_metadata?.notify_weekly !== undefined) {
          setNotifyWeeklyReport(session.user.user_metadata.notify_weekly)
        }
      }
    })
  }, [userName])

  const handleSaveName = async () => {
    const cleanName = profileName.trim()
    if (!cleanName) {
      showToast('error', 'Bitte gib einen Namen ein.')
      return
    }

    setIsSavingName(true)
    try {
      if (sessionUser?.id) {
        // 1. Update auth metadata (Primary source of truth for user profile)
        const { error: authErr } = await supabase.auth.updateUser({
          data: { full_name: cleanName }
        })
        if (authErr) throw authErr

        // 2. Best-effort update user_roles table
        try {
          await supabase
            .from('user_roles')
            .update({ user_name: cleanName })
            .eq('id', sessionUser.id)
        } catch (e) {
          console.warn('user_roles update non-critical fallback:', e)
        }

        // 3. Update active UI state across the app
        if (onUserNameChange) {
          onUserNameChange(cleanName)
        }
      }
      setIsEditingName(false)
      showToast('success', 'Name erfolgreich aktualisiert.')
    } catch (err) {
      console.error('Fehler beim Speichern des Namens:', err)
      showToast('error', 'Fehler: ' + (err.message || 'Konnte nicht gespeichert werden.'))
    } finally {
      setIsSavingName(false)
    }
  }

  const handleSavePassword = async () => {
    setPasswordError('')
    if (!passwords.newPassword || passwords.newPassword.length < 6) {
      setPasswordError('Das Passwort muss mindestens 6 Zeichen lang sein.')
      return
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError('Die Passwörter stimmen nicht überein.')
      return
    }

    setIsSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword
      })
      if (error) throw error

      setPasswords({ newPassword: '', confirmPassword: '' })
      setIsEditingPassword(false)
      showToast('success', 'Passwort erfolgreich geändert.')
    } catch (err) {
      console.error('Fehler bei Passwortänderung:', err)
      setPasswordError(err.message || 'Passwort konnte nicht geändert werden.')
    } finally {
      setIsSavingPassword(false)
    }
  }

  const roleLabels = {
    admin: 'Administrator (Vollzugriff)',
    team: 'Teammitglied',
    treuhand: 'Treuhand-Zugang (Buchhaltung)'
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* Profil Header Card */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white text-2xl font-black shadow-inner">
            {(profileName || sessionUser?.email || 'U').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-bold">{profileName || 'Benutzer'}</h3>
            <p className="text-white/80 text-sm">{sessionUser?.email || 'Wird geladen...'}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-xs text-white border border-white/20">
                {roleLabels[userRole] || userRole || 'Benutzer'}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Aktiv
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stammdaten des Benutzers */}
      <SettingsBlock
        title="Persönliche Angaben"
        description="Verwalte hier deinen Anzeigenamen und deine Anmeldedaten."
        isEditing={isEditingName}
        onEdit={() => setIsEditingName(true)}
        onCancel={() => { setIsEditingName(false); setProfileName(userName || ''); }}
        onSave={handleSaveName}
        isSaving={isSavingName}
        readOnlyView={
          <>
            <SettingsRow label="Vollständiger Name" value={profileName || <span className="text-text-secondary italic">Nicht hinterlegt</span>} />
            <SettingsRow label="E-Mail-Adresse" value={sessionUser?.email || ''} />
            <SettingsRow label="Systemrolle" value={roleLabels[userRole] || userRole || 'Admin'} />
          </>
        }
      >
        <InputField 
          label="Vollständiger Name" 
          value={profileName} 
          onChange={setProfileName} 
          placeholder="z.B. Martin Spöri" 
          fullWidth
        />
        <div className="md:col-span-2 text-xs text-text-secondary">
          Deine E-Mail-Adresse ({sessionUser?.email}) ist mit deinem Konto verknüpft und dient zur Anmeldung.
        </div>
      </SettingsBlock>

      {/* Sicherheit & Passwort */}
      <SettingsBlock
        title="Sicherheit & Passwort"
        description="Ändere hier dein persönliches Anmeldepasswort."
        isEditing={isEditingPassword}
        onEdit={() => { setIsEditingPassword(true); setPasswords({ newPassword: '', confirmPassword: '' }); setPasswordError(''); }}
        onCancel={() => { setIsEditingPassword(false); setPasswordError(''); }}
        onSave={handleSavePassword}
        isSaving={isSavingPassword}
        readOnlyView={
          <>
            <SettingsRow label="Passwort" value="••••••••••••" />
            <SettingsRow label="2-Faktor-Authentifizierung" value={<span className="text-xs text-text-secondary">Optional via Supabase Auth</span>} />
          </>
        }
      >
        <div className="md:col-span-2 space-y-4">
          <div className="relative">
            <InputField 
              label="Neues Passwort (mind. 6 Zeichen)" 
              type={showPassword ? 'text' : 'password'}
              value={passwords.newPassword} 
              onChange={v => setPasswords(p => ({ ...p, newPassword: v }))} 
              placeholder="••••••••"
              fullWidth
            />
          </div>
          <div>
            <InputField 
              label="Neues Passwort bestätigen" 
              type={showPassword ? 'text' : 'password'}
              value={passwords.confirmPassword} 
              onChange={v => setPasswords(p => ({ ...p, confirmPassword: v }))} 
              placeholder="••••••••"
              fullWidth
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input 
              type="checkbox" 
              id="show-pw" 
              checked={showPassword} 
              onChange={e => setShowPassword(e.target.checked)} 
              className="rounded border-border text-primary-600 focus:ring-primary-500 cursor-pointer"
            />
            <label htmlFor="show-pw" className="text-xs text-text-secondary cursor-pointer select-none">Passwörter im Klartext anzeigen</label>
          </div>
          {passwordError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {passwordError}
            </div>
          )}
        </div>
      </SettingsBlock>

      {/* Sprache & Lokalisierung (wie extro.swiss) */}
      <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-base font-bold text-text-primary">Sprache & Region</h4>
            <p className="text-xs text-text-secondary mt-0.5">Sprache der Benutzeroberfläche und Schweizer Zahlen- & Datumsformate.</p>
          </div>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
            Standard: Deutsch (CH)
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border-2 border-primary-500 bg-primary-50/20 flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <span className="text-xl">🇨🇭</span>
              <div>
                <p className="text-sm font-bold text-text-primary">Deutsch (Schweiz)</p>
                <p className="text-xs text-text-secondary">CHF, 30.12.2026, QR-Rechnungen</p>
              </div>
            </div>
            <span className="text-primary-600 font-bold">✓</span>
          </div>
          <div className="p-4 rounded-xl border border-dashed border-border bg-surface opacity-60 flex items-center justify-between cursor-not-allowed" title="In Kürze verfügbar">
            <div className="flex items-center gap-3">
              <span className="text-xl">🇫🇷</span>
              <div>
                <p className="text-sm font-bold text-text-secondary">Français (Suisse)</p>
                <p className="text-xs text-text-secondary">Demnächst verfügbar</p>
              </div>
            </div>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Bald</span>
          </div>
        </div>
      </div>

      {/* Benachrichtigungen */}
      <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm">
        <h4 className="text-base font-bold text-text-primary mb-1">E-Mail Benachrichtigungen</h4>
        <p className="text-xs text-text-secondary mb-4">Bestimme, bei welchen Ereignissen du per E-Mail informiert werden möchtest.</p>
        
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-xl hover:bg-surface transition-colors cursor-pointer border border-transparent hover:border-border">
            <div>
              <p className="text-sm font-semibold text-text-primary">Überfällige Rechnungen & Mahnungen</p>
              <p className="text-xs text-text-secondary">Automatische Erinnerung, sobald eine Kundenrechnung die Zahlungsfrist überschreitet.</p>
            </div>
            <input 
              type="checkbox" 
              checked={notifyDueInvoices} 
              onChange={async (e) => {
                const val = e.target.checked
                setNotifyDueInvoices(val)
                try {
                  await supabase.auth.updateUser({ data: { notify_due: val } })
                  showToast('success', 'Einstellung gespeichert')
                } catch (err) {
                  console.error('Save notification error:', err)
                }
              }}
              className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
            />
          </label>
          <label className="flex items-center justify-between p-3 rounded-xl hover:bg-surface transition-colors cursor-pointer border border-transparent hover:border-border">
            <div>
              <p className="text-sm font-semibold text-text-primary">Wöchentliche Zusammenfassung</p>
              <p className="text-xs text-text-secondary">Montagsübersicht offener Offerten, anstehender Termine und erfasster Einnahmen.</p>
            </div>
            <input 
              type="checkbox" 
              checked={notifyWeeklyReport} 
              onChange={async (e) => {
                const val = e.target.checked
                setNotifyWeeklyReport(val)
                try {
                  await supabase.auth.updateUser({ data: { notify_weekly: val } })
                  showToast('success', 'Einstellung gespeichert')
                } catch (err) {
                  console.error('Save notification error:', err)
                }
              }}
              className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
            />
          </label>
        </div>
      </div>
    </div>
  )
}
