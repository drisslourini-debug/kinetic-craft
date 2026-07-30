/**
 * Shared constants for the Atelier 77 Dashboard.
 */

/**
 * Default service catalog used as fallback when no database catalog is loaded.
 * Contains standard categories and services for a Swiss painting/plastering business.
 */
export const DEFAULT_CATALOG = {
  Malerarbeiten: [
    { titel: 'Wände streichen (Dispersion, 2x Anstrich)', einheit: 'm²', preis: 22.50 },
    { titel: 'Decke streichen (Dispersion, 2x Anstrich)', einheit: 'm²', preis: 26.00 },
    { titel: 'Türen und Zargen lackieren', einheit: 'Stk', preis: 185.00 },
    { titel: 'Abrieb/Putz streichen (Mineralfarbe)', einheit: 'm²', preis: 28.00 },
    { titel: 'Holzwerk aussen (Dachuntersicht) schleifen & streichen', einheit: 'm²', preis: 32.00 }
  ],
  Gipserarbeiten: [
    { titel: 'Weissputz aufziehen (Qualität Q3)', einheit: 'm²', preis: 38.00 },
    { titel: 'Risssanierung inkl. Netzeinbettung', einheit: 'lfm', preis: 18.50 },
    { titel: 'Eckschutzschienen setzen', einheit: 'lfm', preis: 14.00 },
    { titel: 'Grundputz auf Mauerwerk', einheit: 'm²', preis: 45.00 },
    { titel: 'Leibungen spachteln und schleifen', einheit: 'lfm', preis: 22.00 }
  ],
  Fassadenarbeiten: [
    { titel: 'Fassade Hochdruckreinigen (inkl. Fungizid)', einheit: 'm²', preis: 8.50 },
    { titel: 'Fassadenanstrich (Silikonharz, 2x)', einheit: 'm²', preis: 42.00 },
    { titel: 'Fassadenrisse sanieren', einheit: 'lfm', preis: 22.00 },
    { titel: 'Gerüstbau (Richtpreis/Pauschal)', einheit: 'Pauschal', preis: 2500.00 }
  ],
  'Spezialgebiete & Kreatives': [
    { titel: 'Graffitientfernung', einheit: 'm²', preis: 55.00 },
    { titel: 'Schimmelentfernung und Sanierung', einheit: 'm²', preis: 65.00 },
    { titel: 'Industriebodenbeschichtung (Epoxid)', einheit: 'm²', preis: 75.00 },
    { titel: 'Dekorative Spachteltechnik (z.B. Stucco)', einheit: 'm²', preis: 140.00 },
    { titel: 'Strassen- / Parkplatzmarkierungen', einheit: 'lfm', preis: 15.00 },
    { titel: 'Farbberatung vor Ort', einheit: 'Pauschal', preis: 150.00 }
  ],
  Regietarife: [
    { titel: 'Facharbeiter (Maler/Gipser)', einheit: 'Std', preis: 85.00 },
    { titel: 'Hilfskraft / Lehrling', einheit: 'Std', preis: 55.00 },
    { titel: 'Anfahrt / Fahrzeugspesen', einheit: 'Pauschal', preis: 120.00 }
  ],
  Diverses: [
    { titel: 'Allgemeine Abdeckarbeiten (Floorliner, Folie)', einheit: 'Pauschal', preis: 250.00 },
    { titel: 'Umgebung schützen & abdecken', einheit: 'Pauschal', preis: 180.00 },
    { titel: 'Entsorgung (Material und Gebühren)', einheit: 'Pauschal', preis: 150.00 }
  ]
}

/**
 * Available units for line items.
 */
export const EINHEITEN = ['m²', 'Std', 'lfm', 'Stk', 'Pauschal']
