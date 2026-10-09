
import { useState, useEffect, lazy, Suspense } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { supabase } from '../lib/supabase'
import { formatMoney } from '../lib/formatters'
import { calculateDocumentTotals } from '../lib/calculations'
import { EINHEITEN } from '../lib/constants'
import { generateNextRechnungNr, parseZahlungsfrist } from '../lib/documentService'
import AddressAutocomplete from './AddressAutocomplete'
import { IconWarning, IconEye } from './icons/BrandIcons'
const RechnungPrintView = lazy(() => import('../views/RechnungPrintView'))

const STEPS = [
  { id: 1, label: 'Kunde' },
  { id: 2, label: 'Details' },
  { id: 3, label: 'Leistungen' },
  { id: 4, label: 'Abschluss' },
]



// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEmptyPosition(kategorie, catalog = {}) {
  return {
    id: crypto.randomUUID(),
    beschreibung: '',
    menge: '',
    einheit: (catalog[kategorie]?.[0]?.einheit) || 'm²',
    einzelpreis: '',
    nurInfo: false,
  }
}

function makeEmptyBlock(kategorie, catalog = {}) {
  return {
    id: crypto.randomUUID(),
    kategorie,
    positionen: [makeEmptyPosition(kategorie, catalog)],
  }
}

function moveItem(array, fromIndex, toIndex) {
  const newArray = [...array]
  const [item] = newArray.splice(fromIndex, 1)
  newArray.splice(toIndex, 0, item)
  return newArray
}

/** Flatten blocks into the canonical flat leistungen array for the JSON output.
 *  Inserts a category header row (e.g. posNr "1.0", beschreibung "Malerarbeiten")
 *  before each block, and numbers sub-positions as 1.1, 1.2, etc.
 */
function flattenBloecke(bloecke) {
  const result = []
  bloecke.forEach((block, blockIdx) => {
    const groupNr = blockIdx + 1
    
    // Insert category header row (no menge/preis = treated as title)
    result.push({
      posNr: `${groupNr}.0`,
      kategorie: block.kategorie,
      beschreibung: block.kategorie,
      menge: '',
      einheit: '',
      einzelpreis: '',
    })
    
    // Insert the actual positions
    block.positionen.forEach((pos, posIdx) => {
      result.push({
        posNr: `${groupNr}.${posIdx + 1}`,
        kategorie: block.kategorie,
        beschreibung: pos.beschreibung,
        menge: pos.nurInfo ? '' : pos.menge,
        einheit: pos.nurInfo ? '' : pos.einheit,
        einzelpreis: pos.nurInfo ? '' : pos.einzelpreis,
      })
    })
  })
  return result
}

const CATEGORY_STYLES = [
  { color: 'bg-primary-50 text-primary-600 border-primary-200 hover:bg-primary-100 hover:border-primary-400', accent: 'border-l-primary-500 bg-primary-50/20' },
  { color: 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-400', accent: 'border-l-slate-500 bg-slate-50/20' },
  { color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-400', accent: 'border-l-amber-500 bg-amber-50/20' },
  { color: 'bg-teal-50 text-teal-600 border-teal-200 hover:bg-teal-100 hover:border-teal-400', accent: 'border-l-teal-500 bg-teal-50/20' },
  { color: 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-400', accent: 'border-l-emerald-500 bg-emerald-50/20' },
  { color: 'bg-sky-50 text-sky-600 border-sky-200 hover:bg-sky-100 hover:border-sky-400', accent: 'border-l-sky-500 bg-sky-50/20' },
  { color: 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-400', accent: 'border-l-indigo-500 bg-indigo-50/20' },
  { color: 'bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100 hover:border-violet-400', accent: 'border-l-violet-500 bg-violet-50/20' },
]

function getCategoryStyle(kategorie) {
  let hash = 0;
  for (let i = 0; i < kategorie.length; i++) hash = kategorie.charCodeAt(i) + ((hash << 5) - hash);
  return CATEGORY_STYLES[Math.abs(hash) % CATEGORY_STYLES.length];
}

const INITIAL_BLOECKE = [makeEmptyBlock('Malerarbeiten', {})]

const INITIAL_FORM_DATA = {
  kunde: { id: null, name: '' },
  projekt: { id: null, name: '', adresse: '' },
  rechnungsdetails: { typ: 'Standardrechnung', datum: new Date().toISOString().split('T')[0], zahlungsziel: '30 Tage netto' },
  leistungen: [], // filled at generate-time by flattening blocks
  konditionen: { rabatt: '0', mwst: '8.1' },
  texte: { einleitungstext: '', schlusstext: '' },
}

// ─── Stepper ─────────────────────────────────────────────────────────────────

function Stepper({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-lg mx-auto">
      {STEPS.map((step, i) => {
        const isActive = step.id === currentStep
        const isDone = step.id < currentStep

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-0">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <div
                className={`
                  w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
                  transition-all duration-300 shrink-0
                  ${isDone
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-600/25'
                    : isActive
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30 ring-4 ring-primary-100'
                      : 'bg-gray-100 text-text-secondary'
                  }
                `}
              >
                {isDone ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.id
                )}
              </div>
              {/* Label — hidden on small mobile */}
              <span
                className={`
                  hidden sm:block text-xs font-medium text-center truncate max-w-[80px]
                  ${isActive ? 'text-primary-700' : isDone ? 'text-primary-600' : 'text-text-secondary'}
                `}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 mt-[-18px] sm:mt-[-24px]">
                <div
                  className={`h-full rounded-full transition-colors duration-300 ${
                    step.id < currentStep ? 'bg-primary-500' : 'bg-gray-200'
                  }`}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 1: Kunde ───────────────────────────────────────────────────────────

function StepKunde({ data, onChange, errors, kundenList }) {
  const [showKundeSuggestions, setShowKundeSuggestions] = useState(false)
  const [projekteList, setProjekteList] = useState([])
  const [isCreatingProjekt, setIsCreatingProjekt] = useState(false)
  
  // Filter kunden based on input (case insensitive)
  const kundeSuggestions = (kundenList || []).filter(k => 
    k.name.toLowerCase().includes(data.kunde.name.toLowerCase()) && 
    k.name.toLowerCase() !== data.kunde.name.toLowerCase()
  )

  useEffect(() => {
    // If a customer is fully selected (has ID), load their projects
    if (data.kunde.id && supabase) {
      supabase.from('projekte').select('*').eq('kunden_id', data.kunde.id).order('name', { ascending: true })
        .then(({ data: pData, error }) => {
          if (!error && pData) {
            setProjekteList(pData)
          }
        })
    } else {
      setProjekteList([])
    }
  }, [data.kunde.id])

  const handleSelectKunde = (kunde) => {
    onChange({ 
      ...data, 
      kunde: { id: kunde.id, name: kunde.name },
      projekt: { id: null, name: '', adresse: '' } // Reset project when customer changes
    })
    setShowKundeSuggestions(false)
    setIsCreatingProjekt(false)
  }

  const handleSelectProjekt = (e) => {
    const val = e.target.value
    if (val === 'NEW') {
      setIsCreatingProjekt(true)
      onChange({ ...data, projekt: { id: null, name: '', adresse: '' } })
    } else if (val) {
      const proj = projekteList.find(p => p.id.toString() === val)
      if (proj) {
        setIsCreatingProjekt(false)
        onChange({ ...data, projekt: { id: proj.id, name: proj.name, adresse: proj.adresse || '' } })
      }
    } else {
      setIsCreatingProjekt(false)
      onChange({ ...data, projekt: { id: null, name: '', adresse: '' } })
    }
  }

  const isKundeSelected = !!data.kunde.id || data.kunde.name.trim().length > 0

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-bold text-text-primary">1. Kunde wählen</h3>
        <p className="text-sm text-text-secondary mt-1">
          Für wen wird die Rechnung erstellt?
        </p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Kundenname <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.kunde.name}
            onChange={(e) => {
              onChange({ 
                ...data, 
                kunde: { id: null, name: e.target.value },
                projekt: { id: null, name: '', adresse: '' }
              })
              setShowKundeSuggestions(true)
            }}
            onFocus={() => setShowKundeSuggestions(true)}
            onBlur={() => setTimeout(() => setShowKundeSuggestions(false), 200)}
            placeholder="z.B. Immobilien Schweizer AG"
            className={`w-full px-4 py-3 bg-surface-card border rounded-xl text-base text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all ${
              errors.kunde ? 'border-red-400 ring-2 ring-red-100' : 'border-border'
            }`}
          />
          {showKundeSuggestions && data.kunde.name.length > 0 && kundeSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-surface-card border border-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
              {kundeSuggestions.map((kunde) => (
                <div 
                  key={kunde.id} 
                  onClick={() => handleSelectKunde(kunde)}
                  className="px-4 py-2 hover:bg-primary-50 cursor-pointer border-b border-border last:border-b-0"
                >
                  <div className="text-sm font-medium text-text-primary">{kunde.name}</div>
                  {kunde.ort && <div className="text-xs text-text-secondary">{kunde.ort}</div>}
                </div>
              ))}
            </div>
          )}
          {errors.kunde && (
            <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1.5">
              <IconWarning className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span>{errors.kunde}</span>
            </p>
          )}
        </div>
      </div>

      {isKundeSelected && (
        <div className="pt-6 border-t border-border mt-6">
          <div>
            <h3 className="text-xl font-bold text-text-primary">2. Projekt / Baustelle</h3>
            <p className="text-sm text-text-secondary mt-1">
              Welches Projekt betrifft diese Rechnung?
            </p>
          </div>

          <div className="mt-4 space-y-4">
            {data.kunde.id && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Projekt auswählen
                </label>
                <select value={isCreatingProjekt ? 'NEW' : (data.projekt.id || '')} onChange={handleSelectProjekt} className="w-full px-4 py-3 bg-surface-card border border-border rounded-xl text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all" >
                  <option value="">-- Bitte wählen --</option>
                  {projekteList.map(p => (
                    <option key={p.id} value={p.id}>{p.name} {p.adresse ? `(${p.adresse})` : ''}</option>
                  ))}
                  <option value="NEW">+ Neues Projekt anlegen</option>
                </select>
              </div>
            )}

            {(!data.kunde.id || isCreatingProjekt) && (
              <div className="p-4 bg-surface rounded-xl border border-border space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    Projektname <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.projekt.name}
                    onChange={(e) => onChange({ ...data, projekt: { ...data.projekt, name: e.target.value } })}
                    placeholder="z.B. Fassadensanierung MFH"
                    className={`w-full px-4 py-3 bg-surface-card border rounded-xl text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all ${
                      errors.projekt ? 'border-red-400 ring-2 ring-red-100' : 'border-border'
                    }`}
                  />
                  {errors.projekt && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1.5">
                      <IconWarning className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span>{errors.projekt}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    Baustellenadresse
                  </label>
                  <AddressAutocomplete
                    value={data.projekt.adresse}
                    onChange={(val) => onChange({ ...data, projekt: { ...data.projekt, adresse: val } })}
                    placeholder="z.B. Badstrasse 12, 8001 Zürich"
                    className="w-full px-4 py-3 bg-surface-card border border-border rounded-xl text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Step 2: Rechnungsdetails ──────────────────────────────────────────────────

function StepRechnungsdetails({ data, onChange }) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-bold text-text-primary">Rechnungsdetails</h3>
        <p className="text-sm text-text-secondary mt-1">
          Typ, Datum und Zahlungsziel definieren.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
            Rechnungstyp
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {['Standardrechnung', 'Akontorechnung', 'Schlussrechnung'].map((typ) => (
              <button
                key={typ}
                type="button"
                onClick={() => onChange({ ...data, typ })}
                className={`
                  px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer border text-center
                  ${data.typ === typ
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-600/25 border-primary-600'
                    : 'bg-surface border-border text-text-primary hover:border-primary-400 hover:bg-primary-50'
                  }
                `}
              >
                {typ}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
            Rechnungsdatum
          </label>
          <input
            type="date"
            value={data.datum}
            onChange={(e) => onChange({ ...data, datum: e.target.value })}
            className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
            Zahlungsziel
          </label>
          <select
            value={data.zahlungsziel || '30 Tage netto'}
            onChange={(e) => onChange({ ...data, zahlungsziel: e.target.value })}
            className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
          >
            <option value="10 Tage netto">10 Tage netto</option>
            <option value="14 Tage netto">14 Tage netto</option>
            <option value="30 Tage netto">30 Tage netto</option>
            <option value="Anderes (siehe Notizen)">Anderes (siehe Notizen)</option>
          </select>
        </div>
      </div>
    </div>
  )
}

// ─── Step 3: Leistungen (Kategorie-Blöcke + Master-Katalog) ─────────────────

function BlockPositionCard({ pos, index, kategorie, totalCount, onUpdate, onRemove, onMoveUp, onMoveDown, errors, blockIndex, catalog }) {
  const catalogItems = catalog[kategorie] || []
  const errorPrefix = `b${blockIndex}_pos_${index}`

  const handleCatalogSelect = (e) => {
    const value = e.target.value
    if (!value) return

    const itemIndex = parseInt(value, 10)
    const item = catalogItems[itemIndex]
    if (item) {
      onUpdate(index, {
        ...pos,
        beschreibung: item.titel,
        einheit: item.einheit,
        einzelpreis: String(item.preis),
      })
    }
    // Reset the select back to placeholder
    e.target.value = ''
  }

  const updateField = (field, value) => {
    onUpdate(index, { ...pos, [field]: value })
  }

  return (
    <div className={`relative bg-surface rounded-xl p-3 sm:p-4 ${pos.nurInfo ? 'border border-dashed border-amber-300 bg-amber-50/30' : ''}`}>
      {/* Position header row */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider shrink-0">
          Pos. {index + 1}
        </span>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Move Up/Down buttons */}
          {totalCount > 1 && (
            <div className="flex items-center bg-surface-card border border-border rounded-lg mr-1 sm:mr-2">
              <button
                onClick={() => onMoveUp(index)}
                disabled={index === 0}
                className={`p-1.5 flex items-center justify-center transition-colors ${
                  index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-text-secondary hover:text-primary-600 hover:bg-primary-50 cursor-pointer rounded-l-lg'
                }`}
                aria-label="Nach oben verschieben"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <div className="w-px h-4 bg-border" />
              <button
                onClick={() => onMoveDown(index)}
                disabled={index === totalCount - 1}
                className={`p-1.5 flex items-center justify-center transition-colors ${
                  index === totalCount - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-text-secondary hover:text-primary-600 hover:bg-primary-50 cursor-pointer rounded-r-lg'
                }`}
                aria-label="Nach unten verschieben"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}

          {/* Info toggle */}
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={pos.nurInfo}
              onChange={(e) => updateField('nurInfo', e.target.checked)}
              className="w-3.5 h-3.5 rounded border-border text-amber-500 focus:ring-amber-400 cursor-pointer accent-amber-500"
            />
            <span className={`text-xs font-medium ${pos.nurInfo ? 'text-amber-600' : 'text-text-secondary'}`}>
              Info
            </span>
          </label>

          {/* Optional toggle */}
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={pos.optional}
              onChange={(e) => updateField('optional', e.target.checked)}
              className="w-3.5 h-3.5 rounded border-border text-primary-500 focus:ring-primary-400 cursor-pointer accent-primary-500"
            />
            <span className={`text-xs font-medium ${pos.optional ? 'text-primary-600' : 'text-text-secondary'}`}>
              Optional
            </span>
          </label>

          {/* Delete button */}
          {totalCount > 1 && (
            <button
              onClick={() => onRemove(index)}
              className="p-3 min-w-[44px] min-h-[44px] ml-1 rounded-lg hover:bg-red-50 flex items-center justify-center text-text-secondary hover:text-red-500 transition-colors cursor-pointer"
              aria-label="Position entfernen"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Hybrid Template Loader (invisible label, subtle design) */}
      <div className="mb-2">
        <select defaultValue="" onChange={handleCatalogSelect} className="w-full px-3 py-2 bg-gray-50 border border-transparent rounded-lg text-base text-text-secondary font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all cursor-pointer" >
          <option value="" disabled>Vorlage aus Katalog laden...</option>
          {catalogItems.map((item, i) => (
            <option key={i} value={String(i)}>{item.titel}</option>
          ))}
        </select>
      </div>

      {/* Beschreibung */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-text-secondary mb-1">Beschreibung</label>
        <textarea
          rows={2}
          value={pos.beschreibung}
          onChange={(e) => updateField('beschreibung', e.target.value)}
          placeholder="z.B. Wände und Decke streichen, 2x Anstrich"
          className="w-full px-4 py-3 bg-surface-card border border-border rounded-lg text-base text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all resize-y min-h-[48px]"
        />
      </div>

      {/* Compact Grid: Menge/Einheit | Preis — hidden for info-only positions */}
      {!pos.nurInfo && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Input Group: Menge + Einheit */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Menge <span className="text-red-500">*</span>
              </label>
              <div className="flex">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pos.menge}
                  onChange={(e) => updateField('menge', e.target.value)}
                  placeholder="0"
                  className={`w-full min-w-0 px-3 sm:px-4 py-2 sm:py-3 bg-surface-card border rounded-l-lg text-base text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all z-10 ${
                    errors[`${errorPrefix}_menge`] ? 'border-red-400' : 'border-border'
                  }`}
                />
                <select
                  value={pos.einheit}
                  onChange={(e) => updateField('einheit', e.target.value)}
                  className="w-20 sm:w-24 px-2 sm:px-3 py-2 sm:py-3 bg-gray-50 border-y border-r border-border rounded-r-lg text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all cursor-pointer"
                >
                  {EINHEITEN.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Input: Preis */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Einzelpreis (CHF) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={pos.einzelpreis}
                onChange={(e) => updateField('einzelpreis', e.target.value)}
                placeholder="0.00"
                className={`w-full px-3 py-2 sm:py-2.5 bg-surface-card border rounded-lg text-base text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primader-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all ${
                  errors[`${errorPrefix}_preis`] ? 'border-red-400' : 'border-border'
                }`}
              />
            </div>
          </div>

          {/* Line total */}
          {pos.menge && pos.einzelpreis && (
            <div className="mt-3 pt-2 border-t border-border flex justify-end">
              <span className="text-sm font-semibold text-text-primary">
                = CHF {formatMoney(parseFloat(pos.menge) * parseFloat(pos.einzelpreis))}
              </span>
            </div>
          )}
        </>
      )}

      {/* Info badge */}
      {pos.nurInfo && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium mt-1">
          <span>ℹ️</span> Nur Info – ohne Berechnung
        </div>
      )}
    </div>
  )
}

function KategorieBlock({ block, blockIndex, totalBlocks, onUpdateBlock, onRemoveBlock, onMoveBlockUp, onMoveBlockDown, errors, catalog }) {
  const [parent] = useAutoAnimate()

  const addPosition = () => {
    onUpdateBlock(blockIndex, {
      ...block,
      positionen: [...block.positionen, makeEmptyPosition(block.kategorie, catalog)],
    })
  }

  const removePosition = (posIndex) => {
    if (block.positionen.length <= 1) return
    onUpdateBlock(blockIndex, {
      ...block,
      positionen: block.positionen.filter((_, i) => i !== posIndex),
    })
  }

  const updatePosition = (posIndex, newPos) => {
    onUpdateBlock(blockIndex, {
      ...block,
      positionen: block.positionen.map((p, i) => (i === posIndex ? newPos : p)),
    })
  }

  const movePositionUp = (posIndex) => {
    if (posIndex === 0) return
    onUpdateBlock(blockIndex, {
      ...block,
      positionen: moveItem(block.positionen, posIndex, posIndex - 1)
    })
  }

  const movePositionDown = (posIndex) => {
    if (posIndex === block.positionen.length - 1) return
    onUpdateBlock(blockIndex, {
      ...block,
      positionen: moveItem(block.positionen, posIndex, posIndex + 1)
    })
  }

  // Block subtotal
  const blockTotal = block.positionen.reduce((sum, pos) => {
    if (pos.nurInfo) return sum
    return sum + (parseFloat(pos.menge) || 0) * (parseFloat(pos.einzelpreis) || 0)
  }, 0)

  // Category-specific accent colors dynamically mapped
  const accentClass = getCategoryStyle(block.kategorie).accent

  return (
    <div className={`border border-border rounded-2xl overflow-hidden shadow-sm border-l-4 ${accentClass}`}>
      {/* Block header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-surface-card border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <h4 className="text-sm font-bold text-text-primary truncate">{block.kategorie}</h4>
          <span className="text-xs text-text-secondary shrink-0 hidden sm:inline-block">
            ({block.positionen.length} {block.positionen.length === 1 ? 'Position' : 'Positionen'})
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          {blockTotal > 0 && (
            <span className="text-xs font-semibold text-text-primary hidden sm:block mr-2">
              CHF {formatMoney(blockTotal)}
            </span>
          )}

          {/* Move Block buttons */}
          {totalBlocks > 1 && (
            <div className="flex items-center bg-surface border border-border rounded-lg">
              <button
                onClick={() => onMoveBlockUp(blockIndex)}
                disabled={blockIndex === 0}
                className={`p-1.5 flex items-center justify-center transition-colors ${
                  blockIndex === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-text-secondary hover:text-primary-600 hover:bg-primary-50 cursor-pointer rounded-l-lg'
                }`}
                aria-label="Block nach oben verschieben"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <div className="w-px h-4 bg-border" />
              <button
                onClick={() => onMoveBlockDown(blockIndex)}
                disabled={blockIndex === totalBlocks - 1}
                className={`p-1.5 flex items-center justify-center transition-colors ${
                  blockIndex === totalBlocks - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-text-secondary hover:text-primary-600 hover:bg-primary-50 cursor-pointer rounded-r-lg'
                }`}
                aria-label="Block nach unten verschieben"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}

          <button
            onClick={() => onRemoveBlock(blockIndex)}
            className="p-3 min-w-[44px] min-h-[44px] ml-1 rounded-lg hover:bg-red-50 flex items-center justify-center text-text-secondary hover:text-red-500 transition-colors cursor-pointer"
            aria-label="Block entfernen"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Positions inside block */}
      <div ref={parent} className="p-3 sm:p-4 space-y-3">
        {block.positionen.map((pos, posIndex) => (
          <BlockPositionCard
            key={pos.id || posIndex}
            pos={pos}
            index={posIndex}
            kategorie={block.kategorie}
            totalCount={block.positionen.length}
            onUpdate={updatePosition}
            onRemove={removePosition}
            onMoveUp={movePositionUp}
            onMoveDown={movePositionDown}
            errors={errors}
            blockIndex={blockIndex}
            catalog={catalog}
          />
        ))}

        {/* Add position inside block */}
        <button
          onClick={addPosition}
          className="block w-full py-3 min-h-[48px] border-2 border-dashed border-border rounded-xl text-base sm:text-xs font-medium text-text-secondary hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/50 transition-all cursor-pointer"
        >
          + Leistung hinzufügen
        </button>
      </div>
    </div>
  )
}

function StepLeistungen({ bloecke, onChange, errors, catalog }) {
  const [parent] = useAutoAnimate()

  const addBlock = (kategorie) => {
    onChange([...bloecke, makeEmptyBlock(kategorie, catalog)])
  }

  const removeBlock = (blockIndex) => {
    const updated = bloecke.filter((_, i) => i !== blockIndex)
    onChange(updated)
  }

  const updateBlock = (blockIndex, newBlock) => {
    onChange(bloecke.map((b, i) => (i === blockIndex ? newBlock : b)))
  }

  const moveBlockUp = (blockIndex) => {
    if (blockIndex === 0) return
    onChange(moveItem(bloecke, blockIndex, blockIndex - 1))
  }

  const moveBlockDown = (blockIndex) => {
    if (blockIndex === bloecke.length - 1) return
    onChange(moveItem(bloecke, blockIndex, blockIndex + 1))
  }

  // Icons and colors derived dynamically from catalog keys
  const catalogKeys = Object.keys(catalog || {})
  const categoryConfig = catalogKeys.map(key => ({
    id: key,
    ...getCategoryStyle(key)
  }))

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-text-primary">Leistungen</h3>
          <p className="text-sm text-text-secondary mt-1">
            Erfasse Leistungen gruppiert nach Kategorie.
          </p>
        </div>
      </div>

      {errors.leistungen && (
        <p className="text-xs text-red-500 flex items-center gap-1.5 px-1">
          <IconWarning className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span>{errors.leistungen}</span>
        </p>
      )}

      {/* Empty state */}
      {bloecke.length === 0 && (
        <div className="text-center py-8 text-text-secondary">
          <p className="text-base mb-2">Noch keine Leistungen erfasst.</p>
          <p className="text-sm">Tippe unten auf eine Kategorie, um einen neuen Block hinzuzufügen.</p>
        </div>
      )}

      {/* Blocks */}
      <div ref={parent} className="space-y-5">
        {bloecke.map((block, blockIndex) => (
          <KategorieBlock
            key={block.id || blockIndex}
            block={block}
            blockIndex={blockIndex}
            totalBlocks={bloecke.length}
            onUpdateBlock={updateBlock}
            onRemoveBlock={removeBlock}
            onMoveBlockUp={moveBlockUp}
            onMoveBlockDown={moveBlockDown}
            errors={errors}
            catalog={catalog}
          />
        ))}
      </div>

      {/* Icon Grid for adding new blocks */}
      <div className="pt-6 border-t border-border mt-8">
        <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4 text-center">
          Neuen Block hinzufügen
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {categoryConfig.map((cat) => (
            <button
              key={cat.id}
              onClick={() => addBlock(cat.id)}
              className={`flex items-center justify-center p-3 sm:p-4 min-h-[48px] sm:min-h-[auto] rounded-xl border-2 transition-all active:scale-[0.97] cursor-pointer ${cat.color}`}
            >
              <span className="text-base sm:text-sm font-bold text-center leading-tight">
                {cat.id}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}


function StepAbschluss({ formData, flatLeistungen, onChangeKonditionen, onChangeTexte }) {
  const EINLEITUNG_TEMPLATES = [
    { label: 'Standard', text: 'Gerne stellen wir Ihnen folgende Arbeiten in Rechnung:' },
    { label: 'Förmlich', text: 'Für die erbrachten Leistungen erlauben wir uns, Ihnen folgende Rechnung zu stellen:' },
    { label: 'Akonto', text: 'Gemäss unserer Vereinbarung stellen wir Ihnen folgende Akontorechnung:' }
  ]
  const SCHLUSS_TEMPLATES = [
    { label: 'Standard', text: 'Wir danken Ihnen für den geschätzten Auftrag und das entgegengebrachte Vertrauen.' },
    { label: 'Kurz', text: 'Freundliche Grüsse' },
    { label: 'Zahlungsziel', text: 'Wir bitten um Überweisung des Rechnungsbetrags innert der angegebenen Zahlungsfrist.' }
  ]

  const { rawTotal, rabattBetrag, mwstBetrag, finalTotal } = calculateDocumentTotals(
    flatLeistungen,
    formData.konditionen,
    null
  )

  const isAkonto = formData.rechnungsdetails?.typ === 'Akontorechnung' && formData.rechnungsdetails?.akonto
  const akontoProzent = isAkonto ? parseFloat(formData.rechnungsdetails.akonto) : null
  const akontoBetrag = isAkonto ? finalTotal * (akontoProzent / 100) : null

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Konditionen & Zusammenfassung ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-text-primary">Konditionen</h3>
          <p className="text-sm text-text-secondary">Rabatt und Mehrwertsteuersatz anpassen.</p>
          
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">Rabatt (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.konditionen?.rabatt ?? '0'}
                onChange={(e) => onChangeKonditionen({ ...formData.konditionen, rabatt: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">MwSt. (%)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.konditionen?.mwst ?? '8.1'}
                onChange={(e) => onChangeKonditionen({ ...formData.konditionen, mwst: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                placeholder="8.1"
              />
            </div>
          </div>
        </div>

        {/* Zusammenfassung */}
        <div className="bg-surface-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-text-primary mb-1">Zusammenfassung</h3>
            <p className="text-sm text-text-secondary mb-4">Berechnete Summen vor Generierung.</p>
            
            <div className="space-y-2 text-sm border-t border-border pt-3">
              <div className="flex justify-between text-text-secondary">
                <span>Zwischensumme:</span>
                <span className="font-medium font-mono">{formatMoney(rawTotal)} CHF</span>
              </div>
              {parseFloat(formData.konditionen?.rabatt || 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Rabatt ({formData.konditionen.rabatt}%):</span>
                  <span className="font-medium font-mono">-{formatMoney(rabattBetrag)} CHF</span>
                </div>
              )}
              <div className="flex justify-between text-text-secondary">
                <span>MwSt. ({formData.konditionen?.mwst || 8.1}%):</span>
                <span className="font-medium font-mono">+{formatMoney(mwstBetrag)} CHF</span>
              </div>
              {isAkonto && (
                <div className="flex justify-between text-primary-600 font-semibold border-t border-dashed border-border pt-2">
                  <span>Akonto ({akontoProzent}% von Total):</span>
                  <span className="font-mono">{formatMoney(akontoBetrag)} CHF</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-border flex justify-between items-baseline">
            <span className="text-base font-bold text-text-primary">Fälliger Betrag:</span>
            <span className="text-2xl font-black text-primary-600 font-mono">
              {formatMoney(isAkonto ? akontoBetrag : finalTotal)} CHF
            </span>
          </div>
        </div>
      </div>

      {/* ── Texte ── */}
      <div className="bg-surface-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-bold text-text-primary mb-1">Begrüssungs- & Abschlusstext</h3>
          <p className="text-sm text-text-secondary">Wähle eine Vorlage oder schreibe einen eigenen Text für das PDF.</p>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-text-primary">Einleitungstext</label>
              <div className="flex gap-1">
                {EINLEITUNG_TEMPLATES.map((t, i) => (
                  <button 
                    key={i} 
                    type="button"
                    onClick={() => onChangeTexte({ ...formData.texte, einleitungstext: t.text })} 
                    className="text-xs bg-surface border border-border px-2 py-1 rounded hover:bg-primary-50 hover:text-primary-600 transition-colors cursor-pointer"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={3}
              value={formData.texte?.einleitungstext || ''}
              onChange={(e) => onChangeTexte({ ...formData.texte, einleitungstext: e.target.value })}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none"
              placeholder="Text eingeben..."
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-text-primary">Schlusstext</label>
              <div className="flex gap-1">
                {SCHLUSS_TEMPLATES.map((t, i) => (
                  <button 
                    key={i} 
                    type="button"
                    onClick={() => onChangeTexte({ ...formData.texte, schlusstext: t.text })} 
                    className="text-xs bg-surface border border-border px-2 py-1 rounded hover:bg-primary-50 hover:text-primary-600 transition-colors cursor-pointer"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={3}
              value={formData.texte?.schlusstext || ''}
              onChange={(e) => onChangeTexte({ ...formData.texte, schlusstext: e.target.value })}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none"
              placeholder="Text eingeben..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Wizard ─────────────────────────────────────────────────────────────

export default function RechnungenWizard({ onClose, prefilledKundeId }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState(JSON.parse(JSON.stringify(INITIAL_FORM_DATA)))
  const [bloecke, setBloecke] = useState(JSON.parse(JSON.stringify(INITIAL_BLOECKE)))
  const [errors, setErrors] = useState({})
  const [catalog, setCatalog] = useState(null)
  const [kundenList, setKundenList] = useState([])
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  
  const handleCloseWithConfirm = () => {
    const hasData = formData.kunde.id || formData.projekt.name || bloecke.some(b => b.positionen.length > 0)
    if (hasData && !submitSuccess) {
      setShowDiscardModal(true)
    } else {
      onClose()
    }
  }

  useEffect(() => {
    // 1. Katalog laden aus Supabase
    async function loadCatalog() {
      // 0. Settings laden
      try {
        const { data: setts } = await supabase.from('einstellungen').select('*').limit(1).maybeSingle()
        if (setts) {
          setSettings(setts)
          setFormData(prev => ({ 
            ...prev, 
            konditionen: { rabatt: setts.standard_rabatt || 0, mwst: setts.standard_mwst || 8.1 } 
          }))
        }
      } catch (e) { console.log(e) }

      if (!supabase) {
        setCatalog({})
        return
      }
      try {
        const { data: kategorien, error: catError } = await supabase.from('katalog_kategorien').select('*').order('sort_order', { ascending: true })
        const { data: leistungen, error: posError } = await supabase.from('katalog_leistungen').select('*').order('sort_order', { ascending: true })
        
        if (catError || posError || !kategorien || kategorien.length === 0) {
          throw new Error('Supabase Katalog Fehler oder Leer')
        }

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
      } catch (err) {
        console.error('Failed to load catalog from Supabase', err)
        setCatalog({})
      }
    }
    
    loadCatalog()

    // 2. Kunden laden (falls Supabase konfiguriert ist)
    if (supabase) {
      supabase.from('kunden').select('*').order('name', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) {
            setKundenList(data)
            
            // Auto-select if prefilledKundeId is provided
            if (prefilledKundeId) {
              const kunde = data.find(k => k.id === prefilledKundeId)
              if (kunde) {
                setFormData(prev => ({
                  ...prev,
                  kunde: {
                    id: kunde.id,
                    name: kunde.name || '',
                    strasse: kunde.strasse || '',
                    plz: kunde.plz || '',
                    ort: kunde.ort || '',
                    email: kunde.email || '',
                    telefon: kunde.telefon || '',
                    typ: kunde.typ || '',
                  }
                }))
              }
            }
          }
        })
        
      // 3. Einstellungen laden
      supabase.from('einstellungen').select('*').limit(1).maybeSingle()
        .then(({ data, error }) => {
          if (!error && data) {
            setFormData(prev => ({
              ...prev,
              konditionen: {
                rabatt: String(data.standard_rabatt || 0),
                mwst: String(data.standard_mwst || 8.1)
              }
            }))
          }
        })
    }
  }, [prefilledKundeId])

  // API states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [settings, setSettings] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(null)
  const [submitError, setSubmitError] = useState(null)

  // ── Validation ──

  const validateStep = (step) => {
    const newErrors = {}

    if (step === 1) {
      if (!formData.kunde.name.trim()) {
        newErrors.kunde = 'Bitte einen Kundennamen eingeben.'
      }
      if (!formData.projekt.name.trim()) {
        newErrors.projekt = 'Bitte einen Projektnamen eingeben.'
      }
    }

    if (step === 3) {
      // Must have at least one block with at least one position
      const totalPositions = bloecke.reduce((sum, b) => sum + b.positionen.length, 0)
      if (bloecke.length === 0 || totalPositions === 0) {
        newErrors.leistungen = 'Mindestens eine Position erforderlich.'
      }

      // Validate each non-info position has menge and preis
      bloecke.forEach((block, bi) => {
        block.positionen.forEach((pos, pi) => {
          if (pos.nurInfo) return // skip info-only positions
          if (!pos.menge || parseFloat(pos.menge) <= 0) {
            newErrors[`b${bi}_pos_${pi}_menge`] = true
          }
          if (!pos.einzelpreis || parseFloat(pos.einzelpreis) <= 0) {
            newErrors[`b${bi}_pos_${pi}_preis`] = true
          }
        })
      })

      if (Object.keys(newErrors).length > 0 && !newErrors.leistungen) {
        newErrors.leistungen = 'Bitte Menge und Preis für alle berechneten Positionen ausfüllen.'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ── Navigation ──

  const goNext = () => {
    if (!validateStep(currentStep)) return
    setCurrentStep((s) => Math.min(s + 1, 4))
  }

  const goBack = () => {
    if (isSubmitting || submitSuccess) return
    setErrors({})
    setCurrentStep((s) => Math.max(s - 1, 1))
  }

  // ── Flatten blocks for output and summary ──

  const getFlatLeistungen = () => flattenBloecke(bloecke)

  // ── Generate ──

  const handleGenerate = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    const flatLeistungen = getFlatLeistungen()

    // CRM Supabase Speicherung (Kunde & Projekt & Rechnung)
    if (supabase) {
      try {
        let kundenId = formData.kunde.id
        
        // 1. Kunde prüfen/anlegen
        if (!kundenId) {
          const { data: existingKunden } = await supabase
            .from('kunden')
            .select('id')
            .ilike('name', formData.kunde.name)
            .limit(1)
          
          if (existingKunden && existingKunden.length > 0) {
            kundenId = existingKunden[0].id
          } else {
            const { data: newKunde } = await supabase.from('kunden').insert([{
              name: formData.kunde.name,
              ort: formData.projekt.adresse || ''
            }]).select()
            if (newKunde) kundenId = newKunde[0].id
          }
        }

        let projektId = formData.projekt.id

        // 2. Projekt anlegen falls neu
        if (!projektId && kundenId) {
          const { data: newProj } = await supabase.from('projekte').insert([{
            kunden_id: kundenId,
            name: formData.projekt.name,
            adresse: formData.projekt.adresse || ''
          }]).select()
          if (newProj) projektId = newProj[0].id
        }

        // 3. Rechnungn-Nummer generieren
        const RechnungNr = await generateNextRechnungNr(supabase, settings?.startnummer_rechnungen)

        // 4. Rechnungn-Historie anlegen
        const { finalTotal } = calculateDocumentTotals(flatLeistungen, formData.konditionen, null)

        const zahlungsfristTage = parseZahlungsfrist(formData.rechnungsdetails?.zahlungsziel, settings?.zahlungsfrist_tage || 30)

        const { data: newRechnung } = await supabase.from('rechnungen').insert([{
          rechnung_nr: RechnungNr,
          kunden_id: kundenId,
          projekt_id: projektId,
          total: formData.rechnungsdetails?.typ === 'Akontorechnung' && formData.rechnungsdetails?.akonto ? finalTotal * (parseFloat(formData.rechnungsdetails.akonto) / 100) : finalTotal,
          status: 'Entwurf',
          typ: formData.rechnungsdetails?.typ === 'Akontorechnung' ? 'akonto' : 'gesamt',
          akonto_prozent: formData.rechnungsdetails?.typ === 'Akontorechnung' ? (parseFloat(formData.rechnungsdetails.akonto) || null) : null,
          rechnungsdatum: formData.rechnungsdetails?.datum,
          zahlungsfrist_tage: zahlungsfristTage,
          daten: { ...formData, einleitungstext: formData.texte?.einleitungstext || '', schlusstext: formData.texte?.schlusstext || '', leistungen: flatLeistungen }
        }]).select('*, kunden(*), projekte(*)')
        
        if (newRechnung && newRechnung.length > 0) {
          setSubmitSuccess(newRechnung[0])
        } else {
          setSubmitError('Rechnung konnte nicht geladen werden.')
        }
      } catch (err) {
        console.error('CRM Supabase Sync Error:', err)
        setSubmitError(err.message)
      }
    }

    setIsSubmitting(false)
  }

  // ── Render current step ──

  const renderStep = () => {
    if (submitSuccess) return null 
    
    switch (currentStep) {
      case 1:
        return (
          <StepKunde
            data={formData}
            onChange={setFormData}
            errors={errors}
            kundenList={kundenList}
          />
        )
      case 2:
        return (
          <StepRechnungsdetails
            data={formData.rechnungsdetails}
            onChange={(rechnungsdetails) => setFormData((prev) => ({ ...prev, rechnungsdetails }))}
          />
        )
      case 3:
        return (
          <StepLeistungen
            bloecke={bloecke}
            onChange={setBloecke}
            errors={errors}
            catalog={catalog}
          />
        )
      case 4:
        return (
          <StepAbschluss
            formData={formData}
            flatLeistungen={getFlatLeistungen()}
            onChangeKonditionen={(konditionen) =>
              setFormData((prev) => ({ ...prev, konditionen }))
            }
            onChangeTexte={(texte) =>
              setFormData((prev) => ({ ...prev, texte }))
            }
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background sm:bg-gray-900/40 sm:backdrop-blur-sm flex flex-col sm:p-4 md:p-6 lg:p-8 sm:justify-center sm:items-center">
      <div className="w-full max-w-3xl flex flex-col bg-surface sm:rounded-2xl sm:shadow-2xl overflow-hidden h-full sm:h-auto sm:max-h-full">
        
        {/* ── Header ── */}
        <header className="shrink-0 bg-surface-card border-b border-border px-4 py-4 sm:px-8 sm:py-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleCloseWithConfirm}
              disabled={isSubmitting}
              className={`inline-flex items-center gap-1.5 transition-colors ${
                isSubmitting ? 'text-gray-300 cursor-not-allowed' : 'text-text-secondary hover:text-text-primary cursor-pointer'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="hidden sm:inline">Abbrechen</span>
            </button>
            <h2 className="text-base font-bold text-text-primary">Neue Rechnung</h2>
            <div className="w-20" /> {/* Spacer */}
          </div>
          {!submitSuccess && <Stepper currentStep={currentStep} />}
        </header>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-8 flex flex-col h-full">
            {renderStep()}

          {/* SUCCESS UI */}
          {submitSuccess && (
            <Suspense fallback={<div className="flex h-64 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" /></div>}>
              <RechnungPrintView 
                rechnung={submitSuccess} 
                kunde={submitSuccess.kunden} 
                projekt={submitSuccess.projekte} 
                onClose={onClose} 
              />
            </Suspense>
          )}
        </div>
      </div> {/* <-- Closes flex-1 overflow-y-auto */}

      {/* ─── Footer with nav buttons (Only show when not in success) ─── */}
      {!submitSuccess && (
        <footer className="shrink-0 bg-surface-card border-t border-border px-4 sm:px-8 py-4 sm:py-5">
          {submitError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-start gap-2">
              <IconWarning className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p>Fehler beim Speichern: {submitError}</p>
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            {currentStep > 1 ? (
              <button
                onClick={goBack}
                disabled={isSubmitting}
                className={`w-full sm:w-auto min-h-[48px] inline-flex justify-center items-center gap-1.5 px-5 py-3 sm:py-2.5 bg-surface border border-border font-medium text-base sm:text-sm rounded-xl transition-all ${
                  isSubmitting ? 'text-gray-300 cursor-not-allowed' : 'text-text-primary hover:bg-gray-100 active:scale-[0.97] cursor-pointer'
                }`}
              >
                <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Zurück
              </button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <button
                onClick={goNext}
                className="w-full sm:w-auto min-h-[48px] inline-flex justify-center items-center gap-1.5 px-6 py-3 sm:py-2.5 bg-primary-600 text-white font-semibold text-base sm:text-sm rounded-xl hover:bg-primary-700 active:scale-[0.97] transition-all shadow-md shadow-primary-600/20 cursor-pointer"
              >
                Weiter
                <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isSubmitting}
                className={`w-full sm:w-auto inline-flex items-center justify-center min-w-[220px] min-h-[48px] gap-2 px-6 py-3 font-bold text-base sm:text-sm rounded-xl transition-all shadow-lg ${
                  isSubmitting 
                    ? 'bg-gray-200 text-gray-500 cursor-wait shadow-none' 
                    : 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 active:scale-[0.97] shadow-primary-600/25 cursor-pointer'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 sm:h-4 sm:w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Vorschau laden...
                  </>
                ) : (
                  <>
                    <IconEye className="w-4 h-4" />
                    Vorschau generieren
                  </>
                )}
              </button>
            )}
          </div>
        </footer>
      )}
      </div>

      {/* Discard Modal */}
      {showDiscardModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Entwurf verwerfen?</h3>
            <p className="text-text-secondary mb-6 text-sm">
              Möchten Sie den Entwurf wirklich verwerfen? Alle ungespeicherten Daten gehen verloren.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setShowDiscardModal(false)}
                className="flex-1 px-4 py-2.5 bg-surface text-text-primary border border-border rounded-xl hover:bg-neutral-100 font-medium transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button 
                onClick={() => {
                  setShowDiscardModal(false)
                  onClose()
                }}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-colors cursor-pointer"
              >
                Verwerfen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

