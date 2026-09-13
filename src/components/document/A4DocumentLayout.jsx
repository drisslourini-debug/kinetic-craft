import React from 'react'
import { formatDateLong, formatMoney } from '../../lib/formatters'

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
              {posNr}
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
              {posTotal > 0 ? `CHF ${formatMoney(posTotal)}` : '–'}
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
  settings = {}
}) {
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

          {/* Final TOTAL bar with brand accent lines */}
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
                <span>{isPauschal ? 'Pauschalpreis' : 'TOTAL'}</span>
                <span>CHF {formatMoney(finalTotal)}</span>
              </div>
            </td>
          </tr>

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

  const footerParts = [
    cleanString(settings?.firmenname),
    cleanString(settings?.strasse),
    cleanString((settings?.plz && settings?.ort) ? `${settings.plz} ${settings.ort}` : settings?.plz_ort),
    cleanString(settings?.telefon),
    cleanString(settings?.email),
    settings?.uid_nummer ? `UID: ${cleanString(settings.uid_nummer)}` : '',
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
        <span style={{ fontSize: '10px', color: '#999' }}>✂</span>
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
