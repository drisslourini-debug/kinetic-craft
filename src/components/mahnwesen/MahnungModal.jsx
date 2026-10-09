import React, { useState, useEffect } from 'react'
import {
  DEFAULT_MAHNSTUFEN,
  calculateVerzugstage,
  calculateVerzugszins,
  calculateMahnungTotal,
  generateMahntext,
  getMahnVorschlag,
  roundToFiveRappen
} from '../../lib/mahnwesenHelper'
import { formatMoney, formatDate } from '../../lib/formatters'
import {
  IconWarning,
  IconCheck,
  IconPrinter,
  IconDocument,
  IconClock,
  IconCalendar
} from '../icons/BrandIcons'

function IconClose({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export default function MahnungModal({
  isOpen,
  onClose,
  rechnung,
  kunde,
  projekt,
  settings,
  onSaveMahnung,
  onOpenPrintView,
  onOpenBetreibung
}) {
  const [activeTab, setActiveTab] = useState('assistent') // 'assistent' | 'historie' | 'mahnstopp'
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Current dunning state
  const mahnvorschlag = getMahnVorschlag(rechnung)
  const defaultStufe = typeof mahnvorschlag.naechsteStufe === 'number' 
    ? mahnvorschlag.naechsteStufe 
    : 1

  const [selectedStufe, setSelectedStufe] = useState(defaultStufe)
  const [mahnDatum, setMahnDatum] = useState(new Date().toISOString().split('T')[0])
  const [fristTage, setFristTage] = useState(DEFAULT_MAHNSTUFEN[defaultStufe]?.fristTage || 10)
  const [spesen, setSpesen] = useState(DEFAULT_MAHNSTUFEN[defaultStufe]?.spesen || 0)
  const [zinsAktiv, setZinsAktiv] = useState(DEFAULT_MAHNSTUFEN[defaultStufe]?.zinsAktiv || false)
  const [verzugszins, setVerzugszins] = useState(mahnvorschlag.verzugszins || 0)

  // Texts
  const [betreff, setBetreff] = useState('')
  const [einleitung, setEinleitung] = useState('')
  const [mahnhinweis, setMahnhinweis] = useState('')

  // Mahnstopp State
  const [mahnstoppAktiv, setMahnstoppAktiv] = useState(Boolean(rechnung?.daten?.mahnstopp))
  const [mahnstoppGrund, setMahnstoppGrund] = useState(rechnung?.daten?.mahnstopp_grund || '')

  // Amounts
  const total = parseFloat(rechnung?.total || 0)
  const bezahlt = parseFloat(rechnung?.bezahlt || 0)
  const restbetrag = Math.max(0, total - bezahlt)
  const verzugstage = calculateVerzugstage(rechnung?.faellig_am, mahnDatum)

  // Update dunning values whenever stufe changes
  useEffect(() => {
    const config = DEFAULT_MAHNSTUFEN[selectedStufe] || DEFAULT_MAHNSTUFEN[1]
    setFristTage(config.fristTage)
    setSpesen(config.spesen)
    setZinsAktiv(config.zinsAktiv)

    const calcZins = config.zinsAktiv 
      ? calculateVerzugszins(restbetrag, verzugstage, 0.05) 
      : 0
    setVerzugszins(calcZins)
  }, [selectedStufe, restbetrag, verzugstage])

  // Recalculate interest when zinsAktiv is toggled or mahnDatum changes
  useEffect(() => {
    if (zinsAktiv) {
      const calcZins = calculateVerzugszins(restbetrag, verzugstage, 0.05)
      setVerzugszins(calcZins)
    } else {
      setVerzugszins(0)
    }
  }, [zinsAktiv, verzugstage, restbetrag])

  // Calculate due date of dunning
  const fristDatum = new Date(mahnDatum)
  fristDatum.setDate(fristDatum.getDate() + parseInt(fristTage, 10))
  const fristDatumStr = fristDatum.toLocaleDateString('de-CH')
  const fristDatumISO = fristDatum.toISOString().split('T')[0]

  const gesamtforderung = calculateMahnungTotal({
    restbetrag,
    spesen: parseFloat(spesen) || 0,
    verzugszins: parseFloat(verzugszins) || 0
  })

  // Generate texts on parameter change
  useEffect(() => {
    if (!rechnung) return
    const textData = generateMahntext(selectedStufe, {
      rechnung,
      kunde: kunde || {},
      settings: settings || {},
      fristDatumStr,
      restbetrag,
      spesen: parseFloat(spesen) || 0,
      verzugszins: parseFloat(verzugszins) || 0,
      gesamtforderung
    })

    setBetreff(textData.betreff)
    setEinleitung(textData.einleitung)
    setMahnhinweis(textData.mahnhinweis)
  }, [selectedStufe, fristDatumStr, spesen, verzugszins, gesamtforderung, rechnung, kunde, settings])

  if (!isOpen || !rechnung) return null

  const mahnhistorie = Array.isArray(rechnung?.daten?.mahnungen) ? rechnung.daten.mahnungen : []

  // Build the complete mahnung payload
  const currentMahnungData = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    stufe: selectedStufe,
    titel: DEFAULT_MAHNSTUFEN[selectedStufe]?.titel || `Mahnung Stufe ${selectedStufe}`,
    datum: mahnDatum,
    fristTage: parseInt(fristTage, 10),
    fristDatum: fristDatumISO,
    verzugstage,
    restbetrag,
    spesen: parseFloat(spesen) || 0,
    verzugszins: parseFloat(verzugszins) || 0,
    gesamtforderung,
    betreff,
    einleitung,
    mahnhinweis,
    schlussformel: generateMahntext(selectedStufe, {
      rechnung,
      kunde: kunde || {},
      settings: settings || {},
      fristDatumStr,
      restbetrag,
      spesen: parseFloat(spesen) || 0,
      verzugszins: parseFloat(verzugszins) || 0,
      gesamtforderung
    }).schlussformel
  }

  const handleSaveMahnungClick = async () => {
    setIsSubmitting(true)
    try {
      const updatedMahnungen = [...mahnhistorie, currentMahnungData]
      const updatedDaten = {
        ...(rechnung.daten || {}),
        mahnstufe: selectedStufe,
        letzte_mahnung_am: mahnDatum,
        mahnungen: updatedMahnungen,
        mahnstopp: false, // Mahnung hebt einen allfälligen Mahnstopp auf
        mahnstopp_grund: ''
      }

      const updatedRechnung = {
        ...rechnung,
        status: 'Gemahnt',
        daten: updatedDaten
      }

      if (onSaveMahnung) {
        await onSaveMahnung({
          mahnungData: currentMahnungData,
          updatedRechnung
        })
      }
      onClose()
    } catch (err) {
      console.error('Fehler beim Speichern der Mahnung:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveMahnstoppClick = async () => {
    setIsSubmitting(true)
    try {
      const updatedDaten = {
        ...(rechnung.daten || {}),
        mahnstopp: mahnstoppAktiv,
        mahnstopp_grund: mahnstoppAktiv ? mahnstoppGrund : '',
        mahnstopp_datum: mahnstoppAktiv ? new Date().toISOString() : null
      }

      const updatedRechnung = {
        ...rechnung,
        daten: updatedDaten
      }

      if (onSaveMahnung) {
        await onSaveMahnung({
          mahnungData: null,
          updatedRechnung
        })
      }
      onClose()
    } catch (err) {
      console.error('Fehler beim Speichern des Mahnstopps:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePreviewClick = () => {
    if (onOpenPrintView) {
      onOpenPrintView(currentMahnungData)
    }
  }

  const docNr = rechnung.rechnung_nr || `RE-${rechnung.id || ''}`

  return (
    <div
      className="fixed inset-0 z-[105] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-3xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-neutral-800 rounded-xl">
              <IconDocument className="w-5 h-5 text-amber-400" />
            </span>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Schweizer Mahnwesen</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-mono">
                  {docNr}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                {kunde?.name || kunde?.firmenname || 'Kunde'} • Fällig seit {verzugstage} Tagen
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-800 rounded-xl transition-colors text-neutral-400 hover:text-white cursor-pointer"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-neutral-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('assistent')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
              activeTab === 'assistent'
                ? 'bg-surface text-primary-700 border-t border-x border-border shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Mahnung erstellen
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mahnstopp')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'mahnstopp'
                ? 'bg-surface text-primary-700 border-t border-x border-border shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span>Mahnstopp</span>
            {rechnung?.daten?.mahnstopp && (
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('historie')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'historie'
                ? 'bg-surface text-primary-700 border-t border-x border-border shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span>Historie</span>
            <span className="px-1.5 py-0.2 rounded-full bg-neutral-200 text-neutral-700 text-[10px]">
              {mahnhistorie.length}
            </span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {/* TAB 1: ASSISTENT */}
          {activeTab === 'assistent' && (
            <div className="space-y-6">
              {/* Mahnstufen Wahl (1, 2, 3) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                  1. Mahnstufe wählen
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[1, 2, 3].map((s) => {
                    const cfg = DEFAULT_MAHNSTUFEN[s]
                    const isSelected = selectedStufe === s
                    const isOver = (rechnung?.daten?.mahnstufe || 0) >= s

                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedStufe(s)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative ${
                          isSelected
                            ? 'border-primary-600 bg-primary-50/50 ring-2 ring-primary-500/20 shadow-xs'
                            : 'border-border bg-surface hover:border-neutral-300'
                        }`}
                      >
                        {isOver && (
                          <span className="absolute top-2 right-2 text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-medium">
                            Bereits gemahnt
                          </span>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                              isSelected ? 'bg-primary-600 text-white' : 'bg-neutral-200 text-neutral-700'
                            }`}>
                              {s}
                            </span>
                            <span className="text-xs font-bold text-text-primary">
                              {cfg.name}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-secondary mt-1.5 leading-snug">
                            {cfg.beschreibung}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-neutral-200/60 flex items-center justify-between text-[11px] text-text-muted">
                          <span>Spesen: CHF {cfg.spesen.toFixed(2)}</span>
                          <span>Frist: {cfg.fristTage} Tage</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Parameter & Konditionen */}
              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                  2. Frist, Mahnspesen & Verzugszins anpassen
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">
                      Mahndatum
                    </label>
                    <input
                      type="date"
                      value={mahnDatum}
                      onChange={(e) => setMahnDatum(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">
                      Nachfrist (Tage)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={fristTage}
                      onChange={(e) => setFristTage(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs"
                    />
                    <span className="text-[10px] text-text-muted mt-0.5 block">
                      Zahlbar bis: {fristDatumStr}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">
                      Mahnspesen (CHF)
                    </label>
                    <input
                      type="number"
                      step="5"
                      min="0"
                      value={spesen}
                      onChange={(e) => setSpesen(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs"
                    />
                    <span className="text-[10px] text-text-muted mt-0.5 block">
                      Jederzeit erlassbar (0.–)
                    </span>
                  </div>
                </div>

                {/* Verzugszins Art. 104 OR */}
                <div className="pt-3 border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="zinsCheckbox"
                      checked={zinsAktiv}
                      onChange={(e) => setZinsAktiv(e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded cursor-pointer"
                    />
                    <label htmlFor="zinsCheckbox" className="text-xs text-text-primary font-medium cursor-pointer">
                      5.0% gesetzlichen Verzugszins geltend machen (Art. 104 Abs. 1 OR)
                    </label>
                  </div>

                  {zinsAktiv && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary">Zinsbetrag:</span>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        value={verzugszins}
                        onChange={(e) => setVerzugszins(e.target.value)}
                        className="w-24 px-2 py-1 bg-surface border border-border rounded-lg text-xs font-bold text-right text-rose-700"
                      />
                      <span className="text-xs font-bold">CHF</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Abrechnungs-Kompaktansicht */}
              <div className="bg-white border border-border rounded-xl p-4 shadow-xs space-y-1.5 text-xs">
                <div className="flex justify-between text-text-secondary">
                  <span>Ausstehende Hauptforderung:</span>
                  <span className="font-semibold text-text-primary">CHF {formatMoney(restbetrag)}</span>
                </div>
                {parseFloat(spesen) > 0 && (
                  <div className="flex justify-between text-text-secondary">
                    <span>Mahnspesen:</span>
                    <span>+ CHF {formatMoney(parseFloat(spesen))}</span>
                  </div>
                )}
                {parseFloat(verzugszins) > 0 && (
                  <div className="flex justify-between text-text-secondary">
                    <span>Verzugszins (Art. 104 OR):</span>
                    <span>+ CHF {formatMoney(parseFloat(verzugszins))}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-neutral-200 text-sm font-bold text-text-primary">
                  <span>Neuer Mahnbetrag / Gesamtforderung:</span>
                  <span className="text-base text-primary-700 font-mono">
                    CHF {formatMoney(gesamtforderung)}
                  </span>
                </div>
              </div>

              {/* Text Editieren */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                  3. Text für Mahnschreiben prüfen
                </label>
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Betreff
                  </label>
                  <input
                    type="text"
                    value={betreff}
                    onChange={(e) => setBetreff(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Einleitungstext
                  </label>
                  <textarea
                    rows={4}
                    value={einleitung}
                    onChange={(e) => setEinleitung(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs leading-relaxed"
                  />
                </div>
                {selectedStufe === 3 && (
                  <div>
                    <label className="block text-xs font-semibold text-rose-700 mb-1">
                      SchKG Betreibungs-Rechtshinweis
                    </label>
                    <textarea
                      rows={3}
                      value={mahnhinweis}
                      onChange={(e) => setMahnhinweis(e.target.value)}
                      className="w-full px-3 py-2 bg-rose-50/50 border border-rose-200 rounded-lg text-xs text-rose-900 leading-relaxed font-mono"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MAHNSTOPP */}
          {activeTab === 'mahnstopp' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
                <p className="font-bold">Was bewirkt der Mahnstopp?</p>
                <p className="mt-1 leading-relaxed">
                  Ein aktiver Mahnstopp verhindert, dass diese Rechnung in Mahnvorschlägen oder automatischen Mahnläufen erscheint.
                  Ideal bei berechtigten Mängelrügen, Bauabnahmen mit Vorbehalt oder vereinbarten Ratenzahlungen.
                </p>
              </div>

              <div className="p-4 bg-surface border border-border rounded-xl space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mahnstoppAktiv}
                    onChange={(e) => setMahnstoppAktiv(e.target.checked)}
                    className="w-5 h-5 text-primary-600 rounded cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-bold text-text-primary block">
                      Mahnstopp für Rechnung {docNr} aktivieren
                    </span>
                    <span className="text-xs text-text-secondary">
                      Rechnung wird im Dashboard und Mahnwesen als &quot;Mahnstopp aktiv&quot; markiert.
                    </span>
                  </div>
                </label>

                {mahnstoppAktiv && (
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">
                      Grund für den Mahnstopp (intern & transparent)
                    </label>
                    <input
                      type="text"
                      placeholder="z.B. Mängelrüge Malerarbeiten in Klärung, Termin am 15.02."
                      value={mahnstoppGrund}
                      onChange={(e) => setMahnstoppGrund(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: HISTORIE */}
          {activeTab === 'historie' && (
            <div className="space-y-4">
              {mahnhistorie.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-xs">
                  Für diese Rechnung wurden bisher noch keine Mahnungen ausgestellt.
                </div>
              ) : (
                <div className="space-y-3">
                  {mahnhistorie.map((m, idx) => (
                    <div
                      key={m.id || idx}
                      className="p-4 bg-surface border border-border rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            m.stufe === 3 
                              ? 'bg-rose-100 text-rose-800' 
                              : m.stufe === 2 
                                ? 'bg-orange-100 text-orange-800' 
                                : 'bg-amber-100 text-amber-800'
                          }`}>
                            {m.titel || `Stufe ${m.stufe}`}
                          </span>
                          <span className="text-xs text-text-secondary">
                            vom {formatDate(m.datum)}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted mt-1">
                          Frist: {m.fristTage} Tage (bis {formatDate(m.fristDatum)}) • Spesen: CHF {formatMoney(m.spesen || 0)} • Zins: CHF {formatMoney(m.verzugszins || 0)}
                        </p>
                      </div>

                      <div className="text-right flex items-center gap-3">
                        <span className="font-bold text-sm text-text-primary font-mono">
                          CHF {formatMoney(m.gesamtforderung || m.restbetrag)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onOpenPrintView(m)}
                          className="p-2 hover:bg-neutral-100 rounded-lg text-primary-600 cursor-pointer"
                          title="Mahnung nochmals drucken / anzeigen"
                        >
                          <IconPrinter className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Eskalation zur Betreibung bei Stufe 3 */}
              {(rechnung?.daten?.mahnstufe >= 3 || mahnhistorie.some(m => m.stufe >= 3)) && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between mt-4">
                  <div>
                    <span className="text-xs font-bold text-rose-900 block">
                      Letzte Mahnstufe wurde bereits erreicht
                    </span>
                    <span className="text-xs text-rose-700">
                      Falls die Zahlung weiterhin ausbleibt, kann das SchKG-Betreibungsbegehren eingeleitet werden.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      if (onOpenBetreibung) onOpenBetreibung()
                    }}
                    className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-all cursor-pointer shrink-0 ml-2"
                  >
                    Betreibung vorbereiten →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-50 border-t border-border flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary cursor-pointer"
          >
            Abbrechen
          </button>

          {activeTab === 'assistent' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePreviewClick}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-xl transition-all cursor-pointer"
              >
                <IconPrinter className="w-4 h-4" />
                <span>Vorschau & Druck</span>
              </button>

              <button
                type="button"
                onClick={handleSaveMahnungClick}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <IconCheck className="w-4 h-4" />
                <span>{isSubmitting ? 'Speichere...' : `Mahnung (Stufe ${selectedStufe}) ausstellen`}</span>
              </button>
            </div>
          )}

          {activeTab === 'mahnstopp' && (
            <button
              type="button"
              onClick={handleSaveMahnstoppClick}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              Mahnstopp-Status speichern
            </button>
          )}

          {activeTab === 'historie' && (
            <button
              type="button"
              onClick={() => setActiveTab('assistent')}
              className="px-4 py-2 text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-all cursor-pointer"
            >
              Neue Mahnung erfassen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
