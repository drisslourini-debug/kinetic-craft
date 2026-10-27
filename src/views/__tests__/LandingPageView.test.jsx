import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LandingPageView from '../LandingPageView'

describe('LandingPageView Component - 5-Subpage Apple Pro Titanium Content Architecture', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('renders brand Kinetic Craft, hero headlines, trust indicators and teaser sections on Startseite (/)', () => {
    const onGoToLogin = vi.fn()
    const onGoToRegistration = vi.fn()

    render(
      <LandingPageView
        onGoToLogin={onGoToLogin}
        onGoToRegistration={onGoToRegistration}
      />
    )

    expect(screen.getAllByText(/Kinetic/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Craft/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Kinetic Schweiz/i).length).toBeGreaterThan(0)

    expect(screen.getByText(/Das Handwerker-CRM,/i)).toBeInTheDocument()
    expect(screen.getByText(/das mitdenkt\./i)).toBeInTheDocument()

    expect(screen.getByText(/60 Sek\./i)).toBeInTheDocument()
    expect(screen.getByText(/Swiss QR-Rechnung & MWST-konform/i)).toBeInTheDocument()

    // Check Startseite USP Highlights & Persona Cards
    expect(screen.getByText(/In 3 Schritten zur fertigen PDF-Offerte\./i)).toBeInTheDocument()
    expect(screen.getByText(/Automatische Ordner-Erstellung\./i)).toBeInTheDocument()
    expect(screen.getByText(/Pascal, selbstständiger Maler/i)).toBeInTheDocument()
    expect(screen.getByText(/Martin \(52\), Maler- & Gipsergeschäft mit 4 Angestellten/i)).toBeInTheDocument()
    expect(screen.getByText(/Starten Sie ab CHF 49\.– \/ Monat/i)).toBeInTheDocument()

    // Switch interactive Quoting & Auto-Folder Showcase modes on Startseite
    const mundartModeBtn = screen.getByRole('button', { name: /2\. Schweizerdeutsch sprechen \(KI\)/i })
    fireEvent.click(mundartModeBtn)
    expect(screen.getByText(/Auf Schweizerdeutsch ins Handy sprechen → fertige A4-Offerte in Sekunden/i)).toBeInTheDocument()

    const autoOrdnerBtn = screen.getByRole('button', { name: /3\. Auto-Ordner & PC ⇄ Handy Sync/i })
    fireEvent.click(autoOrdnerBtn)
    expect(screen.getByText(/Nie wieder Dateien suchen: Automatische Ordner auf PC & Smartphone synchron/i)).toBeInTheDocument()
  })

  it('renders real app screenshots for hero (with fetchpriority="high") on Startseite and module screenshots on /funktionen', () => {
    const { unmount } = render(
      <LandingPageView
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    const heroImg = screen.getByAltText(/Kinetic Craft Dashboard Übersicht/i)
    expect(heroImg).toBeInTheDocument()
    expect(heroImg.getAttribute('src')).toBe('/screenshots/01_hero_dashboard.png')
    expect(heroImg.getAttribute('fetchpriority')).toBe('high')
    unmount()

    render(
      <LandingPageView
        initialPage="funktionen"
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    const offertenImg = screen.getByAltText(/Kinetic Craft Modul 07 Offerten-Editor und A4-Vorschau/i)
    expect(offertenImg).toBeInTheDocument()
    expect(offertenImg.getAttribute('src')).toBe('/screenshots/02_offerten_rechnungen.png')

    const mobileImg = screen.getByAltText(/Kinetic Craft Modul 06 Mobile Baustellen-Ansicht/i)
    expect(mobileImg).toBeInTheDocument()
    expect(mobileImg.getAttribute('src')).toBe('/screenshots/06_mobile_baustelle.png')
  })

  it('triggers onGoToLogin and onGoToRegistration callbacks on button click', () => {
    const onGoToLogin = vi.fn()
    const onGoToRegistration = vi.fn()

    render(
      <LandingPageView
        onGoToLogin={onGoToLogin}
        onGoToRegistration={onGoToRegistration}
      />
    )

    const loginButtons = screen.getAllByRole('button', { name: /Einloggen/i })
    fireEvent.click(loginButtons[0])
    expect(onGoToLogin).toHaveBeenCalled()

    const registerButtons = screen.getAllByRole('button', { name: /14 Tage/i })
    fireEvent.click(registerButtons[0])
    expect(onGoToRegistration).toHaveBeenCalled()
  })

  it('navigates across all 5 subpages and updates clean URLs via History API', () => {
    render(
      <LandingPageView
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    // Navigate to /funktionen (Alle Funktionen)
    const funktionenNav = screen.getAllByRole('button', { name: /^Alle Funktionen$/i })[0]
    fireEvent.click(funktionenNav)
    expect(window.location.pathname).toBe('/funktionen')
    expect(screen.getByText(/Alle 10 CRM-Module\./i)).toBeInTheDocument()

    // Navigate to /ki-cloud (Firmeneigene KI)
    const kiNav = screen.getAllByRole('button', { name: /Firmeneigene KI/i })[0]
    fireEvent.click(kiNav)
    expect(window.location.pathname).toBe('/ki-cloud')
    expect(screen.getAllByText(/Kinetic Private AI Node/i)[0]).toBeInTheDocument()

    // Navigate to /gewerke (Branchen)
    const gewerkeNav = screen.getAllByRole('button', { name: /^Branchen$/i })[0]
    fireEvent.click(gewerkeNav)
    expect(window.location.pathname).toBe('/gewerke')
    expect(screen.getByText(/Ein Tool\. Für alle Schweizer Gewerke\./i)).toBeInTheDocument()

    // Navigate to /preise (Preise & Rechner)
    const preiseNav = screen.getAllByRole('button', { name: /^Preise & Rechner$/i })[0]
    fireEvent.click(preiseNav)
    expect(window.location.pathname).toBe('/preise')
    expect(screen.getByRole('heading', { name: /Tarife & Upgrades/i })).toBeInTheDocument()
  })

  it('toggles pricing cycle between monthly (CHF 49.00) and yearly (CHF 44.00) on /preise', () => {
    render(
      <LandingPageView
        initialPage="preise"
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    expect(screen.getByRole('heading', { name: /Professional/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Enterprise/i })).toBeInTheDocument()
    expect(screen.getByText(/CHF 49\.00/i)).toBeInTheDocument()
    expect(screen.getByText(/ab CHF 149\.00/i)).toBeInTheDocument()

    const yearlyBtn = screen.getByRole('button', { name: /Jährlich/i })
    fireEvent.click(yearlyBtn)

    expect(screen.getByText(/CHF 44\.00/i)).toBeInTheDocument()
  })

  it('displays all 6 detailed trade portraits with weekly time savings on /gewerke (without NPK calculator)', () => {
    render(
      <LandingPageView
        initialPage="gewerke"
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    expect(screen.getByRole('heading', { name: 'Schreinerei & Innenausbau' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Maler & Gipser' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Elektro & Gebäudeautomation' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sanitär & Heizung' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Garten- & Landschaftsbau' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bauunternehmung & Renovation' })).toBeInTheDocument()

    // Check concrete time savings badges
    expect(screen.getAllByText(/~5\.5 Std\. \/ Woche gespart/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/~6\.5 Std\. \/ Woche gespart/i).length).toBeGreaterThan(0)

    // Ensure old NPK calculator is removed as requested
    expect(screen.queryByText(/Interaktive Branchen-Kalkulation nach Schweizer Norm/i)).not.toBeInTheDocument()
  })

  it('handles quote inquiry form submission and context handoff from /ki-cloud to /preise', () => {
    render(
      <LandingPageView
        initialPage="ki-cloud"
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    // Click CTA in Firmeneigene KI to jump to /preise#anfrage
    const requestNodeBtn = screen.getByRole('button', { name: /Private AI Node für meinen Betrieb anfragen/i })
    fireEvent.click(requestNodeBtn)

    expect(window.location.pathname).toBe('/preise')

    const nameInput = screen.getByPlaceholderText(/z\. B\. Beat Keller/i)
    const firmaInput = screen.getByPlaceholderText(/z\. B\. Keller Holzbau AG/i)
    const emailInput = screen.getByPlaceholderText(/name@betrieb\.ch/i)

    fireEvent.change(nameInput, { target: { value: 'Hans Muster' } })
    fireEvent.change(firmaInput, { target: { value: 'Muster Holzbau' } })
    fireEvent.change(emailInput, { target: { value: 'hans@muster-holz.ch' } })

    const submitBtn = screen.getByRole('button', { name: /Unverbindliche Offerte anfordern/i })
    fireEvent.click(submitBtn)

    expect(screen.getByText(/Vielen Dank für Ihre Anfrage!/i)).toBeInTheDocument()
    expect(screen.getByText(/Muster Holzbau/i)).toBeInTheDocument()
  })

  it('opens and closes FAQ accordion items on /preise', () => {
    render(
      <LandingPageView
        initialPage="preise"
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    expect(screen.getByText(/Kinetic Craft generiert automatisch vollumfänglich standardkonforme Schweizer QR-Rechnungen/i)).toBeInTheDocument()

    const secondFaqQuestion = screen.getByRole('button', { name: /Was beinhaltet die 14-tägige kostenlose Testphase\?/i })
    fireEvent.click(secondFaqQuestion)

    expect(screen.getByText(/Sie erhalten sofort vollen Zugriff auf alle 10 Module von Kinetic Craft Professional/i)).toBeInTheDocument()
  })

  it('opens and closes screenshot zoom modal when clicking a screenshot', () => {
    render(
      <LandingPageView
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    const heroImg = screen.getByAltText(/Kinetic Craft Dashboard Übersicht/i)
    fireEvent.click(heroImg)

    expect(screen.getByText(/Live Screenshot-Vorschau/i)).toBeInTheDocument()

    const closeBtn = screen.getByRole('button', { name: /Schliessen/i })
    fireEvent.click(closeBtn)

    expect(screen.queryByText(/Live Screenshot-Vorschau/i)).not.toBeInTheDocument()
  })

  it('renders all 10 CRM modules across 4 categories, Banana Buchhaltung and Baustellen-Cockpit on /funktionen', () => {
    render(
      <LandingPageView
        initialPage="funktionen"
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    // Check 4 categories (in Quick-Jump Bar & Category Headers) and 10 modules
    expect(screen.getByText(/Alle 10 CRM-Module\./i)).toBeInTheDocument()
    expect(screen.getAllByText(/Kategorie 01 · Tagesgeschäft & Planung/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Kategorie 02 · Kunden, Handelsregister & Baustellen/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Kategorie 03 · Offerten, Ausmass & Katalog/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Kategorie 04 · QR-Rechnungen, Mahnwesen & Buchhaltung/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Modul 01/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Modul 10/i).length).toBeGreaterThan(0)

    // Check Schweizer Treuhand & Banana Buchhaltung
    expect(screen.getByText(/Export für Banana Buchhaltung & Treuhänder nach OR 957ff\./i)).toBeInTheDocument()
    expect(screen.getByText(/1109 Delkredere \(5% Pauschale\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Netto-Forderungsbestand:/i)).toBeInTheDocument()

    // Check Baustellen-Cockpit
    expect(screen.getByText(/Das smarte Cockpit für Schweizer Baustellen/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Live Baustellen-Wetter/i).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('heading', { name: /Zefix-Handelsregister/i }).length).toBeGreaterThan(0)
    expect(screen.getByText(/Live-Stoppuhr & Rapport/i)).toBeInTheDocument()
    expect(screen.getByText(/Feiertage nach Kanton/i)).toBeInTheDocument()
  })

  it('toggles interactive KI module unlock preview on /ki-cloud', () => {
    render(
      <LandingPageView
        initialPage="ki-cloud"
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    expect(screen.getByText(/Sehen Sie live, was das KI-Paket in Ihrem CRM freischaltet/i)).toBeInTheDocument()

    const standardCrmBtn = screen.getByRole('button', { name: /Standard-CRM \(100% ohne KI\)/i })
    fireEvent.click(standardCrmBtn)
    expect(screen.getByText(/Positionen aus Katalog wählen & nur Zahlen\/Masse eingeben → fertiges A4-PDF\./i)).toBeInTheDocument()

    const kiUnlockBtn = screen.getByRole('button', { name: /Mit Firmeneigener KI freigeschaltet/i })
    fireEvent.click(kiUnlockBtn)
    expect(screen.getByText(/Katalog-Eingabe PLUS Schweizerdeutsch sprechen → fertige A4-Offerte & KI-Nachkalkulation\./i)).toBeInTheDocument()
  })

  it('interactively calculates time and cost savings with ROI slider on /preise', () => {
    const onGoToRegistration = vi.fn()
    render(
      <LandingPageView
        initialPage="preise"
        onGoToLogin={vi.fn()}
        onGoToRegistration={onGoToRegistration}
      />
    )

    expect(screen.getByText(/Wie viel Bürozeit & Geld sparen Sie pro Monat\?/i)).toBeInTheDocument()
    expect(screen.getByText(/Ihre monatliche Bürozeit-Ersparnis/i)).toBeInTheDocument()
    expect(screen.getByText(/Monatlicher Wertzuwachs \/ Ersparnis/i)).toBeInTheDocument()

    const sliders = screen.getAllByRole('slider')
    expect(sliders.length).toBe(2)

    fireEvent.change(sliders[0], { target: { value: '10' } })
    expect(screen.getByText(/10 Personen/i)).toBeInTheDocument()

    const calcCta = screen.getByRole('button', { name: /sparen & 14 Tage testen/i })
    fireEvent.click(calcCta)
    expect(onGoToRegistration).toHaveBeenCalled()
  })

  it('renders modular AI unlock explanation, unlocked CRM features and revDSG infrastructure comparison on /ki-cloud', () => {
    render(
      <LandingPageView
        initialPage="ki-cloud"
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    expect(screen.getAllByText(/Kinetic Private AI Node/i)[0]).toBeInTheDocument()
    expect(screen.getByText(/1\. Normale Version: 100% ohne KI/i)).toBeInTheDocument()
    expect(screen.getByText(/2\. Mit KI-Paket: KI-Features im CRM freigeschaltet/i)).toBeInTheDocument()

    // Unlocked CRM AI features
    expect(screen.getByRole('heading', { name: /Belege & Quittungen scannen/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Baustellen-Sprachdiktat/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /KI-Offerten-Assistent & Nachkalkulation/i })).toBeInTheDocument()

    // Check 3-column revDSG section
    expect(screen.getByText(/100% Schweizer Datensouveränität \(revDSG\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Lokaler Server vor Ort/i)).toBeInTheDocument()
    expect(screen.getByText(/Klassische US-Cloud APIs/i)).toBeInTheDocument()
    expect(screen.getByText(/Kinetic Private Cloud/i)).toBeInTheDocument()
  })
})
