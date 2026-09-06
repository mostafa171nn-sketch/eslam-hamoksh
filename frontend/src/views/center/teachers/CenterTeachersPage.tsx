'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Edit, Star, Users, Filter, X } from 'lucide-react';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterStatCard } from '../ui/CenterStatCard';
import { CenterPill, type CenterPillTone } from '../ui/CenterPill';
import { CenterSearchInput } from '../ui/CenterSearchInput';
import { CenterModal } from '../ui/CenterModal';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { useApi, errorMessage } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT, type DictKey } from '../../../i18n';

interface Teacher {
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
  subjects: string[];
  grades: string[];
  branch: string | null;
  studentCount: number;
  lessonCount: number;
  todayLessons: number;
  rating: number;
  ratingCount: number;
}

interface TeacherStats {
  totalTeachers: number;
  activeTeachers: number;
  totalStudents: number;
  totalLessons: number;
  averageRating: number;
}

function initial(name: string) {
  return name.trim().charAt(0) || '?';
}

function statusTone(status: string): CenterPillTone {
  if (status === 'ACTIVE') return 'green';
  if (status === 'INACTIVE') return 'slate';
  return 'amber';
}

function StatusPill({ status }: { status: string }) {
  const { t } = useT();
  return <CenterPill tone={statusTone(status)}>{t(status.toLowerCase() as DictKey)}</CenterPill>;
}

export default function CenterTeachersPage() {
  const { t } = useT();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const { data: teachers, loading, initialLoading, error, reload } = useApi(
    () => api.get<Teacher[]>('/center/teachers', {
      page,
      limit: 20,
      ...(search && { search }),
      ...(status && { status }),
    }),
    [page, search, status]
  );

  const { data: stats } = useApi<TeacherStats>(
    () => api.get<TeacherStats>('/center/teachers/stats'),
    []
  );

  return (
    <div className="space-y-5">
      <CenterPageHeader
        title={t('teachersManagement')}
        description={t('teachersManagementSub')}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <CenterStatCard value={stats?.totalTeachers || 0} label={t('totalTeachers')} />
        <CenterStatCard value={stats?.activeTeachers || 0} label={t('active')} />
        <CenterStatCard value={stats?.totalStudents || 0} label={t('students')} />
        <CenterStatCard value={stats?.totalLessons || 0} label={t('todaysLessons')} />
        <CenterStatCard value={stats?.averageRating ? stats.averageRating.toFixed(1) : '0.0'} label={t('avgRating')} />
        <CenterStatCard
          value={teachers?.reduce((sum, tr) => sum + tr.todayLessons, 0) || 0}
          label={t('lessons')}
        />
      </div>

      <div className="mj-card mj-card--padding">
        <div className="mj-toolbar">
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <CenterSearchInput
              value={searchInput}
              onChange={setSearchInput}
              placeholder={t('searchTeachers')}
              aria-label={t('searchTeachers')}
            />
          </div>
          <button
            type="button"
            className="mj-btn mj-btn--ghost"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
            {t('filters')}
          </button>
          {(status || search) && (
            <button
              type="button"
              className="mj-btn mj-btn--ghost"
              onClick={() => { setStatus(''); setSearch(''); setSearchInput(''); }}
            >
              <X className="h-4 w-4" />
              {t('clearFilters')}
            </button>
          )}
        </div>
        {showFilters && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="mj-field sm:mb-0">
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
          </div>
        )}
      </div>

      {error && <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>}
      {loading && <PencilLoader label={t('loading')} size={initialLoading ? undefined : 'sm'} />}

      {!loading && teachers && teachers.length > 0 && (
        <div className="mj-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="mj-table">
              <thead>
                <tr>
                  <th>{t('teacher')}</th>
                  <th>{t('stages')}</th>
                  <th>{t('students')}</th>
                  <th>{t('agreement')}</th>
                  <th>{t('status')}</th>
                  <th aria-label={t('actions')} />
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher.id}>
                    <td>
                      <Link href={`/center/teachers/${teacher.id}`} className="flex items-center gap-3">
                        <span className="mj-avatar mj-avatar--md shrink-0">{initial(teacher.fullName)}</span>
                        <span>
                          <span className="block font-bold text-[color:var(--mj-ink-strong)]">{teacher.fullName}</span>
                          <span className="mt-0.5 block text-xs text-[color:var(--mj-muted)]">
                            {teacher.subjects.length > 0 ? teacher.subjects.join('، ') : ''}
                            {teacher.phone ? ` · ${teacher.phone}` : ''}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {teacher.grades.slice(0, 3).map((g, i) => (
                          <CenterPill key={i} tone="slate">{g}</CenterPill>
                        ))}
                        {teacher.grades.length > 3 && (
                          <CenterPill tone="slate">+{teacher.grades.length - 3}</CenterPill>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="font-semibold text-[color:var(--mj-ink-strong)]">{teacher.studentCount}</span>
                      <span className="ms-1 text-xs text-[color:var(--mj-muted)]">{t('students')}</span>
                    </td>
                    <td>
                      <span className="font-semibold text-[color:var(--mj-ink-strong)]">
                        {teacher.hourlyRate} {t('rate')}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-[color:var(--mj-muted)]">
                        <Star className="h-3.5 w-3.5 fill-[color:var(--mj-amber)] text-[color:var(--mj-amber)]" />
                        {teacher.rating.toFixed(1)}
                      </span>
                    </td>
                    <td>
                      <StatusPill status={teacher.status} />
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="mj-btn mj-btn--ghost mj-btn--sm"
                          onClick={() => { setSelectedTeacher(teacher); setShowEditModal(true); }}
                          aria-label={t('editTeacher')}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <Link href={`/center/teachers/${teacher.id}`} className="mj-btn mj-btn--ghost mj-btn--sm">
                          <span aria-hidden>{t('view')}</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && teachers?.length === 0 && (
        <div className="mj-empty">
          <Users className="mj-empty-icon" />
          <p className="text-sm font-semibold text-[color:var(--mj-ink-strong)]">{t('noTeachers')}</p>
          <p className="text-sm">{t('noTeachersDesc')}</p>
        </div>
      )}

      {selectedTeacher && (
        <EditTeacherModal teacher={selectedTeacher} open={showEditModal} onClose={() => { setShowEditModal(false); setSelectedTeacher(null); }} onSuccess={() => { setShowEditModal(false); setSelectedTeacher(null); reload(); }} />
      )}
    </div>
  );
}

function EditTeacherModal({ teacher, open, onClose, onSuccess }: { teacher: Teacher; open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: teacher.fullName,
    phone: teacher.phone || '',
    email: teacher.email || '',
    bio: teacher.bio || '',
    yearsExperience: teacher.yearsExperience,
    hourlyRate: teacher.hourlyRate,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/center/teachers/${teacher.id}`, form);
      toast.success(t('teacherUpdated'));
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
      title={t('editTeacher')}
      footer={
        <>
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="button" className="mj-btn mj-btn--primary" onClick={handleSubmit} disabled={saving}>{t('save')}</button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-0">
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <div className="mj-field">
            <label className="mj-label">{t('fullName')}</label>
            <input type="text" className="mj-input" required value={form.fullName} onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))} />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('phone')}</label>
            <input type="text" className="mj-input" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('email')}</label>
            <input type="email" className="mj-input" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('experience')}</label>
            <input type="number" className="mj-input" value={form.yearsExperience} onChange={(e) => setForm(f => ({ ...f, yearsExperience: parseInt(e.target.value) || 0 }))} />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('hourlyRate')}</label>
            <input type="number" className="mj-input" value={form.hourlyRate} onChange={(e) => setForm(f => ({ ...f, hourlyRate: parseInt(e.target.value) || 0 }))} />
          </div>
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('bio')}</label>
          <textarea className="mj-textarea" rows={3} value={form.bio} onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))} />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('subjects')}</label>
          <div className="flex flex-wrap gap-1">
            {teacher.subjects.map((s, i) => <CenterPill key={i} tone="blue">{s}</CenterPill>)}
          </div>
        </div>
        <div className="mj-field mb-0">
          <label className="mj-label">{t('grades')}</label>
          <div className="flex flex-wrap gap-1">
            {teacher.grades.map((g, i) => <CenterPill key={i} tone="slate">{g}</CenterPill>)}
          </div>
        </div>
      </form>
    </CenterModal>
  );
}
