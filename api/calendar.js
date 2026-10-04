import { createClient } from '@supabase/supabase-js';

// Minimal in-function RFC-5545 helpers so api/ is self-contained for Vercel serverless
function formatIcalDate(dateStr, timeStr, isAllDay = false) {
  if (!dateStr) return '';
  const cleanDate = dateStr.replace(/-/g, '');
  if (isAllDay || !timeStr) return cleanDate;
  const cleanTime = timeStr.replace(/:/g, '').padEnd(4, '0') + '00';
  return `${cleanDate}T${cleanTime}`;
}

function escapeIcalText(text) {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function getIcalEnd(dateStr, endDatumStr, startzeitStr, endzeitStr, isAllDay) {
  const endDate = endDatumStr || dateStr;
  if (!endDate) return '';
  if (isAllDay) {
    const d = new Date(endDate);
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  }
  const endTime = endzeitStr || (startzeitStr ? `${String(parseInt(startzeitStr.split(':')[0] || '8', 10) + 1).padStart(2, '0')}:${startzeitStr.split(':')[1] || '00'}` : '180000');
  const cleanDate = endDate.replace(/-/g, '');
  const cleanTime = endTime.replace(/:/g, '').padEnd(4, '0') + '00';
  return `${cleanDate}T${cleanTime}`;
}

function generateIcsCalendar(termine = [], options = {}) {
  const calendarName = options.calendarTitle || 'Atelier 77 Termine';
  const firmenname = options.firmenname || 'Atelier 77';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${escapeIcalText(firmenname)}//Kalenderfeed//DE`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcalText(calendarName)}`,
    'X-WR-TIMEZONE:Europe/Zurich',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ];

  for (const t of termine) {
    const isAllDay = t.ganztaegig || (!t.startzeit && !t.endzeit);
    const dtStart = formatIcalDate(t.datum, t.startzeit, isAllDay);
    const dtEnd = getIcalEnd(t.datum, t.end_datum, t.startzeit, t.endzeit, isAllDay);
    const uid = `${t.id || crypto.randomUUID()}@kinetic-craft.ch`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${formatIcalDate(new Date().toISOString().split('T')[0], '00:00')}Z`);

    if (isAllDay) {
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
    } else {
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
    }

    lines.push(`SUMMARY:${escapeIcalText(t.titel || 'Termin')}`);

    const descParts = [];
    if (t.beschreibung) descParts.push(t.beschreibung);
    if (t.typ) descParts.push(`Typ: ${t.typ}`);
    if (t.status) descParts.push(`Status: ${t.status}`);
    if (t.kunden?.name || t.kunden?.firmenname) {
      descParts.push(`Kunde: ${t.kunden.name || t.kunden.firmenname}`);
    }
    if (t.projekte?.name) {
      descParts.push(`Projekt: ${t.projekte.name}`);
    }
    if (descParts.length > 0) {
      lines.push(`DESCRIPTION:${escapeIcalText(descParts.join('\n'))}`);
    }

    if (t.ort) {
      lines.push(`LOCATION:${escapeIcalText(t.ort)}`);
    }

    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:OPAQUE');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export default async function handler(req, res) {
  // Support both GET and HEAD
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).send('Method Not Allowed');
  }

  const { tenant, tenant_id } = req.query || {};
  const targetTenant = tenant || tenant_id;

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  let termine = [];
  let firmenname = 'Atelier 77';

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);

      let query = supabase
        .from('termine')
        .select('*, kunden(name, firmenname), projekte(name)')
        .order('datum', { ascending: true })
        .limit(500);

      if (targetTenant) {
        query = query.eq('tenant_id', targetTenant);
      }

      const { data, error } = await query;
      if (!error && data) {
        termine = data;
      }

      if (targetTenant) {
        const { data: tData } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', targetTenant)
          .maybeSingle();
        if (tData?.name) firmenname = tData.name;
      }
    } catch (err) {
      console.error('Calendar feed error:', err);
    }
  }

  const ics = generateIcsCalendar(termine, {
    calendarTitle: `${firmenname} Termine`,
    firmenname
  });

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="calendar.ics"');
  res.setHeader('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');

  return res.status(200).send(ics);
}
