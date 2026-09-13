import { useEffect } from 'react'
import { registerUnsavedGuard } from '../lib/router'

/**
 * Hook to guard against leaving a page with unsaved changes.
 * @param {boolean} isDirty - Whether there are unsaved changes
 */
export function useUnsavedChanges(isDirty) {
  useEffect(() => {
    if (!isDirty) return

    // Register with router for in-app and popstate navigation
    const unregister = registerUnsavedGuard(() => isDirty)

    // Register beforeunload for browser tab close / refresh
    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      unregister()
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isDirty])
}
