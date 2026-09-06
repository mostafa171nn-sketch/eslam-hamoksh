'use client';

import { useState, useEffect } from 'react';
import {
  Edit,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { Alert } from '../../../components/ui/ErrorAlert';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterStatCard } from '../ui/CenterStatCard';
import { CenterPill } from '../ui/CenterPill';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useT } from '../../../i18n';

interface CenterProfile {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  description: string | null;
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
  status: string;
  subscriptionStatus: string;
  workingHours: {
    [key: string]: { open: string; close: string; closed: boolean } | null;
  };
  stats: {
    totalTeachers: number;
    totalStudents: number;
    totalEmployees: number;
    totalBranches: number;
    totalRooms: number;
  };
}

const DAYS = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
];

const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function CenterProfilePage() {
  const { t, dir } = useT();
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const toast = useToast();
  const { center } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<CenterProfile | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<CenterProfile>>({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<CenterProfile>('/center/account/profile');
      setProfile(res.data);
      setForm(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load center profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (_section: string) => {
    setSaving(true);
    try {
      await api.put('/center/account/profile', form);
      toast.success(t('profileSaved'));
      setEditingSection(null);
      loadProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: string, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  if (loading) return <PencilLoader label={t('loading')} />;
  if (error) return <Alert message={error} />;
  if (!profile) return null;

  const editActions = (section: string) =>
    editingSection === section ? (
      <div className="flex gap-2">
        <button type="button" className="mj-btn mj-btn--ghost mj-btn--sm" onClick={() => { setEditingSection(null); setForm(profile); }}>
          <X className="h-4 w-4" />
        </button>
        <button type="button" className="mj-btn mj-btn--primary mj-btn--sm" onClick={() => handleSave(section)} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? t('loading') : t('save')}
        </button>
      </div>
    ) : (
      <button type="button" className="mj-btn mj-btn--ghost mj-btn--sm" onClick={() => setEditingSection(section)}>
        <Edit className="h-4 w-4" /> {t('edit')}
      </button>
    );

  return (
    <div className="space-y-6">
      <CenterPageHeader
        eyebrow={t('centerDashboard')}
        title={t('centerProfile')}
        description={center?.name || ''}
      />

      <div className={`flex items-center justify-between gap-3 rounded-xl p-4 ${
        profile.status === 'ACTIVE'
          ? 'bg-[color:var(--mj-success-soft)] border border-[color:var(--mj-success)]/30'
          : 'bg-[color:var(--mj-amber-soft)] border border-[color:var(--mj-amber)]/30'
      }`}>
        <div className="flex items-center gap-3">
          {profile.status === 'ACTIVE' ? (
            <CheckCircle className="h-6 w-6 text-[color:var(--mj-success)]" />
          ) : (
            <AlertCircle className="h-6 w-6 text-[color:var(--mj-amber)]" />
          )}
          <div>
            <p className="font-bold text-[color:var(--mj-ink-strong)]">
              {profile.status === 'ACTIVE' ? t('centerActive') : t('centerPending')}
            </p>
            <p className="text-sm text-[color:var(--mj-muted)]">
              {profile.subscriptionStatus === 'ACTIVE' ? t('subscriptionActive') : t('subscriptionInactive')}
            </p>
          </div>
        </div>
        <CenterPill tone={profile.status === 'ACTIVE' ? 'green' : 'amber'}>{profile.status}</CenterPill>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <CenterStatCard value={profile.stats.totalBranches} label={t('branches')} />
        <CenterStatCard value={profile.stats.totalTeachers} label={t('teachers')} />
        <CenterStatCard value={profile.stats.totalStudents} label={t('students')} />
        <CenterStatCard value={profile.stats.totalEmployees} label={t('employees')} />
        <CenterStatCard value={profile.stats.totalRooms} label={t('classrooms')} />
        <CenterStatCard value="4.5" label={t('rating')} />
      </div>

      <div className="mj-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="mj-title">{t('basicInformation')}</h2>
          {editActions('basic')}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="mj-field">
            <label className="mj-label">{t('centerName')}</label>
            <input
              className="mj-input"
              value={form.name || ''}
              onChange={(e) => setField('name', e.target.value)}
              disabled={editingSection !== 'basic'}
            />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('centerNameEn')}</label>
            <input
              className="mj-input"
              value={form.nameEn || ''}
              onChange={(e) => setField('nameEn', e.target.value)}
              disabled={editingSection !== 'basic'}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mj-label">{t('description')}</label>
            <textarea
              className="mj-textarea"
              rows={3}
              value={form.description || ''}
              onChange={(e) => setField('description', e.target.value)}
              disabled={editingSection !== 'basic'}
            />
          </div>
        </div>
      </div>

      <div className="mj-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="mj-title">{t('contactInformation')}</h2>
          {editActions('contact')}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="mj-field">
            <label className="mj-label">{t('phone')}</label>
            <input
              className="mj-input"
              value={form.phone || ''}
              onChange={(e) => setField('phone', e.target.value)}
              disabled={editingSection !== 'contact'}
            />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('whatsapp')}</label>
            <input
              className="mj-input"
              value={form.whatsapp || ''}
              onChange={(e) => setField('whatsapp', e.target.value)}
              disabled={editingSection !== 'contact'}
            />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('email')}</label>
            <input
              className="mj-input"
              type="email"
              value={form.email || ''}
              onChange={(e) => setField('email', e.target.value)}
              disabled={editingSection !== 'contact'}
            />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('website')}</label>
            <input
              className="mj-input"
              value={form.website || ''}
              onChange={(e) => setField('website', e.target.value)}
              disabled={editingSection !== 'contact'}
            />
          </div>
        </div>
      </div>

      <div className="mj-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="mj-title">{t('location')}</h2>
          {editActions('location')}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="mj-field">
            <label className="mj-label">{t('city')}</label>
            <input
              className="mj-input"
              value={form.city || ''}
              onChange={(e) => setField('city', e.target.value)}
              disabled={editingSection !== 'location'}
            />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('address')}</label>
            <input
              className="mj-input"
              value={form.address || ''}
              onChange={(e) => setField('address', e.target.value)}
              disabled={editingSection !== 'location'}
            />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('latitude')}</label>
            <input
              className="mj-input"
              type="number"
              step="any"
              value={form.latitude || ''}
              onChange={(e) => setField('latitude', e.target.value ? parseFloat(e.target.value) : null)}
              disabled={editingSection !== 'location'}
            />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('longitude')}</label>
            <input
              className="mj-input"
              type="number"
              step="any"
              value={form.longitude || ''}
              onChange={(e) => setField('longitude', e.target.value ? parseFloat(e.target.value) : null)}
              disabled={editingSection !== 'location'}
            />
          </div>
        </div>
      </div>

      <div className="mj-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="mj-title">{t('workingHours')}</h2>
          {editActions('hours')}
        </div>
        <div className="space-y-3">
          {DAYS.map((day, index) => {
            const hours = form.workingHours?.[day];
            return (
              <div key={day} className="flex items-center gap-4">
                <span className="w-24 text-sm font-medium text-[color:var(--mj-ink-strong)]">{DAYS_AR[index]}</span>
                {editingSection === 'hours' ? (
                  <>
                    <label className="flex items-center gap-2 text-sm text-[color:var(--mj-ink)]">
                      <input
                        type="checkbox"
                        checked={!hours?.closed}
                        onChange={(e) => {
                          const newHours = { ...form.workingHours };
                          if (e.target.checked) {
                            newHours[day] = { open: '09:00', close: '21:00', closed: false };
                          } else {
                            newHours[day] = null;
                          }
                          setField('workingHours', newHours);
                        }}
                        className="accent-[color:var(--mj-accent)]"
                      />
                      {t('open')}
                    </label>
                    {hours && !hours.closed && (
                      <>
                        <input
                          type="time"
                          className="mj-input w-32"
                          value={hours.open}
                          onChange={(e) => {
                            const newHours = { ...form.workingHours, [day]: { ...hours, open: e.target.value } };
                            setField('workingHours', newHours);
                          }}
                        />
                        <Arrow className="h-4 w-4 text-[color:var(--mj-muted)]" />
                        <input
                          type="time"
                          className="mj-input w-32"
                          value={hours.close}
                          onChange={(e) => {
                            const newHours = { ...form.workingHours, [day]: { ...hours, close: e.target.value } };
                            setField('workingHours', newHours);
                          }}
                        />
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-[color:var(--mj-ink)]">
                    {hours?.closed ? t('closed') : `${hours?.open} → ${hours?.close}`}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mj-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="mj-title">{t('socialMedia')}</h2>
          {editActions('social')}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="mj-field">
            <label className="mj-label">{t('facebook')}</label>
            <input
              className="mj-input"
              value={form.facebook || ''}
              onChange={(e) => setField('facebook', e.target.value)}
              disabled={editingSection !== 'social'}
            />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('instagram')}</label>
            <input
              className="mj-input"
              value={form.instagram || ''}
              onChange={(e) => setField('instagram', e.target.value)}
              disabled={editingSection !== 'social'}
            />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('youtube')}</label>
            <input
              className="mj-input"
              value={form.youtube || ''}
              onChange={(e) => setField('youtube', e.target.value)}
              disabled={editingSection !== 'social'}
            />
          </div>
          <div className="mj-field">
            <label className="mj-label">{t('linkedin')}</label>
            <input
              className="mj-input"
              value={form.linkedin || ''}
              onChange={(e) => setField('linkedin', e.target.value)}
              disabled={editingSection !== 'social'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
