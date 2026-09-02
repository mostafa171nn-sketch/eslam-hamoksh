'use client';

import { useState } from 'react';
import {
  Search,
  Edit,
  User,
  Users,
  Calendar,
  CreditCard,
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
import { Pagination } from '../../../components/ui/Pagination';
import { Modal } from '../../../components/ui/Modal';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { Alert } from '../../../components/ui/ErrorAlert';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useApi, errorMessage } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT, type DictKey } from '../../../i18n';

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

export default function CenterStudentsPage() {
  const { t } = useT();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const { data: students, meta, loading, initialLoading, error, reload } = useApi(
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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'green', INACTIVE: 'slate', PENDING: 'amber',
    };
    return <Badge tone={colors[status] as any || 'slate'}>{t(status.toLowerCase() as DictKey)}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('studentsManagement')} subtitle={t('studentsManagementSub')} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalStudents || 0}</p>
              <p className="text-xs text-slate-500">{t('totalStudents')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.activeStudents || 0}</p>
              <p className="text-xs text-slate-500">{t('active')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.pendingEnrollments || 0}</p>
              <p className="text-xs text-slate-500">{t('pendingEnrollments')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.overduePayments || 0}</p>
              <p className="text-xs text-slate-500">{t('overdue')}</p>
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
              placeholder={t('searchStudents')}
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

      {/* Table */}
      {error && <Alert message={error} />}
      {loading && <PencilLoader label={t('loading')} size={initialLoading ? undefined : 'sm'} />}

      {!loading && students && students.length > 0 && (
        <Card bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-start text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/50">
                  <th className="px-4 py-3 font-medium">{t('student')}</th>
                  <th className="px-4 py-3 font-medium">{t('studentId')}</th>
                  <th className="px-4 py-3 font-medium">{t('grade')}</th>
                  <th className="px-4 py-3 font-medium">{t('parent')}</th>
                  <th className="px-4 py-3 font-medium">{t('status')}</th>
                  <th className="px-4 py-3 font-medium">{t('attendanceRate')}</th>
                  <th className="px-4 py-3 font-medium text-end">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={student.fullName} src={student.photo} size="sm" />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{student.fullName}</p>
                          <p className="text-xs text-slate-400">@{student.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {student.studentNumber || student.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{student.grade || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{student.parent || '—'}</td>
                    <td className="px-4 py-3">{getStatusBadge(student.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${student.attendanceRate}%` }} />
                        </div>
                        <span className="text-xs font-medium">{Math.round(student.attendanceRate)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedStudent(student); setShowEditModal(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
            <Pagination page={page} totalPages={meta?.totalPages ?? 1} onChange={setPage} />
          </div>
        </Card>
      )}

      {!loading && students?.length === 0 && (
        <EmptyState icon={User} title={t('noStudents')} description={t('noStudentsDesc')} />
      )}

      {selectedStudent && (
        <EditStudentModal student={selectedStudent} open={showEditModal} onClose={() => { setShowEditModal(false); setSelectedStudent(null); }} onSuccess={() => { setShowEditModal(false); setSelectedStudent(null); reload(); }} />
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
    <Modal open={open} onClose={onClose} title={t('editStudent')} size="md"
      footer={<><Button variant="outline" onClick={onClose}>{t('cancel')}</Button><Button onClick={handleSubmit} loading={saving}>{t('save')}</Button></>}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
          <Avatar name={student.fullName} src={student.photo} size="md" />
          <div>
            <p className="font-semibold">{student.fullName}</p>
            <p className="text-sm text-slate-500">@{student.username} • {student.grade || '—'}</p>
          </div>
        </div>
        <Input label={t('fullName')} required value={form.fullName} onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))} />
        <Input label={t('phone')} value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
        <Input label={t('email')} type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
        {student.subjects.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium">{t('subjects')}</label>
            <div className="flex flex-wrap gap-1">
              {student.subjects.map((s, i) => <Badge key={i} tone="brand">{s}</Badge>)}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
