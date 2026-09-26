'use client';

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { useT, type DictKey } from '../../i18n';

/*
  Public bottom button navigation — mirrors the reference site's
  `nav.bottom-nav.context-nav` (fixed bottom, centered on desktop, 4-col
  grid on a mobile-only bar).

  Reused by the public pages with their own section list:
    - Home (/)        -> اكتشف / كيف تعمل / للطالب / لولي الأمر
    - /teachers       -> الفلاتر / الخريطة / النتائج
    - /centers        -> الفلاتر / الخريطة / النتائج
    - /spaces         -> الفلاتر / الخريطة / النتائج

  Behavior matches the reference: clicking smooth-scrolls to the section and
  the active pill follows the section currently in view (scrollspy).
  Mobile only (`lg:hidden`) — desktop layout is untouched.
*/

/* The exact SVG glyphs from the reference `nav.bottom-nav.context-nav`. */
export function FiltersIcon() {
  return (
    <>
      <path d="M4 6h16M7 12h10M10 18h4" />
      <circle cx="8" cy="6" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18" r="1.4" fill="currentColor" stroke="none" />
    </>
  );
}

export function MapIcon() {
  return (
    <>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  );
}

export function ResultsIcon() {
  return (
    <>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 20c.4-4 2.7-6 6.5-6s6.1 2 6.5 6" />
      <path d="M18.2 6.2 21 5l-2.8-1.2" />
    </>
  );
}

/* The exact SVG glyphs from the reference home `nav.bottom-nav.context-nav`
   (اكتشف / كيف تعمل / للطالب / لولي الأمر). */
export function HomeDiscoverIcon() {
  return (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.7-3.7" />
    </>
  );
}

export function HomeHowIcon() {
  return (
    <>
      <path d="M4 5.5c2.8-.8 5.3-.4 8 1.5v12c-2.7-1.9-5.2-2.3-8-1.5v-12Z" />
      <path d="M20 5.5c-2.8-.8-5.3-.4-8 1.5v12c2.7-1.9 5.2-2.3 8-1.5v-12Z" />
    </>
  );
}

export function HomeStudentIcon() {
  return (
    <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
  );
}

export function HomeParentIcon() {
  return (
    <>
      <circle cx="9" cy="9" r="2.8" />
      <path d="M3.8 19c.3-3.4 2.1-5 5.2-5s4.9 1.6 5.2 5" />
      <circle cx="17" cy="9.5" r="2.1" />
      <path d="M16 14.3c2.9-.2 4.5 1.3 4.7 4.1" />
    </>
  );
}

export interface BottomNavSection {
  id: string;
  targetId: string;
  labelKey: DictKey;
  icon: ReactNode;
}

export type BottomNavSections = readonly BottomNavSection[];

const ITEMS: BottomNavSections = [
  { id: 'filters', targetId: 'teacherFilters', labelKey: 'teacherFiltersNav', icon: <FiltersIcon /> },
  { id: 'map', targetId: 'teacherMap', labelKey: 'teacherMapNav', icon: <MapIcon /> },
  { id: 'results', targetId: 'teacherResultsHead', labelKey: 'teacherResultsNav', icon: <ResultsIcon /> },
];

const ACTIVE_IDLE =
  'text-slate-500 hover:text-[#0878f8] dark:text-slate-400 dark:hover:text-sky-300';

const ACTIVE_PILL =
  'bg-[linear-gradient(145deg,#e7f4ff,#f3f9ff)] text-[#0878f8] shadow-[inset_0_0_0_1px_#d7ebfc] dark:bg-[linear-gradient(145deg,#10294a,#0b1d33)] dark:text-sky-300 dark:shadow-[inset_0_0_0_1px_#1e3f63]';

export function PublicBottomNav({ sections = ITEMS }: { sections?: BottomNavSections }) {
  const { t } = useT();
  const [active, setActive] = useState<string>(sections[0]?.id ?? 'map');
  const activeRef = useRef<string>(sections[0]?.id ?? 'map');

  /* Scrollspy: the active pill tracks whichever section is currently in view
     (the last section whose top has crossed the 25%-viewport line). */
  useEffect(() => {
    const sectionIds = sections.map((s) => s.targetId);
    const ctxIds = sections.map((s) => s.id);

    const compute = () => {
      /* Re-query the targets on every tick — Home's featured sections render
         lazily after data loads, so they may not exist yet at mount time. */
      const els = sectionIds.map((id) => document.getElementById(id));
      const line = window.innerHeight * 0.25;
      let current = ctxIds[0] ?? '';
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        if (!el) break;
        if (el.getBoundingClientRect().top <= line) current = ctxIds[i];
        else break;
      }
      if (activeRef.current !== current) {
        activeRef.current = current;
        setActive(current);
      }
    };

    compute();
    window.addEventListener('scroll', compute, { passive: true });
    window.addEventListener('resize', compute);
    return () => {
      window.removeEventListener('scroll', compute);
      window.removeEventListener('resize', compute);
    };
  }, [sections]);

  const scrollToSection = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const el = document.getElementById(href.slice(1));
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <div className="h-[72px] lg:hidden" aria-hidden />
      <nav
        aria-label={t('mainNavigation')}
        style={{ '--context-count': sections.length } as CSSProperties}
        className={`fixed inset-x-0 bottom-0 z-40 grid h-[72px] rounded-t-[22px] border-t border-slate-200/70 bg-white/95 px-[5px] pt-[7px] pb-[max(6px,env(safe-area-inset-bottom))] shadow-[0_-5px_20px_rgba(16,61,105,0.063)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 lg:hidden grid-cols-[repeat(var(--context-count),minmax(0,1fr))]`}
      >
        {sections.map((item) => {
          const isActive = active === item.id;
          return (
            <a
              key={item.id}
              href={`#${item.targetId}`}
              data-context-id={item.id}
              aria-current={isActive ? 'location' : undefined}
              onClick={(e) => scrollToSection(e, `#${item.targetId}`)}
              className={`flex min-h-[56px] min-w-0 flex-col items-center justify-center gap-[3px] rounded-[17px] px-[5px] py-[5px] font-extrabold transition-all duration-150 ${
                isActive ? `active ${ACTIVE_PILL}` : ACTIVE_IDLE
              }`}
            >
              <span
                className={`grid place-items-center transition-all duration-150 ${
                  isActive
                    ? 'h-[34px] w-[38px] rounded-[13px] bg-white shadow-[0_5px_13px_rgba(15,113,205,0.1)] dark:bg-slate-800'
                    : 'h-[29px] w-[29px]'
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-[23px] w-[23px]"
                >
                  {item.icon}
                </svg>
              </span>
              <b className="whitespace-nowrap text-[11px] font-extrabold leading-[1.25]">{t(item.labelKey)}</b>
            </a>
          );
        })}
      </nav>
    </>
  );
}

export default PublicBottomNav;