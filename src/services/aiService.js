/**
 * AI Service for Atelier 77 / Kinetic Craft
 * Handles Receipt OCR (Gemini Vision) and Voice-to-Action (Gemini Audio)
 */

export async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve({ base64, dataUrl: result, mimeType: file.type || 'image/jpeg' });
      } else {
        reject(new Error('Konnte Datei nicht als Base64 einlesen.'));
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function scanReceipt({ file, base64, mimeType, projekte = [] }) {
  let imagePayload = base64;
  let detectedMime = mimeType || 'image/jpeg';

  if (file) {
    const converted = await fileToBase64(file);
    imagePayload = converted.base64;
    detectedMime = converted.mimeType;
  }

  if (!imagePayload) {
    throw new Error('Kein Belegbild übergeben.');
  }

  const response = await fetch('/api/ai/scan-receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: imagePayload,
      mimeType: detectedMime,
      projekte: projekte.map((p) => ({ id: p.id, name: p.name, adresse: p.adresse || '' })),
    }),
  });

  const resJson = await response.json();
  if (!response.ok || !resJson.success) {
    throw new Error(resJson.error || 'Belegeinlesung fehlgeschlagen.');
  }

  return resJson.data;
}

export async function parseVoice({ audioBlob, textPrompt, mode = 'offerte', katalog = [], kunden = [] }) {
  let audioBase64 = null;
  let audioMime = 'audio/webm';

  if (audioBlob) {
    audioMime = audioBlob.type || 'audio/webm';
    const converted = await fileToBase64(audioBlob);
    audioBase64 = converted.base64;
  }

  const response = await fetch('/api/ai/voice-parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode,
      audio: audioBase64,
      mimeType: audioMime,
      textPrompt,
      katalog,
      kunden,
    }),
  });

  const resJson = await response.json();
  if (!response.ok || !resJson.success) {
    throw new Error(resJson.error || 'Sprachverarbeitung fehlgeschlagen.');
  }

  return resJson.data;
}

/**
 * Modern Audio Recorder with Web Audio API level metering
 */
export async function startAudioRecorder({ onLevelChange } = {}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Mikrofonzugriff wird von diesem Browser nicht unterstützt.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : MediaRecorder.isTypeSupported('audio/mp4')
    ? 'audio/mp4'
    : '';

  const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const audioChunks = [];

  let audioContext = null;
  let analyser = null;
  let animationId = null;

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      audioContext = new AudioCtx();
      const source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalized = Math.min(1, average / 128); // 0.0 to 1.0
        if (onLevelChange) {
          onLevelChange(normalized);
        }
        animationId = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    }
  } catch (err) {
    console.warn('Audio metering unavailable:', err);
  }

  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      audioChunks.push(event.data);
    }
  };

  mediaRecorder.start(250);

  return {
    stop: () => {
      return new Promise((resolve) => {
        if (animationId) cancelAnimationFrame(animationId);
        if (audioContext && audioContext.state !== 'closed') {
          audioContext.close().catch(() => {});
        }

        mediaRecorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          const finalMime = mediaRecorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunks, { type: finalMime });
          resolve(audioBlob);
        };

        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        } else {
          stream.getTracks().forEach((track) => track.stop());
          resolve(new Blob(audioChunks, { type: 'audio/webm' }));
        }
      });
    },
    cancel: () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
      stream.getTracks().forEach((track) => track.stop());
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    },
  };
}
