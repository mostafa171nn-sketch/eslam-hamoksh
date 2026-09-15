import { publicApiGet } from '@/src/lib/ssr';
import type { CenterPackage } from '@/src/lib/api';
import PackagesView from '@/src/views/public/PackagesView';

export default async function PackagesPage() {
  const plansRes = await publicApiGet<CenterPackage[]>('/subscriptions/public/center-plans', undefined, 300).catch(() => null);

  return <PackagesView initialPlans={plansRes?.data} />;
}