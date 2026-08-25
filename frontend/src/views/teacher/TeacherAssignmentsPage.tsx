import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ClipboardList, Paperclip, Plus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { MultiSelect } from '../../components/ui/MultiSelect';
import { Modal } from '../../components/ui/Modal';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert, InlineError } from '../../components/ui/ErrorAlert';
import { useApi, errorMessage } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { AssignmentSummary, TeacherStudent } from '../../lib/types';
import { formatDateTime, isOverdue } from '../../lib/format';

export default function TeacherAssignmentsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const { data, meta, loading, initialLoading, error, reload } = useApi(
    () => api.get<AssignmentSummary[]>('/assignments', { page, limit: 20 }),
    [page],
  );

  const { data: studentsData } = useApi(() => api.get<TeacherStudent[]>('/teachers/me/students', { page: 1, limit: 100 }), []);
  const students = studentsData ?? [];
  const subjects = user?.role === 'TEACHER' ? user.teacher.subjects : [];

  const [form, setForm] = useState({
    title: '',
    description: '',
    subjectId: '',
    deadline: '',
    allStudents: true,
    studentIds: [] as string[],
  });
  const [file, setFile] = useState<File | null>(null);

  const openCreate = () => {
    setForm({ title: '', description: '', subjectId: '', deadline: '', allStudents: true, studentIds: [] });
    setFile(null);
    setFormError('');
    setCreateOpen(true);
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.deadline) {
      setFormError('Title and deadline are required.');
      return;
    }
    if (!form.allStudents && form.studentIds.length === 0) {
      setFormError('Select at least one student or choose "All my students".');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const body = new FormData();
      body.append('title', form.title.trim());
      if (form.description.trim()) body.append('description', form.description.trim());
      if (form.subjectId) body.append('subjectId', form.subjectId);
      body.append('deadline', form.deadline);
      if (form.allStudents) {
        body.append('allStudents', 'true');
      } else {
        for (const id of form.studentIds) body.append('studentIds', id);
      }
      if (file) body.append('attachment', file);
      await api.postForm('/assignments', body);
      toast.success('Assignment created.');
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
        title="Assignments"
        subtitle="Create and track homework for your students."
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New assignment
          </Button>
        }
      />

      {error && <Alert message={error} className="mb-4" />}
      {loading && (initialLoading ? <PencilLoader label="Loading assignments…" /> : <PencilLoader size="sm" label="Loading assignments…" />)}

      {!loading && data && (
        <>
          {data.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No assignments" description="Create your first homework assignment." />
          ) : (
            <div className="space-y-3">
              {data.map((a) => {
                const overdue = isOverdue(a.deadline);
                return (
                  <Card key={a.id} bodyClassName="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{a.title}</p>
                        {a.subject && <Badge tone="blue">{a.subject.name}</Badge>}
                        {overdue ? <StatusBadge status="NOT_SUBMITTED" /> : <StatusBadge status="SCHEDULED" />}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Deadline: {formatDateTime(a.deadline)} · {a.studentCount} students · {a.submittedCount} submitted
                      </p>
                      {a.attachment && (
                        <a
                          href={a.attachment}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                        >
                          <Paperclip className="h-3.5 w-3.5" /> Attachment
                        </a>
                      )}
                    </div>
                    <Link href={`/teacher/assignments/${a.id}/submissions`}>
                      <Button size="sm" variant="outline">
                        Review submissions
                      </Button>
                    </Link>
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

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New assignment"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={create} loading={saving}>Create assignment</Button>
          </>
        }
      >
        <form onSubmit={create} className="space-y-4">
          <InlineError message={formError} />
          <Input label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <Textarea label="Description (optional)" rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Subject"
              options={subjects.map((s) => ({ value: s.id, label: s.name }))}
              value={form.subjectId}
              onChange={(e) => setForm((p) => ({ ...p, subjectId: e.target.value }))}
              placeholder="No subject"
            />
            <Input label="Deadline" type="datetime-local" value={form.deadline} onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))} />
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.allStudents}
                onChange={(e) => setForm((p) => ({ ...p, allStudents: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Assign to all my students
            </label>
            {!form.allStudents && (
              <div className="mt-3">
                <MultiSelect
                  label="Students"
                  options={students.map((s) => ({ value: s.id, label: s.fullName }))}
                  selected={form.studentIds}
                  onChange={(v) => setForm((p) => ({ ...p, studentIds: v }))}
                />
              </div>
            )}
          </div>
          <Input
            label="Attachment (optional)"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </form>
      </Modal>
    </div>
  );
}
