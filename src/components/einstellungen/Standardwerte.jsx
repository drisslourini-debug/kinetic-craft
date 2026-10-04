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
            <SettingsRow label="MWST-Methode" value={settings.mwst_methode === 'saldosteuer' ? `Saldosteuersatz (${settings.saldosteuersatz || 5.9}%)` : 'Effektive Methode (mit Vorsteuerabzug)'} />
            <SettingsRow label="Abrechnungsart (ESTV)" value={settings.mwst_abrechnungsart === 'vereinnahmt' ? 'Vereinnahmt (nach Zahlungseingang / Ist)' : 'Vereinbart (nach Rechnungsdatum / Soll)'} />
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

        <div>
          <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">MWST-Abrechnungsmethode</label>
          <select
            value={draft.mwst_methode || 'effektiv'}
            onChange={e => handleDraftChange('mwst_methode', e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
          >
            <option value="effektiv">Effektive Methode (mit Vorsteuerabzug 8.1% / 2.6%)</option>
            <option value="saldosteuer">Saldosteuersatzmethode (Art. 37 MWSTG)</option>
          </select>
        </div>

        {draft.mwst_methode === 'saldosteuer' ? (
          <InputField 
            label="Saldosteuersatz (%) z.B. Malergewerbe" 
            type="number" 
            min="0" 
            max="15" 
            step="0.1" 
            value={draft.saldosteuersatz ?? 5.9} 
            onChange={v => handleDraftChange('saldosteuersatz', v === '' ? '' : parseFloat(v))} 
            placeholder="5.9"
          />
        ) : (
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
        )}

        <div>
          <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">Abrechnungsart (Fälligkeit ESTV)</label>
          <select
            value={draft.mwst_abrechnungsart || 'vereinbart'}
            onChange={e => handleDraftChange('mwst_abrechnungsart', e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
          >
            <option value="vereinbart">Vereinbart (nach Rechnungsdatum / Soll-Prinzip)</option>
            <option value="vereinnahmt">Vereinnahmt (nach Zahlungseingang / Ist-Prinzip)</option>
          </select>
        </div>

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
        title="Schweizer KMU-Kontenrahmen"
        description="Standard-Kontonummern für die Finanzbuchhaltung und den Banana-/Treuhand-Export."
        isEditing={editState === 'kmu_konten'}
        onEdit={userRole !== 'treuhand' ? () => startEdit('kmu_konten') : undefined}
        onCancel={cancelEdit}
        onSave={() => handleSave('kmu_konten')}
        isSaving={isSaving}
        readOnlyView={
          <>
            <SettingsRow label="Bank / PostFinance" value={settings.konto_bank || '1020'} />
            <SettingsRow label="Forderungen LL (Debitoren)" value={settings.konto_debitoren || '1100'} />
            <SettingsRow label="Verbindlichkeiten LL (Kreditoren)" value={settings.konto_kreditoren || '2000'} />
            <SettingsRow label="Ertrag Handwerk / Ausbau" value={settings.konto_ertrag || '3200'} />
            <SettingsRow label="Skonti & Erlösminderungen" value={settings.konto_skonto || '3800'} />
          </>
        }
      >
        <InputField 
          label="Konto Bank / PostFinance" 
          value={draft.konto_bank || '1020'} 
          onChange={v => handleDraftChange('konto_bank', v)} 
          placeholder="1020"
        />
        <InputField 
          label="Konto Debitoren (FLL)" 
          value={draft.konto_debitoren || '1100'} 
          onChange={v => handleDraftChange('konto_debitoren', v)} 
          placeholder="1100"
        />
        <InputField 
          label="Konto Ertrag Handwerk" 
          value={draft.konto_ertrag || '3200'} 
          onChange={v => handleDraftChange('konto_ertrag', v)} 
          placeholder="3200"
        />
        <InputField 
          label="Konto Skonti & Erlösminderungen" 
          value={draft.konto_skonto || '3800'} 
          onChange={v => handleDraftChange('konto_skonto', v)} 
          placeholder="3800"
        />
        <InputField 
          label="Konto Kreditoren (VLL)" 
          value={draft.konto_kreditoren || '2000'} 
          onChange={v => handleDraftChange('konto_kreditoren', v)} 
          placeholder="2000"
          fullWidth
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
