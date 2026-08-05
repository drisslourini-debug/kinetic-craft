export default function RechnungKonditionen({
  daten,
  isEditing,
  editKonditionen,
  onKonditionenChange
}) {
  return (
    <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
      <h3 className="text-lg font-bold text-text-primary mb-2">Konditionen</h3>
      
      {isEditing ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1.5">Rabatt (%)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="100"
              value={editKonditionen.rabatt}
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
              value={editKonditionen.mwst}
              onChange={(e) => onKonditionenChange({ ...editKonditionen, mwst: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">Rabatt</label>
            <div className="text-sm font-medium text-text-primary">{daten.konditionen?.rabatt || 0}%</div>
          </div>
          <div>
            <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-1">MwSt</label>
            <div className="text-sm font-medium text-text-primary">{daten.konditionen?.mwst || 0}%</div>
          </div>
        </div>
      )}
    </div>
  )
}

