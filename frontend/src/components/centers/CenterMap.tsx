'use client';

import { useMemo, useRef, useState } from 'react';
import { MapPin, Star, ExternalLink, Share2, Users, GraduationCap, Check } from 'lucide-react';
import Link from 'next/link';
import { useT } from '../../i18n';
import type { Dict } from '../../i18n';
import type { PublicCenter } from '../../lib/api';
import LocationMap from '../map/LocationMap';

type TFunction = (key: keyof Dict) => string;

/* ------------------------------------------------------------------ */
/*  Popup content                                                      */
/* ------------------------------------------------------------------ */

function CenterPopupContent({ center, t }: { center: PublicCenter; t: TFunction }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mapsUrl = useMemo(() => {
    if (center.latitude == null || center.longitude == null) return null;
    return `https://www.google.com/maps?q=${center.latitude},${center.longitude}`;
  }, [center.latitude, center.longitude]);

  const handleShare = () => {
    if (!mapsUrl) return;
    if (navigator.share) {
      navigator.share({ title: center.name, url: mapsUrl }).catch(() => {});
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
      {center.photoUrl && (
        <div className="mb-2.5 overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={center.photoUrl} alt={center.name} className="h-28 w-full object-cover" />
        </div>
      )}
      <p className="text-sm font-semibold text-slate-900 leading-tight">{center.name}</p>
      {(center.city || center.address) && (
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{center.address || center.city}</span>
        </p>
      )}
      {(center.ratingCount ?? 0) > 0 && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-600">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="font-medium">{(center.ratingAverage ?? 0).toFixed(1)}</span>
          <span className="text-slate-400">({center.ratingCount})</span>
        </p>
      )}
      <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <GraduationCap className="h-3.5 w-3.5" /> {center.teacherCount} {t('teachersLabel')}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" /> {center.studentCount} {t('studentsLabel')}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2.5">
        <Link
          href={`/centers/${center.id}`}
          className="ecms-popup-btn ecms-popup-btn--primary inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t('viewCenter')}
        </Link>
        {mapsUrl && (
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
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface CenterMapProps {
  centers: PublicCenter[];
  focusCenterId: string | null;
  onFocusCenter: (id: string) => void;
  defaultPos?: { lat: number; lng: number; zoom?: number };
  /** Increment (any number change) to trigger a fit-to-bounds/focus. */
  fitSignal?: number;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function CenterMap({ centers, focusCenterId, onFocusCenter, defaultPos, fitSignal }: CenterMapProps) {
  const { t } = useT();

  const items = useMemo(
    () =>
      centers.map((center) => ({
        id: center.id,
        name: center.name,
        city: center.city,
        latitude: center.latitude,
        longitude: center.longitude,
        image: center.photoUrl ?? null,
        rating: center.ratingAverage ?? null,
        ratingCount: center.ratingCount ?? null,
        kind: 'center' as const,
      })),
    [centers],
  );

  const centerById = useMemo(() => new Map(centers.map((center) => [center.id, center])), [centers]);

  return (
    <LocationMap
      items={items}
      focusItemId={focusCenterId}
      onFocusItem={onFocusCenter}
      renderPopup={(item) => (
        <CenterPopupContent center={centerById.get(item.id) ?? centers[0]} t={t} />
      )}
      labels={{
        searchPlaceholder: t('searchOnMap'),
        fitAll: t('fitAllCenters'),
        empty: t('noCenterLocations'),
        clear: t('clear'),
      }}
      defaultPos={defaultPos}
      fitSignal={fitSignal}
    />
  );
}