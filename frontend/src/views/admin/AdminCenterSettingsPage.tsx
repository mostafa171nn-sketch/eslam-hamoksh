'use client';

import { useEffect, useState } from 'react';
import { MapPin, Save } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert, InlineError } from '../../components/ui/ErrorAlert';
import { api, type Center } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n';
import { errorMessage } from '../../hooks/useApi';
import type { CenterSettings } from '../../lib/types';
import { CenterPackagesPanel } from './CenterPackagesPanel';

export default function AdminCenterSettingsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const { t } = useT();
  const isSuper = user?.role === 'SUPER_ADMIN';

  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState('');
  const [, setData] = useState<CenterSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Partial<CenterSettings>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [locating, setLocating] = useState(false);

  // Super admin is global and has no personal center, so they must first pick
  // the center whose settings they want to manage.
  useEffect(() => {
    if (!isSuper) return;
    api
      .get<{ items: Center[] }>('/centers/admin/all', { limit: 1000 })
      .then((res) => setCenters(res.data.items ?? []))
      .catch(() => setCenters([]));
  }, [isSuper]);

  const loadSettings = async (centerId?: string) => {
    setLoading(true);
    setError('');
    try {
      const res = centerId
        ? await api.get<CenterSettings>('/attendance/settings', { centerId })
        : await api.get<CenterSettings>('/attendance/settings');
      setData(res.data);
      setForm(res.data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuper) {
      if (selectedCenterId) loadSettings(selectedCenterId);
      else {
        setLoading(false);
        setData(null);
      }
    } else {
      loadSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuper, selectedCenterId]);

  const set = (key: keyof CenterSettings, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  const useLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set('latitude', pos.coords.latitude);
        set('longitude', pos.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      const url = selectedCenterId
        ? `/attendance/settings?centerId=${encodeURIComponent(selectedCenterId)}`
        : '/attendance/settings';
      await api.put(url, form);
      toast.success(t('centerSettingsSavedToast'));
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PencilLoader label={t('loading')} />;
  if (error) return <Alert message={error} />;

  if (isSuper && !selectedCenterId) {
    return (
      <div>
        <PageHeader
          title={t('centerSettings')}
          subtitle={t('selectCenterToManage')}
        />
        <Card title={t('centerLabel')}>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[260px] flex-1">
              <Select
                label={t('centerLabel')}
                value={selectedCenterId}
                onChange={(e) => setSelectedCenterId(e.target.value)}
                options={[
                  { value: '', label: t('catalogSelectCenter') },
                  ...centers.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>
            {centers.length === 0 && (
              <p className="text-sm text-slate-400">{t('noCentersAvailableYet')}</p>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t('centerSettings')}
        subtitle={
          isSuper && selectedCenterId
            ? t('managingSelectedCenter')
            : t('locationRulesSub')
        }
      />

      {isSuper && (
        <Card className="mb-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[260px] flex-1">
              <Select
                label={t('centerLabel')}
                value={selectedCenterId}
                onChange={(e) => setSelectedCenterId(e.target.value)}
                options={[
                  { value: '', label: t('catalogSelectCenter') },
                  ...centers.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>
          </div>
        </Card>
      )}

      <Card title={t('locationRulesCard')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t('centerName')} value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} />
          <div className="flex items-end">
            <Button variant="outline" onClick={useLocation} loading={locating}>
              <MapPin className="h-4 w-4" />
              {t('useMyLocation')}
            </Button>
          </div>
          <Input
            label={t('latitude')}
            type="number"
            step="any"
            value={form.latitude ?? ''}
            onChange={(e) => set('latitude', e.target.value === '' ? null : Number(e.target.value))}
          />
          <Input
            label={t('longitude')}
            type="number"
            step="any"
            value={form.longitude ?? ''}
            onChange={(e) => set('longitude', e.target.value === '' ? null : Number(e.target.value))}
          />
          <Input
            label={t('radiusMeters')}
            type="number"
            value={form.radiusMeters ?? 0}
            onChange={(e) => set('radiusMeters', Number(e.target.value))}
          />
          <Input
            label={t('graceMinutesLate')}
            type="number"
            value={form.attendanceGraceMinutes ?? 0}
            onChange={(e) => set('attendanceGraceMinutes', Number(e.target.value))}
          />
          <Input label={t('timezone')} value={form.timezone ?? ''} onChange={(e) => set('timezone', e.target.value)} />
          <Input label={t('currency')} value={form.currency ?? ''} onChange={(e) => set('currency', e.target.value)} />
        </div>
      </Card>

      {err && (
        <div className="mt-4">
          <InlineError message={err} />
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button onClick={save} loading={saving}>
          <Save className="h-4 w-4" />
          {t('saveChangesBtn')}
        </Button>
      </div>

      {/* Packages: available CENTER packages + the center's current package. */}
      <CenterPackagesPanel />
    </div>
  );
}
