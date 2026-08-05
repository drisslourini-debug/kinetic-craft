import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType
} from 'docx';
import { saveAs } from 'file-saver';
import { formatDateLong } from './formatters';
import { calculateDocumentTotals } from './calculations';
import {
  generateAddressParagraphs, generateLeistungenTable, generateFooter,
  WORD_PARAGRAPH_STYLES, WORD_PAGE_MARGINS
} from './wordHelpers';

export const generateOfferteWord = async (offerte, kunde, projekt, settings) => {
  const daten = offerte.daten || {};
  const leistungen = daten.leistungen || [];

  const totals = calculateDocumentTotals(leistungen, daten.konditionen, daten.pauschalpreis);
  const rabatt = parseFloat(daten.konditionen?.rabatt || 0);
  const mwst = parseFloat(daten.konditionen?.mwst || 0);

  // 1. Header & Address
  const addressParagraphs = generateAddressParagraphs(kunde, settings);

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
                new TextRun({ text: formatDateLong(offerte.created_at), bold: true, size: 19 })
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

  // 3. Leistungen Table (shared helper)
  const leistungenTable = generateLeistungenTable(leistungen, totals, rabatt, mwst, settings);

  const doc = new Document({
    styles: { paragraphStyles: WORD_PARAGRAPH_STYLES },
    sections: [{
      properties: {
        page: { margin: WORD_PAGE_MARGINS }
      },
      children: [
        ...addressParagraphs,
        metaTable,
        new Paragraph({ spacing: { before: 400, after: 400 }, children: [new TextRun({ text: daten.einleitungstext || 'Gerne unterbreiten wir Ihnen folgende Offerte:' })] }),
        leistungenTable,
        new Paragraph({ spacing: { before: 800, after: 400 }, children: [new TextRun({ text: daten.schlusstext || 'Wir danken Ihnen für das Vertrauen und stehen für Fragen gerne zur Verfügung.' })] }),
        ...generateFooter(settings)
      ]
    }]
  });

  Packer.toBlob(doc).then(blob => {
    saveAs(blob, `Offerte_${offerte.id}_${settings?.firmenname || 'CRM'}.docx`.replace(/\s+/g, '_'));
  });
};
