'use client';

import { useState } from 'react';
import {
  Bell,
  Globe,
  Calendar,
  CreditCard,
  Save,
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../i18n';

export default function CenterSettingsPage() {
  const { t } = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
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
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Save to localStorage for now
      localStorage.setItem('centerSettings', JSON.stringify(form));
      toast.success(t('settingsSaved'));
    } catch (err) {
      toast.error(t('error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('settings')} subtitle={t('settingsSub')} />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Notifications */}
        <Card title={
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('notifications')}
          </div>
        }>
          <div className="space-y-4">
            {[
              { key: 'emailNotifications', label: t('emailNotifications'), desc: t('emailNotificationsDesc') },
              { key: 'smsNotifications', label: t('smsNotifications'), desc: t('smsNotificationsDesc') },
              { key: 'pushNotifications', label: t('pushNotifications'), desc: t('pushNotificationsDesc') },
              { key: 'whatsappNotifications', label: t('whatsappNotifications'), desc: t('whatsappNotificationsDesc') },
            ].map(item => (
              <label key={item.key} className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{item.label}</p>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={(form as any)[item.key]}
                  onChange={(e) => setForm(f => ({ ...f, [item.key]: e.target.checked }))}
                  className="h-5 w-5 rounded"
                />
              </label>
            ))}
          </div>
        </Card>

        {/* Localization */}
        <Card title={
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('localization')}
          </div>
        }>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('language')}</label>
              <select className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800" value={form.language} onChange={(e) => setForm(f => ({ ...f, language: e.target.value }))}>
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('timezone')}</label>
              <select className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800" value={form.timezone} onChange={(e) => setForm(f => ({ ...f, timezone: e.target.value }))}>
                <option value="Africa/Cairo">Cairo (UTC+2)</option>
                <option value="Asia/Riyadh">Riyadh (UTC+3)</option>
                <option value="Asia/Dubai">Dubai (UTC+4)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('dateFormat')}</label>
              <select className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800" value={form.dateFormat} onChange={(e) => setForm(f => ({ ...f, dateFormat: e.target.value }))}>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('currency')}</label>
              <select className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800" value={form.currency} onChange={(e) => setForm(f => ({ ...f, currency: e.target.value }))}>
                <option value="EGP">EGP</option>
                <option value="USD">USD</option>
                <option value="SAR">SAR</option>
                <option value="AED">AED</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Attendance */}
        <Card title={
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('attendanceSettings')}
          </div>
        }>
          <div className="space-y-4">
            <label className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{t('autoAttendance')}</p>
                <p className="text-sm text-slate-500">{t('autoAttendanceDesc')}</p>
              </div>
              <input
                type="checkbox"
                checked={form.autoAttendance}
                onChange={(e) => setForm(f => ({ ...f, autoAttendance: e.target.checked }))}
                className="h-5 w-5 rounded"
              />
            </label>
            <Input
              label={t('lateThreshold')}
              type="number"
              value={form.lateThreshold}
              onChange={(e) => setForm(f => ({ ...f, lateThreshold: parseInt(e.target.value) || 15 }))}
            />
          </div>
        </Card>

        {/* Payments */}
        <Card title={
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t('paymentSettings')}
          </div>
        }>
          <div className="space-y-4">
            <label className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{t('paymentReminder')}</p>
                <p className="text-sm text-slate-500">{t('paymentReminderDesc')}</p>
              </div>
              <input
                type="checkbox"
                checked={form.paymentReminder}
                onChange={(e) => setForm(f => ({ ...f, paymentReminder: e.target.checked }))}
                className="h-5 w-5 rounded"
              />
            </label>
            <Input
              label={t('paymentReminderDays')}
              type="number"
              value={form.paymentReminderDays}
              onChange={(e) => setForm(f => ({ ...f, paymentReminderDays: parseInt(e.target.value) || 3 }))}
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button size="lg" type="submit" loading={saving}>
            <Save className="h-4 w-4" />
            {t('saveAllSettings')}
          </Button>
        </div>
      </form>
    </div>
  );
}
