import { useState, useEffect, useMemo } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { supabase } from '../lib/supabase'
import { formatMoney } from '../lib/formatters'

export default function KatalogView({ userRole }) {
  const [kategorien, setKategorien] = useState([])
  const [leistungen, setLeistungen] = useState([])
  const [activeKategorie, setActiveKategorie] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeKatMenu, setActiveKatMenu] = useState(null)
  const [activeLeistungMenu, setActiveLeistungMenu] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    if (!supabase) return
    setIsLoading(true)
    try {
      const [katRes, leisRes] = await Promise.all([
        supabase.from('katalog_kategorien').select('*').order('sort_order', { ascending: true }),
        supabase.from('katalog_leistungen').select('*').order('sort_order', { ascending: true })
      ])
      
      if (katRes.data) {
        setKategorien(katRes.data)
        if (katRes.data.length > 0) setActiveKategorie(katRes.data[0])
      }
      if (leisRes.data) {
        setLeistungen(leisRes.data)
      }
    } catch (err) {
      console.error('Fehler beim Laden des Katalogs:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // --- Category Actions ---
  const handleAddKategorie = async () => {
    const name = window.prompt('Name der neuen Kategorie:')
    if (!name) return
    const { data } = await supabase.from('katalog_kategorien').insert([{ name, sort_order: kategorien.length }]).select()
    if (data && data.length > 0) {
      setKategorien([...kategorien, data[0]])
      setActiveKategorie(data[0])
    }
  }

  const handleRenameKategorie = async (kat) => {
    const newName = window.prompt('Neuer Name für Kategorie:', kat.name)
    if (!newName || newName === kat.name) return
    
    try {
      const { data } = await supabase.from('katalog_kategorien').update({ name: newName }).eq('id', kat.id).select()
      if (data && data.length > 0) {
        setKategorien(kategorien.map(k => k.id === kat.id ? data[0] : k))
        if (activeKategorie?.id === kat.id) setActiveKategorie(data[0])
      }
    } catch (err) {
      console.error('Rename Fehler:', err)
    }
  }

  const handleDeleteKategorie = async (id) => {
    if (!window.confirm('Kategorie und alle enthaltenen Leistungen wirklich löschen?')) return
    
    await supabase.from('katalog_leistungen').delete().eq('kategorie_id', id)
    await supabase.from('katalog_kategorien').delete().eq('id', id)
    
    const nextKategorien = kategorien.filter(k => k.id !== id)
    setKategorien(nextKategorien)
    setLeistungen(leistungen.filter(l => l.kategorie_id !== id))
    if (activeKategorie?.id === id) setActiveKategorie(nextKategorien[0] || null)
  }

  const moveKategorie = async (index, direction) => {
    if (index + direction < 0 || index + direction >= kategorien.length) return
    
    const newKats = [...kategorien]
    const temp = newKats[index]
    newKats[index] = newKats[index + direction]
    newKats[index + direction] = temp
    
    newKats.forEach((k, i) => k.sort_order = i)
    setKategorien(newKats)
    
    for (let i = 0; i < newKats.length; i++) {
      await supabase.from('katalog_kategorien').update({ sort_order: i }).eq('id', newKats[i].id)
    }
  }

  // --- Leistung Actions ---
  const handleAddLeistung = async () => {
    if (!activeKategorie) return
    const katLeistungen = leistungen.filter(l => l.kategorie_id === activeKategorie.id)
    const newLeistung = {
      kategorie_id: activeKategorie.id,
      beschreibung: 'Neue Leistung',
      einheit: 'm²',
      einzelpreis: 0,
      is_archived: false,
      sort_order: katLeistungen.length,
      ertragskonto: '3400 Dienstleistungserlöse'
    }
    const { data } = await supabase.from('katalog_leistungen').insert([newLeistung]).select()
    if (data && data.length > 0) setLeistungen([...leistungen, data[0]])
  }

  const handleLocalUpdate = (id, field, value) => {
    setLeistungen(prev => prev.map(l => {
      if (l.id === id) {
        return { ...l, [field]: value }
      }
      return l
    }))
  }

  const handleSaveUpdate = async (id, field, value) => {
    const updateData = { [field]: value }
    try {
      const { error } = await supabase.from('katalog_leistungen').update(updateData).eq('id', id)
      if (error) {
        console.error('Update Fehler:', error)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleArchiveLeistung = async (id, isArchived = true) => {
    await supabase.from('katalog_leistungen').update({ is_archived: isArchived }).eq('id', id)
    setLeistungen(prev => prev.map(l => l.id === id ? { ...l, is_archived: isArchived } : l))
  }

  const handleDeleteLeistung = async (id) => {
    if (!window.confirm('Leistung endgültig löschen?')) return
    await supabase.from('katalog_leistungen').delete().eq('id', id)
    setLeistungen(prev => prev.filter(l => l.id !== id))
  }

  const moveLeistung = async (id, index, direction, displayList) => {
    if (index + direction < 0 || index + direction >= displayList.length) return
    
    const listCopy = [...displayList]
    const temp = listCopy[index]
    listCopy[index] = listCopy[index + direction]
    listCopy[index + direction] = temp
    
    setLeistungen(prev => {
      let allLeis = [...prev]
      listCopy.forEach((l, idx) => {
        const i = allLeis.findIndex(x => x.id === l.id)
        if (i !== -1) allLeis[i] = { ...allLeis[i], sort_order: idx }
      })
      return allLeis
    })
    
    for (let i = 0; i < listCopy.length; i++) {
      await supabase.from('katalog_leistungen').update({ sort_order: i }).eq('id', listCopy[i].id)
    }
  }

  // Filter & Display logic
  const isSearchActive = searchTerm.trim().length > 0
  
  let displayedLeistungen = []
  if (isSearchActive) {
    const term = searchTerm.toLowerCase()
    displayedLeistungen = leistungen.filter(l => 
      (showArchived || !l.is_archived) && 
      ((l.beschreibung || '').toLowerCase().includes(term))
    )
  } else if (activeKategorie) {
    displayedLeistungen = leistungen
      .filter(l => l.kategorie_id === activeKategorie.id && (showArchived || !l.is_archived))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Leistungskatalog</h2>
          <p className="text-text-secondary mt-1">Verwalte hier deine Kategorien und Preise für die Offerten.</p>
        </div>
        
        {/* Search Bar */}
        <div className="w-full sm:w-auto relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Suchen..."
            value={searchTerm}
            className="pl-10 pr-4 py-3 sm:py-2.5 min-h-[48px] sm:min-h-0 w-full sm:w-64 bg-surface-card border border-border rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 shadow-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4 p-6 w-full animate-pulse bg-surface-card rounded-2xl border border-border shadow-sm"><div className="h-6 bg-gray-200 rounded w-1/4"></div><div className="h-20 bg-gray-200 rounded w-full"></div><div className="h-20 bg-gray-200 rounded w-full"></div></div>
      ) : (
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6">
          
          {/* Linke Spalte: Kategorien (nur wenn keine Suche aktiv) */}
          <div className={`lg:col-span-1 bg-surface-card rounded-2xl border border-border flex flex-col shadow-sm ${isSearchActive ? 'hidden lg:flex lg:opacity-50 lg:pointer-events-none' : ''}`}>
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface rounded-t-2xl">
              <h3 className="font-bold text-text-primary">Kategorien</h3>
              {userRole !== 'treuhand' && (
                <button 
                  onClick={handleAddKategorie}
                  className="text-base sm:text-xs bg-primary-100 text-primary-700 px-4 py-2 sm:px-2 sm:py-1.5 min-h-[48px] sm:min-h-0 flex items-center justify-center rounded-lg font-semibold hover:bg-primary-200 transition-colors cursor-pointer"
                >
                  + Neu
                </button>
              )}
            </div>
            
            {/* Mobile Category Dropdown */}
            <div className="lg:hidden p-4 border-b border-border bg-surface">
              <select 
                value={activeKategorie?.id || ''} 
                className="w-full px-3 py-3 min-h-[48px] bg-white border border-border rounded-xl text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              >
                {kategorien.map(kat => (
                  <option key={kat.id} value={kat.id}>{kat.name} ({leistungen.filter(l => l.kategorie_id === kat.id && !l.is_archived).length})</option>
                ))}
              </select>
              
              {activeKategorie && userRole !== 'treuhand' && (
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => handleRenameKategorie(activeKategorie)} className="text-xs text-text-secondary hover:text-primary-600 font-medium">Umbenennen</button>
                  <button onClick={() => handleDeleteKategorie(activeKategorie.id)} className="text-xs text-text-secondary hover:text-red-600 font-medium">Löschen</button>
                </div>
              )}
            </div>

            {/* Desktop Category List */}
            <div className="hidden lg:flex flex-col p-3 space-y-1 overflow-y-auto max-h-[600px] hide-scrollbar">
              {kategorien.length === 0 ? (
                <div className="p-4 text-center text-sm text-text-secondary w-full">Keine Kategorien vorhanden.</div>
              ) : (
                kategorien.map((kat, idx) => {
                  const isActive = activeKategorie?.id === kat.id
                  const count = leistungen.filter(l => l.kategorie_id === kat.id && !l.is_archived).length
                  return (
                    <div 
                      key={kat.id}
                      onClick={() => setActiveKategorie(kat)}
                      className={`group relative flex flex-col justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                        isActive 
                          ? 'bg-primary-50/50 border-primary-300 shadow-sm shadow-primary-500/10' 
                          : 'bg-transparent border-transparent hover:bg-neutral-50 hover:border-border'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <div className="flex flex-col pr-8">
                          <span className={`font-semibold text-sm ${isActive ? 'text-primary-800' : 'text-text-primary'}`}>
                            {kat.name}
                          </span>
                          <span className={`text-xs mt-0.5 ${isActive ? 'text-primary-600' : 'text-text-secondary'}`}>
                            {count} Leistung{count !== 1 && 'en'}
                          </span>
                        </div>
                        
                        <div className="absolute right-2 top-2 flex items-center gap-1">
                          <div className="flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); moveKategorie(idx, -1); }} disabled={idx === 0} className="p-0.5 hover:bg-primary-100 rounded text-primary-600 disabled:opacity-30 disabled:hover:bg-transparent"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg></button>
                            <button onClick={(e) => { e.stopPropagation(); moveKategorie(idx, 1); }} disabled={idx === kategorien.length - 1} className="p-0.5 hover:bg-primary-100 rounded text-primary-600 disabled:opacity-30 disabled:hover:bg-transparent"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg></button>
                          </div>
                          
                          <div className="relative">
                            <button 
                              className="p-3 sm:p-1.5 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 text-text-secondary hover:text-text-primary hover:bg-black/5 rounded-lg transition-colors flex items-center justify-center"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                            </button>
                            
                            {activeKatMenu === kat.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveKatMenu(null); }} />
                                <div className="absolute right-0 mt-1 w-36 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
                                  <div className="p-1">
                                    <button 
                                      onClick={() => { setActiveKatMenu(null); handleRenameKategorie(kat); }} 
                                      className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-primary-50 hover:text-primary-700 rounded-lg transition-colors flex items-center gap-2"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                      Bearbeiten
                                    </button>
                                    <button 
                                      onClick={() => { setActiveKatMenu(null); handleDeleteKategorie(kat.id); }} 
                                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 mt-0.5"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                      Löschen
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Rechte Spalte: Leistungen */}
          <div className="lg:col-span-3 bg-surface-card rounded-2xl border border-border flex flex-col shadow-sm min-h-[500px]">
            {isSearchActive || activeKategorie ? (
              <>
                <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface rounded-t-2xl">
                  <h3 className="font-bold text-text-primary flex items-center gap-2">
                    {isSearchActive ? (
                      <><svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> Suchergebnisse für "{searchTerm}"</>
                    ) : (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-primary-500 shadow-sm shadow-primary-500/50"></span>
                        {activeKategorie.name}
                      </>
                    )}
                  </h3>
                  
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <label className="flex items-center gap-2 text-xs font-medium text-text-secondary cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-border">
                      <input 
                        type="checkbox" 
                        checked={showArchived} 
                        onChange={(e) => setShowArchived(e.target.checked)}
                        className="rounded border-border text-primary-600 focus:ring-primary-500 accent-primary-600"
                      />
                      Archivierte zeigen
                    </label>
                    
                    {!isSearchActive && userRole !== 'treuhand' && (
                      <button 
                        onClick={handleAddLeistung}
                        className="text-base sm:text-sm bg-primary-600 text-white px-4 py-3 sm:py-2 min-h-[48px] sm:min-h-0 w-full sm:w-auto flex items-center justify-center rounded-xl font-semibold hover:bg-primary-700 shadow-md shadow-primary-600/20 transition-all cursor-pointer whitespace-nowrap"
                      >
                        + Leistung
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pb-4 bg-neutral-50/30">
                  {displayedLeistungen.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                      <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4 text-primary-300">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                      </div>
                      <p className="text-text-primary font-semibold mb-1">Keine Leistungen gefunden</p>
                      <p className="text-text-secondary text-sm">
                        {isSearchActive ? 'Versuche es mit einem anderen Suchbegriff.' : 'Füge neue Leistungen zu dieser Kategorie hinzu.'}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50">
                      <div className="hidden lg:grid grid-cols-[30px_1fr_80px_130px_120px_40px] gap-4 px-5 py-3 bg-white text-xs font-bold text-text-secondary uppercase tracking-wider sticky top-0 z-10 shadow-sm border-b border-border">
                        <span></span>
                        <span>Beschreibung</span>
                        <span className="text-center">Einheit</span>
                        <span className="text-center">Konto</span>
                        <span className="text-right text-primary-700">Preis CHF</span>
                        <span></span>
                      </div>
                      
                      <div className="p-3 sm:p-0 space-y-3 sm:space-y-0 bg-neutral-50 lg:bg-transparent">
                        {displayedLeistungen.map((pos, idx) => (
                          <div key={pos.id} className={`sm:p-4 sm:px-5 grid grid-cols-1 lg:grid-cols-[30px_1fr_80px_130px_120px_40px] gap-3 lg:gap-4 items-center transition-all bg-white sm:bg-transparent rounded-xl sm:rounded-none border border-border sm:border-transparent sm:border-b sm:border-b-border/50 shadow-sm sm:shadow-none hover:bg-white ${pos.is_archived ? 'opacity-50 grayscale' : ''}`}>
                            
                            {/* Sort Controls (Desktop only) */}
                            <div className="hidden lg:flex flex-col gap-0.5 items-center justify-center">
                              {!isSearchActive && (
                                <>
                                  <button onClick={() => moveLeistung(pos.id, idx, -1, displayedLeistungen)} disabled={idx === 0} className="p-0.5 text-gray-300 hover:text-primary-600 disabled:opacity-0 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg></button>
                                  <button onClick={() => moveLeistung(pos.id, idx, 1, displayedLeistungen)} disabled={idx === displayedLeistungen.length - 1} className="p-0.5 text-gray-300 hover:text-primary-600 disabled:opacity-0 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
                                </>
                              )}
                            </div>

                            {/* Mobile Header Row */}
                            <div className="flex lg:hidden items-center justify-between px-4 pt-3 pb-2 border-b border-border/50 bg-neutral-50 rounded-t-xl">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Position</span>
                                {isSearchActive && (
                                  <span className="text-[10px] bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-semibold">
                                    {kategorien.find(k => k.id === pos.kategorie_id)?.name || 'Katalog'}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-1">
                                {!isSearchActive && (
                                  <>
                                    <button onClick={() => moveLeistung(pos.id, idx, -1, displayedLeistungen)} disabled={idx === 0} className="p-3 bg-white border border-border rounded text-text-secondary disabled:opacity-30 min-w-[48px] min-h-[48px] flex items-center justify-center"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg></button>
                                    <button onClick={() => moveLeistung(pos.id, idx, 1, displayedLeistungen)} disabled={idx === displayedLeistungen.length - 1} className="p-3 bg-white border border-border rounded text-text-secondary disabled:opacity-30 min-w-[48px] min-h-[48px] flex items-center justify-center"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg></button>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="px-4 pb-2 lg:p-0 pt-2 lg:pt-0">
                              <span className="lg:hidden text-[10px] text-text-secondary font-bold uppercase mb-1 block">Beschreibung</span>
                              <div className="relative">
                                {isSearchActive && <div className="hidden lg:block absolute -top-4 left-1 text-[9px] text-primary-600 font-bold uppercase tracking-wider bg-primary-50 px-1.5 rounded">{kategorien.find(k => k.id === pos.kategorie_id)?.name}</div>}
                                <input 
                                  type="text" 
                                  value={pos.beschreibung}
                                  onChange={(e) => handleLocalUpdate(pos.id, 'beschreibung', e.target.value)}
                                  onBlur={(e) => handleSaveUpdate(pos.id, 'beschreibung', e.target.value)}
                                  disabled={userRole === 'treuhand'}
                                  className="w-full px-3 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-surface lg:bg-transparent border border-border lg:border-transparent hover:border-border lg:focus:bg-white focus:border-primary-400 rounded-lg text-base sm:text-sm font-medium text-text-primary outline-none transition-all shadow-sm lg:shadow-none disabled:opacity-80 disabled:cursor-not-allowed"
                                  placeholder="Beschreibung..."
                                />
                              </div>
                            </div>
                            
                            <div className="px-4 pb-2 lg:p-0">
                              <span className="lg:hidden text-[10px] text-text-secondary font-bold uppercase mb-1 block">Einheit</span>
                              <input 
                                type="text" 
                                value={pos.einheit || ''}
                                onChange={(e) => handleLocalUpdate(pos.id, 'einheit', e.target.value)}
                                onBlur={(e) => handleSaveUpdate(pos.id, 'einheit', e.target.value)}
                                disabled={userRole === 'treuhand'}
                                className="w-full px-3 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-surface lg:bg-transparent border border-border lg:border-transparent hover:border-border lg:focus:bg-white focus:border-primary-400 rounded-lg text-base sm:text-sm text-text-primary outline-none transition-all lg:text-center shadow-sm lg:shadow-none disabled:opacity-80 disabled:cursor-not-allowed"
                                placeholder="m² / Stk"
                              />
                            </div>

                            <div className="px-4 pb-2 lg:p-0">
                              <span className="lg:hidden text-[10px] text-text-secondary font-bold uppercase mb-1 block">Ertragskonto</span>
                              <select 
                                value={pos.ertragskonto || '3400 Dienstleistungserlöse'}
                                onChange={(e) => {
                                  handleLocalUpdate(pos.id, 'ertragskonto', e.target.value);
                                  handleSaveUpdate(pos.id, 'ertragskonto', e.target.value);
                                }}
                                disabled={userRole === 'treuhand'}
                                className="w-full px-2 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-surface lg:bg-transparent border border-border lg:border-transparent hover:border-border lg:focus:bg-white focus:border-primary-400 rounded-lg text-base sm:text-xs text-text-secondary outline-none transition-all shadow-sm lg:shadow-none disabled:opacity-80 disabled:cursor-not-allowed"
                              >
                                <option value="3200 Handelserlöse">3200 Handelserlöse</option>
                                <option value="3400 Dienstleistungserlöse">3400 Dienstleistungserlöse</option>
                                <option value="3800 Sonstige Erlöse">3800 Sonstige Erlöse</option>
                              </select>
                            </div>

                            <div className="px-4 pb-2 lg:p-0">
                              <span className="lg:hidden text-[10px] text-primary-700 bg-primary-50 border border-primary-100 px-2 py-0.5 rounded font-bold uppercase mb-1.5 inline-block">Preis CHF</span>
                              <div className="relative">
                                <span className="absolute left-3 top-2 text-xs text-text-secondary lg:hidden">CHF</span>
                                <input 
                                  type="number" 
                                  value={pos.einzelpreis || ''}
                                  onChange={(e) => handleLocalUpdate(pos.id, 'einzelpreis', e.target.value ? parseFloat(e.target.value) : 0)}
                                  onBlur={(e) => handleSaveUpdate(pos.id, 'einzelpreis', e.target.value ? parseFloat(e.target.value) : 0)}
                                  disabled={userRole === 'treuhand'}
                                  className="w-full pl-9 pr-3 py-3 sm:py-2 lg:px-3 min-h-[48px] sm:min-h-0 bg-surface lg:bg-transparent border border-border lg:border-transparent hover:border-border lg:focus:bg-white focus:border-primary-400 rounded-lg text-base sm:text-sm font-mono text-primary-700 outline-none transition-all lg:text-right shadow-sm lg:shadow-none font-bold disabled:opacity-80 disabled:cursor-not-allowed"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>



                            <div className="flex justify-end lg:justify-center p-3 lg:p-0 border-t border-border/50 lg:border-none bg-white lg:bg-transparent rounded-b-xl lg:rounded-none relative">
                              {userRole !== 'treuhand' && (
                                <>
                                  <button 
                                    onClick={() => setActiveLeistungMenu(activeLeistungMenu === pos.id ? null : pos.id)}
                                    className="p-3 sm:p-1.5 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 text-text-secondary hover:text-text-primary hover:bg-black/5 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                                  </button>
                                  
                                  {activeLeistungMenu === pos.id && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveLeistungMenu(null); }} />
                                      <div className="absolute right-3 lg:right-0 top-10 lg:top-8 mt-1 w-48 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
                                        <div className="p-1">
                                          {pos.is_archived ? (
                                            <button 
                                              onClick={() => { setActiveLeistungMenu(null); handleArchiveLeistung(pos.id, false); }}
                                              className="w-full text-left px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                              Wiederherstellen
                                            </button>
                                          ) : (
                                            <button 
                                              onClick={() => { setActiveLeistungMenu(null); handleArchiveLeistung(pos.id, true); }}
                                              className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-neutral-100 hover:text-text-primary rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                              Archivieren
                                            </button>
                                          )}
                                          <button 
                                            onClick={() => { setActiveLeistungMenu(null); handleDeleteLeistung(pos.id); }}
                                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 mt-0.5 cursor-pointer"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            Endgültig löschen
                                          </button>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-text-secondary">
                <div className="w-20 h-20 mb-4 bg-neutral-100 rounded-full flex items-center justify-center text-3xl">👈</div>
                <h3 className="font-bold text-text-primary text-lg mb-2">Keine Kategorie ausgewählt</h3>
                <p>Wähle links eine Kategorie aus, um Leistungen anzuzeigen und zu bearbeiten.</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
