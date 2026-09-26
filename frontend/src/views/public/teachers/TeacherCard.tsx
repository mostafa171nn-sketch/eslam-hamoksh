'use client';

import { memo, type ReactNode } from 'react';
import Link from 'next/link';
import { Avatar } from '../../../components/ui/Avatar';
import { useT, type DictKey, type TranslateParams } from '../../../i18n';
import type { PublicTeacher } from '../../../lib/types';

type Translate = (key: DictKey, params?: TranslateParams) => string;

/* ------------------------------------------------------------------ */
/*  Reference SVG glyphs (hand-drawn lucide-style paths)               */
/* ------------------------------------------------------------------ */

export const ICON_BOOK = (
  <>
    <path d="M4 5.5c2.8-.8 5.3-.4 8 1.5v12c-2.7-1.9-5.2-2.3-8-1.5v-12Z" />
    <path d="M20 5.5c-2.8-.8-5.3-.4-8 1.5v12c2.7-1.9 5.2-2.3 8-1.5v-12Z" />
  </>
);

export const ICON_PIN = (
  <>
    <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="2.4" />
  </>
);

export const ICON_SCHOOL = (
  <>
    <path d="m3 9 9-5 9 5-9 5-9-5Z" />
    <path d="M7 12.5V17c3.1 2.2 6.9 2.2 10 0v-4.5" />
  </>
);

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

/* ------------------------------------------------------------------ */
/*  Stage chips (grades → ابتدائي / إعدادي / ثانوي)                    */
/* ------------------------------------------------------------------ */

const STAGE_PATTERNS: { key: keyof typeof STAGE_KEYS; re: RegExp }[] = [
  { key: 'primary', re: /primary/i },
  { key: 'preparatory', re: /preparatory/i },
  { key: 'secondary', re: /secondary/i },
];

const STAGE_KEYS = {
  primary: 'stagePrimary',
  preparatory: 'stagePreparatory',
  secondary: 'stageSecondary',
} as const;

// Collapse the many explicit grade rows into compact stage chips.
export function gradeStageChips(grades: PublicTeacher['grades'], t: Translate): string[] {
  const seen = new Set<string>();
  const chips: string[] = [];
  for (const g of grades) {
    const hit = STAGE_PATTERNS.find((p) => p.re.test(g.name));
    if (!hit) continue;
    const label = t(STAGE_KEYS[hit.key]);
    if (seen.has(label)) continue;
    seen.add(label);
    chips.push(label);
    if (chips.length >= 3) break;
  }
  return chips;
}

/* ------------------------------------------------------------------ */
/*  Reference compact card — horizontal on mobile & tablet             */
/*  (photo left, name + rating, fact chips, price + CTA footer).       */
/* ------------------------------------------------------------------ */

const TeacherCard = memo(function TeacherCard({ teacher }: { teacher: PublicTeacher }) {
  const { t } = useT();
  const profileHref = `/teachers/${teacher.id}`;
  const subjectChips = (teacher.subjects ?? []).slice(0, 3);
  const stageChips = gradeStageChips(teacher.grades, t);
  const price = teacher.hourlyRate?.toLocaleString() ?? '—';

  return (
    <article className="rounded-[20px] border-[0.8px] border-[#e0eaf2] bg-white p-[10px] shadow-[0_8px_20px_rgba(18,58,91,0.075)] transition-shadow duration-200 hover:shadow-[0_10px_26px_rgba(18,58,91,0.11)] dark:border-slate-700 dark:bg-slate-800">
      {/* Top row — summary (right) + photo (left) in RTL */}
      <div className="flex gap-2.5">
        {/* Summary */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-bold leading-snug text-[#0b1b61] dark:text-white">
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
        </div>

        {/* Photo */}
        <Link
          href={profileHref}
          aria-label={teacher.fullName}
          className="relative block h-[86px] w-[86px] shrink-0 overflow-hidden rounded-[16px] bg-[#e3effc] dark:bg-slate-700/60"
        >
          {teacher.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={teacher.photo} alt={teacher.fullName} className="h-full w-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <Avatar name={teacher.fullName} size="lg" />
            </span>
          )}
        </Link>
      </div>

      {/* Fact chips */}
      <div className="mt-1 flex flex-col gap-1.5">
        {subjectChips.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-[#6e7b98] dark:text-slate-400">
              <UiIcon>{ICON_BOOK}</UiIcon>
              <small>{t('subjectsLabel')}</small>
            </span>
            <div className="flex min-w-0 flex-wrap gap-1">
              {subjectChips.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 rounded-[10px] bg-[#e3f3ff] px-2 py-[5px] text-[11px] font-bold text-[#0878f8] dark:bg-sky-500/15 dark:text-sky-300"
                >
                  <UiIcon className="h-[12px] w-[12px]">{ICON_BOOK}</UiIcon>
                  <b className="font-bold">{s.name}</b>
                </span>
              ))}
            </div>
          </div>
        )}

        {teacher.location && (
          <div className="flex items-center gap-2">
            <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-[#6e7b98] dark:text-slate-400">
              <UiIcon>{ICON_PIN}</UiIcon>
              <small>{t('areasLabel')}</small>
            </span>
            <div className="flex min-w-0 flex-wrap gap-1">
              <span className="inline-flex items-center gap-1 rounded-[10px] bg-[#eef7ff] px-2 py-[5px] text-[11px] font-bold text-[#16557e] dark:bg-slate-700/70 dark:text-slate-200">
                <UiIcon className="h-[12px] w-[12px]">{ICON_PIN}</UiIcon>
                <b className="truncate">{teacher.location.name}</b>
              </span>
            </div>
          </div>
        )}

        {stageChips.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-[#6e7b98] dark:text-slate-400">
              <UiIcon>{ICON_SCHOOL}</UiIcon>
              <small>{t('stagesLabel')}</small>
            </span>
            <div className="flex min-w-0 flex-wrap gap-1">
              {stageChips.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 rounded-[10px] bg-[#eef7ff] px-2 py-[5px] text-[11px] font-bold text-[#16557e] dark:bg-slate-700/70 dark:text-slate-200"
                >
                  <UiIcon className="h-[12px] w-[12px]">{ICON_SCHOOL}</UiIcon>
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
          <strong className="mt-0.5 block whitespace-nowrap text-[15px] font-black text-[#0b1b61] dark:text-white">
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

export { TeacherCard };