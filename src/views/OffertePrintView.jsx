import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { generatePdf } from '../lib/pdfGenerator'
import { generateDocumentFilename } from '../lib/documentNaming'
import { formatDateLong } from '../lib/formatters'
import { getTenantStoragePath } from '../lib/storageHelper'
import {
  paginateDocument,
  FoldAndPunchMarks,
  DocumentHeader,
  ContinuationHeader,
  AddressWindow,
  DocumentMeta,
  TableHeader,
  PositionsTableBody,
  TotalsAndClosing,
  DocumentFooter,
  AusmassBeilagePage
} from '../components/document/A4DocumentLayout'
import { IconMail, IconFolder, IconPrinter, IconWarning, IconCheck } from '../components/icons/BrandIcons'

export default function OffertePrintView({ 
  offerte, 
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
  const [fitMode, setFitMode] = useState('page') // 'page' | 'custom'
  const [showMoreActions, setShowMoreActions] = useState(false)
  const [feedbackToast, setFeedbackToast] = useState(null)

  const settings = propSettings || loadedSettings
  const containerRef = useRef(null)

  const showToast = (type, text) => {
    setFeedbackToast({ type, text })
    setTimeout(() => setFeedbackToast(null), 3500)
  }

  // Load settings if not passed as prop
  useEffect(() => {
    if (propSettings) return
    if (supabase) {
      supabase.from('einstellungen').select('*').limit(1).maybeSingle()
        .then(({ data, error }) => {
          if (error && (error.code === '42703' || error.code === 'PGRST205' || error.code === '42P01')) {
            const localSettings = localStorage.getItem('atelier77_einstellungen_v2')
            if (localSettings) {
              setLoadedSettings(JSON.parse(localSettings))
            }
          } else if (data) {
            setLoadedSettings(data)
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
        // Leave room for padding & zoom toolbar
        const sidePadding = width < 640 ? 16 : 32
        const vertPadding = 56 // room for floating zoom toolbar
        const availableW = Math.max(200, width - sidePadding)
        const availableH = Math.max(200, height - vertPadding)
        const scaleW = availableW / A4_WIDTH
        const scaleH = availableH / A4_HEIGHT
        // Fit-to-page: fit BOTH width and height so the entire page is visible!
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

  if (!offerte) return null

  const daten = offerte.daten || {}
  const leistungen = daten.leistungen || []

  // Calculate totals
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

  const gold = settings?.primary_color || '#c5a057'
  const docNr = offerte.offerte_nr || `OF-${new Date(offerte.created_at || Date.now()).getFullYear()}-${String(offerte.id).padStart(3, '0')}`
  const docDate = formatDateLong(offerte.created_at || new Date().toISOString())

  // Intelligent A4 Page Pagination
  const paginatedPages = paginateDocument(leistungen, {
    introText: daten.einleitungstext || '',
    hasAusfuehrung: Boolean(daten.ausfuehrung?.start || daten.ausfuehrung?.dauer),
    hasSchlusstext: Boolean(daten.schlusstext),
    hasSignature: true
  })

  const hasAusmass = leistungen.some(p => p.ausmass_details && Array.isArray(p.ausmass_details) && p.ausmass_details.length > 0)
  const totalPages = paginatedPages.length + (hasAusmass ? 1 : 0)

  const pdfFilename = generateDocumentFilename({
    type: 'Offerte',
    docNr,
    kunde,
    projekt,
    date: offerte.created_at
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

  const handleDownloadPDF = async () => {
    setIsGenerating(true)
    try {
      const element = document.getElementById('pdf-pages-container')
      const opt = getPdfOptions()
      await generatePdf(element, opt, 'save')
      showToast('success', 'PDF erfolgreich heruntergeladen.')
    } catch (err) {
      console.error('PDF generation error:', err)
      showToast('error', 'Fehler bei der PDF-Erstellung.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveToArchive = async () => {
    setIsGenerating(true)
    try {
      const element = document.getElementById('pdf-pages-container')
      const opt = getPdfOptions()
      const blob = await generatePdf(element, opt, 'blob')

      const file = new File([blob], pdfFilename, { type: 'application/pdf' })
      const filePath = getTenantStoragePath(loadedSettings?.tenant_id || propSettings?.tenant_id, pdfFilename, 'offerten')

      const { error: uploadError } = await supabase.storage.from('anhange').upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('anhange').getPublicUrl(filePath)

      // Ermittle Versionsnummer für dieses Dokument
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
        kategorie: 'Offerte',
        quelle: 'Offerte-Export',
        offerte_id: offerte?.id || null,
        version: version
      }

      try {
        const { error: dbError } = await supabase.from('dateien').insert([filePayload])
        if (dbError && dbError.message?.includes('offerte_id')) {
          delete filePayload.offerte_id
          delete filePayload.version
          await supabase.from('dateien').insert([filePayload])
        } else if (dbError) {
          throw dbError
        }
      } catch (err) {
        delete filePayload.offerte_id
        delete filePayload.version
        await supabase.from('dateien').insert([filePayload])
      }

      // Aktualisiere Offerte mit pdf_url und archiviert_am
      if (offerte?.id) {
        await supabase.from('offerten').update({
          pdf_url: publicUrl,
          archiviert_am: new Date().toISOString()
        }).eq('id', offerte.id)
      }

      showToast('success', `PDF wurde erfolgreich als ${finalFilename} im Archiv gespeichert!`)
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
      const element = document.getElementById('pdf-pages-container')
      const opt = getPdfOptions()

      // 1. Generate PDF blob safely with oklab handling
      const blob = await generatePdf(element, opt, 'blob')

      // 2. Upload to Supabase storage and archive in dateien
      const file = new File([blob], pdfFilename, { type: 'application/pdf' })
      const filePath = getTenantStoragePath(loadedSettings?.tenant_id || propSettings?.tenant_id, pdfFilename, 'offerten')

      const { error: uploadError } = await supabase.storage.from('anhange').upload(filePath, file)
      if (uploadError) console.error('Upload warning:', uploadError)

      if (!uploadError) {
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
          kategorie: 'Offerte',
          quelle: 'Offerte-Email',
          offerte_id: offerte?.id || null,
          version: version
        }

        try {
          const { error: dbError } = await supabase.from('dateien').insert([filePayload])
          if (dbError && dbError.message?.includes('offerte_id')) {
            delete filePayload.offerte_id
            delete filePayload.version
            await supabase.from('dateien').insert([filePayload])
          }
        } catch (err) {
          delete filePayload.offerte_id
          delete filePayload.version
          await supabase.from('dateien').insert([filePayload])
        }

        if (offerte?.id) {
          await supabase.from('offerten').update({
            pdf_url: publicUrl,
            archiviert_am: new Date().toISOString()
          }).eq('id', offerte.id)
        }
      }

      // 3. Trigger local browser download so user has PDF ready to attach
      const blobUrl = URL.createObjectURL(blob)
      const downloadLink = document.createElement('a')
      downloadLink.href = blobUrl
      downloadLink.download = pdfFilename
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)

      // 4. Open mailto link
      const subject = encodeURIComponent(`Offerte ${docNr} - ${settings?.firmenname || 'Muster Malerei Bern AG'}`)
      const recipientName = kunde?.nachname ? ` ${kunde.nachname}` : (kunde?.firmenname ? ` ${kunde.firmenname}` : '')
      const body = encodeURIComponent(`Guten Tag${recipientName},\n\nAnbei erhalten Sie die Offerte ${docNr} für das Projekt "${projekt?.name || ''}".\n\nDas Dokument wurde soeben als PDF heruntergeladen und kann direkt angehängt werden.\n\nFreundliche Grüsse\n\n${settings?.firmenname || 'Muster Malerei Bern AG'}\n${settings?.website || ''}`)
      window.location.href = `mailto:${kunde?.email || ''}?subject=${subject}&body=${body}`

      showToast('success', 'PDF archiviert, heruntergeladen & E-Mail vorbereitet!')
    } catch (err) {
      console.error('Error during email and archiving:', err)
      showToast('error', 'Fehler beim Vorbereiten des PDFs für den E-Mail-Versand.')
    } finally {
      setIsGenerating(false)
    }
  }

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
          <button
            onClick={onClose}
            className="px-3 sm:px-3.5 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary bg-neutral-50 hover:bg-neutral-100 border border-border/80 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 min-h-[40px]"
          >
            <span>←</span>
            <span className="hidden sm:inline">Zurück</span>
          </button>

          {/* Document label */}
          <div className="text-xs sm:text-sm font-bold text-text-primary truncate px-2 text-center">
            {docNr}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Primary: Download PDF */}
            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="px-3.5 sm:px-4 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-all shadow-xs shadow-primary-600/20 cursor-pointer flex items-center gap-1.5 disabled:opacity-50 active:scale-[0.98] min-h-[40px]"
              title="PDF herunterladen"
            >
              <span>⬇️</span>
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
              onClick={() => window.print()}
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
                      onClick={() => { setShowMoreActions(false); window.print(); }}
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

      {/* ===== FLOATING ZOOM & CONTROLS TOOLBAR ===== */}
      <div className="sticky top-2 sm:top-3 z-30 flex justify-end px-3 sm:px-4 pointer-events-none mb-3 print:hidden">
        <div className="pointer-events-auto inline-flex items-center gap-1 bg-white/95 backdrop-blur-md border border-neutral-200/90 shadow-md rounded-xl p-1 text-xs font-semibold text-text-primary">
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
        <div id="pdf-pages-container" className="flex flex-col items-center pb-8">
          {paginatedPages.map((pageItems, pageIdx) => {
            const isFirst = pageIdx === 0
            const isLast = pageIdx === totalPages - 1

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
                    padding: '20mm 20mm 20mm 25mm', // Swiss standard margins: 25mm left binder, 20mm right/top/bottom
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
                    docType="Offerte" 
                    docNr={docNr} 
                    projektName={projekt?.name} 
                    date={docDate} 
                    brandColor={gold} 
                    settings={settings} 
                  />
                )}

                {/* 3. ADDRESS WINDOW & META (Page 1 only) */}
                {isFirst && (
                  <>
                    <AddressWindow kunde={kunde} settings={settings} />
                    <DocumentMeta 
                      docType="Offerte" 
                      docNr={docNr} 
                      date={docDate} 
                      konditionen={daten.konditionen} 
                      projekt={projekt} 
                    />
                    <div style={{ fontSize: '9.5pt', marginBottom: '6mm', lineHeight: '1.5', color: '#333' }}>
                      {daten.einleitungstext || 'Gerne unterbreiten wir Ihnen folgende Offerte:'}
                    </div>
                  </>
                )}

                {/* 4. POSITIONS TABLE */}
                {pageItems.length > 0 && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4mm' }}>
                    <TableHeader brandColor={gold} />
                    <PositionsTableBody items={pageItems} brandColor={gold} />
                  </table>
                )}

                {/* 5. TOTALS & CLOSING (Final content page only) */}
                {isLast && (
                  <TotalsAndClosing
                    rawTotal={rawTotal}
                    rabatt={rabatt}
                    rabattBetrag={rabattBetrag}
                    totalNachRabatt={totalNachRabatt}
                    mwst={mwst}
                    mwstBetrag={mwstBetrag}
                    finalTotal={finalTotal}
                    isPauschal={isPauschal}
                    optionenTotal={optionenTotal}
                    brandColor={gold}
                    daten={daten}
                    settings={settings}
                  />
                )}

                {/* 6. PINNED FOOTER (Every page) */}
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

          {hasAusmass && (
            <div
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
                  position: 'relative',
                  backgroundColor: '#ffffff',
                  overflow: 'hidden',
                  flexShrink: 0,
                  transform: !isGenerating ? `scale(${effectiveScale})` : 'none',
                  transformOrigin: 'top left',
                }}
              >
                <AusmassBeilagePage
                  leistungen={leistungen}
                  docNr={docNr}
                  docType="Offerte"
                  kunde={kunde}
                  projekt={projekt}
                  settings={settings}
                  brandColor={gold}
                  pageNum={totalPages}
                  totalPages={totalPages}
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
        <div className={`fixed bottom-6 right-6 z-[110] px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 animate-fade-in ${
          feedbackToast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          {feedbackToast.type === 'error' ? <IconWarning className="w-4 h-4 text-red-600 shrink-0" /> : <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
          <span>{feedbackToast.text}</span>
        </div>
      )}
    </div>
  )
}
