'use client';

import { useState } from 'react';
import {
  Plus,
  Edit,
  MapPin,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { Alert } from '../../../components/ui/ErrorAlert';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useApi, errorMessage } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../i18n';

interface Branch {
  id: string;
  name: string;
  address: string | null;
  teacherCount: number;
  roomCount: number;
  lessonCount: number;
  employeeCount: number;
  createdAt: string;
}

export default function CenterBranchesPage() {
  const { t } = useT();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  const { data: branches, loading, error, reload } = useApi<Branch[]>(
    () => api.get<Branch[]>('/center/branches'),
    []
  );

  const deleteBranch = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await api.delete(`/center/branches/${id}`);
      reload();
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('branchesManagement')}
        subtitle={t('branchesManagementSub')}
        action={
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            {t('addBranch')}
          </Button>
        }
      />

      {error && <Alert message={error} />}
      {loading && <PencilLoader label={t('loading')} />}

      {!loading && branches && branches.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <Card key={branch.id} bodyClassName="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{branch.name}</h3>
                    <p className="text-sm text-slate-500">{branch.address || t('noAddress')}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedBranch(branch); setShowEditModal(true); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteBranch(branch.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center dark:border-slate-700">
                <div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{branch.teacherCount}</p>
                  <p className="text-xs text-slate-500">{t('teachers')}</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{branch.roomCount}</p>
                  <p className="text-xs text-slate-500">{t('classrooms')}</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{branch.lessonCount}</p>
                  <p className="text-xs text-slate-500">{t('lessons')}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && branches?.length === 0 && (
        <EmptyState icon={MapPin} title={t('noBranches')} description={t('noBranchesDesc')}
          action={<Button onClick={() => setShowAddModal(true)}><Plus className="h-4 w-4" />{t('addBranch')}</Button>}
        />
      )}

      <AddBranchModal open={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); reload(); }} />
      {selectedBranch && (
        <EditBranchModal branch={selectedBranch} open={showEditModal} onClose={() => { setShowEditModal(false); setSelectedBranch(null); }} onSuccess={() => { setShowEditModal(false); setSelectedBranch(null); reload(); }} />
      )}
    </div>
  );
}

function AddBranchModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', address: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/center/branches', form);
      toast.success(t('branchCreated'));
      setForm({ name: '', address: '' });
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('addBranch')} size="md"
      footer={<><Button variant="outline" onClick={onClose}>{t('cancel')}</Button><Button onClick={handleSubmit} loading={saving}>{t('save')}</Button></>}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label={t('branchName')} required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
        <Input label={t('address')} value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
      </form>
    </Modal>
  );
}

function EditBranchModal({ branch, open, onClose, onSuccess }: { branch: Branch; open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: branch.name, address: branch.address || '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/center/branches/${branch.id}`, form);
      toast.success(t('branchUpdated'));
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('editBranch')} size="md"
      footer={<><Button variant="outline" onClick={onClose}>{t('cancel')}</Button><Button onClick={handleSubmit} loading={saving}>{t('save')}</Button></>}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label={t('branchName')} required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
        <Input label={t('address')} value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
      </form>
    </Modal>
  );
}
