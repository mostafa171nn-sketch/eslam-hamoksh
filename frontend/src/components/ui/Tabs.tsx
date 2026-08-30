'use client';

import { useState, type ReactNode } from 'react';

interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeKey?: string;
  onChange?: (key: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ tabs, activeKey: controlledKey, onChange, children, className = '' }: TabsProps) {
  const [internalKey, setInternalKey] = useState(tabs[0]?.key ?? '');
  const activeKey = controlledKey ?? internalKey;

  const handleChange = (key: string) => {
    if (!controlledKey) setInternalKey(key);
    onChange?.(key);
  };

  return (
    <div className={className}>
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleChange(tab.key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
              activeKey === tab.key
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ms-1.5 inline-flex items-center justify-center rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {tab.count}
              </span>
            )}
            {activeKey === tab.key && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-600 dark:bg-brand-400" />
            )}
          </button>
        ))}
      </div>
      <div className="pt-4">{children}</div>
    </div>
  );
}
