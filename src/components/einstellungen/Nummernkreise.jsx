import { SettingsBlock, SettingsRow, InputField } from '../ui/SettingsComponents'

export default function Nummernkreise({ settings, draft, editState, isSaving, startEdit, cancelEdit, handleSave, handleDraftChange, userRole }) {
  const kundenPrefix = draft.prefix_kunden !== undefined ? draft.prefix_kunden : (settings.prefix_kunden || 'K-')
  const kundenStart = draft.startnummer_kunden !== undefined ? draft.startnummer_kunden : (settings.startnummer_kunden || 1000)
  const nextKundenPreview = `${kundenPrefix}${kundenStart}`

  const projektPrefix = draft.prefix_projekte !== undefined ? draft.prefix_projekte : (settings.prefix_projekte || 'P-')
  const projektStart = draft.startnummer_projekte !== undefined ? draft.startnummer_projekte : (settings.startnummer_projekte || 1000)
  const nextProjektPreview = `${projektPrefix}${projektStart}`

  return (
    <SettingsBlock
      title="Nummernkreise"
      description="Lege Startnummern und Präfixe für Dokumente, Kunden und Projekte fest."
      isEditing={editState === 'nummern'}
      onEdit={userRole !== 'treuhand' ? () => startEdit('nummern') : undefined}
      onCancel={cancelEdit}
      onSave={() => handleSave('nummern')}
      isSaving={isSaving}
      readOnlyView={
        <>
          <SettingsRow label="Startnummer Offerten" value={settings.startnummer_offerten || 1000} />
          <SettingsRow label="Startnummer Rechnungen" value={settings.startnummer_rechnungen || 1000} />
          <SettingsRow 
            label="Kundennummern" 
            value={
              <div className="flex items-center gap-2">
                <span>Präfix «{settings.prefix_kunden || 'K-'}», Start bei {settings.startnummer_kunden || 1000}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 font-semibold border border-primary-200">
                  z.B. {(settings.prefix_kunden || 'K-')}{(settings.startnummer_kunden || 1000)}
                </span>
              </div>
            } 
          />
          <SettingsRow 
            label="Projektnummern" 
            value={
              <div className="flex items-center gap-2">
                <span>Präfix «{settings.prefix_projekte || 'P-'}», Start bei {settings.startnummer_projekte || 1000}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 font-semibold border border-primary-200">
                  z.B. {(settings.prefix_projekte || 'P-')}{(settings.startnummer_projekte || 1000)}
                </span>
              </div>
            } 
          />
        </>
      }
    >
      {/* Dokumente: Offerten & Rechnungen */}
      <div className="md:col-span-2 text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">
        Dokumente (Offerten & Rechnungen)
      </div>
      <InputField 
        label="Startnummer Offerten" 
        type="number" 
        min="1" 
        step="1" 
        value={draft.startnummer_offerten} 
        onChange={v => handleDraftChange('startnummer_offerten', v === '' ? '' : parseInt(v, 10))} 
        placeholder="1000"
      />
      <InputField 
        label="Startnummer Rechnungen" 
        type="number" 
        min="1" 
        step="1" 
        value={draft.startnummer_rechnungen} 
        onChange={v => handleDraftChange('startnummer_rechnungen', v === '' ? '' : parseInt(v, 10))} 
        placeholder="1000"
      />

      {/* Stammdaten: Kunden */}
      <div className="md:col-span-2 text-xs font-bold text-text-secondary uppercase tracking-wider mt-4 mb-1">
        Kundenverwaltung
      </div>
      <InputField 
        label="Präfix Kundennummer" 
        value={draft.prefix_kunden !== undefined ? draft.prefix_kunden : (settings.prefix_kunden || 'K-')} 
        onChange={v => handleDraftChange('prefix_kunden', v)} 
        placeholder="K-"
      />
      <div>
        <InputField 
          label="Startnummer Kunden" 
          type="number" 
          min="1" 
          step="1" 
          value={draft.startnummer_kunden !== undefined ? draft.startnummer_kunden : (settings.startnummer_kunden || 1000)} 
          onChange={v => handleDraftChange('startnummer_kunden', v === '' ? '' : parseInt(v, 10))} 
          placeholder="1000"
        />
        <p className="text-[11px] text-text-secondary mt-1">
          Vorschau: Nächster Kunde erhält <strong className="text-primary-600 font-mono">{nextKundenPreview}</strong>
        </p>
      </div>

      {/* Stammdaten: Projekte */}
      <div className="md:col-span-2 text-xs font-bold text-text-secondary uppercase tracking-wider mt-4 mb-1">
        Projektverwaltung
      </div>
      <InputField 
        label="Präfix Projektnummer" 
        value={draft.prefix_projekte !== undefined ? draft.prefix_projekte : (settings.prefix_projekte || 'P-')} 
        onChange={v => handleDraftChange('prefix_projekte', v)} 
        placeholder="P-"
      />
      <div>
        <InputField 
          label="Startnummer Projekte" 
          type="number" 
          min="1" 
          step="1" 
          value={draft.startnummer_projekte !== undefined ? draft.startnummer_projekte : (settings.startnummer_projekte || 1000)} 
          onChange={v => handleDraftChange('startnummer_projekte', v === '' ? '' : parseInt(v, 10))} 
          placeholder="1000"
        />
        <p className="text-[11px] text-text-secondary mt-1">
          Vorschau: Nächstes Projekt erhält <strong className="text-primary-600 font-mono">{nextProjektPreview}</strong>
        </p>
      </div>
    </SettingsBlock>
  )
}
