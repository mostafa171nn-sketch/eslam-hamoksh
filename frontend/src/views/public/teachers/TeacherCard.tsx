'use client';

import { memo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { Avatar } from '../../../components/ui/Avatar';
import { dayName, formatCurrency, formatTime } from '../../../lib/format';
import { useT, type DictKey, type TranslateParams } from '../../../i18n';
import type { AvailabilitySlot, PublicTeacher } from '../../../lib/types';

type Translate = (key: DictKey, params?: TranslateParams) => string;

// Next upcoming availability (respecting the weekly day+startTime grid).
export function nextAvailableSlot(
  availability: PublicTeacher['availability'],
  now: Date = new Date(),
): AvailabilitySlot | null {
  if (!availability?.length) return null;
  const curDay = now.getDay();
  const curMinutes = now.getHours() * 60 + now.getMinutes();
  let best: AvailabilitySlot | null = null;
  let bestScore = Infinity;
  for (const a of availability) {
    const [h, m] = a.startTime.split(':').map(Number);
    const start = (h || 0) * 60 + (m || 0);
    let delta = (a.day - curDay + 7) % 7;
    if (delta === 0 && start <= curMinutes) delta = 7;
    const score = delta * 1440 + (start - curMinutes);
    if (score < bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return best;
}

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

// Collapse the many explicit grade rows (Grade 1 Primary … Grade 3 Secondary)
// into the compact stage chips the reference page shows.
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

const TeacherCard = memo(function TeacherCard({ teacher }: { teacher: PublicTeacher }) {
  const { t, lang } = useT();
  const router = useRouter();
  const slot = nextAvailableSlot(teacher.availability);
  const subject = teacher.subjects[0]?.name ?? '';
  const chips = gradeStageChips(teacher.grades, t);
  const profileHref = `/teachers/${teacher.id}`;

  return (
    <article className="grid grid-cols-[104px_1fr] gap-3 rounded-[24px] border border-[#e2ebf6] bg-white p-3 shadow-[0_14px_42px_rgba(20,73,137,0.094)] transition-shadow duration-200 hover:shadow-[0_18px_52px_rgba(20,73,137,0.14)] sm:grid-cols-[150px_1fr_158px] sm:gap-[18px] sm:p-4 dark:border-slate-700 dark:bg-slate-800">
      {/* Photo */}
      <div className="relative min-h-[104px] overflow-hidden rounded-2xl bg-[#e3effc] sm:min-h-[150px] dark:bg-slate-700/60">
        {teacher.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={teacher.photo} alt={teacher.fullName} className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Avatar name={teacher.fullName} size="xl" />
          </div>
        )}
        {teacher.availability.length > 0 && (
          <span className="absolute bottom-1.5 start-1.5 inline-flex max-w-[calc(100%-12px)] truncate rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#0b1b61] sm:text-[11px] dark:bg-slate-900/90 dark:text-white">
            {t('availableNow')}
          </span>
        )}
      </div>

      {/* Main */}
      <div className="min-w-0">
        <h3 className="text-[15px] font-bold leading-snug text-[#0b1b61] sm:text-xl dark:text-white">
          <Link href={profileHref} className="transition-colors hover:text-[#0878f8]">
            {teacher.fullName}
          </Link>
        </h3>
        <p className="mt-0.5 truncate text-[12px] font-black text-[#0878f8] sm:text-[13px] dark:text-sky-300">
          {subject}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-[#5f6d8c] sm:text-[12px] dark:text-slate-400">
          {teacher.location && <span>{teacher.location.name}</span>}
          {teacher.location && <span className="text-[#c3cede]">·</span>}
          <span>
            {teacher.yearsExperience} {t('yrsExp')}
          </span>
          <span className="text-[#c3cede]">·</span>
          <span className="inline-flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {teacher.rating.toFixed(1)} ({teacher.ratingCount})
          </span>
        </div>

        {teacher.bio && (
          <p className="mt-2 line-clamp-2 text-[12px] leading-[1.55] text-[#6e7b98] sm:text-[13px] dark:text-slate-400">
            {teacher.bio}
          </p>
        )}

        {chips.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {chips.map((c) => (
              <span
                key={c}
                className="rounded-[10px] bg-[#e3f3ff] px-2.5 py-1 text-[10px] font-semibold text-[#0878f8] sm:px-[9px] sm:py-[6px] sm:text-[11px] dark:bg-sky-500/15 dark:text-sky-300"
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Side: rating, best slot, price, CTA */}
      <aside className="col-span-2 mt-1 grid grid-cols-2 gap-x-3 gap-y-2 sm:col-span-1 sm:mt-0 sm:content-start sm:grid-cols-1 sm:gap-y-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black leading-none text-[#0b1b61] dark:text-white">
              {teacher.rating.toFixed(1)}
            </span>
            <span className="text-[10px] font-semibold text-[#6e7b98]">({teacher.ratingCount})</span>
          </div>
          <p className="mt-0.5 text-[10px] font-medium text-[#6e7b98] dark:text-slate-400">{t('rating')}</p>
        </div>

        <div className="min-w-0 rounded-xl border border-[#e3f0fa] bg-[#f4faff] px-3 py-2 sm:px-3.5 sm:py-2.5 dark:border-slate-600 dark:bg-slate-700/50">
          <p className="text-[10px] font-semibold text-[#6e7b98] dark:text-slate-300">{t('bestSlotTitle')}</p>
          {slot ? (
            <p className="mt-0.5 truncate text-[12px] font-bold text-[#0b1b61] dark:text-white">
              {dayName(slot.day, lang)} · {formatTime(slot.startTime)}
            </p>
          ) : (
            <p className="mt-0.5 text-[12px] font-medium text-[#6e7b98] dark:text-slate-400">{t('noSetSchedule')}</p>
          )}
        </div>

        <div className="min-w-0 text-left sm:text-start">
          <p className="whitespace-nowrap text-[19px] font-black leading-none text-[#0b1b61] dark:text-white">
            {formatCurrency(teacher.hourlyRate)}
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-[#6e7b98] dark:text-slate-400">{t('perHour')}</p>
        </div>

        <div className="min-w-0">
          <button
            type="button"
            onClick={() => router.push(`${profileHref}?book=1`)}
            className="h-11 w-full rounded-[12px] bg-gradient-to-br from-[#0878f8] to-[#126bea] px-3 text-[15px] font-black text-white shadow-[0_8px_20px_rgba(8,120,248,0.35)] transition-all duration-150 hover:shadow-[0_10px_26px_rgba(8,120,248,0.45)] active:scale-[0.98] sm:h-12"
          >
            {t('bookNow')}
          </button>
        </div>
      </aside>
    </article>
  );
});

export { TeacherCard };