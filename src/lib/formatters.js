/**
 * Formats a number to Swiss currency format (e.g. 1'500'000.00)
 */
export function formatMoney(val) {
  const num = parseFloat(val) || 0
  return num.toLocaleString('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/**
 * Formats a number with 'CHF' prefix (e.g. CHF 1'500'000.00)
 */
export function formatCurrency(val) {
  return `CHF ${formatMoney(val)}`
}
