/**
 * Berechnet den zwingenden Status einer Rechnung basierend auf einer strikten Hierarchie.
 * Diese Funktion garantiert, dass überfällige/gemahnte Rechnungen nicht versehentlich
 * durch Teilzahlungen wieder auf "Teilbezahlt" zurückfallen.
 *
 * @param {Object} rechnung - Das Rechnungs-Objekt aus der Datenbank (muss total, bezahlt, faellig_am, status, daten enthalten)
 * @param {Date} currentDate - Optional: Ein Referenzdatum (standardmässig heute)
 * @returns {string} Der neu berechnete Status
 */
export function calculateRechnungStatus(rechnung, currentDate = new Date()) {
  const currentStatus = rechnung.status;

  // 1. GeBüV-geschützte End-Zustände (Bezahlt & Storniert sind strikt unveränderlich)
  if (currentStatus === 'Bezahlt') return 'Bezahlt';
  if (currentStatus === 'Storniert') return 'Storniert';

  // Float-Sicherheit
  const total = parseFloat(rechnung.total || 0);
  const bezahlt = parseFloat(rechnung.bezahlt || 0);
  
  // 2. Bezahlt über Zahlungsbetrag (Höchste Priorität für offene Rechnungen)
  if (bezahlt > 0 && bezahlt >= total - 0.01) {
    return 'Bezahlt';
  }

  // 3. Geschützte Status (Entwürfe)
  if (currentStatus === 'Entwurf') {
    // Eine Rechnung mit Teilzahlungen oder Mahnungen sollte eigentlich kein Entwurf mehr sein,
    // aber zumindest darf sie nicht voll bezahlt sein.
    if (bezahlt === 0 && (!rechnung.daten || !rechnung.daten.mahnstufe)) {
      return 'Entwurf';
    }
  }

  // Ab hier ist die Rechnung NICHT voll bezahlt.

  // Fälligkeits-Datum parsen
  const faellig = new Date(rechnung.faellig_am);
  // Fälligkeit ist am Ende des Tages erreicht
  faellig.setHours(23, 59, 59, 999);
  
  const isOverdue = faellig < currentDate;
  const isMahnung = (rechnung.daten && rechnung.daten.mahnstufe > 0) || currentStatus === 'Gemahnt';

  // 3. Gemahnt (Wenn Mahnstufe aktiv, bleibt es Gemahnt, egal was passiert)
  if (isMahnung) {
    return 'Gemahnt';
  }

  // 4. Überfällig (Frist abgelaufen, nicht voll bezahlt, keine Mahnung)
  if (isOverdue) {
    return 'Überfällig';
  }

  // 5. Teilbezahlt (Nicht überfällig, aber bereits Geld erhalten)
  if (bezahlt > 0) {
    return 'Teilbezahlt';
  }

  // 6. Versendet (Nicht überfällig, nichts bezahlt)
  // Fallback: Behalte den aktuellen Status bei (z.B. wenn es frisch versendet wurde)
  return currentStatus === 'Versendet' ? 'Versendet' : currentStatus;
}
