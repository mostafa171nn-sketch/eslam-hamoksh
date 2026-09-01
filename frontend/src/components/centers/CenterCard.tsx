'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Star,
  MapPin,
  Users,
  GraduationCap,
  Wifi,
  Monitor,
  Presentation,
  Wind,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  ArrowRight,
  MoreVertical,
  ExternalLink,
  MapPinned,
} from 'lucide-react';
import { useT } from '../../i18n';
import type { PublicCenter } from '../../lib/api';

// ---------------------------------------------------------------------------
// Accent palette – harmonious with Maarej brand (brand / gold / teal / violet / emerald)
// ---------------------------------------------------------------------------
type AccentVariant = {
  stripe: string;
  cta: string;
  dot: string;
};

const ACCENTS: AccentVariant[] = [
  {
    stripe: 'bg-emerald-500',
    cta: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/40 dark:hover:bg-emerald-900/30',
    dot: 'bg-emerald-500',
  },
  {
    stripe: 'bg-brand-500',
    cta: 'bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-300 dark:border-brand-800/40 dark:hover:bg-brand-900/30',
    dot: 'bg-brand-500',
  },
  {
    stripe: 'bg-violet-500',
    cta: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800/40 dark:hover:bg-violet-900/30',
    dot: 'bg-violet-500',
  },
  {
    stripe: 'bg-amber-500',
    cta: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/40 dark:hover:bg-amber-900/30',
    dot: 'bg-amber-500',
  },
  {
    stripe: 'bg-teal-500',
    cta: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800/40 dark:hover:bg-teal-900/30',
    dot: 'bg-teal-500',
  },
  {
    stripe: 'bg-rose-500',
    cta: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/40 dark:hover:bg-rose-900/30',
    dot: 'bg-rose-500',
  },
];

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function getAccent(centerId: string, index?: number): AccentVariant {
  const h = index != null ? index : hashString(centerId);
  const combined = typeof centerId === 'string' ? hashString(centerId) + (index ?? 0) * 7 : h;
  return ACCENTS[combined % ACCENTS.length];
}

// ---------------------------------------------------------------------------
// Equipment / subjects → chips
// ---------------------------------------------------------------------------
const EQUIPMENT_POOL = ['Wi-Fi', 'Projector', 'Smart Board', 'AC', 'Whiteboard'] as const;
const MAX_VISIBLE_CHIPS = 3;

function getEquipmentForCenter(center: PublicCenter, index?: number): string[] {
  if (center.subjects && center.subjects.length > 0) {
    return center.subjects.map((s) => s.name);
  }
  const h = hashString(center.id + String(index ?? 0));
  const count = 2 + (h % 2);
  const start = h % EQUIPMENT_POOL.length;
  const res: string[] = [];
  for (let i = 0; i < count; i++) res.push(EQUIPMENT_POOL[(start + i) % EQUIPMENT_POOL.length]);
  return res;
}

function EquipmentIcon({ name, className }: { name: string; className?: string }) {
  const lower = name.toLowerCase();
  if (lower.includes('wifi') || lower.includes('wi-fi') || lower.includes('واي')) return <Wifi className={className} />;
  if (lower.includes('projector') || lower.includes('بروجي')) return <Presentation className={className} />;
  if (lower.includes('smart') || lower.includes('board') || lower.includes('شاشة') || lower.includes('سبورة')) return <Monitor className={className} />;
  if (lower.includes('ac') || lower.includes('تكييف')) return <Wind className={className} />;
  return <Monitor className={className} />;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface CenterCardProps {
  center: PublicCenter;
  index?: number;
  isActive?: boolean;
  onFocus?: (id: string) => void;
  onShowOnMap?: (id: string) => void;
  images?: string[];
  priceRange?: { min: number; max: number; currency?: string } | null;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function CenterCard({ center, index, isActive, onFocus, onShowOnMap, images: imagesProp, priceRange, className = '' }: CenterCardProps) {
  const { t, dir } = useT();
  const isRtl = dir === 'rtl';
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [menuOpen]);

  const images = useMemo(() => {
    if (imagesProp && imagesProp.length > 0) return imagesProp.filter(Boolean);
    if (center.photoUrl) return [center.photoUrl];
    return [];
  }, [imagesProp, center.photoUrl]);

  const [current, setCurrent] = useState(0);
  const total = images.length || 1;
  const hasMultiple = images.length > 1;

  const goPrev = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      setCurrent((c) => (c - 1 + images.length) % images.length);
    },
    [images.length]
  );
  const goNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      setCurrent((c) => (c + 1) % images.length);
    },
    [images.length]
  );

  const accent = useMemo(() => getAccent(center.id, index), [center.id, index]);
  const equipment = useMemo(() => getEquipmentForCenter(center, index), [center, index]);
  const visibleChips = equipment.slice(0, MAX_VISIBLE_CHIPS);
  const overflowCount = equipment.length - MAX_VISIBLE_CHIPS;

  const ratingAvg = center.ratingAverage ?? 0;
  const ratingCount = center.ratingCount ?? 0;
  const showRating = ratingCount > 0;

  const priceLabel = useMemo(() => {
    const val = t('priceRange');
    if (val && !val.startsWith('[MISSING')) return val;
    return isRtl ? 'نطاق السعر' : 'Price range';
  }, [t, isRtl]);

  const priceValue = useMemo(() => {
    if (priceRange) {
      const cur = priceRange.currency ?? 'EGP';
      if (priceRange.min === priceRange.max) return `${priceRange.min} ${cur}`;
      return `${priceRange.min} – ${priceRange.max} ${cur}`;
    }
    return null;
  }, [priceRange]);

  const ctaText = useMemo(() => {
    const v = t('viewCenter');
    if (v && !v.startsWith('[MISSING')) return v;
    return isRtl ? 'عرض السنتر' : 'View Center';
  }, [t, isRtl]);

  const centerUrl = `/centers/${center.id}`;

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-[28px] border bg-white dark:bg-slate-800 transition-all duration-300 hover:-translate-y-[4px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08),0_16px_40px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.25),0_16px_40px_rgba(0,0,0,0.2)] ${isActive ? 'border-brand-300 ring-2 ring-brand-100 dark:border-brand-500 dark:ring-brand-900/40 shadow-[0_8px_24px_rgba(79,70,229,0.12)]' : 'border-slate-200/70 dark:border-slate-700/60 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]'} ${className}`}
    >
      {/* Accent vertical stripe – logical inline-start */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 start-0 w-[6px] ${accent.stripe}`}
        style={{ borderStartStartRadius: 28, borderEndStartRadius: 28 }}
      />

      {/* Inner padding wrapper – leaves space for stripe */}
      <div className="flex flex-1 flex-col p-3 sm:p-4 ps-[14px] sm:ps-[18px]">
        {/* ---------- IMAGE SECTION ---------- */}
        <div className="relative overflow-hidden rounded-[20px] bg-slate-100 dark:bg-slate-700/40 aspect-[16/10] isolate">
          {images.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={images[current] ?? images[0]}
              alt={center.name}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-500 via-brand-600 to-violet-600">
              <span className="text-4xl font-bold tracking-tight text-white/95">{center.name.charAt(0).toUpperCase()}</span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-60" />

          {/* Image counter badge – logical start */}
          <div className="absolute top-3 start-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md border border-white/10">
            <ImageIcon className="h-3.5 w-3.5 opacity-90" />
            <span>
              {total > 0 ? `${current + 1}/${total}` : '1/1'}
            </span>
          </div>

          {/* Three-dot menu – top right (respects RTL via logical end) */}
          <div className="absolute top-3 end-3 z-20" ref={menuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen((p) => !p);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md border border-white/10 hover:bg-black/70 transition-colors"
              aria-label="More options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div
                className={`absolute top-full mt-1.5 ${isRtl ? 'start-0' : 'end-0'} z-50 min-w-[160px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 animate-slide-in`}
              >
                <Link
                  href={centerUrl}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <ExternalLink className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  {ctaText}
                </Link>
                {onShowOnMap && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onShowOnMap(center.id);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <MapPinned className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    {t('showOnMap')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Prev / Next – only if multiple */}
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label={isRtl ? 'Next image' : 'Previous image'}
                className="absolute top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-700 shadow-md border border-slate-200/60 hover:bg-slate-50 transition-colors duration-200 start-2 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
              >
                {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label={isRtl ? 'Previous image' : 'Next image'}
                className="absolute top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-700 shadow-md border border-slate-200/60 hover:bg-slate-50 transition-colors duration-200 end-2 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
              >
                {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </>
          )}

          {/* Carousel indicators – bottom center */}
          <div className="absolute bottom-3 start-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrent(i);
                }}
                aria-label={`Go to image ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-200 ${i === current ? 'w-5 bg-white shadow' : 'w-1.5 bg-white/60 hover:bg-white/80'}`}
              />
            ))}
          </div>
        </div>

        {/* ---------- INFO SECTION ---------- */}
        <div className="mt-4 flex flex-1 flex-col px-1 pb-1">
          {/* Rating row */}
          <div className="flex items-center gap-2">
            {showRating ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/40">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {ratingAvg.toFixed(1)}
                <span className="font-normal text-amber-600/70 dark:text-amber-400/60">({ratingCount})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 border border-slate-200 dark:bg-slate-700/60 dark:text-slate-400 dark:border-slate-600">
                <Star className="h-3.5 w-3.5 text-slate-400" />
                {t('noRatingsYet')}
              </span>
            )}
            {isActive && <span className={`ms-auto inline-flex h-2 w-2 rounded-full ${accent.dot} animate-pulse`} aria-hidden />}
          </div>

          {/* Center name – clamped to 2 lines */}
          <Link
            href={centerUrl}
            onClick={(e) => {
              if (onFocus) {
                e.preventDefault();
                onFocus(center.id);
              }
            }}
            className="mt-3 block text-[18px] sm:text-[19px] font-bold leading-tight tracking-tight text-slate-900 hover:text-brand-700 dark:text-white dark:hover:text-brand-300 transition-colors line-clamp-2 min-h-[2.5rem]"
          >
            {center.name}
          </Link>

          {/* Location */}
          {(center.city || center.address) && (
            <p className="mt-1.5 flex items-start gap-1.5 text-sm leading-snug text-slate-500 dark:text-slate-400">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
              <span className="line-clamp-1">{center.city ?? center.address}</span>
            </p>
          )}

          {/* Capacity */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <span className="font-medium">
                {center.studentCount ?? 0} {t('studentsCount')}
              </span>
            </span>
            <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" aria-hidden />
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <span className="font-medium">
                {center.teacherCount ?? 0} {t('teachersLabel')}
              </span>
            </span>
          </div>

          {/* Equipment chips – max 3 visible + overflow count */}
          {equipment.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {visibleChips.map((eq) => (
                <span
                  key={eq}
                  className="inline-flex items-center gap-1 rounded-full border bg-[#fffbeb] px-2.5 py-1 text-xs font-medium text-amber-800 border-amber-200/60 dark:bg-amber-900/15 dark:text-amber-300 dark:border-amber-800/30"
                >
                  <EquipmentIcon name={eq} className="h-3.5 w-3.5 opacity-70" />
                  {eq}
                </span>
              ))}
              {overflowCount > 0 && (
                <span className="inline-flex items-center rounded-full border bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 border-slate-200 dark:bg-slate-700/60 dark:text-slate-400 dark:border-slate-600">
                  +{overflowCount}
                </span>
              )}
            </div>
          )}

          {/* Spacer to push bottom content down */}
          <div className="flex-1" />

          {/* Divider + Price + CTA – always pinned to bottom */}
          <div className="mt-4 border-t border-slate-100 dark:border-slate-700/50 pt-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{priceLabel}</p>
                {priceValue ? (
                  <p className="mt-1 text-[15px] font-bold leading-none text-slate-900 dark:text-white">{priceValue}</p>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {t('contactForPricing')}
                  </p>
                )}
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                <Users className="h-3.5 w-3.5" />
                {center.studentCount ?? 0}
              </span>
            </div>
          </div>

          {/* CTA Button */}
          <Link
            href={centerUrl}
            className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[16px] border px-4 py-3.5 text-sm font-semibold transition-all duration-200 group/cta ${accent.cta}`}
          >
            <span>{ctaText}</span>
            <ArrowRight
              className={`h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-1 ${isRtl ? 'rotate-180 group-hover/cta:-translate-x-1' : ''}`}
            />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default CenterCard;
