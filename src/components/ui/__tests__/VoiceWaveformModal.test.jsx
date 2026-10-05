import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VoiceWaveformModal from '../VoiceWaveformModal';
import * as aiService from '../../../services/aiService';

vi.mock('../../../services/aiService', () => ({
  startAudioRecorder: vi.fn(),
  parseVoice: vi.fn(),
  fileToBase64: vi.fn(),
}));

describe('VoiceWaveformModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <VoiceWaveformModal isOpen={false} onClose={() => {}} onSuccess={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title, subtitle, and action buttons when open', () => {
    render(
      <VoiceWaveformModal
        isOpen={true}
        onClose={() => {}}
        onSuccess={() => {}}
        title="Offerte per Sprache erfassen"
        subtitle="Sprechen Sie frei auf Schweizerdeutsch"
      />
    );

    expect(screen.getByText('Offerte per Sprache erfassen')).toBeInTheDocument();
    expect(screen.getByText('Sprechen Sie frei auf Schweizerdeutsch')).toBeInTheDocument();
    expect(screen.getByText('Sprachaufnahme starten')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <VoiceWaveformModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={() => {}}
      />
    );

    const closeBtn = screen.getByTitle('Schliessen');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('allows text fallback input and processes submission', async () => {
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    aiService.parseVoice.mockResolvedValueOnce({
      positionen: [
        { type: 'title', beschreibung: '1.0 Vorbereitung' },
        { type: 'position', beschreibung: 'Vlies auslegen', menge: 50, einheit: 'm²', einzelpreis: 6 },
      ],
      vertrauen: 'hoch',
      warnung: null,
    });

    render(
      <VoiceWaveformModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
        mode="offerte"
      />
    );

    // Toggle text input
    const toggleBtn = screen.getByText(/Oder Anweisung als Text/i);
    fireEvent.click(toggleBtn);

    const textarea = screen.getByPlaceholderText(/z.B. Wohnzimmer renovieren/i);
    fireEvent.change(textarea, { target: { value: '50m2 Vlies auslegen' } });

    const submitBtn = screen.getByText('Text von KI auswerten lassen');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(aiService.parseVoice).toHaveBeenCalledWith(expect.objectContaining({
        textPrompt: '50m2 Vlies auslegen',
        mode: 'offerte',
      }));
      expect(handleSuccess).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('displays warning dialog on strict validation failure and allows manual acceptance', async () => {
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    aiService.parseVoice.mockResolvedValueOnce({
      positionen: [],
      vertrauen: 'niedrig',
      warnung: 'Tonspur war durch Baustellenlärm überlagert - bitte Mengenangaben prüfen.',
    });

    render(
      <VoiceWaveformModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    // Toggle text input & submit
    fireEvent.click(screen.getByText(/Oder Anweisung als Text/i));
    const textarea = screen.getByPlaceholderText(/z.B. Wohnzimmer renovieren/i);
    fireEvent.change(textarea, { target: { value: 'Unklare Baustellenangabe' } });
    fireEvent.click(screen.getByText('Text von KI auswerten lassen'));

    await waitFor(() => {
      expect(screen.getByText('Prüfhinweis der KI')).toBeInTheDocument();
      expect(screen.getByText(/Tonspur war durch Baustellenlärm überlagert/i)).toBeInTheDocument();
    });

    // Accept warning
    const acceptBtn = screen.getByText('Trotzdem übernehmen & anpassen');
    fireEvent.click(acceptBtn);

    expect(handleSuccess).toHaveBeenCalledWith(expect.objectContaining({
      vertrauen: 'niedrig',
    }));
    expect(handleClose).toHaveBeenCalled();
  });
});
