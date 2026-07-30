import { useState } from 'react'
import { formatMoney } from '../lib/formatters'
import { DEFAULT_CATALOG } from '../lib/constants'

export default function KatalogDrawer({ onClose, onInsert }) {
  const [selectedItems, setSelectedItems] = useState([])

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
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface rounded-full transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {Object.entries(DEFAULT_CATALOG).map(([kategorie, items]) => (
            <div key={kategorie}>
              <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">{kategorie}</h3>
              <div className="space-y-2">
                {items.map((item, idx) => {
                  const isSelected = !!selectedItems.find(i => i.titel === item.titel && i.kategorie === kategorie)
                  return (
                    <div 
                      key={idx}
                      onClick={() => toggleItem(kategorie, item)}
                      className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-primary-50 border-primary-300' 
                          : 'bg-surface border-border hover:border-primary-300 hover:bg-surface-card'
                      }`}
                    >
                      <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary-600 border-primary-600' : 'border-gray-300'}`}>
                        {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
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
          ))}
        </div>

        <div className="p-6 border-t border-border bg-surface-card">
          <button
            onClick={handleInsert}
            disabled={selectedItems.length === 0}
            className="w-full py-3.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 shadow-md shadow-primary-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {selectedItems.length > 0 ? `${selectedItems.length} Positionen einfügen` : 'Positionen einfügen'}
          </button>
        </div>
      </div>
    </>
  )
}
