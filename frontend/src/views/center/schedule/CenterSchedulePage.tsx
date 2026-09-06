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
} from 'lucide-react';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterStatCard } from '../ui/CenterStatCard';
import { CenterPill } from '../ui/CenterPill';
import { CenterModal } from '../ui/CenterModal';
import { PencilLoader } from '../../../components/ui/PencilLoader';
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

  const getStatusPill = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <CenterPill tone="blue">{t('scheduled')}</CenterPill>;
      case 'IN_PROGRESS':
        return <CenterPill tone="amber">{t('inProgress')}</CenterPill>;
      case 'COMPLETED':
        return <CenterPill tone="green">{t('completed')}</CenterPill>;
      case 'CANCELLED':
        return <CenterPill tone="red">{t('cancelled')}</CenterPill>;
      default:
        return <CenterPill tone="slate">{status}</CenterPill>;
    }
  };

  return (
    <div className="space-y-6">
      <CenterPageHeader
        title={t('schedule')}
        description={t('scheduleSub', { center: center?.name || '' })}
      >
        <button className="mj-btn mj-btn--primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          {t('createLesson')}
        </button>
      </CenterPageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <CenterStatCard value={stats?.todayLessons || 0} label={t('todayLessons')} />
        <CenterStatCard value={stats?.completedLessons || 0} label={t('completed')} />
        <CenterStatCard value={stats?.upcomingLessons || 0} label={t('upcoming')} />
        <CenterStatCard value={stats?.cancelledLessons || 0} label={t('cancelled')} />
      </div>

      <div className="mj-card mj-card--padding">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button className="mj-btn mj-btn--ghost mj-btn--sm" onClick={() => navigateDate('prev')}>
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </button>
            <span className="min-w-[180px] text-center font-medium">{formatDateHeader()}</span>
            <button className="mj-btn mj-btn--ghost mj-btn--sm" onClick={() => navigateDate('next')}>
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </button>
            <button className="mj-btn mj-btn--soft mj-btn--sm" onClick={() => setCurrentDate(new Date())}>
              {t('today')}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="mj-tabs" style={{ borderBottom: 'none' }}>
              {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`mj-tab ${viewMode === mode ? 'mj-tab--active' : ''}`}
                >
                  {t(mode as DictKey)}
                </button>
              ))}
            </div>
            {branches && branches.length > 0 && (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="mj-select"
              >
                <option value="">{t('allBranches')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <PencilLoader label={t('loading')} />
      ) : lessons && lessons.length > 0 ? (
        <div className="mj-card">
          <div className="space-y-3 p-4">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                onClick={() => setSelectedLesson(lesson)}
                className="mj-card--padding cursor-pointer transition-colors hover:border-[color:var(--mj-accent)]"
                style={{ background: 'var(--mj-surface-2)' }}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="mj-avatar mj-avatar--md">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold" style={{ color: 'var(--mj-ink-strong)' }}>{lesson.subject}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" style={{ color: 'var(--mj-muted)' }}>
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
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--mj-muted)' }}>
                      <Users className="h-4 w-4" />
                      {lesson.enrolledCount}/{lesson.studentCount}
                    </div>
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--mj-muted)' }}>
                      <MapPin className="h-4 w-4" />
                      {lesson.room}
                    </div>
                    {getStatusPill(lesson.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mj-card mj-empty">
          <Calendar className="mj-empty-icon" />
          <p>{t('noLessonsScheduled')}</p>
          <button className="mj-btn mj-btn--soft" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            {t('createLesson')}
          </button>
        </div>
      )}

      {selectedLesson && (
        <LessonDetailModal
          lesson={selectedLesson}
          open={!!selectedLesson}
          onClose={() => setSelectedLesson(null)}
        />
      )}

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
    <CenterModal
      open={open}
      onClose={onClose}
      title={lesson.subject}
      size="lg"
      footer={
        <>
          <button className="mj-btn mj-btn--ghost" onClick={onClose}>{t('close')}</button>
          <button className="mj-btn mj-btn--ghost">
            <Edit className="h-4 w-4" />
            {t('edit')}
          </button>
          <button className="mj-btn mj-btn--primary">
            <Users className="h-4 w-4" />
            {t('manageStudents')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: 'var(--mj-wash)' }}>
            <Clock className="h-5 w-5" style={{ color: 'var(--mj-muted-2)' }} />
            <div>
              <p className="text-xs" style={{ color: 'var(--mj-muted-2)' }}>{t('time')}</p>
              <p className="font-medium">{lesson.startTime} - {lesson.endTime}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: 'var(--mj-wash)' }}>
            <Users className="h-5 w-5" style={{ color: 'var(--mj-muted-2)' }} />
            <div>
              <p className="text-xs" style={{ color: 'var(--mj-muted-2)' }}>{t('students')}</p>
              <p className="font-medium">{lesson.enrolledCount}/{lesson.studentCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: 'var(--mj-wash)' }}>
            <BookOpen className="h-5 w-5" style={{ color: 'var(--mj-muted-2)' }} />
            <div>
              <p className="text-xs" style={{ color: 'var(--mj-muted-2)' }}>{t('grade')}</p>
              <p className="font-medium">{lesson.grade}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: 'var(--mj-wash)' }}>
            <MapPin className="h-5 w-5" style={{ color: 'var(--mj-muted-2)' }} />
            <div>
              <p className="text-xs" style={{ color: 'var(--mj-muted-2)' }}>{t('room')}</p>
              <p className="font-medium">{lesson.room}</p>
            </div>
          </div>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--mj-muted-2)' }}>{t('teacher')}</p>
          <p className="font-medium">{lesson.teacher}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--mj-muted-2)' }}>{t('branch')}</p>
          <p className="font-medium">{lesson.branch}</p>
        </div>
      </div>
    </CenterModal>
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
    <CenterModal
      open={open}
      onClose={() => { resetForm(); onClose(); }}
      title={t('createLesson')}
      size="lg"
      footer={
        <>
          <button className="mj-btn mj-btn--ghost" onClick={() => { resetForm(); onClose(); }}>{t('cancel')}</button>
          <button className="mj-btn mj-btn--primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t('creating') : t('create')}
          </button>
        </>
      }
    >
      {formLoading ? (
        <PencilLoader label={t('loading')} />
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg p-3 text-sm" style={{ background: 'var(--mj-danger-soft)', color: 'var(--mj-danger)' }}>
              {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="mj-field sm:col-span-2">
              <label className="mj-label">{t('teacher')} *</label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="mj-select"
              >
                <option value="">{t('selectTeacher')}</option>
                {formData.teachers.map((te) => (
                  <option key={te.id} value={te.id}>{te.name}</option>
                ))}
              </select>
            </div>
            <div className="mj-field sm:col-span-2">
              <label className="mj-label">{t('subject')}</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="mj-select"
              >
                <option value="">{t('select')}</option>
                {formData.subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="mj-field">
              <label className="mj-label">{t('date')} *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mj-input"
              />
            </div>
            <div className="mj-field">
              <label className="mj-label">{t('branch')}</label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="mj-select"
              >
                <option value="">{t('select')}</option>
                {formData.branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="mj-field">
              <label className="mj-label">{t('room')}</label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="mj-select"
              >
                <option value="">{t('select')}</option>
                {formData.rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}{r.capacity ? ` (${r.capacity})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="mj-field">
              <label className="mj-label">{t('capacity')}</label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="30"
                className="mj-input"
              />
            </div>
            <div className="mj-field">
              <label className="mj-label">{t('startTime')} *</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mj-input"
              />
            </div>
            <div className="mj-field">
              <label className="mj-label">{t('endTime')} *</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mj-input"
              />
            </div>
            <div className="mj-field sm:col-span-2">
              <label className="mj-label">{t('notes')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mj-input"
              />
            </div>
          </div>
        </div>
      )}
    </CenterModal>
  );
}
