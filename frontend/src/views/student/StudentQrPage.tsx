'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { QrCode, MapPin, RefreshCw, AlertTriangle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { EmptyState } from '../../components/ui/EmptyState';
import { useApi, errorMessage } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useT, type Dict } from '../../i18n';
import type { AttendanceQrResponse, Lesson } from '../../lib/types';
import { formatTime } from '../../lib/format';

interface QrState {
  status: 'idle' | 'locating' | 'active' | 'expired' | 'error';
  data?: AttendanceQrResponse;
  error?: string;
  secondsLeft?: number;
}

function lessonStatusKey(status: string): keyof Dict {
  switch (status) {
    case 'SCHEDULED':
      return 'scheduled';
    case 'RESCHEDULED':
      return 'rescheduled';
    case 'COMPLETED':
      return 'completedStatus';
    case 'CANCELLED':
      return 'cancelled';
    case 'NO_SHOW':
      return 'noShowAction';
    default:
      return 'status';
  }
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function StudentQrPage() {
  const { t } = useT();
  const [qr, setQr] = useState<Record<string, QrState>>({});
  const timers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const { data, loading, initialLoading, error } = useApi(
    () => api.get<Lesson[]>('/lessons', { date: todayISO(), limit: 100 }),
    [],
  );

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach((t) => clearInterval(t));
    };
  }, []);

  const startCountdown = useCallback((lessonId: string, expiresAt: string) => {
    if (timers.current[lessonId]) clearInterval(timers.current[lessonId]);
    const tick = () => {
      const left = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setQr((prev) => ({
        ...prev,
        [lessonId]: { ...prev[lessonId], secondsLeft: left, status: left > 0 ? 'active' : 'expired' },
      }));
    };
    tick();
    timers.current[lessonId] = setInterval(tick, 1000);
  }, []);

  const generate = useCallback(
    (lesson: Lesson) => {
      setQr((prev) => ({ ...prev, [lesson.id]: { status: 'locating' } }));

      const proceed = (latitude?: number, longitude?: number) => {
        api
          .post<AttendanceQrResponse>('/attendance/generate-qr', {
            lessonId: lesson.id,
            latitude,
            longitude,
          })
          .then((res) => {
            setQr((prev) => ({
              ...prev,
              [lesson.id]: { status: 'active', data: res.data, secondsLeft: res.data.ttlSeconds },
            }));
            startCountdown(lesson.id, res.data.expiresAt);
          })
          .catch((err) => {
            setQr((prev) => ({
              ...prev,
              [lesson.id]: { status: 'error', error: errorMessage(err) },
            }));
          });
      };

      if (!navigator.geolocation) {
        proceed();
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => proceed(pos.coords.latitude, pos.coords.longitude),
        () => {
          // Permission denied / unavailable: still attempt (backend enforces if configured).
          proceed();
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    },
    [startCountdown],
  );

  return (
    <div>
      <PageHeader
        title={t('todaysAttendanceTitle')}
        subtitle={t('qrPageSubtitle')}
      />

      {error && <Alert message={error} className="mb-4" />}
      {loading && (initialLoading ? <PencilLoader label={t('loadingTodaysLessons')} /> : <PencilLoader size="sm" label={t('loadingTodaysLessons')} />)}

      {!loading && data && data.length === 0 && (
        <EmptyState
          icon={QrCode}
          title={t('noLessonsTodayTitle')}
          description={t('noLessonsTodayDesc')}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {data?.map((lesson) => {
          const state = qr[lesson.id] ?? { status: 'idle' as const };
          return (
            <Card key={lesson.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {lesson.subject?.name ?? t('generalLesson')}
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-500">{lesson.teacher.fullName}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {formatTime(lesson.startTime)} – {formatTime(lesson.endTime)}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {t(lessonStatusKey(lesson.status))}
                </span>
              </div>

              <div className="mt-4">
                {state.status === 'idle' && (
                  <Button onClick={() => generate(lesson)} className="w-full">
                    <QrCode className="h-4 w-4" />
                    {t('generateAttendanceQr')}
                  </Button>
                )}

                {state.status === 'locating' && <PencilLoader label={t('verifyingLocation')} />}

                {state.status === 'error' && (
                  <div className="space-y-3">
                    <Alert
                      title={t('couldNotGenerateQr')}
                      message={state.error ?? t('somethingWentWrong')}
                    />
                    <Button variant="secondary" onClick={() => generate(lesson)} className="w-full">
                      {t('tryAgain')}
                    </Button>
                  </div>
                )}

                {state.status === 'active' && state.data && (
                  <div className="flex flex-col items-center">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-3">
                      <QRCodeSVG value={state.data.token} size={200} level="M" />
                    </div>
                    <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-600">
                      <MapPin className="h-4 w-4" />
                      {t('insideCenterShowTeacher')}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                      {t('expiresInLabel')}: {state.secondsLeft ?? 0} {t('secondsUnit')}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{t('forLabel')} {state.data.lesson.subject} {t('with')} {state.data.lesson.teacher}</p>
                  </div>
                )}

                {state.status === 'expired' && (
                  <div className="space-y-3 text-center">
                    <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      {t('qrExpired')}
                    </p>
                    <Button onClick={() => generate(lesson)} className="w-full">
                      <RefreshCw className="h-4 w-4" />
                      {t('generateNewQr')}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
