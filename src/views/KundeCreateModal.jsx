import { useState } from 'react'
import { supabase } from '../lib/supabase'
import AddressAutocomplete from '../components/AddressAutocomplete'

const KUNDENTYPEN = [
  'Privatperson',
  'Architekturbüro',
  'Liegenschaftsverwaltung',
  'Generalunternehmung (GU)',
  'Geschäftskunde (Allgemein)'
];

export default function KundeCreateModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    typ: '',
    firmenname: '',
    vorname: '',
    nachname: '',
    strasse: '',
    plz: '',
    ort: '',
    telefon: '',
    email: '',
    notizen: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    // Validation: Ensure we have at least a last name OR a company name
    if (!formData.firmenname?.trim() && !formData.nachname?.trim()) {
      setError('Bitte Firmenname oder Nachname eingeben.')
      setIsSaving(false)
      return
    }

    // Build the legacy `name` field for backwards compatibility
    const displayName = formData.firmenname?.trim()
      ? `${formData.firmenname} ${formData.vorname || ''} ${formData.nachname || ''}`.trim()
      : `${formData.vorname || ''} ${formData.nachname || ''}`.trim()

    try {
      const { data, error: insertError } = await supabase
        .from('kunden')
        .insert([{
          name: displayName,
          typ: formData.typ,
          firmenname: formData.firmenname,
          vorname: formData.vorname,
          nachname: formData.nachname,
          strasse: formData.strasse,
          plz: formData.plz,
          ort: formData.ort,
          telefon: formData.telefon,
          email: formData.email,
          notizen: formData.notizen,
          status: 'Aktiv'
        }])
        .select()

      if (insertError) throw insertError

      if (data && data.length > 0) {
        onSuccess(data[0])
      }
    } catch (err) {
      console.error('Failed to create kunde:', err)
      setError('Fehler beim Erstellen des Kunden.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface rounded-2xl shadow-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-surface z-10">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <span>👤</span> Neuer Kunde
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
            <h3 className="text-sm font-semibold text-text-primary border-b border-border pb-2">Name, Firma & Typ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">Kundentyp</label>
                <select 
                  value={formData.typ}
                  onChange={e => setFormData({...formData, typ: e.target.value})}
                  className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                >
                  <option value="">-- Bitte wählen --</option>
                  {KUNDENTYPEN.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">Firmenname</label>
                <input 
                  type="text" 
                  value={formData.firmenname}
                  onChange={e => setFormData({...formData, firmenname: e.target.value})}
                  className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                  placeholder="z.B. Maler AG"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Vorname</label>
                <input 
                  type="text" 
                  value={formData.vorname}
                  onChange={e => setFormData({...formData, vorname: e.target.value})}
                  className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Nachname</label>
                <input 
                  type="text" 
                  value={formData.nachname}
                  onChange={e => setFormData({...formData, nachname: e.target.value})}
                  className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary border-b border-border pb-2">Kontakt & Adresse</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">E-Mail</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Telefon</label>
                <input 
                  type="text" 
                  value={formData.telefon}
                  onChange={e => setFormData({...formData, telefon: e.target.value})}
                  className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">Strasse</label>
                <AddressAutocomplete 
                  value={formData.strasse}
                  onChange={val => setFormData({...formData, strasse: val})}
                  placeholder="Strasse eingeben (Auto-Fill)..."
                  className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">PLZ</label>
                <input 
                  type="text" 
                  value={formData.plz}
                  onChange={e => setFormData({...formData, plz: e.target.value})}
                  className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Ort</label>
                <input 
                  type="text" 
                  value={formData.ort}
                  onChange={e => setFormData({...formData, ort: e.target.value})}
                  className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary border-b border-border pb-2">Intern</h3>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Interne Notizen</label>
              <textarea 
                value={formData.notizen}
                onChange={e => setFormData({...formData, notizen: e.target.value})}
                className="w-full h-24 px-3 py-2 bg-surface-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none"
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
              disabled={isSaving}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              {isSaving ? 'Speichert...' : 'Kunde erstellen'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
