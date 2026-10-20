import React, { useState, useEffect, useRef } from 'react'
import KineticLogoMark from '../components/KineticLogoMark'
import DsgBanner from '../components/legal/DsgBanner'
import {
  QrAndMahnwesenSandbox,
  KiAndPrivateCloudSandbox,
  NpkAndSiaGewerkSandbox,
} from '../components/landing/InteractiveTechSandboxes'
import {
  TradeIcon,
  IconDatenschutz,
  IconPhotoScanner,
  IconMapsRoute,
  IconDigitalSignature,
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
  IconClock,
  IconBank,
  IconDocument,
  IconShieldCheck,
  IconMoney,
} from '../components/icons/BrandIcons'

const MARKETING_PAGES = [
  {
    id: 'home',
    path: '/',
    label: 'Übersicht',
    shortTitle: 'Home & Live-Vorschau',
    subtitle: 'High-Impact Überblick, 4-Phasen-Workflow & Mobile Baustelle',
  },
  {
    id: 'funktionen',
    path: '/funktionen',
    label: 'Funktionen & Finanzen',
    shortTitle: 'Cockpit, QR-Bill & Treuhand',
    subtitle: 'ISO 20022 QR-Rechnung, 3-Stufen-Mahnwesen, Banana-Export & Zefix',
  },
  {
    id: 'ki-cloud',
    path: '/ki-cloud',
    label: 'KI & Private Cloud',
    badge: 'revDSG',
    shortTitle: 'Gemini KI & Schweizer Private Cloud',
    subtitle: 'Belegscan, Sprachdiktat & dedizierter Private AI Node (Zürich/Genf)',
  },
  {
    id: 'gewerke',
    path: '/gewerke',
    label: 'Branchen & NPK',
    shortTitle: 'Gewerke & SIA 118 / NPK',
    subtitle: 'Schreiner, Maler, Elektro, Sanitär, Gartenbau & Bauunternehmung',
  },
  {
    id: 'preise',
    path: '/preise',
    label: 'Preise & Rechner',
    shortTitle: 'Tarife, ROI-Rechner & Demo',
    subtitle: 'Transparente Schweizer Pakete, Ersparnis-Rechner, FAQ & Beratung',
  },
]

function resolvePageFromPathname(pathname) {
  if (!pathname) return 'home'
  const clean = pathname.replace(/^\/+|\/+$/g, '').toLowerCase()
  if (clean === 'funktionen') return 'funktionen'
  if (clean === 'ki-cloud' || clean === 'private-cloud' || clean === 'datensicherheit') return 'ki-cloud'
  if (clean === 'gewerke' || clean === 'branchen') return 'gewerke'
  if (clean === 'preise' || clean === 'tarife' || clean === 'rechner') return 'preise'
  return 'home'
}

export default function LandingPageView({
  onGoToLogin,
  onGoToRegistration,
  onOpenImpressum,
  onOpenDatenschutz,
  initialPage,
}) {
  // Active Subpage ('home' | 'funktionen' | 'ki-cloud' | 'gewerke' | 'preise')
  const [activePage, setActivePage] = useState(() => {
    if (initialPage) return initialPage
    if (typeof window !== 'undefined') {
      return resolvePageFromPathname(window.location.pathname)
    }
    return 'home'
  })

  const pageHeadingRef = useRef(null)

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

  // Browser Back/Forward Listener for Subpage URLs
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handlePopState = (event) => {
      const nextFromState = event.state?.marketingPage
      const resolved = nextFromState || resolvePageFromPathname(window.location.pathname)
      setActivePage(resolved)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Navigate between the 5 subpages with View Transitions API + Accessibility Focus Routing
  const navigateToSubpage = (targetPageId, options = {}) => {
    const pageMeta = MARKETING_PAGES.find((p) => p.id === targetPageId) || MARKETING_PAGES[0]
    setMobileMenuOpen(false)

    const applyUpdate = () => {
      setActivePage(pageMeta.id)
      if (typeof window !== 'undefined') {
        const targetUrl = options.anchor ? `${pageMeta.path}#${options.anchor}` : pageMeta.path
        window.history.pushState({ marketingPage: pageMeta.id }, '', targetUrl)
      }
    }

    const afterTransition = () => {
      if (typeof window !== 'undefined') {
        if (options.anchor) {
          const el = document.getElementById(options.anchor)
          if (el && typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ behavior: 'smooth' })
          }
        } else if (typeof window.scrollTo === 'function') {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }
      pageHeadingRef.current?.focus({ preventScroll: true })
    }

    if (typeof document !== 'undefined' && typeof document.startViewTransition === 'function') {
      const transition = document.startViewTransition(() => {
        applyUpdate()
      })
      transition.finished.finally(() => {
        afterTransition()
      })
    } else {
      applyUpdate()
      afterTransition()
    }
  }

  // ROI Calculation Formulas (grounded in Swiss craft trade operations)
  const hoursSavedPerMonth = Math.round(calcDocCount * 0.6 + calcTeamSize * 1.5)
  const moneySavedPerMonth = hoursSavedPerMonth * 85

  // Lead / Quote Inquiry Form State
  const [inquiryData, setInquiryData] = useState({
    gewerk: 'Schreinerei',
    teamSize: '2-5 Mitarbeiter',
    paketWunsch: 'private_node',
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

  // Context-aware jump to inquiry form on /preise
  const handleJumpToInquiry = ({ gewerk, paketWunsch } = {}) => {
    setInquiryData((prev) => ({
      ...prev,
      ...(gewerk ? { gewerk } : {}),
      ...(paketWunsch ? { paketWunsch } : {}),
    }))
    navigateToSubpage('preise', { anchor: 'anfrage' })
  }

  // Gewerke Data
  const gewerkeList = [
    {
      id: 'schreinerei',
      formValue: 'Schreinerei',
      title: 'Schreinerei & Innenausbau',
      desc: 'Massgenaue Offerten mit Holzarten, Kanten, Beschlägen und Montagezeiten. 1-Klick Umwandlung in Werkstattauftrag.',
      highlight: 'Massberechnung & Materialdeklaration',
    },
    {
      id: 'maler',
      formValue: 'Malerei',
      title: 'Maler & Gipser',
      desc: 'Schnelle Quadratmeter-Berechnungen für Wände, Decken und Fassaden. Inklusive Farbton-Dokumentation und Regierapporten.',
      highlight: 'm²-Aufmass & Regieberichte',
    },
    {
      id: 'elektro',
      formValue: 'Elektro',
      title: 'Elektro & Gebäudeautomation',
      desc: 'Installations- und Prüfprotokolle direkt beim Kunden digital signieren lassen. Material und Arbeitsstunden sekundengenau abrechnen.',
      highlight: 'Installationsrapporte & Signatur',
    },
    {
      id: 'sanitaer',
      formValue: 'Sanitaer',
      title: 'Sanitär & Heizung',
      desc: 'Wartungsaufträge, Service-Einsätze und Notfalldienst sauber planen. Automatische Zahlungserinnerungen mit Schweizer QR-Code.',
      highlight: 'Service-Verträge & QR-Rechnung',
    },
    {
      id: 'gartenbau',
      formValue: 'Gartenbau',
      title: 'Garten- & Landschaftsbau',
      desc: 'Saisonale Pflegeverträge, Pflanzlisten und Maschinenstunden transparent kalkulieren und mit Fotos dokumentieren.',
      highlight: 'Pflege-Abonnemente & Maschinen',
    },
    {
      id: 'bau',
      formValue: 'Bau',
      title: 'Bauunternehmung & Renovation',
      desc: 'Mehrere Baustellen und Subunternehmer parallel steuern. Belege direkt per Handy-Kamera scannen und der Baustelle zuweisen.',
      highlight: 'Baustellen-Ablage & Beleg-Scanner',
    },
  ]

  const filteredGewerke =
    selectedGewerk === 'alle'
      ? gewerkeList
      : gewerkeList.filter((g) => g.id === selectedGewerk)

  // App Screenshots Showcase Data
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

  const activeTabDetails = showcaseTabs.find((t) => t.id === activeShowcaseTab) || showcaseTabs[0]

  // FAQ Data
  const faqs = [
    {
      q: 'Wie funktioniert die Schweizer QR-Rechnung in Kinetic Craft?',
      a: 'Kinetic Craft generiert automatisch vollumfänglich standardkonforme Schweizer QR-Rechnungen nach ISO 20022 mit offizieller QR-IBAN, Creditor Reference (oder SCOR) und Betrag. Ihre Kunden können die Rechnung mit jeder Schweizer Banking-App in Sekundenschnelle einscannen und bezahlen.',
    },
    {
      q: 'Was beinhaltet die 14-tägige kostenlose Testphase?',
      a: 'Sie erhalten sofort vollen Zugriff auf alle Funktionen von Kinetic Craft Professional – ohne Eingabe einer Kreditkarte und ohne automatische Verlängerung. Nach den 14 Tagen können Sie nahtlos für CHF 49.– / Monat weiterarbeiten. Ihre Daten, Baustellen und Dokumente bleiben stets sicher erhalten.',
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
      q: 'Wo werden meine Unternehmensdaten gespeichert und wie steht es um den Schweizer Datenschutz (revDSG)?',
      a: 'Kinetic Craft garantiert 100 % Konformität mit dem neuen Schweizer Datenschutzgesetz (revDSG): Ihre Daten liegen isoliert und verschlüsselt in Schweizer und europäischen ISO/IEC 27001 zertifizierten Hochsicherheits-Rechenzentren. Ihre Firmendaten, Offerten und Kundenadressen werden niemals zum Training öffentlicher KI-Modelle verwendet. Für maximale Souveränität bieten wir mit dem «Private AI Node» zudem eine vollkommen isolierte, dedizierte Schweizer Instanz (Infomaniak / Exoscale in Zürich oder Genf) – völlig frei vom US CLOUD Act und ohne jegliche Serverwartung für Ihren Betrieb.',
    },
    {
      q: 'Wer steht hinter Kinetic Craft und Kinetic Schweiz?',
      a: 'Kinetic Schweiz vertreibt und betreut Kinetic Craft als spezialisierte Unternehmenslösung für das Schweizer Handwerk. Unser Fokus liegt auf kompromissloser Benutzerfreundlichkeit, Schweizer Präzision und persönlichem Support.',
    },
  ]

  // Calculate previous and next subpage for the Bottom Page Switcher
  const currentPageIdx = MARKETING_PAGES.findIndex((p) => p.id === activePage)
  const prevPage = MARKETING_PAGES[(currentPageIdx - 1 + MARKETING_PAGES.length) % MARKETING_PAGES.length]
  const nextPage = MARKETING_PAGES[(currentPageIdx + 1) % MARKETING_PAGES.length]

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#FAF9F6] text-slate-900 font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* ========================================================================= */}
      {/* 1. TOP ANNOUNCEMENT BANNER */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/15 to-amber-600/10 border-b border-amber-200/80 px-4 py-1.5 text-center text-xs sm:text-sm font-medium text-slate-900 flex items-center justify-center gap-2">
        <IconSwissFlag className="w-4 h-4 rounded shadow-xs shrink-0" />
        <span>
          <strong>Kinetic Schweiz</strong> präsentiert: <strong>Kinetic Craft</strong> mit Gemini AI Beleg-Scanner, Private AI Node & 100% Swiss QR-Rechnung.
        </span>
        <button
          onClick={onGoToRegistration}
          className="hidden md:inline-flex items-center font-bold text-amber-800 hover:text-amber-950 underline underline-offset-2 ml-1 cursor-pointer"
        >
          Jetzt 14 Tage kostenlos testen →
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. STICKY GLASSMORPHISM MULTI-PAGE TECH HEADER */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          {/* Kinetic Craft Brand Logo (Clicks back to Home '/') */}
          <button
            type="button"
            onClick={() => navigateToSubpage('home')}
            className="flex items-center gap-3 text-left cursor-pointer group focus:outline-none"
          >
            <KineticLogoMark className="w-9 h-9 sm:w-10 sm:h-10 text-slate-900 shrink-0 group-hover:scale-105 transition-transform" />
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
          </button>

          {/* Desktop 5-Subpage Navigation Pills */}
          <nav
            aria-label="Hauptnavigation"
            className="hidden lg:flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80"
          >
            {MARKETING_PAGES.map((page) => {
              const isCurrent = activePage === page.id
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => navigateToSubpage(page.id)}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`px-3.5 py-1.5 rounded-xl text-xs xl:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                  }`}
                >
                  <span>{page.label}</span>
                  {page.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
                        isCurrent
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {page.badge}
                    </span>
                  )}
                </button>
              )
            })}
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

        {/* Mobile Subpage Switcher Bar (Always visible on mobile/tablet below header) */}
        <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto px-4 py-2 bg-slate-50/90 border-t border-slate-200/60 no-scrollbar">
          {MARKETING_PAGES.map((page) => {
            const isCurrent = activePage === page.id
            return (
              <button
                key={page.id}
                type="button"
                onClick={() => navigateToSubpage(page.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                  isCurrent
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                <span>{page.label}</span>
              </button>
            )
          })}
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg animate-fade-in">
            <nav className="flex flex-col space-y-1.5 text-sm font-semibold text-slate-700">
              {MARKETING_PAGES.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => navigateToSubpage(page.id)}
                  className={`px-3.5 py-2.5 rounded-xl text-left flex items-center justify-between ${
                    activePage === page.id ? 'bg-amber-50 text-amber-900 font-bold' : 'hover:bg-slate-50'
                  }`}
                >
                  <span>{page.shortTitle}</span>
                  <span className="text-xs text-slate-400">→</span>
                </button>
              ))}
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

      {/* Main Content Container with programmatic focus target for View Transitions */}
      <main ref={pageHeadingRef} tabIndex={-1} className="focus:outline-none">
        {/* ========================================================================= */}
        {/* SUBPAGE 1: HOME (`/`) - HIGH-IMPACT PITCH, WORKFLOW & TECH PORTALS        */}
        {/* ========================================================================= */}
        {activePage === 'home' && (
          <>
            {/* HERO SECTION */}
            <section className="relative pt-6 pb-12 sm:pt-10 sm:pb-16 md:pt-12 md:pb-20 overflow-hidden bg-gradient-to-b from-white via-amber-50/25 to-[#FAF9F6]">
              <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[650px] h-[300px] bg-gradient-to-r from-amber-200/40 via-yellow-200/30 to-orange-200/20 blur-3xl -z-10 rounded-full pointer-events-none" />

              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-amber-300 text-amber-950 text-xs sm:text-sm font-semibold mb-4 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
                  <span>Handwerk 2.0: Schweizer Präzision trifft Gemini AI · 100% Swiss QR-Bill</span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] max-w-4xl mx-auto">
                  Das Handwerker-CRM, <br className="hidden sm:inline" />
                  <span className="bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-700 bg-clip-text text-transparent">
                    das mitdenkt.
                  </span>
                </h1>

                <p className="mt-4 sm:mt-5 text-base sm:text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
                  Schluss mit Zettelwirtschaft am Feierabend: <strong>Belege per Gemini KI scannen</strong>, Offerten per Spracheingabe auf der Baustelle erfassen und Rechnungen mit <strong>Schweizer QR-Code in unter 60 Sekunden</strong> drucken oder versenden.
                </p>

                <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                  <button
                    onClick={onGoToRegistration}
                    className="w-full sm:w-auto px-8 py-3.5 text-base font-bold text-white bg-amber-700 hover:bg-amber-800 active:bg-amber-900 rounded-2xl shadow-lg shadow-amber-900/20 hover:shadow-xl hover:shadow-amber-900/30 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-3"
                  >
                    <span>14 Tage kostenlos testen</span>
                    <span className="text-amber-100 font-normal">→</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToSubpage('ki-cloud')}
                    className="w-full sm:w-auto px-7 py-3.5 text-base font-semibold text-slate-800 hover:text-slate-950 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>🇨🇭 KI & Schweizer Private Cloud</span>
                    <span className="text-amber-700 font-bold">→</span>
                  </button>
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

              {/* HERO DESKTOP REAL BENTO SCREENSHOT */}
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 sm:mt-12">
                <div className="relative rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden bg-white ring-1 ring-black/5">
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

                  <div
                    className="relative group cursor-pointer"
                    onClick={() => setZoomedImage('/screenshots/01_hero_dashboard.png')}
                  >
                    <img
                      src="/screenshots/01_hero_dashboard.png"
                      alt="Kinetic Craft Dashboard Übersicht"
                      fetchPriority="high"
                      className="w-full h-auto block transition-transform duration-300 group-hover:scale-[1.005]"
                    />
                    <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="px-4 py-2 bg-white/90 backdrop-blur-md rounded-full text-xs font-bold text-slate-800 shadow-md inline-flex items-center gap-1.5">
                        <IconSearch className="w-3.5 h-3.5 text-slate-700" />
                        Klicken für Vollbild-Vorschau
                      </span>
                    </div>
                  </div>
                </div>

                {/* Feature Highlight Ribbon under Hero Mockup */}
                <div className="mt-4 sm:mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-left">
                  <button
                    type="button"
                    onClick={() => navigateToSubpage('funktionen')}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200/90 hover:border-amber-400 shadow-xs transition-all text-left cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                      <IconSun className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">Baustellen-Wetter</p>
                      <p className="text-[11px] text-slate-500 truncate">Live-Forecast für Bern & Region</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateToSubpage('ki-cloud')}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200/90 hover:border-amber-400 shadow-xs transition-all text-left cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                      <IconSparkles className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">Gemini 3.8 Flash</p>
                      <p className="text-[11px] text-slate-500 truncate">KI-Belegscan in 1,2 Sekunden</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateToSubpage('funktionen')}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200/90 hover:border-amber-400 shadow-xs transition-all text-left cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                      <IconSwissFlag className="w-4 h-4 rounded shrink-0" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">Swiss QR-Bill</p>
                      <p className="text-[11px] text-slate-500 truncate">ISO 20022 & 3-Stufen-Mahnung</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateToSubpage('ki-cloud')}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200/90 hover:border-emerald-400 shadow-xs transition-all text-left cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      <IconDatenschutz className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">Private AI Node</p>
                      <p className="text-[11px] text-slate-500 truncate">100% Swiss Hosted & revDSG</p>
                    </div>
                  </button>
                </div>
              </div>
            </section>

            {/* STATS & SWISS TRUST BAR */}
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

            {/* INTERACTIVE 4-PHASE WORKFLOW SHOWCASE */}
            <section id="einblicke" className="py-20 bg-slate-50/70 border-b border-slate-200/60">
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

                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden transition-all duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
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

                    <div
                      className="lg:col-span-7 bg-slate-100 p-4 sm:p-6 lg:p-8 border-t lg:border-t-0 lg:border-l border-slate-200 cursor-pointer group"
                      onClick={() => setZoomedImage(activeTabDetails.image)}
                    >
                      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg bg-white relative">
                        <img
                          src={activeTabDetails.image}
                          alt={activeTabDetails.alt}
                          loading="lazy"
                          className="w-full h-auto object-cover object-top max-h-[460px] group-hover:scale-[1.01] transition-transform duration-300"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Secondary 2-Card Row */}
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
                        Erstellen Sie professionelle Offerten mit Ihrem Firmenlogo, Schweizer MWST (8.1%) und integriertem QR-Zahlteil nach ISO 20022.
                      </p>
                    </div>
                    <div
                      className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-2 cursor-pointer group mt-2"
                      onClick={() => setZoomedImage('/screenshots/02_offerten_rechnungen.png')}
                    >
                      <img
                        src="/screenshots/02_offerten_rechnungen.png"
                        alt="Kinetic Craft Offerten und Schweizer QR-Rechnung"
                        loading="lazy"
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
                        Alle Liegenschaften, Pläne, Dokumente und Ansprechpartner an einem Ort. Mit Zefix-Handelsregisterabgleich und Google Maps-Verbindung.
                      </p>
                    </div>
                    <div
                      className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-2 cursor-pointer group mt-2"
                      onClick={() => setZoomedImage('/screenshots/03_kunden_baustellen_bento.png')}
                    >
                      <img
                        src="/screenshots/03_kunden_baustellen_bento.png"
                        alt="Kinetic Craft Kunden- und Projektübersicht"
                        loading="lazy"
                        className="w-full h-auto object-cover object-top max-h-[220px] rounded-xl group-hover:scale-[1.01] transition-transform"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 4 DEEP-DIVE TECH PORTALS (BENTO ARCHITECTURE NAVIGATOR) */}
            <section className="py-20 bg-white border-b border-slate-100">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-12">
                  <span className="text-xs uppercase font-bold tracking-wider text-amber-800 bg-amber-100 border border-amber-200 px-3.5 py-1 rounded-full">
                    Plattform-Architektur · 4 Themenwelten
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-4 tracking-tight">
                    Alle Details auf spezialisierten Unterseiten entdecken
                  </h2>
                  <p className="text-base text-slate-600 mt-2">
                    Wählen Sie den Bereich, den Sie mit interaktiven Live-Simulatoren im Detail prüfen möchten:
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Portal 1: Funktionen & Finanzen */}
                  <div
                    onClick={() => navigateToSubpage('funktionen')}
                    className="group p-7 sm:p-8 rounded-3xl bg-[#FAF9F6] border border-slate-200 hover:border-amber-400 shadow-xs hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-mono font-bold uppercase text-amber-800 bg-amber-100 px-3 py-1 rounded-lg border border-amber-200">
                          Unterseite 01 · /funktionen
                        </span>
                        <IconQrBill className="w-6 h-6 text-amber-700" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 group-hover:text-amber-800 transition-colors">
                        Funktionen, Cockpit & Schweizer Finanzen
                      </h3>
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                        Testen Sie unseren interaktiven <strong>3-Stufen-Mahnwesen- & QR-Rechnungs-Simulator</strong>, die Banana-Buchhaltungs-Kontierung nach OR 957ff. sowie die Zefix-Echtzeitabfrage.
                      </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-amber-800">
                      <span>Zur Unterseite «Funktionen & Finanzen»</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>

                  {/* Portal 2: KI & Schweizer Private Cloud */}
                  <div
                    onClick={() => navigateToSubpage('ki-cloud')}
                    className="group p-7 sm:p-8 rounded-3xl bg-slate-950 text-white border border-slate-800 hover:border-emerald-400 shadow-xl transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-mono font-bold uppercase text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-lg border border-emerald-500/30">
                          Unterseite 02 · /ki-cloud
                        </span>
                        <IconShieldCheck className="w-6 h-6 text-emerald-400" />
                      </div>
                      <h3 className="text-2xl font-black text-white group-hover:text-emerald-300 transition-colors">
                        Gemini KI & Schweizer Private Cloud (revDSG)
                      </h3>
                      <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                        Erleben Sie den <strong>Vorher/Nachher Belegscan- & Mundart-Simulator</strong> und erkunden Sie die 4 Sicherheits-Schichten des isolierten «Kinetic Private AI Node» (Zürich/Genf).
                      </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-emerald-400">
                      <span>Zur Unterseite «KI & Private Cloud»</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>

                  {/* Portal 3: Branchen & NPK */}
                  <div
                    onClick={() => navigateToSubpage('gewerke')}
                    className="group p-7 sm:p-8 rounded-3xl bg-[#FAF9F6] border border-slate-200 hover:border-amber-400 shadow-xs hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-mono font-bold uppercase text-amber-800 bg-amber-100 px-3 py-1 rounded-lg border border-amber-200">
                          Unterseite 03 · /gewerke
                        </span>
                        <IconDocument className="w-6 h-6 text-amber-700" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 group-hover:text-amber-800 transition-colors">
                        Branchen, Gewerke & NPK / SIA 118 Kalkulator
                      </h3>
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                        Spezifische Workflows für Schreinerei, Maler, Elektro, Sanitär, Gartenbau & Bau – inklusive <strong>interaktivem NPK-Positions- und Regie-Simulator</strong>.
                      </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-amber-800">
                      <span>Zur Unterseite «Branchen & NPK»</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>

                  {/* Portal 4: Preise & ROI-Rechner */}
                  <div
                    onClick={() => navigateToSubpage('preise')}
                    className="group p-7 sm:p-8 rounded-3xl bg-[#FAF9F6] border border-slate-200 hover:border-amber-400 shadow-xs hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-mono font-bold uppercase text-amber-800 bg-amber-100 px-3 py-1 rounded-lg border border-amber-200">
                          Unterseite 04 · /preise
                        </span>
                        <IconMoney className="w-6 h-6 text-amber-700" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 group-hover:text-amber-800 transition-colors">
                        Preise, Ersparnis-Rechner & 1:1 Live-Demo
                      </h3>
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                        Berechnen Sie Ihre monatliche Zeit- und Kostenersparnis, vergleichen Sie <strong>Professional (CHF 49.–)</strong> mit <strong>Enterprise / Private AI Node</strong> und fordern Sie Ihre Offerte an.
                      </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-amber-800">
                      <span>Zur Unterseite «Preise & Rechner»</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* MOBIL AUF DER BAUSTELLE */}
            <section className="py-24 bg-white relative overflow-hidden">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative rounded-[2.5rem] bg-gradient-to-br from-amber-500/[0.07] via-slate-50/80 to-amber-600/[0.04] border border-amber-200/90 p-8 sm:p-12 lg:p-16 flex flex-col lg:flex-row items-center gap-12 lg:gap-16 shadow-xl shadow-amber-900/[0.04] overflow-hidden">
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
                      <div className="flex items-start gap-3.5 bg-white/90 backdrop-blur-xs p-4 rounded-2xl border border-amber-200/70 shadow-xs">
                        <div className="w-10 h-10 rounded-xl bg-amber-100/80 text-amber-900 flex items-center justify-center shrink-0">
                          <IconPhotoScanner className="w-5 h-5 text-slate-800" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-sm text-slate-900">Foto-Dokumentation & Beleg-Scanner</h4>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            Materialquittungen fotografieren und mit Vorher-Nachher-Kontrolle direkt der Baustelle zuweisen.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3.5 bg-white/90 backdrop-blur-xs p-4 rounded-2xl border border-amber-200/70 shadow-xs">
                        <div className="w-10 h-10 rounded-xl bg-yellow-100/80 text-yellow-900 flex items-center justify-center shrink-0">
                          <IconMapsRoute className="w-5 h-5 text-slate-800" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-sm text-slate-900">Routen & Google Maps Anbindung</h4>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            Mit 1 Klick aus dem CRM direkt die Navigation zur Baustelle starten.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3.5 bg-white/90 backdrop-blur-xs p-4 rounded-2xl border border-amber-200/70 shadow-xs">
                        <div className="w-10 h-10 rounded-xl bg-orange-100/80 text-orange-900 flex items-center justify-center shrink-0">
                          <IconDigitalSignature className="w-5 h-5 text-slate-800" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-sm text-slate-900">Digitale Kundenunterschrift</h4>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            Regierapporte und Bauabnahmen direkt auf dem Display gegenzeichnen lassen.
                          </p>
                        </div>
                      </div>
                    </div>

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

                  {/* Smartphone Mockup with Real Screenshot */}
                  <div className="flex-shrink-0 relative z-10 my-4 lg:my-0">
                    <div className="w-[280px] sm:w-[310px] md:w-[325px] p-2 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 rounded-[48px] shadow-[0_25px_60px_-15px_rgba(15,23,42,0.4)] border border-slate-700/80 relative">
                      <div
                        className="rounded-[40px] overflow-hidden bg-white relative aspect-[9/19] shadow-inner cursor-pointer group/screen border border-slate-950/20"
                        onClick={() => setZoomedImage('/screenshots/06_mobile_baustelle.png')}
                        title="Klicken zum Vergrössern"
                      >
                        <img
                          src="/screenshots/06_mobile_baustelle.png"
                          alt="Kinetic Craft Mobile Ansicht auf der Baustelle"
                          loading="lazy"
                          className="w-full h-full object-cover object-top group-hover/screen:scale-[1.03] transition-transform duration-500 ease-out"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ========================================================================= */}
        {/* SUBPAGE 2: FUNKTIONEN & FINANZEN (`/funktionen`)                          */}
        {/* ========================================================================= */}
        {activePage === 'funktionen' && (
          <>
            {/* Subpage Hero */}
            <section className="pt-10 pb-14 bg-gradient-to-b from-white via-amber-50/30 to-[#FAF9F6] border-b border-slate-200/70">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/90 border border-amber-200 text-amber-900 text-xs font-bold uppercase tracking-wider mb-4">
                  <IconQrBill className="w-3.5 h-3.5 text-amber-700" />
                  <span>Unterseite · Funktionen, Cockpit & Schweizer Finanzen</span>
                </span>
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
                  Schweizer QR-Rechnung, 3-Stufen-Mahnwesen &{' '}
                  <span className="bg-gradient-to-r from-amber-600 to-amber-800 bg-clip-text text-transparent">
                    Smartes Baustellen-Cockpit.
                  </span>
                </h1>
                <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
                  Entwickelt für Schweizer Handwerksbetriebe und ihre Treuhänder: ISO 20022 Zahlteile, automatische Verzugszinsen nach OR Art. 104, Banana-Buchhaltungs-Export und Zefix-Handelsregisterabgleich.
                </p>
              </div>
            </section>

            {/* Interactive Sandbox: QR-Rechnung, 3-Level Dunning & Zefix */}
            <section className="py-16 bg-[#FAF9F6] border-b border-slate-200/60">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <QrAndMahnwesenSandbox onStartTrial={onGoToRegistration} />
              </div>
            </section>

            {/* SCHWEIZER TREUHAND & BANANA-EXPORT */}
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

                      <div className="p-4.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 sm:col-span-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                            <IconShieldCheck className="w-4 h-4 text-amber-600" />
                            <span>Automatischer Liquiditäts-Schutz</span>
                          </div>
                          <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-200/90 text-amber-950 px-2 py-0.5 rounded-md border border-amber-300">
                            3-Stufen-Mahnwesen
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          Keinem Geld mehr hinterherrennen: Freundliche Zahlungserinnerung, 1. Mahnung mit 5% Verzugszins und 2. Mahnung mit neuem Schweizer QR-Zahlteil auf Knopfdruck versandfertig.
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
                        <span className="text-white font-bold">CHF 48&apos;250.00</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-800/60">
                        <span className="text-slate-400">1109 Delkredere (5% Pauschale)</span>
                        <span className="text-amber-400 font-bold">- CHF 2&apos;412.50</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-800/60">
                        <span className="text-slate-400">2200 Geschuldete MWST (8.1%)</span>
                        <span className="text-white font-bold">CHF 3&apos;615.20</span>
                      </div>
                      <div className="flex justify-between py-2 font-bold text-sm text-emerald-400 pt-3">
                        <span>Netto-Forderungsbestand:</span>
                        <span>CHF 45&apos;837.50</span>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-amber-300 font-semibold">Mahnung Stufe 1 aktiv</span>
                        <span className="text-slate-400 hidden sm:inline">· Fällig seit 14 Tagen</span>
                      </div>
                      <span className="text-[11px] font-bold text-amber-200 bg-amber-900/60 border border-amber-600/40 px-2.5 py-1 rounded-md">
                        1-Klick Mahnung mit QR
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* BAUSTELLEN-COCKPIT */}
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
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 transition-all flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
                        <IconSun className="w-5 h-5 text-amber-700" />
                      </div>
                      <h4 className="font-bold text-base text-slate-900 mb-2">Live Baustellen-Wetter</h4>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        Niederschlagsradar und Temperatur direkt auf dem Dashboard. Verhindert Ausfallzeiten bei Aussenarbeiten.
                      </p>
                    </div>
                    <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/60 text-xs font-semibold text-amber-900 flex justify-between">
                      <span>Bern · Sonnig</span>
                      <span>18°C · 0% Regen</span>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 transition-all flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4">
                        <IconSearch className="w-5 h-5 text-emerald-700" />
                      </div>
                      <h4 className="font-bold text-base text-slate-900 mb-2">Zefix-Handelsregister</h4>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        Offizielle Schweizer Firmendaten per UID oder Firmenname in Sekundenschnelle finden und Adressen fehlerfrei importieren.
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/60 text-xs font-semibold text-emerald-900 flex justify-between">
                      <span>UID-Prüfung</span>
                      <span>CHE-123.456.789</span>
                    </div>
                  </div>

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
          </>
        )}

        {/* ========================================================================= */}
        {/* SUBPAGE 3: KI & SCHWEIZER PRIVATE CLOUD (`/ki-cloud`)                     */}
        {/* ========================================================================= */}
        {activePage === 'ki-cloud' && (
          <>
            {/* Obsidian Dark-Mode Tech Hero & Gemini Superpowers */}
            <section id="ki-superpowers" className="py-20 bg-slate-950 text-white relative overflow-hidden">
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-r from-amber-500/20 via-emerald-500/15 to-purple-600/15 blur-3xl pointer-events-none rounded-full" />

              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-4">
                    <IconSparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                    <span>Gemini 3.8 Flash Inside · Multimodal AI & Private Cloud</span>
                  </div>
                  <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                    Ihr digitaler Polier:{' '}
                    <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 bg-clip-text text-transparent">
                      KI, die Schweizer Handwerker versteht.
                    </span>
                  </h1>
                  <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
                    Vergessen Sie mühsames Abtippen von Materialquittungen und das Tippen auf kleinen Handytastaturen mit staubigen Händen. Kinetic Craft denkt mit – per Kamera, Stimme und 100% Schweizer Datensouveränität.
                  </p>
                </div>

                {/* 3 AI Bento Columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                  <div className="bg-slate-900/90 rounded-3xl p-8 border border-slate-800 shadow-xl flex flex-col justify-between group hover:border-amber-400/60 transition-all">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6">
                        <IconCamera className="w-6 h-6 text-amber-400" />
                      </div>
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-2">Vision OCR</span>
                      <h3 className="text-xl font-bold text-white mb-3">Belege & Quittungen scannen</h3>
                      <p className="text-sm text-slate-300 leading-relaxed mb-6">
                        Fotografieren Sie Belege von Hornbach, OBI, Debrunner oder HGC. Gemini erkennt Beträge, MWST (8.1% / 2.6%) und Händler vollautomatisch und weist sie der Baustelle zu.
                      </p>
                    </div>
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

                  <div className="bg-slate-900/90 rounded-3xl p-8 border border-slate-800 shadow-xl flex flex-col justify-between group hover:border-amber-400/60 transition-all">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6">
                        <IconMic className="w-6 h-6 text-amber-400" />
                      </div>
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-2">Audio Dictation</span>
                      <h3 className="text-xl font-bold text-white mb-3">Baustellen-Sprachdiktat</h3>
                      <p className="text-sm text-slate-300 leading-relaxed mb-6">
                        Sprechen Sie Notizen, geleistete Stunden und verbaute Materialien einfach ins Smartphone. Kinetic Craft formuliert saubere Offertentexte und Regierapporte.
                      </p>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                      <p className="text-[11px] text-slate-300 italic text-center font-sans">
                        &quot;3 Std. Montage Küchenzeile, 2 Pack Schrauben 4x40...&quot;
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 rounded-3xl p-8 border border-slate-800 shadow-xl flex flex-col justify-between group hover:border-amber-400/60 transition-all">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6">
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

                {/* INTERACTIVE SANDBOX: Receipt/Voice Simulator + Private AI Node Architecture Explorer */}
                <KiAndPrivateCloudSandbox
                  onRequestPrivateNode={() => handleJumpToInquiry({ paketWunsch: 'private_node' })}
                />
              </div>
            </section>

            {/* SCHWEIZER DATENSOUVERÄNITÄT & 3-COLUMN ARCHITECTURE COMPARISON (revDSG) */}
            <section id="datensicherheit" className="py-20 bg-slate-900 text-white relative overflow-hidden border-t border-slate-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-14">
                  <span className="text-xs uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1 rounded-full">
                    100% Schweizer Datensouveränität (revDSG)
                  </span>
                  <h2 className="text-3xl sm:text-5xl font-black mt-4 tracking-tight">
                    Ihre Betriebsdaten gehören Ihnen. <br />
                    <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 bg-clip-text text-transparent">
                      Nicht US-Konzernen. Und nicht in eine staubige Box.
                    </span>
                  </h2>
                  <p className="text-slate-300 text-base sm:text-lg mt-4 leading-relaxed font-normal">
                    Warum ein physischer Server im Betrieb ein Wartungsalbtraum ist – und wie unsere Schweizer Private Cloud maximale Datensicherheit mit null Wartungsaufwand verbindet.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                  {/* Spalte 1: Hardware-Box im Betrieb */}
                  <div className="p-6 sm:p-8 rounded-3xl bg-slate-950/80 border border-red-500/30 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-md">
                          Modell A · Veraltet
                        </span>
                        <span className="text-xl">⚠️</span>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Hardware-Box im Betrieb</h3>
                      <p className="text-xs text-slate-400 mb-6">Mini-PC oder Mac Mini in der Werkstatt oder im Meisterbüro vor Ort.</p>

                      <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                        <li className="flex items-start gap-2.5 text-red-300">
                          <span className="font-bold text-red-400 shrink-0">✕</span>
                          <span><strong>Hohe Anschaffungskosten:</strong> Einmalig CHF 1&apos;500.– Hardware plus teure Einrichtung.</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-red-300">
                          <span className="font-bold text-red-400 shrink-0">✕</span>
                          <span><strong>Werkstatt-Risiko:</strong> Holzstaub, Sommerhitze, Stromausfall & Lüfterschäden.</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-red-300">
                          <span className="font-bold text-red-400 shrink-0">✕</span>
                          <span><strong>Baustellen-Probleme:</strong> Dynamische IPs, Port-Forwarding & fehlerhafte VPNs im Rohbau.</span>
                        </li>
                      </ul>
                    </div>

                    <div className="mt-8 p-3 rounded-xl bg-red-950/30 border border-red-900/50 text-xs text-red-400 text-center font-medium">
                      Fazit: Wartungsalbtraum ohne eigene IT-Abteilung
                    </div>
                  </div>

                  {/* Spalte 2: Klassische US-Cloud */}
                  <div className="p-6 sm:p-8 rounded-3xl bg-slate-950/80 border border-amber-500/30 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
                          Modell C · Riskant
                        </span>
                        <span className="text-xl">🌐</span>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Klassische US-Cloud</h3>
                      <p className="text-xs text-slate-400 mb-6">Standard-SaaS über US-Hyperscaler (Bexio & US-APIs).</p>

                      <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                        <li className="flex items-start gap-2.5 text-emerald-300">
                          <span className="font-bold text-emerald-400 shrink-0">✓</span>
                          <span><strong>Sofort startklar:</strong> Keine eigene Serverwartung notwendig.</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-amber-300">
                          <span className="font-bold text-amber-400 shrink-0">!</span>
                          <span><strong>US CLOUD Act Risiko:</strong> Daten liegen oft auf US-Servern oder unterliegen US-Zugriff.</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-amber-300">
                          <span className="font-bold text-amber-400 shrink-0">!</span>
                          <span><strong>Geteilte Multi-Tenant-DB:</strong> Keine dedizierte KI-Instanz für Ihre eigenen Kalkulationen.</span>
                        </li>
                      </ul>
                    </div>

                    <div className="mt-8 p-3 rounded-xl bg-amber-950/30 border border-amber-900/50 text-xs text-amber-300 text-center font-medium">
                      Fazit: Bequem, aber Kompromisse beim Datenschutz
                    </div>
                  </div>

                  {/* Spalte 3: Kinetic Private Cloud (Empfehlung) */}
                  <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-emerald-950/60 via-slate-900 to-slate-950 border-2 border-emerald-400 shadow-2xl shadow-emerald-950/50 flex flex-col justify-between relative">
                    <span className="absolute -top-3.5 right-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md">
                      Schweizer Empfehlung
                    </span>

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-1 rounded-md">
                          Modell B · Private AI Node
                        </span>
                        <IconSwissFlag className="w-6 h-6 rounded shadow-xs" />
                      </div>
                      <h3 className="text-xl font-black text-white mb-2">Kinetic Private Cloud</h3>
                      <p className="text-xs text-emerald-200/80 mb-6">
                        Eigene isolierte Schweizer Instanz (Infomaniak / Exoscale in Zürich & Genf).
                      </p>

                      <ul className="space-y-3 text-xs sm:text-sm text-slate-100">
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">✓</span>
                          <span><strong>100% Rechenzentrum Schweiz:</strong> Standorte Zürich / Genf, vollumfänglich revDSG-zertifiziert.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">✓</span>
                          <span><strong>Null Hardware-Wartung:</strong> Kein Server im Betrieb, keine Stromkosten, keine Ausfälle.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">✓</span>
                          <span><strong>Firmeneigenes KI-Wissen (RAG):</strong> Lernt nur aus Ihren bisherigen Offerten und NPK-Katalogen.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">✓</span>
                          <span><strong>Kein Modelltraining:</strong> Ihre Margen, Stundensätze und Kunden bleiben streng isoliert.</span>
                        </li>
                      </ul>
                    </div>

                    <div className="mt-8 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 text-center font-bold">
                      Fazit: Maximale Souveränität · Null IT-Wartung
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ========================================================================= */}
        {/* SUBPAGE 4: BRANCHEN / GEWERKE (`/gewerke`)                                */}
        {/* ========================================================================= */}
        {activePage === 'gewerke' && (
          <>
            {/* Subpage Hero & Gewerke Grid */}
            <section id="gewerke" className="py-16 sm:py-20 bg-[#FAF9F6] border-b border-slate-200/70">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-12">
                  <span className="text-xs uppercase font-bold tracking-wider text-amber-800 bg-amber-100/80 border border-amber-200/60 px-3.5 py-1 rounded-full">
                    Massgeschneidert · NPK & SIA 118
                  </span>
                  <h1 className="text-3xl sm:text-5xl font-black text-slate-900 mt-4 tracking-tight">
                    Ein Tool. Für alle Schweizer Gewerke.
                  </h1>
                  <p className="text-base sm:text-lg text-slate-600 mt-3">
                    Egal ob 1-Mann-Betrieb oder 20 Monteure: Kinetic Craft passt sich Ihren branchenspezifischen Arbeitsabläufen und Schweizer Normpositionen (NPK / CRB / SIA 118) an.
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                  {filteredGewerke.map((g) => (
                    <div
                      key={g.id}
                      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md hover:shadow-amber-500/10 transition-all group flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-12 h-12 rounded-2xl bg-amber-50/80 border border-amber-200/60 shadow-xs flex items-center justify-center text-slate-800 mb-4 group-hover:scale-110 transition-all duration-300">
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
                        <button
                          type="button"
                          onClick={() => handleJumpToInquiry({ gewerk: g.formValue })}
                          className="text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                        >
                          Vorlage wählen →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* INTERACTIVE SANDBOX: NPK / SIA 118 Calculator per Trade */}
                <NpkAndSiaGewerkSandbox
                  selectedGewerk={selectedGewerk}
                  onSelectGewerkForQuote={(tradeName) => {
                    const matched = gewerkeList.find((g) => tradeName.includes(g.title.split(' & ')[0]))
                    handleJumpToInquiry({ gewerk: matched ? matched.formValue : 'Schreinerei' })
                  }}
                />
              </div>
            </section>
          </>
        )}

        {/* ========================================================================= */}
        {/* SUBPAGE 5: PREISE, ROI-RECHNER & DEMO-ANFRAGE (`/preise`)                 */}
        {/* ========================================================================= */}
        {activePage === 'preise' && (
          <>
            {/* TARIFE & UPGRADES */}
            <section id="tarife" className="py-20 bg-white border-b border-slate-100">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-12">
                  <span className="text-xs uppercase font-bold tracking-wider text-amber-800 bg-amber-100/80 border border-amber-200/60 px-3 py-1 rounded-full">
                    Transparente Tarife
                  </span>
                  <h1 className="text-3xl sm:text-5xl font-black text-slate-900 mt-4 tracking-tight">
                    Tarife & Upgrades
                  </h1>
                  <p className="text-base text-slate-600 mt-3">
                    Wählen Sie den passenden Plan für Ihren Handwerksbetrieb. 14 Tage vollumfänglich kostenlos testen – keine versteckten Kosten.
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

                {/* Pricing Cards: 2-Stufen-Modell */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
                  {/* 1. Professional Plan */}
                  <div className="border-2 border-amber-400 rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-amber-50/50 via-white to-yellow-50/20 flex flex-col justify-between relative shadow-xl ring-1 ring-amber-400/20">
                    <span className="absolute -top-3.5 right-6 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white text-[11px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md">
                      Schweizer Standard
                    </span>

                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <h3 className="text-2xl font-black text-slate-900">Professional</h3>
                        <span className="text-xs bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-bold">Vollzugriff</span>
                      </div>
                      <div className="text-3xl sm:text-4xl font-black text-amber-700 my-4 font-mono">
                        {billingCycle === 'yearly' ? 'CHF 44.00' : 'CHF 49.00'} <span className="text-xs font-normal text-slate-500 font-sans">/ Monat</span>
                      </div>
                      <p className="text-xs text-slate-600 mb-6">Für Schweizer Handwerks- und Montagebetriebe, die ihr Büro schlank und rechtssicher führen wollen.</p>

                      <ul className="space-y-3 text-xs sm:text-sm text-slate-800">
                        <li className="flex items-center gap-2 font-medium">
                          <IconCheck className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Unbegrenzte Kunden, Projekte & Baustellen</span>
                        </li>
                        <li className="flex items-center gap-2 font-medium">
                          <IconCheck className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Unbegrenzte Offerten & Schweizer QR-Rechnungen (ISO 20022)</span>
                        </li>
                        <li className="flex items-center gap-2 font-medium">
                          <IconCheck className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Gemini 3.8 Flash Beleg-Scanner & Vor-Ort-Diktat</span>
                        </li>
                        <li className="flex items-center gap-2 font-medium">
                          <IconCheck className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="font-semibold text-amber-900">3-Stufen-Mahnwesen mit QR-Zahlteil (Liquiditäts-Schutz)</span>
                        </li>
                        <li className="flex items-center gap-2 font-medium">
                          <IconCheck className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Banana Buchhaltung & Schweizer Treuhand-Export (OR 957ff.)</span>
                        </li>
                        <li className="flex items-center gap-2 font-medium">
                          <IconCheck className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Zefix-Handelsregisterabgleich & Live-Baustellenwetter</span>
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
                      <p className="text-[11px] text-center text-slate-500 font-medium">Keine Kreditkarte nötig · Endet automatisch nach 14 Tagen</p>
                    </div>
                  </div>

                  {/* 2. Enterprise / Private AI Node Plan */}
                  <div className="border border-slate-200 rounded-3xl p-6 sm:p-8 bg-white flex flex-col justify-between relative shadow-sm hover:border-slate-300 transition-all">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <h3 className="text-2xl font-black text-slate-900">Enterprise</h3>
                        <span className="text-xs bg-emerald-950 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold border border-emerald-800">
                          Private AI Node
                        </span>
                      </div>
                      <div className="text-3xl font-black text-slate-900 my-4 font-mono">
                        ab CHF 149.00 <span className="text-xs font-normal text-slate-500 font-sans">/ Monat</span>
                      </div>
                      <p className="text-xs text-slate-600 mb-6 font-medium">
                        Inkl. dedizierter Schweizer Private-Cloud Instanz (Infomaniak / Exoscale) & firmeneigenem RAG-Wissen.
                      </p>

                      <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                        <li className="flex items-center gap-2">
                          <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span><strong>100% isolierte Schweizer Instanz</strong> (Zürich / Genf)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span><strong>Firmeneigenes KI-Wissen (RAG):</strong> Bisherige Offerten, Stundensätze & NPK-Kataloge</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span><strong>Kein fremdes Modelltraining:</strong> Ihre Margen & Kalkulationen bleiben strikt privat</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span><strong>Schweizer revDSG-Audit-Zertifikat</strong> für Ihren Betrieb</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Persönliche Datenmigration (Bexio, Sorba, Excel)</span>
                        </li>
                      </ul>
                    </div>

                    <a
                      href="#anfrage"
                      onClick={() => setInquiryData((prev) => ({ ...prev, paketWunsch: 'private_node' }))}
                      className="mt-8 block w-full py-3.5 text-center text-xs sm:text-sm font-bold rounded-xl border border-slate-900 bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer shadow-sm"
                    >
                      Live-Demo & Private-Node anfragen
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* INTERAKTIVER HANDWERKER-ERSPARNIS-RECHNER (ROI) */}
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
                          onChange={(e) => setCalcTeamSize(parseInt(e.target.value, 10))}
                          className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
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
                          onChange={(e) => setCalcDocCount(parseInt(e.target.value, 10))}
                          className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-amber-500/20 via-slate-800/80 to-slate-900 p-5 sm:p-8 rounded-2xl border border-amber-400/30 text-center space-y-6">
                      <div>
                        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                          Ihre monatliche Bürozeit-Ersparnis
                        </span>
                        <div className="text-4xl sm:text-5xl font-black font-mono text-amber-300 mt-2">
                          ~{hoursSavedPerMonth} Std.
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-700/60">
                        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                          Monatlicher Wertzuwachs / Ersparnis
                        </span>
                        <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400 mt-2">
                          CHF {moneySavedPerMonth.toLocaleString('de-CH')}.–
                        </div>
                      </div>

                      <button
                        onClick={onGoToRegistration}
                        className="w-full py-4 text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 rounded-xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
                      >
                        Jetzt CHF {moneySavedPerMonth.toLocaleString('de-CH')} sparen & 14 Tage testen →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* INTERAKTIVE OFFERTEN- & DEMO-ANFRAGE */}
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

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                          Gewünschtes Paket / Interesse
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <button
                            type="button"
                            onClick={() => setInquiryData({ ...inquiryData, paketWunsch: 'private_node' })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              inquiryData.paketWunsch === 'private_node'
                                ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950 mb-1">
                              <span>🇨🇭 Private AI Node</span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-tight">
                              ab CHF 149.-/Mt. · Dedizierte Schweizer Instanz (revDSG)
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setInquiryData({ ...inquiryData, paketWunsch: 'professional' })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              inquiryData.paketWunsch === 'professional'
                                ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 mb-1">
                              <span>⚡ Professional</span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-tight">
                              CHF 49.-/Mt. · Schweizer Standard-Cloud für Handwerker
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setInquiryData({ ...inquiryData, paketWunsch: 'migration' })}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              inquiryData.paketWunsch === 'migration'
                                ? 'border-slate-700 bg-slate-100 ring-2 ring-slate-700/20'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 mb-1">
                              <span>📦 Altdaten-Migration</span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-tight">
                              Übernahme aus Bexio, Sorba, Excel & Schulung
                            </p>
                          </button>
                        </div>
                      </div>

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
                    </form>
                  )}
                </div>
              </div>
            </section>

            {/* FAQ ACCORDION */}
            <section id="faq" className="py-20 bg-white border-t border-slate-100">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-2xl mx-auto mb-14">
                  <span className="text-xs uppercase font-bold tracking-wider text-amber-800 bg-amber-100/80 border border-amber-200/60 px-3 py-1 rounded-full">
                    Häufige Fragen
                  </span>
                  <h2 className="text-3xl font-black text-slate-900 mt-4 tracking-tight">
                    Häufig gestellte Fragen
                  </h2>
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
              </div>
            </section>
          </>
        )}
      </main>

      {/* ========================================================================= */}
      {/* BOTTOM SUBPAGE SWITCHER ("NÄCHSTE SEITE ENTDECKEN")                       */}
      {/* ========================================================================= */}
      <section className="py-12 bg-[#FAF9F6] border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-stretch justify-between gap-4">
            <button
              type="button"
              onClick={() => navigateToSubpage(prevPage.id)}
              className="flex-1 p-5 rounded-2xl bg-white border border-slate-200 hover:border-amber-400 text-left transition-all cursor-pointer group"
            >
              <span className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
                ← Vorherige Unterseite
              </span>
              <span className="text-base font-black text-slate-900 group-hover:text-amber-700 transition-colors block">
                {prevPage.shortTitle}
              </span>
              <span className="text-xs text-slate-500 mt-0.5 block">{prevPage.subtitle}</span>
            </button>

            <button
              type="button"
              onClick={() => navigateToSubpage(nextPage.id)}
              className="flex-1 p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 hover:border-amber-400 text-right transition-all cursor-pointer group"
            >
              <span className="text-[11px] font-mono uppercase text-amber-400 block mb-1">
                Nächste Seite: {nextPage.label} →
              </span>
              <span className="text-base font-black text-white group-hover:text-amber-300 transition-colors block">
                {nextPage.shortTitle}
              </span>
              <span className="text-xs text-slate-400 mt-0.5 block">{nextPage.subtitle}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* BOTTOM CALL-TO-ACTION BANNER                                              */}
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
              className="w-full sm:w-auto px-8 py-4 text-base font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 rounded-2xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
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
      {/* FOOTER WITH DIRECT SUBPAGE DEEP-LINKS                                     */}
      {/* ========================================================================= */}
      <footer className="bg-white border-t border-slate-200 py-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-100">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <KineticLogoMark className="w-8 h-8 text-slate-900" />
                <div>
                  <span className="font-extrabold text-sm text-slate-900">Kinetic Craft</span>
                  <span className="text-[11px] text-slate-400 block -mt-0.5">by Kinetic Schweiz</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Das moderne Handwerker-CRM für Schweizer Betriebe mit nativer Gemini AI, Private AI Node, Zefix-Schnittstelle und 100% Swiss QR-Rechnung.
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-700 font-semibold pt-1">
                <IconSwissFlag className="w-4 h-4 rounded shadow-xs shrink-0" />
                <span>Swiss Made Software</span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Unterseiten & Module</h4>
              <ul className="space-y-2 text-xs">
                {MARKETING_PAGES.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => navigateToSubpage(p.id)}
                      className="hover:text-amber-600 cursor-pointer text-left"
                    >
                      {p.shortTitle} ({p.path})
                    </button>
                  </li>
                ))}
                <li>
                  <button onClick={onGoToRegistration} className="hover:text-amber-600 cursor-pointer font-semibold text-amber-800">
                    14 Tage Testzugang starten
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Standards & Recht</h4>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center gap-1.5 text-slate-600">
                  <IconCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Schweizer QR-Bill (ISO 20022)</span>
                </li>
                <li className="flex items-center gap-1.5 text-slate-600">
                  <IconCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Banana Buchhaltung Export (OR 957ff.)</span>
                </li>
                <li className="flex items-center gap-1.5 text-slate-600">
                  <IconCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Zefix Handelsregister API</span>
                </li>
                <li className="flex items-center gap-1.5 text-slate-600">
                  <IconCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Schweizer Datenschutz (revDSG)</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Kinetic Schweiz</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Vertrieb, Betreuung & Private-Cloud-Implementierung für Schweizer Betriebe.
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

      {/* STICKY BOTTOM CTA BAR */}
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
                  Mit Gemini AI Beleg-Scanner, Private AI Node & 100% Swiss QR-Rechnung in 60s
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

      {/* SCREENSHOT ZOOM MODAL */}
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
