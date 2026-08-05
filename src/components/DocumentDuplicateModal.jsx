import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { generateNextRechnungNr } from '../lib/documentService'

/**
 * Unified modal for duplicating both Offerten and Rechnungen.
 * Replaces the former OfferteDuplicateModal and RechnungDuplicateModal.
 *
 * @param {Object} props
 * @param {'offerte' | 'rechnung'} props.type - Document type
 * @param {Object} props.currentDocument - The document to duplicate
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onSuccess - Success handler (receives new document ID)
 */
export default function DocumentDuplicateModal({ type, currentDocument, onClose, onSuccess }) {
  const isRechnung = type === 'rechnung'
  const label = isRechnung ? 'Rechnung' : 'Offerte'
  const documentNr = isRechnung
    ? currentDocument.rechnung_nr
    : (currentDocument.offerte_nr || `OF-${String(currentDocument.id).padStart(3, '0')}`)

  const [kundenList, setKundenList] = useState([])
  const [projekteList, setProjekteList] = useState([])
  
  const [selectedKundeId, setSelectedKundeId] = useState(currentDocument?.kunden_id || '')
  const [selectedProjektId, setSelectedProjektId] = useState(currentDocument?.projekt_id || '')
  
  const [copyOptions, setCopyOptions] = useState({
    copyLeistungen: true
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const { data: kData, error: kErr } = await supabase
          .from('kunden')
          .select('id, name')
          .order('name', { ascending: true })
        
        if (kErr) throw kErr
        setKundenList(kData || [])
      } catch (err) {
        console.error('Fehler beim Laden der Kunden:', err)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    async function loadProjects() {
      if (!selectedKundeId) {
        setProjekteList([])
        return
      }
      try {
        const { data: pData, error: pErr } = await supabase
          .from('projekte')
          .select('id, name')
          .eq('kunden_id', selectedKundeId)
          .order('name', { ascending: true })
        
        if (pErr) throw pErr
        setProjekteList(pData || [])
        
        if (selectedProjektId) {
          const projectStillExists = pData?.some(p => p.id === selectedProjektId)
          if (!projectStillExists) {
            setSelectedProjektId('')
          }
        }
      } catch (err) {
        console.error('Fehler beim Laden der Projekte:', err)
      }
    }
    loadProjects()
  }, [selectedKundeId, selectedProjektId])

  const handleDuplicate = async () => {
    if (!selectedKundeId) {
      setError('Bitte wähle einen Kunden aus.')
      return
    }
    
    setIsSubmitting(true)
    setError('')
    
    try {
      let newDaten = JSON.parse(JSON.stringify(currentDocument.daten || {}))
      let newTotal = currentDocument.total || 0
      
      if (!copyOptions.copyLeistungen) {
        newDaten.leistungen = []
        newDaten.pauschalpreis = null
        newTotal = 0
      }
      
      if (newDaten.ausfuehrung) {
        newDaten.ausfuehrung.start = ''
        newDaten.ausfuehrung.dauer = ''
      }

      let duplicateData
      if (isRechnung) {
        const newNr = await generateNextRechnungNr(supabase)
        duplicateData = {
          rechnung_nr: newNr,
          kunden_id: selectedKundeId,
          projekt_id: selectedProjektId || null,
          offerte_id: currentDocument.offerte_id,
          typ: currentDocument.typ || 'gesamt',
          rechnungsdatum: new Date().toISOString().split('T')[0],
          zahlungsfrist_tage: currentDocument.zahlungsfrist_tage || 30,
          status: 'Entwurf',
          total: newTotal,
          daten: newDaten
        }
      } else {
        duplicateData = {
          kunden_id: selectedKundeId,
          projekt_id: selectedProjektId || null,
          status: 'Entwurf',
          total: newTotal,
          daten: newDaten
        }
      }

      const tableName = isRechnung ? 'rechnungen' : 'offerten'
      const { data, error: insertErr } = await supabase
        .from(tableName)
        .insert([duplicateData])
        .select()
        
      if (insertErr) throw insertErr
      
      if (data && data.length > 0) {
        onSuccess(data[0].id)
      }
    } catch (err) {
      console.error('Fehler beim Duplizieren:', err)
      setError(`${label} konnte nicht dupliziert werden. Bitte versuche es erneut.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl relative z-10 flex flex-col animate-scale-in">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <span>📋</span> {label} duplizieren
          </h2>
          <button 
            onClick={onClose}
            className="p-3 sm:p-2 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 text-text-secondary hover:text-text-primary rounded-full hover:bg-neutral-100 transition-colors flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div className="bg-primary-50/50 p-4 rounded-xl border border-primary-100">
              <p className="text-sm text-primary-800">
                Du duplizierst die {label} <strong>{documentNr}</strong>.
              </p>
            </div>

            {/* Kunde */}
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">Kunde *</label>
              <select
                value={selectedKundeId}
                onChange={(e) => setSelectedKundeId(e.target.value)}
                className="w-full px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-white border border-border rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="">Kunde auswählen...</option>
                {kundenList.map(k => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
            </div>

            {/* Projekt */}
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">Objekt / Projekt (Optional)</label>
              <select
                value={selectedProjektId}
                onChange={(e) => setSelectedProjektId(e.target.value)}
                disabled={!selectedKundeId}
                className="w-full px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-white border border-border rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 disabled:opacity-50 disabled:bg-gray-50"
              >
                <option value="">Kein Projekt zugeordnet</option>
                {projekteList.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Optionen */}
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-3">Optionen</label>
              
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 border border-border rounded-xl cursor-pointer hover:bg-neutral-50 transition-colors">
                  <input 
                    type="radio" 
                    name="copyOptions"
                    checked={copyOptions.copyLeistungen === true}
                    onChange={() => setCopyOptions({ ...copyOptions, copyLeistungen: true })}
                    className="mt-1 shrink-0 w-5 h-5 sm:w-4 sm:h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <span className="block text-sm font-bold text-text-primary">Stammdaten &amp; Leistungen kopieren</span>
                    <span className="block text-xs text-text-secondary mt-0.5">Komplettes Leistungsverzeichnis und Total übernehmen.</span>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 p-4 border border-border rounded-xl cursor-pointer hover:bg-neutral-50 transition-colors">
                  <input 
                    type="radio" 
                    name="copyOptions"
                    checked={copyOptions.copyLeistungen === false}
                    onChange={() => setCopyOptions({ ...copyOptions, copyLeistungen: false })}
                    className="mt-1 shrink-0 w-5 h-5 sm:w-4 sm:h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <span className="block text-sm font-bold text-text-primary">Nur Stammdaten kopieren</span>
                    <span className="block text-xs text-text-secondary mt-0.5">Leeres Leistungsverzeichnis für eine neue Kalkulation.</span>
                  </div>
                </label>
              </div>
            </div>
            
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-border flex flex-col sm:flex-row justify-end gap-3 bg-neutral-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto min-h-[48px] px-6 py-3 sm:py-2.5 text-base sm:text-sm font-bold text-text-secondary hover:text-text-primary hover:bg-white rounded-xl border border-transparent hover:border-border transition-all cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={isSubmitting || !selectedKundeId}
            className="w-full sm:w-auto min-h-[48px] flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold text-base sm:text-sm rounded-xl hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 transition-all shadow-lg shadow-primary-600/20 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Wird kopiert...
              </>
            ) : `${label} kopieren`}
          </button>
        </div>
      </div>
    </div>
  )
}
