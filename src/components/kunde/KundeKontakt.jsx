import { SettingsBlock, SettingsRow, InputField } from '../ui/SettingsComponents'
import AddressAutocomplete from '../AddressAutocomplete'

export default function KundeKontakt({
  kunde,
  draft,
  isEditing,
  isSaving,
  validationErrors,
  onEdit,
  onCancel,
  onSave,
  onChange,
  onAddressDetails,
  disabled
}) {
  return (
    <SettingsBlock
      title="Kontakt & Adresse"
      isEditing={isEditing}
      onEdit={onEdit}
      onCancel={onCancel}
      onSave={onSave}
      isSaving={isSaving}
      disabled={disabled}
      readOnlyView={
        <>
          <SettingsRow label="Strasse" value={kunde.strasse} />
          <SettingsRow label="PLZ & Ort" value={kunde.plz && kunde.ort ? `${kunde.plz} ${kunde.ort}` : (kunde.plz || kunde.ort || '')} />
          <SettingsRow label="Land" value={
            <span className="inline-flex items-center gap-1.5 font-medium text-text-primary">
              <span>🇨🇭</span> {kunde.land || 'Schweiz'}
            </span>
          } />
          <SettingsRow label="Telefon" value={kunde.telefon} />
          <SettingsRow label="E-Mail" value={kunde.email} />
          <SettingsRow label="Website" value={kunde.website} />
        </>
      }
    >
      <div className="md:col-span-2">
        <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">Strasse & Nr. (Auto-Fill)</label>
        <AddressAutocomplete 
          value={draft.strasse || ''} 
          onChange={(val, details) => {
            if (details) {
              onAddressDetails(details)
              onChange('land', 'Schweiz')
            } else {
              onChange('strasse', val)
            }
          }}
          placeholder="Strasse eingeben..."
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400 transition-colors"
        />
      </div>
      <InputField label="PLZ" value={draft.plz || ''} onChange={v => onChange('plz', v)} placeholder="3000" />
      <InputField label="Ort" value={draft.ort || ''} onChange={v => onChange('ort', v)} placeholder="Bern" />
      <div className="md:col-span-2 space-y-1">
        <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block">Land</label>
        <div className="w-full px-3 py-2 bg-neutral-100 border border-border rounded-lg text-sm text-text-primary flex items-center gap-2">
          <span>🇨🇭</span>
          <span className="font-semibold">Schweiz</span>
        </div>
      </div>
      <InputField label="Telefon" type="tel" value={draft.telefon || ''} onChange={v => onChange('telefon', v)} placeholder="079 123 45 67" />
      <InputField label="E-Mail" type="email" value={draft.email || ''} onChange={v => onChange('email', v)} error={validationErrors?.email} placeholder="kontakt@beispiel.ch" />
      <InputField label="Website" type="url" value={draft.website || ''} onChange={v => onChange('website', v)} fullWidth placeholder="https://" />
    </SettingsBlock>
  )
}
