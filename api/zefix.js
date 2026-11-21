// Serverless endpoint for Swiss Zefix Commercial Registry (EHRA / Zefix Public REST)
// Supports live company search and detailed lookup including official Swiss address.

export const LEGAL_FORMS = {
  1: 'Einzelunternehmen',
  2: 'Kollektivgesellschaft (KlG)',
  3: 'Aktiengesellschaft (AG)',
  4: 'Gesellschaft mit beschränkter Haftung (GmbH)',
  5: 'Genossenschaft',
  6: 'Verein',
  7: 'Stiftung',
  8: 'Institut des öffentlichen Rechts',
  9: 'Zweigniederlassung',
  10: 'Kommanditgesellschaft (KmG)',
  11: 'Zweigniederlassung einer ausl. Gesellschaft',
  12: 'Kommanditaktiengesellschaft (KmAG)',
  13: 'Besondere Rechtsform',
  14: 'Gemeinderschaft',
  15: 'SICAF',
  16: 'SICAV',
  17: 'Kommanditgesellschaft für kollektive Kapitalanlagen (KmGK)',
  18: 'Nichtkaufmännische Prokura',
  0: 'Unbekannt'
};

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (req.body && typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function sendResponse(res, status, data) {
  if (!res || res.headersSent || res.writableEnded) return;
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(data));
}

function formatCompanyItem(item) {
  const legalFormName = (item.legalFormId && LEGAL_FORMS[item.legalFormId])
    ? LEGAL_FORMS[item.legalFormId]
    : (item.legalForm?.name?.de || '');

  return {
    ehraid: item.ehraid,
    name: item.name || '',
    seat: item.legalSeat || (item.address && (item.address.town || item.address.city)) || '',
    legalSeat: item.legalSeat || '',
    uid: item.uid || '',
    uidFormatted: item.uidFormatted || item.uid || '',
    chid: item.chid || '',
    chidFormatted: item.chidFormatted || '',
    legalFormId: item.legalFormId,
    legalForm: {
      id: item.legalFormId,
      name: { de: legalFormName }
    },
    status: item.status || 'EXISTIEREND',
    cantonalExcerptWeb: item.cantonalExcerptWeb || null,
    address: item.address ? {
      street: item.address.street || '',
      houseNumber: item.address.houseNumber || '',
      strasse: [item.address.street, item.address.houseNumber].filter(Boolean).join(' '),
      plz: item.address.swissZipCode || '',
      town: item.address.town || '',
      country: item.address.country === 'CH' ? 'Schweiz' : (item.address.country || 'Schweiz')
    } : null
  };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return sendResponse(res, 200, { ok: true });
  }

  try {
    const urlObj = new URL(req.url, 'http://localhost');
    const queryParams = req.query || {};
    
    let body = {};
    if (req.method === 'POST') {
      body = await parseBody(req);
    }

    const ehraid = urlObj.searchParams.get('ehraid') || urlObj.searchParams.get('detail') || queryParams.ehraid || queryParams.detail || body.ehraid || body.detail;
    const searchQuery = urlObj.searchParams.get('search') || urlObj.searchParams.get('query') || urlObj.searchParams.get('name') || queryParams.search || queryParams.query || queryParams.name || body.name || body.search || body.query;
    const maxEntries = parseInt(urlObj.searchParams.get('maxEntries') || queryParams.maxEntries || body.maxEntries || '10', 10);

    // 1. Single firm detail lookup by EHRA ID
    if (ehraid) {
      const detailRes = await fetch(`https://www.zefix.ch/ZefixREST/api/v1/firm/${encodeURIComponent(ehraid)}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!detailRes.ok) {
        if (detailRes.status === 404) {
          return sendResponse(res, 404, { error: 'Firma im Handelsregister nicht gefunden.' });
        }
        return sendResponse(res, detailRes.status, { error: `Zefix API Fehler (${detailRes.status})` });
      }

      const firmDetail = await detailRes.json();
      return sendResponse(res, 200, formatCompanyItem(firmDetail));
    }

    // 2. Company search
    if (!searchQuery || typeof searchQuery !== 'string' || searchQuery.trim().length < 2) {
      return sendResponse(res, 200, { list: [] });
    }

    const cleanQuery = searchQuery.trim();

    // Primary search call to ZefixREST
    let zefixRes = await fetch('https://www.zefix.ch/ZefixREST/api/v1/firm/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: cleanQuery,
        languageKey: 'de',
        maxEntries: Math.min(Math.max(maxEntries, 1), 25)
      })
    });

    let data = null;
    if (zefixRes.ok) {
      data = await zefixRes.json();
    } else if (zefixRes.status === 404) {
      // 404 in ZefixREST simply means "No results found for query"
      data = { list: [] };
    }

    // Fallback: If 0 results were found and query contains a corporate suffix (e.g. "Muster AG" -> "Muster"), retry with stripped base name
    if (!data || !data.list || data.list.length === 0) {
      const stripped = cleanQuery.replace(/\b(ag|gmbh|sàrl|sarl|sa|sagl|gen|kig|kmg)\b/gi, '').trim();
      if (stripped && stripped.toLowerCase() !== cleanQuery.toLowerCase() && stripped.length >= 2) {
        const fallbackRes = await fetch('https://www.zefix.ch/ZefixREST/api/v1/firm/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            name: stripped,
            languageKey: 'de',
            maxEntries: Math.min(Math.max(maxEntries, 1), 25)
          })
        });

        if (fallbackRes.ok) {
          data = await fallbackRes.json();
        }
      }
    }

    const rawList = (data && Array.isArray(data.list)) ? data.list : [];
    const formattedList = rawList.map(formatCompanyItem);

    return sendResponse(res, 200, {
      list: formattedList,
      total: formattedList.length
    });

  } catch (error) {
    console.error('Zefix API route error:', error);
    return sendResponse(res, 500, {
      error: 'Fehler bei der Zefix-Handelsregisterabfrage: ' + (error?.message || 'Serverfehler'),
      list: []
    });
  }
}
