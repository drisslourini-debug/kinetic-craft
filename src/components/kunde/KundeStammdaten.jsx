import { SettingsBlock, SettingsRow, InputField, SelectField } from '../ui/SettingsComponents'
import { ANREDE_OPTIONS } from '../../lib/customerNaming'

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
      title="Stammdaten & Identifikation"
      description="Kundennummer, Anrede, Firmenbezeichnung und Ansprechpartner."
      isEditing={isEditing}
      onEdit={onEdit}
      onCancel={onCancel}
      onSave={onSave}
      isSaving={isSaving}
      disabled={disabled}
      readOnlyView={
        <>
          <SettingsRow 
            label="Kundennummer" 
            value={
              kunde.kundennummer ? (
                <span className="font-mono font-bold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-md border border-primary-200">
                  {kunde.kundennummer}
                </span>
              ) : (
                <span className="text-text-secondary italic">Keine Kundennummer hinterlegt</span>
              )
            } 
          />
          <SettingsRow label="Anrede" value={kunde.anrede || '–'} />
          <SettingsRow label="Kundentyp" value={kunde.typ} />
          <SettingsRow label="Firmenname" value={kunde.firmenname} />
          <SettingsRow label="Vorname" value={kunde.vorname} />
          <SettingsRow label="Nachname" value={kunde.nachname} />
        </>
      }
    >
      <InputField 
        label="Kundennummer" 
        value={draft.kundennummer || ''} 
        onChange={v => onChange('kundennummer', v)} 
        placeholder="z.B. K-1001" 
      />
      <SelectField 
        label="Anrede" 
        value={draft.anrede || 'Firma'} 
        onChange={v => onChange('anrede', v)} 
        options={ANREDE_OPTIONS} 
      />
      <SelectField 
        label="Kundentyp" 
        value={draft.typ} 
        onChange={v => onChange('typ', v)} 
        options={KUNDENTYPEN} 
        fullWidth 
      />
      <InputField 
        label="Firmenname" 
        value={draft.firmenname} 
        onChange={v => onChange('firmenname', v)} 
        error={validationErrors?.firmenname} 
        fullWidth
      />
      <InputField 
        label="Vorname" 
        value={draft.vorname} 
        onChange={v => onChange('vorname', v)} 
      />
      <InputField 
        label="Nachname" 
        value={draft.nachname} 
        onChange={v => onChange('nachname', v)} 
        error={validationErrors?.nachname} 
      />
    </SettingsBlock>
  )
}
