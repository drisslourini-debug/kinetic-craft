import { useState, useMemo } from 'react'
import { getNpkChapters, searchNpkCatalog } from '../../lib/npkCatalog'
import { formatMoney } from '../../lib/formatters'
import { IconClose, IconSearch, IconCheck } from '../icons/BrandIcons'

export default function NpkImportModal({
  isOpen,
  onClose,
  activeKategorie,
  onImport
}) {
  const [selectedChapter, setSelectedChapter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCodes, setSelectedCodes] = useState([])
  const [importTargetMode, setImportTargetMode] = useState(activeKategorie ? 'current' : 'new_category')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const chapters = useMemo(() => getNpkChapters(), [])

  const filteredPositions = useMemo(() => {
    return searchNpkCatalog(searchTerm, selectedChapter === 'all' ? null : selectedChapter)
  }, [searchTerm, selectedChapter])

  if (!isOpen) return null

  const handleTogglePosition = (code) => {
    setSelectedCodes(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    )
  }

  const handleSelectAllVisible = () => {
    const visibleCodes = filteredPositions.map(p => p.npkCode)
    const allSelected = visibleCodes.every(c => selectedCodes.includes(c))
    if (allSelected) {
      setSelectedCodes(prev => prev.filter(c => !visibleCodes.includes(c)))
    } else {
      setSelectedCodes(prev => Array.from(new Set([...prev, ...visibleCodes])))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedCodes.length === 0) return

    const positionsToImport = searchNpkCatalog('', null).filter(p => selectedCodes.includes(p.npkCode))
    setIsSubmitting(true)
    try {
      await onImport({
        positions: positionsToImport,
        targetMode: importTargetMode
      })
      onClose()
    } catch (err) {
      console.error('Fehler beim NPK-Import:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const allVisibleSelected = filteredPositions.length > 0 && filteredPositions.every(p => selectedCodes.includes(p.npkCode))

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold text-lg border border-amber-200">
              🇨🇭
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2">
                Schweizer NPK / CRB Vorlagen importieren
              </h3>
              <p className="text-xs text-text-secondary">
                Standardisierte Schweizer Bau- & Handwerkerpositionen mit Richtpreisen in CHF
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Schliessen"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 sm:p-4 border-b border-neutral-100 space-y-3 bg-white">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <IconSearch className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="NPK-Code, Suchbegriff (z.B. Dispersion, Spachteln)..."
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                >
                  <IconClose className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleSelectAllVisible}
              className="text-xs px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-medium transition-colors cursor-pointer shrink-0"
            >
              {allVisibleSelected ? 'Auswahl aufheben' : 'Alle sichtbaren wählen'}
            </button>
          </div>

          {/* Chapters Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedChapter('all')}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedChapter === 'all'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              Alle Kapitel
            </button>
            {chapters.map(ch => (
              <button
                key={ch.code}
                type="button"
                onClick={() => setSelectedChapter(ch.code)}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedChapter === ch.code
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                }`}
              >
                {ch.code} {ch.titel}
              </button>
            ))}
          </div>
        </div>

        {/* Positions List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 max-h-[420px]">
          {filteredPositions.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 text-sm">
              Keine NPK-Positionen gefunden.
            </div>
          ) : (
            filteredPositions.map(pos => {
              const isSelected = selectedCodes.includes(pos.npkCode)
              return (
                <div
                  key={pos.npkCode}
                  onClick={() => handleTogglePosition(pos.npkCode)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                    isSelected
                      ? 'bg-amber-50/60 border-amber-300 shadow-xs'
                      : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="mt-1 w-4 h-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-500 pointer-events-none"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
                        NPK {pos.npkCode}
                      </span>
                      <span className="text-[11px] font-medium text-neutral-500">
                        {pos.einheit}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-neutral-900 leading-snug">
                      {pos.titel}
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2 leading-relaxed">
                      {pos.beschreibung}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-amber-900">
                      {formatMoney(pos.richtpreis)}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      CHF Richtpreis
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer Settings & Actions */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Target Mode Selector */}
          <div className="flex items-center gap-3 w-full sm:w-auto text-xs">
            <span className="font-semibold text-neutral-700">Ziel:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="targetMode"
                value="current"
                disabled={!activeKategorie}
                checked={importTargetMode === 'current'}
                onChange={() => setImportTargetMode('current')}
                className="text-amber-600 focus:ring-amber-500"
              />
              <span className={activeKategorie ? 'text-neutral-800' : 'text-neutral-400'}>
                Aktuelle Kat. {activeKategorie ? `(${activeKategorie.name})` : '(keine gewählt)'}
              </span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="targetMode"
                value="new_category"
                checked={importTargetMode === 'new_category'}
                onChange={() => setImportTargetMode('new_category')}
                className="text-amber-600 focus:ring-amber-500"
              />
              <span className="text-neutral-800">
                Neue NPK-Kategorien erstellen
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedCodes.length === 0 || isSubmitting}
              className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <IconCheck className="w-3.5 h-3.5" />
              <span>
                {selectedCodes.length === 0
                  ? 'Keine Positionen gewählt'
                  : `${selectedCodes.length} Position${selectedCodes.length > 1 ? 'en' : ''} importieren`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
