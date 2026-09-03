'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  BookOpen,
  Users,
  MapPin,
  Edit,
  X,
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { Modal } from '../../../components/ui/Modal';
import { useApi } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useT, type DictKey } from '../../../i18n';

interface Lesson {
  id: string;
  subject: string;
  teacher: string;
  teacherId: string;
  grade: string;
  room: string;
  branch: string;
  date: string;
  startTime: string;
  endTime: string;
  studentCount: number;
  enrolledCount: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

interface ScheduleStats {
  todayLessons: number;
  completedLessons: number;
  upcomingLessons: number;
  cancelledLessons: number;
}

type ViewMode = 'day' | 'week' | 'month';

export default function CenterSchedulePage() {
  const { t } = useT();
  const { center } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [branchFilter, setBranchFilter] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: lessons, loading } = useApi<Lesson[]>(
    () => api.get<Lesson[]>('/center/account/schedule', {
      date: currentDate.toISOString().split('T')[0],
      view: viewMode,
      branchId: branchFilter || undefined,
    }),
    [currentDate, viewMode, branchFilter, refreshKey]
  );

  const { data: stats } = useApi<ScheduleStats>(
    () => api.get<ScheduleStats>('/center/account/schedule/stats'),
    [refreshKey]
  );

  const { data: branches } = useApi<FormBranch[]>(
    () => api.get<ScheduleFormData>('/center/account/schedule/form-data').then((res) => ({ ...res, data: res.data.branches || [] })),
    []
  );

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const formatDateHeader = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } else if (viewMode === 'week') {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <Badge tone="blue">{t('scheduled')}</Badge>;
      case 'IN_PROGRESS':
        return <Badge tone="amber">{t('inProgress')}</Badge>;
      case 'COMPLETED':
        return <Badge tone="green">{t('completed')}</Badge>;
      case 'CANCELLED':
        return <Badge tone="red">{t('cancelled')}</Badge>;
      default:
        return <Badge tone="slate">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('schedule')}
        subtitle={t('scheduleSub', { center: center?.name || '' })}
        action={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            {t('createLesson')}
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.todayLessons || 0}</p>
              <p className="text-xs text-slate-500">{t('todayLessons')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.completedLessons || 0}</p>
              <p className="text-xs text-slate-500">{t('completed')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.upcomingLessons || 0}</p>
              <p className="text-xs text-slate-500">{t('upcoming')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300">
              <X className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.cancelledLessons || 0}</p>
              <p className="text-xs text-slate-500">{t('cancelled')}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* View Controls */}
      <Card bodyClassName="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
            <span className="min-w-[180px] text-center font-medium">{formatDateHeader()}</span>
            <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
              {t('today')}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === mode
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {t(mode as DictKey)}
                </button>
              ))}
            </div>
            {branches && branches.length > 0 && (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
              >
                <option value="">{t('allBranches')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </Card>

      {/* Timeline */}
      {loading ? (
        <PencilLoader label={t('loading')} />
      ) : lessons && lessons.length > 0 ? (
        <Card>
          <div className="space-y-3 p-4">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                onClick={() => setSelectedLesson(lesson)}
                className={`group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-brand-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{lesson.subject}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {lesson.startTime} - {lesson.endTime}
                        </span>
                        <span>{lesson.teacher}</span>
                        <span>{lesson.grade}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Users className="h-4 w-4" />
                      {lesson.enrolledCount}/{lesson.studentCount}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <MapPin className="h-4 w-4" />
                      {lesson.room}
                    </div>
                    {getStatusBadge(lesson.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card bodyClassName="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <Calendar className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500">{t('noLessonsScheduled')}</p>
            <Button variant="secondary" className="mt-4" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4" />
              {t('createLesson')}
            </Button>
          </div>
        </Card>
      )}

      {/* Lesson Detail Modal */}
      {selectedLesson && (
        <LessonDetailModal
          lesson={selectedLesson}
          open={!!selectedLesson}
          onClose={() => setSelectedLesson(null)}
        />
      )}

      {/* Create Lesson Modal */}
      <CreateLessonModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}

interface LessonDetailModalProps {
  lesson: Lesson;
  open: boolean;
  onClose: () => void;
}

function LessonDetailModal({ lesson, open, onClose }: LessonDetailModalProps) {
  const { t } = useT();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={lesson.subject}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{t('close')}</Button>
          <Button variant="outline">
            <Edit className="h-4 w-4" />
            {t('edit')}
          </Button>
          <Button>
            <Users className="h-4 w-4" />
            {t('manageStudents')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
            <Clock className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">{t('time')}</p>
              <p className="font-medium">{lesson.startTime} - {lesson.endTime}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
            <Users className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">{t('students')}</p>
              <p className="font-medium">{lesson.enrolledCount}/{lesson.studentCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
            <BookOpen className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">{t('grade')}</p>
              <p className="font-medium">{lesson.grade}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
            <MapPin className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">{t('room')}</p>
              <p className="font-medium">{lesson.room}</p>
            </div>
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-500">{t('teacher')}</p>
          <p className="font-medium">{lesson.teacher}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">{t('branch')}</p>
          <p className="font-medium">{lesson.branch}</p>
        </div>
      </div>
    </Modal>
  );
}

interface FormSubject { id: string; name: string }
interface FormTeacher { id: string; userId: string; name: string }
interface FormRoom { id: string; name: string; capacity: number | null }
interface FormBranch { id: string; name: string }
interface ScheduleFormData {
  subjects: FormSubject[];
  teachers: FormTeacher[];
  rooms: FormRoom[];
  branches: FormBranch[];
}

interface CreateLessonModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

function CreateLessonModal({ open, onClose, onCreated }: CreateLessonModalProps) {
  const { t } = useT();
  const [formData, setFormData] = useState<ScheduleFormData>({ subjects: [], teachers: [], rooms: [], branches: [] });
  const [formLoading, setFormLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [roomId, setRoomId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [capacity, setCapacity] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setFormLoading(true);
    api.get<ScheduleFormData>('/center/account/schedule/form-data')
      .then((res) => setFormData(res.data))
      .catch(() => {})
      .finally(() => setFormLoading(false));
  }, [open]);

  const resetForm = () => {
    setSubjectId('');
    setTeacherId('');
    setDate(new Date().toISOString().split('T')[0]);
    setStartTime('09:00');
    setEndTime('10:00');
    setRoomId('');
    setLocationId('');
    setCapacity('');
    setNotes('');
    setError('');
  };

  const handleSubmit = async () => {
    if (!teacherId || !date || !startTime || !endTime) {
      setError(t('requiredFields'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/center/account/schedule/lessons', {
        subjectId: subjectId || undefined,
        teacherId,
        date,
        startTime,
        endTime,
        roomId: roomId || undefined,
        locationId: locationId || undefined,
        capacity: capacity ? parseInt(capacity) : undefined,
        notes: notes || undefined,
      });
      resetForm();
      onClose();
      onCreated?.();
    } catch (err: any) {
      setError(err?.message || t('errorOccurred'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => { resetForm(); onClose(); }}
      title={t('createLesson')}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? t('creating') : t('create')}
          </Button>
        </>
      }
    >
      {formLoading ? (
        <PencilLoader label={t('loading')} />
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">{t('teacher')} *</label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              >
                <option value="">{t('selectTeacher')}</option>
                {formData.teachers.map((te) => (
                  <option key={te.id} value={te.id}>{te.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">{t('subject')}</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              >
                <option value="">{t('select')}</option>
                {formData.subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('date')} *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('branch')}</label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              >
                <option value="">{t('select')}</option>
                {formData.branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('room')}</label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              >
                <option value="">{t('select')}</option>
                {formData.rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}{r.capacity ? ` (${r.capacity})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('capacity')}</label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="30"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('startTime')} *</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('endTime')} *</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">{t('notes')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
