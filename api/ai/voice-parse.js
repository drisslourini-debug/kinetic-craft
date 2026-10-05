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
    if (!body) {
      return sendJson(res, 400, { error: 'Ungültiger Request-Body.' });
    }

    const { mode, audio, mimeType = 'audio/webm', textPrompt, katalog = [], kunden = [] } = body;

    if (!audio && !textPrompt) {
      return sendJson(res, 400, { error: 'Keine Audioaufnahme oder Text übergeben.' });
    }

    let rawBase64 = audio || null;
    let actualMime = mimeType;
    if (rawBase64 && rawBase64.startsWith('data:')) {
      const match = rawBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        actualMime = match[1];
        rawBase64 = match[2];
      }
    }

    const currentDate = new Date().toISOString().split('T')[0];

    if (mode === 'projekt') {
      const kundenContext = kunden.length > 0
        ? `Bestehende Kunden im System:\n${kunden.map(k => `- ID: "${k.id}", Name: "${k.name}"`).join('\n')}\nOrdne dem am besten passenden Kunden zu.`
        : 'Keine Kundenliste hinterlegt.';

      const systemInstruction = `Du bist ein Schweizer Handwerker-Sprachassistent für die Projekt- und Baustellenorganisation.
Heutiges Datum: ${currentDate}.
Verstehe Schweizerdeutsch (Mundart, Züridütsch, Bärndütsch, etc.) und Hochdeutsch absolut präzise.

${kundenContext}

Kategorien für Projekte:
- "Neubau"
- "Umbau / Renovation"
- "Reparatur / Service"
- "Sanierung"

Berechne relative Datumsangaben (z.B. "ab nächstem Montag", "in zwei Wochen") ausgehend von heute (${currentDate}) im Format YYYY-MM-DD.
Falls der Kunde im Text genannt wird, matche ihn auf die übergebene Kundenliste.
Falls Unklarheiten herrschen, setze "vertrauen" auf "mittel" oder "niedrig" und gib in "warnung" einen freundlichen Prüfhinweis an.`;

      const responseSchema = {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: 'Prägnanter Projektname (z.B. Fassadenrenovation Seestrasse)' },
          kunden_id: { type: 'STRING', nullable: true, description: 'ID des gematchten Kunden oder null' },
          kategorie: {
            type: 'STRING',
            enum: ['Neubau', 'Umbau / Renovation', 'Reparatur / Service', 'Sanierung'],
          },
          adresse: { type: 'STRING', description: 'Baustellenadresse oder Ort' },
          startdatum: { type: 'STRING', nullable: true, description: 'Startdatum im Format YYYY-MM-DD' },
          enddatum: { type: 'STRING', nullable: true, description: 'Enddatum im Format YYYY-MM-DD' },
          notizen: { type: 'STRING', nullable: true, description: 'Zusätzliche Wünsche, Aufgaben oder Notizen' },
          vertrauen: { type: 'STRING', enum: ['hoch', 'mittel', 'niedrig'] },
          warnung: { type: 'STRING', nullable: true, description: 'Hinweis falls Ton unklar oder Angaben unvollständig waren' },
        },
        required: ['name', 'kategorie', 'vertrauen'],
      };

      const parts = [];
      if (textPrompt) {
        parts.push({ text: `Gesprochene Anweisung (Text): "${textPrompt}"` });
      }
      if (rawBase64) {
        parts.push({ text: 'Hier ist die Audioaufnahme der Baustellen- bzw. Projektanweisung:' });
        parts.push({
          inlineData: {
            mimeType: actualMime,
            data: rawBase64,
          },
        });
      }

      const extracted = await callGemini({
        apiKey,
        contents: [{ parts }],
        systemInstruction,
        responseSchema,
      });

      return sendJson(res, 200, { success: true, data: extracted });
    }

    // Default: mode === 'offerte'
    const katalogContext = katalog.length > 0
      ? `Eigener Leistungskatalog des Betriebs:\n${katalog.map(k => `- Titel: "${k.titel || k.beschreibung}", Einheit: "${k.einheit}", Richtpreis: ${k.preis || k.einzelpreis || 0} CHF`).join('\n')}\nWenn eine gesprochene Leistung mit einem Katalogeintrag übereinstimmt, verwende bevorzugt dessen Einheit und Richtpreis.`
      : 'Kein individueller Katalog übergeben.';

    const systemInstruction = `Du bist ein erfahrener Schweizer Handwerker-Kalkulator (Maler, Gipser, Ausbau).
Heutiges Datum: ${currentDate}.
Verstehe Schweizerdeutsch (Mundart wie z.B. "Chuchi renoviere", "Wänd striiche", "Dechi spritze", "Böde abdecke mit Vlies") und Hochdeutsch perfekt.

${katalogContext}

Deine Aufgabe:
1. Zerlege die gesprochene Kalkulation in eine saubere Schweizer Handwerker-Offerte mit Titeln (1.0, 2.0...) und Positionen (1.1, 1.2, 2.1...).
2. Verwende für Positionen standardisierte Schweizer Einheiten: "m²", "m", "h", "Stk", "Psch".
3. Falls im Katalog ein Richtpreis existiert, übernimm ihn. Falls nicht und im Diktat kein Preis genannt wurde, schätze einen marktüblichen Schweizer Handwerker-Tarif (z.B. Malerarbeit ca. 16-24 CHF/m2, Abdecken ca. 6-12 CHF/m2, Regiestunde ca. 92 CHF/h) oder verwende den genannten Preis.
4. Generiere einen professionellen Schweizer Einleitungssatz (z.B. "Gerne offerieren wir Ihnen für das genannte Bauvorhaben die nachfolgenden Leistungen.") und einen Schlusssatz.
5. Falls die Tonspur unverständlich war oder Werte stark unsicher sind, setze "vertrauen" auf "niedrig" oder "mittel" und formuliere in "warnung" einen präzisen Hinweis.`;

    const responseSchema = {
      type: 'OBJECT',
      properties: {
        einleitung: { type: 'STRING', description: 'Freundlicher, professioneller Einleitungstext für die Offerte' },
        schluss: { type: 'STRING', description: 'Professioneller Schlusstext' },
        positionen: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              type: { type: 'STRING', enum: ['title', 'position'], description: 'Titelzeile oder Leistungsposition' },
              beschreibung: { type: 'STRING', description: 'Bezeichnung der Leistung oder des Titels' },
              menge: { type: 'NUMBER', nullable: true, description: 'Menge / Ausmass (nur bei type=position)' },
              einheit: {
                type: 'STRING',
                nullable: true,
                enum: ['m²', 'm', 'h', 'Stk', 'Psch'],
                description: 'Einheit (nur bei type=position)',
              },
              einzelpreis: { type: 'NUMBER', nullable: true, description: 'Einheitspreis in CHF (nur bei type=position)' },
              optional: { type: 'BOOLEAN', description: 'Ob es sich um eine Alternativ-/Eventualposition handelt' },
            },
            required: ['type', 'beschreibung'],
          },
        },
        vertrauen: { type: 'STRING', enum: ['hoch', 'mittel', 'niedrig'] },
        warnung: { type: 'STRING', nullable: true, description: 'Hinweis bei Unklarheiten oder ungenauen Angaben' },
      },
      required: ['positionen', 'vertrauen'],
    };

    const parts = [];
    if (textPrompt) {
      parts.push({ text: `Gesprochene / eingegebene Kalkulationsanweisung: "${textPrompt}"` });
    }
    if (rawBase64) {
      parts.push({ text: 'Hier ist die Audioaufnahme der Offertenkalkulation:' });
      parts.push({
        inlineData: {
          mimeType: actualMime,
          data: rawBase64,
        },
      });
    }

    const extracted = await callGemini({
      apiKey,
      contents: [{ parts }],
      systemInstruction,
      responseSchema,
    });

    return sendJson(res, 200, { success: true, data: extracted });
  } catch (err) {
    console.error('Voice-Parse Error:', err);
    return sendJson(res, 500, {
      error: err.message || 'Fehler bei der Sprachverarbeitung durch KI.',
    });
  }
}
