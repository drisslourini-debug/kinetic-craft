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
import {
  IconCalendar,
  IconClock,
  IconBuilding,
  IconTeam,
  IconLocation,
  IconMapsRoute,
  IconPhone,
  IconCheck,
  IconRefresh,
  IconDocument,
  IconWarning,
  IconMoney,
  IconClose,
  IconSearch,
  IconSettings,
  IconCoffee,
  TerminTypIcon
} from '../components/icons/BrandIcons';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

function formatLocalYMD(d) {
  if (!d || isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function KalenderView({ onNavigate, viewParams, userRole, globalSettings }) {
  // Navigation & Date State
  const [currentDate, setCurrentDate] = useState(() => {
    if (viewParams?.date) return new Date(viewParams.date);
    return new Date();
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    if (viewParams?.date) return new Date(viewParams.date);
    return new Date();
  });
  const [mobileWeekOnly, setMobileWeekOnly] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [activeViewMode, setActiveViewMode] = useState('monat'); // 'monat', 'woche', 'agenda'

  // Data State
  const [termine, setTermine] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [kunden, setKunden] = useState([]);
  const [rechnungen, setRechnungen] = useState([]);
  const [offerten, setOfferten] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [firmenname, setFirmenname] = useState('Muster Malerei Bern AG');
  const [isLoading, setIsLoading] = useState(true);
  const [schemaWarning, setSchemaWarning] = useState(false);
  const [isWarningDismissed, setIsWarningDismissed] = useState(false);

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
      let kanton = 'BE';
      try {
        const local = localStorage.getItem('atelier77_einstellungen_v2');
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed.kanton) kanton = parsed.kanton;
        }
      } catch (e) {}

      const { data: settingsData } = await supabase
        .from('einstellungen')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (settingsData?.kanton) kanton = settingsData.kanton;
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
        .select('id, name, ort, telefon')
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
          .select('*, projekte(id, name, adresse, status), kunden(id, name, ort, telefon)')
          .order('datum', { ascending: true });

        if (tError) {
          if (tError.code === '42P01' || (tError.message?.includes('termine') && (tError.message?.includes('does not exist') || tError.message?.includes('schema cache')))) {
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
  const handleSelectDay = (dateObj) => {
    setSelectedDate(dateObj);
    if (dateObj.getMonth() !== month || dateObj.getFullYear() !== year) {
      setCurrentDate(new Date(dateObj.getFullYear(), dateObj.getMonth(), 1));
    }
  };

  const handlePrev = () => {
    if (activeViewMode === 'woche') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
      setSelectedDate(d);
    } else {
      const prev = new Date(year, month - 1, 1);
      setCurrentDate(prev);
      setSelectedDate(prev);
    }
  };

  const handleNext = () => {
    if (activeViewMode === 'woche') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
      setSelectedDate(d);
    } else {
      const next = new Date(year, month + 1, 1);
      setCurrentDate(next);
      setSelectedDate(next);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
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
          titel: p.name || 'Projekt',
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
          titel: `Rechnung ${r.rechnung_nr || `#${r.id}`} (${formatCurrency(r.total)})`,
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
          titel: `Offerte ${o.kunden?.name || ''} läuft ab`,
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
                    <TerminTypIcon typ={ev.typ} className="w-3 h-3 shrink-0" />
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
          <IconCalendar className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
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
                          <TerminTypIcon typ={ev.typ} className="w-4 h-4" />
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
                            <span className="flex items-center gap-1">
                              <IconClock className="w-3.5 h-3.5" />
                              <span>{ev.isAllDay ? 'Ganztägig' : `${ev.startzeit || '08:00'} – ${ev.endzeit || '12:00'} Uhr`}</span>
                            </span>
                            {ev.projekte?.name && (
                              <span className="text-indigo-600 font-medium flex items-center gap-1">
                                <IconBuilding className="w-3.5 h-3.5" />
                                <span>{ev.projekte.name}</span>
                              </span>
                            )}
                            {ev.kunden?.name && (
                              <span className="flex items-center gap-1">
                                <IconTeam className="w-3.5 h-3.5" />
                                <span>{ev.kunden.name}</span>
                              </span>
                            )}
                            {ev.ort && (
                              <span className="flex items-center gap-1">
                                <IconLocation className="w-3.5 h-3.5" />
                                <span>{ev.ort}</span>
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

  const activeFilterCount = (filterTyp !== 'ALL' ? 1 : 0) +
    (filterStatus !== 'ALL' ? 1 : 0) +
    (!showProjekte ? 1 : 0) +
    (!showFristen ? 1 : 0) +
    (hideCompleted ? 1 : 0) +
    (searchTerm.trim() ? 1 : 0);

  // 4. Mobile Calendar View (Compact month / week strip + selected day agenda)
  const renderMobileCalendarView = () => {
    const selectedDateStr = formatLocalYMD(selectedDate);
    const todayStr = formatLocalYMD(new Date());

    let calendarDays = [];

    if (mobileWeekOnly) {
      // 7 days of the selected week (Monday to Sunday)
      const currentSelected = new Date(selectedDate);
      const selDayOfWeek = currentSelected.getDay();
      const distToMonday = selDayOfWeek === 0 ? -6 : 1 - selDayOfWeek;
      const weekMonday = new Date(currentSelected);
      weekMonday.setDate(currentSelected.getDate() + distToMonday);

      for (let i = 0; i < 7; i++) {
        const d = new Date(weekMonday);
        d.setDate(weekMonday.getDate() + i);
        calendarDays.push({
          dateObj: d,
          dateStr: formatLocalYMD(d),
          dayNum: d.getDate(),
          isCurrentMonth: d.getMonth() === month,
          isWeekend: d.getDay() === 0 || d.getDay() === 6
        });
      }
    } else {
      // Full Month with padding
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      let firstDayIndex = new Date(year, month, 1).getDay();
      firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Mon = 0, Sun = 6

      const prevMonthDays = new Date(year, month, 0).getDate();
      for (let i = firstDayIndex - 1; i >= 0; i--) {
        const dayNum = prevMonthDays - i;
        const d = new Date(year, month - 1, dayNum);
        calendarDays.push({
          dateObj: d,
          dateStr: formatLocalYMD(d),
          dayNum,
          isCurrentMonth: false,
          isWeekend: d.getDay() === 0 || d.getDay() === 6
        });
      }

      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        calendarDays.push({
          dateObj: d,
          dateStr: formatLocalYMD(d),
          dayNum: i,
          isCurrentMonth: true,
          isWeekend: d.getDay() === 0 || d.getDay() === 6
        });
      }
    }

    // Events for selected day
    const selectedDayEvents = allEvents.filter(e => {
      if (e.datum === selectedDateStr) return true;
      if (e.end_datum && e.end_datum >= selectedDateStr && e.datum <= selectedDateStr) return true;
      return false;
    });

    return (
      <div className="space-y-3">
        {/* Calendar Card */}
        <div className="bg-surface-card border border-border rounded-2xl p-3 shadow-xs">
          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 mb-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-text-secondary">
            {WEEKDAYS.map(day => (
              <div key={day} className="py-0.5">{day}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((dItem, idx) => {
              const isSelected = dItem.dateStr === selectedDateStr;
              const isToday = dItem.dateStr === todayStr;
              const isHoliday = holidays.find(h => h.date === dItem.dateStr);

              // Gather events for dots
              const dEvents = allEvents.filter(e => {
                if (e.datum === dItem.dateStr) return true;
                if (e.end_datum && e.end_datum >= dItem.dateStr && e.datum <= dItem.dateStr) return true;
                return false;
              });

              const hasTermin = dEvents.some(e => e.category === 'termin');
              const hasProjekt = dEvents.some(e => e.category === 'projekt');
              const hasFrist = dEvents.some(e => e.category === 'rechnung' || e.category === 'offerte');

              return (
                <button
                  key={`${dItem.dateStr}-${idx}`}
                  type="button"
                  onClick={() => handleSelectDay(dItem.dateObj)}
                  className={`py-1.5 px-0.5 flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer relative min-h-[44px] ${
                    isSelected
                      ? 'bg-primary-600 text-white font-bold shadow-xs'
                      : isToday
                      ? 'bg-primary-50 text-primary-700 font-bold border border-primary-300'
                      : dItem.isCurrentMonth
                      ? 'text-text-primary hover:bg-neutral-100 active:bg-neutral-200'
                      : 'text-gray-300 hover:bg-neutral-50'
                  }`}
                >
                  <span className="text-xs leading-none">{dItem.dayNum}</span>

                  {/* Event Dots */}
                  <div className="flex items-center gap-0.5 mt-1 h-1.5">
                    {hasTermin && (
                      <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary-500'}`} />
                    )}
                    {hasProjekt && (
                      <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} />
                    )}
                    {hasFrist && (
                      <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-500'}`} />
                    )}
                    {isHoliday && (
                      <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-rose-500'}`} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Toggle Week vs Month */}
          <div className="pt-2 mt-1 border-t border-border/50 flex justify-center">
            <button
              type="button"
              onClick={() => setMobileWeekOnly(!mobileWeekOnly)}
              className="text-[11px] font-semibold text-text-secondary hover:text-text-primary px-3 py-1 rounded-md hover:bg-neutral-100 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>{mobileWeekOnly ? '▼ Ganzen Monat anzeigen' : '▲ Auf 1 Woche minimieren'}</span>
            </button>
          </div>
        </div>

        {/* Selected Day Agenda */}
        <div className="bg-surface-card border border-border rounded-2xl p-3.5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-border">
            <div>
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-1.5">
                <span>{selectedDate.toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                {selectedDateStr === todayStr && (
                  <span className="text-[10px] font-bold bg-primary-100 text-primary-700 px-1.5 py-0.2 rounded-full">
                    Heute
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-text-secondary">
                {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'Ereignis' : 'Ereignisse'}
              </p>
            </div>
            
            <button
              type="button"
              onClick={() => handleEmptyDayClick(selectedDateStr)}
              className="text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 px-2.5 py-1.5 rounded-xl border border-primary-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>+</span>
              <span>Termin</span>
            </button>
          </div>

          {/* Event Cards */}
          {selectedDayEvents.length === 0 ? (
            <div className="py-6 px-4 text-center">
              <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <IconCoffee className="w-5 h-5 text-neutral-500" />
              </div>
              <p className="font-semibold text-sm text-text-primary">Keine Termine geplant</p>
              <p className="text-xs text-text-secondary mt-0.5 mb-3">
                Für diesen Tag stehen keine Einsätze oder Fristen an.
              </p>
              <button
                type="button"
                onClick={() => handleEmptyDayClick(selectedDateStr)}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                + Termin für diesen Tag erfassen
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDayEvents.map((ev, idx) => {
                const typConf = getTerminTypConfig(ev.typ);
                const statusConf = getTerminStatusConfig(ev.status);
                const customerPhone = ev.kunden?.telefon || ev.kunden?.mobile;
                const locationQuery = ev.ort ? encodeURIComponent(ev.ort) : '';

                return (
                  <div
                    key={ev.id || idx}
                    onClick={() => handleEventClick(ev)}
                    className="p-3 bg-white border border-border rounded-xl shadow-xs active:bg-neutral-50 transition-all flex flex-col gap-2 cursor-pointer"
                  >
                    {/* Time & Badges */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
                        <span className="font-bold text-text-primary font-mono text-[11px]">
                          {ev.isAllDay ? 'Ganztägig' : `${ev.startzeit || '08:00'} – ${ev.endzeit || '12:00'}`}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-neutral-100 text-text-secondary flex items-center gap-1">
                          <TerminTypIcon typ={ev.typ} className="w-3 h-3 shrink-0" />
                          <span>{typConf.label}</span>
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusConf.badgeClass}`}>
                        {ev.status || 'Geplant'}
                      </span>
                    </div>

                    {/* Title & Info */}
                    <div>
                      <h4 className="font-bold text-sm text-text-primary leading-snug">
                        {ev.titel}
                      </h4>
                      {(ev.projekte?.name || ev.kunden?.name) && (
                        <div className="flex items-center gap-2 text-xs text-text-secondary mt-1 flex-wrap">
                          {ev.projekte?.name && (
                            <span className="font-medium text-indigo-700 flex items-center gap-1">
                              <IconBuilding className="w-3.5 h-3.5" />
                              <span>{ev.projekte.name}</span>
                            </span>
                          )}
                          {ev.kunden?.name && (
                            <span className="flex items-center gap-1">
                              <IconTeam className="w-3.5 h-3.5" />
                              <span>{ev.kunden.name}</span>
                            </span>
                          )}
                        </div>
                      )}
                      {ev.ort && (
                        <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-1">
                          <IconLocation className="w-3.5 h-3.5 text-text-secondary" />
                          <span className="truncate">{ev.ort}</span>
                        </p>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2 pt-1 border-t border-border/50 text-xs" onClick={e => e.stopPropagation()}>
                      {locationQuery && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${locationQuery}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-text-primary font-semibold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <IconMapsRoute className="w-3.5 h-3.5" />
                          <span>Route</span>
                        </a>
                      )}
                      {customerPhone && (
                        <a
                          href={`tel:${customerPhone}`}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <IconPhone className="w-3.5 h-3.5" />
                          <span>Anrufen</span>
                        </a>
                      )}
                      {ev.category === 'termin' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(ev.id, ev.status === 'Erledigt' ? 'Geplant' : 'Erledigt')}
                          className={`ml-auto px-2.5 py-1.5 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer ${
                            ev.status === 'Erledigt'
                              ? 'bg-neutral-100 text-text-secondary'
                              : 'bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100'
                          }`}
                        >
                          {ev.status === 'Erledigt' ? (
                            <span className="flex items-center gap-1">
                              <IconRefresh className="w-3 h-3" />
                              Reaktivieren
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <IconCheck className="w-3 h-3" />
                              Erledigt
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold animate-fade-in flex items-center gap-2 ${
          feedbackToast.type === 'info' ? 'bg-indigo-900 text-white border-indigo-700' : 'bg-emerald-900 text-white border-emerald-700'
        }`}>
          <span>
            {feedbackToast.type === 'info' ? (
              <IconDocument className="w-4 h-4 text-indigo-200" />
            ) : (
              <IconCheck className="w-4 h-4 text-emerald-300" />
            )}
          </span>
          {feedbackToast.text}
        </div>
      )}

      {/* Schema Warning Notice */}
      {schemaWarning && !isWarningDismissed && (
        <div className="p-3.5 sm:p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start justify-between gap-3 text-amber-800 text-xs shadow-xs">
          <div className="flex items-start gap-2.5">
            <IconWarning className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block font-bold">Hinweis zur Datenbanktabelle:</strong>
              <p className="leading-relaxed">
                Die Tabelle <code>termine</code> wurde noch nicht im Supabase-Projekt ausgeführt. Bitte führe einmalig das Skript <code>supabase_termine_schema.sql</code> im Supabase SQL Editor aus, um neue Termine permanent zu speichern. Projekt- und Rechnungsdaten werden bereits voll angezeigt.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsWarningDismissed(true)}
            className="p-1 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer shrink-0"
            title="Hinweis ausblenden"
          >
            <IconClose className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Desktop Header Bar */}
      <div className="hidden md:flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary flex items-center gap-2.5">
            <IconCalendar className="w-7 h-7 text-primary-600 shrink-0" />
            <span>Kalender & Termine</span>
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
            <IconRefresh className="w-4 h-4" />
            <span>Sync & Export</span>
          </button>

          {/* Create Button */}
          <button
            onClick={() => {
              setCreateModalInitial({
                datum: formatLocalYMD(selectedDate)
              });
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-md shadow-primary-600/25 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>+</span> Neuer Termin
          </button>
        </div>
      </div>

      {/* Desktop Date Navigation & Controls */}
      <div className="hidden md:flex bg-surface-card border border-border rounded-2xl p-4 shadow-xs flex-wrap items-center justify-between gap-4">
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
              <option key={t.id} value={t.id}>{t.label}</option>
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
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              showProjekte ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-surface border-border text-text-secondary'
            }`}
          >
            <IconBuilding className="w-3.5 h-3.5" />
            <span>Projekte</span>
          </button>

          <button
            onClick={() => setShowFristen(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              showFristen ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-surface border-border text-text-secondary'
            }`}
          >
            <IconMoney className="w-3.5 h-3.5" />
            <span>Fristen</span>
          </button>

          <button
            onClick={() => setHideCompleted(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              hideCompleted ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-surface border-border text-text-secondary'
            }`}
          >
            <IconCheck className="w-3.5 h-3.5" />
            <span>Erledigte ausblenden</span>
          </button>
        </div>
      </div>

      {/* Mobile Top Bar (Clean, no empty spaces, direct action) */}
      <div className="md:hidden space-y-2">
        <div className="flex items-center justify-between gap-2">
          {/* Month Navigator */}
          <div className="flex items-center gap-1 bg-surface-card border border-border rounded-xl p-1 shadow-xs">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Vorheriger Monat"
            >
              ◀
            </button>
            <span className="font-bold text-xs text-text-primary px-1 whitespace-nowrap">
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Nächster Monat"
            >
              ▶
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Heute Quick Button */}
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1.5 bg-white border border-border text-xs font-semibold text-text-primary hover:bg-neutral-50 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Heute
            </button>

            {/* Filter Toggle */}
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className={`px-2.5 py-1.5 border rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer ${
                activeFilterCount > 0
                  ? 'bg-primary-50 border-primary-300 text-primary-800'
                  : 'bg-white border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              <IconSearch className="w-3.5 h-3.5" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* + Neuer Termin */}
            <button
              type="button"
              onClick={() => {
                setCreateModalInitial({
                  datum: formatLocalYMD(selectedDate)
                });
                setIsCreateModalOpen(true);
              }}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white text-xs font-bold rounded-xl shadow-sm shadow-primary-600/20 transition-all flex items-center gap-1 cursor-pointer"
            >
              <span className="text-sm font-normal">+</span>
              <span>Termin</span>
            </button>
          </div>
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
          {/* Mobile Calendar + Day Agenda */}
          <div className="md:hidden">
            {renderMobileCalendarView()}
          </div>

          {/* Desktop Full Views */}
          <div className="hidden md:block">
            {activeViewMode === 'monat' && renderMonthView()}
            {activeViewMode === 'woche' && renderWeekView()}
            {activeViewMode === 'agenda' && renderAgendaView()}
          </div>
        </>
      )}

      {/* Mobile Filter Bottom Sheet / Modal */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" 
            onClick={() => setMobileFilterOpen(false)} 
          />
          <div className="relative w-full max-w-md bg-white rounded-t-2xl shadow-2xl border border-border z-10 flex flex-col max-h-[85vh] overflow-hidden animate-slide-in-up">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-surface rounded-t-2xl">
              <div className="flex items-center gap-2">
                <IconSettings className="w-4 h-4 text-text-primary" />
                <h3 className="font-bold text-base text-text-primary">Kalender-Filter</h3>
              </div>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary bg-neutral-100 hover:bg-neutral-200 rounded-full transition-colors cursor-pointer"
                title="Schliessen"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Filter Body */}
            <div className="p-4 space-y-4 overflow-y-auto">
              {/* Search */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Suchbegriff
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Termin, Projekt, Ort suchen..."
                  className="w-full px-3 py-2 bg-neutral-50 border border-border rounded-xl text-sm text-text-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                />
              </div>

              {/* Typ */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Kategorie / Typ
                </label>
                <select
                  value={filterTyp}
                  onChange={e => setFilterTyp(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-border rounded-xl text-sm text-text-primary"
                >
                  <option value="ALL">Alle Kategorien</option>
                  {TERMIN_TYPEN.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-border rounded-xl text-sm text-text-primary"
                >
                  <option value="ALL">Alle Status</option>
                  {TERMIN_STATUSSE.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Toggles */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                  Ebenen & Fristen
                </label>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl border border-border cursor-pointer">
                    <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                      <IconBuilding className="w-3.5 h-3.5 text-indigo-700" />
                      <span>Projekte anzeigen</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={showProjekte}
                      onChange={e => setShowProjekte(e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded border-border focus:ring-primary-500 accent-primary-600"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl border border-border cursor-pointer">
                    <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                      <IconMoney className="w-3.5 h-3.5 text-amber-700" />
                      <span>Fristen (Rechnungen & Offerten)</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={showFristen}
                      onChange={e => setShowFristen(e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded border-border focus:ring-primary-500 accent-primary-600"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl border border-border cursor-pointer">
                    <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                      <IconCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Erledigte ausblenden</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={hideCompleted}
                      onChange={e => setHideCompleted(e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded border-border focus:ring-primary-500 accent-primary-600"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border flex items-center justify-between gap-2 bg-neutral-50">
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterTyp('ALL');
                  setFilterStatus('ALL');
                  setShowProjekte(true);
                  setShowFristen(true);
                  setHideCompleted(false);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary cursor-pointer"
              >
                Zurücksetzen
              </button>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Fertig {activeFilterCount > 0 ? `(${activeFilterCount} aktiv)` : ''}
              </button>
            </div>
          </div>
        </div>
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
        tenantId={globalSettings?.tenant_id}
      />
    </div>
  );
}
