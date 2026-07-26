import { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  WidthType, BorderStyle, AlignmentType, HeadingLevel, PageBreak 
} from 'docx';
import { saveAs } from 'file-saver';

const formatMoney = (val) => {
  return parseFloat(val).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('de-CH', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
};

export const generateOfferteWord = async (offerte, kunde, projekt, settings) => {
  const daten = offerte.daten || {};
  const leistungen = daten.leistungen || [];
  
  let rawTotal = 0;
  let optionenTotal = 0;

  leistungen.forEach(pos => {
    const isInfo = (!pos.menge && pos.menge !== 0) && (!pos.einzelpreis && pos.einzelpreis !== 0);
    const isOption = pos.optional === true;
    
    if (!isInfo) {
      const posTotal = (parseFloat(pos.menge) || 0) * (parseFloat(pos.einzelpreis) || 0);
      if (isOption) {
        optionenTotal += posTotal;
      } else {
        rawTotal += posTotal;
      }
    }
  });

  const rabatt = parseFloat(daten.konditionen?.rabatt || 0);
  const mwst = parseFloat(daten.konditionen?.mwst || 0);

  const rabattBetrag = rawTotal * (rabatt / 100);
  const totalNachRabatt = rawTotal - rabattBetrag;
  const mwstBetrag = totalNachRabatt * (mwst / 100);
  const calculatedTotal = totalNachRabatt + mwstBetrag;
  
  const pauschalpreis = parseFloat(daten.pauschalpreis || 0);
  const isPauschal = pauschalpreis > 0;
  const finalTotal = isPauschal ? pauschalpreis : calculatedTotal;

  // Basic styling
  const gold = 'C5A057';

  // 1. Header & Address
  const addressParagraphs = [
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

  // 2. Meta Table (Title, Date, Project)
  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({ children: [new TextRun({ text: 'Offerte', bold: true, size: 36 })] }),
              new Paragraph({ children: [new TextRun({ text: `Nr. ${offerte.id}`, color: '666666', size: 20 })] })
            ],
            width: { size: 50, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [
              new Paragraph({ alignment: AlignmentType.RIGHT, children: [
                new TextRun({ text: 'Datum: ', color: '888888', size: 19 }),
                new TextRun({ text: formatDate(offerte.created_at), bold: true, size: 19 })
              ]}),
              ...(projekt?.name ? [
                new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 100 }, children: [
                  new TextRun({ text: 'Projekt: ', color: '888888', size: 19 }),
                  new TextRun({ text: projekt.name, bold: true, size: 19 })
                ]})
              ] : [])
            ],
            width: { size: 50, type: WidthType.PERCENTAGE }
          })
        ]
      })
    ]
  });

  // 3. Leistungen Table
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

  // Totals
  const emptyBorder = { bottom: { style: BorderStyle.NONE }, top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } };
  const addTotalRow = (label, amount, isBold = false) => {
    tableRows.push(new TableRow({
      children: [
        new TableCell({ columnSpan: 4, children: [], borders: emptyBorder }),
        new TableCell({ children: [new Paragraph({ text: label, style: isBold ? 'ItemTextBold' : 'ItemText' })], borders: emptyBorder }),
        new TableCell({ children: [new Paragraph({ text: amount, style: isBold ? 'ItemTextBold' : 'ItemText', alignment: AlignmentType.RIGHT })], borders: emptyBorder })
      ]
    }));
  };

  tableRows.push(new TableRow({ children: [new TableCell({ columnSpan: 6, children: [], borders: { top: { style: BorderStyle.SINGLE, color: gold }, bottom: { style: BorderStyle.NONE } } })] }));

  if (!isPauschal) {
    addTotalRow('Zwischentotal', `CHF ${formatMoney(rawTotal)}`);
    if (rabatt > 0) addTotalRow(`Rabatt (${formatMoney(rabatt)}%)`, `– CHF ${formatMoney(rabattBetrag)}`);
    if (rabatt > 0) addTotalRow('Total exkl. MwSt.', `CHF ${formatMoney(totalNachRabatt)}`, true);
    if (mwst > 0) addTotalRow(`MwSt. ({formatMoney(mwst)}%)`, `+ CHF ${formatMoney(mwstBetrag)}`);
  }

  // Final Total Row with bold styling
  tableRows.push(new TableRow({
    children: [
      new TableCell({ columnSpan: 4, children: [], borders: emptyBorder }),
      new TableCell({ children: [new Paragraph({ text: isPauschal ? 'Pauschalpreis' : 'TOTAL', style: 'TotalBold' })], borders: { top: { style: BorderStyle.SINGLE, color: gold, size: 12 }, bottom: { style: BorderStyle.SINGLE, color: gold, size: 12 } } }),
      new TableCell({ children: [new Paragraph({ text: `CHF ${formatMoney(finalTotal)}`, style: 'TotalBold', alignment: AlignmentType.RIGHT })], borders: { top: { style: BorderStyle.SINGLE, color: gold, size: 12 }, bottom: { style: BorderStyle.SINGLE, color: gold, size: 12 } } })
    ]
  }));

  const leistungenTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
    rows: tableRows
  });

  const doc = new Document({
    styles: {
      paragraphStyles: [
        { id: 'Normal', name: 'Normal', run: { font: 'Helvetica Neue', size: 22, color: '1A1A1A' }, paragraph: { spacing: { line: 360 } } },
        { id: 'TableHeader', name: 'Table Header', run: { bold: true, size: 16, color: '555555' }, paragraph: { spacing: { before: 100, after: 100 } } },
        { id: 'CategoryText', name: 'Category Text', run: { bold: true, size: 20 }, paragraph: { spacing: { before: 200, after: 50 } } },
        { id: 'ItemText', name: 'Item Text', run: { size: 19 }, paragraph: { spacing: { before: 100, after: 100 } } },
        { id: 'ItemTextOption', name: 'Item Text Option', run: { size: 19, color: '888888' }, paragraph: { spacing: { before: 100, after: 100 } } },
        { id: 'ItemTextBold', name: 'Item Text Bold', run: { bold: true, size: 19 }, paragraph: { spacing: { before: 100, after: 100 } } },
        { id: 'DetailText', name: 'Detail Text', run: { size: 16, color: '666666' }, paragraph: { spacing: { before: 0, after: 100 } } },
        { id: 'TotalBold', name: 'Total Bold', run: { bold: true, size: 23 }, paragraph: { spacing: { before: 150, after: 150 } } }
      ]
    },
    sections: [{
      properties: {
        page: { margin: { top: 1134, right: 1417, bottom: 1417, left: 1417 } } // 20mm, 25mm, 25mm, 25mm approx (in twips)
      },
      children: [
        ...addressParagraphs,
        metaTable,
        new Paragraph({ spacing: { before: 400, after: 400 }, children: [new TextRun({ text: daten.einleitungstext || 'Gerne unterbreiten wir Ihnen folgende Offerte:' })] }),
        leistungenTable,
        new Paragraph({ spacing: { before: 800, after: 400 }, children: [new TextRun({ text: daten.schlusstext || 'Wir danken Ihnen für das Vertrauen und stehen für Fragen gerne zur Verfügung.' })] }),
        new Paragraph({ text: 'Freundliche Grüsse' }),
        new Paragraph({ spacing: { before: 600 }, children: [new TextRun({ text: settings?.firmenname || 'Leandro Lüthi', bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: settings?.website || 'Malerei Leandro Lüthi – Atelier 77', color: '888888', size: 17 })] })
      ]
    }]
  });

  Packer.toBlob(doc).then(blob => {
    saveAs(blob, `Offerte_${offerte.id}_Atelier77.docx`);
  });
};
