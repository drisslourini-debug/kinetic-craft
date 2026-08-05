export default function RechnungTexte({
  label,
  isEditing,
  value,
  onChange,
  templates,
  readOnlyText,
  placeholder
}) {
  if (!isEditing && !readOnlyText) return null

  return (
    <div className="bg-surface-card rounded-2xl border border-border p-5 shadow-sm">
      <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">{label}</label>
      
      {isEditing ? (
        <>
          {templates && templates.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {templates.map((tpl) => (
                <button
                  key={tpl.label}
                  onClick={() => onChange(tpl.text)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    value === tpl.text
                      ? 'bg-primary-100 border-primary-300 text-primary-700'
                      : 'bg-surface border-border text-text-secondary hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200'
                  }`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          )}
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-20 px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none"
            placeholder={placeholder}
          />
        </>
      ) : (
        <p className="text-sm text-text-primary whitespace-pre-wrap">{readOnlyText}</p>
      )}
    </div>
  )
}
