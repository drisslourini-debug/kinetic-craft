export default function OfferteKonditionen({
  daten,
  isEditing,
  editKonditionen,
  onKonditionenChange
}) {
  return (
    <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
      <h3 className="text-lg font-bold text-text-primary mb-2">Konditionen & Fristen</h3>
      
      {isEditing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1.5">Rabatt (%)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={editKonditionen.rabatt || 0}
                onChange={(e) => onKonditionenChange({ ...editKonditionen, rabatt: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1.5">MwSt (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={editKonditionen.mwst || 0}
                onChange={(e) => onKonditionenChange({ ...editKonditionen, mwst: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1.5">Gültigkeit Offerte</label>
              <select 
                value={editKonditionen.gueltigkeit || '30 Tage'}
                onChange={(e) => onKonditionenChange({ ...editKonditionen, gueltigkeit: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
              >
                <option value="10 Tage">10 Tage</option>
                <option value="14 Tage">14 Tage</option>
                <option value="30 Tage">30 Tage</option>
                <option value="60 Tage">60 Tage</option>
                <option value="90 Tage">90 Tage</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1.5">Zahlungsfrist (Rechnung)</label>
              <select 
                value={editKonditionen.zahlungsfrist || '30 Tage Netto'}
                onChange={(e) => onKonditionenChange({ ...editKonditionen, zahlungsfrist: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
              >
                <option value="10 Tage Netto">10 Tage Netto</option>
                <option value="14 Tage Netto">14 Tage Netto</option>
                <option value="30 Tage Netto">30 Tage Netto</option>
                <option value="14 Tage 2% Skonto, 30 Tage Netto">14 Tage 2% Skonto, 30 Tage Netto</option>
                <option value="Vorauskasse">Vorauskasse</option>
                <option value="Barzahlung bei Abschluss">Barzahlung bei Abschluss</option>
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Rabatt</label>
            <div className="text-sm font-medium text-text-primary">{daten.konditionen?.rabatt || 0}%</div>
          </div>
          <div>
            <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">MwSt</label>
            <div className="text-sm font-medium text-text-primary">{daten.konditionen?.mwst || 0}%</div>
          </div>
          <div>
            <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Gültigkeit</label>
            <div className="text-sm font-medium text-text-primary">{daten.konditionen?.gueltigkeit || '30 Tage'}</div>
          </div>
          <div>
            <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Zahlungsfrist</label>
            <div className="text-sm font-medium text-text-primary">{daten.konditionen?.zahlungsfrist || '30 Tage Netto'}</div>
          </div>
        </div>
      )}
    </div>
  )
}

