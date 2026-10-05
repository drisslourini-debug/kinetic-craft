import fs from 'fs';
import path from 'path';

// Helper utilities for Vercel Serverless AI endpoints (Google Gemini 2.0 Flash)

export function getGeminiApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  if (process.env.VITE_GEMINI_API_KEY) return process.env.VITE_GEMINI_API_KEY;
  try {
    for (const f of ['.env.local', '.env']) {
      const p = path.resolve(process.cwd(), f);
      if (fs.existsSync(p)) {
        const text = fs.readFileSync(p, 'utf8');
        const m = text.match(/(?:VITE_)?GEMINI_API_KEY\s*=\s*(.+)/);
        if (m) {
          const val = m[1].trim().replace(/^["']|["']$/g, '');
          process.env.GEMINI_API_KEY = val;
          return val;
        }
      }
    }
  } catch {}
  return null;
}

export async function parseRequestBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (req.body && typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}

export function sendJson(res, statusCode, data) {
  if (!res || res.writableEnded || res.headersSent) {
    return;
  }
  try {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.end(JSON.stringify(data));
  } catch (err) {
    console.error('Failed to send JSON response:', err);
  }
}

export async function callGemini({ apiKey, contents, systemInstruction, responseSchema, model = process.env.GEMINI_MODEL || 'gemini-3.8-flash' }) {
  const tryModel = async (selectedModel) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

    const payload = {
      contents,
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        ...(responseSchema ? { responseSchema } : {}),
      },
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 404 && selectedModel !== 'gemini-3.8-flash') {
        console.warn(`Model ${selectedModel} returned 404, falling back to gemini-3.8-flash...`);
        return tryModel('gemini-3.8-flash');
      }
      throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    const textOutput = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) {
      throw new Error('Keine Antwort von Gemini erhalten.');
    }

    return JSON.parse(textOutput);
  };

  return tryModel(model);
}
