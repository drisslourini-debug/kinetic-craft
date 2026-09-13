import { useState } from 'react'
import { SettingsBlock, SettingsRow, InputField, TextAreaField } from '../ui/SettingsComponents'
import AddressAutocomplete from '../AddressAutocomplete'
import { supabase } from '../../lib/supabase'
import { injectThemeVariables } from '../../utils/colors'

export default function FirmenDaten({ settings, draft, editState, isSaving, startEdit, cancelEdit, handleSave, handleDraftChange, setDraft, userRole }) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const handleLogoUpload = async (e) => {
    setUploadError(null)
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setUploadError('Bitte nur Bilder hochladen (PNG, JPG, SVG, WebP).')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Das Bild darf maximal 5MB gross sein.')
      return
    }

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_logo.${fileExt}`
      const filePath = `logos/${settings.tenant_id || 'default'}/${fileName}`

      const { error } = await supabase.storage
        .from('public_assets')
        .upload(filePath, file)

      if (error) {
        throw error
      }

      const { data: publicUrlData } = supabase.storage
        .from('public_assets')
        .getPublicUrl(filePath)

      handleDraftChange('logo_url', publicUrlData.publicUrl)
    } catch (error) {
      console.error('Upload Error:', error)
      setUploadError(`Fehler beim Upload: ${error.message}. Stelle sicher, dass der Bucket "public_assets" in Supabase existiert.`)
    } finally {
      setIsUploading(false)
    }
  }

  const displayPlzOrt = [settings.plz, settings.ort].filter(Boolean).join(' ') || settings.plz_ort || ''
  const draftPlz = draft.plz !== undefined ? draft.plz : (draft.plz_ort ? draft.plz_ort.split(' ')[0] : '')
  const draftOrt = draft.ort !== undefined ? draft.ort : (draft.plz_ort ? draft.plz_ort.split(' ').slice(1).join(' ') : '')

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
            <SettingsRow label="PLZ & Ort" value={displayPlzOrt} />
            <SettingsRow label="Land" value={
              <span className="inline-flex items-center gap-1.5 font-medium text-text-primary">
                <span>🇨🇭</span> {settings.land || 'Schweiz'}
              </span>
            } />
            <SettingsRow label="UID-Nummer" value={settings.uid} />
            <SettingsRow label="Handelsregister-Nr." value={settings.hr_nummer} />
            <SettingsRow label="Gerichtsstand" value={settings.gerichtsstand} />
            <SettingsRow label="Firmenlogo" value={
              settings.logo_url ? (
                <div className="flex items-center gap-3">
                  <img src={settings.logo_url} alt="Logo" className="h-10 w-auto object-contain bg-neutral-100 rounded p-1 border border-border" />
                  <span className="text-sm text-emerald-600 font-medium">Hinterlegt</span>
                </div>
              ) : (
                <span className="text-sm text-text-secondary">Kein Logo hinterlegt (Standard CRM Logo wird verwendet)</span>
              )
            } />
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
        
        <div className="md:col-span-2">
          <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block mb-2">Strasse & Nr. (mit Adress-Vorschlägen)</label>
          <AddressAutocomplete 
            value={draft.strasse || ''} 
            onChange={(val, details) => {
              if (details) {
                setDraft(prev => ({
                  ...prev, 
                  strasse: details.strasse, 
                  plz: details.plz,
                  ort: details.ort,
                  plz_ort: `${details.plz} ${details.ort}`.trim(),
                  land: 'Schweiz'
                }))
              } else {
                handleDraftChange('strasse', val)
              }
            }}
            placeholder="Strasse und Hausnummer eingeben..."
            className="w-full px-3 py-3 sm:py-2 min-h-[48px] sm:min-h-0 bg-surface border border-border rounded-lg text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary-400 transition-colors"
          />
        </div>

        {/* Separate Felder für PLZ und Ort wie bei extro.swiss */}
        <InputField 
          label="Postleitzahl (PLZ)" 
          value={draftPlz} 
          onChange={v => {
            handleDraftChange('plz', v)
            handleDraftChange('plz_ort', `${v} ${draftOrt}`.trim())
          }} 
          placeholder="3000" 
        />
        <InputField 
          label="Stadt / Ort" 
          value={draftOrt} 
          onChange={v => {
            handleDraftChange('ort', v)
            handleDraftChange('plz_ort', `${draftPlz} ${v}`.trim())
          }} 
          placeholder="Bern" 
        />

        {/* Festes Land Schweiz */}
        <div className="space-y-1">
          <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block">Land</label>
          <div className="w-full px-3 py-2 bg-neutral-100 border border-border rounded-lg text-sm text-text-primary flex items-center gap-2">
            <span>🇨🇭</span>
            <span className="font-semibold">Schweiz</span>
            <span className="text-[11px] text-text-secondary ml-auto">(Schweizer Handwerker-Standard)</span>
          </div>
        </div>

        <InputField label="Handelsregister-Nr." value={draft.hr_nummer} onChange={v => handleDraftChange('hr_nummer', v)} placeholder="z.B. CH-123.4.567.890-1" />
        <InputField label="Gerichtsstand" value={draft.gerichtsstand} onChange={v => handleDraftChange('gerichtsstand', v)} placeholder="z.B. Bern" />
        
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block">Firmenlogo (PDF & Menü)</label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border border-dashed border-border rounded-xl bg-surface-card">
            {draft.logo_url ? (
              <div className="relative shrink-0">
                <img src={draft.logo_url} alt="Draft Logo" className="h-16 w-auto object-contain bg-white rounded shadow-sm border border-border p-1" />
                <button 
                  onClick={() => handleDraftChange('logo_url', '')} 
                  className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-200 transition-colors cursor-pointer"
                  title="Logo entfernen"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ) : (
              <div className="h-16 w-16 bg-neutral-100 border border-border border-dashed rounded flex items-center justify-center text-text-secondary shrink-0">
                <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
            )}
            
            <div className="flex-1">
              <label className={`inline-flex items-center gap-2 px-4 py-2 ${isUploading ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-white border border-border text-text-primary hover:bg-neutral-50 cursor-pointer'} rounded-lg font-semibold text-sm transition-colors shadow-sm`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                {isUploading ? 'Wird hochgeladen...' : (draft.logo_url ? 'Anderes Logo hochladen' : 'Logo hochladen (SVG, PNG, JPG)')}
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/png, image/jpeg, image/svg+xml, image/webp" 
                  onChange={handleLogoUpload}
                  disabled={isUploading}
                />
              </label>
              <p className="text-xs text-text-secondary mt-2">
                Empfohlen: SVG oder PNG mit transparentem Hintergrund. Max 5MB.
              </p>
              {uploadError && (
                <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-start justify-between gap-2">
                  <span>{uploadError}</span>
                  <button type="button" onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-700 cursor-pointer">✕</button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="md:col-span-2 space-y-3 pt-2">
          <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold block">Hauptfarbe (Corporate Design)</label>
          <div className="flex flex-wrap gap-2">
            {[
              { name: 'Kinetic Cyan', value: '#0ea5e9' },
              { name: 'Nordic Teal', value: '#0d9488' },
              { name: 'Corporate Blue', value: '#2563eb' },
              { name: 'Slate Anthrazit', value: '#334155' },
              { name: 'Forest Emerald', value: '#059669' },
              { name: 'Wine Red', value: '#9f1239' },
              { name: 'Royal Indigo', value: '#4f46e5' },
            ].map(preset => (
              <button
                key={preset.value}
                type="button"
                onClick={() => {
                  handleDraftChange('primary_color', preset.value)
                  injectThemeVariables(preset.value)
                }}
                className={`h-9 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  (draft.primary_color || '#b88a38').toLowerCase() === preset.value.toLowerCase()
                    ? 'ring-2 ring-offset-2 ring-primary-600 text-white'
                    : 'text-white/90 hover:text-white opacity-90 hover:opacity-100'
                }`}
                style={{ backgroundColor: preset.value }}
              >
                <span>{preset.name}</span>
                {(draft.primary_color || '#b88a38').toLowerCase() === preset.value.toLowerCase() && <span>✓</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="color" 
              value={draft.primary_color || '#b88a38'} 
              onChange={e => {
                handleDraftChange('primary_color', e.target.value)
                injectThemeVariables(e.target.value)
              }}
              className="w-10 h-10 p-0.5 rounded-lg border border-border cursor-pointer"
            />
            <span className="text-xs font-mono text-text-secondary uppercase">{draft.primary_color || '#b88a38'}</span>
            <span className="text-xs text-text-secondary/70">Wird live für Buttons und Akzente angewendet</span>
          </div>
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

      <SettingsBlock
        title="PDF & Briefpapier Gestaltung"
        description="Passe die Absender-Adresse oben rechts auf deinen PDFs an. Wenn du dieses Feld leer lässt, generiert das System die Adresse automatisch aus deinen Firmendaten."
        isEditing={editState === 'pdf_layout'}
        onEdit={() => startEdit('pdf_layout')}
        onCancel={cancelEdit}
        onSave={() => handleSave('pdf_layout')}
        isSaving={isSaving}
        readOnlyView={
          <>
            <SettingsRow label="Individuelle Kopfzeile" value={settings.pdf_kopfzeile ? <div className="whitespace-pre-wrap">{settings.pdf_kopfzeile}</div> : <span className="text-gray-400 italic">Automatisch generiert aus Firmendaten</span>} />
          </>
        }
      >
        <div className="md:col-span-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
          <strong>Tipp:</strong> Zeilenumbrüche (Enter) werden im PDF genau so übernommen. So kannst du z.B. mehrere Standorte perfekt untereinander auflisten!
        </div>
        <TextAreaField 
          label="Kopfzeile (Rechts)" 
          value={draft.pdf_kopfzeile} 
          onChange={v => handleDraftChange('pdf_kopfzeile', v)} 
          placeholder={[draft.firmenname, draft.strasse, displayPlzOrt].filter(Boolean).join('\n')} 
        />
      </SettingsBlock>
    </div>
  )
}
