import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function EinstellungenView() {
  const [settings, setSettings] = useState({
    firmenname: '',
    uid: '',
    adresse: '',
    telefon: '',
    bankverbindung: '',
    standard_mwst: 8.1,
    standard_rabatt: 0,
    zahlungsfrist_tage: 30,
    startnummer_offerten: 1000
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [saveStatus, setSaveStatus] = useState(null) // null | 'success' | 'error'

  useEffect(() => {
    async function loadSettings() {
      if (!supabase) return
      setIsLoading(true)
      const { data, error } = await supabase.from('einstellungen').select('*').eq('id', 1).single()
      if (data) {
        setSettings(data)
      } else if (error && error.code === 'PGRST116') {
        // Not found, we can insert a default row
        await supabase.from('einstellungen').insert([{ id: 1, ...settings }])
      }
      setIsLoading(false)
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    if (!supabase) return
    setIsSaving(true)
    setSaveStatus(null)
    try {
      await supabase.from('einstellungen').upsert({ id: 1, ...settings })
      setSaveStatus('success')
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (error) {
      console.error('Fehler beim Speichern:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 4000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  if (isLoading) {
    return <div className="flex flex-col gap-4 p-6 w-full animate-pulse bg-surface-card rounded-2xl border border-border shadow-sm"><div className="h-6 bg-gray-200 rounded w-1/4"></div><div className="h-20 bg-gray-200 rounded w-full"></div><div className="h-20 bg-gray-200 rounded w-full"></div></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Einstellungen</h2>
        <p className="text-text-secondary mt-1">Konto- und Firmeneinstellungen verwalten.</p>
      </div>

      <div className="space-y-4">
        {/* Company info */}
        <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Firmeninformationen</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Firmenname</label>
              <input
                type="text"
                value={settings.firmenname || ''}
                onChange={e => handleChange('firmenname', e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">UID-Nummer</label>
              <input
                type="text"
                value={settings.uid || ''}
                onChange={e => handleChange('uid', e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Adresse</label>
              <input
                type="text"
                value={settings.adresse || ''}
                onChange={e => handleChange('adresse', e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Telefon</label>
              <input
                type="text"
                value={settings.telefon || ''}
                onChange={e => handleChange('telefon', e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Bankverbindung (IBAN)</label>
              <input
                type="text"
                value={settings.bankverbindung || ''}
                onChange={e => handleChange('bankverbindung', e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Offerten defaults */}
        <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Offerten-Standards</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Standard-MwSt (%)</label>
              <input
                type="number"
                step="0.1"
                value={settings.standard_mwst}
                onChange={e => handleChange('standard_mwst', e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Standard-Rabatt (%)</label>
              <input
                type="number"
                step="0.1"
                value={settings.standard_rabatt}
                onChange={e => handleChange('standard_rabatt', e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Zahlungsfrist (Tage)</label>
              <input
                type="number"
                value={settings.zahlungsfrist_tage}
                onChange={e => handleChange('zahlungsfrist_tage', e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Nummernkreise</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Startnummer Offerten</label>
              <input
                type="number"
                value={settings.startnummer_offerten}
                onChange={e => handleChange('startnummer_offerten', e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Save button and Notification */}
        <div className="flex items-center justify-end gap-4 pb-8">
          {saveStatus === 'success' && (
            <div className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl animate-fade-in border border-emerald-200">
              ✅ Erfolgreich gespeichert
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="text-sm font-semibold text-red-600 bg-red-50 px-4 py-2 rounded-xl animate-fade-in border border-red-200">
              ❌ Fehler beim Speichern
            </div>
          )}
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className={`inline-flex items-center gap-2 px-6 py-2.5 font-semibold text-sm rounded-xl transition-all shadow-md cursor-pointer ${
              isSaving 
                ? 'bg-primary-300 text-white cursor-wait' 
                : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-[0.97] shadow-primary-600/20'
            }`}
          >
            {isSaving ? 'Speichert...' : 'Einstellungen speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}

