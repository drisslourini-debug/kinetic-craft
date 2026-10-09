import { useState } from 'react'
import { IconClock, IconCheck, IconClose, IconCreditCard } from '../icons/BrandIcons'

export default function LizenzVerwaltung({ tenant, settings }) {
  const [selectedBillingCycle, setSelectedBillingCycle] = useState('monthly') // 'monthly' | 'yearly'
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Calculate trial days remaining
  const trialEnd = tenant?.trial_ends_at ? new Date(tenant.trial_ends_at) : null
  const now = new Date()
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))) : 14

  const isPro = tenant?.status === 'pro' || tenant?.status === 'active'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Test-Modus Info Banner (wie bei extro.swiss) */}
      {!isPro && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <IconClock className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                Du befindest dich im 14-tägigen Test-Modus
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Noch <strong className="font-semibold">{daysLeft} Tage</strong> verbleibend. Aktiviere jetzt dein vollwertiges Abonnement, um Kinetic Craft ununterbrochen produktiv zu nutzen.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-md shadow-primary-600/20 transition-all cursor-pointer whitespace-nowrap"
          >
            Abonnement aktivieren
          </button>
        </div>
      )}

      {/* Aktuelles Abonnement Übersicht */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Dein Abonnement */}
        <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Dein Abonnement</span>
            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-2xl font-black text-text-primary">
                {isPro ? 'Pro-Plan' : 'Testphase (Free)'}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isPro ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {isPro ? 'Aktiv' : 'Kostenlos'}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              {isPro ? 'Voller Zugriff auf alle KMU-Funktionen' : `Gültig bis ${trialEnd ? trialEnd.toLocaleDateString('de-CH') : 'in 14 Tagen'}`}
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-xs text-text-secondary">Lizenzen aktiv:</span>
            <span className="text-sm font-bold text-text-primary">1 Arbeitsplatz</span>
          </div>
        </div>

        {/* Nächste Rechnung */}
        <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Nächste Abrechnung</span>
            <div className="mt-2">
              <h3 className="text-2xl font-black text-text-primary">
                {isPro ? 'CHF 49.00' : 'Keine Rechnung'}
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                {isPro ? 'Wird am 1. des nächsten Monats fällig' : 'Im Testmodus fallen keine Kosten an'}
              </p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-xs text-text-secondary">Zahlungsweg:</span>
            <span className="text-sm font-semibold text-text-primary">{isPro ? 'Kreditkarte (Stripe)' : '–'}</span>
          </div>
        </div>

        {/* Add-ons & Module */}
        <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Inkludierte Module</span>
            <div className="space-y-2 mt-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Schweizer QR-Rechnungen (nach ISO 20022)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Treuhand- & Buchhaltungsexport</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Unbegrenzte Kunden & Offerten</span>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-xs text-text-secondary">Status:</span>
            <span className="text-xs font-bold text-emerald-600">Freigeschaltet</span>
          </div>
        </div>
      </div>

      {/* Plan-Vergleich (Free vs. Pro) */}
      <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h4 className="text-base font-bold text-text-primary">Tarife & Upgrades</h4>
            <p className="text-xs text-text-secondary mt-0.5">Wähle den passenden Plan für deinen Handwerksbetrieb.</p>
          </div>
          <div className="flex items-center bg-surface border border-border rounded-xl p-1 self-start sm:self-auto">
            <button
              onClick={() => setSelectedBillingCycle('monthly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                selectedBillingCycle === 'monthly' ? 'bg-primary-600 text-white shadow-xs' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Monatlich
            </button>
            <button
              onClick={() => setSelectedBillingCycle('yearly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                selectedBillingCycle === 'yearly' ? 'bg-primary-600 text-white shadow-xs' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Jährlich (10% Rabatt)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <div className="border border-border rounded-2xl p-6 bg-surface flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h5 className="text-lg font-bold text-text-primary">Starter / Free</h5>
                <span className="text-xs bg-gray-200 text-gray-700 px-2.5 py-0.5 rounded-full font-semibold">Basis</span>
              </div>
              <div className="text-3xl font-black text-text-primary mb-4">
                CHF 0 <span className="text-xs font-normal text-text-secondary">/ Monat</span>
              </div>
              <ul className="space-y-2 text-xs text-text-secondary">
                <li className="flex items-center gap-2">
                  <IconCheck className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                  <span>Bis zu 20 Kunden</span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                  <span>Standard Offerten & Rechnungen</span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                  <span>Schweizer QR-Code Generierung</span>
                </li>
                <li className="flex items-center gap-2 text-gray-400">
                  <IconClose className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span>Eigenes Briefpapier-Layout & Branding</span>
                </li>
                <li className="flex items-center gap-2 text-gray-400">
                  <IconClose className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span>Treuhand-Portal & Exporte</span>
                </li>
              </ul>
            </div>
            <button 
              disabled={!isPro}
              className={`mt-6 w-full py-2.5 text-xs font-bold rounded-xl border transition-colors ${
                !isPro ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-default' : 'bg-surface hover:bg-neutral-100 text-text-primary border-border cursor-pointer'
              }`}
            >
              {!isPro ? 'Aktueller Status' : 'Auf Starter wechseln'}
            </button>
          </div>

          {/* Pro Plan */}
          <div className="border-2 border-primary-500 rounded-2xl p-6 bg-primary-50/20 flex flex-col justify-between relative shadow-md">
            <span className="absolute -top-3 right-6 bg-primary-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
              Beliebteste Wahl
            </span>
            <div>
              <div className="flex justify-between items-center mb-2">
                <h5 className="text-lg font-bold text-text-primary">Professional</h5>
                <span className="text-xs bg-primary-100 text-primary-800 px-2.5 py-0.5 rounded-full font-bold">Unbegrenzt</span>
              </div>
              <div className="text-3xl font-black text-primary-700 mb-4">
                {selectedBillingCycle === 'yearly' ? 'CHF 44.00' : 'CHF 49.00'} <span className="text-xs font-normal text-text-secondary">/ Monat</span>
              </div>
              <ul className="space-y-2 text-xs text-text-primary">
                <li className="flex items-center gap-2 font-medium">
                  <IconCheck className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                  <span>Unbegrenzte Kunden & Projekte</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <IconCheck className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                  <span>Unbegrenzte Offerten & QR-Rechnungen</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <IconCheck className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                  <span>Vollwertige Buchhaltung & MWST-Abrechnung</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <IconCheck className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                  <span>Treuhand-Zugänge inklusive</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <IconCheck className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                  <span>Eigenes Briefpapier, Firmenlogo & Farben</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <IconCheck className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                  <span>Word- & PDF-Export mit Firmen-Design</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="mt-6 w-full py-2.5 text-xs font-bold rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-600/20 transition-all cursor-pointer"
            >
              {isPro ? 'Abonnement verwalten' : 'Jetzt auf Pro upgraden'}
            </button>
          </div>
        </div>
      </div>

      {/* Rechnungs- und Zahlungsdetails (wie extro.swiss) */}
      <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm">
        <h4 className="text-base font-bold text-text-primary mb-4">Rechnungs- und Zahlungseinstellungen</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Rechnungsadresse</span>
            <p className="font-semibold text-text-primary">{settings?.firmenname || tenant?.name || 'Firma'}</p>
            <p className="text-text-secondary">{settings?.strasse || 'Keine Strasse hinterlegt'}</p>
            <p className="text-text-secondary">{[settings?.plz, settings?.ort].filter(Boolean).join(' ') || settings?.plz_ort || ''}</p>
            <p className="text-text-secondary">{settings?.land || 'Schweiz'}</p>
          </div>
          <div>
            <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Zahlungsmittel</span>
            <div className="p-4 bg-surface rounded-xl border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                  <IconCreditCard className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-text-primary">Stripe Self-Service</p>
                  <p className="text-[11px] text-text-secondary">Sichere Kreditkartenzahlung & TWINT</p>
                </div>
              </div>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="text-xs font-semibold text-primary-600 hover:text-primary-800 cursor-pointer"
              >
                Hinterlegen
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary">Abonnement verwalten</h3>
              <button 
                onClick={() => setShowUpgradeModal(false)} 
                className="text-text-secondary hover:text-text-primary p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Schliessen"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              Für die sichere Aktivierung und Verwaltung des Stripe-Kundenportals kontaktiere uns direkt oder starte den Checkout:
            </p>
            <div className="bg-primary-50 p-4 rounded-xl border border-primary-200 mb-5">
              <div className="text-xs text-primary-900 font-medium">
                Mandant: <strong>{tenant?.name || settings?.firmenname}</strong>
              </div>
              <div className="text-xs text-primary-700 mt-1">
                Plan: Pro (CHF 49.- / Monat)
              </div>
            </div>
            <div className="space-y-3">
              <a
                href={`mailto:support@ki-netic.ch?subject=Stripe-Aktivierung für ${encodeURIComponent(tenant?.name || 'Mandant')}&body=Hallo Kinetic Craft Team,%0D%0Awir möchten das Pro-Abonnement aktivieren.`}
                className="w-full flex items-center justify-center py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-sm transition-colors"
              >
                Support für Checkout kontaktieren
              </a>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
              >
                Schliessen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
