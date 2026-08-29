'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarProps {
  onDateRangeChange?: (startDate: string, endDate: string | null) => void;
  onDateSelect?: (date: string) => void;
  initialStartDate?: string;
  initialEndDate?: string;
  selectedDate?: string;
  minDate?: Date;
  maxDate?: Date;
  showToday?: boolean;
  className?: string;
  mode?: 'range' | 'single';
  /** Show two months side-by-side (desktop). Default: true. */
  twoMonths?: boolean;
  /** When true, clicks auto-confirm and call onDateSelect. */
  autoConfirm?: boolean;
}

function getDaysInMonth(year: number, month: number): Date[] {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(date: Date): boolean {
  const today = new Date();
  return isSameDay(date, today);
}

function isPastDate(date: Date, minDate?: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (minDate) {
    const min = new Date(minDate);
    min.setHours(0, 0, 0, 0);
    if (date < min) return true;
  }
  return date < today;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMonthName(month: number, lang: string = 'en'): string {
  const date = new Date(2024, month, 1);
  return date.toLocaleString(lang, { month: 'long' });
}

export function Calendar({
  onDateRangeChange,
  onDateSelect,
  initialStartDate,
  initialEndDate,
  selectedDate,
  minDate,
  maxDate: _maxDate,
  showToday = true,
  className = '',
  mode = 'range',
  twoMonths = true,
  autoConfirm = false,
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedStart, setSelectedStart] = useState<Date | null>(
    initialStartDate ? new Date(initialStartDate) : null
  );
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(
    initialEndDate ? new Date(initialEndDate) : null
  );
  const [singleSelected, setSingleSelected] = useState<Date | null>(
    mode === 'single'
      ? selectedDate
        ? new Date(selectedDate)
        : initialStartDate
          ? new Date(initialStartDate)
          : null
      : null
  );
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const showTwo = twoMonths && !isMobile;

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDateClick = (date: Date) => {
    if (isPastDate(date, minDate)) return;

    if (mode === 'single') {
      setSingleSelected(date);
      if (autoConfirm || onDateSelect) {
        onDateSelect?.(formatDate(date));
      }
      return;
    }

    if (!selectedStart || (selectedStart && selectedEnd)) {
      setSelectedStart(date);
      setSelectedEnd(null);
    } else if (date < selectedStart) {
      setSelectedEnd(selectedStart);
      setSelectedStart(date);
    } else {
      setSelectedEnd(date);
    }
  };

  const handleDateHover = (date: Date) => {
    if (mode === 'single') return;
    if (!selectedStart || selectedEnd || isPastDate(date, minDate)) return;
    setHoveredDate(date);
  };

  const isDateSelected = (date: Date): boolean => {
    if (isPastDate(date, minDate)) return false;
    if (mode === 'single') {
      if (singleSelected) return isSameDay(date, singleSelected);
      if (selectedDate) return isSameDay(date, new Date(selectedDate));
      return false;
    }
    if (!selectedStart) return false;
    if (selectedEnd) {
      return date >= selectedStart && date <= selectedEnd;
    }
    if (hoveredDate) {
      return date >= selectedStart && date <= hoveredDate;
    }
    return false;
  };

  const isDateInRange = (date: Date): boolean => {
    if (mode === 'single') return false;
    if (!selectedStart || selectedEnd) return false;
    if (hoveredDate) {
      const start = selectedStart < hoveredDate ? selectedStart : hoveredDate;
      const end = selectedStart > hoveredDate ? selectedStart : hoveredDate;
      return date > start && date < end;
    }
    return false;
  };

  const isDateStart = (date: Date): boolean => {
    if (mode === 'single') return false;
    return selectedStart ? isSameDay(date, selectedStart) : false;
  };

  const isDateEnd = (date: Date): boolean => {
    if (mode === 'single') return false;
    return selectedEnd ? isSameDay(date, selectedEnd) : false;
  };

  const isDateToday = (date: Date): boolean => {
    return isToday(date);
  };

  const renderMonth = (_monthDate: Date, year: number, month: number) => {
    const days = getDaysInMonth(year, month);
    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay();

    return (
      <div className="flex-1 min-w-0 px-2 sm:px-4">
        <div className="flex items-center justify-center mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
            {getMonthName(month)} {year}
          </h3>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 text-center h-9 flex items-center justify-center">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {Array.from({ length: startDayOfWeek }).map((_, index) => (
            <div key={`empty-${index}`} className="h-10 sm:h-11" />
          ))}
          {days.map(day => {
            const past = isPastDate(day, minDate);
            const selected = isDateSelected(day);
            const start = isDateStart(day);
            const end = isDateEnd(day);
            const isTodayDate = isDateToday(day);
            const inRange = isDateInRange(day);

            const baseClasses =
              'h-10 sm:h-11 w-full text-sm sm:text-base rounded-lg transition-all duration-150 flex items-center justify-center font-medium';

            const stateClasses = past
              ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
              : selected || inRange
                ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200 font-semibold'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700';

            const startClass = start && mode === 'range' ? 'rounded-r-none' : '';
            const endClass = end && mode === 'range' ? 'rounded-l-none' : '';
            const todayClass = isTodayDate && !selected ? 'ring-2 ring-brand-500' : '';
            const singleSelectedClass = selected && mode === 'single' ? 'bg-brand-600 text-white hover:bg-brand-700 font-semibold' : '';
            const rangeSelectedClass = selected && mode === 'range' ? 'bg-brand-600 text-white font-semibold' : '';

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => handleDateClick(day)}
                onMouseEnter={() => handleDateHover(day)}
                disabled={past}
                aria-label={day.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                aria-pressed={selected}
                aria-disabled={past}
                className={`${baseClasses} ${stateClasses} ${startClass} ${endClass} ${todayClass} ${singleSelectedClass} ${rangeSelectedClass}`}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const handleApplyRange = () => {
    if (selectedStart) {
      const end = selectedEnd || hoveredDate;
      if (end) {
        onDateRangeChange?.(
          formatDate(selectedStart),
          formatDate(end)
        );
      }
    }
  };

  return (
    <div className={`p-4 sm:p-5 ${className}`}
      onMouseLeave={() => setHoveredDate(null)}
    >
      <div className="flex items-center justify-between mb-5 sm:mb-6 px-1">
        <button
          type="button"
          onClick={() => navigateMonth('prev')}
          aria-label="Previous month"
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900/40"
        >
          <ChevronLeft className="h-5 w-5 text-slate-700 dark:text-slate-200" />
        </button>
        <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
          {showTwo ? (
            <>
              {getMonthName(currentDate.getMonth(), 'en')} {currentDate.getFullYear()}
              {' – '}
              {getMonthName((currentDate.getMonth() + 1) % 12, 'en')}{' '}
              {currentDate.getMonth() + 1 >= 12 ? currentDate.getFullYear() + 1 : currentDate.getFullYear()}
            </>
          ) : (
            <>
              {getMonthName(currentDate.getMonth(), 'en')} {currentDate.getFullYear()}
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigateMonth('next')}
          aria-label="Next month"
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900/40"
        >
          <ChevronRight className="h-5 w-5 text-slate-700 dark:text-slate-200" />
        </button>
      </div>

      <div className={showTwo ? 'flex divide-x divide-slate-200 dark:divide-slate-700' : ''}>
        {renderMonth(currentDate, currentDate.getFullYear(), currentDate.getMonth())}
        {showTwo && renderMonth(
          new Date(currentDate.getFullYear(), currentDate.getMonth() + 1),
          currentDate.getMonth() + 1 >= 12 ? currentDate.getFullYear() + 1 : currentDate.getFullYear(),
          (currentDate.getMonth() + 1) % 12
        )}
      </div>

      {mode === 'range' && selectedStart && (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleApplyRange}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900/40"
          >
            Apply Date Range
          </button>
        </div>
      )}

      {showToday && isToday(new Date()) && (
        <div className="mt-4 text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-medium dark:bg-brand-900/30 dark:text-brand-300">
            Today
          </span>
        </div>
      )}
    </div>
  );
}
