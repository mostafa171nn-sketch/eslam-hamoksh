/**
 * Shared floating "card" markers for the map.
 *
 * Renders a compact, marketplace-style card that floats over the map with a
 * small pointer anchoring it to the exact coordinates. Two variants:
 * - center:  [image] [name + rating]   (horizontal card)
 * - teacher: [avatar] [rating / name]  (compact grid card)
 *
 * The styling lives in `app/globals.css` (`.ecms-entity-*`).
 */

import L from 'leaflet';

export type EntityMarkerKind = 'center' | 'teacher';

/** The per-marker display data needed to render the floating card. */
export interface EntityMarkerData {
  id: string;
  name: string;
  image?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
  kind?: EntityMarkerKind;
}

const CENTER_SIZE = { w: 172, h: 54 } as const;
const TEACHER_SIZE = { w: 108, h: 52 } as const;

/* ------------------------------------------------------------------ */
/*  Small HTML helpers                                                 */
/* ------------------------------------------------------------------ */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ratingHtml(
  rating: number | null | undefined,
  ratingCount: number | null | undefined,
  extraClass = '',
): string {
  if (typeof rating !== 'number' || (ratingCount ?? 0) <= 0) return '';
  const value = (Math.round(rating * 10) / 10).toFixed(1);
  return (
    `<span class="ecms-entity-rate${extraClass}">` +
    `<span class="ecms-entity-star" aria-hidden="true">&#9733;</span>` +
    `<span class="ecms-entity-rate-value" dir="ltr">${value}</span>` +
    (ratingCount ? `<span class="ecms-entity-count" dir="ltr">(${ratingCount})</span>` : '') +
    `</span>`
  );
}

/**
 * Image thumb with a gradient + initial-letter fallback. If the image is
 * missing or fails to load, the initial letter shows through automatically.
 */
function thumbHtml(image: string | null | undefined, initial: string, className: string): string {
  const img = image
    ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" onerror="this.classList.add('ecms-entity-img--error')" />`
    : '';
  return (
    `<span class="ecms-entity-thumb${className}" data-initial="${escapeHtml(initial)}" aria-hidden="true">` +
    img +
    `</span>`
  );
}

function arrowHtml(): string {
  return (
    `<svg class="ecms-entity-arrow" viewBox="0 0 16 16" width="11" height="11" fill="none" ` +
    `stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ` +
    `aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg>`
  );
}

/* ------------------------------------------------------------------ */
/*  Card markup                                                       */
/* ------------------------------------------------------------------ */

export function centerCardHtml(data: EntityMarkerData): string {
  const name = escapeHtml(data.name);
  const initial = escapeHtml(data.name.trim().charAt(0).toUpperCase() || '&#8226;');
  const rating = ratingHtml(data.rating, data.ratingCount, ' ecms-entity-rate--center');
  return (
    `<div class="ecms-entity-card ecms-entity-card--center">` +
    thumbHtml(data.image, initial, ' ecms-entity-thumb--center') +
    `<div class="ecms-entity-body">` +
    `<span class="ecms-entity-name ecms-entity-name--center">${name}</span>` +
    `<span class="ecms-entity-meta">${rating + arrowHtml()}</span>` +
    `</div>` +
    `</div>`
  );
}

export function teacherCardHtml(data: EntityMarkerData): string {
  const name = escapeHtml(data.name);
  const initial = escapeHtml(data.name.trim().charAt(0).toUpperCase() || '&#8226;');
  const rating = ratingHtml(data.rating, data.ratingCount, ' ecms-entity-rate--teacher');
  return (
    `<div class="ecms-entity-card ecms-entity-card--teacher">` +
    thumbHtml(data.image, initial, ' ecms-entity-thumb--teacher') +
    rating +
    `<span class="ecms-entity-name-row"><span class="ecms-entity-name ecms-entity-name--teacher">${name}</span>${arrowHtml()}</span>` +
    `</div>`
  );
}

/* ------------------------------------------------------------------ */
/*  Leaflet divIcon factory                                            */
/* ------------------------------------------------------------------ */

/**
 * Build a Leaflet divIcon for an entity card.
 *
 * The icon box matches the card size so the hit-area stays tight; the visual
 * pointer below the card is drawn with `::after` (overflow is visible, the
 * same trick the reference prototype relies on for its shadow).
 */
export function makeEntityIcon(data: EntityMarkerData, active: boolean): L.DivIcon {
  const kind = data.kind === 'teacher' ? 'teacher' : 'center';
  const size = kind === 'teacher' ? TEACHER_SIZE : CENTER_SIZE;
  const html = kind === 'teacher' ? teacherCardHtml(data) : centerCardHtml(data);

  return L.divIcon({
    className: `ecms-entity-marker${active ? ' ecms-entity-marker--active' : ''}`,
    html,
    iconSize: [size.w, size.h],
    iconAnchor: [size.w / 2, size.h - 2],
    popupAnchor: [0, -size.h],
  });
}