import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { formatDate, formatCurrency } from '../lib/formatters';
import { getHolidays } from '../lib/holidayService';
import {
  TERMIN_TYPEN,
  TERMIN_STATUSSE,
  getTerminTypConfig,
  getTerminStatusConfig
} from '../lib/kalenderConstants';
import TerminModal from '../components/kalender/TerminModal';
import TerminDetailModal from '../components/kalender/TerminDetailModal';
import KalenderSyncModal from '../components/kalender/KalenderSyncModal';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

export default function KalenderView({ onNavigate, viewParams, userRole }) {
  // Navigation & Date State
  const [currentDate, setCurrentDate] = useState(() => {
    if (viewParams?.date) return new Date(viewParams.date);
    return new Date();
  });
  const [activeViewMode, setActiveViewMode] = useState('monat'); // 'monat', 'woche', 'agenda'

  // Data State
  const [termine, setTermine] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [kunden, setKunden] = useState([]);
  const [rechnungen, setRechnungen] = useState([]);
  const [offerten, setOfferten] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [firmenname, setFirmenname] = useState('Atelier 77');
  const [isLoading, setIsLoading] = useState(true);
  const [schemaWarning, setSchemaWarning] = useState(false);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTyp, setFilterTyp] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showProjekte, setShowProjekte] = useState(true);
  const [showFristen, setShowFristen] = useState(true);
  const [hideCompleted, setHideCompleted] = useState(false);

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalInitial, setCreateModalInitial] = useState(null);
  const [selectedTerminForDetail, setSelectedTerminForDetail] = useState(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState(null);

  const showToast = (text, type = 'success') => {
    setFeedbackToast({ text, type });
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Load Data
  const loadKalenderData = useCallback(async () => {
    if (!supabase) return;
    try {
      setIsLoading(true);

      // 1. Settings (Firmenname & Kanton für Feiertage)
      const { data: settingsData } = await supabase
        .from('einstellungen')
        .select('firmenname, kanton')
        .limit(1)
        .maybeSingle();

      const kanton = settingsData?.kanton || 'ZH';
      if (settingsData?.firmenname) setFirmenname(settingsData.firmenname);

      // 2. Holidays
      try {
        const hList = await getHolidays(year, kanton);
        setHolidays(hList || []);
      } catch (err) {
        console.error('Failed to fetch holidays:', err);
      }

      // 3. Kunden
      const { data: kundenData } = await supabase
        .from('kunden')
        .select('id, name, ort')
        .order('name');
      if (kundenData) setKunden(kundenData);

      // 4. Projekte
      const { data: projekteData } = await supabase
        .from('projekte')
        .select('id, name, adresse, status, startdatum, enddatum, kunden_id, kunden(name)')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });
      if (projekteData) setProjekte(projekteData);

      // 5. Termine (mit Fallback bei fehlender Tabelle)
      try {
        const { data: termineData, error: tError } = await supabase
          .from('termine')
          .select('*, projekte(id, name, adresse, status), kunden(id, name, ort)')
          .order('datum', { ascending: true });

        if (tError) {
          if (tError.message?.includes('does not exist') || tError.message?.includes('schema cache')) {
            setSchemaWarning(true);
          } else {
            console.error('Error fetching termine:', tError);
          }
          setTermine([]);
        } else {
          setTermine(termineData || []);
          setSchemaWarning(false);
        }
      } catch (tErr) {
        console.warn('Termine table not accessible yet:', tErr);
        setTermine([]);
      }

      // 6. Rechnungen & Offerten (für Fristen-Overlay)
      const { data: rData } = await supabase
        .from('rechnungen')
        .select('id, rechnung_nr, total, faellig_am, status, daten, kunden(name)')
        .eq('is_archived', false)
        .in('status', ['Versendet', 'Teilbezahlt', 'Überfällig', 'Gemahnt']);
      if (rData) setRechnungen(rData);

      const { data: oData } = await supabase
        .from('offerten')
        .select('id, total, status, gueltig_bis, daten, kunden(name)')
        .eq('is_archived', false)
        .in('status', ['Entwurf', 'Versendet']);
      if (oData) setOfferten(oData);

    } catch (err) {
      console.error('Error loading calendar data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [year]);

  useEffect(() => {
    loadKalenderData();
  }, [loadKalenderData]);

  // ViewParams check for auto-opening create modal or jumping to date
  useEffect(() => {
    if (viewParams?.date) {
      const targetDate = new Date(viewParams.date);
      if (!isNaN(targetDate.getTime())) {
        setCurrentDate(targetDate);
      }
    }
    if (viewParams?.action === 'create') {
      setCreateModalInitial({
        datum: viewParams.date || new Date().toISOString().split('T')[0],
        projekt_id: viewParams.projektId || '',
        kunden_id: viewParams.kundeId || ''
      });
      setIsCreateModalOpen(true);
    }
  }, [viewParams]);

  // Handlers for Save / Delete / Status
  const handleSaveTermin = async (formData, terminId) => {
    if (!supabase) return;

    if (terminId) {
      // Update
      const { error } = await supabase
        .from('termine')
        .update(formData)
        .eq('id', terminId);

      if (error) throw error;
      showToast('Termin erfolgreich aktualisiert');
    } else {
      // Create
      const { error } = await supabase
        .from('termine')
        .insert([formData]);

      if (error) throw error;
      showToast('Termin erfolgreich erstellt');
    }

    await loadKalenderData();
  };

  const handleDeleteTermin = async (terminId) => {
    if (!supabase || !terminId) return;
    const { error } = await supabase
      .from('termine')
      .delete()
      .eq('id', terminId);

    if (error) throw error;
    showToast('Termin gelöscht', 'info');
    setSelectedTerminForDetail(null);
    await loadKalenderData();
  };

  const handleStatusChange = async (terminId, newStatus) => {
    if (!supabase || !terminId) return;
    const { error } = await supabase
      .from('termine')
      .update({ status: newStatus })
      .eq('id', terminId);

    if (error) throw error;
    showToast(`Status auf "${newStatus}" geändert`);

    // Update in local state
    setTermine(prev => prev.map(t => t.id === terminId ? { ...t, status: newStatus } : t));
    if (selectedTerminForDetail?.id === terminId) {
      setSelectedTerminForDetail(prev => ({ ...prev, status: newStatus }));
    }
  };

  // Quick navigation
  const handlePrev = () => {
    if (activeViewMode === 'woche') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  const handleNext = () => {
    if (activeViewMode === 'woche') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Compile all combined calendar events
  const allEvents = useMemo(() => {
    const list = [];

    // 1. Regular Appointments from 'termine'
    termine.forEach(t => {
      // Filter out completed if hideCompleted is active
      if (hideCompleted && t.status === 'Erledigt') return;
      if (filterTyp !== 'ALL' && t.typ !== filterTyp) return;
      if (filterStatus !== 'ALL' && t.status !== filterStatus) return;

      const termMatch = !searchTerm || (
        (t.titel || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.ort || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.projekte?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.kunden?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (!termMatch) return;

      list.push({
        ...t,
        category: 'termin',
        isAllDay: Boolean(t.ganztaegig || (!t.startzeit && !t.endzeit))
      });
    });

    // 2. Project spans / milestones
    if (showProjekte) {
      projekte.forEach(p => {
        if (!p.startdatum) return;
        const termMatch = !searchTerm || (
          (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.kunden?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.adresse || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (!termMatch) return;

        list.push({
          id: `proj-${p.id}`,
          originalId: p.id,
          titel: `🏗️ ${p.name}`,
          datum: p.startdatum,
          end_datum: p.enddatum || p.startdatum,
          typ: 'Projekt',
          status: p.status || 'Aktiv',
          projekt_id: p.id,
          projekte: p,
          kunden: p.kunden,
          ort: p.adresse,
          beschreibung: `Projekt-Laufzeit: ${formatDate(p.startdatum)} bis ${formatDate(p.enddatum || p.startdatum)}`,
          category: 'projekt',
          isSyntheticProject: true,
          isAllDay: true
        });
      });
    }

    // 3. Invoice Due Dates
    if (showFristen) {
      rechnungen.forEach(r => {
        const dueDate = r.faellig_am || r.daten?.faellig_am;
        if (!dueDate) return;
        list.push({
          id: `rech-${r.id}`,
          originalId: r.id,
          titel: `💰 Rechnung ${r.rechnung_nr || `#${r.id}`} (${formatCurrency(r.total)})`,
          datum: dueDate,
          end_datum: dueDate,
          typ: 'Frist',
          status: r.status,
          kunden: r.kunden,
          total: r.total,
          rechnung_nr: r.rechnung_nr,
          beschreibung: `Fälligkeit der Rechnung ${r.rechnung_nr || `#${r.id}`} für Kunde ${r.kunden?.name || ''}`,
          category: 'rechnung',
          isSyntheticInvoice: true,
          isAllDay: true
        });
      });

      offerten.forEach(o => {
        const expiryDate = o.gueltig_bis || o.daten?.gueltig_bis;
        if (!expiryDate) return;
        list.push({
          id: `off-${o.id}`,
          originalId: o.id,
          titel: `📄 Offerte ${o.kunden?.name || ''} läuft ab`,
          datum: expiryDate,
          end_datum: expiryDate,
          typ: 'Frist',
          status: o.status,
          kunden: o.kunden,
          total: o.total,
          beschreibung: `Gültigkeit der Offerte (${formatCurrency(o.total)}) endet am ${formatDate(expiryDate)}`,
          category: 'offerte',
          isSyntheticQuote: true,
          isAllDay: true
        });
      });
    }

    return list;
  }, [termine, projekte, rechnungen, offerten, searchTerm, filterTyp, filterStatus, showProjekte, showFristen, hideCompleted]);

  // Click handler on empty day/slot
  const handleEmptyDayClick = (dateStr, initialHour = '08:00') => {
    setCreateModalInitial({
      datum: dateStr,
      startzeit: initialHour,
      endzeit: addHour(initialHour, 2)
    });
    setIsCreateModalOpen(true);
  };

  const handleEventClick = (event) => {
    setSelectedTerminForDetail(event);
  };

  function addHour(timeStr, hours) {
    const parts = timeStr.split(':');
    let h = parseInt(parts[0] || '8', 10) + hours;
    if (h >= 24) h = 23;
    return `${String(h).padStart(2, '0')}:${parts[1] || '00'}`;
  }

  // --- RENDER VIEWS ---

  // 1. Month View Generator
  const renderMonthView = () => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let firstDayIndex = new Date(year, month, 1).getDay();
    firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Mon = 0, Sun = 6

    const cells = [];
    const todayStr = new Date().toISOString().split('T')[0];

    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = prevDate.toISOString().split('T')[0];
      cells.push(
        <div 
          key={`prev-${dayNum}`}
          onClick={() => handleEmptyDayClick(dateStr)}
          className="p-1.5 sm:p-2 min-h-[95px] sm:min-h-[115px] bg-gray-50/40 border border-gray-100/80 rounded-xl opacity-40 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <span className="text-xs font-medium text-gray-400">{dayNum}</span>
        </div>
      );
    }

    // Days in current month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const dayDate = new Date(year, month, i);
      const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
      const isHoliday = holidays.find(h => h.date === dateStr);

      // Events active on this day (either exact date match or multi-day range)
      const dayEvents = allEvents.filter(e => {
        if (e.datum === dateStr) return true;
        if (e.end_datum && e.end_datum >= dateStr && e.datum <= dateStr) return true;
        return false;
      });

      cells.push(
        <div
          key={`day-${i}`}
          onClick={() => handleEmptyDayClick(dateStr)}
          className={`
            p-1.5 sm:p-2 min-h-[95px] sm:min-h-[115px] rounded-xl border transition-all flex flex-col justify-between cursor-pointer
            ${isToday ? 'bg-primary-50/25 border-primary-500 ring-2 ring-primary-500/20 shadow-sm' : 'bg-white border-border hover:border-primary-300 hover:shadow-xs'}
            ${isHoliday ? 'bg-rose-50/30' : (isWeekend ? 'bg-gray-50/30' : '')}
          `}
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`
                text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                ${isToday ? 'bg-primary-600 text-white' : (isWeekend ? 'text-gray-400' : 'text-text-primary')}
              `}>
                {i}
              </span>
              {isHoliday && (
                <span 
                  className="text-[10px] font-semibold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full truncate max-w-[90px]"
                  title={isHoliday.localName || isHoliday.name}
                >
                  {isHoliday.localName || isHoliday.name}
                </span>
              )}
            </div>

            {/* Event Chips */}
            <div className="space-y-1">
              {dayEvents.slice(0, 3).map((ev, idx) => {
                const typConf = getTerminTypConfig(ev.typ);
                const isProject = ev.category === 'projekt';
                const isInvoice = ev.category === 'rechnung';
                const isQuote = ev.category === 'offerte';

                let chipClass = `${typConf.bgClass} border`;
                if (isProject) chipClass = 'bg-indigo-100 text-indigo-900 border-indigo-200 font-semibold';
                if (isInvoice) chipClass = 'bg-rose-100 text-rose-900 border-rose-200';
                if (isQuote) chipClass = 'bg-sky-100 text-sky-900 border-sky-200';

                return (
                  <div
                    key={ev.id || idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEventClick(ev);
                    }}
                    title={`${ev.titel} ${ev.startzeit ? `(${ev.startzeit})` : ''} – ${ev.ort || ''}`}
                    className={`
                      text-[11px] px-1.5 py-0.5 rounded-md truncate cursor-pointer transition-transform hover:scale-[1.02] shadow-2xs flex items-center gap-1
                      ${chipClass}
                    `}
                  >
                    <span className="shrink-0 text-[10px]">{typConf.icon || '📌'}</span>
                    {!ev.isAllDay && ev.startzeit && (
                      <span className="opacity-75 font-mono text-[10px]">{ev.startzeit}</span>
                    )}
                    <span className="truncate">{ev.titel}</span>
                  </div>
                );
              })}

              {dayEvents.length > 3 && (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentDate(new Date(year, month, i));
                    setActiveViewMode('agenda');
                  }}
                  className="text-[10px] font-semibold text-primary-600 hover:text-primary-800 px-1 cursor-pointer"
                >
                  + {dayEvents.length - 3} weitere
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-surface-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {WEEKDAYS.map(day => (
            <div key={day} className="text-center text-xs font-bold uppercase tracking-wider text-text-secondary py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-2">
          {cells}
        </div>
      </div>
    );
  };

  // 2. Week View Generator (Hourly Grid)
  const renderWeekView = () => {
    // Determine start of week (Monday)
    const current = new Date(currentDate);
    const dayOfWeek = current.getDay();
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(current);
    monday.setDate(current.getDate() + distanceToMonday);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDays.push(d);
    }

    const hours = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
    const todayStr = new Date().toISOString().split('T')[0];

    return (
      <div className="bg-surface-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm overflow-x-auto">
        {/* Days Header */}
        <div className="grid grid-cols-8 gap-2 min-w-[750px] border-b border-border pb-3 mb-2">
          <div className="text-xs font-bold text-text-secondary uppercase flex items-center justify-center">
            Zeit
          </div>
          {weekDays.map((d, idx) => {
            const dateStr = d.toISOString().split('T')[0];
            const isToday = dateStr === todayStr;
            return (
              <div 
                key={idx} 
                onClick={() => handleEmptyDayClick(dateStr)}
                className={`text-center p-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors ${isToday ? 'bg-primary-50/50' : ''}`}
              >
                <span className="text-xs font-bold text-text-secondary uppercase block">
                  {WEEKDAYS[idx]}
                </span>
                <span className={`text-base font-bold inline-block mt-0.5 w-8 h-8 leading-8 rounded-full ${isToday ? 'bg-primary-600 text-white shadow-sm' : 'text-text-primary'}`}>
                  {d.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {/* All Day / Projects Row */}
        <div className="grid grid-cols-8 gap-2 min-w-[750px] bg-gray-50/50 p-2 rounded-xl mb-3 border border-gray-100">
          <div className="text-[11px] font-bold text-text-secondary uppercase flex items-center justify-center">
            Ganztägig
          </div>
          {weekDays.map((d, idx) => {
            const dateStr = d.toISOString().split('T')[0];
            const allDayEvents = allEvents.filter(e => {
              if (!e.isAllDay) return false;
              if (e.datum === dateStr) return true;
              if (e.end_datum && e.end_datum >= dateStr && e.datum <= dateStr) return true;
              return false;
            });

            return (
              <div key={idx} className="space-y-1 min-h-[36px]">
                {allDayEvents.map((ev, eIdx) => {
                  const typConf = getTerminTypConfig(ev.typ);
                  return (
                    <div
                      key={ev.id || eIdx}
                      onClick={() => handleEventClick(ev)}
                      title={ev.titel}
                      className="text-[10px] px-2 py-1 rounded bg-white border border-gray-200 font-semibold truncate shadow-2xs cursor-pointer hover:bg-primary-50 hover:border-primary-300"
                    >
                      {typConf.icon} {ev.titel}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Hourly Grid */}
        <div className="min-w-[750px] divide-y divide-gray-100">
          {hours.map(hour => {
            const hourNum = parseInt(hour.split(':')[0], 10);
            return (
              <div key={hour} className="grid grid-cols-8 gap-2 py-1.5 min-h-[50px] items-start hover:bg-gray-50/30 transition-colors">
                <div className="text-xs font-mono text-text-secondary text-center pt-1">
                  {hour}
                </div>
                {weekDays.map((d, dIdx) => {
                  const dateStr = d.toISOString().split('T')[0];
                  // Find appointments starting within this hour
                  const slotEvents = allEvents.filter(e => {
                    if (e.isAllDay) return false;
                    if (e.datum !== dateStr) return false;
                    if (!e.startzeit) return false;
                    const eventHour = parseInt(e.startzeit.split(':')[0], 10);
                    return eventHour === hourNum;
                  });

                  return (
                    <div 
                      key={dIdx}
                      onClick={() => handleEmptyDayClick(dateStr, hour)}
                      className="h-full min-h-[44px] rounded-lg p-1 border border-dashed border-gray-100 hover:border-primary-300 hover:bg-primary-50/20 cursor-pointer transition-all space-y-1"
                    >
                      {slotEvents.map((ev, sIdx) => {
                        const typConf = getTerminTypConfig(ev.typ);
                        return (
                          <div
                            key={ev.id || sIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventClick(ev);
                            }}
                            className={`p-1.5 rounded-lg text-xs font-semibold shadow-2xs border cursor-pointer hover:scale-[1.01] transition-transform ${typConf.bgClass}`}
                          >
                            <div className="flex items-center gap-1">
                              <span>{typConf.icon}</span>
                              <span className="font-mono text-[10px] opacity-80">{ev.startzeit} - {ev.endzeit}</span>
                            </div>
                            <p className="truncate mt-0.5">{ev.titel}</p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 3. Agenda / List View Generator
  const renderAgendaView = () => {
    // Sort all events by date and time
    const sorted = [...allEvents].sort((a, b) => {
      if (a.datum !== b.datum) return a.datum.localeCompare(b.datum);
      return (a.startzeit || '').localeCompare(b.startzeit || '');
    });

    if (sorted.length === 0) {
      return (
        <div className="bg-surface-card border border-border rounded-2xl p-12 text-center">
          <span className="text-4xl block mb-3">📅</span>
          <h3 className="text-base font-bold text-text-primary mb-1">Keine Termine gefunden</h3>
          <p className="text-xs text-text-secondary max-w-sm mx-auto mb-4">
            Für die gewählten Filter oder den aktuellen Zeitraum sind keine Termine vorhanden.
          </p>
          <button
            onClick={() => {
              setCreateModalInitial({ datum: new Date().toISOString().split('T')[0] });
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
          >
            + Ersten Termin erstellen
          </button>
        </div>
      );
    }

    // Group by Date
    const groups = sorted.reduce((acc, ev) => {
      const d = ev.datum;
      if (!acc[d]) acc[d] = [];
      acc[d].push(ev);
      return acc;
    }, {});

    return (
      <div className="space-y-4">
        {Object.entries(groups).map(([dateStr, items]) => {
          const dObj = new Date(dateStr);
          const isToday = dateStr === new Date().toISOString().split('T')[0];

          return (
            <div key={dateStr} className="bg-surface-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-bold ${isToday ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-text-primary'}`}>
                    <span className="text-xs">{dObj.toLocaleDateString('de-CH', { weekday: 'short' })}</span>
                    <span className="text-sm leading-none">{dObj.getDate()}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">
                      {formatDate(dateStr)} {isToday && <span className="text-xs text-primary-600 font-semibold ml-2">● Heute</span>}
                    </h3>
                    <p className="text-xs text-text-secondary">
                      {items.length} {items.length === 1 ? 'Ereignis' : 'Ereignisse'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleEmptyDayClick(dateStr)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-text-primary rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  + Termin an diesem Tag
                </button>
              </div>

              <div className="space-y-2">
                {items.map(ev => {
                  const typConf = getTerminTypConfig(ev.typ);
                  const statusConf = getTerminStatusConfig(ev.status);

                  return (
                    <div
                      key={ev.id}
                      onClick={() => handleEventClick(ev)}
                      className="p-3 bg-surface hover:bg-gray-50 border border-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all hover:border-primary-300"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 ${typConf.badgeClass}`}>
                          {typConf.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-text-primary">
                              {ev.titel}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusConf.badgeClass}`}>
                              {ev.status || 'Geplant'}
                            </span>
                            <span className="text-[11px] font-medium text-text-secondary bg-gray-100 px-2 py-0.5 rounded">
                              {typConf.label}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary mt-1">
                            <span>
                              ⏰ {ev.isAllDay ? 'Ganztägig' : `${ev.startzeit || '08:00'} – ${ev.endzeit || '12:00'} Uhr`}
                            </span>
                            {ev.projekte?.name && (
                              <span className="text-indigo-600 font-medium">
                                🏗️ {ev.projekte.name}
                              </span>
                            )}
                            {ev.kunden?.name && (
                              <span>
                                👥 {ev.kunden.name}
                              </span>
                            )}
                            {ev.ort && (
                              <span>
                                📍 {ev.ort}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {ev.isSyntheticProject ? (
                          <span className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
                            Zum Projekt →
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-primary-600 hover:text-primary-800">
                            Details ansehen →
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold animate-fade-in flex items-center gap-2 ${
          feedbackToast.type === 'info' ? 'bg-indigo-900 text-white border-indigo-700' : 'bg-emerald-900 text-white border-emerald-700'
        }`}>
          <span>{feedbackToast.type === 'info' ? 'ℹ️' : '✓'}</span>
          {feedbackToast.text}
        </div>
      )}

      {/* Schema Warning Notice */}
      {schemaWarning && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800 text-xs">
          <span className="text-lg">⚠️</span>
          <div className="space-y-1">
            <strong className="block font-bold">Hinweis zur Datenbanktabelle:</strong>
            <p>
              Die Tabelle <code>termine</code> wurde noch nicht im Supabase-Projekt ausgeführt. Bitte führe einmalig das Skript <code>supabase_termine_schema.sql</code> im Supabase SQL Editor aus, um neue Termine permanent zu speichern. Projekt- und Rechnungsdaten werden bereits voll angezeigt.
            </p>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary flex items-center gap-2">
            📅 Kalender & Termine
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Einsatzplanung, Montagen, Besichtigungen und Projektlaufzeiten
          </p>
        </div>

        {/* Top Actions: View switcher & Create */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View mode buttons */}
          <div className="flex bg-surface-card border border-border p-1 rounded-xl shadow-xs">
            <button
              onClick={() => setActiveViewMode('monat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewMode === 'monat' ? 'bg-primary-600 text-white shadow-xs' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Monat
            </button>
            <button
              onClick={() => setActiveViewMode('woche')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewMode === 'woche' ? 'bg-primary-600 text-white shadow-xs' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Woche
            </button>
            <button
              onClick={() => setActiveViewMode('agenda')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewMode === 'agenda' ? 'bg-primary-600 text-white shadow-xs' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Agenda
            </button>
          </div>

          {/* Sync Button */}
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="px-3 py-2 bg-surface-card hover:bg-gray-50 text-text-primary border border-border rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>🔄</span> Sync & Export
          </button>

          {/* Create Button */}
          <button
            onClick={() => {
              setCreateModalInitial({
                datum: new Date().toISOString().split('T')[0]
              });
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-md shadow-primary-600/25 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>+</span> Neuer Termin
          </button>
        </div>
      </div>

      {/* Date Navigation & Controls */}
      <div className="bg-surface-card border border-border rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-2 rounded-xl hover:bg-gray-100 text-text-secondary hover:text-text-primary transition-colors cursor-pointer border border-border"
              title="Vorheriger Monat / Woche"
            >
              ◀
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-2 rounded-xl hover:bg-gray-100 text-text-primary text-xs font-bold transition-colors cursor-pointer border border-border"
            >
              Heute
            </button>
            <button
              onClick={handleNext}
              className="p-2 rounded-xl hover:bg-gray-100 text-text-secondary hover:text-text-primary transition-colors cursor-pointer border border-border"
              title="Nächster Monat / Woche"
            >
              ▶
            </button>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-text-primary ml-2">
            {MONTH_NAMES[month]} {year}
          </h2>
        </div>

        {/* Filter Bar Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Termin, Projekt, Ort suchen..."
            className="px-3 py-1.5 bg-surface border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-500 w-48 sm:w-56"
          />

          {/* Typ Selector */}
          <select
            value={filterTyp}
            onChange={e => setFilterTyp(e.target.value)}
            className="px-3 py-1.5 bg-surface border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="ALL">Alle Kategorien</option>
            {TERMIN_TYPEN.map(t => (
              <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
            ))}
          </select>

          {/* Status Selector */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-surface border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="ALL">Alle Status</option>
            {TERMIN_STATUSSE.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>

          {/* Toggles */}
          <button
            onClick={() => setShowProjekte(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              showProjekte ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-surface border-border text-text-secondary'
            }`}
          >
            🏗️ Projekte
          </button>

          <button
            onClick={() => setShowFristen(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              showFristen ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-surface border-border text-text-secondary'
            }`}
          >
            💰 Fristen
          </button>

          <button
            onClick={() => setHideCompleted(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              hideCompleted ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-surface border-border text-text-secondary'
            }`}
          >
            ✓ Erledigte ausblenden
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {isLoading ? (
        <div className="bg-surface-card border border-border rounded-2xl p-16 text-center shadow-sm">
          <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-text-secondary font-medium">Kalenderdaten werden geladen...</p>
        </div>
      ) : (
        <>
          {activeViewMode === 'monat' && renderMonthView()}
          {activeViewMode === 'woche' && renderWeekView()}
          {activeViewMode === 'agenda' && renderAgendaView()}
        </>
      )}

      {/* Create / Edit Modal */}
      <TerminModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreateModalInitial(null);
        }}
        onSave={handleSaveTermin}
        onDelete={handleDeleteTermin}
        initialData={createModalInitial}
        projekte={projekte}
        kunden={kunden}
      />

      {/* Detail / Quick Action Modal */}
      <TerminDetailModal
        isOpen={Boolean(selectedTerminForDetail)}
        termin={selectedTerminForDetail}
        onClose={() => setSelectedTerminForDetail(null)}
        onEdit={(terminToEdit) => {
          setSelectedTerminForDetail(null);
          setCreateModalInitial(terminToEdit);
          setIsCreateModalOpen(true);
        }}
        onDelete={handleDeleteTermin}
        onStatusChange={handleStatusChange}
        onNavigate={onNavigate}
      />

      {/* Calendar Sync Modal */}
      <KalenderSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        termine={termine}
        firmenname={firmenname}
      />
    </div>
  );
}
