import { Suspense } from 'react';
import StudentTeachersPage from '../../src/views/public/StudentTeachersPage';
import { PublicNav } from '../../src/components/layout/PublicNav';
import { PencilLoader } from '../../src/components/ui/PencilLoader';
import { publicApiGet } from '@/src/lib/ssr';
import type { PublicTeacher } from '@/src/lib/types';
import type { Grade, Location, Subject } from '@/src/lib/types';

function single(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

/** Mirrors the client's URL→day parsing in StudentTeachersPage. */
function dayFromDate(dateStr?: string): number | undefined {
  if (!dateStr) return undefined;
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? undefined : d.getDay();
  } catch {
    return undefined;
  }
}

interface BrowseTeachersSearchParams {
  [key: string]: string | string[] | undefined;
}

export default async function BrowseTeachersRoute({ searchParams }: { searchParams?: BrowseTeachersSearchParams }) {
  const sp = searchParams ?? {};
  const q = single(sp.q);
  const subject = single(sp.subject);
  const location = single(sp.location);
  const center = single(sp.center);
  const date = single(sp.date);

  const [teachersRes, subjectsRes, gradesRes, locationsRes] = await Promise.all([
    publicApiGet<PublicTeacher[]>('/teachers', {
      page: 1,
      limit: 12,
      name: q || undefined,
      subjectId: subject || undefined,
      locationId: location || undefined,
      centerId: center || undefined,
      day: dayFromDate(date),
    }).catch(() => null),
    publicApiGet<Subject[]>('/catalog/subjects', undefined, 300).catch(() => null),
    publicApiGet<Grade[]>('/catalog/grades', undefined, 300).catch(() => null),
    publicApiGet<Location[]>('/catalog/locations', undefined, 300).catch(() => null),
  ]);

  return (
    <div className="min-h-screen bg-[#f7fbff] dark:bg-slate-900">
      <PublicNav />
      <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
        <Suspense
          fallback={
            <div className="flex justify-center py-24">
              <PencilLoader />
            </div>
          }
        >
          <StudentTeachersPage
            initialData={teachersRes?.data}
            initialMeta={teachersRes?.meta}
            initialCatalog={
              subjectsRes && gradesRes && locationsRes
                ? { subjects: subjectsRes.data, grades: gradesRes.data, locations: locationsRes.data }
                : undefined
            }
          />
        </Suspense>
      </main>
    </div>
  );
}