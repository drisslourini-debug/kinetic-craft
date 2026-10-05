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

      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 pointer-events-none">
        <div className="bg-white rounded-t-[28px] sm:rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden pointer-events-auto transform transition-all animate-slide-up sm:animate-scale-up max-h-[92dvh] sm:max-h-[90vh] border border-border pb-[env(safe-area-inset-bottom)] sm:pb-0">
          
          {/* Mobile Pull Handle */}
          <div className="w-full pt-3 pb-1.5 flex justify-center sm:hidden shrink-0 touch-action-manipulation cursor-pointer" onClick={onClose}>
            <div className="w-12 h-1.5 bg-neutral-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-border bg-surface/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center text-xl shrink-0 border border-primary-200/60">
                👤
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-text-primary">Neuen Kunden anlegen</h2>
                <p className="text-xs text-text-secondary hidden sm:block">Schweizer Adress- & Zefix-Suche mit automatischer Kundennummer.</p>
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
            <div className="flex-1 p-6 space-y-6 overflow-y-auto" ref={parent}>
              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-center gap-3">
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {error}
                </div>
              )}

              {/* Zefix Section */}
              <div className="bg-primary-50/40 p-4 rounded-xl border border-primary-100/80">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setShowZefix(!showZefix)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔍</span>
                    <h3 className="text-sm font-bold text-text-primary">Firmensuche (Handelsregister Zefix)</h3>
                  </div>
                  <svg className={`w-4 h-4 text-text-secondary transition-transform ${showZefix ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {showZefix && (
                  <div className="pt-3">
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
                      <div className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                        ✓ Daten aus dem Handelsregister übernommen
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Stammdaten Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <span>🏢</span> Stammdaten
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Kundennummer */}
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Kundennummer
                    </label>
                    <input 
                      type="text" 
                      value={formData.kundennummer}
                      onChange={e => setFormData({...formData, kundennummer: e.target.value})}
                      className="w-full px-3.5 py-3 sm:py-2 bg-surface border border-border rounded-xl text-text-primary font-mono text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      placeholder="K-1000"
                    />
                  </div>

                  {/* Anrede */}
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Anrede
                    </label>
                    <select 
                      value={formData.anrede}
                      onChange={e => setFormData({...formData, anrede: e.target.value})}
                      className="w-full px-3.5 py-3 sm:py-2 bg-surface border border-border rounded-xl text-text-primary text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    >
                      {ANREDE_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>

                  {/* Kundentyp */}
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Kundentyp</label>
                    <select 
                      value={formData.typ}
                      onChange={e => setFormData({...formData, typ: e.target.value})}
                      className="w-full px-3.5 py-3 sm:py-2 bg-surface border border-border rounded-xl text-text-primary text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    >
                      {KUNDENTYPEN.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Firmenname {hasNameError && <span className="text-red-500 font-normal ml-1">(Pflichtfeld)</span>}
                    </label>
                    <input 
                      type="text" 
                      value={formData.firmenname}
                      onChange={e => setFormData({...formData, firmenname: e.target.value})}
                      className={`w-full px-3.5 py-3 sm:py-2 bg-surface border rounded-xl text-text-primary text-base sm:text-sm focus:outline-none focus:ring-2 transition-all ${hasNameError ? 'border-red-300 focus:border-red-500 bg-red-50/30' : 'border-border focus:border-primary-500 focus:ring-primary-500/20'}`}
                      placeholder="z.B. Holzbau Schweiz AG"
                    />
                  </div>
                  
                  <div className="md:col-span-1">
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Vorname</label>
                    <input 
                      type="text" 
                      value={formData.vorname}
                      onChange={e => setFormData({...formData, vorname: e.target.value})}
                      className="w-full px-3.5 py-3 sm:py-2 bg-surface border border-border rounded-xl text-text-primary text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      placeholder="Max"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Nachname {hasNameError && <span className="text-red-500 font-normal ml-1">(Pflichtfeld)</span>}
                    </label>
                    <input 
                      type="text" 
                      value={formData.nachname}
                      onChange={e => setFormData({...formData, nachname: e.target.value})}
                      className={`w-full px-3.5 py-3 sm:py-2 bg-surface border rounded-xl text-text-primary text-base sm:text-sm focus:outline-none focus:ring-2 transition-all ${hasNameError ? 'border-red-300 focus:border-red-500 bg-red-50/30' : 'border-border focus:border-primary-500 focus:ring-primary-500/20'}`}
                      placeholder="Mustermann"
                    />
                  </div>
                </div>
                {hasNameError && <p className="text-xs text-red-500 font-medium">Geben Sie entweder einen Firmennamen oder einen Nachnamen an.</p>}
              </div>

              {/* Kontakt & Adresse Section */}
              <div className="space-y-4 pt-3 border-t border-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <span>📍</span> Kontakt & Adresse
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      E-Mail {hasEmailError && <span className="text-red-500 font-normal ml-1">(Ungültig)</span>}
                    </label>
                    <input 
                      type="email" 
                      inputMode="email"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className={`w-full px-3.5 py-3 sm:py-2 bg-surface border rounded-xl text-text-primary text-base sm:text-xs focus:outline-none focus:ring-2 transition-all ${hasEmailError ? 'border-red-300 focus:border-red-500 bg-red-50/30' : 'border-border focus:border-primary-500 focus:ring-primary-500/20'}`}
                      placeholder="kontakt@firma.ch"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Telefon</label>
                    <input 
                      type="tel" 
                      inputMode="tel"
                      value={formData.telefon}
                      onChange={e => setFormData({...formData, telefon: e.target.value})}
                      className="w-full px-3.5 py-3 sm:py-2 bg-surface border border-border rounded-xl text-text-primary text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      placeholder="z.B. 079 123 45 67"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Website</label>
                    <input 
                      type="url" 
                      value={formData.website}
                      onChange={e => setFormData({...formData, website: e.target.value})}
                      className="w-full px-3.5 py-3 sm:py-2 bg-surface border border-border rounded-xl text-text-primary text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      placeholder="https://"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Strasse & Hausnummer (Auto-Fill)</label>
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
                      className="w-full px-3.5 py-3 sm:py-2 bg-surface border border-border rounded-xl text-text-primary text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">PLZ</label>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.plz}
                      onChange={e => setFormData({...formData, plz: e.target.value})}
                      className="w-full px-3.5 py-3 sm:py-2 bg-surface border border-border rounded-xl text-text-primary text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      placeholder="3000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Ort</label>
                    <input 
                      type="text" 
                      value={formData.ort}
                      onChange={e => setFormData({...formData, ort: e.target.value})}
                      className="w-full px-3.5 py-3 sm:py-2 bg-surface border border-border rounded-xl text-text-primary text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      placeholder="Bern"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Land</label>
                    <div className="w-full px-3.5 py-3 sm:py-2 bg-surface border border-border rounded-xl text-text-primary text-base sm:text-xs flex items-center gap-2">
                      <span>🇨🇭</span>
                      <span className="font-semibold">Schweiz</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notizen Section */}
              <div className="space-y-3 pt-3 border-t border-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <span>📝</span> Interne Notizen
                </h3>
                <textarea 
                  value={formData.notizen}
                  onChange={e => setFormData({...formData, notizen: e.target.value})}
                  className="w-full h-24 px-3.5 py-3 sm:py-2 bg-surface border border-border rounded-xl text-text-primary text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                  placeholder="Wichtige Hinweise, Konditionen oder Besonderheiten zum Kunden..."
                />
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-t border-border bg-surface/90 backdrop-blur-md shrink-0 flex items-center justify-end gap-3">
              <button 
                type="button" 
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-3 sm:py-2 text-sm sm:text-xs font-semibold text-text-secondary hover:text-text-primary bg-surface border border-border rounded-xl hover:bg-neutral-50 active:scale-95 transition-all min-h-[48px] sm:min-h-[36px] touch-action-manipulation cursor-pointer"
              >
                Abbrechen
              </button>
              <button 
                type="submit" 
                disabled={isSaving}
                className="flex-1 sm:flex-none px-6 py-3 sm:py-2 text-sm sm:text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-primary-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[48px] sm:min-h-[36px] touch-action-manipulation"
              >
                {isSaving ? 'Speichert...' : 'Kunde erstellen'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}