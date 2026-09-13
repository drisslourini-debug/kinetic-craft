import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, renderHook } from '@testing-library/react'
import {
  initRouter,
  pushRoute,
  navigateBack,
  getCurrentHistoryIndex,
  setHistoryIndex,
  checkHasUnsavedChanges,
} from '../router'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import { useModalHistory } from '../../hooks/useModalHistory'
import UnsavedChangesDialog from '../../components/UnsavedChangesDialog'

describe('Navigation & History Stack Integration', () => {
  beforeEach(() => {
    setHistoryIndex(0)
    window.history.replaceState({ historyIndex: 0 }, '', '/')
  })

  it('initializes router and maintains history index', () => {
    initRouter()
    expect(getCurrentHistoryIndex()).toBe(0)

    pushRoute('kunden', {})
    expect(getCurrentHistoryIndex()).toBe(1)
    expect(window.location.pathname).toBe('/kunden')

    pushRoute('kunden', { kundeId: 'k-100' })
    expect(getCurrentHistoryIndex()).toBe(2)
    expect(window.location.pathname).toBe('/kunden/k-100')
  })

  it('navigateBack calls window.history.back when history index > 0', () => {
    const backSpy = vi.spyOn(window.history, 'back')
    setHistoryIndex(2)

    navigateBack('kunden')
    expect(backSpy).toHaveBeenCalled()
    backSpy.mockRestore()
  })

  it('useUnsavedChanges registers guard when dirty and cleans up when not', () => {
    const { rerender, unmount } = renderHook(({ isDirty }) => useUnsavedChanges(isDirty), {
      initialProps: { isDirty: false },
    })

    expect(checkHasUnsavedChanges()).toBe(false)

    rerender({ isDirty: true })
    expect(checkHasUnsavedChanges()).toBe(true)

    rerender({ isDirty: false })
    expect(checkHasUnsavedChanges()).toBe(false)

    rerender({ isDirty: true })
    unmount()
    expect(checkHasUnsavedChanges()).toBe(false)
  })

  it('UnsavedChangesDialog triggers callbacks on button clicks', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    const { rerender } = render(
      <UnsavedChangesDialog isOpen={false} onConfirm={onConfirm} onCancel={onCancel} />
    )
    expect(screen.queryByText('Ungespeicherte Änderungen')).toBeNull()

    rerender(<UnsavedChangesDialog isOpen={true} onConfirm={onConfirm} onCancel={onCancel} />)
    expect(screen.getByText('Ungespeicherte Änderungen')).toBeDefined()

    fireEvent.click(screen.getByText('Weiter bearbeiten'))
    expect(onCancel).toHaveBeenCalled()

    fireEvent.click(screen.getByText('Änderungen verwerfen'))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('useModalHistory pushes state when opened and pops on close', () => {
    const pushSpy = vi.spyOn(window.history, 'pushState')
    const backSpy = vi.spyOn(window.history, 'back')
    const onClose = vi.fn()

    const { rerender } = renderHook(
      ({ isOpen }) => useModalHistory(isOpen, onClose, 'test_modal'),
      { initialProps: { isOpen: false } }
    )

    expect(pushSpy).not.toHaveBeenCalled()

    rerender({ isOpen: true })
    expect(pushSpy).toHaveBeenCalled()

    // When closed programmatically
    rerender({ isOpen: false })
    expect(backSpy).toHaveBeenCalled()

    pushSpy.mockRestore()
    backSpy.mockRestore()
  })
})
