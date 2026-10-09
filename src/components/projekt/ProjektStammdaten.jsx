import { SettingsBlock, SettingsRow, InputField, SelectField, TextAreaField } from '../ui/SettingsComponents'
import AddressAutocomplete from '../AddressAutocomplete'
import { formatDate } from '../../lib/formatters'
import { IconLocation } from '../icons/BrandIcons'

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
          <SettingsRow label="Kategorie" value={projekt.kategorie} hideIfEmpty />
          <SettingsRow 
            label="Adresse" 
            value={projekt.adresse} 
            href={projekt.adresse ? `https://maps.apple.com/?q=${encodeURIComponent(projekt.adresse)}` : undefined}
            icon={<IconLocation className="w-3.5 h-3.5 text-slate-500" />}
            hideIfEmpty 
          />
          <SettingsRow label="Status" value={
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
              projekt.status === 'Abgeschlossen' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' :
              projekt.status === 'In Arbeit' ? 'bg-amber-50 text-amber-700 border-amber-200/60' :
              'bg-indigo-50 text-indigo-700 border-indigo-200/60'
            }`}>
              {projekt.status || 'Aktiv'}
            </span>
          } />
          {kunde && (
            <SettingsRow label="Kunde" value={
              <span 
                className="font-semibold text-primary-600 hover:text-primary-800 cursor-pointer transition-colors"
                onClick={() => onNavigate && onNavigate('kunden', { kundeId: kunde.id })}
              >
                {kunde.name} {kunde.ort && (
                  <span className="text-text-muted font-normal text-xs ml-1 inline-flex items-center gap-0.5">
                    <IconLocation className="w-3 h-3 text-slate-400" />
                    <span>{kunde.ort}</span>
                  </span>
                )}
              </span>
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
  disabled,
  termineCount,
  onOpenTermineTab
}) {
  return (
    <SettingsBlock
      title="Termine & Laufzeit"
      isEditing={isEditing}
      onEdit={onEdit}
      onCancel={onCancel}
      onSave={onSave}
      isSaving={isSaving}
      disabled={disabled}
      readOnlyView={
        <>
          <SettingsRow label="Startdatum" value={projekt.startdatum ? formatDate(projekt.startdatum) : null} hideIfEmpty />
          <SettingsRow label="Enddatum" value={projekt.enddatum ? formatDate(projekt.enddatum) : null} hideIfEmpty />
          {termineCount !== undefined && (
            <SettingsRow 
              label="Einsätze & Termine" 
              value={
                <div className="flex items-center gap-2 justify-end">
                  <span>{termineCount} {termineCount === 1 ? 'Termin' : 'Termine'}</span>
                  {onOpenTermineTab && (
                    <button
                      type="button"
                      onClick={onOpenTermineTab}
                      className="text-xs font-bold text-primary-600 hover:text-primary-800 transition-colors cursor-pointer"
                    >
                      →
                    </button>
                  )}
                </div>
              } 
            />
          )}
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
        <SettingsRow label="Notizen" value={projekt.notizen ? <span className="whitespace-pre-wrap">{projekt.notizen}</span> : null} hideIfEmpty />
      }
    >
      <TextAreaField label="Notizen" value={draft.notizen} onChange={v => onChange('notizen', v)} placeholder="Zugangscodes, Materiallagerplatz, Besonderheiten zur Baustelle..." />
    </SettingsBlock>
  )
}
