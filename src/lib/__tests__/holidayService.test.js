import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHolidays, calculateBusinessDueDate } from '../holidayService';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock global fetch
global.fetch = vi.fn();

describe('holidayService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  const mockHolidays2026 = [
    { date: '2026-01-01', localName: 'Neujahr', counties: null },
    { date: '2026-01-02', localName: 'Berchtoldstag', counties: ['CH-ZH', 'CH-BE'] },
    { date: '2026-08-01', localName: 'Bundesfeier', counties: null },
  ];

  it('fetches holidays and caches them', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHolidays2026,
    });

    const holidays = await getHolidays(2026);
    expect(holidays).toHaveLength(3);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('atelier77_holidays_2026', JSON.stringify(mockHolidays2026));

    // Second call should use cache
    const holidaysCached = await getHolidays(2026);
    expect(holidaysCached).toHaveLength(3);
    expect(fetch).toHaveBeenCalledTimes(1); // Still 1
  });

  it('filters holidays by kanton', async () => {
    localStorageMock.setItem('atelier77_holidays_2026', JSON.stringify(mockHolidays2026));

    const zhHolidays = await getHolidays(2026, 'ZH');
    expect(zhHolidays).toHaveLength(3); // Neujahr, Berchtoldstag, Bundesfeier

    const shHolidays = await getHolidays(2026, 'SH');
    expect(shHolidays).toHaveLength(2); // Neujahr, Bundesfeier (Berchtoldstag is not SH)
  });

  it('skips weekends in calculateBusinessDueDate', async () => {
    localStorageMock.setItem('atelier77_holidays_2026', JSON.stringify([]));
    
    // Friday Jan 9, 2026
    const startDate = new Date('2026-01-09T00:00:00Z');
    const dueDate = await calculateBusinessDueDate(startDate, 2);
    
    // Should be Tuesday Jan 13, 2026
    expect(dueDate.toISOString().startsWith('2026-01-13')).toBe(true);
  });

  it('skips holidays in calculateBusinessDueDate', async () => {
    localStorageMock.setItem('atelier77_holidays_2026', JSON.stringify(mockHolidays2026));
    
    // Wed Dec 31, 2025 -> wait, let's just do Dec 31, 2026 since mock is 2026
    // Actually, Dec 31, 2025 + 2 days -> Jan 1 is holiday, Jan 2 is holiday in ZH
    // We need mock for 2025 and 2026
    localStorageMock.setItem('atelier77_holidays_2025', JSON.stringify([{ date: '2025-12-25', localName: 'Weihnachten', counties: null }]));

    const startDate = new Date('2025-12-31T00:00:00Z'); // Wed
    
    // Thursday Jan 1 (National), Friday Jan 2 (ZH only)
    const dueDateZH = await calculateBusinessDueDate(startDate, 2, 'ZH');
    // Jan 1 skip, Jan 2 skip, Jan 3 Sat skip, Jan 4 Sun skip.
    // 1st day = Jan 5 (Mon), 2nd day = Jan 6 (Tue)
    expect(dueDateZH.toISOString().startsWith('2026-01-06')).toBe(true);

    const dueDateSH = await calculateBusinessDueDate(startDate, 2, 'SH');
    // Jan 1 skip, Jan 2 is NOT holiday in SH.
    // 1st day = Jan 2 (Fri), 2nd day = Jan 5 (Mon)
    expect(dueDateSH.toISOString().startsWith('2026-01-05')).toBe(true);
  });
});
