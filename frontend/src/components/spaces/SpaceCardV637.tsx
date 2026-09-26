'use client';

import { memo, type CSSProperties, type ReactNode } from 'react';
import { useT } from '../../i18n';
import type { PublicSpace } from '../../lib/api';

/*
  Co-space result card — exact reproduction of the reference's `.youth-place-card`
  (V6.37 marketplace card, "space-discovery" flavor), adapted to the real,
  future `PublicSpace` contract.

  Reference → adaptation notes:
    - Every metric is rendered from real fields and falls back to '—' when the
      value is missing (no fake numbers).
    - The reference links to `space.html?id=…` (a detail page that does not
      exist). Here the media + CTA link to the owning center profile when the
      space carries a `centerId`; otherwise the card renders without a link —
      honest, nothing dead-ends.
    - The co-space identity is teal (`--space-accent #18a88a`) instead of the
      centers' purple/blue: location pill, metric icons and the soft CTA.
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

const ICON_PIN = (
  <>
    <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="2.6" />
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

const ICON_ROOMS = (
  <>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 3v18" />
  </>
);

const ICON_CHECK = (
  <>
    <path d="M20 6 9 17l-5-5" />
  </>
);

const PLACE_TITLE_FONT =
  "'Aref Ruqaa','Katibeh','Amiri','Noto Naskh Arabic','Traditional Arabic',serif";

function priceText(space: PublicSpace): string | null {
  const p = space.prices ?? [];
  const numeric = p.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (numeric.length === 0) return null;
  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  if (min === max) return `${min}`;
  return `${min} - ${max}`;
}

export interface SpaceCardV637Props {
  space: PublicSpace;
  /** Animation stagger index for the reference `result-card-enter` pop. */
  index?: number;
  className?: string;
}

export const SpaceCardV637 = memo(function SpaceCardV637({ space, index = 0, className = '' }: SpaceCardV637Props) {
  const { t } = useT();

  const ratingCount = space.ratingCount ?? 0;
  const location = [space.area, space.governorate].filter(Boolean).join('، ') || null;
  const features = (space.features ?? []).slice(0, 4);
  const href = space.centerId ? `/centers/${space.centerId}` : null;
  const price = priceText(space);

  return (
    <article
      style={{ '--card-i': index } as CSSProperties}
      className={`group relative overflow-hidden rounded-[26px] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] p-2 shadow-[0_10px_30px_rgba(22,62,96,0.10)] transition-[transform,box-shadow] duration-200 hover:-translate-y-[5px] hover:shadow-[0_18px_38px_rgba(18,63,100,0.15)] dark:[background:none] dark:bg-slate-800 dark:border dark:border-slate-700 ${className}`}
    >
      {/* ── Media (#youth-place-media) ── */}
      <div className="relative isolate h-[180px] overflow-hidden rounded-[20px] bg-[#dfeaf2] max-[430px]:h-[174px] max-[390px]:h-[166px]">
        {href ? (
          <a href={href} aria-label={t('spaceCardView')} className="absolute inset-0 z-0 block overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={space.photoUrl ?? ''}
              alt={space.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-[0.25s] group-hover:scale-[1.045]"
            />
          </a>
        ) : (
          <div className="absolute inset-0 z-0 bg-[linear-gradient(135deg,#e8f6f1,#d9efe7)]" />
        )}

        {/* Bottom gradient overlay (reference) */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 top-[52%] z-[1] bg-[linear-gradient(180deg,transparent,rgba(7,27,45,0.72))]"
        />

        {/* Rating pill — absolute top-left, LTR (reference `.youth-rating`) */}
        {ratingCount > 0 && space.ratingAverage != null && (
          <span
            className="absolute left-[11px] top-[11px] z-[2] inline-flex h-[30px] items-center gap-[4px] rounded-full bg-white/93 px-[9px] shadow-[0_4px_14px_rgba(16,43,65,0.10)] backdrop-blur-[10px]"
            style={{ direction: 'ltr' }}
          >
            <i className="text-[12px] font-normal not-italic leading-none text-[#f4b400]">★</i>
            <b className="text-[12px] font-extrabold leading-none text-[#183d62] dark:text-slate-100">
              {space.ratingAverage.toFixed(1)}
            </b>
            <small className="text-[8px] font-medium leading-none text-[#718398]">({ratingCount})</small>
          </span>
        )}

        {/* Location pill — absolute top-right, teal accent (reference `.youth-location`) */}
        {location && (
          <span className="absolute right-[11px] top-[11px] z-[2] inline-flex h-[30px] items-center gap-[4px] rounded-full border border-[rgba(24,168,138,0.28)] bg-white/93 px-[9px] shadow-[0_4px_14px_rgba(16,43,65,0.10)] backdrop-blur-[10px]">
            <UiIcon className="h-[14px] w-[14px] text-[#18a88a]">{ICON_PIN}</UiIcon>
            <b className="max-w-[120px] truncate text-[10px] font-bold text-[#183d62] dark:text-slate-100">{location}</b>
          </span>
        )}

        {/* Title — centered teal pill in the Aref Ruqaa face (reference) */}
        <div
          className="pointer-events-none absolute inset-x-[14px] bottom-[11px] z-[2] flex justify-center text-center"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.28)' }}
        >
          <h3
            className="max-w-[72%] text-[31px] font-bold leading-[1.35] text-white max-[430px]:text-[28px] max-[390px]:text-[27px]"
            style={{
              color: '#fff',
              borderRadius: '18px 18px 6px 18px',
              background: 'rgba(10,87,72,0.72)',
              boxShadow: '0 6px 18px rgba(24,168,138,0.18)',
              padding: '8px 15px 10px',
              fontFamily: PLACE_TITLE_FONT,
            }}
          >
            {space.name}
          </h3>
        </div>
      </div>

      {/* ── Body (#youth-place-body) ── */}
      <div className="px-[9px] pb-[8px] pt-[10px]">
        {/* Primary row — price + inline CTA (reference `.youth-primary-row`) */}
        <div className="flex min-h-[42px] items-center justify-between gap-[10px]">
          <strong className="whitespace-nowrap text-[19px] font-black tracking-[-0.02em] text-[#0b6cab] dark:text-sky-300">
            {price ?? (
              <span className="text-[13px] font-bold text-[#8493a4] dark:text-slate-400">{t('notSet')}</span>
            )}{' '}
            <small className="text-[9px] font-extrabold text-[#71869a] dark:text-slate-400">
              {t('spaceCardPricePerHour')}
            </small>
          </strong>
          {href && (
            <a
              href={href}
              className="inline-flex h-[36px] items-center gap-[8px] rounded-full border border-[rgba(24,168,138,0.24)] bg-[#eaf9f5] px-[12px] text-[11px] font-black text-[#11856d] no-underline shadow-[0_7px_18px_rgba(24,168,138,0.16)] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(24,168,138,0.24)]"
            >
              <span>{t('spaceCardView')}</span>
              <b className="grid h-[22px] w-[22px] place-items-center rounded-full bg-[rgba(24,168,138,0.14)] text-[13px] leading-none">
                ←
              </b>
            </a>
          )}
        </div>

        {/* Metrics — capacity + space type (reference `.youth-metric-grid`) */}
        <div className="mt-[8px] grid grid-cols-2 gap-[8px]">
          <span className="grid min-h-[58px] grid-cols-[26px_auto_1fr_auto] items-center gap-[5px] rounded-[15px] border border-[#dceaf4] bg-[linear-gradient(135deg,#f8fcff,#eef7ff)] px-[10px] py-[8px] text-[#36536e] dark:border-slate-600 dark:bg-slate-700/40">
            <UiIcon className="h-[21px] w-[21px] text-[#18a88a]">{ICON_USERS}</UiIcon>
            <small className="text-[9px] font-extrabold text-[#7b8d9e] dark:text-slate-400">{t('spaceCardCapacity')}</small>
            <strong className="justify-self-end text-[18px] font-black leading-none text-[#123a62] dark:text-slate-100">
              {space.capacity ?? '—'}
            </strong>
            <em className="text-[9px] font-extrabold not-italic text-[#74889a] dark:text-slate-400">{t('spaceCardPeople')}</em>
          </span>
          <span className="grid min-h-[58px] grid-cols-[26px_auto_1fr] items-center gap-[5px] rounded-[15px] border border-[#dceaf4] bg-[linear-gradient(135deg,#f8fcff,#eef7ff)] px-[10px] py-[8px] text-[#36536e] dark:border-slate-600 dark:bg-slate-700/40">
            <UiIcon className="h-[21px] w-[21px] text-[#18a88a]">{ICON_ROOMS}</UiIcon>
            <small className="text-[9px] font-extrabold text-[#7b8d9e] dark:text-slate-400">{t('spaceCardType')}</small>
            <strong
              title={space.spaceType ?? undefined}
              className="max-w-[120px] justify-self-end truncate text-[12px] font-black leading-[1.2] text-[#123a62] dark:text-slate-100"
            >
              {space.spaceType ?? '—'}
            </strong>
          </span>
        </div>

        {/* Feature chips — one clipped row (reference `.youth-features-inline`) */}
        {features.length > 0 && (
          <div className="mt-[6px] flex min-w-0 gap-[5px] overflow-hidden border-t border-[#edf2f6] pt-[7px]">
            {features.map((f) => (
              <span
                key={f}
                className="inline-flex h-[25px] flex-shrink-0 items-center gap-[4px] rounded-full border border-[#e0eaf2] bg-[#f7fbfe] px-[7px] text-[8.5px] font-bold text-[#48657f] dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-300"
              >
                <UiIcon className="h-[13px] w-[13px] text-[#18a88a]">{ICON_CHECK}</UiIcon>
                <b className="font-bold">{f}</b>
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
});

export default SpaceCardV637;