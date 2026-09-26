'use client';

import dynamic from 'next/dynamic';
import { useT } from '../../../i18n';
import type { PublicTeacher } from '../../../lib/types';

const TeacherMap = dynamic(() => import('./TeacherMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      <MapLoaderLabel />
    </div>
  ),
});

function MapLoaderLabel() {
  const { t } = useT();
  return <>{t('loadingMap')}</>;
}

export function MapHero({ teachers }: { teachers: PublicTeacher[] }) {
  const { t } = useT();

  return (
    <section id="teacherMap" className="mb-4 sm:mb-6">
      {/* Accessible page heading (visually hidden, matching the reference's direct nav → map layout). */}
      <h1 className="sr-only">{t('teachersSectionTitle')}</h1>

      <div
        className="relative h-[285px] overflow-hidden rounded-[20px] border border-[#dbe9f7] bg-[#eef2ec] sm:h-[300px] lg:h-[360px] dark:border-slate-600"
        role="region"
        aria-label={t('teachersMapTitle')}
      >
        <TeacherMap teachers={teachers} />
      </div>
    </section>
  );
}