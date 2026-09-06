'use client';

import { useState } from 'react';
import {
  XCircle,
  Clock,
  UserCheck,
  Calendar,
  Download,
  ScanLine,
} from 'lucide-react';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterStatCard } from '../ui/CenterStatCard';
import { CenterPill } from '../ui/CenterPill';
import { CenterSearchInput } from '../ui/CenterSearchInput';
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

  const getStatusPill = (s: string) => {
    const map: Record<string, { tone: 'green' | 'amber' | 'red' | 'blue' | 'slate'; label: string }> = {
      PRESENT: { tone: 'green', label: t('present') },
      ABSENT: { tone: 'red', label: t('absent') },
      LATE: { tone: 'amber', label: t('late') },
      EXCUSED: { tone: 'blue', label: t('excused') },
    };
    const m = map[s];
    return <CenterPill tone={m?.tone || 'slate'}>{m?.label || s}</CenterPill>;
  };

  const filtered = attendance?.filter(a => {
    if (search && !a.studentName.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && a.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <CenterPageHeader
        title={t('attendanceManagement')}
        description={t('attendanceManagementSub', { center: center?.name || '' })}
      >
        <button className="mj-btn mj-btn--ghost">
          <Download className="h-4 w-4" />
          {t('export')}
        </button>
      </CenterPageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <CenterStatCard value={stats?.total || 0} label={t('total')} />
        <CenterStatCard value={stats?.present || 0} label={t('present')} />
        <CenterStatCard value={stats?.absent || 0} label={t('absent')} />
        <CenterStatCard value={stats?.late || 0} label={t('late')} />
        <CenterStatCard value={stats?.excused || 0} label={t('excused')} />
      </div>

      <div className="mj-card mj-card--padding">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mj-input sm:w-44"
          />
          <div className="flex-1">
            <CenterSearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('searchStudent')}
              aria-label={t('searchStudent')}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mj-select sm:w-40"
          >
            <option value="">{t('allStatus')}</option>
            <option value="PRESENT">{t('present')}</option>
            <option value="ABSENT">{t('absent')}</option>
            <option value="LATE">{t('late')}</option>
            <option value="EXCUSED">{t('excused')}</option>
          </select>
          <button className="mj-btn mj-btn--primary">
            <ScanLine className="h-4 w-4" />
            {t('scanQR')}
          </button>
        </div>
      </div>

      {error && <Alert message={error} />}
      {loading && <PencilLoader label={t('loading')} />}

      {!loading && filtered && filtered.length > 0 && (
        <div className="mj-card" style={{ overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table className="mj-table">
              <thead>
                <tr>
                  <th>{t('student')}</th>
                  <th>{t('lesson')}</th>
                  <th>{t('status')}</th>
                  <th>{t('markedAt')}</th>
                  <th style={{ textAlign: 'end' }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {record.studentPhoto ? (
                          <img
                            src={record.studentPhoto}
                            alt={record.studentName}
                            className="mj-avatar mj-avatar--sm overflow-hidden rounded-full object-cover"
                          />
                        ) : (
                          <span className="mj-avatar mj-avatar--sm">
                            {record.studentName.charAt(0)}
                          </span>
                        )}
                        <p className="font-medium" style={{ color: 'var(--mj-ink-strong)' }}>{record.studentName}</p>
                      </div>
                    </td>
                    <td style={{ color: 'var(--mj-muted)' }}>{record.lessonName}</td>
                    <td>{getStatusPill(record.status)}</td>
                    <td className="text-xs" style={{ color: 'var(--mj-muted-2)' }}>
                      {new Date(record.markedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ textAlign: 'end' }}>
                      <div className="flex justify-end gap-1">
                        <button className="mj-btn mj-btn--ghost mj-btn--sm" disabled={savingId === record.id} onClick={() => updateStatus(record.id, 'PRESENT')}>
                          <UserCheck className="h-4 w-4" style={{ color: 'var(--mj-success)' }} />
                        </button>
                        <button className="mj-btn mj-btn--ghost mj-btn--sm" disabled={savingId === record.id} onClick={() => updateStatus(record.id, 'LATE')}>
                          <Clock className="h-4 w-4" style={{ color: 'var(--mj-amber)' }} />
                        </button>
                        <button className="mj-btn mj-btn--ghost mj-btn--sm" disabled={savingId === record.id} onClick={() => updateStatus(record.id, 'ABSENT')}>
                          <XCircle className="h-4 w-4" style={{ color: 'var(--mj-danger)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && filtered?.length === 0 && (
        <div className="mj-card mj-empty">
          <Calendar className="mj-empty-icon" />
          <p>{t('noAttendanceForDate')}</p>
        </div>
      )}
    </div>
  );
}
