export default function TemplateCategory({ categoryKey, title, templates, onAdd, onEdit, onDelete, userRole }) {
  const categoryTemplates = templates.filter(t => t.category === categoryKey);
  
  return (
    <div className="mb-8 last:mb-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h4 className="text-md font-bold text-text-primary">{title}</h4>
        {userRole !== 'treuhand' && (
          <button 
            onClick={() => onAdd(categoryKey)}
            className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-4 py-3 sm:px-3 sm:py-1.5 flex items-center justify-center bg-primary-50 text-primary-600 text-base sm:text-xs font-bold rounded-lg hover:bg-primary-100 transition-colors cursor-pointer"
          >
            + Neue Vorlage
          </button>
        )}
      </div>
      
      {categoryTemplates.length === 0 ? (
        <div className="p-4 border border-dashed border-border rounded-xl text-sm text-text-secondary text-center bg-surface-50">
          Keine Vorlagen definiert. Es wird der System-Standard verwendet.
        </div>
      ) : (
        <div className="space-y-3">
          {categoryTemplates.map(t => (
            <div key={t.id} className="p-4 bg-surface rounded-xl border border-border shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between group hover:border-primary-200 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-text-primary mb-1 truncate">{t.label}</div>
                <div className="text-sm text-text-secondary line-clamp-2">{t.text}</div>
              </div>
              {userRole !== 'treuhand' && (
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 border-t sm:border-none border-border pt-3 sm:pt-0 mt-3 sm:mt-0">
                  <button onClick={() => onEdit(t)} className="flex-1 sm:flex-none p-3 sm:p-2 min-h-[48px] sm:min-h-[44px] flex items-center justify-center text-text-secondary hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer">
                    <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button onClick={() => onDelete(t.id)} className="flex-1 sm:flex-none p-3 sm:p-2 min-h-[48px] sm:min-h-[44px] flex items-center justify-center text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                    <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
