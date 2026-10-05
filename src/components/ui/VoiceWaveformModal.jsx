import { useState, useEffect, useRef } from 'react';
import { startAudioRecorder, parseVoice } from '../../services/aiService';

export default function VoiceWaveformModal({
  isOpen,
  onClose,
  onSuccess,
  title = 'Sprachbefehl aufnehmen',
  subtitle = 'Sprechen Sie frei auf Schweizerdeutsch oder Hochdeutsch.',
  mode = 'offerte',
  contextData = {},
}) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'recording' | 'processing' | 'warning' | 'error'
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  const [warningData, setWarningData] = useState(null);
  const [manualText, setManualText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);

  const recorderRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      cleanup();
      setStatus('idle');
      setErrorMessage(null);
      setWarningData(null);
      setManualText('');
      setShowTextInput(false);
    }
  }, [isOpen]);

  const cleanup = () => {
    if (recorderRef.current) {
      recorderRef.current.cancel();
      recorderRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecordSeconds(0);
    setAudioLevel(0);
  };

  const handleStartRecording = async () => {
    try {
      setErrorMessage(null);
      const rec = await startAudioRecorder({
        onLevelChange: (lvl) => setAudioLevel(lvl),
      });
      recorderRef.current = rec;
      setStatus('recording');
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error('Audio recorder error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Mikrofonzugriff nicht gestattet.');
    }
  };

  const handleStopRecording = async () => {
    if (!recorderRef.current) return;
    setStatus('processing');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      const audioBlob = await recorderRef.current.stop();
      recorderRef.current = null;

      const result = await parseVoice({
        audioBlob,
        mode,
        katalog: contextData.katalog || [],
        kunden: contextData.kunden || [],
      });

      handleParseResult(result);
    } catch (err) {
      console.error('Processing error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'KI-Verarbeitung fehlgeschlagen.');
    }
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!manualText.trim()) return;

    setStatus('processing');
    setErrorMessage(null);
    try {
      const result = await parseVoice({
        textPrompt: manualText.trim(),
        mode,
        katalog: contextData.katalog || [],
        kunden: contextData.kunden || [],
      });
      handleParseResult(result);
    } catch (err) {
      console.error('Processing error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'KI-Verarbeitung fehlgeschlagen.');
    }
  };

  const handleParseResult = (result) => {
    // If strict validation flagged uncertainty:
    if (result.vertrauen === 'niedrig' || result.warnung) {
      setWarningData(result);
      setStatus('warning');
    } else {
      onSuccess(result);
      onClose();
    }
  };

  const handleAcceptWarning = () => {
    if (warningData) {
      onSuccess(warningData);
      onClose();
    }
  };

  if (!isOpen) return null;

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 text-white transition-all transform scale-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-modal-title"
      >
        {/* Glow ambient background effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <span className="flex h-3 w-3 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                status === 'recording' ? 'bg-red-400' : status === 'processing' ? 'bg-amber-400' : 'bg-emerald-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                status === 'recording' ? 'bg-red-500' : status === 'processing' ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
            </span>
            <h3 id="voice-modal-title" className="text-xl font-bold tracking-tight text-slate-100">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors"
            title="Schliessen"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-slate-400 mb-6">{subtitle}</p>

        {/* Content based on status */}
        {status === 'warning' ? (
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-5 mb-6 text-slate-200">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="font-semibold text-amber-300 mb-1">Prüfhinweis der KI</h4>
                <p className="text-sm text-amber-200/90 leading-relaxed mb-3">
                  {warningData?.warnung || 'Einige gesprochene Angaben waren unklar oder nicht im Katalog hinterlegt.'}
                </p>
                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={handleAcceptWarning}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs rounded-xl shadow transition"
                  >
                    Trotzdem übernehmen & anpassen
                  </button>
                  <button
                    onClick={() => setStatus('idle')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition"
                  >
                    Erneut aufnehmen
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : status === 'processing' ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin" />
              <svg className="w-7 h-7 text-amber-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-slate-100">KI analysiert Sprache...</p>
              <p className="text-xs text-slate-400 mt-1">Positionen, Mengen & Katalogpreise werden berechnet</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Audio Waveform visualization */}
            <div className="flex flex-col items-center justify-center py-6 bg-slate-950/60 border border-slate-800/80 rounded-2xl relative overflow-hidden">
              {status === 'recording' && (
                <div className="flex items-center space-x-1.5 h-16 mb-2">
                  {[40, 75, 100, 60, 90, 45, 85, 95, 60, 80, 50, 70, 90, 60].map((baseHeight, idx) => {
                    const dynamicScale = Math.max(0.2, audioLevel * (baseHeight / 50));
                    return (
                      <span
                        key={idx}
                        className="w-1.5 bg-gradient-to-t from-amber-500 to-amber-300 rounded-full transition-all duration-75"
                        style={{ height: `${Math.min(56, Math.max(8, dynamicScale * 48))}px` }}
                      />
                    );
                  })}
                </div>
              )}

              {status === 'idle' && (
                <div className="text-center py-4 px-4">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-300">Bereit zur Aufnahme</p>
                  <p className="text-xs text-slate-500 mt-1">Klicken Sie auf den Button und sprechen Sie Ihre Offerte oder Baustelle ein.</p>
                </div>
              )}

              {status === 'recording' && (
                <div className="flex items-center space-x-2 text-sm font-semibold text-red-400 mt-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>Aufnahme läuft: {formatTimer(recordSeconds)}</span>
                </div>
              )}
            </div>

            {/* Error display */}
            {errorMessage && (
              <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-xl text-red-300 text-xs flex items-center space-x-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {status === 'recording' ? (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-sm shadow-lg shadow-red-900/30 flex items-center justify-center space-x-2 transition transform active:scale-98"
                >
                  <span className="w-3.5 h-3.5 bg-white rounded-sm" />
                  <span>Aufnahme stoppen & berechnen</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition transform active:scale-98"
                >
                  <svg className="w-5 h-5 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <span>Sprachaufnahme starten</span>
                </button>
              )}
            </div>

            {/* Fallback text input toggle */}
            <div className="pt-2 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={() => setShowTextInput(!showTextInput)}
                className="text-xs text-slate-400 hover:text-amber-400 transition"
              >
                {showTextInput ? '▲ Text-Eingabe ausblenden' : '▼ Oder Anweisung als Text eintippen / einfügen'}
              </button>

              {showTextInput && (
                <form onSubmit={handleTextSubmit} className="mt-3 text-left space-y-2">
                  <textarea
                    rows={3}
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="z.B. Wohnzimmer renovieren: 60m2 Decke weiss streichen, 45m2 Wände grundieren und mit Dispersionsfarbe..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={!manualText.trim()}
                    className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-medium text-xs rounded-xl transition"
                  >
                    Text von KI auswerten lassen
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
