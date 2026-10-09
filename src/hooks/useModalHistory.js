import { useEffect, useRef } from 'react'

/**
 * Hook to link an overlay/modal to the browser history so that pressing
 * the browser Back button closes the modal.
 *
 * @param {boolean} isOpen - Whether the modal/overlay is currently open
 * @param {function} onClose - Callback to close the modal
 * @param {string} modalName - Identifier for the modal
 */
export function useModalHistory(isOpen, onClose, modalName = 'modal') {
  const isPushedRef = useRef(false)
  const isPoppingRef = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (isOpen) {
      // Only push if not already pushed
      if (!isPushedRef.current) {
        isPushedRef.current = true
        const currentState = window.history.state || {}
        const newHistoryIndex = (currentState.historyIndex || 0) + 1
        window.history.pushState(
          {
            ...currentState,
            modalOpen: modalName,
            historyIndex: newHistoryIndex,
          },
          ''
        )
      }

      const handlePopState = () => {
        if (isPushedRef.current) {
          isPushedRef.current = false
          isPoppingRef.current = true
          onCloseRef.current?.()
          setTimeout(() => {
            isPoppingRef.current = false
          }, 50)
        }
      }

      window.addEventListener('popstate', handlePopState)

      return () => {
        window.removeEventListener('popstate', handlePopState)
        // If modal was closed from inside the UI (e.g. clicking 'X' or 'Cancel'),
        // and it wasn't triggered by popstate, pop the history entry!
        if (isPushedRef.current && !isPoppingRef.current) {
          isPushedRef.current = false
          window.history.back()
        }
      }
    } else {
      isPushedRef.current = false
    }
  }, [isOpen, modalName])
}
