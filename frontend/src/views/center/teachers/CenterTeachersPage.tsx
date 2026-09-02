'use client';

import { useState } from 'react';
import {
  Search,
  Edit,
  Star,
  Users,
  Calendar,
  X,
  Filter,
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { Alert } from '../../../components/ui/ErrorAlert';
import { EmptyState } from '../../../components/ui/EmptyState';
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

  const getStatusBadge = (status: string) => {
    return <Badge tone={status === 'ACTIVE' ? 'green' : 'slate'}>{t(status.toLowerCase() as DictKey)}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('teachersManagement')} subtitle={t('teachersManagementSub')} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalTeachers || 0}</p>
              <p className="text-xs text-slate-500">{t('totalTeachers')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.activeTeachers || 0}</p>
              <p className="text-xs text-slate-500">{t('active')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalStudents || 0}</p>
              <p className="text-xs text-slate-500">{t('students')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalLessons || 0}</p>
              <p className="text-xs text-slate-500">{t('lessons')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-300">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.averageRating ? stats.averageRating.toFixed(1) : '0.0'} ★</p>
              <p className="text-xs text-slate-500">{t('avgRating')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{teachers?.reduce((sum, t) => sum + t.todayLessons, 0) || 0}</p>
              <p className="text-xs text-slate-500">{t('todaysLessons')}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card bodyClassName="p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={t('searchTeachers')}
              className="ps-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); setSearch(searchInput); } }}
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4" />
            {t('filters')}
          </Button>
          {(status || search) && (
            <Button variant="ghost" onClick={() => { setStatus(''); setSearch(''); setSearchInput(''); }}>
              <X className="h-4 w-4" />
              {t('clearFilters')}
            </Button>
          )}
        </div>
        {showFilters && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Select label={t('status')} value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}
              options={[{ value: '', label: t('allStatus') }, { value: 'ACTIVE', label: t('active') }, { value: 'INACTIVE', label: t('inactive') }]}
            />
          </div>
        )}
      </Card>

      {/* Teachers Grid */}
      {error && <Alert message={error} />}
      {loading && <PencilLoader label={t('loading')} size={initialLoading ? undefined : 'sm'} />}

      {!loading && teachers && teachers.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {teachers.map((teacher) => (
            <Card key={teacher.id} bodyClassName="p-4">
              <div className="flex flex-col items-center text-center">
                <Avatar name={teacher.fullName} src={teacher.photo} size="lg" className="mb-3" />
                <h3 className="font-semibold text-slate-900 dark:text-white">{teacher.fullName}</h3>
                <p className="mb-1 text-xs text-slate-500">@{teacher.username}</p>
                <div className="mb-2">{getStatusBadge(teacher.status)}</div>
                <div className="mb-3 flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-medium">{teacher.rating.toFixed(1)}</span>
                  <span className="text-xs text-slate-400">({teacher.studentCount} {t('students')})</span>
                </div>
                <div className="mb-3 flex flex-wrap justify-center gap-1">
                  {teacher.subjects.slice(0, 3).map((s, i) => <Badge key={i} tone="slate" className="text-xs">{s}</Badge>)}
                  {teacher.subjects.length > 3 && <Badge tone="slate" className="text-xs">+{teacher.subjects.length - 3}</Badge>}
                </div>
                <div className="grid w-full grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-700">
                  <div>
                    <p className="text-slate-500">{t('todaysLessons')}</p>
                    <p className="font-medium">{teacher.todayLessons}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{t('experience')}</p>
                    <p className="font-medium">{teacher.yearsExperience} {t('years')}</p>
                  </div>
                </div>
                <div className="mt-3 flex w-full gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setSelectedTeacher(teacher); setShowEditModal(true); }}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Calendar className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && teachers?.length === 0 && (
        <EmptyState icon={Users} title={t('noTeachers')} description={t('noTeachersDesc')} />
      )}

      {/* Edit Modal */}
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
    <Modal open={open} onClose={onClose} title={t('editTeacher')} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>{t('cancel')}</Button><Button onClick={handleSubmit} loading={saving}>{t('save')}</Button></>}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t('fullName')} required value={form.fullName} onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))} />
          <Input label={t('phone')} value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label={t('email')} type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label={t('experience')} type="number" value={form.yearsExperience} onChange={(e) => setForm(f => ({ ...f, yearsExperience: parseInt(e.target.value) || 0 }))} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t('hourlyRate')} type="number" value={form.hourlyRate} onChange={(e) => setForm(f => ({ ...f, hourlyRate: parseInt(e.target.value) || 0 }))} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('bio')}</label>
          <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800" rows={3} value={form.bio} onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('subjects')}</label>
          <div className="flex flex-wrap gap-1">
            {teacher.subjects.map((s, i) => <Badge key={i} tone="brand">{s}</Badge>)}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('grades')}</label>
          <div className="flex flex-wrap gap-1">
            {teacher.grades.map((g, i) => <Badge key={i} tone="violet">{g}</Badge>)}
          </div>
        </div>
      </form>
    </Modal>
  );
}
