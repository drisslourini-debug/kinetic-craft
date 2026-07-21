import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AddressAutocomplete from '../components/AddressAutocomplete'

const PROJEKT_KATEGORIEN = [
  'Neubau',
  'Umbau / Renovation',
  'Reparatur / Service',
  'Sanierung'
];

export default function ProjektCreateModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    kunden_id: '',
    kategorie: '',
    adresse: '',
  })
  const [kunden, setKunden] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingKunden, setIsLoadingKunden] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchKunden() {
      try {
        const { data, error } = await supabase
          .from('kunden')
          .select('id, name')
          .order('name', { ascending: true })
        
        if (error) throw error
        setKunden(data || [])
      } catch (err) {
        console.error('Failed to load kunden:', err)
        setError('Kunden konnten nicht geladen werden.')
      } finally {
        setIsLoadingKunden(false)
      }
    }
    fetchKunden()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name?.trim() || !formData.kunden_id) {
      setError('Bitte Projektname und Kunde angeben.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const { data, error: insertError } = await supabase
        .from('projekte')
        .insert([{
          name: formData.name,
          kunden_id: formData.kunden_id,
          kategorie: formData.kategorie,
          adresse: formData.adresse,
          status: 'Aktiv'
        }])
        .select('*, kunden(name)') // Select related data for instant UI update

      if (insertError) throw insertError

      if (data && data.length > 0) {
        onSuccess(data[0])
      }
    } catch (err) {
      console.error('Failed to create projekt:', err)
      setError('Fehler beim Erstellen des Projekts.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface rounded-2xl shadow-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-surface z-10">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <span>🏗️</span> Neues Projekt
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-card rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Zugewiesener Kunde *
              </label>
              {isLoadingKunden ? (
                <div className="text-sm text-text-secondary">Lade Kunden...</div>
              ) : (
                <select
                  value={formData.kunden_id}
                  onChange={e => setFormData({...formData, kunden_id: e.target.value})}
                  className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                >
                  <option value="">Bitte Kunden auswählen...</option>
                  {kunden.map(kunde => (
                    <option key={kunde.id} value={kunde.id}>
                      {kunde.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Projektname *
              </label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                placeholder="z.B. Fassadensanierung Meier"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Kategorie
              </label>
              <select
                value={formData.kategorie}
                onChange={e => setFormData({...formData, kategorie: e.target.value})}
                className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
              >
                <option value="">-- Bitte wählen --</option>
                {PROJEKT_KATEGORIEN.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Baustellen-Adresse
              </label>
              <AddressAutocomplete 
                value={formData.adresse}
                onChange={val => setFormData({...formData, adresse: val})}
                placeholder="Strasse eingeben (Auto-Fill)..."
                className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3 sticky bottom-0 bg-surface -mx-6 -mb-6 p-6">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-text-secondary bg-surface-card hover:bg-surface border border-border rounded-xl transition-colors cursor-pointer"
            >
              Abbrechen
            </button>
            <button 
              type="submit" 
              disabled={isSaving || !formData.name.trim() || !formData.kunden_id}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              {isSaving ? 'Speichert...' : 'Projekt erstellen'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
