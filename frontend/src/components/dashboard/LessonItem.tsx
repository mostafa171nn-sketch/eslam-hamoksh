'use client';

import type { ReactNode } from 'react';
import { MapPin } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { SubjectBadge } from './SubjectBadge';
import { useT, type DictKey, type TranslateParams } from '../../i18n';
import type { Lesson } from '../../lib/types';
import { dayName, formatTime, formatDate } from '../../lib/format';

const STATUS_META: Record<string, { key: DictKey; tone: LessonTone }> = {
  SCHEDULED: { key: 'scheduled', tone: 'blue' },
  RESCHEDULED: { key: 'rescheduled', tone: 'amber' },
  COMPLETED: { key: 'completedStatus', tone: 'green' },
  CANCELLED: { key: 'cancelled', tone: 'red' },
  NO_SHOW: { key: 'absent', tone: 'slate' },
};

type LessonTone = 'blue' | 'amber' | 'green' | 'red' | 'slate';

export function lessonStatusMeta(
  status: string | undefined | null,
  t: (key: DictKey, params?: TranslateParams) => string,
) {
  const meta = STATUS_META[status ?? ''];
  return {
    label: meta ? t(meta.key) : t('status'),
    tone: (meta ? meta.tone : 'slate') as LessonTone,
  };
}

export function LessonItem({
  lesson,
  showTeacher = true,
  showStudent = false,
  showLocation = false,
  showDate = true,
  trailing,
  className = '',
}: {
  lesson: Lesson;
  showTeacher?: boolean;
  showStudent?: boolean;
  showLocation?: boolean;
  showDate?: boolean;
  trailing?: ReactNode;
  className?: string;
}) {
  const { t } = useT();
  const { label, tone } = lessonStatusMeta(lesson.status, t);
  const weekday = dayName(new Date(lesson.date).getDay());

  return (
    <li className={className}>
      <div className="group flex items-start gap-3 rounded-xl border border-transparent p-2 transition-all duration-150 hover:border-slate-200 hover:bg-white hover:shadow-sm dark:border-transparent dark:hover:border-slate-700 dark:hover:bg-slate-800/60 sm:items-center sm:px-2.5">
        <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-slate-50 py-2 dark:bg-slate-800">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {weekday}
          </span>
          <span className="mt-0.5 text-xs font-bold text-slate-900 dark:text-white">
            {formatTime(lesson.startTime)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {lesson.subject?.name ?? t('generalSubject')}
            </p>
            <SubjectBadge
              subject={lesson.subject?.name}
              label={lesson.subject?.name ?? undefined}
              className="hidden sm:inline-flex"
            />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            {showTeacher && (
              <span className="inline-flex items-center gap-1.5">
                <Avatar name={lesson.teacher.fullName} src={lesson.teacher.photo} size="xs" />
                <span className="truncate">{lesson.teacher.fullName}</span>
              </span>
            )}
            {showStudent && (
              <span className="inline-flex items-center gap-1.5">
                <Avatar name={lesson.student.fullName} src={lesson.student.photo} size="xs" />
                <span className="truncate">{lesson.student.fullName}</span>
              </span>
            )}
            {showLocation && lesson.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                <span className="truncate">{lesson.location.name}</span>
              </span>
            )}
            {showDate && (
              <span className="hidden items-center gap-1 sm:inline-flex">
                <span className="font-medium text-slate-400 dark:text-slate-500">{formatDate(lesson.date)}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge tone={tone}>{label}</Badge>
          {trailing}
        </div>
      </div>
    </li>
  );
}