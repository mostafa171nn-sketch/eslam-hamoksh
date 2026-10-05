'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  LogOut,
} from 'lucide-react';
import { useT } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { PencilLoader } from '../../components/ui/PencilLoader';
import { PREF_MOTION, PREF_NOTIF, PREF_TEXT, usePref } from '../../hooks/useAppPrefs';

/** Accessibility toggle matching the reference switch treatment. */
function PrefSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`flex h-7 w-12 shrink-0 touch-manipulation items-center rounded-full p-1 transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#635BDF] ${
        checked ? 'justify-end bg-[#635BDF]' : 'justify-start bg-slate-300 dark:bg-slate-600'
      }`}
    >
      <span aria-hidden className="h-5 w-5 rounded-full bg-white shadow" />
    </button>
  );
}

export default function StudentAccountPage() {
  const { t, dir, lang, setLang } = useT();
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const isRtl = dir === 'rtl';

  const [notifOn, setNotifOn] = usePref(PREF_NOTIF, true);
  const [motionOff, setMotionOff] = usePref(PREF_MOTION, false);
  const [largeText, setLargeText] = usePref(PREF_TEXT, false);

  if (loading) return <PencilLoader label={t('loading')} />;
  if (!user) return null;

  const grade = user.role === 'STUDENT' && user.student.grade ? user.student.grade.name : null;
  const initial = (user.fullName.trim()[0] ?? '•').toUpperCase();
  const CtaChevron = isRtl ? ChevronLeft : ChevronRight;

  const doLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const linkRows: Array<{ key: string; icon: typeof FileText; titleKey: 'accountProfileRow' | 'accountSecurityRow'; href: string }> = [
    { key: 'profile', icon: FileText, titleKey: 'accountProfileRow', href: '/profile' },
    { key: 'security', icon: FileText, titleKey: 'accountSecurityRow', href: '/forgot-password' },
  ];

  const prefRows: Array<{
    key: string;
    titleKey: 'accountNotifTitle' | 'accountMotionTitle' | 'accountTextTitle';
    subKey: 'accountNotifSub' | 'accountMotionSub' | 'accountTextSub';
    checked: boolean;
    onChange: (next: boolean) => void;
  }> = [
    { key: 'notif', titleKey: 'accountNotifTitle', subKey: 'accountNotifSub', checked: notifOn, onChange: setNotifOn },
    { key: 'motion', titleKey: 'accountMotionTitle', subKey: 'accountMotionSub', checked: motionOff, onChange: setMotionOff },
    { key: 'text', titleKey: 'accountTextTitle', subKey: 'accountTextSub', checked: largeText, onChange: setLargeText },
  ];

  return (
    <div>
      <h1 className="text-balance text-[26px] font-black tracking-tight text-[#172635] dark:text-white">
        {t('settings')}
      </h1>

      {/* Profile header */}
      <div className="mt-4 flex items-center justify-between gap-3 border-b border-slate-200/70 pb-5 dark:border-slate-700">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2AA5A0,#635BDF)] text-xl font-black text-white sm:h-16 sm:w-16 sm:text-2xl"
          >
            {initial}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-extrabold text-[#242640] sm:text-lg dark:text-slate-100">
              {user.fullName}
            </span>
            {grade && (
              <span className="mt-0.5 block truncate text-[13px] font-medium text-slate-500 dark:text-slate-400">
                {grade}
              </span>
            )}
          </span>
        </div>
        <Link
          href="/profile"
          className="shrink-0 touch-manipulation rounded-full bg-[#EAF3F6] px-4 py-2 text-sm font-extrabold text-[#0F6B7E] transition-colors hover:bg-[#DCEBF0] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#635BDF] dark:bg-teal-500/15 dark:text-teal-300 dark:hover:bg-teal-500/25"
        >
          {t('accountViewProfile')}
        </Link>
      </div>

      {/* Account & security */}
      <section aria-label={t('accountSecurityTitle')} className="mt-6">
        <h2 className="text-balance text-lg font-extrabold tracking-tight text-[#172635] dark:text-white">
          {t('accountSecurityTitle')}
        </h2>
        <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {linkRows.map((row) => {
              const Icon = row.icon;
              return (
                <Link
                  key={row.key}
                  href={row.href}
                  className="flex touch-manipulation items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#635BDF] dark:hover:bg-slate-700/40"
                >
                  <Icon className="h-5 w-5 shrink-0 text-[#7C83C4] dark:text-brand-300" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-extrabold text-[#242640] dark:text-slate-100">
                    {t(row.titleKey)}
                  </span>
                  <CtaChevron className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section aria-label={t('accountPrefsTitle')} className="mt-6">
        <h2 className="text-balance text-lg font-extrabold tracking-tight text-[#172635] dark:text-white">
          {t('accountPrefsTitle')}
        </h2>
        <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {prefRows.map((row) => (
              <div key={row.key} className="flex items-center gap-3 px-4 py-3.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-extrabold text-[#242640] dark:text-slate-100">
                    {t(row.titleKey)}
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] font-medium text-slate-500 dark:text-slate-400">
                    {t(row.subKey)}
                  </span>
                </span>
                <PrefSwitch checked={row.checked} onChange={row.onChange} label={t(row.titleKey)} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Language */}
      <section aria-label={t('language')} className="mt-6">
        <h2 className="text-balance text-lg font-extrabold tracking-tight text-[#172635] dark:text-white">
          {t('language')}
        </h2>
        <div className="mt-2 flex gap-1 rounded-2xl bg-[#E9F1F7] p-1.5 dark:bg-slate-800">
          {(['ar', 'en'] as const).map((l) => {
            const active = lang === l;
            return (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-pressed={active}
                className={`min-w-0 flex-1 touch-manipulation truncate rounded-xl px-2 py-2.5 text-sm transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#635BDF] ${
                  active
                    ? 'bg-white font-extrabold text-[#242640] shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {l === 'ar' ? 'العربية' : 'English'}
              </button>
            );
          })}
        </div>
      </section>

      {/* Referrals (coming soon, as marked) */}
      <section aria-label={t('accountReferrals')} className="mt-6">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-3.5 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-[15px] font-extrabold text-[#242640] dark:text-slate-100">{t('accountReferrals')}</p>
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
            {t('comingSoon')}
          </span>
        </div>
      </section>

      {/* Session */}
      <section aria-label={t('accountSession')} className="mt-6">
        <h2 className="text-balance text-lg font-extrabold tracking-tight text-[#172635] dark:text-white">
          {t('accountSession')}
        </h2>
        <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            onClick={doLogout}
            className="flex w-full touch-manipulation items-center gap-3 px-4 py-3.5 text-start transition-colors hover:bg-red-50 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#635BDF] dark:hover:bg-red-500/10"
          >
            <LogOut className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-[15px] font-extrabold text-red-600 dark:text-red-400">
              {t('signOut')}
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
