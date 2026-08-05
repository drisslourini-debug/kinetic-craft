import { SettingsBlock, SettingsRow, InputField } from '../ui/SettingsComponents'
import AddressAutocomplete from '../AddressAutocomplete'

export default function FirmenDaten({ settings, draft, editState, isSaving, startEdit, cancelEdit, handleSave, handleDraftChange, setDraft, userRole }) {
  return (
    <div className="space-y-6">
      <SettingsBlock
        title="Stammdaten & Adresse"
        description="Diese Angaben werden oben links auf deinen Offerten und Rechnungen angedruckt."
        isEditing={editState === 'unternehmen'}
        onEdit={userRole !== 'treuhand' ? () => startEdit('unternehmen') : undefined}
        onCancel={cancelEdit}
        onSave={() => handleSave('unternehmen')}
        isSaving={isSaving}
        readOnlyView={
          <>
            <SettingsRow label="Name des Unternehmens" value={settings.firmenname} />
            <SettingsRow label="Strasse & Nr." value={settings.strasse} />
            <SettingsRow label="PLZ & Ort" value={settings.plz_ort} />
            <SettingsRow label="UID-Nummer" value={settings.uid} />
            <SettingsRow label="Handelsregister-Nr." value={settings.hr_nummer} />
            <SettingsRow label="Gerichtsstand" value={settings.gerichtsstand} />
            <SettingsRow label="Logo-URL" value={settings.logo_url ? 'Hinterlegt' : 'Kein Logo hinterlegt'} />
            <SettingsRow label="Hauptfarbe" value={
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: settings.primary_color || '#b88a38' }}></div>
                {settings.primary_color || '#b88a38'}
              </div>
            } />
          </>
        }
      >
        <InputField label="Name des Unternehmens" value={draft.firmenname} onChange={v => handleDraftChange('firmenname', v)} />
        <InputField label="UID-Nummer" value={draft.uid} onChange={v => handleDraftChange('uid', v)} placeholder="z.B. CHE-123.456.789 MWST" />
        <div className="">
          <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">Strasse (Auto-Fill)</label>
          <AddressAutocomplete 
            value={draft.strasse || ''} 
            onChange={(val, details) => {
              if (details) {
                setDraft(prev => ({...prev, strasse: details.strasse, plz_ort: `${details.plz} ${details.ort}`.trim()}))
              } else {
                handleDraftChange('strasse', val)
              }
            }}
            className="w-full px-3 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-surface border border-border rounded-lg text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary-400 transition-colors"
          />
        </div>
        <InputField label="PLZ & Ort" value={draft.plz_ort} onChange={v => handleDraftChange('plz_ort', v)} placeholder="3000 Bern" />
        <InputField label="Handelsregister-Nr." value={draft.hr_nummer} onChange={v => handleDraftChange('hr_nummer', v)} placeholder="z.B. CH-123.4.567.890-1" />
        <InputField label="Gerichtsstand" value={draft.gerichtsstand} onChange={v => handleDraftChange('gerichtsstand', v)} placeholder="z.B. Bern" />
        <InputField label="Logo URL (für PDF & Sidebar)" type="url" value={draft.logo_url} onChange={v => handleDraftChange('logo_url', v)} placeholder="https://..." fullWidth />
        <div className="flex items-center gap-4">
          <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold w-32">Hauptfarbe</label>
          <input 
            type="color" 
            value={draft.primary_color || '#b88a38'} 
            onChange={e => handleDraftChange('primary_color', e.target.value)}
            className="w-12 h-12 p-1 rounded-lg border border-border cursor-pointer"
          />
          <span className="text-sm font-mono text-text-secondary">{draft.primary_color || '#b88a38'}</span>
        </div>
      </SettingsBlock>

      <SettingsBlock
        title="Kontaktdaten"
        description="Diese Daten erscheinen auf dem PDF als Kontaktmöglichkeiten für deine Kunden."
        isEditing={editState === 'kontakt'}
        onEdit={() => startEdit('kontakt')}
        onCancel={cancelEdit}
        onSave={() => handleSave('kontakt')}
        isSaving={isSaving}
        readOnlyView={
          <>
            <SettingsRow label="Geschäfts-E-Mail" value={settings.email} />
            <SettingsRow label="Telefonnummer" value={settings.telefon} />
            <SettingsRow label="Website" value={settings.website} />
          </>
        }
      >
        <InputField label="Geschäfts-E-Mail" type="email" value={draft.email} onChange={v => handleDraftChange('email', v)} />
        <InputField label="Telefonnummer" type="tel" value={draft.telefon} onChange={v => handleDraftChange('telefon', v)} />
        <InputField label="Website" type="url" value={draft.website} onChange={v => handleDraftChange('website', v)} />
      </SettingsBlock>
    </div>
  )
}
