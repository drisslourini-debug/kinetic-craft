import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AddressAutocomplete from '../components/AddressAutocomplete'
import VoiceWaveformModal from '../components/ui/VoiceWaveformModal'
import { IconBauunternehmung, IconMic, IconSparkles, IconCalendar } from '../components/icons/BrandIcons'

const PROJEKT_KATEGORIEN = [
  'Neubau',
  'Umbau / Renovation',
  'Reparatur / Service',
  'Sanierung'
];

export default function ProjektCreateModal({ onClose, onSuccess, prefilledKundeId }) {
  const [formData, setFormData] = useState({
    name: '',
    kunden_id: prefilledKundeId || '',
    kategorie: '',
    adresse: '',
    startdatum: '',
    enddatum: '',
  })
  const [kunden, setKunden] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingKunden, setIsLoadingKunden] = useState(true)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [showVoiceModal, setShowVoiceModal] = useState(false)
  const [aiFields, setAiFields] = useState({})

  const handleVoiceProjectExtracted = (data) => {
    if (!data) return
    setFormData(prev => ({
      ...prev,
      name: data.name || prev.name,
      kunden_id: data.kunden_id || prev.kunden_id,
      kategorie: data.kategorie || prev.kategorie || 'Umbau / Renovation',
      adresse: data.adresse || prev.adresse,
      startdatum: data.startdatum || prev.startdatum,
      enddatum: data.enddatum || prev.enddatum
    }))
    setAiFields({
      name: !!data.name,
      kunden_id: !!data.kunden_id,
      kategorie: !!data.kategorie,
      adresse: !!data.adresse,
      startdatum: !!data.startdatum,
      enddatum: !!data.enddatum
    })
  }

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
    setSubmitted(true)
    
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
          startdatum: formData.startdatum || null,
          enddatum: formData.enddatum || null,
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
    <>
      <div 
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 transition-opacity animate-fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 pointer-events-none">
        <div role="dialog" aria-modal="true" className="bg-white rounded-t-[28px] sm:rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden pointer-events-auto transform transition-all animate-slide-up sm:animate-scale-up max-h-[92dvh] sm:max-h-[90vh] border border-border pb-[env(safe-area-inset-bottom)] sm:pb-0">
          
          {/* Mobile Pull Handle */}
          <div className="w-full pt-3 pb-1.5 flex justify-center sm:hidden shrink-0 touch-action-manipulation cursor-pointer" onClick={onClose}>
            <div className="w-12 h-1.5 bg-neutral-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-border bg-surface/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center text-xl shrink-0 border border-primary-200/60">
                <IconBauunternehmung className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-text-primary">Neues Projekt anlegen</h2>
                <p className="text-xs text-text-secondary hidden sm:block">Baustelle oder Auftrag erfassen und einem Kunden zuweisen.</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={onClose} 
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 p-6 space-y-5 overflow-y-auto">
              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-center gap-3">
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {error}
                </div>
              )}

              {/* Space-Age Voice Project Banner */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-primary-500/10 to-emerald-500/10 border border-amber-500/20 shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-700 font-bold text-base shrink-0">
                    <IconMic className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900">Sprach-Projektanlage (KI)</h4>
                    <p className="text-[11px] text-gray-500 hidden sm:block">Projektname, Kunde & Zeitraum frei einsprechen (Schweizerdeutsch & Hochdeutsch).</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVoiceModal(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                >
                  <IconSparkles className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                  <span>Per Sprache erfassen</span>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                      Kunde <span className="text-red-500">*</span>
                    </label>
                    {aiFields.kunden_id && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <IconSparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>KI Match</span>
                      </span>
                    )}
                  </div>
                  {isLoadingKunden ? (
                    <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 text-sm animate-pulse">Lade Kunden...</div>
                  ) : (
                    <select
                      value={formData.kunden_id}
                      onChange={e => setFormData({...formData, kunden_id: e.target.value})}
                      className={`w-full px-3.5 py-3 sm:py-2.5 bg-surface border rounded-xl text-text-primary text-base sm:text-sm focus:outline-none focus:ring-2 transition-all ${!formData.kunden_id && submitted ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50/30' : 'border-border focus:border-primary-500 focus:ring-primary-500/20'}`}
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                      Projektname <span className="text-red-500">*</span>
                    </label>
                    {aiFields.name && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <IconSparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>KI</span>
                      </span>
                    )}
                  </div>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className={`w-full px-3.5 py-3 sm:py-2.5 bg-surface border rounded-xl text-text-primary text-base sm:text-sm focus:outline-none focus:ring-2 transition-all ${!formData.name?.trim() && submitted ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50/30' : 'border-border focus:border-primary-500 focus:ring-primary-500/20'}`}
                    placeholder="z.B. Fassadensanierung Meier"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">Kategorie</label>
                      {aiFields.kategorie && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                          <IconSparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>KI</span>
                        </span>
                      )}
                    </div>
                    <select 
                      value={formData.kategorie}
                      onChange={e => setFormData({...formData, kategorie: e.target.value})}
                      className="w-full px-3.5 py-3 sm:py-2.5 bg-surface border border-border rounded-xl text-text-primary text-base sm:text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                    >
                      <option value="">-- Bitte wählen --</option>
                      {PROJEKT_KATEGORIEN.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">Baustellen-Adresse</label>
                      {aiFields.adresse && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                          <IconSparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>KI</span>
                        </span>
                      )}
                    </div>
                    <AddressAutocomplete 
                      value={formData.adresse}
                      onChange={val => setFormData({...formData, adresse: val})}
                      placeholder="Strasse eingeben (Auto-Fill)..."
                      className="w-full px-3.5 py-3 sm:py-2.5 bg-surface border border-border rounded-xl text-text-primary text-base sm:text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1">
                        <IconCalendar className="w-3.5 h-3.5 text-text-muted shrink-0" />
                        <span>Geplanter Start (optional)</span>
                      </label>
                      {aiFields.startdatum && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                          <IconSparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>KI</span>
                        </span>
                      )}
                    </div>
                    <input 
                      type="date" 
                      value={formData.startdatum}
                      onChange={e => setFormData({...formData, startdatum: e.target.value})}
                      className="w-full px-3.5 py-3 sm:py-2.5 bg-surface border border-border rounded-xl text-text-primary text-base sm:text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1">
                        <IconCalendar className="w-3.5 h-3.5 text-text-muted shrink-0" />
                        <span>Geplantes Ende (optional)</span>
                      </label>
                      {aiFields.enddatum && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                          <IconSparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>KI</span>
                        </span>
                      )}
                    </div>
                    <input 
                      type="date" 
                      value={formData.enddatum}
                      min={formData.startdatum}
                      onChange={e => setFormData({...formData, enddatum: e.target.value})}
                      className="w-full px-3.5 py-3 sm:py-2.5 bg-surface border border-border rounded-xl text-text-primary text-base sm:text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-t border-border bg-surface/90 backdrop-blur-md shrink-0 flex items-center justify-end gap-3">
              <button 
                type="button" 
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-3 sm:py-2.5 text-sm font-semibold text-text-secondary hover:text-text-primary bg-surface border border-border rounded-xl hover:bg-neutral-50 active:scale-95 transition-all min-h-[48px] sm:min-h-[40px] touch-action-manipulation cursor-pointer"
              >
                Abbrechen
              </button>
              <button 
                type="submit" 
                disabled={isSaving || !formData.name.trim() || !formData.kunden_id}
                className="flex-1 sm:flex-none px-6 py-3 sm:py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-primary-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[48px] sm:min-h-[40px] touch-action-manipulation"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Speichert...
                  </>
                ) : 'Projekt erstellen'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <VoiceWaveformModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onSuccess={handleVoiceProjectExtracted}
        title="Projekt per Sprache anlegen"
        subtitle="Sprechen Sie Projektname, Kunde, Kategorie und Ausführungszeitraum frei ein (Schweizerdeutsch & Hochdeutsch)."
        mode="projekt"
        contextData={{ kunden }}
      />
    </>
  )
}