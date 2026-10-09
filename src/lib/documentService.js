/**
 * Centralized document service for generating document numbers and 
 * calculating payment terms across the Atelier 77 Dashboard.
 * Includes atomic server-side sequence RPC with fallback for collision prevention (NUM-01).
 */

/**
 * Generates the next sequential invoice number in format RE-YYYY-NNN.
 * First tries atomic RPC `get_next_document_number`, then falls back to table query.
 * 
 * @param {Object} supabase - Supabase client instance
 * @param {number} [startnummer] - Optional starting number (from settings)
 * @returns {Promise<string>} Next invoice number (e.g. "RE-2026-001")
 */
export async function generateNextRechnungNr(supabase, startnummer = null) {
  const year = new Date().getFullYear()

  // 1. Find the highest existing number in the database
  let maxNum = startnummer ? startnummer - 1 : 0
  if (supabase?.from) {
    try {
      const { data: existing } = await supabase
        .from('rechnungen')
        .select('rechnung_nr')
        .ilike('rechnung_nr', `RE-${year}-%`)
        .order('rechnung_nr', { ascending: false })
        .limit(100)
      if (existing && existing.length > 0) {
        for (const item of existing) {
          const match = item.rechnung_nr?.match(/RE-\d{4}-(\d+)/)
          if (match) {
            const num = parseInt(match[1], 10)
            if (!isNaN(num) && num > maxNum) {
              maxNum = num
            }
          }
        }
      }
    } catch (_) {}
  }

  // 2. Try atomic server-side sequence RPC if available and higher than maxNum
  if (supabase?.rpc) {
    try {
      const { data, error } = await supabase.rpc('get_next_document_number', {
        p_doc_type: 'rechnung',
        p_year: year
      })
      if (!error && data) {
        const match = data.match(/RE-\d{4}-(\d+)/)
        const rpcNum = match ? parseInt(match[1], 10) : 0
        if (rpcNum > maxNum) {
          return data
        }
      }
    } catch (_) {}
  }

  const nextNum = maxNum + 1
  return `RE-${year}-${String(nextNum).padStart(3, '0')}`
}

/**
 * Generates the next sequential gutschrift number in format GS-YYYY-NNN.
 * First tries atomic RPC `get_next_document_number`, then falls back to table query.
 * 
 * @param {Object} supabase - Supabase client instance
 * @param {number} [startnummer] - Optional starting number (from settings)
 * @returns {Promise<string>} Next credit note number (e.g. "GS-2026-001")
 */
export async function generateNextGutschriftNr(supabase, startnummer = null) {
  const year = new Date().getFullYear()

  let maxNum = startnummer ? startnummer - 1 : 0
  if (supabase?.from) {
    try {
      const { data: existing } = await supabase
        .from('rechnungen')
        .select('rechnung_nr')
        .ilike('rechnung_nr', `GS-${year}-%`)
        .order('rechnung_nr', { ascending: false })
        .limit(100)
      if (existing && existing.length > 0) {
        for (const item of existing) {
          const raw = item.rechnung_nr || item.gutschrift_nr
          const match = raw?.match(/GS-\d{4}-(\d+)/)
          if (match) {
            const num = parseInt(match[1], 10)
            if (!isNaN(num) && num > maxNum) {
              maxNum = num
            }
          }
        }
      }
    } catch (_) {}
  }

  if (supabase?.rpc) {
    try {
      const { data, error } = await supabase.rpc('get_next_document_number', {
        p_doc_type: 'gutschrift',
        p_year: year
      })
      if (!error && data) {
        const match = data.match(/GS-\d{4}-(\d+)/)
        const rpcNum = match ? parseInt(match[1], 10) : 0
        if (rpcNum > maxNum) {
          return data
        }
      }
    } catch (_) {}
  }

  const nextNum = maxNum + 1
  return `GS-${year}-${String(nextNum).padStart(3, '0')}`
}

/**
 * Generates the next sequential offerte number in format OF-YYYY-NNN.
 * First tries atomic RPC `get_next_document_number`, then falls back to table query.
 * 
 * @param {Object} supabase - Supabase client instance
 * @param {number} [startnummer] - Optional starting number (from settings)
 * @returns {Promise<string>} Next quote number (e.g. "OF-2026-1001")
 */
export async function generateNextOfferteNr(supabase, startnummer = null) {
  const year = new Date().getFullYear()

  let maxNum = startnummer ? startnummer - 1 : 1000
  if (supabase?.from) {
    try {
      const { data: existing } = await supabase
        .from('offerten')
        .select('offerte_nr')
        .ilike('offerte_nr', `OF-${year}-%`)
        .order('offerte_nr', { ascending: false })
        .limit(100)
      if (existing && existing.length > 0) {
        for (const item of existing) {
          const match = item.offerte_nr?.match(/OF-\d{4}-(\d+)/)
          if (match) {
            const num = parseInt(match[1], 10)
            if (!isNaN(num) && num > maxNum) {
              maxNum = num
            }
          }
        }
      }
    } catch (_) {}
  }

  if (supabase?.rpc) {
    try {
      const { data, error } = await supabase.rpc('get_next_document_number', {
        p_doc_type: 'offerte',
        p_year: year
      })
      if (!error && data) {
        const match = data.match(/OF-\d{4}-(\d+)/)
        const rpcNum = match ? parseInt(match[1], 10) : 0
        if (rpcNum > maxNum) {
          return data
        }
      }
    } catch (_) {}
  }

  const nextNum = maxNum + 1
  return `OF-${year}-${String(nextNum).padStart(3, '0')}`
}

/**
 * Parses a customer's payment term string and returns the number of days.
 * Handles common Swiss German payment term formats.
 * 
 * @param {string|null} zahlungsziel - Payment term string (e.g. "30 Tage Netto", "10 Tage", "Bar/Vorauszahlung")
 * @param {number} [fallback=30] - Default days if no match found
 * @returns {number} Payment term in days
 */
export function parseZahlungsfrist(zahlungsziel, fallback = 30) {
  if (!zahlungsziel) return fallback

  if (zahlungsziel.includes('Bar') || zahlungsziel.includes('Voraus')) return 0
  if (zahlungsziel.includes('10')) return 10
  if (zahlungsziel.includes('14')) return 14
  if (zahlungsziel.includes('30')) return 30
  if (zahlungsziel.includes('60')) return 60

  return fallback
}

/**
 * Calculates a due date based on a start date and payment term in days.
 * 
 * @param {Date|string} startDate - Invoice date
 * @param {number} fristTage - Payment term in days
 * @returns {string} Due date as ISO date string (YYYY-MM-DD)
 */
export function calculateDueDate(startDate, fristTage) {
  if (!startDate) return ''
  let date
  if (startDate instanceof Date) {
    if (isNaN(startDate.getTime())) return ''
    date = new Date(startDate.getTime())
  } else {
    const parts = String(startDate).split('T')[0].split('-').map(Number)
    if (parts.length < 3 || isNaN(parts[0])) return ''
    date = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0)
  }
  date.setDate(date.getDate() + parseInt(fristTage || 0, 10))
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
