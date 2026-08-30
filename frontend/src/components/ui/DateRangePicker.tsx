'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { Calendar as CalendarComponent } from './Calendar';
import { useT } from '../../i18n';

interface DateRangePickerProps {
  value?: { startDate: string; endDate: string | null };
  onChange?: (value: { startDate: string; endDate: string | null }) => void;
  minDate?: Date;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function formatDateDisplay(dateStr: string | null, locale: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function DateRangePicker({
  value,
  onChange,
  minDate = new Date(),
  placeholder,
  className = '',
  disabled = false,
}: DateRangePickerProps) {
  const { t, lang, dir } = useT();
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState<Date | null>(value?.startDate ? new Date(value.startDate) : null);
  const [tempEnd, setTempEnd] = useState<Date | null>(value?.endDate ? new Date(value.endDate) : null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApply = () => {
    if (tempStart) {
      const startStr = tempStart.toISOString().split('T')[0];
      const endStr = tempEnd?.toISOString().split('T')[0] || null;
      onChange?.({ startDate: startStr, endDate: endStr });
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setTempStart(null);
    setTempEnd(null);
    onChange?.({ startDate: '', endDate: null });
    setIsOpen(false);
  };

  const displayValue = value?.startDate
    ? value.endDate
      ? `${formatDateDisplay(value.startDate, locale)} - ${formatDateDisplay(value.endDate, locale)}`
      : formatDateDisplay(value.startDate, locale)
    : (placeholder || t('selectDates'));
  const PrevIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const NextIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-start transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900'}
          ${value?.startDate ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
      >
        <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
        <span className="truncate">{displayValue}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 min-w-[320px] md:min-w-[600px]">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(prev => {
                const newDate = new Date(prev);
                newDate.setMonth(prev.getMonth() - 1);
                return newDate;
              })}
              aria-label={t('previousMonth')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <PrevIcon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </button>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {currentMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => setCurrentMonth(prev => {
                const newDate = new Date(prev);
                newDate.setMonth(prev.getMonth() + 1);
                return newDate;
              })}
              aria-label={t('nextMonth')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <NextIcon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </button>
          </div>

          <CalendarComponent
            mode="range"
            minDate={minDate}
            onDateRangeChange={(start, end) => {
              setTempStart(start ? new Date(start) : null);
              setTempEnd(end ? new Date(end) : null);
            }}
            initialStartDate={tempStart?.toISOString().split('T')[0]}
            initialEndDate={tempEnd?.toISOString().split('T')[0]}
          />

          <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleClear}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {t('clear')}
            </button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                {t('cancel')}
              </Button>
              <Button size="sm" onClick={handleApply} disabled={!tempStart}>
                {t('apply')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
