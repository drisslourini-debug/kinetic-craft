import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import LandingPageView from '../LandingPageView'

describe('LandingPageView Component - Kinetic Craft', () => {
  it('renders brand Kinetic Craft, hero headlines and trust indicators', () => {
    const onGoToLogin = vi.fn()
    const onGoToRegistration = vi.fn()

    render(
      <LandingPageView
        onGoToLogin={onGoToLogin}
        onGoToRegistration={onGoToRegistration}
      />
    )

    // Check brand names
    expect(screen.getAllByText(/Kinetic/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Craft/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Kinetic Schweiz/i).length).toBeGreaterThan(0)

    // Check headline
    expect(screen.getByText(/Das Handwerker-CRM,/i)).toBeInTheDocument()
    expect(screen.getByText(/das mitdenkt\./i)).toBeInTheDocument()

    // Check stats & trust indicators
    expect(screen.getByText(/60 Sek\./i)).toBeInTheDocument()
    expect(screen.getByText(/Swiss QR-Rechnung & MWST-konform/i)).toBeInTheDocument()
  })

  it('renders real app screenshots for hero, feature cards and mobile mockup', () => {
    render(
      <LandingPageView
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    // Hero Desktop Screenshot
    const heroImg = screen.getByAltText(/Kinetic Craft Dashboard Übersicht/i)
    expect(heroImg).toBeInTheDocument()
    expect(heroImg.getAttribute('src')).toBe('/screenshots/01_hero_dashboard.png')

    // Feature Detail Screenshots
    const offertenImg = screen.getByAltText(/Kinetic Craft Offerten und Schweizer QR-Rechnung/i)
    expect(offertenImg).toBeInTheDocument()
    expect(offertenImg.getAttribute('src')).toBe('/screenshots/02_offerten_rechnungen.png')

    // Mobile Screenshot
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

    // Find and click Einloggen button in header
    const loginButtons = screen.getAllByRole('button', { name: /Einloggen/i })
    fireEvent.click(loginButtons[0])
    expect(onGoToLogin).toHaveBeenCalled()

    // Find and click Testen CTA button
    const registerButtons = screen.getAllByRole('button', { name: /14 Tage/i })
    fireEvent.click(registerButtons[0])
    expect(onGoToRegistration).toHaveBeenCalled()
  })

  it('toggles pricing cycle between monthly (CHF 49.00) and yearly (CHF 44.00)', () => {
    render(
      <LandingPageView
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    // Default monthly: CHF 49.00 and Starter CHF 0
    expect(screen.getByText(/Starter \/ Free/i)).toBeInTheDocument()
    expect(screen.getByText(/CHF 49\.00/i)).toBeInTheDocument()

    // Click Jährlich toggle
    const yearlyBtn = screen.getByRole('button', { name: /Jährlich/i })
    fireEvent.click(yearlyBtn)

    // Price updates to CHF 44.00 with 10% discount
    expect(screen.getByText(/CHF 44\.00/i)).toBeInTheDocument()
  })

  it('filters Gewerke when clicking trade filter buttons', () => {
    render(
      <LandingPageView
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    // Initially all trades visible
    expect(screen.getByRole('heading', { name: 'Schreinerei & Innenausbau' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Maler & Gipser' })).toBeInTheDocument()

    // Filter to Maler
    const malerBtn = screen.getByRole('button', { name: /Maler/i })
    fireEvent.click(malerBtn)

    expect(screen.getByRole('heading', { name: 'Maler & Gipser' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Schreinerei & Innenausbau' })).not.toBeInTheDocument()
  })

  it('handles quote inquiry form submission', () => {
    render(
      <LandingPageView
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    // Fill form
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

  it('opens and closes FAQ accordion items', () => {
    render(
      <LandingPageView
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    // First FAQ item is open by default
    expect(screen.getByText(/Kinetic Craft generiert automatisch vollumfänglich standardkonforme Schweizer QR-Rechnungen/i)).toBeInTheDocument()

    // Click on another question
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

    // Modal opens
    expect(screen.getByText(/Live Screenshot-Vorschau/i)).toBeInTheDocument()

    // Close button
    const closeBtn = screen.getByRole('button', { name: /Schliessen/i })
    fireEvent.click(closeBtn)

    expect(screen.queryByText(/Live Screenshot-Vorschau/i)).not.toBeInTheDocument()
  })

  it('renders Gemini AI superpowers section and Swiss Treuhand/Banana Buchhaltung features', () => {
    render(
      <LandingPageView
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    // Gemini AI Section
    expect(screen.getByText(/Gemini 3\.8 Flash Inside/i)).toBeInTheDocument()
    expect(screen.getByText(/Ihr digitaler Polier:/i)).toBeInTheDocument()
    expect(screen.getByText(/Belege & Quittungen scannen/i)).toBeInTheDocument()
    expect(screen.getByText(/Baustellen-Sprachdiktat/i)).toBeInTheDocument()

    // Schweizer Treuhand & Banana Buchhaltung
    expect(screen.getByText(/Export für Banana Buchhaltung & Treuhänder nach OR 957ff\./i)).toBeInTheDocument()
    expect(screen.getByText(/1109 Delkredere \(5% Pauschale\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Netto-Forderungsbestand:/i)).toBeInTheDocument()
  })

  it('renders Baustellen-Cockpit with weather, Zefix, and live stopwatch', () => {
    render(
      <LandingPageView
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    expect(screen.getByText(/Das smarte Cockpit für Schweizer Baustellen/i)).toBeInTheDocument()
    expect(screen.getByText(/Live Baustellen-Wetter/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Zefix-Handelsregister/i })).toBeInTheDocument()
    expect(screen.getByText(/Live-Stoppuhr & Rapport/i)).toBeInTheDocument()
    expect(screen.getByText(/Feiertage nach Kanton/i)).toBeInTheDocument()
  })

  it('switches workflow showcase tabs and updates displayed module', () => {
    render(
      <LandingPageView
        onGoToLogin={vi.fn()}
        onGoToRegistration={vi.fn()}
      />
    )

    // Initially Tab 1 (Bento-Cockpit & Wetter) is active
    expect(screen.getByText(/Das neue Bento-Dashboard mit Live-Wetter/i)).toBeInTheDocument()

    // Click Tab 2: Gemini KI & Baustelle
    const tab2Btn = screen.getByRole('button', { name: /2\. Gemini KI & Baustelle/i })
    fireEvent.click(tab2Btn)

    expect(screen.getByText(/KI-Belegscanner & Baustellen-Sprachdiktat/i)).toBeInTheDocument()
    expect(screen.getByAltText(/Kinetic Craft KI Beleg Scanner/i)).toBeInTheDocument()

    // Click Tab 3: CRM & Zefix
    const tab3Btn = screen.getByRole('button', { name: /3\. CRM & Zefix-Handelsregister/i })
    fireEvent.click(tab3Btn)

    expect(screen.getByText(/Kundenkartei mit Zefix-Echtzeitprüfung/i)).toBeInTheDocument()

    // Click Tab 4: QR-Bill & Banana
    const tab4Btn = screen.getByRole('button', { name: /4\. QR-Bill & Banana-Treuhand/i })
    fireEvent.click(tab4Btn)

    expect(screen.getByText(/Schweizer QR-Rechnung & Banana-Export/i)).toBeInTheDocument()
  })

  it('interactively calculates time and cost savings with ROI slider and triggers CTA', () => {
    const onGoToRegistration = vi.fn()
    render(
      <LandingPageView
        onGoToLogin={vi.fn()}
        onGoToRegistration={onGoToRegistration}
      />
    )

    expect(screen.getByText(/Wie viel Bürozeit & Geld sparen Sie pro Monat\?/i)).toBeInTheDocument()
    
    // Check initial calculated values (calcDocCount=25, calcTeamSize=3 -> 25*0.6 + 3*1.5 = 15 + 4.5 = 19.5 -> ~20 Std. -> CHF 1'658 oder ~20 Std)
    expect(screen.getByText(/Ihre monatliche Bürozeit-Ersparnis/i)).toBeInTheDocument()
    expect(screen.getByText(/Monatlicher Wertzuwachs \/ Ersparnis/i)).toBeInTheDocument()

    // Find sliders and adjust team size
    const sliders = screen.getAllByRole('slider')
    expect(sliders.length).toBe(2)

    // Increase team size from 3 to 10
    fireEvent.change(sliders[0], { target: { value: '10' } })
    expect(screen.getByText(/10 Personen/i)).toBeInTheDocument()

    // Click calculator CTA button
    const calcCta = screen.getByRole('button', { name: /sparen & 14 Tage testen/i })
    fireEvent.click(calcCta)
    expect(onGoToRegistration).toHaveBeenCalled()
  })
})
