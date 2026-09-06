'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Edit,
  Users,
} from 'lucide-react';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { Alert } from '../../../components/ui/ErrorAlert';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useApi, errorMessage } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT, type DictKey } from '../../../i18n';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterStatCard } from '../ui/CenterStatCard';
import { CenterPill } from '../ui/CenterPill';
import { CenterSearchInput } from '../ui/CenterSearchInput';
import { CenterModal } from '../ui/CenterModal';

interface Student {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  phone: string | null;
  email: string | null;
  photo: string | null;
  status: string;
  studentNumber: string | null;
  grade: string | null;
  gradeId: string | null;
  parent: string | null;
  parentId: string | null;
  teachers: string[];
  subjects: string[];
  attendanceRate: number;
  enrollmentStatus: string;
  paymentStatus: string;
  createdAt: string;
}

interface StudentStats {
  totalStudents: number;
  activeStudents: number;
  pendingEnrollments: number;
  overduePayments: number;
}

const getStatusTone = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'green' as const;
    case 'INACTIVE': return 'slate' as const;
    case 'PENDING': return 'amber' as const;
    default: return 'slate' as const;
  }
};

const getEnrollmentTone = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'green' as const;
    case 'FROZEN': return 'slate' as const;
    case 'PENDING': return 'amber' as const;
    default: return 'slate' as const;
  }
};

export default function CenterStudentsPage() {
  const { t } = useT();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const { data: students, loading, initialLoading, error, reload } = useApi(
    () => api.get<Student[]>('/center/students', {
      page,
      limit: 20,
      ...(search && { search }),
      ...(status && { status }),
    }),
    [page, search, status]
  );

  const { data: stats } = useApi<StudentStats>(
    () => api.get<StudentStats>('/center/students/stats'),
    []
  );

  const segmentedStudents = students ?? [];

  const segments = [
    { key: '', label: t('allStatus'), count: stats?.totalStudents ?? segmentedStudents.length },
    { key: 'ACTIVE', label: t('active'), count: stats?.activeStudents ?? 0 },
    { key: 'INACTIVE', label: t('inactive'), count: 0 },
  ];

  return (
    <div className="space-y-6">
      <CenterPageHeader
        eyebrow={t('manageStudents')}
        title={t('studentsManagement')}
        description={t('studentsManagementSub')}
      >
        <button
          type="button"
          className="mj-btn mj-btn--primary"
          onClick={() => setSelectedStudent(null)}
        >
          <Edit className="h-4 w-4" />
          {t('addStudent')}
        </button>
      </CenterPageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CenterStatCard value={stats?.totalStudents ?? 0} label={t('totalStudents')} />
        <CenterStatCard value={stats?.activeStudents ?? 0} label={t('active')} />
        <CenterStatCard value={stats?.pendingEnrollments ?? 0} label={t('pendingEnrollments')} />
        <CenterStatCard value={stats?.overduePayments ?? 0} label={t('overdue')} />
      </div>

      <div className="mj-card">
        <div className="px-4 pt-3">
          <CenterSearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder={t('searchStudents')}
            aria-label={t('searchStudents')}
          />
        </div>
        <div className="mt-3 border-t border-[color:var(--mj-border-soft)] px-4 py-3">
          <label className="mj-label">{t('status')}</label>
          <select
            className="mj-select"
            value={status}
            onChange={(e) => { setPage(1); setStatus(e.target.value); }}
          >
            <option value="">{t('allStatus')}</option>
            <option value="ACTIVE">{t('active')}</option>
            <option value="INACTIVE">{t('inactive')}</option>
          </select>
        </div>
        {(status || search) && (
          <div className="px-4 pb-3">
            <button
              type="button"
              className="mj-btn mj-btn--ghost mj-btn--sm"
              onClick={() => { setStatus(''); setSearch(''); setSearchInput(''); }}
            >
              {t('clearFilters')}
            </button>
          </div>
        )}
      </div>

      <div className="mj-tabs">
        {segments.map((seg) => (
          <button
            key={seg.key}
            type="button"
            className={`mj-tab ${status === seg.key ? 'mj-tab--active' : ''}`}
            onClick={() => { setPage(1); setStatus(seg.key); }}
          >
            {seg.label}
            <span className="mj-tab-count">{seg.count}</span>
          </button>
        ))}
      </div>

      {error && <Alert message={error} />}
      {loading && <PencilLoader label={t('loading')} size={initialLoading ? undefined : 'sm'} />}

      {!loading && segmentedStudents.length > 0 && (
        <div className="mj-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="mj-table">
              <thead>
                <tr>
                  <th>{t('student')}</th>
                  <th>{t('parent')}</th>
                  <th>{t('grade')}</th>
                  <th>{t('status')}</th>
                  <th className="text-end">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {segmentedStudents.map((student) => (
                  <tr key={student.id} className="is-clickable">
                    <td>
                      <Link
                        href={`/center/students/${student.id}`}
                        className="group flex items-center gap-3"
                      >
                        <span className="mj-avatar mj-avatar--sm">
                          {student.fullName ? student.fullName.charAt(0) : '؟'}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-[color:var(--mj-ink-strong)] group-hover:text-[color:var(--mj-accent)]">
                            {student.fullName}
                          </span>
                          <span className="block text-xs text-[color:var(--mj-muted-2)]">
                            {student.studentNumber || student.id.slice(0, 8).toUpperCase()}{student.grade ? ' · ' + student.grade : ''}
                          </span>
                          {student.enrollmentStatus && (
                            <span className="mt-1 inline-block">
                              <CenterPill tone={getEnrollmentTone(student.enrollmentStatus)}>
                                {t(student.enrollmentStatus.toLowerCase() as DictKey)}
                              </CenterPill>
                            </span>
                          )}
                        </span>
                      </Link>
                    </td>
                    <td>
                      <span className="block font-medium text-[color:var(--mj-ink)]">
                        {student.parent || '—'}
                      </span>
                      <span className="block text-xs text-[color:var(--mj-muted-2)]">
                        {student.phone || ''}
                      </span>
                    </td>
                    <td className="text-[color:var(--mj-muted)]">{student.grade || '—'}</td>
                    <td>
                      <CenterPill tone={getStatusTone(student.status)}>
                        {t(student.status.toLowerCase() as DictKey)}
                      </CenterPill>
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="mj-btn mj-btn--ghost mj-btn--sm"
                        onClick={() => { setSelectedStudent(student); setShowEditModal(true); }}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && segmentedStudents.length === 0 && (
        <div className="mj-card">
          <EmptyState icon={Users} title={t('noStudents')} description={t('noStudentsDesc')} />
        </div>
      )}

      {selectedStudent && (
        <EditStudentModal
          student={selectedStudent}
          open={showEditModal}
          onClose={() => { setShowEditModal(false); setSelectedStudent(null); }}
          onSuccess={() => { setShowEditModal(false); setSelectedStudent(null); reload(); }}
        />
      )}
    </div>
  );
}

function EditStudentModal({ student, open, onClose, onSuccess }: { student: Student; open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: student.fullName,
    phone: student.phone || '',
    email: student.email || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/center/students/${student.id}`, form);
      toast.success(t('studentUpdated'));
      onSuccess();
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
      title={t('editStudent')}
      size="md"
      footer={
        <>
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" form="edit-student-form" className="mj-btn mj-btn--primary" disabled={saving}>
            {saving ? t('creating') : t('save')}
          </button>
        </>
      }
    >
      <form id="edit-student-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg bg-[color:var(--mj-wash)] p-3">
          <span className="mj-avatar mj-avatar--md">
            {student.fullName ? student.fullName.charAt(0) : '؟'}
          </span>
          <div>
            <p className="font-semibold text-[color:var(--mj-ink-strong)]">{student.fullName}</p>
            <p className="text-sm text-[color:var(--mj-muted)]">
              @{student.username}{student.grade ? ' • ' + student.grade : ''}
            </p>
          </div>
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('fullName')}</label>
          <input
            type="text"
            className="mj-input"
            required
            value={form.fullName}
            onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))}
          />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('phone')}</label>
          <input
            type="text"
            className="mj-input"
            value={form.phone}
            onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('email')}</label>
          <input
            type="email"
            className="mj-input"
            value={form.email}
            onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
          />
        </div>
        {student.subjects.length > 0 && (
          <div>
            <label className="mj-label">{t('subjects')}</label>
            <div className="flex flex-wrap gap-1">
              {student.subjects.map((s, i) => <CenterPill key={i} tone="blue">{s}</CenterPill>)}
            </div>
          </div>
        )}
      </form>
    </CenterModal>
  );
}
