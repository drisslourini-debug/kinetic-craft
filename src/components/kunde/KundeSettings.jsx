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
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${kunde.status === 'Inaktiv' ? 'bg-red-50 text-red-700 border-red-200/60' : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'}`}>
              {kunde.status || 'Aktiv'}
            </span>
          } />
          <SettingsRow label="Zahlungsziel" value={kunde.zahlungsziel || '30 Tage netto'} />
          <SettingsRow label="Notizen" value={kunde.notizen} hideIfEmpty />
        </>
      }
    >
      <SelectField label="Status" value={draft.status || 'Aktiv'} onChange={v => onChange('status', v)} options={['Aktiv', 'Inaktiv']} />
      <SelectField label="Zahlungsziel" value={draft.zahlungsziel || '30 Tage netto'} onChange={v => onChange('zahlungsziel', v)} options={ZAHLUNGSZIELE} />
      <TextAreaField label="Notizen / Referenzen" value={draft.notizen} onChange={v => onChange('notizen', v)} small />
    </SettingsBlock>
  )
}
