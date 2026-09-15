import { publicApiGet } from '@/src/lib/ssr';
import type { PublicTeacher } from '@/src/lib/types';
import type { SearchCentersResult } from '@/src/lib/api';
import HomeView from '@/src/views/public/HomeView';

export default async function HomePage() {
  const [teachersRes, centersRes] = await Promise.all([
    publicApiGet<PublicTeacher[]>('/teachers', { page: 1, limit: 8 }).catch(() => null),
    publicApiGet<SearchCentersResult>('/centers/search', { page: 1, limit: 4 }).catch(() => null),
  ]);

  return (
    <HomeView
      initialTeachers={teachersRes?.data}
      initialCentersResult={centersRes?.data ?? null}
    />
  );
}