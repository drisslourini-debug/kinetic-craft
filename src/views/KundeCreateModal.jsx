import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AddressAutocomplete from '../components/AddressAutocomplete'
import ZefixAutocomplete from '../components/ZefixAutocomplete'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { ANREDE_OPTIONS, generateNextCustomerNumber } from '../lib/customerNaming'

const KUNDENTYPEN = [
  'Privatperson',
  'Architekturbüro',
  'Liegenschaftsverwaltung',
  'Generalunternehmung (GU)',
  'Geschäftskunde (Allgemein)'
];

export default function KundeCreateModal({ onClose, onSuccess }) {
  const [parent] = useAutoAnimate()
  const [showZefix, setShowZefix] = useState(false)
  const [zefixSuccess, setZefixSuccess] = useState(false)
  const [formData, setFormData] = useState({
    anrede: 'Firma',
    kundennummer: '',
    typ: 'Geschäftskunde (Allgemein)',
    firmenname: '',
    vorname: '',
    nachname: '',
    strasse: '',
    plz: '',
    ort: '',
    land: 'Schweiz',
    telefon: '',
    email: '',
    website: '',
    notizen: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  // Auto-generate customer number from settings and existing customer list
  useEffect(() => {
    async function initCustomerNumber() {
      if (!supabase) return
      try {
        const [settingsRes, kundenRes] = await Promise.all([
          supabase.from('einstellungen').select('prefix_kunden, startnummer_kunden').limit(1).maybeSingle(),
          supabase.from('kunden').select('kundennummer')
        ])

        const prefix = settingsRes.data?.prefix_kunden || 'K-'
        const startNumber = settingsRes.data?.startnummer_kunden || 1000
        const existing = kundenRes.data || []

        const nextNr = generateNextCustomerNumber({
          prefix,
          startNumber,
          existingCustomers: existing
        })

        setFormData(prev => ({
          ...prev,
          kundennummer: prev.kundennummer || nextNr
        }))
      } catch (err) {
        console.warn('Could not auto-generate customer number:', err)
      }
    }
    initCustomerNumber()
  }, [])

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
          anrede: formData.anrede || 'Firma',
          kundennummer: formData.kundennummer?.trim() || null,
          typ: formData.typ,
          firmenname: formData.firmenname,
          vorname: formData.vorname,
          nachname: formData.nachname,
          strasse: formData.strasse,
          plz: formData.plz,
          ort: formData.ort,
          land: formData.land || 'Schweiz',
          telefon: formData.telefon,
          email: formData.email,
          website: formData.website,
          notizen: formData.notizen,
          status: 'Aktiv',
          zahlungsziel: '30 Tage netto'
        }])
        .select()

      if (insertError) throw insertError

      if (data && data.length > 0) {
        onSuccess(data[0])
      }
    } catch (err) {
      console.error('Failed to create kunde:', err)
      const isRls = err.message?.includes('row-level security policy')
      const msg = isRls
        ? 'Fehler beim Erstellen des Kunden: Fehlende Mandanten-Berechtigung (RLS). Dein Benutzerkonto ist keinem Mandanten zugewiesen. Bitte führe das Skript "supabase_fix_user_roles.sql" in Supabase aus oder lade die Seite neu.'
        : 'Fehler beim Erstellen des Kunden: ' + (err.message || '')
      setError(msg)
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
                Erfasse die wichtigsten Kontaktdaten. Mit automatischer Schweizer Kundennummer und Adressvervollständigung.
              </p>
              
              <div className="mt-auto flex flex-col gap-4 text-sm text-primary-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-800/50 flex items-center justify-center">✓</div>
                  <span>Automatische Kundennummer</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-800/50 flex items-center justify-center">✓</div>
                  <span>Schweizer Adress- & Zefix-Suche</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-800/50 flex items-center justify-center">✓</div>
                  <span>QR-Rechnungskompatibel</span>
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
              <button onClick={onClose} className="p-3 sm:p-2 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors cursor-pointer flex items-center justify-center">
                ✕
              </button>
            </div>
            
            <div className="hidden md:block absolute top-4 right-4 z-20">
              <button onClick={onClose} className="p-3 sm:p-2 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 text-gray-400 hover:text-gray-900 bg-white hover:bg-gray-100 rounded-full shadow-sm transition-colors cursor-pointer border border-gray-100 flex items-center justify-center">
                ✕
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

                {/* Zefix Section */}
                <div className="space-y-4 bg-primary-50/50 p-5 rounded-xl border border-primary-100">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setShowZefix(!showZefix)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🔍</span>
                      <h3 className="text-lg font-bold text-gray-900">Firmensuche (Handelsregister Zefix)</h3>
                    </div>
                    <svg className={`w-5 h-5 text-gray-500 transition-transform ${showZefix ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  
                  {showZefix && (
                    <div className="pt-2">
                      <ZefixAutocomplete 
                        onSelect={(company) => {
                          setFormData(prev => ({
                            ...prev,
                            anrede: 'Firma',
                            firmenname: company.firmenname,
                            ort: company.ort,
                            typ: 'Geschäftskunde (Allgemein)'
                          }));
                          setZefixSuccess(true);
                          setTimeout(() => setZefixSuccess(false), 3000);
                        }}
                      />
                      {zefixSuccess && (
                        <div className="mt-3 text-sm text-green-600 flex items-center gap-2">
                          ✓ Daten aus dem Handelsregister übernommen
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Stammdaten Section */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">🏢</span>
                    <h3 className="text-lg font-bold text-gray-900">Stammdaten</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Kundennummer */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Kundennummer
                      </label>
                      <input 
                        type="text" 
                        value={formData.kundennummer}
                        onChange={e => setFormData({...formData, kundennummer: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        placeholder="K-1000"
                      />
                    </div>

                    {/* Anrede */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Anrede
                      </label>
                      <select 
                        value={formData.anrede}
                        onChange={e => setFormData({...formData, anrede: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      >
                        {ANREDE_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>

                    {/* Kundentyp */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kundentyp</label>
                      <select 
                        value={formData.typ}
                        onChange={e => setFormData({...formData, typ: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      >
                        {KUNDENTYPEN.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    
                    <div className="md:col-span-3">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Firmenname {hasNameError && <span className="text-red-500 font-normal ml-1">(Pflichtfeld)</span>}
                      </label>
                      <input 
                        type="text" 
                        value={formData.firmenname}
                        onChange={e => setFormData({...formData, firmenname: e.target.value})}
                        className={`w-full px-4 py-2.5 bg-white border rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 transition-all shadow-sm ${hasNameError ? 'border-red-300 focus:border-red-500 bg-red-50/30' : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/20'}`}
                        placeholder="z.B. Holzbau Schweiz AG"
                      />
                    </div>
                    
                    <div className="md:col-span-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Vorname</label>
                      <input 
                        type="text" 
                        value={formData.vorname}
                        onChange={e => setFormData({...formData, vorname: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        placeholder="Max"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Nachname {hasNameError && <span className="text-red-500 font-normal ml-1">(Pflichtfeld)</span>}
                      </label>
                      <input 
                        type="text" 
                        value={formData.nachname}
                        onChange={e => setFormData({...formData, nachname: e.target.value})}
                        className={`w-full px-4 py-2.5 bg-white border rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 transition-all shadow-sm ${hasNameError ? 'border-red-300 focus:border-red-500 bg-red-50/30' : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/20'}`}
                        placeholder="Mustermann"
                      />
                    </div>
                  </div>
                  {hasNameError && <p className="text-sm text-red-500 mt-2 font-medium">Geben Sie entweder einen Firmennamen oder einen Nachnamen an.</p>}
                </div>

                <div className="h-px bg-gray-200 w-full"></div>

                {/* Kontakt & Adresse Section */}
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
                        className={`w-full px-4 py-2.5 bg-white border rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 transition-all shadow-sm ${hasEmailError ? 'border-red-300 focus:border-red-500 bg-red-50/30' : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500/20'}`}
                        placeholder="kontakt@firma.ch"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Telefon</label>
                      <input 
                        type="text" 
                        value={formData.telefon}
                        onChange={e => setFormData({...formData, telefon: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        placeholder="z.B. 079 123 45 67"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Website</label>
                      <input 
                        type="url" 
                        value={formData.website}
                        onChange={e => setFormData({...formData, website: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        placeholder="https://"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Strasse & Hausnummer (Auto-Fill)</label>
                      <AddressAutocomplete 
                        value={formData.strasse}
                        onChange={(val, details) => {
                          if (details) {
                            setFormData(prev => ({
                              ...prev, 
                              strasse: details.strasse, 
                              plz: details.plz, 
                              ort: details.ort,
                              land: 'Schweiz'
                            }))
                          } else {
                            setFormData(prev => ({...prev, strasse: val}))
                          }
                        }}
                        placeholder="Adresse suchen..."
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">PLZ</label>
                      <input 
                        type="text" 
                        value={formData.plz}
                        onChange={e => setFormData({...formData, plz: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        placeholder="3000"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ort</label>
                      <input 
                        type="text" 
                        value={formData.ort}
                        onChange={e => setFormData({...formData, ort: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        placeholder="Bern"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Land</label>
                      <div className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-900 text-sm flex items-center gap-2">
                        <span>🇨🇭</span>
                        <span className="font-semibold">Schweiz</span>
                      </div>
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
                    className="w-full h-32 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                    placeholder="Wichtige Hinweise, Konditionen oder Besonderheiten zum Kunden..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 sm:p-6 border-t border-gray-100 bg-white/80 backdrop-blur-md shrink-0 flex flex-col sm:flex-row justify-end gap-3 rounded-br-3xl">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  Abbrechen
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full sm:w-auto px-8 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-primary-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSaving ? 'Speichert...' : 'Kunde erstellen'}
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>
    </>
  )
}
