'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, ChevronLeft, ChevronRight, ArrowUpRight, Users, CalendarDays } from 'lucide-react';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterPill } from '../ui/CenterPill';
import { CenterSearchInput } from '../ui/CenterSearchInput';
import { CenterModal } from '../ui/CenterModal';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { useApi, errorMessage } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT, type DictKey, type TranslateParams } from '../../../i18n';
import { formatCurrency, formatDate, dayName, formatTime } from '../../../lib/format';

type T = (key: DictKey, params?: TranslateParams) => string;

type AgreementType = 'session' | 'monthly';

interface Agreement {
  type: AgreementType;
  amount: number;
}

interface TeacherItem {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  phone: string | null;
  email: string | null;
  photo: string | null;
  status: string;
  bio: string | null;
  yearsExperience: number;
  hourlyRate: number;
  createdAt: string;
  subjects: string[];
  grades: string[];
  branch: string | null;
  location: string | null;
  studentCount: number;
  lessonCount: number;
  groupCount: number;
  pendingBookings: number;
  openSettlements: number;
  needsAction: boolean;
  agreement: Agreement;
  rating: number;
  ratingCount: number;
}

interface RoomRequest {
  id: string;
  room: string;
  teacherId: string;
  teacher: string;
  subject: string | null;
  group: string | null;
  note: string | null;
  dayOfWeek: number | null;
  date: string | null;
  startTime: string;
  endTime: string;
  recurrence: string;
  createdAt: string;
}

interface SettlementDueItem {
  id: string;
  teacherId: string;
  teacher: string;
  period: string;
  status: string;
  grossAmount: number;
  teacherShare: number;
  centerShare: number;
  createdAt: string;
}

interface NeedsActionItem {
  id: string;
  userId: string;
  fullName: string;
  status: string;
  subjects: string[];
  agreement: Agreement;
  pendingActions: number;
  pendingBookings: number;
  openSettlements: number;
  studentCount: number;
  groupCount: number;
}

interface TeacherQueue {
  roomRequests: RoomRequest[];
  overdueRoomRequests: number;
  settlementsDue: SettlementDueItem[];
  teachersNeedingAction: NeedsActionItem[];
}

interface CatalogItem {
  id: string;
  name: string;
}

interface BranchItem {
  id: string;
  name: string;
}

type TeachersTab = 'all' | 'roomRequests' | 'settlements' | 'needsAction';

function toInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function agreementLabel(type: AgreementType, t: T): string {
  return type === 'monthly' ? t('agreementMonthly') : t('agreementSession');
}

function bookingTime(req: RoomRequest) {
  const time = `${formatTime(req.startTime)} – ${formatTime(req.endTime)}`;
  if (req.recurrence === 'WEEKLY' && req.dayOfWeek !== null) {
    return `${dayName(req.dayOfWeek)} · ${time}`;
  }
  if (req.date) return `${formatDate(req.date)} · ${time}`;
  return time;
}

export default function CenterTeachersPage() {
  const { t, lang } = useT();
  const router = useRouter();

  const [tab, setTab] = useState<TeachersTab>('all');
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [branchId, setBranchId] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const {
    data: teachers,
    meta,
    loading,
    initialLoading,
    error,
    reload: reloadTeachers,
  } = useApi<TeacherItem[]>(
    () =>
      api.get<TeacherItem[]>('/center/teachers', {
        page,
        limit: 20,
        ...(search && { search }),
        ...(status && { status }),
        ...(branchId && { branchId }),
      }),
    [page, search, status, branchId]
  );

  const {
    data: queue,
    loading: queueLoading,
    reload: reloadQueue,
  } = useApi<TeacherQueue>(() => api.get<TeacherQueue>('/center/teachers/queue'), []);

  const { data: branches } = useApi<BranchItem[]>(() => api.get<BranchItem[]>('/center/branches'), []);

  const queueSettlementsTotal = (queue?.settlementsDue ?? []).reduce((sum, s) => sum + s.teacherShare, 0);

  const openQueueTab = (next: TeachersTab) => {
    setTab(next);
  };

  const goToTeacher = (id: string) => router.push(`/center/teachers/${id}`);

  return (
    <div className="space-y-5">
      <CenterPageHeader title={t('teachersTitle')} description={t('teachersPageSub')}>
        <button type="button" className="mj-btn mj-btn--primary" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" />
          {t('addTeacher')}
        </button>
      </CenterPageHeader>

      {/* Queue cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <button type="button" className="mj-queue-card mj-queue-card--blue text-left" onClick={() => openQueueTab('roomRequests')}>
          <span className="min-w-0">
            <span className="mj-queue-card-title">
              {t('teachersQueueRoomRequests')}
              <span className="mj-queue-card-count">{queue?.roomRequests.length ?? 0}</span>
            </span>
            <span className="mj-queue-card-msg">
              {queue && queue.roomRequests.length > 0
                ? `${queue.roomRequests[0].teacher} · ${t('room')} ${queue.roomRequests[0].room}`
                : t('noPendingRequests')}
            </span>
            <span className="mj-queue-card-meta">
              {t('teachersQueueRoomRequestsSub', { count: queue?.overdueRoomRequests ?? 0 })}
            </span>
          </span>
        </button>
        <button type="button" className="mj-queue-card mj-queue-card--green text-left" onClick={() => openQueueTab('settlements')}>
          <span className="min-w-0">
            <span className="mj-queue-card-title">
              {t('teachersQueueSettlementsDue')}
              <span className="mj-queue-card-count">{queue?.settlementsDue.length ?? 0}</span>
            </span>
            <span className="mj-queue-card-msg">
              {t('teachersQueueSettlementsSub', { amount: formatCurrency(queueSettlementsTotal, lang) })}
            </span>
            <span className="mj-queue-card-meta">{t('openAccounts')}</span>
          </span>
        </button>
        <button type="button" className="mj-queue-card mj-queue-card--amber text-left" onClick={() => openQueueTab('needsAction')}>
          <span className="min-w-0">
            <span className="mj-queue-card-title">
              {t('teachersQueueNeedsAction')}
              <span className="mj-queue-card-count">{queue?.teachersNeedingAction.length ?? 0}</span>
            </span>
            <span className="mj-queue-card-msg">{t('teachersQueueNeedsActionSub')}</span>
            <span className="mj-queue-card-meta">{t('openFile')}</span>
          </span>
        </button>
      </div>

      {/* Tabs */}
      <div className="mj-tabs">
        <button type="button" className={`mj-tab ${tab === 'all' ? 'mj-tab--active' : ''}`} onClick={() => setTab('all')}>
          {t('allTeachersTab')}
          <span className="mj-tab-count">{meta?.total ?? teachers?.length ?? 0}</span>
        </button>
        <button type="button" className={`mj-tab ${tab === 'roomRequests' ? 'mj-tab--active' : ''}`} onClick={() => setTab('roomRequests')}>
          {t('roomRequestsTab')}
          <span className="mj-tab-count">{queue?.roomRequests.length ?? 0}</span>
        </button>
        <button type="button" className={`mj-tab ${tab === 'settlements' ? 'mj-tab--active' : ''}`} onClick={() => setTab('settlements')}>
          {t('settlementsTab')}
          <span className="mj-tab-count">{queue?.settlementsDue.length ?? 0}</span>
        </button>
        <button type="button" className={`mj-tab ${tab === 'needsAction' ? 'mj-tab--active' : ''}`} onClick={() => setTab('needsAction')}>
          {t('needsActionTab')}
          <span className="mj-tab-count">{queue?.teachersNeedingAction.length ?? 0}</span>
        </button>
      </div>

      {tab === 'all' && (
        <>
          <div className="mj-card mj-card--padding">
            <div className="mj-toolbar">
              <div className="min-w-0 flex-1 sm:max-w-xs">
                <CenterSearchInput
                  value={searchInput}
                  onChange={setSearchInput}
                  placeholder={t('searchTeachersPlaceholder')}
                  aria-label={t('searchTeachersPlaceholder')}
                />
              </div>
              <div className="min-w-0 sm:w-44">
                <select className="mj-select" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} aria-label={t('status')}>
                  <option value="">{t('allStatus')}</option>
                  <option value="ACTIVE">{t('active')}</option>
                  <option value="INACTIVE">{t('inactive')}</option>
                </select>
              </div>
              {(branches?.length ?? 0) > 1 && (
                <div className="min-w-0 sm:w-48">
                  <select
                    className="mj-select"
                    value={branchId}
                    onChange={(e) => { setPage(1); setBranchId(e.target.value); }}
                    aria-label={t('selectBranch')}
                  >
                    <option value="">{t('allBranches')}</option>
                    {branches?.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {error && <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
          {loading && <PencilLoader label={t('loading')} size={initialLoading ? undefined : 'sm'} />}

          {!loading && teachers && teachers.length > 0 && (
            <div className="mj-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="mj-table">
                  <thead>
                    <tr>
                      <th>{t('teacherColumn')}</th>
                      <th>{t('groupsAndStudentsColumn')}</th>
                      <th>{t('agreement')}</th>
                      <th>{t('status')}</th>
                      <th aria-label={t('openFile')} />
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((teacher) => (
                      <tr key={teacher.id} className="is-clickable" onClick={() => goToTeacher(teacher.id)}>
                        <td>
                          <span className="flex items-center gap-3">
                            <span className="mj-teacher-avatar">
                              {teacher.photo ? <img src={teacher.photo} alt="" className="h-8 w-8 rounded-full object-cover" /> : toInitials(teacher.fullName)}
                            </span>
                            <span className="min-w-0">
                              <span className="flex items-center gap-1.5">
                                <span className="block truncate font-bold text-[color:var(--mj-ink-strong)]">{teacher.fullName}</span>
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${teacher.needsAction ? 'bg-[color:var(--mj-amber)]' : 'bg-[color:var(--mj-success)]'}`} aria-hidden />
                              </span>
                              <span className="mj-teacher-row-sub">
                                {teacher.subjects.length > 0 ? teacher.subjects.join('، ') : ''}
                                {teacher.phone ? ` · ${teacher.phone}` : ''}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td>
                          <div className="text-sm font-semibold text-[color:var(--mj-ink-strong)]">
                            {teacher.groupCount === 1 ? t('groupCountLine', { count: 1 }) : t('groupsCountLine', { count: teacher.groupCount })}
                          </div>
                          <div className="mt-0.5 text-xs text-[color:var(--mj-muted)]">
                            {teacher.studentCount === 1
                              ? t('studentInsideCenter', { count: 1 })
                              : t('studentsInsideCenter', { count: teacher.studentCount })}
                          </div>
                        </td>
                        <td>
                          <div className="text-sm font-semibold text-[color:var(--mj-ink-strong)]">
                            {agreementLabel(teacher.agreement.type, t)} · {formatCurrency(teacher.agreement.amount, lang)}
                          </div>
                          <div className={`mt-0.5 text-xs ${teacher.needsAction ? 'font-semibold text-[color:var(--mj-amber)]' : 'text-[color:var(--mj-muted)]'}`}>
                            {teacher.needsAction ? t('needsActionStatus') : monthYear(teacher.createdAt, lang)}
                          </div>
                        </td>
                        <td>
                          <StatusPill status={teacher.status} />
                        </td>
                        <td>
                          <span className="flex items-center justify-end gap-2">
                            <Link
                              href={`/center/teachers/${teacher.id}`}
                              className="mj-link inline-flex items-center gap-1 text-sm font-semibold"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {t('openFile')}
                              <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
                            </Link>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(meta?.totalPages ?? 1) > 1 && (
                <div className="flex items-center justify-between border-t border-[color:var(--mj-border-soft)] px-5 py-3">
                  <span className="text-xs font-semibold text-[color:var(--mj-muted)]">
                    {meta?.page} / {meta?.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="mj-btn mj-btn--ghost mj-btn--sm"
                      disabled={!meta || meta.page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronRight className="h-4 w-4 rtl:-scale-x-100" />
                    </button>
                    <button
                      type="button"
                      className="mj-btn mj-btn--ghost mj-btn--sm"
                      disabled={!meta || meta.page >= meta.totalPages}
                      onClick={() => setPage((p) => Math.min(meta?.totalPages ?? 1, p + 1))}
                    >
                      <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && teachers?.length === 0 && (
            <div className="mj-empty">
              <Users className="mj-empty-icon" />
              <p className="text-sm font-semibold text-[color:var(--mj-ink-strong)]">{t('noTeachers')}</p>
              <p className="text-sm">{t('noTeachersDesc')}</p>
            </div>
          )}
        </>
      )}

      {tab === 'roomRequests' && (
        <RoomRequestsTab queue={queue} queueLoading={queueLoading} t={t} />
      )}

      {tab === 'settlements' && <SettlementsTab queue={queue} queueLoading={queueLoading} lang={lang} t={t} />}

      {tab === 'needsAction' && <NeedsActionTab queue={queue} queueLoading={queueLoading} t={t} />}

      {showAddModal && (
        <AddTeacherModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            setTab('all');
            reloadTeachers();
            reloadQueue();
          }}
        />
      )}
    </div>
  );
}

function monthYear(value: string, lang: 'ar' | 'en') {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const months =
    lang === 'ar'
      ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[d.getMonth()] + ' ' + d.getFullYear();
}

function StatusPill({ status }: { status: string }) {
  const { t } = useT();
  if (status === 'ACTIVE') return <CenterPill tone="green">{t('active')}</CenterPill>;
  if (status === 'INACTIVE') return <CenterPill tone="slate">{t('inactive')}</CenterPill>;
  return <CenterPill tone="amber">{status}</CenterPill>;
}

function RoomRequestsTab({ queue, queueLoading, t }: { queue: TeacherQueue | null; queueLoading: boolean; t: T }) {
  if (queueLoading && !queue) return <PencilLoader label={t('loading')} size="sm" />;
  const requests = queue?.roomRequests ?? [];
  if (requests.length === 0) {
    return (
      <div className="mj-empty">
        <CalendarDays className="mj-empty-icon" />
        <p className="text-sm font-semibold text-[color:var(--mj-ink-strong)]">{t('noPendingRequests')}</p>
        <Link href="/center/classrooms" className="mj-link mt-2 text-sm font-semibold">{t('openCalendar')}</Link>
      </div>
    );
  }
  return (
    <div className="mj-card mj-card--padding">
      <div className="space-y-2.5">
        {requests.map((req) => (
          <div key={req.id} className="mj-queue-item">
            <div className="min-w-0">
              <div className="mj-queue-item-title flex flex-wrap items-center gap-1.5">
                <Link href={`/center/teachers/${req.teacherId}`} className="hover:underline">{req.teacher}</Link>
                <CenterPill tone="blue">{req.room}</CenterPill>
              </div>
              <div className="mj-queue-item-msg">
                {req.group ? t('groupGeneric') + ': ' + req.group : ''}
                {req.subject ? (req.group ? ' · ' : '') + req.subject : ''}
                {req.note ? ' — ' + req.note : ''}
              </div>
              <div className="mj-queue-item-meta">{bookingTime(req)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Link href="/center/classrooms" className="mj-link text-sm font-semibold">{t('openCalendar')}</Link>
      </div>
    </div>
  );
}

function SettlementsTab({ queue, queueLoading, lang, t }: { queue: TeacherQueue | null; queueLoading: boolean; lang: 'ar' | 'en'; t: T }) {
  if (queueLoading && !queue) return <PencilLoader label={t('loading')} size="sm" />;
  const items = queue?.settlementsDue ?? [];
  if (items.length === 0) {
    return (
      <div className="mj-empty">
        <WalletIcon />
        <p className="text-sm font-semibold text-[color:var(--mj-ink-strong)]">{t('noSettlements')}</p>
      </div>
    );
  }
  return (
    <div className="mj-card mj-card--padding">
      <div className="space-y-2.5">
        {items.map((s) => (
          <div key={s.id} className="mj-queue-item">
            <div className="min-w-0">
              <div className="mj-queue-item-title">
                <Link href={`/center/teachers/${s.teacherId}`} className="hover:underline">{s.teacher}</Link>
              </div>
              <div className="mj-queue-item-meta">{s.period}</div>
              <div className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-3">
                <div>
                  <div className="text-xs text-[color:var(--mj-muted)]">{t('collectedAmount')}</div>
                  <div className="text-sm font-bold text-[color:var(--mj-ink-strong)]">{formatCurrency(s.grossAmount, lang)}</div>
                </div>
                <div>
                  <div className="text-xs text-[color:var(--mj-muted)]">{t('teacherDueAmount')}</div>
                  <div className="text-sm font-bold text-[color:var(--mj-ink-strong)]">{formatCurrency(s.teacherShare, lang)}</div>
                </div>
                <div>
                  <div className="text-xs text-[color:var(--mj-muted)]">{t('centerIncomeAmount')}</div>
                  <div className="text-sm font-bold text-[color:var(--mj-ink-strong)]">{formatCurrency(s.centerShare, lang)}</div>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {s.status === 'CALCULATED' ? (
                <CenterPill tone="blue">{t('pendingApproval')}</CenterPill>
              ) : (
                <CenterPill tone="amber">{t('pendingApproval')}</CenterPill>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Link href="/center/finance" className="mj-link text-sm font-semibold">{t('openAccounts')}</Link>
      </div>
    </div>
  );
}

function NeedsActionTab({ queue, queueLoading, t }: { queue: TeacherQueue | null; queueLoading: boolean; t: T }) {
  if (queueLoading && !queue) return <PencilLoader label={t('loading')} size="sm" />;
  const items = queue?.teachersNeedingAction ?? [];
  if (items.length === 0) {
    return (
      <div className="mj-empty">
        <Users className="mj-empty-icon" />
        <p className="text-sm font-semibold text-[color:var(--mj-ink-strong)]">{t('noPendingRequests')}</p>
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.id} className="mj-queue-item">
          <div className="min-w-0">
            <div className="mj-queue-item-title">
              <Link href={`/center/teachers/${item.id}`} className="hover:underline">{item.fullName}</Link>
            </div>
            <div className="mj-queue-item-msg">
              {item.pendingBookings > 0 && t('roomRequestsTab') + ': ' + item.pendingBookings}
              {item.pendingBookings > 0 && item.openSettlements > 0 ? ' · ' : ''}
              {item.openSettlements > 0 && t('settlementsTab') + ': ' + item.openSettlements}
            </div>
            <div className="mj-queue-item-meta">
              {item.subjects.length > 0 ? item.subjects.join('، ') + ' · ' : ''}
              {item.groupCount} {t('groups')} · {item.studentCount} {t('students')}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <CenterPill tone="amber">{t('pendingActionsLine', { count: item.pendingActions })}</CenterPill>
            <Link href={`/center/teachers/${item.id}`} className="mj-link flex items-center gap-1 text-sm font-semibold">
              {t('openFile')}
              <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function WalletIcon() {
  return (
    <svg className="mj-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      <path d="M21 10H13a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1z" />
    </svg>
  );
}

function AddTeacherModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    subjectIds: [] as string[],
    gradeIds: [] as string[],
    agreementType: 'session' as 'session' | 'monthly',
    sessionPrice: '',
    branchId: '',
  });

  const { data: subjects } = useApi<CatalogItem[]>(() => api.get<CatalogItem[]>('/admin/subjects'), []);
  const { data: grades } = useApi<CatalogItem[]>(() => api.get<CatalogItem[]>('/admin/grades'), []);
  const { data: branches } = useApi<BranchItem[]>(() => api.get<BranchItem[]>('/center/branches'), []);

  const toggle = (list: string[], id: string, set: (next: string[]) => void) => {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) return;
    setSaving(true);
    try {
      const price = parseInt(form.sessionPrice, 10) || 0;
      await api.post('/center/teachers', {
        fullName: form.fullName.trim(),
        phone: form.phone || undefined,
        subjectIds: form.subjectIds,
        gradeIds: form.gradeIds,
        agreementType: form.agreementType,
        sessionPrice: price,
        branchId: form.branchId || undefined,
      });
      toast.success(t('teacherAddedToast'));
      onCreated();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <CenterModal
      open={open}
      onClose={onClose}
      title={t('addTeacherDialogTitle')}
      description={t('addTeacherDialogDesc')}
      footer={
        <>
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="button" className="mj-btn mj-btn--primary" onClick={handleSubmit} disabled={saving}>
            {t('save')}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
          <div className="mj-field sm:col-span-2">
            <label className="mj-label">{t('teacherNameField')}</label>
            <input
              className="mj-input"
              required
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              placeholder={t('teacherNameField')}
            />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('phone')}</label>
            <input
              className="mj-input"
              dir="ltr"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="01000000000"
            />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('selectBranch')}</label>
            <select className="mj-select" value={form.branchId} onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}>
              <option value="">{t('allBranches')}</option>
              {branches?.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mj-field">
          <label className="mj-label">{t('subjectField')}</label>
          {subjects && subjects.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(form.subjectIds, s.id, (next) => setForm((f) => ({ ...f, subjectIds: next })))}
                  className={`mj-pill ${form.subjectIds.includes(s.id) ? 'mj-pill--blue' : 'mj-pill--slate'}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-[color:var(--mj-muted)]">{t('chooseSubject')}</div>
          )}
        </div>

        <div className="mj-field">
          <label className="mj-label">{t('stages')}</label>
          {grades && grades.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {grades.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggle(form.gradeIds, g.id, (next) => setForm((f) => ({ ...f, gradeIds: next })))}
                  className={`mj-pill ${form.gradeIds.includes(g.id) ? 'mj-pill--blue' : 'mj-pill--slate'}`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-[color:var(--mj-muted)]">{t('chooseSubject')}</div>
          )}
        </div>

        <div className="mj-field">
          <label className="mj-label">{t('defaultAgreementField')}</label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, agreementType: 'session' }))}
              className={`mj-pill ${form.agreementType === 'session' ? 'mj-pill--green' : 'mj-pill--slate'}`}
            >
              {t('agreementSession')}
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, agreementType: 'monthly' }))}
              className={`mj-pill ${form.agreementType === 'monthly' ? 'mj-pill--green' : 'mj-pill--slate'}`}
            >
              {t('agreementMonthly')}
            </button>
          </div>
        </div>

        <div className="mj-field">
          <label className="mj-label">
            {form.agreementType === 'monthly' ? t('monthlyPriceField') : t('sessionRateField')}
          </label>
          <input
            className="mj-input"
            type="number"
            min={0}
            value={form.sessionPrice}
            onChange={(e) => setForm((f) => ({ ...f, sessionPrice: e.target.value }))}
            placeholder="0"
          />
        </div>
      </form>
    </CenterModal>
  );
}
