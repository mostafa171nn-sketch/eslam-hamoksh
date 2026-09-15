import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CenterDetailView from '@/src/views/public/CenterDetailView';
import { publicApiGet, PublicApiError } from '@/src/lib/ssr';
import type { PublicCenter, PublicCenterTeacher } from '@/src/lib/api';

interface CenterPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: CenterPageProps): Promise<Metadata> {
  try {
    const { data } = await publicApiGet<PublicCenter>(`/centers/${params.id}`, undefined, 60);
    const description = data.description || data.address || undefined;
    return {
      title: data.name,
      description,
      openGraph: {
        title: data.name,
        description,
        ...(data.photoUrl ? { images: [{ url: data.photoUrl }] } : {}),
      },
    };
  } catch {
    return { title: 'Center' };
  }
}

interface CenterRatingSummary {
  average: number;
  count: number;
}

export default async function CenterDetailPageRoute({ params }: CenterPageProps) {
  const id = params?.id ?? '';
  let center: PublicCenter;
  let teachers: PublicCenterTeacher[];
  let rating: CenterRatingSummary;

  try {
    [center, teachers, rating] = await Promise.all([
      publicApiGet<PublicCenter>(`/centers/${id}`, undefined, 60).then((res) => res.data),
      publicApiGet<PublicCenterTeacher[]>(`/centers/${id}/teachers`, undefined, 60).then((res) => res.data),
      publicApiGet<CenterRatingSummary>(`/centers/${id}/rating`, undefined, 60).then((res) => res.data),
    ]);
  } catch (err) {
    if (err instanceof PublicApiError && (err.status === 404 || err.status === 400)) {
      notFound();
    }
    throw err;
  }

  return <CenterDetailView initialCenter={center} initialTeachers={teachers} initialRating={rating} />;
}