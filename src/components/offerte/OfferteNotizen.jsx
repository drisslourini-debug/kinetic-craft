export default function OfferteNotizen({
  notizen,
  onUpdate
}) {
  return (
    <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm">
      <h3 className="text-lg font-bold text-text-primary mb-4">Interne Notizen</h3>
      <textarea 
        defaultValue={notizen || ''}
        onBlur={(e) => onUpdate('notizen', e.target.value)}
        className="w-full h-32 px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none"
        placeholder="Absprachen, Rückrufe, Besonderheiten zur Offerte..."
      />
    </div>
  )
}
