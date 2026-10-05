import { parseRequestBody, sendJson, callGemini, getGeminiApiKey } from './_helpers.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return sendJson(res, 500, {
      error: 'GEMINI_API_KEY ist serverseitig nicht konfiguriert. Bitte in .env oder Vercel Umgebungsvariablen hinterlegen.',
    });
  }

  try {
    const body = await parseRequestBody(req);
    if (!body || !body.image) {
      return sendJson(res, 400, { error: 'Ungültiger Request: Kein Bild (image) übergeben.' });
    }

    let rawBase64 = body.image;
    let mimeType = body.mimeType || 'image/jpeg';

    if (rawBase64.startsWith('data:')) {
      const match = rawBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        rawBase64 = match[2];
      }
    }

    const projekte = Array.isArray(body.projekte) ? body.projekte : [];
    const projekteContext = projekte.length > 0
      ? `Aktuell offene Handwerker-Projekte/Baustellen:\n${projekte.map(p => `- ID: "${p.id}", Name: "${p.name}", Adresse: "${p.adresse || ''}"`).join('\n')}\nWenn auf dem Beleg eine Projektnummer, ein Kundenname oder eine Baustellenadresse erwähnt wird, weise die projekt_id zu.`
      : 'Keine Projektliste übergeben.';

    const systemInstruction = `Du bist ein spezialisierter KI-Buchhaltungsassistent für Schweizer Handwerksbetriebe (Maler, Gipser, Ausbau).
Analysiere die Quittung, den Kassenbon oder die Lieferantenrechnung extrem sorgfältig.

Zulässige Schweizer Buchhaltungskonten / Kategorien:
- "4000 Materialaufwand" (Farben, Putz, Gips, Schrauben, Pinsel, Rollen, Klebeband, Abdeckmaterial, Baumaterial)
- "4500 Fremdleistungen" (Subunternehmer, Gerüstmiete, Spezialisten)
- "6200 Fahrzeugaufwand" (Treibstoff, Benzin, Diesel, Parkgebühren, Autowäsche, Vignette)
- "6500 Verwaltungsaufwand" (Büromaterial, Telefonie, Software, Porto)
- "6800 Werkzeug & Unterhalt" (Werkzeuge, Bohrer, Schleifpapier, Maschinenmiete, Arbeitskleidung)
- "4900 Übriger Betriebsaufwand" (Verpflegung, Sonstiges)

Schweizer Mehrwertsteuersätze (MWST):
- "8.1" (Normalsatz: Material, Werkzeug, Dienstleistungen, Kraftstoff)
- "2.6" (Reduzierter Satz: Lebensmittel, alkoholfreie Getränke, Bücher)
- "0" (Steuerbefreit oder nicht ausgewiesen)

${projekteContext}

WICHTIG:
- Datum immer im Format YYYY-MM-DD. Falls auf dem Beleg nur DD.MM.YYYY oder DD.MM.YY steht, rechne es ins ISO-Format um.
- Betrag brutto in Schweizer Franken (CHF).
- Wenn der Beleg unleserlich, stark geknickt, abgeschnitten oder wichtige Zahlen (z. B. MWST oder Endbetrag) nicht zweifelsfrei lesbar sind, setze "vertrauen" auf "niedrig" oder "mittel" und formuliere in "warnung" eine präzise Erklärung (z.B. "MWST-Satz konnte nicht eindeutig ermittelt werden - bitte kontrollieren").`;

    const responseSchema = {
      type: 'OBJECT',
      properties: {
        titel: {
          type: 'STRING',
          description: 'Name des Lieferanten oder Geschäfts (z.B. Jumbo Aarau, Hornbach, Coop Mineraloel, Knuchel Farben)',
        },
        beleg_datum: {
          type: 'STRING',
          description: 'Belegdatum im Format YYYY-MM-DD',
        },
        betrag_brutto: {
          type: 'NUMBER',
          description: 'Gesamtbetrag inklusive MWST in CHF als Dezimalzahl (z.B. 142.50)',
        },
        mwst_satz: {
          type: 'STRING',
          enum: ['8.1', '2.6', '0'],
          description: 'Schweizer MWST-Satz',
        },
        kategorie: {
          type: 'STRING',
          description: 'Passende Buchhaltungskategorie',
        },
        projekt_id: {
          type: 'STRING',
          nullable: true,
          description: 'ID des passenden Projekts falls erwähnt, sonst null',
        },
        vertrauen: {
          type: 'STRING',
          enum: ['hoch', 'mittel', 'niedrig'],
          description: 'Erkennungszuverlässigkeit',
        },
        warnung: {
          type: 'STRING',
          nullable: true,
          description: 'Konkreter Hinweis falls Daten unklar oder Beleg schwer lesbar war',
        },
      },
      required: ['titel', 'beleg_datum', 'betrag_brutto', 'mwst_satz', 'kategorie', 'vertrauen'],
    };

    const contents = [
      {
        parts: [
          {
            text: 'Bitte lies diesen Schweizer Handwerker-Beleg präzise aus und ordne ihn nach den Schweizer KMU-Buchhaltungsregeln zu.',
          },
          {
            inlineData: {
              mimeType,
              data: rawBase64,
            },
          },
        ],
      },
    ];

    const extracted = await callGemini({
      apiKey,
      contents,
      systemInstruction,
      responseSchema,
    });

    return sendJson(res, 200, { success: true, data: extracted });
  } catch (err) {
    console.error('Scan-Receipt Error:', err);
    return sendJson(res, 500, {
      error: err.message || 'Fehler bei der Belegverarbeitung durch KI.',
    });
  }
}
