import { SettingsBlock, SettingsRow, InputField } from '../ui/SettingsComponents'

export default function Nummernkreise({ settings, draft, editState, isSaving, startEdit, cancelEdit, handleSave, handleDraftChange, userRole }) {
  return (
    <SettingsBlock
      title="Nummernkreise"
      description="Lege fest, mit welcher Nummer die nächste Offerte oder Rechnung startet."
      isEditing={editState === 'nummern'}
      onEdit={userRole !== 'treuhand' ? () => startEdit('nummern') : undefined}
      onCancel={cancelEdit}
      onSave={() => handleSave('nummern')}
      isSaving={isSaving}
      readOnlyView={
        <>
          <SettingsRow label="Startnummer Offerten" value={settings.startnummer_offerten} />
          <SettingsRow label="Startnummer Rechnungen" value={settings.startnummer_rechnungen} />
        </>
      }
    >
      <InputField label="Startnummer Offerten" type="number" value={draft.startnummer_offerten} onChange={v => handleDraftChange('startnummer_offerten', parseInt(v))} />
      <InputField label="Startnummer Rechnungen" type="number" value={draft.startnummer_rechnungen} onChange={v => handleDraftChange('startnummer_rechnungen', parseInt(v))} />
    </SettingsBlock>
  )
}
