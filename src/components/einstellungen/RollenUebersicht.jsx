export default function RollenUebersicht() {
  const roles = [
    {
      id: 'admin',
      name: 'Administrator',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      description: 'Vollzugriff auf alle Bereiche, Einstellungen, Finanzen, Mandanten und Benutzerverwaltung.',
      permissions: {
        kunden: 'Erstellen, Bearbeiten, Löschen, Exportieren',
        projekte: 'Vollzugriff',
        offerten: 'Vollzugriff',
        rechnungen: 'Vollzugriff & Freigabe',
        buchhaltung: 'Vollzugriff & Export',
        einstellungen: 'Vollzugriff & Nummernkreise',
        team: 'Mitglieder einladen & Rollen zuweisen'
      }
    },
    {
      id: 'projektleiter',
      name: 'Projektleiter',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      description: 'Führt Projekte und Offerten, erfasst Kunden und Rechnungsentwürfe. Kein Zugriff auf Firmeneinstellungen.',
      permissions: {
        kunden: 'Erstellen & Bearbeiten',
        projekte: 'Vollzugriff',
        offerten: 'Vollzugriff',
        rechnungen: 'Erstellen & Vorbereiten',
        buchhaltung: 'Nur Lesezugriff',
        einstellungen: 'Kein Zugriff',
        team: 'Kein Zugriff'
      }
    },
    {
      id: 'mitarbeiter',
      name: 'Mitarbeiter / Monteur',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      description: 'Zugriff auf zugewiesene Projekte, Arbeitsrapporte und Zeiterfassung.',
      permissions: {
        kunden: 'Nur Lesezugriff (Kontaktdaten)',
        projekte: 'Zugewiesene Projekte',
        offerten: 'Kein Zugriff',
        rechnungen: 'Kein Zugriff',
        buchhaltung: 'Kein Zugriff',
        einstellungen: 'Kein Zugriff',
        team: 'Kein Zugriff'
      }
    },
    {
      id: 'buchhaltung',
      name: 'Buchhaltung intern',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      description: 'Verwaltet Debitoren, Rechnungsstellung, Mahnwesen und Buchhaltungsexporte.',
      permissions: {
        kunden: 'Lesezugriff & Zahlungskonditionen',
        projekte: 'Lesezugriff',
        offerten: 'Lesezugriff',
        rechnungen: 'Vollzugriff & Mahnungen',
        buchhaltung: 'Vollzugriff & MWST-Abrechnung',
        einstellungen: 'Nur Bank & MWST',
        team: 'Kein Zugriff'
      }
    },
    {
      id: 'treuhand',
      name: 'Treuhand extern',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      description: 'Reiner Lese- und Exportzugriff für den Treuhänder / Steuerberater. Ausgeblendete Projekte & Offerten.',
      permissions: {
        kunden: 'Nur Lesezugriff',
        projekte: 'Kein Zugriff',
        offerten: 'Kein Zugriff',
        rechnungen: 'Nur Lesezugriff & PDF-Download',
        buchhaltung: 'Vollzugriff & Buchungsjournal-Export',
        einstellungen: 'Kein Zugriff',
        team: 'Kein Zugriff'
      }
    }
  ]

  const modules = [
    { key: 'kunden', label: 'Kunden' },
    { key: 'projekte', label: 'Projekte' },
    { key: 'offerten', label: 'Offerten' },
    { key: 'rechnungen', label: 'Rechnungen' },
    { key: 'buchhaltung', label: 'Buchhaltung' },
    { key: 'einstellungen', label: 'Einstellungen' },
    { key: 'team', label: 'Benutzer & Team' }
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Info */}
      <div className="bg-surface-card rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div>
            <h3 className="text-lg font-bold text-text-primary">Rollen & Berechtigungen</h3>
            <p className="text-sm text-text-secondary mt-1">
              Übersicht der definierten Rollen im System und ihrer jeweiligen Zugriffsrechte nach Schweizer KMU-Standard.
            </p>
          </div>
          <span className="px-3 py-1 bg-primary-50 text-primary-700 text-xs font-semibold rounded-full border border-primary-200 self-start sm:self-auto">
            Vordefinierte Standard-Profile
          </span>
        </div>
      </div>

      {/* Berechtigungsmatrix */}
      <div className="bg-surface-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-surface/50">
          <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">Berechtigungsmatrix</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface/50 border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Modul / Bereich</th>
                {roles.map(role => (
                  <th key={role.id} className="px-4 py-3.5 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${role.badgeColor}`}>
                      {role.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {modules.map(mod => (
                <tr key={mod.key} className="hover:bg-surface/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-text-primary flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                    {mod.label}
                  </td>
                  {roles.map(role => {
                    const perm = role.permissions[mod.key]
                    const isFull = perm.includes('Vollzugriff')
                    const isNone = perm.includes('Kein Zugriff')
                    return (
                      <td key={role.id} className="px-4 py-4 text-center">
                        <span className={`inline-block text-xs px-2.5 py-1 rounded-lg font-medium ${
                          isFull 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold' 
                            : isNone 
                              ? 'bg-gray-100 text-gray-400' 
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {perm}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailkarten pro Rolle */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map(role => (
          <div key={role.id} className="bg-surface-card rounded-2xl border border-border p-5 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${role.badgeColor}`}>
                {role.name}
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed mt-2">{role.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
