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
 * Apple Pro Titanium (Dark Liquid Glass) Edition
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
      statusColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25',
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
      statusColor: 'bg-[#D6BA94]/15 text-[#E8D3B5] border-[#D6BA94]/30',
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
      statusColor: 'bg-amber-500/15 text-amber-200 border-amber-400/30',
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
      statusColor: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
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
      <div className="apple-glass-stage rounded-[32px] p-6 sm:p-9 lg:p-11 text-[#F5F5F7]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-7 border-b border-white/10">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-medium text-[#E8D3B5] bg-[#D6BA94]/12 border border-[#D6BA94]/25 px-3.5 py-1 rounded-full mb-3">
              <IconQrBill className="w-3.5 h-3.5 text-[#D6BA94]" />
              <span>Interaktive Live-Sandbox · Liquiditäts-Schutz</span>
            </span>
            <h3 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-white">
              Vom Erstversand bis zur 2. Mahnung: 100% automatisiert.
            </h3>
            <p className="text-xs sm:text-sm text-[#A1A1A6] mt-1.5 leading-relaxed">
              Klicken Sie auf eine Eskalationsstufe – der Schweizer QR-Zahlteil (ISO 20022) und die Banana-Buchungszeilen passen sich sofort live an.
            </p>
          </div>
          <div className={`px-4 py-2 rounded-full border text-xs font-medium shrink-0 self-start lg:self-center ${currentStage.statusColor}`}>
            {currentStage.statusLabel}
          </div>
        </div>

        {/* 4 Stage Selector Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-7">
          {stages.map((st) => {
            const isSelected = st.id === activeStage
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setActiveStage(st.id)}
                className={`p-4 rounded-[22px] border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-br from-[#D6BA94]/20 via-white/[0.06] to-transparent border-[#D6BA94]/60 shadow-lg shadow-black/40'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/20 text-[#A1A1A6]'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-medium text-[#D6BA94] mb-1">
                  <span>{st.badge}</span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-[#D6BA94]" />}
                </div>
                <div className="font-semibold text-sm text-white tracking-[-0.01em]">{st.title}</div>
                <div className="text-xs text-[#A1A1A6] mt-0.5">{st.subtitle}</div>
              </button>
            )
          })}
        </div>

        {/* Split Preview: Left = Swiss A4 QR-Bill Simulation, Right = Live Banana Journal & Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Simulated A4 Document with Swiss QR-Bill */}
          <div className="lg:col-span-7 bg-[#F5F5F7] text-[#1D1D1F] rounded-[24px] p-6 sm:p-7 border border-white/40 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-2 pb-4 border-b border-black/10">
                <div>
                  <span className="text-xs font-medium text-[#6E6E73] block">
                    A4 Echtzeit-Vorschau · ISO 20022
                  </span>
                  <h4 className="text-base sm:text-lg font-semibold tracking-[-0.02em] text-[#1D1D1F] mt-0.5">
                    {currentStage.docTitle}
                  </h4>
                </div>
                <div className="text-right text-xs">
                  <span className="font-semibold text-[#1D1D1F] block">Keller Holzbau AG</span>
                  <span className="text-[#6E6E73]">CHE-114.258.391 MWST</span>
                </div>
              </div>

              <p className="text-xs text-[#424245] my-4 leading-relaxed bg-white p-3.5 rounded-2xl border border-black/5 shadow-xs">
                {currentStage.docNote}
              </p>

              {/* Line Items Summary */}
              <div className="space-y-2 text-xs tabular-nums border-b border-black/10 pb-3.5">
                <div className="flex justify-between text-[#424245]">
                  <span>Ursprungsrechnung RE-2026-0842 (inkl. 8.1% MWST)</span>
                  <span className="font-semibold text-[#1D1D1F]">CHF {currentStage.baseAmount.toFixed(2)}</span>
                </div>
                {currentStage.interestAmount > 0 && (
                  <div className="flex justify-between text-[#785b35] font-medium">
                    <span>+ 5.0% Verzugszins nach Schweizer OR Art. 104</span>
                    <span>CHF {currentStage.interestAmount.toFixed(2)}</span>
                  </div>
                )}
                {currentStage.feeAmount > 0 && (
                  <div className="flex justify-between text-rose-700 font-medium">
                    <span>+ Mahn- & Umtriebsentschädigung</span>
                    <span>CHF {currentStage.feeAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Simulated Official Swiss QR-Bill Payment Part */}
            <div className="mt-4 pt-4 border-t border-dashed border-black/20 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-4 flex flex-col items-center justify-center bg-white p-3 rounded-2xl border border-black/5 shadow-xs">
                <div className="w-20 h-20 bg-[#1D1D1F] rounded-xl flex items-center justify-center relative">
                  <div className="grid grid-cols-5 gap-0.5 p-2 w-full h-full opacity-90">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-[1px] ${i % 2 === 0 || i % 7 === 0 ? 'bg-white' : 'bg-[#1D1D1F]'}`}
                      />
                    ))}
                  </div>
                  <div className="absolute w-5 h-5 bg-black border border-white flex items-center justify-center">
                    <div className="w-3 h-1 bg-white absolute" />
                    <div className="w-1 h-3 bg-white absolute" />
                  </div>
                </div>
                <span className="text-xs text-[#6E6E73] mt-1.5">Swiss QR Code · ISO 20022</span>
              </div>

              <div className="sm:col-span-8 space-y-1.5 text-xs tabular-nums">
                <div className="flex justify-between">
                  <span className="text-[#6E6E73]">QR-IBAN:</span>
                  <span className="text-[#1D1D1F] font-semibold">CH44 3199 9123 0008 8901 2</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E73]">Referenz:</span>
                  <span className="text-[#1D1D1F] font-semibold">21 00000 00003 13947 14300 09017</span>
                </div>
                <div className="flex justify-between pt-2.5 border-t border-black/10 text-sm">
                  <span className="font-semibold text-[#424245]">Total zahlbar (CHF):</span>
                  <span className="font-semibold text-base text-[#1D1D1F]">
                    CHF {currentStage.totalAmount.toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Live Banana Buchhaltung v10+ Journal & Impact */}
          <div className="lg:col-span-5 apple-glass-card rounded-[24px] p-6 sm:p-7 flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[#D6BA94] font-medium">
                  Banana Buchhaltung · Live-Kontierung
                </span>
                <span className="text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-400/25 px-2.5 py-0.5 rounded-full font-medium">
                  OR 957ff.
                </span>
              </div>
              <p className="text-xs text-[#A1A1A6] mb-4 leading-relaxed">
                Jede Rechnungs- und Mahnstufe erzeugt automatisch den korrekten Buchungssatz nach Schweizer KMU-Kontenrahmen:
              </p>

              <div className="space-y-3">
                {currentStage.bananaBooking.map((row, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs tabular-nums space-y-1"
                  >
                    <div className="flex items-center justify-between text-[#A1A1A6]">
                      <span>
                        Soll <strong className="text-emerald-300">{row.soll}</strong> / Haben{' '}
                        <strong className="text-[#E8D3B5]">{row.haben}</strong>
                      </span>
                      <span className="text-white font-semibold">{row.amount}</span>
                    </div>
                    <div className="text-xs text-[#F5F5F7]/85">{row.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A1A1A6]">Durchschnittlicher Zahlungseingang:</span>
                <span className="text-emerald-300 font-semibold">11 Tage schneller</span>
              </div>
              <button
                type="button"
                onClick={onStartTrial}
                className="w-full py-3 rounded-full apple-starlight-btn font-semibold text-xs sm:text-sm cursor-pointer"
              >
                QR-Rechnung & Mahnwesen 14 Tage kostenlos testen →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Zefix Handelsregister Live-Lookup Sandbox */}
      <div className="apple-glass-card rounded-[32px] p-6 sm:p-9 text-[#F5F5F7]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-3.5">
            <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-300 bg-emerald-500/12 border border-emerald-400/25 px-3.5 py-1 rounded-full">
              <IconSearch className="w-3.5 h-3.5 text-emerald-300" />
              <span>Zefix API Echtzeit-Test</span>
            </span>
            <h3 className="text-2xl font-semibold text-white tracking-[-0.03em]">
              Schweizer Firmenstammdaten mit 1 Klick aus dem Handelsregister ziehen.
            </h3>
            <p className="text-xs sm:text-sm text-[#A1A1A6] leading-relaxed">
              Keine Tippfehler mehr bei Firmennamen oder Rechnungsadressen: Wählen Sie unten einen Beispiel-Betrieb und sehen Sie, wie Kinetic Craft die offiziellen Zefix- & UID-Registerdaten übernimmt.
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              {zefixCompanies.map((comp, idx) => (
                <button
                  key={comp.uid}
                  type="button"
                  onClick={() => setSelectedZefixIdx(idx)}
                  className={`px-4 py-2 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                    selectedZefixIdx === idx
                      ? 'bg-[#F5F5F7] text-[#0B0B0E] border-white shadow-sm'
                      : 'bg-white/[0.04] text-[#A1A1A6] border-white/10 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  {comp.name.split(' ')[0]} ({comp.sitz.split(' ')[1]})
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 bg-white/[0.04] rounded-[24px] p-6 border border-white/10 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-[#A1A1A6] font-medium">Zefix Bundesamt für Justiz · Live-Import</span>
              <span className="bg-emerald-500/15 text-emerald-300 font-medium px-3 py-0.5 rounded-full border border-emerald-400/25">
                ✓ Verifiziert (110ms)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-white/[0.04] p-3.5 rounded-2xl border border-white/10">
                <span className="text-xs text-[#A1A1A6] block mb-0.5">Firmenname (HR-Eintrag)</span>
                <span className="font-semibold text-white text-sm">{currentZefix.name}</span>
              </div>
              <div className="bg-white/[0.04] p-3.5 rounded-2xl border border-white/10">
                <span className="text-xs text-[#A1A1A6] block mb-0.5">UID / MWST-Nummer</span>
                <span className="font-semibold text-[#E8D3B5] text-sm tabular-nums">{currentZefix.uid}</span>
              </div>
              <div className="bg-white/[0.04] p-3.5 rounded-2xl border border-white/10">
                <span className="text-xs text-[#A1A1A6] block mb-0.5">Rechnungsadresse</span>
                <span className="font-medium text-[#F5F5F7]">{currentZefix.adresse}</span>
              </div>
              <div className="bg-white/[0.04] p-3.5 rounded-2xl border border-white/10">
                <span className="text-xs text-[#A1A1A6] block mb-0.5">Rechtsform & Status</span>
                <span className="font-medium text-[#F5F5F7]">{currentZefix.rechtsform}</span>
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
 * Apple Pro Titanium (Dark Liquid Glass) Edition
 */
export function KiAndPrivateCloudSandbox({ onRequestPrivateNode }) {
  const [selectedScanSample, setSelectedScanSample] = useState('hornbach')
  const [activeArchNode, setActiveArchNode] = useState('node_rag')
  const [showDockerSpec, setShowDockerSpec] = useState(false)

  const scanSamples = {
    hornbach: {
      label: '1. Quittung Hornbach Biel',
      badge: 'Kinetic Private AI · 1.1 Sek.',
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
      badge: 'Kinetic Private AI · 1.4 Sek.',
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
      rawTitle: 'Gesprochene Audio-Aufnahme (00:18 Min.)',
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
      location: 'Schweizer Cloud (Zürich/Genf) oder Vor Ort',
      badge: '100% CH-Jurisdiktion',
      desc: 'Jeder Betrieb mit «Private AI Node» erhält eine isolierte Instanz – wahlweise gehostet in Schweizer Rechenzentren (Infomaniak / Exoscale) ODER auf Wunsch als eigene geschützte Firmen-Box direkt vor Ort im Betrieb.',
      specs: [
        'Wahlfreiheit: 100% Schweizer Cloud oder On-Premise im Betrieb',
        'Kein US CLOUD Act · Keine US-APIs · Keine Drittanbieter',
        'Strikte API-Key-Authentifizierung & Rate-Limiting pro Mandant',
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
    <div className="space-y-14">
      {/* PART A: Vorher-Nachher Belegscan & Sprachdiktat Simulator */}
      <div className="apple-glass-stage rounded-[32px] p-6 sm:p-9 lg:p-11 text-[#F5F5F7]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-medium text-[#E8D3B5] bg-[#D6BA94]/12 border border-[#D6BA94]/25 px-3.5 py-1 rounded-full mb-3">
              <IconSparkles className="w-3.5 h-3.5 text-[#D6BA94]" />
              <span>Interaktiver KI-Simulator · Vorher / Nachher</span>
            </span>
            <h3 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-white">
              Beleg-Scan & Mundart-Diktat live testen
            </h3>
            <p className="text-xs sm:text-sm text-[#A1A1A6] mt-1.5">
              Wählen Sie ein Praxis-Beispiel: Links sehen Sie den Roh-Input von der Baustelle, rechts die geprüfte Schweizer Buchungs-Extraktion.
            </p>
          </div>
          <span className="px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/25 text-emerald-300 text-xs font-medium self-start md:self-center">
            {activeScan.badge}
          </span>
        </div>

        {/* Sample Switcher */}
        <div className="flex flex-wrap gap-2.5 my-7">
          {Object.entries(scanSamples).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedScanSample(key)}
              className={`px-4 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                selectedScanSample === key
                  ? 'apple-starlight-btn font-semibold'
                  : 'bg-white/[0.04] text-[#A1A1A6] border border-white/10 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Vorher / Nachher Split-Card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Left: VORHER (Raw Receipt / Voice Input) */}
          <div className="apple-glass-card rounded-[24px] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-[#A1A1A6] bg-white/[0.05] px-3 py-1 rounded-full border border-white/10">
                  VORHER · {activeScan.rawType}
                </span>
                {selectedScanSample === 'sprachdiktat' ? (
                  <IconMic className="w-5 h-5 text-[#D6BA94]" />
                ) : (
                  <IconCamera className="w-5 h-5 text-[#D6BA94]" />
                )}
              </div>

              <div className="bg-black/40 rounded-2xl p-4 border border-white/10 font-mono text-xs space-y-2 text-[#F5F5F7]/85">
                <div className="text-[#E8D3B5] font-semibold pb-2 border-b border-white/10">
                  {activeScan.rawTitle}
                </div>
                {activeScan.rawLines.map((line, i) => (
                  <div key={i} className="leading-relaxed break-words">
                    {line}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between text-xs text-[#A1A1A6]">
              <span>Status: Originalbeleg revisionssicher archiviert (10 Jahre OR)</span>
              <span className="text-emerald-300 font-medium">✓ Geprüft</span>
            </div>
          </div>

          {/* Right: NACHHER (Extracted Structured Data & MWST Verification) */}
          <div className="apple-glass-card rounded-[24px] p-6 border-[#D6BA94]/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-[#E8D3B5] bg-[#D6BA94]/15 px-3 py-1 rounded-full border border-[#D6BA94]/30">
                  NACHHER · KI-Extraktion & Kontierung
                </span>
                <span className="text-xs text-emerald-300 font-medium">100% Konfidenz</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white/[0.04] p-3.5 rounded-2xl border border-white/10">
                  <span className="text-xs text-[#A1A1A6] block mb-0.5">Lieferant / Quelle</span>
                  <span className="font-semibold text-white">{activeScan.extracted.lieferant}</span>
                </div>
                <div className="bg-white/[0.04] p-3.5 rounded-2xl border border-white/10">
                  <span className="text-xs text-[#A1A1A6] block mb-0.5">UID / Norm-Referenz</span>
                  <span className="font-semibold text-[#E8D3B5] tabular-nums">{activeScan.extracted.uid}</span>
                </div>
                <div className="bg-white/[0.04] p-3.5 rounded-2xl border border-white/10">
                  <span className="text-xs text-[#A1A1A6] block mb-0.5">Schweizer MWST-Split</span>
                  <span className="font-semibold text-emerald-300 tabular-nums">{activeScan.extracted.mwst}</span>
                </div>
                <div className="bg-white/[0.04] p-3.5 rounded-2xl border border-white/10">
                  <span className="text-xs text-[#A1A1A6] block mb-0.5">Totalbetrag (Brutto)</span>
                  <span className="font-semibold text-white text-sm tabular-nums">{activeScan.extracted.brutto}</span>
                </div>
                <div className="bg-white/[0.04] p-3.5 rounded-2xl border border-white/10 sm:col-span-2">
                  <span className="text-xs text-[#A1A1A6] block mb-0.5">Automatische Kontierung & Baustelle</span>
                  <span className="font-medium text-white block">{activeScan.extracted.konto}</span>
                  <span className="text-[#E8D3B5] text-xs">→ Projekt: {activeScan.extracted.projekt}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-[#A1A1A6]">Meister-Kontrolle vor dem Buchen aktiv</span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-medium border border-emerald-400/25">
                ✓ Bereit für Banana-Export
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PART B: Interactive «Kinetic Private AI Node» Architecture Explorer */}
      <div className="apple-glass-stage rounded-[32px] p-6 sm:p-9 lg:p-11 text-[#F5F5F7]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-medium text-[#E8D3B5] bg-[#D6BA94]/12 border border-[#D6BA94]/25 px-3.5 py-1 rounded-full mb-3">
              <IconShieldCheck className="w-3.5 h-3.5 text-[#D6BA94]" />
              <span>Kinetic Enterprise Cloud · Schweizer Architektur-Blueprint</span>
            </span>
            <h3 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-white">
              Ihre isolierte Schweizer Firmen-KI (Infomaniak / Exoscale)
            </h3>
            <p className="text-xs sm:text-sm text-[#A1A1A6] mt-1.5">
              Klicken Sie auf die 4 Sicherheits-Schichten unseres Private-Cloud-Stacks oder prüfen Sie die echte Docker-Konfiguration.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowDockerSpec(!showDockerSpec)}
            className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-medium text-[#E8D3B5] cursor-pointer self-start lg:self-center shrink-0 transition-colors"
          >
            {showDockerSpec ? '← Zurück zum Architektur-Diagramm' : '{ } Docker-Stack & RAG-Spec ansehen'}
          </button>
        </div>

        {showDockerSpec ? (
          <div className="my-6 bg-black/50 rounded-[24px] p-6 border border-white/10 font-mono text-xs text-[#F5F5F7] overflow-x-auto space-y-2">
            <div className="text-[#E8D3B5] font-semibold">
              # deploy/swiss-private-node/docker-compose.yml (Isolierte Kunden-Instanz Zürich / Genf)
            </div>
            <pre className="text-xs leading-relaxed text-[#A1A1A6]">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 my-7">
            {archNodes.map((node) => {
              const isSelected = node.id === activeArchNode
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setActiveArchNode(node.id)}
                  className={`p-4 rounded-[22px] border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-br from-[#D6BA94]/20 via-white/[0.06] to-transparent border-[#D6BA94]/60 shadow-lg'
                      : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#D6BA94] mb-2">
                      <span className="font-medium">LAYER {node.step}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[#F5F5F7]">
                        {node.badge}
                      </span>
                    </div>
                    <div className="font-semibold text-sm text-white mb-1">{node.title}</div>
                    <div className="text-xs text-[#A1A1A6]">{node.location}</div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-white/10 text-xs font-medium text-[#E8D3B5] flex items-center justify-between">
                    <span>Details prüfen</span>
                    <span>→</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Active Layer Detail Box */}
        <div className="apple-glass-card rounded-[24px] p-6 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-2.5">
            <div className="text-xs font-medium text-[#D6BA94]">
              Aktive Schicht: Layer {currentArch.step} · {currentArch.location}
            </div>
            <h4 className="text-xl font-semibold tracking-[-0.02em] text-white">{currentArch.title}</h4>
            <p className="text-xs sm:text-sm text-[#A1A1A6] leading-relaxed">{currentArch.desc}</p>
          </div>
          <div className="lg:col-span-5 space-y-3 bg-white/[0.04] p-5 rounded-2xl border border-white/10">
            {currentArch.specs.map((sp, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-[#F5F5F7]">
                <IconCheck className="w-4 h-4 text-[#D6BA94] shrink-0 mt-0.5" />
                <span>{sp}</span>
              </div>
            ))}
            {onRequestPrivateNode && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onRequestPrivateNode}
                  className="w-full py-3 rounded-full apple-titanium-btn font-semibold text-xs cursor-pointer"
                >
                  Enterprise Cloud KI für meinen Betrieb anfragen →
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
 * Apple Pro Titanium (Dark Liquid Glass) Edition
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
    <div className="apple-glass-stage rounded-[32px] p-6 sm:p-9 lg:p-11 text-[#F5F5F7]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-medium text-[#E8D3B5] bg-[#D6BA94]/12 border border-[#D6BA94]/25 px-3.5 py-1 rounded-full mb-3">
            <IconDocument className="w-3.5 h-3.5 text-[#D6BA94]" />
            <span>NPK- / CRB- & SIA-118-Kalkulator</span>
          </span>
          <h3 className="text-2xl sm:text-3xl font-semibold text-white tracking-[-0.03em]">
            Interaktive Branchen-Kalkulation nach Schweizer Norm
          </h3>
          <p className="text-xs sm:text-sm text-[#A1A1A6] mt-1.5">
            Wählen Sie Ihr Gewerk und testen Sie, wie schnell Kinetic Craft NPK-Positionen, Regiestunden und 8.1% MWST kalkuliert.
          </p>
        </div>

        <span className="px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-[#E8D3B5] text-xs font-medium self-start lg:self-center">
          {currentTrade.npkCode}
        </span>
      </div>

      {/* Trade Selector Pills */}
      <div className="flex flex-wrap gap-2 my-7">
        {Object.entries(tradeTemplates).map(([key, t]) => {
          const isSelected = tradeKey === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTradeKey(key)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-2 ${
                isSelected
                  ? 'apple-starlight-btn font-semibold'
                  : 'bg-white/[0.04] text-[#A1A1A6] border border-white/10 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <TradeIcon tradeId={key} className={`w-3.5 h-3.5 ${isSelected ? 'text-[#0B0B0E]' : 'text-[#D6BA94]'}`} />
              <span>{t.name.split(' & ')[0]}</span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Controls & NPK Position Info */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-5 rounded-[22px] bg-white/[0.04] border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[#D6BA94]">
              <span>Norm-Position ({currentTrade.npkCode})</span>
              <span className="tabular-nums">CHF {currentTrade.unitPrice}.– / {currentTrade.unitShort}</span>
            </div>
            <div className="font-semibold text-white text-sm sm:text-base">
              {currentTrade.positionTitle}
            </div>
            <div className="text-xs text-[#A1A1A6]">{currentTrade.materialDesc}</div>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs sm:text-sm font-medium text-[#F5F5F7]">
                  Menge / Ausmass ({currentTrade.unitLabel}):
                </label>
                <span className="font-semibold text-[#E8D3B5] text-base tabular-nums">
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
                className="w-full h-2 bg-white/15 rounded-full appearance-none cursor-pointer accent-[#D6BA94]"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs sm:text-sm font-medium text-[#F5F5F7]">
                  Zusätzliche Regiestunden (à CHF {currentTrade.hourlyRate}.–/Std.):
                </label>
                <span className="font-semibold text-[#E8D3B5] text-base tabular-nums">
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
                className="w-full h-2 bg-white/15 rounded-full appearance-none cursor-pointer accent-[#D6BA94]"
              />
            </div>
          </div>
        </div>

        {/* Right: Live Offer Calculation Box */}
        <div className="lg:col-span-5 apple-glass-card rounded-[24px] p-6 sm:p-7 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
            <span className="text-xs font-medium text-[#D6BA94]">Live-Offertenkalkulation</span>
            <span className="text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-400/25 px-3 py-0.5 rounded-full font-medium">
              A4 & QR-bereit
            </span>
          </div>

          <div className="space-y-2.5 text-xs tabular-nums">
            <div className="flex justify-between text-[#A1A1A6]">
              <span>Hauptposition ({quantity} {currentTrade.unitShort}):</span>
              <span className="font-semibold text-white">CHF {posSubtotal.toLocaleString('de-CH')}.00</span>
            </div>
            <div className="flex justify-between text-[#A1A1A6]">
              <span>Regierapport ({regieHours} Std.):</span>
              <span className="font-semibold text-white">CHF {regieSubtotal.toLocaleString('de-CH')}.00</span>
            </div>
            <div className="flex justify-between text-[#A1A1A6] pt-2.5 border-t border-white/10">
              <span>Zwischentotal (exkl. MWST):</span>
              <span className="text-white">CHF {netTotal.toLocaleString('de-CH')}.00</span>
            </div>
            <div className="flex justify-between text-[#E8D3B5]">
              <span>+ 8.1% Schweizer MWST:</span>
              <span>CHF {mwstAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-white pt-2.5 border-t border-white/10">
              <span>Offertentotal inkl. MWST:</span>
              <span className="text-[#E8D3B5]">CHF {grossTotal.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {onSelectGewerkForQuote && (
            <button
              type="button"
              onClick={() => onSelectGewerkForQuote(currentTrade.name)}
              className="w-full py-3.5 rounded-full apple-titanium-btn font-semibold text-xs sm:text-sm cursor-pointer"
            >
              Vorlagen für {currentTrade.name.split(' & ')[0]} anfragen / testen →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
