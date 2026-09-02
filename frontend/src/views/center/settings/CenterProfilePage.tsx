'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Edit,
  Save,
  X,
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  MessageCircle,
  Star,
  Users,
  BookOpen,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { Alert } from '../../../components/ui/ErrorAlert';
import { Badge } from '../../../components/ui/Badge';
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
  const { t } = useT();
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
      const res = await api.get<CenterProfile>('/center/profile');
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
      await api.put('/center/profile', form);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('centerProfile')}
        subtitle={center?.name || ''}
      />

      {/* Status Banner */}
      <div className={`rounded-xl p-4 ${
        profile.status === 'ACTIVE' 
          ? 'bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20'
          : 'bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {profile.status === 'ACTIVE' ? (
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-amber-600" />
            )}
            <div>
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                {profile.status === 'ACTIVE' ? t('centerActive') : t('centerPending')}
              </p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                {profile.subscriptionStatus === 'ACTIVE' ? t('subscriptionActive') : t('subscriptionInactive')}
              </p>
            </div>
          </div>
          <Badge tone={profile.status === 'ACTIVE' ? 'green' : 'amber'}>
            {profile.status}
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{profile.stats.totalBranches}</p>
              <p className="text-xs text-slate-500">{t('branches')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{profile.stats.totalTeachers}</p>
              <p className="text-xs text-slate-500">{t('teachers')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{profile.stats.totalStudents}</p>
              <p className="text-xs text-slate-500">{t('students')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{profile.stats.totalEmployees}</p>
              <p className="text-xs text-slate-500">{t('employees')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{profile.stats.totalRooms}</p>
              <p className="text-xs text-slate-500">{t('classrooms')}</p>
            </div>
          </div>
        </Card>
        <Card bodyClassName="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-300">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">4.5</p>
              <p className="text-xs text-slate-500">{t('rating')}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Basic Information */}
      <Card 
        title={t('basicInformation')}
        action={
          editingSection === 'basic' ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditingSection(null); setForm(profile); }}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={() => handleSave('basic')} loading={saving}>
                <Save className="h-4 w-4" />
                {t('save')}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditingSection('basic')}>
              <Edit className="h-4 w-4" />
              {t('edit')}
            </Button>
          )
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('centerName')}
            value={form.name || ''}
            onChange={(e) => setField('name', e.target.value)}
            disabled={editingSection !== 'basic'}
          />
          <Input
            label={t('centerNameEn')}
            value={form.nameEn || ''}
            onChange={(e) => setField('nameEn', e.target.value)}
            disabled={editingSection !== 'basic'}
          />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">{t('description')}</label>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              rows={3}
              value={form.description || ''}
              onChange={(e) => setField('description', e.target.value)}
              disabled={editingSection !== 'basic'}
            />
          </div>
        </div>
      </Card>

      {/* Contact Information */}
      <Card 
        title={t('contactInformation')}
        action={
          editingSection === 'contact' ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditingSection(null); setForm(profile); }}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={() => handleSave('contact')} loading={saving}>
                <Save className="h-4 w-4" />
                {t('save')}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditingSection('contact')}>
              <Edit className="h-4 w-4" />
              {t('edit')}
            </Button>
          )
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('phone')}
            value={form.phone || ''}
            onChange={(e) => setField('phone', e.target.value)}
            disabled={editingSection !== 'contact'}
            icon={<Phone className="h-4 w-4" />}
          />
          <Input
            label={t('whatsapp')}
            value={form.whatsapp || ''}
            onChange={(e) => setField('whatsapp', e.target.value)}
            disabled={editingSection !== 'contact'}
            icon={<MessageCircle className="h-4 w-4" />}
          />
          <Input
            label={t('email')}
            type="email"
            value={form.email || ''}
            onChange={(e) => setField('email', e.target.value)}
            disabled={editingSection !== 'contact'}
            icon={<Mail className="h-4 w-4" />}
          />
          <Input
            label={t('website')}
            value={form.website || ''}
            onChange={(e) => setField('website', e.target.value)}
            disabled={editingSection !== 'contact'}
            icon={<Globe className="h-4 w-4" />}
          />
        </div>
      </Card>

      {/* Location */}
      <Card 
        title={t('location')}
        action={
          editingSection === 'location' ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditingSection(null); setForm(profile); }}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={() => handleSave('location')} loading={saving}>
                <Save className="h-4 w-4" />
                {t('save')}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditingSection('location')}>
              <Edit className="h-4 w-4" />
              {t('edit')}
            </Button>
          )
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('city')}
            value={form.city || ''}
            onChange={(e) => setField('city', e.target.value)}
            disabled={editingSection !== 'location'}
            icon={<MapPin className="h-4 w-4" />}
          />
          <Input
            label={t('address')}
            value={form.address || ''}
            onChange={(e) => setField('address', e.target.value)}
            disabled={editingSection !== 'location'}
            icon={<MapPin className="h-4 w-4" />}
          />
          <Input
            label={t('latitude')}
            type="number"
            step="any"
            value={form.latitude || ''}
            onChange={(e) => setField('latitude', e.target.value ? parseFloat(e.target.value) : null)}
            disabled={editingSection !== 'location'}
          />
          <Input
            label={t('longitude')}
            type="number"
            step="any"
            value={form.longitude || ''}
            onChange={(e) => setField('longitude', e.target.value ? parseFloat(e.target.value) : null)}
            disabled={editingSection !== 'location'}
          />
        </div>
      </Card>

      {/* Working Hours */}
      <Card 
        title={t('workingHours')}
        action={
          editingSection === 'hours' ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditingSection(null); setForm(profile); }}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={() => handleSave('hours')} loading={saving}>
                <Save className="h-4 w-4" />
                {t('save')}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditingSection('hours')}>
              <Edit className="h-4 w-4" />
              {t('edit')}
            </Button>
          )
        }
      >
        <div className="space-y-3">
          {DAYS.map((day, index) => {
            const hours = form.workingHours?.[day];
            return (
              <div key={day} className="flex items-center gap-4">
                <span className="w-24 text-sm font-medium">{DAYS_AR[index]}</span>
                {editingSection === 'hours' ? (
                  <>
                    <label className="flex items-center gap-2">
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
                        className="rounded"
                      />
                      <span className="text-sm">{t('open')}</span>
                    </label>
                    {hours && !hours.closed && (
                      <>
                        <Input
                          type="time"
                          value={hours.open}
                          onChange={(e) => {
                            const newHours = { ...form.workingHours, [day]: { ...hours, open: e.target.value } };
                            setField('workingHours', newHours);
                          }}
                          className="w-32"
                        />
                        <span>→</span>
                        <Input
                          type="time"
                          value={hours.close}
                          onChange={(e) => {
                            const newHours = { ...form.workingHours, [day]: { ...hours, close: e.target.value } };
                            setField('workingHours', newHours);
                          }}
                          className="w-32"
                        />
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {hours?.closed ? t('closed') : `${hours?.open} → ${hours?.close}`}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Social Media */}
      <Card 
        title={t('socialMedia')}
        action={
          editingSection === 'social' ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditingSection(null); setForm(profile); }}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={() => handleSave('social')} loading={saving}>
                <Save className="h-4 w-4" />
                {t('save')}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditingSection('social')}>
              <Edit className="h-4 w-4" />
              {t('edit')}
            </Button>
          )
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('facebook')}
            value={form.facebook || ''}
            onChange={(e) => setField('facebook', e.target.value)}
            disabled={editingSection !== 'social'}
            icon={<Facebook className="h-4 w-4" />}
          />
          <Input
            label={t('instagram')}
            value={form.instagram || ''}
            onChange={(e) => setField('instagram', e.target.value)}
            disabled={editingSection !== 'social'}
            icon={<Instagram className="h-4 w-4" />}
          />
          <Input
            label={t('youtube')}
            value={form.youtube || ''}
            onChange={(e) => setField('youtube', e.target.value)}
            disabled={editingSection !== 'social'}
            icon={<Youtube className="h-4 w-4" />}
          />
          <Input
            label={t('linkedin')}
            value={form.linkedin || ''}
            onChange={(e) => setField('linkedin', e.target.value)}
            disabled={editingSection !== 'social'}
            icon={<Linkedin className="h-4 w-4" />}
          />
        </div>
      </Card>
    </div>
  );
}
