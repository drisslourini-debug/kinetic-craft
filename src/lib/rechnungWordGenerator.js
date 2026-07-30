import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType
} from 'docx';
import { saveAs } from 'file-saver';
import { formatMoney, formatDateLong } from './formatters';
import { calculateDocumentTotals } from './calculations';
import {
  generateAddressParagraphs, generateLeistungenTable, generateFooter,
  WORD_PARAGRAPH_STYLES, WORD_PAGE_MARGINS
} from './wordHelpers';

export const generateRechnungWord = async (rechnung, kunde, projekt, settings, akontoRechnungen = []) => {
  const daten = rechnung.daten || {};
  const leistungen = daten.leistungen || [];

  const totals = calculateDocumentTotals(leistungen, daten.konditionen, daten.pauschalpreis);
  const rabatt = parseFloat(daten.konditionen?.rabatt || 0);
  const mwst = parseFloat(daten.konditionen?.mwst || 0);

  // Akonto / Schluss calculations
  const akontoProzent = parseFloat(rechnung.akonto_prozent || 0);
  const akontoBetrag = (totals.finalTotal * akontoProzent) / 100;
  const totalAkontoBezahlt = akontoRechnungen.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0);
  const verbleibenderRestbetrag = totals.finalTotal - totalAkontoBezahlt;

  // 1. Header & Address
  const addressParagraphs = generateAddressParagraphs(kunde, settings);

  let titel = 'Rechnung';
  if (rechnung.typ === 'akonto') titel = 'Akontorechnung';
  if (rechnung.typ === 'schluss') titel = 'Schlussrechnung';

  // 2. Meta Table (Title, Date, Project, Payment terms)
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
              new Paragraph({ children: [new TextRun({ text: titel, bold: true, size: 36 })] }),
              new Paragraph({ children: [new TextRun({ text: `Nr. ${rechnung.rechnung_nr}`, color: '666666', size: 20 })] })
            ],
            width: { size: 50, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [
              new Paragraph({ alignment: AlignmentType.RIGHT, children: [
                new TextRun({ text: 'Datum: ', color: '888888', size: 19 }),
                new TextRun({ text: formatDateLong(rechnung.rechnungsdatum), bold: true, size: 19 })
              ]}),
              new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 100 }, children: [
                new TextRun({ text: 'Zahlungsfrist: ', color: '888888', size: 19 }),
                new TextRun({ text: `${rechnung.zahlungsfrist_tage || 30} Tage`, bold: true, size: 19 })
              ]}),
              new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 100 }, children: [
                new TextRun({ text: 'Fällig am: ', color: '888888', size: 19 }),
                new TextRun({ text: formatDateLong(rechnung.faellig_am), bold: true, size: 19 })
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
  const leistungenTable = generateLeistungenTable(leistungen, totals, rabatt, mwst);

  // 4. Assemble document children
  const children = [
    ...addressParagraphs,
    metaTable,
    new Paragraph({ spacing: { before: 400, after: 400 }, children: [new TextRun({ text: daten.einleitungstext || 'Gerne stellen wir Ihnen folgende Leistungen in Rechnung:' })] }),
    leistungenTable
  ];

  if (rechnung.typ === 'akonto') {
    children.push(
      new Paragraph({ spacing: { before: 400 }, children: [
        new TextRun({ text: `Akontobetrag (${akontoProzent}%): `, bold: true, size: 23 }),
        new TextRun({ text: `CHF ${formatMoney(akontoBetrag)}`, bold: true, size: 23 })
      ] })
    );
  }

  if (rechnung.typ === 'schluss' && akontoRechnungen.length > 0) {
    children.push(new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: 'Bereits bezahlte Akontozahlungen:', bold: true, size: 19 })] }));
    akontoRechnungen.forEach(ar => {
      children.push(new Paragraph({ children: [new TextRun({ text: `${ar.rechnung_nr} vom ${formatDateLong(ar.rechnungsdatum)}: – CHF ${formatMoney(ar.total || 0)}`, color: '555555' })] }));
    });
    children.push(
      new Paragraph({ spacing: { before: 200 }, children: [
        new TextRun({ text: 'Verbleibender Restbetrag: ', bold: true, size: 23 }),
        new TextRun({ text: `CHF ${formatMoney(verbleibenderRestbetrag)}`, bold: true, size: 23 })
      ] })
    );
  }

  if (settings?.bankverbindung) {
    children.push(
      new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: 'Bankverbindung für Ihre Zahlung:', bold: true, size: 19 })] }),
      new Paragraph({ children: [new TextRun({ text: settings.bankverbindung, size: 19 })] })
    );
  }

  children.push(
    new Paragraph({ spacing: { before: 800, after: 400 }, children: [new TextRun({ text: daten.schlusstext || 'Wir danken Ihnen für den Auftrag und stehen für Fragen gerne zur Verfügung.' })] }),
    ...generateFooter(settings)
  );

  const doc = new Document({
    styles: { paragraphStyles: WORD_PARAGRAPH_STYLES },
    sections: [{
      properties: {
        page: { margin: WORD_PAGE_MARGINS }
      },
      children: children
    }]
  });

  Packer.toBlob(doc).then(blob => {
    saveAs(blob, `Rechnung_${rechnung.rechnung_nr}_Atelier77.docx`);
  });
};
