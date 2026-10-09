import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatMoney } from '../lib/formatters'
import {
  IconFolder,
  IconCheck,
  IconRefresh,
  IconRapport,
  IconPlus,
  IconEdit,
  IconClose
} from '../components/icons/BrandIcons'
import NpkImportModal from '../components/katalog/NpkImportModal'

export default function KatalogView({ userRole }) {
  const [kategorien, setKategorien] = useState([])
  const [leistungen, setLeistungen] = useState([])
  const [activeKategorie, setActiveKategorie] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeKatMenu, setActiveKatMenu] = useState(null)
  const [activeLeistungMenu, setActiveLeistungMenu] = useState(null)
  const [mobileCatActionsOpen, setMobileCatActionsOpen] = useState(false)
  const [sortMode, setSortMode] = useState(false)
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [npkModalOpen, setNpkModalOpen] = useState(false)
  const [feedbackToast, setFeedbackToast] = useState(null)

  // Category Modal State
  const [categoryModal, setCategoryModal] = useState({ open: false, mode: 'create', kat: null, name: '' })
  const [deleteModal, setDeleteModal] = useState({ open: false, type: null, id: null, title: '' })

  // Mobile Bottom Sheet / Modal State for Leistung
  const [editSheet, setEditSheet] = useState({
    open: false,
    isNew: false,
    id: null,
    kategorie_id: null,
    beschreibung: '',
    einheit: 'm²',
    einzelpreis: '',
    ertragskonto: '3400 Dienstleistungserlöse',
    is_archived: false
  })

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
  const handleSaveCategoryModal = async (e) => {
    e.preventDefault()
    const name = categoryModal.name.trim()
    if (!name) return

    if (categoryModal.mode === 'create') {
      const { data, error } = await supabase.from('katalog_kategorien').insert([{ name, sort_order: kategorien.length }]).select()
      if (!error && data && data.length > 0) {
        setKategorien([...kategorien, data[0]])
        setActiveKategorie(data[0])
      }
    } else if (categoryModal.mode === 'rename' && categoryModal.kat) {
      const { data, error } = await supabase.from('katalog_kategorien').update({ name }).eq('id', categoryModal.kat.id).select()
      if (!error && data && data.length > 0) {
        setKategorien(kategorien.map(k => k.id === categoryModal.kat.id ? data[0] : k))
        if (activeKategorie?.id === categoryModal.kat.id) setActiveKategorie(data[0])
      }
    }
    setCategoryModal({ open: false, mode: 'create', kat: null, name: '' })
  }

  const confirmDelete = async () => {
    if (!deleteModal.id) return

    if (deleteModal.type === 'kategorie') {
      const id = deleteModal.id
      await supabase.from('katalog_leistungen').delete().eq('kategorie_id', id)
      await supabase.from('katalog_kategorien').delete().eq('id', id)
      
      const nextKategorien = kategorien.filter(k => k.id !== id)
      setKategorien(nextKategorien)
      setLeistungen(leistungen.filter(l => l.kategorie_id !== id))
      if (activeKategorie?.id === id) setActiveKategorie(nextKategorien[0] || null)
    } else if (deleteModal.type === 'leistung') {
      const id = deleteModal.id
      await supabase.from('katalog_leistungen').delete().eq('id', id)
      setLeistungen(prev => prev.filter(l => l.id !== id))
    }

    setDeleteModal({ open: false, type: null, id: null, title: '' })
  }

  const moveKategorie = async (index, direction) => {
    if (index + direction < 0 || index + direction >= kategorien.length) return
    
    const newKats = [...kategorien]
    const temp = newKats[index]
    newKats[index] = newKats[index + direction]
    newKats[index + direction] = temp
    
    newKats.forEach((k, i) => { k.sort_order = i })
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

  const handleImportNpk = async ({ positions, targetMode }) => {
    if (!positions || positions.length === 0) return

    try {
      if (targetMode === 'current' && activeKategorie) {
        const currentKatLeistungen = leistungen.filter(l => l.kategorie_id === activeKategorie.id)
        let nextOrder = currentKatLeistungen.length
        const toInsert = positions.map(pos => ({
          kategorie_id: activeKategorie.id,
          beschreibung: `${pos.npkCode} ${pos.titel}`,
          einheit: pos.einheit?.includes('m²') ? 'm²' : (pos.einheit?.includes('Stk') ? 'Stk' : (pos.einheit?.includes('m') ? 'm' : (pos.einheit?.includes('h') ? 'h' : 'Psch'))),
          einzelpreis: pos.richtpreis || 0,
          ertragskonto: '3400 Dienstleistungserlöse',
          sort_order: nextOrder++,
          is_archived: false
        }))
        const { data, error } = await supabase.from('katalog_leistungen').insert(toInsert).select()
        if (!error && data) {
          setLeistungen(prev => [...prev, ...data])
          setFeedbackToast(`${data.length} NPK-Positionen erfolgreich in "${activeKategorie.name}" importiert!`)
          setTimeout(() => setFeedbackToast(null), 4000)
        }
      } else {
        const chapterMap = {}
        positions.forEach(pos => {
          const capCode = pos.kapitelCode || pos.npkCode.split('.')[0]
          if (!chapterMap[capCode]) chapterMap[capCode] = []
          chapterMap[capCode].push(pos)
        })

        let updatedKats = [...kategorien]
        let addedLeistungen = []

        for (const [chCode, posList] of Object.entries(chapterMap)) {
          let cat = updatedKats.find(k => k.name.includes(`NPK ${chCode}`) || k.name.startsWith(chCode))
          if (!cat) {
            const catName = posList[0]?.kategorie ? `NPK ${chCode} ${posList[0].kategorie}` : `NPK Kapitel ${chCode}`
            const { data: newCatData } = await supabase.from('katalog_kategorien').insert([{
              name: catName,
              sort_order: updatedKats.length
            }]).select()
            if (newCatData && newCatData.length > 0) {
              cat = newCatData[0]
              updatedKats.push(cat)
            }
          }

          if (cat) {
            let nextOrder = leistungen.filter(l => l.kategorie_id === cat.id).length
            const toInsert = posList.map(pos => ({
              kategorie_id: cat.id,
              beschreibung: `${pos.npkCode} ${pos.titel}`,
              einheit: pos.einheit?.includes('m²') ? 'm²' : (pos.einheit?.includes('Stk') ? 'Stk' : (pos.einheit?.includes('m') ? 'm' : (pos.einheit?.includes('h') ? 'h' : 'Psch'))),
              einzelpreis: pos.richtpreis || 0,
              ertragskonto: '3400 Dienstleistungserlöse',
              sort_order: nextOrder++,
              is_archived: false
            }))
            const { data: insertedData } = await supabase.from('katalog_leistungen').insert(toInsert).select()
            if (insertedData) {
              addedLeistungen.push(...insertedData)
            }
          }
        }

        setKategorien(updatedKats)
        setLeistungen(prev => [...prev, ...addedLeistungen])
        if (updatedKats.length > 0 && !activeKategorie) {
          setActiveKategorie(updatedKats[updatedKats.length - 1])
        }
        setFeedbackToast(`${addedLeistungen.length} NPK-Positionen erfolgreich importiert!`)
        setTimeout(() => setFeedbackToast(null), 4000)
      }
    } catch (err) {
      console.error('Fehler beim NPK-Import:', err)
    }
  }

  const openNewLeistungSheet = () => {
    if (!activeKategorie && kategorien.length === 0) {
      setCategoryModal({ open: true, mode: 'create', kat: null, name: '' })
      return
    }
    setEditSheet({
      open: true,
      isNew: true,
      id: null,
      kategorie_id: activeKategorie?.id || kategorien[0]?.id,
      beschreibung: '',
      einheit: 'm²',
      einzelpreis: '',
      ertragskonto: '3400 Dienstleistungserlöse',
      is_archived: false
    })
  }

  const openEditLeistungSheet = (pos) => {
    setEditSheet({
      open: true,
      isNew: false,
      id: pos.id,
      kategorie_id: pos.kategorie_id,
      beschreibung: pos.beschreibung || '',
      einheit: pos.einheit || 'm²',
      einzelpreis: pos.einzelpreis !== undefined && pos.einzelpreis !== null ? pos.einzelpreis : '',
      ertragskonto: pos.ertragskonto || '3400 Dienstleistungserlöse',
      is_archived: !!pos.is_archived
    })
  }

  const handleSaveSheet = async (e) => {
    e.preventDefault()
    const beschreibung = editSheet.beschreibung.trim()
    if (!beschreibung) return

    const parsedPrice = editSheet.einzelpreis === '' ? 0 : parseFloat(editSheet.einzelpreis)
    const einzelpreis = isNaN(parsedPrice) ? 0 : parsedPrice
    const einheit = editSheet.einheit.trim() || 'm²'
    const ertragskonto = editSheet.ertragskonto || '3400 Dienstleistungserlöse'

    if (editSheet.isNew) {
      const katId = editSheet.kategorie_id || activeKategorie?.id
      const katLeistungen = leistungen.filter(l => l.kategorie_id === katId)
      const newLeistung = {
        kategorie_id: katId,
        beschreibung,
        einheit,
        einzelpreis,
        is_archived: false,
        sort_order: katLeistungen.length,
        ertragskonto
      }
      const { data, error } = await supabase.from('katalog_leistungen').insert([newLeistung]).select()
      if (!error && data && data.length > 0) {
        setLeistungen(prev => [...prev, data[0]])
      }
    } else if (editSheet.id) {
      const updateData = {
        beschreibung,
        einheit,
        einzelpreis,
        ertragskonto
      }
      const { error } = await supabase.from('katalog_leistungen').update(updateData).eq('id', editSheet.id)
      if (!error) {
        setLeistungen(prev => prev.map(l => l.id === editSheet.id ? { ...l, ...updateData } : l))
      }
    }

    setEditSheet({
      open: false,
      isNew: false,
      id: null,
      kategorie_id: null,
      beschreibung: '',
      einheit: 'm²',
      einzelpreis: '',
      ertragskonto: '3400 Dienstleistungserlöse',
      is_archived: false
    })
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

  const activeKatIndex = activeKategorie ? kategorien.findIndex(k => k.id === activeKategorie.id) : -1

  return (
    <div className="space-y-4 md:space-y-6">
      {/* ========================================================================= */}
      {/* 1. KOPFZEILE: Desktop vs. Mobile                                          */}
      {/* ========================================================================= */}
      
      {/* Desktop Header */}
      <div className="hidden md:flex flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Leistungskatalog</h2>
          <p className="text-text-secondary mt-1">Verwalte hier deine Kategorien und Preise für die Offerten.</p>
        </div>
        
        {/* Desktop Search & Actions */}
        <div className="flex items-center gap-2.5">
          {userRole !== 'treuhand' && (
            <button
              type="button"
              onClick={() => setNpkModalOpen(true)}
              className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 px-3.5 py-2.5 min-h-[44px] rounded-xl font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-98"
              title="Standardisierte Bau- und Malerleistungen nach Schweizer NPK / CRB importieren"
            >
              <span className="text-base leading-none">🇨🇭</span>
              <span>NPK / CRB Vorlagen</span>
            </button>
          )}

          <div className="w-auto relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Leistungen suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-9 py-2.5 min-h-[44px] w-64 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 shadow-xs transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                title="Suche leeren"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Integrated Top Bar (Clean, no empty spaces, direct action) */}
      <div className="md:hidden space-y-3">
        {/* Row 1: Search + Add Button */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Leistungen suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 min-h-[42px] bg-white border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 shadow-xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          {userRole !== 'treuhand' && (
            <>
              <button
                type="button"
                onClick={() => setNpkModalOpen(true)}
                className="shrink-0 min-h-[42px] px-2.5 py-2 bg-amber-50 active:bg-amber-100 text-amber-900 border border-amber-300/80 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                title="Schweizer NPK / CRB Vorlagen"
              >
                <span>🇨🇭</span>
                <span>NPK</span>
              </button>
              <button
                type="button"
                onClick={openNewLeistungSheet}
                className="shrink-0 min-h-[42px] px-3.5 py-2 bg-primary-600 active:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-primary-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <span className="text-base leading-none font-normal">+</span>
                <span>Leistung</span>
              </button>
            </>
          )}
        </div>

        {/* Row 2: Mobile Category Dropdown with "+ Neue Kategorie erstellen" Button inside */}
        {!isSearchActive && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-border rounded-xl text-sm font-semibold text-text-primary shadow-xs hover:border-primary-400 active:bg-neutral-50 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <IconFolder className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate">{activeKategorie?.name || 'Kategorie wählen'}</span>
                {activeKategorie && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-primary-50 text-primary-700 border border-primary-100 shrink-0">
                    {leistungen.filter(l => l.kategorie_id === activeKategorie.id && !l.is_archived).length}
                  </span>
                )}
              </div>
              <svg 
                className={`w-4 h-4 text-text-secondary transition-transform duration-200 shrink-0 ${categoryDropdownOpen ? 'rotate-180 text-primary-600' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {categoryDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setCategoryDropdownOpen(false)} 
                />
                
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in flex flex-col">
                  <div className="p-1.5 max-h-64 overflow-y-auto space-y-0.5">
                    {kategorien.length === 0 ? (
                      <div className="p-3 text-center text-xs text-text-secondary">
                        Noch keine Kategorien vorhanden.
                      </div>
                    ) : (
                      kategorien.map((kat) => {
                        const isActive = activeKategorie?.id === kat.id
                        const count = leistungen.filter(l => l.kategorie_id === kat.id && !l.is_archived).length
                        return (
                          <div
                            key={kat.id}
                            onClick={() => {
                              setActiveKategorie(kat)
                              setCategoryDropdownOpen(false)
                            }}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                              isActive 
                                ? 'bg-primary-50 text-primary-800' 
                                : 'text-text-primary hover:bg-neutral-50 active:bg-neutral-100'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-primary-600' : 'bg-transparent'}`} />
                              <span className="truncate">{kat.name}</span>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                              isActive ? 'bg-primary-200/60 text-primary-800' : 'bg-neutral-100 text-text-secondary'
                            }`}>
                              {count}
                            </span>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Action Button inside dropdown: Neue Kategorie erstellen */}
                  {userRole !== 'treuhand' && (
                    <div className="p-2 border-t border-border bg-neutral-50/80">
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryDropdownOpen(false)
                          setCategoryModal({ open: true, mode: 'create', kat: null, name: '' })
                        }}
                        className="w-full py-2.5 px-3 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm shadow-primary-600/20 transition-all cursor-pointer"
                      >
                        <span className="text-base leading-none font-normal">+</span>
                        <span>Neue Kategorie erstellen</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Row 3: Mobile Sub-bar with Status, Reorder-Toggle & Category-Actions */}
        <div className="flex items-center justify-between text-xs py-1 px-0.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text-primary">
              {isSearchActive ? `Ergebnisse (${displayedLeistungen.length})` : activeKategorie?.name || 'Positionen'}
            </span>
            <span className="text-[11px] text-text-secondary">
              ({displayedLeistungen.length})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Archive Filter Toggle */}
            <label className="flex items-center gap-1 text-[11px] font-medium text-text-secondary cursor-pointer">
              <input 
                type="checkbox" 
                checked={showArchived} 
                onChange={(e) => setShowArchived(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-border text-primary-600 focus:ring-primary-500 accent-primary-600"
              />
              <span>Archiv</span>
            </label>

            {/* Quick Sort Mode Toggle */}
            {!isSearchActive && displayedLeistungen.length > 1 && userRole !== 'treuhand' && (
              <button
                type="button"
                onClick={() => setSortMode(!sortMode)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                  sortMode 
                    ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {sortMode ? (
                  <>
                    <IconCheck className="w-3 h-3" />
                    <span>Fertig</span>
                  </>
                ) : (
                  <>
                    <IconRefresh className="w-3 h-3" />
                    <span>Sortieren</span>
                  </>
                )}
              </button>
            )}

            {/* Category Actions Button (⋯) */}
            {!isSearchActive && activeKategorie && userRole !== 'treuhand' && (
              <button
                type="button"
                onClick={() => setMobileCatActionsOpen(true)}
                className="p-1 text-text-secondary hover:text-text-primary hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                title="Kategorie-Aktionen"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. HAUPTBEREICH: Loading State                                            */}
      {/* ========================================================================= */}
      {isLoading ? (
        <div className="flex flex-col gap-3 p-4 sm:p-6 w-full animate-pulse bg-surface-card rounded-2xl border border-border shadow-xs">
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
          <div className="h-14 bg-gray-200 rounded-xl w-full"></div>
          <div className="h-14 bg-gray-200 rounded-xl w-full"></div>
          <div className="h-14 bg-gray-200 rounded-xl w-full"></div>
        </div>
      ) : (
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6">
          
          {/* ===================================================================== */}
          {/* Linke Spalte (Desktop only): Kategorien                               */}
          {/* ===================================================================== */}
          <div className={`hidden lg:flex lg:col-span-1 bg-surface-card rounded-2xl border border-border flex-col shadow-sm ${isSearchActive ? 'lg:opacity-50 lg:pointer-events-none' : ''}`}>
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface rounded-t-2xl">
              <h3 className="font-bold text-text-primary text-sm">Kategorien</h3>
              {userRole !== 'treuhand' && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNpkModalOpen(true)}
                    className="text-xs bg-amber-50 text-amber-800 hover:bg-amber-100 px-2 py-1.5 rounded-lg font-semibold border border-amber-200 transition-colors cursor-pointer"
                    title="NPK Katalog Vorlagen importieren"
                  >
                    🇨🇭 NPK
                  </button>
                  <button 
                    type="button"
                    onClick={() => setCategoryModal({ open: true, mode: 'create', kat: null, name: '' })}
                    className="text-xs bg-primary-100 text-primary-700 px-2.5 py-1.5 flex items-center gap-1 rounded-lg font-semibold hover:bg-primary-200 transition-colors cursor-pointer"
                  >
                    <span>+ Neu</span>
                  </button>
                </div>
              )}
            </div>
            
            {/* Desktop Category List */}
            <div className="flex flex-col p-3 space-y-1 overflow-y-auto max-h-[600px] hide-scrollbar">
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
                          ? 'bg-primary-50/50 border-primary-300 shadow-xs shadow-primary-500/10' 
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
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveKatMenu(activeKatMenu === kat.id ? null : kat.id);
                              }}
                              className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-black/5 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                              title="Optionen"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                            </button>
                            
                            {activeKatMenu === kat.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveKatMenu(null); }} />
                                <div className="absolute right-0 mt-1 w-36 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
                                  <div className="p-1">
                                    <button 
                                      type="button"
                                      onClick={() => { setActiveKatMenu(null); setCategoryModal({ open: true, mode: 'rename', kat, name: kat.name }); }} 
                                      className="w-full text-left px-3 py-2 text-xs font-medium text-text-primary hover:bg-primary-50 hover:text-primary-700 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                      Bearbeiten
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => { setActiveKatMenu(null); setDeleteModal({ open: true, type: 'kategorie', id: kat.id, title: kat.name }); }} 
                                      className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 mt-0.5 cursor-pointer"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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

          {/* ===================================================================== */}
          {/* Rechte Spalte: Leistungen                                             */}
          {/* ===================================================================== */}
          <div className="lg:col-span-3 bg-surface-card rounded-2xl border border-border flex flex-col shadow-xs min-h-[400px]">
            {isSearchActive || activeKategorie ? (
              <>
                {/* Desktop Inner Section Header */}
                <div className="hidden lg:flex p-4 border-b border-border flex-row justify-between items-center gap-4 bg-surface rounded-t-2xl">
                  <h3 className="font-bold text-text-primary flex items-center gap-2">
                    {isSearchActive ? (
                      <><svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> Suchergebnisse für "{searchTerm}"</>
                    ) : (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-primary-500 shadow-xs shadow-primary-500/50"></span>
                        {activeKategorie.name}
                      </>
                    )}
                  </h3>
                  
                  <div className="flex items-center gap-3 justify-end">
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
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setNpkModalOpen(true)}
                          className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 px-3 py-2 rounded-xl font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-98"
                          title="Schweizer NPK / CRB Positionen importieren"
                        >
                          <span>🇨🇭</span>
                          <span>Aus NPK importieren</span>
                        </button>
                        <button 
                          onClick={handleAddLeistung}
                          className="text-sm bg-primary-600 text-white px-4 py-2 flex items-center justify-center rounded-xl font-semibold hover:bg-primary-700 shadow-md shadow-primary-600/20 transition-all cursor-pointer whitespace-nowrap"
                        >
                          + Leistung
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content Container */}
                <div className="flex-1 overflow-y-auto pb-4 bg-neutral-50/20">
                  {displayedLeistungen.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center">
                      <div className="w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center mb-3 text-primary-400">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                      </div>
                      <p className="text-text-primary font-semibold text-sm mb-1">Keine Leistungen gefunden</p>
                      <p className="text-text-secondary text-xs max-w-xs">
                        {isSearchActive ? 'Versuche es mit einem anderen Suchbegriff.' : 'Füge neue Leistungen zu dieser Kategorie hinzu.'}
                      </p>
                      {!isSearchActive && userRole !== 'treuhand' && (
                        <button
                          type="button"
                          onClick={openNewLeistungSheet}
                          className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                        >
                          + Erste Leistung erstellen
                        </button>
                      )}
                    </div>
                  ) : (
                    <div>
                      {/* Desktop Table Header */}
                      <div className="hidden lg:grid grid-cols-[30px_1fr_80px_130px_120px_40px] gap-4 px-5 py-3 bg-white text-xs font-bold text-text-secondary uppercase tracking-wider sticky top-0 z-10 shadow-xs border-b border-border">
                        <span></span>
                        <span>Beschreibung</span>
                        <span className="text-center">Einheit</span>
                        <span className="text-center">Konto</span>
                        <span className="text-right text-primary-700">Preis CHF</span>
                        <span></span>
                      </div>
                      
                      {/* ===================================================== */}
                      {/* MOBILE VIEW: Ultra-compact, intelligent 2-row cards   */}
                      {/* ===================================================== */}
                      <div className="lg:hidden p-2.5 space-y-2">
                        {displayedLeistungen.map((pos, idx) => (
                          <div 
                            key={pos.id}
                            onClick={() => userRole !== 'treuhand' && openEditLeistungSheet(pos)}
                            className={`p-3 bg-white border border-border rounded-xl shadow-xs active:bg-neutral-50 transition-all flex flex-col gap-1.5 cursor-pointer relative ${
                              pos.is_archived ? 'opacity-60 bg-neutral-50' : ''
                            }`}
                          >
                            {/* Row 1: Title & Price */}
                            <div className="flex items-start justify-between gap-3">
                              <span className="font-semibold text-sm text-text-primary line-clamp-2 leading-snug flex-1">
                                {pos.beschreibung || 'Ohne Beschreibung'}
                              </span>
                              <div className="text-right shrink-0">
                                <div className="font-bold text-sm text-primary-700 font-mono">
                                  {formatMoney(pos.einzelpreis)} <span className="text-[11px] font-normal text-text-secondary font-sans">CHF</span>
                                </div>
                                <div className="text-[10px] text-text-secondary font-medium">
                                  / {pos.einheit || 'Pauschal'}
                                </div>
                              </div>
                            </div>

                            {/* Row 2: Badges & Actions */}
                            <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-text-secondary">
                                  {pos.ertragskonto?.split(' ')[0] || '3400'}
                                </span>
                                {isSearchActive && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary-50 text-primary-700">
                                    {kategorien.find(k => k.id === pos.kategorie_id)?.name || 'Katalog'}
                                  </span>
                                )}
                                {pos.is_archived && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    Archiviert
                                  </span>
                                )}
                              </div>

                              {/* Right: Quick Sort or 3-dots Menu */}
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                {sortMode && !isSearchActive ? (
                                  <div className="flex items-center gap-1">
                                    <button 
                                      type="button" 
                                      disabled={idx === 0} 
                                      onClick={() => moveLeistung(pos.id, idx, -1, displayedLeistungen)} 
                                      className="p-1.5 px-2 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 disabled:opacity-25 rounded-lg text-text-primary text-xs font-bold"
                                    >
                                      ↑
                                    </button>
                                    <button 
                                      type="button" 
                                      disabled={idx === displayedLeistungen.length - 1} 
                                      onClick={() => moveLeistung(pos.id, idx, 1, displayedLeistungen)} 
                                      className="p-1.5 px-2 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 disabled:opacity-25 rounded-lg text-text-primary text-xs font-bold"
                                    >
                                      ↓
                                    </button>
                                  </div>
                                ) : (
                                  userRole !== 'treuhand' && (
                                    <div className="relative">
                                      <button
                                        type="button"
                                        onClick={() => setActiveLeistungMenu(activeLeistungMenu === pos.id ? null : pos.id)}
                                        className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                                        title="Optionen"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                                      </button>

                                      {activeLeistungMenu === pos.id && (
                                        <>
                                          <div className="fixed inset-0 z-40" onClick={() => setActiveLeistungMenu(null)} />
                                          <div className="absolute right-0 bottom-full mb-1 w-44 bg-white border border-border rounded-xl shadow-xl z-50 p-1 animate-fade-in text-xs font-medium">
                                            <button
                                              type="button"
                                              onClick={() => { setActiveLeistungMenu(null); openEditLeistungSheet(pos); }}
                                              className="w-full text-left px-3 py-2 text-text-primary hover:bg-primary-50 hover:text-primary-700 rounded-lg flex items-center gap-2 cursor-pointer"
                                            >
                                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                              Bearbeiten
                                            </button>
                                            {!isSearchActive && (
                                              <>
                                                <button
                                                  type="button"
                                                  disabled={idx === 0}
                                                  onClick={() => { setActiveLeistungMenu(null); moveLeistung(pos.id, idx, -1, displayedLeistungen); }}
                                                  className="w-full text-left px-3 py-2 text-text-primary hover:bg-neutral-100 rounded-lg flex items-center gap-2 disabled:opacity-30 cursor-pointer"
                                                >
                                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                                  Nach oben
                                                </button>
                                                <button
                                                  type="button"
                                                  disabled={idx === displayedLeistungen.length - 1}
                                                  onClick={() => { setActiveLeistungMenu(null); moveLeistung(pos.id, idx, 1, displayedLeistungen); }}
                                                  className="w-full text-left px-3 py-2 text-text-primary hover:bg-neutral-100 rounded-lg flex items-center gap-2 disabled:opacity-30 cursor-pointer"
                                                >
                                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                  Nach unten
                                                </button>
                                              </>
                                            )}
                                            <button
                                              type="button"
                                              onClick={() => { setActiveLeistungMenu(null); handleArchiveLeistung(pos.id, !pos.is_archived); }}
                                              className="w-full text-left px-3 py-2 text-text-secondary hover:bg-neutral-100 rounded-lg flex items-center gap-2 cursor-pointer"
                                            >
                                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                              {pos.is_archived ? 'Wiederherstellen' : 'Archivieren'}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => { setActiveLeistungMenu(null); setDeleteModal({ open: true, type: 'leistung', id: pos.id, title: pos.beschreibung || 'Leistung' }); }}
                                              className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 mt-0.5 cursor-pointer"
                                            >
                                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                              Löschen
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* ===================================================== */}
                      {/* DESKTOP VIEW: Clean inline editable table             */}
                      {/* ===================================================== */}
                      <div className="hidden lg:block divide-y divide-border/50">
                        {displayedLeistungen.map((pos, idx) => (
                          <div key={pos.id} className={`px-5 py-2.5 grid grid-cols-[30px_1fr_80px_130px_120px_40px] gap-4 items-center transition-all bg-white hover:bg-neutral-50/80 ${pos.is_archived ? 'opacity-50 grayscale' : ''}`}>
                            
                            {/* Sort Controls (Desktop) */}
                            <div className="flex flex-col gap-0.5 items-center justify-center">
                              {!isSearchActive && (
                                <>
                                  <button onClick={() => moveLeistung(pos.id, idx, -1, displayedLeistungen)} disabled={idx === 0} className="p-0.5 text-gray-300 hover:text-primary-600 disabled:opacity-0 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg></button>
                                  <button onClick={() => moveLeistung(pos.id, idx, 1, displayedLeistungen)} disabled={idx === displayedLeistungen.length - 1} className="p-0.5 text-gray-300 hover:text-primary-600 disabled:opacity-0 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
                                </>
                              )}
                            </div>

                            {/* Beschreibung */}
                            <div>
                              <div className="relative">
                                {isSearchActive && <div className="absolute -top-3.5 left-1 text-[9px] text-primary-600 font-bold uppercase tracking-wider bg-primary-50 px-1.5 rounded">{kategorien.find(k => k.id === pos.kategorie_id)?.name}</div>}
                                <input 
                                  type="text" 
                                  value={pos.beschreibung}
                                  onChange={(e) => handleLocalUpdate(pos.id, 'beschreibung', e.target.value)}
                                  onBlur={(e) => handleSaveUpdate(pos.id, 'beschreibung', e.target.value)}
                                  disabled={userRole === 'treuhand'}
                                  className="w-full px-2.5 py-1.5 bg-transparent border border-transparent hover:border-border focus:bg-white focus:border-primary-400 rounded-lg text-sm font-medium text-text-primary outline-none transition-all disabled:opacity-80 disabled:cursor-not-allowed"
                                  placeholder="Beschreibung..."
                                />
                              </div>
                            </div>
                            
                            {/* Einheit */}
                            <div>
                              <input 
                                type="text" 
                                value={pos.einheit || ''}
                                onChange={(e) => handleLocalUpdate(pos.id, 'einheit', e.target.value)}
                                onBlur={(e) => handleSaveUpdate(pos.id, 'einheit', e.target.value)}
                                disabled={userRole === 'treuhand'}
                                className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-border focus:bg-white focus:border-primary-400 rounded-lg text-sm text-text-primary outline-none transition-all text-center disabled:opacity-80 disabled:cursor-not-allowed"
                                placeholder="m² / Stk"
                              />
                            </div>

                            {/* Ertragskonto */}
                            <div>
                              <select 
                                value={pos.ertragskonto || '3400 Dienstleistungserlöse'}
                                onChange={(e) => {
                                  handleLocalUpdate(pos.id, 'ertragskonto', e.target.value);
                                  handleSaveUpdate(pos.id, 'ertragskonto', e.target.value);
                                }}
                                disabled={userRole === 'treuhand'}
                                className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-border focus:bg-white focus:border-primary-400 rounded-lg text-xs text-text-secondary outline-none transition-all disabled:opacity-80 disabled:cursor-not-allowed"
                              >
                                <option value="3200 Handelserlöse">3200 Handelserlöse</option>
                                <option value="3400 Dienstleistungserlöse">3400 Dienstleistungserlöse</option>
                                <option value="3800 Sonstige Erlöse">3800 Sonstige Erlöse</option>
                              </select>
                            </div>

                            {/* Preis CHF */}
                            <div>
                              <div className="relative">
                                <input 
                                  type="number" 
                                  step="0.05"
                                  value={pos.einzelpreis || ''}
                                  onChange={(e) => handleLocalUpdate(pos.id, 'einzelpreis', e.target.value ? parseFloat(e.target.value) : 0)}
                                  onBlur={(e) => handleSaveUpdate(pos.id, 'einzelpreis', e.target.value ? parseFloat(e.target.value) : 0)}
                                  disabled={userRole === 'treuhand'}
                                  className="w-full px-2.5 py-1.5 bg-transparent border border-transparent hover:border-border focus:bg-white focus:border-primary-400 rounded-lg text-sm font-mono text-primary-700 outline-none transition-all text-right font-bold disabled:opacity-80 disabled:cursor-not-allowed"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>

                            {/* Desktop Actions Menu */}
                            <div className="flex justify-center relative">
                              {userRole !== 'treuhand' && (
                                <>
                                  <button 
                                    onClick={() => setActiveLeistungMenu(activeLeistungMenu === pos.id ? null : pos.id)}
                                    className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-black/5 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                                  </button>
                                  
                                  {activeLeistungMenu === pos.id && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActiveLeistungMenu(null); }} />
                                      <div className="absolute right-0 top-8 mt-1 w-44 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
                                        <div className="p-1">
                                          {pos.is_archived ? (
                                            <button 
                                              onClick={() => { setActiveLeistungMenu(null); handleArchiveLeistung(pos.id, false); }}
                                              className="w-full text-left px-3 py-2 text-xs text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                                            >
                                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                              Wiederherstellen
                                            </button>
                                          ) : (
                                            <button 
                                              onClick={() => { setActiveLeistungMenu(null); handleArchiveLeistung(pos.id, true); }}
                                              className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-neutral-100 hover:text-text-primary rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                                            >
                                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                              Archivieren
                                            </button>
                                          )}
                                          <button 
                                            type="button"
                                            onClick={() => { setActiveLeistungMenu(null); setDeleteModal({ open: true, type: 'leistung', id: pos.id, title: pos.beschreibung || 'Leistung' }); }}
                                            className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 mt-0.5 cursor-pointer"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
              <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center text-text-secondary">
                <div className="w-16 h-16 mb-3 bg-neutral-100 rounded-full flex items-center justify-center text-primary-600">
                  <IconRapport className="w-8 h-8 text-neutral-400" />
                </div>
                <h3 className="font-bold text-text-primary text-base mb-1">Keine Kategorie ausgewählt</h3>
                <p className="text-xs max-w-xs">Wähle eine Kategorie aus oder erstelle eine neue, um Leistungen anzuzeigen.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODALS & BOTTOM SHEETS                                                 */}
      {/* ========================================================================= */}

      {/* A. Mobile Bottom Sheet / Modal: Leistung bearbeiten / neu erstellen */}
      {editSheet.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" 
            onClick={() => setEditSheet({ ...editSheet, open: false })} 
          />
          
          {/* Sheet Container */}
          <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border z-10 flex flex-col max-h-[92vh] overflow-hidden animate-slide-in-up">
            {/* Sheet Header */}
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-surface rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {editSheet.isNew ? <IconPlus className="w-4 h-4" /> : <IconEdit className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-base text-text-primary leading-tight">
                    {editSheet.isNew ? 'Neue Leistung erfassen' : 'Leistung bearbeiten'}
                  </h3>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Kategorie: <span className="font-semibold text-text-primary">{kategorien.find(k => k.id === editSheet.kategorie_id)?.name || activeKategorie?.name || 'Katalog'}</span>
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setEditSheet({ ...editSheet, open: false })}
                className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary bg-neutral-100 hover:bg-neutral-200 rounded-full transition-colors cursor-pointer shrink-0"
                title="Schliessen"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveSheet} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Beschreibung */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Beschreibung / Leistungstext
                </label>
                <textarea
                  required
                  rows={3}
                  value={editSheet.beschreibung}
                  onChange={(e) => setEditSheet({ ...editSheet, beschreibung: e.target.value })}
                  placeholder="z.B. Abdecken und Schützen der Böden mit Vlies..."
                  className="w-full px-3 py-2.5 bg-neutral-50 border border-border rounded-xl text-sm text-text-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all resize-none shadow-xs"
                />
              </div>

              {/* Einheit + Schnellwahl-Chips */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Einheit
                </label>
                <input
                  type="text"
                  required
                  value={editSheet.einheit}
                  onChange={(e) => setEditSheet({ ...editSheet, einheit: e.target.value })}
                  placeholder="z.B. m², Stk, Std..."
                  className="w-full px-3 py-2 bg-neutral-50 border border-border rounded-xl text-sm text-text-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 mb-2 shadow-xs"
                />
                {/* Schnellwahl-Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {['m²', 'm', 'lfm', 'Stk', 'Std', 'Pauschal', 'kg', 'Zimmer'].map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setEditSheet({ ...editSheet, einheit: u })}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                        editSheet.einheit === u
                          ? 'bg-primary-600 text-white font-semibold shadow-xs'
                          : 'bg-neutral-100 hover:bg-neutral-200 text-text-secondary'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Einzelpreis & Ertragskonto (2 Spalten) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Einzelpreis in CHF
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-semibold text-text-secondary">CHF</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      inputMode="decimal"
                      value={editSheet.einzelpreis}
                      onChange={(e) => setEditSheet({ ...editSheet, einzelpreis: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-11 pr-3 py-2 bg-neutral-50 border border-border rounded-xl text-base font-bold font-mono text-primary-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 text-right shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Ertragskonto
                  </label>
                  <select
                    value={editSheet.ertragskonto}
                    onChange={(e) => setEditSheet({ ...editSheet, ertragskonto: e.target.value })}
                    className="w-full px-2.5 py-2 min-h-[40px] bg-neutral-50 border border-border rounded-xl text-xs text-text-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 cursor-pointer shadow-xs"
                  >
                    <option value="3400 Dienstleistungserlöse">3400 Dienstleistungserlöse</option>
                    <option value="3200 Handelserlöse">3200 Handelserlöse</option>
                    <option value="3800 Sonstige Erlöse">3800 Sonstige Erlöse</option>
                  </select>
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-3 border-t border-border flex items-center justify-between gap-2 mt-4">
                {!editSheet.isNew ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        handleArchiveLeistung(editSheet.id, !editSheet.is_archived)
                        setEditSheet({ ...editSheet, open: false })
                      }}
                      className="px-2.5 py-2 rounded-xl border border-border text-xs font-medium text-text-secondary hover:bg-neutral-100 transition-colors cursor-pointer"
                    >
                      {editSheet.is_archived ? 'Wiederherstellen' : 'Archivieren'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditSheet({ ...editSheet, open: false })
                        setDeleteModal({ open: true, type: 'leistung', id: editSheet.id, title: editSheet.beschreibung })
                      }}
                      className="p-2 rounded-xl text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer"
                      title="Löschen"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditSheet({ ...editSheet, open: false })}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium text-text-secondary hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold text-xs shadow-md shadow-primary-600/20 transition-all cursor-pointer"
                  >
                    Speichern
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B. Mobile Category Actions Sheet (Umbenennen, Löschen, Verschieben) */}
      {mobileCatActionsOpen && activeKategorie && (
        <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" 
            onClick={() => setMobileCatActionsOpen(false)} 
          />
          <div className="relative w-full max-w-sm bg-white rounded-t-2xl shadow-2xl border border-border z-10 p-4 space-y-2 animate-slide-in-up">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
                  <IconFolder className="w-4 h-4" />
                </span>
                <h4 className="font-bold text-sm text-text-primary">
                  {activeKategorie.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setMobileCatActionsOpen(false)}
                className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-text-primary bg-neutral-100 hover:bg-neutral-200 rounded-full transition-colors cursor-pointer"
                title="Schliessen"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setMobileCatActionsOpen(false)
                  setCategoryModal({ open: true, mode: 'rename', kat: activeKategorie, name: activeKategorie.name })
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-text-primary hover:bg-neutral-100 active:bg-neutral-200 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                Kategorie umbenennen
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={activeKatIndex <= 0}
                  onClick={() => {
                    moveKategorie(activeKatIndex, -1)
                    setMobileCatActionsOpen(false)
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold border border-border bg-neutral-50 text-text-primary hover:bg-neutral-100 disabled:opacity-30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>←</span> Nach links
                </button>
                <button
                  type="button"
                  disabled={activeKatIndex >= kategorien.length - 1}
                  onClick={() => {
                    moveKategorie(activeKatIndex, 1)
                    setMobileCatActionsOpen(false)
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold border border-border bg-neutral-50 text-text-primary hover:bg-neutral-100 disabled:opacity-30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  Nach rechts <span>→</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMobileCatActionsOpen(false)
                  setDeleteModal({ open: true, type: 'kategorie', id: activeKategorie.id, title: activeKategorie.name })
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 active:bg-red-100 flex items-center gap-2.5 transition-colors mt-1 cursor-pointer"
              >
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Kategorie löschen
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMobileCatActionsOpen(false)}
              className="w-full mt-2 py-2.5 text-center text-xs font-semibold text-text-secondary bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
            >
              Schliessen
            </button>
          </div>
        </div>
      )}

      {/* C. Category Modal (Create / Rename) */}
      {categoryModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-border">
            <h3 className="text-lg font-bold text-text-primary mb-2">
              {categoryModal.mode === 'create' ? 'Neue Kategorie erstellen' : 'Kategorie umbenennen'}
            </h3>
            <p className="text-xs text-text-secondary mb-4">
              {categoryModal.mode === 'create' 
                ? 'Gib einen Namen für die neue Leistungskategorie ein.' 
                : 'Passe den Namen dieser Kategorie an.'}
            </p>
            <form onSubmit={handleSaveCategoryModal} className="space-y-4">
              <input
                type="text"
                autoFocus
                required
                value={categoryModal.name}
                onChange={e => setCategoryModal({ ...categoryModal, name: e.target.value })}
                placeholder="z.B. Malerarbeiten, Fassade, Beratung..."
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-text-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 text-sm"
              />
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCategoryModal({ open: false, mode: 'create', kat: null, name: '' })}
                  className="w-1/2 py-2.5 bg-gray-100 hover:bg-gray-200 text-text-secondary font-semibold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* D. Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-border text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-1">Wirklich löschen?</h3>
            <p className="text-xs text-text-secondary mb-5 leading-relaxed">
              {deleteModal.type === 'kategorie'
                ? `Möchtest du die Kategorie "${deleteModal.title}" und alle darin enthaltenen Leistungen wirklich unwiderruflich löschen?`
                : `Möchtest du die Leistung "${deleteModal.title}" wirklich endgültig löschen?`}
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteModal({ open: false, type: null, id: null, title: '' })}
                className="w-1/2 py-2.5 bg-gray-100 hover:bg-gray-200 text-text-secondary font-semibold text-sm rounded-xl transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* E. NPK / CRB Import Modal */}
      <NpkImportModal
        isOpen={npkModalOpen}
        onClose={() => setNpkModalOpen(false)}
        activeKategorie={activeKategorie}
        onImport={handleImportNpk}
      />

      {/* Feedback Toast */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-sm font-medium animate-fade-in border border-neutral-700">
          <IconCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}
    </div>
  )
}
