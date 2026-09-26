import type { Metadata } from 'next';
import { publicApiGet } from '@/src/lib/ssr';
import type { PublicTeacher } from '@/src/lib/types';
import type { SearchCentersResult } from '@/src/lib/api';
import HomeView from '@/src/views/public/HomeView';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://maarej.com';

export const metadata: Metadata = {
  title: 'معارج | Maarej',
  description:
    'المنصة الأمثل للعثور على مدرّس خصوصي مناسب أو سنتر تعليمي، مع إمكانية المقارنة والحجز المباشر.',
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const [teachersRes, centersRes] = await Promise.all([
    publicApiGet<PublicTeacher[]>('/teachers', { page: 1, limit: 8 }).catch(() => null),
    publicApiGet<SearchCentersResult>('/centers/search', { page: 1, limit: 4 }).catch(() => null),
  ]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: 'معارج | Maarej',
        description: 'منصة متكاملة لإدارة مراكز التعليم وحجز المعلمين.',
        inLanguage: ['ar', 'en'],
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'معارج | Maarej',
        url: SITE_URL,
        logo: `${SITE_URL}/icon.svg`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeView
        initialTeachers={teachersRes?.data}
        initialCentersResult={centersRes?.data ?? null}
      />
    </>
  );
}