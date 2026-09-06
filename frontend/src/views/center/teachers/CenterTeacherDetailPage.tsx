'use client';

import { useParams } from 'next/navigation';
import { Star, Phone, Mail, MapPin, BadgeCheck, Clock } from 'lucide-react';
import { PageBackButton } from '../../../components/layout/PageBackButton';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterStatCard } from '../ui/CenterStatCard';
import { CenterPill } from '../ui/CenterPill';
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

  const statusTone = teacher.user.status === 'ACTIVE' ? 'green' : 'slate';

  return (
    <div className="space-y-5">
      <PageBackButton />

      <CenterPageHeader
        eyebrow={t('teacher')}
        title={teacher.user.fullName}
        description={`@${teacher.user.username}`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CenterStatCard
          value={avg}
          label={t('avgRating')}
          sub={`${teacher.ratings.length} ${t('reviews')}`}
        />
        <CenterStatCard
          value={teacher.yearsExperience}
          label={t('experience')}
          sub={t('years')}
        />
        <CenterStatCard
          value={teacher.hourlyRate.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
          label={t('hourlyRate')}
          sub="EGP"
        />
        <CenterStatCard value={teacher.grades.length} label={t('grades')} sub={teacher.location?.name || t('noBranch')} />
      </div>

      <div className="mj-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[color:var(--mj-border-soft)] p-5 sm:flex-row sm:items-center">
          <span className="mj-avatar mj-avatar--md shrink-0">{teacher.user.fullName.charAt(0)}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[color:var(--mj-ink-strong)]">{teacher.user.fullName}</h2>
              <CenterPill tone={statusTone}>{teacher.user.status === 'ACTIVE' ? t('active') : teacher.user.status}</CenterPill>
            </div>
            <p className="mt-1 text-sm text-[color:var(--mj-muted)]">{teacher.bio || t('noBio')}</p>
            <div className="mt-2 flex items-center gap-1">
              <Star className="h-4 w-4 fill-[color:var(--mj-amber)] text-[color:var(--mj-amber)]" />
              <span className="text-sm font-bold text-[color:var(--mj-ink-strong)]">{avg}</span>
              <span className="text-xs text-[color:var(--mj-muted-2)]">({teacher.ratings.length} {t('reviews')})</span>
            </div>
          </div>
          {teacher.subjects.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {teacher.subjects.map((s) => <CenterPill key={s.subject.id} tone="blue">{s.subject.name}</CenterPill>)}
            </div>
          )}
        </div>

        <div className="grid gap-px bg-[color:var(--mj-border-soft)] sm:grid-cols-2 lg:grid-cols-4">
          <InfoCell icon={Phone} label={t('phone')} value={teacher.user.phone || '—'} />
          <InfoCell icon={Mail} label={t('email')} value={teacher.user.email || '—'} />
          <InfoCell icon={MapPin} label={t('branch')} value={teacher.location?.name || t('noBranch')} />
          <InfoCell icon={Clock} label={t('experience')} value={`${teacher.yearsExperience} ${t('years')}`} />
        </div>
      </div>

      <div className="mj-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[color:var(--mj-border-soft)] px-5 py-4">
          <BadgeCheck className="h-5 w-5 text-[color:var(--mj-success)]" />
          <h3 className="font-bold text-[color:var(--mj-ink-strong)]">{t('hourlyRate')}</h3>
        </div>
        <div className="p-5">
          <p className="text-2xl font-bold text-[color:var(--mj-ink-strong)]">
            {teacher.hourlyRate.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} <span className="text-sm font-medium text-[color:var(--mj-muted)]">EGP</span>
          </p>
        </div>
      </div>

      <div className="mj-card overflow-hidden">
        <div className="border-b border-[color:var(--mj-border-soft)] px-5 py-4">
          <h3 className="font-bold text-[color:var(--mj-ink-strong)]">{t('grades')}</h3>
        </div>
        <div className="p-5">
          {teacher.grades.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {teacher.grades.map((g) => <CenterPill key={g.grade.id} tone="slate">{g.grade.name}</CenterPill>)}
            </div>
          ) : (
            <p className="text-sm text-[color:var(--mj-muted)]">{t('noGrades')}</p>
          )}
        </div>
      </div>

      <div className="mj-card overflow-hidden">
        <div className="border-b border-[color:var(--mj-border-soft)] px-5 py-4">
          <h3 className="font-bold text-[color:var(--mj-ink-strong)]">{t('reviews')}</h3>
        </div>
        {teacher.ratings.length > 0 ? (
          <div className="divide-y divide-[color:var(--mj-border-soft)]">
            {teacher.ratings.map((r, i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`h-4 w-4 ${n <= r.stars ? 'fill-[color:var(--mj-amber)] text-[color:var(--mj-amber)]' : 'text-[color:var(--mj-border)]'}`} />
                  ))}
                  <span className="ms-2 text-xs text-[color:var(--mj-muted-2)]">
                    {new Date(r.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}
                  </span>
                </div>
                {r.comment && <p className="mt-2 text-sm text-[color:var(--mj-ink)]">{r.comment}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5 text-sm text-[color:var(--mj-muted)]">{t('noReviews')}</div>
        )}
      </div>
    </div>
  );
}

function InfoCell({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-[color:var(--mj-surface)] p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--mj-accent-soft)] text-[color:var(--mj-accent)]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[color:var(--mj-muted)]">{label}</p>
        <p className="truncate text-sm font-semibold text-[color:var(--mj-ink-strong)]">{value}</p>
      </div>
    </div>
  );
}
