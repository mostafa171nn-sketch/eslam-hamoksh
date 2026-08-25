import { useState } from 'react';
import { Clock } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';
import { useApi, errorMessage } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { Location } from '../../lib/types';
import { dayName } from '../../lib/format';
import { useT } from '../../i18n';

interface Row {
  day: string;
  startTime: string;
  endTime: string;
  locationId: string;
}

export default function TeacherAvailabilityPage() {
  const { t } = useT();
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const DAY_OPTIONS = [
    { value: '0', label: t('sunday') },
    { value: '1', label: t('monday') },
    { value: '2', label: t('tuesday') },
    { value: '3', label: t('wednesday') },
    { value: '4', label: t('thursday') },
    { value: '5', label: t('friday') },
    { value: '6', label: t('saturday') },
  ];

  const { data: locationsData } = useApi(() => api.get<Location[]>('/catalog/locations'), []);
  const locations = locationsData ?? [];

  const existing: Row[] =
    user?.role === 'TEACHER'
      ? user.teacher.availability.map((a) => ({ day: String(a.day), startTime: a.startTime, endTime: a.endTime, locationId: a.location?.id ?? '' }))
      : [];

  const [rows, setRows] = useState<Row[]>(existing);

  const setRow = (i: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };

  const save = async () => {
    for (const [i, r] of rows.entries()) {
      if (r.startTime >= r.endTime) {
        setError(`Row ${i + 1}: start time must be before end time.`);
        return;
      }
    }
    setSaving(true);
    setError('');
    try {
      await api.put('/teachers/me/availability', {
        availability: rows.map((r) => ({
          day: Number(r.day),
          startTime: r.startTime,
          endTime: r.endTime,
          ...(r.locationId ? { locationId: r.locationId } : {}),
        })),
      });
      await refreshUser();
      toast.success('Availability saved.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={t('availability')}
        subtitle={t('availabilitySub')}
        action={
          <Button size="sm" onClick={() => setRows((p) => [...p, { day: '0', startTime: '09:00', endTime: '17:00', locationId: '' }])}>
            + Add slot
          </Button>
        }
      />

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No availability set"
            description="Add weekly slots so you appear in teacher search."
            action={
              <Button size="sm" onClick={() => setRows([{ day: '0', startTime: '09:00', endTime: '17:00', locationId: '' }])}>
                + Add first slot
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                <Select options={DAY_OPTIONS} value={row.day} onChange={(e) => setRow(i, { day: e.target.value })} />
                <Input type="time" value={row.startTime} onChange={(e) => setRow(i, { startTime: e.target.value })} />
                <Input type="time" value={row.endTime} onChange={(e) => setRow(i, { endTime: e.target.value })} />
                <Select
                  options={locations.map((l) => ({ value: l.id, label: l.name }))}
                  value={row.locationId}
                  onChange={(e) => setRow(i, { locationId: e.target.value })}
                  placeholder="Any branch"
                />
                <button
                  onClick={() => setRows((p) => p.filter((_, j) => j !== i))}
                  className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-xs text-slate-400">
                {rows.map((r) => `${dayName(Number(r.day))} ${r.startTime}–${r.endTime}`).join(' · ')}
              </p>
              <Button onClick={save} loading={saving}>
                Save availability
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
