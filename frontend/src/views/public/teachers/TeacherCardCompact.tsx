'use client';

import { memo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { Avatar } from '../../../components/ui/Avatar';
import { dayName, formatCurrency, formatTime } from '../../../lib/format';
import { useT } from '../../../i18n';
import type { PublicTeacher } from '../../../lib/types';
import { gradeStageChips, nextAvailableSlot } from './TeacherCard';

// Compact vertical card used ONLY on the desktop 4-per-row grid (xl+).
const TeacherCardCompact = memo(function TeacherCardCompact({ teacher }: { teacher: PublicTeacher }) {
  const { t, lang } = useT();
  const router = useRouter();
  const slot = nextAvailableSlot(teacher.availability);
  const subject = teacher.subjects[0]?.name ?? '';
  const chips = gradeStageChips(teacher.grades, t);
  const profileHref = `/teachers/${teacher.id}`;

  return (
    <article className="flex h-full w-full flex-col overflow-hidden rounded-[24px] border border-[#e2ebf6] bg-white shadow-[0_14px_42px_rgba(20,73,137,0.094)] transition-shadow duration-200 hover:shadow-[0_18px_52px_rgba(20,73,137,0.14)] dark:border-slate-700 dark:bg-slate-800">
      {/* Photo */}
      <Link
        href={profileHref}
        className="relative block aspect-[16/11] w-full shrink-0 overflow-hidden bg-[#e3effc] dark:bg-slate-700/60"
      >
        {teacher.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={teacher.photo}
            alt={teacher.fullName}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Avatar name={teacher.fullName} size="lg" />
          </div>
        )}
        {teacher.availability.length > 0 && (
          <span className="absolute bottom-2 start-2 inline-flex max-w-[calc(100%-16px)] truncate rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#0b1b61] dark:bg-slate-900/90 dark:text-white">
            {t('availableNow')}
          </span>
        )}
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="text-[15px] font-bold leading-snug text-[#0b1b61] dark:text-white">
          <Link href={profileHref} className="transition-colors hover:text-[#0878f8]">
            {teacher.fullName}
          </Link>
        </h3>
        <p className="mt-0.5 truncate text-[12px] font-black text-[#0878f8] dark:text-sky-300">{subject}</p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-[#5f6d8c] dark:text-slate-400">
          {teacher.location && <span className="max-w-[55%] truncate">{teacher.location.name}</span>}
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
          <p className="mt-2 line-clamp-2 text-[12px] leading-[1.55] text-[#6e7b98] dark:text-slate-400">
            {teacher.bio}
          </p>
        )}

        {chips.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {chips.slice(0, 2).map((c) => (
              <span
                key={c}
                className="rounded-[10px] bg-[#e3f3ff] px-2 py-0.5 text-[10px] font-semibold text-[#0878f8] dark:bg-sky-500/15 dark:text-sky-300"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Price + CTA */}
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-[#eef3f9] pt-3 dark:border-slate-700/60">
          <div className="min-w-0">
            <p className="whitespace-nowrap text-[18px] font-black leading-none text-[#0b1b61] dark:text-white">
              {formatCurrency(teacher.hourlyRate)}
            </p>
            <p className="mt-1 text-[10px] font-medium text-[#6e7b98] dark:text-slate-400">{t('perHour')}</p>
          </div>
          <button
            type="button"
            onClick={() => router.push(`${profileHref}?book=1`)}
            className="h-10 rounded-[12px] bg-gradient-to-br from-[#0878f8] to-[#126bea] px-3.5 text-[13px] font-black text-white shadow-[0_8px_20px_rgba(8,120,248,0.35)] transition-all duration-150 hover:shadow-[0_10px_26px_rgba(8,120,248,0.45)] active:scale-[0.98]"
          >
            {t('bookNow')}
          </button>
        </div>

        {slot && (
          <p className="mt-2.5 truncate text-[11px] font-semibold text-[#5f6d8c] dark:text-slate-400">
            <span className="text-[#0878f8] dark:text-sky-300">{t('bestSlotTitle')}:</span>{' '}
            {dayName(slot.day, lang)} · {formatTime(slot.startTime)}
          </p>
        )}
      </div>
    </article>
  );
});

export { TeacherCardCompact };