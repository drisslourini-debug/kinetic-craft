import { SettingsBlock, SettingsRow, InputField, SelectField } from '../ui/SettingsComponents'

const KUNDENTYPEN = [
  'Privatperson',
  'Architekturbüro',
  'Liegenschaftsverwaltung',
  'Generalunternehmung (GU)',
  'Geschäftskunde (Allgemein)'
];

export default function KundeStammdaten({
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
      title="Name, Firma & Typ"
      isEditing={isEditing}
      onEdit={onEdit}
      onCancel={onCancel}
      onSave={onSave}
      isSaving={isSaving}
      disabled={disabled}
      readOnlyView={
        <>
          <SettingsRow label="Kundentyp" value={kunde.typ} />
          <SettingsRow label="Firmenname" value={kunde.firmenname} />
          <SettingsRow label="Vorname" value={kunde.vorname} />
          <SettingsRow label="Nachname" value={kunde.nachname} />
        </>
      }
    >
      <SelectField label="Kundentyp" value={draft.typ} onChange={v => onChange('typ', v)} options={KUNDENTYPEN} fullWidth />
      <InputField label="Firmenname" value={draft.firmenname} onChange={v => onChange('firmenname', v)} error={validationErrors.firmenname} />
      <div className="hidden md:block"></div>
      <InputField label="Vorname" value={draft.vorname} onChange={v => onChange('vorname', v)} />
      <InputField label="Nachname" value={draft.nachname} onChange={v => onChange('nachname', v)} error={validationErrors.nachname} />
    </SettingsBlock>
  )
}
