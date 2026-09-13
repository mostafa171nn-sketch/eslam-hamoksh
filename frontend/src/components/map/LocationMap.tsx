'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Search, X, ZoomIn } from 'lucide-react';
import { makeEntityIcon, type EntityMarkerData } from './entityMarker';

/** A generic map row — any entity that can be placed on the map. */
export interface LocationMapItem extends Omit<EntityMarkerData, 'id' | 'name' | 'kind'> {
  id: string;
  name: string;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  kind?: 'center' | 'teacher';
}

interface LocationMapProps {
  items: LocationMapItem[];
  focusItemId?: string | null;
  onFocusItem?: (id: string) => void;
  /** Marker popup content — keep it self-contained so the map stays generic. */
  renderPopup: (item: LocationMapItem) => ReactNode;
  labels: { searchPlaceholder: string; fitAll: string; empty: string; clear: string };
  defaultPos?: { lat: number; lng: number; zoom?: number };
  /** Increment (any number change) to trigger a fit-to-bounds/focus. */
  fitSignal?: number;
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
  items,
  focusItemId,
  fitKey,
  visibleIds,
}: {
  items: LocationMapItem[];
  focusItemId: string | null;
  fitKey: number;
  visibleIds: Set<string>;
}) {
  const map = useMap();

  useEffect(() => {
    const coords = items.filter(
      (c) =>
        typeof c.latitude === 'number' &&
        typeof c.longitude === 'number' &&
        Number.isFinite(c.latitude) &&
        Number.isFinite(c.longitude),
    );
    if (coords.length === 0) {
      map.setView([30.0444, 31.2357], 6);
      return;
    }
    const bounds = L.latLngBounds(coords.map((c) => L.latLng(c.latitude as number, c.longitude as number)));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, visibleIds]);

  useEffect(() => {
    if (!focusItemId) return;
    const c = items.find((x) => x.id === focusItemId);
    if (
      c &&
      typeof c.latitude === 'number' &&
      typeof c.longitude === 'number' &&
      Number.isFinite(c.latitude) &&
      Number.isFinite(c.longitude)
    ) {
      map.flyTo([c.latitude, c.longitude], Math.max(map.getZoom(), 13), { duration: 0.8 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusItemId]);

  return null;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function LocationMap({
  items,
  focusItemId,
  onFocusItem,
  renderPopup,
  labels,
  defaultPos,
  fitSignal,
}: LocationMapProps) {
  const [query, setQuery] = useState('');
  const [fitKey, setFitKey] = useState(0);
  const [internalFocusId, setInternalFocusId] = useState<string | null>(null);

  const effectiveFitKey = fitSignal && fitSignal > 0 ? fitSignal : fitKey;
  const activeId = focusItemId ?? internalFocusId;
  const handleFocus = onFocusItem ?? setInternalFocusId;

  const withCoords = useMemo(
    () =>
      items.filter(
        (c) =>
          typeof c.latitude === 'number' &&
          typeof c.longitude === 'number' &&
          Number.isFinite(c.latitude) &&
          Number.isFinite(c.longitude),
      ),
    [items],
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
    <div className="ecms-map-box relative h-full w-full">
      {/* Floating search */}
      <div className="pointer-events-none absolute start-3 top-3 z-[1000] w-[calc(100%-6rem)] max-w-xs">
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-800/95">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.searchPlaceholder}
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label={labels.clear} className="text-slate-400 hover:text-slate-600">
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
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapResize />
        <MapController items={withCoords} focusItemId={activeId} fitKey={effectiveFitKey} visibleIds={visibleIds} />
        {filtered.map((c) => (
          <Marker
            key={c.id}
            position={[c.latitude as number, c.longitude as number]}
            icon={makeEntityIcon(c, c.id === activeId)}
            eventHandlers={{
              click: () => handleFocus(c.id),
            }}
          >
            <Popup maxWidth={300} closeButton={false} className="ecms-center-popup">
              {renderPopup(c)}
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
            <ZoomIn className="h-4 w-4" /> {labels.fitAll}
          </button>
        </div>
      )}

      {/* Empty state: no items with coordinates */}
      {withCoords.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center">
          <div className="pointer-events-auto max-w-xs rounded-xl border border-slate-200 bg-white/95 px-4 py-3 text-center text-sm text-slate-600 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-300">
            {labels.empty}
          </div>
        </div>
      )}
    </div>
  );
}