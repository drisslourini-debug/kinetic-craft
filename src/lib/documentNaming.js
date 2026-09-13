/**
 * Generates an automatic, filesystem-safe filename for Offerten & Rechnungen.
 * Format: Typ_Nummer_Kunde_Projekt_Datum.pdf
 * Example: Offerte_OF-2026-001_Martin-Spoeri-GU-AG_Neubau-Betius_2026-09-13.pdf
 */
export function sanitizeFilenamePart(str = '') {
  if (!str) return ''
  return String(str)
    // Normalize German umlauts
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    // Replace whitespace and slashes/dots/special chars with hyphens
    .replace(/[\s/\\:*?"<>|.]+/g, '-')
    // Remove any remaining invalid filename chars
    .replace(/[^a-zA-Z0-9_-]/g, '')
    // Collapse multiple consecutive hyphens or underscores
    .replace(/-+/g, '-')
    .replace(/_+/g, '_')
    // Trim leading/trailing hyphens and underscores
    .replace(/^[-_]+|[-_]+$/g, '')
}

export function generateDocumentFilename({
  type = 'Dokument', // 'Offerte' | 'Rechnung'
  docNr = '',
  kunde = null,
  projekt = null,
  date = null
}) {
  const parts = []

  // 1. Document Type (Offerte, Rechnung)
  const cleanType = sanitizeFilenamePart(type) || 'Dokument'
  parts.push(cleanType)

  // 2. Document Number (e.g. OF-2026-001, RE-2026-001)
  if (docNr) {
    parts.push(sanitizeFilenamePart(docNr))
  }

  // 3. Customer name (Firmenname preferred, or Vorname Nachname, or name)
  let kundeName = ''
  if (typeof kunde === 'string') {
    kundeName = kunde
  } else if (kunde && typeof kunde === 'object') {
    kundeName = kunde.firmenname || `${kunde.vorname || ''} ${kunde.nachname || ''}`.trim() || kunde.name || ''
  }
  const cleanKunde = sanitizeFilenamePart(kundeName)
  if (cleanKunde) {
    parts.push(cleanKunde)
  }

  // 4. Project name (if available)
  let projektName = ''
  if (typeof projekt === 'string') {
    projektName = projekt
  } else if (projekt && typeof projekt === 'object') {
    projektName = projekt.name || ''
  }
  const cleanProjekt = sanitizeFilenamePart(projektName)
  if (cleanProjekt) {
    parts.push(cleanProjekt)
  }

  // 5. Date (YYYY-MM-DD)
  let dateStr = ''
  if (date instanceof Date) {
    dateStr = date.toISOString().split('T')[0]
  } else if (typeof date === 'string' && date.trim()) {
    const parsed = new Date(date)
    if (!isNaN(parsed.getTime())) {
      dateStr = parsed.toISOString().split('T')[0]
    } else {
      dateStr = sanitizeFilenamePart(date)
    }
  } else {
    dateStr = new Date().toISOString().split('T')[0]
  }
  if (dateStr) {
    parts.push(dateStr)
  }

  return `${parts.join('_')}.pdf`
}
