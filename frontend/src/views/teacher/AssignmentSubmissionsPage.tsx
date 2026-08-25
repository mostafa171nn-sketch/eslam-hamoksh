import { useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, Paperclip, XCircle } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Pagination } from '../../components/ui/Pagination';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/ErrorAlert';
import { useApi, errorMessage } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import type { SubmissionRow } from '../../lib/types';
import { formatDateTime } from '../../lib/format';
import { ClipboardList } from 'lucide-react';

interface AssignmentDetail {
  id: string;
  title: string;
}

export default function AssignmentSubmissionsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [grading, setGrading] = useState<{ row: SubmissionRow; grade: string; feedback: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: assignment } = useApi(() => api.get<AssignmentDetail>(`/assignments/${id}`), [id]);
  const { data, meta, loading, initialLoading, error, reload } = useApi(
    () => api.get<SubmissionRow[]>(`/assignments/${id}/submissions`, { page, limit: 20 }),
    [id, page],
  );

  const openGrading = (row: SubmissionRow) => {
    setGrading({ row, grade: row.submission?.grade?.toString() ?? '', feedback: row.submission?.feedback ?? '' });
  };

  const saveGrade = async () => {
    if (!grading) return;
    setSaving(true);
    try {
      await api.put(`/assignments/submissions/${grading.row.submission!.id}/grade`, {
        grade: Number(grading.grade),
        feedback: grading.feedback.trim() || undefined,
      });
      toast.success('Submission graded.');
      setGrading(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={assignment ? assignment.title : 'Submissions'}
        subtitle="Review and grade student homework."
      />

      {error && <Alert message={error} className="mb-4" />}
      {loading && (initialLoading ? <PencilLoader label="Loading submissions…" /> : <PencilLoader size="sm" label="Loading submissions…" />)}

      {!loading && data && (
        <>
          {data.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No students assigned" description="This assignment has no assigned students yet." />
          ) : (
            <div className="space-y-3">
              {data.map((row) => {
                const sub = row.submission;
                return (
                  <Card key={row.student.id} bodyClassName="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <Avatar name={row.student.fullName} src={row.student.photo} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{row.student.fullName}</p>
                          <StatusBadge status={row.status} />
                        </div>
                        {sub ? (
                          <>
                            <p className="mt-0.5 text-xs text-slate-500">Submitted {formatDateTime(sub.submittedAt)}</p>
                            {sub.textAnswer && <p className="mt-1 line-clamp-2 rounded bg-slate-50 dark:bg-slate-800 p-2 text-xs text-slate-600 dark:text-slate-300">{sub.textAnswer}</p>}
                            <div className="mt-1 flex flex-wrap items-center gap-3">
                              {sub.file && (
                                <a href={sub.file} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                                  <Paperclip className="h-3.5 w-3.5" /> Download file
                                </a>
                              )}
                              {sub.grade !== null && (
                                <Badge tone={sub.grade >= 50 ? 'green' : 'red'}>Grade: {sub.grade}/100</Badge>
                              )}
                              {sub.feedback && <span className="text-xs text-slate-500">"{sub.feedback}"</span>}
                            </div>
                          </>
                        ) : (
                          <p className="mt-1 text-xs text-slate-400">Not submitted yet.</p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {sub ? (
                        <Button size="sm" variant="outline" onClick={() => openGrading(row)}>
                          {sub.grade !== null ? 'Update grade' : 'Grade'}
                        </Button>
                      ) : null}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          <div className="mt-4">
            <Pagination page={page} totalPages={meta?.totalPages ?? 1} onChange={setPage} />
          </div>
        </>
      )}

      {grading && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setGrading(null)} />
          <div className="animate-slide-in relative w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Grade submission</h2>
              <button onClick={() => setGrading(null)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-500">{grading.row.student.fullName}</p>
            <div className="mt-4 space-y-4">
              <Input
                label="Grade (0–100)"
                type="number"
                min={0}
                max={100}
                value={grading.grade}
                onChange={(e) => setGrading((p) => (p ? { ...p, grade: e.target.value } : p))}
              />
              <Textarea
                label="Feedback (optional)"
                rows={3}
                value={grading.feedback}
                onChange={(e) => setGrading((p) => (p ? { ...p, feedback: e.target.value } : p))}
              />
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setGrading(null)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={saveGrade} loading={saving} disabled={grading.grade === ''}>
                  <CheckCircle2 className="h-4 w-4" /> Save grade
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
