'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Mail,
  Phone,
  MapPin,
  Heart,
  Star,
} from 'lucide-react';
import { useT } from '@/src/i18n';
import { LangToggle } from '@/src/components/LangToggle';

export function MaarejFooter() {
  const { t, lang } = useT();
  const year = 2026;
  const [visible, setVisible] = useState(false);
  const footerRef = useRef<HTMLElement>(null);

  // Reveal on enter viewport
  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const maarejLinks = [
    { label: t('footerAbout'), href: '/' },
    { label: t('footerContact'), href: '/centers' },
    { label: t('footerFaq'), href: '/' },
  ];

  const platformLinks = [
    { label: t('footerTeachersLabel'), href: '/teachers' },
    { label: t('footerStudentsLabel'), href: '/register/student' },
    { label: t('footerParentsLabel'), href: '/register/parent' },
    { label: t('footerLessonsLabel'), href: '/search' },
    { label: t('footerHomeworkLabel'), href: '/search' },
    { label: t('footerExamsLabel'), href: '/search' },
  ];

  const supportLinks = [
    { label: t('footerHelpCenter'), href: '/' },
    { label: t('footerContactSupport'), href: '/centers' },
    { label: t('footerReportProblem'), href: '/' },
  ];

  const legalLinks = [
    { label: t('footerPrivacy'), href: '/' },
    { label: t('footerTerms'), href: '/' },
  ];

  return (
    <footer
      ref={footerRef}
      className={`relative isolate overflow-hidden border-t border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900 transition-all duration-700 ease-out-expo will-change-transform ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      aria-labelledby="footer-heading"
      style={{ boxSizing: 'border-box', maxWidth: '100%' }}
    >
      <h2 id="footer-heading" className="sr-only">Footer</h2>

      {/* Top hairline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-200/70 to-transparent dark:via-brand-500/20" aria-hidden />

      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-24 left-1/2 h-[480px] w-[720px] max-w-full -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.06)_0%,_transparent_68%)] dark:bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.10)_0%,_transparent_70%)]" />
        <div className="absolute -bottom-32 -end-32 h-96 w-96 max-w-full rounded-full bg-gold-400/5 blur-3xl dark:bg-gold-400/10" />
        <div className="absolute -bottom-28 -start-32 h-96 w-96 max-w-full rounded-full bg-brand-400/5 blur-3xl dark:bg-brand-500/10" />
        <div className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #6366f1 1px, transparent 0)', backgroundSize: '28px 28px' }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" style={{ boxSizing: 'border-box', maxWidth: '100%' }}>
        {/* ========== NAVIGATION 4 columns ========== */}
        <div className={`grid grid-cols-2 gap-8 border-t border-slate-200/60 py-10 dark:border-slate-800 sm:gap-10 lg:grid-cols-4 lg:gap-8 lg:py-12 transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* MAAREJ */}
          <nav aria-labelledby="footer-maarej-heading">
            <h3 id="footer-maarej-heading" className="text-sm font-bold tracking-widest text-slate-900 dark:text-white">{t('footerMaarejTitle')}</h3>
            <ul className="mt-4 space-y-2.5">
              {maarejLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="group inline-flex items-center gap-1.5 text-sm leading-6 text-slate-500 transition-all duration-200 hover:translate-x-0.5 hover:text-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:text-slate-400 dark:hover:text-brand-300">
                    <span className="h-1 w-1 rounded-full bg-slate-300 transition-colors group-hover:bg-brand-500 dark:bg-slate-600" aria-hidden />
                    <span className="relative after:absolute after:bottom-0 after:start-0 after:h-px after:w-0 after:bg-brand-500 after:transition-all after:duration-200 group-hover:after:w-full">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* PLATFORM */}
          <nav aria-labelledby="footer-platform-heading">
            <h3 id="footer-platform-heading" className="text-sm font-bold tracking-widest text-slate-900 dark:text-white">{t('footerPlatformTitle')}</h3>
            <ul className="mt-4 space-y-2.5">
              {platformLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="group inline-flex items-center gap-1.5 text-sm leading-6 text-slate-500 transition-all duration-200 hover:translate-x-0.5 hover:text-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:text-slate-400 dark:hover:text-brand-300">
                    <span className="h-1 w-1 rounded-full bg-slate-300 transition-colors group-hover:bg-brand-500 dark:bg-slate-600" aria-hidden />
                    <span className="relative after:absolute after:bottom-0 after:start-0 after:h-px after:w-0 after:bg-brand-500 after:transition-all after:duration-200 group-hover:after:w-full">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* SUPPORT */}
          <nav aria-labelledby="footer-support-heading" className="col-span-2 lg:col-span-1">
            <h3 id="footer-support-heading" className="text-sm font-bold tracking-widest text-slate-900 dark:text-white">{t('footerSupportTitle')}</h3>
            <ul className="mt-4 space-y-2.5">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="group inline-flex items-center gap-1.5 text-sm leading-6 text-slate-500 transition-all duration-200 hover:translate-x-0.5 hover:text-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:text-slate-400 dark:hover:text-brand-300">
                    <span className="h-1 w-1 rounded-full bg-slate-300 transition-colors group-hover:bg-brand-500 dark:bg-slate-600" aria-hidden />
                    <span className="relative after:absolute after:bottom-0 after:start-0 after:h-px after:w-0 after:bg-brand-500 after:transition-all after:duration-200 group-hover:after:w-full">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200"><Star className="h-3.5 w-3.5 text-gold-500" aria-hidden /> Need help?</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">We&apos;re here to help you learn together.</p>
              <Link href="/centers" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
                {t('footerContactSupport')} <span aria-hidden>→</span>
              </Link>
            </div>
          </nav>

          {/* LEGAL */}
          <nav aria-labelledby="footer-legal-heading">
            <h3 id="footer-legal-heading" className="text-sm font-bold tracking-widest text-slate-900 dark:text-white">{t('footerLegalTitle')}</h3>
            <ul className="mt-4 space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="group inline-flex items-center gap-1.5 text-sm leading-6 text-slate-500 transition-all duration-200 hover:translate-x-0.5 hover:text-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:text-slate-400 dark:hover:text-brand-300">
                    <span className="h-1 w-1 rounded-full bg-slate-300 transition-colors group-hover:bg-brand-500 dark:bg-slate-600" aria-hidden />
                    <span className="relative after:absolute after:bottom-0 after:start-0 after:h-px after:w-0 after:bg-brand-500 after:transition-all after:duration-200 group-hover:after:w-full">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <a href="mailto:hello@maarej.com" className="flex items-center gap-2 transition-colors hover:text-brand-600 dark:hover:text-brand-400">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-200/70 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"><Mail className="h-3.5 w-3.5" aria-hidden /></span> hello@maarej.com
              </a>
              <a href="tel:+201000000000" className="flex items-center gap-2 transition-colors hover:text-brand-600 dark:hover:text-brand-400">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-200/70 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"><Phone className="h-3.5 w-3.5" aria-hidden /></span> +20 100 000 0000
              </a>
              <span className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-200/70 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"><MapPin className="h-3.5 w-3.5" aria-hidden /></span> Cairo · Alexandria · Egypt
              </span>
            </div>
          </nav>
        </div>

        {/* ========== SOCIAL + BOTTOM BAR ========== */}
        <div className={`flex flex-col gap-6 border-t border-slate-200/70 py-6 dark:border-slate-800 sm:py-7 transition-all duration-700 delay-400 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: MAAREJ — EDUCATION + copyright */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <span className="inline-flex items-center gap-2 text-sm font-extrabold tracking-widest text-slate-900 dark:text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden />
                </span>
                {t('footerEducationLabel')}
              </span>
              <span className="hidden h-4 w-px bg-slate-200 dark:bg-slate-700 sm:block" aria-hidden />
              <p className="text-xs leading-6 text-slate-500 dark:text-slate-400 sm:text-sm">© {year} {t('appName')}. {t('rightsReserved')}</p>
            </div>

            {/* Right: social + lang */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
              <div className="flex items-center gap-3">
                <span className="hidden text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400 sm:inline">{t('footerFollowUs')}</span>
                <div className="flex items-center gap-2">
                  {[
                    { label: t('footerSocialTwitter'), href: 'https://twitter.com', Icon: Twitter },
                    { label: t('footerSocialInstagram'), href: 'https://instagram.com', Icon: Instagram },
                    { label: t('footerSocialLinkedin'), href: 'https://linkedin.com', Icon: Linkedin },
                    { label: t('footerSocialYoutube'), href: 'https://youtube.com', Icon: Youtube },
                  ].map(({ label, href, Icon }) => (
                    <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.04] hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-brand-500/40 dark:hover:bg-slate-700 dark:hover:text-brand-300">
                      <Icon className="h-4 w-4" aria-hidden />
                    </a>
                  ))}
                </div>
              </div>
              <span className="hidden h-6 w-px bg-slate-200 dark:bg-slate-700 sm:block" aria-hidden />
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('language')}</span>
                <LangToggle className="scale-[0.92] sm:scale-100" />
              </div>
            </div>
          </div>

          {/* Tiny meta */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] leading-5 text-slate-400 dark:text-slate-500 lg:justify-start">
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />{lang === 'ar' ? 'منصة تعليمية موثوقة' : 'Trusted education platform'}</span>
            <span className="hidden h-3 w-px bg-slate-200 dark:bg-slate-700 sm:block" aria-hidden />
            <span>{lang === 'ar' ? 'صُنع بعناية للتعلم الحديث' : 'Crafted for modern learning'}</span>
            <span className="hidden h-3 w-px bg-slate-200 dark:bg-slate-700 sm:block" aria-hidden />
            <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3 text-rose-400" aria-hidden />{lang === 'ar' ? 'التعلم معًا' : 'Learning together'}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default MaarejFooter;
