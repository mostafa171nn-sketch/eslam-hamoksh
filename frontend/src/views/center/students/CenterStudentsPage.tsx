'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, BellRing, UserPlus } from 'lucide-react';
import { useApi, errorMessage } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../i18n';
import { formatCurrency } from '../../../lib/format';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterStatCard } from '../ui/CenterStatCard';
import { CenterPill } from '../ui/CenterPill';
import { CenterModal } from '../ui/CenterModal';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { Alert } from '../../../components/ui/ErrorAlert';
import { EmptyState } from '../../../components/ui/EmptyState';

interface StudentGroup {
  id: string;
  groupId: string;
  name: string;
  subject: string | null;
  stage: string | null;
}

interface StudentRow {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  phone: string | null;
  photo: string | null;
  status: string;
  studentNumber: string | null;
  grade: string | null;
  parent: string | null;
  parentPhone: string | null;
  groupCount: number;
  groups: StudentGroup[];
  enrollmentStatus: string;
  financialStatus: string;
  amountDue: number;
  totalCollected: number;
  attendanceRate: number | null;
  lastAttendance: string | null;
  lastAttendanceStatus: string | null;
  hasMissingAttendance: boolean;
}

interface StudentStats {
  totalStudents: number;
  activeStudents: number;
  pendingEnrollments: number;
  overduePayments: number;
  needsMatching: number;
}

interface FormData {
  groups: { id: string; name: string }[];
  grades: { id: string; name: string }[];
}

const financiallyTone = (status: string) => {
  switch (status) {
    case 'PAID': return 'green' as const;
    case 'DUE': return 'amber' as const;
    case 'NEEDS_MATCHING': return 'amber' as const;
    case 'UNPAID': return 'slate' as const;
    default: return 'slate' as const;
  }
};

const enrollmentTone = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'green' as const;
    case 'FROZEN': return 'slate' as const;
    case 'PENDING': return 'amber' as const;
    default: return 'slate' as const;
  }
};

const attendanceTone = (status: string | null) =>
  status === 'PRESENT' || status === 'LATE' ? 'green' as const : status === 'ABSENT' ? 'red' as const : 'slate' as const;

export default function CenterStudentsPage() {
  const { t, lang } = useT();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [financialStatus, setFinancialStatus] = useState('');
  const [registrationStatus, setRegistrationStatus] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [reminding, setReminding] = useState(false);

  const { data: stats } = useApi<StudentStats>(() => api.get<StudentStats>('/center/students/stats'), []);
  const { data: students, loading, error, reload } = useApi<StudentRow[]>(
    () => api.get<StudentRow[]>('/center/students', {
      limit: 100,
      ...(debounced ? { search: debounced } : {}),
      ...(financialStatus ? { financialStatus } : {}),
      ...(registrationStatus ? { registrationStatus } : {}),
    }),
    [debounced, financialStatus, registrationStatus]
  );
  const { data: formData } = useApi<FormData>(() => api.get<FormData>('/center/students/form-data'), []);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const activeCount = stats?.activeStudents ?? 0;
  const overdueCount = stats?.overduePayments ?? 0;
  const matchingCount = stats?.needsMatching ?? 0;

  const remindOverdue = async () => {
    setReminding(true);
    try {
      const res = await api.post<{ count: number }>('/center/students/remind-overdue', {});
      toast.success(t('remindOverdueToast', { count: res.data.count }));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setReminding(false);
    }
  };

  const financialLabel = (status: string, amountDue: number) => {
    switch (status) {
      case 'PAID':
        return { label: t('financialPaid'), sub: t('financeMatched') };
      case 'DUE':
        return { label: formatCurrency(amountDue * 100, lang), sub: t('financeDue') };
      case 'NEEDS_MATCHING':
        return { label: t('financeNeedsMatching'), sub: t('financeReview') };
      default:
        return { label: t('financialNotPaid'), sub: '' };
    }
  };

  const filteredStudents = students ?? [];

  return (
    <div className="space-y-5">
      <CenterPageHeader
        eyebrow={t('studentsEyebrow')}
        title={t('studentsTitle')}
        description={t('studentsSub')}
      >
        <button type="button" className="mj-btn mj-btn--ghost" onClick={remindOverdue} disabled={reminding}>
          <BellRing className="h-4 w-4" />
          {t('remindOverdue')}
        </button>
        <button type="button" className="mj-btn mj-btn--primary" onClick={() => setShowAdd(true)}>
          <UserPlus className="h-4 w-4" />
          {t('addStudentRecord')}
        </button>
      </CenterPageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <CenterStatCard value={activeCount} label={t('studentsStatActive')} />
        <CenterStatCard value={overdueCount} label={t('studentsStatOverdue')} />
        <CenterStatCard value={matchingCount} label={t('studentsStatMatching')} />
      </div>

      <div className="mj-card">
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="mj-field">
            <label className="mj-label">{t('search')}</label>
            <input
              type="search"
              className="mj-input"
              placeholder={t('studentsSearchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t('search')}
            />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('financialStatus')}</label>
            <select
              className="mj-select"
              value={financialStatus}
              onChange={(e) => setFinancialStatus(e.target.value)}
            >
              <option value="">{t('allFinancialStatuses')}</option>
              <option value="PAID">{t('financialPaid')}</option>
              <option value="DUE">{t('financeDue')}</option>
              <option value="NEEDS_MATCHING">{t('financeNeedsMatching')}</option>
            </select>
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('enrollmentStatusFilter')}</label>
            <select
              className="mj-select"
              value={registrationStatus}
              onChange={(e) => setRegistrationStatus(e.target.value)}
            >
              <option value="">{t('allEnrollmentStatuses')}</option>
              <option value="active">{t('enrollmentActive')}</option>
              <option value="frozen">{t('enrollmentFrozen')}</option>
            </select>
          </div>
        </div>
        {(financialStatus || registrationStatus || search) && (
          <div className="border-t border-[color:var(--mj-border-soft)] px-4 pb-3">
            <button
              type="button"
              className="mj-btn mj-btn--ghost mj-btn--sm mt-3"
              onClick={() => { setFinancialStatus(''); setRegistrationStatus(''); setSearch(''); setDebounced(''); }}
            >
              {t('clearFilters')}
            </button>
          </div>
        )}
      </div>

      {error && <Alert message={error} />}
      {loading && <PencilLoader label={t('loading')} />}

      {!loading && filteredStudents.length === 0 && (
        <div className="mj-card">
          <EmptyState icon={Users} title={t('noStudents')} description={t('noStudentsDesc')} />
        </div>
      )}

      {!loading && filteredStudents.length > 0 && (
        <div className="mj-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="mj-table">
              <thead>
                <tr>
                  <th>{t('student')}</th>
                  <th>{t('parent')}</th>
                  <th>{t('columnGroups')}</th>
                  <th>{t('referenceAttendance')}</th>
                  <th>{t('financialStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const fin = financialLabel(student.financialStatus, student.amountDue);
                  const regTone = enrollmentTone(student.enrollmentStatus);
                  const regLabel =
                    student.enrollmentStatus === 'ACTIVE' ? t('enrollmentActive')
                    : student.enrollmentStatus === 'FROZEN' ? t('enrollmentFrozen')
                    : t('enrollmentPending');
                  return (
                    <tr key={student.id} className="is-clickable">
                      <td>
                        <Link href={`/center/students/${student.id}`} className="group flex items-center gap-3">
                          <span className="mj-avatar mj-avatar--sm">
                            {student.fullName ? student.fullName.charAt(0) : '؟'}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-semibold text-[color:var(--mj-ink-strong)] group-hover:text-[color:var(--mj-accent)]">
                              {student.fullName}
                            </span>
                            <span className="block text-xs text-[color:var(--mj-muted-2)]">
                              {[student.studentNumber, student.grade].filter(Boolean).join(' · ')}
                            </span>
                            {student.groupCount > 0 && (
                              <span className="mt-0.5 flex items-center gap-1 text-xs text-[color:var(--mj-muted)]">
                                <Users className="h-3 w-3" />
                                {student.groups.map((g) => g.name).join('، ')}
                              </span>
                            )}
                          </span>
                        </Link>
                      </td>
                      <td>
                        <span className="block font-medium text-[color:var(--mj-ink)]">{student.parent || '—'}</span>
                        {student.parentPhone && (
                          <span className="block text-xs text-[color:var(--mj-muted-2)]" dir="ltr">{student.parentPhone}</span>
                        )}
                      </td>
                      <td>
                        <span className="block font-medium text-[color:var(--mj-ink-strong)]">
                          {student.groupCount} {student.groupCount === 1 ? t('groupGeneric') : t('groupsGeneric')}
                        </span>
                        <span className="mt-1 inline-block">
                          <CenterPill tone={regTone}>{regLabel}</CenterPill>
                        </span>
                      </td>
                      <td>
                        <span className="block font-semibold text-[color:var(--mj-ink-strong)]">
                          {student.attendanceRate !== null && student.attendanceRate !== undefined ? `${student.attendanceRate}%` : '—'}
                        </span>
                        {student.lastAttendanceStatus && (
                          <span className="mt-1 inline-flex items-center gap-1.5">
                            <CenterPill tone={attendanceTone(student.lastAttendanceStatus)}>
                              {student.lastAttendanceStatus === 'PRESENT' ? t('attendancePresentShort')
                                : student.lastAttendanceStatus === 'LATE' ? t('attendanceLateShort')
                                : student.lastAttendanceStatus === 'ABSENT' ? t('attendanceAbsentShort')
                                : t('attendanceExcusedShort')}
                            </CenterPill>
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="block font-semibold text-[color:var(--mj-ink-strong)]">{fin.label}</span>
                        {fin.sub && (
                          <span className="mt-0.5 inline-block">
                            <CenterPill tone={financiallyTone(student.financialStatus)}>{fin.sub}</CenterPill>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && (
        <AddStudentModal
          groups={formData?.groups ?? []}
          grades={formData?.grades ?? []}
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); reload(); }}
        />
      )}
    </div>
  );
}

function AddStudentModal({
  groups,
  grades,
  onClose,
  onSuccess,
}: {
  groups: { id: string; name: string }[];
  grades: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    studentName: '',
    grade: '',
    studentPhone: '',
    parentName: '',
    parentPhone: '',
    groupId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/center/students', form);
      toast.success(t('studentCreatedToast'));
      onSuccess();
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
      title={t('addStudentTitle')}
      description={t('addStudentDesc')}
      size="md"
      footer={
        <>
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" form="add-student-form" className="mj-btn mj-btn--primary" disabled={saving}>
            {saving ? t('creating') : t('saveRecord')}
          </button>
        </>
      }
    >
      <form id="add-student-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="mj-field">
          <label className="mj-label">{t('studentNameLabel')}</label>
          <input
            type="text"
            className="mj-input"
            required
            value={form.studentName}
            onChange={(e) => setForm(f => ({ ...f, studentName: e.target.value }))}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="mj-field">
            <label className="mj-label">{t('stage')}</label>
            <select
              className="mj-select"
              value={form.grade}
              onChange={(e) => setForm(f => ({ ...f, grade: e.target.value }))}
            >
              <option value="">{t('stagePlaceholder')}</option>
              {grades.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
            </select>
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('studentPhoneLabel')}</label>
            <input
              type="text"
              className="mj-input"
              required
              value={form.studentPhone}
              onChange={(e) => setForm(f => ({ ...f, studentPhone: e.target.value }))}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="mj-field">
            <label className="mj-label">{t('parentNameLabel')}</label>
            <input
              type="text"
              className="mj-input"
              value={form.parentName}
              onChange={(e) => setForm(f => ({ ...f, parentName: e.target.value }))}
            />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('parentPhoneLabel')}</label>
            <input
              type="text"
              className="mj-input"
              value={form.parentPhone}
              onChange={(e) => setForm(f => ({ ...f, parentPhone: e.target.value }))}
            />
          </div>
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('approvedGroup')}</label>
          <select
            className="mj-select"
            value={form.groupId}
            onChange={(e) => setForm(f => ({ ...f, groupId: e.target.value }))}
          >
            <option value="">{t('selectGroupPlaceholder')}</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      </form>
    </CenterModal>
  );
}
