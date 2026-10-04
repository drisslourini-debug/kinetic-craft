import { useState, useEffect, useMemo } from 'react'
import { formatMoney } from '../lib/formatters'
import { supabase } from '../lib/supabase'

export default function KatalogDrawer({ onClose, onInsert }) {
  const [selectedItems, setSelectedItems] = useState([])
  const [catalog, setCatalog] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function fetchCatalog() {
      try {
        const { data: kategorien } = await supabase.from('katalog_kategorien').select('*').order('sort_order', { ascending: true })
        const { data: leistungen } = await supabase.from('katalog_leistungen').select('*').order('sort_order', { ascending: true })
        
        if (kategorien && leistungen) {
          const newCatalog = {}
          kategorien.forEach(k => {
            const catLeistungen = leistungen.filter(l => l.kategorie_id === k.id && !l.is_archived)
            newCatalog[k.name] = catLeistungen.map(l => ({
              titel: l.beschreibung,
              einheit: l.einheit || 'Pauschal',
              preis: parseFloat(l.einzelpreis) || 0
            }))
          })
          setCatalog(newCatalog)
        }
      } catch (err) {
        console.error('Error fetching catalog:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCatalog()
  }, [])

  const filteredCatalog = useMemo(() => {
    if (!searchTerm.trim()) return catalog
    const term = searchTerm.toLowerCase()
    const result = {}

    Object.entries(catalog).forEach(([kategorie, items]) => {
      const matched = items.filter(i => 
        i.titel.toLowerCase().includes(term) || kategorie.toLowerCase().includes(term)
      )
      if (matched.length > 0) {
        result[kategorie] = matched
      }
    })
    return result
  }, [catalog, searchTerm])

  const toggleItem = (kategorie, item) => {
    const exists = selectedItems.find(i => i.titel === item.titel && i.kategorie === kategorie)
    if (exists) {
      setSelectedItems(selectedItems.filter(i => !(i.titel === item.titel && i.kategorie === kategorie)))
    } else {
      setSelectedItems([...selectedItems, { ...item, kategorie }])
    }
  }

  const handleInsert = () => {
    onInsert(selectedItems)
    onClose()
  }

  const totalPositionsCount = Object.values(filteredCatalog).reduce((acc, items) => acc + items.length, 0)

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-surface shadow-2xl z-50 flex flex-col transform transition-transform animate-slide-in-right">
        {/* Header */}
        <div className="p-6 border-b border-border bg-surface-card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-text-primary">Aus Katalog einfügen</h2>
              <p className="text-xs text-text-secondary mt-0.5">Wähle Standardpositionen für dein Dokument.</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
              title="Schliessen"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Quick Search in Drawer */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Positionen durchsuchen..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 text-text-primary"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Selection indicator */}
          {selectedItems.length > 0 && (
            <div className="flex items-center justify-between text-xs pt-1 text-primary-700">
              <span className="font-semibold">{selectedItems.length} Position{selectedItems.length !== 1 && 'en'} ausgewählt</span>
              <button
                type="button"
                onClick={() => setSelectedItems([])}
                className="hover:underline text-text-secondary cursor-pointer"
              >
                Alle abwählen
              </button>
            </div>
          )}
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-text-secondary">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
              <p className="text-xs">Katalog wird geladen...</p>
            </div>
          ) : totalPositionsCount === 0 ? (
            <div className="text-center text-text-secondary py-12 space-y-2">
              <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-xl">🔍</div>
              <p className="font-semibold text-text-primary text-sm">Keine passenden Positionen</p>
              <p className="text-xs">{searchTerm ? 'Versuche einen anderen Suchbegriff.' : 'Der Katalog ist aktuell leer.'}</p>
            </div>
          ) : (
            Object.entries(filteredCatalog).map(([kategorie, items]) => (
              <div key={kategorie}>
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                  {kategorie}
                </h3>
                <div className="space-y-2">
                  {items.map((item, idx) => {
                    const isSelected = !!selectedItems.find(i => i.titel === item.titel && i.kategorie === kategorie)
                    return (
                      <div 
                        key={idx}
                        onClick={() => toggleItem(kategorie, item)}
                        className={`p-3 min-h-[48px] rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-primary-50/80 border-primary-400 shadow-xs' 
                            : 'bg-white border-border hover:border-primary-300 hover:bg-neutral-50'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-300 bg-white'
                        }`}>
                          {isSelected && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-semibold truncate ${isSelected ? 'text-primary-950' : 'text-text-primary'}`}>{item.titel}</div>
                          <div className="text-xs text-text-secondary mt-0.5">CHF {formatMoney(item.preis)} / {item.einheit}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-border bg-surface-card">
          <button
            onClick={handleInsert}
            disabled={selectedItems.length === 0}
            className="w-full min-h-[48px] py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-md shadow-primary-600/20 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {selectedItems.length > 0 ? `${selectedItems.length} Position${selectedItems.length !== 1 ? 'en' : ''} einfügen` : 'Positionen einfügen'}
          </button>
        </div>
      </div>
    </>
  )
}
