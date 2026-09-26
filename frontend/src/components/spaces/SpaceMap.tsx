'use client';

import { useMemo } from 'react';
import { MapPin, Star, Users, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useT } from '../../i18n';
import type { Dict } from '../../i18n';
import type { PublicSpace } from '../../lib/api';
import LocationMap from '../map/LocationMap';

type TFunction = (key: keyof Dict) => string;

/* ------------------------------------------------------------------ */
/*  Popup content                                                      */
/* ------------------------------------------------------------------ */

function SpacePopupContent({ space, t }: { space: PublicSpace; t: TFunction }) {
  const location = [space.area, space.governorate].filter(Boolean).join('، ') || null;

  return (
    <div className="ecms-popup-card min-w-[220px] max-w-[280px]">
      {space.photoUrl && (
        <div className="mb-2.5 overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={space.photoUrl} alt={space.name} className="h-28 w-full object-cover" loading="lazy" decoding="async" />
        </div>
      )}
      <p className="text-sm font-semibold text-slate-900 leading-tight">{space.name}</p>
      {location && (
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="h-3 w-3 shrink-0 text-[#18a88a]" />
          <span className="truncate">{location}</span>
        </p>
      )}
      {(space.ratingCount ?? 0) > 0 && space.ratingAverage != null && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-600">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="font-medium">{space.ratingAverage.toFixed(1)}</span>
          <span className="text-slate-400">({space.ratingCount})</span>
        </p>
      )}
      <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
        {space.capacity != null && (
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {space.capacity}
          </span>
        )}
        {space.spaceType && <span className="truncate">{space.spaceType}</span>}
      </div>
      {space.centerId && (
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2.5">
          <Link
            href={`/centers/${space.centerId}`}
            className="ecms-popup-btn ecms-popup-btn--primary inline-flex items-center gap-1.5 rounded-lg bg-[#0e8574] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0c7264]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t('viewCenter')}
          </Link>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface SpaceMapProps {
  spaces: PublicSpace[];
  focusSpaceId: string | null;
  onFocusSpace: (id: string) => void;
  defaultPos?: { lat: number; lng: number; zoom?: number };
  /** Increment (any number change) to trigger a fit-to-bounds/focus. */
  fitSignal?: number;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function SpaceMap({ spaces, focusSpaceId, onFocusSpace, defaultPos, fitSignal }: SpaceMapProps) {
  const { t } = useT();

  const items = useMemo(
    () =>
      spaces.map((space) => ({
        id: space.id,
        name: space.name,
        city: space.area ?? space.governorate ?? null,
        latitude: space.latitude,
        longitude: space.longitude,
        image: space.photoUrl ?? null,
        rating: space.ratingAverage ?? null,
        ratingCount: space.ratingCount ?? null,
        kind: 'space' as const,
      })),
    [spaces],
  );

  const spaceById = useMemo(() => new Map(spaces.map((space) => [space.id, space])), [spaces]);

  return (
    <LocationMap
      items={items}
      focusItemId={focusSpaceId}
      onFocusItem={onFocusSpace}
      renderPopup={(item) => (
        <SpacePopupContent space={spaceById.get(item.id) ?? spaces[0]} t={t} />
      )}
      labels={{
        searchPlaceholder: t('searchOnMap'),
        fitAll: t('fitAllSpaces'),
        empty: t('noSpaceLocations'),
        clear: t('clear'),
      }}
      defaultPos={defaultPos}
      fitSignal={fitSignal}
    />
  );
}