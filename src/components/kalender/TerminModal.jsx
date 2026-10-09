import { useState, useEffect } from 'react';
import { TERMIN_TYPEN, TERMIN_STATUSSE, getTerminTypConfig } from '../../lib/kalenderConstants';
import { getGoogleCalendarUrl, downloadIcsFile, generateIcsCalendar } from '../../lib/icalGenerator';
import AddressAutocomplete from '../AddressAutocomplete';
import {
  IconCalendar,
  IconBuilding,
  IconTeam,
  IconLocation,
  IconDocument,
  IconClose,
  IconWarning,
  IconTrash,
  TerminTypIcon
} from '../icons/BrandIcons';

export default function TerminModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData = null,
  projekte = [],
  kunden = []
}) {
  const isEditMode = Boolean(initialData?.id);

  const [formData, setFormData] = useState({
    titel: '',
    typ: 'Montage',
    status: 'Geplant',
    datum: new Date().toISOString().split('T')[0],
    end_datum: '',
    ganztaegig: false,
    startzeit: '08:00',
    endzeit: '12:00',
    projekt_id: '',
    kunden_id: '',
    ort: '',
    beschreibung: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setShowDeleteConfirm(false);
      if (initialData) {
        setFormData({
          titel: initialData.titel || '',
          typ: initialData.typ || 'Montage',
          status: initialData.status || 'Geplant',
          datum: initialData.datum || new Date().toISOString().split('T')[0],
          end_datum: initialData.end_datum || '',
          ganztaegig: Boolean(initialData.ganztaegig),
          startzeit: initialData.startzeit || '08:00',
          endzeit: initialData.endzeit || '12:00',
          projekt_id: initialData.projekt_id ? String(initialData.projekt_id) : '',
          kunden_id: initialData.kunden_id ? String(initialData.kunden_id) : '',
          ort: initialData.ort || '',
          beschreibung: initialData.beschreibung || ''
        });
      } else {
        setFormData({
          titel: '',
          typ: 'Montage',
          status: 'Geplant',
          datum: new Date().toISOString().split('T')[0],
          end_datum: '',
          ganztaegig: false,
          startzeit: '08:00',
          endzeit: '12:00',
          projekt_id: '',
          kunden_id: '',
          ort: '',
          beschreibung: ''
        });
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleProjektChange = (projektIdStr) => {
    const selectedP = projekte.find(p => String(p.id) === String(projektIdStr));
    setFormData(prev => ({
      ...prev,
      projekt_id: projektIdStr,
      kunden_id: selectedP?.kunden_id ? String(selectedP.kunden_id) : prev.kunden_id,
      ort: selectedP?.adresse || prev.ort,
      titel: prev.titel || (selectedP ? `${prev.typ || 'Termin'} – ${selectedP.name}` : prev.titel)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.titel.trim()) {
      setErrorMsg('Bitte gib einen Titel für den Termin ein.');
      return;
    }
    if (!formData.datum) {
      setErrorMsg('Bitte wähle ein Datum aus.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      const payload = {
        ...formData,
        titel: formData.titel.trim(),
        projekt_id: formData.projekt_id ? parseInt(formData.projekt_id, 10) : null,
        kunden_id: formData.kunden_id ? parseInt(formData.kunden_id, 10) : null,
        end_datum: formData.end_datum || formData.datum
      };

      await onSave(payload, isEditMode ? initialData.id : null);
      onClose();
    } catch (err) {
      console.error('Save termin error:', err);
      setErrorMsg(err.message || 'Fehler beim Speichern des Termins.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id || !onDelete) return;
    try {
      setIsSubmitting(true);
      await onDelete(initialData.id);
      onClose();
    } catch (err) {
      console.error('Delete termin error:', err);
      setErrorMsg(err.message || 'Fehler beim Löschen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportIcs = () => {
    const icsString = generateIcsCalendar([
      {
        ...formData,
        id: initialData?.id || 'new',
        projekte: projekte.find(p => String(p.id) === String(formData.projekt_id)),
        kunden: kunden.find(k => String(k.id) === String(formData.kunden_id))
      }
    ]);
    downloadIcsFile(`termin-${formData.datum}-${formData.titel.replace(/\s+/g, '_')}`, icsString);
  };

  const googleCalUrl = getGoogleCalendarUrl({
    ...formData,
    projekte: projekte.find(p => String(p.id) === String(formData.projekt_id)),
    kunden: kunden.find(k => String(k.id) === String(formData.kunden_id))
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-surface-card border border-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
              <TerminTypIcon typ={formData.typ} className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">
                {isEditMode ? 'Termin bearbeiten' : 'Neuer Termin erfassen'}
              </h2>
              <p className="text-xs text-text-secondary">
                {isEditMode ? 'Termindetails anpassen oder löschen' : 'Für Montage, Besichtigung, Kunde oder intern'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-colors cursor-pointer"
            aria-label="Schliessen"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-1.5">
            <IconWarning className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Titel */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
              Termin-Bezeichnung *
            </label>
            <input 
              type="text"
              required
              value={formData.titel}
              onChange={e => setFormData({ ...formData, titel: e.target.value })}
              placeholder="z.B. Küchenmontage 1. Etappe, Vor-Ort-Aufmass..."
              className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-primary"
            />
          </div>

          {/* Typ & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                Kategorie / Typ
              </label>
              <select
                value={formData.typ}
                onChange={e => setFormData({ ...formData, typ: e.target.value })}
                className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-primary"
              >
                {TERMIN_TYPEN.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                Status
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-primary"
              >
                {TERMIN_STATUSSE.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Datum & Zeiten */}
          <div className="p-4 bg-gray-50/60 rounded-xl border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Zeitraum
              </span>
              <label className="flex items-center gap-2 text-xs font-medium text-text-primary cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={formData.ganztaegig}
                  onChange={e => setFormData({ ...formData, ganztaegig: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                Ganztägiger Termin
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-text-secondary mb-1">
                  Start-Datum *
                </label>
                <input 
                  type="date"
                  required
                  value={formData.datum}
                  onChange={e => setFormData({ ...formData, datum: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-text-secondary mb-1">
                  End-Datum (optional bei mehrtägig)
                </label>
                <input 
                  type="date"
                  value={formData.end_datum}
                  min={formData.datum}
                  onChange={e => setFormData({ ...formData, end_datum: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            {!formData.ganztaegig && (
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-200/60">
                <div>
                  <label className="block text-[11px] text-text-secondary mb-1">
                    Uhrzeit Beginn
                  </label>
                  <input 
                    type="time"
                    value={formData.startzeit}
                    onChange={e => setFormData({ ...formData, startzeit: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-text-secondary mb-1">
                    Uhrzeit Ende
                  </label>
                  <input 
                    type="time"
                    value={formData.endzeit}
                    onChange={e => setFormData({ ...formData, endzeit: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Verknüpfung Projekt & Kunde */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                <IconBuilding className="w-3.5 h-3.5 text-primary-500" />
                <span>Zugehöriges Projekt</span>
              </label>
              <select
                value={formData.projekt_id}
                onChange={e => handleProjektChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-primary"
              >
                <option value="">Kein Projekt (Freier Termin)</option>
                {projekte.map((p, idx) => (
                  <option key={p.id ? `p-${p.id}` : `p-idx-${idx}`} value={p.id || ''}>
                    {p.name} {p.status ? `(${p.status})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                <IconTeam className="w-3.5 h-3.5 text-text-secondary" />
                <span>Kunde / Ansprechpartner</span>
              </label>
              <select
                value={formData.kunden_id}
                onChange={e => setFormData({ ...formData, kunden_id: e.target.value })}
                className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-primary"
              >
                <option value="">Kein Kunde zugeordnet</option>
                {kunden.map((k, idx) => (
                  <option key={k.id ? `k-${k.id}` : `k-idx-${idx}`} value={k.id || ''}>
                    {k.name} {k.ort ? `(${k.ort})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ort / Baustelle mit Autocomplete */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
              <IconLocation className="w-3.5 h-3.5 text-text-secondary" />
              <span>Ort / Baustellen-Adresse</span>
            </label>
            <AddressAutocomplete
              value={formData.ort || ''}
              onChange={val => setFormData({ ...formData, ort: val })}
              placeholder="Adresse eingeben (Auto-Fill)..."
              className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-primary"
            />
          </div>

          {/* Notizen / Beschreibung */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
              Notizen / Arbeitsanweisungen
            </label>
            <textarea
              rows={3}
              value={formData.beschreibung}
              onChange={e => setFormData({ ...formData, beschreibung: e.target.value })}
              placeholder="Details zum Termin, Vorbereitungen, Materialliste, Vereinbarungen..."
              className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-primary resize-none"
            />
          </div>

          {/* Externe Kalender Quick-Export */}
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-text-secondary font-medium">Export:</span>
            <a
              href={googleCalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <IconCalendar className="w-3.5 h-3.5 text-gray-700" />
              <span>In Google Kalender öffnen</span>
            </a>
            <button
              type="button"
              onClick={handleExportIcs}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              <IconDocument className="w-3.5 h-3.5 text-gray-700" />
              <span>.ics herunterladen</span>
            </button>
          </div>

          {/* Delete Confirm Box */}
          {showDeleteConfirm && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 animate-fade-in">
              <p className="text-xs font-semibold text-rose-800">
                Möchtest du diesen Termin wirklich unwiderruflich löschen?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleDelete}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Ja, Termin löschen
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <div>
              {isEditMode && !showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <IconTrash className="w-3.5 h-3.5 text-rose-600" />
                  <span>Termin löschen</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-gray-100 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-primary-600/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Speichern...
                  </>
                ) : (
                  isEditMode ? 'Änderungen speichern' : 'Termin erstellen'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
