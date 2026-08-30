'use client';

import { useCallback, useEffect, useState } from 'react';
import { QrCode, CheckCircle2, Clock, ScanLine, UserX } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert, InlineError } from '../../components/ui/ErrorAlert';
import { EmptyState } from '../../components/ui/EmptyState';
import { QrScanner } from '../../components/attendance/QrScanner';
import { useApi, errorMessage } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useT, type Dict } from '../../i18n';
import type { Lesson, LessonAttendanceLive, ScanResult } from '../../lib/types';
import { formatTime } from '../../lib/format';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const STATUS_TONE: Record<string, 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'violet'> = {
  PRESENT: 'green',
  LATE: 'amber',
  ABSENT: 'red',
  SYSTEM: 'slate',
};

function attendanceStatusKey(status: string): keyof Dict {
  switch (status) {
    case 'PRESENT':
      return 'present';
    case 'LATE':
      return 'late';
    case 'ABSENT':
      return 'absent';
    case 'SYSTEM':
      return 'system';
    default:
      return 'status';
  }
}

export default function TeacherAttendancePage() {
  const { t } = useT();
  const toast = useToast();

  const { data: lessons, loading, initialLoading, error } = useApi<Lesson[]>(
    () => api.get<Lesson[]>('/lessons', { date: todayISO(), limit: 100 }),
    [],
  );

  const [live, setLive] = useState<Record<string, LessonAttendanceLive>>({});
  const [scanLesson, setScanLesson] = useState<Lesson | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState('');
  const [finalizing, setFinalizing] = useState(false);

  const loadLive = useCallback(async (lessonId: string) => {
    try {
      const res = await api.get<LessonAttendanceLive>(`/attendance/lesson/${lessonId}`);
      setLive((prev) => ({ ...prev, [lessonId]: res.data }));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (lessons) lessons.forEach((l) => loadLive(l.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessons]);

  // Lightweight polling: keep the live attendance list fresh while the scanner
  // modal is open so scanned updates appear without manual refresh.
  useEffect(() => {
    if (!scanLesson || !scanning) return;
    const id = setInterval(() => loadLive(scanLesson.id), 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanLesson, scanning, loadLive]);

  const openScanner = (lesson: Lesson) => {
    setScanLesson(lesson);
    setScanResult(null);
    setScanError('');
    setScanning(true);
  };

  const handleScan = async (token: string) => {
    if (!scanLesson) return;
    setScanning(false);
    try {
      const res = await api.post<ScanResult>('/attendance/scan', {
        token,
        lessonId: scanLesson.id,
      });
      setScanResult(res.data);
      loadLive(scanLesson.id);
    } catch (err) {
      setScanError(errorMessage(err));
      // Allow re-scanning after an error.
      setScanning(true);
    }
  };

  const handleFinalize = async (lesson: Lesson) => {
    setFinalizing(true);
    try {
      await api.post(`/attendance/lesson/${lesson.id}/finalize`);
      toast.success(t('finalizeToast'));
      loadLive(lesson.id);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={t('attendance')}
        subtitle={t('attendanceScannerSub')}
      />

      {error && <Alert message={error} className="mb-4" />}
      {loading && (initialLoading ? <PencilLoader label={t('loadingTodaysLessons')} /> : <PencilLoader size="sm" label={t('loadingTodaysLessons')} />)}

      {!loading && lessons && lessons.length === 0 && (
        <EmptyState
          icon={QrCode}
          title={t('noLessonsTodayTitle')}
          description={t('noLessonsTodayDesc')}
        />
      )}

      <div className="space-y-4">
        {lessons?.map((lesson) => {
          const l = live[lesson.id];
          return (
            <Card key={lesson.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {lesson.subject?.name ?? t('generalLesson')}
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {formatTime(lesson.startTime)} – {formatTime(lesson.endTime)} · {lesson.student.fullName}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {l && (
                    <>
                      <Badge tone="green">{l.present} {t('present')}</Badge>
                      <Badge tone="amber">{l.late} {t('late')}</Badge>
                      <Badge tone="red">{l.absent} {t('absent')}</Badge>
                      {l.notMarked > 0 && <Badge tone="blue">{l.notMarked} {t('notMarked')}</Badge>}
                    </>
                  )}
                  <Button size="sm" onClick={() => openScanner(lesson)}>
                    <ScanLine className="h-4 w-4" />
                    {t('openScanner')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleFinalize(lesson)}
                    loading={finalizing}
                  >
                    {t('finalize')}
                  </Button>
                </div>
              </div>

              {l && l.rows.length > 0 && (
                <div className="mt-4 border-t border-slate-100 dark:border-slate-700 pt-3">
                  {l.rows.map((row) => (
                    <div key={row.student.id} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <Avatar src={row.student.photo} name={row.student.fullName} size="sm" />
                        <span className="text-sm text-slate-700">{row.student.fullName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {row.status ? (
                          <>
                            <Badge tone={STATUS_TONE[row.status] ?? 'slate'}>{t(attendanceStatusKey(row.status))}</Badge>
                            {row.markedAt && (
                              <span className="text-xs text-slate-400">{formatTime(row.markedAt.slice(11, 16))}</span>
                            )}
                          </>
                        ) : (
                          <Badge tone="slate">{t('notMarked')}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Modal
        open={!!scanLesson}
        onClose={() => {
          setScanLesson(null);
          setScanning(false);
        }}
        title={t('scanAttendance', { subject: scanLesson?.subject?.name ?? '' })}
        size="md"
      >
        {scanLesson && (
          <div>
            <p className="mb-3 text-sm text-slate-500">
              {scanLesson.student.fullName} · {formatTime(scanLesson.startTime)} – {formatTime(scanLesson.endTime)}
            </p>

            {scanning && !scanResult && (
              <QrScanner onResult={handleScan} onError={() => setScanError(t('cameraUnavailable'))} />
            )}

            {scanError && <InlineError message={scanError} />}

            {scanResult && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                <Avatar src={scanResult.student.photo} name={scanResult.student.fullName} size="xl" />
                <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">{scanResult.student.fullName}</h3>
                <p className="text-sm text-slate-500">@{scanResult.student.username}</p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  {scanResult.attendance.status === 'PRESENT' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : scanResult.attendance.status === 'LATE' ? (
                    <Clock className="h-5 w-5 text-amber-600" />
                  ) : (
                    <UserX className="h-5 w-5 text-red-600" />
                  )}
                  <span className="text-base font-semibold text-slate-800 dark:text-slate-100">
                    {t(attendanceStatusKey(scanResult.attendance.status))}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {t('methodCol')}: {scanResult.attendance.method} ·{' '}
                  {new Date(scanResult.attendance.markedAt).toLocaleTimeString()}
                </p>

                <Button className="mt-4 w-full" onClick={() => { setScanResult(null); setScanError(''); setScanning(true); }}>
                  <ScanLine className="h-4 w-4" />
                  {t('scanNextStudent')}
                </Button>
              </div>
            )}

            {!scanning && !scanResult && (
              <div className="flex justify-center">
                <Button onClick={() => { setScanError(''); setScanning(true); }}>
                  <ScanLine className="h-4 w-4" />
                  {t('startScanning')}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}