import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/formatters'
import { recalculatePositions } from '../../lib/calculations'

export default function RechnungLeistungsTabelle({
  isEditing,
  leistungen,
  editLeistungen,
  onChangeLeistungen,
  mwst,
  onShowKatalogDrawer
}) {
  const [showNewPositionForm, setShowNewPositionForm] = useState(false)
  const [dbKategorien, setDbKategorien] = useState([])
  const [newPosData, setNewPosData] = useState({
    beschreibung: '', menge: '', einheit: 'Stück (Stk)', einzelpreis: '', saveToKatalog: false, kategorie_id: '', ertragskonto: '3400 Dienstleistungserlöse'
  })

  // Lade Katalog-Kategorien für das Speichern
  useEffect(() => {
    async function loadKategorien() {
      if (isEditing && supabase) {
        const { data } = await supabase.from('katalog_kategorien').select('*').order('sort_order')
        if (data) {
          setDbKategorien(data)
          if (data.length > 0) {
            setNewPosData(prev => ({ ...prev, kategorie_id: data[0].id }))
          }
        }
      }
    }
    loadKategorien()
  }, [isEditing])

  const addTitle = () => {
    onChangeLeistungen(recalculatePositions([...editLeistungen, {
      _id: Date.now(),
      type: 'title',
      posNr: '',
      beschreibung: 'Neuer Titel',
      menge: '',
      einheit: '',
      einzelpreis: '',
      optional: false,
    }]))
  }

  const movePosition = (index, direction) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= editLeistungen.length) return
    const updated = [...editLeistungen]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp
    onChangeLeistungen(recalculatePositions(updated))
  }

  const updatePosition = (id, field, value) => {
    onChangeLeistungen(editLeistungen.map(p => p._id === id ? { ...p, [field]: value } : p))
  }

  const deletePosition = (id) => {
    onChangeLeistungen(recalculatePositions(editLeistungen.filter(p => p._id !== id)))
  }

  // Removed brutto/netto calculation for simplicity

  const handleAddNewPosition = async () => {
    if (!newPosData.beschreibung) {
      alert('Bitte einen Namen/Beschreibung eingeben.');
      return;
    }

    const pos = {
      _id: Date.now(),
      type: 'position',
      posNr: '',
      beschreibung: newPosData.beschreibung,
      menge: newPosData.menge,
      einheit: newPosData.einheit,
      einzelpreis: newPosData.einzelpreis,
      kategorie: newPosData.kategorie,
      optional: false,
    };

    onChangeLeistungen(recalculatePositions([...editLeistungen, pos]));

    if (newPosData.saveToKatalog) {
      try {
        if (newPosData.kategorie_id) {
          await supabase.from('katalog_leistungen').insert([{
            kategorie_id: newPosData.kategorie_id,
            beschreibung: newPosData.beschreibung,
            einheit: newPosData.einheit,
            einzelpreis: newPosData.einzelpreis ? parseFloat(newPosData.einzelpreis) : 0,
            sort_order: 999,
            ertragskonto: newPosData.ertragskonto
          }]);
        }
      } catch (err) {
        console.error('Fehler beim Speichern in Katalog', err);
      }
    }

    setNewPosData({
      beschreibung: '', menge: '', einheit: 'Stück (Stk)', einzelpreis: '', saveToKatalog: false, kategorie_id: dbKategorien.length > 0 ? dbKategorien[0].id : '', ertragskonto: '3400 Dienstleistungserlöse'
    });
    setShowNewPositionForm(false);
  }

  return (
    <div className="w-full">
      <div className="bg-surface-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-text-primary">Leistungsverzeichnis</h3>
          {isEditing && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <button
                onClick={addTitle}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-3 min-h-[48px] bg-surface-card text-text-primary border border-border font-semibold text-base sm:text-xs sm:py-1.5 sm:min-h-0 rounded-lg hover:bg-surface transition-colors cursor-pointer"
              >
                ➕ Titel
              </button>
              <button
                onClick={onShowKatalogDrawer}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-3 min-h-[48px] bg-primary-50 text-primary-700 border border-primary-200 font-semibold text-base sm:text-xs sm:py-1.5 sm:min-h-0 rounded-lg hover:bg-primary-100 transition-colors cursor-pointer"
              >
                📖 Aus Katalog
              </button>
              <button
                onClick={() => setShowNewPositionForm(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-3 min-h-[48px] bg-primary-50 text-primary-700 border border-primary-200 font-semibold text-base sm:text-xs sm:py-1.5 sm:min-h-0 rounded-lg hover:bg-primary-100 transition-colors cursor-pointer"
              >
                ➕ Neue Leistung
              </button>
            </div>
          )}
        </div>
        
        {/* ===== READ MODE ===== */}
        {!isEditing && (
          <>
            {leistungen.length === 0 ? (
              <div className="p-8 text-center text-text-secondary">Keine Leistungen gefunden.</div>
            ) : (
              <div className="divide-y divide-border">
                <div className="hidden sm:grid grid-cols-[60px_1fr_80px_80px_100px_120px] gap-4 px-5 py-3 bg-surface-card text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  <span>Pos.</span>
                  <span>Beschreibung</span>
                  <span className="text-right">Menge</span>
                  <span>Einh.</span>
                  <span className="text-right">Preis</span>
                  <span className="text-right">Total</span>
                </div>
                
                {leistungen.map((pos, idx) => {
                  const isKategorie = pos.type === 'title'
                  const posTotal = isKategorie ? 0 : ((parseFloat(pos.menge) || 0) * (parseFloat(pos.einzelpreis) || 0))
                  const isInfo = isKategorie || ((pos.menge === '' || pos.menge === undefined || pos.menge === null) && (pos.einzelpreis === '' || pos.einzelpreis === undefined || pos.einzelpreis === null))
                  
                  return (
                    <div key={idx} className={`p-4 sm:px-5 sm:py-3 hover:bg-primary-50/30 transition-colors ${isKategorie ? 'bg-surface-card border-b-2 border-border/50 shadow-sm mt-2' : isInfo ? 'bg-surface' : ''} ${pos.optional ? 'opacity-60' : ''}`}>
                      
                      {/* --- MOBILE COMPACT VIEW --- */}
                      <div className="sm:hidden flex justify-between items-start w-full gap-3">
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className={`text-sm text-text-primary ${isKategorie ? 'font-bold text-base' : 'font-medium'}`}>
                            <span className="font-bold text-text-secondary mr-2">{pos.posNr || (idx + 1)}</span>
                            {pos.beschreibung}
                            {pos.optional && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Option</span>}
                          </div>
                          {!isInfo && (
                            <div className="text-xs text-text-secondary mt-1">
                              {pos.menge} {pos.einheit} à {formatCurrency(parseFloat(pos.einzelpreis) || 0)}
                            </div>
                          )}
                        </div>
                        {!isInfo && (
                          <div className="text-sm font-bold text-text-primary shrink-0 pt-0.5 whitespace-nowrap">
                            {formatCurrency(posTotal)}
                          </div>
                        )}
                      </div>

                      {/* --- DESKTOP TABLE VIEW --- */}
                      <div className="hidden sm:grid sm:grid-cols-[60px_1fr_80px_80px_100px_120px] gap-4 items-center">
                        <div className="text-xs font-bold text-text-secondary">
                          {pos.posNr || (idx + 1)}
                        </div>
                        <div className={`text-sm text-text-primary ${isKategorie ? 'font-bold text-base' : 'font-medium'}`}>
                          {pos.beschreibung}
                          {pos.optional && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">Option</span>}
                        </div>
                        {!isInfo ? (
                          <>
                            <div className="text-sm text-text-secondary text-right">{pos.menge}</div>
                            <div className="text-sm text-text-secondary">{pos.einheit}</div>
                            <div className="text-sm text-text-secondary text-right">{formatCurrency(parseFloat(pos.einzelpreis) || 0)}</div>
                            <div className="text-sm font-bold text-text-primary text-right">{formatCurrency(posTotal)}</div>
                          </>
                        ) : (
                          <div className="col-span-4"></div>
                        )}
                      </div>

                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ===== EDIT MODE ===== */}
        {isEditing && (
          <div className="divide-y divide-border">
            {editLeistungen.length === 0 ? (
              <div className="p-8 text-center text-text-secondary">
                Keine Positionen. Klicke auf "Position hinzufügen" um zu starten.
              </div>
            ) : (
              editLeistungen.map((pos, idx) => (
                <div key={pos._id} className={`p-4 space-y-3 ${pos.optional ? 'bg-amber-50/30' : ''}`}>
                  {/* Row: Order controls + Description */}
                  <div className="flex items-start gap-3">
                    {/* Move & Delete */}
                    <div className="flex flex-col gap-0.5 pt-1">
                      <button
                        onClick={() => movePosition(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-surface text-text-secondary hover:text-text-primary disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                        title="Nach oben"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                      </button>
                      <button
                        onClick={() => movePosition(idx, 1)}
                        disabled={idx === editLeistungen.length - 1}
                        className="p-1 rounded hover:bg-surface text-text-secondary hover:text-text-primary disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                        title="Nach unten"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    </div>

                    {/* Position Number (Read Only Auto-Calc) */}
                    <div className="shrink-0 w-12 pt-2 text-center">
                      <span className="text-xs font-bold text-text-secondary">{pos.posNr}</span>
                    </div>

                    {/* Description Field */}
                    <div className="flex-1">
                      <textarea
                        rows={2}
                        value={pos.beschreibung}
                        onChange={(e) => updatePosition(pos._id, 'beschreibung', e.target.value)}
                        className={`w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-y min-h-[48px] ${pos.type === 'title' ? 'font-bold text-base bg-surface-card' : ''}`}
                        placeholder={pos.type === 'title' ? 'Titel...' : 'Beschreibung...'}
                      />
                    </div>

                    <div className="pt-1.5 flex items-center">
                      <button
                        onClick={() => deletePosition(pos._id)}
                        className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-secondary hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Löschen"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Options row: Optional toggle (only for positions) */}
                  {pos.type !== 'title' && (
                    <div className="pl-[76px] flex items-center gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={pos.optional}
                          onChange={(e) => updatePosition(pos._id, 'optional', e.target.checked)}
                          className="w-3.5 h-3.5 text-amber-600 rounded border-border focus:ring-amber-500 accent-amber-500"
                        />
                        <span className="font-semibold text-text-secondary uppercase tracking-wider">Optionale Position</span>
                      </label>
                    </div>
                  )}

                  {/* Quantity & Price Row (Not for Titles) */}
                  {pos.type !== 'title' && (
                    <div className="pl-[76px] grid grid-cols-2 sm:grid-cols-[100px_120px_1fr] gap-3 pt-2">
                      <div>
                        <input
                          type="number"
                          step="any"
                          value={pos.menge}
                          onChange={(e) => updatePosition(pos._id, 'menge', e.target.value)}
                          className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-right focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                          placeholder="Menge"
                        />
                      </div>
                      <div>
                        <select
                          value={pos.einheit}
                          onChange={(e) => updatePosition(pos._id, 'einheit', e.target.value)}
                          className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                        >
                          <option value="Stück (Stk)">Stück (Stk)</option>
                          <option value="Stunde (h)">Stunde (h)</option>
                          <option value="Tag (d)">Tag (d)</option>
                          <option value="Monat (mo)">Monat (mo)</option>
                          <option value="Pauschalpreis">Pauschalpreis</option>
                          <option value="Kilogramm (kg)">Kilogramm (kg)</option>
                          <option value="Quadratmeter (m²)">Quadratmeter (m²)</option>
                        </select>
                      </div>
                      <div className="col-span-2 sm:col-span-1 flex items-center gap-2">
                        <span className="text-text-secondary text-sm">à CHF</span>
                        <input
                          type="number"
                          step="0.05"
                          value={pos.einzelpreis}
                          onChange={(e) => updatePosition(pos._id, 'einzelpreis', e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-right focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* === ADD POSITION DROP-ZONE BUTTON === */}
            {!showNewPositionForm && (
              <div className="mt-6 mb-6 mx-4">
                <button
                  onClick={() => setShowNewPositionForm(true)}
                  className="w-full min-h-[48px] py-3 flex items-center justify-center gap-2 text-base font-semibold text-gray-500 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-100 hover:border-gray-400 hover:text-gray-700 transition-all cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Position hinzufügen
                </button>
              </div>
            )}

            {/* NEW POSITION FORM */}
            {showNewPositionForm && (
              <div className="p-5 border-b border-border bg-orange-50/50 animate-slide-in-right">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-sm text-orange-800 flex items-center gap-2">
                    <span className="text-orange-500">✨</span> Neue Leistung
                  </h4>
                  <button onClick={() => setShowNewPositionForm(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-text-secondary font-semibold block mb-1">Beschreibung / Titel</label>
                    <input
                      type="text"
                      autoFocus
                      value={newPosData.beschreibung}
                      onChange={(e) => setNewPosData(prev => ({ ...prev, beschreibung: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
                      placeholder="Was wird geliefert oder geleistet?"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNewPosition()}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-text-secondary font-semibold block mb-1">Einheit</label>
                      <select 
                        value={newPosData.einheit}
                        onChange={(e) => setNewPosData(prev => ({ ...prev, einheit: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
                      >
                        <option value="Stück (Stk)">Stück (Stk)</option>
                        <option value="Stunde (h)">Stunde (h)</option>
                        <option value="Tag (d)">Tag (d)</option>
                        <option value="Monat (mo)">Monat (mo)</option>
                        <option value="Pauschalpreis">Pauschalpreis</option>
                        <option value="Kilogramm (kg)">Kilogramm (kg)</option>
                        <option value="Quadratmeter (m²)">Quadratmeter (m²)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-text-secondary font-semibold block mb-1">Menge</label>
                      <input
                        type="number"
                        step="any"
                        value={newPosData.menge}
                        onChange={(e) => setNewPosData(prev => ({ ...prev, menge: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
                        placeholder="0"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddNewPosition()}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-secondary font-semibold block mb-1">Einzelpreis CHF (Netto)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={newPosData.einzelpreis}
                        onChange={(e) => setNewPosData(prev => ({ ...prev, einzelpreis: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
                        placeholder="0.00"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddNewPosition()}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-5 pt-4 border-t border-orange-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newPosData.saveToKatalog}
                        onChange={(e) => setNewPosData(prev => ({ ...prev, saveToKatalog: e.target.checked }))}
                        className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                      <span className="text-sm font-semibold text-orange-900">Im Katalog speichern</span>
                    </label>
                    
                    {newPosData.saveToKatalog && (
                      <div className="pl-6 flex flex-col gap-2 animate-fade-in mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-orange-800 w-24">Kategorie:</span>
                          <select 
                            value={newPosData.kategorie_id}
                            onChange={(e) => setNewPosData(prev => ({ ...prev, kategorie_id: e.target.value }))}
                            className="flex-1 px-2 py-1 bg-white border border-orange-200 rounded text-xs focus:outline-none focus:border-primary-400"
                          >
                            {dbKategorien.map(kat => (
                              <option key={kat.id} value={kat.id}>{kat.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-orange-800 w-24">Ertragskonto:</span>
                          <select 
                            value={newPosData.ertragskonto}
                            onChange={(e) => setNewPosData(prev => ({ ...prev, ertragskonto: e.target.value }))}
                            className="flex-1 px-2 py-1 bg-white border border-orange-200 rounded text-xs focus:outline-none focus:border-primary-400"
                          >
                            <option value="3200 Handelserlöse">3200 Handelserlöse</option>
                            <option value="3400 Dienstleistungserlöse">3400 Dienstleistungserlöse</option>
                            <option value="3800 Sonstige Erlöse">3800 Sonstige Erlöse</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => setShowNewPositionForm(false)}
                      className="w-full sm:w-auto min-h-[48px] px-4 py-3 text-base sm:text-sm font-semibold text-text-secondary bg-surface border border-border rounded-xl hover:bg-surface-card transition-colors cursor-pointer"
                    >
                      Abbrechen
                    </button>
                    <button 
                      onClick={handleAddNewPosition}
                      className="w-full sm:w-auto min-h-[48px] px-6 py-3 text-base sm:text-sm font-bold text-white bg-primary-600 rounded-xl hover:bg-primary-700 shadow-sm transition-colors cursor-pointer"
                    >
                      Hinzufügen
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
