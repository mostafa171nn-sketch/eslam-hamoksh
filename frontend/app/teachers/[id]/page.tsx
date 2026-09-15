import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TeacherPublicPage from '@/src/views/public/TeacherPublicPage';
import { PageBackButton } from '@/src/components/layout/PageBackButton';
import { publicApiGet, PublicApiError } from '@/src/lib/ssr';
import type { TeacherProfile } from '@/src/lib/types';

// Profiles are revalidated server-side for 5 minutes (title/description), matching
// the backend's own public caching headers; the live page body still renders the
// freshest fetch on each request thanks to routing-level ISR behaviour in prod.
interface TeacherPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: TeacherPageProps): Promise<Metadata> {
  try {
    const { data } = await publicApiGet<TeacherProfile>(`/teachers/${params.id}`, undefined, 60);
    const description = data.bio || undefined;
    return {
      title: `${data.fullName} — Teacher`,
      description,
      openGraph: {
        title: data.fullName,
        description,
        ...(data.photo ? { images: [{ url: data.photo }] } : {}),
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
    </>
  );
}