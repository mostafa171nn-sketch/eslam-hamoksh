import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CenterDetailView from '@/src/views/public/CenterDetailView';
import { publicApiGet, PublicApiError } from '@/src/lib/ssr';
import type { PublicCenter, PublicCenterTeacher } from '@/src/lib/api';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://maarej.com';

interface CenterPageProps {
  params: { id: string };
}

export const revalidate = 60;

export async function generateMetadata({ params }: CenterPageProps): Promise<Metadata> {
  try {
    const { data } = await publicApiGet<PublicCenter>(`/centers/${params.id}`, undefined, 60);
    const description = data.description || data.address || undefined;
    const subjectNames = data.subjects?.map((s) => s.name).join('، ');
    const fullDescription = description || (subjectNames ? `مركز تعليمي — ${subjectNames}` : undefined);
    return {
      title: data.name,
      description: fullDescription,
      alternates: { canonical: `/centers/${data.id}` },
      openGraph: {
        title: data.name,
        description: fullDescription,
        type: 'website',
        url: `${SITE_URL}/centers/${data.id}`,
        ...(data.photoUrl ? { images: [{ url: data.photoUrl }] } : {}),
      },
      twitter: {
        card: 'summary_large_image',
        title: data.name,
        description: fullDescription || undefined,
        ...(data.photoUrl ? { images: [data.photoUrl] } : {}),
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

  const centerJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: center.name,
    ...(center.nameEn ? { alternateName: center.nameEn } : {}),
    url: `${SITE_URL}/centers/${center.id}`,
    ...(center.photoUrl ? { image: center.photoUrl } : {}),
    ...(center.description ? { description: center.description } : {}),
    ...(center.address || center.city
      ? {
          address: {
            '@type': 'PostalAddress',
            ...(center.city ? { addressLocality: center.city } : {}),
            ...(center.address ? { streetAddress: center.address } : {}),
          },
        }
      : {}),
    ...(center.centerPhone ? { telephone: center.centerPhone } : {}),
    ...(center.centerEmail ? { email: center.centerEmail } : {}),
    ...(typeof center.ratingAverage === 'number' && center.ratingCount
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: center.ratingAverage,
            reviewCount: center.ratingCount,
          },
        }
      : {}),
  };

  return (
    <>
      <CenterDetailView initialCenter={center} initialTeachers={teachers} initialRating={rating} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(centerJsonLd) }} />
    </>
  );
}