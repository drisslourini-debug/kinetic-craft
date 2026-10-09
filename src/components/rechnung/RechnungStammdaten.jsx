import { formatDate, formatMoney } from '../../lib/formatters'
import {
  IconUser,
  IconHammer,
  IconDocument,
  IconTag,
  IconCreditCard,
  IconLegal,
  IconMoney,
  IconCheck,
  IconCalendar
} from '../icons/BrandIcons'

export default function RechnungStammdaten({
  rechnung,
  kunde,
  projekt,
  settings,
  status,
  isDirty,
  isUpdating,
  editStammdaten,
  onStammInputChange,
  onSaveStammdaten,
  onNavigate,
  showPaymentForm,
  setShowPaymentForm,
  paymentDate,
  setPaymentDate,
  paymentAmount,
  setPaymentAmount,
  onPayment,
  onDeletePayment,
  onWriteOff,
  userRole
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-text-primary">Stammdaten</h3>
          
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-primary-600 mb-3 flex items-center gap-1.5">
              <IconUser className="w-3.5 h-3.5" />
              <span>Kunde</span>
            </label>
            <div 
              className="mt-1.5 font-medium text-primary-600 hover:text-primary-800 cursor-pointer transition-colors"
              onClick={() => kunde && onNavigate && onNavigate('kunden', { kundeId: kunde.id })}
            >{kunde ? kunde.name : 'Unbekannt'}</div>
            {kunde && kunde.ort && <div className="text-sm text-text-secondary">{kunde.ort}</div>}
          </div>

          <div className="pt-4 border-t border-border">
            <label className="text-xs font-bold uppercase tracking-wider text-primary-600 mb-3 flex items-center gap-1.5">
              <IconHammer className="w-3.5 h-3.5" />
              <span>Projekt / Baustelle</span>
            </label>
            <div 
              className="mt-1.5 font-medium text-primary-600 hover:text-primary-800 cursor-pointer transition-colors"
              onClick={() => projekt && onNavigate && onNavigate('projekte', { projektId: projekt.id })}
            >{projekt ? projekt.name : 'Kein Projekt zugeordnet'}</div>
            {projekt && projekt.adresse && <div className="text-sm text-text-secondary">{projekt.adresse}</div>}
          </div>

          {rechnung.offerte_id && (
            <div className="pt-4 border-t border-border">
              <label className="text-xs font-bold uppercase tracking-wider text-primary-600 mb-3 flex items-center gap-1.5">
                <IconDocument className="w-3.5 h-3.5" />
                <span>Offerte</span>
              </label>
              <button 
                onClick={() => onNavigate && onNavigate('offerten', { offerteId: rechnung.offerte_id })}
                className="mt-1.5 text-sm text-primary-600 hover:text-primary-800 underline cursor-pointer"
              >
                Offerte #{rechnung.offerte_id} ansehen
              </button>
            </div>
          )}

          <div className="pt-4 border-t border-border">
            <label className="text-xs font-bold uppercase tracking-wider text-primary-600 mb-3 flex items-center gap-1.5">
              <IconTag className="w-3.5 h-3.5" />
              <span>Rechnungstyp</span>
            </label>
            <div className="mt-1.5 text-sm text-text-primary capitalize font-medium">
              {(rechnung.typ === 'schluss' || rechnung.daten?.is_schlussrechnung || rechnung.daten?.sia118?.aktiv) ? (
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs inline-block">
                  SIA 118 Schlussrechnung
                </span>
              ) : (
                <>
                  {rechnung.typ || 'gesamt'}
                  {rechnung.typ === 'akonto' && rechnung.akonto_prozent && ` (${rechnung.akonto_prozent}%)`}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Payment Action & History */}
        {(status === 'Versendet' || status === 'Überfällig' || status === 'Teilbezahlt' || status === 'Bezahlt') && (
          <div className="space-y-4">
            
            {/* Payment History */}
            {rechnung.daten?.zahlungen && rechnung.daten.zahlungen.length > 0 && (
              <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    <IconCreditCard className="w-5 h-5 text-emerald-600" />
                    <span>Zahlungseingänge</span>
                  </h3>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-text-primary">
                      Total: CHF {formatMoney(rechnung.total || 0)}
                    </div>
                    <div className="text-xs font-bold text-emerald-600">
                      Bezahlt: CHF {formatMoney(rechnung.bezahlt || 0)}
                    </div>
                    {((rechnung.total || 0) - (rechnung.bezahlt || 0)) > 0 && (
                      <div className="text-xs font-bold text-red-500 mt-0.5">
                        Offen: CHF {formatMoney((rechnung.total || 0) - (rechnung.bezahlt || 0))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  {rechnung.daten.zahlungen.map((z) => (
                    <div key={z.id} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${z.typ === 'Ausbuchung' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {z.typ === 'Ausbuchung' ? (
                            <IconLegal className="w-4 h-4" />
                          ) : (
                            <IconMoney className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-text-primary text-sm">{formatDate(z.datum)}</div>
                          <div className="text-xs text-text-secondary">{z.typ === 'Ausbuchung' ? 'Ausbuchung (Skonto/Verlust)' : 'Zahlungseingang'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`text-sm font-bold ${z.typ === 'Ausbuchung' ? 'text-amber-600' : 'text-emerald-600'}`}>
                          CHF {formatMoney(z.betrag)}
                        </div>
                        {userRole !== 'treuhand' && (
                          <button 
                            onClick={() => onDeletePayment(z.id)}
                            className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:p-1.5 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Zahlung löschen"
                          >
                            <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Payment Form / Button */}
            {status !== 'Bezahlt' && userRole !== 'treuhand' && (
              <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-text-primary">Zahlung erfassen</h3>
                {!showPaymentForm ? (
                  <div className="flex flex-col gap-3 sm:gap-2">
                    <button 
                      onClick={() => setShowPaymentForm(true)}
                      className="w-full min-h-[48px] py-3 flex items-center justify-center gap-2 sm:py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer text-center text-base sm:text-sm"
                    >
                      <IconMoney className="w-4 h-4" />
                      <span>Zahlung eingegangen</span>
                    </button>
                    {rechnung.daten?.zahlungen?.length > 0 && (
                      <button 
                        onClick={onWriteOff}
                        className="w-full min-h-[48px] py-3 flex items-center justify-center gap-2 sm:py-2 bg-white border border-amber-200 text-amber-700 font-bold rounded-xl hover:bg-amber-50 transition-colors cursor-pointer text-center text-base sm:text-sm"
                      >
                        <IconLegal className="w-4 h-4" />
                        <span>Restbetrag ausbuchen (Skonto)</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div>
                      <label className="text-xs font-bold text-emerald-800 block mb-1">Datum</label>
                      <input 
                        type="date"
                        value={paymentDate}
                        onChange={e => setPaymentDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-emerald-800 block mb-1">Betrag (CHF)</label>
                      <input 
                        type="number"
                        step="0.05"
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 pt-2">
                      <button 
                        onClick={onPayment}
                        className="flex-1 min-h-[48px] py-3 flex items-center justify-center sm:py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer text-base sm:text-sm"
                      >
                        Bestätigen
                      </button>
                      <button 
                        onClick={() => setShowPaymentForm(false)}
                        className="w-full sm:w-auto px-4 min-h-[48px] py-3 flex items-center justify-center sm:py-2 bg-white text-emerald-700 border border-emerald-200 font-bold rounded-xl hover:bg-emerald-50 transition-colors cursor-pointer text-base sm:text-sm"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Fully Paid State */}
            {status === 'Bezahlt' && (!rechnung.daten?.zahlungen || rechnung.daten.zahlungen.length === 0) && rechnung.bezahlt_am && (
              <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6 shadow-sm space-y-2">
                <h3 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
                  <IconCheck className="w-5 h-5 text-emerald-600" />
                  <span>Vollständig bezahlt</span>
                </h3>
                <p className="text-emerald-700 text-sm">
                  Zahlungseingang: {formatDate(rechnung.bezahlt_am)}
                </p>
                <p className="text-emerald-700 font-bold">
                  Betrag: CHF {formatMoney(rechnung.bezahlt)}
                </p>
              </div>
            )}
            
            {status === 'Bezahlt' && rechnung.daten?.zahlungen?.length > 0 && (
              <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4 shadow-sm flex items-center justify-between">
                <h3 className="font-bold text-emerald-800 flex items-center gap-2">
                  <IconCheck className="w-4 h-4 text-emerald-600" />
                  <span>Vollständig bezahlt</span>
                </h3>
                <span className="text-sm font-bold text-emerald-700">CHF {formatMoney(rechnung.bezahlt)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-text-primary">Rechnungsdaten</h3>
          
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-primary-600 mb-2 block">Rechnungsdatum</label>
            <input 
              type="date"
              value={editStammdaten.rechnungsdatum || ''}
              onChange={(e) => onStammInputChange('rechnungsdatum', e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
            />
          </div>
          
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-primary-600 mb-2 block">Zahlungsfrist (Tage)</label>
            <input 
              type="number"
              value={editStammdaten.zahlungsfrist_tage || 30}
              onChange={(e) => onStammInputChange('zahlungsfrist_tage', parseInt(e.target.value) || 30)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-primary-600 block">Fälligkeitsdatum (automatisch)</label>
              {(rechnung.faellig_am || rechnung.daten?.faellig_am) && onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('kalender', { date: rechnung.faellig_am || rechnung.daten?.faellig_am })}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Im Kalender ansehen"
                >
                  <IconCalendar className="w-3.5 h-3.5" />
                  <span>Im Kalender ansehen</span>
                </button>
              )}
            </div>
            <div className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-secondary bg-gray-50 flex items-center justify-between">
              <span>{rechnung.faellig_am || rechnung.daten?.faellig_am ? formatDate(rechnung.faellig_am || rechnung.daten?.faellig_am) : 'Wird beim Speichern berechnet'}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm">
          <h3 className="text-lg font-bold text-text-primary mb-4">Bankverbindung</h3>
          {settings?.iban ? (
            <div className="text-sm space-y-1">
              <p className="text-text-secondary">IBAN: <span className="font-medium text-text-primary">{settings.iban}</span></p>
              {settings.bank_name && <p className="text-text-secondary">Bank: <span className="font-medium text-text-primary">{settings.bank_name}</span></p>}
            </div>
          ) : (
            <p className="text-sm text-text-secondary italic">Keine Bankverbindung in den Einstellungen hinterlegt.</p>
          )}
        </div>

        <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm">
          <h3 className="text-lg font-bold text-text-primary mb-4">Interne Notizen</h3>
          <textarea 
            value={editStammdaten.notizen || ''}
            onChange={(e) => onStammInputChange('notizen', e.target.value)}
            className="w-full h-32 px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none"
            placeholder="Absprachen, Zahlungsversprechen, Besonderheiten..."
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 md:col-span-2">
        <div>
          {isDirty && (
            <span className="text-sm text-amber-600 font-medium animate-pulse">
              Es gibt ungespeicherte Änderungen in den Stammdaten
            </span>
          )}
        </div>
        <button 
          onClick={onSaveStammdaten}
          disabled={!isDirty || isUpdating}
          className="w-full sm:w-auto min-h-[48px] px-6 py-3 flex items-center justify-center sm:py-2.5 bg-primary-600 text-white font-bold text-base sm:text-sm rounded-xl hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary-600/20"
        >
          {isUpdating ? 'Wird gespeichert...' : 'Änderungen speichern'}
        </button>
      </div>
    </div>
  )
}
