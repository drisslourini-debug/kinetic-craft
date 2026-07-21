import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function KatalogView() {
  const [kategorien, setKategorien] = useState([])
  const [leistungen, setLeistungen] = useState([])
  const [activeKategorie, setActiveKategorie] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)

  // Load all categories on mount
  useEffect(() => {
    fetchKategorien()
  }, [])

  // Load leistungen when activeKategorie changes
  useEffect(() => {
    if (activeKategorie) {
      fetchLeistungen(activeKategorie.id)
    } else {
      setLeistungen([])
    }
  }, [activeKategorie])

  async function fetchKategorien() {
    if (!supabase) return
    setIsLoading(true)
    const { data } = await supabase.from('katalog_kategorien').select('*').order('sort_order', { ascending: true })
    if (data) {
      setKategorien(data)
      if (data.length > 0 && !activeKategorie) setActiveKategorie(data[0])
    }
    setIsLoading(false)
  }

  async function fetchLeistungen(kategorieId) {
    if (!supabase) return
    const { data } = await supabase
      .from('katalog_leistungen')
      .select('*')
      .eq('kategorie_id', kategorieId)
      .order('sort_order', { ascending: true })
    if (data) setLeistungen(data)
  }

  // --- Category Actions ---
  const handleAddKategorie = async () => {
    const name = window.prompt('Name der neuen Kategorie:')
    if (!name) return
    const { data } = await supabase.from('katalog_kategorien').insert([{ name, sort_order: kategorien.length }]).select()
    if (data) {
      setKategorien([...kategorien, data[0]])
      setActiveKategorie(data[0])
    }
  }

  const handleDeleteKategorie = async (id) => {
    if (!window.confirm('Kategorie und alle enthaltenen Leistungen wirklich löschen?')) return
    
    // Explicitly delete all leistungen first (in case ON DELETE CASCADE is missing in Supabase)
    await supabase.from('katalog_leistungen').delete().eq('kategorie_id', id)
    // Then delete the category
    await supabase.from('katalog_kategorien').delete().eq('id', id)
    
    const nextKategorien = kategorien.filter(k => k.id !== id)
    setKategorien(nextKategorien)
    if (activeKategorie?.id === id) setActiveKategorie(nextKategorien[0] || null)
  }

  // --- Leistung Actions ---
  const handleAddLeistung = async () => {
    if (!activeKategorie) return
    const newLeistung = {
      kategorie_id: activeKategorie.id,
      beschreibung: 'Neue Leistung',
      einheit: 'm²',
      einzelpreis: 0,
      preis_material: 0,
      preis_arbeit: 0,
      is_archived: false,
      sort_order: leistungen.length
    }
    const { data } = await supabase.from('katalog_leistungen').insert([newLeistung]).select()
    if (data) setLeistungen([...leistungen, data[0]])
  }

  const handleUpdateLeistung = async (id, field, value) => {
    setLeistungen(prev => prev.map(l => {
      if (l.id === id) {
        const updated = { ...l, [field]: value }
        if (field === 'preis_material' || field === 'preis_arbeit') {
          updated.einzelpreis = (parseFloat(updated.preis_material) || 0) + (parseFloat(updated.preis_arbeit) || 0)
        }
        return updated
      }
      return l
    }))
    
    const updateData = { [field]: value }
    if (field === 'preis_material' || field === 'preis_arbeit') {
      const current = leistungen.find(l => l.id === id)
      const mat = field === 'preis_material' ? parseFloat(value) || 0 : parseFloat(current.preis_material) || 0
      const arb = field === 'preis_arbeit' ? parseFloat(value) || 0 : parseFloat(current.preis_arbeit) || 0
      updateData.einzelpreis = mat + arb
    }
    
    try {
      const { error } = await supabase.from('katalog_leistungen').update(updateData).eq('id', id)
      if (error) {
        if (error.message.includes('preis_material') || error.message.includes('preis_arbeit')) {
          alert('Datenbankfehler: Die Spalten "preis_material" und "preis_arbeit" fehlen in Supabase! Bitte füge sie als Typ "numeric" zur Tabelle "katalog_leistungen" hinzu.')
        } else {
          console.error('Update Fehler:', error)
          alert('Fehler beim Speichern: ' + error.message)
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleArchiveLeistung = async (id, isArchived = true) => {
    await supabase.from('katalog_leistungen').update({ is_archived: isArchived }).eq('id', id)
    setLeistungen(prev => prev.map(l => l.id === id ? { ...l, is_archived: isArchived } : l))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Leistungskatalog</h2>
          <p className="text-text-secondary mt-1">Verwalte hier deine Kategorien und Preise für die Offerten.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-text-secondary">Lade Katalog...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Linke Spalte: Kategorien */}
          <div className="bg-surface-card rounded-2xl border border-border flex flex-col md:h-[calc(100vh-200px)] md:min-h-[500px]">
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface">
              <h3 className="font-bold text-text-primary">Kategorien</h3>
              <button 
                onClick={handleAddKategorie}
                className="text-xs bg-primary-100 text-primary-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-primary-200 transition-colors cursor-pointer"
              >
                + Neu
              </button>
            </div>
            
            <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto p-2 gap-2 md:gap-0 md:space-y-1 hide-scrollbar">
              {kategorien.length === 0 ? (
                <div className="p-4 text-center text-sm text-text-secondary w-full">Keine Kategorien vorhanden.</div>
              ) : (
                kategorien.map(kat => (
                  <div 
                    key={kat.id}
                    onClick={() => setActiveKategorie(kat)}
                    className={`flex-shrink-0 md:flex-shrink flex justify-between items-center px-4 py-3 rounded-xl cursor-pointer transition-colors ${
                      activeKategorie?.id === kat.id ? 'bg-primary-500 text-white shadow-md' : 'hover:bg-primary-50 text-text-primary border border-border md:border-transparent'
                    }`}
                  >
                    <span className="font-medium text-sm whitespace-nowrap">{kat.name}</span>
                    {activeKategorie?.id === kat.id && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteKategorie(kat.id); }}
                        className="ml-3 text-primary-100 hover:text-white p-1 md:ml-0"
                        title="Löschen"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Rechte Spalte: Leistungen */}
          <div className="md:col-span-2 bg-surface-card rounded-2xl border border-border flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
            {activeKategorie ? (
              <>
                <div className="p-4 border-b border-border flex justify-between items-center bg-surface">
                  <h3 className="font-bold text-text-primary flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                    Leistungen in "{activeKategorie.name}"
                  </h3>
                  <button 
                    onClick={handleAddLeistung}
                    className="text-sm bg-primary-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-primary-700 shadow-md shadow-primary-600/20 transition-all cursor-pointer"
                  >
                    + Neue Leistung
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pb-4">
                  <div className="px-5 py-3 flex justify-end">
                    <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={showArchived} 
                        onChange={(e) => setShowArchived(e.target.checked)}
                        className="rounded border-border text-primary-600 focus:ring-primary-500"
                      />
                      Archivierte einblenden
                    </label>
                  </div>
                  {leistungen.filter(l => showArchived || !l.is_archived).length === 0 ? (
                    <div className="p-8 text-center text-text-secondary">
                      Keine aktiven Leistungen in dieser Kategorie.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      <div className="hidden sm:grid grid-cols-[1fr_80px_100px_100px_100px_40px] gap-4 px-5 py-3 bg-surface text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        <span>Beschreibung</span>
                        <span>Einheit</span>
                        <span className="text-right">Material</span>
                        <span className="text-right">Arbeit</span>
                        <span className="text-right">Total (CHF)</span>
                        <span></span>
                      </div>
                      
                      {leistungen.filter(l => showArchived || !l.is_archived).map((pos) => (
                        <div key={pos.id} className={`p-4 sm:px-5 sm:py-3 grid grid-cols-1 sm:grid-cols-[1fr_80px_100px_100px_100px_40px] gap-3 sm:gap-4 items-center transition-colors ${pos.is_archived ? 'bg-gray-50 opacity-60' : 'hover:bg-surface'}`}>
                          <div>
                            <span className="sm:hidden text-xs text-text-secondary font-semibold uppercase mb-1 block">Beschreibung</span>
                            <input 
                              type="text" 
                              value={pos.beschreibung}
                              onChange={(e) => handleUpdateLeistung(pos.id, 'beschreibung', e.target.value)}
                              className="w-full px-3 py-2 bg-transparent border border-border sm:border-transparent hover:border-border focus:border-primary-400 focus:bg-white rounded-lg text-sm text-text-primary outline-none transition-all"
                              placeholder="Beschreibung..."
                            />
                          </div>
                          <div>
                            <span className="sm:hidden text-xs text-text-secondary font-semibold uppercase mb-1 block">Einheit</span>
                            <input 
                              type="text" 
                              value={pos.einheit || ''}
                              onChange={(e) => handleUpdateLeistung(pos.id, 'einheit', e.target.value)}
                              className="w-full px-3 py-2 bg-transparent border border-border sm:border-transparent hover:border-border focus:border-primary-400 focus:bg-white rounded-lg text-sm text-text-primary outline-none transition-all sm:text-center"
                              placeholder="m² / Stk"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2 sm:contents">
                            <div>
                              <span className="sm:hidden text-xs text-text-secondary font-semibold uppercase mb-1 block">Material (CHF)</span>
                              <input 
                                type="number" 
                                value={pos.preis_material || ''}
                                onChange={(e) => handleUpdateLeistung(pos.id, 'preis_material', e.target.value)}
                                className="w-full px-3 py-2 bg-transparent border border-border sm:border-transparent hover:border-border focus:border-primary-400 focus:bg-white rounded-lg text-sm text-text-primary outline-none transition-all sm:text-right"
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <span className="sm:hidden text-xs text-text-secondary font-semibold uppercase mb-1 block">Arbeit (CHF)</span>
                              <input 
                                type="number" 
                                value={pos.preis_arbeit || ''}
                                onChange={(e) => handleUpdateLeistung(pos.id, 'preis_arbeit', e.target.value)}
                                className="w-full px-3 py-2 bg-transparent border border-border sm:border-transparent hover:border-border focus:border-primary-400 focus:bg-white rounded-lg text-sm text-text-primary outline-none transition-all sm:text-right"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:block w-full px-3 py-2 bg-surface-card sm:bg-transparent rounded-lg sm:rounded-none">
                            <span className="sm:hidden text-xs text-text-secondary font-semibold uppercase">Total:</span>
                            <span className="text-sm font-bold text-text-primary sm:font-semibold sm:text-right w-full sm:block">
                              {pos.einzelpreis?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                          <div className="flex justify-end pt-2 sm:pt-0 border-t border-border sm:border-0 mt-2 sm:mt-0">
                            {pos.is_archived ? (
                              <button 
                                onClick={() => handleArchiveLeistung(pos.id, false)}
                                className="px-3 py-1.5 sm:p-2 text-sm sm:text-base text-gray-500 hover:text-emerald-600 bg-emerald-50 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                                title="Wiederherstellen"
                              >
                                <span>♻️</span> <span className="sm:hidden font-medium">Wiederherstellen</span>
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleArchiveLeistung(pos.id, true)}
                                className="px-3 py-1.5 sm:p-2 text-sm sm:text-base text-gray-500 hover:text-red-600 bg-red-50 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                                title="Archivieren"
                              >
                                <span>📦</span> <span className="sm:hidden font-medium">Archivieren</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-text-secondary">
                Bitte links eine Kategorie auswählen.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
