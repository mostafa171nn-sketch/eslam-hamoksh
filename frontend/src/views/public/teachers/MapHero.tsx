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
    <section className="mb-5 sm:mb-7">
      <div className="flex flex-col items-start gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#0878f8] dark:text-sky-300">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0878f8] dark:bg-sky-300" aria-hidden />
          {t('heroEyebrow')}
        </span>
        <h1 className="text-[26px] font-bold leading-tight text-[#0b1b61] sm:text-[34px] dark:text-white">
          {t('heroTitle')}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[#6e7b98] sm:text-base dark:text-slate-400">
          {t('teachersHeroSubtitle')}
        </p>
      </div>

      <div
        className="relative mt-5 h-80 overflow-hidden rounded-[24px] border border-[#dbe9f7] bg-[#eef2ec] sm:h-[430px] dark:border-slate-600"
        role="region"
        aria-label={t('teachersMapTitle')}
      >
        <TeacherMap teachers={teachers} />
      </div>
    </section>
  );
}