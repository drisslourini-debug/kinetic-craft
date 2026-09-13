import React, { useState } from 'react'

export default function LandingPageView({ onGoToLogin, onGoToRegistration }) {
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
      icon: '🪚',
      title: 'Schreinerei & Innenausbau',
      desc: 'Massgenaue Offerten mit Holzarten, Kanten, Beschlägen und Montagezeiten. 1-Klick Umwandlung in Werkstattauftrag.',
      highlight: 'Massberechnung & Materialdeklaration',
    },
    {
      id: 'maler',
      icon: '🎨',
      title: 'Maler & Gipser',
      desc: 'Schnelle Quadratmeter-Berechnungen für Wände, Decken und Fassaden. Inklusive Farbton-Dokumentation und Regierapporten.',
      highlight: 'm²-Aufmass & Regieberichte',
    },
    {
      id: 'elektro',
      icon: '⚡',
      title: 'Elektro & Gebäudeautomation',
      desc: 'Installations- und Prüfprotokolle direkt beim Kunden digital signieren lassen. Material und Arbeitsstunden sekundengenau abrechnen.',
      highlight: 'Installationsrapporte & Signatur',
    },
    {
      id: 'sanitaer',
      icon: '🔧',
      title: 'Sanitär & Heizung',
      desc: 'Wartungsaufträge, Service-Einsätze und Notfalldienst sauber planen. Automatische Zahlungserinnerungen mit Schweizer QR-Code.',
      highlight: 'Service-Verträge & QR-Rechnung',
    },
    {
      id: 'gartenbau',
      icon: '🌿',
      title: 'Garten- & Landschaftsbau',
      desc: 'Saisonale Pflegeverträge, Pflanzlisten und Maschinenstunden transparent kalkulieren und mit Fotos dokumentieren.',
      highlight: 'Pflege-Abonnemente & Maschinen',
    },
    {
      id: 'bau',
      icon: '🏗️',
      title: 'Bauunternehmung & Renovation',
      desc: 'Mehrere Baustellen und Subunternehmer parallel steuern. Belege direkt per Handy-Kamera scannen und der Baustelle zuweisen.',
      highlight: 'Baustellen-Ablage & Beleg-Scanner',
    },
  ]

  const filteredGewerke = selectedGewerk === 'alle' 
    ? gewerkeList 
    : gewerkeList.filter(g => g.id === selectedGewerk)

  // App Screenshots Showcase Data
  const screenshotCards = [
    {
      id: 'offerten',
      tag: 'Abrechnung & QR-Bill',
      tagColor: 'bg-sky-50 text-sky-700 border-sky-200',
      title: 'Offerten & Rechnungen mit Schweizer QR-Code',
      desc: 'Erstellen Sie professionelle Offerten mit Ihrem Firmenlogo, Schweizer MWST (8.1%) und integriertem QR-Zahlteil nach ISO 20022. Druckbereit und als PDF versandfähig in unter 60 Sekunden.',
      image: '/screenshots/02_offerten_rechnungen.png',
      alt: 'Kinetic Craft Offerten und Schweizer QR-Rechnung',
    },
    {
      id: 'kunden',
      tag: 'Baustellen & CRM',
      tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      title: 'Kundenkartei & Baustellen-Dossiers',
      desc: 'Alle Liegenschaften, Pläne, Dokumente und Ansprechpartner an einem Ort. Mit Zefix-Handelsregisterabgleich und direkter Google Maps-Verbindung für Monteure.',
      image: '/screenshots/03_kunden_baustellen.png',
      alt: 'Kinetic Craft Kunden- und Projektübersicht',
    },
    {
      id: 'kalender',
      tag: 'Planung & Team',
      tagColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      title: 'Monteur-Kalender & Einsatzplanung',
      desc: 'Verteilen Sie Aufträge, Montagen und Termine im Team. Synchronisiert mit den Schweizer Arbeitszeiten, Feiertagen nach Kanton und mobilen Geräten.',
      image: '/screenshots/04_kalender_planung.png',
      alt: 'Kinetic Craft Kalender und Monteur-Planung',
    },
    {
      id: 'buchhaltung',
      tag: 'Finanzen & Belege',
      tagColor: 'bg-amber-50 text-amber-800 border-amber-200',
      title: 'Automatische Buchhaltung & Treuhand-Portal',
      desc: 'Materialbelege per Smartphone-Foto erfassen, MWST automatisch vorkontieren und dem Treuhänder mit einem Klick einen gesicherten Direktzugang gewähren.',
      image: '/screenshots/05_buchhaltung_belege.png',
      alt: 'Kinetic Craft Buchhaltung und Treuhand-Portal',
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
      a: 'Sie erhalten sofort vollen Zugriff auf alle Funktionen von Kinetic Craft Professional – ohne Eingabe einer Kreditkarte und ohne automatische Verlängerung. Nach den 14 Tagen entscheiden Sie selbst, ob Sie im kostenlosen Starter-Tarif bleiben oder das Pro-Abo aktivieren möchten.',
    },
    {
      q: 'Kann mein Treuhänder direkt auf die Daten zugreifen?',
      a: 'Ja! In Kinetic Craft Professional können Sie Ihrem Treuhänder einen dedizierten, kostenlosen Lese- und Exportzugang einrichten. Ihr Treuhänder kann alle Rechnungen, MWST-Auswertungen und Belege direkt herunterladen – das spart Ihnen und Ihrem Treuhänder wertvolle Stunden.',
    },
    {
      q: 'Funktioniert Kinetic Craft mobil auf der Baustelle?',
      a: 'Absolut. Kinetic Craft ist als moderne Web-Applikation für Tablets (iPad, Android) und Smartphones optimiert. Sie können Kundenadressen mit Google Maps öffnen, Fotos von der Baustelle hochladen, Regiestunden erfassen und Offerten direkt vor Ort besprechen.',
    },
    {
      q: 'Wo werden meine Unternehmensdaten gespeichert?',
      a: 'Ihre Daten liegen sicher verschlüsselt in modernen, ISO-zertifizierten Schweizer Rechenzentren unter strikter Einhaltung des neuen Schweizer Datenschutzgesetzes (nDSG / revDSG). Wir geben keinerlei Daten an Dritte weiter.',
    },
    {
      q: 'Wer steht hinter Kinetic Craft und Kinetic Schweiz?',
      a: 'Kinetic Schweiz vertreibt und betreut Kinetic Craft als spezialisierte Unternehmenslösung für das Schweizer Handwerk. Unser Fokus liegt auf kompromissloser Benutzerfreundlichkeit, Schweizer Präzision und persönlichem Support.',
    },
  ]

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-sky-100 selection:text-sky-900">
      
      {/* ========================================================================= */}
      {/* 1. TOP ANNOUNCEMENT BANNER (Nordic Pastel Accent) */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-sky-50 via-teal-50 to-indigo-50 border-b border-sky-100 px-4 py-2 text-center text-xs sm:text-sm font-medium text-slate-800 flex items-center justify-center gap-2">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sky-600 text-white text-[10px] font-bold">🇨🇭</span>
        <span>
          <strong>Kinetic Schweiz</strong> präsentiert: <strong>Kinetic Craft</strong> – Das frische Handwerker-CRM mit 100% Schweizer QR-Rechnung.
        </span>
        <button 
          onClick={onGoToRegistration}
          className="hidden md:inline-flex items-center font-bold text-sky-700 hover:text-sky-900 underline underline-offset-2 ml-1 cursor-pointer"
        >
          Jetzt 14 Tage kostenlos testen →
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. HEADER / NAVIGATION */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Kinetic Craft Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-400 via-teal-400 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-sky-500/20">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4v16" />
                <path d="M4 12l9-8" />
                <path d="M4 12l10 8" />
                <circle cx="18" cy="6" r="2" fill="currentColor" />
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900">Kinetic</span>
                <span className="font-bold text-lg sm:text-xl tracking-tight text-sky-600">Craft</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                  CRM
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-400 -mt-0.5 tracking-wide">
                by Kinetic Schweiz
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#funktionen" className="hover:text-sky-600 transition-colors">Funktionen</a>
            <a href="#einblicke" className="hover:text-sky-600 transition-colors">App-Einblicke</a>
            <a href="#gewerke" className="hover:text-sky-600 transition-colors">Gewerke</a>
            <a href="#tarife" className="hover:text-sky-600 transition-colors">Tarife</a>
            <a href="#vorteile" className="hover:text-sky-600 transition-colors">Vorteile</a>
            <a href="#anfrage" className="hover:text-sky-600 transition-colors">Offerte anfragen</a>
            <a href="#faq" className="hover:text-sky-600 transition-colors">FAQ</a>
          </nav>

          {/* Desktop Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={onGoToLogin}
              className="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              Einloggen
            </button>
            <button
              onClick={onGoToRegistration}
              className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 active:from-sky-700 active:to-teal-700 rounded-xl shadow-sm shadow-sky-500/25 hover:shadow-md hover:shadow-sky-500/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>14 Tage testen</span>
              <span className="text-sky-100">→</span>
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
              <a href="#einblicke" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-50">App-Einblicke</a>
              <a href="#gewerke" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-50">Gewerke</a>
              <a href="#tarife" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-50">Tarife</a>
              <a href="#vorteile" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-50">Vorteile</a>
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
                className="w-full py-2.5 text-center text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-teal-500 rounded-xl shadow-sm"
              >
                14 Tage kostenlos testen
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 3. HERO SECTION (Nordic Pastel Glow + Real Desktop Screenshot) */}
      {/* ========================================================================= */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-28 overflow-hidden bg-gradient-to-b from-white via-sky-50/20 to-white">
        
        {/* Soft Decorative Pastel Ambient Glows */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-r from-sky-200/40 via-teal-200/30 to-indigo-200/30 blur-3xl -z-10 rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          
          {/* Eyebrow Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-sky-200/80 text-sky-800 text-xs sm:text-sm font-semibold mb-6 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
            <span>Entwickelt für Schweizer Handwerksbetriebe · 100% Swiss QR-Rechnung</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Das Handwerker-CRM, <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-sky-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
              das mitdenkt.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
            Schluss mit Zettelwirtschaft und Büro-Frust. Erstellen Sie Offerten und Rechnungen mit <strong>Schweizer QR-Code in unter 60 Sekunden</strong>, verwalten Sie Kunden & Baustellen mobil vor Ort und behalten Sie Ihre Finanzen im Griff.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onGoToRegistration}
              className="w-full sm:w-auto px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 active:from-sky-700 active:to-teal-700 rounded-2xl shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/30 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-3"
            >
              <span>14 Tage kostenlos testen</span>
              <span className="text-sky-100 font-normal">→</span>
            </button>
            <a
              href="#einblicke"
              className="w-full sm:w-auto px-7 py-4 text-base font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <span>Screenshots & Einblicke</span>
              <span className="text-slate-400">↓</span>
            </a>
          </div>

          {/* Micro Trust Proof */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="text-teal-500 font-bold">✓</span>
              <span>Keine Kreditkarte erforderlich</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-teal-500 font-bold">✓</span>
              <span>In 2 Minuten startklar</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-teal-500 font-bold">✓</span>
              <span>Support & Server in der Schweiz</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. HERO DESKTOP REAL SCREENSHOT (Replaces Live Showcase) */}
        {/* ========================================================================= */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 sm:mt-18">
          <div className="relative rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden bg-white ring-1 ring-black/5">
            
            {/* macOS Browser Header */}
            <div className="bg-slate-50/90 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400"></span>
                <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                <span className="w-3 h-3 rounded-full bg-teal-400"></span>
              </div>
              <div className="bg-white border border-slate-200/80 rounded-lg px-4 py-1 text-xs font-mono text-slate-500 flex items-center gap-2 max-w-xs w-full justify-center shadow-xs">
                <span className="text-teal-500">🔒</span>
                <span>craft.kinetic-schweiz.ch/dashboard</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <span className="hidden sm:inline">Schweizer Cloud</span>
                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              </div>
            </div>

            {/* Real Desktop Screenshot */}
            <div className="relative group cursor-pointer" onClick={() => setZoomedImage('/screenshots/01_hero_dashboard.png')}>
              <img 
                src="/screenshots/01_hero_dashboard.png" 
                alt="Kinetic Craft Dashboard Übersicht" 
                className="w-full h-auto object-cover object-top max-h-[640px] transition-transform duration-300 group-hover:scale-[1.008]"
              />
              
              {/* Subtle hover overlay hint */}
              <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <span className="px-4 py-2 bg-white/90 backdrop-blur-md rounded-full text-xs font-bold text-slate-800 shadow-md">
                  🔍 Klicken für Vollbild-Vorschau
                </span>
              </div>

              {/* Floating Feature Badges over screenshot */}
              <div className="absolute top-4 right-4 hidden md:flex items-center gap-2 bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-800">
                <span className="text-sky-500 font-extrabold">⚡</span>
                <span>Offerte in 60 Sekunden</span>
              </div>
              <div className="absolute bottom-4 left-4 hidden md:flex items-center gap-2 bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-800">
                <span>🇨🇭</span>
                <span>100% Swiss QR-Bill nach ISO 20022</span>
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
              <div className="text-3xl sm:text-4xl font-black text-sky-600 font-mono tracking-tight">60 Sek.</div>
              <div className="text-xs sm:text-sm text-slate-600 font-medium mt-1">Von Aufmass zur fertigen Offerte</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">100%</div>
              <div className="text-xs sm:text-sm text-slate-600 font-medium mt-1">Swiss QR-Rechnung & MWST-konform</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-teal-600 font-mono tracking-tight">0 CHF</div>
              <div className="text-xs sm:text-sm text-slate-600 font-medium mt-1">Keine versteckten Einrichtungsgebühren</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
                <span>🇨🇭</span>
                <span>nDSG</span>
              </div>
              <div className="text-xs sm:text-sm text-slate-600 font-medium mt-1">Schweizer Datensicherheit & Hosting</div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. ECHTE EINBLICKE: 4 SCREENSHOT-KARTEN */}
      {/* ========================================================================= */}
      <section id="einblicke" className="py-20 bg-slate-50/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs uppercase font-bold tracking-wider text-sky-700 bg-sky-100/80 px-3 py-1 rounded-full">
              Echte App-Einblicke
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-4 tracking-tight">
              Alles im Blick. Einfach, modern und aufgeräumt.
            </h2>
            <p className="text-base text-slate-600 mt-3">
              Erleben Sie die echte Benutzeroberfläche von Kinetic Craft: Keine überladenen Menüs, sondern Schweizer Präzision und Klarheit.
            </p>
          </div>

          {/* 4 Large Screenshot Detail Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {screenshotCards.map((card) => (
              <div
                key={card.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between group"
              >
                <div className="p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${card.tagColor}`}>
                      {card.tag}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Kinetic Craft</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {card.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {card.desc}
                  </p>
                </div>

                {/* Screenshot Container */}
                <div 
                  className="bg-slate-100 p-3 sm:p-4 border-t border-slate-100 cursor-pointer relative"
                  onClick={() => setZoomedImage(card.image)}
                >
                  <div className="rounded-2xl overflow-hidden border border-slate-200/80 shadow-md bg-white">
                    <img 
                      src={card.image} 
                      alt={card.alt} 
                      className="w-full h-auto object-cover object-top max-h-[360px] group-hover:scale-[1.01] transition-transform"
                    />
                  </div>
                  <div className="mt-2 text-center text-[11px] font-semibold text-slate-400 flex items-center justify-center gap-1">
                    <span>🔍 Klicken zum Vergrössern</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. MOBIL AUF DER BAUSTELLE (Real Mobile Smartphone Screenshot) */}
      {/* ========================================================================= */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-sky-50 via-teal-50/40 to-white rounded-3xl border border-sky-100 p-8 sm:p-12 lg:p-16 flex flex-col lg:flex-row items-center gap-12">
            
            {/* Left Column: Text & Value Props */}
            <div className="flex-1 space-y-6">
              <span className="text-xs uppercase font-bold tracking-wider text-sky-800 bg-sky-100 px-3 py-1 rounded-full">
                Mobile First
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Ihr Büro im Hosentaschen-Format. Auf der Baustelle und im Transporter.
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                Kein schwerer Laptop nötig: Kinetic Craft läuft flüssig auf jedem Smartphone und Tablet. Erfassen Sie Notizen, Fotos und Regiestunden direkt vor Ort.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-sky-200/60 shadow-xs">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm shrink-0">
                    📷
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Foto-Dokumentation & Beleg-Scanner</h4>
                    <p className="text-xs text-slate-500">Materialquittungen fotografieren und der richtigen Baustelle zuweisen.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-sky-200/60 shadow-xs">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-sm shrink-0">
                    📍
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Routen & Google Maps Anbindung</h4>
                    <p className="text-xs text-slate-500">Mit 1 Klick aus dem CRM direkt die Navigation zur Baustelle starten.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-sky-200/60 shadow-xs">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-sm shrink-0">
                    ✍️
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Digitale Kundenunterschrift</h4>
                    <p className="text-xs text-slate-500">Regierapporte und Bauabnahmen direkt auf dem Display gegenzeichnen lassen.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Smartphone Mockup with Real Screenshot */}
            <div className="flex-shrink-0 relative">
              <div className="w-[280px] sm:w-[320px] rounded-[40px] p-3 bg-slate-900 shadow-2xl border-4 border-slate-700 relative">
                {/* Speaker notch */}
                <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-2"></div>
                {/* Real Mobile Screenshot */}
                <div 
                  className="rounded-[28px] overflow-hidden border border-slate-800 cursor-pointer group"
                  onClick={() => setZoomedImage('/screenshots/06_mobile_baustelle.png')}
                >
                  <img 
                    src="/screenshots/06_mobile_baustelle.png" 
                    alt="Kinetic Craft Mobile Ansicht auf der Baustelle" 
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                {/* Home bar */}
                <div className="w-28 h-1 bg-slate-600 rounded-full mx-auto mt-3"></div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. USE CASES: "EIN TOOL. ALLE GEWERKE." */}
      {/* ========================================================================= */}
      <section id="gewerke" className="py-20 bg-slate-50/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs uppercase font-bold tracking-wider text-teal-700 bg-teal-100/80 px-3 py-1 rounded-full">
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
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                selectedGewerk === 'alle'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Alle Gewerke
            </button>
            {gewerkeList.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGewerk(g.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedGewerk === g.id
                    ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{g.icon}</span>
                <span>{g.title.split(' & ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Gewerke Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGewerke.map((g) => (
              <div
                key={g.id}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-sky-400 hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="text-3xl mb-4 group-hover:scale-110 transition-transform w-fit">
                    {g.icon}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{g.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">{g.desc}</p>
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-sky-700">
                  <span>✦ {g.highlight}</span>
                  <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. TARIFE & UPGRADES (Exakt wie im Screenshot / LizenzVerwaltung) */}
      {/* ========================================================================= */}
      <section id="tarife" className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs uppercase font-bold tracking-wider text-sky-700 bg-sky-100/80 px-3 py-1 rounded-full">
              Transparente Tarife
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-4 tracking-tight">
              Tarife & Upgrades
            </h2>
            <p className="text-base text-slate-600 mt-3">
              Wähle den passenden Plan für deinen Handwerksbetrieb. Keine versteckten Kosten.
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
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Jährlich</span>
                <span className="bg-teal-100 text-teal-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                  10% Rabatt
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards (Matching the user's screenshot & LizenzVerwaltung.jsx) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            
            {/* 1. Starter / Free Plan */}
            <div className="border border-slate-200 rounded-2xl p-6 sm:p-8 bg-white flex flex-col justify-between relative shadow-xs">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-bold text-slate-900">Starter / Free</h3>
                  <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">Basis</span>
                </div>
                <div className="text-3xl font-black text-slate-900 my-4 font-mono">
                  CHF 0 <span className="text-xs font-normal text-slate-500 font-sans">/ Monat</span>
                </div>
                <p className="text-xs text-slate-500 mb-6">Ideal für Solo-Handwerker zum Kennenlernen und für kleinere Aufträge.</p>
                
                <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                  <li className="flex items-center gap-2">
                    <span className="text-teal-600 font-bold">✓</span>
                    <span>Bis zu 20 Kunden</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-teal-600 font-bold">✓</span>
                    <span>Standard Offerten & Rechnungen</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-teal-600 font-bold">✓</span>
                    <span>Schweizer QR-Code Generierung</span>
                  </li>
                  <li className="flex items-center gap-2 text-slate-400">
                    <span>✗</span>
                    <span>Eigenes Briefpapier-Layout & Branding</span>
                  </li>
                  <li className="flex items-center gap-2 text-slate-400">
                    <span>✗</span>
                    <span>Treuhand-Portal & Exporte</span>
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
            <div className="border-2 border-sky-400 rounded-2xl p-6 sm:p-8 bg-gradient-to-b from-sky-50/40 via-white to-teal-50/20 flex flex-col justify-between relative shadow-xl ring-1 ring-sky-400/20 transform md:-translate-y-2">
              <span className="absolute -top-3 right-6 bg-gradient-to-r from-sky-500 to-teal-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
                Beliebteste Wahl
              </span>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-bold text-slate-900">Professional</h3>
                  <span className="text-xs bg-sky-100 text-sky-800 px-2.5 py-0.5 rounded-full font-bold">Unbegrenzt</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-sky-700 my-4 font-mono">
                  {billingCycle === 'yearly' ? 'CHF 44.00' : 'CHF 49.00'} <span className="text-xs font-normal text-slate-500 font-sans">/ Monat</span>
                </div>
                <p className="text-xs text-slate-600 mb-6">Für wachsende Handwerksbetriebe, die ihr Büro vollständig digitalisieren wollen.</p>

                <ul className="space-y-3 text-xs sm:text-sm text-slate-800">
                  <li className="flex items-center gap-2 font-medium">
                    <span className="text-teal-600 font-bold">✓</span>
                    <span>Unbegrenzte Kunden & Projekte</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <span className="text-teal-600 font-bold">✓</span>
                    <span>Unbegrenzte Offerten & QR-Rechnungen</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <span className="text-teal-600 font-bold">✓</span>
                    <span>Vollwertige Buchhaltung & MWST-Abrechnung</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <span className="text-teal-600 font-bold">✓</span>
                    <span>Treuhand-Zugänge inklusive</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <span className="text-teal-600 font-bold">✓</span>
                    <span>Eigenes Briefpapier, Firmenlogo & Farben</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <span className="text-teal-600 font-bold">✓</span>
                    <span>Word- & PDF-Export mit Firmen-Design</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 space-y-2">
                <button
                  onClick={onGoToRegistration}
                  className="w-full py-3.5 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 active:from-sky-700 active:to-teal-700 text-white shadow-md shadow-sky-500/30 transition-all cursor-pointer"
                >
                  14 Tage kostenlos testen
                </button>
                <p className="text-[11px] text-center text-slate-500">Keine Kreditkarte nötig · Endet automatisch</p>
              </div>
            </div>

            {/* 3. Enterprise Plan */}
            <div className="border border-slate-200 rounded-2xl p-6 sm:p-8 bg-white flex flex-col justify-between relative shadow-xs">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-bold text-slate-900">Enterprise</h3>
                  <span className="text-xs bg-slate-900 text-white px-2.5 py-0.5 rounded-full font-bold">Massgeschneidert</span>
                </div>
                <div className="text-3xl font-black text-slate-900 my-4">
                  Auf Anfrage
                </div>
                <p className="text-xs text-slate-500 mb-6">Für Betriebe mit individuellen Anforderungen, Schnittstellen und Datenübernahme.</p>

                <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                  <li className="flex items-center gap-2">
                    <span className="text-teal-600 font-bold">✓</span>
                    <span>Alle Funktionen aus Professional</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-teal-600 font-bold">✓</span>
                    <span>Persönliche Datenmigration (Bexio, Sorba, Excel)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-teal-600 font-bold">✓</span>
                    <span>Team-Schulung vor Ort oder per Video</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-teal-600 font-bold">✓</span>
                    <span>Fester Schweizer Ansprechpartner</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-teal-600 font-bold">✓</span>
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
      {/* 10. INTERAKTIVE OFFERTEN- & DEMO-ANFRAGE */}
      {/* ========================================================================= */}
      <section id="anfrage" className="py-20 bg-slate-50/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-lg">
            
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs uppercase font-bold tracking-wider text-sky-800 bg-sky-100 px-3 py-1 rounded-full">
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
              <div className="bg-sky-50/50 p-8 rounded-2xl border border-sky-200 text-center space-y-4 shadow-sm animate-fade-in">
                <div className="w-14 h-14 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-2xl mx-auto font-bold">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-slate-900">Vielen Dank für Ihre Anfrage!</h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Wir haben Ihre Angaben erhalten und prüfen Ihr massgeschneidertes Paket für {inquiryData.firma || 'Ihren Betrieb'}.
                </p>
                <div className="pt-4">
                  <button
                    onClick={onGoToRegistration}
                    className="px-6 py-3 bg-gradient-to-r from-sky-500 to-teal-500 text-white font-bold rounded-xl text-sm hover:from-sky-600 hover:to-teal-600 transition-colors"
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
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white font-bold rounded-xl text-base shadow-md shadow-sky-500/25 transition-all cursor-pointer"
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
      {/* 11. WARUM KINETIC SCHWEIZ & KINETIC CRAFT? */}
      {/* ========================================================================= */}
      <section id="vorteile" className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs uppercase font-bold tracking-wider text-sky-700 bg-sky-100/80 px-3 py-1 rounded-full">
              Schweizer Werte
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-4 tracking-tight">
              Warum sich Schweizer Betriebe für Kinetic Craft entscheiden.
            </h2>
            <p className="text-base text-slate-600 mt-3">
              Moderne Software, die sich dem Handwerker anpasst – nicht umgekehrt.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center text-2xl mb-4">
                🎯
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-2">Kein IT-Kauderwelsch</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Entwickelt mit und für Praktiker. Keine verschachtelten Menüs, sondern klare Buttons und logische Abläufe.
              </p>
            </div>

            <div className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-2xl mb-4">
                📱
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-2">Mobile First auf der Baustelle</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Optimiert für Touch-Bedienung auf iPad und Smartphone. Schnelles Aufmass und Fotoupload direkt vor Ort.
              </p>
            </div>

            <div className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-2xl mb-4">
                🔒
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-2">100% nDSG Datenschutz</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Hosting in ISO-27001 zertifizierten Schweizer Rechenzentren. Bankenübliche 256-Bit SSL-Verschlüsselung.
              </p>
            </div>

            <div className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl mb-4">
                🇨🇭
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-2">Support aus der Schweiz</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Ein fester Ansprechpartner von Kinetic Schweiz, der Ihre Branche versteht und Ihnen unkompliziert weiterhilft.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 12. FAQ ACCORDION */}
      {/* ========================================================================= */}
      <section id="faq" className="py-20 bg-slate-50/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs uppercase font-bold tracking-wider text-sky-700 bg-sky-100/80 px-3 py-1 rounded-full">
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

          <div className="mt-12 p-6 bg-gradient-to-r from-sky-50 via-teal-50 to-indigo-50 rounded-2xl border border-sky-200 text-center">
            <p className="text-sm font-semibold text-slate-900">
              Haben Sie eine spezifische Frage zu Ihrem Betrieb?
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Kontaktieren Sie unser Schweizer Support-Team direkt unter{' '}
              <a href="mailto:support@ki-netic.ch" className="font-bold underline text-sky-700">support@ki-netic.ch</a>
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 13. BOTTOM HERO CALL-TO-ACTION BANNER */}
      {/* ========================================================================= */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold border border-sky-500/30 mb-6">
            ✦ Bereit für weniger Büro & mehr Handwerk?
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Starten Sie noch heute mit <span className="bg-gradient-to-r from-sky-400 to-teal-300 bg-clip-text text-transparent">Kinetic Craft.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Erstellen Sie Ihre erste Schweizer QR-Rechnung in unter 60 Sekunden. 14 Tage unverbindlich testen – keine Kreditkarte erforderlich.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onGoToRegistration}
              className="w-full sm:w-auto px-8 py-4 text-base font-bold text-slate-950 bg-gradient-to-r from-sky-400 to-teal-300 hover:from-sky-300 hover:to-teal-200 rounded-2xl shadow-lg shadow-sky-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
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
      {/* 14. FOOTER */}
      {/* ========================================================================= */}
      <footer className="bg-white border-t border-slate-200 py-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-100">
            
            {/* Col 1: Brand & Origin */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-400 to-teal-500 flex items-center justify-center text-white">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4v16" />
                    <path d="M4 12l9-8" />
                    <path d="M4 12l10 8" />
                  </svg>
                </div>
                <div>
                  <span className="font-extrabold text-sm text-slate-900">Kinetic Craft</span>
                  <span className="text-[11px] text-slate-400 block -mt-0.5">by Kinetic Schweiz</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Das moderne Handwerker-CRM für Schweizer Betriebe. Entwickelt für Schreinereien, Maler, Elektriker und Montageprofis.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold pt-1">
                <span>🇨🇭</span>
                <span>Swiss Made Software</span>
              </div>
            </div>

            {/* Col 2: Produkt */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Produkt</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#funktionen" className="hover:text-sky-600">Funktionsübersicht</a></li>
                <li><a href="#einblicke" className="hover:text-sky-600">App-Screenshots</a></li>
                <li><a href="#gewerke" className="hover:text-sky-600">Branchenlösungen</a></li>
                <li><a href="#tarife" className="hover:text-sky-600">Tarife & Upgrades</a></li>
                <li><button onClick={onGoToRegistration} className="hover:text-sky-600 cursor-pointer">14 Tage Testzugang</button></li>
              </ul>
            </div>

            {/* Col 3: Schweizer Standards */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Standards & Recht</h4>
              <ul className="space-y-2 text-xs">
                <li className="text-slate-600">✓ Schweizer QR-Bill (ISO 20022)</li>
                <li className="text-slate-600">✓ MwSt-Sätze (8.1% / 2.6%)</li>
                <li className="text-slate-600">✓ Schweizer Datenschutz (nDSG)</li>
                <li className="text-slate-600">✓ Treuhänder-Exportformat</li>
              </ul>
            </div>

            {/* Col 4: Kinetic Schweiz Kontakt */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Kinetic Schweiz</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Vertrieb, Betreuung & Implementierung für Schweizer Betriebe.
              </p>
              <div className="mt-3 space-y-1.5 text-xs">
                <p>E-Mail: <a href="mailto:support@ki-netic.ch" className="font-bold text-sky-700 hover:underline">support@ki-netic.ch</a></p>
                <p>Web: <span className="font-semibold text-slate-700">kinetic-schweiz.ch</span></p>
                <div className="pt-2">
                  <button
                    onClick={onGoToLogin}
                    className="text-xs font-bold text-slate-700 hover:text-sky-700 underline cursor-pointer"
                  >
                    Kunden-Login öffnen →
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom copyright */}
          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
            <div>
              © {new Date().getFullYear()} Kinetic Schweiz. Alle Rechte vorbehalten. Kinetic Craft ist ein Produkt für das Schweizer Handwerk.
            </div>
            <div className="flex gap-4">
              <span>Datenschutz (nDSG)</span>
              <span>•</span>
              <span>Impressum</span>
              <span>•</span>
              <span>Sicherheit</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 15. SCREENSHOT ZOOM MODAL */}
      {/* ========================================================================= */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-6xl w-full max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2">
            <div className="flex justify-between items-center px-4 py-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700">Kinetic Craft – Live Screenshot-Vorschau</span>
              <button 
                onClick={() => setZoomedImage(null)} 
                className="text-slate-400 hover:text-slate-800 text-lg font-bold px-2 py-1 cursor-pointer"
              >
                ✕ Schliessen
              </button>
            </div>
            <div className="overflow-auto max-h-[calc(90vh-60px)]">
              <img src={zoomedImage} alt="Vergrösserter Screenshot" className="w-full h-auto" />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
