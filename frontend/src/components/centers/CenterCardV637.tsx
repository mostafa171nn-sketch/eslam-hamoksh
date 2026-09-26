'use client';

import { memo, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { useT } from '../../i18n';
import type { PublicCenter } from '../../lib/api';

/*
  Center result card — exact reproduction of the reference's `.center-card-v637`
  (V6.37 discovery card), adapted to the real `PublicCenter` fields.

  Reference data model  →  real field used on the card
    rooms count          →  teacherCount      (no rooms in the public contract)
    capacity ("فرد")     →  studentCount
    price/hr ("يبدأ من") →  ratingAverage
    features ("تجهيزات") →  subject names     (the public contract's closest)
    area / rating        →  city / ratingAverage + ratingCount
*/

function UiIcon({ children, className = 'h-4 w-4' }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

const ICON_STAR = <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />;

const ICON_PIN = (
  <>
    <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="2.6" />
  </>
);

const ICON_SCHOOL = (
  <>
    <path d="M22 10 12 5 2 10l10 5 10-5Z" />
    <path d="M6 12v5c0 1.2 2.7 3 6 3s6-1.8 6-3v-5" />
    <path d="M22 10v7" />
  </>
);

const ICON_USERS = (
  <>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 20c.6-3.4 2.6-5.2 5.5-5.2S13.9 16.6 14.5 20" />
    <path d="M16 4.6c1.7.5 3 2 3 3.4s-1.3 2.9-3 3.4" />
    <path d="M18.2 14.2c1.6.9 2.6 2.6 2.9 5.3" />
  </>
);

const PLACE_TITLE_FONT =
  "'Aref Ruqaa','Katibeh','Amiri','Noto Naskh Arabic','Traditional Arabic',serif";

function ratingText(n: number): string {
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}`;
}

export interface CenterCardV637Props {
  center: PublicCenter;
  /** Animation stagger index for the reference's `result-card-enter` pop. */
  index?: number;
  className?: string;
}

export const CenterCardV637 = memo(function CenterCardV637({ center, index = 0, className = '' }: CenterCardV637Props) {
  const { t } = useT();
  const ratingAvg = center.ratingAverage ?? 0;
  const ratingCount = center.ratingCount ?? 0;
  const location = center.city ?? center.address ?? '';
  const features = (center.subjects ?? []).slice(0, 2);
  const centerUrl = `/centers/${center.id}`;

  return (
    <article
      style={{ '--card-i': index } as CSSProperties}
      className={`group relative overflow-hidden rounded-[22px] border border-[#dce7f0] bg-white shadow-[0_10px_28px_rgba(20,59,94,0.08)] dark:border-slate-700 dark:bg-slate-800 ${className}`}
    >
      <a href={centerUrl} className="relative block aspect-[16/8.4] overflow-hidden bg-[#eaf2f7]" aria-label={t('viewCenter')}>
        {center.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={center.photoUrl}
            alt={center.name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.015]"
          />
        ) : (
          <div className="absolute inset-0 flex items-end justify-start bg-[linear-gradient(135deg,#eaf2f7,#dcebf7)]" />
        )}

        {/* Rating pill — absolute top-start, LTR (reference) */}
        <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-white/95 px-[9px] py-[6px] shadow-[0_5px_15px_rgba(15,50,81,0.12)] backdrop-blur-sm dark:bg-slate-900/90" style={{ direction: 'ltr' }}>
          <i className="text-[17px] font-normal not-italic leading-none text-[#f4b400]">★</i>
          <b className="text-[12px] font-extrabold leading-none text-[#163b62] dark:text-slate-100">{ratingText(ratingAvg)}</b>
          <small className="text-[8px] font-medium leading-none text-[#8493a0]">({ratingCount.toLocaleString('en-US')})</small>
        </span>

        {/* Location pill — absolute top-end (reference) */}
        {location ? (
          <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-white/95 px-[9px] py-[6px] shadow-[0_5px_15px_rgba(15,50,81,0.12)] backdrop-blur-sm dark:bg-slate-900/90">
            <UiIcon className="h-[14px] w-[14px] shrink-0 text-[#6c63e8]">{ICON_PIN}</UiIcon>
            <b className="max-w-[120px] truncate text-[9px] font-bold text-[#163b62] dark:text-slate-100">{location}</b>
          </span>
        ) : null}

        {/* Decorative title overlay — centered pill over the media (reference V6.46) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-[14px] flex items-center justify-center px-4 text-center">
          <h3
            className="max-w-[82%] truncate whitespace-nowrap px-4 py-[9px] pb-[11px] text-[31px] font-bold leading-[1.12] text-white"
            style={{
              color: '#fff',
              borderRadius: '18px 18px 6px 18px',
              background: 'linear-gradient(135deg, rgba(70,55,154,0.92), rgba(56,46,128,0.88))',
              boxShadow: '0 10px 24px rgba(62,49,139,0.24)',
              textShadow: '0 2px 10px rgba(0,0,0,0.28)',
              fontFamily: PLACE_TITLE_FONT,
            }}
          >
            {center.name}
          </h3>
        </div>
      </a>

      <div className="grid gap-[10px] p-3">
        {/* Heading — small kind label + arrow link (reference) */}
        <div className="flex min-h-[28px] items-center justify-between gap-[10px]">
          <small className="mb-0.5 block text-[8.5px] font-black text-[#6c63e8]">{t('centerCardKind')}</small>
          <Link
            href={centerUrl}
            aria-label={t('viewCenter')}
            className="grid h-[34px] w-[34px] place-items-center rounded-[12px] bg-[#f2f0ff] text-[#6c63e8] no-underline hover:bg-[#e8e4ff] dark:bg-slate-700 dark:text-slate-200"
          >
            <span aria-hidden className="text-[16px] font-black leading-none">←</span>
          </Link>
        </div>

        {/* Info strip — 3 metric cells (reference `center-card-v637-info`) */}
        <div className="grid grid-cols-3 gap-[7px]">
          <span className="grid min-h-[52px] grid-cols-[auto_auto] place-content-center items-center gap-[3px_5px] rounded-[14px] border border-[#e3edf5] bg-[#f8fbff] p-[7px] text-center dark:border-slate-600 dark:bg-slate-700/40">
            <UiIcon className="col-start-1 row-span-2 h-[17px] w-[17px] text-[#6c63e8]">{ICON_SCHOOL}</UiIcon>
            <b className="text-[13px] leading-none text-[#173b62] dark:text-slate-100">{center.teacherCount.toLocaleString('en-US')}</b>
            <small className="text-[7.5px] font-medium leading-none text-[#74889a]">{t('centerCardTeachers')}</small>
          </span>
          <span className="grid min-h-[52px] grid-cols-[auto_auto] place-content-center items-center gap-[3px_5px] rounded-[14px] border border-[#e3edf5] bg-[#f8fbff] p-[7px] text-center dark:border-slate-600 dark:bg-slate-700/40">
            <UiIcon className="col-start-1 row-span-2 h-[17px] w-[17px] text-[#6c63e8]">{ICON_USERS}</UiIcon>
            <b className="text-[13px] leading-none text-[#173b62] dark:text-slate-100">{center.studentCount.toLocaleString('en-US')}</b>
            <small className="text-[7.5px] font-medium leading-none text-[#74889a]">{t('centerCardStudents')}</small>
          </span>
          <span className="grid min-h-[52px] grid-cols-[auto_auto] place-content-center items-center gap-[3px_5px] rounded-[14px] border border-[#e3edf5] bg-[#f8fbff] p-[7px] text-center dark:border-slate-600 dark:bg-slate-700/40">
            <UiIcon className="col-start-1 row-span-2 h-[17px] w-[17px] text-[#6c63e8]">{ICON_STAR}</UiIcon>
            <b className="text-[13px] leading-none text-[#173b62] dark:text-slate-100">{ratingText(ratingAvg)}</b>
            <small className="text-[7.5px] font-medium leading-none text-[#74889a]">{t('centerCardRating')}</small>
          </span>
        </div>

        {/* Feature chips — up to 2 (reference) */}
        {features.length > 0 && (
          <div className="flex flex-wrap gap-[6px]">
            {features.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1 rounded-full border border-[#e8e3ff] bg-[#f7f5ff] px-2 py-[5px] dark:border-slate-600 dark:bg-slate-700/40">
                <UiIcon className="h-[13px] w-[13px] text-[#5e5a9e]">{ICON_STAR}</UiIcon>
                <b className="text-[8px] font-bold text-[#5e5a9e] dark:text-slate-200">{s.name}</b>
              </span>
            ))}
          </div>
        )}

        {/* CTA — reference gradient button */}
        <Link
          href={centerUrl}
          className="flex h-[38px] items-center justify-center gap-[7px] rounded-[12px] bg-[linear-gradient(135deg,#1677f2,#3557e8)] text-[10px] font-black text-white no-underline transition-[filter] duration-150 hover:brightness-105"
        >
          {t('centerViewLink')} <b className="text-[15px] leading-none">←</b>
        </Link>
      </div>
    </article>
  );
});

export default CenterCardV637;