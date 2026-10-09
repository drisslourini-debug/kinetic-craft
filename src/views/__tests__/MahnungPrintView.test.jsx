import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import MahnungPrintView from '../MahnungPrintView'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
        }))
      })),
      insert: vi.fn().mockResolvedValue({ error: null })
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.supabase.co/file.pdf' } })
      }))
    }
  }
}))

vi.mock('../../lib/pdfGenerator', () => ({
  generatePdf: vi.fn().mockResolvedValue(new Blob(['dummy pdf'], { type: 'application/pdf' }))
}))

vi.mock('swissqrbill/svg', () => ({
  SwissQRBill: class {
    toString() {
      return '<svg data-testid="qr-bill-svg"></svg>'
    }
  }
}))

describe('MahnungPrintView - Autoabschnitt & Layout', () => {
  const dummySettings = {
    firmenname: 'Muster Malerei Bern AG',
    strasse: 'Dorfstrasse 10',
    plz: '3000',
    ort: 'Bern',
    email: 'info@muster-malerei.ch',
    primary_color: '#c5a057',
    qr_iban: 'CH4431999123000889012'
  }

  const dummyKunde = {
    id: 'kunde-1',
    firmenname: 'Immo Test AG',
    vorname: 'Thomas',
    nachname: 'Muster',
    strasse: 'Musterstrasse 44',
    plz: '8000',
    ort: 'Zürich'
  }

  const dummyRechnung = {
    id: 3002,
    rechnung_nr: 'RE-2026-3002',
    total: 9783.05,
    bezahlt: 0,
    faellig_am: '2026-09-01',
    rechnungsdatum: '2026-08-01'
  }

  it('renders short Mahnung on 1 letter page plus QR-Bill (Total 2 pages)', () => {
    const shortMahnung = {
      stufe: 1,
      titel: 'Zahlungserinnerung',
      datum: '2026-10-08',
      fristDatum: '2026-10-18',
      restbetrag: 9783.05,
      spesen: 0,
      verzugszins: 0,
      gesamtforderung: 9783.05,
      betreff: 'Zahlungserinnerung zu Rechnung RE-2026-3002',
      einleitung: 'Wir erlauben uns, Sie freundlich an die ausstehende Rechnung zu erinnern.',
      mahnhinweis: '',
      schlussformel: 'Besten Dank für Ihre Überweisung.'
    }

    const { container } = render(
      <MahnungPrintView
        rechnung={dummyRechnung}
        mahnung={shortMahnung}
        kunde={dummyKunde}
        settings={dummySettings}
        onClose={vi.fn()}
      />
    )

    // Should find 2 A4 pages total (1 letter + 1 QR Bill)
    const pages = container.querySelectorAll('.a4-page')
    expect(pages.length).toBe(2)

    // First page should have "Seite 1 von 2"
    expect(pages[0].textContent).toContain('Seite 1 von 2')
    // Second page (QR Bill) should have "Seite 2 von 2"
    expect(pages[1].textContent).toContain('Seite 2 von 2')

    // Document header, meta, and Forderungsaufstellung are rendered
    expect(screen.getByText(/Zahlungserinnerung zu Rechnung RE-2026-3002/i)).toBeTruthy()
    expect(screen.getByText(/Forderungsaufstellung nach Schweizer Recht/i)).toBeTruthy()
  })

  it('intelligently paginates full Stufe 3 Mahnung with SchKG warning into 2 letter pages plus QR Bill (Total 3 pages)', () => {
    const stufe3Mahnung = {
      stufe: 3,
      titel: 'Letzte Mahnung vor Betreibung',
      datum: '2026-10-08',
      fristDatum: '2026-10-13',
      restbetrag: 9783.05,
      spesen: 30.00,
      verzugszins: 9.50,
      verzugstage: 7,
      gesamtforderung: 9822.55,
      betreff: 'LETZTE MAHNUNG vor Betreibung zu Rechnung RE-2026-3002',
      einleitung: 'Trotz mehrfacher Mahnungen ist die Forderung aus der Rechnung RE-2026-3002 noch immer nicht beglichen worden.\n\nWir setzen Ihnen hiermit eine letzte Frist bis zum 13.10.2026 zur Begleichung des offenen Gesamtbetrags inklusive Mahnspesen und Verzugszins.',
      mahnhinweis: 'WICHTIGER RECHTSHINWEIS:\nSollte die Zahlung bis zum genannten Datum nicht bei uns eingegangen sein, werden wir ohne weitere Vorankündigung das offizielle BETREIBUNGSBEGEHREN beim zuständigen Betreibungsamt nach Art. 67 SchKG einreichen.',
      schlussformel: 'Nutzen Sie diese letzte Gelegenheit zur gütlichen Einigung und Vermeidung eines Betreibungsverfahrens.'
    }

    const { container } = render(
      <MahnungPrintView
        rechnung={dummyRechnung}
        mahnung={stufe3Mahnung}
        kunde={dummyKunde}
        settings={dummySettings}
        onClose={vi.fn()}
      />
    )

    // Should find 3 A4 pages total (2 letter pages + 1 QR Bill)
    const pages = container.querySelectorAll('.a4-page')
    expect(pages.length).toBe(3)

    // Footers must show exact page numbers
    expect(pages[0].textContent).toContain('Seite 1 von 3')
    expect(pages[1].textContent).toContain('Seite 2 von 3')
    expect(pages[2].textContent).toContain('Seite 3 von 3')

    // Page 1 has Betreff, Einleitung, and Forderungsaufstellung
    expect(pages[0].textContent).toContain('LETZTE MAHNUNG vor Betreibung zu Rechnung RE-2026-3002')
    expect(pages[0].textContent).toContain('Forderungsaufstellung nach Schweizer Recht')
    expect(pages[0].textContent).toContain('Neues Gesamttotal der Forderung:')
    expect(pages[0].textContent).toContain('9’822.55')

    // Page 2 has ContinuationHeader, SchKG warning notice, and closing signature
    expect(pages[1].textContent).toContain('RE-2026-3002')
    expect(pages[1].textContent).toContain('WICHTIGER RECHTSHINWEIS')
    expect(pages[1].textContent).toContain('Art. 67 SchKG')
    expect(pages[1].textContent).toContain('Freundliche Grüsse')

    // Page 3 has QR-Bill
    expect(pages[2].textContent).toContain('Zahlteil & Empfangsschein')
  })

  it('renders zoom controls and action buttons', () => {
    const handleClose = vi.fn()
    render(
      <MahnungPrintView
        rechnung={dummyRechnung}
        mahnung={{ stufe: 1, titel: 'Mahnung' }}
        kunde={dummyKunde}
        settings={dummySettings}
        onClose={handleClose}
      />
    )

    // Check Action Bar buttons
    expect(screen.getByRole('button', { name: /PDF herunterladen/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /E-Mail/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Archivieren/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Drucken/i })).toBeTruthy()

    // Check Zoom controls
    expect(screen.getByTitle(/Verkleinern/i)).toBeTruthy()
    expect(screen.getByTitle(/Vergrössern/i)).toBeTruthy()
    expect(screen.getByTitle(/Ganze A4-Seite einpassen/i)).toBeTruthy()
    expect(screen.getByTitle(/100% Originalgrösse/i)).toBeTruthy()

    // Back / Close
    const closeBtn = screen.getByTitle('Schliessen')
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
