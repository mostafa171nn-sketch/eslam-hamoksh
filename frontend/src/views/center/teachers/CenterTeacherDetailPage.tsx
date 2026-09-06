'use client';

import { useParams } from 'next/navigation';
import { Star, Phone, Mail, MapPin, BadgeCheck, Clock } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PageBackButton } from '../../../components/layout/PageBackButton';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Avatar } from '../../../components/ui/Avatar';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { useApi } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useT } from '../../../i18n';

interface TeacherDetailUser {
  id: string;
  fullName: string;
  username: string;
  phone: string | null;
  email: string | null;
  photo: string | null;
  status: string;
}

interface TeacherDetail {
  id: string;
  userId: string;
  bio: string | null;
  yearsExperience: number;
  hourlyRate: number;
  photo: string | null;
  user: TeacherDetailUser;
  subjects: { subject: { id: string; name: string } }[];
  grades: { grade: { id: string; name: string } }[];
  location: { id: string; name: string } | null;
  ratings: { stars: number; comment: string | null; createdAt: string }[];
}

export default function CenterTeacherDetailPage() {
  const { t, lang } = useT();
  const params = useParams<{ id: string }>();
  const { data: teacher, loading, error } = useApi<TeacherDetail>(
    () => api.get<TeacherDetail>(`/center/teachers/${params.id}`),
    [params.id]
  );

  if (loading) return <PencilLoader label={t('loading')} />;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>;
  if (!teacher) return null;

  const avg = teacher.ratings.length
    ? (teacher.ratings.reduce((s, r) => s + r.stars, 0) / teacher.ratings.length).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <PageBackButton />
        <PageHeader title={teacher.user.fullName} subtitle={`@${teacher.user.username}`} />
      </div>

      <Card bodyClassName="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={teacher.user.fullName} src={teacher.photo} size="xl" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{teacher.user.fullName}</h2>
              <Badge tone={teacher.user.status === 'ACTIVE' ? 'green' : 'slate'}>{teacher.user.status === 'ACTIVE' ? t('active') : teacher.user.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">{teacher.bio || t('noBio')}</p>
            <div className="mt-2 flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-medium text-slate-900 dark:text-white">{avg}</span>
              <span className="text-xs text-slate-400">({teacher.ratings.length} {t('reviews')})</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {teacher.subjects.map((s) => <Badge key={s.subject.id} tone="brand">{s.subject.name}</Badge>)}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={Phone} label={t('phone')} value={teacher.user.phone || '—'} />
        <InfoCard icon={Mail} label={t('email')} value={teacher.user.email || '—'} />
        <InfoCard icon={MapPin} label={t('branch')} value={teacher.location?.name || t('noBranch')} />
        <InfoCard icon={Clock} label={t('experience')} value={`${teacher.yearsExperience} ${t('years')}`} />
      </div>

      <Card bodyClassName="p-5">
        <div className="flex items-center gap-2">
          <BadgeCheck className="h-5 w-5 text-emerald-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t('hourlyRate')}</h3>
        </div>
        <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
          {teacher.hourlyRate.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} <span className="text-sm font-medium text-slate-400">EGP</span>
        </p>
      </Card>

      <Card title={t('grades')} bodyClassName="p-5">
        {teacher.grades.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {teacher.grades.map((g) => <Badge key={g.grade.id} tone="violet">{g.grade.name}</Badge>)}
          </div>
        ) : (
          <p className="text-sm text-slate-500">{t('noGrades')}</p>
        )}
      </Card>

      <Card title={t('reviews')} bodyClassName="p-0">
        {teacher.ratings.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {teacher.ratings.map((r, i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`h-4 w-4 ${n <= r.stars ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                  ))}
                  <span className="ms-2 text-xs text-slate-400">
                    {new Date(r.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}
                  </span>
                </div>
                {r.comment && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{r.comment}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="p-5 text-sm text-slate-500">{t('noReviews')}</p>
        )}
      </Card>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <Card bodyClassName="p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500">{label}</p>
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
        </div>
      </div>
    </Card>
  );
}