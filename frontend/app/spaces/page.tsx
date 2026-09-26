import type { Metadata } from 'next';
import { PublicNav } from '@/src/components/layout/PublicNav';
import { publicApiGet } from '@/src/lib/ssr';
import type { SearchSpacesResult } from '@/src/lib/api';
import SpacesView from '@/src/views/public/SpacesView';

export const metadata: Metadata = {
  title: 'المساحات | معارج',
  description: 'استكشف مساحات التعلم والعمل المشترك المتاحة.',
  alternates: { canonical: '/spaces' },
};

export default async function SpacesPage() {
  // The public co-space endpoint does not exist yet, so this resolves as null
  // today and the page renders its honest loading → error → empty state. The
  // call is left in place so the page lights up automatically, with zero
  // rebuild work, the moment `GET /spaces/search` ships.
  const resultRes = await publicApiGet<SearchSpacesResult>('/spaces/search', { page: 1, limit: 12 }).catch(() => null);

  return (
    <div className="min-h-screen bg-[#f7fbff] dark:bg-slate-900">
      <PublicNav />
      <main>
        <SpacesView initialResult={resultRes?.data ?? null} />
      </main>
    </div>
  );
}