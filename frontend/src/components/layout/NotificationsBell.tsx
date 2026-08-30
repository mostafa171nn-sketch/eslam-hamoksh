'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { api } from '../../lib/api';
import { useT } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import type { Notification } from '../../lib/types';
import { timeAgo } from '../../lib/format';

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t, lang } = useT();
  const { user, loading: authLoading } = useAuth();

  // Only poll notifications for signed-in users — visitors must never fire
  // (and then retry) authenticated requests on public pages.
  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    api
      .get<{ notifications: Notification[]; unread: number }>('/notifications', { limit: 8 })
      .then((res) => {
        if (!active) return;
        setItems(res.data.notifications);
        setUnread(res.data.unread);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [user, authLoading]);

  // Reset state when the user signs out.
  useEffect(() => {
    if (!authLoading && !user) {
      setItems([]);
      setUnread(0);
      setOpen(false);
      setLoaded(false);
    }
  }, [user, authLoading]);

  const reload = () => {
    api
      .get<{ notifications: Notification[]; unread: number }>('/notifications', { limit: 8 })
      .then((res) => {
        setItems(res.data.notifications);
        setUnread(res.data.unread);
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  };

  useEffect(() => {
    if (open && !loaded) reload();
  }, [open, loaded]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const markAll = async () => {
    await api.put('/notifications/read-all');
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  };

  const markOne = async (id: string) => {
    await api.put(`/notifications/${id}/read`);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t('notifications')}
        aria-expanded={open}
        className={`relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 ${open ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' : ''}`}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="animate-slide-in absolute end-0 top-full z-[60] mt-2 w-[min(22rem,calc(100vw-1rem))] origin-top overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-800 dark:ring-white/10">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('notifications')}</p>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300"
              >
                <CheckCheck className="h-3.5 w-3.5" /> {t('markAllRead')}
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-400">{t('noNotifications')}</p>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => markOne(n.id)}
                className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-start transition hover:bg-slate-50 dark:border-slate-700/60 dark:hover:bg-slate-700/40 ${n.read ? '' : 'bg-brand-50/50 dark:bg-brand-500/10'}`}
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-slate-200 dark:bg-slate-600' : 'bg-brand-500'}`} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{n.title}</span>
                  <span className="line-clamp-2 block text-xs text-slate-500 dark:text-slate-400">{n.message}</span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">{timeAgo(n.createdAt, lang)}</span>
                </span>
              </button>
            ))}
          </div>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-4 py-2.5 text-center text-xs font-medium text-brand-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-brand-300 dark:hover:bg-slate-700/40"
          >
            {t('viewAll')}
          </Link>
        </div>
      )}
    </div>
  );
}
