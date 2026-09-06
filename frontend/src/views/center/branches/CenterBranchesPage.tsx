'use client';

import { useState } from 'react';
import {
  Plus,
  Edit,
  MapPin,
  Trash2,
} from 'lucide-react';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterModal } from '../ui/CenterModal';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { Alert } from '../../../components/ui/ErrorAlert';
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
      <CenterPageHeader
        title={t('branchesManagement')}
        description={t('branchesManagementSub')}
      >
        <button className="mj-btn mj-btn--primary" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" />
          {t('addBranch')}
        </button>
      </CenterPageHeader>

      {error && <Alert message={error} />}
      {loading && <PencilLoader label={t('loading')} />}

      {!loading && branches && branches.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <div key={branch.id} className="mj-card mj-card--padding">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="mj-avatar mj-avatar--md">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--mj-ink-strong)' }}>{branch.name}</h3>
                    <p className="text-sm" style={{ color: 'var(--mj-muted)' }}>{branch.address || t('noAddress')}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="mj-btn mj-btn--ghost mj-btn--sm" onClick={() => { setSelectedBranch(branch); setShowEditModal(true); }}>
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="mj-btn mj-btn--ghost mj-btn--sm" onClick={() => deleteBranch(branch.id)}>
                    <Trash2 className="h-4 w-4" style={{ color: 'var(--mj-danger)' }} />
                  </button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-4 text-center" style={{ borderColor: 'var(--mj-border-soft)' }}>
                <div>
                  <p className="text-lg font-bold" style={{ color: 'var(--mj-ink-strong)' }}>{branch.teacherCount}</p>
                  <p className="text-xs" style={{ color: 'var(--mj-muted)' }}>{t('teachers')}</p>
                </div>
                <div>
                  <p className="text-lg font-bold" style={{ color: 'var(--mj-ink-strong)' }}>{branch.roomCount}</p>
                  <p className="text-xs" style={{ color: 'var(--mj-muted)' }}>{t('classrooms')}</p>
                </div>
                <div>
                  <p className="text-lg font-bold" style={{ color: 'var(--mj-ink-strong)' }}>{branch.lessonCount}</p>
                  <p className="text-xs" style={{ color: 'var(--mj-muted)' }}>{t('lessons')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && branches?.length === 0 && (
        <div className="mj-card mj-empty">
          <MapPin className="mj-empty-icon" />
          <p className="font-medium">{t('noBranches')}</p>
          <p style={{ color: 'var(--mj-muted-2)' }}>{t('noBranchesDesc')}</p>
          <button className="mj-btn mj-btn--primary" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            {t('addBranch')}
          </button>
        </div>
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
    <CenterModal open={open} onClose={onClose} title={t('addBranch')} size="md"
      footer={<><button className="mj-btn mj-btn--ghost" onClick={onClose}>{t('cancel')}</button><button className="mj-btn mj-btn--primary" onClick={handleSubmit}>{saving ? t('loading') : t('save')}</button></>}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mj-field">
          <label className="mj-label">{t('branchName')}</label>
          <input className="mj-input" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('address')}</label>
          <input className="mj-input" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
        </div>
      </form>
    </CenterModal>
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
    <CenterModal open={open} onClose={onClose} title={t('editBranch')} size="md"
      footer={<><button className="mj-btn mj-btn--ghost" onClick={onClose}>{t('cancel')}</button><button className="mj-btn mj-btn--primary" onClick={handleSubmit}>{saving ? t('loading') : t('save')}</button></>}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mj-field">
          <label className="mj-label">{t('branchName')}</label>
          <input className="mj-input" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="mj-field">
          <label className="mj-label">{t('address')}</label>
          <input className="mj-input" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
        </div>
      </form>
    </CenterModal>
  );
}
