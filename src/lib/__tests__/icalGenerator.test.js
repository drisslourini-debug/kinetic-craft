import { describe, it, expect } from 'vitest';
import {
  formatIcalDate,
  escapeIcalText,
  getIcalEnd,
  generateIcsCalendar,
  getGoogleCalendarUrl
} from '../icalGenerator';

describe('icalGenerator', () => {
  it('formats dates for all-day and timed events correctly', () => {
    expect(formatIcalDate('2026-09-15', null, true)).toBe('20260915');
    expect(formatIcalDate('2026-09-15', '08:30', false)).toBe('20260915T083000');
  });

  it('escapes special iCal characters properly', () => {
    expect(escapeIcalText('Hello, world; test\nnewline')).toBe('Hello\\, world\\; test\\nnewline');
  });

  it('calculates end time and multi-day exclusive end date', () => {
    // All day single day -> next day
    expect(getIcalEnd('2026-09-15', '2026-09-15', null, null, true)).toBe('20260916');
    // Timed
    expect(getIcalEnd('2026-09-15', '2026-09-15', '08:00', '12:00', false)).toBe('20260915T120000');
  });

  it('generates a valid VCALENDAR string with VEVENT blocks', () => {
    const termine = [
      {
        id: 42,
        titel: 'Montage Küche',
        datum: '2026-09-20',
        startzeit: '09:00',
        endzeit: '16:00',
        ganztaegig: false,
        typ: 'Montage',
        status: 'Bestätigt',
        ort: 'Bahnhofstrasse 1, 8001 Zürich',
        beschreibung: 'Montage von Ober- und Unterschränken',
        projekte: { name: 'Villa Muster' },
        kunden: { name: 'Herr Meier' }
      }
    ];

    const ics = generateIcsCalendar(termine, { calendarTitle: 'Test Kalender' });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('X-WR-CALNAME:Test Kalender');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:termin-42@atelier77.ch');
    expect(ics).toContain('SUMMARY:Montage Küche');
    expect(ics).toContain('DTSTART:20260920T090000');
    expect(ics).toContain('DTEND:20260920T160000');
    expect(ics).toContain('LOCATION:Bahnhofstrasse 1\\, 8001 Zürich');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('generates a valid Google Calendar URL', () => {
    const termin = {
      titel: 'Besprechung vor Ort',
      datum: '2026-09-22',
      startzeit: '14:00',
      endzeit: '15:00',
      ort: 'Bern',
      typ: 'Kundentermin'
    };

    const url = getGoogleCalendarUrl(termin);
    expect(url).toContain('https://calendar.google.com/calendar/render?');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('text=Besprechung+vor+Ort');
    expect(url).toContain('location=Bern');
  });
});
