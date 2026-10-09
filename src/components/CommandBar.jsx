import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { IconNav, IconDocument, IconQrBill, IconTeam, IconBauunternehmung } from './icons/BrandIcons'

export default function CommandBar({ isOpen, onClose, onNavigate }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef(null)

  // Quick Action items
  const baseActions = [
    {
      id: 'act-offerte',
      type: 'action',
      title: 'Neue Offerte erstellen',
      subtitle: 'Kalkulation und Angebot starten',
      icon: <IconDocument className="w-4 h-4 text-amber-600" />,
      action: () => { onNavigate('offerten', { action: 'create' }); onClose(); }
    },
    {
      id: 'act-rechnung',
      type: 'action',
      title: 'Neue QR-Rechnung erstellen',
      subtitle: 'Rechnung nach Schweizer QR-Standard',
      icon: <IconQrBill className="w-4 h-4 text-emerald-600" />,
      action: () => { onNavigate('rechnungen', { action: 'create' }); onClose(); }
    },
    {
      id: 'act-kunde',
      type: 'action',
      title: 'Neuen Kunden anlegen',
      subtitle: 'Stammdaten & Adresse erfassen',
      icon: <IconTeam className="w-4 h-4 text-sky-600" />,
      action: () => { onNavigate('kunden', { action: 'create' }); onClose(); }
    },
    {
      id: 'act-projekt',
      type: 'action',
      title: 'Neues Bauprojekt anlegen',
      subtitle: 'Baustelle & Rapportierung zuweisen',
      icon: <IconBauunternehmung className="w-4 h-4 text-primary-600" />,
      action: () => { onNavigate('projekte', { action: 'create' }); onClose(); }
    },
  ]

  const navItems = [
    { id: 'nav-dashboard', type: 'nav', title: 'Dashboard', subtitle: 'Übersicht & Finanzen', view: 'dashboard' },
    { id: 'nav-kunden', type: 'nav', title: 'Kundenverzeichnis', subtitle: 'Kontakte & Historie', view: 'kunden' },
    { id: 'nav-projekte', type: 'nav', title: 'Projekte & Baustellen', subtitle: 'Aktive Vorhaben', view: 'projekte' },
    { id: 'nav-kalender', type: 'nav', title: 'Kalender & Termine', subtitle: 'Einsatzplanung', view: 'kalender' },
    { id: 'nav-offerten', type: 'nav', title: 'Offerten', subtitle: 'Angebote & Voranschläge', view: 'offerten' },
    { id: 'nav-rechnungen', type: 'nav', title: 'Rechnungen', subtitle: 'Debitoren & QR-Rechnungen', view: 'rechnungen' },
    { id: 'nav-buchhaltung', type: 'nav', title: 'Buchhaltung & MWST', subtitle: 'Einnahmen/Ausgaben', view: 'buchhaltung' },
    { id: 'nav-dateien', type: 'nav', title: 'Dateien & Pläne', subtitle: 'Baudokumentation', view: 'dateien' },
    { id: 'nav-katalog', type: 'nav', title: 'Leistungskatalog', subtitle: 'Material & Arbeitssätze', view: 'katalog' },
    { id: 'nav-einstellungen', type: 'nav', title: 'Einstellungen', subtitle: 'Firmendaten & Layout', view: 'einstellungen' },
  ]

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [isOpen])

  // Live search when query changes
  useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    const q = query.trim().toLowerCase()

    if (!q) {
      setResults([...baseActions, ...navItems])
      setSelectedIndex(0)
      return
    }

    const filteredActions = baseActions.filter(a => 
      a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q)
    )

    const filteredNav = navItems.filter(n => 
      n.title.toLowerCase().includes(q) || n.subtitle.toLowerCase().includes(q)
    ).map(n => ({
      ...n,
      icon: <IconNav id={n.view} className="w-4 h-4 text-zinc-500" />,
      action: () => { onNavigate(n.view); onClose(); }
    }))

    // Async search kunden and rechnungen
    const fetchRemote = async () => {
      if (!supabase) return
      setIsLoading(true)
      try {
        const [kRes, rRes] = await Promise.all([
          supabase.from('kunden').select('id, name, firmenname, kundennummer, ort').eq('is_archived', false).ilike('name', `%${q}%`).limit(4),
          supabase.from('rechnungen').select('id, rechnung_nr, total, status, kunden(name)').eq('is_archived', false).ilike('rechnung_nr', `%${q}%`).limit(4)
        ])

        if (!isMounted) return

        const remoteItems = []

        if (kRes?.data) {
          kRes.data.forEach(k => {
            const displayName = k.firmenname ? `${k.firmenname} (${k.name})` : k.name
            remoteItems.push({
              id: `kunde-${k.id}`,
              type: 'kunde',
              title: displayName,
              subtitle: `${k.kundennummer || 'Kunde'} • ${k.ort || 'Schweiz'}`,
              icon: <IconTeam className="w-4 h-4 text-sky-600" />,
              action: () => { onNavigate('kunden', { kundeId: k.id }); onClose(); }
            })
          })
        }

        if (rRes?.data) {
          rRes.data.forEach(r => {
            remoteItems.push({
              id: `rechnung-${r.id}`,
              type: 'rechnung',
              title: `Rechnung ${r.rechnung_nr}`,
              subtitle: `${r.kunden?.name || 'Kunde'} • CHF ${parseFloat(r.total || 0).toFixed(2)} • ${r.status}`,
              icon: <IconQrBill className="w-4 h-4 text-emerald-600" />,
              action: () => { onNavigate('rechnungen', { rechnungId: r.id }); onClose(); }
            })
          })
        }

        setResults([...filteredActions, ...remoteItems, ...filteredNav])
        setSelectedIndex(0)
      } catch (err) {
        console.error('Command search error:', err)
        setResults([...filteredActions, ...filteredNav])
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    const timer = setTimeout(fetchRemote, 120)
    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [query, isOpen])

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % Math.max(1, results.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(1, results.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = results[selectedIndex]
      if (item) {
        if (item.action) item.action()
        else if (item.view) { onNavigate(item.view); onClose(); }
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-zinc-950/40 backdrop-blur-xs animate-fade-in">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />

      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-zinc-200/90 overflow-hidden z-10 animate-scale-in">
        {/* Search input bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-zinc-200/80 gap-3 bg-zinc-50/50">
          <svg className="w-4 h-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Suchen nach Kunden, Rechnungen oder Aktionen..."
            className="flex-1 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none"
          />
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin shrink-0" />
          ) : (
            <span className="kbd-badge text-[10px]">ESC</span>
          )}
        </div>

        {/* Results list */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {results.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              Keine Treffer für &ldquo;{query}&rdquo;
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.action) item.action()
                    else if (item.view) { onNavigate(item.view); onClose(); }
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all
                    ${isSelected ? 'bg-zinc-100 text-zinc-900 shadow-2xs' : 'text-zinc-700 hover:bg-zinc-50'}
                  `}
                >
                  <div className="shrink-0 p-1.5 rounded-lg bg-white border border-zinc-200/60 shadow-2xs">
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-zinc-900 truncate">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] text-zinc-400 font-mono kbd-badge">
                      ↵
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Command bar footer tips */}
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-50 border-t border-zinc-200/80 text-[11px] text-zinc-500">
          <div className="flex items-center gap-2">
            <span>Navigieren</span>
            <span className="kbd-badge">↑</span>
            <span className="kbd-badge">↓</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Auswählen</span>
            <span className="kbd-badge">↵</span>
          </div>
        </div>
      </div>
    </div>
  )
}
