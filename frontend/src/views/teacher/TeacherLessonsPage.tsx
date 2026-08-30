import { useState, type FormEvent } from 'react';
import { CalendarPlus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Pagination } from '../../components/ui/Pagination';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert, InlineError } from '../../components/ui/ErrorAlert';
import { useApi, errorMessage } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useT, type Dict } from '../../i18n';
import type { Lesson, LessonStatus, Location, TeacherStudent } from '../../lib/types';
import { formatDate, isToday, formatTime } from '../../lib/format';
import { Calendar } from 'lucide-react';

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

export default function TeacherLessonsPage() {
  const { t } = useT();
  const { user } = useAuth();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [attendanceLesson, setAttendanceLesson] = useState<Lesson | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, meta, loading, initialLoading, error, reload } = useApi(
    () => api.get<Lesson[]>('/lessons', { status: status || undefined, page, limit: 20 }),
    [page, status],
  );

  const { data: studentsData } = useApi(() => api.get<TeacherStudent[]>('/teachers/me/students', { page: 1, limit: 100 }), []);
  const { data: locationsData } = useApi(() => api.get<Location[]>('/catalog/locations'), []);

  const students = studentsData ?? [];
  const subjects = user?.role === 'TEACHER' ? user.teacher.subjects : [];
  const locations = locationsData ?? [];
  const teacherId = user?.role === 'TEACHER' ? user.teacher.id : '';

  const statusOptions = [
    { value: '', label: t('allStatus') },
    { value: 'SCHEDULED', label: t('scheduled') },
    { value: 'RESCHEDULED', label: t('rescheduled') },
    { value: 'COMPLETED', label: t('completedStatus') },
    { value: 'CANCELLED', label: t('cancelled') },
    { value: 'NO_SHOW', label: t('noShowAction') },
  ];

  const [form, setForm] = useState({ studentId: '', subjectId: '', date: '', startTime: '', endTime: '', locationId: '', notes: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setForm({ studentId: '', subjectId: '', date: '', startTime: '', endTime: '', locationId: '', notes: '' });
    setFormError('');
    setCreateOpen(true);
  };

  const createLesson = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.studentId || !form.date || !form.startTime || !form.endTime) {
      setFormError(t('studentDateTimeRequired'));
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await api.post('/lessons', {
        teacherId,
        studentId: form.studentId,
        subjectId: form.subjectId || undefined,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        locationId: form.locationId || undefined,
        notes: form.notes.trim() || undefined,
      });
      toast.success(t('lessonScheduledToast'));
      setCreateOpen(false);
      reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const changeLessonStatus = async (lesson: Lesson, next: LessonStatus) => {
    setBusyId(lesson.id);
    try {
      await api.put(`/lessons/${lesson.id}`, { status: next });
      toast.success(t('markedAs', { s: t(lessonStatusKey(next)) }));
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const [attForm, setAttForm] = useState({ status: 'PRESENT', note: '' });

  const saveAttendance = async () => {
    if (!attendanceLesson) return;
    setSaving(true);
    try {
      await api.post(`/lessons/${attendanceLesson.id}/attendance`, {
        studentId: attendanceLesson.student.id,
        status: attForm.status,
        note: attForm.note.trim() || undefined,
      });
      toast.success(t('attendanceMarkedToast'));
      setAttendanceLesson(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const canMarkAttendance = (l: Lesson) => l.status === 'SCHEDULED' || l.status === 'RESCHEDULED' || l.status === 'COMPLETED';

  return (
    <div>
      <PageHeader
        title={t('myLessons')}
        subtitle={t('teacherLessonsSub')}
        action={
          <Button size="sm" onClick={openCreate}>
            <CalendarPlus className="h-4 w-4" /> {t('scheduleLesson')}
          </Button>
        }
      />

      <Card bodyClassName="p-4 space-y-3">
        <div className="sm:w-56">
          <Select options={statusOptions} value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} />
        </div>

        {error && <Alert message={error} />}
        {loading && (initialLoading ? <PencilLoader label={t('loadingLessons')} /> : <PencilLoader size="sm" label={t('loadingLessons')} />)}

        {!loading && data && (
          <>
            {data.length === 0 ? (
              <EmptyState icon={Calendar} title={t('noLessons')} description={t('teacherScheduleFirstLesson')} />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {data.map((l) => (
                  <div key={l.id} className="flex flex-col gap-3 px-1 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                        <span className="text-[10px] font-semibold uppercase">{formatDate(l.date).split(' ')[1]}</span>
                        <span className="text-sm font-bold leading-none">{formatDate(l.date).split(' ')[0]}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{l.student.fullName}</p>
                          <Badge tone={statusTone(l.status)}>{t(lessonStatusKey(l.status))}</Badge>
                          {isToday(l.date) && <Badge tone="blue">{t('today')}</Badge>}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {l.subject?.name ?? t('noSubject')} · {formatTime(l.startTime)} – {formatTime(l.endTime)} ·{' '}
                          {l.location?.name ?? t('online')}
                        </p>
                        {l.notes && <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{l.notes}</p>}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {canMarkAttendance(l) && (
                        <Button size="sm" variant="secondary" onClick={() => { setAttForm({ status: 'PRESENT', note: '' }); setAttendanceLesson(l); }}>
                          {t('attendance')}
                        </Button>
                      )}
                      {(l.status === 'SCHEDULED' || l.status === 'RESCHEDULED') && (
                        <>
                          <Button size="sm" variant="outline" loading={busyId === l.id} onClick={() => changeLessonStatus(l, 'COMPLETED')}>
                            {t('completeAction')}
                          </Button>
                          <Button size="sm" variant="outline" loading={busyId === l.id} onClick={() => changeLessonStatus(l, 'NO_SHOW')}>
                            {t('noShowAction')}
                          </Button>
                          <Button size="sm" variant="danger" loading={busyId === l.id} onClick={() => changeLessonStatus(l, 'CANCELLED')}>
                            {t('cancelLesson')}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Pagination page={page} totalPages={meta?.totalPages ?? 1} onChange={setPage} />
          </>
        )}
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('scheduleLesson')}
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>{t('cancel')}</Button>
            <Button onClick={createLesson} loading={saving}>{t('scheduleLessonBtn')}</Button>
          </>
        }
      >
        <form onSubmit={createLesson} className="space-y-4">
          <InlineError message={formError} />
          <Select
            label={t('studentCol')}
            options={students.map((s) => ({ value: s.id, label: s.fullName }))}
            value={form.studentId}
            onChange={(e) => setForm((p) => ({ ...p, studentId: e.target.value }))}
            placeholder={t('selectStudent')}
          />
          <Select
            label={t('subject')}
            options={subjects.map((s) => ({ value: s.id, label: s.name }))}
            value={form.subjectId}
            onChange={(e) => setForm((p) => ({ ...p, subjectId: e.target.value }))}
            placeholder={t('noSubject')}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label={t('date')} type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
            <Input label={t('start')} type="time" value={form.startTime} onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))} />
            <Input label={t('end')} type="time" value={form.endTime} onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))} />
          </div>
          <Select
            label={t('location')}
            options={locations.map((l) => ({ value: l.id, label: l.name }))}
            value={form.locationId}
            onChange={(e) => setForm((p) => ({ ...p, locationId: e.target.value }))}
            placeholder={t('teacherLocationPlaceholder')}
          />
          <Textarea label={t('notePlaceholderTime')} rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
        </form>
      </Modal>

      <Modal
        open={!!attendanceLesson}
        onClose={() => setAttendanceLesson(null)}
        title={t('markAttendance')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setAttendanceLesson(null)} disabled={saving}>{t('cancel')}</Button>
            <Button onClick={saveAttendance} loading={saving}>{t('save')}</Button>
          </>
        }
      >
        {attendanceLesson && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={attendanceLesson.student.fullName} src={attendanceLesson.student.photo} />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{attendanceLesson.student.fullName}</p>
                <p className="text-xs text-slate-500">
                  {attendanceLesson.subject?.name ?? t('noSubject')} · {formatDate(attendanceLesson.date)} · {formatTime(attendanceLesson.startTime)}
                </p>
              </div>
            </div>
            <Select
              label={t('status')}
              options={[
                { value: 'PRESENT', label: t('present') },
                { value: 'ABSENT', label: t('absent') },
                { value: 'EXCUSED', label: t('excused') },
              ]}
              value={attForm.status}
              onChange={(e) => setAttForm((p) => ({ ...p, status: e.target.value }))}
            />
            <Textarea label={t('notePlaceholderTime')} rows={2} value={attForm.note} onChange={(e) => setAttForm((p) => ({ ...p, note: e.target.value }))} />
          </div>
        )}
      </Modal>
    </div>
  );
}