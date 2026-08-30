import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert, InlineError } from '../../components/ui/ErrorAlert';
import { useApi, errorMessage } from '../../hooks/useApi';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useT } from '../../i18n';
import { Tags } from 'lucide-react';

interface Field {
  key: string;
  label: string;
  type: 'text' | 'number' | 'textarea';
  required?: boolean;
}

interface Row {
  id: string;
  [key: string]: unknown;
}

export default function CatalogManager({
  title,
  subtitle,
  endpoint,
  fields,
  addLabel,
}: {
  title: string;
  subtitle: string;
  endpoint: string;
  fields: Field[];
  addLabel: string;
}) {
  const { t } = useT();
  const toast = useToast();
  const { data, loading, initialLoading, error, reload } = useApi(() => api.get<Row[]>(endpoint), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm({});
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (row: Row) => {
    setEditing(row);
    const initial: Record<string, string> = {};
    for (const f of fields) initial[f.key] = String(row[f.key] ?? '');
    setForm(initial);
    setFormError('');
    setModalOpen(true);
  };

  const save = async () => {
    const payload: Record<string, string | number> = {};
    for (const f of fields) {
      const val = form[f.key]?.trim() ?? '';
      if (f.required && !val) {
        setFormError(t('fieldRequired', { f: f.label }));
        return;
      }
      payload[f.key] = f.type === 'number' ? Number(val) : val;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        await api.put(`${endpoint}/${editing.id}`, payload);
        toast.success(t('updated'));
      } else {
        await api.post(endpoint, payload);
        toast.success(t('created'));
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.delete(`${endpoint}/${deleting.id}`);
      toast.success(t('deleted'));
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> {addLabel}
          </Button>
        }
      />

      {error && <Alert message={error} className="mb-4" />}
      {loading && <PencilLoader label={t('loading')} size={initialLoading ? undefined : 'sm'} />}

      {!loading && data && (
        <>
          {data.length === 0 ? (
            <EmptyState
              icon={Tags}
              title={t('noItemsYet', { t: title.toLowerCase() })}
              description={t('createFirstUsingButton')}
            />
          ) : (
            <Card>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {data.map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900 dark:text-white">{String(row.name ?? '')}</p>
                      {fields.length > 1 && (
                        <p className="mt-0.5 truncate text-sm text-slate-500">
                          {fields
                            .filter((f) => f.key !== 'name')
                            .map((f) => `${f.label}: ${String(row[f.key] ?? '—')}`)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => openEdit(row)}
                        className="rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-300"
                        aria-label={t('edit')}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(row)}
                        className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label={t('delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('editItem', { t: title }) : addLabel}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              {t('cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {editing ? t('saveChanges') : t('create')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <InlineError message={formError} />
          {fields.map((f) =>
            f.type === 'textarea' ? (
              <Textarea
                key={f.key}
                label={f.label}
                rows={3}
                value={form[f.key] ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
              />
            ) : (
              <Input
                key={f.key}
                label={f.label}
                type={f.type === 'number' ? 'number' : 'text'}
                required={f.required}
                value={form[f.key] ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
              />
            ),
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={doDelete}
        loading={deleteBusy}
        title={t('deleteItem')}
        message={t('deleteConfirm', { name: String(deleting?.name ?? '') })}
        confirmLabel={t('delete')}
      />
    </div>
  );
}
