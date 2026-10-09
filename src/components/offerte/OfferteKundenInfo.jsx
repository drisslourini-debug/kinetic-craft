import { IconUser, IconBuilding, IconCalendar } from '../icons/BrandIcons'

export default function OfferteKundenInfo({
  offerte,
  daten,
  kunde,
  projekt,
  isEditing,
  status,
  editKundeId,
  editProjektId,
  editAusfuehrung,
  kundenList,
  projekteList,
  onKundeChange,
  onProjektChange,
  onAusfuehrungChange
}) {
  return (
    <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm space-y-6">
      <h3 className="text-lg font-bold text-text-primary">Stammdaten</h3>
      
      <div>
        <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold flex items-center gap-1.5">
          <IconUser className="w-3.5 h-3.5 text-slate-500" />
          <span>Kunde</span>
        </label>
        {isEditing && (status === 'Entwurf' || status === 'In Überarbeitung') ? (
          <select
            value={editKundeId}
            onChange={(e) => onKundeChange(e.target.value)}
            className="mt-1.5 w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm font-medium focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
          >
            <option value="">Bitte wählen...</option>
            {kundenList.map(k => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </select>
        ) : (
          <>
            <div className="mt-1.5 font-medium text-text-primary">{kunde ? kunde.name : (offerte.kunden_name || 'Unbekannt')}</div>
            {kunde && kunde.ort && <div className="text-sm text-text-secondary">{kunde.ort}</div>}
          </>
        )}
      </div>

      <div className="pt-4 border-t border-border">
        <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold flex items-center gap-1.5">
          <IconBuilding className="w-3.5 h-3.5 text-slate-500" />
          <span>Projekt / Baustelle</span>
        </label>
        {isEditing && (status === 'Entwurf' || status === 'In Überarbeitung') ? (
          <select
            value={editProjektId}
            onChange={(e) => onProjektChange(e.target.value)}
            disabled={!editKundeId}
            className="mt-1.5 w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm font-medium focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 disabled:opacity-50"
          >
            <option value="">Kein Projekt zugeordnet</option>
            {projekteList.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        ) : (
          <>
            <div className="mt-1.5 font-medium text-text-primary">{projekt ? projekt.name : 'Kein Projekt zugeordnet'}</div>
            {projekt && projekt.adresse && <div className="text-sm text-text-secondary">{projekt.adresse}</div>}
          </>
        )}
      </div>

      {/* Editable Ausfuehrung inline inside Stammdaten grid block */}
      {isEditing ? (
        <div className="pt-4 border-t border-border space-y-3">
          <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <IconCalendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Ausführung</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-text-secondary uppercase">Start</label>
              <input
                type="text"
                value={editAusfuehrung.start}
                onChange={(e) => onAusfuehrungChange({ ...editAusfuehrung, start: e.target.value })}
                className="w-full px-2 py-1.5 bg-surface border border-border rounded-lg text-sm"
                placeholder="z.B. Nächste Woche"
              />
            </div>
            <div>
              <label className="text-[10px] text-text-secondary uppercase">Dauer</label>
              <input
                type="text"
                value={editAusfuehrung.dauer}
                onChange={(e) => onAusfuehrungChange({ ...editAusfuehrung, dauer: e.target.value })}
                className="w-full px-2 py-1.5 bg-surface border border-border rounded-lg text-sm"
                placeholder="z.B. 1-2 Tage"
              />
            </div>
          </div>
        </div>
      ) : (
        (daten.ausfuehrung?.start || daten.ausfuehrung?.dauer) && (
          <div className="pt-4 border-t border-border">
            <label className="text-xs text-text-secondary uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <IconCalendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Ausführung</span>
            </label>
            <div className="mt-1.5 text-sm text-text-primary">
              {daten.ausfuehrung.start && <>Start: <span className="font-medium">{daten.ausfuehrung.start}</span><br /></>}
              {daten.ausfuehrung.dauer && <>Dauer: <span className="font-medium">{daten.ausfuehrung.dauer}</span></>}
            </div>
          </div>
        )
      )}
    </div>
  )
}
