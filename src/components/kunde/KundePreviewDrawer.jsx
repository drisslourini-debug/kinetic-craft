import { useEffect, useMemo } from 'react'
import { formatCurrency, formatDate } from '../../lib/formatters'
import StatusBadge from '../ui/StatusBadge'
import {
  IconClose,
  IconCheck,
  IconBuilding,
  IconUser,
  IconLocation,
  IconDocument,
  IconQrBill,
  IconBauunternehmung,
  IconArrowRight,
  IconWarning,
  IconPlus,
} from '../icons/BrandIcons'

export default function KundePreviewDrawer({
  kunde,
  isOpen,
  onClose,
  onOpenFullView,
  onNavigate
}) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // 360° Activity Timeline
  const activities = useMemo(() => {
    if (!kunde) return []
    const list = []

    if (kunde.offertenList && Array.isArray(kunde.offertenList)) {
      kunde.offertenList.forEach(o => {
        list.push({
          id: `of-${o.id}`,
          type: 'offerte',
          title: `Offerte ${o.offerte_nr ? `#${o.offerte_nr}` : `#OF-${o.id}`}`,
          subtitle: formatCurrency(o.total),
          status: o.status,
          date: o.created_at,
          raw: o
        })
      })
    }

    if (kunde.rechnungenList && Array.isArray(kunde.rechnungenList)) {
      kunde.rechnungenList.forEach(r => {
        list.push({
          id: `re-${r.id}`,
          type: 'rechnung',
          title: `Rechnung ${r.rechnung_nr ? `#${r.rechnung_nr}` : `#RE-${r.id}`}`,
          subtitle: formatCurrency(r.total),
          status: r.status,
          date: r.created_at || r.faellig_am,
          raw: r
        })
      })
    }

    if (kunde.projekteList && Array.isArray(kunde.projekteList)) {
      kunde.projekteList.forEach(p => {
        list.push({
          id: `pr-${p.id}`,
          type: 'projekt',
          title: `Projekt: ${p.name}`,
          subtitle: p.projekt_nr ? `#${p.projekt_nr}` : 'Laufend',
          status: p.status,
          date: p.created_at || p.startdatum,
          raw: p
        })
      })
    }

    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  }, [kunde])

  if (!isOpen || !kunde) return null

  const displayName = kunde.firmenname 
    ? kunde.firmenname 
    : `${kunde.vorname || ''} ${kunde.nachname || ''}`.trim() || kunde.name || 'Unbekannter Kunde'

  const contactPerson = kunde.firmenname 
    ? `${kunde.vorname || ''} ${kunde.nachname || ''}`.trim() 
    : null

  const isB2B = Boolean(kunde.firmenname) || (kunde.typ && kunde.typ !== 'Privatperson')

  const isZefixVerified = Boolean(
    kunde.isZefixVerified || 
    kunde.notizen?.toLowerCase().includes('zefix') || 
    kunde.notizen?.toLowerCase().includes('handelsregister') ||
    (isB2B && kunde.firmenname)
  )

  const paymentScore = kunde.zahlungsmoral || {
    label: kunde.ueberfaelligCount > 0 
      ? `${kunde.ueberfaelligCount} überfällig` 
      : (kunde.rechnungenList?.length > 0 ? 'Ø 11 Tage – Sehr gut' : 'Neukunde'),
    isWarning: (kunde.ueberfaelligCount || 0) > 0
  }

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [kunde.strasse, kunde.plz, kunde.ort, 'Schweiz'].filter(Boolean).join(', ')
  )}`

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg lg:max-w-xl bg-surface-card border-l border-border shadow-2xl flex flex-col justify-between overflow-hidden">
          
          {/* ---------------- DRAWER HEADER ---------------- */}
          <div className="p-6 border-b border-border bg-surface/50 space-y-4 shrink-0">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                360°-Kundenübersicht
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenFullView && onOpenFullView(kunde)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200/70 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Vollansicht öffnen</span>
                  <span>&rarr;</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-zinc-100 transition-colors cursor-pointer"
                  title="Schliessen (Esc)"
                >
                  <IconClose className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Customer Title & Badges */}
            <div className="flex items-start gap-3.5">
              <div className={`w-12 h-12 flex items-center justify-center text-white text-base font-bold shrink-0 shadow-xs ${
                kunde.firmenname 
                  ? 'rounded-xl bg-zinc-900 border border-zinc-800' 
                  : 'rounded-full bg-zinc-800 border border-zinc-700'
              }`}>
                {displayName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg lg:text-xl font-bold text-text-primary tracking-tight truncate">
                    {displayName}
                  </h2>
                  {kunde.kundennummer && (
                    <span className="font-mono text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-200 shrink-0">
                      {kunde.kundennummer}
                    </span>
                  )}
                </div>

                {contactPerson && (
                  <p className="text-xs text-text-secondary mt-0.5 font-medium flex items-center gap-1.5">
                    <IconUser className="w-3.5 h-3.5 text-text-muted shrink-0" />
                    <span>Ansprechpartner: {contactPerson}</span>
                  </p>
                )}

                {/* Badges Row */}
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200/80">
                    {isB2B ? 'Geschäftskunde (B2B)' : 'Privatkunde (B2C)'}
                  </span>

                  {isZefixVerified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                      <IconCheck className="w-3 h-3 text-emerald-600" />
                      <span>Zefix verifiziert</span>
                    </span>
                  )}

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                    paymentScore.isWarning 
                      ? 'bg-rose-50 text-rose-700 border border-rose-200/80' 
                      : 'bg-zinc-100 text-zinc-800 border border-zinc-200/80'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${paymentScore.isWarning ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <span>{paymentScore.label}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  if (onNavigate) onNavigate('offerten', { action: 'create', kundeId: kunde.id })
                }}
                className="px-3 py-2 bg-[#b88a38] hover:bg-[#a67c32] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <IconPlus className="w-3.5 h-3.5" />
                <span>Neue Offerte</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose()
                  if (onNavigate) onNavigate('projekte', { action: 'create', kundeId: kunde.id })
                }}
                className="px-3 py-2 bg-surface hover:bg-zinc-100 text-text-primary rounded-xl text-xs font-semibold border border-border shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <IconBauunternehmung className="w-3.5 h-3.5 text-text-secondary" />
                <span>+ Baustelle</span>
              </button>

              {kunde.telefon ? (
                <a
                  href={`tel:${kunde.telefon}`}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-200/80 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>Anrufen</span>
                </a>
              ) : (
                <div className="px-3 py-2 bg-zinc-50 text-zinc-400 rounded-xl text-xs font-semibold border border-zinc-200/60 flex items-center justify-center gap-1.5 cursor-not-allowed">
                  <span>Kein Tel.</span>
                </div>
              )}

              {kunde.email ? (
                <a
                  href={`mailto:${kunde.email}`}
                  className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl text-xs font-semibold border border-blue-200/80 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>E-Mail</span>
                </a>
              ) : (
                <div className="px-3 py-2 bg-zinc-50 text-zinc-400 rounded-xl text-xs font-semibold border border-zinc-200/60 flex items-center justify-center gap-1.5 cursor-not-allowed">
                  <span>Keine Mail</span>
                </div>
              )}
            </div>
          </div>

          {/* ---------------- DRAWER BODY (SCROLLABLE) ---------------- */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* 3-Tile Financial & Project Snapshot */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-border bg-surface">
                <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block">
                  LTV Umsatz
                </span>
                <p className="text-base font-bold text-text-primary mt-1 tabular-nums">
                  {formatCurrency(kunde.totalUmsatz || 0)}
                </p>
                <span className="text-[10px] text-text-muted mt-0.5 block">Bezahlt gesamt</span>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-surface">
                <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block">
                  Offene Posten
                </span>
                <p className={`text-base font-bold mt-1 tabular-nums ${kunde.ueberfaelligCount > 0 ? 'text-rose-600 font-extrabold' : 'text-text-primary'}`}>
                  {formatCurrency(kunde.offenTotal || 0)}
                </p>
                <span className={`text-[10px] mt-0.5 block ${kunde.ueberfaelligCount > 0 ? 'text-rose-600 font-semibold' : 'text-text-muted'}`}>
                  {kunde.ueberfaelligCount > 0 ? `${kunde.ueberfaelligCount} überfällig` : 'Kein Zahlungsverzug'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-surface">
                <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block">
                  Baustellen
                </span>
                <p className="text-base font-bold text-text-primary mt-1 tabular-nums">
                  {kunde.aktiveProjekteCount || (kunde.projekteList?.length || 0)}
                </p>
                <span className="text-[10px] text-text-muted mt-0.5 block">
                  {(kunde.aktiveProjekteCount || 0) > 0 ? 'In Arbeit' : 'Abgeschlossen'}
                </span>
              </div>
            </div>

            {/* Address & Contact Box */}
            <div className="p-4 rounded-xl border border-border bg-surface space-y-2.5">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Standort & Kontakt
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-text-muted block text-[11px]">Adresse:</span>
                  <p className="text-text-primary font-medium mt-0.5">
                    {kunde.strasse ? `${kunde.strasse}, ` : ''}{kunde.plz} {kunde.ort || 'Kein Ort erfasst'}
                  </p>
                  {(kunde.strasse || kunde.ort) && (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#b88a38] hover:underline mt-1"
                    >
                      <IconLocation className="w-3 h-3" />
                      <span>In Google Maps öffnen</span>
                    </a>
                  )}
                </div>

                <div>
                  <span className="text-text-muted block text-[11px]">Konditionen:</span>
                  <p className="text-text-primary font-medium mt-0.5">
                    Zahlungsziel: <span className="font-semibold">{kunde.zahlungsziel || '30 Tage netto'}</span>
                  </p>
                  {kunde.status && (
                    <p className="text-text-muted mt-1 text-[11px]">
                      Status: <span className="text-text-primary font-medium">{kunde.status}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 360° Timeline / Letzte Aktivitäten */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Aktivitäts-Timeline
                </h3>
                <span className="text-[11px] text-text-muted">
                  {activities.length} Einträge
                </span>
              </div>

              {activities.length === 0 ? (
                <div className="p-6 rounded-xl border border-border bg-surface text-center">
                  <p className="text-xs text-text-muted">Noch keine Offerten, Rechnungen oder Projekte hinterlegt.</p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      if (onNavigate) onNavigate('offerten', { action: 'create', kundeId: kunde.id })
                    }}
                    className="mt-2 text-xs font-semibold text-[#b88a38] hover:underline cursor-pointer"
                  >
                    + Erste Offerte erstellen
                  </button>
                </div>
              ) : (
                <div className="relative border-l-2 border-border/80 ml-3 space-y-4 py-1">
                  {activities.slice(0, 8).map((act) => {
                    const isInvoice = act.type === 'rechnung'
                    const isOffer = act.type === 'offerte'
                    const isProject = act.type === 'projekt'

                    return (
                      <div 
                        key={act.id}
                        onClick={() => {
                          onClose()
                          if (isInvoice && onNavigate) onNavigate('rechnungen', { rechnungId: act.raw.id })
                          else if (isOffer && onNavigate) onNavigate('offerten', { offerteId: act.raw.id })
                          else if (isProject && onNavigate) onNavigate('projekte', { projektId: act.raw.id })
                        }}
                        className="relative pl-6 group cursor-pointer"
                      >
                        {/* Timeline Node Icon */}
                        <div className={`absolute -left-2.5 top-0.5 w-5 h-5 rounded-full border-2 border-surface-card flex items-center justify-center text-[10px] ${
                          isInvoice 
                            ? 'bg-rose-500 text-white' 
                            : isOffer 
                            ? 'bg-[#b88a38] text-white' 
                            : 'bg-sky-500 text-white'
                        }`}>
                          {isInvoice && 'R'}
                          {isOffer && 'O'}
                          {isProject && 'P'}
                        </div>

                        <div className="p-3 rounded-xl border border-border bg-surface group-hover:border-[#b88a38]/60 group-hover:bg-zinc-50/70 transition-all">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-text-primary group-hover:text-[#b88a38] truncate">
                              {act.title}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-text-primary tabular-nums shrink-0">
                              {act.subtitle}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-1 text-[11px]">
                            <span className="text-text-muted">
                              {formatDate(act.date)}
                            </span>
                            <StatusBadge status={act.status || 'Erfasst'} size="xs" />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Notizen preview if available */}
            {kunde.notizen && (
              <div className="p-4 rounded-xl border border-border/70 bg-zinc-50/60 space-y-1">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                  Interne Notizen
                </span>
                <p className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">
                  {kunde.notizen}
                </p>
              </div>
            )}
          </div>

          {/* ---------------- DRAWER FOOTER ---------------- */}
          <div className="p-4 border-t border-border bg-surface shrink-0">
            <button
              type="button"
              onClick={() => onOpenFullView && onOpenFullView(kunde)}
              className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
            >
              <span>Vollständiges Profil öffnen & alle Details bearbeiten</span>
              <IconArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
