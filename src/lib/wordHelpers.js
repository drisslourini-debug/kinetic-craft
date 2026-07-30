/**
 * Shared Word document generation helpers for Offerten and Rechnungen.
 * Extracts identical code from wordGenerator.js and rechnungWordGenerator.js.
 */
import {
  Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType
} from 'docx';
import { formatMoney } from './formatters';

/** Brand color used across document styling */
export const COLOR_GOLD = 'C5A057';

/** No-border config for total summary rows */
const EMPTY_BORDER = {
  bottom: { style: BorderStyle.NONE },
  top: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE },
  right: { style: BorderStyle.NONE }
};

/**
 * Standard paragraph styles shared by all Atelier 77 Word documents.
 */
export const WORD_PARAGRAPH_STYLES = [
  { id: 'Normal', name: 'Normal', run: { font: 'Helvetica Neue', size: 22, color: '1A1A1A' }, paragraph: { spacing: { line: 360 } } },
  { id: 'TableHeader', name: 'Table Header', run: { bold: true, size: 16, color: '555555' }, paragraph: { spacing: { before: 100, after: 100 } } },
  { id: 'CategoryText', name: 'Category Text', run: { bold: true, size: 20 }, paragraph: { spacing: { before: 200, after: 50 } } },
  { id: 'ItemText', name: 'Item Text', run: { size: 19 }, paragraph: { spacing: { before: 100, after: 100 } } },
  { id: 'ItemTextOption', name: 'Item Text Option', run: { size: 19, color: '888888' }, paragraph: { spacing: { before: 100, after: 100 } } },
  { id: 'ItemTextBold', name: 'Item Text Bold', run: { bold: true, size: 19 }, paragraph: { spacing: { before: 100, after: 100 } } },
  { id: 'DetailText', name: 'Detail Text', run: { size: 16, color: '666666' }, paragraph: { spacing: { before: 0, after: 100 } } },
  { id: 'TotalBold', name: 'Total Bold', run: { bold: true, size: 23 }, paragraph: { spacing: { before: 150, after: 150 } } }
];

/** Standard page margins (approx. 20mm top, 25mm sides/bottom in twips) */
export const WORD_PAGE_MARGINS = { top: 1134, right: 1417, bottom: 1417, left: 1417 };

/**
 * Generates the address header paragraphs (company line + customer address).
 */
export function generateAddressParagraphs(kunde, settings) {
  return [
    new Paragraph({
      children: [
        new TextRun({ text: `${settings?.firmenname || 'Malerei Leandro Lüthi'} · ${settings?.strasse || 'Landoltstrasse 99'} · ${settings?.plz_ort || '3007 Bern'}`, size: 14, color: '999999' })
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: kunde?.firmenname || '', bold: true, size: 22 })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `${kunde?.vorname || ''} ${kunde?.nachname || ''}`.trim(), size: 22 })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({ text: kunde?.strasse || '', size: 22 })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `${kunde?.plz || ''} ${kunde?.ort || ''}`.trim(), size: 22 })
      ],
      spacing: { after: 800 }
    })
  ];
}

/**
 * Generates the leistungen table with all positions and totals summary.
 * @param {Array} leistungen - Array of position objects
 * @param {Object} totals - Result from calculateDocumentTotals
 * @param {number} rabatt - Discount percentage
 * @param {number} mwst - VAT percentage
 * @returns {Table} The complete leistungen table including totals
 */
export function generateLeistungenTable(leistungen, totals, rabatt, mwst) {
  const { rawTotal, rabattBetrag, totalNachRabatt, mwstBetrag, finalTotal, isPauschal } = totals;
  const gold = COLOR_GOLD;
  const tableRows = [];

  // Table Header
  tableRows.push(new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ text: 'Pos.', style: 'TableHeader' })], borders: { top: { style: BorderStyle.SINGLE, color: gold, size: 12 }, bottom: { style: BorderStyle.SINGLE, color: 'DDDDDD' }} }),
      new TableCell({ children: [new Paragraph({ text: 'Beschreibung', style: 'TableHeader' })], borders: { top: { style: BorderStyle.SINGLE, color: gold, size: 12 }, bottom: { style: BorderStyle.SINGLE, color: 'DDDDDD' }} }),
      new TableCell({ children: [new Paragraph({ text: 'Menge', style: 'TableHeader', alignment: AlignmentType.RIGHT })], borders: { top: { style: BorderStyle.SINGLE, color: gold, size: 12 }, bottom: { style: BorderStyle.SINGLE, color: 'DDDDDD' }} }),
      new TableCell({ children: [new Paragraph({ text: 'Einh.', style: 'TableHeader', alignment: AlignmentType.RIGHT })], borders: { top: { style: BorderStyle.SINGLE, color: gold, size: 12 }, bottom: { style: BorderStyle.SINGLE, color: 'DDDDDD' }} }),
      new TableCell({ children: [new Paragraph({ text: 'Preis/E', style: 'TableHeader', alignment: AlignmentType.RIGHT })], borders: { top: { style: BorderStyle.SINGLE, color: gold, size: 12 }, bottom: { style: BorderStyle.SINGLE, color: 'DDDDDD' }} }),
      new TableCell({ children: [new Paragraph({ text: 'Total', style: 'TableHeader', alignment: AlignmentType.RIGHT })], borders: { top: { style: BorderStyle.SINGLE, color: gold, size: 12 }, bottom: { style: BorderStyle.SINGLE, color: 'DDDDDD' }} })
    ]
  }));

  // Items
  leistungen.forEach((pos, i) => {
    const isInfo = (!pos.menge && pos.menge !== 0) && (!pos.einzelpreis && pos.einzelpreis !== 0);
    const isOption = pos.optional === true;
    const posTotal = isInfo ? 0 : (parseFloat(pos.menge) || 0) * (parseFloat(pos.einzelpreis) || 0);
    const posNr = pos.posNr || (i + 1).toString();

    if (isInfo) {
      tableRows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: posNr, style: 'CategoryText' })], borders: { bottom: { style: BorderStyle.NONE } } }),
          new TableCell({ columnSpan: 5, children: [
            new Paragraph({ text: pos.beschreibung, style: 'CategoryText' }),
            ...(pos.details ? [new Paragraph({ text: pos.details, style: 'DetailText' })] : [])
          ], borders: { bottom: { style: BorderStyle.NONE } } })
        ]
      }));
    } else {
      tableRows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: posNr, style: 'ItemText' })], borders: { bottom: { style: BorderStyle.SINGLE, color: 'EEEEEE' } } }),
          new TableCell({ children: [
            new Paragraph({ children: [
              new TextRun({ text: pos.beschreibung, color: isOption ? '888888' : '1A1A1A' }),
              ...(isOption ? [new TextRun({ text: ' (Option)', color: gold, size: 16 })] : [])
            ] }),
            ...(pos.details ? [new Paragraph({ text: pos.details, style: 'DetailText' })] : [])
          ], borders: { bottom: { style: BorderStyle.SINGLE, color: 'EEEEEE' } } }),
          new TableCell({ children: [new Paragraph({ text: pos.menge ? pos.menge.toString() : '–', style: isOption ? 'ItemTextOption' : 'ItemText', alignment: AlignmentType.RIGHT })], borders: { bottom: { style: BorderStyle.SINGLE, color: 'EEEEEE' } } }),
          new TableCell({ children: [new Paragraph({ text: pos.einheit || '', style: isOption ? 'ItemTextOption' : 'ItemText', alignment: AlignmentType.RIGHT })], borders: { bottom: { style: BorderStyle.SINGLE, color: 'EEEEEE' } } }),
          new TableCell({ children: [new Paragraph({ text: pos.einzelpreis ? formatMoney(pos.einzelpreis) : '–', style: isOption ? 'ItemTextOption' : 'ItemText', alignment: AlignmentType.RIGHT })], borders: { bottom: { style: BorderStyle.SINGLE, color: 'EEEEEE' } } }),
          new TableCell({ children: [new Paragraph({ text: posTotal > 0 ? `CHF ${formatMoney(posTotal)}` : '–', style: isOption ? 'ItemTextOption' : 'ItemText', alignment: AlignmentType.RIGHT })], borders: { bottom: { style: BorderStyle.SINGLE, color: 'EEEEEE' } } })
        ]
      }));
    }
  });

  // Totals separator
  tableRows.push(new TableRow({ children: [new TableCell({ columnSpan: 6, children: [], borders: { top: { style: BorderStyle.SINGLE, color: gold }, bottom: { style: BorderStyle.NONE } } })] }));

  const addTotalRow = (label, amount, isBold = false) => {
    tableRows.push(new TableRow({
      children: [
        new TableCell({ columnSpan: 4, children: [], borders: EMPTY_BORDER }),
        new TableCell({ children: [new Paragraph({ text: label, style: isBold ? 'ItemTextBold' : 'ItemText' })], borders: EMPTY_BORDER }),
        new TableCell({ children: [new Paragraph({ text: amount, style: isBold ? 'ItemTextBold' : 'ItemText', alignment: AlignmentType.RIGHT })], borders: EMPTY_BORDER })
      ]
    }));
  };

  if (!isPauschal) {
    addTotalRow('Zwischentotal', `CHF ${formatMoney(rawTotal)}`);
    if (rabatt > 0) addTotalRow(`Rabatt (${formatMoney(rabatt)}%)`, `– CHF ${formatMoney(rabattBetrag)}`);
    if (rabatt > 0) addTotalRow('Total exkl. MwSt.', `CHF ${formatMoney(totalNachRabatt)}`, true);
    if (mwst > 0) addTotalRow(`MwSt. (${formatMoney(mwst)}%)`, `+ CHF ${formatMoney(mwstBetrag)}`);
  }

  // Final Total Row
  tableRows.push(new TableRow({
    children: [
      new TableCell({ columnSpan: 4, children: [], borders: EMPTY_BORDER }),
      new TableCell({ children: [new Paragraph({ text: isPauschal ? 'Pauschalpreis' : 'TOTAL', style: 'TotalBold' })], borders: { top: { style: BorderStyle.SINGLE, color: gold, size: 12 }, bottom: { style: BorderStyle.SINGLE, color: gold, size: 12 } } }),
      new TableCell({ children: [new Paragraph({ text: `CHF ${formatMoney(finalTotal)}`, style: 'TotalBold', alignment: AlignmentType.RIGHT })], borders: { top: { style: BorderStyle.SINGLE, color: gold, size: 12 }, bottom: { style: BorderStyle.SINGLE, color: gold, size: 12 } } })
    ]
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
    rows: tableRows
  });
}

/**
 * Generates the footer paragraphs (greeting + company name + website).
 */
export function generateFooter(settings) {
  return [
    new Paragraph({ text: 'Freundliche Grüsse' }),
    new Paragraph({ spacing: { before: 600 }, children: [new TextRun({ text: settings?.firmenname || 'Leandro Lüthi', bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: settings?.website || 'Malerei Leandro Lüthi – Atelier 77', color: '888888', size: 17 })] })
  ];
}
