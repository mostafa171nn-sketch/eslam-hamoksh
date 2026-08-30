'use client';

import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import Link from 'next/link';
import { MapPin, Search, Star, X, ZoomIn, ExternalLink, Share2, Users, GraduationCap, Check } from 'lucide-react';
import { useT } from '../../i18n';
import type { Dict } from '../../i18n';
import type { PublicCenter } from '../../lib/api';

type TFunction = (key: keyof Dict) => string;

/* ------------------------------------------------------------------ */
/*  Custom marker icon (pin + name label)                              */
/* ------------------------------------------------------------------ */

/** Escape a string for safe insertion into the divIcon HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function makePinIcon(name: string, active: boolean) {
  const wrapCls = active ? 'ecms-pin-wrap ecms-pin-wrap--active' : 'ecms-pin-wrap';
  const pinCls = active ? 'ecms-pin ecms-pin--active' : 'ecms-pin';
  const labelCls = active ? 'ecms-marker-label ecms-marker-label--active' : 'ecms-marker-label';
  return L.divIcon({
    className: wrapCls,
    html: `
      <div class="${pinCls}"><span class="ecms-pin__dot"></span></div>
      <div class="${labelCls}" role="button" aria-label="${escapeHtml(name)}">${escapeHtml(name)}</div>
    `,
    iconSize: [30, 38],
    iconAnchor: [15, 38],
    popupAnchor: [0, -34],
  });
}

/* ------------------------------------------------------------------ */
/*  Map resize helper                                                  */
/* ------------------------------------------------------------------ */

function MapResize() {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 150);
    return () => window.clearTimeout(id);
  }, [map]);
  return null;
}

/* ------------------------------------------------------------------ */
/*  Map controller: fit bounds + flyTo                                 */
/* ------------------------------------------------------------------ */

function MapController({
  centers,
  focusCenterId,
  fitKey,
  visibleIds,
}: {
  centers: PublicCenter[];
  focusCenterId: string | null;
  fitKey: number;
  visibleIds: Set<string>;
}) {
  const map = useMap();

  useEffect(() => {
    const visible = centers.filter((c) => visibleIds.has(c.id));
    const coords = visible.filter((c) => c.latitude != null && c.longitude != null);
    if (coords.length === 0) {
      map.setView([30.0444, 31.2357], 6);
      return;
    }
    const bounds = L.latLngBounds(coords.map((c) => L.latLng(c.latitude as number, c.longitude as number)));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, visibleIds]);

  useEffect(() => {
    if (!focusCenterId) return;
    const c = centers.find((x) => x.id === focusCenterId);
    if (c && c.latitude != null && c.longitude != null) {
      map.flyTo([c.latitude, c.longitude], Math.max(map.getZoom(), 13), { duration: 0.8 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusCenterId]);

  return null;
}

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

  const handleShare = useCallback(async () => {
    if (!mapsUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: center.name, url: mapsUrl });
      } catch {
        /* user cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(mapsUrl);
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 2000);
      } catch {
        /* clipboard not available */
      }
    }
  }, [mapsUrl, center.name]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

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
  const [query, setQuery] = useState('');
  const [fitKey, setFitKey] = useState(0);
  const effectiveFitKey = fitSignal && fitSignal > 0 ? fitSignal : fitKey;

  const withCoords = useMemo(
    () => centers.filter((c) => c.latitude != null && c.longitude != null),
    [centers],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return withCoords;
    return withCoords.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.city ?? '').toLowerCase().includes(q),
    );
  }, [withCoords, query]);

  const visibleIds = useMemo(() => new Set(filtered.map((c) => c.id)), [filtered]);
  const startPos = defaultPos ?? { lat: 30.0444, lng: 31.2357, zoom: 6 };

  return (
    <div className="ecms-map-box relative h-full min-h-[400px] w-full">
      {/* Floating search */}
      <div className="pointer-events-none absolute start-3 top-3 z-[1000] w-[calc(100%-6rem)] max-w-xs">
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-800/95">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchOnMap')}
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label={t('clear')} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <MapContainer
        center={[startPos.lat, startPos.lng]}
        zoom={startPos.zoom ?? 6}
        scrollWheelZoom
        className="ecms-map"
        style={{ height: '100%', width: '100%', minHeight: 400 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapResize />
        <MapController centers={withCoords} focusCenterId={focusCenterId} fitKey={effectiveFitKey} visibleIds={visibleIds} />
        {filtered.map((c) => (
          <Marker
            key={c.id}
            position={[c.latitude as number, c.longitude as number]}
            icon={makePinIcon(c.name, c.id === focusCenterId)}
            eventHandlers={{
              click: () => onFocusCenter(c.id),
            }}
          >
            <Popup maxWidth={300} closeButton={false} className="ecms-center-popup">
              <CenterPopupContent center={c} t={t} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Fit-all button */}
      {withCoords.length > 0 && (
        <div className="pointer-events-none absolute bottom-3 end-3 z-[1000]">
          <button
            type="button"
            onClick={() => setFitKey((k) => k + 1)}
            className="pointer-events-auto flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-lg transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <ZoomIn className="h-4 w-4" /> {t('fitAllCenters')}
          </button>
        </div>
      )}

      {/* Empty state: no centers with coordinates */}
      {withCoords.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center">
          <div className="pointer-events-auto max-w-xs rounded-xl border border-slate-200 bg-white/95 px-4 py-3 text-center text-sm text-slate-600 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-300">
            {t('noCenterLocations')}
          </div>
        </div>
      )}
    </div>
  );
}
