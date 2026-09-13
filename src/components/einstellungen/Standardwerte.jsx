import { SettingsBlock, SettingsRow, InputField } from '../ui/SettingsComponents'
import { isQrIban } from '../../lib/qrHelper'
import { validateIban, validateQrIban } from '../../lib/ibanValidator'
import { SWISS_CANTONS } from '../../lib/holidayService'

const formatIban = (val) => {
  if (!val) return ''
  const clean = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return clean.match(/.{1,4}/g)?.join(' ') || clean
}

export default function Standardwerte({ settings, draft, editState, isSaving, startEdit, cancelEdit, handleSave, handleDraftChange, userRole }) {
  const cleanQr = (draft.qr_iban || '').replace(/\s+/g, '').toUpperCase()
  const hasQrInput = cleanQr.length > 0
  const qrValidation = validateQrIban(draft.qr_iban)

  const cleanIban = (draft.bankverbindung || '').replace(/\s+/g, '').toUpperCase()
  const hasIbanInput = cleanIban.length > 0
  const ibanValidation = validateIban(draft.bankverbindung)

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
            <SettingsRow label="Bankverbindung (IBAN)" value={settings.bankverbindung ? formatIban(settings.bankverbindung) : ''} />
            <SettingsRow label="QR-IBAN" value={settings.qr_iban ? (
              <div className="flex items-center gap-2">
                <span>{formatIban(settings.qr_iban)}</span>
                {isQrIban(settings.qr_iban) && (
                  <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded-full border border-emerald-200">
                    QR-IBAN ✓
                  </span>
                )}
              </div>
            ) : ''} />
            <SettingsRow label="Standard MwSt" value={settings.standard_mwst ? `${settings.standard_mwst}%` : '0%'} />
            <SettingsRow label="Standard Rabatt" value={settings.standard_rabatt ? `${settings.standard_rabatt}%` : '0%'} />
          </>
        }
      >
        <div className="md:col-span-2 space-y-1">
          <InputField 
            label="Bankverbindung (Normale IBAN)" 
            value={draft.bankverbindung} 
            onChange={v => handleDraftChange('bankverbindung', formatIban(v))} 
            placeholder="CH93 0000 0000 0000 0000 0"
            fullWidth 
          />
          {hasIbanInput && (
            <p className={`text-xs ${ibanValidation.valid ? 'text-emerald-600' : 'text-red-600'}`}>
              {ibanValidation.valid ? '✓ Gültiges Schweizer IBAN-Format' : `✗ ${ibanValidation.error}`}
            </p>
          )}
        </div>

        <div className="md:col-span-2 space-y-1">
          <InputField 
            label="QR-IBAN (speziell für QR-Rechnungen mit QR-Referenz)" 
            value={draft.qr_iban} 
            onChange={v => handleDraftChange('qr_iban', formatIban(v))} 
            placeholder="CH44 3000 0000 0000 0000 0"
            fullWidth 
          />
          {hasQrInput && (
            <p className={`text-xs ${qrValidation.valid && qrValidation.isQrIban ? 'text-emerald-600 font-medium' : 'text-red-600'}`}>
              {qrValidation.valid && qrValidation.isQrIban 
                ? '✓ Gültige Schweizer QR-IBAN (IID 30000–31999)' 
                : `✗ ${qrValidation.error}`}
            </p>
          )}
        </div>

        <InputField 
          label="Standard MwSt (%)" 
          type="number" 
          min="0" 
          max="100" 
          step="0.1" 
          value={draft.standard_mwst} 
          onChange={v => handleDraftChange('standard_mwst', v === '' ? '' : parseFloat(v))} 
          placeholder="8.1"
        />
        <InputField 
          label="Standard Rabatt (%)" 
          type="number" 
          min="0" 
          max="100" 
          step="0.1" 
          value={draft.standard_rabatt} 
          onChange={v => handleDraftChange('standard_rabatt', v === '' ? '' : parseFloat(v))} 
          placeholder="0"
        />
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
            <SettingsRow label="Kanton (für Feiertage)" value={settings.kanton ? SWISS_CANTONS.find(c => c.code === settings.kanton)?.name || settings.kanton : 'Alle (nur nationale Feiertage)'} />
          </>
        }
      >
        <InputField 
          label="Offerten Gültigkeit (Tage)" 
          type="number" 
          min="1" 
          step="1" 
          value={draft.gueltigkeit_offerten_tage} 
          onChange={v => handleDraftChange('gueltigkeit_offerten_tage', v === '' ? '' : parseInt(v, 10))} 
          placeholder="30"
        />
        <InputField 
          label="Rechnungen Zahlungsfrist (Tage)" 
          type="number" 
          min="1" 
          step="1" 
          value={draft.zahlungsfrist_tage} 
          onChange={v => handleDraftChange('zahlungsfrist_tage', v === '' ? '' : parseInt(v, 10))} 
          placeholder="30"
        />
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-text-primary mb-1.5">Kanton (für Feiertage)</label>
          <select
            value={draft.kanton || ''}
            onChange={e => handleDraftChange('kanton', e.target.value)}
            className="w-full px-3 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-surface border border-border rounded-lg text-base sm:text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
          >
            <option value="">-- Alle (nur nationale Feiertage) --</option>
            {SWISS_CANTONS.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          <p className="text-xs text-text-secondary mt-1">Wird für die Feiertagsanzeige im Kalender und Fristberechnungen verwendet.</p>
        </div>
      </SettingsBlock>
    </div>
  )
}
