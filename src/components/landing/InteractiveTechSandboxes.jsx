import React, { useState } from 'react'
import {
  TradeIcon,
  IconCheck,
  IconSparkles,
  IconQrBill,
  IconCamera,
  IconMic,
  IconShieldCheck,
  IconSearch,
  IconDocument,
} from '../icons/BrandIcons'

/**
 * 1. INTERACTIVE SANDBOX FOR /funktionen:
 * Swiss QR-Bill (ISO 20022), 3-Level Dunning (OR Art. 104) & Zefix Live-Lookup
 */
export function QrAndMahnwesenSandbox({ onStartTrial }) {
  const [activeStage, setActiveStage] = useState('mahnung_1')
  const [selectedZefixIdx, setSelectedZefixIdx] = useState(0)

  const stages = [
    {
      id: 'qr_rechnung',
      badge: 'Tag 1 · Versand',
      title: 'Standard QR-Rechnung',
      subtitle: 'ISO 20022 · 30 Tage netto',
      baseAmount: 4864.5,
      interestAmount: 0,
      feeAmount: 0,
      totalAmount: 4864.5,
      statusLabel: 'Offen · Zahlbar bis 30 Tage',
      statusColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      docTitle: 'RECHNUNG NR. RE-2026-0842',
      docNote: 'Zahlbar innert 30 Tagen rein netto mittels untenstehendem Schweizer QR-Zahlteil.',
      bananaBooking: [
        { soll: '1100', haben: '3400', text: 'Rechnung RE-2026-0842 (Netto)', amount: "CHF 4'500.00" },
        { soll: '1100', haben: '2200', text: 'Geschuldete MWST 8.1%', amount: 'CHF 364.50' },
      ],
    },
    {
      id: 'erinnerung',
      badge: 'Stufe 1 · Tag 31',
      title: 'Zahlungserinnerung',
      subtitle: 'Kulant · CHF 0.– Gebühr',
      baseAmount: 4864.5,
      interestAmount: 0,
      feeAmount: 0,
      totalAmount: 4864.5,
      statusLabel: 'Mahnung Stufe 1 aktiv · +10 Tage Frist',
      statusColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      docTitle: 'ZAHLUNGSERINNERUNG ZU RE-2026-0842',
      docNote: 'Sicher ist es im Baustellenalltag untergegangen: Wir bitten um Begleichung innert 10 Tagen ohne Mahngebühr.',
      bananaBooking: [
        { soll: '1100', haben: '3400', text: 'OP-Überwachung aktiv (Stufe 1)', amount: "CHF 4'864.50" },
        { soll: '—', haben: '—', text: 'Kein Verzugszins (Kulanzstufe)', amount: 'CHF 0.00' },
      ],
    },
    {
      id: 'mahnung_1',
      badge: 'Stufe 2 · Tag 45',
      title: '1. Mahnung + 5% Zins',
      subtitle: 'OR Art. 104 · Verzugszins & Gebühr',
      baseAmount: 4864.5,
      interestAmount: 30.0,
      feeAmount: 20.0,
      totalAmount: 4914.5,
      statusLabel: '1. Mahnung mit 5% Verzugszins (OR 104)',
      statusColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      docTitle: '1. MAHNUNG ZU RECHNUNG RE-2026-0842',
      docNote: 'Inkl. 5.0% gesetzlicher Verzugszins nach Schweizer OR Art. 104 sowie CHF 20.00 Mahnspesen. Neuer QR-Code generiert.',
      bananaBooking: [
        { soll: '1100', haben: '6950', text: 'Verzugszins 5% nach OR Art. 104', amount: 'CHF 30.00' },
        { soll: '1100', haben: '3490', text: 'Mahnspesen 1. Mahnung', amount: 'CHF 20.00' },
      ],
    },
    {
      id: 'mahnung_2',
      badge: 'Stufe 3 · Tag 60',
      title: '2. Mahnung (Letzte Frist)',
      subtitle: 'Vor Betreibung (SchKG)',
      baseAmount: 4864.5,
      interestAmount: 45.0,
      feeAmount: 50.0,
      totalAmount: 4959.5,
      statusLabel: 'Letzte Mahnung · 5 Tage Frist vor SchKG',
      statusColor: 'bg-red-500/20 text-red-300 border-red-500/40',
      docTitle: '2. & LETZTE MAHNUNG ZU RE-2026-0842',
      docNote: 'Letzte aussergerichtliche Zahlungsfrist von 5 Tagen vor Übergabe an das Betreibungsamt nach SchKG.',
      bananaBooking: [
        { soll: '1100', haben: '6950', text: 'Kumulierter Verzugszins 5% (OR 104)', amount: 'CHF 45.00' },
        { soll: '1100', haben: '3490', text: 'Mahn- & Dossiergebühr Stufe 3', amount: 'CHF 50.00' },
      ],
    },
  ]

  const zefixCompanies = [
    {
      uid: 'CHE-114.258.391 MWST',
      name: 'Keller Holzbau & Schreinerei AG',
      sitz: '3014 Bern (BE)',
      adresse: 'Wankdorffeldstrasse 102, 3014 Bern',
      rechtsform: 'Aktiengesellschaft (AG)',
      status: 'Aktiv · Handelsregister Kanton Bern',
    },
    {
      uid: 'CHE-249.810.442 MWST',
      name: 'Bärtschi Elektro & Automation AG',
      sitz: '8005 Zürich (ZH)',
      adresse: 'Hardturmstrasse 161, 8005 Zürich',
      rechtsform: 'Aktiengesellschaft (AG)',
      status: 'Aktiv · Handelsregister Kanton Zürich',
    },
    {
      uid: 'CHE-381.902.115 MWST',
      name: 'Gasser Sanitär & Heizung GmbH',
      sitz: '6003 Luzern (LU)',
      adresse: 'Pilatusstrasse 38, 6003 Luzern',
      rechtsform: 'Gesellschaft mit beschränkter Haftung (GmbH)',
      status: 'Aktiv · Handelsregister Kanton Luzern',
    },
  ]

  const currentStage = stages.find((s) => s.id === activeStage) || stages[2]
  const currentZefix = zefixCompanies[selectedZefixIdx] || zefixCompanies[0]

  return (
    <div className="space-y-12">
      {/* Interactive QR-Bill & Dunning Simulator */}
      <div className="bg-slate-950 text-white rounded-3xl border border-slate-800 p-6 sm:p-8 lg:p-10 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-full mb-2">
              <IconQrBill className="w-3.5 h-3.5 text-amber-300" />
              <span>Interaktive Live-Sandbox · Liquiditäts-Schutz</span>
            </span>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
              Vom Erstversand bis zur 2. Mahnung: 100% automatisiert.
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Klicken Sie auf eine Eskalationsstufe – der Schweizer QR-Zahlteil (ISO 20022) und die Banana-Buchungszeilen passen sich sofort live an.
            </p>
          </div>
          <div className={`px-3.5 py-2 rounded-xl border text-xs font-bold shrink-0 self-start lg:self-center ${currentStage.statusColor}`}>
            {currentStage.statusLabel}
          </div>
        </div>

        {/* 4 Stage Selector Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-6">
          {stages.map((st) => {
            const isSelected = st.id === activeStage
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setActiveStage(st.id)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-br from-amber-500/20 to-slate-900 border-amber-400 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/40'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-amber-400 mb-1">
                  <span>{st.badge}</span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                </div>
                <div className="font-bold text-sm text-white">{st.title}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{st.subtitle}</div>
              </button>
            )
          })}
        </div>

        {/* Split Preview: Left = Swiss A4 QR-Bill Simulation, Right = Live Banana Journal & Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Simulated A4 Document with Swiss QR-Bill */}
          <div className="lg:col-span-7 bg-white text-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-inner flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-2 pb-4 border-b border-slate-200">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                    A4 Echtzeit-Vorschau · ISO 20022
                  </span>
                  <h4 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                    {currentStage.docTitle}
                  </h4>
                </div>
                <div className="text-right text-xs">
                  <span className="font-bold text-slate-800 block">Keller Holzbau AG</span>
                  <span className="text-slate-500">CHE-114.258.391 MWST</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 my-3 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                {currentStage.docNote}
              </p>

              {/* Line Items Summary */}
              <div className="space-y-1.5 text-xs font-mono border-b border-slate-200 pb-3">
                <div className="flex justify-between text-slate-700">
                  <span>Ursprungsrechnung RE-2026-0842 (inkl. 8.1% MWST)</span>
                  <span className="font-bold">CHF {currentStage.baseAmount.toFixed(2)}</span>
                </div>
                {currentStage.interestAmount > 0 && (
                  <div className="flex justify-between text-amber-800 font-semibold">
                    <span>+ 5.0% Verzugszins nach Schweizer OR Art. 104</span>
                    <span>CHF {currentStage.interestAmount.toFixed(2)}</span>
                  </div>
                )}
                {currentStage.feeAmount > 0 && (
                  <div className="flex justify-between text-red-700 font-semibold">
                    <span>+ Mahn- & Umtriebsentschädigung</span>
                    <span>CHF {currentStage.feeAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Simulated Official Swiss QR-Bill Payment Part */}
            <div className="mt-4 pt-3 border-t-2 border-dashed border-slate-300 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-4 flex flex-col items-center justify-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="w-20 h-20 bg-slate-900 rounded-lg flex items-center justify-center relative shadow-xs">
                  {/* Simulated QR Matrix with Official Swiss Cross */}
                  <div className="grid grid-cols-5 gap-0.5 p-2 w-full h-full opacity-90">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-[1px] ${i % 2 === 0 || i % 7 === 0 ? 'bg-white' : 'bg-slate-900'}`}
                      />
                    ))}
                  </div>
                  <div className="absolute w-5 h-5 bg-black border border-white flex items-center justify-center">
                    <div className="w-3 h-1 bg-white absolute" />
                    <div className="w-1 h-3 bg-white absolute" />
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-500 mt-1.5">Swiss QR Code · ISO 20022</span>
              </div>

              <div className="sm:col-span-8 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">QR-IBAN:</span>
                  <span className="text-slate-800 font-bold">CH44 3199 9123 0008 8901 2</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Referenz:</span>
                  <span className="text-slate-800 font-bold">21 00000 00003 13947 14300 09017</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
                  <span className="font-sans font-bold text-slate-700">Total zahlbar (CHF):</span>
                  <span className="font-black text-base text-amber-800">
                    CHF {currentStage.totalAmount.toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Live Banana Buchhaltung v10+ Journal & Impact */}
          <div className="lg:col-span-5 bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-amber-400 font-bold">
                  Banana Buchhaltung · Live-Kontierung
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                  OR 957ff.
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Jede Rechnungs- und Mahnstufe erzeugt automatisch den korrekten Buchungssatz nach Schweizer KMU-Kontenrahmen:
              </p>

              <div className="space-y-2.5">
                {currentStage.bananaBooking.map((row, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-1"
                  >
                    <div className="flex items-center justify-between text-slate-400">
                      <span>
                        Soll <strong className="text-emerald-400">{row.soll}</strong> / Haben{' '}
                        <strong className="text-amber-300">{row.haben}</strong>
                      </span>
                      <span className="text-white font-bold">{row.amount}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 font-sans">{row.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Durchschnittlicher Zahlungseingang:</span>
                <span className="text-emerald-400 font-bold">11 Tage schneller</span>
              </div>
              <button
                type="button"
                onClick={onStartTrial}
                className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                QR-Rechnung & Mahnwesen 14 Tage kostenlos testen →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Zefix Handelsregister Live-Lookup Sandbox */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full">
              <IconSearch className="w-3.5 h-3.5 text-emerald-700" />
              <span>Zefix API Echtzeit-Test</span>
            </span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              Schweizer Firmenstammdaten mit 1 Klick aus dem Handelsregister ziehen.
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Keine Tippfehler mehr bei Firmennamen oder Rechnungsadressen: Wählen Sie unten einen Beispiel-Betrieb und sehen Sie, wie Kinetic Craft die offiziellen Zefix- & UID-Registerdaten übernimmt.
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              {zefixCompanies.map((comp, idx) => (
                <button
                  key={comp.uid}
                  type="button"
                  onClick={() => setSelectedZefixIdx(idx)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    selectedZefixIdx === idx
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {comp.name.split(' ')[0]} ({comp.sitz.split(' ')[1]})
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 bg-slate-50 rounded-2xl p-5 sm:p-6 border border-slate-200 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-slate-500 font-sans font-bold">Zefix Bundesamt für Justiz · Live-Import</span>
              <span className="bg-emerald-100 text-emerald-900 font-bold px-2.5 py-0.5 rounded-md border border-emerald-200">
                ✓ Verifiziert (110ms)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase block">Firmenname (HR-Eintrag)</span>
                <span className="font-sans font-bold text-slate-900 text-sm">{currentZefix.name}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase block">UID / MWST-Nummer</span>
                <span className="font-bold text-emerald-700 text-sm">{currentZefix.uid}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase block">Rechnungsadresse</span>
                <span className="font-sans font-semibold text-slate-800">{currentZefix.adresse}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase block">Rechtsform & Status</span>
                <span className="font-sans font-semibold text-slate-800">{currentZefix.rechtsform}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 2. INTERACTIVE SANDBOX FOR /ki-cloud:
 * Live Receipt/Voice Vorher-Nachher Simulator + Interactive Private AI Node Architecture Explorer
 */
export function KiAndPrivateCloudSandbox({ onRequestPrivateNode }) {
  const [selectedScanSample, setSelectedScanSample] = useState('hornbach')
  const [activeArchNode, setActiveArchNode] = useState('node_rag')
  const [showDockerSpec, setShowDockerSpec] = useState(false)

  const scanSamples = {
    hornbach: {
      label: '1. Quittung Hornbach Biel',
      badge: 'Gemini Vision OCR · 1.1 Sek.',
      rawType: 'Kassenbon (Zerknittertes Foto)',
      rawTitle: 'HORNBACH Baumarkt AG · 2504 Biel/Bienne',
      rawLines: [
        '2x OSB-Verlegeplatte 2050x625x18mm    CHF  69.80',
        '4x Konstruktionsvollholz Fichte/Tanne CHF 114.40',
        '1x Spax Universalschrauben 5x80 200St CHF  38.90',
        '1x Montagekleber SikaBond             CHF  25.55',
        '------------------------------------------------',
        'TOTAL CHF (inkl. 8.1% MWST CHF 18.63) CHF 248.65',
      ],
      extracted: {
        lieferant: 'Hornbach Baumarkt AG, Biel',
        uid: 'CHE-109.382.411 MWST',
        datum: '20.10.2026',
        netto: 'CHF 230.02',
        mwst: 'CHF 18.63 (8.1% Normalsatz)',
        brutto: 'CHF 248.65',
        konto: '4000 Materialaufwand Handwerk',
        projekt: 'Umbau Dachstock · Familie Keller, Bern',
      },
    },
    debrunner: {
      label: '2. Debrunner Acifer Lieferschein',
      badge: 'Gemini Vision OCR · 1.4 Sek.',
      rawType: 'Grosshandels-Rechnung (A4 Foto)',
      rawTitle: 'Debrunner Acifer AG · 3052 Zollikofen',
      rawLines: [
        'Pos 10: HEA-Stahlträger S235JR 4.2m   CHF 890.00',
        'Pos 20: Fischer Schwerlastanker FAZ II CHF 245.00',
        'Pos 30: Baustellen-Anlieferung Kran   CHF 179.35',
        '------------------------------------------------',
        'Nettobetrag                           CHF 1314.35',
        'MWST 8.1%                             CHF  106.45',
        'Rechnungstotal                        CHF 1420.80',
      ],
      extracted: {
        lieferant: 'Debrunner Acifer AG, Zollikofen',
        uid: 'CHE-116.291.004 MWST',
        datum: '20.10.2026',
        netto: "CHF 1'314.35",
        mwst: 'CHF 106.45 (8.1% Normalsatz)',
        brutto: "CHF 1'420.80",
        konto: '4000 Materialaufwand & Fremdleistung',
        projekt: 'Tragwerksverstärkung · MFH Länggasse',
      },
    },
    sprachdiktat: {
      label: '3. Schweizerdeutsches Baustellen-Diktat',
      badge: 'Audio-to-Rapport · 1.8 Sek.',
      rawType: 'Sprachnotiz im Transporter (Mundart)',
      rawTitle: '🎙️ Gesprochene Audio-Aufnahme (00:18 Min.)',
      rawLines: [
        '«Hoi zäme, Regierapport für d Liegenschaft Bahnhofstrasse 14:',
        'Drüehalb Stund Monteur-Arbeit für de Notfall-Ustusch vo de',
        'Heizigspumpi im Chäller, plus eini Grundfos Alpha2 Umwälzpumpi',
        'und zwei Messing-Verschrubige DN25 verbout.»',
      ],
      extracted: {
        lieferant: 'Interner Regierapport (Mundart → Hochdeutsch)',
        uid: 'Positionen nach NPK 412 / SIA 118',
        datum: '20.10.2026 · Signaturbereit',
        netto: '3.5 Std. × CHF 125.– + Material CHF 485.–',
        mwst: 'CHF 74.70 (8.1% Normalsatz)',
        brutto: 'CHF 997.20',
        konto: '3400 Handwerkserlöse (Regieauftrag)',
        projekt: 'Notfalldienst · Bahnhofstrasse 14',
      },
    },
  }

  const archNodes = [
    {
      id: 'node_app',
      step: '01',
      title: 'Baustellen-PWA & Offline-Speicher',
      location: 'Smartphone / Tablet / Büro-Mac',
      badge: 'Optimistic UI & IndexedDB',
      desc: 'Ihre Monteure erfassen Zeiten, Fotos und Sprachnotizen auf der Baustelle – dank lokalem Offline-Puffer selbst im 3. Untergeschoss ohne Mobilfunkempfang.',
      specs: [
        'Verzögerungsfreies Stale-While-Revalidate (SWR) Caching',
        'Automatische Hintergrund-Synchronisation bei Netzrückkehr',
        'TLS 1.3 Ende-zu-Ende-Verschlüsselung ab Gerät',
      ],
    },
    {
      id: 'node_gateway',
      step: '02',
      title: 'Caddy Zero-Trust TLS Gateway',
      location: 'Schweizer Rechenzentrum (Zürich / Genf)',
      badge: '100% CH-Jurisdiktion',
      desc: 'Jeder Betrieb mit «Private AI Node» erhält einen eigenen, kryptografisch isolierten Endpunkt bei Infomaniak (Genf/Winterthur) oder Exoscale (Zürich).',
      specs: [
        'Kein US CLOUD Act · 100% Schweizer Standortgarantie',
        'Strikte API-Key-Authentifizierung & Rate-Limiting pro Mandant',
        'Null Hardware im staubigen Handwerksbetrieb nötig',
      ],
    },
    {
      id: 'node_n8n',
      step: '03',
      title: 'n8n AI-Orchestrator & PII-Shield',
      location: 'Dedizierter Docker-Container pro Betrieb',
      badge: 'PII-Anonymisierung',
      desc: 'Der Automations-Layer prüft eingehende Belege und Sprachmemos, anonymisiert auf Wunsch Personendaten und routet Anfragen an das isolierte Firmen-LLM.',
      specs: [
        'Vorab-Anonymisierung von Kundennamen bei komplexem Multimodal-OCR',
        'Automatische Validierung von Schweizer MWST-Sätzen (8.1% / 2.6%)',
        'Revisionssicheres Audit-Log nach Schweizer revDSG',
      ],
    },
    {
      id: 'node_rag',
      step: '04',
      title: 'Ollama Firmen-LLM + pgvector RAG',
      location: 'Isolierter KI-Kern & Vektordatenbank',
      badge: 'Kein fremdes Training',
      desc: 'Das Herzstück Ihres Private AI Nodes: Lernt ausschliesslich aus Ihren eigenen bisherigen Offerten, NPK-/CRB-Positionen und internen Stundensätzen.',
      specs: [
        'PostgreSQL 16 + pgvector für firmeneigene Offerten-Historie',
        'Lokale Sprachmodelle (Llama 3.3 / Mistral) ohne Datenabfluss',
        'Garantiert kein Training öffentlicher KI-Modelle mit Ihren Margen',
      ],
    },
  ]

  const activeScan = scanSamples[selectedScanSample]
  const currentArch = archNodes.find((n) => n.id === activeArchNode) || archNodes[3]

  return (
    <div className="space-y-16">
      {/* PART A: Vorher-Nachher Belegscan & Sprachdiktat Simulator */}
      <div className="bg-slate-900/95 rounded-3xl border border-slate-800 p-6 sm:p-8 lg:p-10 shadow-2xl text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 border border-amber-400/30 px-3 py-1 rounded-full mb-2">
              <IconSparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Interaktiver KI-Simulator · Vorher / Nachher</span>
            </span>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
              Beleg-Scan & Mundart-Diktat live testen
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Wählen Sie ein Praxis-Beispiel: Links sehen Sie den Roh-Input von der Baustelle, rechts die geprüfte Schweizer Buchungs-Extraktion.
            </p>
          </div>
          <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold self-start md:self-center">
            {activeScan.badge}
          </span>
        </div>

        {/* Sample Switcher */}
        <div className="flex flex-wrap gap-2.5 my-6">
          {Object.entries(scanSamples).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedScanSample(key)}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                selectedScanSample === key
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Vorher / Nachher Split-Card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Left: VORHER (Raw Receipt / Voice Input) */}
          <div className="bg-slate-950 rounded-2xl p-5 sm:p-6 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                  VORHER · {activeScan.rawType}
                </span>
                {selectedScanSample === 'sprachdiktat' ? (
                  <IconMic className="w-5 h-5 text-amber-400" />
                ) : (
                  <IconCamera className="w-5 h-5 text-amber-400" />
                )}
              </div>

              <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800/90 font-mono text-xs space-y-2 text-slate-300">
                <div className="text-amber-300 font-bold pb-2 border-b border-slate-800">
                  {activeScan.rawTitle}
                </div>
                {activeScan.rawLines.map((line, i) => (
                  <div key={i} className="leading-relaxed break-words">
                    {line}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Status: Originalbeleg revisionssicher archiviert (10 Jahre OR)</span>
              <span className="text-emerald-400 font-semibold">✓ Geprüft</span>
            </div>
          </div>

          {/* Right: NACHHER (Extracted Structured Data & MWST Verification) */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 rounded-2xl p-5 sm:p-6 border border-emerald-500/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded border border-emerald-500/30">
                  NACHHER · KI-Extraktion & Kontierung
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold">100% Konfidenz</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">Lieferant / Quelle</span>
                  <span className="font-bold text-white">{activeScan.extracted.lieferant}</span>
                </div>
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">UID / Norm-Referenz</span>
                  <span className="font-mono font-bold text-amber-300">{activeScan.extracted.uid}</span>
                </div>
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">Schweizer MWST-Split</span>
                  <span className="font-mono font-bold text-emerald-400">{activeScan.extracted.mwst}</span>
                </div>
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase block">Totalbetrag (Brutto)</span>
                  <span className="font-mono font-black text-white text-sm">{activeScan.extracted.brutto}</span>
                </div>
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 sm:col-span-2">
                  <span className="text-[10px] text-slate-400 uppercase block">Automatische Kontierung & Baustelle</span>
                  <span className="font-semibold text-slate-200 block">{activeScan.extracted.konto}</span>
                  <span className="text-amber-300 text-[11px]">→ Projekt: {activeScan.extracted.projekt}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-300">Meister-Kontrolle vor dem Buchen aktiv</span>
              <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                ✓ Bereit für Banana-Export
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PART B: Interactive «Kinetic Private AI Node» Architecture Explorer */}
      <div className="bg-slate-950 rounded-3xl border border-emerald-500/30 p-6 sm:p-8 lg:p-10 shadow-2xl text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full mb-2">
              <IconShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kinetic Private AI Node · Schweizer Architektur-Blueprint</span>
            </span>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
              Ihre isolierte Schweizer Firmen-KI (Infomaniak / Exoscale)
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Klicken Sie auf die 4 Sicherheits-Schichten unseres Private-Cloud-Stacks oder prüfen Sie die echte Docker-Konfiguration.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowDockerSpec(!showDockerSpec)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-amber-300 cursor-pointer self-start lg:self-center shrink-0"
          >
            {showDockerSpec ? '← Zurück zum Architektur-Diagramm' : '{ } Docker-Stack & RAG-Spec ansehen'}
          </button>
        </div>

        {showDockerSpec ? (
          <div className="my-6 bg-slate-900 rounded-2xl p-5 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto space-y-2">
            <div className="text-emerald-400 font-bold">
              # deploy/swiss-private-node/docker-compose.yml (Isolierte Kunden-Instanz Zürich / Genf)
            </div>
            <pre className="text-[11px] leading-relaxed text-slate-300">
{`services:
  caddy-gateway:
    image: caddy:2.8-alpine           # Zero-Trust TLS 1.3 & API-Key Isolation (CH-IP)
  ollama-llm:
    image: ollama/ollama:latest       # Lokales Schweizer/Deutsches Firmen-LLM (Llama 3.3 / Mistral)
  rag-pgvector:
    image: pgvector/pgvector:pg16     # Isoliertes Firmenwissen (Offerten, NPK-Kataloge, Stundensätze)
  n8n-orchestrator:
    image: docker.n8n.io/n8nio/n8n    # PII-Anonymisierung & CRM-Webhook-Pipeline`}
            </pre>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-6">
            {archNodes.map((node) => {
              const isSelected = node.id === activeArchNode
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setActiveArchNode(node.id)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-950/50 border-emerald-400 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400/40'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono text-emerald-400 mb-2">
                      <span>LAYER {node.step}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                        {node.badge}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-white mb-1">{node.title}</div>
                    <div className="text-[11px] text-slate-400">{node.location}</div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] font-semibold text-emerald-300 flex items-center justify-between">
                    <span>Details prüfen</span>
                    <span>→</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Active Layer Detail Box */}
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-2">
            <div className="text-xs font-mono text-emerald-400 uppercase">
              Aktive Schicht: Layer {currentArch.step} · {currentArch.location}
            </div>
            <h4 className="text-xl font-black text-white">{currentArch.title}</h4>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{currentArch.desc}</p>
          </div>
          <div className="lg:col-span-5 space-y-2.5 bg-slate-950 p-4 rounded-xl border border-slate-800">
            {currentArch.specs.map((sp, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-200">
                <IconCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{sp}</span>
              </div>
            ))}
            {onRequestPrivateNode && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onRequestPrivateNode}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  🇨🇭 Private AI Node für meinen Betrieb anfragen →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 3. INTERACTIVE SANDBOX FOR /gewerke:
 * NPK / CRB & SIA 118 Calculation Simulator per Swiss Trade
 */
export function NpkAndSiaGewerkSandbox({ selectedGewerk, onSelectGewerkForQuote }) {
  const activeTradeKey = selectedGewerk && selectedGewerk !== 'alle' ? selectedGewerk : 'schreinerei'
  const [tradeKey, setTradeKey] = useState(activeTradeKey)
  const [quantity, setQuantity] = useState(35)
  const [regieHours, setRegieHours] = useState(4)

  const tradeTemplates = {
    schreinerei: {
      name: 'Schreinerei & Innenausbau',
      npkCode: 'NPK 622 / SIA 118',
      unitLabel: 'm² Front- & Korpusfläche',
      unitShort: 'm²',
      unitPrice: 380,
      hourlyRate: 115,
      positionTitle: 'Einbauschrank & Garderobe nach Mass (Eiche furniert, gedämpft)',
      materialDesc: 'Inkl. Blum Aventos/Tandembox Beschläge, Kanten ABS 2mm & Werkstattfertigung',
    },
    maler: {
      name: 'Maler & Gipser',
      npkCode: 'NPK 642 & 671 / SIA 118',
      unitLabel: 'm² Wand- & Deckenfläche',
      unitShort: 'm²',
      unitPrice: 42,
      hourlyRate: 98,
      positionTitle: 'Abdeckarbeiten, Grundierung & 2x Deckanstrich Organosilikat (NCS S 0502-Y)',
      materialDesc: 'Inkl. Abdeckvlies, Malerkrepp, Gerüst-Anteil & umweltfreundliche Schweizer Werkstoffe',
    },
    elektro: {
      name: 'Elektro & Gebäudeautomation',
      npkCode: 'NPK 511 / NIN 2025',
      unitLabel: 'Installationspunkte / Anschlüsse',
      unitShort: 'Pkt.',
      unitPrice: 165,
      hourlyRate: 125,
      positionTitle: 'Stark-/Schwachstrom-Installation, KNX-Aktorik & SiNa-Prüfprotokoll',
      materialDesc: 'Inkl. Feller EDIZIOdue Schalterprogramm, Halogenfreie Rohre & Messprotokoll',
    },
    sanitaer: {
      name: 'Sanitär & Heizung',
      npkCode: 'NPK 412 & 421 / SIA 118',
      unitLabel: 'Sanitär-Apparate / Leitungsmeter',
      unitShort: 'Einh.',
      unitPrice: 410,
      hourlyRate: 128,
      positionTitle: 'Geberit GIS Vorwandinstallation, Rohrleitungen Mepla & Apparatemontage',
      materialDesc: 'Inkl. Schalldämmset nach SIA 181, Dichtheitsprüfung & Druckprotokoll',
    },
    gartenbau: {
      name: 'Garten- & Landschaftsbau',
      npkCode: 'NPK 181 & 211 / CRB',
      unitLabel: 'm² Naturstein- & Umgebungsfläche',
      unitShort: 'm²',
      unitPrice: 195,
      hourlyRate: 105,
      positionTitle: 'Kofferung, Splittbett & Schweizer Granitplatten (Tessiner Gneis) verlegen',
      materialDesc: 'Inkl. Baggerstunden (3.5t), Frostschutzschicht & Fugenverguss wasserdurchlässig',
    },
    bau: {
      name: 'Bauunternehmung & Renovation',
      npkCode: 'NPK 211 & 112 / SIA 118',
      unitLabel: 'm² Mauerwerk / Rückbau / Schalung',
      unitShort: 'm²',
      unitPrice: 240,
      hourlyRate: 112,
      positionTitle: 'Baustelleneinrichtung, Tragwand-Durchbruch, Stahlträger-Auflager & Verputz',
      materialDesc: 'Inkl. Staubwand, Muldenentsorgung, Spriessung & SIA-konforme Bauabnahme',
    },
  }

  const currentTrade = tradeTemplates[tradeKey] || tradeTemplates.schreinerei
  const posSubtotal = quantity * currentTrade.unitPrice
  const regieSubtotal = regieHours * currentTrade.hourlyRate
  const netTotal = posSubtotal + regieSubtotal
  const mwstAmount = Math.round(netTotal * 0.081 * 20) / 20
  const grossTotal = netTotal + mwstAmount

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 lg:p-10 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-200 px-3 py-1 rounded-full mb-2">
            <IconDocument className="w-3.5 h-3.5 text-amber-700" />
            <span>NPK- / CRB- & SIA-118-Kalkulator</span>
          </span>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Interaktive Branchen-Kalkulation nach Schweizer Norm
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Wählen Sie Ihr Gewerk und testen Sie, wie schnell Kinetic Craft NPK-Positionen, Regiestunden und 8.1% MWST kalkuliert.
          </p>
        </div>

        <span className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-amber-300 font-mono text-xs font-bold self-start lg:self-center">
          {currentTrade.npkCode}
        </span>
      </div>

      {/* Trade Selector Pills */}
      <div className="flex flex-wrap gap-2 my-6">
        {Object.entries(tradeTemplates).map(([key, t]) => {
          const isSelected = tradeKey === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTradeKey(key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                isSelected
                  ? 'bg-amber-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <TradeIcon tradeId={key} className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-200' : 'text-slate-700'}`} />
              <span>{t.name.split(' & ')[0]}</span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Controls & NPK Position Info */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-amber-900">
              <span>Norm-Position ({currentTrade.npkCode})</span>
              <span>CHF {currentTrade.unitPrice}.– / {currentTrade.unitShort}</span>
            </div>
            <div className="font-bold text-slate-900 text-sm sm:text-base">
              {currentTrade.positionTitle}
            </div>
            <div className="text-xs text-slate-600">{currentTrade.materialDesc}</div>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs sm:text-sm font-bold text-slate-700">
                  Menge / Ausmass ({currentTrade.unitLabel}):
                </label>
                <span className="font-mono font-bold text-amber-700 text-base">
                  {quantity} {currentTrade.unitShort}
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                aria-label="Menge oder Ausmass"
                className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-700"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs sm:text-sm font-bold text-slate-700">
                  Zusätzliche Regiestunden (à CHF {currentTrade.hourlyRate}.–/Std.):
                </label>
                <span className="font-mono font-bold text-amber-700 text-base">
                  {regieHours} Std.
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={regieHours}
                onChange={(e) => setRegieHours(parseInt(e.target.value, 10))}
                aria-label="Zusätzliche Regiestunden"
                className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-700"
              />
            </div>
          </div>
        </div>

        {/* Right: Live Offer Calculation Box */}
        <div className="lg:col-span-5 bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-mono text-amber-400">Live-Offertenkalkulation</span>
            <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
              A4 & QR-bereit
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-300">
              <span>Hauptposition ({quantity} {currentTrade.unitShort}):</span>
              <span className="font-bold text-white">CHF {posSubtotal.toLocaleString('de-CH')}.00</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Regierapport ({regieHours} Std.):</span>
              <span className="font-bold text-white">CHF {regieSubtotal.toLocaleString('de-CH')}.00</span>
            </div>
            <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800">
              <span>Zwischentotal (exkl. MWST):</span>
              <span>CHF {netTotal.toLocaleString('de-CH')}.00</span>
            </div>
            <div className="flex justify-between text-amber-300">
              <span>+ 8.1% Schweizer MWST:</span>
              <span>CHF {mwstAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-black text-emerald-400 pt-2 border-t border-slate-800">
              <span>Offertentotal inkl. MWST:</span>
              <span>CHF {grossTotal.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {onSelectGewerkForQuote && (
            <button
              type="button"
              onClick={() => onSelectGewerkForQuote(currentTrade.name)}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-md"
            >
              Vorlagen für {currentTrade.name.split(' & ')[0]} anfragen / testen →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
