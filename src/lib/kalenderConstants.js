/**
 * Constants and helpers for the Calendar and Appointments module in Atelier 77.
 */

export const TERMIN_TYPEN = [
  {
    id: 'Montage',
    label: 'Montage',
    icon: '🔨',
    color: '#10b981',
    bgClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    dotClass: 'bg-emerald-500',
  },
  {
    id: 'Aufmass',
    label: 'Aufmass / Besichtigung',
    icon: '📐',
    color: '#6366f1',
    bgClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    badgeClass: 'bg-indigo-100 text-indigo-800',
    dotClass: 'bg-indigo-500',
  },
  {
    id: 'Kundentermin',
    label: 'Kundentermin',
    icon: '👥',
    color: '#a855f7',
    bgClass: 'bg-purple-50 text-purple-800 border-purple-200',
    badgeClass: 'bg-purple-100 text-purple-800',
    dotClass: 'bg-purple-500',
  },
  {
    id: 'Lieferung',
    label: 'Lieferung / Material',
    icon: '🚚',
    color: '#f59e0b',
    bgClass: 'bg-amber-50 text-amber-800 border-amber-200',
    badgeClass: 'bg-amber-100 text-amber-800',
    dotClass: 'bg-amber-500',
  },
  {
    id: 'Abnahme',
    label: 'Bauabnahme / Übergabe',
    icon: '📋',
    color: '#14b8a6',
    bgClass: 'bg-teal-50 text-teal-800 border-teal-200',
    badgeClass: 'bg-teal-100 text-teal-800',
    dotClass: 'bg-teal-500',
  },
  {
    id: 'Intern',
    label: 'Intern / Büro',
    icon: '🏢',
    color: '#64748b',
    bgClass: 'bg-slate-50 text-slate-800 border-slate-200',
    badgeClass: 'bg-slate-100 text-slate-800',
    dotClass: 'bg-slate-500',
  },
  {
    id: 'Urlaub',
    label: 'Urlaub / Abwesenheit',
    icon: '🌴',
    color: '#f43f5e',
    bgClass: 'bg-rose-50 text-rose-800 border-rose-200',
    badgeClass: 'bg-rose-100 text-rose-800',
    dotClass: 'bg-rose-500',
  },
  {
    id: 'Sonstiges',
    label: 'Sonstiges',
    icon: '📌',
    color: '#3b82f6',
    bgClass: 'bg-blue-50 text-blue-800 border-blue-200',
    badgeClass: 'bg-blue-100 text-blue-800',
    dotClass: 'bg-blue-500',
  },
];

export const TERMIN_STATUSSE = [
  {
    id: 'Geplant',
    label: 'Geplant',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
    dotClass: 'bg-gray-400',
  },
  {
    id: 'Bestätigt',
    label: 'Bestätigt',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  {
    id: 'In Durchführung',
    label: 'In Durchführung',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  {
    id: 'Erledigt',
    label: 'Erledigt',
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  {
    id: 'Abgesagt',
    label: 'Abgesagt',
    badgeClass: 'bg-rose-100 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },
];

export function getTerminTypConfig(typId) {
  return TERMIN_TYPEN.find(t => t.id === typId) || {
    id: typId || 'Sonstiges',
    label: typId || 'Sonstiges',
    icon: '📅',
    color: '#6b7280',
    bgClass: 'bg-gray-50 text-gray-700 border-gray-200',
    badgeClass: 'bg-gray-100 text-gray-700',
    dotClass: 'bg-gray-400',
  };
}

export function getTerminStatusConfig(statusId) {
  return TERMIN_STATUSSE.find(s => s.id === statusId) || {
    id: statusId || 'Geplant',
    label: statusId || 'Geplant',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
    dotClass: 'bg-gray-400',
  };
}
