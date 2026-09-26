import type { Metadata } from 'next';
import { publicApiGet } from '@/src/lib/ssr';
import type { CenterPackage } from '@/src/lib/api';
import PackagesView from '@/src/views/public/PackagesView';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'باقات مراكز التعلم | معارج',
  description: 'استعرض باقات مراكز التعلم المتاحة في معارج واختر ما يناسبك.',
  alternates: { canonical: '/packages' },
};

export default async function PackagesPage() {
  const plansRes = await publicApiGet<CenterPackage[]>('/subscriptions/public/center-plans', undefined, 300).catch(() => null);

  return <PackagesView initialPlans={plansRes?.data} />;
}