/**
 * Atelier 77 Custom Lightweight Router & History Manager
 * Supports clean URLs, two-way browser back/forward navigation,
 * deep linking, and unsaved changes interception.
 */

export const VALID_VIEWS = [
  'dashboard',
  'kunden',
  'projekte',
  'kalender',
  'offerten',
  'rechnungen',
  'buchhaltung',
  'dateien',
  'katalog',
  'einstellungen',
]

export const VIEW_ID_PARAM_MAP = {
  kunden: 'kundeId',
  projekte: 'projektId',
  offerten: 'offerteId',
  rechnungen: 'rechnungId',
}

let historyIndex = 0
let unsavedGuard = null

/**
 * Parses pathname and search into { view, params }
 */
export function parseLocation(
  pathname = (typeof window !== 'undefined' ? window.location.pathname : '/'),
  search = (typeof window !== 'undefined' ? window.location.search : '')
) {
  const cleanPath = (pathname || '/').replace(/^\/+|\/+$/g, '')
  const segments = cleanPath ? cleanPath.split('/') : []

  const searchParams = new URLSearchParams(search || '')
  const params = {}
  for (const [key, value] of searchParams.entries()) {
    params[key] = value
  }

  if (segments.length === 0 || segments[0] === 'dashboard') {
    return { view: 'dashboard', params }
  }

  const [mainSegment, subSegment] = segments
  if (!VALID_VIEWS.includes(mainSegment)) {
    return { view: 'dashboard', params }
  }

  const view = mainSegment
  if (subSegment) {
    const idKey = VIEW_ID_PARAM_MAP[view] || 'subId'
    params[idKey] = decodeURIComponent(subSegment)
  }

  return { view, params }
}

/**
 * Formats { view, params } into a clean URL string
 */
export function formatUrl(view, params = {}) {
  const p = { ...(params || {}) }
  let basePath = view === 'dashboard' ? '/' : `/${view}`

  const idKey = VIEW_ID_PARAM_MAP[view]
  let id = null
  if (idKey && p[idKey]) {
    id = p[idKey]
    delete p[idKey]
  } else if (p.subId) {
    id = p.subId
    delete p.subId
  }

  if (id) {
    basePath = `/${view}/${encodeURIComponent(id)}`
  }

  // Preserve testBypass if currently in window.location.search
  if (
    typeof window !== 'undefined' &&
    window.location?.search?.includes('testBypass=true') &&
    p.testBypass === undefined
  ) {
    p.testBypass = 'true'
  }

  const searchParams = new URLSearchParams()
  for (const [k, v] of Object.entries(p)) {
    if (v !== undefined && v !== null && v !== '') {
      searchParams.set(k, String(v))
    }
  }

  const queryString = searchParams.toString()
  return queryString ? `${basePath}?${queryString}` : basePath
}

/**
 * Register a guard function that returns true/message if unsaved changes exist
 */
export function registerUnsavedGuard(guardFn) {
  unsavedGuard = guardFn
  return () => {
    if (unsavedGuard === guardFn) {
      unsavedGuard = null
    }
  }
}

/**
 * Checks if unsaved changes exist
 */
export function checkHasUnsavedChanges() {
  if (!unsavedGuard) return false
  try {
    return unsavedGuard()
  } catch (e) {
    console.error('Error checking unsaved changes:', e)
    return false
  }
}

/**
 * Initializes history index on application start
 */
export function initRouter() {
  if (typeof window === 'undefined') return

  const current = parseLocation()
  const state = window.history.state || {}
  historyIndex = typeof state.historyIndex === 'number' ? state.historyIndex : 0

  window.history.replaceState(
    {
      view: current.view,
      params: current.params,
      historyIndex,
    },
    '',
    window.location.href
  )
}

export function getCurrentHistoryIndex() {
  return historyIndex
}

export function setHistoryIndex(idx) {
  historyIndex = idx
}

/**
 * Push or replace navigation
 */
export function pushRoute(view, params = {}, options = {}) {
  if (typeof window === 'undefined') return

  const { replace = false } = options
  const targetUrl = formatUrl(view, params)

  if (!replace) {
    historyIndex += 1
  }

  const state = {
    view,
    params,
    historyIndex,
  }

  if (replace) {
    window.history.replaceState(state, '', targetUrl)
  } else {
    window.history.pushState(state, '', targetUrl)
  }
}

/**
 * Navigates back in history, or falls back to view if no history
 */
export function navigateBack(fallbackView = 'dashboard', fallbackParams = null) {
  if (typeof window !== 'undefined' && historyIndex > 0) {
    window.history.back()
  } else if (typeof window !== 'undefined' && window.history.length > 1) {
    window.history.back()
  } else {
    pushRoute(fallbackView, fallbackParams || {})
  }
}
