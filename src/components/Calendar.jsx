import React, { useState } from 'react';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function Calendar({ events = [], holidays = [], onDayClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => {
    let day = new Date(y, m, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  const eventColorMap = {
    project: 'bg-emerald-100 text-emerald-800',
    rechnung: 'bg-red-100 text-red-800',
    offerte: 'bg-blue-100 text-blue-800',
    termin: 'bg-purple-100 text-purple-800',
  };

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2 min-h-[80px] bg-gray-50/30 rounded-lg"></div>);
    }
    
    const today = new Date();
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayEvents = events.filter(e => e.date === dateStr);
      const isHoliday = holidays.find(h => h.date === dateStr);
      
      const isToday = i === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const dateObj = new Date(year, month, i);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

      days.push(
        <div 
          key={`day-${i}`} 
          onClick={() => onDayClick && onDayClick(dateStr)}
          className={`
            p-2 min-h-[80px] rounded-lg border border-transparent 
            hover:border-primary-200 cursor-pointer transition-colors relative
            ${isToday ? 'ring-2 ring-primary-500 bg-primary-50/10' : ''}
            ${isHoliday ? 'bg-red-50' : (isWeekend ? 'bg-gray-50' : 'bg-white')}
          `}
          title={isHoliday ? isHoliday.localName || isHoliday.name : ''}
        >
          <div className={`text-sm font-medium mb-1 ${isWeekend || isHoliday ? 'text-gray-500' : 'text-text-primary'}`}>
            {i}
            {isHoliday && <span className="ml-1 text-[9px] text-red-400" title={isHoliday.localName || isHoliday.name}>🔴</span>}
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 3).map((ev, idx) => (
              <div 
                key={idx} 
                className={`text-[10px] px-1.5 py-0.5 rounded truncate ${eventColorMap[ev.type] || 'bg-gray-100 text-gray-700'}`}
                title={ev.title}
              >
                {ev.title}
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-[10px] text-gray-400 pl-1">
                +{dayEvents.length - 3} weitere
              </div>
            )}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="bg-white border border-gray-200/60 rounded-2xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-text-primary">
          {monthNames[month]} {year}
        </h3>
        <div className="flex gap-2">
          <button 
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button 
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-2 mb-2">
        {WEEKDAYS.map(day => (
          <div key={day} className="text-center text-xs font-semibold text-text-secondary py-1">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {renderDays()}
      </div>
    </div>
  );
}
