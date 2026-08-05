import { SettingsBlock, SettingsRow, InputField } from '../ui/SettingsComponents'

export default function Standardwerte({ settings, draft, editState, isSaving, startEdit, cancelEdit, handleSave, handleDraftChange, userRole }) {
  return (
    <div className="space-y-6">
      <SettingsBlock
        title="Bank & MWST"
        description="Die IBAN wird auf Rechnungen gedruckt. Die MWST gilt als Standard für neue Dokumente."
        isEditing={editState === 'finanzen'}
        onEdit={userRole !== 'treuhand' ? () => startEdit('finanzen') : undefined}
        onCancel={cancelEdit}
        onSave={() => handleSave('finanzen')}
        isSaving={isSaving}
        readOnlyView={
          <>
            <SettingsRow label="Bankverbindung (IBAN)" value={settings.bankverbindung} />
            <SettingsRow label="QR-IBAN" value={settings.qr_iban} />
            <SettingsRow label="Standard MwSt" value={settings.standard_mwst ? `${settings.standard_mwst}%` : '0%'} />
            <SettingsRow label="Standard Rabatt" value={settings.standard_rabatt ? `${settings.standard_rabatt}%` : '0%'} />
          </>
        }
      >
        <InputField label="Bankverbindung (IBAN)" value={draft.bankverbindung} onChange={v => handleDraftChange('bankverbindung', v)} fullWidth />
        <InputField label="QR-IBAN (für QR-Rechnungen)" value={draft.qr_iban} onChange={v => handleDraftChange('qr_iban', v)} fullWidth />
        <InputField label="Standard MwSt (%)" type="number" value={draft.standard_mwst} onChange={v => handleDraftChange('standard_mwst', parseFloat(v))} />
        <InputField label="Standard Rabatt (%)" type="number" value={draft.standard_rabatt} onChange={v => handleDraftChange('standard_rabatt', parseFloat(v))} />
      </SettingsBlock>

      <SettingsBlock
        title="Fristen & Konditionen"
        description="Standard-Tage für die Gültigkeit von Offerten und Zahlungsziele von Rechnungen."
        isEditing={editState === 'fristen'}
        onEdit={() => startEdit('fristen')}
        onCancel={cancelEdit}
        onSave={() => handleSave('fristen')}
        isSaving={isSaving}
        readOnlyView={
          <>
            <SettingsRow label="Offerten Gültigkeit" value={settings.gueltigkeit_offerten_tage ? `${settings.gueltigkeit_offerten_tage} Tage` : ''} />
            <SettingsRow label="Rechnungen Zahlungsfrist" value={settings.zahlungsfrist_tage ? `${settings.zahlungsfrist_tage} Tage` : ''} />
          </>
        }
      >
        <InputField label="Offerten Gültigkeit (Tage)" type="number" value={draft.gueltigkeit_offerten_tage} onChange={v => handleDraftChange('gueltigkeit_offerten_tage', parseInt(v))} />
        <InputField label="Rechnungen Zahlungsfrist (Tage)" type="number" value={draft.zahlungsfrist_tage} onChange={v => handleDraftChange('zahlungsfrist_tage', parseInt(v))} />
      </SettingsBlock>
    </div>
  )
}
