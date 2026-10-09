import React, { useState, useEffect } from 'react'
import KineticLogoMark from '../components/KineticLogoMark'
import DsgBanner from '../components/legal/DsgBanner'
import {
  TradeIcon,
  IconPraezision,
  IconMobileFirst,
  IconDatenschutz,
  IconSwissSupport,
  IconPhotoScanner,
  IconMapsRoute,
  IconDigitalSignature,
  IconFlash,
  IconSwissFlag,
  IconApple,
  IconAndroid,
  IconTablet,
  IconSearch,
  IconCheck,
  IconSparkles,
  IconClose,
  IconQrBill,
  IconMic,
  IconCamera,
  IconSun,
  IconCloud,
  IconClock,
  IconBank,
  IconDocument,
  IconShieldCheck,
  IconMoney,
} from '../components/icons/BrandIcons'

export default function LandingPageView({ 
  onGoToLogin, 
  onGoToRegistration, 
  onOpenImpressum, 
  onOpenDatenschutz 
}) {
  // Navigation & Mobile Menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Pricing Cycle: 'monthly' or 'yearly' (10% discount)
  const [billingCycle, setBillingCycle] = useState('monthly')

  // Gewerke Filter
  const [selectedGewerk, setSelectedGewerk] = useState('alle')

  // FAQ Accordion
  const [openFaqIndex, setOpenFaqIndex] = useState(0)

  // Modal for screenshot zoom
  const [zoomedImage, setZoomedImage] = useState(null)

  // Interactive 4-Phase Workflow Showcase Tab
  const [activeShowcaseTab, setActiveShowcaseTab] = useState('dashboard')

  // Interactive ROI Calculator State
  const [calcTeamSize, setCalcTeamSize] = useState(3)
  const [calcDocCount, setCalcDocCount] = useState(25)

  // Sticky Bottom CTA Bar state
  const [showStickyCta, setShowStickyCta] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 650) {
        setShowStickyCta(true)
      } else {
        setShowStickyCta(false)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // ROI Calculation Formulas (grounded in Swiss craft trade operations)
  // ~45 min (0.75h) saved per offer/invoice + 1.5h saved per team member per month for timesheets & receipts
  const hoursSavedPerMonth = Math.round(calcDocCount * 0.6 + calcTeamSize * 1.5)
  // CHF 85/h average Swiss craftsman hourly billing rate
  const moneySavedPerMonth = hoursSavedPerMonth * 85

  // Lead / Quote Inquiry Form State
  const [inquiryData, setInquiryData] = useState({
    gewerk: 'Schreinerei',
    teamSize: '2-5 Mitarbeiter',
    name: '',
    firma: '',
    email: '',
    telefon: '',
    bemerkung: '',
  })
  const [inquirySubmitted, setInquirySubmitted] = useState(false)

  const handleInquirySubmit = (e) => {
    e.preventDefault()
    setInquirySubmitted(true)
  }

  // Gewerke Data
  const gewerkeList = [
    {
      id: 'schreinerei',
      title: 'Schreinerei & Innenausbau',
      desc: 'Massgenaue Offerten mit Holzarten, Kanten, Beschlägen und Montagezeiten. 1-Klick Umwandlung in Werkstattauftrag.',
      highlight: 'Massberechnung & Materialdeklaration',
    },
    {
      id: 'maler',
      title: 'Maler & Gipser',
      desc: 'Schnelle Quadratmeter-Berechnungen für Wände, Decken und Fassaden. Inklusive Farbton-Dokumentation und Regierapporten.',
      highlight: 'm²-Aufmass & Regieberichte',
    },
    {
      id: 'elektro',
      title: 'Elektro & Gebäudeautomation',
      desc: 'Installations- und Prüfprotokolle direkt beim Kunden digital signieren lassen. Material und Arbeitsstunden sekundengenau abrechnen.',
      highlight: 'Installationsrapporte & Signatur',
    },
    {
      id: 'sanitaer',
      title: 'Sanitär & Heizung',
      desc: 'Wartungsaufträge, Service-Einsätze und Notfalldienst sauber planen. Automatische Zahlungserinnerungen mit Schweizer QR-Code.',
      highlight: 'Service-Verträge & QR-Rechnung',
    },
    {
      id: 'gartenbau',
      title: 'Garten- & Landschaftsbau',
      desc: 'Saisonale Pflegeverträge, Pflanzlisten und Maschinenstunden transparent kalkulieren und mit Fotos dokumentieren.',
      highlight: 'Pflege-Abonnemente & Maschinen',
    },
    {
      id: 'bau',
      title: 'Bauunternehmung & Renovation',
      desc: 'Mehrere Baustellen und Subunternehmer parallel steuern. Belege direkt per Handy-Kamera scannen und der Baustelle zuweisen.',
      highlight: 'Baustellen-Ablage & Beleg-Scanner',
    },
  ]

  const filteredGewerke = selectedGewerk === 'alle' 
    ? gewerkeList 
    : gewerkeList.filter(g => g.id === selectedGewerk)

  // App Screenshots Showcase Data (Used in Multi-Card View & Tab System)
  const showcaseTabs = [
    {
      id: 'dashboard',
      tabLabel: '1. Bento-Cockpit & Wetter',
      tag: 'Tagesübersicht & Wetter',
      tagColor: 'bg-amber-50 text-amber-900 border-amber-200',
      title: 'Das neue Bento-Dashboard mit Live-Wetter',
      desc: 'Alle offenen Rechnungen, Tagestermine und Live-Wetterdaten (Bern, Zürich etc.) für Baustellen auf einen Blick. Sofort sehen, welche Aufträge anstehen und ob das Wetter mitspielt.',
      image: '/screenshots/01_hero_dashboard.png',
      alt: 'Kinetic Craft Bento-Cockpit und Wetter',
      features: [
        'Live-Wetteranzeige mit Niederschlagsradar für Schweizer Baustellen',
        'Finanz-Cockpit: Offene Debitoren, Delkredere & fällige QR-Rechnungen',
        'Schnellstart für neue Offerten, Zeiterfassung & Belege mit 1 Klick',
      ],
    },
    {
      id: 'mobile_ai',
      tabLabel: '2. Gemini KI & Baustelle',
      tag: 'Gemini 3.8 Flash AI',
      tagColor: 'bg-purple-50 text-purple-900 border-purple-200',
      title: 'KI-Belegscanner & Baustellen-Sprachdiktat',
      desc: 'Materialquittungen fotografieren – die Gemini KI erkennt Betrag, Schweizer MWST (8.1% / 2.6%) und Lieferanten automatisch. Regieberichte direkt per Sprache auf der Baustelle diktieren.',
      image: '/screenshots/09_ai_beleg_scanner.png',
      alt: 'Kinetic Craft KI Beleg Scanner',
      fallbackImage: '/screenshots/06_mobile_baustelle.png',
      features: [
        'Gemini Vision OCR: Quittungen von Hornbach, OBI, Debrunner in 2s erfassen',
        'Baustellen-Diktat: Gesprochene Notizen werden zu sauberen Rapportzeilen',
        'Offline-fähig: Fotos und Stundenerfassung direkt vor Ort im Transporter',
      ],
    },
    {
      id: 'zefix_crm',
      tabLabel: '3. CRM & Zefix-Handelsregister',
      tag: 'Zefix & Baustellen-CRM',
      tagColor: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      title: 'Kundenkartei mit Zefix-Echtzeitprüfung',
      desc: 'Firmen per Schweizer Handelsregister (Zefix API) mit UID/CHE-Nummer in Sekundenschnelle suchen und fehlerfrei anlegen. Alle Baustellen, Pläne und Ansprechpartner zentral organisiert.',
      image: '/screenshots/03_kunden_baustellen_bento.png',
      alt: 'Kinetic Craft Kunden- und Projektübersicht',
      fallbackImage: '/screenshots/03_kunden_baustellen.png',
      features: [
        'Zefix-Schnittstelle: Stammdaten & UID direkt aus dem Handelsregister',
        'Baustellen-Dossiers: Fotos, Skizzen und Kundenhistorie an einem Ort',
        '1-Klick Google Maps Navigation direkt zur nächsten Baustelle',
      ],
    },
    {
      id: 'rechnung_finanzen',
      tabLabel: '4. QR-Bill & Banana-Treuhand',
      tag: 'ISO 20022 & Treuhand',
      tagColor: 'bg-amber-100 text-amber-900 border-amber-300',
      title: 'Schweizer QR-Rechnung & Banana-Export',
      desc: 'Druckbereite Rechnungen mit schwebender Toolbar, A4-PDF-Echtzeitvorschau und integriertem QR-Zahlteil nach Schweizer ISO 20022 Standard. Exportiert direkt für Banana Doppelte Buchhaltung.',
      image: '/screenshots/02_offerten_rechnungen.png',
      alt: 'Kinetic Craft Offerten und Schweizer QR-Rechnung',
      features: [
        'Offizielle Schweizer QR-Rechnung mit QR-IBAN und Referenz-Validierung',
        'Schwebende A4-Druck-Toolbar mit PDF-Download in unter 60 Sekunden',
        'Banana Buchhaltung Export & OP-Liste mit Delkredere (OR 957ff.)',
      ],
    },
  ]

  const activeTabDetails = showcaseTabs.find(t => t.id === activeShowcaseTab) || showcaseTabs[0]

  // FAQ Data
  const faqs = [
    {
      q: 'Wie funktioniert die Schweizer QR-Rechnung in Kinetic Craft?',
      a: 'Kinetic Craft generiert automatisch vollumfänglich standardkonforme Schweizer QR-Rechnungen nach ISO 20022 mit offizieller QR-IBAN, Creditor Reference (oder SCOR) und Betrag. Ihre Kunden können die Rechnung mit jeder Schweizer Banking-App in Sekundenschnelle einscannen und bezahlen.',
    },
    {
      q: 'Was beinhaltet die 14-tägige kostenlose Testphase?',
      a: 'Sie erhalten sofort vollen Zugriff auf alle Funktionen von Kinetic Craft Professional – ohne Eingabe einer Kreditkarte und ohne automatische Verlängerung. Nach den 14 Tagen entscheiden Sie selbst, ob Sie im kostenlosen Starter-Tarif bleiben oder das Pro-Abo aktivieren möchten.',
    },
    {
      q: 'Wie funktioniert der Gemini KI-Belegscanner & das Baustellen-Diktat?',
      a: 'Mit der integrierten Gemini 3.8 Flash KI fotografieren Sie Materialquittungen (z.B. Baumarkt oder Großhändler) mit Ihrem Smartphone. Die KI liest Lieferant, Datum, MWST (8.1% / 2.6%) und Endbetrag automatisch aus und weist den Beleg der Baustelle zu. Per Sprachnotiz können Sie außerdem Arbeitszeiten und Materialien freihändig einsprechen.',
    },
    {
      q: 'Unterstützt Kinetic Craft den Export zu Banana Buchhaltung und Schweizer Treuhändern?',
      a: 'Ja! Kinetic Craft exportiert Buchungsdaten, Mehrwertsteuer-Auswertungen und OP-Listen (inklusive Delkredere nach Schweizer OR 957ff.) in das Standardformat für Banana Buchhaltung und Schweizer Treuhand-Software. Sie können Ihrem Treuhänder zudem einen kostenlosen Lesezugang einrichten.',
    },
    {
      q: 'Funktioniert Kinetic Craft mobil auf der Baustelle?',
      a: 'Absolut. Kinetic Craft ist als moderne Web-Applikation für Tablets (iPad, Android) und Smartphones optimiert. Sie können Kundenadressen mit Google Maps öffnen, Fotos von der Baustelle hochladen, Regiestunden per Stoppuhr erfassen und Kunden direkt auf dem Display unterschreiben lassen.',
    },
    {
      q: 'Was bringt die Zefix-Handelsregister-Anbindung?',
      a: 'Beim Anlegen neuer Geschäftskunden geben Sie einfach den Firmennamen oder die UID ein. Kinetic Craft ruft die offiziellen Daten in Echtzeit aus dem Schweizer Bundesamtsregister (Zefix) ab – Adresse, Rechtsform und UID sind sofort fehlerfrei hinterlegt.',
    },
    {
      q: 'Wo werden meine Unternehmensdaten gespeichert?',
      a: 'Kinetic Craft setzt auf eine transparente Cloud-Architektur: Die verschlüsselte Auslieferung der Web-Applikation erfolgt über das Vercel Edge Network (EU). Ihre sensiblen Mandanten- und Buchhaltungsdaten liegen sicher isoliert in ISO/IEC 27001 zertifizierten Datenbanken (Supabase) unter strikter Einhaltung des Schweizer Datenschutzgesetzes (DSG).',
    },
    {
      q: 'Wer steht hinter Kinetic Craft und Kinetic Schweiz?',
      a: 'Kinetic Schweiz vertreibt und betreut Kinetic Craft als spezialisierte Unternehmenslösung für das Schweizer Handwerk. Unser Fokus liegt auf kompromissloser Benutzerfreundlichkeit, Schweizer Präzision und persönlichem Support.',
    },
  ]

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white text-slate-900 font-sans selection:bg-amber-100 selection:text-amber-900">
      
      {/* ========================================================================= */}
      {/* 1. TOP ANNOUNCEMENT BANNER */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/15 to-amber-600/10 border-b border-amber-200/80 px-4 py-1.5 text-center text-xs sm:text-sm font-medium text-slate-900 flex items-center justify-center gap-2">
        <IconSwissFlag className="w-4 h-4 rounded shadow-xs shrink-0" />
        <span>
          <strong>Kinetic Schweiz</strong> präsentiert: <strong>Kinetic Craft</strong> mit Gemini AI Beleg-Scanner & 100% Swiss QR-Rechnung.
        </span>
        <button 
          onClick={onGoToRegistration}
          className="hidden md:inline-flex items-center font-bold text-amber-800 hover:text-amber-950 underline underline-offset-2 ml-1 cursor-pointer"
        >
          Jetzt 14 Tage kostenlos testen →
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. HEADER / NAVIGATION */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Kinetic Craft Brand Logo */}
          <div className="flex items-center gap-3">
            <KineticLogoMark className="w-9 h-9 sm:w-10 sm:h-10 text-slate-900 shrink-0" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">Kinetic</span>
                <span className="font-bold text-base sm:text-lg tracking-tight text-amber-600">Craft</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                  CRM
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-400 -mt-0.5 tracking-wide">
                by Kinetic Schweiz
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-3.5 xl:gap-6 text-xs xl:text-sm font-medium text-slate-600">
            <a href="#funktionen" className="hover:text-amber-600 transition-colors">Funktionen</a>
            <a href="#ki-superpowers" className="hover:text-amber-600 transition-colors flex items-center gap-1">
              <span>Gemini KI</span>
              <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-bold">Neu</span>
            </a>
            <a href="#einblicke" className="hover:text-amber-600 transition-colors">App-Einblicke</a>
            <a href="#baustellen-cockpit" className="hover:text-amber-600 transition-colors">Cockpit</a>
            <a href="#rechner" className="hover:text-amber-600 transition-colors">Ersparnis-Rechner</a>
            <a href="#gewerke" className="hover:text-amber-600 transition-colors">Gewerke</a>
            <a href="#tarife" className="hover:text-amber-600 transition-colors">Tarife</a>
            <a href="#faq" className="hover:text-amber-600 transition-colors">FAQ</a>
          </nav>

          {/* Desktop Action CTAs */}
          <div className="hidden sm:flex items-center gap-2.5">
            <button
              onClick={onGoToLogin}
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              Einloggen
            </button>
            <button
              onClick={onGoToRegistration}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-amber-700 hover:bg-amber-800 active:bg-amber-900 rounded-xl shadow-sm shadow-amber-900/20 hover:shadow-md hover:shadow-amber-900/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>14 Tage testen</span>
              <span className="text-amber-100">→</span>
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
            aria-label="Menü öffnen"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg animate-fade-in">
            <nav className="flex flex-col space-y-2 text-base font-medium text-slate-700">
              <a href="#funktionen" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-50">Funktionen</a>
              <a href="#ki-superpowers" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center justify-between">
                <span>Gemini KI Superpowers</span>
                <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded">Neu</span>
              </a>
              <a href="#einblicke" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-50">App-Einblicke</a>
              <a href="#baustellen-cockpit" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-50">Baustellen-Cockpit</a>
              <a href="#rechner" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-50">Ersparnis-Rechner</a>
              <a href="#gewerke" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-50">Gewerke</a>
              <a href="#tarife" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-50">Tarife</a>
              <a href="#anfrage" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-50">Offerte anfragen</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-50">FAQ</a>
            </nav>
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={onGoToLogin}
                className="w-full py-2.5 text-center text-sm font-semibold text-slate-800 bg-slate-100 rounded-xl"
              >
                Einloggen
              </button>
              <button
                onClick={onGoToRegistration}
                className="w-full py-2.5 text-center text-sm font-bold text-white bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 rounded-xl shadow-sm"
              >
                14 Tage kostenlos testen
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 3. NEXT-GEN HERO SECTION (Bento Dashboard + Gemini AI + Swiss Weather) */}
      {/* ========================================================================= */}
      <section className="relative pt-6 pb-12 sm:pt-10 sm:pb-16 md:pt-12 md:pb-20 overflow-hidden bg-gradient-to-b from-white via-amber-50/25 to-white">
        
        {/* Soft Decorative Ambient Glows */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[650px] h-[300px] bg-gradient-to-r from-amber-200/40 via-yellow-200/30 to-orange-200/20 blur-3xl -z-10 rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          
          {/* Eyebrow Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-amber-300 text-amber-950 text-xs sm:text-sm font-semibold mb-4 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
            <span>Handwerk 2.0: Schweizer Präzision trifft Gemini AI · 100% Swiss QR-Bill</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Das Handwerker-CRM, <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-700 bg-clip-text text-transparent">
              das mitdenkt.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-4 sm:mt-5 text-base sm:text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
            Schluss mit Zettelwirtschaft am Feierabend: <strong>Belege per Gemini KI scannen</strong>, Offerten per Spracheingabe auf der Baustelle erfassen und Rechnungen mit <strong>Schweizer QR-Code in unter 60 Sekunden</strong> drucken oder versenden.
          </p>

          {/* Action CTAs */}
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              onClick={onGoToRegistration}
              className="w-full sm:w-auto px-8 py-3.5 text-base font-bold text-white bg-amber-700 hover:bg-amber-800 active:bg-amber-900 rounded-2xl shadow-lg shadow-amber-900/20 hover:shadow-xl hover:shadow-amber-900/30 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-3"
            >
              <span>14 Tage kostenlos testen</span>
              <span className="text-amber-100 font-normal">→</span>
            </button>
            <a
              href="#einblicke"
              className="w-full sm:w-auto px-7 py-3.5 text-base font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <span>Screenshots & Einblicke</span>
              <span className="text-slate-400">↓</span>
            </a>
          </div>

          {/* Micro Trust Proof */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <IconCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Keine Kreditkarte erforderlich</span>
            </div>
            <div className="flex items-center gap-1.5">
              <IconCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>In 2 Minuten startklar</span>
            </div>
            <div className="flex items-center gap-1.5">
              <IconCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Schweizer Support & DSG-konform</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. HERO DESKTOP REAL BENTO SCREENSHOT */}
        {/* ========================================================================= */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 sm:mt-12">
          <div className="relative rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden bg-white ring-1 ring-black/5">
            
            {/* macOS Browser Header */}
            <div className="bg-slate-50/90 border-b border-slate-200 px-4 py-2.5 sm:py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400"></span>
                <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
              </div>
              <div className="bg-white border border-slate-200/80 rounded-lg px-4 py-1 text-xs font-mono text-slate-500 flex items-center gap-2 max-w-xs w-full justify-center shadow-xs">
                <IconDatenschutz className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>craft.kinetic-schweiz.ch/dashboard</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <span className="hidden sm:inline">Schweizer Cloud & Gemini AI</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
            </div>

            {/* Real Desktop Screenshot */}
            <div className="relative group cursor-pointer" onClick={() => setZoomedImage('/screenshots/01_hero_dashboard.png')}>
              <img 
                src="/screenshots/01_hero_dashboard.png" 
                alt="Kinetic Craft Dashboard Übersicht" 
                className="w-full h-auto block transition-transform duration-300 group-hover:scale-[1.005]"
              />
              
              {/* Subtle hover overlay hint */}
              <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <span className="px-4 py-2 bg-white/90 backdrop-blur-md rounded-full text-xs font-bold text-slate-800 shadow-md inline-flex items-center gap-1.5">
                  <IconSearch className="w-3.5 h-3.5 text-slate-700" />
                  Klicken für Vollbild-Vorschau
                </span>
              </div>
            </div>

          </div>

          {/* Clean Feature Highlight Ribbon directly under mockup */}
          <div className="mt-4 sm:mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-left">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200/90 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <IconSun className="w-4 h-4 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">Baustellen-Wetter</p>
                <p className="text-[11px] text-slate-500 truncate">Live-Forecast für Bern & Region</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200/90 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <IconSparkles className="w-4 h-4 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">Gemini 3.8 Flash</p>
                <p className="text-[11px] text-slate-500 truncate">KI-Belegscan in 1,2 Sekunden</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200/90 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                <IconSwissFlag className="w-4 h-4 rounded shrink-0" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">Swiss QR-Bill</p>
                <p className="text-[11px] text-slate-500 truncate">ISO 20022 & QR-Referenz</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200/90 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <IconDatenschutz className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">Zefix & DSG</p>
                <p className="text-[11px] text-slate-500 truncate">100% Swiss Hosted & UID</p>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* ========================================================================= */}
      {/* 5. STATS & SWISS TRUST BAR */}
      {/* ========================================================================= */}
      <section className="py-12 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-black text-amber-600 font-mono tracking-tight">60 Sek.</div>
              <div className="text-xs sm:text-sm text-slate-600 font-medium mt-1">Von Aufmass zur fertigen Offerte</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">100%</div>
              <div className="text-xs sm:text-sm text-slate-600 font-medium mt-1">Swiss QR-Rechnung & MWST-konform</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-amber-700 font-mono tracking-tight">0 CHF</div>
              <div className="text-xs sm:text-sm text-slate-600 font-medium mt-1">Keine versteckten Einrichtungsgebühren</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
                <IconSwissFlag className="w-7 h-7 rounded-md shadow-xs" />
                <span>DSG</span>
              </div>
              <div className="text-xs sm:text-sm text-slate-600 font-medium mt-1">Schweizer Datenschutz & ISO 27001</div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. INTERAKTIVER 4-PHASEN BENTO- & WORKFLOW-SHOWCASE */}
      {/* ========================================================================= */}
      <section id="funktionen" className="py-20 bg-slate-50/70 border-b border-slate-200/60 relative scroll-mt-16">
        <div id="einblicke" className="absolute -top-20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs uppercase font-bold tracking-wider text-amber-800 bg-amber-100/90 border border-amber-200 px-3.5 py-1 rounded-full">
              Interaktive App-Einblicke
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-4 tracking-tight">
              Ein Tag im Schweizer Handwerk. Perfekt organisiert.
            </h2>
            <p className="text-base text-slate-600 mt-3">
              Klicken Sie durch die 4 Stationen des Handwerker-Alltags – von der Morgenplanung bis zum Feierabend.
            </p>
          </div>

          {/* Interactive Showcase Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10 max-w-4xl mx-auto">
            {showcaseTabs.map((tab) => {
              const isActive = activeShowcaseTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveShowcaseTab(tab.id)}
                  className={`px-4 sm:px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10 ring-2 ring-amber-500/20'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{tab.tabLabel}</span>
                </button>
              )
            })}
          </div>

          {/* Active Tab Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden transition-all duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
              
              {/* Left Column: Explanations & Features */}
              <div className="lg:col-span-5 p-8 sm:p-10 lg:p-12 space-y-6">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-lg border ${activeTabDetails.tagColor}`}>
                    {activeTabDetails.tag}
                  </span>
                  <span className="text-xs font-mono text-slate-400">Kinetic Craft</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                  {activeTabDetails.title}
                </h3>

                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  {activeTabDetails.desc}
                </p>

                <div className="space-y-3 pt-2">
                  {activeTabDetails.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <IconCheck className="w-3.5 h-3.5 text-emerald-700" />
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-slate-700">{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 flex items-center gap-4">
                  <button
                    onClick={() => setZoomedImage(activeTabDetails.image)}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <IconSearch className="w-3.5 h-3.5 text-slate-700" />
                    <span>In voller Auflösung ansehen</span>
                  </button>
                  <button
                    onClick={onGoToRegistration}
                    className="text-xs font-bold text-amber-700 hover:text-amber-900 underline underline-offset-4 cursor-pointer"
                  >
                    Selbst ausprobieren →
                  </button>
                </div>
              </div>

              {/* Right Column: High-Res Screenshot Preview */}
              <div 
                className="lg:col-span-7 bg-slate-100 p-4 sm:p-6 lg:p-8 border-t lg:border-t-0 lg:border-l border-slate-200 cursor-pointer group"
                onClick={() => setZoomedImage(activeTabDetails.image)}
              >
                <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg bg-white relative">
                  <img 
                    src={activeTabDetails.image} 
                    alt={activeTabDetails.alt} 
                    className="w-full h-auto object-cover object-top max-h-[460px] group-hover:scale-[1.01] transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="px-4 py-2 bg-white/90 backdrop-blur-md rounded-full text-xs font-bold text-slate-800 shadow-md inline-flex items-center gap-1.5">
                      <IconSearch className="w-3.5 h-3.5 text-slate-700" />
                      Klicken zum Vergrössern
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-center text-xs font-medium text-slate-400 flex items-center justify-center gap-1.5">
                  <IconSearch className="w-3.5 h-3.5 text-slate-400" />
                  <span>Klicken für 100% Zoom & Detailansicht</span>
                </div>
              </div>

            </div>
          </div>

          {/* Secondary 2-Card Row: Offerten & Buchhaltung Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border bg-amber-50 text-amber-800 border-amber-200">
                    Abrechnung & QR-Bill
                  </span>
                  <span className="text-xs text-slate-400 font-mono">ISO 20022</span>
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">Offerten & Rechnungen mit Schweizer QR-Code</h4>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                  Erstellen Sie professionelle Offerten mit Ihrem Firmenlogo, Schweizer MWST (8.1%) und integriertem QR-Zahlteil nach ISO 20022. Druckbereit und als PDF versandfähig in unter 60 Sekunden.
                </p>
              </div>
              <div 
                className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-2 cursor-pointer group mt-2"
                onClick={() => setZoomedImage('/screenshots/02_offerten_rechnungen.png')}
              >
                <img 
                  src="/screenshots/02_offerten_rechnungen.png" 
                  alt="Kinetic Craft Offerten und Schweizer QR-Rechnung" 
                  className="w-full h-auto object-cover object-top max-h-[220px] rounded-xl group-hover:scale-[1.01] transition-transform"
                />
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border bg-emerald-50 text-emerald-800 border-emerald-200">
                    Baustellen & CRM
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Zefix API</span>
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">Kundenkartei & Baustellen-Dossiers</h4>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                  Alle Liegenschaften, Pläne, Dokumente und Ansprechpartner an einem Ort. Mit Zefix-Handelsregisterabgleich und direkter Google Maps-Verbindung für Monteure.
                </p>
              </div>
              <div 
                className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-2 cursor-pointer group mt-2"
                onClick={() => setZoomedImage('/screenshots/03_kunden_baustellen_bento.png')}
              >
                <img 
                  src="/screenshots/03_kunden_baustellen_bento.png" 
                  alt="Kinetic Craft Kunden- und Projektübersicht" 
                  className="w-full h-auto object-cover object-top max-h-[220px] rounded-xl group-hover:scale-[1.01] transition-transform"
                />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. MIDNIGHT COCKPIT: GEMINI AI SUPERPOWERS */}
      {/* ========================================================================= */}
      <section id="ki-superpowers" className="py-24 bg-slate-950 text-white relative overflow-hidden">
        
        {/* Ambient AI Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-purple-600/15 blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-4">
              <IconSparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Gemini 3.8 Flash Inside · Multimodal AI</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Ihr digitaler Polier:{' '}
              <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 bg-clip-text text-transparent">
                KI, die Schweizer Handwerker versteht.
              </span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Vergessen Sie mühsames Abtippen von Materialquittungen und das Tippen auf kleinen Handytastaturen mit staubigen Händen. Kinetic Craft denkt mit – per Kamera und Stimme.
            </p>
          </div>

          {/* 3 AI Bento Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1: Gemini Vision Receipt OCR */}
            <div className="bg-slate-900/90 rounded-3xl p-8 border border-slate-800 shadow-xl flex flex-col justify-between group hover:border-amber-400/60 transition-all">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
                  <IconCamera className="w-6 h-6 text-amber-400" />
                </div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-2">Vision OCR</span>
                <h3 className="text-xl font-bold text-white mb-3">Belege & Quittungen scannen</h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-6">
                  Fotografieren Sie Belege von Hornbach, OBI, Debrunner oder HGC. Gemini erkennt Beträge, MWST (8.1% / 2.6%) und Händler vollautomatisch und weist sie der Baustelle zu.
                </p>
              </div>

              {/* Mockup Preview Box */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Händler:</span>
                  <span className="text-amber-300 font-bold">Hornbach Biel</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>MWST Satz:</span>
                  <span className="text-emerald-400 font-bold">8.1% (CHF 18.63)</span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                  <span>Projekt:</span>
                  <span className="text-white font-bold">EFH Keller Bern</span>
                </div>
              </div>
            </div>

            {/* Card 2: Voice-to-Action Audio Dictation */}
            <div className="bg-slate-900/90 rounded-3xl p-8 border border-slate-800 shadow-xl flex flex-col justify-between group hover:border-amber-400/60 transition-all">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
                  <IconMic className="w-6 h-6 text-amber-400" />
                </div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-2">Audio Dictation</span>
                <h3 className="text-xl font-bold text-white mb-3">Baustellen-Sprachdiktat</h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-6">
                  Sprechen Sie Notizen, geleistete Stunden und verbaute Materialien einfach ins Smartphone. Kinetic Craft formuliert saubere Offertentexte und Regierapporte.
                </p>
              </div>

              {/* Audio Waveform Mockup */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-1.5 justify-center py-2">
                  <span className="w-1 h-3 bg-amber-400 rounded-full animate-pulse"></span>
                  <span className="w-1 h-6 bg-amber-400 rounded-full animate-pulse"></span>
                  <span className="w-1 h-8 bg-amber-300 rounded-full animate-pulse"></span>
                  <span className="w-1 h-4 bg-amber-400 rounded-full animate-pulse"></span>
                  <span className="w-1 h-7 bg-amber-300 rounded-full animate-pulse"></span>
                  <span className="w-1 h-3 bg-amber-400 rounded-full animate-pulse"></span>
                </div>
                <p className="text-[11px] text-slate-300 italic text-center font-sans">
                  "3 Std. Montage Küchenzeile, 2 Pack Schrauben 4x40..."
                </p>
              </div>
            </div>

            {/* Card 3: Privacy & Swiss DSG Compliance */}
            <div className="bg-slate-900/90 rounded-3xl p-8 border border-slate-800 shadow-xl flex flex-col justify-between group hover:border-amber-400/60 transition-all">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
                  <IconShieldCheck className="w-6 h-6 text-amber-400" />
                </div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-2">DSG & Security</span>
                <h3 className="text-xl font-bold text-white mb-3">100% Datenschutz & Privatsphäre</h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-6">
                  Ihre geschäftlichen Unterlagen und Kundenfotos bleiben vertraulich. Keine Verwendung von Kundendaten für KI-Trainingszwecke. Strikte Mandantentrennung.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <IconCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Schweizer DSG konform</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>ISO/IEC 27001 Datenspeicher</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Ende-zu-Ende Verschlüsselung</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. SCHWEIZER TREUHAND & BANANA-EXPORT */}
      {/* ========================================================================= */}
      <section className="py-20 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            <div className="space-y-6">
              <span className="text-xs uppercase font-bold tracking-wider text-amber-800 bg-amber-100/90 border border-amber-200 px-3.5 py-1 rounded-full">
                Schweizer Finanzen & Treuhand
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-snug">
                Export für Banana Buchhaltung & Treuhänder nach OR 957ff.
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                Kinetic Craft schließt die Lücke zwischen Baustelle und Treuhandbüro. Alle Rechnungen, Zahlungen und Belege werden automatisch vorkontiert und im Standardformat für <strong>Banana Doppelte Buchhaltung</strong> bereitgestellt.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-1">
                    <IconQrBill className="w-4 h-4 text-amber-600" />
                    <span>ISO 20022 QR-Bill</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    QR-IBAN, Creditor Reference (SCOR) und strukturierter Zahlteil.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-1">
                    <IconBank className="w-4 h-4 text-amber-600" />
                    <span>Banana Buchhaltung</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    1-Klick-Export für doppelte Buchhaltung und Journalauszüge.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-1">
                    <IconDocument className="w-4 h-4 text-amber-600" />
                    <span>MWSTG-konform</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Automatische Abrechnung für 8.1% und 2.6% Mehrwertsteuer.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-1">
                    <IconMoney className="w-4 h-4 text-amber-600" />
                    <span>OP-Liste & Delkredere</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Pauschalabzug (5% Inland / 10% Ausland) nach Obligationenrecht.
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Accounting Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-8 sm:p-10 rounded-3xl text-white shadow-2xl border border-slate-800 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <span className="text-xs font-mono text-amber-400">Export: Banana Buchhaltung v10+</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">100% OR 957ff.</span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between py-2 border-b border-slate-800/60">
                  <span className="text-slate-400">1100 Forderungen LL (Debitoren)</span>
                  <span className="text-white font-bold">CHF 48'250.00</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800/60">
                  <span className="text-slate-400">1109 Delkredere (5% Pauschale)</span>
                  <span className="text-amber-400 font-bold">- CHF 2'412.50</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800/60">
                  <span className="text-slate-400">2200 Geschuldete MWST (8.1%)</span>
                  <span className="text-white font-bold">CHF 3'615.20</span>
                </div>
                <div className="flex justify-between py-2 font-bold text-sm text-emerald-400 pt-3">
                  <span>Netto-Forderungsbestand:</span>
                  <span>CHF 45'837.50</span>
                </div>
              </div>

              <div className="pt-2 text-xs text-slate-400">
                Geben Sie Ihrem Treuhänder einen kostenlosen Lesezugang oder exportieren Sie geprüfte Buchungsdateien mit einem Klick.
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. BAUSTELLEN-COCKPIT (Wetter, Zefix, Zeiterfassung & Kantonskalender) */}
      {/* ========================================================================= */}
      <section id="baustellen-cockpit" className="py-20 bg-slate-50/70 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs uppercase font-bold tracking-wider text-amber-800 bg-amber-100/90 border border-amber-200 px-3.5 py-1 rounded-full">
              Smart Construction
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-4 tracking-tight">
              Das smarte Cockpit für Schweizer Baustellen
            </h2>
            <p className="text-base text-slate-600 mt-3">
              Präzise Helfer für den harten Alltag: Wetterprognose, Zeiterfassung per Stoppuhr, Zefix-Abgleich und kantonale Feiertage.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* 1. Live-Wetter */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
                  <IconSun className="w-5 h-5 text-amber-700" />
                </div>
                <h4 className="font-bold text-base text-slate-900 mb-2">Live Baustellen-Wetter</h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Niederschlagsradar und Temperatur direkt auf dem Dashboard. Verhindert Ausfallzeiten bei Aussenarbeiten (Maler, Gartenbau, Dachdecker).
                </p>
              </div>
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/60 text-xs font-semibold text-amber-900 flex justify-between">
                <span>Bern · Sonnig</span>
                <span>18°C · 0% Regen</span>
              </div>
            </div>

            {/* 2. Zefix-Firmensuche */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4">
                  <IconSearch className="w-5 h-5 text-emerald-700" />
                </div>
                <h4 className="font-bold text-base text-slate-900 mb-2">Zefix-Handelsregister</h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Offizielle Schweizer Firmendaten per UID oder Firmenname in Sekundenschnelle finden und Adressen fehlerfrei in Kundenkartei importieren.
                </p>
              </div>
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/60 text-xs font-semibold text-emerald-900 flex justify-between">
                <span>UID-Prüfung</span>
                <span>CHE-123.456.789</span>
              </div>
            </div>

            {/* 3. Zeiterfassung & Stoppuhr */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-4">
                  <IconClock className="w-5 h-5 text-slate-700" />
                </div>
                <h4 className="font-bold text-base text-slate-900 mb-2">Live-Stoppuhr & Rapport</h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Globales Timer-Widget für Monteure. Gestoppte Zeiten mit 1 Klick in fertige Regierapporte und QR-Rechnungen umwandeln.
                </p>
              </div>
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 flex justify-between">
                <span>Laufende Montage</span>
                <span className="text-amber-700">02:45:12</span>
              </div>
            </div>

            {/* 4. Kantonsfeiertage */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
                  <IconSwissFlag className="w-5 h-5 rounded" />
                </div>
                <h4 className="font-bold text-base text-slate-900 mb-2">Feiertage nach Kanton</h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Automatische Berücksichtigung regionaler Feiertage (z. B. Bern, Zürich, Aargau, Basel, Luzern) in der Einsatzplanung.
                </p>
              </div>
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/60 text-xs font-semibold text-amber-900 flex justify-between">
                <span>Alle 26 Kantone</span>
                <span>CH-Standard</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. MOBIL AUF DER BAUSTELLE (Real Mobile Smartphone Screenshot) */}
      {/* ========================================================================= */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-[2.5rem] bg-gradient-to-br from-amber-500/[0.07] via-slate-50/80 to-amber-600/[0.04] border border-amber-200/90 p-8 sm:p-12 lg:p-16 flex flex-col lg:flex-row items-center gap-12 lg:gap-16 shadow-xl shadow-amber-900/[0.04] overflow-hidden">
            
            {/* Background Light */}
            <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 rounded-full bg-gradient-to-br from-amber-400/20 to-yellow-300/10 blur-3xl pointer-events-none" />

            {/* Left Column: Text & Value Props */}
            <div className="flex-1 space-y-6 relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/90 text-amber-900 border border-amber-200 text-xs font-bold uppercase tracking-wider shadow-xs">
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                <span>Mobile First • PWA & Offline-Ready</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
                Ihr Büro im Hosentaschen-Format.{' '}
                <span className="bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 bg-clip-text text-transparent">
                  Auf der Baustelle und im Transporter.
                </span>
              </h2>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Kein schwerer Laptop nötig: Kinetic Craft läuft blitzschnell auf jedem Smartphone und Tablet. Erfassen Sie Notizen, Fotos und Regiestunden direkt vor Ort.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3.5 bg-white/90 backdrop-blur-xs p-4 rounded-2xl border border-amber-200/70 shadow-xs hover:shadow-md hover:border-amber-300 transition-all duration-300 group">
                  <div className="w-10 h-10 rounded-xl bg-amber-100/80 text-amber-900 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <IconPhotoScanner className="w-5 h-5 text-slate-800" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-slate-900 group-hover:text-amber-800 transition-colors">
                      Foto-Dokumentation & Beleg-Scanner
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Materialquittungen fotografieren und der richtigen Baustelle zuweisen.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 bg-white/90 backdrop-blur-xs p-4 rounded-2xl border border-amber-200/70 shadow-xs hover:shadow-md hover:border-amber-300 transition-all duration-300 group">
                  <div className="w-10 h-10 rounded-xl bg-yellow-100/80 text-yellow-900 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <IconMapsRoute className="w-5 h-5 text-slate-800" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-slate-900 group-hover:text-amber-800 transition-colors">
                      Routen & Google Maps Anbindung
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Mit 1 Klick aus dem CRM direkt die Navigation zur Baustelle starten.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 bg-white/90 backdrop-blur-xs p-4 rounded-2xl border border-amber-200/70 shadow-xs hover:shadow-md hover:border-amber-300 transition-all duration-300 group">
                  <div className="w-10 h-10 rounded-xl bg-orange-100/80 text-orange-900 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <IconDigitalSignature className="w-5 h-5 text-slate-800" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-slate-900 group-hover:text-amber-800 transition-colors">
                      Digitale Kundenunterschrift
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Regierapporte und Bauabnahmen direkt auf dem Display gegenzeichnen lassen.
                    </p>
                  </div>
                </div>
              </div>

              {/* Supported OS micro-badge */}
              <div className="pt-2 flex items-center gap-4 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <IconApple className="w-3.5 h-3.5 text-slate-800" /> iOS & iPhone
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <IconAndroid className="w-3.5 h-3.5 text-emerald-600" /> Android
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <IconTablet className="w-3.5 h-3.5 text-slate-700" /> iPad & Tablets
                </span>
              </div>
            </div>

            {/* Right Column: Smartphone Mockup with Real Screenshot */}
            <div className="flex-shrink-0 relative z-10 my-4 lg:my-0">
              
              {/* Floating ambient aura glow */}
              <div className="absolute -inset-4 sm:-inset-6 bg-gradient-to-tr from-amber-500/25 via-yellow-400/20 to-orange-500/20 rounded-full blur-3xl -z-10 pointer-events-none" />

              {/* Smartphone Chassis */}
              <div className="w-[280px] sm:w-[310px] md:w-[325px] p-2 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 rounded-[48px] shadow-[0_25px_60px_-15px_rgba(15,23,42,0.4)] border border-slate-700/80 relative">
                
                {/* Edge-to-Edge Screen */}
                <div 
                  className="rounded-[40px] overflow-hidden bg-white relative aspect-[9/19] shadow-inner cursor-pointer group/screen border border-slate-950/20"
                  onClick={() => setZoomedImage('/screenshots/06_mobile_baustelle.png')}
                  title="Klicken zum Vergrössern"
                >
                  <img 
                    src="/screenshots/06_mobile_baustelle.png" 
                    alt="Kinetic Craft Mobile Ansicht auf der Baustelle" 
                    className="w-full h-full object-cover object-top group-hover/screen:scale-[1.03] transition-transform duration-500 ease-out"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/screen:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="px-3 py-1.5 rounded-full bg-slate-900/90 text-white text-xs font-semibold backdrop-blur-sm shadow-lg flex items-center gap-1.5">
                      <IconSearch className="w-3.5 h-3.5 text-white" />
                      Vergrössern
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 11. INTERAKTIVER HANDWERKER-ERSPARNIS-RECHNER (ROI) */}
      {/* ========================================================================= */}
      <section id="rechner" className="py-20 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-white relative overflow-hidden">
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs uppercase font-bold tracking-wider text-amber-300 bg-amber-500/20 border border-amber-400/30 px-3.5 py-1 rounded-full">
              Kosten- & Zeitersparnis
            </span>
            <h2 className="text-3xl sm:text-4xl font-black mt-4 tracking-tight">
              Wie viel Bürozeit & Geld sparen Sie pro Monat?
            </h2>
            <p className="text-sm text-slate-300 mt-2">
              Berechnen Sie Ihre individuelle Entlastung durch automatische Belege, KI-Diktat und 60s-QR-Rechnungen.
            </p>
          </div>

          <div className="bg-slate-900/90 p-5 sm:p-8 md:p-12 rounded-3xl border border-slate-800 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              
              {/* Sliders */}
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-slate-200">
                      Mitarbeiter / Monteure im Betrieb:
                    </label>
                    <span className="font-mono font-bold text-amber-400 text-lg">
                      {calcTeamSize} {calcTeamSize === 1 ? 'Person' : 'Personen'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={calcTeamSize}
                    onChange={(e) => setCalcTeamSize(parseInt(e.target.value))}
                    className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                    <span>1 Solo</span>
                    <span>10 Team</span>
                    <span>20+ Betrieb</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-slate-200">
                      Offerten & Rechnungen pro Monat:
                    </label>
                    <span className="font-mono font-bold text-amber-400 text-lg">
                      {calcDocCount} Dokumente
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={calcDocCount}
                    onChange={(e) => setCalcDocCount(parseInt(e.target.value))}
                    className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                    <span>5 klein</span>
                    <span>50 mittel</span>
                    <span>100+ intensiv</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  * Berechnet auf Basis von 45 Min. Ersparnis pro Offerte/Rechnung und 1.5 Std. pro Monteur für Rapport- und Quittungsverwaltung bei einem Schweizer Handwerker-Stundensatz von CHF 85.–.
                </p>
              </div>

              {/* Live Calculated Output */}
              <div className="bg-gradient-to-br from-amber-500/20 via-slate-800/80 to-slate-900 p-5 sm:p-8 rounded-2xl border border-amber-400/30 text-center space-y-6">
                <div>
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Ihre monatliche Bürozeit-Ersparnis
                  </span>
                  <div className="text-4xl sm:text-5xl font-black font-mono text-amber-300 mt-2">
                    ~{hoursSavedPerMonth} Std.
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">weniger Zettelwirtschaft pro Monat</span>
                </div>

                <div className="pt-4 border-t border-slate-700/60">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Monatlicher Wertzuwachs / Ersparnis
                  </span>
                  <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400 mt-2">
                    CHF {moneySavedPerMonth.toLocaleString('de-CH')}.–
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">Mehr Zeit für bezahlte Handwerksarbeit</span>
                </div>

                <button
                  onClick={onGoToRegistration}
                  className="w-full py-4 text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 rounded-xl shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
                >
                  Jetzt CHF {moneySavedPerMonth.toLocaleString('de-CH')} sparen & 14 Tage testen →
                </button>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 12. USE CASES: "EIN TOOL. ALLE GEWERKE." */}
      {/* ========================================================================= */}
      <section id="gewerke" className="py-20 bg-slate-50/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs uppercase font-bold tracking-wider text-amber-800 bg-amber-100/80 border border-amber-200/60 px-3 py-1 rounded-full">
              Massgeschneidert
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-4 tracking-tight">
              Ein Tool. Für alle Schweizer Gewerke.
            </h2>
            <p className="text-base text-slate-600 mt-3">
              Egal ob 1-Mann-Betrieb oder 20 Monteure: Kinetic Craft passt sich Ihren branchenspezifischen Arbeitsabläufen an.
            </p>
          </div>

          {/* Gewerk Filter Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            <button
              onClick={() => setSelectedGewerk('alle')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                selectedGewerk === 'alle'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Alle Gewerke
            </button>
            {gewerkeList.map((g) => {
              const isSelected = selectedGewerk === g.id
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGewerk(g.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-amber-700 text-white shadow-sm shadow-amber-900/20'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <TradeIcon
                    tradeId={g.id}
                    className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-200' : 'text-slate-700'}`}
                  />
                  <span>{g.title.split(' & ')[0]}</span>
                </button>
              )
            })}
          </div>

          {/* Gewerke Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGewerke.map((g) => (
              <div
                key={g.id}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md hover:shadow-amber-500/10 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50/80 border border-amber-200/60 shadow-xs flex items-center justify-center text-slate-800 mb-4 group-hover:scale-110 group-hover:border-amber-300 group-hover:bg-amber-100/70 transition-all duration-300">
                    <TradeIcon tradeId={g.id} className="w-6 h-6 text-slate-800 group-hover:text-amber-900 transition-colors" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{g.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">{g.desc}</p>
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-amber-700">
                  <span className="flex items-center gap-1.5">
                    <IconSparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{g.highlight}</span>
                  </span>
                  <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 13. TARIFE & UPGRADES */}
      {/* ========================================================================= */}
      <section id="tarife" className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs uppercase font-bold tracking-wider text-amber-800 bg-amber-100/80 border border-amber-200/60 px-3 py-1 rounded-full">
              Transparente Tarife
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-4 tracking-tight">
              Tarife & Upgrades
            </h2>
            <p className="text-base text-slate-600 mt-3">
              Wählen Sie den passenden Plan für Ihren Handwerksbetrieb. Keine versteckten Kosten.
            </p>

            {/* Monthly / Yearly Toggle */}
            <div className="mt-8 inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monatlich
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  billingCycle === 'yearly'
                    ? 'bg-white text-amber-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Jährlich</span>
                <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                  10% Rabatt
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            
            {/* 1. Starter / Free Plan */}
            <div className="border border-slate-200 rounded-2xl p-6 sm:p-8 bg-white flex flex-col justify-between relative shadow-xs">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h3 className="text-xl font-bold text-slate-900">Starter / Free</h3>
                  <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">Basis</span>
                </div>
                <div className="text-3xl font-black text-slate-900 my-4 font-mono">
                  CHF 0 <span className="text-xs font-normal text-slate-500 font-sans">/ Monat</span>
                </div>
                <p className="text-xs text-slate-500 mb-6">Ideal für Solo-Handwerker zum Kennenlernen und für kleinere Aufträge.</p>
                
                <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                  <li className="flex items-center gap-2">
                    <IconCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Bis zu 20 Kunden</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <IconCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Standard Offerten & Rechnungen</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <IconCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Schweizer QR-Code Generierung</span>
                  </li>
                  <li className="flex items-center gap-2 text-slate-400">
                    <IconClose className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Gemini KI Belegscanner & Diktat</span>
                  </li>
                  <li className="flex items-center gap-2 text-slate-400">
                    <IconClose className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Treuhand-Portal & Banana Export</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onGoToRegistration}
                className="mt-8 w-full py-3 text-xs sm:text-sm font-bold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer"
              >
                Kostenlos starten
              </button>
            </div>

            {/* 2. Professional Plan */}
            <div className="border-2 border-amber-400 rounded-2xl p-6 sm:p-8 bg-gradient-to-b from-amber-50/40 via-white to-yellow-50/20 flex flex-col justify-between relative shadow-xl ring-1 ring-amber-400/20 transform lg:-translate-y-2">
              <span className="absolute -top-3 right-6 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
                Beliebteste Wahl
              </span>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h3 className="text-xl font-bold text-slate-900">Professional</h3>
                  <span className="text-xs bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-bold">Unbegrenzt</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-amber-700 my-4 font-mono">
                  {billingCycle === 'yearly' ? 'CHF 44.00' : 'CHF 49.00'} <span className="text-xs font-normal text-slate-500 font-sans">/ Monat</span>
                </div>
                <p className="text-xs text-slate-600 mb-6">Für wachsende Handwerksbetriebe, die ihr Büro vollständig digitalisieren wollen.</p>

                <ul className="space-y-3 text-xs sm:text-sm text-slate-800">
                  <li className="flex items-center gap-2 font-medium">
                    <IconCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Unbegrenzte Kunden & Projekte</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <IconCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Unbegrenzte Offerten & QR-Rechnungen</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <IconCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Gemini 3.8 Flash Beleg-Scanner & Diktat</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <IconCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Banana Buchhaltung & Treuhand-Export</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <IconCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Zefix-Handelsregisterabgleich & Live-Wetter</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <IconCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Eigenes Briefpapier, Firmenlogo & Farben</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 space-y-2">
                <button
                  onClick={onGoToRegistration}
                  className="w-full py-3.5 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-700 hover:to-amber-900 text-white shadow-md shadow-amber-600/25 transition-all cursor-pointer"
                >
                  14 Tage kostenlos testen
                </button>
                <p className="text-[11px] text-center text-slate-500">Keine Kreditkarte nötig · Endet automatisch</p>
              </div>
            </div>

            {/* 3. Enterprise Plan */}
            <div className="border border-slate-200 rounded-2xl p-6 sm:p-8 bg-white flex flex-col justify-between relative shadow-xs">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h3 className="text-xl font-bold text-slate-900">Enterprise</h3>
                  <span className="text-xs bg-slate-900 text-white px-2.5 py-0.5 rounded-full font-bold">Massgeschneidert</span>
                </div>
                <div className="text-3xl font-black text-slate-900 my-4">
                  Auf Anfrage
                </div>
                <p className="text-xs text-slate-500 mb-6">Für Betriebe mit individuellen Anforderungen, Schnittstellen und Datenübernahme.</p>

                <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                  <li className="flex items-center gap-2">
                    <IconCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Alle Funktionen aus Professional</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <IconCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Persönliche Datenmigration (Bexio, Sorba, Excel)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <IconCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Team-Schulung vor Ort oder per Video</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <IconCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Fester Schweizer Ansprechpartner</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <IconCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Massgeschneiderte SLA & Prioritäts-Support</span>
                  </li>
                </ul>
              </div>

              <a
                href="#anfrage"
                className="mt-8 block w-full py-3 text-center text-xs sm:text-sm font-bold rounded-xl border border-slate-900 bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
              >
                Offerte anfordern
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 14. INTERAKTIVE OFFERTEN- & DEMO-ANFRAGE */}
      {/* ========================================================================= */}
      <section id="anfrage" className="py-20 bg-slate-50/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-5 sm:p-8 md:p-12 rounded-3xl border border-slate-200 shadow-lg">
            
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs uppercase font-bold tracking-wider text-amber-900 bg-amber-100/80 border border-amber-200/60 px-3 py-1 rounded-full">
                Persönliche Beratung
              </span>
              <h2 className="text-3xl font-black text-slate-900 mt-4 tracking-tight">
                Unverbindliche Offerte & 1:1 Demo anfragen
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                Teilen Sie uns kurz Ihre Anforderungen mit. Unser Schweizer Team meldet sich innerhalb von 24 Stunden bei Ihnen.
              </p>
            </div>

            {inquirySubmitted ? (
              <div className="bg-amber-50/50 p-8 rounded-2xl border border-amber-200 text-center space-y-4 shadow-sm animate-fade-in">
                <div className="w-14 h-14 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto">
                  <IconCheck className="w-7 h-7 text-amber-800" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Vielen Dank für Ihre Anfrage!</h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Wir haben Ihre Angaben erhalten und prüfen Ihr massgeschneidertes Paket für {inquiryData.firma || 'Ihren Betrieb'}.
                </p>
                <div className="pt-4">
                  <button
                    onClick={onGoToRegistration}
                    className="px-6 py-3 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer"
                  >
                    Jetzt schon 14 Tage unverbindlich testen →
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} className="space-y-6">
                
                {/* 1. Gewerk & Betriebsgrösse */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Ihr Gewerk
                    </label>
                    <select
                      value={inquiryData.gewerk}
                      onChange={(e) => setInquiryData({ ...inquiryData, gewerk: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="Schreinerei">Schreinerei & Holzbau</option>
                      <option value="Malerei">Maler & Gipser</option>
                      <option value="Elektro">Elektro & Gebäudeautomation</option>
                      <option value="Sanitaer">Sanitär & Heizung</option>
                      <option value="Gartenbau">Garten- & Landschaftsbau</option>
                      <option value="Bau">Bauunternehmung & Renovation</option>
                      <option value="Anderes">Anderes Handwerk</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Betriebsgrösse
                    </label>
                    <select
                      value={inquiryData.teamSize}
                      onChange={(e) => setInquiryData({ ...inquiryData, teamSize: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="1 Person">1 Person (Solo-Handwerker)</option>
                      <option value="2-5 Mitarbeiter">2 - 5 Mitarbeiter</option>
                      <option value="6-15 Mitarbeiter">6 - 15 Mitarbeiter</option>
                      <option value="15+ Mitarbeiter">Mehr als 15 Mitarbeiter</option>
                    </select>
                  </div>
                </div>

                {/* 2. Kontaktdaten */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Vor- & Nachname *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="z. B. Beat Keller"
                      value={inquiryData.name}
                      onChange={(e) => setInquiryData({ ...inquiryData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Firma / Betrieb *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="z. B. Keller Holzbau AG"
                      value={inquiryData.firma}
                      onChange={(e) => setInquiryData({ ...inquiryData, firma: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      E-Mail-Adresse *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@betrieb.ch"
                      value={inquiryData.email}
                      onChange={(e) => setInquiryData({ ...inquiryData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Telefonnummer (optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="044 123 45 67"
                      value={inquiryData.telefon}
                      onChange={(e) => setInquiryData({ ...inquiryData, telefon: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Nachricht / Besondere Wünsche (optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="z. B. Datenmigration aus Altsoftware gewünscht, Schnittstelle zu Treuhand..."
                    value={inquiryData.bemerkung}
                    onChange={(e) => setInquiryData({ ...inquiryData, bemerkung: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl text-base shadow-md shadow-amber-900/20 transition-all cursor-pointer"
                >
                  Unverbindliche Offerte anfordern →
                </button>

                <p className="text-center text-xs text-slate-500">
                  Ihre Daten werden vertraulich behandelt und ausschliesslich zur Beantwortung Ihrer Anfrage genutzt.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 15. FAQ ACCORDION */}
      {/* ========================================================================= */}
      <section id="faq" className="py-20 bg-slate-50/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs uppercase font-bold tracking-wider text-amber-800 bg-amber-100/80 border border-amber-200/60 px-3 py-1 rounded-full">
              Häufige Fragen
            </span>
            <h2 className="text-3xl font-black text-slate-900 mt-4 tracking-tight">
              Häufig gestellte Fragen
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Alles, was Sie über den Einstieg in Kinetic Craft wissen müssen.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx
              return (
                <div
                  key={idx}
                  className="border border-slate-200 rounded-2xl overflow-hidden transition-all bg-white shadow-2xs"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                    className="w-full p-5 text-left font-bold text-sm sm:text-base text-slate-900 flex justify-between items-center hover:bg-slate-50/80 cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <span className="text-xl text-slate-400 font-normal ml-4">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-12 p-6 bg-gradient-to-r from-amber-50 via-yellow-50/60 to-orange-50/40 rounded-2xl border border-amber-200 text-center">
            <p className="text-sm font-semibold text-slate-900">
              Haben Sie eine spezifische Frage zu Ihrem Betrieb?
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Kontaktieren Sie unser Schweizer Support-Team direkt unter{' '}
              <a href="mailto:support@ki-netic.ch" className="font-bold underline text-amber-800 hover:text-amber-950">support@ki-netic.ch</a>
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 16. BOTTOM CALL-TO-ACTION BANNER */}
      {/* ========================================================================= */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 mb-6">
            <IconSparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Bereit für weniger Büro & mehr Handwerk?</span>
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Starten Sie noch heute mit <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 bg-clip-text text-transparent">Kinetic Craft.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Erstellen Sie Ihre erste Schweizer QR-Rechnung in unter 60 Sekunden. 14 Tage unverbindlich testen – keine Kreditkarte erforderlich.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onGoToRegistration}
              className="w-full sm:w-auto px-8 py-4 text-base font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 rounded-2xl shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              14 Tage kostenlos testen
            </button>
            <button
              onClick={onGoToLogin}
              className="w-full sm:w-auto px-7 py-4 text-base font-semibold text-white hover:bg-white/10 border border-white/20 rounded-2xl transition-all cursor-pointer"
            >
              Bestehender Kunde? Einloggen
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 17. FOOTER */}
      {/* ========================================================================= */}
      <footer className="bg-white border-t border-slate-200 py-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-100">
            
            {/* Col 1: Brand & Origin */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <KineticLogoMark className="w-8 h-8 text-slate-900" />
                <div>
                  <span className="font-extrabold text-sm text-slate-900">Kinetic Craft</span>
                  <span className="text-[11px] text-slate-400 block -mt-0.5">by Kinetic Schweiz</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Das moderne Handwerker-CRM für Schweizer Betriebe mit nativer Gemini AI, Zefix-Schnittstelle und 100% Swiss QR-Rechnung.
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-700 font-semibold pt-1">
                <IconSwissFlag className="w-4 h-4 rounded shadow-xs shrink-0" />
                <span>Swiss Made Software</span>
              </div>
            </div>

            {/* Col 2: Produkt */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Produkt</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#funktionen" className="hover:text-amber-600">Funktionsübersicht</a></li>
                <li><a href="#ki-superpowers" className="hover:text-amber-600">Gemini KI Superpowers</a></li>
                <li><a href="#einblicke" className="hover:text-amber-600">App-Screenshots</a></li>
                <li><a href="#baustellen-cockpit" className="hover:text-amber-600">Baustellen-Cockpit</a></li>
                <li><a href="#rechner" className="hover:text-amber-600">Ersparnis-Rechner</a></li>
                <li><a href="#tarife" className="hover:text-amber-600">Tarife & Upgrades</a></li>
                <li><button onClick={onGoToRegistration} className="hover:text-amber-600 cursor-pointer">14 Tage Testzugang</button></li>
              </ul>
            </div>

            {/* Col 3: Schweizer Standards */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Standards & Recht</h4>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center gap-1.5 text-slate-600">
                  <IconCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Schweizer QR-Bill (ISO 20022)</span>
                </li>
                <li className="flex items-center gap-1.5 text-slate-600">
                  <IconCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Banana Buchhaltung Export</span>
                </li>
                <li className="flex items-center gap-1.5 text-slate-600">
                  <IconCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Zefix Handelsregister API</span>
                </li>
                <li className="flex items-center gap-1.5 text-slate-600">
                  <IconCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Schweizer Datenschutz (DSG)</span>
                </li>
              </ul>
            </div>

            {/* Col 4: Kinetic Schweiz Kontakt */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Kinetic Schweiz</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Vertrieb, Betreuung & Implementierung für Schweizer Betriebe.
              </p>
              <div className="mt-3 space-y-1.5 text-xs">
                <p>E-Mail: <a href="mailto:support@ki-netic.ch" className="font-bold text-amber-700 hover:underline">support@ki-netic.ch</a></p>
                <p>Web: <span className="font-semibold text-slate-700">kinetic-schweiz.ch</span></p>
                <div className="pt-2">
                  <button
                    onClick={onGoToLogin}
                    className="text-xs font-bold text-slate-700 hover:text-amber-700 underline cursor-pointer"
                  >
                    Kunden-Login öffnen →
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom copyright & legal links */}
          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
            <div>
              © {new Date().getFullYear()} Kinetic Idrissi. Alle Rechte vorbehalten. Kinetic Craft – Handwerker-Software für die Schweiz.
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={onOpenDatenschutz} 
                className="hover:text-amber-700 underline cursor-pointer text-slate-500 hover:text-slate-900 transition-colors"
              >
                Datenschutz (DSG)
              </button>
              <span>•</span>
              <button 
                onClick={onOpenImpressum} 
                className="hover:text-amber-700 underline cursor-pointer text-slate-500 hover:text-slate-900 transition-colors"
              >
                Impressum
              </button>
              <span>•</span>
              <span className="text-slate-400">ISO 27001 Datensicherheit</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 18. STICKY BOTTOM CTA BAR (Appears on deep scroll) */}
      {/* ========================================================================= */}
      {showStickyCta && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 py-3 px-4 shadow-2xl transition-all transform animate-fade-in">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <KineticLogoMark className="w-8 h-8 text-slate-900 shrink-0 hidden sm:block" />
              <div>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 block leading-tight">
                  Kinetic Craft – Schweizer Handwerker-CRM
                </span>
                <span className="text-[11px] text-slate-500 hidden md:block">
                  Mit Gemini AI Beleg-Scanner & 100% Swiss QR-Rechnung in 60s
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={onGoToLogin}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer hidden sm:block"
              >
                Einloggen
              </button>
              <button
                onClick={onGoToRegistration}
                className="px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>14 Tage kostenlos testen</span>
                <span className="text-amber-200">→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 19. SCREENSHOT ZOOM MODAL */}
      {/* ========================================================================= */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <div 
            className="relative max-w-6xl w-full max-h-[92vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-4 py-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700">Kinetic Craft – Live Screenshot-Vorschau</span>
              <button 
                onClick={() => setZoomedImage(null)} 
                className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm font-bold px-2 py-1 cursor-pointer"
              >
                <IconClose className="w-4 h-4" />
                <span>Schliessen</span>
              </button>
            </div>
            <div className="overflow-auto max-h-[calc(92vh-60px)] p-2">
              <img src={zoomedImage} alt="Vergrösserter Screenshot" className="w-full h-auto rounded-lg" />
            </div>
          </div>
        </div>
      )}

      {/* Swiss DSG Privacy Information Banner */}
      <DsgBanner onOpenDatenschutz={onOpenDatenschutz} />

    </div>
  )
}
