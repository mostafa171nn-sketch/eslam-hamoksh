import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TeacherPublicPage from '@/src/views/public/TeacherPublicPage';
import { PageBackButton } from '@/src/components/layout/PageBackButton';
import { publicApiGet, PublicApiError } from '@/src/lib/ssr';
import type { TeacherProfile } from '@/src/lib/types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://maarej.com';

// Profiles are revalidated server-side for 5 minutes (title/description), matching
// the backend's own public caching headers; the live page body still renders the
// freshest fetch on each request thanks to routing-level ISR behaviour in prod.
export const revalidate = 60;

interface TeacherPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: TeacherPageProps): Promise<Metadata> {
  try {
    const { data } = await publicApiGet<TeacherProfile>(`/teachers/${params.id}`, undefined, 60);
    const description = data.bio || undefined;
    const subjectNames = data.subjects?.map((s) => s.name).join('، ');
    const alt = subjectNames ? `${data.fullName} — ${subjectNames}` : undefined;
    const fullDescription = description || alt || undefined;
    return {
      title: `${data.fullName} — Teacher`,
      description: fullDescription,
      alternates: { canonical: `/teachers/${data.id}` },
      openGraph: {
        title: `${data.fullName} — Teacher`,
        description: fullDescription,
        type: 'profile',
        url: `${SITE_URL}/teachers/${data.id}`,
        ...(data.photo ? { images: [{ url: data.photo }] } : {}),
      },
      twitter: {
        card: 'summary_large_image',
        title: `${data.fullName} — Teacher`,
        description: fullDescription || undefined,
        ...(data.photo ? { images: [data.photo] } : {}),
      },
    };
  } catch {
    return { title: 'Teacher' };
  }
}

export default async function TeacherPublicRoute({ params }: TeacherPageProps) {
  const id = params?.id ?? '';
  let profile: TeacherProfile;
  try {
    profile = (await publicApiGet<TeacherProfile>(`/teachers/${id}`, undefined, 60)).data;
  } catch (err) {
    if (err instanceof PublicApiError && (err.status === 404 || err.status === 400)) {
      notFound();
    }
    throw err;
  }

  return (
    <>
      <PageBackButton className="mb-4" />
      <TeacherPublicPage initialProfile={profile} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: profile.fullName,
            url: `${SITE_URL}/teachers/${profile.id}`,
            ...(profile.photo ? { image: profile.photo } : {}),
            ...(profile.bio ? { description: profile.bio } : {}),
            ...(profile.subjects?.length
              ? { knowsAbout: profile.subjects.map((s) => s.name) }
              : {}),
            ...(profile.location
              ? { address: { '@type': 'PostalAddress', addressLocality: profile.location.name } }
              : {}),
            ...(typeof profile.rating === 'number' && profile.ratingCount > 0
              ? {
                  aggregateRating: {
                    '@type': 'AggregateRating',
                    ratingValue: profile.rating,
                    reviewCount: profile.ratingCount,
                  },
                }
              : {}),
          }),
        }}
      />
    </>
  );
}