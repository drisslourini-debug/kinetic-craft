import { IconLock } from '../icons/BrandIcons'

export const SettingsBlock = ({ title, description, isEditing, onEdit, onCancel, onSave, isSaving, children, readOnlyView, disabled, className = '' }) => (
  <div className={`bg-surface-card rounded-2xl border border-border shadow-2xs p-4 sm:p-6 mb-4 sm:mb-6 w-full ${className}`}>
    <div className="flex justify-between items-start mb-3 sm:mb-5">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">{title}</h3>
          {disabled && (
            <span className="text-[10px] sm:text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md font-semibold inline-flex items-center gap-1">
              <IconLock className="w-3 h-3 text-gray-500" />
              <span>Gesperrt</span>
            </span>
          )}
        </div>
        {description && <p className="hidden sm:block text-xs sm:text-sm text-text-secondary mt-1">{description}</p>}
      </div>
      {!isEditing && !disabled && (
        <button 
          type="button"
          onClick={onEdit} 
          className="p-2 sm:p-1.5 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 text-text-secondary hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0 active:scale-95" 
          title="Bearbeiten"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        </button>
      )}
    </div>
    
    <div>
      {isEditing ? (
        <div className="animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {children}
          </div>
          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-border flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-4">
            <button 
              type="button"
              onClick={onCancel} 
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-5 py-2.5 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              Abbrechen
            </button>
            <button 
              type="button"
              onClick={onSave} 
              disabled={isSaving} 
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-6 py-2.5 text-sm font-bold bg-primary-600 text-white rounded-xl hover:bg-primary-700 active:scale-95 transition-all shadow-md shadow-primary-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Speichert...
                </>
              ) : 'Speichern'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col border-t border-gray-100 pt-1 divide-y divide-gray-100">
          {readOnlyView}
        </div>
      )}
    </div>
  </div>
)

export const SettingsRow = ({ label, value, href, icon, hideIfEmpty = false }) => {
  const isEmpty = value === undefined || value === null || value === '' || value === false
  if (hideIfEmpty && isEmpty) return null

  return (
    <div className="flex items-center justify-between py-2.5 px-1.5 hover:bg-gray-50/70 transition-colors rounded-xl -mx-1.5 text-sm">
      <div className="text-xs sm:text-sm font-medium text-text-secondary shrink-0 pr-3 flex items-center gap-1.5">
        {icon && <span className="text-xs shrink-0">{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="text-sm font-semibold text-text-primary text-right break-words flex-1 flex justify-end items-center gap-1.5">
        {isEmpty ? (
          <span className="text-gray-400 font-normal italic text-xs">Nicht angegeben</span>
        ) : href ? (
          <a 
            href={href} 
            target={href.startsWith('http') ? '_blank' : undefined}
            rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="text-primary-600 hover:text-primary-800 active:underline flex items-center gap-1 text-right"
          >
            <span className="truncate max-w-[220px] sm:max-w-none">{value}</span>
            <svg className="w-3.5 h-3.5 opacity-60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        ) : (
          value
        )}
      </div>
    </div>
  )
}

export const InputField = ({ label, value, onChange, type = "text", fullWidth = false, placeholder = "", error = null, min, max, step }) => (
  <div className={fullWidth ? "md:col-span-2" : ""}>
    <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">
      {label} {error && <span className="text-red-500 font-normal ml-1 lowercase">({error})</span>}
    </label>
    <input
      type={type}
      value={value ?? ''}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      onChange={e => onChange(e.target.value)}
      className={`w-full px-3 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-surface border rounded-lg text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary-400 transition-colors ${error ? 'border-red-400 bg-red-50/50' : 'border-border'}`}
    />
  </div>
)

export const SelectField = ({ label, value, onChange, options, fullWidth = false }) => (
  <div className={fullWidth ? "md:col-span-2" : ""}>
    <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">{label}</label>
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-surface border border-border rounded-lg text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary-400 transition-colors"
    >
      <option value="">-- Bitte wählen --</option>
      {options.map(opt => (
        <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>
      ))}
    </select>
  </div>
)

export const TextAreaField = ({ label, value, onChange, fullWidth = true, placeholder = "", small = false }) => (
  <div className={fullWidth ? "md:col-span-2" : ""}>
    <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">{label}</label>
    <textarea
      value={value || ''}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className={`w-full px-3 py-3 sm:py-2 bg-surface border border-border rounded-lg text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary-400 transition-colors resize-y ${small ? 'h-24 sm:h-20' : 'h-40 sm:h-32'}`}
    />
  </div>
)
