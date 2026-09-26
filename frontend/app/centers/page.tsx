import type { Metadata } from 'next';
import { PublicNav } from '@/src/components/layout/PublicNav';
import { publicApiGet } from '@/src/lib/ssr';
import type { SearchCentersResult } from '@/src/lib/api';
import CentersView from '@/src/views/public/CentersView';

export const metadata: Metadata = {
  title: 'المراكز التعليمية | معارج',
  description: 'تصفح واختر مركزك التعليمي المفضل.',
  alternates: { canonical: '/centers' },
};

export default async function CentersPage() {
  const resultRes = await publicApiGet<SearchCentersResult>('/centers/search', { page: 1, limit: 12 }).catch(() => null);

  return (
    <div className="min-h-screen bg-[#f7fbff] dark:bg-slate-900">
      <PublicNav />
      <main>
        <CentersView initialResult={resultRes?.data ?? null} />
      </main>
    </div>
  );
}