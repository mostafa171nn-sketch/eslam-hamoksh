'use client';

import { memo, type ReactNode } from 'react';
import Link from 'next/link';
import { Avatar } from '../../../components/ui/Avatar';
import { useT } from '../../../i18n';
import type { PublicTeacher } from '../../../lib/types';
import { gradeStageChips, ICON_BOOK, ICON_PIN, ICON_SCHOOL } from './TeacherCard';

function UiIcon({ children, className = 'h-[15px] w-[15px]' }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

// Compact vertical card — used on the desktop 3-column grid (lg+).
const TeacherCardCompact = memo(function TeacherCardCompact({ teacher }: { teacher: PublicTeacher }) {
  const { t } = useT();
  const profileHref = `/teachers/${teacher.id}`;
  const subjectChips = (teacher.subjects ?? []).slice(0, 3);
  const stageChips = gradeStageChips(teacher.grades, t);
  const price = teacher.hourlyRate?.toLocaleString() ?? '—';

  return (
    <article className="flex h-full w-full flex-col rounded-[20px] border-[0.8px] border-[#e0eaf2] bg-white p-[10px] shadow-[0_8px_20px_rgba(18,58,91,0.075)] transition-shadow duration-200 hover:shadow-[0_10px_26px_rgba(18,58,91,0.11)] dark:border-slate-700 dark:bg-slate-800">
      {/* Photo */}
      <Link
        href={profileHref}
        aria-label={teacher.fullName}
        className="relative block h-[120px] w-full shrink-0 overflow-hidden rounded-[16px] bg-[#e3effc] dark:bg-slate-700/60"
      >
        {teacher.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={teacher.photo} alt={teacher.fullName} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <Avatar name={teacher.fullName} size="xl" />
          </span>
        )}
      </Link>

      {/* Title + rating */}
      <div className="mt-2.5 flex items-start justify-between gap-2">
        <h3 className="min-w-0 truncate text-[15px] font-bold leading-snug text-[#0b1b61] dark:text-white" title={teacher.fullName}>
          <Link href={profileHref} className="transition-colors hover:text-[#0878f8]">
            {teacher.fullName}
          </Link>
        </h3>
        <span className="inline-flex shrink-0 items-baseline gap-[3px] text-[#b8860b] dark:text-amber-300">
          <i aria-hidden className="not-italic text-[12px] leading-none">★</i>
          <b className="text-[13px] font-black leading-none">{teacher.rating.toFixed(1)}</b>
          {teacher.ratingCount > 0 && (
            <small className="text-[10px] font-semibold text-[#6e7b98] dark:text-slate-400">({teacher.ratingCount})</small>
          )}
        </span>
      </div>

      {/* Fact chips */}
      <div className="mt-2 flex flex-1 flex-col gap-1.5">
        {subjectChips.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="flex shrink-0 items-center gap-1 pt-1 text-[10px] font-semibold text-[#6e7b98] dark:text-slate-400">
              <UiIcon>{ICON_BOOK}</UiIcon>
              <small>{t('subjectsLabel')}</small>
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap gap-1">
              {subjectChips.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex max-w-full items-center gap-1 rounded-[10px] bg-[#e3f3ff] px-2 py-[5px] text-[11px] font-bold text-[#0878f8] dark:bg-sky-500/15 dark:text-sky-300"
                >
                  <UiIcon className="h-[12px] w-[12px] shrink-0">{ICON_BOOK}</UiIcon>
                  <b className="truncate font-bold">{s.name}</b>
                </span>
              ))}
            </div>
          </div>
        )}

        {teacher.location && (
          <div className="flex items-start gap-2">
            <span className="flex shrink-0 items-center gap-1 pt-1 text-[10px] font-semibold text-[#6e7b98] dark:text-slate-400">
              <UiIcon>{ICON_PIN}</UiIcon>
              <small>{t('areasLabel')}</small>
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap gap-1">
              <span className="inline-flex max-w-full items-center gap-1 rounded-[10px] bg-[#eef7ff] px-2 py-[5px] text-[11px] font-bold text-[#16557e] dark:bg-slate-700/70 dark:text-slate-200">
                <UiIcon className="h-[12px] w-[12px] shrink-0">{ICON_PIN}</UiIcon>
                <b className="truncate font-bold">{teacher.location.name}</b>
              </span>
            </div>
          </div>
        )}

        {stageChips.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="flex shrink-0 items-center gap-1 pt-1 text-[10px] font-semibold text-[#6e7b98] dark:text-slate-400">
              <UiIcon>{ICON_SCHOOL}</UiIcon>
              <small>{t('stagesLabel')}</small>
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap gap-1">
              {stageChips.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 rounded-[10px] bg-[#eef7ff] px-2 py-[5px] text-[11px] font-bold text-[#16557e] dark:bg-slate-700/70 dark:text-slate-200"
                >
                  <UiIcon className="h-[12px] w-[12px] shrink-0">{ICON_SCHOOL}</UiIcon>
                  <b className="font-bold">{c}</b>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer — price + CTA */}
      <div className="mt-2 flex items-center justify-between gap-3 border-t border-[#eef3f9] pt-2.5 dark:border-slate-700/60">
        <div className="min-w-0">
          <small className="block text-[10px] font-semibold text-[#6e7b98] dark:text-slate-400">{t('sessionPriceLabel')}</small>
          <strong className="mt-0.5 block whitespace-nowrap text-[16px] font-black text-[#0b1b61] dark:text-white">
            {price} <small className="text-[10px] font-semibold text-[#6e7b98] dark:text-slate-400">{t('priceSuffix')}</small>
          </strong>
        </div>
        <Link
          href={`${profileHref}?book=1`}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-br from-[#0878f8] to-[#126bea] px-3.5 py-2 text-[12px] font-black text-white shadow-[0_8px_20px_rgba(8,120,248,0.35)] transition-all duration-150 hover:shadow-[0_10px_26px_rgba(8,120,248,0.45)] active:scale-[0.98]"
        >
          <span>{t('bookNow')}</span>
          <b aria-hidden className="text-[13px] leading-none">←</b>
        </Link>
      </div>
    </article>
  );
});

export { TeacherCardCompact };