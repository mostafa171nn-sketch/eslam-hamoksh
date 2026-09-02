'use client';

import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Calendar,
  Search,
  Download,
  ScanLine,
  Users,
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { Alert } from '../../../components/ui/ErrorAlert';
import { useApi, errorMessage } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../i18n';
import { useAuth } from '../../../context/AuthContext';

interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentPhoto: string | null;
  lessonId: string;
  lessonName: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  markedAt: string;
  notes: string | null;
}

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

export default function CenterAttendancePage() {
  const { t } = useT();
  const toast = useToast();
  const { center } = useAuth();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: attendance, loading, error, reload } = useApi<AttendanceRecord[]>(
    () => api.get<AttendanceRecord[]>('/center/account/attendance', { date }),
    [date]
  );

  const { data: stats } = useApi<AttendanceStats>(
    () => api.get<AttendanceStats>('/center/account/attendance/stats', { date }),
    [date]
  );

  const updateStatus = async (id: string, status: string) => {
    setSavingId(id);
    try {
      await api.patch(`/center/account/attendance/${id}`, { status });
      toast.success(t('attendanceUpdated'));
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { tone: string; label: string }> = {
      PRESENT: { tone: 'green', label: t('present') },
      ABSENT: { tone: 'red', label: t('absent') },
      LATE: { tone: 'amber', label: t('late') },
      EXCUSED: { tone: 'blue', label: t('excused') },
    };
    return <Badge tone={map[status]?.tone as any || 'slate'}>{map[status]?.label || status}</Badge>;
  };

  const filtered = attendance?.filter(a => {
    if (search && !a.studentName.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && a.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('attendanceManagement')}
        subtitle={t('attendanceManagementSub', { center: center?.name || '' })}
        action={
          <Button variant="outline">
            <Download className="h-4 w-4" />
            {t('export')}
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.total || 0}</p>
              <p className="text-xs text-slate-500">{t('total')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.present || 0}</p>
              <p className="text-xs text-slate-500">{t('present')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.absent || 0}</p>
              <p className="text-xs text-slate-500">{t('absent')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.late || 0}</p>
              <p className="text-xs text-slate-500">{t('late')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.excused || 0}</p>
              <p className="text-xs text-slate-500">{t('excused')}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card bodyClassName="p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="sm:w-44"
          />
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={t('searchStudent')}
              className="ps-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-40"
            options={[
              { value: '', label: t('allStatus') },
              { value: 'PRESENT', label: t('present') },
              { value: 'ABSENT', label: t('absent') },
              { value: 'LATE', label: t('late') },
              { value: 'EXCUSED', label: t('excused') },
            ]}
          />
          <Button>
            <ScanLine className="h-4 w-4" />
            {t('scanQR')}
          </Button>
        </div>
      </Card>

      {error && <Alert message={error} />}
      {loading && <PencilLoader label={t('loading')} />}

      {!loading && filtered && filtered.length > 0 && (
        <Card bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-start text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/50">
                  <th className="px-4 py-3 font-medium">{t('student')}</th>
                  <th className="px-4 py-3 font-medium">{t('lesson')}</th>
                  <th className="px-4 py-3 font-medium">{t('status')}</th>
                  <th className="px-4 py-3 font-medium">{t('markedAt')}</th>
                  <th className="px-4 py-3 font-medium text-end">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={record.studentName} src={record.studentPhoto} size="sm" />
                        <p className="font-medium text-slate-900 dark:text-white">{record.studentName}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{record.lessonName}</td>
                    <td className="px-4 py-3">{getStatusBadge(record.status)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(record.markedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" loading={savingId === record.id} onClick={() => updateStatus(record.id, 'PRESENT')}>
                          <UserCheck className="h-4 w-4 text-emerald-500" />
                        </Button>
                        <Button variant="ghost" size="sm" loading={savingId === record.id} onClick={() => updateStatus(record.id, 'LATE')}>
                          <Clock className="h-4 w-4 text-amber-500" />
                        </Button>
                        <Button variant="ghost" size="sm" loading={savingId === record.id} onClick={() => updateStatus(record.id, 'ABSENT')}>
                          <XCircle className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!loading && filtered?.length === 0 && (
        <Card bodyClassName="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <Calendar className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500">{t('noAttendanceForDate')}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
