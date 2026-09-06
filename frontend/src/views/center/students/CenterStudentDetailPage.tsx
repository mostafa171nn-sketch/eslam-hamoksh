'use client';

import { useParams } from 'next/navigation';
import { Phone, Mail, Users, GraduationCap } from 'lucide-react';
import { PageBackButton } from '../../../components/layout/PageBackButton';
import { PencilLoader } from '../../../components/ui/PencilLoader';
import { CenterPageHeader } from '../ui/CenterPageHeader';
import { CenterStatCard } from '../ui/CenterStatCard';
import { CenterPill } from '../ui/CenterPill';
import { useApi } from '../../../hooks/useApi';
import { api } from '../../../lib/api';
import { useT } from '../../../i18n';

interface StudentDetailUser {
  id: string;
  fullName: string;
  username: string;
  phone: string | null;
  email: string | null;
  photo: string | null;
  status: string;
  createdAt: string;
}

interface StudentDetail {
  id: string;
  userId: string;
  photo: string | null;
  user: StudentDetailUser;
  grade: { name: string } | null;
  parents: { parent: { user: StudentDetailUser } }[];
  teachers: { teacher: { user: StudentDetailUser } }[];
  studentSubjects: { subject: { name: string } }[];
}

export default function CenterStudentDetailPage() {
  const { t, lang } = useT();
  const params = useParams<{ id: string }>();
  const { data: student, loading, error } = useApi<StudentDetail>(
    () => api.get<StudentDetail>(`/center/students/${params.id}`),
    [params.id]
  );

  if (loading) return <PencilLoader label={t('loading')} />;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</div>;
  if (!student) return null;

  const statusTone = student.user.status === 'ACTIVE' ? 'green' : 'slate';

  return (
    <div className="space-y-5">
      <PageBackButton />

      <CenterPageHeader
        eyebrow={t('student')}
        title={student.user.fullName}
        description={`@${student.user.username}`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <CenterStatCard value={student.grade?.name || '—'} label={t('grade')} />
        <CenterStatCard value={student.parents.length} label={t('parents')} />
        <CenterStatCard value={student.teachers.length} label={t('teachers')} />
      </div>

      <div className="mj-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[color:var(--mj-border-soft)] p-5 sm:flex-row sm:items-center">
          <span className="mj-avatar mj-avatar--md shrink-0">{student.user.fullName.charAt(0)}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[color:var(--mj-ink-strong)]">{student.user.fullName}</h2>
              <CenterPill tone={statusTone}>{student.user.status}</CenterPill>
              {student.grade && <CenterPill tone="slate">{student.grade.name}</CenterPill>}
            </div>
            <p className="mt-1 text-sm text-[color:var(--mj-muted)]">
              {t('joinedAt')}: {new Date(student.user.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="grid gap-px bg-[color:var(--mj-border-soft)] sm:grid-cols-3">
          <InfoCell icon={Phone} label={t('phone')} value={student.user.phone || '—'} />
          <InfoCell icon={Mail} label={t('email')} value={student.user.email || '—'} />
          <InfoCell icon={GraduationCap} label={t('subject')} value={student.grade?.name || '—'} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="mj-card overflow-hidden">
          <div className="border-b border-[color:var(--mj-border-soft)] px-5 py-4">
            <h3 className="font-bold text-[color:var(--mj-ink-strong)]">{t('parents')}</h3>
          </div>
          {student.parents.length > 0 ? (
            <div className="divide-y divide-[color:var(--mj-border-soft)]">
              {student.parents.map((p, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--mj-accent-soft)] text-xs font-semibold text-[color:var(--mj-accent)]">
                    {p.parent.user.fullName.charAt(0)}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[color:var(--mj-ink-strong)]">{p.parent.user.fullName}</p>
                    <p className="text-xs text-[color:var(--mj-muted)]">{p.parent.user.phone || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5 text-sm text-[color:var(--mj-muted)]">{t('noParents')}</div>
          )}
        </div>

        <div className="mj-card overflow-hidden">
          <div className="border-b border-[color:var(--mj-border-soft)] px-5 py-4">
            <h3 className="font-bold text-[color:var(--mj-ink-strong)]">{t('teachers')}</h3>
          </div>
          {student.teachers.length > 0 ? (
            <div className="divide-y divide-[color:var(--mj-border-soft)]">
              {student.teachers.map((x, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <Users className="h-4 w-4 shrink-0 text-[color:var(--mj-muted-2)]" />
                  <p className="text-sm font-medium text-[color:var(--mj-ink-strong)]">{x.teacher.user.fullName}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5 text-sm text-[color:var(--mj-muted)]">{t('noTeachers')}</div>
          )}
        </div>
      </div>

      <div className="mj-card overflow-hidden">
        <div className="border-b border-[color:var(--mj-border-soft)] px-5 py-4">
          <h3 className="font-bold text-[color:var(--mj-ink-strong)]">{t('subjects')}</h3>
        </div>
        <div className="p-5">
          {student.studentSubjects.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {student.studentSubjects.map((s, i) => <CenterPill key={i} tone="blue">{s.subject.name}</CenterPill>)}
            </div>
          ) : (
            <p className="text-sm text-[color:var(--mj-muted)]">{t('noSubjects')}</p>
          )}
        </div>
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
