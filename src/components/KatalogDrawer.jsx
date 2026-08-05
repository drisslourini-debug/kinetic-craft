import { useState, useEffect } from 'react'
import { formatMoney } from '../lib/formatters'
import { supabase } from '../lib/supabase'

export default function KatalogDrawer({ onClose, onInsert }) {
  const [selectedItems, setSelectedItems] = useState([])
  const [catalog, setCatalog] = useState({})
  const [isLoading, setIsLoading] = useState(true)

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

  return (
    <>
      <div 
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-surface shadow-2xl z-50 flex flex-col transform transition-transform animate-slide-in-right">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-surface-card">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Aus Katalog einfügen</h2>
            <p className="text-xs text-text-secondary mt-1">Wähle Standardpositionen aus.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 sm:p-2 min-w-[48px] min-h-[48px] sm:min-w-0 sm:min-h-0 text-text-secondary hover:text-text-primary hover:bg-surface rounded-full transition-colors cursor-pointer flex items-center justify-center"
          >
            <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : Object.keys(catalog).length === 0 ? (
            <div className="text-center text-text-secondary py-8">
              Katalog ist leer.
            </div>
          ) : (
            Object.entries(catalog).map(([kategorie, items]) => (
              <div key={kategorie}>
                <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">{kategorie}</h3>
              <div className="space-y-2">
                {items.map((item, idx) => {
                  const isSelected = !!selectedItems.find(i => i.titel === item.titel && i.kategorie === kategorie)
                  return (
                    <div 
                      key={idx}
                      onClick={() => toggleItem(kategorie, item)}
                      className={`p-3 min-h-[48px] rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-primary-50 border-primary-300' 
                          : 'bg-surface border-border hover:border-primary-300 hover:bg-surface-card'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary-600 border-primary-600' : 'border-gray-300'}`}>
                        {isSelected && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <div>
                        <div className={`text-sm font-semibold ${isSelected ? 'text-primary-900' : 'text-text-primary'}`}>{item.titel}</div>
                        <div className="text-xs text-text-secondary mt-0.5">CHF {formatMoney(item.preis)} / {item.einheit}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )))}
        </div>

        <div className="p-6 border-t border-border bg-surface-card">
          <button
            onClick={handleInsert}
            disabled={selectedItems.length === 0}
            className="w-full min-h-[48px] py-3.5 bg-primary-600 text-white text-base font-bold rounded-xl hover:bg-primary-700 shadow-md shadow-primary-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {selectedItems.length > 0 ? `${selectedItems.length} Positionen einfügen` : 'Positionen einfügen'}
          </button>
        </div>
      </div>
    </>
  )
}
