'use client';

import { useParams } from 'next/navigation';
import { Phone, Mail, Users, GraduationCap } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PageBackButton } from '../../../components/layout/PageBackButton';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Avatar } from '../../../components/ui/Avatar';
import { PencilLoader } from '../../../components/ui/PencilLoader';
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
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>;
  if (!student) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <PageBackButton />
        <PageHeader title={student.user.fullName} subtitle={`@${student.user.username}`} />
      </div>

      <Card bodyClassName="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={student.user.fullName} src={student.photo} size="xl" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{student.user.fullName}</h2>
              <Badge tone={student.user.status === 'ACTIVE' ? 'green' : 'slate'}>{student.user.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {t('joinedAt')}: {new Date(student.user.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          {student.grade && <Badge tone="violet">{student.grade.name}</Badge>}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard icon={Phone} label={t('phone')} value={student.user.phone || '—'} />
        <InfoCard icon={Mail} label={t('email')} value={student.user.email || '—'} />
        <InfoCard icon={GraduationCap} label={t('subject')} value={student.grade?.name || '—'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('parents')} bodyClassName="p-0">
          {student.parents.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {student.parents.map((p, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {p.parent.user.fullName.charAt(0)}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{p.parent.user.fullName}</p>
                    <p className="text-xs text-slate-500">{p.parent.user.phone || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-5 text-sm text-slate-500">{t('noParents')}</p>
          )}
        </Card>

        <Card title={t('teachers')} bodyClassName="p-0">
          {student.teachers.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {student.teachers.map((x, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <Users className="h-4 w-4 text-slate-400" />
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{x.teacher.user.fullName}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-5 text-sm text-slate-500">{t('noTeachers')}</p>
          )}
        </Card>
      </div>

      <Card title={t('subjects')} bodyClassName="p-5">
        {student.studentSubjects.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {student.studentSubjects.map((s, i) => <Badge key={i} tone="blue">{s.subject.name}</Badge>)}
          </div>
        ) : (
          <p className="text-sm text-slate-500">{t('noSubjects')}</p>
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