import React, { useState, useRef } from 'react'
import { formatCurrency, formatDate } from '../../lib/formatters'
import {
  IconCalendar,
  IconClock,
  IconRapport,
  IconMoney,
  IconPlus,
  IconArrowRight,
  IconCheck,
  IconImage,
  IconFolder,
  IconUser,
  IconClose
} from '../icons/BrandIcons'

export default function ProjektCockpit({
  projekt,
  kunde,
  termine = [],
  rapporte = [],
  zeiterfassungEntries = [],
  ausgaben = [],
  dateien = [],
  onOpenTerminModal,
  onOpenCreateRapport,
  onOpenRapportDetail,
  onCreateInvoiceFromRapport,
  onOpenZeiterfassungModal,
  onOpenAusgabeModal,
  onFileUpload,
  onNavigate,
  userRole = 'admin'
}) {
  const [photoFilter, setPhotoFilter] = useState('all') // 'all' | 'vorher' | 'nachher'
  const [uploadCategory, setUploadCategory] = useState('vorher')
  const [isDragging, setIsDragging] = useState(false)
  const [previewPhoto, setPreviewPhoto] = useState(null)
  const fileInputRef = useRef(null)

  // Filter image files from project files or default realistic examples
  const imageFiles = dateien.filter(
    (d) => d.dateityp?.startsWith('image/') || /\.(jpg|jpeg|png|webp|heic)$/i.test(d.name || '')
  )

  // Default craft photos for realistic Swiss demonstration if no images uploaded
  const demoPhotos = [
    {
      id: 'demo-img-1',
      name: 'Baustelle_Vorher_2484.jpg',
      category: 'vorher',
      url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
      created_at: projekt?.startdatum || '2026-10-01'
    },
    {
      id: 'demo-img-2',
      name: 'Baustelle_Nachher_2491.jpg',
      category: 'nachher',
      url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
      created_at: new Date().toISOString()
    }
  ]

  const displayPhotos = imageFiles.length > 0
    ? imageFiles.map(img => ({
        ...img,
        category: (img.name || '').toLowerCase().includes('nachher') ? 'nachher' : 'vorher'
      }))
    : demoPhotos

  const filteredPhotos = displayPhotos.filter(p => {
    if (photoFilter === 'all') return true
    return p.category === photoFilter
  })

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (onFileUpload) {
        onFileUpload(Array.from(e.dataTransfer.files), uploadCategory)
      }
    }
  }

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      if (onFileUpload) {
        onFileUpload(Array.from(e.target.files), uploadCategory)
      }
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* ========================================================================= */}
      {/* LINKE SPALTE (Operatives & Finanzen) - 7 Spalten                          */}
      {/* ========================================================================= */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* 1. Einsätze & Termine */}
        <div className="bento-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/70">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <h3 className="font-semibold text-text-primary text-sm tracking-tight">
                Terminierte Baustelleneinsätze
              </h3>
              <span className="text-xs text-text-muted font-medium bg-zinc-100 px-2 py-0.5 rounded-full">
                {termine.length}
              </span>
            </div>
            {userRole !== 'treuhand' && (
              <button
                type="button"
                onClick={onOpenTerminModal}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#b88a38] hover:text-[#9e7428] cursor-pointer"
              >
                <IconPlus className="w-3.5 h-3.5" />
                <span>Einsatz planen</span>
              </button>
            )}
          </div>

          {termine.length === 0 ? (
            <div className="py-6 text-center bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200">
              <IconCalendar className="w-6 h-6 text-zinc-400 mx-auto mb-1.5" />
              <p className="text-xs text-text-muted">Noch keine Einsätze für dieses Projekt geplant.</p>
              {userRole !== 'treuhand' && (
                <button
                  type="button"
                  onClick={onOpenTerminModal}
                  className="mt-2 text-xs font-semibold text-[#b88a38] hover:underline cursor-pointer"
                >
                  + Ersten Termin erfassen
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {termine.slice(0, 3).map((termin) => (
                <div
                  key={termin.id}
                  onClick={() => onNavigate && onNavigate('kalender', { date: termin.datum, projektId: projekt.id })}
                  className="p-3 rounded-xl border border-border/80 bg-surface hover:bg-zinc-50 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono font-medium text-text-muted bg-zinc-100 px-1.5 py-0.5 rounded">
                        {formatDate(termin.datum)} {termin.uhrzeit ? `• ${termin.uhrzeit}` : ''}
                      </span>
                      <span className="text-xs font-bold text-text-primary truncate">
                        {termin.titel}
                      </span>
                    </div>
                    {termin.ort && (
                      <p className="text-[11px] text-text-muted truncate mt-0.5">
                        {termin.ort}
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    termin.status === 'Bestätigt' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                  }`}>
                    {termin.status || 'Geplant'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Gestempelte Stunden (Zeiterfassung) */}
        <div className="bento-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/70">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h3 className="font-semibold text-text-primary text-sm tracking-tight">
                Zeiterfassung & Gestempelte Stunden
              </h3>
              <span className="text-xs text-text-muted font-medium bg-zinc-100 px-2 py-0.5 rounded-full">
                {zeiterfassungEntries.reduce((acc, curr) => acc + (parseFloat(curr.dauer_stunden) || 0), 0).toFixed(1)} h total
              </span>
            </div>
            {userRole !== 'treuhand' && (
              <button
                type="button"
                onClick={onOpenZeiterfassungModal}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#b88a38] hover:text-[#9e7428] cursor-pointer"
              >
                <IconPlus className="w-3.5 h-3.5" />
                <span>Zeit eintragen</span>
              </button>
            )}
          </div>

          {zeiterfassungEntries.length === 0 ? (
            <div className="py-6 text-center bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200">
              <IconClock className="w-6 h-6 text-zinc-400 mx-auto mb-1.5" />
              <p className="text-xs text-text-muted">Keine Zeiteinträge vorhanden.</p>
              {userRole !== 'treuhand' && (
                <button
                  type="button"
                  onClick={onOpenZeiterfassungModal}
                  className="mt-2 text-xs font-semibold text-[#b88a38] hover:underline cursor-pointer"
                >
                  + Stunden manuell eintragen
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {zeiterfassungEntries.slice(0, 3).map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-xl border border-border/80 bg-surface flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-primary truncate">
                        {entry.taetigkeit || 'Regiearbeiten vor Ort'}
                      </span>
                      {entry.verrechenbar && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-medium border border-emerald-200/50">
                          Verrechenbar
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {entry.mitarbeiter_name || 'Monteur'} • {formatDate(entry.datum)}
                    </p>
                  </div>
                  <div className="text-right shrink-0 font-mono font-bold text-text-primary">
                    {parseFloat(entry.dauer_stunden || 0).toFixed(1)} h
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Regierapporte & Status */}
        <div className="bento-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/70">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h3 className="font-semibold text-text-primary text-sm tracking-tight">
                Regierapporte & Baustellenberichte
              </h3>
              <span className="text-xs text-text-muted font-medium bg-zinc-100 px-2 py-0.5 rounded-full">
                {rapporte.length}
              </span>
            </div>
            {userRole !== 'treuhand' && (
              <button
                type="button"
                onClick={onOpenCreateRapport}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#b88a38] hover:text-[#9e7428] cursor-pointer"
              >
                <IconPlus className="w-3.5 h-3.5" />
                <span>+ Neuer Rapport</span>
              </button>
            )}
          </div>

          {rapporte.length === 0 ? (
            <div className="py-6 text-center bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200">
              <IconRapport className="w-6 h-6 text-zinc-400 mx-auto mb-1.5" />
              <p className="text-xs text-text-muted">Noch keine Regierapporte erstellt.</p>
              {userRole !== 'treuhand' && (
                <button
                  type="button"
                  onClick={onOpenCreateRapport}
                  className="mt-2 text-xs font-semibold text-[#b88a38] hover:underline cursor-pointer"
                >
                  + Regierapport anlegen
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {rapporte.slice(0, 4).map((rap) => {
                const isSigned = rap.status === 'Unterschrieben'
                const isBilled = rap.status === 'Verrechnet'
                const isPendingInvoice = isSigned && !isBilled

                return (
                  <div
                    key={rap.id}
                    onClick={() => onOpenRapportDetail && onOpenRapportDetail(rap)}
                    className="p-3.5 rounded-xl border border-border/80 bg-surface hover:bg-zinc-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-text-primary">
                          #{rap.rapport_nr || 'RAP-ENTWURF'}
                        </span>
                        <span className="text-xs text-text-muted">
                          {formatDate(rap.datum)}
                        </span>
                        
                        {/* Status Badges */}
                        {isBilled ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                            Verrechnet
                          </span>
                        ) : isSigned ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <IconCheck className="w-3 h-3 text-emerald-600" />
                            Unterschrieben
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60">
                            Noch nicht verrechnet
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-text-secondary truncate mt-1 font-medium">
                        {rap.beschreibung || 'Regiearbeiten Baustelle'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {isPendingInvoice && userRole !== 'treuhand' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (onCreateInvoiceFromRapport) onCreateInvoiceFromRapport(rap)
                          }}
                          className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                          title="Rapport in offizielle Rechnung überführen"
                        >
                          <span>In Rechnung stellen →</span>
                        </button>
                      )}
                      <span className="text-xs font-semibold text-text-muted group-hover:text-text-primary flex items-center gap-0.5">
                        Details <IconArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 4. Materialausgaben & Belege */}
        <div className="bento-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/70">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <h3 className="font-semibold text-text-primary text-sm tracking-tight">
                Materialausgaben & Belege
              </h3>
              <span className="text-xs text-text-muted font-medium bg-zinc-100 px-2 py-0.5 rounded-full">
                {formatCurrency(ausgaben.reduce((sum, a) => sum + parseFloat(a.betrag_brutto || 0), 0))}
              </span>
            </div>
            {userRole !== 'treuhand' && (
              <button
                type="button"
                onClick={onOpenAusgabeModal}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#b88a38] hover:text-[#9e7428] cursor-pointer"
              >
                <IconPlus className="w-3.5 h-3.5" />
                <span>+ Ausgabe erfassen</span>
              </button>
            )}
          </div>

          {ausgaben.length === 0 ? (
            <div className="py-6 text-center bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200">
              <IconMoney className="w-6 h-6 text-zinc-400 mx-auto mb-1.5" />
              <p className="text-xs text-text-muted">Keine Belege für dieses Projekt erfasst.</p>
              {userRole !== 'treuhand' && (
                <button
                  type="button"
                  onClick={onOpenAusgabeModal}
                  className="mt-2 text-xs font-semibold text-[#b88a38] hover:underline cursor-pointer"
                >
                  + Tank- oder Materialbeleg scannen
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {ausgaben.slice(0, 3).map((ausgabe) => (
                <div
                  key={ausgabe.id}
                  className="p-3 rounded-xl border border-border/80 bg-surface flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-text-primary truncate block">
                      {ausgabe.lieferant || 'Materialbeleg'}
                    </span>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {ausgabe.beleg_nr ? `#${ausgabe.beleg_nr} • ` : ''}{formatDate(ausgabe.beleg_datum)}
                    </p>
                  </div>
                  <div className="text-right shrink-0 font-bold text-rose-700">
                    {formatCurrency(ausgabe.betrag_brutto)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* RECHTE SPALTE (Visuelle Baustellen-Fotodoku) - 5 Spalten                  */}
      {/* ========================================================================= */}
      <div className="lg:col-span-5 space-y-6">
        
        <div className="bento-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/70">
            <div className="flex items-center gap-2">
              <IconImage className="w-4 h-4 text-[#b88a38]" />
              <h3 className="font-semibold text-text-primary text-sm tracking-tight">
                Baustellen-Fotodokumentation
              </h3>
            </div>
            
            {/* Filter Pills */}
            <div className="inline-flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200/60 text-[11px]">
              <button
                type="button"
                onClick={() => setPhotoFilter('all')}
                className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
                  photoFilter === 'all' ? 'bg-white text-text-primary shadow-2xs font-bold' : 'text-text-muted'
                }`}
              >
                Alle ({displayPhotos.length})
              </button>
              <button
                type="button"
                aria-label="Filter Vorher"
                onClick={() => setPhotoFilter('vorher')}
                className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
                  photoFilter === 'vorher' ? 'bg-white text-text-primary shadow-2xs font-bold' : 'text-text-muted'
                }`}
              >
                Vorher
              </button>
              <button
                type="button"
                aria-label="Filter Nachher"
                onClick={() => setPhotoFilter('nachher')}
                className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
                  photoFilter === 'nachher' ? 'bg-white text-text-primary shadow-2xs font-bold' : 'text-text-muted'
                }`}
              >
                Nachher
              </button>
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          {userRole !== 'treuhand' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 rounded-xl border-2 border-dashed transition-all text-center cursor-pointer ${
                isDragging 
                  ? 'border-[#b88a38] bg-[#b88a38]/5' 
                  : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-600 shadow-2xs">
                  <IconImage className="w-4 h-4 text-[#b88a38]" />
                </div>
                <p className="text-xs font-semibold text-text-primary">
                  Fotos per Drag & Drop hier ablegen
                </p>
                <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[11px] text-text-muted">Kategorie:</span>
                  <div className="inline-flex rounded-md shadow-2xs p-0.5 bg-zinc-200/70 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setUploadCategory('vorher')}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                        uploadCategory === 'vorher' ? 'bg-white text-text-primary shadow-2xs' : 'text-zinc-600'
                      }`}
                    >
                      Vorher
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadCategory('nachher')}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                        uploadCategory === 'nachher' ? 'bg-white text-text-primary shadow-2xs' : 'text-zinc-600'
                      }`}
                    >
                      Nachher
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Photos Grid */}
          <div className="grid grid-cols-2 gap-3">
            {filteredPhotos.map((photo) => {
              const isVorher = photo.category === 'vorher'

              return (
                <div
                  key={photo.id}
                  onClick={() => setPreviewPhoto(photo)}
                  className="group relative rounded-xl overflow-hidden border border-border/80 bg-zinc-100 aspect-4/3 cursor-pointer shadow-2xs hover:shadow-md transition-all"
                >
                  <img
                    src={photo.url || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80'}
                    alt={photo.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  
                  {/* Category Pill Badge */}
                  <div className="absolute top-2 left-2">
                    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs backdrop-blur-md ${
                      isVorher
                        ? 'bg-amber-950/80 text-amber-200 border border-amber-500/30'
                        : 'bg-emerald-950/80 text-emerald-200 border border-emerald-500/30'
                    }`}>
                      {isVorher ? 'Vorher' : 'Nachher'}
                    </span>
                  </div>

                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-90 transition-opacity">
                    <p className="text-[11px] font-medium text-white truncate">
                      {photo.name}
                    </p>
                    <span className="text-[10px] text-zinc-300">
                      {formatDate(photo.created_at)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pt-2 text-center">
            <span className="text-xs text-text-muted">
              Fotodokumentation gemäss SIA 118 Art. 141 & Beweissicherung.
            </span>
          </div>
        </div>

      </div>

      {/* Lightbox Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="max-w-3xl w-full bg-surface rounded-2xl overflow-hidden border border-border shadow-2xl relative animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-border flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-text-primary">{previewPhoto.name}</p>
                <span className="text-xs text-text-muted capitalize">Kategorie: {previewPhoto.category}</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 cursor-pointer"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] bg-black flex items-center justify-center overflow-hidden">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.name}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
