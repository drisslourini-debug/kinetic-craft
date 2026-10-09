import React from 'react'
import { formatDate, formatDateLong, formatMoney } from '../../lib/formatters'
import { calculateSia118Schlussrechnung, roundToFiveRappen } from '../../lib/sia118Helper'
import { calculateAusmassLine, calculateAusmassTotal, formatAusmassMasskette } from '../../lib/ausmassHelper'

/**
 * Intelligent pagination algorithm for A4 documents (Offerten & Rechnungen).
 * Divides line items across physical A4 pages considering:
 * - Header & address overhead on Page 1
 * - Continuation header overhead on Page 2+
 * - Closing block (Totals, conditions, signature)
 * - Avoids orphan category titles (keeps title with next item)
 * - Avoids orphan closing blocks (moves 1-2 items to final page with totals)
 * - Respects manual page breaks (`pos.page_break === true`)
 */
export function paginateDocument(items = [], options = {}) {
  const {
    introText = '',
    hasAusfuehrung = false,
    hasSchlusstext = true,
    hasSignature = true,
  } = options

  // Available height in mm for line items:
  // Page 1: 297mm total - 40mm margins (top/bottom) - 12mm footer - ~120mm header/address/title/intro = ~125mm
  const introExtraLines = Math.max(0, Math.ceil(((introText || '').length - 80) / 70))
  const page1Available = Math.max(70, 125 - (introExtraLines * 5))
  // Page 2+: 297mm total - 40mm margins - 12mm footer - ~25mm compact header = ~220mm
  const page2Available = 220

  // Closing block height estimate
  let closingHeight = 35 // Totals table
  if (hasAusfuehrung) closingHeight += 12
  if (hasSchlusstext) closingHeight += 15
  if (hasSignature) closingHeight += 30

  const pages = []
  let currentPageItems = []
  let currentUsedHeight = 0
  let isFirstPage = true

  const getItemHeight = (pos) => {
    if (pos.type === 'title') {
      const detailLines = pos.details ? Math.ceil(pos.details.length / 60) : 0
      return 12 + (detailLines * 4.5)
    }
    const descLines = Math.max(1, Math.ceil((pos.beschreibung || '').length / 45))
    const detailLines = pos.details ? Math.ceil(pos.details.length / 60) : 0
    return 8.5 + ((descLines - 1) * 4) + (detailLines * 4)
  }

  for (let i = 0; i < items.length; i++) {
    const pos = items[i]
    const itemHeight = getItemHeight(pos)
    const pageCapacity = isFirstPage ? page1Available : page2Available
    const forceBreak = pos.page_break === true && currentPageItems.length > 0
    // If pos is a category title, ensure there is room for the title PLUS at least one position (~12mm)
    const minNeededHeight = pos.type === 'title' ? (itemHeight + 12) : itemHeight

    if (forceBreak || (currentUsedHeight + minNeededHeight > pageCapacity)) {
      // Don't leave a category title alone at the bottom of a page
      if (currentPageItems.length > 0 && currentPageItems[currentPageItems.length - 1].type === 'title') {
        const lastTitle = currentPageItems.pop()
        pages.push(currentPageItems)
        currentPageItems = [lastTitle, pos]
        isFirstPage = false
        currentUsedHeight = getItemHeight(lastTitle) + itemHeight
      } else {
        pages.push(currentPageItems)
        currentPageItems = [pos]
        isFirstPage = false
        currentUsedHeight = itemHeight
      }
    } else {
      currentPageItems.push(pos)
      currentUsedHeight += itemHeight
    }
  }

  // Check if closing block fits on the current page
  const finalPageCapacity = isFirstPage ? page1Available : page2Available
  if (currentUsedHeight + closingHeight > finalPageCapacity) {
    // Closing block doesn't fit on current page -> push to new page
    // Prevent orphan closing: if current page has > 2 items, move items over
    if (currentPageItems.length > 2) {
      const movedItems = [currentPageItems.pop()]
      // Never leave a category title stranded as the last item on the previous page
      if (currentPageItems.length > 0 && currentPageItems[currentPageItems.length - 1].type === 'title') {
        movedItems.unshift(currentPageItems.pop())
      }
      pages.push(currentPageItems)
      currentPageItems = movedItems
    } else {
      pages.push(currentPageItems)
      currentPageItems = []
    }
  }

  pages.push(currentPageItems)
  return pages
}

/**
 * Intelligent pagination algorithm for Mahnungen (Dunning letters).
 * Distributes letter sections across physical A4 pages:
 * - Page 1: Header, Address window, Mahnungs-Meta, Betreff, and letter text
 * - Forderungsaufstellung (claims & costs breakdown)
 * - Rechtshinweis / SchKG warning box
 * - Schlussformel & Signatur
 * 
 * Guarantees that:
 * - Content never overflows into the pinned A4 footer
 * - Avoids orphan closing/signature block (keeps it paired with Rechtshinweis or Forderungsaufstellung)
 * - Computes clean multi-page breakdown for lengthy legal dunning letters
 */
export function paginateMahnung({
  einleitung = '',
  hasBisherigeZahlung = false,
  hasSpesen = false,
  hasVerzugszins = false,
  mahnhinweis = '',
  schlussformel = '',
  hasSignature = true,
  forcePageBreak = false
} = {}) {
  // Page 1 safe capacity: 152mm (297 - 40 margins - 15 footer clearance - 22 header - 44 address/meta - 14 title - 10 safety)
  const page1Capacity = 152
  // Page 2+ capacity: 215mm (297 - 40 margins - 15 footer clearance - 20 continuation header - 7 safety)
  const page2Capacity = 215

  const rawParagraphs = (einleitung || '')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)

  const paragraphs = rawParagraphs.length > 0 ? rawParagraphs : (einleitung?.trim() ? [einleitung.trim()] : [])

  const calcParagraphHeight = (p) => {
    const lines = Math.max(1, Math.ceil((p || '').length / 75))
    return 4.5 + (lines * 4.6)
  }

  const einleitungTotalHeight = paragraphs.reduce((acc, p) => acc + calcParagraphHeight(p), 0)

  let forderungenHeight = 36
  if (hasBisherigeZahlung) forderungenHeight += 6.5
  if (hasSpesen) forderungenHeight += 6.5
  if (hasVerzugszins) forderungenHeight += 7.5

  const hinweisHeight = mahnhinweis
    ? 10 + (Math.max(1, Math.ceil(mahnhinweis.length / 70)) * 4.4) + 6
    : 0

  const schlussLines = schlussformel ? Math.max(1, Math.ceil(schlussformel.length / 75)) : 1
  const closingHeight = (schlussLines * 4.6) + (hasSignature ? 28 : 16) + 12

  const totalContentHeight = einleitungTotalHeight + forderungenHeight + hinweisHeight + closingHeight

  // Case 1: Fits cleanly on 1 page
  if (!forcePageBreak && totalContentHeight <= page1Capacity) {
    return [
      {
        pageIndex: 0,
        paragraphs,
        showForderungen: true,
        showHinweis: Boolean(mahnhinweis),
        showClosing: true
      }
    ]
  }

  // Case 2: Multi-page
  // Balanced split: Page 1 gets Einleitung + Forderungsaufstellung; Page 2 gets Rechtshinweis + Schlussformel
  const page1WithForderungen = einleitungTotalHeight + forderungenHeight
  if (page1WithForderungen <= page1Capacity && (hinweisHeight > 0 || closingHeight > 0)) {
    return [
      {
        pageIndex: 0,
        paragraphs,
        showForderungen: true,
        showHinweis: false,
        showClosing: false
      },
      {
        pageIndex: 1,
        paragraphs: [],
        showForderungen: false,
        showHinweis: Boolean(mahnhinweis),
        showClosing: true
      }
    ]
  }

  // If Einleitung alone fits on Page 1:
  if (einleitungTotalHeight <= page1Capacity) {
    return [
      {
        pageIndex: 0,
        paragraphs,
        showForderungen: false,
        showHinweis: false,
        showClosing: false
      },
      {
        pageIndex: 1,
        paragraphs: [],
        showForderungen: true,
        showHinweis: Boolean(mahnhinweis),
        showClosing: true
      }
    ]
  }

  // If Einleitung alone exceeds Page 1:
  const page1Paragraphs = []
  const remainingParagraphs = []
  let usedHeight = 0

  for (const p of paragraphs) {
    const pH = calcParagraphHeight(p)
    if (usedHeight + pH <= page1Capacity) {
      page1Paragraphs.push(p)
      usedHeight += pH
    } else {
      remainingParagraphs.push(p)
    }
  }

  return [
    {
      pageIndex: 0,
      paragraphs: page1Paragraphs,
      showForderungen: false,
      showHinweis: false,
      showClosing: false
    },
    {
      pageIndex: 1,
      paragraphs: remainingParagraphs,
      showForderungen: true,
      showHinweis: Boolean(mahnhinweis),
      showClosing: true
    }
  ]
}

/**
 * Swiss DIN 5008 fold & punch marks on the left edge (Page 1 only).
 * Placed at 105mm (top fold), 148.5mm (center punch), 210mm (bottom fold).
 */
export function FoldAndPunchMarks() {
  return (
    <div className="absolute left-0 top-0 bottom-0 pointer-events-none print:block">
      {/* Top fold mark for C5 envelope: 105mm from top */}
      <div 
        style={{ position: 'absolute', top: '105mm', left: 0, width: '4mm', height: '0.6px', backgroundColor: '#b0b0b0' }}
        title="Faltmarke 1"
      />
      {/* Center punch mark: 148.5mm from top (exact center of 297mm A4) */}
      <div 
        style={{ position: 'absolute', top: '148.5mm', left: 0, width: '6mm', height: '0.8px', backgroundColor: '#888888' }}
        title="Lochmarke (Mitte)"
      />
      {/* Bottom fold mark: 210mm from top */}
      <div 
        style={{ position: 'absolute', top: '210mm', left: 0, width: '4mm', height: '0.6px', backgroundColor: '#b0b0b0' }}
        title="Faltmarke 2"
      />
    </div>
  )
}

/**
 * Top header on Page 1: Logo left, company details right.
 */
export function DocumentHeader({ settings, brandColor }) {
  const cleanString = (str) => (str || '').replace(/\r?\n/g, ' ').trim()

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8mm' }}>
      <div>
        {settings?.logo_url ? (
          <img 
            src={settings.logo_url} 
            alt={settings?.firmenname} 
            style={{ maxHeight: '15mm', maxWidth: '65mm', objectFit: 'contain' }} 
            crossOrigin="anonymous" 
          />
        ) : (
          <div style={{ fontSize: '18pt', fontWeight: 700, color: brandColor, letterSpacing: '-0.5px' }}>
            {settings?.firmenname || 'Kinetic Craft'}
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right', fontSize: '8.5pt', color: '#555', lineHeight: '1.5' }}>
        <div style={{ fontWeight: 700, color: '#1a1a1a', fontSize: '9pt' }}>{settings?.firmenname || ''}</div>
        <div>{cleanString(settings?.strasse)}</div>
        <div>{cleanString((settings?.plz && settings?.ort) ? `${settings.plz} ${settings.ort}` : settings?.plz_ort)}</div>
        {settings?.telefon && <div style={{ marginTop: '1.5mm' }}>{cleanString(settings.telefon)}</div>}
        {settings?.email && <div>{cleanString(settings.email)}</div>}
        {settings?.website && <div>{cleanString(settings.website)}</div>}
      </div>
    </div>
  )
}

/**
 * Compact continuation header on Page 2+: Small logo/title, document nr, project, date.
 */
export function ContinuationHeader({ docType, docNr, projektName, date, brandColor, settings }) {
  return (
    <div style={{ marginBottom: '6mm', paddingBottom: '2.5mm', borderBottom: `1px solid ${brandColor}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '8.5pt' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3mm' }}>
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Logo" style={{ maxHeight: '6mm', objectFit: 'contain' }} crossOrigin="anonymous" />
          ) : (
            <span style={{ fontWeight: 700, color: brandColor }}>{settings?.firmenname || 'Kinetic Craft'}</span>
          )}
          <span style={{ color: '#1a1a1a', fontWeight: 600 }}>
            {docType} {docNr}
          </span>
          {projektName && (
            <span style={{ color: '#666' }}>
              · Projekt: <strong>{projektName}</strong>
            </span>
          )}
        </div>
        <div style={{ color: '#777', fontSize: '8pt' }}>
          {date}
        </div>
      </div>
    </div>
  )
}

/**
 * Swiss C5 envelope address window on Page 1.
 */
export function AddressWindow({ kunde, settings }) {
  const getAbsender = () => {
    if (settings?.pdf_absenderzeile) return settings.pdf_absenderzeile
    const plzOrt = (settings?.plz && settings?.ort) ? `${settings.plz} ${settings.ort}` : settings?.plz_ort
    return [settings?.firmenname, settings?.strasse, plzOrt].filter(Boolean).join(' • ')
  }

  return (
    <div style={{ marginBottom: '10mm', minHeight: '32mm' }}>
      {/* Absenderzeile über Adresse */}
      <div style={{ 
        fontSize: '7pt', 
        color: '#888', 
        marginBottom: '2mm', 
        borderBottom: '0.5px solid #d1d5db', 
        paddingBottom: '0.8mm', 
        display: 'inline-block',
        maxWidth: '85mm',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {getAbsender()}
      </div>

      {/* Empfänger-Adresse */}
      <div style={{ fontSize: '10pt', lineHeight: '1.55', color: '#1a1a1a' }}>
        {kunde?.firmenname && <div style={{ fontWeight: 700 }}>{kunde.firmenname}</div>}
        {(kunde?.vorname || kunde?.nachname) && (
          <div style={{ fontWeight: kunde?.firmenname ? 500 : 700 }}>
            {kunde?.vorname} {kunde?.nachname}
          </div>
        )}
        {kunde?.strasse && <div>{kunde.strasse}</div>}
        <div>{kunde?.plz} {kunde?.ort}</div>
      </div>
    </div>
  )
}

/**
 * Meta details: Title, Date, Conditions, Project info.
 */
export function DocumentMeta({ docType, docNr, date, konditionen = {}, projekt }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8mm' }}>
      <div>
        <h1 style={{ fontSize: '18pt', fontWeight: 800, margin: '0 0 1mm 0', color: '#111', letterSpacing: '-0.3px' }}>
          {docType}
        </h1>
        <div style={{ fontSize: '9.5pt', color: '#555', fontWeight: 500 }}>
          Nr. {docNr}
        </div>
      </div>

      <div style={{ textAlign: 'right', fontSize: '9pt', lineHeight: '1.6', color: '#333' }}>
        <div><span style={{ color: '#777' }}>Datum:</span> <span style={{ fontWeight: 600 }}>{date}</span></div>
        {konditionen?.gueltigkeit && (
          <div><span style={{ color: '#777' }}>Gültigkeit:</span> <span style={{ fontWeight: 500 }}>{konditionen.gueltigkeit}</span></div>
        )}
        {konditionen?.zahlungsfrist && (
          <div><span style={{ color: '#777' }}>Zahlungsfrist:</span> <span style={{ fontWeight: 500 }}>{konditionen.zahlungsfrist}</span></div>
        )}
        {projekt?.name && (
          <div style={{ marginTop: '1.5mm' }}>
            <span style={{ color: '#777' }}>Projekt:</span> <span style={{ fontWeight: 600 }}>{projekt.name}</span>
            {projekt.adresse && <div style={{ color: '#666', fontSize: '8pt' }}>{projekt.adresse}</div>}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Table header for items. Repeated cleanly on every page.
 */
export function TableHeader({ brandColor }) {
  return (
    <thead>
      <tr>
        <td colSpan={6} style={{ borderTop: `2px solid ${brandColor}`, padding: 0, height: '2mm' }}></td>
      </tr>
      <tr style={{ fontSize: '7.5pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555' }}>
        <th style={{ padding: '2mm 1.5mm', textAlign: 'left', width: '12mm' }}>Pos.</th>
        <th style={{ padding: '2mm 1.5mm', textAlign: 'left' }}>Beschreibung</th>
        <th style={{ padding: '2mm 1.5mm', textAlign: 'right', width: '18mm' }}>Menge</th>
        <th style={{ padding: '2mm 1.5mm', textAlign: 'right', width: '14mm' }}>Einh.</th>
        <th style={{ padding: '2mm 1.5mm', textAlign: 'right', width: '22mm' }}>Preis/E</th>
        <th style={{ padding: '2mm 1.5mm', textAlign: 'right', width: '26mm' }}>Total</th>
      </tr>
      <tr>
        <td colSpan={6} style={{ borderBottom: '1px solid #e5e7eb', padding: 0 }}></td>
      </tr>
    </thead>
  )
}

/**
 * Render list of positions on a page.
 */
export function PositionsTableBody({ items, brandColor }) {
  return (
    <tbody>
      {items.map((pos, idx) => {
        const isTitle = pos.type === 'title' || ((!pos.menge && pos.menge !== 0) && (!pos.einzelpreis && pos.einzelpreis !== 0))
        const isOption = pos.optional === true
        const posTotal = isTitle ? 0 : (parseFloat(pos.menge) || 0) * (parseFloat(pos.einzelpreis) || 0)
        const posNr = pos.posNr || (idx + 1)

        if (isTitle) {
          return (
            <tr key={pos._id || idx}>
              <td style={{ padding: '5mm 1.5mm 1.5mm', fontWeight: 700, fontSize: '9.5pt', color: '#111', verticalAlign: 'top' }}>
                {posNr}
              </td>
              <td colSpan={5} style={{ padding: '5mm 1.5mm 1.5mm', fontWeight: 700, fontSize: '9.5pt', color: '#111' }}>
                {pos.npk_kapitel && (
                  <span style={{ fontSize: '7.5pt', color: brandColor, textTransform: 'uppercase', marginRight: '2mm', letterSpacing: '0.04em', fontWeight: 800 }}>
                    [NPK {pos.npk_kapitel}]
                  </span>
                )}
                {pos.beschreibung}
                {pos.details && (
                  <div style={{ fontWeight: 400, fontSize: '8pt', color: '#666', marginTop: '0.5mm', lineHeight: '1.4' }}>
                    {pos.details}
                  </div>
                )}
              </td>
            </tr>
          )
        }

        return (
          <tr key={pos._id || idx} style={{ borderBottom: '0.5px solid #f0f0f0' }}>
            <td style={{ padding: '2mm 1.5mm', verticalAlign: 'top', fontSize: '9pt', color: '#222', fontWeight: 600 }}>
              <div>{posNr}</div>
              {pos.npk_code && (
                <div style={{ fontSize: '7pt', color: '#4f46e5', fontFamily: 'monospace', fontWeight: 700, marginTop: '0.5mm' }}>
                  NPK {pos.npk_code}
                </div>
              )}
            </td>
            <td style={{ padding: '2mm 1.5mm', verticalAlign: 'top', fontSize: '9pt', paddingRight: '3mm' }}>
              <span style={{ color: isOption ? '#777' : '#111', fontWeight: 500 }}>
                {pos.beschreibung}
              </span>
              {isOption && (
                <span style={{ color: brandColor, fontSize: '7.5pt', marginLeft: '2mm', fontWeight: 600 }}>
                  (Option)
                </span>
              )}
              {pos.details && (
                <div style={{ fontSize: '8pt', color: '#777', marginTop: '0.5mm', lineHeight: '1.4' }}>
                  {pos.details}
                </div>
              )}
              {pos.ausmass_details && pos.ausmass_details.length > 0 && (
                <div style={{ fontSize: '7.5pt', color: '#059669', marginTop: '0.5mm', fontWeight: 600 }}>
                  📐 Bau-Ausmass: {pos.ausmass_details.length} Zeilen (gemäss Ausmassblatt)
                </div>
              )}
            </td>
            <td style={{ padding: '2mm 1.5mm', textAlign: 'right', verticalAlign: 'top', fontSize: '9pt', color: isOption ? '#888' : '#333', whiteSpace: 'nowrap' }}>
              {pos.menge || '–'}
            </td>
            <td style={{ padding: '2mm 1.5mm', textAlign: 'right', verticalAlign: 'top', fontSize: '9pt', color: isOption ? '#888' : '#333' }}>
              {pos.einheit || ''}
            </td>
            <td style={{ padding: '2mm 1.5mm', textAlign: 'right', verticalAlign: 'top', fontSize: '9pt', color: isOption ? '#888' : '#333', whiteSpace: 'nowrap' }}>
              {pos.einzelpreis ? formatMoney(pos.einzelpreis) : '–'}
            </td>
            <td style={{ padding: '2mm 1.5mm', textAlign: 'right', verticalAlign: 'top', fontSize: '9pt', fontWeight: 600, color: isOption ? '#888' : '#111', whiteSpace: 'nowrap' }}>
              {posTotal !== 0 ? `CHF ${formatMoney(posTotal)}` : '–'}
            </td>
          </tr>
        )
      })}
    </tbody>
  )
}

/**
 * Summary totals, conditions, closing text and signature block.
 */
export function TotalsAndClosing({
  rawTotal,
  rabatt,
  rabattBetrag,
  totalNachRabatt,
  mwst,
  mwstBetrag,
  finalTotal,
  isPauschal,
  optionenTotal,
  brandColor,
  daten = {},
  settings = {},
  rechnung = {},
  gesamtwerkpreis
}) {
  const isSchluss = rechnung?.typ === 'schluss' || Boolean(daten?.sia118?.aktiv)
  const isAkonto = rechnung?.typ === 'akonto' && parseFloat(rechnung?.akonto_prozent || 0) > 0
  const akontoProzent = parseFloat(rechnung?.akonto_prozent || 0)

  const effectiveWerkpreis = gesamtwerkpreis || parseFloat(daten?.gesamtwerkpreis) || (isSchluss ? (mwstBetrag > 0 ? (totalNachRabatt + mwstBetrag) : (totalNachRabatt || rawTotal)) : finalTotal)

  const akontoBetrag = isAkonto ? roundToFiveRappen(effectiveWerkpreis * (akontoProzent / 100)) : null

  const sia118Calc = isSchluss ? calculateSia118Schlussrechnung({
    gesamtwerkpreis: effectiveWerkpreis,
    akontoAbzuege: daten?.akonto_abzuege || [],
    rueckbehalt: daten?.sia118?.rueckbehalt || {
      aktiv: true,
      prozent: 5.0,
      abgeloestDurchGarantie: false,
      basis: 'gesamtwerkpreis'
    },
    rechnungsdatum: rechnung?.rechnungsdatum || daten?.datum || new Date().toISOString().split('T')[0]
  }) : null

  return (
    <div style={{ marginTop: '4mm' }}>
      {/* Totals Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6mm' }}>
        <tbody>
          <tr>
            <td colSpan={6} style={{ borderTop: `1px solid ${brandColor}`, padding: 0, height: '2mm' }}></td>
          </tr>
          {!isPauschal && (
            <>
              <tr>
                <td colSpan={4}></td>
                <td style={{ padding: '1.5mm 1.5mm', textAlign: 'left', fontSize: '9pt', color: '#555' }}>Zwischentotal</td>
                <td style={{ padding: '1.5mm 1.5mm', textAlign: 'right', fontSize: '9pt', color: '#111', fontWeight: 500 }}>
                  CHF {formatMoney(rawTotal)}
                </td>
              </tr>
              {rabatt > 0 && (
                <tr>
                  <td colSpan={4}></td>
                  <td style={{ padding: '1.5mm 1.5mm', textAlign: 'left', fontSize: '9pt', color: '#555' }}>
                    Rabatt ({formatMoney(rabatt)}%)
                  </td>
                  <td style={{ padding: '1.5mm 1.5mm', textAlign: 'right', fontSize: '9pt', color: '#111' }}>
                    – CHF {formatMoney(rabattBetrag)}
                  </td>
                </tr>
              )}
              {rabatt > 0 && (
                <tr>
                  <td colSpan={4}></td>
                  <td style={{ padding: '1.5mm 1.5mm', textAlign: 'left', fontSize: '9pt', color: '#222', fontWeight: 600 }}>
                    Total exkl. MwSt.
                  </td>
                  <td style={{ padding: '1.5mm 1.5mm', textAlign: 'right', fontSize: '9pt', color: '#111', fontWeight: 600 }}>
                    CHF {formatMoney(totalNachRabatt)}
                  </td>
                </tr>
              )}
              {mwst > 0 && (
                <tr>
                  <td colSpan={4}></td>
                  <td style={{ padding: '1.5mm 1.5mm', textAlign: 'left', fontSize: '9pt', color: '#555' }}>
                    MwSt. ({formatMoney(mwst)}%)
                  </td>
                  <td style={{ padding: '1.5mm 1.5mm', textAlign: 'right', fontSize: '9pt', color: '#111' }}>
                    + CHF {formatMoney(mwstBetrag)}
                  </td>
                </tr>
              )}
            </>
          )}

          {/* Standard TOTAL / Gesamtwerkpreis bar */}
          <tr>
            <td colSpan={4}></td>
            <td colSpan={2} style={{ padding: 0 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '2.5mm 1.5mm',
                marginTop: '1.5mm',
                borderTop: `2px solid ${brandColor}`,
                borderBottom: (isSchluss || isAkonto) ? `1px solid #e5e7eb` : `2px solid ${brandColor}`,
                fontWeight: (isSchluss || isAkonto) ? 600 : 800,
                fontSize: (isSchluss || isAkonto) ? '9.5pt' : '11pt',
                color: (isSchluss || isAkonto) ? '#374151' : '#111'
              }}>
                <span>{isPauschal ? 'Pauschalpreis' : (isSchluss ? 'Gesamtwerkpreis inkl. MwSt.' : 'TOTAL')}</span>
                <span>CHF {formatMoney(effectiveWerkpreis)}</span>
              </div>
            </td>
          </tr>

          {/* SIA 118: Anrechnung bisherige Akonto-Zahlungen */}
          {isSchluss && sia118Calc && (
            <>
              {sia118Calc.akontoAbzuege.length > 0 && (
                <>
                  <tr>
                    <td colSpan={4}></td>
                    <td colSpan={2} style={{ padding: '2mm 1.5mm 1mm', fontSize: '8.5pt', fontWeight: 700, color: '#1f2937' }}>
                      Anrechnung bisherige Akonto-Rechnungen:
                    </td>
                  </tr>
                  {sia118Calc.akontoAbzuege.map((ak, idx) => (
                    <tr key={ak.id || idx}>
                      <td colSpan={4}></td>
                      <td style={{ padding: '1mm 1.5mm', textAlign: 'left', fontSize: '8.5pt', color: '#4b5563', paddingLeft: '4mm' }}>
                        – Akonto {ak.rechnung_nr || `#${idx + 1}`}{ak.datum ? ` vom ${formatDate(ak.datum)}` : ''}
                      </td>
                      <td style={{ padding: '1mm 1.5mm', textAlign: 'right', fontSize: '8.5pt', color: '#dc2626', fontWeight: 500 }}>
                        – CHF {formatMoney(ak.betrag)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={4}></td>
                    <td style={{ padding: '1.5mm 1.5mm', textAlign: 'left', fontSize: '8.5pt', color: '#374151', fontWeight: 600, borderTop: '1px dashed #e5e7eb' }}>
                      Zwischentotal nach Akonto-Abzügen
                    </td>
                    <td style={{ padding: '1.5mm 1.5mm', textAlign: 'right', fontSize: '8.5pt', color: '#111', fontWeight: 600, borderTop: '1px dashed #e5e7eb' }}>
                      CHF {formatMoney(sia118Calc.restbetragNachAkonto)}
                    </td>
                  </tr>
                </>
              )}

              {/* SIA 118 Art. 181: Garantie-Rückbehalt (5%) */}
              {sia118Calc.rueckbehalt.aktiv && (
                <tr>
                  <td colSpan={4}></td>
                  <td style={{ padding: '1.5mm 1.5mm', textAlign: 'left', fontSize: '8.5pt', color: '#374151' }}>
                    {sia118Calc.rueckbehalt.abgeloestDurchGarantie ? (
                      <div>
                        <span className="font-semibold text-emerald-700">Garantie-Rückbehalt (SIA 118 Art. 181)</span>
                        <div style={{ fontSize: '7.5pt', color: '#047857' }}>
                          Durch Bankgarantie / Versicherungsbürgschaft abgelöst (kein Abzug)
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span>– {sia118Calc.rueckbehalt.prozent}% Garantie-Rückbehalt (SIA 118 Art. 181)</span>
                        <div style={{ fontSize: '7.5pt', color: '#6b7280' }}>
                          Freigabe nach 2-jähriger Rügefrist am {formatDate(sia118Calc.rueckbehalt.freigabeDatum)}
                        </div>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '1.5mm 1.5mm', textAlign: 'right', fontSize: '8.5pt', color: sia118Calc.rueckbehalt.abgeloestDurchGarantie ? '#047857' : '#dc2626', fontWeight: 500 }}>
                    {sia118Calc.rueckbehalt.abgeloestDurchGarantie ? 'CHF 0.00' : `– CHF ${formatMoney(sia118Calc.rueckbehalt.betrag)}`}
                  </td>
                </tr>
              )}

              {/* Fälliger Schlussbetrag */}
              <tr>
                <td colSpan={4}></td>
                <td colSpan={2} style={{ padding: 0 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '2.5mm 1.5mm',
                    marginTop: '2mm',
                    borderTop: `2px solid ${brandColor}`,
                    borderBottom: `2px solid ${brandColor}`,
                    fontWeight: 800,
                    fontSize: '11pt',
                    color: '#111'
                  }}>
                    <span>FÄLLIGER SCHLUSSBETRAG</span>
                    <span>CHF {formatMoney(sia118Calc.faelligerSchlussbetrag)}</span>
                  </div>
                </td>
              </tr>
            </>
          )}

          {/* Akontorechnung: Akontobetrag */}
          {isAkonto && (
            <tr>
              <td colSpan={4}></td>
              <td colSpan={2} style={{ padding: 0 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '2.5mm 1.5mm',
                  marginTop: '1.5mm',
                  borderTop: `2px solid ${brandColor}`,
                  borderBottom: `2px solid ${brandColor}`,
                  fontWeight: 800,
                  fontSize: '11pt',
                  color: '#111'
                }}>
                  <span>AKONTOBETRAG ({akontoProzent}%)</span>
                  <span>CHF {formatMoney(akontoBetrag)}</span>
                </div>
              </td>
            </tr>
          )}

          {optionenTotal > 0 && (
            <tr>
              <td colSpan={4}></td>
              <td colSpan={2} style={{ padding: '2mm 1.5mm 0', textAlign: 'right', fontSize: '8pt', color: '#888' }}>
                Optionale Positionen (nicht im Total): CHF {formatMoney(optionenTotal)}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Execution details */}
      {daten.ausfuehrung?.start && (
        <div style={{ fontSize: '8.5pt', color: '#444', marginBottom: '5mm', lineHeight: '1.5' }}>
          {daten.ausfuehrung.start && <div><span style={{ fontWeight: 600 }}>Ausführungsstart:</span> {daten.ausfuehrung.start}</div>}
          {daten.ausfuehrung.dauer && <div><span style={{ fontWeight: 600 }}>Geschätzte Dauer:</span> {daten.ausfuehrung.dauer}</div>}
        </div>
      )}

      {/* Closing text */}
      <div style={{ fontSize: '9.5pt', color: '#333', lineHeight: '1.5', marginBottom: '8mm' }}>
        <p style={{ margin: '0 0 4mm 0' }}>
          {daten.schlusstext || 'Wir danken Ihnen für das Vertrauen und stehen für Fragen gerne zur Verfügung.'}
        </p>

        <p style={{ margin: '0 0 2mm 0', fontWeight: 500 }}>Freundliche Grüsse</p>

        {/* Signature Area */}
        <div style={{ marginTop: '8mm', marginBottom: '2mm' }}>
          {settings?.unterschrift_url ? (
            <img src={settings.unterschrift_url} alt="Unterschrift" style={{ height: '16mm', objectFit: 'contain' }} />
          ) : (
            <div style={{ height: '12mm', borderBottom: '0.5px solid #bbb', width: '45mm' }}></div>
          )}
        </div>
        <div style={{ fontSize: '9pt', fontWeight: 700, color: '#1a1a1a' }}>{settings?.firmenname || ''}</div>
        <div style={{ fontSize: '8pt', color: '#777' }}>{settings?.website || ''}</div>
      </div>
    </div>
  )
}

/**
 * Pinned footer at the bottom of every A4 page (20mm from bottom).
 */
export function DocumentFooter({ pageNum, totalPages, settings, brandColor }) {
  const cleanString = (str) => (str || '').replace(/\r?\n/g, ' ').trim()

  const effectiveUid = cleanString(settings?.uid || settings?.uid_nummer)
  const formattedUid = effectiveUid ? `UID: ${effectiveUid}${!effectiveUid.toUpperCase().includes('MWST') ? ' MWST' : ''}` : ''

  const footerParts = [
    cleanString(settings?.firmenname),
    cleanString(settings?.strasse),
    cleanString((settings?.plz && settings?.ort) ? `${settings.plz} ${settings.ort}` : settings?.plz_ort),
    cleanString(settings?.telefon),
    cleanString(settings?.email),
    formattedUid,
    cleanString(settings?.bankverbindung)
  ].filter(Boolean)

  return (
    <div 
      style={{ 
        position: 'absolute', 
        bottom: '12mm', 
        left: '25mm', 
        right: '20mm',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ height: '0.8px', backgroundColor: brandColor, marginBottom: '2.5mm', opacity: 0.8 }}></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '7pt', color: '#888', lineHeight: '1.4' }}>
        <div style={{ maxWidth: '135mm', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {footerParts.join(' • ')}
        </div>
        <div style={{ fontWeight: 700, color: '#555', shrink: 0 }}>
          Seite {pageNum} von {totalPages}
        </div>
      </div>
    </div>
  )
}

/**
 * Norm-compliant Swiss QR-Bill (Schweizer QR-Einzahlungsschein) on a dedicated final page.
 */
export function QrBillPage({ qrSvg, rechnung, kunde, settings, pageNum, totalPages }) {
  return (
    <div 
      className="a4-page bg-white mx-auto relative print:m-0 print:shadow-none"
      style={{
        width: '210mm',
        height: '297mm',
        maxHeight: '297mm',
        boxSizing: 'border-box',
        position: 'relative',
        backgroundColor: '#ffffff',
        overflow: 'hidden'
      }}
    >
      {/* Top half: Payment Overview & Advice */}
      <div style={{ padding: '20mm 20mm 10mm 25mm' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10mm' }}>
          <div>
            <div style={{ fontSize: '14pt', fontWeight: 800, color: '#111' }}>
              Zahlteil & Empfangsschein
            </div>
            <div style={{ fontSize: '9pt', color: '#666', marginTop: '1mm' }}>
              Zu Rechnung {rechnung?.rechnung_nr || rechnung?.id}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '8.5pt', color: '#666' }}>
            <div style={{ fontWeight: 700, color: '#111' }}>{settings?.firmenname || ''}</div>
            <div>{(settings?.plz && settings?.ort) ? `${settings.plz} ${settings.ort}` : (settings?.plz_ort || '')}</div>
            {pageNum && totalPages && (
              <div style={{ fontSize: '8pt', color: '#888', marginTop: '1mm' }}>
                Seite {pageNum} von {totalPages}
              </div>
            )}
          </div>
        </div>

        <div style={{ 
          backgroundColor: '#fafafa', 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px', 
          padding: '4mm 6mm',
          fontSize: '9pt',
          lineHeight: '1.7',
          color: '#333'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#777' }}>Rechnungsbetrag:</span>
            <span style={{ fontWeight: 700, fontSize: '10pt', color: '#111' }}>CHF {formatMoney(rechnung?.total || 0)}</span>
          </div>
          {rechnung?.faellig_am && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#777' }}>Zahlbar bis:</span>
              <span style={{ fontWeight: 600 }}>{formatDateLong(rechnung.faellig_am)}</span>
            </div>
          )}
          {rechnung?.rechnungsdatum && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#777' }}>Rechnungsdatum:</span>
              <span>{formatDateLong(rechnung.rechnungsdatum)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#777' }}>Rechnungsempfänger:</span>
            <span>{kunde?.firmenname || `${kunde?.vorname || ''} ${kunde?.nachname || ''}`.trim() || kunde?.name}</span>
          </div>
        </div>

        <div style={{ marginTop: '6mm', fontSize: '8pt', color: '#888', fontStyle: 'italic' }}>
          Bitte verwenden Sie für Ihre Zahlung den untenstehenden QR-Zahlteil oder scannen Sie den QR-Code mit Ihrer Banking-App.
        </div>
      </div>

      {/* Perforation line (cut here) */}
      <div 
        style={{ 
          position: 'absolute', 
          bottom: '105mm', 
          left: 0, 
          width: '210mm', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '2mm',
          padding: '0 5mm'
        }}
      >
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <line x1="20" y1="4" x2="8.12" y2="15.88" />
          <line x1="14.47" y1="14.48" x2="20" y2="20" />
          <line x1="8.12" y1="8.12" x2="12" y2="12" />
        </svg>
        <div style={{ flex: 1, borderBottom: '1px dashed #bbb', height: '1px' }}></div>
      </div>

      {/* The exact official Swiss QR Bill takes the bottom 105mm */}
      <div 
        style={{ 
          position: 'absolute', 
          bottom: 0, 
          left: 0, 
          width: '210mm', 
          height: '105mm', 
          backgroundColor: '#fff',
          overflow: 'hidden'
        }}
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
    </div>
  )
}

/**
 * Schweizer Ausmassblatt & Massenberechnung Beilage nach SIA 118 Art. 141.
 * Detailliertes Berechnungsblatt mit Massketten, Öffnungsabzügen und SIA 118 Ausmassregeln.
 */
export function AusmassBeilagePage({
  leistungen = [],
  docNr,
  docType = 'Offerte',
  kunde,
  projekt,
  settings,
  brandColor = '#c5a057',
  pageNum,
  totalPages
}) {
  const measuredPositions = (leistungen || []).filter(
    pos => pos.ausmass_details && Array.isArray(pos.ausmass_details) && pos.ausmass_details.length > 0
  )

  if (measuredPositions.length === 0) return null

  return (
    <div 
      className="a4-page bg-white mx-auto relative print:m-0 print:shadow-none"
      style={{
        width: '210mm',
        height: '297mm',
        maxHeight: '297mm',
        boxSizing: 'border-box',
        position: 'relative',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
        padding: '20mm 20mm 20mm 25mm'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `1.5px solid ${brandColor}`, paddingBottom: '3mm', marginBottom: '4mm' }}>
        <div>
          <div style={{ fontSize: '13pt', fontWeight: 800, color: '#111', letterSpacing: '-0.01em' }}>
            AUSMASSBLATT & MASSENBERECHNUNG
          </div>
          <div style={{ fontSize: '8.5pt', color: '#666', marginTop: '1mm' }}>
            Beilage zu {docType} {docNr} {projekt?.name ? `• Bauobjekt: ${projekt.name}` : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '8.5pt', color: '#555' }}>
          <div style={{ fontWeight: 700, color: '#111' }}>{settings?.firmenname || ''}</div>
          <div style={{ fontSize: '7.5pt', color: '#888' }}>
            Kunde: {kunde?.firmenname || `${kunde?.vorname || ''} ${kunde?.nachname || ''}`.trim() || kunde?.name || '–'}
          </div>
        </div>
      </div>

      {/* SIA 118 Art. 141 Infobox */}
      <div style={{ 
        backgroundColor: '#fffbeb', 
        border: '1px solid #fef3c7', 
        borderRadius: '6px', 
        padding: '2.5mm 3.5mm', 
        marginBottom: '4.5mm',
        fontSize: '7.5pt',
        lineHeight: '1.4',
        color: '#92400e'
      }}>
        <strong>Schweizer Norm SIA 118 Art. 141:</strong> Öffnungen und Aussparungen bis ≤ 2.50 m² Einzelfläche (Fenster, Türen, Nischen) werden standardmässig übermessen (kein Abzug). Öffnungen &gt; 2.50 m² sind als wirksame Abzüge deklariert.
      </div>

      {/* Positions Ausmass Details */}
      <div style={{ maxHeight: '205mm', overflow: 'hidden' }}>
        {measuredPositions.map((pos, pIdx) => {
          const totals = calculateAusmassTotal(pos.ausmass_details)
          return (
            <div key={pos._id || pIdx} style={{ marginBottom: '4.5mm' }}>
              {/* Position Subheader */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                padding: '1.5mm 3mm',
                fontSize: '8.5pt',
                fontWeight: 700,
                color: '#1e293b'
              }}>
                <div>
                  <span style={{ color: '#64748b', marginRight: '2mm' }}>Pos. {pos.posNr || (pIdx + 1)}</span>
                  {pos.npk_code && (
                    <span style={{ color: '#4f46e5', fontFamily: 'monospace', marginRight: '2mm' }}>
                      [NPK {pos.npk_code}]
                    </span>
                  )}
                  <span>{pos.beschreibung}</span>
                </div>
                <div style={{ color: '#047857' }}>
                  Netto: {totals.nettoMenge.toFixed(2)} {pos.einheit}
                </div>
              </div>

              {/* Lines Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1mm', fontSize: '8pt' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '7pt', textTransform: 'uppercase' }}>
                    <th style={{ textAlign: 'left', padding: '1mm 1.5mm', width: '22%' }}>Bauteil / Raum</th>
                    <th style={{ textAlign: 'center', padding: '1mm 1.5mm', width: '8%' }}>Anz.</th>
                    <th style={{ textAlign: 'left', padding: '1mm 1.5mm', width: '38%' }}>Masskette (L × B × H)</th>
                    <th style={{ textAlign: 'left', padding: '1mm 1.5mm', width: '20%' }}>SIA 118 Status</th>
                    <th style={{ textAlign: 'right', padding: '1mm 1.5mm', width: '12%' }}>Fläche</th>
                  </tr>
                </thead>
                <tbody>
                  {pos.ausmass_details.map((line, lIdx) => {
                    const calc = calculateAusmassLine(line)
                    const l = parseFloat(line.laenge) || 0
                    const b = parseFloat(line.breite) || 0
                    const h = parseFloat(line.hoehe) || 0
                    const dims = [l > 0 ? `${l.toFixed(2)} m` : null, b > 0 ? `${b.toFixed(2)} m` : null, h > 0 ? `${h.toFixed(2)} m` : null].filter(Boolean).join(' × ')
                    const anzahl = parseFloat(line.anzahl) || 1

                    return (
                      <tr key={line.id || lIdx} style={{ borderBottom: '0.5px solid #f1f5f9' }}>
                        <td style={{ padding: '1mm 1.5mm', color: '#1e293b', fontWeight: 500 }}>
                          {line.bezeichnung || `Zeile ${lIdx + 1}`}
                        </td>
                        <td style={{ padding: '1mm 1.5mm', textAlign: 'center', color: '#64748b' }}>
                          {anzahl}
                        </td>
                        <td style={{ padding: '1mm 1.5mm', color: '#475569', fontFamily: 'monospace', fontSize: '7.5pt' }}>
                          {anzahl > 1 ? `${anzahl} × (${dims})` : dims}
                        </td>
                        <td style={{ padding: '1mm 1.5mm', fontSize: '7pt' }}>
                          {line.isAbzug ? (
                            calc.sia118Uebermessen ? (
                              <span style={{ color: '#6b7280', fontStyle: 'italic' }}>Übermessen (≤ 2.5 m²)</span>
                            ) : (
                              <span style={{ color: '#dc2626', fontWeight: 600 }}>Abzug (&gt; 2.5 m²)</span>
                            )
                          ) : (
                            <span style={{ color: '#047857' }}>Zuschlag</span>
                          )}
                        </td>
                        <td style={{ padding: '1mm 1.5mm', textAlign: 'right', fontWeight: 600, color: line.isAbzug ? (calc.sia118Uebermessen ? '#9ca3af' : '#dc2626') : '#111' }}>
                          {line.isAbzug ? (calc.sia118Uebermessen ? `0.00 ${calc.type}` : `-${Math.abs(calc.effectiveValue).toFixed(2)} ${calc.type}`) : `+${calc.effectiveValue.toFixed(2)} ${calc.type}`}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Subtotal row */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: '4mm',
                fontSize: '7pt', 
                color: '#64748b', 
                marginTop: '1mm',
                paddingRight: '1.5mm'
              }}>
                <span>Brutto: {totals.bruttoZuschlag.toFixed(2)} {totals.type}</span>
                {totals.abzuegeUebermessen > 0 && <span>• SIA 118 übermessen: ({totals.abzuegeUebermessen.toFixed(2)} {totals.type})</span>}
                {totals.abzuegeWirksam > 0 && <span style={{ color: '#dc2626' }}>• Abzüge: -{totals.abzuegeWirksam.toFixed(2)} {totals.type}</span>}
                <span style={{ fontWeight: 700, color: '#047857' }}>• Netto: {totals.nettoMenge.toFixed(2)} {totals.type}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pinned Footer */}
      <DocumentFooter
        pageNum={pageNum}
        totalPages={totalPages}
        settings={settings}
        brandColor={brandColor}
      />
    </div>
  )
}
