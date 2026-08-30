'use client';

import Link from 'next/link';
import { GraduationCap, Plus } from 'lucide-react';
import { useT } from '../../i18n';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/ErrorAlert';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { Subject } from '../../lib/types';

interface ParentChild {
  id: string;
  userId: string;
  fullName: string;
  photo: string | null;
  grade: { id: string; name: string } | null;
  subjects: Subject[];
}

export default function ParentChildrenPage() {
  const { t } = useT();
  const { data, loading, initialLoading, error } = useApi(() => api.get<ParentChild[]>('/parents/children'), []);

  return (
    <div>
      <PageHeader
        title={t('myChildrenTitle')}
        subtitle={t('myChildrenSub')}
        action={
          <Link href="/profile">
            <Button size="sm">
              <Plus className="h-4 w-4" /> {t('linkChild')}
            </Button>
          </Link>
        }
      />

      {error && <Alert message={error} className="mb-4" />}
      {loading && (initialLoading ? <PencilLoader label={t('loadingChildren')} /> : <PencilLoader size="sm" label={t('loadingChildren')} />)}

      {!loading && data && (
        <>
          {data.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title={t('noChildrenLinked')}
              description={t('linkChildByStudentId')}
              action={
                <Link href="/profile">
                  <Button size="sm">{t('goToProfile')}</Button>
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.map((c) => (
                <Link key={c.id} href={`/parent/children/${c.id}`} className="group">
                  <Card bodyClassName="p-5 transition group-hover:border-brand-300 group-hover:shadow">
                    <div className="flex items-start gap-4">
                      <Avatar name={c.fullName} src={c.photo} size="lg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white group-hover:text-brand-700">
                          {c.fullName}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">{c.grade?.name ?? t('noGrade')}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {c.subjects.slice(0, 3).map((s) => (
                            <Badge key={s.id} tone="blue">{s.name}</Badge>
                          ))}
                          {c.subjects.length > 3 && <Badge tone="slate">+{c.subjects.length - 3}</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <Link href={`/parent/children/${c.id}/assignments`} className="text-brand-600 hover:text-brand-700">
                        {t('assignments')}
                      </Link>
                      <span className="text-slate-300">·</span>
                      <Link href={`/parent/children/${c.id}/exams`} className="text-brand-600 hover:text-brand-700">
                        {t('exams')}
                      </Link>
                      <span className="text-slate-300">·</span>
                      <Link href={`/parent/children/${c.id}/attendance`} className="text-brand-600 hover:text-brand-700">
                        {t('attendance')}
                      </Link>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
