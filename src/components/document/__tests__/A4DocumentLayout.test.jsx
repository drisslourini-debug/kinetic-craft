import { describe, it, expect } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import {
  paginateDocument,
  paginateMahnung,
  FoldAndPunchMarks,
  ContinuationHeader,
  DocumentFooter,
  PositionsTableBody
} from '../A4DocumentLayout'

describe('A4DocumentLayout - paginateDocument', () => {
  it('keeps short documents on a single page', () => {
    const items = [
      { id: '1', beschreibung: 'Beratungsgespräch vor Ort', menge: 2, einzelpreis: 140 },
      { id: '2', beschreibung: 'Materialbeschaffung', menge: 1, einzelpreis: 80 }
    ]

    const pages = paginateDocument(items, {
      introText: 'Vielen Dank für Ihre Anfrage.',
      hasAusfuehrung: false,
      hasSchlusstext: true,
      hasSignature: true
    })

    expect(pages.length).toBe(1)
    expect(pages[0].length).toBe(2)
  })

  it('splits items across multiple pages when items exceed page 1 capacity', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({
      id: String(i + 1),
      posNr: String(i + 1),
      beschreibung: `Standard Position ${i + 1} mit detaillierter Beschreibung über Arbeitsaufwand`,
      menge: 1,
      einzelpreis: 100
    }))

    const pages = paginateDocument(items, {
      introText: 'Standard Einleitungstext für Offerte.',
      hasSignature: true
    })

    expect(pages.length).toBeGreaterThan(1)
    const totalItems = pages.reduce((acc, p) => acc + p.length, 0)
    expect(totalItems).toBe(25)
  })

  it('respects manual page break (pos.page_break === true)', () => {
    const items = [
      { id: '1', beschreibung: 'Pos 1 auf Seite 1', menge: 1, einzelpreis: 100 },
      { id: '2', beschreibung: 'Pos 2 auf Seite 2', menge: 1, einzelpreis: 100, page_break: true },
      { id: '3', beschreibung: 'Pos 3 auf Seite 2', menge: 1, einzelpreis: 100 }
    ]

    const pages = paginateDocument(items)
    expect(pages.length).toBe(2)
    expect(pages[0].length).toBe(1)
    expect(pages[0][0].id).toBe('1')
    expect(pages[1].length).toBe(2)
    expect(pages[1][0].id).toBe('2')
  })

  it('prevents orphan category titles at the bottom of a page', () => {
    const items = [
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `pos-${i}`,
        beschreibung: `Ausführliche Arbeitsposition Nummer ${i + 1} mit weiteren Details`,
        menge: 2,
        einzelpreis: 150
      })),
      { id: 'title-1', type: 'title', beschreibung: 'Neue Projektphase (Kategorie)' },
      { id: 'pos-next', beschreibung: 'Erste Position der neuen Phase', menge: 1, einzelpreis: 200 }
    ]

    const pages = paginateDocument(items, {
      introText: 'Langer Einleitungstext zur Offerte mit mehreren Konditionen und Absprachen.',
      hasSignature: true
    })

    pages.forEach((page, pIdx) => {
      if (page.length > 0 && pIdx < pages.length - 1) {
        const lastItem = page[page.length - 1]
        expect(lastItem.type).not.toBe('title')
      }
    })
  })

  it('handles empty items array gracefully', () => {
    const pages = paginateDocument([])
    expect(pages.length).toBe(1)
    expect(pages[0]).toEqual([])
  })
})

describe('A4DocumentLayout - Visual Components', () => {
  it('renders DIN 5008 fold and punch marks', () => {
    const { container } = render(<FoldAndPunchMarks />)
    expect(container.querySelector('[title="Faltmarke 1"]')).toBeTruthy()
    expect(container.querySelector('[title="Lochmarke (Mitte)"]')).toBeTruthy()
    expect(container.querySelector('[title="Faltmarke 2"]')).toBeTruthy()
  })

  it('renders ContinuationHeader with doc info', () => {
    render(
      <ContinuationHeader
        docType="Offerte"
        docNr="OFF-2026-001"
        date="15. März 2026"
        projektName="Umbau Büro"
      />
    )
    expect(screen.getByText(/OFF-2026-001/i)).toBeTruthy()
    expect(screen.getByText(/Umbau Büro/i)).toBeTruthy()
  })

  it('renders DocumentFooter with UID and MWST suffix even when settings uses uid instead of uid_nummer', () => {
    render(
      <DocumentFooter
        pageNum={1}
        totalPages={2}
        settings={{
          firmenname: 'Muster Malerei Bern AG',
          uid: 'CHE-123.456.789',
          strasse: 'Dorfstrasse 10',
          plz_ort: '3000 Bern'
        }}
        brandColor="#c5a057"
      />
    )
    expect(screen.getByText(/UID: CHE-123.456.789 MWST/i)).toBeTruthy()
  })

  it('renders negative position totals correctly (e.g. Akonto deduction)', () => {
    const items = [
      { id: '1', posNr: '1.1', beschreibung: 'Geleistete Akontozahlung', menge: 1, einzelpreis: -500 }
    ]
    const { container } = render(
      <table>
        <PositionsTableBody items={items} />
      </table>
    )
    expect(container.textContent).toContain('-500.00')
    expect(container.textContent).not.toContain('–')
  })
})

describe('A4DocumentLayout - paginateMahnung', () => {
  it('keeps short dunning letter on a single page', () => {
    const pages = paginateMahnung({
      einleitung: 'Wir erlauben uns, Sie freundlich an die Begleichung der Rechnung zu erinnern.',
      hasBisherigeZahlung: false,
      hasSpesen: false,
      hasVerzugszins: false,
      mahnhinweis: '',
      schlussformel: 'Besten Dank für Ihre prompte Überweisung.',
      hasSignature: true
    })

    expect(pages.length).toBe(1)
    expect(pages[0].showForderungen).toBe(true)
    expect(pages[0].showClosing).toBe(true)
  })

  it('splits full Stufe 3 dunning letter with SchKG warning across 2 pages without orphan closing', () => {
    const pages = paginateMahnung({
      einleitung: 'Trotz mehrfacher Mahnungen ist die Forderung aus der Rechnung RE-2026-3002 noch immer nicht beglichen worden.\n\nWir setzen Ihnen hiermit eine letzte Frist bis zum 13.10.2026 zur Begleichung des Gesamtbetrags.',
      hasBisherigeZahlung: true,
      hasSpesen: true,
      hasVerzugszins: true,
      mahnhinweis: 'WICHTIGER RECHTSHINWEIS:\nSollte die Zahlung bis zum genannten Datum nicht bei uns eingegangen sein, werden wir ohne weitere Vorankündigung das offizielle BETREIBUNGSBEGEHREN beim zuständigen Betreibungsamt nach Art. 67 SchKG einreichen.',
      schlussformel: 'Nutzen Sie diese letzte Gelegenheit zur gütlichen Einigung und Vermeidung eines Betreibungsverfahrens.',
      hasSignature: true
    })

    expect(pages.length).toBe(2)
    // Page 1 has intro and claims table
    expect(pages[0].showForderungen).toBe(true)
    expect(pages[0].showHinweis).toBe(false)
    expect(pages[0].showClosing).toBe(false)

    // Page 2 has legal warning and closing signature
    expect(pages[1].showForderungen).toBe(false)
    expect(pages[1].showHinweis).toBe(true)
    expect(pages[1].showClosing).toBe(true)
  })

  it('respects forcePageBreak', () => {
    const pages = paginateMahnung({
      einleitung: 'Kurzer Text',
      schlussformel: 'Kurzer Schluss',
      forcePageBreak: true
    })

    expect(pages.length).toBe(2)
  })
})

