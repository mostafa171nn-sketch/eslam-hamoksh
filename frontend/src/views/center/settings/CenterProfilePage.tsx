'use client';

import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { Alert } from '../../../components/ui/ErrorAlert';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterPill } from '../ui/CenterPill';
import { api } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../i18n';

interface ProfilePhoto {
  url: string;
  isCover: boolean;
}

interface CenterProfileData {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  published: boolean;
  logoUrl: string | null;
  coverUrl: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  facebook: string | null;
  instagram: string | null;
  youtube: string | null;
  linkedin: string | null;
  whatsapp: string | null;
  workingHoursText: string | null;
  equipment: string[];
  photos: ProfilePhoto[];
  status: string;
  subscriptionStatus: string;
  stats: { totalRooms: number };
}

const EMPTY_PROFILE: CenterProfileData = {
  id: '',
  name: '',
  nameEn: null,
  slug: '',
  description: null,
  shortDescription: null,
  published: true,
  logoUrl: null,
  coverUrl: null,
  phone: null,
  email: null,
  website: null,
  city: null,
  address: null,
  latitude: null,
  longitude: null,
  facebook: null,
  instagram: null,
  youtube: null,
  linkedin: null,
  whatsapp: null,
  workingHoursText: null,
  equipment: [],
  photos: [],
  status: 'ACTIVE',
  subscriptionStatus: 'ACTIVE',
  stats: { totalRooms: 0 },
};

export default function CenterProfilePage() {
  const { t } = useT();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<CenterProfileData>(EMPTY_PROFILE);
  const [dirty, setDirty] = useState(false);

  const [equipmentInput, setEquipmentInput] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<CenterProfileData>('/center/account/profile');
      setForm(res.data);
      setDirty(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load center profile');
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof CenterProfileData>(key: K, value: CenterProfileData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        shortDescription: form.shortDescription,
        description: form.description,
        city: form.city,
        address: form.address,
        phone: form.phone,
        whatsapp: form.whatsapp,
        workingHoursText: form.workingHoursText,
        equipment: form.equipment,
      };
      await api.put('/center/account/profile', payload);
      toast.success(t('profileUpdated'));
      await loadProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    try {
      await api.put('/center/account/profile', { published: !form.published });
      setForm((prev) => ({ ...prev, published: !prev.published }));
      toast.success(form.published ? 'تم إيقاف النشر' : 'تم النشر');
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle publish');
    }
  };

  const handleAddEquipment = () => {
    const trimmed = equipmentInput.trim();
    if (!trimmed || form.equipment.includes(trimmed)) return;
    updateField('equipment', [...form.equipment, trimmed]);
    setEquipmentInput('');
  };

  const handleRemoveEquipment = (item: string) => {
    updateField('equipment', form.equipment.filter((e) => e !== item));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await api.postForm<ProfilePhoto[]>('/center/account/profile/photos', formData);
      setForm((prev) => ({ ...prev, photos: res.data }));
      setDirty(true);
      toast.success('تم رفع الصورة');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = async (index: number) => {
    try {
      const res = await api.delete<ProfilePhoto[]>(`/center/account/profile/photos/${index}`);
      setForm((prev) => ({ ...prev, photos: res.data }));
      setDirty(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const handleSetCover = async (index: number) => {
    try {
      const res = await api.patch<ProfilePhoto[]>(`/center/account/profile/photos/${index}/cover`);
      setForm((prev) => ({ ...prev, photos: res.data }));
      setDirty(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to set cover');
    }
  };

  if (loading) return <PencilLoader label={t('loading')} />;
  if (error) return <Alert message={error} />;

  const coverPhoto = form.photos.find((p) => p.isCover) ?? form.photos[0] ?? null;
  const roomsCount = form.stats.totalRooms;

  return (
    <div className="space-y-6">
      <CenterPageHeader
        eyebrow={t('publicPagePortal')}
        title={t('publicPageTitle')}
        description={t('publicPageDescription')}
      >
        <button
          type="button"
          className="mj-btn mj-btn--ghost mj-btn--sm"
          onClick={handleTogglePublish}
        >
          {form.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {form.published ? t('stopPublishing') : t('publish')}
        </button>
        <button
          type="button"
          className="mj-btn mj-btn--primary mj-btn--sm"
          onClick={handleSave}
          disabled={saving || !dirty}
        >
          {saving ? t('loading') : t('saveChanges')}
        </button>
      </CenterPageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main form area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Public display data */}
          <div className="mj-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="mj-title">{t('publicDisplayData')}</h2>
                <p className="text-sm text-[color:var(--mj-muted)]">{t('publicDisplayDataHint')}</p>
              </div>
              <CenterPill tone={form.published ? 'green' : 'amber'} dot>
                {form.published ? t('publishedBadge') : t('unpublishedBadge')}
              </CenterPill>
            </div>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="mj-field">
                  <label htmlFor="cp-name" className="mj-label">{t('centerNameField')}</label>
                  <input
                    id="cp-name"
                    className="mj-input"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                  />
                </div>
                <div className="mj-field">
                  <label htmlFor="cp-area" className="mj-label">{t('areaField')}</label>
                  <input
                    id="cp-area"
                    className="mj-input"
                    value={form.city || ''}
                    onChange={(e) => updateField('city', e.target.value)}
                  />
                </div>
              </div>
              <div className="mj-field">
                <label htmlFor="cp-short" className="mj-label">{t('shortTitleField')}</label>
                <input
                  id="cp-short"
                  className="mj-input"
                  value={form.shortDescription || ''}
                  onChange={(e) => updateField('shortDescription', e.target.value)}
                />
              </div>
              <div className="mj-field">
                <label htmlFor="cp-about" className="mj-label">{t('aboutField')}</label>
                <textarea
                  id="cp-about"
                  className="mj-textarea"
                  rows={3}
                  value={form.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                />
              </div>
              <div className="mj-field">
                <label htmlFor="cp-address" className="mj-label">{t('fullAddressField')}</label>
                <input
                  id="cp-address"
                  className="mj-input"
                  value={form.address || ''}
                  onChange={(e) => updateField('address', e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="mj-field">
                  <label htmlFor="cp-phone" className="mj-label">{t('phoneField')}</label>
                  <input
                    id="cp-phone"
                    className="mj-input"
                    value={form.phone || ''}
                    onChange={(e) => updateField('phone', e.target.value)}
                  />
                </div>
                <div className="mj-field">
                  <label htmlFor="cp-whatsapp" className="mj-label">{t('whatsappField')}</label>
                  <input
                    id="cp-whatsapp"
                    className="mj-input"
                    value={form.whatsapp || ''}
                    onChange={(e) => updateField('whatsapp', e.target.value)}
                  />
                </div>
              </div>
              <div className="mj-field">
                <label htmlFor="cp-hours" className="mj-label">{t('workingHoursField')}</label>
                <input
                  id="cp-hours"
                  className="mj-input"
                  value={form.workingHoursText || ''}
                  onChange={(e) => updateField('workingHoursText', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Equipment & Services */}
          <div className="mj-card p-5">
            <h3 className="mj-title mb-3">{t('equipmentAndServices')}</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {form.equipment.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--mj-surface-2)] px-3 py-1 text-sm font-medium text-[color:var(--mj-ink-strong)]"
                >
                  {item}
                  <button
                    type="button"
                    className="text-[color:var(--mj-muted)] hover:text-[color:var(--mj-danger)]"
                    onClick={() => handleRemoveEquipment(item)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="mj-input flex-1"
                placeholder={t('equipmentPlaceholder')}
                value={equipmentInput}
                onChange={(e) => setEquipmentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddEquipment();
                  }
                }}
              />
              <button
                type="button"
                className="mj-btn mj-btn--ghost mj-btn--sm"
                onClick={handleAddEquipment}
                disabled={!equipmentInput.trim()}
              >
                {t('add')}
              </button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <aside className="space-y-6">
          <div className="mj-card p-5">
            <h2 className="mj-title mb-1">{t('publicPreview')}</h2>
            <p className="text-sm text-[color:var(--mj-muted)] mb-4">{t('lastUpdatedNow')}</p>

            {/* Preview card */}
            <div className="rounded-xl overflow-hidden border border-[color:var(--mj-border)]">
              {/* Cover image */}
              <div className="relative aspect-video bg-[color:var(--mj-surface-2)]">
                {coverPhoto ? (
                  <img
                    src={coverPhoto.url}
                    alt={form.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-[color:var(--mj-muted)]">
                    <ImageIcon className="h-12 w-12" />
                  </div>
                )}
                <span className="absolute top-3 inset-inline-end-3 rounded-full bg-[color:var(--mj-success)] px-3 py-1 text-xs font-bold text-white">
                  {t('availableForBooking')}
                </span>
              </div>

              {/* Info */}
              <div className="p-4 space-y-3">
                {form.city && (
                  <span className="text-xs font-medium text-[color:var(--mj-muted)]">{form.city}</span>
                )}
                <h3 className="text-lg font-bold text-[color:var(--mj-ink-strong)]">{form.name}</h3>
                {form.shortDescription && (
                  <p className="text-sm font-bold text-[color:var(--mj-ink-strong)]">{form.shortDescription}</p>
                )}
                {form.description && (
                  <p className="text-sm text-[color:var(--mj-muted)]">{form.description}</p>
                )}
                <div className="flex flex-wrap gap-2 text-xs text-[color:var(--mj-muted)]">
                  {roomsCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--mj-surface-2)] px-2.5 py-1 font-medium">
                      {t('roomsCount', { count: roomsCount })}
                    </span>
                  )}
                  {form.workingHoursText && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--mj-surface-2)] px-2.5 py-1 font-medium">
                      {form.workingHoursText}
                    </span>
                  )}
                  {form.phone && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--mj-surface-2)] px-2.5 py-1 font-medium">
                      {form.phone}
                    </span>
                  )}
                </div>
                {form.equipment.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {form.equipment.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-[color:var(--mj-surface-2)] px-2.5 py-1 text-xs font-medium text-[color:var(--mj-ink-strong)]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
                <a
                  href="/rooms"
                  className="block text-center text-sm font-bold text-[color:var(--mj-link)] hover:underline pt-2"
                >
                  {t('viewRoomsAndSchedule')}
                </a>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Gallery section */}
      <div className="mj-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="mj-title">{t('galleryTitle')}</h2>
            <p className="text-sm text-[color:var(--mj-muted)]">{t('galleryDescription')}</p>
          </div>
          <button
            type="button"
            className="mj-btn mj-btn--ghost mj-btn--sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4" />
            {uploading ? t('loading') : t('addImage')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </div>

        {form.photos.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-[color:var(--mj-border)] p-8 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-[color:var(--mj-muted)] mb-3" />
            <p className="text-sm text-[color:var(--mj-muted)]">{t('noImagesYet')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {form.photos.map((photo, index) => (
              <div
                key={photo.url}
                className="rounded-xl border border-[color:var(--mj-border)] overflow-hidden"
              >
                <div className="aspect-video bg-[color:var(--mj-surface-2)]">
                  <img
                    src={photo.url}
                    alt={t('imageAlt', { name: form.name, index: index + 1 })}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-2 flex items-center justify-between gap-2">
                  <CenterPill tone={photo.isCover ? 'green' : 'slate'}>
                    {photo.isCover ? t('currentCover') : `${index + 1}`}
                  </CenterPill>
                  <div className="flex gap-1">
                    {!photo.isCover && (
                      <button
                        type="button"
                        className="mj-btn mj-btn--ghost mj-btn--sm !px-2"
                        onClick={() => handleSetCover(index)}
                      >
                        {t('setAsCover')}
                      </button>
                    )}
                    <button
                      type="button"
                      className="mj-btn mj-btn--ghost mj-btn--sm !px-2 text-[color:var(--mj-danger)]"
                      onClick={() => handleDeletePhoto(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}