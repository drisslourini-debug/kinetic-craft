import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { generatePdf } from '../lib/pdfGenerator'
import { SwissQRBill } from 'swissqrbill/svg'
import { generateDocumentFilename } from '../lib/documentNaming'
import { formatDateLong, formatMoney } from '../lib/formatters'
import { isQrIban, generateQrReference } from '../lib/qrHelper'
import { getTenantStoragePath } from '../lib/storageHelper'
import {
  paginateMahnung,
  FoldAndPunchMarks,
  DocumentHeader,
  ContinuationHeader,
  AddressWindow,
  DocumentFooter,
  QrBillPage
} from '../components/document/A4DocumentLayout'
import { IconPrinter, IconCheck, IconWarning, IconMail, IconFolder } from '../components/icons/BrandIcons'

function IconClose({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function IconDownload({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )
}

export default function MahnungPrintView({
  rechnung,
  mahnung,
  kunde,
  projekt,
  settings: propSettings,
  onClose,
  previewMode = false
}) {
  const [loadedSettings, setLoadedSettings] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [baseScale, setBaseScale] = useState(1)
  const [zoomMultiplier, setZoomMultiplier] = useState(1)
  const [fitMode, setFitMode] = useState('page')
  const [showMoreActions, setShowMoreActions] = useState(false)
  const [qrSvg, setQrSvg] = useState(null)
  const [feedbackToast, setFeedbackToast] = useState(null)

  const settings = propSettings || loadedSettings
  const containerRef = useRef(null)

  const showToast = (type, text) => {
    setFeedbackToast({ type, text })
    setTimeout(() => setFeedbackToast(null), 3500)
  }

  // Fallback load settings if needed
  useEffect(() => {
    if (propSettings) return
    if (supabase) {
      supabase.from('einstellungen').select('*').limit(1).maybeSingle()
        .then(({ data }) => {
          if (data) setLoadedSettings(data)
          else {
            const local = localStorage.getItem('atelier77_einstellungen_v2')
            if (local) setLoadedSettings(JSON.parse(local))
          }
        })
    }
  }, [propSettings])

  // Responsive scaling for live preview in editor and full view
  useEffect(() => {
    if (!containerRef.current) return

    const updateScale = () => {
      if (!containerRef.current) return
      const width = containerRef.current.clientWidth || window.innerWidth
      const height = containerRef.current.clientHeight || window.innerHeight
      const A4_WIDTH = 794 // 96 DPI pixel width
      const A4_HEIGHT = 1123 // 96 DPI pixel height

      if (previewMode) {
        const sidePadding = width < 640 ? 16 : 32
        const vertPadding = 56
        const availableW = Math.max(200, width - sidePadding)
        const availableH = Math.max(200, height - vertPadding)
        const scaleW = availableW / A4_WIDTH
        const scaleH = availableH / A4_HEIGHT
        setBaseScale(Math.max(0.15, Math.min(1.2, Math.min(scaleW, scaleH))))
      } else {
        const sidePadding = width < 640 ? 16 : 48
        const availableW = Math.max(280, width - sidePadding)
        setBaseScale(Math.max(0.2, Math.min(1, availableW / A4_WIDTH)))
      }
    }

    updateScale()
    let resizeObserver = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateScale)
      resizeObserver.observe(containerRef.current)
    }
    window.addEventListener('resize', updateScale)
    return () => {
      if (resizeObserver) resizeObserver.disconnect()
      window.removeEventListener('resize', updateScale)
    }
  }, [previewMode])

  const effectiveScale = Math.max(0.15, Math.min(3.0, baseScale * zoomMultiplier))

  const handleZoomIn = () => {
    setFitMode('custom')
    setZoomMultiplier(prev => Math.min(3.0, Math.round((prev + 0.15) * 100) / 100))
  }

  const handleZoomOut = () => {
    setFitMode('custom')
    setZoomMultiplier(prev => Math.max(0.3, Math.round((prev - 0.15) * 100) / 100))
  }

  const handleResetToFit = () => {
    setFitMode('page')
    setZoomMultiplier(1)
  }

  const handleZoom100 = () => {
    setFitMode('custom')
    if (baseScale > 0) {
      setZoomMultiplier(Math.round((1 / baseScale) * 100) / 100)
    } else {
      setZoomMultiplier(1)
    }
  }

  // Amounts
  const totalUrsprung = parseFloat(rechnung?.total || 0)
  const bezahlt = parseFloat(rechnung?.bezahlt || 0)
  const restbetrag = mahnung?.restbetrag !== undefined 
    ? parseFloat(mahnung.restbetrag) 
    : Math.max(0, totalUrsprung - bezahlt)
  const spesen = parseFloat(mahnung?.spesen || 0)
  const verzugszins = parseFloat(mahnung?.verzugszins || 0)
  const gesamtforderung = mahnung?.gesamtforderung !== undefined
    ? parseFloat(mahnung.gesamtforderung)
    : Math.round((restbetrag + spesen + verzugszins) * 20) / 20

  const stufe = mahnung?.stufe || 1
  const docNr = rechnung?.rechnung_nr || `RE-${rechnung?.id || '0'}`
  const mahnDatum = mahnung?.datum 
    ? formatDateLong(mahnung.datum)
    : formatDateLong(new Date().toISOString())
  const fristDatum = mahnung?.fristDatum 
    ? formatDateLong(mahnung.fristDatum)
    : ''

  const gold = settings?.primary_color || '#c5a057'
  const isStufe3 = stufe === 3

  // Generate Swiss QR-Bill for the dunning total
  useEffect(() => {
    if (!rechnung || !settings) return
    const rawIban = settings?.qr_iban || settings?.bankverbindung || settings?.firma_iban
    if (!rawIban) return

    try {
      const cleanIban = rawIban.replace(/\s+/g, '').toUpperCase()
      const effectiveKunde = kunde || rechnung?.daten?.kunde || {}
      const isQr = isQrIban(cleanIban)
      const docIdentifier = docNr

      let reference = undefined
      let message = `Mahnung Stufe ${stufe} zu Rechnung ${docIdentifier}`

      if (isQr) {
        reference = generateQrReference(effectiveKunde.id || '0', rechnung.id || '0')
      }

      const debtorName = effectiveKunde.firmenname || `${effectiveKunde.vorname || ''} ${effectiveKunde.nachname || ''}`.trim() || effectiveKunde.name || 'Kunde'
      const debtorZip = (effectiveKunde.plz || (effectiveKunde.plz_ort || '').split(' ')[0] || '0000').trim()
      const debtorCity = (effectiveKunde.ort || (effectiveKunde.plz_ort || '').split(' ').slice(1).join(' ') || 'Ort').trim()

      const creditorZip = (settings.plz || (settings.plz_ort || '').split(' ')[0] || '0000').trim()
      const creditorCity = (settings.ort || (settings.plz_ort || '').split(' ').slice(1).join(' ') || 'Ort').trim()

      const billConfig = {
        currency: 'CHF',
        amount: gesamtforderung,
        creditor: {
          name: settings.firmenname || 'Handwerksbetrieb',
          address: settings.strasse || 'Strasse',
          zip: creditorZip,
          city: creditorCity,
          country: 'CH',
          account: cleanIban
        },
        debtor: {
          name: debtorName,
          address: effectiveKunde.strasse || '',
          zip: debtorZip,
          city: debtorCity,
          country: 'CH'
        },
        message: message
      }

      if (reference) {
        billConfig.reference = reference
      }

      const bill = new SwissQRBill(billConfig)
      setQrSvg(bill.toString())
    } catch (err) {
      console.error('Fehler bei der QR-Code Generierung für Mahnung:', err)
    }
  }, [settings, rechnung, kunde, gesamtforderung, stufe, docNr])

  // Intelligent A4 Page Pagination for Mahnungen
  const paginatedPages = paginateMahnung({
    einleitung: mahnung?.einleitung || '',
    hasBisherigeZahlung: bezahlt > 0,
    hasSpesen: spesen > 0,
    hasVerzugszins: verzugszins > 0,
    mahnhinweis: mahnung?.mahnhinweis || '',
    schlussformel: mahnung?.schlussformel || '',
    hasSignature: true
  })

  const contentPagesCount = paginatedPages.length
  const totalPages = qrSvg ? contentPagesCount + 1 : contentPagesCount

  const docTypeLabel = isStufe3 
    ? 'Letzte_Mahnung' 
    : (stufe === 2 ? '1_Mahnung' : 'Zahlungserinnerung')

  const pdfFilename = generateDocumentFilename({
    type: docTypeLabel,
    docNr,
    kunde,
    projekt,
    date: mahnung?.datum || new Date().toISOString()
  })

  const getPdfOptions = () => ({
    margin: 0,
    filename: pdfFilename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      useCORS: true, 
      letterRendering: true, 
      windowWidth: 1024,
      logging: false 
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'], after: '.a4-page' }
  })

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPdf = async () => {
    setIsGenerating(true)
    try {
      const element = document.getElementById('mahnung-pages-container')
      const opt = getPdfOptions()
      await generatePdf(element, opt, 'save')
      showToast('success', 'Mahnungs-PDF erfolgreich heruntergeladen.')
    } catch (err) {
      console.error('PDF error:', err)
      showToast('error', 'Fehler bei der Mahnungs-PDF-Erstellung.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveToArchive = async () => {
    setIsGenerating(true)
    try {
      const element = document.getElementById('mahnung-pages-container')
      const opt = getPdfOptions()
      const blob = await generatePdf(element, opt, 'blob')

      const file = new File([blob], pdfFilename, { type: 'application/pdf' })
      const filePath = getTenantStoragePath(settings?.tenant_id, pdfFilename, 'mahnungen')

      const { error: uploadError } = await supabase.storage.from('anhange').upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('anhange').getPublicUrl(filePath)

      let version = 1
      try {
        const { data: existingFiles } = await supabase
          .from('dateien')
          .select('id, version')
          .eq('kunde_id', kunde?.id)
          .ilike('name', `%${docNr}%`)
        if (existingFiles && existingFiles.length > 0) {
          version = existingFiles.length + 1
        }
      } catch (e) {
        console.warn('Could not check existing version:', e)
      }

      const finalFilename = version > 1 ? `${pdfFilename.replace(/\.pdf$/i, '')}_v${version}.pdf` : pdfFilename

      const filePayload = {
        name: finalFilename,
        typ: 'application/pdf',
        url: publicUrl,
        size_bytes: file.size,
        kunde_id: kunde?.id || null,
        projekt_id: projekt?.id || null,
        kategorie: 'Mahnung',
        quelle: 'Mahnung-Export',
        rechnung_id: rechnung?.id || null,
        version: version
      }

      try {
        const { error: dbError } = await supabase.from('dateien').insert([filePayload])
        if (dbError && dbError.message?.includes('rechnung_id')) {
          delete filePayload.rechnung_id
          delete filePayload.version
          await supabase.from('dateien').insert([filePayload])
        } else if (dbError) {
          throw dbError
        }
      } catch (err) {
        delete filePayload.rechnung_id
        delete filePayload.version
        await supabase.from('dateien').insert([filePayload])
      }

      showToast('success', `Mahnung wurde als ${finalFilename} im Archiv gespeichert!`)
    } catch (err) {
      console.error('Error saving PDF to archive:', err)
      showToast('error', 'Fehler beim Speichern in den Kunden-Dateien.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleEmailWithPDF = async () => {
    setIsGenerating(true)
    try {
      const element = document.getElementById('mahnung-pages-container')
      const opt = getPdfOptions()
      const blob = await generatePdf(element, opt, 'blob')

      const file = new File([blob], pdfFilename, { type: 'application/pdf' })
      const filePath = getTenantStoragePath(settings?.tenant_id, pdfFilename, 'mahnungen')

      const { error: uploadError } = await supabase.storage.from('anhange').upload(filePath, file)
      if (uploadError) console.error('Upload warning:', uploadError)

      // Trigger local browser download so user has PDF ready to attach
      const blobUrl = URL.createObjectURL(blob)
      const downloadLink = document.createElement('a')
      downloadLink.href = blobUrl
      downloadLink.download = pdfFilename
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)

      // Open mailto link
      const docTitle = mahnung?.titel || `Mahnung Stufe ${stufe}`
      const subject = encodeURIComponent(`${docTitle} zu Rechnung ${docNr} - ${settings?.firmenname || ''}`)
      const recipientName = kunde?.nachname ? ` ${kunde.nachname}` : (kunde?.firmenname ? ` ${kunde.firmenname}` : '')
      const body = encodeURIComponent(`Guten Tag${recipientName},\n\nAnbei erhalten Sie die ${docTitle} zu Rechnung ${docNr} vom ${mahnDatum}.\n\nOffener Gesamtbetrag: CHF ${formatMoney(gesamtforderung)}\nZahlungsfrist: ${fristDatum || 'sofort'}\n\nDas Dokument wurde soeben als PDF heruntergeladen und kann direkt angehängt werden.\n\nFreundliche Grüsse\n\n${settings?.firmenname || ''}\n${settings?.website || ''}`)
      window.location.href = `mailto:${kunde?.email || ''}?subject=${subject}&body=${body}`

      showToast('success', 'Mahnungs-PDF archiviert, heruntergeladen & E-Mail vorbereitet!')
    } catch (err) {
      console.error('Error during email and archiving:', err)
      showToast('error', 'Fehler beim Vorbereiten des PDFs für den E-Mail-Versand.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Mock rechnung object for QR bill overview
  const qrRechnungMock = {
    ...rechnung,
    rechnung_nr: `${docNr} (${mahnung?.titel || `Mahnung Stufe ${stufe}`})`,
    total: gesamtforderung,
    faellig_am: mahnung?.fristDatum || rechnung?.faellig_am,
    rechnungsdatum: mahnung?.datum || rechnung?.rechnungsdatum
  }

  // Render Forderungsaufstellung Block
  const renderForderungsaufstellung = () => (
    <div style={{ 
      margin: '5mm 0', 
      backgroundColor: '#fafafa', 
      border: isStufe3 ? '1px solid #fca5a5' : '1px solid #e5e7eb', 
      borderRadius: '8px', 
      overflow: 'hidden' 
    }}>
      <div style={{ 
        padding: '2.5mm 4mm', 
        backgroundColor: isStufe3 ? '#fef2f2' : '#f3f4f6', 
        borderBottom: isStufe3 ? '1px solid #fecaca' : '1px solid #e5e7eb',
        fontSize: '8.5pt', 
        fontWeight: 700, 
        color: isStufe3 ? '#991b1b' : '#374151',
        display: 'flex', 
        justifyContent: 'space-between'
      }}>
        <span>Forderungsaufstellung nach Schweizer Recht</span>
        <span>Währung: CHF</span>
      </div>

      <div style={{ padding: '2.5mm 4mm', fontSize: '8.5pt', lineHeight: '1.7' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#6b7280' }}>Ursprünglicher Rechnungsbetrag ({docNr}):</span>
          <span>CHF {formatMoney(totalUrsprung)}</span>
        </div>

        {bezahlt > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
            <span>Abzüglich bisherige Zahlungen:</span>
            <span>- CHF {formatMoney(bezahlt)}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, borderTop: '1px dashed #e5e7eb', paddingTop: '2px', marginTop: '2px' }}>
          <span>Ausstehende Hauptforderung:</span>
          <span>CHF {formatMoney(restbetrag)}</span>
        </div>

        {spesen > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>Mahnspesen (Bearbeitungsaufwand):</span>
            <span>+ CHF {formatMoney(spesen)}</span>
          </div>
        )}

        {verzugszins > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>
              Gesetzlicher Verzugszins (Art. 104 OR: 5% p.a., {mahnung?.verzugstage || 0} Tage):
            </span>
            <span>+ CHF {formatMoney(verzugszins)}</span>
          </div>
        )}

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'baseline',
          borderTop: isStufe3 ? '2px solid #dc2626' : '2px solid #111827', 
          paddingTop: '2.5mm', 
          marginTop: '2mm',
          fontWeight: 800,
          fontSize: '10.5pt',
          color: isStufe3 ? '#991b1b' : '#111827'
        }}>
          <span>Neues Gesamttotal der Forderung:</span>
          <span>CHF {formatMoney(gesamtforderung)}</span>
        </div>
      </div>
    </div>
  )

  // Render Rechtshinweis / SchKG warning box
  const renderRechtshinweis = () => {
    if (!mahnung?.mahnhinweis) return null
    return (
      <div style={{ 
        padding: '3mm 4mm', 
        backgroundColor: isStufe3 ? '#fef2f2' : '#f9fafb',
        borderLeft: isStufe3 ? '3.5mm solid #dc2626' : '3.5mm solid #f59e0b',
        borderRadius: '4px',
        fontSize: '8.5pt',
        lineHeight: '1.5',
        color: isStufe3 ? '#991b1b' : '#4b5563',
        whiteSpace: 'pre-line',
        margin: '4mm 0 5mm 0'
      }}>
        {mahnung.mahnhinweis}
      </div>
    )
  }

  // Render Schlussformel & Signatur
  const renderSchlussformel = () => (
    <div style={{ 
      fontSize: '9.5pt', 
      lineHeight: '1.5', 
      color: '#374151',
      marginTop: '3mm'
    }}>
      {mahnung?.schlussformel && (
        <div style={{ whiteSpace: 'pre-line', marginBottom: '3.5mm' }}>
          {mahnung.schlussformel}
        </div>
      )}
      <div style={{ fontWeight: 500, marginBottom: '2mm' }}>Freundliche Grüsse</div>
      
      <div style={{ marginTop: '4mm', marginBottom: '2mm' }}>
        {settings?.unterschrift_url ? (
          <img src={settings.unterschrift_url} alt="Unterschrift" style={{ height: '14mm', objectFit: 'contain' }} />
        ) : (
          <div style={{ height: '10mm', borderBottom: '0.5px solid #bbb', width: '45mm' }}></div>
        )}
      </div>
      <div style={{ fontSize: '9pt', fontWeight: 700, color: '#1a1a1a' }}>{settings?.firmenname || ''}</div>
      {settings?.website && <div style={{ fontSize: '8pt', color: '#777' }}>{settings.website}</div>}
    </div>
  )

  return (
    <div
      ref={containerRef}
      className={previewMode
        ? "relative w-full h-full bg-neutral-100/90 overflow-y-auto overflow-x-auto print:static print:overflow-visible print:block print:bg-white print:p-0"
        : "fixed inset-0 z-[100] bg-neutral-200/90 backdrop-blur-sm overflow-y-auto overflow-x-auto print:static print:overflow-visible print:block print:bg-white print:p-0"
      }
    >
      {/* ===== FLOATING ACTION BAR ===== */}
      {!previewMode && (
        <div className="print:hidden sticky top-2 sm:top-4 z-30 mx-auto w-[96%] max-w-3xl bg-white/95 backdrop-blur-md border border-neutral-200/90 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-2xl shadow-xl flex items-center justify-between gap-2 my-2 animate-fade-in">
          {/* Back Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 sm:px-3.5 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary bg-neutral-50 hover:bg-neutral-100 border border-border/80 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 min-h-[40px]"
              title="Schliessen"
            >
              <span>←</span>
              <span className="hidden sm:inline">Zurück</span>
            </button>
          )}

          {/* Document label */}
          <div className="flex items-center gap-2 truncate px-2 text-center">
            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
              isStufe3 
                ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                : stufe === 2 
                  ? 'bg-orange-100 text-orange-800 border border-orange-200' 
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}>
              {mahnung?.titel || `Mahnung Stufe ${stufe}`}
            </span>
            <span className="text-xs sm:text-sm font-bold text-text-primary font-mono">{docNr}</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Primary: Download PDF */}
            <button
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="px-3.5 sm:px-4 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-all shadow-xs shadow-primary-600/20 cursor-pointer flex items-center gap-1.5 disabled:opacity-50 active:scale-[0.98] min-h-[40px]"
              title="PDF herunterladen"
            >
              <IconDownload className="w-4 h-4" />
              <span className="hidden sm:inline">{isGenerating ? 'Erstelle PDF...' : 'PDF herunterladen'}</span>
              <span className="sm:hidden">{isGenerating ? '...' : 'PDF laden'}</span>
            </button>

            {/* Desktop Only Buttons */}
            <button
              onClick={handleEmailWithPDF}
              disabled={isGenerating}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-text-secondary hover:text-text-primary bg-neutral-50 hover:bg-neutral-100 border border-border/80 rounded-xl transition-all cursor-pointer disabled:opacity-50 min-h-[40px]"
              title="PDF generieren, archivieren, herunterladen und per E-Mail versenden"
            >
              <IconMail className="w-4 h-4 text-primary-600" />
              <span>{isGenerating ? 'Bereite vor...' : 'E-Mail'}</span>
            </button>

            <button
              onClick={handleSaveToArchive}
              disabled={isGenerating}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded-xl transition-all cursor-pointer disabled:opacity-50 min-h-[40px]"
              title="PDF generieren und im Dateien-Archiv speichern"
            >
              <IconFolder className="w-4 h-4 text-purple-600" />
              <span>{isGenerating ? 'Speichert...' : 'Archivieren'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300/80 rounded-xl transition-all cursor-pointer active:scale-[0.98] min-h-[40px]"
              title="Drucken über System-Druckdialog"
            >
              <IconPrinter className="w-4 h-4" />
              <span>Drucken</span>
            </button>

            {/* Mobile More Actions Menu (⋮) */}
            <div className="relative sm:hidden">
              <button
                type="button"
                onClick={() => setShowMoreActions(!showMoreActions)}
                className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center bg-neutral-50 hover:bg-neutral-100 border border-border/80 rounded-xl text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                aria-label="Weitere Aktionen"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
              </button>

              {showMoreActions && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMoreActions(false)} />
                  <div className="absolute right-0 top-12 w-52 bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden z-50 animate-fade-in p-1 text-sm font-medium">
                    <button
                      onClick={() => { setShowMoreActions(false); handleEmailWithPDF(); }}
                      disabled={isGenerating}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-neutral-50 flex items-center gap-2 text-text-primary cursor-pointer disabled:opacity-50"
                    >
                      <IconMail className="w-4 h-4 text-primary-600" />
                      <span>Per E-Mail senden</span>
                    </button>
                    <button
                      onClick={() => { setShowMoreActions(false); handleSaveToArchive(); }}
                      disabled={isGenerating}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-purple-50 flex items-center gap-2 text-purple-700 cursor-pointer disabled:opacity-50"
                    >
                      <IconFolder className="w-4 h-4 text-purple-600" />
                      <span>In Archiv sichern</span>
                    </button>
                    <button
                      onClick={() => { setShowMoreActions(false); handlePrint(); }}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-neutral-50 flex items-center gap-2 text-text-primary cursor-pointer border-t border-neutral-100 mt-1 pt-2"
                    >
                      <IconPrinter className="w-4 h-4" />
                      <span>Drucken</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== FLOATING ZOOM TOOLBAR ===== */}
      <div className="print:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
        <div className="bg-white/95 backdrop-blur-md border border-neutral-200/90 shadow-xl rounded-2xl px-2 py-1 flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer text-text-secondary hover:text-text-primary"
            title="Verkleinern (-)"
            aria-label="Verkleinern"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
          </button>
          <button
            type="button"
            onClick={handleResetToFit}
            className="px-1.5 py-1 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer text-[11px] font-bold text-primary-700 min-w-[46px] text-center"
            title="Klicken zum Zurücksetzen auf Ganze Seite"
          >
            {Math.round(effectiveScale * 100)}%
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer text-text-secondary hover:text-text-primary"
            title="Vergrössern (+)"
            aria-label="Vergrössern"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
          <div className="w-[1px] h-3.5 bg-neutral-200 mx-0.5" />
          <button
            type="button"
            onClick={handleResetToFit}
            className={`px-2 py-1 text-[11px] rounded-lg transition-colors cursor-pointer ${
              fitMode === 'page' && zoomMultiplier === 1 ? 'bg-primary-50 text-primary-700 font-bold' : 'text-text-secondary hover:bg-neutral-100'
            }`}
            title="Ganze A4-Seite einpassen"
          >
            Ganze Seite
          </button>
          <button
            type="button"
            onClick={handleZoom100}
            className={`px-2 py-1 text-[11px] rounded-lg transition-colors cursor-pointer ${
              Math.abs(effectiveScale - 1) < 0.03 ? 'bg-primary-50 text-primary-700 font-bold' : 'text-text-secondary hover:bg-neutral-100'
            }`}
            title="100% Originalgrösse"
          >
            100%
          </button>
        </div>
      </div>

      {/* ===== A4 PAGES CONTAINER ===== */}
      <div className={previewMode ? "p-2 sm:p-4" : "p-2 sm:p-6"}>
        <div id="mahnung-pages-container" className="flex flex-col items-center pb-8">
          {paginatedPages.map((pageConfig, pageIdx) => {
            const isFirst = pageIdx === 0

            return (
              <div
                key={pageIdx}
                className="mx-auto mb-6 sm:mb-8 block print:m-0 print:block"
                style={!isGenerating ? {
                  width: `${Math.round(794 * effectiveScale)}px`,
                  height: `${Math.round(1123 * effectiveScale)}px`,
                  position: 'relative',
                  flexShrink: 0,
                } : {}}
              >
                <div
                  className={`a4-page bg-white mx-auto relative print:m-0 print:shadow-none ${isGenerating ? 'border-0 shadow-none' : 'shadow-2xl rounded-sm border border-neutral-200'} print:border-none`}
                  style={{
                    width: isGenerating ? '210mm' : '794px',
                    minWidth: isGenerating ? '210mm' : '794px',
                    height: isGenerating ? '297mm' : '1123px',
                    minHeight: isGenerating ? '297mm' : '1123px',
                    maxHeight: isGenerating ? '297mm' : '1123px',
                    boxSizing: 'border-box',
                    padding: '20mm 20mm 20mm 25mm',
                    position: 'relative',
                    backgroundColor: '#ffffff',
                    overflow: 'hidden',
                    flexShrink: 0,
                    transform: !isGenerating ? `scale(${effectiveScale})` : 'none',
                    transformOrigin: 'top left',
                  }}
                >
                  {/* 1. DIN FOLD & PUNCH MARKS (Page 1 only) */}
                  {isFirst && <FoldAndPunchMarks />}

                  {/* 2. HEADER */}
                  {isFirst ? (
                    <DocumentHeader settings={settings} brandColor={gold} />
                  ) : (
                    <ContinuationHeader 
                      docType={mahnung?.titel || (isStufe3 ? 'Letzte Mahnung' : 'Mahnung')} 
                      docNr={docNr} 
                      projektName={projekt?.name} 
                      date={mahnDatum} 
                      brandColor={gold} 
                      settings={settings} 
                    />
                  )}

                  {/* 3. ADDRESS WINDOW & META (Page 1 only) */}
                  {isFirst && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '4mm', minHeight: '38mm' }}>
                        <AddressWindow kunde={kunde} settings={settings} />
                        
                        {/* Mahnungs-Meta */}
                        <div style={{ width: '68mm', fontSize: '9pt', lineHeight: '1.6', color: '#444' }}>
                          <div style={{ 
                            display: 'inline-block',
                            padding: '2px 8px', 
                            backgroundColor: isStufe3 ? '#fee2e2' : stufe === 2 ? '#ffedd5' : '#fef3c7',
                            color: isStufe3 ? '#991b1b' : stufe === 2 ? '#9a3412' : '#92400e',
                            fontWeight: 800,
                            fontSize: '9.5pt',
                            borderRadius: '4px',
                            marginBottom: '3mm',
                            textTransform: 'uppercase'
                          }}>
                            {isStufe3 ? 'Letzte Mahnung (SchKG)' : stufe === 2 ? '1. Mahnung' : 'Zahlungserinnerung'}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', paddingBottom: '2px' }}>
                            <span style={{ color: '#777' }}>Datum:</span>
                            <span style={{ fontWeight: 600 }}>{mahnDatum}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', padding: '2px 0' }}>
                            <span style={{ color: '#777' }}>Rechnung-Nr:</span>
                            <span style={{ fontWeight: 600 }}>{docNr}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', padding: '2px 0' }}>
                            <span style={{ color: '#777' }}>Zahlbar bis:</span>
                            <span style={{ fontWeight: 700, color: isStufe3 ? '#dc2626' : '#111' }}>{fristDatum || 'sofort'}</span>
                          </div>
                          {projekt?.name && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                              <span style={{ color: '#777' }}>Bauobjekt:</span>
                              <span style={{ fontWeight: 500, maxWidth: '42mm', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {projekt.name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Betreffzeile */}
                      <div style={{ marginTop: '6mm', marginBottom: '4mm' }}>
                        <h1 style={{ 
                          fontSize: '13pt', 
                          fontWeight: 800, 
                          color: isStufe3 ? '#991b1b' : '#111827',
                          letterSpacing: '-0.2px',
                          margin: 0
                        }}>
                          {mahnung?.betreff || `${mahnung?.titel || 'Mahnung'} zu Rechnung ${docNr}`}
                        </h1>
                      </div>
                    </>
                  )}

                  {/* 4. BRIEFTEXT (Paragraphs assigned to this page) */}
                  {pageConfig.paragraphs && pageConfig.paragraphs.map((p, pIdx) => (
                    <div 
                      key={pIdx}
                      style={{ 
                        fontSize: '9.5pt', 
                        lineHeight: '1.6', 
                        color: '#374151',
                        whiteSpace: 'pre-line',
                        marginBottom: '4mm'
                      }}
                    >
                      {p}
                    </div>
                  ))}

                  {/* 5. FORDERUNGSAUFSTELLUNG */}
                  {pageConfig.showForderungen && renderForderungsaufstellung()}

                  {/* 6. RECHTSHINWEIS / SCHKG-WARNBOX */}
                  {pageConfig.showHinweis && renderRechtshinweis()}

                  {/* 7. SCHLUSSFORMEL & SIGNATUR */}
                  {pageConfig.showClosing && renderSchlussformel()}

                  {/* 8. PINNED FOOTER (Every page) */}
                  <DocumentFooter
                    pageNum={pageIdx + 1}
                    totalPages={totalPages}
                    settings={settings}
                    brandColor={gold}
                  />
                </div>
              </div>
            )
          })}

          {/* Schweizer QR-Zahlteil über die neue Gesamtforderung */}
          {qrSvg && (
            <div
              className="mx-auto mb-6 sm:mb-8 flex justify-center print:m-0 print:block"
              style={!isGenerating ? {
                width: `${Math.round(794 * effectiveScale)}px`,
                height: `${Math.round(1123 * effectiveScale)}px`,
                position: 'relative',
                flexShrink: 0,
              } : {}}
            >
              <div 
                className={`mb-8 last:mb-0 print:border-none print:shadow-none print:m-0 ${isGenerating ? 'border-0 shadow-none' : 'shadow-2xl rounded-sm border border-neutral-200'}`}
                style={!isGenerating ? {
                  width: '794px',
                  height: '1123px',
                  transform: `scale(${effectiveScale})`,
                  transformOrigin: 'top left',
                } : {}}
              >
                <QrBillPage
                  qrSvg={qrSvg}
                  rechnung={qrRechnungMock}
                  kunde={kunde}
                  settings={settings}
                  pageNum={totalPages}
                  totalPages={totalPages}
                  brandColor={gold}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== PRINT STYLES ===== */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .a4-page {
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            transform: none !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
            padding: 20mm 20mm 20mm 25mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      {/* Toast Feedback */}
      {feedbackToast && (
        <div className={`fixed bottom-6 right-6 z-[120] px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 animate-fade-in ${
          feedbackToast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          {feedbackToast.type === 'error' ? <IconWarning className="w-4 h-4 text-red-600 shrink-0" /> : <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
          <span>{feedbackToast.text}</span>
        </div>
      )}
    </div>
  )
}
