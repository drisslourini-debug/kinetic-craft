import { describe, it, expect } from 'vitest';
import {
  TERMIN_TYPEN,
  TERMIN_STATUSSE,
  getTerminTypConfig,
  getTerminStatusConfig
} from '../kalenderConstants';

describe('kalenderConstants', () => {
  it('contains expected appointment types and statuses', () => {
    expect(TERMIN_TYPEN.length).toBeGreaterThanOrEqual(7);
    expect(TERMIN_STATUSSE.map(s => s.id)).toEqual([
      'Geplant', 'Bestätigt', 'In Durchführung', 'Erledigt', 'Abgesagt'
    ]);
  });

  it('provides fallbacks for unknown type and status', () => {
    const fallbackTyp = getTerminTypConfig('Unbekannt');
    expect(fallbackTyp.label).toBe('Unbekannt');

    const fallbackStatus = getTerminStatusConfig('Unbekannt');
    expect(fallbackStatus.label).toBe('Unbekannt');
  });

  it('returns valid config for known types like Montage', () => {
    const montage = getTerminTypConfig('Montage');
    expect(montage.label).toBe('Montage');
    expect(montage.icon).toBe('Montage');
    expect(montage.color).toBe('#10b981');
  });
});
