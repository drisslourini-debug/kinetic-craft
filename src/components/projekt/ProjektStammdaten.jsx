import { SettingsBlock, SettingsRow, InputField, SelectField, TextAreaField } from '../ui/SettingsComponents'
import AddressAutocomplete from '../AddressAutocomplete'
import { formatDate } from '../../lib/formatters'

const PROJEKT_KATEGORIEN = [
  'Neubau',
  'Umbau / Renovation',
  'Reparatur / Service',
  'Sanierung'
];

export function ProjektStammdatenBlock({
  projekt,
  kunde,
  draft,
  isEditing,
  isSaving,
  onEdit,
  onCancel,
  onSave,
  onChange,
  onNavigate,
  disabled
}) {
  return (
    <SettingsBlock
      title="Projektstammdaten"
      isEditing={isEditing}
      onEdit={onEdit}
      onCancel={onCancel}
      onSave={onSave}
      isSaving={isSaving}
      disabled={disabled}
      readOnlyView={
        <>
          <SettingsRow label="Projektname" value={projekt.name} />
          <SettingsRow label="Kategorie" value={projekt.kategorie} />
          <SettingsRow label="Baustellen-Adresse" value={projekt.adresse} />
          <SettingsRow label="Status" value={
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
              projekt.status === 'Abgeschlossen' ? 'bg-emerald-100 text-emerald-700' :
              projekt.status === 'In Arbeit' ? 'bg-amber-100 text-amber-700' :
              'bg-indigo-100 text-indigo-700'
            }`}>
              {projekt.status || 'Aktiv'}
            </span>
          } />
          {kunde && (
            <SettingsRow label="Zugehöriger Kunde" value={
              <div 
                className="font-medium text-primary-600 hover:text-primary-800 cursor-pointer transition-colors flex items-center"
                onClick={() => onNavigate && onNavigate('kunden', { kundeId: kunde.id })}
              >
                {kunde.name} {kunde.ort && <span className="text-text-secondary font-normal ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">📍 {kunde.ort}</span>}
              </div>
            } />
          )}
        </>
      }
    >
      <InputField label="Projektname" value={draft.name} onChange={v => onChange('name', v)} />
      <SelectField label="Kategorie" value={draft.kategorie} onChange={v => onChange('kategorie', v)} options={PROJEKT_KATEGORIEN} />
      <div className="md:col-span-2">
        <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">Baustellen-Adresse (Auto-Fill)</label>
        <AddressAutocomplete 
          value={draft.adresse || ''}
          onChange={(val) => onChange('adresse', val)}
          placeholder="Strasse eingeben (Auto-Fill)..."
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400 transition-colors"
        />
      </div>
      <SelectField label="Status" value={draft.status || 'Aktiv'} onChange={v => onChange('status', v)} options={['Aktiv', 'In Arbeit', 'Abgeschlossen']} />
    </SettingsBlock>
  )
}

export function ProjektTermineBlock({
  projekt,
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
      title="Termine"
      isEditing={isEditing}
      onEdit={onEdit}
      onCancel={onCancel}
      onSave={onSave}
      isSaving={isSaving}
      disabled={disabled}
      readOnlyView={
        <>
          <SettingsRow label="Startdatum" value={formatDate(projekt.startdatum)} />
          <SettingsRow label="Enddatum" value={formatDate(projekt.enddatum)} />
        </>
      }
    >
      <InputField type="date" label="Startdatum" value={draft.startdatum} onChange={v => onChange('startdatum', v)} />
      <InputField type="date" label="Enddatum" value={draft.enddatum} onChange={v => onChange('enddatum', v)} />
    </SettingsBlock>
  )
}

export function ProjektNotizenBlock({
  projekt,
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
      title="Besonderheiten & Notizen"
      isEditing={isEditing}
      onEdit={onEdit}
      onCancel={onCancel}
      onSave={onSave}
      isSaving={isSaving}
      disabled={disabled}
      readOnlyView={
        <SettingsRow label="Notizen" value={projekt.notizen ? <span className="whitespace-pre-wrap">{projekt.notizen}</span> : ''} />
      }
    >
      <TextAreaField label="Notizen" value={draft.notizen} onChange={v => onChange('notizen', v)} placeholder="Zugangscodes, Materiallagerplatz, Besonderheiten zur Baustelle..." />
    </SettingsBlock>
  )
}
