import { useState } from 'react'
import { supabase } from '../lib/supabase'
import AddressAutocomplete from '../components/AddressAutocomplete'
import { useAutoAnimate } from '@formkit/auto-animate/react'

const KUNDENTYPEN = [
  'Privatperson',
  'Architekturbüro',
  'Liegenschaftsverwaltung',
  'Generalunternehmung (GU)',
  'Geschäftskunde (Allgemein)'
];

export default function KundeCreateModal({ onClose, onSuccess }) {
  const [parent] = useAutoAnimate()
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
  const [submitted, setSubmitted] = useState(false)

  const isMissingName = !formData.firmenname?.trim() && !formData.nachname?.trim();
  const isValidEmail = !formData.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitted(true)
    setIsSaving(true)
    setError(null)

    if (isMissingName) {
      setError('Bitte Firmenname oder Nachname eingeben.')
      setIsSaving(false)
      return
    }

    if (!isValidEmail) {
      setError('Bitte eine gültige E-Mail Adresse eingeben.')
      setIsSaving(false)
      return
    }

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

  const hasNameError = submitted && isMissingName;
  const hasEmailError = submitted && !isValidEmail;

  return (
    <>
      <div 
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 transition-opacity animate-fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col md:flex-row overflow-hidden pointer-events-auto transform transition-all animate-scale-up max-h-[95vh] md:max-h-[90vh]">
          
          {/* Left Side: Visual / Premium Panel */}
          <div className="hidden md:flex flex-col md:w-5/12 bg-primary-900 text-white p-10 relative overflow-hidden shrink-0">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary-600 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-500 rounded-full blur-3xl opacity-30"></div>
            
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-3xl mb-8 backdrop-blur-md border border-white/20 shadow-xl">
                👤
              </div>
              
              <h2 className="text-3xl font-bold mb-4 leading-tight">
                Neuen Kunden anlegen
              </h2>
              
              <p className="text-primary-100 text-lg mb-8 leading-relaxed">
                Erfasse die wichtigsten Kontaktdaten. Weitere Details und Dokumente kannst du später in der Kundenansicht ergänzen.
              </p>
              
              <div className="mt-auto flex flex-col gap-4 text-sm text-primary-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-800/50 flex items-center justify-center">✓</div>
                  <span>Zentrale Kundenverwaltung</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-800/50 flex items-center justify-center">✓</div>
                  <span>Automatische Adressvervollständigung</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/30 relative">
            
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white sticky top-0 z-10 md:hidden">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                👤 Neuer Kunde
              </h2>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="hidden md:block absolute top-4 right-4 z-20">
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 bg-white hover:bg-gray-100 rounded-full shadow-sm transition-colors cursor-pointer border border-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar" ref={parent}>
                {error && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-center gap-3">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {error}
                  </div>
                )}

                {/* Stammdaten Section */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">🏢</span>
                    <h3 className="text-lg font-bold text-gray-900">Stammdaten</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kundentyp</label>
                      <select 
                        value={formData.typ}
                        onChange={e => setFormData({...formData, typ: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all shadow-sm"
                      >
                        <option value="">-- Bitte wählen --</option>
                        {KUNDENTYPEN.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Firmenname {hasNameError && <span className="text-red-500 font-normal ml-1">(Pflichtfeld)</span>}
                      </label>
                      <input 
                        type="text" 
                        value={formData.firmenname}
                        onChange={e => setFormData({...formData, firmenname: e.target.value})}
                        className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all shadow-sm ${hasNameError ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50/30' : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/20'}`}
                        placeholder="z.B. Maler AG"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Vorname</label>
                      <input 
                        type="text" 
                        value={formData.vorname}
                        onChange={e => setFormData({...formData, vorname: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all shadow-sm"
                        placeholder="Max"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Nachname {hasNameError && <span className="text-red-500 font-normal ml-1">(Pflichtfeld)</span>}
                      </label>
                      <input 
                        type="text" 
                        value={formData.nachname}
                        onChange={e => setFormData({...formData, nachname: e.target.value})}
                        className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all shadow-sm ${hasNameError ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50/30' : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/20'}`}
                        placeholder="Mustermann"
                      />
                    </div>
                  </div>
                  {hasNameError && <p className="text-sm text-red-500 mt-2 font-medium">Geben Sie entweder einen Firmennamen oder einen Nachnamen an.</p>}
                </div>

                <div className="h-px bg-gray-200 w-full"></div>

                {/* Kontakt Section */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">📍</span>
                    <h3 className="text-lg font-bold text-gray-900">Kontakt & Adresse</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        E-Mail {hasEmailError && <span className="text-red-500 font-normal ml-1">(Ungültig)</span>}
                      </label>
                      <input 
                        type="email" 
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all shadow-sm ${hasEmailError ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50/30' : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/20'}`}
                        placeholder="info@beispiel.ch"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Telefon</label>
                      <input 
                        type="text" 
                        value={formData.telefon}
                        onChange={e => setFormData({...formData, telefon: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all shadow-sm"
                        placeholder="z.B. 079 123 45 67"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Strasse (Auto-Fill)</label>
                      <AddressAutocomplete 
                        value={formData.strasse}
                        onChange={(val, details) => {
                          if (details) {
                            setFormData(prev => ({...prev, strasse: details.strasse, plz: details.plz, ort: details.ort}))
                          } else {
                            setFormData(prev => ({...prev, strasse: val}))
                          }
                        }}
                        placeholder="Adresse suchen..."
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all shadow-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">PLZ</label>
                      <input 
                        type="text" 
                        value={formData.plz}
                        onChange={e => setFormData({...formData, plz: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all shadow-sm"
                        placeholder="8000"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ort</label>
                      <input 
                        type="text" 
                        value={formData.ort}
                        onChange={e => setFormData({...formData, ort: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all shadow-sm"
                        placeholder="Zürich"
                      />
                    </div>
                  </div>
                </div>

                <div className="h-px bg-gray-200 w-full"></div>

                {/* Notizen Section */}
                <div className="space-y-5 pb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">📝</span>
                    <h3 className="text-lg font-bold text-gray-900">Interne Notizen</h3>
                  </div>
                  <textarea 
                    value={formData.notizen}
                    onChange={e => setFormData({...formData, notizen: e.target.value})}
                    className="w-full h-32 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all shadow-sm resize-none"
                    placeholder="Wichtige Hinweise, Konditionen oder Besonderheiten zum Kunden..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 border-t border-gray-100 bg-white/80 backdrop-blur-md shrink-0 flex justify-end gap-3 rounded-br-3xl">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-6 py-2.5 text-sm font-bold text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  Abbrechen
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="px-8 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-primary-600/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Speichert...
                    </>
                  ) : 'Kunde erstellen'}
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>
    </>
  )
}
