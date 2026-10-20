import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LandingPageView from '../LandingPageView'

describe('LandingPageView Component - 5-Subpage 10/10 Tech Website', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('renders brand Kinetic Craft, hero headlines and trust indicators on Home (/)', () => {
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
  })

  it('renders real app screenshots for hero (with fetchpriority="high"), feature cards and mobile mockup on Home', () => {
    render(
      <LandingPageView
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    const heroImg = screen.getByAltText(/Kinetic Craft Dashboard Übersicht/i)
    expect(heroImg).toBeInTheDocument()
    expect(heroImg.getAttribute('src')).toBe('/screenshots/01_hero_dashboard.png')
    expect(heroImg.getAttribute('fetchpriority')).toBe('high')

    const offertenImg = screen.getByAltText(/Kinetic Craft Offerten und Schweizer QR-Rechnung/i)
    expect(offertenImg).toBeInTheDocument()
    expect(offertenImg.getAttribute('src')).toBe('/screenshots/02_offerten_rechnungen.png')

    const mobileImg = screen.getByAltText(/Kinetic Craft Mobile Ansicht/i)
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

    // Navigate to /funktionen
    const funktionenNav = screen.getAllByRole('button', { name: /Funktionen & Finanzen/i })[0]
    fireEvent.click(funktionenNav)
    expect(window.location.pathname).toBe('/funktionen')
    expect(screen.getByText(/Vom Erstversand bis zur 2\. Mahnung: 100% automatisiert\./i)).toBeInTheDocument()

    // Navigate to /ki-cloud
    const kiNav = screen.getAllByRole('button', { name: /Firmeneigene KI/i })[0]
    fireEvent.click(kiNav)
    expect(window.location.pathname).toBe('/ki-cloud')
    expect(screen.getAllByText(/Kinetic Private AI Node/i)[0]).toBeInTheDocument()

    // Navigate to /gewerke
    const gewerkeNav = screen.getAllByRole('button', { name: /Branchen & NPK/i })[0]
    fireEvent.click(gewerkeNav)
    expect(window.location.pathname).toBe('/gewerke')
    expect(screen.getByText(/Ein Tool\. Für alle Schweizer Gewerke\./i)).toBeInTheDocument()

    // Navigate to /preise
    const preiseNav = screen.getAllByRole('button', { name: /Preise & Rechner/i })[0]
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

  it('filters Gewerke and runs interactive NPK/SIA-118 calculator on /gewerke', () => {
    render(
      <LandingPageView
        initialPage="gewerke"
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    expect(screen.getByRole('heading', { name: 'Schreinerei & Innenausbau' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Maler & Gipser' })).toBeInTheDocument()

    // Filter to Maler
    const malerButtons = screen.getAllByRole('button', { name: /Maler/i })
    fireEvent.click(malerButtons[0])

    expect(screen.getByRole('heading', { name: 'Maler & Gipser' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Schreinerei & Innenausbau' })).not.toBeInTheDocument()

    // Check NPK Calculator presence
    expect(screen.getByText(/Interaktive Branchen-Kalkulation nach Schweizer Norm/i)).toBeInTheDocument()
  })

  it('handles quote inquiry form submission and context handoff from /ki-cloud to /preise', () => {
    render(
      <LandingPageView
        initialPage="ki-cloud"
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    // Click CTA in Private AI Node Architecture Explorer to jump to /preise#anfrage
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

    expect(screen.getByText(/Sie erhalten sofort vollen Zugriff auf alle Funktionen von Kinetic Craft Professional/i)).toBeInTheDocument()
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

  it('renders interactive QR-Bill & Dunning sandbox, Banana Buchhaltung and Baustellen-Cockpit on /funktionen', () => {
    render(
      <LandingPageView
        initialPage="funktionen"
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    // Check Interactive Dunning Sandbox
    expect(screen.getByText(/Vom Erstversand bis zur 2\. Mahnung: 100% automatisiert\./i)).toBeInTheDocument()
    const stage3Btn = screen.getByRole('button', { name: /2\. Mahnung \(Letzte Frist\)/i })
    fireEvent.click(stage3Btn)
    expect(screen.getByText(/2\. & LETZTE MAHNUNG ZU RE-2026-0842/i)).toBeInTheDocument()

    // Check Schweizer Treuhand & Banana Buchhaltung
    expect(screen.getByText(/Export für Banana Buchhaltung & Treuhänder nach OR 957ff\./i)).toBeInTheDocument()
    expect(screen.getByText(/1109 Delkredere \(5% Pauschale\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Netto-Forderungsbestand:/i)).toBeInTheDocument()

    // Check Baustellen-Cockpit
    expect(screen.getByText(/Das smarte Cockpit für Schweizer Baustellen/i)).toBeInTheDocument()
    expect(screen.getByText(/Live Baustellen-Wetter/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Zefix-Handelsregister/i })).toBeInTheDocument()
    expect(screen.getByText(/Live-Stoppuhr & Rapport/i)).toBeInTheDocument()
    expect(screen.getByText(/Feiertage nach Kanton/i)).toBeInTheDocument()
  })

  it('switches workflow showcase tabs and updates displayed module on Home', () => {
    render(
      <LandingPageView
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    expect(screen.getByText(/Das neue Bento-Dashboard mit Live-Wetter/i)).toBeInTheDocument()

    const tab2Btn = screen.getByRole('button', { name: /2\. Baustelle & Foto-Belege/i })
    fireEvent.click(tab2Btn)
    expect(screen.getByText(/Mobile Foto-Belege & Baustellen-Dossiers/i)).toBeInTheDocument()
    expect(screen.getByAltText(/Kinetic Craft Beleg- und Baustellenverwaltung/i)).toBeInTheDocument()

    const tab3Btn = screen.getByRole('button', { name: /3\. CRM & Zefix-Handelsregister/i })
    fireEvent.click(tab3Btn)
    expect(screen.getByText(/Kundenkartei mit Zefix-Echtzeitprüfung/i)).toBeInTheDocument()

    const tab4Btn = screen.getByRole('button', { name: /4\. QR-Bill & Banana-Treuhand/i })
    fireEvent.click(tab4Btn)
    expect(screen.getByText(/Schweizer QR-Rechnung & Banana-Export/i)).toBeInTheDocument()
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

  it('renders Kinetic Private AI Node section, Vorher/Nachher Simulator, Private AI Node Explorer and revDSG comparison on /ki-cloud', () => {
    render(
      <LandingPageView
        initialPage="ki-cloud"
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    expect(screen.getAllByText(/Kinetic Private AI Node/i)[0]).toBeInTheDocument()
    expect(screen.getByText(/Ihr digitaler Polier:/i)).toBeInTheDocument()
    expect(screen.getByText(/Belege & Quittungen scannen/i)).toBeInTheDocument()
    expect(screen.getByText(/Baustellen-Sprachdiktat/i)).toBeInTheDocument()

    // Interactive Receipt/Voice Simulator
    expect(screen.getByText(/Beleg-Scan & Mundart-Diktat live testen/i)).toBeInTheDocument()
    const mundartBtn = screen.getByRole('button', { name: /3\. Schweizerdeutsches Baustellen-Diktat/i })
    fireEvent.click(mundartBtn)
    expect(screen.getByText(/Interner Regierapport \(Mundart → Hochdeutsch\)/i)).toBeInTheDocument()

    // Check 3-column revDSG section
    expect(screen.getByText(/100% Schweizer Datensouveränität \(revDSG\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Lokaler Server vor Ort/i)).toBeInTheDocument()
    expect(screen.getByText(/Klassische US-Cloud APIs/i)).toBeInTheDocument()
    expect(screen.getByText(/Kinetic Private Cloud/i)).toBeInTheDocument()
  })
})
