'use client';

import { useState } from 'react';
import { Bus, Plus, Users, MapPin, Clock, Phone, Trash2, UserRound, UserPlus, UserMinus } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { StatCard } from '../../../components/ui/StatCard';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { Progress } from '../../../components/ui/Progress';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Tabs } from '../../../components/ui/Tabs';
import { useApi, errorMessage } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT, type DictKey } from '../../../i18n';

interface TransportSummary {
  routes: number;
  subscribed: number;
  availableSeats: number;
  totalSeats: number;
}

interface TransportRoute {
  id: string;
  name: string;
  areas: string | null;
  driverName: string | null;
  driverPhone: string | null;
  vehicle: string | null;
  capacity: number;
  occupied: number;
  pickupTime: string | null;
  dropoffTime: string | null;
  status: string;
  students: { id: string; name: string }[];
}

interface TransportStudent {
  id: string;
  studentId: string;
  name: string;
  phone: string | null;
  route: string;
  joinedAt: string;
}

interface DriverRow {
  id: string;
  name: string;
  driverName: string | null;
  driverPhone: string | null;
  vehicle: string | null;
  status: string;
}

interface FormData {
  students: { id: string; name: string }[];
}

export function CenterTransportPage() {
  const { t, lang } = useT();
  const [tab, setTab] = useState('routes');

  return (
    <div className="space-y-6">
      <PageHeader title={t('moduleTransport')} subtitle={t('transportSub')} />
      <Tabs
        tabs={[
          { key: 'routes', label: t('routesTab') },
          { key: 'students', label: t('studentsTab') },
          { key: 'drivers', label: t('driversTab') },
        ]}
        activeKey={tab}
        onChange={setTab}
      >
        <div className="pt-1">
          {tab === 'routes' && <RoutesTab t={t} />}
          {tab === 'students' && <StudentsTab t={t} lang={lang} />}
          {tab === 'drivers' && <DriversTab t={t} />}
        </div>
      </Tabs>
    </div>
  );
}

function RoutesTab({ t }: { t: (k: DictKey) => string }) {
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [subscribe, setSubscribe] = useState<TransportRoute | null>(null);
  const { data: summary, reload: reloadSummary } = useApi<TransportSummary>(() => api.get<TransportSummary>('/center/transport/summary'), []);
  const { data: routes, loading, error, reload } = useApi<TransportRoute[]>(() => api.get<TransportRoute[]>('/center/transport'), []);
  const { data: formData } = useApi<FormData>(() => api.get<FormData>('/center/groups/form-data'), []);

  const deactivate = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await api.delete(`/center/transport/${id}`);
      toast.success(t('routeDeletedToast'));
      reload();
      reloadSummary();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('transportRoutes')} value={summary?.routes ?? '—'} icon={Bus} tone="teal" />
        <StatCard label={t('transportSubscribed')} value={summary?.subscribed ?? '—'} icon={Users} tone="violet" />
        <StatCard label={t('transportTotalSeats')} value={summary?.totalSeats ?? '—'} icon={Bus} tone="brand" />
        <StatCard label={t('transportAvailableSeats')} value={summary?.availableSeats ?? '—'} icon={UserPlus} tone="emerald" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" />
          {t('addRoute')}
        </Button>
      </div>

      {loading && <PencilLoader label={t('loading')} />}
      {error && <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>}

      {!loading && routes && routes.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {routes.map((r) => {
            const pct = r.capacity > 0 ? Math.min(Math.round((r.occupied / r.capacity) * 100), 100) : 0;
            return (
              <Card key={r.id} bodyClassName="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-600/10 dark:bg-teal-500/15 dark:text-teal-300">
                      <Bus className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{r.name}</h3>
                      <p className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5" />
                        {r.areas || '—'}
                      </p>
                    </div>
                  </div>
                  <Badge tone={r.status === 'ACTIVE' ? 'green' : 'slate'}>{r.status === 'ACTIVE' ? t('active') : r.status}</Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-3">
                  <span className="flex items-center gap-1.5"><UserRound className="h-4 w-4 text-slate-400" />{r.driverName || '—'}</span>
                  <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-slate-400" />{r.driverPhone || '—'}</span>
                  <span className="flex items-center gap-1.5"><Bus className="h-4 w-4 text-slate-400" />{r.vehicle || '—'}</span>
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-slate-400" />{t('routePickup')}: {r.pickupTime ?? '—'}</span>
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-slate-400" />{t('routeDropoff')}: {r.dropoffTime ?? '—'}</span>
                  <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-slate-400" />{r.occupied} / {r.capacity}</span>
                </div>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-500">{t('routeOccupied')}</span>
                    <span className={pct >= 90 ? 'text-red-600' : 'text-slate-700 dark:text-slate-200'}>{pct}%</span>
                  </div>
                  <Progress value={pct} variant={pct >= 90 ? 'red' : 'green'} size="sm" />
                </div>

                {r.students.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium text-slate-500">{t('routeStudents')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.students.map((s) => (
                        <span key={s.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                  <Button size="sm" variant="outline" onClick={() => setSubscribe(r)}>
                    <UserPlus className="h-4 w-4" />
                    {t('subscribeStudent')}
                  </Button>
                  <Button size="sm" variant="ghost" className="ms-auto" onClick={() => deactivate(r.id)} aria-label={t('routeStatus')}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && routes?.length === 0 && <EmptyState icon={Bus} title={t('noRoutes')} />}

      {showAdd && <AddRouteModal t={t} onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); reload(); reloadSummary(); }} />}
      {subscribe && formData && (
        <SubscribeModal t={t} route={subscribe} students={formData.students} onClose={() => setSubscribe(null)} onDone={() => { setSubscribe(null); reload(); reloadSummary(); }} />
      )}
    </div>
  );
}

function AddRouteModal({ t, onClose, onDone }: { t: (k: DictKey) => string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', areas: '', driverName: '', driverPhone: '', vehicle: '', capacity: '', pickupTime: '', dropoffTime: '' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error(t('requiredFields')); return; }
    setSaving(true);
    try {
      await api.post('/center/transport', form);
      toast.success(t('routeCreatedToast'));
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={t('addRoute')} size="md"
      footer={<><Button variant="outline" onClick={onClose}>{t('cancel')}</Button><Button onClick={submit} loading={saving}>{t('save')}</Button></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label={t('routeName')} required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label={t('area')} value={form.areas} onChange={(e) => setForm((f) => ({ ...f, areas: e.target.value }))} />
          <Input label={t('routeDriver')} value={form.driverName} onChange={(e) => setForm((f) => ({ ...f, driverName: e.target.value }))} />
          <Input label={t('routeDriverPhone')} value={form.driverPhone} onChange={(e) => setForm((f) => ({ ...f, driverPhone: e.target.value }))} />
          <Input label={t('vehicleType')} value={form.vehicle} onChange={(e) => setForm((f) => ({ ...f, vehicle: e.target.value }))} />
          <Input label={t('routeCapacity')} type="number" min="1" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
          <Input label={t('routePickup')} type="time" value={form.pickupTime} onChange={(e) => setForm((f) => ({ ...f, pickupTime: e.target.value }))} />
          <Input label={t('routeDropoff')} type="time" value={form.dropoffTime} onChange={(e) => setForm((f) => ({ ...f, dropoffTime: e.target.value }))} />
        </div>
      </form>
    </Modal>
  );
}

function SubscribeModal({ t, route, students, onClose, onDone }: { t: (k: DictKey) => string; route: TransportRoute; students: { id: string; name: string }[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [studentId, setStudentId] = useState('');
  const available = students.filter((s) => !route.students.some((x) => x.id === s.id));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) { toast.error(t('requiredFields')); return; }
    setSaving(true);
    try {
      await api.post('/center/transport/subscribe', { routeId: route.id, studentId });
      toast.success(t('studentSubscribedToast'));
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={t('subscribeTitle') + ': ' + route.name} size="sm"
      footer={<><Button variant="outline" onClick={onClose}>{t('cancel')}</Button><Button onClick={submit} loading={saving} disabled={available.length === 0}>{t('save')}</Button></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Select label={t('studentName')} required value={studentId} onChange={(e) => setStudentId(e.target.value)} options={available.map((s) => ({ value: s.id, label: s.name }))} placeholder={t('selectBranch')} />
        {available.length === 0 && <p className="text-xs text-red-500">{t('noAvailableStudents')}</p>}
      </form>
    </Modal>
  );
}

function StudentsTab({ t, lang }: { t: (k: DictKey) => string; lang: string }) {
  const toast = useToast();
  const { data: students, loading, error, reload } = useApi<TransportStudent[]>(() => api.get<TransportStudent[]>('/center/transport/students'), []);

  const unsubscribe = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await api.delete(`/center/transport/subscriptions/${id}`);
      toast.success(t('studentUnsubscribedToast'));
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (loading) return <PencilLoader label={t('loading')} />;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>;

  return (
    <Card bodyClassName="p-0">
      {students && students.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-start text-xs text-slate-500 dark:border-slate-700">
                <th className="px-5 py-2.5 text-start font-medium">{t('studentName')}</th>
                <th className="px-5 py-2.5 text-start font-medium">{t('phone')}</th>
                <th className="px-5 py-2.5 text-start font-medium">{t('routeName')}</th>
                <th className="px-5 py-2.5 text-start font-medium">{t('joinedAt')}</th>
                <th className="px-5 py-2.5 text-end font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{s.name}</td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{s.phone || '—'}</td>
                  <td className="px-5 py-3">
                    <Badge tone="blue" className="dark:bg-teal-500/10">{s.route}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                    {new Date(s.joinedAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="px-5 py-3 text-end">
                    <Button variant="ghost" size="sm" onClick={() => unsubscribe(s.id)} aria-label={t('unsubscribeStudent')}>
                      <UserMinus className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={Users} title={t('noSubscribers')} />
      )}
    </Card>
  );
}

function DriversTab({ t }: { t: (k: DictKey) => string }) {
  const { data: drivers, loading, error } = useApi<DriverRow[]>(() => api.get<DriverRow[]>('/center/transport/drivers'), []);

  if (loading) return <PencilLoader label={t('loading')} />;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>;

  if (!drivers || drivers.length === 0) return <EmptyState icon={UserRound} title={t('noDrivers')} />;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {drivers.map((d) => (
        <Card key={d.id} bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              <UserRound className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{d.driverName || t('routeName') + ': ' + d.name}</p>
              <p className="text-xs text-slate-500">{d.driverPhone || d.name}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span><Bus className="me-1 inline h-3.5 w-3.5" />{d.vehicle || '—'}</span>
            <Badge tone={d.status === 'ACTIVE' ? 'green' : 'slate'}>{d.status === 'ACTIVE' ? t('active') : d.status}</Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default CenterTransportPage;