/**
 * Fetches Swiss public holidays for a given year.
 * Caches results in localStorage to avoid repeated API calls.
 * 
 * @param {number} year 
 * @param {string} [kanton] - Optional canton code (e.g., 'ZH', 'BE', 'BS')
 * @returns {Promise<Array<{date: string, name: string, isNational: boolean}>>}
 */
export const SWISS_CANTONS = [
  { code: 'AG', name: 'Aargau' },
  { code: 'AI', name: 'Appenzell Innerrhoden' },
  { code: 'AR', name: 'Appenzell Ausserrhoden' },
  { code: 'BE', name: 'Bern' },
  { code: 'BL', name: 'Basel-Landschaft' },
  { code: 'BS', name: 'Basel-Stadt' },
  { code: 'FR', name: 'Freiburg' },
  { code: 'GE', name: 'Genf' },
  { code: 'GL', name: 'Glarus' },
  { code: 'GR', name: 'Graubünden' },
  { code: 'JU', name: 'Jura' },
  { code: 'LU', name: 'Luzern' },
  { code: 'NE', name: 'Neuenburg' },
  { code: 'NW', name: 'Nidwalden' },
  { code: 'OW', name: 'Obwalden' },
  { code: 'SG', name: 'St. Gallen' },
  { code: 'SH', name: 'Schaffhausen' },
  { code: 'SO', name: 'Solothurn' },
  { code: 'SZ', name: 'Schwyz' },
  { code: 'TG', name: 'Thurgau' },
  { code: 'TI', name: 'Tessin' },
  { code: 'UR', name: 'Uri' },
  { code: 'VD', name: 'Waadt' },
  { code: 'VS', name: 'Wallis' },
  { code: 'ZG', name: 'Zug' },
  { code: 'ZH', name: 'Zürich' }
];

export async function getHolidays(year, kanton) {
  const cacheKey = `atelier77_holidays_${year}`;
  let holidays = [];
  
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      holidays = JSON.parse(cached);
    } else {
      const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/CH`);
      if (response.ok) {
        holidays = await response.json();
        localStorage.setItem(cacheKey, JSON.stringify(holidays));
      } else {
        console.error('Failed to fetch holidays');
      }
    }
  } catch (err) {
    console.error('Error with holiday service', err);
  }

  if (kanton) {
    return holidays.filter(h => !h.counties || h.counties.includes(`CH-${kanton}`));
  }
  return holidays;
}

/**
 * Calculates a business-day-aware due date.
 * Skips weekends and public holidays.
 * 
 * @param {Date} startDate 
 * @param {number} daysToAdd 
 * @param {string} [kanton]
 * @returns {Promise<Date>}
 */
export async function calculateBusinessDueDate(startDate, daysToAdd, kanton) {
  const date = new Date(startDate);
  const startYear = date.getFullYear();
  let holidays = await getHolidays(startYear, kanton);
  
  if (date.getMonth() >= 10) {
    const nextYearHolidays = await getHolidays(startYear + 1, kanton);
    holidays = [...holidays, ...nextYearHolidays];
  }

  const holidayDates = new Set(holidays.map(h => h.date));
  let daysAdded = 0;
  
  while (daysAdded < daysToAdd) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    
    if (day !== 0 && day !== 6) {
      const yearStr = date.getFullYear();
      const monthStr = String(date.getMonth() + 1).padStart(2, '0');
      const dayStr = String(date.getDate()).padStart(2, '0');
      const dateString = `${yearStr}-${monthStr}-${dayStr}`;
      
      if (!holidayDates.has(dateString)) {
        daysAdded++;
      }
    }
  }
  
  return date;
}
