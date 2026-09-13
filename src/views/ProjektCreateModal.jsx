import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AddressAutocomplete from '../components/AddressAutocomplete'

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

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col md:flex-row overflow-hidden pointer-events-auto transform transition-all animate-scale-up max-h-[95vh] md:max-h-[85vh]">
          
          {/* Left Side: Visual / Premium Panel */}
          <div className="hidden md:flex flex-col md:w-5/12 bg-primary-900 text-white p-10 relative overflow-hidden shrink-0">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary-600 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-500 rounded-full blur-3xl opacity-30"></div>
            
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-3xl mb-8 backdrop-blur-md border border-white/20 shadow-xl">
                🏗️
              </div>
              
              <h2 className="text-3xl font-bold mb-4 leading-tight">
                Neues Projekt anlegen
              </h2>
              
              <p className="text-primary-100 text-lg mb-8 leading-relaxed">
                Verknüpfe dieses Projekt mit einem bestehenden Kunden, weise eine Kategorie zu und speichere die Objektadresse ab.
              </p>
              
              <div className="mt-auto flex flex-col gap-4 text-sm text-primary-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-800/50 flex items-center justify-center">✓</div>
                  <span>Ortsgebundene Projekte verwalten</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-800/50 flex items-center justify-center">✓</div>
                  <span>Übersichtliche Zuordnung zum Kunden</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/30 relative">
            
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white sticky top-0 z-10 md:hidden">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                🏗️ Neues Projekt
              </h2>
              <button onClick={onClose} className="p-3 sm:p-2 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors cursor-pointer flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="hidden md:block absolute top-4 right-4 z-20">
              <button onClick={onClose} className="p-3 sm:p-2 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 text-gray-400 hover:text-gray-900 bg-white hover:bg-gray-100 rounded-full shadow-sm transition-colors cursor-pointer border border-gray-100 flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar">
                {error && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-center gap-3">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {error}
                  </div>
                )}

                <div className="space-y-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">📋</span>
                    <h3 className="text-lg font-bold text-gray-900">Projekt Details</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Kunde <span className="text-red-500">*</span>
                      </label>
                      {isLoadingKunden ? (
                        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 animate-pulse">Lade Kunden...</div>
                      ) : (
                        <select
                          value={formData.kunden_id}
                          onChange={e => setFormData({...formData, kunden_id: e.target.value})}
                          className={`w-full px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-white border rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all shadow-sm text-base sm:text-sm ${!formData.kunden_id && submitted ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50/30' : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/20'}`}
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
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Projektname <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className={`w-full px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-white border rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all shadow-sm text-base sm:text-sm ${!formData.name?.trim() && submitted ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50/30' : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/20'}`}
                        placeholder="z.B. Fassadensanierung Meier"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kategorie</label>
                      <select 
                        value={formData.kategorie}
                        onChange={e => setFormData({...formData, kategorie: e.target.value})}
                        className="w-full px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all shadow-sm text-base sm:text-sm"
                      >
                        <option value="">-- Bitte wählen --</option>
                        {PROJEKT_KATEGORIEN.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Baustellen-Adresse</label>
                      <AddressAutocomplete 
                        value={formData.adresse}
                        onChange={val => setFormData({...formData, adresse: val})}
                        placeholder="Strasse eingeben (Auto-Fill)..."
                        className="w-full px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all shadow-sm text-base sm:text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:col-span-2 pt-1 border-t border-gray-100">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          📅 Geplanter Start (optional)
                        </label>
                        <input 
                          type="date" 
                          value={formData.startdatum}
                          onChange={e => setFormData({...formData, startdatum: e.target.value})}
                          className="w-full px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all shadow-sm text-base sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          📅 Geplantes Ende (optional)
                        </label>
                        <input 
                          type="date" 
                          value={formData.enddatum}
                          min={formData.startdatum}
                          onChange={e => setFormData({...formData, enddatum: e.target.value})}
                          className="w-full px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all shadow-sm text-base sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 sm:p-6 border-t border-gray-100 bg-white/80 backdrop-blur-md shrink-0 flex flex-col sm:flex-row justify-end gap-3 rounded-br-3xl">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="w-full sm:w-auto min-h-[48px] px-6 py-3 sm:py-2.5 text-base sm:text-sm font-bold text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  Abbrechen
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving || !formData.name.trim() || !formData.kunden_id}
                  className="w-full sm:w-auto min-h-[48px] px-8 py-3 sm:py-2.5 text-base sm:text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-primary-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
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
      </div>
    </>
  )
}
