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
})
