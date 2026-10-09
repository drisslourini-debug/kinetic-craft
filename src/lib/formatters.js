/**
 * Centralized formatting utilities for the Atelier 77 Dashboard.
 * All locale-specific formatting (Swiss German / de-CH) is handled here.
 */

/**
 * Formats a number to Swiss currency format (e.g. 1'500.00)
 */
export function formatMoney(val) {
  const num = parseFloat(val) || 0
  return num.toLocaleString('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/**
 * Formats a number with 'CHF' prefix (e.g. CHF 1'500.00)
 */
export function formatCurrency(val) {
  return `CHF ${formatMoney(val)}`
}

/**
 * Splits a value into currency code and formatted amount string for high-precision split rendering
 * @returns {{ currency: string, amount: string }}
 */
export function splitCurrency(val) {
  return {
    currency: 'CHF',
    amount: formatMoney(val)
  }
}

/**
 * Formats a date string to Swiss short format (e.g. 30.07.2026)
 * @param {string} dateStr - ISO date string or parseable date
 * @returns {string} Formatted date or '—' for empty/invalid input
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('de-CH', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

/**
 * Formats a date string to Swiss long format for print/documents (e.g. 30. Juli 2026)
 * @param {string} dateStr - ISO date string or parseable date
 * @returns {string} Formatted date or '—' for empty/invalid input
 */
export function formatDateLong(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('de-CH', {
    day: '2-digit', month: 'long', year: 'numeric'
  })
}

/**
 * Formats a YYYY-MM string to Swiss month/year (e.g. Juli 2026)
 * Used in filter dropdowns.
 * @param {string} monthStr - Month string in YYYY-MM format
 * @returns {string} Formatted month/year
 */
export function formatMonthYear(monthStr) {
  return new Date(monthStr + '-01').toLocaleDateString('de-CH', {
    month: 'long', year: 'numeric'
  })
}
