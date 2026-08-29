'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar } from './Calendar';
import { Button } from './Button';
import { ChevronDown, X } from 'lucide-react';

interface DatePickerProps {
  value?: string;
  onChange?: (date: string) => void;
  minDate?: Date;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function formatDateDisplay(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

const CALENDAR_WIDTH = 680;
const CALENDAR_HEIGHT_ESTIMATE = 500;
const VIEWPORT_MARGIN = 16;

export function DatePicker({
  value,
  onChange,
  minDate,
  placeholder = 'Select date',
  className = '',
  disabled = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [_tempDate, setTempDate] = useState<string | null>(value || null);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'down' | 'up' }>({
    top: 0,
    left: 0,
    placement: 'down',
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const compute = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const calW = Math.min(CALENDAR_WIDTH, vw - VIEWPORT_MARGIN * 2);

      // Horizontal: try to center on trigger, clamp to viewport
      let left = rect.left + rect.width / 2 - calW / 2;
      if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;
      if (left + calW > vw - VIEWPORT_MARGIN) {
        left = vw - VIEWPORT_MARGIN - calW;
      }

      // Vertical: open down if room, otherwise up
      const spaceBelow = vh - rect.bottom;
      const spaceAbove = rect.top;
      const placeDown = spaceBelow >= CALENDAR_HEIGHT_ESTIMATE || spaceBelow >= spaceAbove;

      let top: number;
      let placement: 'down' | 'up';
      if (placeDown) {
        top = rect.bottom + 8;
        placement = 'down';
      } else {
        top = rect.top - CALENDAR_HEIGHT_ESTIMATE - 8;
        if (top < VIEWPORT_MARGIN) top = VIEWPORT_MARGIN;
        placement = 'up';
      }

      setCoords({ top, left, placement });
    };

    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleDateSelect = (date: string) => {
    // Only update the selection state. Do NOT close the calendar.
    setTempDate(date);
    onChange?.(date);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempDate(null);
    onChange?.('');
  };

  const handleToday = () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    // Only update the selection. Do NOT close the calendar.
    setTempDate(dateStr);
    onChange?.(dateStr);
  };

  const handleDone = () => {
    // Only Done closes the calendar.
    setIsOpen(false);
  };

  const displayValue = value ? formatDateDisplay(value) : placeholder;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`w-full flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-left transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900/40'}
          ${value ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
      >
        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
        <span className="truncate">{displayValue}</span>
      </button>

      {isOpen && mounted && createPortal(
        <div
          ref={dropdownRef}
          role="dialog"
          aria-label="Date picker"
          className="fixed z-[1000]"
          style={{
            top: coords.placement === 'down' ? coords.top : 'auto',
            bottom: coords.placement === 'up' ? `calc(100vh - ${coords.top}px)` : 'auto',
            left: coords.left,
            width: `min(${CALENDAR_WIDTH}px, calc(100vw - ${VIEWPORT_MARGIN * 2}px))`,
          }}
        >
          <div className="rounded-xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <Calendar
              mode="single"
              selectedDate={value}
              onDateSelect={handleDateSelect}
              minDate={minDate}
              twoMonths={true}
            />
            <div className="flex items-center justify-between py-3 px-5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleToday}>
                  Today
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClear} aria-label="Clear date">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={handleDone}>
                Done
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
