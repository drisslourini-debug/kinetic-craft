import { SettingsBlock, SettingsRow, SelectField, TextAreaField } from '../ui/SettingsComponents'

const ZAHLUNGSZIELE = [
  '30 Tage netto',
  '10 Tage netto',
  'Vorauskasse',
  'Barzahlung'
];

export default function KundeSettings({
  kunde,
  draft,
  isEditing,
  isSaving,
  validationErrors,
  onEdit,
  onCancel,
  onSave,
  onChange,
  disabled
}) {
  return (
    <SettingsBlock
      title="Weitere Informationen"
      isEditing={isEditing}
      onEdit={onEdit}
      onCancel={onCancel}
      onSave={onSave}
      isSaving={isSaving}
      disabled={disabled}
      readOnlyView={
        <>
          <SettingsRow label="Status" value={
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${kunde.status === 'Inaktiv' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {kunde.status || 'Aktiv'}
            </span>
          } />
          <SettingsRow label="Zahlungsziel" value={kunde.zahlungsziel || '30 Tage netto'} />
          <SettingsRow label="Notizen / Referenzen" value={kunde.notizen} />
        </>
      }
    >
      <SelectField label="Status" value={draft.status || 'Aktiv'} onChange={v => onChange('status', v)} options={['Aktiv', 'Inaktiv']} />
      <SelectField label="Zahlungsziel" value={draft.zahlungsziel || '30 Tage netto'} onChange={v => onChange('zahlungsziel', v)} options={ZAHLUNGSZIELE} />
      <TextAreaField label="Notizen / Referenzen" value={draft.notizen} onChange={v => onChange('notizen', v)} small />
    </SettingsBlock>
  )
}
