'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { MapPin, Star, Share2, GraduationCap, Check, Sparkles, CalendarPlus } from 'lucide-react';
import { useT, type DictKey } from '../../../i18n';
import type { PublicTeacher } from '../../../lib/types';
import { formatCurrency } from '../../../lib/format';
import LocationMap, { type LocationMapItem } from '../../../components/map/LocationMap';

type TFunction = (key: DictKey) => string;

/* ------------------------------------------------------------------ */
/*  Teacher location → real Cairo coordinates                          */
/*                                                                     */
/*  Teachers reference a branch/location by name (no lat/lng in the    */
/*  data), so we resolve the known branch names to the coordinates of  */
/*  the actual neighbourhoods they describe. This keeps the SAME map   */
/*  provider/UI as the Centers map, plotting teacher data instead.     */
/* ------------------------------------------------------------------ */

const BRANCH_COORDS: { re: RegExp; lat: number; lng: number }[] = [
  { re: /nasr/i, lat: 30.0549, lng: 31.3172 }, // Nasr City
  { re: /maadi|ma'adi/i, lat: 29.9654, lng: 31.2569 }, // Maadi
  { re: /dokki|doky/i, lat: 30.0329, lng: 31.2085 }, // Dokki
  { re: /giza|haram/i, lat: 30.013, lng: 31.209 }, // Giza / El-Haram
  { re: /october|6th/i, lat: 29.9414, lng: 30.9184 }, // 6th of October City
  { re: /new cairo|settlement|fifth|teseen/i, lat: 30.0306, lng: 31.4705 }, // Fifth Settlement
  { re: /heliopolis/i, lat: 30.1259, lng: 31.3315 }, // Heliopolis
  { re: /zamalek/i, lat: 30.064, lng: 31.213 }, // Zamalek
  { re: /cairo|downtown|branch/i, lat: 30.0444, lng: 31.2357 }, // Downtown Cairo
];

const DEFAULT_COORDS = { lat: 30.0444, lng: 31.2357 };

export function resolveLocationCoords(locationName: string | null | undefined): { lat: number; lng: number } {
  const name = locationName?.trim();
  if (!name) return DEFAULT_COORDS;
  const hit = BRANCH_COORDS.find((b) => b.re.test(name));
  return hit ?? DEFAULT_COORDS;
}

/* ------------------------------------------------------------------ */
/*  Teacher popup — mirrors the Center popup layout, teacher data      */
/* ------------------------------------------------------------------ */

function TeacherPopupContent({ teacher, t }: { teacher: PublicTeacher; t: TFunction }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const subject = teacher.subjects[0]?.name ?? '';
  const coords = resolveLocationCoords(teacher.location?.name);
  const mapsUrl = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: teacher.fullName, url: mapsUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(mapsUrl).then(() => {
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  };

  return (
    <div className="ecms-popup-card min-w-[220px] max-w-[280px]">
      {teacher.photo && (
        <div className="mb-2.5 overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={teacher.photo} alt={teacher.fullName} className="h-28 w-full object-cover" loading="lazy" decoding="async" />
        </div>
      )}
      <p className="text-sm font-semibold text-slate-900 leading-tight">{teacher.fullName}</p>
      {teacher.location?.name && (
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{teacher.location.name}</span>
          <span className="text-slate-400">·</span>
          <span className="truncate text-slate-500">{subject}</span>
        </p>
      )}
      {(teacher.ratingCount ?? 0) > 0 && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-600">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="font-medium">{teacher.rating.toFixed(1)}</span>
          <span className="text-slate-400">({teacher.ratingCount})</span>
        </p>
      )}
      <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <GraduationCap className="h-3.5 w-3.5" /> {subject}
        </span>
        <span className="flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" /> {teacher.yearsExperience} {t('yrsExp')}
        </span>
      </div>
      <p className="mt-2 text-sm font-bold text-slate-900">
        {formatCurrency(teacher.hourlyRate)} <span className="text-xs font-medium text-slate-500">{t('perHour')}</span>
      </p>
      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2.5">
        <Link
          href={`/teachers/${teacher.id}?book=1`}
          className="ecms-popup-btn ecms-popup-btn--primary inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700"
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          {t('bookNow')}
        </Link>
        <button
          type="button"
          onClick={handleShare}
          className="ecms-popup-btn inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              {t('locationCopied')}
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5" />
              {t('shareLocation')}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface TeacherMapProps {
  teachers: PublicTeacher[];
  defaultPos?: { lat: number; lng: number; zoom?: number };
  /** Increment (any number change) to trigger a fit-to-bounds/focus. */
  fitSignal?: number;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function TeacherMap({ teachers, defaultPos, fitSignal }: TeacherMapProps) {
  const { t } = useT();

  const items: LocationMapItem[] = useMemo(() => {
    const seen = new Map<string, number>();
    return teachers.map((teacher) => {
      const { lat, lng } = resolveLocationCoords(teacher.location?.name);
      // Nudge repeats so pins sharing a branch don't overlap exactly.
      const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      const n = seen.get(key) ?? 0;
      seen.set(key, n + 1);
      const jitter = n === 0 ? 0 : (n % 3) === 1 ? 0.0045 : -0.0045;
      return {
        id: teacher.id,
        name: teacher.fullName,
        city: teacher.location?.name ?? null,
        latitude: lat + (n === 0 ? 0 : jitter),
        longitude: lng + (n === 0 ? 0 : jitter),
        image: teacher.photo ?? null,
        rating: teacher.ratingCount > 0 ? teacher.rating : null,
        ratingCount: teacher.ratingCount,
        kind: 'teacher' as const,
      };
    });
  }, [teachers]);

  const teacherById = useMemo(() => new Map(teachers.map((teacher) => [teacher.id, teacher])), [teachers]);

  return (
    <LocationMap
      items={items}
      renderPopup={(item) => (
        <TeacherPopupContent teacher={teacherById.get(item.id) ?? teachers[0]} t={t} />
      )}
      labels={{
        searchPlaceholder: t('searchOnMap'),
        fitAll: t('fitAllTeachers'),
        empty: t('noTeacherLocations'),
        clear: t('clear'),
      }}
      defaultPos={defaultPos}
      fitSignal={fitSignal}
    />
  );
}