import { useState, type FormEvent } from 'react';
import { FileText, Paperclip, Upload } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert, InlineError } from '../../components/ui/ErrorAlert';
import { useT, type Dict } from '../../i18n';
import { useApi, errorMessage } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { StudentAssignment } from '../../lib/types';
import { formatDateTime } from '../../lib/format';

function submissionStatusKey(status: string): keyof Dict {
  switch (status) {
    case 'SUBMITTED':
      return 'submitted';
    case 'LATE':
      return 'late';
    case 'GRADED':
      return 'graded';
    case 'NOT_SUBMITTED':
      return 'notSubmitted';
    default:
      return 'status';
  }
}

export default function StudentAssignmentsPage() {
  const { t } = useT();
  const { user } = useAuth();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [active, setActive] = useState<StudentAssignment | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const studentId = user?.role === 'STUDENT' ? user.student.id : '';
  const { data, meta, loading, initialLoading, error, reload } = useApi(
    () => api.get<StudentAssignment[]>(`/assignments/students/${studentId}`, { page, limit: 20 }),
    [page, studentId],
  );

  const openSubmit = (a: StudentAssignment) => {
    setActive(a);
    setFile(null);
    setTextAnswer(a.submission?.textAnswer ?? '');
    setFormError('');
    setSubmitOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!active) return;
    if (!file && !textAnswer.trim()) {
      setFormError(t('uploadOrWriteAnswer'));
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (file) {
        const form = new FormData();
        form.append('file', file);
        await api.postForm(`/assignments/${active.id}/submit`, form);
      } else {
        await api.post(`/assignments/${active.id}/submit`, { textAnswer: textAnswer.trim() });
      }
      toast.success(t('homeworkSubmittedToast'));
      setSubmitOpen(false);
      reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title={t('homework')} subtitle={t('assignmentsFromTeachers')} />

      {error && <Alert message={error} className="mb-4" />}
      {loading && (initialLoading ? <PencilLoader label={t('loadingAssignments')} /> : <PencilLoader size="sm" label={t('loadingAssignments')} />)}

      {!loading && data && (
        <>
          {data.length === 0 ? (
            <EmptyState icon={FileText} title={t('noAssignments')} description={t('assignmentsShowUp')} />
          ) : (
            <div className="space-y-3">
              {data.map((a) => (
                <Card key={a.id} bodyClassName="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{a.title}</p>
                      {a.subject && <Badge tone="blue">{a.subject.name}</Badge>}
                      <Badge tone={statusTone(a.status)}>{t(submissionStatusKey(a.status))}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {a.teacher.fullName} · {t('due')} {formatDateTime(a.deadline)}
                    </p>
                    {a.submission?.grade !== null && a.submission?.grade !== undefined && (
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        {t('gradeLabel')}: <span className="font-semibold text-slate-900 dark:text-white">{a.submission.grade}/100</span>
                        {a.submission.feedback && <span className="text-slate-500"> · {a.submission.feedback}</span>}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant={a.submission ? 'outline' : 'primary'} onClick={() => openSubmit(a)}>
                    {a.submission ? t('viewResubmit') : t('submit')}
                  </Button>
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
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title={active?.title ?? t('submitHomework')}
        footer={
          <>
            <Button variant="outline" onClick={() => setSubmitOpen(false)} disabled={saving}>{t('cancel')}</Button>
            <Button onClick={submit} loading={saving}>
              <Upload className="h-4 w-4" /> {t('submit')}
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <InlineError message={formError} />
          {active?.submission && (
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300">
              <p className="font-medium text-slate-800 dark:text-slate-100">{t('lastSubmission')} · {formatDateTime(active.submission.submittedAt)}</p>
              {active.submission.file && (
                <a href={active.submission.file} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-brand-600 hover:underline">
                  <Paperclip className="h-3.5 w-3.5" /> {t('openSubmittedFile')}
                </a>
              )}
            </div>
          )}
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">{t('uploadFile')}</p>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-500 file:me-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> {t('or')} <span className="h-px flex-1 bg-slate-200" />
          </div>
          <Textarea
            label={t('writeAnswer')}
            rows={5}
            placeholder={t('typeYourAnswer')}
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
}
