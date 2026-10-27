import React, { useState, useEffect, useRef } from 'react'
import KineticLogoMark from '../components/KineticLogoMark'
import DsgBanner from '../components/legal/DsgBanner'
import {
  TradeIcon,
  IconSwissFlag,
  IconSearch,
  IconCheck,
  IconSparkles,
  IconClose,
  IconQrBill,
  IconMic,
  IconCamera,
  IconSun,
  IconClock,
  IconDocument,
} from '../components/icons/BrandIcons'

const MARKETING_PAGES = [
  {
    id: 'home',
    path: '/',
    label: 'Startseite',
    shortTitle: 'Startseite & Gesamtüberblick',
    subtitle: 'Der komplette Überblick über CRM-Module, Firmeneigene KI, Branchen & Tarife',
  },
  {
    id: 'funktionen',
    path: '/funktionen',
    label: 'Alle Funktionen',
    shortTitle: 'Alle 10 CRM-Module & Funktionen',
    subtitle: 'Kategorien, echte Screenshots & Workflows von Cockpit bis QR-Rechnung',
  },
  {
    id: 'ki-cloud',
    path: '/ki-cloud',
    label: 'Firmeneigene KI',
    badge: 'revDSG',
    shortTitle: 'Firmeneigene KI & CRM-Freischaltung',
    subtitle: 'Freischaltbare KI-Features im CRM & isolierte Schweizer KI-Lösungen',
  },
  {
    id: 'gewerke',
    path: '/gewerke',
    label: 'Branchen',
    shortTitle: 'Branchen & Zeitersparnis im Alltag',
    subtitle: 'Wie Schreiner, Maler, Elektriker, Sanitär, Gartenbau & Bau täglich Zeit sparen',
  },
  {
    id: 'preise',
    path: '/preise',
    label: 'Preise & Rechner',
    shortTitle: 'Tarife, ROI-Rechner & Beratung',
    subtitle: 'Standard-CRM ohne KI vs. CRM mit Firmeneigener KI, Ersparnis-Rechner & FAQ',
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

  // FAQ Accordion
  const [openFaqIndex, setOpenFaqIndex] = useState(0)

  // Modal for screenshot zoom
  const [zoomedImage, setZoomedImage] = useState(null)

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
  const [activeQuotingMode, setActiveQuotingMode] = useState('katalog')
  const [kiPreviewUnlocked, setKiPreviewUnlocked] = useState(true)
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

  // Detailed Branchen Data (without NPK Calculator — focused on real workflow help & time savings)
  const gewerkeList = [
    {
      id: 'schreinerei',
      formValue: 'Schreinerei',
      title: 'Schreinerei & Innenausbau',
      timeSaved: '~5.5 Std. / Woche gespart',
      hoursBefore: '7.0 Std./Wo. (Word/Excel)',
      hoursAfter: '1.5 Std./Wo. mit Kinetic Craft',
      painPoint:
        'Aufwändige Massberechnungen am Abend, lose Skizzen aus der Werkstatt und vergessene Beschläge oder Kantenmaterialien bei der Nachkalkulation.',
      desc: 'Massgenaue Offerten mit Holzarten, Kanten, Beschlägen und Montagezeiten. Mit 1 Klick wird aus der angenommenen Offerte der fertige Werkstattauftrag und die Schweizer QR-Rechnung.',
      helpsWith: [
        'Ausmass-Rechner direkt in der Offerte (Länge × Breite × Fläche)',
        'Stücklisten, Pläne und Baustellenfotos zentral im Projekt-Dossier',
        '1-Klick Umwandlung von Regierapporten in verrechenbare Rechnungspositionen',
      ],
      modulesUsed: 'Offerten & Ausmass · Projekt-Dossier · Leistungskatalog · QR-Rechnung',
      highlight: 'Massberechnung & Materialdeklaration',
    },
    {
      id: 'maler',
      formValue: 'Malerei',
      title: 'Maler & Gipser',
      timeSaved: '~4.5 Std. / Woche gespart',
      hoursBefore: '6.0 Std./Wo. (Papier/WhatsApp)',
      hoursAfter: '1.5 Std./Wo. mit Kinetic Craft',
      painPoint:
        'Quadratmeter-Ausmasse auf Papierblöcken, unklare Farbton-Notizen (NCS/RAL) bei Nachbestellungen und unbezahlte Zusatzarbeiten auf der Baustelle.',
      desc: 'Schnelle Quadratmeter-Berechnungen für Wände, Decken und Fassaden inklusive Abzügen. Farbton-Dokumentation pro Objekt und digitale Regierapporte direkt auf dem Smartphone unterschreiben lassen.',
      helpsWith: [
        'Live Baustellen-Wetter & Niederschlagsradar für Fassaden- und Aussenarbeiten',
        'Sofortige m²-Kalkulation mit hinterlegten Vorlagen für Abdeck- und Anstricharbeiten',
        'Digitale Kundenunterschrift für Zusatz- und Regiearbeiten direkt vor Ort',
      ],
      modulesUsed: 'Wetter-Cockpit · Mobile Baustelle · Ausmass · 3-Stufen-Mahnwesen',
      highlight: 'm²-Aufmass & Regieberichte',
    },
    {
      id: 'elektro',
      formValue: 'Elektro',
      title: 'Elektro & Gebäudeautomation',
      timeSaved: '~6.0 Std. / Woche gespart',
      hoursBefore: '7.5 Std./Wo. (Regiezettel)',
      hoursAfter: '1.5 Std./Wo. mit Kinetic Craft',
      painPoint:
        'Dutzende Kleinaufträge und Service-Einsätze pro Woche, bei denen Kleinmaterial (Klemmen, Kabel, Schalter) und Regiestunden auf Papier-Rapporten verloren gehen.',
      desc: 'Installations- und Regierapporte direkt beim Kunden digital signieren lassen. Verbautes Material aus dem Katalog wählen und Arbeitsstunden per Live-Stoppuhr sekundengenau abrechnen.',
      helpsWith: [
        'Live-Stoppuhr & Monteur-Zeiterfassung mit direkter Übergabe in die Rechnung',
        'Echtzeit-Zefix-Suche für Verwaltungen, Architekten und Geschäftskunden',
        'Lückenlose Foto-Dokumentation von Verteilkästen und Leitungsführungen',
      ],
      modulesUsed: 'Zeiterfassung & Rapport · Katalog · Zefix-CRM · QR-Rechnung',
      highlight: 'Installationsrapporte & Signatur',
    },
    {
      id: 'sanitaer',
      formValue: 'Sanitaer',
      title: 'Sanitär & Heizung',
      timePoint: '~5.0 Std. / Woche gespart',
      timeSaved: '~5.0 Std. / Woche gespart',
      hoursBefore: '6.5 Std./Wo. (Belegsuche)',
      hoursAfter: '1.5 Std./Wo. mit Kinetic Craft',
      painPoint:
        'Hektische Notfalleinsätze, vergessene Lieferantenquittungen vom Grosshandel (Debrunner, Meier Tobler) und zeitraubendes Nachfassen bei offenen Service-Rechnungen.',
      desc: 'Wartungsaufträge, Service-Einsätze und Notfalldienst sauber im Kalender planen. Quittungen sofort per Kamera erfassen und offene Rechnungen mit dem 3-Stufen-Mahnwesen automatisiert einziehen.',
      helpsWith: [
        'Einsatzkalender mit Google-Maps-Routenstart für Service-Monteure',
        'Mobile Foto-Belegablage für Grosshandels-Lieferscheine direkt aufs Projekt',
        'Automatische Zahlungserinnerung & Mahnung mit neuem Schweizer QR-Code',
      ],
      modulesUsed: 'Kalender & Routen · Foto-Belege · QR-Rechnung · Mahnwesen',
      highlight: 'Service-Verträge & QR-Rechnung',
    },
    {
      id: 'gartenbau',
      formValue: 'Gartenbau',
      title: 'Garten- & Landschaftsbau',
      timeSaved: '~4.5 Std. / Woche gespart',
      hoursBefore: '6.0 Std./Wo. (Handplanung)',
      hoursAfter: '1.5 Std./Wo. mit Kinetic Craft',
      painPoint:
        'Wetterabhängige Terminverschiebungen, unübersichtliche Maschinen- und Baggerstunden sowie aufwändige Abrechnung wiederkehrender Unterhaltsarbeiten.',
      desc: 'Saisonale Pflegeaufträge, Pflanzlisten und Maschinenstunden transparent kalkulieren. Dank integriertem Schweizer Baustellen-Wetter und Kalender lassen sich Teams bei Regen in Sekunden umplanen.',
      helpsWith: [
        '5-Tage-Wetterprognose & Regenradar direkt in der Tagesdisposition',
        'Wiederkehrende Offerten- und Rechnungsvorlagen für Gartenunterhalt',
        'Vorher-/Nachher-Fotodokumentation für Eigentümer und Verwaltungen',
      ],
      modulesUsed: 'Wetter-Cockpit · Kalender · Dokument-Duplikator · Projekt-Fotos',
      highlight: 'Pflege-Abonnemente & Maschinen',
    },
    {
      id: 'bau',
      formValue: 'Bau',
      title: 'Bauunternehmung & Renovation',
      timeSaved: '~6.5 Std. / Woche gespart',
      hoursBefore: '8.5 Std./Wo. (Einzelbelege)',
      hoursAfter: '2.0 Std./Wo. mit Kinetic Craft',
      painPoint:
        'Komplexe Teil- und Akontorechnungen über mehrere Baumonate, Rückbehalte, Garantien und hunderte Einzelbelege für den Treuhänder.',
      desc: 'Mehrere Baustellen parallel steuern: Von der detaillierten Offerte über Akontozahlungen bis zur Schlussrechnung mit Abzügen, Skonto und 1-Klick-Export für Banana Buchhaltung.',
      helpsWith: [
        'Teil-, Akonto- und Schlussrechnungen mit automatischer Restbetrags-Kontrolle',
        'Bankabgleich (camt.053/054) und Delkredere-Auswertung nach OR 957ff.',
        'Fertiges Buchhaltungs-Dossier für den Schweizer Treuhänder auf Knopfdruck',
      ],
      modulesUsed: 'Akonto & Schlussrechnung · Bankabgleich · Banana-Export · Baustellen-Dossier',
      highlight: 'Baustellen-Ablage & Beleg-Scanner',
    },
  ]

  // All 10 CRM Modules grouped into 4 Categories for /funktionen ("Alle Funktionen")
  const allCrmModuleCategories = [
    {
      categoryId: 'cat-cockpit',
      categoryBadge: 'Kategorie 01 · Tagesgeschäft & Planung',
      categoryTitle: 'Cockpit, Baustellen-Wetter & Einsatzplanung',
      categoryDesc:
        'Jeder Arbeitstag beginnt mit voller Übersicht: Offene Posten, anstehende Baustellen, regionales Schweizer Wetter und kantonale Feiertage.',
      modules: [
        {
          num: 'Modul 01',
          title: 'Bento-Dashboard & Finanzen-Cockpit',
          subtitle: 'Tagesübersicht in Echtzeit',
          image: '/screenshots/01_hero_dashboard.png',
          alt: 'Kinetic Craft Modul 01 Bento-Dashboard',
          desc: 'Das Herzstück im Büro und unterwegs: Sehen Sie sofort alle offenen Offerten, fällige Rechnungen, laufende Projekte und die wichtigsten Kennzahlen Ihres Betriebs auf einen Blick.',
          bullets: [
            'Echtzeit-Umsatz, offene Debitoren und anstehende Termine im aufgeräumten Bento-Grid',
            'Schnellstart-Leiste (Command-Bar ⌘K) zum Erstellen von Offerten, Kunden und Belegen in Sekunden',
            'Interaktive Onboarding-Checkliste für den schnellen Start ohne Schulungsaufwand',
          ],
        },
        {
          num: 'Modul 02',
          title: 'Live Baustellen-Wetter & Niederschlagsradar',
          subtitle: 'Schweizer Lokalprognose für Aussenarbeiten',
          image: '/screenshots/07_wetter_cockpit.png',
          alt: 'Kinetic Craft Modul 02 Live Baustellen-Wetter',
          desc: 'Speziell für Fassaden-, Dach-, Garten- und Bauarbeiten: Das integrierte Wetter-Cockpit zeigt Temperatur, Regenwahrscheinlichkeit und mehrtägige Prognosen für Ihren Schweizer Standort.',
          bullets: [
            'Live-Wetterdaten für Bern, Zürich, Basel, Luzern, St. Gallen und alle Schweizer Regionen',
            'Frühzeitige Warnung bei Niederschlag oder Frost für sichere Material- und Personalplanung',
            'Direkt im Dashboard integriert – kein Wechsel in externe Wetter-Apps nötig',
          ],
        },
        {
          num: 'Modul 03',
          title: 'Kalender, Disposition & 26 Kantons-Feiertage',
          subtitle: 'Monteur-Planung & iCal-Synchronisation',
          image: '/screenshots/04_kalender_planung.png',
          alt: 'Kinetic Craft Modul 03 Kalender und Einsatzplanung',
          desc: 'Planen Sie Baustellen, Kundentermine und Service-Einsätze übersichtlich nach Tag, Woche oder Monat – inklusive automatischer Erkennung der offiziellen Feiertage Ihres Kantons.',
          bullets: [
            'Automatische Feiertags-Berechnung für alle 26 Schweizer Kantone (ZH, BE, LU, AG, SG etc.)',
            'Direkte Verknüpfung jedes Termins mit Kunde, Baustellen-Adresse und Projekt-Dossier',
            'iCal-Kalender-Export für nahtlose Synchronisation mit iPhone, iPad und Outlook',
          ],
        },
      ],
    },
    {
      categoryId: 'cat-crm',
      categoryBadge: 'Kategorie 02 · Kunden, Handelsregister & Baustellen',
      categoryTitle: 'Zefix-Kundenkartei, Projekte & Mobile Baustelle',
      categoryDesc:
        'Keine abgetippten Adressen und keine verlorenen Regiezettel mehr: Vom Handelsregister-Import bis zur Unterschrift auf dem Display.',
      modules: [
        {
          num: 'Modul 04',
          title: 'Kunden-CRM mit Zefix-Handelsregister-Anbindung',
          subtitle: 'Schweizer Firmen & Privatkunden perfekt strukturiert',
          image: '/screenshots/08_zefix_firmensuche.png',
          alt: 'Kinetic Craft Modul 04 Zefix-Handelsregister und Kunden-CRM',
          desc: 'Legen Sie Geschäftskunden, Verwaltungen und Architekturbüros in Sekunden an: Tippen Sie den Firmennamen oder die CHE/UID-Nummer ein und Kinetic Craft zieht die offizielle Adresse live aus dem Zefix.',
          bullets: [
            'Echtzeit-Abfrage des Schweizer Bundesamtsregisters (Zefix) inkl. Rechtsform und UID-Prüfung',
            'Vollständige Kundenhistorie: Alle Offerten, Rechnungen, Projekte und Ansprechpartner auf einen Blick',
            '1-Klick Google-Maps-Navigation und Direkt-Anruf aus der Kundenkarte auf dem Smartphone',
          ],
        },
        {
          num: 'Modul 05',
          title: 'Projekte, Baustellen-Dossiers & Digitale Regierapporte',
          subtitle: 'Zeiterfassung per Stoppuhr & Kundenunterschrift vor Ort',
          image: '/screenshots/03b_projekt_detail_bento.png',
          alt: 'Kinetic Craft Modul 05 Projekt-Detail und Baustellen-Dossier',
          desc: 'Jede Baustelle erhält ihr eigenes digitales Dossier: Erfassen Sie Arbeitsstunden per Live-Stoppuhr, dokumentieren Sie den Baufortschritt mit Fotos und lassen Sie Regierapporte direkt auf dem Tablet oder Smartphone unterschreiben.',
          bullets: [
            'Integrierte Live-Stoppuhr & Stempeluhr für Monteure mit direkter Projektzuweisung',
            'Digitale Kundenunterschrift auf dem Touchscreen für rechtsgültige Regie- und Abnahmeprotokolle',
            '1-Klick-Übergabe aller erfassten Regiestunden und Materialien in eine fertige Rechnung',
          ],
        },
        {
          num: 'Modul 06',
          title: 'Mobile Baustellen-App & Baustellen-Dateiablage',
          subtitle: 'Büro im Hosentaschen-Format für iPhone, iPad & Android',
          image: '/screenshots/06_mobile_baustelle.png',
          alt: 'Kinetic Craft Modul 06 Mobile Baustellen-Ansicht',
          desc: 'Auf der Baustelle zählt jede Sekunde: Die mobile Oberfläche bietet schnellen Zugriff auf Pläne, Fotos, Adressen und Zeiterfassung – ganz ohne schweren Laptop im Transporter.',
          bullets: [
            'Optimierte Touch-Bedienung mit eigener Mobile-Tab-Bar für den Einsatz mit einer Hand',
            'Kameramodul für Baustellenfotos und Materialquittungen direkt aus der Web-App',
            'Zentrale Dateiablage für Grundrisse, PDF-Pläne, Abnahmeprotokolle und Skizzen',
          ],
        },
      ],
    },
    {
      categoryId: 'cat-offerten',
      categoryBadge: 'Kategorie 03 · Offerten, Ausmass & Katalog',
      categoryTitle: 'Präzise Kalkulation & Schweizer A4-Dokumente',
      categoryDesc:
        'Erstellen Sie überzeugende Offerten mit Ihrem Firmenlogo, integrierter Massberechnung und wiederverwendbaren Leistungsbausteinen.',
      modules: [
        {
          num: 'Modul 07',
          title: 'Offerten-Editor, Ausmass-Rechner & A4-Echtzeitvorschau',
          subtitle: 'In unter 60 Sekunden zum druckfertigen Angebot',
          image: '/screenshots/02_offerten_rechnungen.png',
          alt: 'Kinetic Craft Modul 07 Offerten-Editor und A4-Vorschau',
          desc: 'Schreiben Sie Offerten, die Eindruck hinterlassen: Mit Live-A4-Blattvorschau, integrierter Ausmass-Berechnung (Länge × Breite × Höhe), Rabatten, Skonto und automatischer Schweizer MWST-Kalkulation (8.1% / 2.6%).',
          bullets: [
            'Integriertes Ausmass-Modal für Flächen-, Volumen- und Stückberechnungen pro Position',
            'Schwebende Druck- und Aktions-Toolbar für sofortigen PDF-Download oder Direktversand',
            '1-Klick-Duplizieren und nahtlose Umwandlung angenommener Offerten in Aufträge & Rechnungen',
          ],
        },
        {
          num: 'Modul 08',
          title: 'Leistungs-, Material- & Normpositionen-Katalog',
          subtitle: 'Eigene Preise & Vorlagen zentral verwalten',
          image: '/screenshots/02_offerte_rechnung_toolbar.png',
          alt: 'Kinetic Craft Modul 08 Leistungskatalog und Toolbar',
          desc: 'Hinterlegen Sie Ihre häufigsten Arbeiten, Stundensätze, Maschinenstunden und Materialien einmalig im Katalog und fügen Sie diese per Schubladen-Auswahl mit 1 Klick in jede Offerte oder Rechnung ein.',
          bullets: [
            'Schnelle Katalog-Schublade (Drawer) direkt im Offerten- und Rechnungs-Editor',
            'Unterstützung für strukturierte Leistungspositionen, Einheiten (m², Std., stk, pauschal) und Einkaufspreise',
            'Import- und Vorlagen-Funktion für branchenübliche Schweizer Handwerkspositionen',
          ],
        },
      ],
    },
    {
      categoryId: 'cat-finanzen',
      categoryBadge: 'Kategorie 04 · QR-Rechnungen, Mahnwesen & Buchhaltung',
      categoryTitle: 'Schweizer Finanzen, Liquiditäts-Schutz & Treuhand',
      categoryDesc:
        '100% konform mit Schweizer Banken- und Treuhandstandards: Von der ISO 20022 QR-Rechnung bis zum Banana-Buchhaltungsexport.',
      modules: [
        {
          num: 'Modul 09',
          title: 'Schweizer QR-Rechnung (ISO 20022) & 3-Stufen-Mahnwesen',
          subtitle: 'Inkl. Akonto, SIA-118-Abzüge, Verzugszins (OR 104) & Betreibung',
          image: '/screenshots/03_kunden_baustellen_bento.png',
          alt: 'Kinetic Craft Modul 09 QR-Rechnung und Mahnwesen',
          desc: 'Jede Rechnung enthält automatisch den offiziellen Schweizer QR-Zahlteil mit QR-IBAN und Referenznummer. Bei Zahlungsverzug generiert das 3-Stufen-Mahnwesen auf Knopfdruck Zahlungserinnerungen, Mahnungen mit 5% Verzugszins (OR Art. 104) bis hin zum Betreibungsbegehren.',
          bullets: [
            'Validierter Schweizer QR-Zahlteil nach SIX ISO 20022 Standard für alle Schweizer Banking-Apps',
            'Unterstützung für Akontorechnungen, Teilrechnungen und Schlussrechnungen mit Garantierückbehalt',
            '3-Stufen-Mahnwesen & Betreibungs-Assistent (SchKG) mit automatischer Verzugszins-Berechnung',
          ],
        },
        {
          num: 'Modul 10',
          title: 'Buchhaltung, Foto-Belege, Bankabgleich & Banana-Export',
          subtitle: 'Inkl. Firmen-Branding, Nummernkreise & Rollenverwaltung',
          image: '/screenshots/05_buchhaltung_belege.png',
          alt: 'Kinetic Craft Modul 10 Buchhaltung und Foto-Belege',
          desc: 'Erfassen Sie Ausgaben und Lieferantenquittungen per Foto, gleichen Sie Zahlungseingänge per Schweizer Bankdatei (camt.053/054) ab und exportieren Sie das fertige Journal inkl. MWST- und Delkredere-Auswertung (OR 957ff.) direkt für Banana Buchhaltung und Ihren Treuhänder.',
          bullets: [
            'Automatischer Zahlungsabgleich für Schweizer Bankkonten (camt.053 / camt.054 XML-Import)',
            '1-Klick-Export für Banana Doppelte Buchhaltung, OP-Listen und Schweizer KMU-Kontenrahmen',
            'Individuelles Firmen-Branding (eigenes Logo, Wunschfarbe auf Dokumenten, eigene Nummernkreise & Team-Rollen)',
          ],
        },
      ],
    },
  ]

  // FAQ Data
  const faqs = [
    {
      q: 'Wie funktioniert die Schweizer QR-Rechnung in Kinetic Craft?',
      a: 'Kinetic Craft generiert automatisch vollumfänglich standardkonforme Schweizer QR-Rechnungen nach ISO 20022 mit offizieller QR-IBAN, Creditor Reference (oder SCOR) und Betrag. Ihre Kunden können die Rechnung mit jeder Schweizer Banking-App in Sekundenschnelle einscannen und bezahlen.',
    },
    {
      q: 'Was beinhaltet die 14-tägige kostenlose Testphase?',
      a: 'Sie erhalten sofort vollen Zugriff auf alle 10 Module von Kinetic Craft Professional – ohne Eingabe einer Kreditkarte und ohne automatische Verlängerung. Nach den 14 Tagen können Sie nahtlos für CHF 49.– / Monat weiterarbeiten. Ihre Daten, Baustellen und Dokumente bleiben stets sicher erhalten.',
    },
    {
      q: 'Wie funktioniert das Prinzip «Standard-CRM ohne KI» vs. «Firmeneigene KI freischalten»?',
      a: 'Die Standard-Version von Kinetic Craft (Professional) ist bewusst zu 100% frei von KI. Sie erhalten ein extrem schnelles, klassisches und verlässliches Handwerker-CRM. Wenn Ihr Betrieb zusätzlich maximale Automatisierung wünscht, schalten wir mit dem Paket «Firmeneigene KI» (Enterprise) direkt im CRM die KI-Integrationen frei (automatischer KI-Belegscanner, Schweizerdeutsches Sprachdiktat zu Rapport/Offerte, KI-Offertenvorschläge aus Ihrer eigenen Firmenhistorie) – betrieben auf Ihrer eigenen isolierten Schweizer KI-Instanz.',
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
      a: 'Kinetic Craft garantiert 100 % Konformität mit dem neuen Schweizer Datenschutzgesetz (revDSG): Ihre Daten liegen isoliert und verschlüsselt in Schweizer und europäischen ISO/IEC 27001 zertifizierten Hochsicherheits-Rechenzentren. Beim Upgrade auf die «Firmeneigene KI» wählen Sie zwischen einer dedizierten Schweizer Private Cloud (Zürich/Genf) oder einem eigenen lokalen KI-Server direkt in Ihrem Betrieb – 100% frei vom US CLOUD Act.',
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
    <div className="min-h-screen w-full overflow-x-hidden apple-pro-canvas text-[#F5F5F7] font-sans selection:bg-[#D6BA94]/30 selection:text-white">
      {/* ========================================================================= */}
      {/* FLOATING APPLE PRO TITANIUM LIQUID GLASS PILL NAVBAR                      */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 pt-3 pb-2 px-3 sm:px-6 lg:px-8 transition-all">
        <div className="max-w-7xl mx-auto">
          <div className="apple-glass-pill rounded-full px-4 sm:px-6 h-15 flex items-center justify-between gap-2">
            {/* Kinetic Craft Brand Logo (Clicks back to Startseite '/') */}
            <button
              type="button"
              onClick={() => navigateToSubpage('home')}
              className="flex items-center gap-3 text-left cursor-pointer group focus:outline-none"
            >
              <KineticLogoMark className="w-9 h-9 text-white shrink-0 group-hover:scale-105 transition-transform" />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-base tracking-[-0.02em] text-white">Kinetic</span>
                  <span className="font-semibold text-base tracking-[-0.02em] text-[#D6BA94]">Craft</span>
                  <span className="text-[10px] font-medium tracking-wide px-2 py-0.5 rounded-full bg-white/[0.08] text-[#E8D3B5] border border-white/10">
                    Pro
                  </span>
                </div>
                <span className="text-[11px] font-normal text-[#A1A1A6] -mt-0.5">
                  by Kinetic Schweiz
                </span>
              </div>
            </button>

            {/* Desktop 5-Subpage Navigation Pills */}
            <nav
              aria-label="Hauptnavigation"
              className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-black/30 border border-white/10"
            >
              {MARKETING_PAGES.map((page) => {
                const isCurrent = activePage === page.id
                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => navigateToSubpage(page.id)}
                    aria-current={isCurrent ? 'page' : undefined}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      isCurrent
                        ? 'bg-[#F5F5F7] text-[#0B0B0E] font-semibold shadow-sm'
                        : 'text-[#A1A1A6] hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <span>{page.label}</span>
                    {page.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                          isCurrent
                            ? 'bg-[#0B0B0E]/15 text-[#0B0B0E]'
                            : 'bg-[#D6BA94]/20 text-[#E8D3B5]'
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
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={onGoToLogin}
                className="px-4 py-1.5 text-xs font-medium text-[#A1A1A6] hover:text-white hover:bg-white/[0.06] rounded-full transition-all cursor-pointer"
              >
                Einloggen
              </button>
              <button
                onClick={onGoToRegistration}
                className="px-4 py-2 text-xs font-semibold rounded-full apple-starlight-btn cursor-pointer flex items-center gap-1.5"
              >
                <span>14 Tage testen</span>
                <span>→</span>
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-full text-[#A1A1A6] hover:text-white hover:bg-white/10 focus:outline-none"
              aria-label="Menü öffnen"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Subpage Switcher Bar */}
          <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto px-2 py-2 mt-1.5 no-scrollbar">
            {MARKETING_PAGES.map((page) => {
              const isCurrent = activePage === page.id
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => navigateToSubpage(page.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    isCurrent
                      ? 'bg-[#F5F5F7] text-[#0B0B0E] font-semibold'
                      : 'bg-white/[0.06] text-[#A1A1A6] border border-white/10'
                  }`}
                >
                  <span>{page.label}</span>
                </button>
              )
            })}
          </div>

          {/* Mobile Dropdown Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden mt-2 rounded-[28px] apple-glass-stage p-4 space-y-3 animate-fade-in-up">
              <nav className="flex flex-col space-y-1 text-sm font-medium text-[#F5F5F7]">
                {MARKETING_PAGES.map((page) => (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => navigateToSubpage(page.id)}
                    className={`px-4 py-2.5 rounded-2xl text-left flex items-center justify-between ${
                      activePage === page.id ? 'bg-white/15 text-white font-semibold' : 'text-[#A1A1A6] hover:bg-white/[0.06]'
                    }`}
                  >
                    <span>{page.shortTitle}</span>
                    <span className="text-xs text-[#D6BA94]">→</span>
                  </button>
                ))}
              </nav>
              <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                <button
                  onClick={onGoToLogin}
                  className="w-full py-2.5 text-center text-sm font-medium text-white bg-white/[0.08] rounded-full"
                >
                  Einloggen
                </button>
                <button
                  onClick={onGoToRegistration}
                  className="w-full py-2.5 text-center text-sm font-semibold apple-starlight-btn rounded-full"
                >
                  14 Tage kostenlos testen
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Container with programmatic focus target for View Transitions */}
      <main ref={pageHeadingRef} tabIndex={-1} className="focus:outline-none">
        {/* ========================================================================= */}
        {/* SUBPAGE 1: STARTSEITE (`/`) - DER 5-SEKTIONEN KEYNOTE-MIX                 */}
        {/* ========================================================================= */}
        {activePage === 'home' && (
          <>
            {/* SEKTION 1: APPLE KEYNOTE CENTER STAGE HERO (3D MULTI-LAYER TITANIUM COMPOSITION) */}
            <section className="relative pt-10 pb-20 sm:pt-16 sm:pb-28 overflow-hidden">
              {/* Architectural Precision Grid + Ambient Titanium Spotlight */}
              <div className="pointer-events-none absolute inset-0 apple-precision-grid opacity-80" />
              <div
                className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 w-[860px] h-[420px] rounded-full blur-3xl"
                style={{
                  background:
                    'radial-gradient(circle, rgba(214,186,148,0.22) 0%, rgba(255,255,255,0.06) 45%, transparent 72%)',
                }}
              />

              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.05] border border-[#D6BA94]/35 text-[#E8D3B5] text-xs font-medium mb-6 backdrop-blur-xl shadow-lg">
                  <IconSwissFlag className="w-3.5 h-3.5 rounded-xs shrink-0" />
                  <span>Kinetic Schweiz · Schweizer Handwerker-CRM · 100% Swiss QR-Bill & Treuhand</span>
                </div>

                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-[-0.04em] leading-[1.04] max-w-4xl mx-auto">
                  <span className="text-white">Das Handwerker-CRM, </span>
                  <br className="hidden sm:inline" />
                  <span className="apple-titanium-text">das mitdenkt.</span>
                </h1>

                <p className="mt-6 text-base sm:text-lg lg:text-xl text-[#A1A1A6] max-w-2xl mx-auto leading-relaxed font-normal">
                  Vom Aufmass auf der Baustelle bis zur bezahlten <strong className="text-[#F5F5F7] font-medium">Schweizer QR-Rechnung in unter 60 Sekunden</strong>: Schlank und 100% KI-frei im Standardbetrieb – oder optional mit <strong className="text-[#F5F5F7] font-medium">freigeschalteter Firmeneigener KI</strong>.
                </p>

                <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                  <button
                    onClick={onGoToRegistration}
                    className="w-full sm:w-auto px-8 py-4 text-sm sm:text-base font-semibold rounded-full apple-starlight-btn cursor-pointer flex items-center justify-center gap-2.5"
                  >
                    <span>14 Tage kostenlos testen</span>
                    <span>→</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToSubpage('funktionen')}
                    className="w-full sm:w-auto px-7 py-4 text-sm sm:text-base font-medium text-[#F5F5F7] hover:text-white bg-white/[0.06] hover:bg-white/[0.11] border border-white/15 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer backdrop-blur-xl"
                  >
                    <span>Alle 10 CRM-Module ansehen</span>
                    <span className="text-[#D6BA94]">›</span>
                  </button>
                </div>

                {/* Micro Trust Strip */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-5 sm:gap-8 text-xs text-[#A1A1A6]">
                  <div className="flex items-center gap-1.5">
                    <IconCheck className="w-3.5 h-3.5 text-[#D6BA94] shrink-0" />
                    <span>Keine Kreditkarte erforderlich</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <IconCheck className="w-3.5 h-3.5 text-[#D6BA94] shrink-0" />
                    <span>In 2 Minuten startklar</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <IconCheck className="w-3.5 h-3.5 text-[#D6BA94] shrink-0" />
                    <span>Schweizer Support & DSG-konform</span>
                  </div>
                </div>
              </div>

              {/* FLOATING MACBOOK PRO SPACE BLACK TITANIUM HARDWARE STAGE + FLOATING GLASS OVERLAYS */}
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 sm:mt-18 relative z-10">
                {/* Ambient Titanium Floor Reflection under Hardware */}
                <div className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 w-[85%] h-28 apple-floor-glow rounded-full" />

                {/* Floating Glass Overlay Left (Desktop Keynote Depth Layer): 60s A4-PDF Offerte */}
                <div className="hidden xl:block absolute -left-2 bottom-10 z-20 w-72 apple-glass-stage rounded-[24px] p-4 border border-[#D6BA94]/45 shadow-2xl animate-float">
                  <div className="flex items-center justify-between text-[11px] mb-2">
                    <span className="text-[#E8D3B5] font-semibold flex items-center gap-1.5">
                      <IconDocument className="w-3.5 h-3.5 text-[#D6BA94]" />
                      Auto-PDF in 42 Sek.
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
                      8.1% MWST
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white text-[#0B0B0E] text-[11px] space-y-1 shadow-inner">
                    <div className="flex items-center justify-between font-bold border-b border-black/10 pb-1">
                      <span>Offerte #OF-2026-041</span>
                      <IconSwissFlag className="w-3.5 h-3.5 rounded-xs" />
                    </div>
                    <div className="flex justify-between text-[10px] text-black/70">
                      <span>Pos. 1–2 (Katalog: 85 m²)</span>
                      <span className="font-semibold text-black">CHF 2&apos;986.25</span>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-[#A1A1A6] flex items-center justify-between">
                    <span>✓ Automatisch im Kundenordner</span>
                    <span className="text-[#D6BA94] font-semibold">PDF bereit</span>
                  </div>
                </div>

                {/* Floating Glass Overlay Right (Desktop Keynote Depth Layer): PC ⇄ Smartphone Sync */}
                <div className="hidden xl:block absolute -right-2 top-14 z-20 w-72 apple-glass-stage rounded-[24px] p-4 border border-emerald-400/35 shadow-2xl animate-float-delayed">
                  <div className="flex items-center justify-between text-[11px] mb-2">
                    <span className="text-white font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Büro-PC ⇄ Baustellen-Handy
                    </span>
                    <span className="text-emerald-300 font-semibold">100% Sync</span>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-[#F5F5F7] flex items-center justify-between">
                      <span>📁 Projekt Bahnhofstr. 12</span>
                      <span className="text-emerald-300">Live</span>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-[#A1A1A6] flex items-center justify-between">
                      <span>📸 14 Fotos & Unterschrift</span>
                      <span className="text-[#E8D3B5]">Synchron</span>
                    </div>
                  </div>
                </div>

                {/* Main MacBook Pro Space Black Titanium Chassis */}
                <div className="max-w-6xl mx-auto apple-hardware-bezel rounded-[34px] p-3 sm:p-5 overflow-hidden relative">
                  {/* Top Camera Notch Accent */}
                  <div className="hidden sm:flex absolute top-0 left-1/2 -translate-x-1/2 w-28 h-2.5 bg-black/90 rounded-b-xl border-x border-b border-white/15 items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1C1C22] ring-1 ring-white/20" />
                  </div>

                  <div className="px-3 sm:px-4 py-2.5 mb-3 rounded-2xl bg-black/50 border border-white/10 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]/80" />
                      <span className="ml-2 text-xs text-[#A1A1A6] hidden sm:inline">
                        craft.kinetic-schweiz.ch · Space Black Titanium Workspace
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-3 py-1 rounded-full bg-white/[0.07] text-white font-medium">
                        10 Module inklusive
                      </span>
                      <span className="px-3 py-1 rounded-full bg-[#D6BA94]/15 text-[#E8D3B5] font-medium hidden md:inline">
                        Auto-PDF & Ordner-Sync
                      </span>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-medium">
                        100% revDSG
                      </span>
                    </div>
                  </div>

                  <div
                    className="relative group cursor-pointer rounded-[22px] overflow-hidden border border-white/15 bg-black"
                    onClick={() => setZoomedImage('/screenshots/01_hero_dashboard.png')}
                  >
                    <img
                      src="/screenshots/01_hero_dashboard.png"
                      alt="Kinetic Craft Dashboard Übersicht"
                      fetchPriority="high"
                      className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.008]"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="px-5 py-2.5 apple-glass-pill rounded-full text-xs font-medium text-white inline-flex items-center gap-2">
                        <IconSearch className="w-3.5 h-3.5 text-[#D6BA94]" />
                        <span>Vollbild-Vorschau öffnen</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* STATS & SWISS TRUST BAR */}
            <section className="py-14 border-y border-white/10 bg-black/30">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                  <div>
                    <div className="text-3xl sm:text-5xl font-semibold apple-titanium-text tracking-[-0.04em] tabular-nums">
                      60 Sek.
                    </div>
                    <div className="text-xs sm:text-sm text-[#A1A1A6] mt-1.5">Von Aufmass zur fertigen Offerte</div>
                  </div>
                  <div>
                    <div className="text-3xl sm:text-5xl font-semibold text-white tracking-[-0.04em] tabular-nums">
                      100%
                    </div>
                    <div className="text-xs sm:text-sm text-[#A1A1A6] mt-1.5">Swiss QR-Rechnung & MWST-konform</div>
                  </div>
                  <div>
                    <div className="text-3xl sm:text-5xl font-semibold apple-titanium-text tracking-[-0.04em] tabular-nums">
                      10 Module
                    </div>
                    <div className="text-xs sm:text-sm text-[#A1A1A6] mt-1.5">Komplettes Handwerker-CRM in 1 System</div>
                  </div>
                  <div>
                    <div className="text-3xl sm:text-5xl font-semibold text-white tracking-[-0.04em] flex items-center justify-center gap-2.5">
                      <IconSwissFlag className="w-7 h-7 rounded-md shadow-xs" />
                      <span>DSG</span>
                    </div>
                    <div className="text-xs sm:text-sm text-[#A1A1A6] mt-1.5">Schweizer Datenschutz & ISO 27001</div>
                  </div>
                </div>
              </div>
            </section>

            {/* USP #1: BLITZSCHNELL OFFERIEREN (NUR WERTE EINGEBEN ODER MUNDART SPRECHEN -> AUTO-PDF & ABLAGE) */}
            <section id="schnell-offerieren" className="py-24 border-b border-white/10 relative overflow-hidden">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
                <div className="text-center max-w-3xl mx-auto">
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-[#E8D3B5] bg-[#D6BA94]/12 border border-[#D6BA94]/25 px-4 py-1.5 rounded-full">
                    <IconDocument className="w-3.5 h-3.5 text-[#D6BA94]" />
                    <span>Der grösste Zeitgewinn im Alltag · Automatischer PDF-Ersteller & Ordner-Ablage</span>
                  </span>
                  <h2 className="text-3xl sm:text-5xl font-semibold text-white mt-5 tracking-[-0.035em] leading-[1.08]">
                    In 3 Schritten zur fertigen PDF-Offerte.{' '}
                    <span className="apple-titanium-text">
                      Nur Werte eingeben – oder auf Schweizerdeutsch einsprechen.
                    </span>
                  </h2>
                  <p className="text-base sm:text-lg text-[#A1A1A6] mt-4 leading-relaxed">
                    Schluss mit stundenlangem Formatieren in Word oder Excel am Feierabend: Unser automatischer Dokumentenersteller nimmt Ihnen die Schreibarbeit, das Layout und sogar die Ordner-Ablage komplett ab.
                  </p>
                </div>

                {/* 3-Step Visual Pipeline */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 items-stretch">
                  {/* Schritt 1 */}
                  <div className="apple-glass-stage p-8 rounded-[30px] border-[#D6BA94]/40 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="px-3.5 py-1 rounded-full bg-[#D6BA94]/20 border border-[#D6BA94]/35 text-[#E8D3B5] text-xs font-semibold">
                          Schritt 1 · Positionen erfassen
                        </span>
                        <span className="text-xs text-[#A1A1A6] font-medium">~20 Sek.</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.025em]">
                        Aus Katalog wählen & nur Masse eingeben – oder per KI einsprechen
                      </h3>
                      <p className="text-sm text-[#A1A1A6] leading-relaxed">
                        Ihre Leistungen, Preise und Einheiten sind im Katalog hinterlegt. Sie wählen die gewünschte Arbeit aus und tippen nur noch die Zahl (z. B. <code className="text-[#E8D3B5]">85 m²</code> oder <code className="text-[#E8D3B5]">4.5 Std.</code>) ein.
                      </p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs">
                        <div className="font-semibold text-white mb-0.5">Standard-CRM (ohne KI):</div>
                        <p className="text-[#A1A1A6]">
                          Katalog-Position anklicken → Masse/Menge eingeben → Einzelpreis, Total & 8.1% MWST berechnen sich sofort von selbst.
                        </p>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-400/25 text-xs">
                        <div className="font-semibold text-emerald-300 mb-0.5">Optional mit Firmeneigener KI:</div>
                        <p className="text-[#F5F5F7]/90">
                          Einfach auf Schweizerdeutsch ins Handy sprechen: <em>«Offerte für Familie Meier, Wohnzimmer 65 Quadratmeter weiss streichen und Abdeckarbeiten...»</em> – fertig ist der Entwurf!
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Schritt 2 */}
                  <div className="apple-glass-card p-8 rounded-[30px] flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-white text-xs font-semibold">
                          Schritt 2 · Auto-PDF-Ersteller
                        </span>
                        <span className="text-xs text-[#A1A1A6] font-medium">1 Klick</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.025em]">
                        Automatischer A4-PDF-Dokumentenersteller mit Ihrem Logo
                      </h3>
                      <p className="text-sm text-[#A1A1A6] leading-relaxed">
                        Kein Verrutschen von Zeilen oder Seitenumbrüchen mehr: Kinetic Craft generiert vollautomatisch ein druckfertiges Schweizer A4-PDF mit Ihrem Briefkopf, sauberem Ausmass und Konditionen.
                      </p>
                    </div>

                    <ul className="space-y-2.5 text-xs sm:text-sm text-[#F5F5F7]/90 pt-2">
                      <li className="flex items-center gap-2.5">
                        <IconCheck className="w-4 h-4 text-[#D6BA94] shrink-0" />
                        <span>Perfektes A4-Layout mit Firmenlogo, Briefkopf & Fusszeile</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <IconCheck className="w-4 h-4 text-[#D6BA94] shrink-0" />
                        <span>1-Klick-Umwandlung von Offerte in Rechnung inkl. Swiss QR-Code</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <IconCheck className="w-4 h-4 text-[#D6BA94] shrink-0" />
                        <span>Direkt aus der App per E-Mail versenden oder ausdrucken</span>
                      </li>
                    </ul>
                  </div>

                  {/* Schritt 3 */}
                  <div className="apple-glass-card p-8 rounded-[30px] flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/25 text-emerald-300 text-xs font-semibold">
                          Schritt 3 · Auto-Ordner & Sync
                        </span>
                        <span className="text-xs text-emerald-300 font-medium">100% Automatisch</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.025em]">
                        Vollautomatische Ordner-Ablage & PC/Handy-Synchronisation
                      </h3>
                      <p className="text-sm text-[#A1A1A6] leading-relaxed">
                        Vergessen Sie «Speichern unter...» und unauffindbare Dateien: Jedes erstellte Dokument und jedes Baustellenfoto landet automatisch im richtigen Kunden- und Projektordner.
                      </p>
                    </div>

                    <ul className="space-y-2.5 text-xs sm:text-sm text-[#F5F5F7]/90 pt-2">
                      <li className="flex items-center gap-2.5">
                        <IconCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                        <span>Automatische Ordnerstruktur für jeden Kunden & jede Baustelle</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <IconCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                        <span>PC im Büro & Smartphone auf der Baustelle immer 100% synchron</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <IconCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                        <span>Von überall her sofort Zugriff auf alle Kunden, Fotos & PDFs</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* USP #2: INTERAKTIVES APPLE-KEYNOTE SHOWCASE FÜR SCHNELLES OFFERIEREN & AUTO-ORDNER */}
                <div className="apple-glass-stage rounded-[32px] p-6 sm:p-10 lg:p-12 border-[#D6BA94]/45 space-y-8">
                  {/* Segmented Mode Switcher */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                    <div>
                      <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-300 bg-emerald-500/12 border border-emerald-400/25 px-3.5 py-1 rounded-full mb-2">
                        <span>Live-Vorschau · Klicken zum Umschalten</span>
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-semibold text-white tracking-[-0.03em]">
                        Automatische Ordner-Erstellung.{' '}
                        <span className="apple-titanium-text">
                          PC & Smartphone immer 100% synchron.
                        </span>
                      </h3>
                    </div>

                    <div className="inline-flex flex-wrap items-center gap-1.5 p-1.5 rounded-full apple-glass-pill self-start">
                      <button
                        type="button"
                        onClick={() => setActiveQuotingMode('katalog')}
                        className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                          activeQuotingMode === 'katalog'
                            ? 'bg-[#F5F5F7] text-[#0B0B0E] font-semibold shadow-sm'
                            : 'text-[#A1A1A6] hover:text-white'
                        }`}
                      >
                        1. Katalog & nur Werte eingeben
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveQuotingMode('mundart_ki')}
                        className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                          activeQuotingMode === 'mundart_ki'
                            ? 'bg-[#F5F5F7] text-[#0B0B0E] font-semibold shadow-sm'
                            : 'text-[#A1A1A6] hover:text-white'
                        }`}
                      >
                        2. Schweizerdeutsch sprechen (KI)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveQuotingMode('auto_ordner')}
                        className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                          activeQuotingMode === 'auto_ordner'
                            ? 'bg-[#F5F5F7] text-[#0B0B0E] font-semibold shadow-sm'
                            : 'text-[#A1A1A6] hover:text-white'
                        }`}
                      >
                        3. Auto-Ordner & PC ⇄ Handy Sync
                      </button>
                    </div>
                  </div>

                  {/* Mode 1: Katalog & nur Werte eingeben -> Echte Schweizer A4-Dokument-Grafik */}
                  {activeQuotingMode === 'katalog' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
                      <div className="lg:col-span-5 space-y-4">
                        <span className="text-xs font-semibold text-[#E8D3B5] bg-[#D6BA94]/15 border border-[#D6BA94]/30 px-3 py-1 rounded-full inline-block">
                          Modus 1 · Im Standard-CRM (100% ohne KI)
                        </span>
                        <h4 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.02em]">
                          Katalog-Position anklicken → nur noch Zahl eingeben → fertiges A4-PDF
                        </h4>
                        <p className="text-sm text-[#A1A1A6] leading-relaxed">
                          Ihre häufigsten Arbeiten (z. B. Abdecken, Grundieren, Zweifach-Anstrich, Regiestunde) sind einmal im Katalog hinterlegt. Für eine neue Offerte wählen Sie die Positionen aus, tippen nur die Quadratmeter oder Stunden ein – und der automatische Dokumentenersteller generiert sofort das fertige A4-PDF.
                        </p>
                        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-xs space-y-1.5">
                          <div className="font-semibold text-white">Was automatisch im Hintergrund passiert:</div>
                          <p className="text-[#A1A1A6]">
                            ✓ Einzelpreise, Einheiten, Zwischentotal & 8.1% MWST berechnet · ✓ A4-PDF mit Ihrem Firmenlogo erstellt · ✓ Automatisch im Kundenordner abgelegt.
                          </p>
                        </div>
                      </div>

                      {/* Visual Split: Left Katalog Value Input -> Right Crisp White Swiss A4 PDF Sheet */}
                      <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch">
                        {/* Left: Dark Katalog Input Card */}
                        <div className="sm:col-span-5 bg-black/65 rounded-[22px] p-4 border border-white/15 flex flex-col justify-between space-y-3 text-xs">
                          <div>
                            <div className="text-[11px] font-semibold text-[#E8D3B5] pb-2 border-b border-white/10 flex items-center justify-between">
                              <span>1. Katalog-Eingabe</span>
                              <span className="text-[#A1A1A6]">Nur Zahl tippen</span>
                            </div>
                            <div className="space-y-2.5 mt-3">
                              <div className="p-2.5 rounded-xl bg-white/[0.05] border border-white/10">
                                <span className="text-white font-medium block">Pos. 1.0 · Abdeckarbeiten</span>
                                <div className="flex items-center justify-between mt-1.5">
                                  <span className="text-[10px] text-[#A1A1A6]">CHF 8.50/m²</span>
                                  <span className="px-2.5 py-0.5 rounded-md bg-[#D6BA94]/25 border border-[#D6BA94]/50 text-[#FFF3E0] font-semibold">
                                    Eingabe: 85 m²
                                  </span>
                                </div>
                              </div>
                              <div className="p-2.5 rounded-xl bg-white/[0.05] border border-white/10">
                                <span className="text-white font-medium block">Pos. 2.0 · 2× Anstrich weiss</span>
                                <div className="flex items-center justify-between mt-1.5">
                                  <span className="text-[10px] text-[#A1A1A6]">CHF 24.00/m²</span>
                                  <span className="px-2.5 py-0.5 rounded-md bg-[#D6BA94]/25 border border-[#D6BA94]/50 text-[#FFF3E0] font-semibold">
                                    Eingabe: 85 m²
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-emerald-500/12 border border-emerald-400/25 text-emerald-300 text-[11px] font-medium">
                            ✓ Automatisch in A4-Offerte & Kundenordner übernommen
                          </div>
                        </div>

                        {/* Right: Visual Swiss A4 PDF Document Graphic */}
                        <div className="sm:col-span-7 apple-a4-sheet rounded-[20px] p-5 flex flex-col justify-between text-[11px]">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between border-b border-black/10 pb-2.5">
                              <div>
                                <span className="font-bold text-xs text-[#0B0B0E] block">Malerbetrieb Martin Keller GmbH</span>
                                <span className="text-[10px] text-black/60">CHE-114.829.301 MWST · 8004 Zürich</span>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-black text-white font-semibold text-[10px]">
                                A4-PDF
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-black/50 block">Empfänger (Zefix verifiziert):</span>
                                <span className="font-semibold text-[#0B0B0E]">Hausverwaltung Meier AG</span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-[#0B0B0E] block">Offerte OF-2026-041</span>
                                <span className="text-[10px] text-black/60">Fassaden- & Innenrenovation</span>
                              </div>
                            </div>

                            <div className="border-t border-b border-black/10 py-2 space-y-1.5">
                              <div className="flex justify-between text-[10px] font-semibold text-black/55">
                                <span>Position / Katalogtext</span>
                                <span>Menge × Ansatz = Total</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-[#0B0B0E]">1.0 Abdeck- & Schutzarbeiten</span>
                                <span className="tabular-nums font-semibold text-[#0B0B0E]">85 m² × 8.50 = CHF 722.50</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-[#0B0B0E]">2.0 Wände & Decken 2× streichen</span>
                                <span className="tabular-nums font-semibold text-[#0B0B0E]">85 m² × 24.00 = CHF 2&apos;040.00</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 space-y-1.5">
                            <div className="flex justify-between text-[10px] text-black/65">
                              <span>Zwischentotal exkl. MWST</span>
                              <span className="tabular-nums">CHF 2&apos;762.50</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-black/65">
                              <span>Zzgl. 8.1% Schweizer MWST</span>
                              <span className="tabular-nums">CHF 223.75</span>
                            </div>
                            <div className="flex justify-between items-center pt-1.5 border-t border-black/15 font-bold text-xs text-[#0B0B0E]">
                              <span className="flex items-center gap-1.5">
                                <IconSwissFlag className="w-3.5 h-3.5 rounded-xs" />
                                Total inkl. MWST
                              </span>
                              <span className="tabular-nums text-sm">CHF 2&apos;986.25</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Schweizerdeutsch sprechen (mit eigener KI) -> Sprachwelle + A4-Blatt-Grafik */}
                  {activeQuotingMode === 'mundart_ki' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
                      <div className="lg:col-span-5 space-y-4">
                        <span className="text-xs font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-400/25 px-3 py-1 rounded-full inline-block">
                          Modus 2 · Mit freigeschalteter Firmeneigener KI
                        </span>
                        <h4 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.02em]">
                          Auf Schweizerdeutsch ins Handy sprechen → fertige A4-Offerte in Sekunden
                        </h4>
                        <p className="text-sm text-[#A1A1A6] leading-relaxed">
                          Noch während Sie beim Kunden durch die Wohnung laufen, sprechen Sie die Masse und Arbeiten einfach in Ihrer gewohnten Mundart ins Smartphone. Ihre firmeneigene KI sucht automatisch die passenden Positionen aus Ihrem Katalog und erstellt das fertige A4-PDF in Hochdeutsch.
                        </p>
                      </div>

                      <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch">
                        {/* Left: iPhone Voice Dictation Card */}
                        <div className="sm:col-span-5 bg-black/65 rounded-[22px] p-4 border border-emerald-400/30 flex flex-col justify-between space-y-3 text-xs">
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                                <IconMic className="w-3.5 h-3.5 text-emerald-300" />
                                Mundart-Sprachaufnahme
                              </span>
                              <span className="text-[#A1A1A6]">00:14</span>
                            </div>
                            {/* Visual Audio Waveform Bars */}
                            <div className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-white/[0.04] border border-white/10">
                              {[10, 22, 16, 28, 18, 26, 12, 24, 30, 16, 20, 14, 24, 18, 10].map((h, i) => (
                                <span
                                  key={i}
                                  className="w-1 rounded-full bg-gradient-to-t from-[#D6BA94] to-emerald-300"
                                  style={{ height: `${h}px` }}
                                />
                              ))}
                            </div>
                            <p className="text-white/90 italic text-xs leading-relaxed">
                              «Mach mir e Offerte für d Familie Meier: Wohnzimmer und Gang zäme 85 Quadratmeter abdecke und zweimal wiiss striiche, plus 3 Stund Regie für chliini Gipser-Usbeserige...»
                            </p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-emerald-500/12 border border-emerald-400/25 text-emerald-300 text-[11px] font-medium">
                            ✨ KI übersetzt Mundart → Hochdeutsch & ordnet Katalogpreise zu
                          </div>
                        </div>

                        {/* Right: Resulting White Swiss A4 Offerte Sheet */}
                        <div className="sm:col-span-7 apple-a4-sheet rounded-[20px] p-5 flex flex-col justify-between text-[11px]">
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between border-b border-black/10 pb-2">
                              <span className="font-bold text-xs text-[#0B0B0E]">Offerte OF-2026-042 · Familie Meier</span>
                              <span className="px-2 py-0.5 rounded bg-emerald-700 text-white font-semibold text-[10px]">
                                Aus Sprachdiktat
                              </span>
                            </div>
                            <div className="space-y-1.5 pt-1">
                              <div className="p-2 rounded-lg bg-black/[0.04] flex justify-between">
                                <span className="font-medium text-[#0B0B0E]"><strong>Pos. 1:</strong> Abdeckarbeiten (85 m²)</span>
                                <span className="font-semibold tabular-nums">CHF 722.50</span>
                              </div>
                              <div className="p-2 rounded-lg bg-black/[0.04] flex justify-between">
                                <span className="font-medium text-[#0B0B0E]"><strong>Pos. 2:</strong> Zweifach-Anstrich weiss (85 m²)</span>
                                <span className="font-semibold tabular-nums">CHF 2&apos;040.00</span>
                              </div>
                              <div className="p-2 rounded-lg bg-black/[0.04] flex justify-between">
                                <span className="font-medium text-[#0B0B0E]"><strong>Pos. 3:</strong> Gipser-Ausbesserung (3.0 Std.)</span>
                                <span className="font-semibold tabular-nums">CHF 330.00</span>
                              </div>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-black/15 flex items-center justify-between font-bold text-xs text-[#0B0B0E]">
                            <span>✓ Automatisch im Kundenordner abgelegt</span>
                            <span className="tabular-nums text-sm">CHF 3&apos;343.00</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mode 3: Auto-Ordner & PC/Handy Sync -> Dual-Device macOS Finder ⇄ iPhone Baustelle Graphic */}
                  {activeQuotingMode === 'auto_ordner' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
                      <div className="lg:col-span-5 space-y-4">
                        <span className="text-xs font-semibold text-[#E8D3B5] bg-[#D6BA94]/15 border border-[#D6BA94]/30 px-3 py-1 rounded-full inline-block">
                          Modus 3 · Vollautomatische Kunden- & Projekt-Akte
                        </span>
                        <h4 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.02em]">
                          Nie wieder Dateien suchen: Automatische Ordner auf PC & Smartphone synchron
                        </h4>
                        <p className="text-sm text-[#A1A1A6] leading-relaxed">
                          Sobald Sie einen Kunden oder ein Projekt erfassen, legt Kinetic Craft im Hintergrund automatisch die komplette Ordnerstruktur an. Ob Sie auf der Baustelle mit dem Handy ein Foto knipsen oder im Büro am PC eine Offerte schreiben – alles ist sofort an beiden Orten sauber sortiert griffbereit.
                        </p>
                      </div>

                      {/* Visual Dual-Device macOS Window ⇄ iPhone Sync Tree */}
                      <div className="lg:col-span-7 bg-black/60 rounded-[24px] p-5 sm:p-6 border border-white/15 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
                          <span className="font-semibold text-white flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                            Automatische Projekt- & Kundenablage
                          </span>
                          <span className="text-emerald-300 bg-emerald-500/15 px-3 py-0.5 rounded-full font-medium">
                            Live-Sync: Büro-PC ⇄ Handy
                          </span>
                        </div>

                        <div className="space-y-2.5 text-xs font-sans">
                          <div className="p-3 rounded-xl bg-white/[0.06] border border-white/10 text-white font-semibold flex items-center justify-between">
                            <span>📁 Kunde: Hausverwaltung Meier AG (Zefix verifiziert)</span>
                            <span className="text-[11px] text-[#E8D3B5] font-normal">Automatisch erstellt</span>
                          </div>
                          <div className="pl-4 sm:pl-6 space-y-2">
                            <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                              <span className="text-[#F5F5F7] font-medium">📂 Projekt: Fassadenrenovation Bahnhofstr. 12</span>
                              <span className="text-[11px] text-emerald-300 font-semibold">100% Synchron</span>
                            </div>
                            <div className="pl-4 sm:pl-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="p-2.5 rounded-lg bg-[#D6BA94]/12 border border-[#D6BA94]/30 text-[#E8D3B5]">
                                📄 Offerte_2026-041.pdf <span className="block text-[10px] text-[#A1A1A6]">Am Büro-PC aus Katalog erstellt</span>
                              </div>
                              <div className="p-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-white">
                                📸 14 Baustellen-Fotos <span className="block text-[10px] text-[#A1A1A6]">Vom Baustellen-Handy synchronisiert</span>
                              </div>
                              <div className="p-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-white">
                                ✍️ Regierapport_signiert.pdf <span className="block text-[10px] text-[#A1A1A6]">Vor Ort auf Smartphone signiert</span>
                              </div>
                              <div className="p-2.5 rounded-lg bg-emerald-500/12 border border-emerald-400/25 text-emerald-300">
                                🇨🇭 QR-Rechnung_2026.pdf <span className="block text-[10px] text-[#A1A1A6]">Mit 1 Klick abgerechnet</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* FÜR WEN IST KINETIC CRAFT GEBAUT? (PASCAL, MARTIN 52 & GRÖSSERE KMU) */}
            <section className="py-24 border-b border-white/10">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
                <div className="text-center max-w-3xl mx-auto">
                  <span className="text-xs font-medium text-[#E8D3B5] bg-[#D6BA94]/12 border border-[#D6BA94]/25 px-4 py-1.5 rounded-full">
                    Aus der Praxis für die Praxis · Ohne IT-Kauderwelsch
                  </span>
                  <h2 className="text-3xl sm:text-5xl font-semibold text-white mt-5 tracking-[-0.035em]">
                    Gebaut für echte Schweizer Handwerker.{' '}
                    <span className="apple-titanium-text">
                      Vom Solo-Profi bis zum KMU.
                    </span>
                  </h2>
                  <p className="text-base text-[#A1A1A6] mt-3 leading-relaxed">
                    Egal ob Sie alleine auf der Baustelle stehen, einen Betrieb mit 4 Mitarbeitenden führen oder 20 Monteure koordinieren: Kinetic Craft macht Ihnen das Leben im Alltag spürbar leichter.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 items-stretch">
                  {/* Persona 1: Pascal (Solo-Maler) */}
                  <div className="apple-glass-card p-8 rounded-[30px] flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#E8D3B5] bg-[#D6BA94]/15 border border-[#D6BA94]/30 px-3 py-1 rounded-full">
                          1-Mann-Betrieb · Solo-Selbstständig
                        </span>
                        <span className="text-xs text-emerald-300 font-semibold">~4.5 Std./Woche frei</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.02em]">
                        Pascal, selbstständiger Maler (alleine unterwegs)
                      </h3>
                      <p className="text-sm text-[#A1A1A6] leading-relaxed">
                        <strong className="text-white">Das Problem vorher:</strong> Tagsüber 9 Stunden beim Kunden streichen und abends um 20 Uhr noch am Küchentisch sitzen, um Offerten zu tippen und Quittungen zu suchen.
                      </p>
                      <p className="text-sm text-[#F5F5F7]/90 leading-relaxed">
                        <strong className="text-[#E8D3B5]">Mit Kinetic Craft:</strong> Pascal wählt noch auf dem Parkplatz am Handy die Positionen aus seinem Katalog, gibt nur die Quadratmeter ein (oder spricht die Offerte kurz auf Schweizerdeutsch ein) – fertig ist das PDF inkl. automatischer Ablage. Am Abend hat er wirklich Feierabend.
                      </p>
                    </div>
                    <div className="pt-4 border-t border-white/10 text-xs text-[#A1A1A6] flex items-center justify-between">
                      <span>Lieblingsfunktion: <strong className="text-white">60s-Offerte & Handy-App</strong></span>
                      <span className="text-[#E8D3B5] font-semibold">ab CHF 49.–/Mt.</span>
                    </div>
                  </div>

                  {/* Persona 2: Martin (52), Maler & Gipser mit 4 Angestellten */}
                  <div className="apple-glass-stage p-8 rounded-[30px] border-[#D6BA94]/50 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#0B0B0E] apple-titanium-btn px-3 py-1 rounded-full">
                          Meisterbetrieb · 2 bis 8 Mitarbeitende
                        </span>
                        <span className="text-xs text-emerald-300 font-semibold">~6.0 Std./Woche frei</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.02em]">
                        Martin (52), Maler- & Gipsergeschäft mit 4 Angestellten
                      </h3>
                      <p className="text-sm text-[#A1A1A6] leading-relaxed">
                        <strong className="text-white">Das Problem vorher:</strong> Martin will keine komplizierte Büroschreibtisch-Software studieren. Bisher gingen Regiestunden auf Papierzetteln verloren und Baustellenfotos seiner 4 Leute landeten ungeordnet in WhatsApp-Gruppen.
                      </p>
                      <p className="text-sm text-[#F5F5F7]/90 leading-relaxed">
                        <strong className="text-[#E8D3B5]">Mit Kinetic Craft:</strong> Alles ist selbsterklärend und aufgeräumt. Seine 4 Mitarbeitenden fotografieren Belege und Baustellen direkt in die App – und bei Martin am Büro-PC liegt automatisch alles im richtigen Kunden- und Projektordner bereit.
                      </p>
                    </div>
                    <div className="pt-4 border-t border-white/10 text-xs text-[#A1A1A6] flex items-center justify-between">
                      <span>Lieblingsfunktion: <strong className="text-white">Auto-Ordner & PC/Handy-Sync</strong></span>
                      <span className="text-[#E8D3B5] font-semibold">Null Schulungsaufwand</span>
                    </div>
                  </div>

                  {/* Persona 3: Grössere Handwerks-KMU (10-25+ Mitarbeitende) */}
                  <div className="apple-glass-card p-8 rounded-[30px] flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-400/25 px-3 py-1 rounded-full">
                          Grösserer Betrieb · 10 bis 25+ Mitarbeitende
                        </span>
                        <span className="text-xs text-emerald-300 font-semibold">~8.5 Std./Woche frei</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.02em]">
                        Grössere KMU-Betriebe mit Büro, Projektleitung & Teams
                      </h3>
                      <p className="text-sm text-[#A1A1A6] leading-relaxed">
                        <strong className="text-white">Das Problem vorher:</strong> Dutzende laufende Baustellen gleichzeitig, hunderte Lieferantenrechnungen pro Monat, Akontorechnungen und zeitraubendes Nachfassen bei offenen Debitoren.
                      </p>
                      <p className="text-sm text-[#F5F5F7]/90 leading-relaxed">
                        <strong className="text-[#E8D3B5]">Mit Kinetic Craft:</strong> Büro und Baustellen arbeiten in Echtzeit im selben System. Mit dem 3-Stufen-Mahnwesen, camt.053-Bankabgleich, Banana-Treuhand-Export und der optionalen <strong className="text-white">Firmeneigenen KI</strong> läuft die Administration wie ein Schweizer Uhrwerk.
                      </p>
                    </div>
                    <div className="pt-4 border-t border-white/10 text-xs text-[#A1A1A6] flex items-center justify-between">
                      <span>Lieblingsfunktion: <strong className="text-white">Firmeneigene KI & Treuhand-Export</strong></span>
                      <span className="text-emerald-300 font-semibold">100% revDSG</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SEKTION: PREISE & RECHNER TEASER */}
            <section className="py-24">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="apple-glass-card rounded-[32px] p-8 sm:p-12 flex flex-col lg:flex-row items-center justify-between gap-8">
                  <div className="max-w-2xl space-y-3">
                    <span className="text-xs font-medium text-[#E8D3B5] bg-[#D6BA94]/12 border border-[#D6BA94]/25 px-4 py-1.5 rounded-full">
                      Transparente Schweizer Pakete
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-semibold text-white tracking-[-0.03em]">
                      Starten Sie ab CHF 49.– / Monat – oder berechnen Sie Ihren ROI.
                    </h2>
                    <p className="text-sm sm:text-base text-[#A1A1A6] leading-relaxed">
                      Wählen Sie zwischen <strong className="text-white font-medium">Kinetic Craft Professional (ohne KI)</strong> und <strong className="text-white font-medium">Enterprise (inkl. freigeschalteter Firmeneigener KI)</strong>. 14 Tage kostenlos und unverbindlich testen.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3.5 shrink-0 w-full lg:w-auto">
                    <button
                      type="button"
                      onClick={() => navigateToSubpage('preise')}
                      className="w-full sm:w-auto px-7 py-4 rounded-full apple-titanium-btn text-xs sm:text-sm font-semibold cursor-pointer"
                    >
                      Preise & Ersparnis-Rechner öffnen →
                    </button>
                    <button
                      type="button"
                      onClick={onGoToRegistration}
                      className="w-full sm:w-auto px-7 py-4 rounded-full apple-starlight-btn text-xs sm:text-sm font-semibold cursor-pointer"
                    >
                      14 Tage kostenlos testen
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ========================================================================= */}
        {/* SUBPAGE 2: ALLE FUNKTIONEN (`/funktionen`) - ALLE 10 CRM-MODULE           */}
        {/* ========================================================================= */}
        {activePage === 'funktionen' && (
          <>
            {/* Subpage Hero */}
            <section className="pt-12 pb-16 border-b border-white/10">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D6BA94]/12 border border-[#D6BA94]/25 text-[#E8D3B5] text-xs font-medium mb-5">
                  <IconQrBill className="w-3.5 h-3.5 text-[#D6BA94]" />
                  <span>Alle Funktionen · 10 Module in 4 Kategorien · 100% Standard-CRM</span>
                </span>
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold text-white tracking-[-0.04em] max-w-4xl mx-auto leading-[1.08]">
                  Alle 10 CRM-Module.{' '}
                  <span className="apple-titanium-text">
                    Perfekt aufeinander abgestimmt.
                  </span>
                </h1>
                <p className="mt-5 text-base sm:text-lg text-[#A1A1A6] max-w-3xl mx-auto leading-relaxed">
                  Hier sehen Sie sämtliche Module und Funktionen der Standard-Version von Kinetic Craft (100% ohne KI) – vom smarten Baustellen-Cockpit über Zefix-Kundenverwaltung und Offerten bis zur ISO 20022 QR-Rechnung, dem 3-Stufen-Mahnwesen und dem Export für Banana Buchhaltung.
                </p>

                {/* Quick-Jump Category Pill Bar */}
                <div className="mt-8 inline-flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-full apple-glass-pill">
                  {allCrmModuleCategories.map((cat) => (
                    <button
                      key={cat.categoryId}
                      type="button"
                      onClick={() => document.getElementById(cat.categoryId)?.scrollIntoView({ behavior: 'smooth' })}
                      className="px-4 py-2 rounded-full text-xs font-medium text-[#F5F5F7] hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
                    >
                      {cat.categoryBadge}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* ALL 10 MODULES GROUPED IN 4 CATEGORIES (CLEAN VERTICAL WALKTHROUGH) */}
            <section className="py-16 space-y-24">
              {allCrmModuleCategories.map((cat) => (
                <div id={cat.categoryId} key={cat.categoryId} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 scroll-mt-24">
                  {/* Category Header */}
                  <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                      <span className="text-xs font-medium text-[#D6BA94] block mb-2">
                        {cat.categoryBadge}
                      </span>
                      <h2 className="text-2xl sm:text-4xl font-semibold text-white tracking-[-0.03em]">
                        {cat.categoryTitle}
                      </h2>
                    </div>
                    <p className="text-sm text-[#A1A1A6] max-w-md leading-relaxed">
                      {cat.categoryDesc}
                    </p>
                  </div>

                  {/* Modules List in this Category */}
                  <div className="space-y-10">
                    {cat.modules.map((mod, mIdx) => (
                      <div
                        key={mod.num}
                        className="apple-glass-stage rounded-[32px] p-6 sm:p-10 overflow-hidden"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
                          {/* Module Description */}
                          <div className={`lg:col-span-6 space-y-5 ${mIdx % 2 === 1 ? 'lg:order-2' : ''}`}>
                            <div className="flex items-center gap-3">
                              <span className="px-3.5 py-1 rounded-full bg-[#D6BA94]/15 border border-[#D6BA94]/30 text-[#E8D3B5] text-xs font-semibold">
                                {mod.num}
                              </span>
                              <span className="text-xs text-[#A1A1A6] font-medium">
                                {mod.subtitle}
                              </span>
                            </div>

                            <h3 className="text-2xl sm:text-3xl font-semibold text-white tracking-[-0.03em] leading-snug">
                              {mod.title}
                            </h3>

                            <p className="text-sm sm:text-base text-[#A1A1A6] leading-relaxed">
                              {mod.desc}
                            </p>

                            <ul className="space-y-3 pt-1">
                              {mod.bullets.map((b, bIdx) => (
                                <li key={bIdx} className="flex items-start gap-3 text-xs sm:text-sm text-[#F5F5F7]/90">
                                  <div className="w-5 h-5 rounded-full bg-[#D6BA94]/20 flex items-center justify-center shrink-0 mt-0.5">
                                    <IconCheck className="w-3.5 h-3.5 text-[#D6BA94]" />
                                  </div>
                                  <span>{b}</span>
                                </li>
                              ))}
                            </ul>

                            <div className="pt-3 flex items-center gap-4">
                              <button
                                type="button"
                                onClick={() => setZoomedImage(mod.image)}
                                className="px-4 py-2 rounded-full bg-white/[0.07] hover:bg-white/[0.12] border border-white/15 text-xs font-medium text-white inline-flex items-center gap-2 cursor-pointer"
                              >
                                <IconSearch className="w-3.5 h-3.5 text-[#D6BA94]" />
                                <span>Screenshot vergrössern</span>
                              </button>
                            </div>
                          </div>

                          {/* Module Screenshot in Apple Titanium Frame */}
                          <div
                            className={`lg:col-span-6 ${mIdx % 2 === 1 ? 'lg:order-1' : ''} cursor-pointer group`}
                            onClick={() => setZoomedImage(mod.image)}
                          >
                            <div className="rounded-[24px] p-2.5 bg-black/50 border border-white/15 shadow-2xl">
                              <div className="flex items-center justify-between px-3 py-1.5 mb-2 border-b border-white/10 text-[11px] text-[#A1A1A6]">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-white/20" />
                                  <span className="w-2 h-2 rounded-full bg-white/20" />
                                  <span className="w-2 h-2 rounded-full bg-white/20" />
                                </div>
                                <span>{mod.num} · Live-Ansicht</span>
                              </div>
                              <div className="rounded-2xl overflow-hidden bg-black relative">
                                <img
                                  src={mod.image}
                                  alt={mod.alt}
                                  loading="lazy"
                                  className="w-full h-auto object-cover object-top max-h-[380px] group-hover:scale-[1.01] transition-transform duration-300"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            {/* SCHWEIZER TREUHAND & BANANA-EXPORT SUMMARY + BAUSTELLEN-COCKPIT */}
            <section id="baustellen-cockpit" className="py-20 border-t border-white/10">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  <div className="space-y-5">
                    <span className="text-xs font-medium text-[#E8D3B5] bg-[#D6BA94]/12 border border-[#D6BA94]/25 px-4 py-1.5 rounded-full">
                      Schweizer Treuhand-Standard
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-semibold text-white tracking-[-0.03em] leading-snug">
                      Vom Erstversand bis zur 2. Mahnung: 100% automatisiert. Export für Banana Buchhaltung & Treuhänder nach OR 957ff.
                    </h2>
                    <p className="text-base text-[#A1A1A6] leading-relaxed">
                      Alle Rechnungen, Zahlungen und Belege werden nach Schweizer KMU-Kontenrahmen vorbereitet und direkt für <strong className="text-white font-medium">Banana Doppelte Buchhaltung</strong> und Ihren Treuhänder exportiert.
                    </p>
                  </div>

                  <div className="apple-glass-stage p-8 rounded-[28px] text-white space-y-5">
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                      <span className="text-xs font-medium text-[#D6BA94]">Export: Banana Buchhaltung v10+</span>
                      <span className="text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-400/25 px-3 py-0.5 rounded-full font-medium">
                        100% OR 957ff.
                      </span>
                    </div>
                    <div className="space-y-3 tabular-nums text-xs">
                      <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-[#A1A1A6]">1100 Forderungen LL (Debitoren)</span>
                        <span className="text-white font-semibold">CHF 48&apos;250.00</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-[#A1A1A6]">1109 Delkredere (5% Pauschale)</span>
                        <span className="text-[#E8D3B5] font-semibold">- CHF 2&apos;412.50</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-white/10">
                        <span className="text-[#A1A1A6]">2200 Geschuldete MWST (8.1%)</span>
                        <span className="text-white font-semibold">CHF 3&apos;615.20</span>
                      </div>
                      <div className="flex justify-between py-2 font-semibold text-sm text-emerald-300 pt-2">
                        <span>Netto-Forderungsbestand:</span>
                        <span>CHF 45&apos;837.50</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick 4-Card Summary */}
                <div>
                  <h3 className="text-2xl font-semibold text-white tracking-[-0.025em] mb-6">
                    Das smarte Cockpit für Schweizer Baustellen
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="apple-glass-card p-6 rounded-[24px]">
                      <IconSun className="w-5 h-5 text-[#D6BA94] mb-3" />
                      <h4 className="font-semibold text-base text-white mb-1">Live Baustellen-Wetter</h4>
                      <p className="text-xs text-[#A1A1A6]">Niederschlagsradar und Temperatur direkt auf dem Dashboard.</p>
                    </div>
                    <div className="apple-glass-card p-6 rounded-[24px]">
                      <IconSearch className="w-5 h-5 text-emerald-300 mb-3" />
                      <h4 className="font-semibold text-base text-white mb-1">Zefix-Handelsregister</h4>
                      <p className="text-xs text-[#A1A1A6]">Offizielle Schweizer Firmendaten per UID in Sekunden importieren.</p>
                    </div>
                    <div className="apple-glass-card p-6 rounded-[24px]">
                      <IconClock className="w-5 h-5 text-white mb-3" />
                      <h4 className="font-semibold text-base text-white mb-1">Live-Stoppuhr & Rapport</h4>
                      <p className="text-xs text-[#A1A1A6]">Gestoppte Zeiten mit 1 Klick in Regierapporte umwandeln.</p>
                    </div>
                    <div className="apple-glass-card p-6 rounded-[24px]">
                      <IconSwissFlag className="w-5 h-5 rounded mb-3" />
                      <h4 className="font-semibold text-base text-white mb-1">Feiertage nach Kanton</h4>
                      <p className="text-xs text-[#A1A1A6]">Alle 26 Schweizer Kantone automatisch im Einsatzkalender.</p>
                    </div>
                  </div>
                </div>

                {/* Highlight: Automatischer A4-PDF-Dokumentenersteller + Automatische Ordner-Ablage & PC/Mobile Sync */}
                <div className="apple-glass-stage rounded-[32px] p-8 sm:p-10 border-[#D6BA94]/40">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4">
                      <span className="text-xs font-medium text-[#E8D3B5] bg-[#D6BA94]/15 border border-[#D6BA94]/30 px-3.5 py-1 rounded-full">
                        Kern-Vorteil · PDF-Automatik & Synchronisation
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-semibold text-white tracking-[-0.025em]">
                        Mit dem Katalog nur Werte eingeben → fertiges A4-PDF & automatische Ordner-Ablage
                      </h3>
                      <p className="text-sm text-[#A1A1A6] leading-relaxed">
                        Beim Erstellen einer Offerte oder Rechnung wählen Sie einfach Ihre Katalogpositionen aus und tragen nur noch die Zahlen (m², Stunden, Stück) ein. Kinetic Craft erzeugt sofort das druckfertige A4-PDF und speichert es automatisch im zugehörigen Kunden- und Projektordner ab.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1.5">
                        <div className="font-semibold text-white">Automatische Ordnerstruktur</div>
                        <p className="text-[#A1A1A6]">
                          Kundendaten, Projekte, Offerten, Rechnungen und Baustellenfotos werden ohne manuelles Sortieren im richtigen Dossier abgelegt.
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-400/25 space-y-1.5">
                        <div className="font-semibold text-emerald-300">PC & Handy 100% synchron</div>
                        <p className="text-[#F5F5F7]/90">
                          Was unterwegs auf dem Smartphone erfasst wird, ist in derselben Sekunde im Büro am PC verfügbar – und umgekehrt.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ========================================================================= */}
        {/* SUBPAGE 3: FIRMENEIGENE KI (`/ki-cloud`) - FREISCHALTUNG & LÖSUNGEN       */}
        {/* ========================================================================= */}
        {activePage === 'ki-cloud' && (
          <>
            {/* PART 1: DAS ARCHITEKTUR-PRINZIP (STANDARD OHNE KI VS. KI-FREISCHALTUNG IM CRM) */}
            <section id="ki-superpowers" className="py-20 relative overflow-hidden border-b border-white/10">
              <div
                className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 w-[780px] h-[340px] rounded-full blur-3xl"
                style={{
                  background:
                    'radial-gradient(circle, rgba(214,186,148,0.16) 0%, rgba(16,185,129,0.08) 50%, transparent 72%)',
                }}
              />

              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/25 text-emerald-300 text-xs font-medium mb-5">
                    <IconSparkles className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Kinetic Private AI Node · Firmeneigene Schweizer KI</span>
                  </div>
                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.04em] leading-[1.08]">
                    Ihr digitaler Polier:{' '}
                    <span className="apple-titanium-text">
                      KI-Integrationen direkt im CRM freischalten.
                    </span>
                  </h1>
                  <p className="mt-5 text-base sm:text-lg text-[#A1A1A6] max-w-2xl mx-auto leading-relaxed">
                    Kinetic Craft ist bewusst modular aufgebaut: Die normale CRM-Version arbeitet <strong className="text-white font-medium">100% ohne KI</strong>. Wenn Sie sich für unsere <strong className="text-white font-medium">Firmeneigene KI-Lösung</strong> entscheiden, werden direkt in Ihrem CRM intelligente KI-Features, Scanner und Assistenten freigeschaltet.
                  </p>
                </div>

                {/* Clear 2-Column Principle Comparison: Normal CRM vs. CRM + Firmeneigene KI */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
                  <div className="apple-glass-card rounded-[32px] p-8 sm:p-10 flex flex-col justify-between">
                    <div>
                      <span className="inline-block text-xs font-medium text-[#A1A1A6] bg-white/[0.06] border border-white/10 px-3.5 py-1 rounded-full mb-4">
                        Basis-System · Kinetic Craft Professional
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-[-0.025em] mb-3">
                        1. Normale Version: 100% ohne KI
                      </h2>
                      <p className="text-sm text-[#A1A1A6] leading-relaxed mb-6">
                        Ideal für Betriebe, die ein kompromisslos schnelles, klassisches Handwerker-CRM suchen. Alle 10 Module funktionieren vollständig manuell und regelbasiert – ohne jegliche KI-Anbindung.
                      </p>
                      <ul className="space-y-3 text-xs sm:text-sm text-[#F5F5F7]/90">
                        <li className="flex items-center gap-2.5">
                          <IconCheck className="w-4 h-4 text-[#D6BA94] shrink-0" />
                          <span>Alle 10 CRM-Module (Offerten, QR-Rechnungen, Projekte, Kalender, Buchhaltung)</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <IconCheck className="w-4 h-4 text-[#D6BA94] shrink-0" />
                          <span>Manuelle Foto-Belegablage & klassische Vorlagen-Kalkulation</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <IconCheck className="w-4 h-4 text-[#D6BA94] shrink-0" />
                          <span>Null externe KI-Schnittstellen · Sofort für CHF 49.–/Mt. startklar</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="apple-glass-stage rounded-[32px] p-8 sm:p-10 border-[#D6BA94]/50 flex flex-col justify-between">
                    <div>
                      <span className="inline-block text-xs font-semibold text-[#0B0B0E] apple-titanium-btn px-3.5 py-1 rounded-full mb-4">
                        KI-Upgrade · Kinetic Craft + Firmeneigene KI
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-[-0.025em] mb-3">
                        2. Mit KI-Paket: KI-Features im CRM freigeschaltet
                      </h2>
                      <p className="text-sm text-[#E8D3B5]/90 leading-relaxed mb-6">
                        Sobald Ihre isolierte Firmen-KI verbunden ist, schaltet Kinetic Craft in den bestehenden CRM-Modulen zusätzliche KI-Buttons, automatische Scanner und Sprach-Assistenten frei:
                      </p>
                      <ul className="space-y-3 text-xs sm:text-sm text-white">
                        <li className="flex items-center gap-2.5">
                          <IconSparkles className="w-4 h-4 text-[#D6BA94] shrink-0" />
                          <span><strong>Freigeschaltet in Buchhaltung:</strong> Automatischer KI-Beleg- & Rechnungsscanner</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <IconSparkles className="w-4 h-4 text-[#D6BA94] shrink-0" />
                          <span><strong>Freigeschaltet in Projekten:</strong> Schweizerdeutsches Baustellen-Sprachdiktat</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <IconSparkles className="w-4 h-4 text-[#D6BA94] shrink-0" />
                          <span><strong>Freigeschaltet in Offerten:</strong> KI-Offertenkalkulation aus Ihrer eigenen Firmenhistorie</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* INTERACTIVE VISUAL MODULE UNLOCK SWITCHER */}
                <div className="apple-glass-stage rounded-[32px] p-6 sm:p-10 border-[#D6BA94]/45 mb-20">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
                    <div>
                      <span className="text-xs font-medium text-[#E8D3B5] block mb-1">
                        Interaktive Modul-Vorschau · Klicken zum Umschalten
                      </span>
                      <h3 className="text-xl sm:text-2xl font-semibold text-white">
                        Sehen Sie live, was das KI-Paket in Ihrem CRM freischaltet
                      </h3>
                    </div>

                    <div className="inline-flex items-center gap-1.5 p-1.5 rounded-full apple-glass-pill self-start">
                      <button
                        type="button"
                        onClick={() => setKiPreviewUnlocked(false)}
                        className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                          !kiPreviewUnlocked
                            ? 'bg-[#F5F5F7] text-[#0B0B0E] font-semibold shadow-sm'
                            : 'text-[#A1A1A6] hover:text-white'
                        }`}
                      >
                        Standard-CRM (100% ohne KI)
                      </button>
                      <button
                        type="button"
                        onClick={() => setKiPreviewUnlocked(true)}
                        className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                          kiPreviewUnlocked
                            ? 'bg-emerald-400 text-[#0B0B0E] font-semibold shadow-sm'
                            : 'text-[#A1A1A6] hover:text-white'
                        }`}
                      >
                        ✨ Mit Firmeneigener KI freigeschaltet
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 text-xs">
                    <div className={`p-4 rounded-2xl border transition-all ${kiPreviewUnlocked ? 'bg-emerald-500/12 border-emerald-400/35' : 'bg-white/[0.04] border-white/10'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-white">Modul Offerten & Katalog</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${kiPreviewUnlocked ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/10 text-[#A1A1A6]'}`}>
                          {kiPreviewUnlocked ? 'KI Aktiv' : 'Klassisch'}
                        </span>
                      </div>
                      <p className="text-[#A1A1A6]">
                        {kiPreviewUnlocked
                          ? '✓ Katalog-Eingabe PLUS Schweizerdeutsch sprechen → fertige A4-Offerte & KI-Nachkalkulation.'
                          : '✓ Positionen aus Katalog wählen & nur Zahlen/Masse eingeben → fertiges A4-PDF.'}
                      </p>
                    </div>

                    <div className={`p-4 rounded-2xl border transition-all ${kiPreviewUnlocked ? 'bg-emerald-500/12 border-emerald-400/35' : 'bg-white/[0.04] border-white/10'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-white">Modul Buchhaltung & Belege</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${kiPreviewUnlocked ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/10 text-[#A1A1A6]'}`}>
                          {kiPreviewUnlocked ? 'KI Aktiv' : 'Klassisch'}
                        </span>
                      </div>
                      <p className="text-[#A1A1A6]">
                        {kiPreviewUnlocked
                          ? '✓ Automatischer KI-Belegscanner liest Lieferant, UID, Betrag & 8.1% MWST sofort aus.'
                          : '✓ Belege per Smartphone fotografieren & im richtigen Projektordner ablegen.'}
                      </p>
                    </div>

                    <div className={`p-4 rounded-2xl border transition-all ${kiPreviewUnlocked ? 'bg-emerald-500/12 border-emerald-400/35' : 'bg-white/[0.04] border-white/10'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-white">Modul Baustelle & Rapport</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${kiPreviewUnlocked ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/10 text-[#A1A1A6]'}`}>
                          {kiPreviewUnlocked ? 'KI Aktiv' : 'Klassisch'}
                        </span>
                      </div>
                      <p className="text-[#A1A1A6]">
                        {kiPreviewUnlocked
                          ? '✓ Mundart-Sprachnotiz auf der Baustelle wird automatisch zum Hochdeutsch-Regierapport.'
                          : '✓ Live-Stoppuhr, Fotos & digitale Kundenunterschrift auf dem Smartphone.'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#D6BA94]/12 border border-[#D6BA94]/35">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-white">Auto-Ordner & PC/Handy Sync</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#D6BA94]/25 text-[#E8D3B5]">
                          Immer inklusive
                        </span>
                      </div>
                      <p className="text-[#E8D3B5]/90">
                        ✓ In beiden Paketen: Automatische Kunden- & Projektordner, 100% synchron auf PC & Smartphone.
                      </p>
                    </div>
                  </div>
                </div>

                {/* PART 2: DIE FREIGESCHALTETEN CRM-OPTIMIERUNGEN & KI-FEATURES IM DETAIL */}
                <div className="mb-12 text-center max-w-3xl mx-auto">
                  <span className="text-xs font-medium text-[#E8D3B5] bg-[#D6BA94]/12 border border-[#D6BA94]/25 px-4 py-1.5 rounded-full">
                    Freigeschaltete CRM-Funktionen im KI-Paket
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-semibold text-white mt-4 tracking-[-0.03em]">
                    Welche Optimierungen die KI direkt in Ihrem CRM aktiviert
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-7 mb-16">
                  <div className="apple-glass-card rounded-[28px] p-8 flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-[#D6BA94]/15 border border-[#D6BA94]/30 flex items-center justify-center text-[#D6BA94] mb-6">
                        <IconCamera className="w-6 h-6 text-[#D6BA94]" />
                      </div>
                      <span className="text-xs font-medium text-[#D6BA94] block mb-1.5">
                        Im Modul Buchhaltung & Projekte
                      </span>
                      <h3 className="text-xl font-semibold text-white tracking-[-0.02em] mb-3">
                        Belege & Quittungen scannen
                      </h3>
                      <p className="text-sm text-[#A1A1A6] leading-relaxed mb-6">
                        Fotografieren Sie Belege von Hornbach, OBI, Debrunner oder HGC. Ihre isolierte Firmen-KI erkennt Lieferant, UID, Beträge und Schweizer MWST (8.1% / 2.6%) vollautomatisch und kontiert den Beleg direkt auf die richtige Baustelle.
                      </p>
                    </div>
                    <div
                      className="rounded-2xl overflow-hidden border border-white/15 bg-black/40 p-2 cursor-pointer group"
                      onClick={() => setZoomedImage('/screenshots/09_ai_beleg_scanner.png')}
                    >
                      <img
                        src="/screenshots/09_ai_beleg_scanner.png"
                        alt="Kinetic Craft KI-Belegscanner im CRM"
                        loading="lazy"
                        className="w-full h-auto object-cover rounded-xl group-hover:scale-[1.02] transition-transform"
                      />
                    </div>
                  </div>

                  <div className="apple-glass-card rounded-[28px] p-8 flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-[#D6BA94]/15 border border-[#D6BA94]/30 flex items-center justify-center text-[#D6BA94] mb-6">
                        <IconMic className="w-6 h-6 text-[#D6BA94]" />
                      </div>
                      <span className="text-xs font-medium text-[#D6BA94] block mb-1.5">
                        Im Modul Offerten, Rapporte & Mobile Baustelle
                      </span>
                      <h3 className="text-xl font-semibold text-white tracking-[-0.02em] mb-3">
                        Baustellen-Sprachdiktat
                      </h3>
                      <p className="text-sm text-[#A1A1A6] leading-relaxed mb-6">
                        Sprechen Sie neue Offerten, erledigte Arbeiten oder Regiestunden einfach auf Schweizerdeutsch (Mundart) ins Smartphone. Die KI erstellt daraus sofort eine fertige PDF-Offerte oder einen unterschriftsreifen Regierapport in sauberem Hochdeutsch – automatisch im richtigen Kundenordner abgelegt.
                      </p>
                    </div>
                    <div className="bg-black/40 p-5 rounded-2xl border border-white/10 space-y-2 text-xs">
                      <div className="text-[#E8D3B5] font-medium">Mundart-Aufnahme → Offerte & Rapport:</div>
                      <p className="text-[#A1A1A6] italic">
                        «Offerte für Malerarbeit bi Familie Keller: Wohnzimmer 65 Quadratmeter Zweifach-Anstrich weiss inkl. Abdecke...»
                      </p>
                      <div className="pt-2 border-t border-white/10 text-emerald-300 font-medium">
                        ✓ Automatisch als fertige A4-Offerte & Position im Projekt angelegt
                      </div>
                    </div>
                  </div>

                  <div className="apple-glass-card rounded-[28px] p-8 flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-[#D6BA94]/15 border border-[#D6BA94]/30 flex items-center justify-center text-[#D6BA94] mb-6">
                        <IconDocument className="w-6 h-6 text-[#D6BA94]" />
                      </div>
                      <span className="text-xs font-medium text-[#D6BA94] block mb-1.5">
                        Im Modul Offerten & Katalog
                      </span>
                      <h3 className="text-xl font-semibold text-white tracking-[-0.02em] mb-3">
                        KI-Offerten-Assistent & Nachkalkulation
                      </h3>
                      <p className="text-sm text-[#A1A1A6] leading-relaxed mb-6">
                        Ihre firmeneigene KI lernt ausschliesslich aus Ihren bisherigen Offerten, Stundensätzen und Katalogpositionen. Bei neuen Anfragen schlägt sie automatisch passende Positionen, Texte und Erfahrungswerte vor.
                      </p>
                    </div>
                    <div className="bg-black/40 p-5 rounded-2xl border border-white/10 space-y-2 text-xs text-[#F5F5F7]/90">
                      <div className="flex items-center gap-2">
                        <IconCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                        <span>Vorschläge aus Ihrer eigenen Offerten-Historie</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <IconCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                        <span>Automatischer Hinweis bei vergessenen Nebenpositionen</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <IconCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                        <span>Kein Zugriff fremder Betriebe auf Ihre Kalkulation</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* PART 3: DIE BEIDEN KI-BEREITSTELLUNGS-LÖSUNGEN (SCHWEIZER PRIVATE CLOUD ODER LOKAL VOR ORT) */}
            <section id="datensicherheit" className="py-24 relative overflow-hidden">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-14">
                  <span className="text-xs font-medium text-emerald-300 bg-emerald-500/12 border border-emerald-400/25 px-4 py-1.5 rounded-full">
                    100% Schweizer Datensouveränität (revDSG)
                  </span>
                  <h2 className="text-3xl sm:text-5xl font-semibold mt-5 tracking-[-0.035em]">
                    Ihre Betriebsdaten gehören Ihnen. <br />
                    <span className="apple-titanium-text">
                      Wählen Sie Ihre KI-Infrastruktur.
                    </span>
                  </h2>
                  <p className="text-[#A1A1A6] text-base sm:text-lg mt-4 leading-relaxed font-normal">
                    Damit Ihre Kundenadressen, Margen und Kalkulationen niemals in öffentlichen US-Clouds landen, stellen wir Ihre <strong className="text-white font-medium">Firmeneigene KI</strong> in zwei massgeschneiderten Schweizer Lösungen bereit:
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                  {/* Lösung A: Kinetic Private Cloud (Schweizer Empfehlung) */}
                  <div className="p-7 sm:p-8 rounded-[28px] apple-glass-stage border-[#D6BA94]/60 flex flex-col justify-between relative">
                    <span className="absolute -top-3.5 right-6 apple-titanium-btn text-xs font-semibold px-3.5 py-1 rounded-full">
                      Lösung A · Schweizer Empfehlung
                    </span>

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-medium text-[#E8D3B5] bg-[#D6BA94]/15 border border-[#D6BA94]/30 px-3 py-1 rounded-full">
                          Dedizierte Schweizer Cloud
                        </span>
                        <IconSwissFlag className="w-5 h-5 rounded shadow-xs" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Kinetic Private Cloud</h3>
                      <p className="text-xs text-[#E8D3B5] mb-6">
                        Eigene isolierte Schweizer KI-Instanz (Rechenzentrum Zürich & Genf).
                      </p>

                      <ul className="space-y-3 text-xs sm:text-sm text-[#F5F5F7]">
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-[#D6BA94]/20 text-[#E8D3B5] flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5">✓</span>
                          <span><strong>100% Rechenzentrum Schweiz:</strong> Gehostet in Zürich / Genf, vollumfänglich revDSG-konform.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-[#D6BA94]/20 text-[#E8D3B5] flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5">✓</span>
                          <span><strong>Null Hardware-Wartung:</strong> Kein Server im Büro nötig, sofort von jeder Baustelle erreichbar.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-[#D6BA94]/20 text-[#E8D3B5] flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5">✓</span>
                          <span><strong>Isoliertes Firmenwissen:</strong> Trainiert ausschliesslich mit Ihren eigenen Offerten & Vorlagen.</span>
                        </li>
                      </ul>
                    </div>

                    <div className="mt-8 p-3.5 rounded-2xl bg-[#D6BA94]/15 border border-[#D6BA94]/35 text-xs text-[#E8D3B5] text-center font-semibold">
                      Ideal für 1 bis 25+ Mitarbeiter · Null Wartungsaufwand
                    </div>
                  </div>

                  {/* Lösung B: Lokaler Server vor Ort im Betrieb */}
                  <div className="p-7 sm:p-8 rounded-[28px] apple-glass-card flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-medium text-[#F5F5F7] bg-white/10 border border-white/15 px-3 py-1 rounded-full">
                          Lösung B · On-Premise im Betrieb
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Lokaler Server vor Ort</h3>
                      <p className="text-xs text-[#A1A1A6] mb-6">
                        Eigene kompakte KI-Hardware direkt bei Ihnen im Büro oder in der Werkstatt.
                      </p>

                      <ul className="space-y-3 text-xs sm:text-sm text-[#F5F5F7]/90">
                        <li className="flex items-start gap-2.5">
                          <span className="font-semibold text-emerald-300 shrink-0">✓</span>
                          <span><strong>100% physische Datenhoheit:</strong> Die KI-Box steht physisch in Ihren eigenen Geschäftsräumen.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="font-semibold text-emerald-300 shrink-0">✓</span>
                          <span><strong>Volle CRM-Freischaltung:</strong> Schaltet exakt dieselben KI-Features im CRM frei wie die Private Cloud.</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-[#A1A1A6]">
                          <span className="font-semibold text-[#D6BA94] shrink-0">•</span>
                          <span><strong>Schlüsselfertige Einrichtung:</strong> Unser Schweizer Team installiert und verbindet die Box vor Ort.</span>
                        </li>
                      </ul>
                    </div>

                    <div className="mt-8 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-[#A1A1A6] text-center font-medium">
                      Ideal bei Wunsch nach 100% Hardware im eigenen Haus
                    </div>
                  </div>

                  {/* Abgrenzung: Klassische US-Cloud APIs */}
                  <div className="p-7 sm:p-8 rounded-[28px] apple-glass-card border-rose-500/25 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-medium text-rose-300 bg-rose-500/12 border border-rose-400/25 px-3 py-1 rounded-full">
                          Warum keine Standard-US-KI?
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Klassische US-Cloud APIs</h3>
                      <p className="text-xs text-[#A1A1A6] mb-6">
                        Öffentliche Drittanbieter-KI-Dienste sind bei Kinetic Craft bewusst ausgeschlossen.
                      </p>

                      <ul className="space-y-3 text-xs sm:text-sm text-rose-200/90">
                        <li className="flex items-start gap-2.5">
                          <span className="font-semibold text-rose-400 shrink-0">✕</span>
                          <span><strong>US CLOUD Act Risiko:</strong> Kundendaten und Offerten auf ausländischen Servern.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="font-semibold text-rose-400 shrink-0">✕</span>
                          <span><strong>Fremdes Modell-Training:</strong> Gefahr, dass eigene Kalkulationen für fremde Modelle genutzt werden.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="font-semibold text-rose-400 shrink-0">✕</span>
                          <span><strong>Unser Versprechen:</strong> Weder im Standard-CRM noch im KI-Paket fliessen Daten an US-KI-Dienste.</span>
                        </li>
                      </ul>
                    </div>

                    <div className="mt-8 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-400/20 text-xs text-rose-300 text-center font-medium">
                      Bei Kinetic Craft zu 100% ausgeschlossen
                    </div>
                  </div>
                </div>

                <div className="mt-12 text-center">
                  <button
                    type="button"
                    onClick={() => handleJumpToInquiry({ paketWunsch: 'private_node' })}
                    className="px-8 py-4 rounded-full apple-titanium-btn font-semibold text-xs sm:text-sm cursor-pointer"
                  >
                    Private AI Node für meinen Betrieb anfragen →
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ========================================================================= */}
        {/* SUBPAGE 4: BRANCHEN (`/gewerke`) - ALLTAGSHILFE & ZEITERSPARNIS           */}
        {/* ========================================================================= */}
        {activePage === 'gewerke' && (
          <>
            <section id="gewerke" className="py-16 sm:py-20">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                  <span className="text-xs font-medium text-[#E8D3B5] bg-[#D6BA94]/12 border border-[#D6BA94]/25 px-4 py-1.5 rounded-full">
                    Branchen & Praxis-Nutzen
                  </span>
                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold text-white mt-5 tracking-[-0.04em]">
                    Ein Tool. Für alle Schweizer Gewerke.
                  </h1>
                  <p className="text-base sm:text-lg text-[#A1A1A6] mt-4 leading-relaxed">
                    Jedes Handwerk hat seine eigenen Abläufe auf der Baustelle und im Büro. Sehen Sie hier im Detail, welche typischen Zeitfresser Kinetic Craft in Ihrer Branche beseitigt und wie viele Stunden Büroarbeit Sie jede Woche gewinnen.
                  </p>
                </div>

                {/* 3 Praxis-Portraits nach Betriebsgrösse (Pascal, Martin 52, KMU) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
                  <div className="apple-glass-card p-6 sm:p-7 rounded-[28px] space-y-3">
                    <span className="text-xs font-semibold text-[#E8D3B5] bg-[#D6BA94]/15 border border-[#D6BA94]/30 px-3 py-1 rounded-full inline-block">
                      Solo-Handwerker · 1 Person
                    </span>
                    <h2 className="text-lg sm:text-xl font-semibold text-white">
                      Pascal, selbstständiger Maler (alleine unterwegs)
                    </h2>
                    <p className="text-xs sm:text-sm text-[#A1A1A6] leading-relaxed">
                      Wählt nach dem Aufmass direkt am Smartphone die Katalog-Positionen aus, gibt nur noch die Quadratmeter ein (oder spricht die Offerte mit eigener KI auf Schweizerdeutsch ein) und versendet das fertige A4-PDF noch vor der Heimfahrt.
                    </p>
                  </div>

                  <div className="apple-glass-stage p-6 sm:p-7 rounded-[28px] border-[#D6BA94]/50 space-y-3">
                    <span className="text-xs font-semibold text-[#0B0B0E] apple-titanium-btn px-3 py-1 rounded-full inline-block">
                      Meisterbetrieb · 2 bis 8 Mitarbeitende
                    </span>
                    <h2 className="text-lg sm:text-xl font-semibold text-white">
                      Martin (52), Maler- & Gipsergeschäft mit 4 Angestellten
                    </h2>
                    <p className="text-xs sm:text-sm text-[#F5F5F7]/90 leading-relaxed">
                      Einfache, glasklare Bedienung ohne IT-Studium: Wenn seine 4 Mitarbeitenden auf der Baustelle Fotos machen oder Rapporte ausfüllen, legt Kinetic Craft automatisch für jeden Kunden und jedes Projekt den passenden Ordner an – synchron auf Handy und Büro-PC.
                    </p>
                  </div>

                  <div className="apple-glass-card p-6 sm:p-7 rounded-[28px] space-y-3">
                    <span className="text-xs font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-400/25 px-3 py-1 rounded-full inline-block">
                      Grösseres KMU · 10 bis 25+ Mitarbeitende
                    </span>
                    <h2 className="text-lg sm:text-xl font-semibold text-white">
                      Grössere Betriebe mit Büro, Projektleitung & Teams
                    </h2>
                    <p className="text-xs sm:text-sm text-[#A1A1A6] leading-relaxed">
                      Mehrere Baustellen parallel steuern: Akonto- & Schlussrechnungen, automatisches 3-Stufen-Mahnwesen, camt.053-Bankabgleich, Banana-Treuhand-Export und optional die Firmeneigene KI für das gesamte Team.
                    </p>
                  </div>
                </div>

                {/* 6 Detailed Trade Portraits (Without NPK Calculator) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {gewerkeList.map((g) => (
                    <div
                      key={g.id}
                      className="apple-glass-stage p-7 sm:p-9 rounded-[32px] flex flex-col justify-between space-y-6"
                    >
                      <div className="space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-[#D6BA94]/15 border border-[#D6BA94]/30 flex items-center justify-center shrink-0">
                              <TradeIcon tradeId={g.id} className="w-6 h-6 text-[#D6BA94]" />
                            </div>
                            <div>
                              <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-[-0.02em]">
                                {g.title}
                              </h3>
                              <span className="text-xs text-[#E8D3B5]">{g.highlight}</span>
                            </div>
                          </div>

                          <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/25 text-emerald-300 text-xs font-semibold">
                            {g.timeSaved}
                          </span>
                        </div>

                        {/* Visual Vorher / Nachher Time Bar */}
                        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-[#A1A1A6]">
                              <span>Vorher (ohne Kinetic Craft):</span>
                              <span className="text-rose-300 font-medium">{g.hoursBefore}</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full w-[88%] rounded-full bg-rose-400/60" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-white">
                              <span>Nachher (Auto-PDF & Ordner-Sync):</span>
                              <span className="text-emerald-300 font-semibold">{g.hoursAfter}</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full w-[22%] rounded-full bg-gradient-to-r from-[#D6BA94] to-emerald-400" />
                            </div>
                          </div>
                        </div>

                        {/* Pain Point vs. Solution */}
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                          <span className="text-xs font-medium text-[#A1A1A6] block">
                            Typischer Zeitfresser im Alltag:
                          </span>
                          <p className="text-xs sm:text-sm text-[#F5F5F7]/85 leading-relaxed">
                            {g.painPoint}
                          </p>
                        </div>

                        <p className="text-sm text-[#A1A1A6] leading-relaxed">
                          {g.desc}
                        </p>

                        <div className="space-y-2.5 pt-1">
                          <span className="text-xs font-medium text-[#D6BA94] block">
                            So hilft Kinetic Craft konkret im Betrieb:
                          </span>
                          {g.helpsWith.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#F5F5F7]/90">
                              <IconCheck className="w-4 h-4 text-[#D6BA94] shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <span className="text-[#A1A1A6]">
                          Module: <strong className="text-white font-medium">{g.modulesUsed}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleJumpToInquiry({ gewerk: g.formValue })}
                          className="px-4 py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-white font-semibold cursor-pointer transition-colors"
                        >
                          Branchen-Demo anfragen →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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
            <section id="tarife" className="py-20 border-b border-white/10">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-12">
                  <span className="text-xs font-medium text-[#E8D3B5] bg-[#D6BA94]/12 border border-[#D6BA94]/25 px-4 py-1.5 rounded-full">
                    Transparente Tarife
                  </span>
                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold text-white mt-5 tracking-[-0.04em]">
                    Tarife & Upgrades
                  </h1>
                  <p className="text-base text-[#A1A1A6] mt-3">
                    Wählen Sie zwischen dem kompletten Standard-CRM (100% ohne KI) oder dem Paket inklusive freigeschalteter Firmeneigener KI. 14 Tage kostenlos testen.
                  </p>

                  {/* Monthly / Yearly Toggle */}
                  <div className="mt-8 inline-flex items-center p-1.5 rounded-full apple-glass-pill">
                    <button
                      onClick={() => setBillingCycle('monthly')}
                      className={`px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-all cursor-pointer ${
                        billingCycle === 'monthly'
                          ? 'bg-[#F5F5F7] text-[#0B0B0E] font-semibold'
                          : 'text-[#A1A1A6] hover:text-white'
                      }`}
                    >
                      Monatlich
                    </button>
                    <button
                      onClick={() => setBillingCycle('yearly')}
                      className={`px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-all cursor-pointer flex items-center gap-2 ${
                        billingCycle === 'yearly'
                          ? 'bg-[#F5F5F7] text-[#0B0B0E] font-semibold'
                          : 'text-[#A1A1A6] hover:text-white'
                      }`}
                    >
                      <span>Jährlich</span>
                      <span className="bg-[#D6BA94]/25 text-[#E8D3B5] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        10% Rabatt
                      </span>
                    </button>
                  </div>
                </div>

                {/* Pricing Cards: 2-Stufen-Modell */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
                  {/* 1. Professional Plan (Standard CRM without AI) */}
                  <div className="apple-glass-stage border-[#D6BA94]/50 rounded-[32px] p-8 flex flex-col justify-between relative">
                    <span className="absolute -top-3.5 right-6 apple-titanium-btn text-xs font-semibold px-4 py-1 rounded-full">
                      Standard-CRM (Ohne KI)
                    </span>

                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <h3 className="text-2xl font-semibold text-white tracking-[-0.02em]">Professional</h3>
                        <span className="text-xs bg-[#D6BA94]/20 text-[#E8D3B5] px-3 py-0.5 rounded-full font-medium">
                          Alle 10 CRM-Module
                        </span>
                      </div>
                      <div className="text-3xl sm:text-4xl font-semibold apple-titanium-text my-4 tabular-nums">
                        {billingCycle === 'yearly' ? 'CHF 44.00' : 'CHF 49.00'}{' '}
                        <span className="text-xs font-normal text-[#A1A1A6]">/ Monat</span>
                      </div>
                      <p className="text-xs text-[#A1A1A6] mb-6 leading-relaxed">
                        Die komplette Handwerker-Software mit allen 10 Modulen – bewusst zu 100% ohne KI, extrem schnell und verlässlich.
                      </p>

                      <ul className="space-y-3 text-xs sm:text-sm text-[#F5F5F7]">
                        <li className="flex items-center gap-2.5">
                          <IconCheck className="w-4 h-4 text-[#D6BA94] shrink-0" />
                          <span>Unbegrenzte Kunden, Projekte & Baustellen-Dossiers</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <IconCheck className="w-4 h-4 text-[#D6BA94] shrink-0" />
                          <span>Unbegrenzte Offerten, Ausmass & Schweizer QR-Rechnungen (ISO 20022)</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <IconCheck className="w-4 h-4 text-[#D6BA94] shrink-0" />
                          <span>Mobile Baustellen-App, Foto-Belegablage & digitale Unterschrift</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <IconCheck className="w-4 h-4 text-[#D6BA94] shrink-0" />
                          <span className="font-medium text-[#E8D3B5]">3-Stufen-Mahnwesen mit QR-Zahlteil & Bankabgleich (camt.053)</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <IconCheck className="w-4 h-4 text-[#D6BA94] shrink-0" />
                          <span>Banana Buchhaltung & Schweizer Treuhand-Export (OR 957ff.)</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <IconCheck className="w-4 h-4 text-[#D6BA94] shrink-0" />
                          <span>Zefix-Handelsregister, Einsatzkalender & Live-Baustellenwetter</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <IconCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                          <span className="text-emerald-300 font-medium">100% ohne KI / keine US-APIs (schlank & revDSG-konform)</span>
                        </li>
                      </ul>
                    </div>

                    <div className="mt-8 space-y-2.5">
                      <button
                        onClick={onGoToRegistration}
                        className="w-full py-3.5 text-xs sm:text-sm font-semibold rounded-full apple-starlight-btn cursor-pointer"
                      >
                        14 Tage kostenlos testen
                      </button>
                      <p className="text-xs text-center text-[#A1A1A6]">
                        Keine Kreditkarte nötig · Endet automatisch nach 14 Tagen
                      </p>
                    </div>
                  </div>

                  {/* 2. Enterprise / Private AI Node Plan (Unlocks AI in CRM) */}
                  <div className="apple-glass-card rounded-[32px] p-8 flex flex-col justify-between relative">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <h3 className="text-2xl font-semibold text-white tracking-[-0.02em]">Enterprise</h3>
                        <span className="text-xs bg-emerald-500/15 text-emerald-300 px-3 py-0.5 rounded-full font-medium border border-emerald-400/25">
                          Inkl. Firmeneigener KI
                        </span>
                      </div>
                      <div className="text-3xl sm:text-4xl font-semibold text-white my-4 tabular-nums">
                        ab CHF 149.00 <span className="text-xs font-normal text-[#A1A1A6]">/ Monat</span>
                      </div>
                      <p className="text-xs text-[#A1A1A6] mb-6 leading-relaxed">
                        Schaltet alle KI-Integrationen & KI-Optimierungen direkt im CRM frei – auf Ihrer isolierten Schweizer Private Cloud oder lokal vor Ort im Betrieb.
                      </p>

                      <ul className="space-y-3 text-xs sm:text-sm text-[#F5F5F7]/90">
                        <li className="flex items-center gap-2.5">
                          <IconCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                          <span><strong>Alle 10 Module aus Professional</strong> unbegrenzt enthalten</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <IconCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                          <span><strong>KI-Freischaltung im CRM:</strong> Automatischer KI-Beleg- & Rechnungsscanner</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <IconCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                          <span><strong>KI-Freischaltung im CRM:</strong> Schweizerdeutsches Sprachdiktat zu Rapport & Offerte</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <IconCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                          <span><strong>KI-Freischaltung im CRM:</strong> KI-Offerten-Assistent aus eigener Firmenhistorie</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <IconCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                          <span><strong>Eigene KI-Instanz:</strong> Schweizer Private Cloud (Zürich/Genf) oder lokaler Server vor Ort</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <IconCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                          <span>Persönliche Datenmigration (Bexio, Sorba, Excel) & Einrichtung</span>
                        </li>
                      </ul>
                    </div>

                    <a
                      href="#anfrage"
                      onClick={() => setInquiryData((prev) => ({ ...prev, paketWunsch: 'private_node' }))}
                      className="mt-8 block w-full py-3.5 text-center text-xs sm:text-sm font-semibold rounded-full apple-titanium-btn cursor-pointer"
                    >
                      Live-Demo & KI-Paket anfragen
                    </a>
                  </div>
                </div>

                {/* Direktvergleich: Standard-CRM (ohne KI) vs. Enterprise (mit Firmeneigener KI) */}
                <div className="mt-14 max-w-4xl mx-auto apple-glass-card rounded-[28px] p-6 sm:p-8 border border-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-white/10">
                    <div>
                      <h3 className="text-lg sm:text-xl font-semibold text-white">
                        Direktvergleich: Standard-CRM vs. Mit Firmeneigener KI
                      </h3>
                      <p className="text-xs text-[#A1A1A6] mt-0.5">
                        Alle 10 Kern-Module sind bereits im Standard-Paket voll enthalten. Das KI-Paket schaltet zusätzlich die KI-Automatisierungen frei.
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-white/10 text-xs sm:text-sm mt-2">
                    <div className="py-3 grid grid-cols-12 items-center gap-2 font-semibold text-[#E8D3B5]">
                      <div className="col-span-6 sm:col-span-6">Funktion / Modul im CRM</div>
                      <div className="col-span-3 sm:col-span-3 text-center">Professional (Ohne KI)</div>
                      <div className="col-span-3 sm:col-span-3 text-center text-emerald-300">Enterprise (Mit KI)</div>
                    </div>
                    <div className="py-3 grid grid-cols-12 items-center gap-2">
                      <div className="col-span-6 text-[#F5F5F7]">Alle 10 CRM-Module, Katalog & Auto-PDF-Ersteller</div>
                      <div className="col-span-3 text-center text-white font-semibold">✓ Inklusive</div>
                      <div className="col-span-3 text-center text-emerald-300 font-semibold">✓ Inklusive</div>
                    </div>
                    <div className="py-3 grid grid-cols-12 items-center gap-2">
                      <div className="col-span-6 text-[#F5F5F7]">Automatische Kunden- & Projektordner (PC ⇄ Handy Sync)</div>
                      <div className="col-span-3 text-center text-white font-semibold">✓ Inklusive</div>
                      <div className="col-span-3 text-center text-emerald-300 font-semibold">✓ Inklusive</div>
                    </div>
                    <div className="py-3 grid grid-cols-12 items-center gap-2">
                      <div className="col-span-6 text-[#F5F5F7]">Swiss QR-Rechnung (ISO 20022), 3-Stufen-Mahnwesen & Banana-Export</div>
                      <div className="col-span-3 text-center text-white font-semibold">✓ Inklusive</div>
                      <div className="col-span-3 text-center text-emerald-300 font-semibold">✓ Inklusive</div>
                    </div>
                    <div className="py-3 grid grid-cols-12 items-center gap-2">
                      <div className="col-span-6 text-[#F5F5F7]">Schweizerdeutsch sprechen → Offerte & Rapport automatisch erstellen</div>
                      <div className="col-span-3 text-center text-[#A1A1A6]">Manuell über Katalog</div>
                      <div className="col-span-3 text-center text-emerald-300 font-semibold">✓ Freigeschaltet</div>
                    </div>
                    <div className="py-3 grid grid-cols-12 items-center gap-2">
                      <div className="col-span-6 text-[#F5F5F7]">Automatischer KI-Beleg- & Lieferantenrechnungs-Scanner</div>
                      <div className="col-span-3 text-center text-[#A1A1A6]">Foto-Ablage manuell</div>
                      <div className="col-span-3 text-center text-emerald-300 font-semibold">✓ Freigeschaltet</div>
                    </div>
                    <div className="py-3 grid grid-cols-12 items-center gap-2">
                      <div className="col-span-6 text-[#F5F5F7]">Eigene isolierte Schweizer KI-Instanz (Private Cloud oder Vor Ort)</div>
                      <div className="col-span-3 text-center text-[#A1A1A6]">100% KI-frei</div>
                      <div className="col-span-3 text-center text-emerald-300 font-semibold">✓ Inklusive (revDSG)</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* INTERAKTIVER HANDWERKER-ERSPARNIS-RECHNER (ROI) */}
            <section id="rechner" className="py-20 relative overflow-hidden border-b border-white/10">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-12">
                  <span className="text-xs font-medium text-[#E8D3B5] bg-[#D6BA94]/12 border border-[#D6BA94]/25 px-4 py-1.5 rounded-full">
                    Kosten- & Zeitersparnis
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-semibold text-white mt-4 tracking-[-0.03em]">
                    Wie viel Bürozeit & Geld sparen Sie pro Monat?
                  </h2>
                  <p className="text-sm text-[#A1A1A6] mt-2">
                    Berechnen Sie Ihre individuelle Entlastung durch mobile Belege, 3-Stufen-Mahnwesen und 60s-QR-Rechnungen.
                  </p>
                </div>

                <div className="apple-glass-stage p-6 sm:p-10 md:p-12 rounded-[32px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                    <div className="space-y-8">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-[#F5F5F7]">
                            Mitarbeiter / Monteure im Betrieb:
                          </label>
                          <span className="font-semibold text-[#E8D3B5] text-lg tabular-nums">
                            {calcTeamSize} {calcTeamSize === 1 ? 'Person' : 'Personen'}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={calcTeamSize}
                          onChange={(e) => setCalcTeamSize(parseInt(e.target.value, 10))}
                          className="w-full h-2 bg-white/15 rounded-full appearance-none cursor-pointer accent-[#D6BA94]"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-[#F5F5F7]">
                            Offerten & Rechnungen pro Monat:
                          </label>
                          <span className="font-semibold text-[#E8D3B5] text-lg tabular-nums">
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
                          className="w-full h-2 bg-white/15 rounded-full appearance-none cursor-pointer accent-[#D6BA94]"
                        />
                      </div>
                    </div>

                    <div className="apple-glass-card p-6 sm:p-8 rounded-[26px] border-[#D6BA94]/35 text-center space-y-6">
                      <div>
                        <span className="text-xs font-medium text-[#A1A1A6] block">
                          Ihre monatliche Bürozeit-Ersparnis
                        </span>
                        <div className="text-4xl sm:text-5xl font-semibold apple-titanium-text mt-2 tabular-nums">
                          ~{hoursSavedPerMonth} Std.
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/10">
                        <span className="text-xs font-medium text-[#A1A1A6] block">
                          Monatlicher Wertzuwachs / Ersparnis
                        </span>
                        <div className="text-3xl sm:text-4xl font-semibold text-emerald-300 mt-2 tabular-nums">
                          CHF {moneySavedPerMonth.toLocaleString('de-CH')}.–
                        </div>
                      </div>

                      <button
                        onClick={onGoToRegistration}
                        className="w-full py-4 text-sm font-semibold apple-starlight-btn rounded-full cursor-pointer"
                      >
                        Jetzt CHF {moneySavedPerMonth.toLocaleString('de-CH')} sparen & 14 Tage testen →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* INTERAKTIVE OFFERTEN- & DEMO-ANFRAGE */}
            <section id="anfrage" className="py-20 border-b border-white/10">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="apple-glass-stage p-6 sm:p-10 md:p-12 rounded-[32px]">
                  <div className="text-center max-w-2xl mx-auto mb-10">
                    <span className="text-xs font-medium text-[#E8D3B5] bg-[#D6BA94]/12 border border-[#D6BA94]/25 px-4 py-1.5 rounded-full">
                      Persönliche Beratung
                    </span>
                    <h2 className="text-3xl font-semibold text-white mt-4 tracking-[-0.03em]">
                      Unverbindliche Offerte & 1:1 Demo anfragen
                    </h2>
                    <p className="text-sm text-[#A1A1A6] mt-2">
                      Teilen Sie uns kurz Ihre Anforderungen mit. Unser Schweizer Team meldet sich innerhalb von 24 Stunden bei Ihnen.
                    </p>
                  </div>

                  {inquirySubmitted ? (
                    <div className="bg-white/[0.05] p-8 rounded-[24px] border border-[#D6BA94]/40 text-center space-y-4 animate-fade-in-up">
                      <div className="w-14 h-14 bg-[#D6BA94]/20 text-[#E8D3B5] rounded-full flex items-center justify-center mx-auto">
                        <IconCheck className="w-7 h-7 text-[#D6BA94]" />
                      </div>
                      <h3 className="text-xl font-semibold text-white">Vielen Dank für Ihre Anfrage!</h3>
                      <p className="text-sm text-[#A1A1A6] max-w-md mx-auto">
                        Wir haben Ihre Angaben erhalten und prüfen Ihr massgeschneidertes Paket für {inquiryData.firma || 'Ihren Betrieb'}.
                      </p>
                      <div className="pt-4">
                        <button
                          onClick={onGoToRegistration}
                          className="px-6 py-3 apple-starlight-btn font-semibold rounded-full text-sm cursor-pointer"
                        >
                          Jetzt schon 14 Tage unverbindlich testen →
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleInquirySubmit} className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-[#A1A1A6] mb-1.5">
                            Ihr Gewerk
                          </label>
                          <select
                            value={inquiryData.gewerk}
                            onChange={(e) => setInquiryData({ ...inquiryData, gewerk: e.target.value })}
                            className="w-full px-4 py-3 bg-white/[0.06] border border-white/15 rounded-2xl text-sm text-white font-medium focus:border-[#D6BA94] focus:outline-none"
                          >
                            <option value="Schreinerei" className="bg-[#16161B] text-white">Schreinerei & Holzbau</option>
                            <option value="Malerei" className="bg-[#16161B] text-white">Maler & Gipser</option>
                            <option value="Elektro" className="bg-[#16161B] text-white">Elektro & Gebäudeautomation</option>
                            <option value="Sanitaer" className="bg-[#16161B] text-white">Sanitär & Heizung</option>
                            <option value="Gartenbau" className="bg-[#16161B] text-white">Garten- & Landschaftsbau</option>
                            <option value="Bau" className="bg-[#16161B] text-white">Bauunternehmung & Renovation</option>
                            <option value="Anderes" className="bg-[#16161B] text-white">Anderes Handwerk</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#A1A1A6] mb-1.5">
                            Betriebsgrösse
                          </label>
                          <select
                            value={inquiryData.teamSize}
                            onChange={(e) => setInquiryData({ ...inquiryData, teamSize: e.target.value })}
                            className="w-full px-4 py-3 bg-white/[0.06] border border-white/15 rounded-2xl text-sm text-white font-medium focus:border-[#D6BA94] focus:outline-none"
                          >
                            <option value="1 Person" className="bg-[#16161B] text-white">1 Person (Solo-Handwerker)</option>
                            <option value="2-5 Mitarbeiter" className="bg-[#16161B] text-white">2 - 5 Mitarbeiter</option>
                            <option value="6-15 Mitarbeiter" className="bg-[#16161B] text-white">6 - 15 Mitarbeiter</option>
                            <option value="15+ Mitarbeiter" className="bg-[#16161B] text-white">Mehr als 15 Mitarbeiter</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#A1A1A6] mb-2">
                          Gewünschtes Paket / Interesse
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <button
                            type="button"
                            onClick={() => setInquiryData({ ...inquiryData, paketWunsch: 'private_node' })}
                            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                              inquiryData.paketWunsch === 'private_node'
                                ? 'border-[#D6BA94] bg-[#D6BA94]/15'
                                : 'border-white/10 bg-white/[0.04] hover:border-white/25'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-white mb-1">
                              <span>Firmeneigene KI (Enterprise)</span>
                            </div>
                            <p className="text-xs text-[#A1A1A6] leading-tight">
                              ab CHF 149.-/Mt. · Inkl. KI-Freischaltung im CRM & eigener Instanz
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setInquiryData({ ...inquiryData, paketWunsch: 'professional' })}
                            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                              inquiryData.paketWunsch === 'professional'
                                ? 'border-[#D6BA94] bg-[#D6BA94]/15'
                                : 'border-white/10 bg-white/[0.04] hover:border-white/25'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-white mb-1">
                              <span>Professional (Ohne KI)</span>
                            </div>
                            <p className="text-xs text-[#A1A1A6] leading-tight">
                              CHF 49.-/Mt. · Alle 10 CRM-Module ohne KI
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setInquiryData({ ...inquiryData, paketWunsch: 'migration' })}
                            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                              inquiryData.paketWunsch === 'migration'
                                ? 'border-[#D6BA94] bg-[#D6BA94]/15'
                                : 'border-white/10 bg-white/[0.04] hover:border-white/25'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-white mb-1">
                              <span>Altdaten-Migration</span>
                            </div>
                            <p className="text-xs text-[#A1A1A6] leading-tight">
                              Übernahme aus Bexio, Sorba, Excel & Schulung
                            </p>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-[#A1A1A6] mb-1.5">
                            Vor- & Nachname *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="z. B. Beat Keller"
                            value={inquiryData.name}
                            onChange={(e) => setInquiryData({ ...inquiryData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-white/[0.06] border border-white/15 rounded-2xl text-sm text-white placeholder-[#A1A1A6]/50 focus:border-[#D6BA94] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#A1A1A6] mb-1.5">
                            Firma / Betrieb *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="z. B. Keller Holzbau AG"
                            value={inquiryData.firma}
                            onChange={(e) => setInquiryData({ ...inquiryData, firma: e.target.value })}
                            className="w-full px-4 py-3 bg-white/[0.06] border border-white/15 rounded-2xl text-sm text-white placeholder-[#A1A1A6]/50 focus:border-[#D6BA94] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-[#A1A1A6] mb-1.5">
                            E-Mail-Adresse *
                          </label>
                          <input
                            type="email"
                            required
                            placeholder="name@betrieb.ch"
                            value={inquiryData.email}
                            onChange={(e) => setInquiryData({ ...inquiryData, email: e.target.value })}
                            className="w-full px-4 py-3 bg-white/[0.06] border border-white/15 rounded-2xl text-sm text-white placeholder-[#A1A1A6]/50 focus:border-[#D6BA94] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#A1A1A6] mb-1.5">
                            Telefonnummer (optional)
                          </label>
                          <input
                            type="tel"
                            placeholder="044 123 45 67"
                            value={inquiryData.telefon}
                            onChange={(e) => setInquiryData({ ...inquiryData, telefon: e.target.value })}
                            className="w-full px-4 py-3 bg-white/[0.06] border border-white/15 rounded-2xl text-sm text-white placeholder-[#A1A1A6]/50 focus:border-[#D6BA94] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#A1A1A6] mb-1.5">
                          Nachricht / Besondere Wünsche (optional)
                        </label>
                        <textarea
                          rows={3}
                          placeholder="z. B. Datenmigration aus Altsoftware gewünscht, Schnittstelle zu Treuhand..."
                          value={inquiryData.bemerkung}
                          onChange={(e) => setInquiryData({ ...inquiryData, bemerkung: e.target.value })}
                          className="w-full px-4 py-3 bg-white/[0.06] border border-white/15 rounded-2xl text-sm text-white placeholder-[#A1A1A6]/50 focus:border-[#D6BA94] focus:outline-none"
                        ></textarea>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-4 apple-starlight-btn font-semibold rounded-full text-base cursor-pointer"
                      >
                        Unverbindliche Offerte anfordern →
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </section>

            {/* FAQ ACCORDION */}
            <section id="faq" className="py-20">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-2xl mx-auto mb-14">
                  <span className="text-xs font-medium text-[#E8D3B5] bg-[#D6BA94]/12 border border-[#D6BA94]/25 px-4 py-1.5 rounded-full">
                    Häufige Fragen
                  </span>
                  <h2 className="text-3xl font-semibold text-white mt-4 tracking-[-0.03em]">
                    Häufig gestellte Fragen
                  </h2>
                </div>

                <div className="space-y-3.5">
                  {faqs.map((faq, idx) => {
                    const isOpen = openFaqIndex === idx
                    return (
                      <div
                        key={idx}
                        className="apple-glass-card rounded-[22px] overflow-hidden transition-all"
                      >
                        <button
                          onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                          className="w-full p-5 sm:p-6 text-left font-semibold text-sm sm:text-base text-white flex justify-between items-center hover:bg-white/[0.03] cursor-pointer"
                        >
                          <span>{faq.q}</span>
                          <span className="text-xl text-[#D6BA94] font-normal ml-4">
                            {isOpen ? '−' : '+'}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="px-5 sm:px-6 pb-6 text-xs sm:text-sm text-[#A1A1A6] leading-relaxed border-t border-white/10 pt-4">
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
      <section className="py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-stretch justify-between gap-4">
            <button
              type="button"
              onClick={() => navigateToSubpage(prevPage.id)}
              className="flex-1 p-6 rounded-[24px] apple-glass-card text-left transition-all cursor-pointer group"
            >
              <span className="text-xs text-[#A1A1A6] block mb-1">
                ← Vorherige Unterseite
              </span>
              <span className="text-base font-semibold text-white group-hover:text-[#E8D3B5] transition-colors block">
                {prevPage.shortTitle}
              </span>
              <span className="text-xs text-[#A1A1A6] mt-0.5 block">{prevPage.subtitle}</span>
            </button>

            <button
              type="button"
              onClick={() => navigateToSubpage(nextPage.id)}
              className="flex-1 p-6 rounded-[24px] apple-glass-stage text-right transition-all cursor-pointer group"
            >
              <span className="text-xs text-[#D6BA94] block mb-1">
                Nächste Seite: {nextPage.label} →
              </span>
              <span className="text-base font-semibold text-white group-hover:text-[#E8D3B5] transition-colors block">
                {nextPage.shortTitle}
              </span>
              <span className="text-xs text-[#A1A1A6] mt-0.5 block">{nextPage.subtitle}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* BOTTOM CALL-TO-ACTION BANNER                                              */}
      {/* ========================================================================= */}
      <section className="py-24 relative overflow-hidden border-t border-white/10">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(80% 60% at 50% 50%, rgba(214,186,148,0.14) 0%, transparent 70%)',
          }}
        />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D6BA94]/12 text-[#E8D3B5] text-xs font-medium border border-[#D6BA94]/25 mb-6">
            <IconSparkles className="w-3.5 h-3.5 text-[#D6BA94]" />
            <span>Bereit für weniger Büro & mehr Handwerk?</span>
          </span>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.04em] leading-tight text-white">
            Starten Sie noch heute mit <span className="apple-titanium-text">Kinetic Craft.</span>
          </h2>
          <p className="mt-5 text-base sm:text-lg text-[#A1A1A6] max-w-2xl mx-auto leading-relaxed">
            Erstellen Sie Ihre erste Schweizer QR-Rechnung in unter 60 Sekunden. 14 Tage unverbindlich testen – keine Kreditkarte erforderlich.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onGoToRegistration}
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold apple-starlight-btn rounded-full cursor-pointer"
            >
              14 Tage kostenlos testen
            </button>
            <button
              onClick={onGoToLogin}
              className="w-full sm:w-auto px-7 py-4 text-base font-medium text-white hover:bg-white/10 border border-white/15 rounded-full transition-all cursor-pointer"
            >
              Bestehender Kunde? Einloggen
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FOOTER WITH DIRECT SUBPAGE DEEP-LINKS                                     */}
      {/* ========================================================================= */}
      <footer className="bg-black/60 border-t border-white/10 py-14 text-xs text-[#A1A1A6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-white/10">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <KineticLogoMark className="w-8 h-8 text-white" />
                <div>
                  <span className="font-semibold text-sm text-white">Kinetic Craft</span>
                  <span className="text-xs text-[#A1A1A6] block -mt-0.5">by Kinetic Schweiz</span>
                </div>
              </div>
              <p className="text-xs text-[#A1A1A6] leading-relaxed">
                Das moderne Handwerker-CRM für Schweizer Betriebe: 10 Module im Standard-CRM und optional freischaltbare Firmeneigene KI.
              </p>
              <div className="flex items-center gap-2 text-xs text-[#F5F5F7] font-medium pt-1">
                <IconSwissFlag className="w-4 h-4 rounded shadow-xs shrink-0" />
                <span>Swiss Made Software</span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-white text-xs mb-3">Unterseiten & Module</h4>
              <ul className="space-y-2 text-xs">
                {MARKETING_PAGES.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => navigateToSubpage(p.id)}
                      className="hover:text-white cursor-pointer text-left transition-colors"
                    >
                      {p.label} ({p.path})
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    onClick={onGoToRegistration}
                    className="hover:text-white cursor-pointer font-medium text-[#E8D3B5]"
                  >
                    14 Tage Testzugang starten
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white text-xs mb-3">Standards & Recht</h4>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center gap-1.5 text-[#A1A1A6]">
                  <IconCheck className="w-3.5 h-3.5 text-[#D6BA94] shrink-0" />
                  <span>Schweizer QR-Bill (ISO 20022)</span>
                </li>
                <li className="flex items-center gap-1.5 text-[#A1A1A6]">
                  <IconCheck className="w-3.5 h-3.5 text-[#D6BA94] shrink-0" />
                  <span>Banana Buchhaltung Export (OR 957ff.)</span>
                </li>
                <li className="flex items-center gap-1.5 text-[#A1A1A6]">
                  <IconCheck className="w-3.5 h-3.5 text-[#D6BA94] shrink-0" />
                  <span>Zefix Handelsregister API</span>
                </li>
                <li className="flex items-center gap-1.5 text-[#A1A1A6]">
                  <IconCheck className="w-3.5 h-3.5 text-[#D6BA94] shrink-0" />
                  <span>Schweizer Datenschutz (revDSG)</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white text-xs mb-3">Kinetic Schweiz</h4>
              <p className="text-xs text-[#A1A1A6] leading-relaxed">
                Vertrieb, Betreuung & Private-Cloud-Implementierung für Schweizer Betriebe.
              </p>
              <div className="mt-3 space-y-1.5 text-xs">
                <p>
                  E-Mail:{' '}
                  <a href="mailto:support@ki-netic.ch" className="font-medium text-[#E8D3B5] hover:underline">
                    support@ki-netic.ch
                  </a>
                </p>
                <p>
                  Web: <span className="font-medium text-white">kinetic-schweiz.ch</span>
                </p>
                <div className="pt-2">
                  <button
                    onClick={onGoToLogin}
                    className="text-xs font-medium text-white hover:text-[#D6BA94] cursor-pointer"
                  >
                    Kunden-Login öffnen →
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#A1A1A6]">
            <div>
              © {new Date().getFullYear()} Kinetic Idrissi. Alle Rechte vorbehalten. Kinetic Craft – Handwerker-Software für die Schweiz.
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onOpenDatenschutz}
                className="hover:text-white underline cursor-pointer transition-colors"
              >
                Datenschutz (DSG)
              </button>
              <span>·</span>
              <button
                onClick={onOpenImpressum}
                className="hover:text-white underline cursor-pointer transition-colors"
              >
                Impressum
              </button>
              <span>·</span>
              <span>ISO 27001 Datensicherheit</span>
            </div>
          </div>
        </div>
      </footer>

      {/* STICKY FLOATING LIQUID GLASS CTA BAR */}
      {showStickyCta && (
        <div className="fixed bottom-4 left-3 right-3 z-40 pointer-events-none flex justify-center animate-fade-in-up">
          <div className="pointer-events-auto max-w-4xl w-full apple-glass-pill rounded-full py-2.5 px-4 sm:px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <KineticLogoMark className="w-8 h-8 text-white shrink-0 hidden sm:block" />
              <div>
                <span className="text-xs sm:text-sm font-semibold text-white block leading-tight">
                  Kinetic Craft Pro – Schweizer Handwerker-CRM
                </span>
                <span className="text-xs text-[#A1A1A6] hidden md:block">
                  10 CRM-Module ohne KI · Optional mit freigeschalteter Firmeneigener KI
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onGoToLogin}
                className="px-3.5 py-2 text-xs font-medium text-[#A1A1A6] hover:text-white rounded-full transition-all cursor-pointer hidden sm:block"
              >
                Einloggen
              </button>
              <button
                onClick={onGoToRegistration}
                className="px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold apple-starlight-btn rounded-full cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>14 Tage kostenlos testen</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCREENSHOT ZOOM MODAL */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-8 animate-fade-in-up"
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="relative max-w-6xl w-full max-h-[92vh] apple-glass-stage rounded-[28px] overflow-hidden p-3 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-4 py-2.5 border-b border-white/10">
              <span className="text-xs font-medium text-white">Kinetic Craft – Live Screenshot-Vorschau</span>
              <button
                onClick={() => setZoomedImage(null)}
                className="inline-flex items-center gap-1.5 text-[#A1A1A6] hover:text-white text-xs font-medium px-3 py-1 rounded-full bg-white/[0.06] cursor-pointer"
              >
                <IconClose className="w-4 h-4" />
                <span>Schliessen</span>
              </button>
            </div>
            <div className="overflow-auto max-h-[calc(92vh-60px)] p-2">
              <img src={zoomedImage} alt="Vergrösserter Screenshot" className="w-full h-auto rounded-2xl" />
            </div>
          </div>
        </div>
      )}

      {/* Swiss DSG Privacy Information Banner */}
      <DsgBanner onOpenDatenschutz={onOpenDatenschutz} />
    </div>
  )
}
