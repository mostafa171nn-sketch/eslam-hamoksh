'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { GraduationCap, Star } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/ErrorAlert';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { Grade, Location, Subject } from '../../lib/types';
import { dayName, formatCurrency } from '../../lib/format';
import { useT } from '../../i18n';

export default function StudentTeachersPage() {
  const { t, lang } = useT();
  const searchParams = useSearchParams();
  // When opened from a specific center, only that center's teachers are shown.
  const centerId = searchParams?.get('center') ?? '';

  const [page, setPage] = useState(1);
  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [day, setDay] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    setPage(1);
  }, [centerId]);

  const DAY_OPTIONS = [
    { value: '', label: t('anyDay') },
    { value: '0', label: t('sunday') },
    { value: '1', label: t('monday') },
    { value: '2', label: t('tuesday') },
    { value: '3', label: t('wednesday') },
    { value: '4', label: t('thursday') },
    { value: '5', label: t('friday') },
    { value: '6', label: t('saturday') },
  ];

  const { data: catalog } = useApi(
    () =>
      Promise.all([
        api.get<Subject[]>('/catalog/subjects'),
        api.get<Grade[]>('/catalog/grades'),
        api.get<Location[]>('/catalog/locations'),
      ]).then(([s, g, l]) =>
        Promise.resolve({ success: true as const, message: '', data: { subjects: s.data ?? [], grades: g.data ?? [], locations: l.data ?? [] } }),
      ),
    [],
  );

  const { data, meta, loading, initialLoading, error } = useApi(
    () =>
      api.searchTeachers({
        page,
        limit: 12,
        name: name || undefined,
        subjectId: subjectId || undefined,
        gradeId: gradeId || undefined,
        locationId: locationId || undefined,
        centerId: centerId || undefined,
        day: day ? Number(day) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
      }),
    [page, name, subjectId, gradeId, locationId, day, maxPrice, centerId],
  );

  const resetPage = () => setPage(1);

  return (
    <div>
      <PageHeader title={t('findTeacher')} subtitle={t('findTeacherSubtitle')} />

      <Card bodyClassName="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Input
              placeholder={t('searchByName')}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                resetPage();
              }}
            />
          </div>
          <Select
            options={(catalog?.subjects ?? []).map((s: Subject) => ({ value: s.id, label: s.name }))}
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              resetPage();
            }}
            placeholder={t('anySubject')}
          />
          <Select
            options={(catalog?.grades ?? []).map((g: Grade) => ({ value: g.id, label: g.name }))}
            value={gradeId}
            onChange={(e) => {
              setGradeId(e.target.value);
              resetPage();
            }}
            placeholder={t('anyGrade')}
          />
          {!centerId && (
            <Select
              options={(catalog?.locations ?? []).map((l: Location) => ({ value: l.id, label: l.name }))}
              value={locationId}
              onChange={(e) => {
                setLocationId(e.target.value);
                resetPage();
              }}
              placeholder={t('anyBranch')}
            />
          )}
          <Select
            options={DAY_OPTIONS}
            value={day}
            onChange={(e) => {
              setDay(e.target.value);
              resetPage();
            }}
          />
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="sm:max-w-xs">
            <Input
              placeholder={t('maxHourlyRate')}
              type="number"
              min={0}
              value={maxPrice}
              onChange={(e) => {
                setMaxPrice(e.target.value);
                resetPage();
              }}
            />
          </div>
          <p className="text-xs text-slate-400">
            {meta?.total !== undefined ? `${meta.total} ${t('teachersFound')}` : ''}
          </p>
        </div>
      </Card>

      {error && <Alert title={t('couldNotLoadTeachers')} message={error} className="mt-4" />}
      {loading && (initialLoading ? <PencilLoader label={t('searchingTeachers')} /> : <PencilLoader size="sm" label={t('searchingTeachers')} />)}

      {!loading && data && (
        <>
          {data.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={GraduationCap}
                title={t('noTeachersMatch')}
                description={t('adjustFilters')}
                action={
                  <Button variant="outline" size="sm" onClick={() => {
                    setName('');
                    setSubjectId('');
                    setGradeId('');
                    setLocationId('');
                    setDay('');
                    setMaxPrice('');
                    setPage(1);
                  }}>
                    {t('clearFilters')}
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.map((teacher) => (
                <Link key={teacher.id} href={`/teachers/${teacher.id}`} className="group">
                  <Card bodyClassName="p-5 transition group-hover:border-brand-300 group-hover:shadow dark:group-hover:border-brand-500/50">
                    <div className="flex items-start gap-4">
                      <Avatar name={teacher.fullName} src={teacher.photo} size="lg" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-brand-700 dark:text-white">
                          {teacher.fullName}
                        </p>
                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-medium text-slate-700 dark:text-slate-200">{teacher.rating.toFixed(1)}</span>
                          <span>({teacher.ratingCount})</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {teacher.subjects.slice(0, 3).map((s) => (
                        <Badge key={s.id} tone="blue">{s.name}</Badge>
                      ))}
                      {teacher.subjects.length > 3 && <Badge tone="slate">+{teacher.subjects.length - 3}</Badge>}
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <p>{formatCurrency(teacher.hourlyRate)} {t('perHour')} · {teacher.yearsExperience} {t('yrsExp')}</p>
                      <p>
                        {teacher.location ? teacher.location.name : t('anyBranch')} ·{' '}
                        {teacher.availability.length > 0
                          ? teacher.availability
                              .slice(0, 2)
                              .map((a) => dayName(a.day, lang))
                              .join(', ')
                          : t('noSetSchedule')}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
          <div className="mt-6">
            <Pagination page={page} totalPages={meta?.totalPages ?? 1} onChange={setPage} />
          </div>
        </>
      )}
    </div>
  );
}
