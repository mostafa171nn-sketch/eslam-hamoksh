'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  Globe,
  Calendar,
  CreditCard,
  Save,
} from 'lucide-react';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../i18n';

interface CenterSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  whatsappNotifications: boolean;
  language: string;
  timezone: string;
  dateFormat: string;
  currency: string;
  autoAttendance: boolean;
  lateThreshold: number;
  paymentReminder: boolean;
  paymentReminderDays: number;
  radiusMeters: number;
  attendanceGraceMinutes: number;
}

export default function CenterSettingsPage() {
  const { t } = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<CenterSettings>({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    whatsappNotifications: true,
    language: 'ar',
    timezone: 'Africa/Cairo',
    dateFormat: 'DD/MM/YYYY',
    currency: 'EGP',
    autoAttendance: false,
    lateThreshold: 15,
    paymentReminder: true,
    paymentReminderDays: 3,
    radiusMeters: 100,
    attendanceGraceMinutes: 10,
  });

  useEffect(() => {
    api.get<Partial<CenterSettings>>('/center/account/settings')
      .then((res) => {
        if (res.data) setForm((prev) => ({ ...prev, ...res.data }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/center/account/settings', {
        timezone: form.timezone,
        currency: form.currency,
        radiusMeters: form.radiusMeters,
        attendanceGraceMinutes: form.attendanceGraceMinutes,
        name: form.language,
      });
      toast.success(t('settingsSaved'));
    } catch (err) {
      toast.error(t('error'));
    } finally {
      setSaving(false);
    }
  };

  const toggleItems = [
    { key: 'emailNotifications', label: t('emailNotifications'), desc: t('emailNotificationsDesc') },
    { key: 'smsNotifications', label: t('smsNotifications'), desc: t('smsNotificationsDesc') },
    { key: 'pushNotifications', label: t('pushNotifications'), desc: t('pushNotificationsDesc') },
    { key: 'whatsappNotifications', label: t('whatsappNotifications'), desc: t('whatsappNotificationsDesc') },
  ];

  return (
    <div className="space-y-6">
      <CenterPageHeader
        eyebrow={t('centerDashboard')}
        title={t('settings')}
        description={t('settingsSub')}
      />

      {loading ? (
        <div className="p-8"><PencilLoader label={t('loading')} /></div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="mj-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-[color:var(--mj-accent)]" />
              <h2 className="mj-title">{t('notifications')}</h2>
            </div>
            <div className="space-y-3">
              {toggleItems.map(item => (
                <label key={item.key} className="flex items-center justify-between gap-4 rounded-lg border border-[color:var(--mj-border)] p-4">
                  <div>
                    <p className="font-semibold text-[color:var(--mj-ink-strong)]">{item.label}</p>
                    <p className="text-sm text-[color:var(--mj-muted)]">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={(form as any)[item.key]}
                    onChange={(e) => setForm(f => ({ ...f, [item.key]: e.target.checked }))}
                    className="h-5 w-5 accent-[color:var(--mj-accent)]"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="mj-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-[color:var(--mj-accent)]" />
              <h2 className="mj-title">{t('localization')}</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="mj-field">
                <label className="mj-label">{t('language')}</label>
                <select className="mj-select" value={form.language} onChange={(e) => setForm(f => ({ ...f, language: e.target.value }))}>
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div className="mj-field">
                <label className="mj-label">{t('timezone')}</label>
                <select className="mj-select" value={form.timezone} onChange={(e) => setForm(f => ({ ...f, timezone: e.target.value }))}>
                  <option value="Africa/Cairo">Cairo (UTC+2)</option>
                  <option value="Asia/Riyadh">Riyadh (UTC+3)</option>
                  <option value="Asia/Dubai">Dubai (UTC+4)</option>
                </select>
              </div>
              <div className="mj-field">
                <label className="mj-label">{t('dateFormat')}</label>
                <select className="mj-select" value={form.dateFormat} onChange={(e) => setForm(f => ({ ...f, dateFormat: e.target.value }))}>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <div className="mj-field">
                <label className="mj-label">{t('currency')}</label>
                <select className="mj-select" value={form.currency} onChange={(e) => setForm(f => ({ ...f, currency: e.target.value }))}>
                  <option value="EGP">EGP</option>
                  <option value="USD">USD</option>
                  <option value="SAR">SAR</option>
                  <option value="AED">AED</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mj-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[color:var(--mj-accent)]" />
              <h2 className="mj-title">{t('attendanceSettings')}</h2>
            </div>
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-4 rounded-lg border border-[color:var(--mj-border)] p-4">
                <div>
                  <p className="font-semibold text-[color:var(--mj-ink-strong)]">{t('autoAttendance')}</p>
                  <p className="text-sm text-[color:var(--mj-muted)]">{t('autoAttendanceDesc')}</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.autoAttendance}
                  onChange={(e) => setForm(f => ({ ...f, autoAttendance: e.target.checked }))}
                  className="h-5 w-5 accent-[color:var(--mj-accent)]"
                />
              </label>
              <div className="mj-field">
                <label className="mj-label">{t('lateThreshold')}</label>
                <input
                  className="mj-input"
                  type="number"
                  value={form.lateThreshold}
                  onChange={(e) => setForm(f => ({ ...f, lateThreshold: parseInt(e.target.value) || 15 }))}
                />
              </div>
            </div>
          </div>

          <div className="mj-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[color:var(--mj-accent)]" />
              <h2 className="mj-title">{t('paymentSettings')}</h2>
            </div>
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-4 rounded-lg border border-[color:var(--mj-border)] p-4">
                <div>
                  <p className="font-semibold text-[color:var(--mj-ink-strong)]">{t('paymentReminder')}</p>
                  <p className="text-sm text-[color:var(--mj-muted)]">{t('paymentReminderDesc')}</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.paymentReminder}
                  onChange={(e) => setForm(f => ({ ...f, paymentReminder: e.target.checked }))}
                  className="h-5 w-5 accent-[color:var(--mj-accent)]"
                />
              </label>
              <div className="mj-field">
                <label className="mj-label">{t('paymentReminderDays')}</label>
                <input
                  className="mj-input"
                  type="number"
                  value={form.paymentReminderDays}
                  onChange={(e) => setForm(f => ({ ...f, paymentReminderDays: parseInt(e.target.value) || 3 }))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="mj-btn mj-btn--primary" disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? t('loading') : t('saveAllSettings')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
