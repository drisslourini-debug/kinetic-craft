import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileTabBar from '../MobileTabBar'
import { pushRoute, parseLocation, initRouter } from '../../lib/router'

describe('MobileTabBar Navigation & History Integrity', () => {
  let originalHistory
  let navigatedRoute = null
  let navigatedParams = null

  beforeEach(() => {
    navigatedRoute = null
    navigatedParams = null
    initRouter()
  })

  const mockNavigate = (view, params, options) => {
    navigatedRoute = view
    navigatedParams = params
    pushRoute(view, params || {}, options)
  }

  it('renders bottom bar tabs for admin user and opens menu drawer on Menü click', () => {
    render(
      <MobileTabBar
        activeView="dashboard"
        onNavigate={mockNavigate}
        userRole="admin"
      />
    )

    expect(screen.getByRole('button', { name: /Home/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Kalender/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Projekte/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Menü/i })).toBeInTheDocument()

    // Open Menü drawer
    fireEvent.click(screen.getByRole('button', { name: /Menü/i }))

    // Menü & Module bottom sheet is open
    expect(screen.getByText('Menü & Module')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Kunden/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Offerten/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Rechnungen/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Buchhaltung/i })).toBeInTheDocument()
  })

  it('navigates to Kunden when clicking Kunden in menu without triggering history.back revert', () => {
    const backSpy = vi.spyOn(window.history, 'back')

    render(
      <MobileTabBar
        activeView="offerten"
        onNavigate={mockNavigate}
        userRole="admin"
      />
    )

    // Open menu
    fireEvent.click(screen.getByRole('button', { name: /Menü/i }))
    expect(screen.getByText('Menü & Module')).toBeInTheDocument()

    // Click Kunden
    const kundenBtn = screen.getByRole('button', { name: /Kunden/i })
    fireEvent.click(kundenBtn)

    // Navigation was triggered
    expect(navigatedRoute).toBe('kunden')
    expect(navigatedParams).toBeNull()

    // Drawer is closed
    expect(screen.queryByText('Menü & Module')).not.toBeInTheDocument()

    // Critical assertion: history.back() was NOT called (which previously reverted the page)
    expect(backSpy).not.toHaveBeenCalled()

    // Router URL updated to /kunden
    const loc = parseLocation()
    expect(loc.view).toBe('kunden')

    backSpy.mockRestore()
  })

  it('navigates to Rechnungen when clicking Rechnungen in menu', () => {
    const backSpy = vi.spyOn(window.history, 'back')

    render(
      <MobileTabBar
        activeView="dashboard"
        onNavigate={mockNavigate}
        userRole="admin"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Menü/i }))
    fireEvent.click(screen.getByRole('button', { name: /Rechnungen/i }))

    expect(navigatedRoute).toBe('rechnungen')
    expect(backSpy).not.toHaveBeenCalled()

    const loc = parseLocation()
    expect(loc.view).toBe('rechnungen')

    backSpy.mockRestore()
  })

  it('opens quick actions sheet (+) and triggers Neue Offerte create action', () => {
    const backSpy = vi.spyOn(window.history, 'back')

    render(
      <MobileTabBar
        activeView="dashboard"
        onNavigate={mockNavigate}
        userRole="admin"
      />
    )

    // Click central + action button
    const actionBtn = screen.getByRole('button', { name: /Baustellen-Schnellaktionen öffnen/i })
    fireEvent.click(actionBtn)

    expect(screen.getByText('⚡ Baustellen-Schnellaktionen')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Neue Offerte/i })).toBeInTheDocument()

    // Click Neue Offerte
    fireEvent.click(screen.getByRole('button', { name: /Neue Offerte/i }))

    expect(navigatedRoute).toBe('offerten')
    expect(navigatedParams).toEqual({ action: 'create' })
    expect(backSpy).not.toHaveBeenCalled()

    backSpy.mockRestore()
  })

  it('triggers Neuer Regierapport quick action to projekte', () => {
    const backSpy = vi.spyOn(window.history, 'back')

    render(
      <MobileTabBar
        activeView="dashboard"
        onNavigate={mockNavigate}
        userRole="admin"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Baustellen-Schnellaktionen öffnen/i }))
    fireEvent.click(screen.getByRole('button', { name: /Neuer Regierapport/i }))

    expect(navigatedRoute).toBe('projekte')
    expect(navigatedParams).toEqual({ action: 'create_rapport' })
    expect(backSpy).not.toHaveBeenCalled()

    backSpy.mockRestore()
  })

  it('clicking current active module in menu passes null params to reset detail view', () => {
    render(
      <MobileTabBar
        activeView="offerten"
        onNavigate={mockNavigate}
        userRole="admin"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Menü/i }))
    fireEvent.click(screen.getByRole('button', { name: /Offerten/i }))

    expect(navigatedRoute).toBe('offerten')
    expect(navigatedParams).toBeNull()
  })

  it('closing bottom sheet via close button calls history.back to pop modal state', () => {
    const backSpy = vi.spyOn(window.history, 'back')

    render(
      <MobileTabBar
        activeView="dashboard"
        onNavigate={mockNavigate}
        userRole="admin"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Menü/i }))
    expect(screen.getByText('Menü & Module')).toBeInTheDocument()

    // Close via 'X' button
    const closeBtn = screen.getByRole('button', { name: /Schliessen/i })
    fireEvent.click(closeBtn)

    expect(screen.queryByText('Menü & Module')).not.toBeInTheDocument()
    expect(backSpy).toHaveBeenCalled()

    backSpy.mockRestore()
  })
})
