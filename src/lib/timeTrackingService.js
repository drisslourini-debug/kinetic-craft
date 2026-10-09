/**
 * Service for time tracking, calculations, budget monitoring, and conversions.
 */

/**
 * Formats a duration in seconds into HH:MM:SS or MM:SS.
 * 
 * @param {number} totalSeconds 
 * @returns {string} e.g. "01:24:15"
 */
export function formatSeconds(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds || 0))
  const hours = Math.floor(sec / 3600)
  const minutes = Math.floor((sec % 3600) / 60)
  const seconds = sec % 60

  const pad = (num) => String(num).padStart(2, '0')

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }
  return `${pad(minutes)}:${pad(seconds)}`
}

/**
 * Rounds decimal hours according to typical Swiss trade practices.
 * 
 * @param {number} hours Decimal hours (e.g. 1.13)
 * @param {'exact'|'15min'|'30min'} mode 
 * @returns {number} Rounded decimal hours (e.g. 1.25)
 */
export function roundHours(hours, mode = '15min') {
  const h = Math.max(0, parseFloat(hours) || 0)
  if (mode === 'exact') {
    return Math.round(h * 100) / 100
  }
  if (mode === '30min') {
    return Math.round(h * 2) / 2
  }
  // Standard: 15-minute intervals (0.25h)
  return Math.round(h * 4) / 4
}

/**
 * Calculates project labor budget consumption and traffic light status.
 * 
 * @param {number} spentHours 
 * @param {number} budgetHours 
 * @returns {{
 *   percentage: number,
 *   remainingHours: number,
 *   isOverBudget: boolean,
 *   color: 'emerald' | 'amber' | 'rose',
 *   label: string
 * }}
 */
export function calculateBudgetStatus(spentHours, budgetHours) {
  const spent = Math.max(0, parseFloat(spentHours) || 0)
  const budget = Math.max(0, parseFloat(budgetHours) || 0)

  if (budget <= 0) {
    return {
      percentage: 0,
      remainingHours: 0,
      isOverBudget: false,
      color: 'emerald',
      label: 'Kein Budget hinterlegt'
    }
  }

  const percentage = Math.round((spent / budget) * 100)
  const remainingHours = Math.round(Math.max(0, budget - spent) * 100) / 100
  const isOverBudget = spent > budget

  let color = 'emerald'
  let label = 'Im Plan'

  if (percentage > 100) {
    color = 'rose'
    label = `Budget um ${Math.round((spent - budget) * 100) / 100} h überschritten`
  } else if (percentage >= 80) {
    color = 'amber'
    label = 'Budget zu 80%+ erreicht'
  }

  return {
    percentage,
    remainingHours,
    isOverBudget,
    color,
    label
  }
}

/**
 * Converts tracked time entries to hour lines for a Regierapport.
 * 
 * @param {Array<Object>} timeEntries 
 * @returns {Array<{ id: string, mitarbeiter: string, taetigkeit: string, stunden: number, ansatz: number }>}
 */
export function timeEntriesToRapportHours(timeEntries = []) {
  if (!Array.isArray(timeEntries)) return []

  return timeEntries.map((entry, idx) => ({
    id: String(entry.id || `te_${idx}_${Date.now()}`),
    mitarbeiter: entry.mitarbeiter_name || 'Monteur',
    taetigkeit: entry.taetigkeit || 'Regiearbeiten',
    stunden: roundHours(entry.dauer_stunden || 0, '15min'),
    ansatz: parseFloat(entry.ansatz) || 95.00
  }))
}

/**
 * Converts tracked time entries directly to invoice position items.
 * 
 * @param {Array<Object>} timeEntries 
 * @param {string} projectName 
 * @returns {Array<{ id: string, titel: string, beschreibung: string, menge: number, einheit: string, ansatz: number, total: number, typ: string }>}
 */
export function timeEntriesToInvoiceItems(timeEntries = [], projectName = '') {
  if (!Array.isArray(timeEntries)) return []

  return timeEntries.map((entry, idx) => {
    const hours = roundHours(entry.dauer_stunden || 0, '15min')
    const rate = parseFloat(entry.ansatz) || 95.00
    const total = Math.round(hours * rate * 100) / 100

    return {
      id: `inv_time_${entry.id || idx}_${Date.now()}`,
      titel: entry.taetigkeit || `Arbeitsaufwand ${projectName || ''}`.trim(),
      beschreibung: `Arbeitszeit vom ${entry.datum || new Date().toISOString().split('T')[0]} (${entry.mitarbeiter_name || 'Monteur'})`,
      menge: hours,
      einheit: 'Std',
      ansatz: rate,
      total,
      typ: 'leistung'
    }
  })
}
