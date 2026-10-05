import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TeacherPublicPage from '@/src/views/public/TeacherPublicPage';
import { PublicNav } from '@/src/components/layout/PublicNav';
import { PublicBottomNav, type BottomNavSections } from '@/src/components/layout/PublicBottomNav';
import { PencilLoader } from '@/src/components/ui/PencilLoader';
import { Suspense } from 'react';
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

/* The exact glyph set for the teacher context-nav (الملف / الحصص / التقييمات),
   mirroring the reference `nav.bottom-nav.context-nav` for teacher pages. */
function ProfileNavIcon() {
  return (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 20c.4-3.9 2.9-5.8 6.5-5.8s6.1 1.9 6.5 5.8" />
    </>
  );
}

function LessonsNavIcon() {
  return (
    <>
      <rect x="4" y="5" width="16" height="15" rx="3" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </>
  );
}

function ReviewsNavIcon() {
  return <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.4l6.1-.9L12 3Z" />;
}

const TEACHER_NAV: BottomNavSections = [
  { id: 't-overview', targetId: 'teacherOverview', labelKey: 'teacherOverviewNav', icon: <ProfileNavIcon /> },
  { id: 't-lessons', targetId: 'teacherLessons', labelKey: 'teacherLessonsNav', icon: <LessonsNavIcon /> },
  { id: 't-reviews', targetId: 'teacherReviews', labelKey: 'teacherReviewsNav', icon: <ReviewsNavIcon /> },
];

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
    <div className="min-h-screen bg-[#f7fbff] dark:bg-slate-900">
      <PublicNav />
      <Suspense
        fallback={
          <div className="flex justify-center py-24">
            <PencilLoader />
          </div>
        }
      >
        <TeacherPublicPage initialProfile={profile} />
      </Suspense>
      <PublicBottomNav sections={TEACHER_NAV} />
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
    </div>
  );
}