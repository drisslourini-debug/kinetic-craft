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
  const [openSections, setOpenSections] = useState(['stammdaten'])
  const [submitted, setSubmitted] = useState(false)

  const toggleSection = (section) => {
    setOpenSections(prev => 
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    )
  }

  const isMissingName = !formData.firmenname?.trim() && !formData.nachname?.trim();
  const isValidEmail = !formData.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitted(true)
    setIsSaving(true)
    setError(null)

    if (isMissingName) {
      setError('Bitte Firmenname oder Nachname eingeben.')
      if (!openSections.includes('stammdaten')) toggleSection('stammdaten')
      setIsSaving(false)
      return
    }

    if (!isValidEmail) {
      setError('Bitte eine gültige E-Mail Adresse eingeben.')
      if (!openSections.includes('kontakt')) toggleSection('kontakt')
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

  const AccordionHeader = ({ title, section, icon }) => (
    <button 
      type="button"
      onClick={() => toggleSection(section)}
      className={`w-full flex items-center justify-between p-4 transition-colors ${openSections.includes(section) ? 'bg-neutral-50 border-b border-border' : 'bg-surface-card hover:bg-neutral-50'}`}
    >
      <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      <span className={`text-text-secondary transition-transform duration-200 ${openSections.includes(section) ? 'rotate-180' : ''}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </span>
    </button>
  )

  const hasNameError = submitted && isMissingName;
  const hasEmailError = submitted && !isValidEmail;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm transition-opacity">
      {/* Background overlay click to close */}
      <div className="absolute inset-0" onClick={onClose}></div>
      
      {/* Slide-over panel */}
      <div className="bg-surface w-full max-w-xl h-full shadow-2xl border-l border-border flex flex-col relative animate-slide-in-right z-10">
        
        <div className="flex items-center justify-between p-6 border-b border-border bg-surface shrink-0">
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

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-hide" ref={parent}>
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                {error}
              </div>
            )}

            {/* Stammdaten Accordion */}
            <div className="border border-border rounded-xl overflow-hidden bg-surface-card">
              <AccordionHeader title="Stammdaten" section="stammdaten" icon="🏢" />
              {openSections.includes('stammdaten') && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-text-secondary mb-1">Kundentyp</label>
                      <select 
                        value={formData.typ}
                        onChange={e => setFormData({...formData, typ: e.target.value})}
                        className="w-full px-4 py-3 bg-surface-card border border-border rounded-lg text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                      >
                        <option value="">-- Bitte wählen --</option>
                        {KUNDENTYPEN.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Firmenname {hasNameError && <span className="text-red-500 font-normal ml-1">(Pflichtfeld)</span>}
                      </label>
                      <input 
                        type="text" 
                        value={formData.firmenname}
                        onChange={e => setFormData({...formData, firmenname: e.target.value})}
                        className={`w-full px-4 py-3 bg-surface-card border rounded-lg text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 ${hasNameError ? 'border-red-400 bg-red-50/50' : 'border-border'}`}
                        placeholder="z.B. Maler AG"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Vorname</label>
                      <input 
                        type="text" 
                        value={formData.vorname}
                        onChange={e => setFormData({...formData, vorname: e.target.value})}
                        className="w-full px-4 py-3 bg-surface-card border border-border rounded-lg text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        Nachname {hasNameError && <span className="text-red-500 font-normal ml-1">(Pflichtfeld)</span>}
                      </label>
                      <input 
                        type="text" 
                        value={formData.nachname}
                        onChange={e => setFormData({...formData, nachname: e.target.value})}
                        className={`w-full px-4 py-3 bg-surface-card border rounded-lg text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 ${hasNameError ? 'border-red-400 bg-red-50/50' : 'border-border'}`}
                      />
                    </div>
                  </div>
                  {hasNameError && <p className="text-xs text-red-500 mt-1">Geben Sie entweder einen Firmennamen oder einen Nachnamen an.</p>}
                </div>
              )}
            </div>

            {/* Kontakt Accordion */}
            <div className="border border-border rounded-xl overflow-hidden bg-surface-card">
              <AccordionHeader title="Kontakt & Adresse" section="kontakt" icon="📍" />
              {openSections.includes('kontakt') && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">
                        E-Mail {hasEmailError && <span className="text-red-500 font-normal ml-1">(Ungültig)</span>}
                      </label>
                      <input 
                        type="email" 
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className={`w-full px-4 py-3 bg-surface-card border rounded-lg text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 ${hasEmailError ? 'border-red-400 bg-red-50/50' : 'border-border'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Telefon</label>
                      <input 
                        type="text" 
                        value={formData.telefon}
                        onChange={e => setFormData({...formData, telefon: e.target.value})}
                        className="w-full px-4 py-3 bg-surface-card border border-border rounded-lg text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                        placeholder="z.B. 079 123 45 67"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-text-secondary mb-1">Strasse (Auto-Fill)</label>
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
                        className="w-full px-4 py-3 bg-surface-card border border-border rounded-lg text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">PLZ</label>
                      <input 
                        type="text" 
                        value={formData.plz}
                        onChange={e => setFormData({...formData, plz: e.target.value})}
                        className="w-full px-4 py-3 bg-surface-card border border-border rounded-lg text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Ort</label>
                      <input 
                        type="text" 
                        value={formData.ort}
                        onChange={e => setFormData({...formData, ort: e.target.value})}
                        className="w-full px-4 py-3 bg-surface-card border border-border rounded-lg text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notizen Accordion */}
            <div className="border border-border rounded-xl overflow-hidden bg-surface-card">
              <AccordionHeader title="Interne Notizen" section="notizen" icon="📝" />
              {openSections.includes('notizen') && (
                <div className="p-4">
                  <textarea 
                    value={formData.notizen}
                    onChange={e => setFormData({...formData, notizen: e.target.value})}
                    className="w-full h-32 px-4 py-3 bg-surface-card border border-border rounded-lg text-base focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none"
                    placeholder="Interne Notizen zum Kunden..."
                  />
                </div>
              )}
            </div>

          </div>

          <div className="p-6 border-t border-border flex justify-end gap-3 sticky bottom-0 bg-surface z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-3 sm:py-2.5 text-base font-semibold text-text-secondary bg-surface-card hover:bg-surface border border-border rounded-xl transition-colors cursor-pointer"
            >
              Abbrechen
            </button>
            <button 
              type="submit" 
              disabled={isSaving}
              className="px-5 py-3 sm:py-2.5 text-base font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              {isSaving ? 'Speichert...' : 'Kunde erstellen'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}

