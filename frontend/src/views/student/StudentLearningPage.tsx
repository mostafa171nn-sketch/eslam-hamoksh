'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
} from 'lucide-react';
import { useT, type Dict } from '../../i18n';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { Lesson, MyTeacher, StudentDashboard } from '../../lib/types';
import { formatDate, formatTime, isOverdue } from '../../lib/format';

import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { Alert } from '../../components/ui/ErrorAlert';
import { Avatar } from '../../components/ui/Avatar';
import { SectionTitle } from '../../components/dashboard/SectionTitle';
import { SubjectBadge } from '../../components/dashboard/SubjectBadge';
import { ProgressRing } from '../../components/dashboard/ProgressRing';

type TabId = 'groups' | 'homework' | 'exams' | 'performance' | 'teachers' | 'subjects';

const TABS: Array<{ id: TabId; labelKey: keyof Dict }> = [
  { id: 'groups', labelKey: 'learnGroupsTab' },
  { id: 'homework', labelKey: 'assignments' },
  { id: 'exams', labelKey: 'learnExamsTab' },
  { id: 'performance', labelKey: 'learnPerformanceTab' },
  { id: 'teachers', labelKey: 'learnTeachersTab' },
  { id: 'subjects', labelKey: 'subjects' },
];

/** One study group: lessons of a single subject with a single teacher. */
interface StudyGroup {
  key: string;
  subject: string | null;
  teacher: { id: string; fullName: string } | null;
  lessonCount: number;
  nextAt: number;
  nextLabel: string;
  place: string;
}

function deriveGroups(lessons: Lesson[]): StudyGroup[] {
  const byKey = new Map<string, Lesson[]>();
  for (const l of lessons) {
    if (l.status === 'CANCELLED') continue;
    const key = `${l.subject?.id ?? 'none'}|${l.teacher?.id ?? 'none'}`;
    const list = byKey.get(key) ?? [];
    list.push(l);
    byKey.set(key, list);
  }
  const groups: StudyGroup[] = [];
  for (const [key, list] of byKey) {
    const sorted = [...list].sort(
      (a, b) => +new Date(`${a.date}T${a.startTime}`) - +new Date(`${b.date}T${b.startTime}`),
    );
    const next = sorted[0];
    if (!next) continue;
    groups.push({
      key,
      subject: next.subject?.name ?? null,
      teacher: next.teacher ? { id: next.teacher.id, fullName: next.teacher.fullName } : null,
      lessonCount: list.length,
      nextAt: +new Date(`${next.date}T${next.startTime}`),
      nextLabel: `${formatDate(next.date)} · ${formatTime(next.startTime)}`,
      place: next.location?.name ?? '',
    });
  }
  groups.sort((a, b) => a.nextAt - b.nextAt);
  return groups;
}

export default function StudentLearningPage() {
  const { t, lang } = useT();
  const [tab, setTab] = useState<TabId>('groups');

  const { data, initialLoading, error } = useApi(() => api.get<StudentDashboard>('/students/dashboard'), []);
  const { data: teachers } = useApi(() => api.getMyTeachers<MyTeacher[]>(), [], {
    cacheKey: 'students:me:teachers',
    staleTTL: 30_000,
    cacheTTL: 300_000,
  });
  const { data: lessons } = useApi(() => api.get<Lesson[]>('/lessons', { limit: 30 }), []);

  if (initialLoading) return <PencilLoader label={t('loadingDashboard')} />;
  if (error && !data) return <Alert message={error || t('failedLoadDashboard')} />;

  const assignments = data?.pendingAssignments ?? [];
  const openAssignments = assignments.filter((a) => !a.submitted);
  const upcomingExams = data?.upcomingExams ?? [];
  const recentResults = data?.recentResults ?? [];
  const attendance = data?.attendance ?? [];
  const lessonList = lessons ?? [];

  const groups = deriveGroups(lessonList);

  const presentCount = attendance.filter((a) => a.status === 'PRESENT').length;
  const attendanceRate = attendance.length ? Math.round((presentCount / attendance.length) * 100) : 0;
  const percentages = recentResults
    .map((r) => r.percentage)
    .filter((p): p is number => p !== null);
  const avgScore = percentages.length
    ? Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length)
    : 0;

  const subjectNames = new Map<string, { name: string; lessons: number; teachers: Set<string> }>();
  for (const tch of teachers ?? []) {
    for (const s of tch.subjects) {
      const entry = subjectNames.get(s.id) ?? { name: s.name, lessons: 0, teachers: new Set<string>() };
      entry.teachers.add(tch.id);
      subjectNames.set(s.id, entry);
    }
  }
  for (const l of lessonList) {
    if (!l.subject) continue;
    const entry = subjectNames.get(l.subject.id) ?? {
      name: l.subject.name,
      lessons: 0,
      teachers: new Set<string>(),
    };
    entry.lessons += 1;
    if (l.teacher) entry.teachers.add(l.teacher.id);
    subjectNames.set(l.subject.id, entry);
  }
  const subjects = [...subjectNames.entries()].map(([id, v]) => ({
    id,
    name: v.name,
    lessons: v.lessons,
    teachers: v.teachers.size,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{t('navLearning')}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('learnSubtitle')}</p>
      </header>

      {error && <Alert message={error || t('failedLoadDashboard')} />}

      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{groups.length}</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">{t('learnGroups')}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{openAssignments.length}</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">{t('learnAssignments')}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{upcomingExams.length}</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">{t('learnExamsSoon')}</span>
        </div>
      </div>

      <div role="tablist" aria-label={t('navLearning')} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
                active
                  ? 'bg-brand-600 text-white shadow-brand'
                  : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700'
              }`}
            >
              {t(item.labelKey)}
            </button>
          );
        })}
      </div>

      {tab === 'groups' && (
        <section aria-label={t('learnGroupsTab')} className="space-y-4">
          <Card
            title={t('journeyPerformanceGlance')}
            subtitle={t('journeyRewardsSub')}
            action={
              <Link href="/student/results">
                <Button variant="ghost" size="sm">{t('journeyViewPerformance')}</Button>
              </Link>
            }
            bodyClassName="p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <div className="flex items-center gap-3">
                <ProgressRing
                  value={percentages.length ? avgScore : 0}
                  size={56}
                  tone={percentages.length ? 'brand' : 'slate'}
                  label={
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {percentages.length ? `${avgScore}%` : '—'}
                    </span>
                  }
                  ariaLabel={t('resultsAvg')}
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('resultsAvg')}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {percentages.length ? t('journeyResultsBasedOn', { count: percentages.length }) : t('journeyLevelNoData')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ProgressRing
                  value={attendance.length ? attendanceRate : 0}
                  size={56}
                  tone={attendance.length ? 'green' : 'slate'}
                  label={
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {attendance.length ? `${attendanceRate}%` : '—'}
                    </span>
                  }
                  ariaLabel={t('attendanceRate')}
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('attendanceRate')}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {attendance.length ? `${presentCount} / ${attendance.length}` : t('journeyLevelNoData')}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {groups.length === 0 ? (
            <EmptyState icon={BookOpen} title={t('noGroups')} description={t('noUpcomingLessons')} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((g) => (
                <Card key={g.key} bodyClassName="flex h-full flex-col p-5">
                  <SubjectBadge subject={g.subject} />
                  <h3 className="mt-3 truncate text-base font-bold tracking-tight text-slate-900 dark:text-white">
                    {g.subject ?? t('myLessons')}
                  </h3>
                  {g.teacher && (
                    <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{g.teacher.fullName}</p>
                  )}
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">
                      {g.nextLabel}
                      {g.place ? ` · ${g.place}` : ''}
                    </span>
                  </p>
                  <Link
                    href={g.teacher ? `/student/lessons?teacherId=${g.teacher.id}` : '/student/lessons'}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25"
                  >
                    {t('learnOpenGroup')}
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'homework' && (
        <section aria-label={t('assignments')}>
          <SectionTitle
            icon={ClipboardList}
            title={t('pendingHomework')}
            action={
              <Link href="/student/assignments">
                <Button variant="ghost" size="sm">{t('viewAll')}</Button>
              </Link>
            }
          />
          {openAssignments.length === 0 ? (
            <EmptyState icon={CheckCircle2} title={t('allCaughtUp')} />
          ) : (
            <Card bodyClassName="p-2 sm:p-3">
              <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {openAssignments.map((a) => (
                  <li key={a.id}>
                    <Link
                      href="/student/assignments"
                      className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 dark:hover:bg-slate-700/40"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                        <ClipboardList className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{a.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                          {a.subject?.name ?? ''} · {isOverdue(a.deadline) ? t('overdue') : `${t('due')} ${formatDate(a.deadline)}`}
                        </span>
                      </span>
                      <SubjectBadge subject={a.subject?.name} className="hidden shrink-0 sm:inline-flex" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      )}

      {tab === 'exams' && (
        <section aria-label={t('learnExamsTab')} className="space-y-6">
          <div>
            <SectionTitle
              icon={FileText}
              title={t('upcomingExams')}
              action={
                <Link href="/student/exams">
                  <Button variant="ghost" size="sm">{t('viewAll')}</Button>
                </Link>
              }
            />
            {upcomingExams.length === 0 ? (
              <EmptyState icon={FileText} title={t('noUpcomingExams')} />
            ) : (
              <Card bodyClassName="p-2 sm:p-3">
                <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {upcomingExams.map((e) => (
                    <li key={e.id}>
                      <Link
                        href="/student/exams"
                        className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 dark:hover:bg-slate-700/40"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                          <FileText className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{e.name}</span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                            {e.subject?.name ?? ''} · {formatDate(e.startTime)} · {formatTime(e.startTime, lang)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
          {recentResults.length > 0 && (
            <div>
              <SectionTitle icon={FileText} title={t('recentResults')} />
              <Card bodyClassName="p-2 sm:p-3">
                <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {recentResults.slice(0, 5).map((r) => (
                    <li key={r.id}>
                      <Link
                        href="/student/results"
                        className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 dark:hover:bg-slate-700/40"
                      >
                        <ProgressRing
                          value={r.percentage ?? 0}
                          size={40}
                          strokeWidth={4}
                          tone={r.percentage !== null && r.percentage >= 50 ? 'green' : 'coral'}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{r.exam.name}</span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                            {r.exam.subject?.name ?? ''}
                          </span>
                        </span>
                        <Badge tone={r.percentage !== null && r.percentage >= 50 ? 'green' : 'amber'}>
                          {r.percentage !== null ? `${r.percentage}%` : t('pending')}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
        </section>
      )}

      {tab === 'performance' && (
        <section aria-label={t('learnPerformanceTab')}>
          <SectionTitle icon={FileText} title={t('journeyPerformanceGlance')} />
          <Card bodyClassName="p-5 sm:p-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex items-center gap-4">
                <ProgressRing
                  value={percentages.length ? avgScore : 0}
                  size={72}
                  tone={percentages.length ? 'brand' : 'slate'}
                  label={
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      {percentages.length ? `${avgScore}%` : '—'}
                    </span>
                  }
                  ariaLabel={t('resultsAvg')}
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('resultsAvg')}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {percentages.length ? t('journeyResultsBasedOn', { count: percentages.length }) : t('journeyLevelNoData')}
                  </p>
                  <Link
                    href="/student/results"
                    className="mt-2 inline-flex text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300"
                  >
                    {t('journeyViewPerformance')}
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <ProgressRing
                  value={attendance.length ? attendanceRate : 0}
                  size={72}
                  tone={attendance.length ? 'green' : 'slate'}
                  label={
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      {attendance.length ? `${attendanceRate}%` : '—'}
                    </span>
                  }
                  ariaLabel={t('attendanceRate')}
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('attendanceRate')}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {attendance.length ? `${presentCount} / ${attendance.length}` : t('journeyLevelNoData')}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </section>
      )}

      {tab === 'teachers' && (
        <section aria-label={t('learnTeachersTab')}>
          <SectionTitle
            icon={GraduationCap}
            title={t('myTeachers')}
            action={
              <Link href="/student/teachers">
                <Button variant="ghost" size="sm">{t('viewAll')}</Button>
              </Link>
            }
          />
          {!teachers || teachers.length === 0 ? (
            <EmptyState icon={GraduationCap} title={t('myTeachers')} description={t('noData')} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {teachers.map((teacher) => (
                <Link
                  key={teacher.id}
                  href={`/teachers/${teacher.id}`}
                  className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-500/50"
                >
                  <Avatar name={teacher.fullName} src={teacher.photo} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
                      {teacher.fullName}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {teacher.subjects.slice(0, 2).map((s) => (
                        <SubjectBadge key={s.id} subject={s.name} className="px-2 py-px text-[10px]" />
                      ))}
                    </div>
                    {teacher.upcomingLesson && (
                      <p className="mt-1.5 truncate text-xs text-slate-500">
                        {formatDate(teacher.upcomingLesson.date)} · {formatTime(teacher.upcomingLesson.startTime, lang)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'subjects' && (
        <section aria-label={t('subjects')}>
          <SectionTitle icon={BookOpen} title={t('subjects')} />
          {subjects.length === 0 ? (
            <EmptyState icon={BookOpen} title={t('subjects')} description={t('noData')} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {subjects.map((s) => (
                <Link
                  key={s.id}
                  href="/student/lessons"
                  className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-500/50"
                >
                  <SubjectBadge subject={s.name} className="px-3 py-1 text-xs" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{s.name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {t('learnLessonsCount', { count: s.lessons })}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {t('journeyRewardSubjectsHint', { count: s.teachers })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
