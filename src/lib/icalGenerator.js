/**
 * iCalendar (.ics) generator and Google Calendar URL helper for Atelier 77.
 * Complies with RFC 5545 specifications.
 */

/**
 * Formats a Date object or date string + time string into iCal datetime format:
 * - All day: YYYYMMDD
 * - Timed: YYYYMMDDTHHMMSS
 */
export function formatIcalDate(dateStr, timeStr, isAllDay = false) {
  if (!dateStr) return '';
  const cleanDate = dateStr.replace(/-/g, '');
  
  if (isAllDay || !timeStr) {
    return cleanDate;
  }
  
  const cleanTime = timeStr.replace(/:/g, '').padEnd(4, '0') + '00';
  return `${cleanDate}T${cleanTime}`;
}

/**
 * Escapes special characters for iCal text fields (commas, semicolons, backslashes, newlines)
 */
export function escapeIcalText(text) {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Calculates end date/time string for iCal
 */
export function getIcalEnd(dateStr, endDatumStr, startzeitStr, endzeitStr, isAllDay) {
  const endDate = endDatumStr || dateStr;
  if (!endDate) return '';
  
  if (isAllDay) {
    // In iCal, end date for all-day events is exclusive (+1 day)
    const d = new Date(endDate);
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  }
  
  const endTime = endzeitStr || (startzeitStr ? addHoursToTime(startzeitStr, 1) : '180000');
  const cleanDate = endDate.replace(/-/g, '');
  const cleanTime = endTime.replace(/:/g, '').padEnd(4, '0') + '00';
  return `${cleanDate}T${cleanTime}`;
}

function addHoursToTime(timeStr, hours) {
  const parts = timeStr.split(':');
  let h = parseInt(parts[0] || '8', 10) + hours;
  let m = parts[1] || '00';
  if (h >= 24) h = 23;
  return `${String(h).padStart(2, '0')}:${m}`;
}

/**
 * Generates an iCalendar (.ics) string for an array of appointments.
 */
export function generateIcsCalendar(termine = [], options = {}) {
  const calendarName = options.calendarTitle || 'Atelier 77 Termine';
  const firmenname = options.firmenname || 'Atelier 77';
  
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Atelier 77//Terminkalender//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcalText(calendarName)}`,
    'X-WR-TIMEZONE:Europe/Zurich',
  ];

  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  for (const t of termine) {
    const isAllDay = Boolean(t.ganztaegig || (!t.startzeit && !t.endzeit));
    const dtStart = formatIcalDate(t.datum, t.startzeit, isAllDay);
    const dtEnd = getIcalEnd(t.datum, t.end_datum, t.startzeit, t.endzeit, isAllDay);
    const uid = `termin-${t.id || Math.random().toString(36).substring(2)}@atelier77.ch`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${now}`);

    if (isAllDay) {
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
    } else {
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
    }

    lines.push(`SUMMARY:${escapeIcalText(t.titel || 'Termin')}`);

    const descParts = [];
    if (t.typ) descParts.push(`Typ: ${t.typ}`);
    if (t.status) descParts.push(`Status: ${t.status}`);
    if (t.projekte?.name) descParts.push(`Projekt: ${t.projekte.name}`);
    if (t.kunden?.name) descParts.push(`Kunde: ${t.kunden.name}`);
    if (t.beschreibung) descParts.push(`\n${t.beschreibung}`);
    
    if (descParts.length > 0) {
      lines.push(`DESCRIPTION:${escapeIcalText(descParts.join('\n'))}`);
    }

    if (t.ort) {
      lines.push(`LOCATION:${escapeIcalText(t.ort)}`);
    }

    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Generates a direct Google Calendar web link to create an event with 1 click.
 */
export function getGoogleCalendarUrl(termin) {
  if (!termin) return '#';

  const isAllDay = Boolean(termin.ganztaegig || (!termin.startzeit && !termin.endzeit));
  const startStr = formatIcalDate(termin.datum, termin.startzeit, isAllDay);
  const endStr = getIcalEnd(termin.datum, termin.end_datum, termin.startzeit, termin.endzeit, isAllDay);

  const datesParam = `${startStr}/${endStr}`;
  const title = termin.titel || 'Termin Atelier 77';

  const descParts = [];
  if (termin.typ) descParts.push(`Kategorie: ${termin.typ}`);
  if (termin.projekte?.name) descParts.push(`Projekt: ${termin.projekte.name}`);
  if (termin.kunden?.name) descParts.push(`Kunde: ${termin.kunden.name}`);
  if (termin.beschreibung) descParts.push(termin.beschreibung);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: datesParam,
    details: descParts.join('\n'),
    location: termin.ort || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Triggers a browser download of an .ics file.
 */
export function downloadIcsFile(filename, icsContent) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.ics') ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
