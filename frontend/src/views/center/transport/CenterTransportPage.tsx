'use client';

import { useState } from 'react';
import { Bus, Plus, Users, MapPin, Clock, Phone, Trash2, UserRound, UserPlus, UserMinus } from 'lucide-react';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterStatCard } from '../ui/CenterStatCard';
import { CenterPill } from '../ui/CenterPill';
import { CenterModal } from '../ui/CenterModal';
import { PencilLoader } from '../../../components/ui/PencilLoader';
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

  const tabs = [
    { key: 'routes', label: t('routesTab') },
    { key: 'students', label: t('studentsTab') },
    { key: 'drivers', label: t('driversTab') },
  ];

  return (
    <div className="space-y-5">
      <CenterPageHeader title={t('moduleTransport')} description={t('transportSub')} />
      <nav className="mj-tabs" aria-label={t('transportSub')}>
        {tabs.map((x) => (
          <button
            key={x.key}
            type="button"
            className={`mj-tab ${tab === x.key ? 'mj-tab--active' : ''}`}
            onClick={() => setTab(x.key)}
          >
            {x.label}
          </button>
        ))}
      </nav>
      <div>
        {tab === 'routes' && <RoutesTab t={t} />}
        {tab === 'students' && <StudentsTab t={t} lang={lang} />}
        {tab === 'drivers' && <DriversTab t={t} />}
      </div>
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
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CenterStatCard value={summary?.routes ?? '—'} label={t('transportRoutes')} />
        <CenterStatCard value={summary?.subscribed ?? '—'} label={t('transportSubscribed')} />
        <CenterStatCard value={summary?.totalSeats ?? '—'} label={t('transportTotalSeats')} />
        <CenterStatCard value={summary?.availableSeats ?? '—'} label={t('transportAvailableSeats')} />
      </div>

      <div className="flex justify-end">
        <button type="button" className="mj-btn mj-btn--primary" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" />
          {t('addRoute')}
        </button>
      </div>

      {loading && <PencilLoader label={t('loading')} />}
      {error && <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</div>}

      {!loading && routes && routes.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-2">
          {routes.map((r) => {
            const pct = r.capacity > 0 ? Math.min(Math.round((r.occupied / r.capacity) * 100), 100) : 0;
            return (
              <div key={r.id} className="mj-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--mj-accent-soft)] text-[color:var(--mj-accent)]">
                      <Bus className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="mj-title">{r.name}</h3>
                      <p className="flex items-center gap-1 text-xs text-[color:var(--mj-muted)]">
                        <MapPin className="h-3.5 w-3.5" />
                        {r.areas || '—'}
                      </p>
                    </div>
                  </div>
                  <CenterPill tone={r.status === 'ACTIVE' ? 'green' : 'slate'} dot>
                    {r.status === 'ACTIVE' ? t('active') : r.status}
                  </CenterPill>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-[color:var(--mj-ink)] sm:grid-cols-3">
                  <span className="flex items-center gap-1.5"><UserRound className="h-4 w-4 text-[color:var(--mj-muted-2)]" />{r.driverName || '—'}</span>
                  <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-[color:var(--mj-muted-2)]" />{r.driverPhone || '—'}</span>
                  <span className="flex items-center gap-1.5"><Bus className="h-4 w-4 text-[color:var(--mj-muted-2)]" />{r.vehicle || '—'}</span>
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-[color:var(--mj-muted-2)]" />{t('routePickup')}: {r.pickupTime ?? '—'}</span>
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-[color:var(--mj-muted-2)]" />{t('routeDropoff')}: {r.dropoffTime ?? '—'}</span>
                  <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-[color:var(--mj-muted-2)]" />{r.occupied} / {r.capacity}</span>
                </div>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs font-medium">
                    <span className="text-[color:var(--mj-muted)]">{t('routeOccupied')}</span>
                    <span className={pct >= 90 ? 'text-[color:var(--mj-danger)]' : 'text-[color:var(--mj-ink-strong)]'}>{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--mj-line-bg)]">
                    <div
                      className={`h-full rounded-full ${pct >= 90 ? 'bg-[color:var(--mj-danger)]' : 'bg-[color:var(--mj-accent)]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {r.students.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium text-[color:var(--mj-muted)]">{t('routeStudents')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.students.map((s) => (
                        <span key={s.id} className="inline-flex items-center gap-1 rounded-full bg-[color:var(--mj-accent-soft)] px-2 py-0.5 text-xs text-[color:var(--mj-accent)]">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[color:var(--mj-border-soft)] pt-3">
                  <button type="button" className="mj-btn mj-btn--soft mj-btn--sm" onClick={() => setSubscribe(r)}>
                    <UserPlus className="h-4 w-4" />
                    {t('subscribeStudent')}
                  </button>
                  <button type="button" className="mj-btn mj-btn--ghost mj-btn--sm ms-auto" onClick={() => deactivate(r.id)} aria-label={t('routeStatus')}>
                    <Trash2 className="h-4 w-4 text-[color:var(--mj-danger)]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && routes?.length === 0 && (
        <div className="mj-empty">
          <Bus className="mj-empty-icon" />
          <p className="text-sm">{t('noRoutes')}</p>
        </div>
      )}

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
    <CenterModal
      open
      onClose={onClose}
      title={t('addRoute')}
      size="md"
      footer={
        <>
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="button" className="mj-btn mj-btn--primary" onClick={submit} disabled={saving}>{t('save')}</button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-0" noValidate>
        <div className="grid grid-cols-1 gap-x-4 gap-y-0 sm:grid-cols-2">
          <div className="mj-field">
            <label className="mj-label">{t('routeName')}</label>
            <input type="text" className="mj-input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('area')}</label>
            <input type="text" className="mj-input" value={form.areas} onChange={(e) => setForm((f) => ({ ...f, areas: e.target.value }))} />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('routeDriver')}</label>
            <input type="text" className="mj-input" value={form.driverName} onChange={(e) => setForm((f) => ({ ...f, driverName: e.target.value }))} />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('routeDriverPhone')}</label>
            <input type="text" className="mj-input" value={form.driverPhone} onChange={(e) => setForm((f) => ({ ...f, driverPhone: e.target.value }))} />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('vehicleType')}</label>
            <input type="text" className="mj-input" value={form.vehicle} onChange={(e) => setForm((f) => ({ ...f, vehicle: e.target.value }))} />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('routeCapacity')}</label>
            <input type="number" min="1" className="mj-input" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('routePickup')}</label>
            <input type="time" className="mj-input" value={form.pickupTime} onChange={(e) => setForm((f) => ({ ...f, pickupTime: e.target.value }))} />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('routeDropoff')}</label>
            <input type="time" className="mj-input" value={form.dropoffTime} onChange={(e) => setForm((f) => ({ ...f, dropoffTime: e.target.value }))} />
          </div>
        </div>
      </form>
    </CenterModal>
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
    <CenterModal
      open
      onClose={onClose}
      title={t('subscribeTitle') + ': ' + route.name}
      size="sm"
      footer={
        <>
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="button" className="mj-btn mj-btn--primary" onClick={submit} disabled={saving || available.length === 0}>{t('save')}</button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-0" noValidate>
        <div className="mj-field">
          <label className="mj-label">{t('studentName')}</label>
          <select className="mj-select" required value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">{t('selectBranch')}</option>
            {available.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        {available.length === 0 && <p className="text-xs text-[color:var(--mj-danger)]">{t('noAvailableStudents')}</p>}
      </form>
    </CenterModal>
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
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</div>;

  return (
    <div className="mj-card overflow-hidden">
      {students && students.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="mj-table">
            <thead>
              <tr>
                <th>{t('studentName')}</th>
                <th>{t('phone')}</th>
                <th>{t('routeName')}</th>
                <th>{t('joinedAt')}</th>
                <th style={{ textAlign: 'end' }}></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium text-[color:var(--mj-ink-strong)]">{s.name}</td>
                  <td>{s.phone || '—'}</td>
                  <td>
                    <CenterPill tone="blue">{s.route}</CenterPill>
                  </td>
                  <td className="text-[color:var(--mj-muted)]">
                    {new Date(s.joinedAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' })}
                  </td>
                  <td style={{ textAlign: 'end' }}>
                    <button type="button" className="mj-btn mj-btn--ghost mj-btn--sm" onClick={() => unsubscribe(s.id)} aria-label={t('unsubscribeStudent')}>
                      <UserMinus className="h-4 w-4 text-[color:var(--mj-danger)]" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mj-empty">
          <Users className="mj-empty-icon" />
          <p className="text-sm">{t('noSubscribers')}</p>
        </div>
      )}
    </div>
  );
}

function DriversTab({ t }: { t: (k: DictKey) => string }) {
  const { data: drivers, loading, error } = useApi<DriverRow[]>(() => api.get<DriverRow[]>('/center/transport/drivers'), []);

  if (loading) return <PencilLoader label={t('loading')} />;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</div>;

  if (!drivers || drivers.length === 0) return (
    <div className="mj-empty">
      <UserRound className="mj-empty-icon" />
      <p className="text-sm">{t('noDrivers')}</p>
    </div>
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {drivers.map((d) => (
        <div key={d.id} className="mj-card p-4">
          <div className="flex items-center gap-3">
            <div className="mj-avatar mj-avatar--md shrink-0">
              <UserRound className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="mj-title truncate">{d.driverName || t('routeName') + ': ' + d.name}</p>
              <p className="text-xs text-[color:var(--mj-muted)]">{d.driverPhone || d.name}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[color:var(--mj-muted)]">
            <span><Bus className="me-1 inline h-3.5 w-3.5" />{d.vehicle || '—'}</span>
            <CenterPill tone={d.status === 'ACTIVE' ? 'green' : 'slate'} dot>{d.status === 'ACTIVE' ? t('active') : d.status}</CenterPill>
          </div>
        </div>
      ))}
    </div>
  );
}

export default CenterTransportPage;