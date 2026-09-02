'use client';

import { useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  BookOpen,
  Users,
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { useApi, errorMessage } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT, type DictKey } from '../../../i18n';

interface Classroom {
  id: string;
  name: string;
  capacity: number;
  branch: string | null;
  status: string;
}

export default function CenterClassroomsPage() {
  const { t } = useT();
  const toast = useToast();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Classroom | null>(null);

  const { data: rooms, loading, error, reload } = useApi<Classroom[]>(
    () => api.get<Classroom[]>('/center/account/classrooms'),
    []
  );

  const deleteRoom = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await api.delete(`/center/account/classrooms/${id}`);
      toast.success(t('roomDeleted'));
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('classrooms')}
        subtitle={t('classroomsSub')}
        action={
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            {t('addClassroom')}
          </Button>
        }
      />

      {loading && <PencilLoader label={t('loading')} />}
      {error && <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>}

      {!loading && rooms && rooms.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <Card key={room.id} bodyClassName="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{room.name}</h3>
                    <p className="text-xs text-slate-500">{room.branch || t('noBranch')}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedRoom(room); setShowEditModal(true); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteRoom(room.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3 dark:border-slate-700">
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Users className="h-4 w-4" />
                  {room.capacity} {t('capacity')}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  room.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' :
                  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                  {t(room.status.toLowerCase() as DictKey)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && rooms?.length === 0 && (
        <Card bodyClassName="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <BookOpen className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500">{t('noClassrooms')}</p>
            <Button className="mt-4" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" />
              {t('addClassroom')}
            </Button>
          </div>
        </Card>
      )}

      <AddRoomModal open={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); reload(); }} />
      {selectedRoom && (
        <EditRoomModal room={selectedRoom} open={showEditModal} onClose={() => { setShowEditModal(false); setSelectedRoom(null); }} onSuccess={() => { setShowEditModal(false); setSelectedRoom(null); reload(); }} />
      )}
    </div>
  );
}

function AddRoomModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', capacity: 20, branchId: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/center/account/classrooms', form);
      toast.success(t('roomCreated'));
      setForm({ name: '', capacity: 20, branchId: '' });
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('addClassroom')} size="md"
      footer={<><Button variant="outline" onClick={onClose}>{t('cancel')}</Button><Button onClick={handleSubmit} loading={saving}>{t('save')}</Button></>}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label={t('classroomName')} required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
        <Input label={t('capacity')} type="number" value={form.capacity} onChange={(e) => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 20 }))} />
      </form>
    </Modal>
  );
}

function EditRoomModal({ room, open, onClose, onSuccess }: { room: Classroom; open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { t } = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: room.name, capacity: room.capacity });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/center/account/classrooms/${room.id}`, form);
      toast.success(t('roomUpdated'));
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('editClassroom')} size="md"
      footer={<><Button variant="outline" onClick={onClose}>{t('cancel')}</Button><Button onClick={handleSubmit} loading={saving}>{t('save')}</Button></>}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label={t('classroomName')} required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
        <Input label={t('capacity')} type="number" value={form.capacity} onChange={(e) => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 20 }))} />
      </form>
    </Modal>
  );
}
