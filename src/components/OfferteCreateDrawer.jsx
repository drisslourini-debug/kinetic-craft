import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function OfferteCreateDrawer({ onClose, onSuccess, prefilledKundeId }) {
  const [kundenList, setKundenList] = useState([])
  const [projekteList, setProjekteList] = useState([])
  
  const [selectedKundeId, setSelectedKundeId] = useState(prefilledKundeId || '')
  const [selectedProjektId, setSelectedProjektId] = useState('')
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [settings, setSettings] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const { data: setts } = await supabase.from('einstellungen').select('*').eq('id', 1).single()
        if (setts) setSettings(setts)
        
        const { data: kData, error: kErr } = await supabase
          .from('kunden')
          .select('id, name')
          .order('name', { ascending: true })
        
        if (kErr) throw kErr
        setKundenList(kData || [])
      } catch (err) {
        console.error('Fehler beim Laden:', err)
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
        if (pData && pData.length === 1) {
          setSelectedProjektId(pData[0].id)
        } else {
          setSelectedProjektId('')
        }
      } catch (err) {
        console.error('Fehler beim Laden der Projekte:', err)
      }
    }
    loadProjects()
  }, [selectedKundeId])

  const handleCreateDraft = async () => {
    if (!selectedKundeId) {
      setError('Bitte wähle zuerst einen Kunden aus.')
      return
    }
    
    setIsSubmitting(true)
    setError('')
    
    try {
      
      // Generate Next Nr
      const prefix = 'OF-' + new Date().getFullYear() + '-';
      let nextNum = settings?.startnummer_offerten || 1000;
      const { data: existing } = await supabase.from('offerten').select('offerte_nr').not('offerte_nr', 'is', null).order('created_at', { ascending: false }).limit(10);
      if (existing && existing.length > 0) {
        const nums = existing.map(e => {
          const match = e.offerte_nr.match(/\d+$/);
          return match ? parseInt(match[0], 10) : 0;
        }).filter(n => n > 0);
        if (nums.length > 0) nextNum = Math.max(...nums) + 1;
      }
      
      const draftData = {
        kunden_id: selectedKundeId,
        projekt_id: selectedProjektId || null,
        status: 'Entwurf',
        total: 0,
        offerte_nr: prefix + nextNum,
        daten: {
          leistungen: [],
          konditionen: { rabatt: settings?.standard_rabatt || 0, mwst: settings?.standard_mwst || 8.1 },
          texte: { einleitungstext: '', schlusstext: '' },
          ausfuehrung: { start: '', dauer: '', notizen: '' },
          gueltig_bis: new Date(Date.now() + (settings?.gueltigkeit_offerten_tage || 30) * 24 * 60 * 60 * 1000).toISOString(),
          pauschalpreis: null
        }
      }

      const { data, error: insertErr } = await supabase
        .from('offerten')
        .insert([draftData])
        .select()
        
      if (insertErr) throw insertErr
      
      if (data && data.length > 0) {
        onSuccess(data[0].id)
      }
    } catch (err) {
      console.error('Fehler beim Erstellen des Entwurfs:', err)
      setError('Offerte konnte nicht erstellt werden. Bitte versuche es erneut.')
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div 
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-surface shadow-2xl z-50 flex flex-col transform transition-transform animate-slide-in-right">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-surface-card">
          <h2 className="text-xl font-bold text-text-primary">Neue Offerte</h2>
          <button 
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface rounded-full transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div>
            <p className="text-sm text-text-secondary mb-6">
              Wähle den Kunden und das Projekt. Der Entwurf wird sofort generiert und du kannst danach das gesamte Dokument direkt ausfüllen.
            </p>

            {error && (
              <div className="p-3 mb-6 bg-red-50 text-red-700 text-sm font-semibold rounded-xl border border-red-200">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                  Kunde <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedKundeId}
                  onChange={(e) => setSelectedKundeId(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 font-medium cursor-pointer"
                >
                  <option value="">-- Kunde auswählen --</option>
                  {kundenList.map(k => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
                {kundenList.length === 0 && (
                  <p className="text-xs text-text-secondary mt-1.5">Keine Kunden gefunden.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                  Projekt / Baustelle
                </label>
                <select
                  value={selectedProjektId}
                  onChange={(e) => setSelectedProjektId(e.target.value)}
                  disabled={!selectedKundeId || projekteList.length === 0}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 font-medium disabled:opacity-50 disabled:bg-gray-50 cursor-pointer"
                >
                  <option value="">-- Kein Projekt (Optional) --</option>
                  {projekteList.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {selectedKundeId && projekteList.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1.5 font-medium">Dieser Kunde hat keine angelegten Projekte.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border bg-surface-card">
          <button
            onClick={handleCreateDraft}
            disabled={isSubmitting || !selectedKundeId}
            className="w-full py-3.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 shadow-md shadow-primary-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Erstelle Entwurf...
              </>
            ) : (
              'Entwurf generieren'
            )}
          </button>
        </div>
      </div>
    </>
  )
}
