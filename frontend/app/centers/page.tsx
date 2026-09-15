import { publicApiGet } from '@/src/lib/ssr';
import type { SearchCentersResult } from '@/src/lib/api';
import type { Grade, Subject } from '@/src/lib/types';
import CentersView from '@/src/views/public/CentersView';

export default async function CentersPage() {
  const [resultRes, subjectsRes, gradesRes] = await Promise.all([
    publicApiGet<SearchCentersResult>('/centers/search', { page: 1, limit: 12 }).catch(() => null),
    publicApiGet<Subject[]>('/catalog/subjects', undefined, 300).catch(() => null),
    publicApiGet<Grade[]>('/catalog/grades', undefined, 300).catch(() => null),
  ]);

  return (
    <CentersView
      initialResult={resultRes?.data ?? null}
      initialCatalog={
        subjectsRes && gradesRes ? { subjects: subjectsRes.data, grades: gradesRes.data } : null
      }
    />
  );
}