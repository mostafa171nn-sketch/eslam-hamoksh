'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../../i18n';

export interface SearchableOption {
  value: string;
  label: string;
}

interface Props {
  label?: string;
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
  emptyText,
  error,
  className = '',
  disabled,
}: Props) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [highlight, setHighlight] = useState(0);

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const openDropdown = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    setHighlight(0);
  }, [disabled]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const item = listRef.current.children[highlight] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        openDropdown();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % Math.max(filtered.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h - 1 + filtered.length) % Math.max(filtered.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlight]) {
        onChange(filtered[highlight].value);
        setOpen(false);
      }
    }
  }

  function selectOption(val: string) {
    onChange(val);
    setOpen(false);
  }

  function clearSelection(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
    onChange('');
  }

  return (
    <div className={`relative w-full ${className}`} ref={rootRef}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        onKeyDown={handleKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-start text-sm focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100 ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-500/60 dark:focus:ring-red-900/40'
            : open
              ? 'border-brand-500 ring-2 ring-brand-100 dark:border-brand-400 dark:ring-brand-900/40'
              : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100 dark:border-slate-600 dark:focus:border-brand-400 dark:focus:ring-brand-900/40'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      >
        <span className={selected ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-400'}>
          {selected ? selected.label : (placeholder || t('select'))}
        </span>
        <span className="pointer-events-none ml-auto flex items-center gap-1">
          {selected && (
            <span
              role="button"
              tabIndex={0}
              onClick={clearSelection}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') clearSelection(e);
              }}
              className="text-slate-400 hover:text-slate-600 dark:text-slate-300"
              aria-label={t('clearSelection')}
            >
              ×
            </span>
          )}
          <svg
            className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <div className="p-1.5">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>
          <ul ref={listRef} className="max-h-48 overflow-y-auto pb-1" role="listbox">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-center text-sm text-slate-400 dark:text-slate-400">{emptyText || t('noResults')}</li>
            )}
            {filtered.map((o, i) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectOption(o.value);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`cursor-pointer rounded-md px-3 py-2 text-sm ${
                  o.value === value
                    ? 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                    : i === highlight
                      ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {o.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
