import { useState, useEffect, useMemo } from 'react'
import {
  createDefaultAusmassLine,
  calculateAusmassLine,
  calculateAusmassTotal,
  DEFAULT_SIA118_SCHWELLE
} from '../../lib/ausmassHelper'
import { IconClose, IconPlus, IconWarning } from '../icons/BrandIcons'

export default function AusmassModal({
  isOpen,
  onClose,
  position,
  onSaveAusmass,
  readOnly = false
}) {
  const [lines, setLines] = useState([])

  useEffect(() => {
    if (isOpen && position) {
      if (position.ausmass_details && Array.isArray(position.ausmass_details) && position.ausmass_details.length > 0) {
        setLines(JSON.parse(JSON.stringify(position.ausmass_details)))
      } else {
        // Starte mit einer initialen Standardzeile, optional vorbelegt mit der aktuellen Menge
        const initialMenge = parseFloat(position.menge) || 0
        setLines([
          createDefaultAusmassLine({
            bezeichnung: position.beschreibung ? position.beschreibung.slice(0, 30) : 'Fläche',
            laenge: initialMenge > 0 ? initialMenge : '',
            anzahl: 1
          })
        ])
      }
    }
  }, [isOpen, position])

  const totals = useMemo(() => {
    return calculateAusmassTotal(lines)
  }, [lines])

  if (!isOpen || !position) return null

  const handleUpdateLine = (id, field, value) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))
  }

  const handleAddLine = (template = {}) => {
    setLines(prev => [...prev, createDefaultAusmassLine(template)])
  }

  const handleDuplicateLine = (line) => {
    const copy = { ...line, id: `ausmass-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` }
    setLines(prev => [...prev, copy])
  }

  const handleDeleteLine = (id) => {
    setLines(prev => prev.filter(l => l.id !== id))
  }

  // Raum-Vorlage (4 Wände)
  const addRoomTemplate = () => {
    setLines(prev => [
      ...prev,
      createDefaultAusmassLine({ bezeichnung: 'Wand Nord/Süd', anzahl: 2, laenge: 5.0, hoehe: 2.6 }),
      createDefaultAusmassLine({ bezeichnung: 'Wand Ost/West', anzahl: 2, laenge: 4.0, hoehe: 2.6 }),
      createDefaultAusmassLine({ bezeichnung: 'Tür T1', anzahl: 1, laenge: 0.9, hoehe: 2.1, isAbzug: true }),
      createDefaultAusmassLine({ bezeichnung: 'Fenster F1 (über 2.5 m²)', anzahl: 1, laenge: 2.2, hoehe: 1.4, isAbzug: true })
    ])
  }

  // Decken-Vorlage
  const addCeilingTemplate = () => {
    setLines(prev => [
      ...prev,
      createDefaultAusmassLine({ bezeichnung: 'Deckenfläche', anzahl: 1, laenge: 5.0, breite: 4.0 })
    ])
  }

  const handleSave = () => {
    onSaveAusmass(totals.nettoMenge, lines)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-surface-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[92vh] overflow-hidden animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ausmass-modal-title"
      >
        {/* Header */}
        <div className="p-5 border-b border-border bg-surface flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📐</span>
              <h2 id="ausmass-modal-title" className="text-lg font-bold text-text-primary">
                Schweizer Bau-Ausmass & SIA 118 Rechner
              </h2>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Position: <span className="font-semibold text-text-primary">{position.posNr || '–'}</span> {position.npk_code && <span className="font-mono text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded text-[11px] font-bold mr-1">NPK {position.npk_code}</span>} – {position.beschreibung}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Schliessen"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        {/* SIA 118 Infobar & Quick Templates */}
        <div className="px-5 py-3 bg-amber-50/60 border-b border-amber-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
            <span>
              <strong>SIA 118 Art. 141 Normregel:</strong> Öffnungen (Fenster/Türen) bis ≤ 2.50 m² Einzelfläche werden übermessen (kein Abzug).
            </span>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-text-secondary font-semibold">Schnell-Vorlagen:</span>
              <button
                type="button"
                onClick={addRoomTemplate}
                className="px-2.5 py-1 bg-white border border-border rounded-md hover:bg-primary-50 hover:text-primary-700 hover:border-primary-300 font-medium transition-colors cursor-pointer"
              >
                + Raum 4 Wände
              </button>
              <button
                type="button"
                onClick={addCeilingTemplate}
                className="px-2.5 py-1 bg-white border border-border rounded-md hover:bg-primary-50 hover:text-primary-700 hover:border-primary-300 font-medium transition-colors cursor-pointer"
              >
                + Decke (L × B)
              </button>
              <button
                type="button"
                onClick={() => handleAddLine({ bezeichnung: 'Fensterabzug', isAbzug: true, laenge: 1.2, hoehe: 1.4 })}
                className="px-2.5 py-1 bg-white border border-border rounded-md hover:bg-red-50 hover:text-red-700 hover:border-red-300 font-medium transition-colors cursor-pointer"
              >
                + Fensterabzug
              </button>
            </div>
          )}
        </div>

        {/* Ausmass Zeilen Tabelle */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          {lines.length === 0 ? (
            <div className="text-center py-10 text-text-secondary">
              <p>Keine Ausmass-Zeilen vorhanden.</p>
              <button
                type="button"
                onClick={() => handleAddLine()}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-semibold hover:bg-primary-700 cursor-pointer"
              >
                <IconPlus className="w-3.5 h-3.5" />
                Erste Zeile hinzufügen
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {lines.map((line, idx) => {
                const calc = calculateAusmassLine(line)
                return (
                  <div
                    key={line.id || idx}
                    className={`p-3 rounded-xl border transition-colors ${
                      line.isAbzug 
                        ? calc.sia118Uebermessen 
                          ? 'bg-neutral-50/80 border-neutral-300' 
                          : 'bg-red-50/60 border-red-200' 
                        : 'bg-white border-border hover:border-primary-200'
                    }`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_70px_80px_80px_80px_130px_70px] gap-2 items-center">
                      {/* Bezeichnung */}
                      <div>
                        <input
                          type="text"
                          value={line.bezeichnung}
                          onChange={(e) => handleUpdateLine(line.id, 'bezeichnung', e.target.value)}
                          placeholder="z.B. Wand Nord"
                          className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary-500"
                        />
                      </div>

                      {/* Anzahl */}
                      <div>
                        <div className="flex items-center">
                          <input
                            type="number"
                            step="any"
                            value={line.anzahl}
                            onChange={(e) => handleUpdateLine(line.id, 'anzahl', e.target.value)}
                            placeholder="Anz."
                            className="w-full px-2 py-1.5 bg-surface border border-border rounded-lg text-xs text-center focus:ring-1 focus:ring-primary-500"
                            title="Anzahl / Wiederholung"
                          />
                        </div>
                      </div>

                      {/* Länge (m) */}
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          value={line.laenge}
                          onChange={(e) => handleUpdateLine(line.id, 'laenge', e.target.value)}
                          placeholder="L (m)"
                          className="w-full px-2 py-1.5 bg-surface border border-border rounded-lg text-xs text-right focus:ring-1 focus:ring-primary-500"
                          title="Länge in Meter"
                        />
                      </div>

                      {/* Breite (m) */}
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          value={line.breite}
                          onChange={(e) => handleUpdateLine(line.id, 'breite', e.target.value)}
                          placeholder="B (m)"
                          className="w-full px-2 py-1.5 bg-surface border border-border rounded-lg text-xs text-right focus:ring-1 focus:ring-primary-500"
                          title="Breite in Meter (optional)"
                        />
                      </div>

                      {/* Höhe (m) */}
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          value={line.hoehe}
                          onChange={(e) => handleUpdateLine(line.id, 'hoehe', e.target.value)}
                          placeholder="H (m)"
                          className="w-full px-2 py-1.5 bg-surface border border-border rounded-lg text-xs text-right focus:ring-1 focus:ring-primary-500"
                          title="Höhe in Meter (optional)"
                        />
                      </div>

                      {/* Calculated value & type */}
                      <div className="text-right">
                        <div className={`text-xs font-bold ${
                          line.isAbzug 
                            ? calc.sia118Uebermessen 
                              ? 'text-neutral-500 line-through' 
                              : 'text-red-600' 
                            : 'text-text-primary'
                        }`}>
                          {line.isAbzug ? (calc.sia118Uebermessen ? `0.00 ${calc.type}` : `-${Math.abs(calc.effectiveValue).toFixed(2)} ${calc.type}`) : `+${calc.effectiveValue.toFixed(2)} ${calc.type}`}
                        </div>
                        <div className="text-[10px] text-text-secondary">
                          ({calc.rawTotal.toFixed(2)} {calc.type} brutto)
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicateLine(line)}
                          className="p-1.5 text-text-secondary hover:text-primary-600 rounded hover:bg-neutral-100 transition-colors cursor-pointer"
                          title="Zeile duplizieren"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLine(line.id)}
                          className="p-1.5 text-text-secondary hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                          title="Zeile löschen"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>

                    {/* Second Row: Abzug-Toggle and SIA 118 Status Details */}
                    <div className="mt-2 pt-2 border-t border-dashed border-border flex flex-wrap items-center justify-between text-[11px] gap-2">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer font-medium text-text-secondary">
                          <input
                            type="checkbox"
                            checked={line.isAbzug}
                            onChange={(e) => handleUpdateLine(line.id, 'isAbzug', e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-red-600 focus:ring-red-500 accent-red-600"
                          />
                          <span>Als Öffnungsabzug behandeln</span>
                        </label>

                        {line.isAbzug && (
                          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-text-secondary">
                            <input
                              type="checkbox"
                              checked={line.forceAbzug || false}
                              onChange={(e) => handleUpdateLine(line.id, 'forceAbzug', e.target.checked)}
                              className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 accent-amber-600"
                            />
                            <span>SIA 118 Art. 141 übersteuern (immer abziehen)</span>
                          </label>
                        )}
                      </div>

                      {line.isAbzug && (
                        <div className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                          calc.sia118Uebermessen 
                            ? 'bg-neutral-200 text-neutral-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {calc.statusText}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Add Line Button */}
          {!readOnly && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleAddLine()}
                className="w-full py-2.5 bg-neutral-50 hover:bg-neutral-100 border border-dashed border-border rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <IconPlus className="w-3.5 h-3.5" />
                Weitere Ausmass-Zeile hinzufügen
              </button>
            </div>
          )}
        </div>

        {/* Footer Summary & Confirmation */}
        <div className="p-5 border-t border-border bg-surface-card space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface p-3.5 rounded-xl border border-border text-center">
            <div>
              <div className="text-[11px] text-text-secondary font-medium uppercase tracking-wider">Bruttofläche</div>
              <div className="text-sm font-bold text-text-primary mt-0.5">{totals.bruttoZuschlag.toFixed(2)} {totals.type}</div>
            </div>
            <div>
              <div className="text-[11px] text-text-secondary font-medium uppercase tracking-wider">SIA 118 übermessen</div>
              <div className="text-sm font-bold text-neutral-600 mt-0.5">({totals.abzuegeUebermessen.toFixed(2)} {totals.type})</div>
            </div>
            <div>
              <div className="text-[11px] text-text-secondary font-medium uppercase tracking-wider">Wirksame Abzüge</div>
              <div className="text-sm font-bold text-red-600 mt-0.5">-{totals.abzuegeWirksam.toFixed(2)} {totals.type}</div>
            </div>
            <div className="bg-primary-50/80 rounded-lg p-1.5 border border-primary-200">
              <div className="text-[11px] text-primary-800 font-bold uppercase tracking-wider">Berechnete Netto-Menge</div>
              <div className="text-base font-extrabold text-primary-900 mt-0.5">{totals.nettoMenge.toFixed(2)} {totals.type}</div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary border border-border rounded-xl hover:bg-surface transition-colors cursor-pointer"
            >
              {readOnly ? 'Schliessen' : 'Abbrechen'}
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-[0.99] cursor-pointer flex items-center gap-1.5"
              >
                <span>Menge ({totals.nettoMenge.toFixed(2)} {totals.type}) & Ausmass übernehmen</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
