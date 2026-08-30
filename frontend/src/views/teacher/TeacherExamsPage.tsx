import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { MultiSelect } from '../../components/ui/MultiSelect';
import { Modal } from '../../components/ui/Modal';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert, InlineError } from '../../components/ui/ErrorAlert';
import { useApi, errorMessage } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useT } from '../../i18n';
import type { Exam, ExamQuestionType, TeacherStudent } from '../../lib/types';
import { formatDateTime } from '../../lib/format';

interface QRow {
  type: ExamQuestionType;
  question: string;
  options: string;
  correctAnswer: string;
  points: string;
}

const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/;

function toIsoDate(value: string): string | null {
  const v = value.trim();
  if (!v || !DATETIME_RE.test(v)) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function TeacherExamsPage() {
  const { t } = useT();
  const { user } = useAuth();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const { data, meta, loading, initialLoading, error, reload } = useApi(
    () => api.get<Exam[]>('/exams', { page, limit: 20 }),
    [page],
  );

  const { data: studentsData } = useApi(() => api.get<TeacherStudent[]>('/teachers/me/students', { page: 1, limit: 100 }), []);
  const students = studentsData ?? [];
  const subjects = user?.role === 'TEACHER' ? user.teacher.subjects : [];

  const typeOptions = [
    { value: 'MULTIPLE_CHOICE', label: t('multipleChoice') },
    { value: 'TRUE_FALSE', label: t('trueFalse') },
    { value: 'WRITTEN', label: t('written') },
  ];

  const [form, setForm] = useState({
    name: '',
    description: '',
    subjectId: '',
    startTime: '',
    endTime: '',
    durationMinutes: '60',
    allStudents: true,
    studentIds: [] as string[],
  });
  const [questions, setQuestions] = useState<QRow[]>([{ type: 'MULTIPLE_CHOICE', question: '', options: '', correctAnswer: '', points: '1' }]);
  const startTimeInputRef = useRef<HTMLInputElement>(null);
  const endTimeInputRef = useRef<HTMLInputElement>(null);

  const openCreate = () => {
    setForm({ name: '', description: '', subjectId: '', startTime: '', endTime: '', durationMinutes: '60', allStudents: true, studentIds: [] });
    setQuestions([{ type: 'MULTIPLE_CHOICE', question: '', options: '', correctAnswer: '', points: '1' }]);
    setFormError('');
    setCreateOpen(true);
  };

  const setQ = (i: number, patch: Partial<QRow>) => {
    setQuestions((prev) => prev.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { type: 'MULTIPLE_CHOICE', question: '', options: '', correctAnswer: '', points: '1' }]);
  };

  const removeQuestion = (i: number) => {
    setQuestions((prev) => prev.filter((_, j) => j !== i));
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const startTime =
      startTimeInputRef.current?.value && !DATETIME_RE.test(form.startTime)
        ? startTimeInputRef.current.value
        : form.startTime;
    const endTime =
      endTimeInputRef.current?.value && !DATETIME_RE.test(form.endTime)
        ? endTimeInputRef.current.value
        : form.endTime;
    const startTimeIso = toIsoDate(startTime);
    const endTimeIso = toIsoDate(endTime);
    const durationMinutes = Number(form.durationMinutes);
    if (!form.name.trim() || !startTimeIso || !endTimeIso) {
      setFormError(t('nameWindowRequired'));
      return;
    }
    if (new Date(startTimeIso).getTime() >= new Date(endTimeIso).getTime()) {
      setFormError(t('endAfterStart'));
      return;
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 24 * 60) {
      setFormError(t('durationRange'));
      return;
    }
    if (!form.allStudents && form.studentIds.length === 0) {
      setFormError(t('selectStudentsOrAll'));
      return;
    }
    const cleanQuestions = questions
      .filter((q) => q.question.trim())
      .map((q) => ({
        type: q.type,
        question: q.question.trim(),
        options:
          q.type === 'MULTIPLE_CHOICE'
            ? q.options
                .split('\n')
                .map((o) => o.trim())
                .filter(Boolean)
            : undefined,
        correctAnswer: q.type === 'WRITTEN' ? undefined : q.correctAnswer.trim(),
        points: Number(q.points) || 1,
      }));
    if (cleanQuestions.length === 0) {
      setFormError(t('addQuestionFirst'));
      return;
    }
    for (const q of cleanQuestions) {
      if (q.type === 'MULTIPLE_CHOICE' && (!q.options || q.options.length < 2)) {
        setFormError(t('needsOptions', { q: q.question.slice(0, 30) }));
        return;
      }
      if (q.type !== 'WRITTEN' && !q.correctAnswer) {
        setFormError(t('needsCorrectAnswer', { q: q.question.slice(0, 30) }));
        return;
      }
      if (q.type === 'MULTIPLE_CHOICE' && q.options && q.correctAnswer && !q.options.includes(q.correctAnswer)) {
        setFormError(t('mustBeOneOfOptions', { q: q.question.slice(0, 30) }));
        return;
      }
    }

    setSaving(true);
    setFormError('');
    try {
      await api.post('/exams', {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        subjectId: form.subjectId || undefined,
        startTime: startTimeIso,
        endTime: endTimeIso,
        durationMinutes,
        allStudents: form.allStudents,
        studentIds: form.allStudents ? undefined : form.studentIds,
        questions: cleanQuestions,
      });
      toast.success(t('examCreatedToast'));
      setCreateOpen(false);
      reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={t('exams')}
        subtitle={t('examsTeacherSub')}
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> {t('newExam')}
          </Button>
        }
      />

      {error && <Alert message={error} className="mb-4" />}
      {loading && (initialLoading ? <PencilLoader label={t('loadingExams')} /> : <PencilLoader size="sm" label={t('loadingExams')} />)}

      {!loading && data && (
        <>
          {data.length === 0 ? (
            <EmptyState icon={FileText} title={t('noExams')} description={t('teacherCreateFirstExam')} />
          ) : (
            <div className="space-y-3">
              {data.map((e) => (
                <Card key={e.id} bodyClassName="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{e.name}</p>
                      {e.subject && <Badge tone="blue">{e.subject.name}</Badge>}
                      <Badge tone={statusTone(e.isActive ? 'ACTIVE' : e.isUpcoming ? 'UPCOMING' : 'COMPLETED')}>
                        {e.isActive ? t('activeNow') : e.isUpcoming ? t('upcoming') : t('ended')}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(e.startTime)} → {formatDateTime(e.endTime)} · {t('examDurationMinutes', { count: e.durationMinutes })} ·{' '}
                      {t('examQuestionsCount', { count: e.questions.length })} · {t('examStudentsCount', { count: e.students.length })}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Link href={`/teacher/exams/${e.id}/results`}>
                      <Button size="sm" variant="outline">
                        {t('resultsBtn')}
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
          <div className="mt-4">
            <Pagination page={page} totalPages={meta?.totalPages ?? 1} onChange={setPage} />
          </div>
        </>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('newExam')}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>{t('cancel')}</Button>
            <Button onClick={create} loading={saving}>{t('createExam')}</Button>
          </>
        }
      >
        <form onSubmit={create} className="space-y-5">
          <InlineError message={formError} />
          <div className="space-y-4">
            <Input label={t('examName')} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <Textarea label={t('descriptionOptional')} rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label={t('subject')}
                options={subjects.map((s) => ({ value: s.id, label: s.name }))}
                value={form.subjectId}
                onChange={(e) => setForm((p) => ({ ...p, subjectId: e.target.value }))}
                placeholder={t('noSubject')}
              />
              <Input
                label={t('durationMinutes')}
                type="number"
                min={1}
                value={form.durationMinutes}
                onChange={(e) => setForm((p) => ({ ...p, durationMinutes: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label={t('startsAt')}
                type="datetime-local"
                inputRef={startTimeInputRef}
                value={form.startTime}
                onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                onBlur={(e) => setForm((p) => (e.target.value !== p.startTime ? { ...p, startTime: e.target.value } : p))}
              />
              <Input
                label={t('endsAt')}
                type="datetime-local"
                inputRef={endTimeInputRef}
                value={form.endTime}
                onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                onBlur={(e) => setForm((p) => (e.target.value !== p.endTime ? { ...p, endTime: e.target.value } : p))}
              />
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.allStudents}
                  onChange={(e) => setForm((p) => ({ ...p, allStudents: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                {t('assignAllStudents')}
              </label>
              {!form.allStudents && (
                <div className="mt-3">
                  <MultiSelect
                    label={t('studentsLabel')}
                    options={students.map((s) => ({ value: s.id, label: s.fullName }))}
                    selected={form.studentIds}
                    onChange={(v) => setForm((p) => ({ ...p, studentIds: v }))}
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">{t('questionsCount')}</p>
              <Button size="sm" variant="secondary" onClick={addQuestion}>
                <Plus className="h-3.5 w-3.5" /> {t('addQuestion')}
              </Button>
            </div>
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={i} className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-slate-400">{t('questionNumber', { n: i + 1 })}</span>
                    {questions.length > 1 && (
                      <button type="button" onClick={() => removeQuestion(i)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={t('removeQuestion')}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
                    <Select
                      options={typeOptions}
                      value={q.type}
                      onChange={(e) => setQ(i, { type: e.target.value as ExamQuestionType, correctAnswer: e.target.value === 'WRITTEN' ? '' : q.correctAnswer })}
                    />
                    <Input type="number" min={1} label={t('points')} value={q.points} onChange={(e) => setQ(i, { points: e.target.value })} />
                  </div>
                  <Textarea label={t('question')} rows={2} value={q.question} onChange={(e) => setQ(i, { question: e.target.value })} />
                  {q.type === 'MULTIPLE_CHOICE' && (
                    <Textarea
                      label={t('optionsOnePerLine')}
                      rows={3}
                      value={q.options}
                      onChange={(e) => setQ(i, { options: e.target.value })}
                    />
                  )}
                  {q.type !== 'WRITTEN' && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {q.type === 'TRUE_FALSE' ? (
                        <Select
                          label={t('correctAnswerLabel')}
                          options={[
                            { value: 'true', label: t('trueOption') },
                            { value: 'false', label: t('falseOption') },
                          ]}
                          value={q.correctAnswer}
                          onChange={(e) => setQ(i, { correctAnswer: e.target.value })}
                        />
                      ) : (
                        <Input
                          label={t('correctAnswerLabel')}
                          value={q.correctAnswer}
                          onChange={(e) => setQ(i, { correctAnswer: e.target.value })}
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}