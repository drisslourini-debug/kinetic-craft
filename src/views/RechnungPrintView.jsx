import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import logo from '../assets/logo.png'
import html2pdf from 'html2pdf.js'
import { generateRechnungWord } from '../lib/rechnungWordGenerator'

export default function RechnungPrintView({ rechnung, kunde, projekt, onClose }) {
  const [settings, setSettings] = useState(null)
  const [akontoRechnungen, setAkontoRechnungen] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const handleResize = () => {
      const screenWidth = window.innerWidth
      if (screenWidth < 820) {
        setScale(screenWidth / 820)
      } else {
        setScale(1)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (supabase) {
      supabase.from('einstellungen').select('*').eq('id', 1).single()
        .then(({ data }) => {
          if (data) setSettings(data)
        })
    }
  }, [])

  useEffect(() => {
    if (supabase && rechnung?.typ === 'schluss' && rechnung?.projekt_id) {
      supabase.from('rechnungen')
        .select('*')
        .eq('projekt_id', rechnung.projekt_id)
        .eq('typ', 'akonto')
        .eq('status', 'Bezahlt')
        .then(({ data }) => {
          if (data) setAkontoRechnungen(data)
        })
    }
  }, [rechnung])

  if (!rechnung) return null

  const daten = rechnung.daten || {}
  const leistungen = daten.leistungen || []
  
  let rawTotal = 0
  let optionenTotal = 0

  leistungen.forEach(pos => {
    const isInfo = (!pos.menge && pos.menge !== 0) && (!pos.einzelpreis && pos.einzelpreis !== 0)
    const isOption = pos.optional === true
    
    if (!isInfo) {
      const posTotal = (parseFloat(pos.menge) || 0) * (parseFloat(pos.einzelpreis) || 0)
      if (isOption) {
        optionenTotal += posTotal
      } else {
        rawTotal += posTotal
      }
    }
  })

  const rabatt = parseFloat(daten.konditionen?.rabatt || 0)
  const mwst = parseFloat(daten.konditionen?.mwst || 0)

  const rabattBetrag = rawTotal * (rabatt / 100)
  const totalNachRabatt = rawTotal - rabattBetrag
  const mwstBetrag = totalNachRabatt * (mwst / 100)
  const calculatedTotal = totalNachRabatt + mwstBetrag
  
  const pauschalpreis = parseFloat(daten.pauschalpreis || 0)
  const isPauschal = pauschalpreis > 0
  const finalTotal = isPauschal ? pauschalpreis : calculatedTotal

  // Akonto / Schluss calculations
  const akontoProzent = parseFloat(rechnung.akonto_prozent || 0)
  const akontoBetrag = (finalTotal * akontoProzent) / 100

  const totalAkontoBezahlt = akontoRechnungen.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0)
  const verbleibenderRestbetrag = finalTotal - totalAkontoBezahlt

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('de-CH', {
      day: '2-digit', month: 'long', year: 'numeric'
    })
  }

  const formatMoney = (val) => {
    return parseFloat(val).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const gold = '#c5a057'
  const darkGold = '#a07d3a'

  const getTitel = () => {
    if (rechnung.typ === 'akonto') return 'Akontorechnung'
    if (rechnung.typ === 'schluss') return 'Schlussrechnung'
    return 'Rechnung'
  }

  const handleDownloadPDF = () => {
    setIsGenerating(true)
    const element = document.getElementById('pdf-content')
    const footerElement = document.getElementById('pdf-footer')
    
    if (footerElement) footerElement.style.display = 'none'

    const originalClassName = element.className
    const originalStyles = {
      padding: element.style.padding,
      width: element.style.width,
      minHeight: element.style.minHeight,
      display: element.style.display,
      flexDirection: element.style.flexDirection
    }

    element.className = "bg-white mx-auto print:my-0 print:shadow-none"
    element.style.padding = '0'
    element.style.width = '160mm'
    element.style.minHeight = 'auto'
    element.style.display = 'block'
    element.style.flexDirection = 'unset'
    
    const opt = {
      margin:       [20, 25, 25, 25],
      filename:     `Rechnung_${rechnung.rechnung_nr}_Atelier77.pdf`,
      image:        { type: 'jpeg', quality: 1.0 },
      html2canvas:  { scale: 2, useCORS: true, letterRendering: true, windowWidth: 1024 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['css', 'legacy'], avoid: 'tr, .avoid-break' }
    }

    html2pdf().set(opt).from(element).toPdf().get('pdf').then(function (pdf) {
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setDrawColor(197, 160, 87);
        pdf.setLineWidth(0.3);
        pdf.line(25, 275, 185, 275);
        pdf.setFontSize(7.5);
        pdf.setTextColor(153, 153, 153);
        const text1 = "Malerei Leandro Lüthi • Landoltstrasse 99 • 3007 Bern • +41 (0)78 402 12 22 • leandro@atelier-77.ch";
        const bank = settings?.bankverbindung ? ` • ${settings.bankverbindung}` : '';
        const text2 = `UID: CHE-489.750.760${bank}`;
        const text1Width = pdf.getStringUnitWidth(text1) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;
        const text2Width = pdf.getStringUnitWidth(text2) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;
        pdf.text(text1, (210 - text1Width) / 2, 281);
        pdf.text(text2, (210 - text2Width) / 2, 286);
      }
    }).save().then(() => {
      element.className = originalClassName
      Object.assign(element.style, originalStyles)
      if (footerElement) footerElement.style.display = 'block'
      setIsGenerating(false)
    })
  }

  return (
    <div className="fixed inset-0 z-[100] bg-gray-100 overflow-y-auto print:static print:inset-auto print:overflow-visible print:block print:bg-white print:p-0">
      {/* ===== ACTION BAR (hidden when printing) ===== */}
      <div className="print:hidden sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex flex-wrap justify-between items-center gap-3 z-10 shadow-sm">
        <button 
          onClick={onClose} 
          className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors cursor-pointer"
        >
          ← Zurück
        </button>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => {
              const subject = encodeURIComponent(`Rechnung ${rechnung?.rechnung_nr || ''} - Atelier 77`)
              const body = encodeURIComponent(`Guten Tag${kunde?.nachname ? ' ' + kunde.nachname : ''},\n\nGerne überreichen wir Ihnen die Rechnung für das Projekt "${projekt?.name || ''}".\n\nFreundliche Grüsse\n\nLeandro Lüthi\nMalerei Leandro Lüthi – Atelier 77`)
              window.location.href = `mailto:${kunde?.email || ''}?subject=${subject}&body=${body}`
            }}
            className="px-3 sm:px-4 py-2 text-sm font-bold rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm transition-all flex items-center gap-2 cursor-pointer" 
          >
            ✉️ E-Mail
          </button>
          <button 
            onClick={() => generateRechnungWord(rechnung, kunde, projekt, settings, akontoRechnungen)} 
            className="px-3 sm:px-4 py-2 text-sm font-bold rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm transition-all flex items-center gap-2 cursor-pointer" 
          >
            📝 Word
          </button>
          <button 
            onClick={() => window.print()} 
            className="px-3 sm:px-4 py-2 text-sm font-bold rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm transition-all flex items-center gap-2 cursor-pointer" 
          >
            🖨️ Drucken
          </button>
          <button 
            onClick={handleDownloadPDF} 
            disabled={isGenerating}
            className={`px-4 sm:px-5 py-2 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 ${isGenerating ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:opacity-90'}`} 
            style={{ backgroundColor: gold }}
          >
            {isGenerating ? '⏳ PDF wird generiert...' : '📄 PDF herunterladen'}
          </button>
        </div>
      </div>

      {/* ===== A4 PAGE ===== */}
      <div className="w-full flex justify-center pb-20 print:pb-0" style={{ transform: `scale(${scale})`, transformOrigin: 'top center', marginBottom: scale < 1 ? `-${297 * (1 - scale)}mm` : '0' }}>
      <div 
        id="pdf-content"
        className="bg-white mx-auto my-8 print:my-0 print:shadow-none shadow-2xl"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '20mm 25mm 25mm 25mm',
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontSize: '11pt',
          lineHeight: '1.5',
          color: '#1a1a1a',
          position: 'relative',
          boxSizing: 'border-box',
          display: 'block',
        }}
      >
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12mm' }} className="avoid-break">
          <div>
            <img src={logo} alt="Atelier 77" style={{ height: '52px', objectFit: 'contain' }} />
          </div>
          <div style={{ textAlign: 'right', fontSize: '8.5pt', color: '#666', lineHeight: '1.6' }}>
            <div style={{ fontWeight: 700, color: '#1a1a1a', fontSize: '9pt' }}>Malerei Leandro Lüthi</div>
            <div>Landoltstrasse 99</div>
            <div>3007 Bern</div>
            <div style={{ marginTop: '2mm' }}>+41 (0)78 402 12 22</div>
            <div>leandro@atelier-77.ch</div>
          </div>
        </div>

        <div style={{ marginBottom: '14mm' }} className="avoid-break">
          <div style={{ fontSize: '7pt', color: '#999', marginBottom: '2mm', borderBottom: '0.5px solid #ccc', paddingBottom: '1mm', display: 'inline-block' }}>
            Malerei Leandro Lüthi · Landoltstrasse 99 · 3007 Bern
          </div>
          
          <div style={{ fontSize: '10.5pt', lineHeight: '1.7' }}>
            {kunde?.firmenname && <div style={{ fontWeight: 600 }}>{kunde.firmenname}</div>}
            {(kunde?.vorname || kunde?.nachname) && (
              <div>{kunde?.vorname} {kunde?.nachname}</div>
            )}
            {kunde?.strasse && <div>{kunde.strasse}</div>}
            <div>{kunde?.plz} {kunde?.ort}</div>
          </div>
        </div>

        {/* ===== META: Rechnung Nr, Datum, etc ===== */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10mm' }} className="avoid-break">
          <div>
            <h1 style={{ fontSize: '18pt', fontWeight: 700, margin: '0 0 1mm 0', color: '#1a1a1a' }}>{getTitel()}</h1>
            <div style={{ fontSize: '10pt', color: '#666' }}>Nr. {rechnung.rechnung_nr}</div>
          </div>
          
          <div style={{ textAlign: 'right', fontSize: '9.5pt', lineHeight: '1.7' }}>
            <div><span style={{ color: '#888' }}>Datum:</span> <span style={{ fontWeight: 500 }}>{formatDate(rechnung.rechnungsdatum)}</span></div>
            <div><span style={{ color: '#888' }}>Zahlungsfrist:</span> <span style={{ fontWeight: 500 }}>{rechnung.zahlungsfrist_tage || 30} Tage</span></div>
            <div><span style={{ color: '#888' }}>Fällig am:</span> <span style={{ fontWeight: 500 }}>{formatDate(rechnung.faellig_am)}</span></div>
            {projekt?.name && (
              <div style={{ marginTop: '2mm' }}>
                <span style={{ color: '#888' }}>Projekt:</span> <span style={{ fontWeight: 600 }}>{projekt.name}</span>
                {projekt.adresse && <div style={{ color: '#666', fontSize: '9pt' }}>{projekt.adresse}</div>}
              </div>
            )}
          </div>
        </div>

        <div style={{ fontSize: '10pt', marginBottom: '8mm', lineHeight: '1.6', color: '#333' }} className="avoid-break">
          {daten.einleitungstext || 'Gerne stellen wir Ihnen folgende Leistungen in Rechnung:'}
        </div>

        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4mm' }}>
            <thead className="avoid-break">
              <tr>
                <td colSpan={6} style={{ borderTop: `2px solid ${gold}`, padding: 0, height: '3mm' }}></td>
              </tr>
              <tr style={{ fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555' }}>
                <th style={{ padding: '2.5mm 2mm', textAlign: 'left', width: '12mm' }}>Pos.</th>
                <th style={{ padding: '2.5mm 2mm', textAlign: 'left' }}>Beschreibung</th>
                <th style={{ padding: '2.5mm 2mm', textAlign: 'right', width: '18mm' }}>Menge</th>
                <th style={{ padding: '2.5mm 2mm', textAlign: 'right', width: '14mm' }}>Einh.</th>
                <th style={{ padding: '2.5mm 2mm', textAlign: 'right', width: '22mm' }}>Preis/E</th>
                <th style={{ padding: '2.5mm 2mm', textAlign: 'right', width: '28mm' }}>Total</th>
              </tr>
              <tr>
                <td colSpan={6} style={{ borderBottom: '1px solid #ddd', padding: 0 }}></td>
              </tr>
            </thead>

            <tbody>
              {leistungen.map((pos, i) => {
                const isInfo = (!pos.menge && pos.menge !== 0) && (!pos.einzelpreis && pos.einzelpreis !== 0)
                const isOption = pos.optional === true
                const posTotal = isInfo ? 0 : (parseFloat(pos.menge) || 0) * (parseFloat(pos.einzelpreis) || 0)
                const posNr = pos.posNr || (i + 1)

                if (isInfo) {
                  return (
                    <tr key={i} style={{ pageBreakInside: 'avoid' }}>
                      <td style={{ padding: '6mm 2mm 1.5mm', fontWeight: 700, fontSize: '10pt', color: '#1a1a1a', verticalAlign: 'top' }}>
                        {posNr}
                      </td>
                      <td colSpan={5} style={{ padding: '6mm 2mm 1.5mm', fontWeight: 700, fontSize: '10pt', color: '#1a1a1a' }}>
                        {pos.beschreibung}
                        {pos.details && <div style={{ fontWeight: 400, fontSize: '8.5pt', color: '#666', marginTop: '1mm' }}>{pos.details}</div>}
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={i} style={{ borderBottom: '0.5px solid #eee', pageBreakInside: 'avoid' }}>
                    <td style={{ padding: '2mm 2mm', verticalAlign: 'top', fontSize: '9.5pt', color: '#1a1a1a', fontWeight: 500 }}>
                      {posNr}
                    </td>
                    <td style={{ padding: '2mm 2mm', verticalAlign: 'top', fontSize: '9.5pt', paddingRight: '4mm' }}>
                      <span style={{ color: isOption ? '#888' : '#1a1a1a', fontWeight: 500 }}>
                        {pos.beschreibung}
                      </span>
                      {isOption && <span style={{ color: gold, fontSize: '8pt', marginLeft: '3mm', fontWeight: 400 }}>(Option)</span>}
                      {pos.details && <div style={{ fontSize: '8pt', color: '#888', marginTop: '0.5mm' }}>{pos.details}</div>}
                    </td>
                    <td style={{ padding: '2mm 2mm', textAlign: 'right', verticalAlign: 'top', fontSize: '9.5pt', color: isOption ? '#888' : '#333', whiteSpace: 'nowrap' }}>
                      {pos.menge || '–'}
                    </td>
                    <td style={{ padding: '2mm 2mm', textAlign: 'right', verticalAlign: 'top', fontSize: '9.5pt', color: isOption ? '#888' : '#333' }}>
                      {pos.einheit || ''}
                    </td>
                    <td style={{ padding: '2mm 2mm', textAlign: 'right', verticalAlign: 'top', fontSize: '9.5pt', color: isOption ? '#888' : '#333', whiteSpace: 'nowrap' }}>
                      {pos.einzelpreis ? formatMoney(pos.einzelpreis) : '–'}
                    </td>
                    <td style={{ padding: '2mm 2mm', textAlign: 'right', verticalAlign: 'top', fontSize: '9.5pt', fontWeight: 500, color: isOption ? '#888' : '#1a1a1a', whiteSpace: 'nowrap' }}>
                      {posTotal > 0 ? `CHF ${formatMoney(posTotal)}` : '–'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            
            <tbody style={{ borderTop: `1px solid ${gold}`, pageBreakInside: 'avoid' }}>
              <tr>
                <td colSpan={6} style={{ height: '4mm' }}></td>
              </tr>
              {!isPauschal && (
                <>
                  <tr>
                    <td colSpan={4}></td>
                    <td style={{ padding: '1.5mm 2mm', textAlign: 'left', fontSize: '9.5pt', color: '#555' }}>Zwischentotal</td>
                    <td style={{ padding: '1.5mm 2mm', textAlign: 'right', fontSize: '9.5pt', color: '#1a1a1a' }}>CHF {formatMoney(rawTotal)}</td>
                  </tr>
                  {rabatt > 0 && (
                    <tr>
                      <td colSpan={4}></td>
                      <td style={{ padding: '1.5mm 2mm', textAlign: 'left', fontSize: '9.5pt', color: '#555' }}>Rabatt ({formatMoney(rabatt)}%)</td>
                      <td style={{ padding: '1.5mm 2mm', textAlign: 'right', fontSize: '9.5pt', color: '#1a1a1a' }}>– CHF {formatMoney(rabattBetrag)}</td>
                    </tr>
                  )}
                  {rabatt > 0 && (
                    <tr>
                      <td colSpan={4}></td>
                      <td style={{ padding: '1.5mm 2mm', textAlign: 'left', fontSize: '9.5pt', color: '#333', fontWeight: 500 }}>Total exkl. MwSt.</td>
                      <td style={{ padding: '1.5mm 2mm', textAlign: 'right', fontSize: '9.5pt', color: '#1a1a1a', fontWeight: 500 }}>CHF {formatMoney(totalNachRabatt)}</td>
                    </tr>
                  )}
                  {mwst > 0 && (
                    <tr>
                      <td colSpan={4}></td>
                      <td style={{ padding: '1.5mm 2mm', textAlign: 'left', fontSize: '9.5pt', color: '#555' }}>MwSt. ({formatMoney(mwst)}%)</td>
                      <td style={{ padding: '1.5mm 2mm', textAlign: 'right', fontSize: '9.5pt', color: '#1a1a1a' }}>+ CHF {formatMoney(mwstBetrag)}</td>
                    </tr>
                  )}
                </>
              )}

              <tr>
                <td colSpan={4}></td>
                <td colSpan={2} style={{ padding: 0 }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    padding: '3mm 2mm', 
                    marginTop: '2mm',
                    borderTop: `2px solid ${gold}`, 
                    borderBottom: `2px solid ${gold}`,
                    fontWeight: 700, 
                    fontSize: '11.5pt', 
                    color: '#1a1a1a' 
                  }}>
                    <span>{isPauschal ? 'Pauschalpreis' : 'TOTAL'}</span>
                    <span>CHF {formatMoney(finalTotal)}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* AKONTO / SCHLUSS SECTIONS */}
          {rechnung.typ === 'akonto' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4mm' }} className="avoid-break">
              <div style={{ width: '60%', border: `1px solid ${gold}`, padding: '4mm', backgroundColor: '#fdfbf7', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '11.5pt', color: '#1a1a1a' }}>
                  <span>Akontobetrag ({akontoProzent}%):</span>
                  <span>CHF {formatMoney(akontoBetrag)}</span>
                </div>
              </div>
            </div>
          )}

          {rechnung.typ === 'schluss' && akontoRechnungen.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4mm' }} className="avoid-break">
              <div style={{ width: '70%', border: `1px solid ${gold}`, padding: '4mm', backgroundColor: '#fdfbf7', borderRadius: '4px' }}>
                <div style={{ fontSize: '9.5pt', fontWeight: 600, color: '#1a1a1a', marginBottom: '2mm' }}>Bereits bezahlte Akontozahlungen:</div>
                {akontoRechnungen.map((ar, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5pt', color: '#555', marginBottom: '1mm' }}>
                    <span>{ar.rechnung_nr} vom {formatDate(ar.rechnungsdatum)}</span>
                    <span>– CHF {formatMoney(ar.total || 0)}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #ccc', margin: '2mm 0' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '11.5pt', color: '#1a1a1a' }}>
                  <span>Verbleibender Restbetrag:</span>
                  <span>CHF {formatMoney(verbleibenderRestbetrag)}</span>
                </div>
              </div>
            </div>
          )}

          {/* BANKVERBINDUNG */}
          {settings?.bankverbindung && (
            <div style={{ marginTop: '10mm', fontSize: '9.5pt', color: '#1a1a1a', backgroundColor: '#f9f9f9', padding: '4mm', borderRadius: '4px', borderLeft: `3px solid ${gold}` }} className="avoid-break">
              <div style={{ fontWeight: 600, marginBottom: '1mm' }}>Bankverbindung für Ihre Zahlung:</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{settings.bankverbindung}</div>
            </div>
          )}

          {daten.ausfuehrung?.start && (
            <div style={{ fontSize: '9pt', color: '#555', marginTop: '6mm', lineHeight: '1.6' }} className="avoid-break">
              {daten.ausfuehrung.start && <div><span style={{ fontWeight: 600 }}>Ausführungsstart:</span> {daten.ausfuehrung.start}</div>}
              {daten.ausfuehrung.dauer && <div><span style={{ fontWeight: 600 }}>Geschätzte Dauer:</span> {daten.ausfuehrung.dauer}</div>}
            </div>
          )}

          <div style={{ fontSize: '10pt', color: '#333', lineHeight: '1.6', marginTop: '8mm', marginBottom: '15mm' }}>
            <p style={{ margin: '0 0 6mm 0' }}>{daten.schlusstext || 'Wir danken Ihnen für den Auftrag und stehen für Fragen gerne zur Verfügung.'}</p>
            
            <div className="avoid-break">
              <p style={{ margin: '0 0 2mm 0' }}>Freundliche Grüsse</p>
              
              <div style={{ marginTop: '12mm', marginBottom: '2mm' }}>
                {settings?.unterschrift_url ? (
                  <img src={settings.unterschrift_url} alt="Unterschrift" style={{ height: '20mm', objectFit: 'contain' }} />
                ) : (
                  <div style={{ height: '15mm', borderBottom: '0.5px solid #ccc', width: '50mm' }}></div>
                )}
              </div>
              <div style={{ fontSize: '9.5pt', fontWeight: 600 }}>Leandro Lüthi</div>
              <div style={{ fontSize: '8.5pt', color: '#888' }}>Malerei Leandro Lüthi – Atelier 77</div>
            </div>
          </div>
        </div>

        <div id="pdf-footer" style={{ 
          marginTop: '30mm',
          paddingTop: '5mm'
        }}>
          <div style={{ height: '1px', backgroundColor: gold, marginBottom: '3mm' }}></div>
          <div style={{ textAlign: 'center', fontSize: '7.5pt', color: '#999', lineHeight: '1.7' }}>
            <div>Malerei Leandro Lüthi • Landoltstrasse 99 • 3007 Bern • +41 (0)78 402 12 22 • leandro@atelier-77.ch</div>
            <div>UID: CHE-489.750.760{settings?.bankverbindung ? ` • ${settings.bankverbindung}` : ''}</div>
          </div>
        </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
            background: white !important;
            margin: 0;
            padding: 0;
          }
          @page { 
            margin: 0; 
            size: A4; 
          }
        }
      `}</style>
    </div>
  )
}

