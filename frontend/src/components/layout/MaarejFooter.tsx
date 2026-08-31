'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  GraduationCap,
  Users,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  Heart,
  Star,
  ArrowRight,
} from 'lucide-react';
import { useT } from '@/src/i18n';
import { LangToggle } from '@/src/components/LangToggle';

function MaarejHeartVisual({ label }: { label: string }) {
  return (
    <div
      className="maa-heart-wrap relative mx-auto flex items-center justify-center"
      aria-hidden="true"
    >
      {/* Glow behind */}
      <div className="maa-heart-glow pointer-events-none absolute left-1/2 top-1/2 h-[88%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.18)_0%,_rgba(167,139,250,0.12)_32%,_rgba(245,158,11,0.10)_62%,_transparent_72%)] blur-[18px] dark:bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.22)_0%,_rgba(99,102,241,0.10)_38%,_rgba(245,158,11,0.10)_68%,_transparent_74%)] maa-glow-pulse" />
      <div className="maa-heart-glow-2 pointer-events-none absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-brand-200/40 via-white/0 to-gold-200/30 blur-2xl dark:from-brand-500/10 dark:to-gold-500/10 maa-glow-pulse-slow" />

      {/* Floating container */}
      <div className="maa-heart-float relative w-full">
        <div className="maa-heart-scale transition-transform duration-300 hover:scale-[1.015]">
          <svg
            viewBox="0 0 360 360"
            role="img"
            aria-label={label}
            className="h-auto w-full overflow-visible"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="maa-heart-left" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="55%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#312e81" />
              </linearGradient>
              <linearGradient id="maa-heart-right" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef3c7" />
                <stop offset="18%" stopColor="#fde68a" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <linearGradient id="maa-heart-right-dark" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#4338ca" />
              </linearGradient>
              <linearGradient id="maa-heart-seam" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="20%" stopColor="#eef2ff" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#c7d2fe" stopOpacity="0.55" />
              </linearGradient>
              <radialGradient id="maa-heart-center-bg" cx="50%" cy="45%" r="65%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="55%" stopColor="#eef2ff" stopOpacity="1" />
                <stop offset="100%" stopColor="#e0e7ff" stopOpacity="1" />
              </radialGradient>
              <filter id="maa-heart-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="14" stdDeviation="16" floodColor="#312e81" floodOpacity="0.18" />
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#1e1b4b" floodOpacity="0.10" />
              </filter>
              <filter id="maa-center-shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#4f46e5" floodOpacity="0.22" />
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#1e1b4b" floodOpacity="0.12" />
              </filter>
            </defs>

            {/* Subtle base ellipse shadow */}
            <ellipse cx="180" cy="274" rx="82" ry="10" fill="rgba(15,23,42,0.07)" className="dark:opacity-60" style={{ opacity: 0.7 }} />

            {/* Left half — Teachers */}
            <path
              d="M 180 114 C 154.5 81.5 108 86.2 108 131.5 C 108 181.2 139.2 213.6 180 264.2 L 180 114 Z"
              fill="url(#maa-heart-left)"
              filter="url(#maa-heart-shadow)"
              style={{ transform: 'translateX(-1.6px)' } as React.CSSProperties}
            />
            <path
              d="M 180 114 C 154.5 81.5 108 86.2 108 131.5 C 108 181.2 139.2 213.6 180 264.2 L 180 114 Z"
              fill="none"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="1.2"
              style={{ transform: 'translateX(-1.6px)' } as React.CSSProperties}
            />
            <path
              d="M 128 128 C 128 128 118 145 132 168"
              fill="none"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* Right half */}
            <path
              d="M 180 114 C 205.5 81.5 252 86.2 252 131.5 C 252 181.2 220.8 213.6 180 264.2 L 180 114 Z"
              fill="url(#maa-heart-right)"
              filter="url(#maa-heart-shadow)"
              className="block dark:hidden"
              style={{ transform: 'translateX(1.6px)' } as React.CSSProperties}
            />
            <path
              d="M 180 114 C 205.5 81.5 252 86.2 252 131.5 C 252 181.2 220.8 213.6 180 264.2 L 180 114 Z"
              fill="url(#maa-heart-right-dark)"
              filter="url(#maa-heart-shadow)"
              className="hidden dark:block"
              style={{ transform: 'translateX(1.6px)' } as React.CSSProperties}
            />
            <path
              d="M 180 114 C 205.5 81.5 252 86.2 252 131.5 C 252 181.2 220.8 213.6 180 264.2 L 180 114 Z"
              fill="none"
              stroke="rgba(255,255,255,0.30)"
              strokeWidth="1.2"
              className="block dark:hidden"
              style={{ transform: 'translateX(1.6px)' } as React.CSSProperties}
            />
            <path
              d="M 180 114 C 205.5 81.5 252 86.2 252 131.5 C 252 181.2 220.8 213.6 180 264.2 L 180 114 Z"
              fill="none"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="1.2"
              className="hidden dark:block"
              style={{ transform: 'translateX(1.6px)' } as React.CSSProperties}
            />

            {/* Seam glow line */}
            <line x1="180" y1="118" x2="180" y2="262" stroke="url(#maa-heart-seam)" strokeWidth="1.6" strokeLinecap="round" opacity="0.95" style={{ filter: 'blur(0.3px)' }} />
            <line x1="180" y1="118" x2="180" y2="262" stroke="white" strokeWidth="0.7" strokeLinecap="round" opacity="0.55" />

            {/* Tiny connection dots along seam */}
            <circle cx="180" cy="142" r="1.4" fill="white" opacity="0.9" />
            <circle cx="180" cy="185" r="1.1" fill="white" opacity="0.7" />
            <circle cx="180" cy="228" r="1" fill="white" opacity="0.55" />

            {/* LEFT icon — Graduation cap subtle */}
            <g opacity="0.92" style={{ transform: 'translate(134px, 148px)' } as React.CSSProperties}>
              <g transform="scale(0.92)">
                <path d="M -18 0 H 18 A 3 3 0 0 1 21 3 V 9 A 3 3 0 0 1 18 12 H -18 A 3 3 0 0 1 -21 9 V 3 A 3 3 0 0 1 -18 0 Z" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.32)" strokeWidth="1.1" />
                <ellipse cx="0" cy="-4.5" rx="24" ry="6" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.20)" strokeWidth="1" />
                <circle cx="0" cy="-4.5" r="2.2" fill="white" opacity="0.95" />
                <path d="M 13 -3.5 C 17 0 18.5 4.2 18 8.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.9" />
                <circle cx="18" cy="10.2" r="2" fill="white" opacity="0.95" />
              </g>
            </g>

            {/* RIGHT icon — Open book */}
            <g opacity="0.92" style={{ transform: 'translate(226px, 150px)' } as React.CSSProperties}>
              <g transform="scale(0.90)">
                <path d="M 0 10 L -18 3 A 4 4 0 0 1 -20 -1 L -18 -13 A 4 4 0 0 1 -14 -15 L 0 -8 Z" className="block dark:hidden" fill="rgba(120,53,15,0.10)" stroke="rgba(120,53,15,0.18)" strokeWidth="1" />
                <path d="M 0 10 L 18 3 A 4 4 0 0 0 20 -1 L 18 -13 A 4 4 0 0 0 14 -15 L 0 -8 Z" className="block dark:hidden" fill="white" stroke="rgba(120,53,15,0.14)" strokeWidth="1" />
                <path d="M 0 10 L -18 3 A 4 4 0 0 1 -20 -1 L -18 -13 A 4 4 0 0 1 -14 -15 L 0 -8 Z" className="hidden dark:block" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
                <path d="M 0 10 L 18 3 A 4 4 0 0 0 20 -1 L 18 -13 A 4 4 0 0 0 14 -15 L 0 -8 Z" className="hidden dark:block" fill="rgba(255,255,255,0.92)" stroke="rgba(255,255,255,0.30)" strokeWidth="1" />
                <path d="M 0 -8 L 0 10" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" strokeLinecap="round" className="block dark:hidden" />
                <path d="M 0 -8 L 0 10" stroke="rgba(99,102,241,0.9)" strokeWidth="1.2" strokeLinecap="round" className="hidden dark:block" />
                <path d="M -12 -6 H -4" stroke="rgba(120,53,15,0.35)" strokeWidth="1" strokeLinecap="round" className="block dark:hidden" />
                <path d="M -12 -2 H -5" stroke="rgba(120,53,15,0.30)" strokeWidth="1" strokeLinecap="round" className="block dark:hidden" />
                <path d="M 5 -6 H 12" stroke="rgba(120,53,15,0.35)" strokeWidth="1" strokeLinecap="round" className="block dark:hidden" />
                <path d="M 5 -2 H 11" stroke="rgba(120,53,15,0.30)" strokeWidth="1" strokeLinecap="round" className="block dark:hidden" />
                <path d="M -12 -6 H -4" stroke="rgba(255,255,255,0.65)" strokeWidth="1" strokeLinecap="round" className="hidden dark:block" />
                <path d="M -12 -2 H -5" stroke="rgba(255,255,255,0.55)" strokeWidth="1" strokeLinecap="round" className="hidden dark:block" />
                <path d="M 5 -6 H 12" stroke="rgba(255,255,255,0.65)" strokeWidth="1" strokeLinecap="round" className="hidden dark:block" />
                <path d="M 5 -2 H 11" stroke="rgba(255,255,255,0.55)" strokeWidth="1" strokeLinecap="round" className="hidden dark:block" />
              </g>
            </g>

            {/* Central emblem */}
            <g transform="translate(180 167)">
              <circle r="34" fill="white" opacity="0.92" filter="url(#maa-center-shadow)" stroke="rgba(99,102,241,0.10)" strokeWidth="1" />
              <circle r="31" fill="url(#maa-heart-center-bg)" stroke="white" strokeWidth="1.2" />
              <circle r="22.5" fill="#4f46e5" stroke="rgba(255,255,255,0.9)" strokeWidth="1" />
              <circle r="22.5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
              <g transform="translate(0 1)">
                <path d="M -10 5.5 L -10 -4.5 C -10 -6.2 -8.8 -7.2 -7 -6.5 L 0 -3.2 L 0 7.2 L -7 3.9 C -8.8 3.1 -10 3.9 -10 5.5 Z" fill="white" opacity="0.96" />
                <path d="M 10 5.5 L 10 -4.5 C 10 -6.2 8.8 -7.2 7 -6.5 L 0 -3.2 L 0 7.2 L 7 3.9 C 8.8 3.1 10 3.9 10 5.5 Z" fill="rgba(255,255,255,0.88)" />
                <path d="M 0 -3.2 L 0 7.2" stroke="#3730a3" strokeWidth="1.1" strokeLinecap="round" opacity="0.9" />
                <path d="M 0 -11.5 C 0.4 -9.8 0.8 -9.4 2.5 -9 C 0.8 -8.6 0.4 -8.2 0 -6.5 C -0.4 -8.2 -0.8 -8.6 -2.5 -9 C -0.8 -9.4 -0.4 -9.8 0 -11.5 Z" fill="#fbbf24" />
              </g>
              <g opacity="0.95">
                <circle cx="0" cy="-28.5" r="2.1" fill="#fbbf24" stroke="white" strokeWidth="1" />
                <circle cx="-24.6" cy="14.2" r="1.8" fill="#4f46e5" stroke="white" strokeWidth="1" />
                <circle cx="24.6" cy="14.2" r="1.8" fill="#06b6d4" stroke="white" strokeWidth="1" />
                <path d="M 0 -26.2 L 0 -22" stroke="#4f46e5" strokeWidth="1" strokeDasharray="2.2 2.2" opacity="0.35" strokeLinecap="round" />
                <path d="M -22.8 12.8 L -4.5 2.2" stroke="#4f46e5" strokeWidth="1" strokeDasharray="2.2 2.2" opacity="0.28" strokeLinecap="round" />
                <path d="M 22.8 12.8 L 4.5 2.2" stroke="#4f46e5" strokeWidth="1" strokeDasharray="2.2 2.2" opacity="0.28" strokeLinecap="round" />
              </g>
            </g>

            {/* Particles */}
            <circle cx="92" cy="105" r="2.4" fill="#818cf8" opacity="0.85" className="maa-dot maa-dot-1" />
            <circle cx="268" cy="108" r="2" fill="#fbbf24" opacity="0.90" className="maa-dot maa-dot-2" />
            <circle cx="84" cy="188" r="1.7" fill="#a5b4fc" opacity="0.70" className="maa-dot maa-dot-3" />
            <circle cx="276" cy="192" r="1.9" fill="#fcd34d" opacity="0.75" className="maa-dot maa-dot-4" />
            <circle cx="132" cy="72" r="1.3" fill="white" opacity="0.85" className="maa-dot maa-dot-5" />
            <circle cx="228" cy="74" r="1.4" fill="white" opacity="0.80" className="maa-dot maa-dot-6" />

            {/* Sparkles */}
            <g className="maa-sparkle maa-sparkle-1" style={{ transformOrigin: '58px 68px' } as React.CSSProperties}>
              <path d="M 58 56 C 58.7 60.2 59.5 61 63.5 61.7 C 59.5 62.4 58.7 63.2 58 67.4 C 57.3 63.2 56.5 62.4 52.5 61.7 C 56.5 61 57.3 60.2 58 56 Z" fill="#fbbf24" opacity="0.95" />
            </g>
            <g className="maa-sparkle maa-sparkle-2" style={{ transformOrigin: '302px 68px' } as React.CSSProperties} opacity="0.9">
              <path d="M 302 62 C 302.5 64.8 303 65.3 305.8 65.8 C 303 66.3 302.5 66.8 302 69.6 C 301.5 66.8 301 66.3 298.2 65.8 C 301 65.3 301.5 64.8 302 62 Z" fill="#818cf8" />
            </g>
            <g className="maa-sparkle maa-sparkle-3" style={{ transformOrigin: '66px 248px' } as React.CSSProperties} opacity="0.85">
              <path d="M 66 242 C 66.6 245 67.2 245.6 70.2 246.2 C 67.2 246.8 66.6 247.4 66 250.4 C 65.4 247.4 64.8 246.8 61.8 246.2 C 64.8 245.6 65.4 245 66 242 Z" fill="#a5b4fc" />
            </g>
            <g className="maa-sparkle maa-sparkle-4" style={{ transformOrigin: '294px 252px' } as React.CSSProperties} opacity="0.9">
              <path d="M 294 246 C 294.6 248.6 295.1 249.1 297.7 249.7 C 295.1 250.3 294.6 250.8 294 253.4 C 293.4 250.8 292.9 250.3 290.3 249.7 C 292.9 249.1 293.4 248.6 294 246 Z" fill="#fcd34d" />
            </g>

            <g opacity="0.18" className="hidden sm:block">
              <path d="M 92 42 H 112" stroke="#6366f1" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="3 4" />
              <path d="M 248 42 H 268" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="3 4" />
            </g>
          </svg>
        </div>
      </div>

      {/* Floating badges */}
      <div className="maa-badge maa-badge-left pointer-events-none absolute start-[-2%] top-[14%] hidden items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-800/90 dark:text-slate-200 sm:inline-flex lg:start-[1%] lg:top-[16%]" style={{ animationDelay: '0.2s' } as React.CSSProperties}>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
          <GraduationCap className="h-3.5 w-3.5" />
        </span>
        Teacher
      </div>
      <div className="maa-badge maa-badge-right pointer-events-none absolute end-[-2%] top-[18%] hidden items-center gap-2 rounded-full border border-amber-200/70 bg-amber-50/90 px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm backdrop-blur-md dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 sm:inline-flex lg:end-[1%]" style={{ animationDelay: '0.6s' } as React.CSSProperties}>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-white dark:bg-amber-500">
          <BookOpen className="h-3.5 w-3.5" />
        </span>
        Student
      </div>
      <div className="maa-badge maa-badge-bottom pointer-events-none absolute bottom-[10%] left-1/2 hidden -translate-x-1/2 items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-800/90 dark:text-slate-200 sm:inline-flex" style={{ animationDelay: '1s' } as React.CSSProperties}>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300">
          <Users className="h-3 w-3" />
        </span>
        Parent
        <span className="h-3 w-px bg-slate-200 dark:bg-slate-600" aria-hidden />
        <span className="text-[10px] font-medium tracking-wide text-slate-500 dark:text-slate-400">together</span>
      </div>

      <style>{`
        .maa-heart-wrap { width: 100%; max-width: 100%; box-sizing: border-box; }
        .maa-heart-float { animation: maa-heart-float 5.8s ease-in-out infinite; will-change: transform; }
        .maa-heart-scale { animation: maa-heart-scale 6.2s ease-in-out infinite; will-change: transform; transform-origin: center center; }
        .maa-heart-glow { animation: maa-glow-pulse 4.2s ease-in-out infinite; }
        .maa-heart-glow-2 { animation: maa-glow-pulse 5.6s ease-in-out infinite reverse; }
        .maa-sparkle { animation: maa-sparkle-pulse 2.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .maa-sparkle-2 { animation-delay: 0.7s; }
        .maa-sparkle-3 { animation-delay: 1.1s; }
        .maa-sparkle-4 { animation-delay: 1.6s; }
        .maa-dot { animation: maa-dot-float 4.8s ease-in-out infinite; }
        .maa-dot-2 { animation-delay: 0.4s; animation-duration: 5.2s; }
        .maa-dot-3 { animation-delay: 0.9s; animation-duration: 5.8s; }
        .maa-dot-4 { animation-delay: 0.5s; animation-duration: 4.6s; }
        .maa-dot-5 { animation-delay: 1.2s; }
        .maa-dot-6 { animation-delay: 0.8s; }
        .maa-badge { animation: maa-badge-float 5s ease-in-out infinite; }
        .maa-badge-right { animation-delay: 0.9s; animation-duration: 5.6s; }
        .maa-badge-bottom { animation-delay: 1.4s; animation-duration: 6s; }
        @keyframes maa-heart-float { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-9px);} }
        @keyframes maa-heart-scale { 0%,100%{transform:scale(1);} 50%{transform:scale(1.018);} }
        @keyframes maa-glow-pulse { 0%,100%{opacity:0.85; transform:translate(-50%,-50%) scale(1);} 50%{opacity:1; transform:translate(-50%,-50%) scale(1.04);} }
        @keyframes maa-sparkle-pulse { 0%,100%{opacity:1; transform:scale(1) rotate(0deg);} 50%{opacity:0.55; transform:scale(0.82) rotate(6deg);} }
        @keyframes maa-dot-float { 0%,100%{transform:translateY(0) scale(1);} 50%{transform:translateY(-6px) scale(1.08);} }
        @keyframes maa-badge-float { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-5px);} }
        @media (prefers-reduced-motion: reduce) {
          .maa-heart-float, .maa-heart-scale, .maa-heart-glow, .maa-heart-glow-2, .maa-sparkle, .maa-dot, .maa-badge { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

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
        {/* ========== CTA TOP ========== */}
        <div className={`pb-8 pt-12 sm:pb-10 sm:pt-16 lg:pb-10 lg:pt-20 transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/60 bg-brand-50/80 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-brand-700 backdrop-blur-sm dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300">
              <Sparkles className="h-3.5 w-3.5 text-gold-500 dark:text-gold-400" aria-hidden />
              <span>{t('authTaglineBadge')}</span>
              <span className="hidden items-center gap-1.5 ps-2 sm:inline-flex" aria-hidden>
                <span className="h-1 w-1 rounded-full bg-brand-400/60" />
                <Heart className="h-3 w-3 text-brand-500/70 dark:text-brand-300/70" />
              </span>
            </div>

            <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[2.6rem] dark:text-white">
              {t('footerCtaTitle')}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-slate-500 dark:text-slate-400 sm:text-lg">
              {t('footerCtaSub')}
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-brand transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-brand-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 press-effect"
              >
                {t('footerGetStarted')}
                <ArrowRight className="h-4 w-4 rtl:rotate-180 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <Link
                href="/centers"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:bg-slate-50 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-brand-500/40 dark:hover:bg-slate-700 dark:hover:text-brand-300"
              >
                {t('footerExplore')}
              </Link>
            </div>

            {/* Trust line */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-slate-600 ring-1 ring-slate-200/70 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                <GraduationCap className="h-3.5 w-3.5 text-brand-500" aria-hidden /> {t('teachersNav')}
              </span>
              <span className="hidden h-3 w-px bg-slate-200 dark:bg-slate-700 sm:block" aria-hidden />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-slate-600 ring-1 ring-slate-200/70 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                <BookOpen className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden /> {t('footerStudentsLabel')}
              </span>
              <span className="hidden h-3 w-px bg-slate-200 dark:bg-slate-700 sm:block" aria-hidden />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-slate-600 ring-1 ring-slate-200/70 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                <Users className="h-3.5 w-3.5 text-gold-600 dark:text-gold-400" aria-hidden /> {t('footerParentsLabel')}
              </span>
            </div>
          </div>

          {/* Central visual — LARGE */}
          <div className={`relative mx-auto mt-10 flex max-w-[640px] justify-center sm:mt-12 lg:mt-14 transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="w-[260px] sm:w-[380px] lg:w-[460px]" style={{ maxWidth: '100%' }}>
              <MaarejHeartVisual label={t('footerHeartLabel')} />
            </div>
          </div>

          {/* Subtitle under heart */}
          <div className={`mx-auto mt-2 max-w-xl text-center transition-all duration-700 delay-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <p className="inline-flex flex-wrap items-center justify-center gap-2 text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden /> {t('footerTeacherStudent')}
              </span>
              <span className="text-slate-300 dark:text-slate-600" aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-gold-500" aria-hidden /> {t('footerParentLabel')}
              </span>
              <span className="text-slate-300 dark:text-slate-600" aria-hidden>↕</span>
              <span className="text-brand-600 dark:text-brand-300">Maarej</span>
            </p>
          </div>

          {/* Divider */}
          <div className="mx-auto mt-10 flex max-w-5xl items-center gap-3 sm:mt-12" aria-hidden>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200 dark:to-slate-800" />
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              <span className="h-1 w-1 rounded-full bg-gold-400" />
              <span className="h-1 w-1 rounded-full bg-teal-400" />
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-200 dark:to-slate-800" />
          </div>
        </div>

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
            {/* brand mini */}
            <div className="mt-6 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 shadow-brand dark:bg-brand-500">
                <BookOpen className="h-4 w-4 text-white" aria-hidden />
              </div>
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">{t('appName')}</span>
            </div>
            <p className="mt-2 max-w-[18rem] text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('homeFooterTagline')}</p>
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
