import type { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://maarej.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
  { url: `${SITE_URL}/teachers`, changeFrequency: 'daily', priority: 0.9 },
  { url: `${SITE_URL}/centers`, changeFrequency: 'daily', priority: 0.9 },
  { url: `${SITE_URL}/packages`, changeFrequency: 'weekly', priority: 0.5 },
];

/**
 * Enumerate real public teacher IDs via the public /api/teachers list so the
 * sitemap never invents URLs. Bounded to MAX_ITEMS entries; any failure falls
 * back to the static routes only (sitemap must never break the build).
 */
async function fetchPublicTeacherIds(maxItems = 200): Promise<string[]> {
  try {
    const ids: string[] = [];
    const pageSize = 100;
    const pages = Math.ceil(maxItems / pageSize);
    for (let page = 1; page <= pages; page += 1) {
      const res = await fetch(`${API_URL}/api/teachers?page=${page}&limit=${pageSize}`);
      if (!res.ok) break;
      const json = await res.json();
      const list: Array<{ id: string }> = json?.data ?? [];
      ids.push(...list.map((t) => t.id));
      const total = json?.meta?.total ?? 0;
      if (list.length === 0 || page * pageSize >= total) break;
    }
    return ids;
  } catch {
    return [];
  }
}

/**
 * Enumerate real public center IDs via the public /api/centers/search list.
 */
async function fetchPublicCenterIds(maxItems = 200): Promise<string[]> {
  try {
    const ids: string[] = [];
    const pageSize = 100;
    const pages = Math.ceil(maxItems / pageSize);
    for (let page = 1; page <= pages; page += 1) {
      const res = await fetch(`${API_URL}/api/centers/search?page=${page}&limit=${pageSize}`);
      if (!res.ok) break;
      const json = await res.json();
      const list: Array<{ id: string }> = json?.data?.items ?? [];
      ids.push(...list.map((c) => c.id));
      const total = json?.data?.total ?? 0;
      if (list.length === 0 || page * pageSize >= total) break;
    }
    return ids;
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [teacherIds, centerIds] = await Promise.all([
    fetchPublicTeacherIds(),
    fetchPublicCenterIds(),
  ]);

  return [
    ...STATIC_ROUTES,
    ...teacherIds.map((id) => ({
      url: `${SITE_URL}/teachers/${id}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...centerIds.map((id) => ({
      url: `${SITE_URL}/centers/${id}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}