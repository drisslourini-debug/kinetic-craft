/**
 * Berechnet den zwingenden Status einer Rechnung basierend auf einer strikten Schweizer Hierarchie.
 * Diese Funktion garantiert, dass überfällige/gemahnte Rechnungen nicht versehentlich
 * durch Teilzahlungen wieder auf "Teilbezahlt" zurückfallen und End-Status (Bezahlt, Storniert)
 * revisionssicher nach GeBüV geschützt bleiben.
 *
 * @param {Object} rechnung - Das Rechnungs-Objekt (total, bezahlt, faellig_am, status, daten)
 * @param {Date} currentDate - Optional: Ein Referenzdatum (standardmässig heute)
 * @returns {string} Der neu berechnete Status
 */
export function calculateRechnungStatus(rechnung, currentDate = new Date()) {
  if (!rechnung) return 'Entwurf'
  const currentStatus = rechnung.status || 'Entwurf'

  // 1. GeBüV-geschützte End-Zustände (Bezahlt & Storniert sind strikt unveränderlich)
  if (currentStatus === 'Bezahlt') return 'Bezahlt'
  if (currentStatus === 'Storniert') return 'Storniert'

  // Float-Sicherheit mit Schweizer 5-Rappen-Toleranz (CHF 0.05)
  // Verwende Rundung auf Rappen (2 Dezimalstellen) um IEEE-754 Ungenauigkeiten auszuschliessen
  const total = Math.round((parseFloat(rechnung.total) || 0) * 100) / 100
  const bezahlt = Math.round((parseFloat(rechnung.bezahlt) || 0) * 100) / 100
  const openBalance = Math.round((total - bezahlt) * 100) / 100
  
  // 2. Bezahlt über Zahlungsbetrag (Höchste Priorität für offene Rechnungen)
  if (bezahlt > 0 && openBalance <= 0.05) {
    return 'Bezahlt'
  }

  // 3. Geschützter Entwurfs-Status
  if (currentStatus === 'Entwurf') {
    if (bezahlt === 0 && (!rechnung.daten || !rechnung.daten.mahnstufe)) {
      return 'Entwurf'
    }
  }

  // Ab hier ist die Rechnung NICHT voll bezahlt.

  // Fälligkeits-Datum parsen
  const faellig = new Date(rechnung.faellig_am || rechnung.rechnungsdatum || new Date())
  faellig.setHours(23, 59, 59, 999)
  
  const isOverdue = faellig < currentDate
  const isMahnung = (rechnung.daten && rechnung.daten.mahnstufe > 0) || currentStatus === 'Gemahnt'

  // 4. Gemahnt (Wenn Mahnstufe aktiv, bleibt es Gemahnt - Mahnwesen läuft für Restbetrag)
  if (isMahnung) {
    return 'Gemahnt'
  }

  // 5. Überfällig (Frist abgelaufen, nicht voll bezahlt, keine Mahnung)
  if (isOverdue) {
    return 'Überfällig'
  }

  // 6. Teilbezahlt (Nicht überfällig, aber bereits Geld erhalten)
  if (bezahlt > 0) {
    return 'Teilbezahlt'
  }

  // 7. Versendet (Nicht überfällig, nichts bezahlt)
  return currentStatus === 'Versendet' ? 'Versendet' : currentStatus
}

/**
 * Revisionssicherheits- & Sperrprüfungen nach Schweizer GeBüV / OR 957 ff.
 */

/**
 * Prüft, ob Positionen und Beträge einer Rechnung bearbeitet werden dürfen.
 * Gemäss GeBüV dürfen nur unversendete Entwürfe direkt editiert werden.
 */
export function canEditRechnung(rechnung) {
  if (!rechnung) return false
  const status = rechnung.status || 'Entwurf'
  return status === 'Entwurf'
}

/**
 * Prüft, ob eine Rechnung physisch aus der Datenbank gelöscht werden darf.
 * Rechnungen mit vergebener Nummer / Versand dürfen NIEMALS gelöscht werden (Lückenschutz).
 */
export function canDeleteRechnung(rechnung) {
  if (!rechnung) return false
  const status = rechnung.status || 'Entwurf'
  return status === 'Entwurf'
}

/**
 * Prüft, ob eine Rechnung storniert werden kann.
 */
export function canStornierenRechnung(rechnung) {
  if (!rechnung) return false
  const status = rechnung.status || 'Entwurf'
  return status !== 'Bezahlt' && status !== 'Storniert'
}

/**
 * Prüft, ob eine Offerte bearbeitet werden darf.
 * Erlaubt nur in "Entwurf" oder "In Überarbeitung".
 */
export function canEditOfferte(offerte) {
  if (!offerte) return false
  const status = offerte.status || 'Entwurf'
  return status === 'Entwurf' || status === 'In Überarbeitung'
}

/**
 * Prüft, ob eine Offerte gelöscht werden darf.
 * "Verrechnet" und "Akzeptiert" Offerten dürfen nicht gelöscht werden.
 */
export function canDeleteOfferte(offerte) {
  if (!offerte) return false
  const status = offerte.status || 'Entwurf'
  return status === 'Entwurf' || status === 'In Überarbeitung'
}

/**
 * Prüft, ob eine Offerte permanent gesperrt ist (in Rechnung überführt).
 */
export function isOffertePermanentlyLocked(offerte) {
  if (!offerte) return false
  return offerte.status === 'Verrechnet' || Boolean(offerte.rechnung_id)
}

