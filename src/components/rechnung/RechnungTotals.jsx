import { formatCurrency } from '../../lib/formatters'

export default function RechnungTotals({
  isEditing,
  rawTotal,
  rabattProzent,
  rabattBetrag,
  mwstProzent,
  mwstBetrag,
  isPauschalActive,
  finalTotal,
  optionalTotal
}) {
  return (
    <div className="bg-surface-card rounded-2xl p-6 shadow-sm border border-border sticky top-6">
      <h3 className="text-text-secondary text-sm font-semibold mb-6">Kalkulation {isEditing && '(Live)'}</h3>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Zwischensumme</span>
          <span className="text-text-primary">{formatCurrency(rawTotal)}</span>
        </div>
        {rabattProzent > 0 && (
          <div className="flex justify-between text-sm text-red-600 font-medium">
            <span>Rabatt ({rabattProzent}%)</span>
            <span>- {formatCurrency(rabattBetrag)}</span>
          </div>
        )}
        {mwstProzent > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">MwSt ({mwstProzent}%)</span>
            <span className="text-text-primary">{formatCurrency(mwstBetrag)}</span>
          </div>
        )}
        {isEditing && isPauschalActive && (
          <div className="flex justify-between text-sm text-amber-600 font-medium">
            <span>⚡ Pauschalpreis</span>
            <span>aktiv</span>
          </div>
        )}
        <div className="pt-4 mt-4 border-t border-border flex justify-between items-center">
          <span className="font-bold text-xl text-text-primary">Total</span>
          <span className="font-black text-3xl tracking-tight text-text-primary">{formatCurrency(finalTotal)}</span>
        </div>
        {isEditing && optionalTotal > 0 && (
          <div className="pt-3 mt-1 border-t border-border/50 flex justify-between text-xs text-text-secondary">
            <span>Optionale Positionen</span>
            <span>{formatCurrency(optionalTotal)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
