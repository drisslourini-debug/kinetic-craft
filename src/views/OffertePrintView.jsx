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
  DocumentFooter
} from '../components/document/A4DocumentLayout'

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
  const [scale, setScale] = useState(1)
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

  // Responsive scaling for live preview in editor
  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect
        const A4_WIDTH = 794 // 96 DPI pixel width
        const A4_HEIGHT = 1123 // 96 DPI pixel height

        if (previewMode) {
          const scaleW = width / A4_WIDTH
          const scaleH = height / A4_HEIGHT
          setScale(Math.min(scaleW, scaleH) * 0.96)
        } else {
          setScale(Math.min(1, (width - 40) / A4_WIDTH))
        }
      }
    })

    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [previewMode])

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

  const totalPages = paginatedPages.length

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
      const subject = encodeURIComponent(`Offerte ${docNr} - ${settings?.firmenname || 'Atelier 77'}`)
      const recipientName = kunde?.nachname ? ` ${kunde.nachname}` : (kunde?.firmenname ? ` ${kunde.firmenname}` : '')
      const body = encodeURIComponent(`Guten Tag${recipientName},\n\nAnbei erhalten Sie die Offerte ${docNr} für das Projekt "${projekt?.name || ''}".\n\nDas Dokument wurde soeben als PDF heruntergeladen und kann direkt angehängt werden.\n\nFreundliche Grüsse\n\n${settings?.firmenname || 'Atelier 77'}\n${settings?.website || ''}`)
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
        ? "relative w-full h-full bg-neutral-100 overflow-y-auto print:static print:overflow-visible print:block print:bg-white print:p-0" 
        : "fixed inset-0 z-[100] bg-neutral-200/90 backdrop-blur-sm overflow-y-auto print:static print:overflow-visible print:block print:bg-white print:p-0"
      }
    >
      {/* ===== FLOATING GLASSMORPHIC ACTION BAR (hidden when printing or in mini preview) ===== */}
      {!previewMode && (
        <div className="print:hidden sticky top-4 z-30 mx-auto w-fit max-w-[95%] bg-white/90 backdrop-blur-md border border-neutral-200/80 px-5 py-2.5 rounded-2xl shadow-xl flex flex-wrap items-center justify-center sm:justify-between gap-3 my-2 animate-fade-in">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-3.5 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary bg-neutral-50 hover:bg-neutral-100 border border-border/80 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            ← Zurück
          </button>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={handleEmailWithPDF}
              disabled={isGenerating}
              className="px-3.5 py-2 text-sm font-medium text-text-secondary hover:text-text-primary bg-neutral-50 hover:bg-neutral-100 border border-border/80 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              title="PDF generieren, archivieren, herunterladen und per E-Mail versenden"
            >
              ✉️ {isGenerating ? 'Bereite vor...' : 'E-Mail'}
            </button>

            <button
              onClick={handleSaveToArchive}
              disabled={isGenerating}
              className="px-3.5 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              title="PDF generieren und im Dateien-Archiv speichern"
            >
              📁 {isGenerating ? 'Speichert...' : 'In Dateien archivieren'}
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="px-4 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-all shadow-xs shadow-primary-600/20 cursor-pointer flex items-center gap-1.5 disabled:opacity-50 active:scale-[0.98]"
              title="PDF herunterladen"
            >
              ⬇️ {isGenerating ? 'Erstelle PDF...' : 'PDF herunterladen'}
            </button>

            <button
              onClick={() => window.print()}
              className="px-4 py-2 text-sm font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300/80 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98]"
              title="Drucken über System-Druckdialog"
            >
              🖨️ Drucken
            </button>
          </div>
        </div>
      )}

      {/* ===== A4 PAGES CONTAINER ===== */}
      <div 
        className={previewMode ? "p-4" : "p-6 sm:p-10"}
        style={previewMode ? { transform: `scale(${scale})`, transformOrigin: 'top center' } : {}}
      >
        <div id="pdf-pages-container">
          {paginatedPages.map((pageItems, pageIdx) => {
            const isFirst = pageIdx === 0
            const isLast = pageIdx === totalPages - 1

            return (
              <div
                key={pageIdx}
                className={`a4-page bg-white mx-auto relative print:m-0 print:shadow-none mb-8 last:mb-0 ${isGenerating ? 'border-0 shadow-none' : 'shadow-2xl rounded-sm border border-neutral-200'} print:border-none`}
                style={{
                  width: '210mm',
                  height: '297mm',
                  maxHeight: '297mm',
                  boxSizing: 'border-box',
                  padding: '20mm 20mm 20mm 25mm', // Swiss standard margins: 25mm left binder, 20mm right/top/bottom
                  position: 'relative',
                  backgroundColor: '#ffffff',
                  overflow: 'hidden'
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
            )
          })}
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
          <span>{feedbackToast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{feedbackToast.text}</span>
        </div>
      )}
    </div>
  )
}
