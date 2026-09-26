'use client';

import { useMemo, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT, type DictKey } from '../../i18n';

/*
  Home bottom button navigation — a faithful reproduction of the reference
  site's `nav.bottom-nav.context-nav` (صفحة «عن معارج» → شريط التنقل السفلي).

  Reference source (live-inspected):
    Structure  : <nav class="bottom-nav context-nav" style="--context-count: 4">
                   <a href="#aboutIntro" data-context-id="about" class="active">…<b>عن معارج</b></a>
                   <a href="#aboutUsers" data-context-id="users">…<b>لمن؟</b></a>
                   <a href="teachers.html" data-context-id="teachers">…<b>المدرسين</b></a>
                   <a href="centers.html" data-context-id="centers">…<b>سناتر</b></a>
                 </nav>
    Position   : fixed, bottom:0, left:50%, translateX(-50%), width:100%,
                 max-width:1100px, z-index:70 — visible at ALL widths.
    Chrome     : background rgba(255,255,255,.96), border-radius 22px 22px 0 0,
                 border-top 1px #edf2fa, box-shadow rgba(16,61,105,.063) 0 -5px 20px,
                 padding 7px 8px calc(6px + env(safe-area-inset-bottom)),
                 min-height 72px (70px ≤900).
    Links      : grid-cols repeat(var(--context-count),minmax(0,1fr)); dir rtl;
                 display flex column center, gap 2px, min-height 56px (54 ≤900),
                 padding 5px (inline 2 ≤900), radius 17px, color #718096,
                 font-weight 800, transition .18s.
    Label <b>  : font-size 11px (10 ≤900, 9 ≤370), line-height 1.25, weight 900.
    Icon       : svg 23×23, stroke-width 1.8; wrapper span 29×29 (active 38×34,
                 white, radius 13px, shadow rgba(15,113,205,.1) 0 5px 13px).
    Active     : background linear-gradient(145deg,#e7f4ff,#f3f9ff), color #0878e8,
                 box-shadow inset 0 0 0 1px #d7ebfc.
  Icons/"لمن؟"/labels/active follow the reference exactly. The "active" pill
  follows the current route (reference shows "عن معارج" active on the landing
  page); destinations map to existing project routes.
*/

interface HomeNavItem {
  href: string;
  contextId: string;
  labelKey: DictKey;
  icon: ReactNode;
}

const ITEMS: readonly HomeNavItem[] = [
  {
    href: '/',
    contextId: 'about',
    labelKey: 'homeNavAbout',
    icon: (
      <>
        <path d="M4 5.5c2.8-.8 5.3-.4 8 1.5v12c-2.7-1.9-5.2-2.3-8-1.5v-12Z" />
        <path d="M20 5.5c-2.8-.8-5.3-.4-8 1.5v12c2.7-1.9 5.2-2.3 8-1.5v-12Z" />
      </>
    ),
  },
  {
    href: '/login',
    contextId: 'users',
    labelKey: 'homeNavWhom',
    icon: (
      <>
        <circle cx="9" cy="9" r="2.8" />
        <path d="M3.8 19c.3-3.4 2.1-5 5.2-5s4.9 1.6 5.2 5" />
        <circle cx="17" cy="9.5" r="2.1" />
        <path d="M16 14.3c2.9-.2 4.5 1.3 4.7 4.1" />
      </>
    ),
  },
  {
    href: '/teachers',
    contextId: 'teachers',
    labelKey: 'homeNavTeachers',
    icon: (
      <>
        <circle cx="12" cy="8" r="3.25" />
        <path d="M5.5 20c.4-4 2.7-6 6.5-6s6.1 2 6.5 6" />
        <path d="M18.2 6.2 21 5l-2.8-1.2" />
      </>
    ),
  },
  {
    href: '/centers',
    contextId: 'centers',
    labelKey: 'homeNavCenters',
    icon: (
      <>
        <path d="M4 20V7l8-3 8 3v13" />
        <path d="M8 10h2M14 10h2M8 14h2M14 14h2" />
        <path d="M10 20v-3h4v3" />
      </>
    ),
  },
];

const NAV_BASE =
  'fixed bottom-0 left-1/2 z-[70] grid w-full max-w-[1100px] min-h-[72px] -translate-x-1/2 ' +
  'items-stretch rounded-t-[22px] border-t border-[#edf2fa] bg-[rgba(255,255,255,0.96)] ' +
  'px-2 pb-[max(6px,env(safe-area-inset-bottom))] pt-[7px] ' +
  'shadow-[0_-5px_20px_rgba(16,61,105,0.063)] ' +
  'max-[900px]:min-h-[70px] max-[900px]:px-[5px] ' +
  'grid-cols-[repeat(var(--context-count),minmax(0,1fr))]';

const LINK_BASE =
  'flex min-h-[56px] min-w-0 flex-col items-center justify-center gap-[2px] ' +
  'rounded-[17px] px-[5px] py-[5px] font-extrabold transition-all duration-[0.18s] ' +
  'max-[900px]:min-h-[54px] max-[900px]:px-[2px]';

const IDLE = 'text-[#718096] dark:text-slate-400';

const ACTIVE =
  'bg-[linear-gradient(145deg,#e7f4ff,#f3f9ff)] text-[#0878e8] ' +
  'shadow-[inset_0_0_0_1px_#d7ebfc] ' +
  'dark:bg-[linear-gradient(145deg,#10294a,#0b1d33)] dark:text-sky-300 dark:shadow-[inset_0_0_0_1px_#1e3f63]';

const ICON_WRAPPER = 'grid place-items-center transition-all duration-[0.18s]';

export function HomeBottomNav() {
  const { t } = useT();
  const pathname = usePathname();

  const activeId = useMemo(() => {
    if (pathname === '/') return 'about';
    if (pathname.startsWith('/teachers')) return 'teachers';
    if (pathname.startsWith('/centers')) return 'centers';
    return 'users';
  }, [pathname]);

  const scrollToTop = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav
      id="bottomNav"
      dir="rtl"
      aria-label={t('mainNavigation')}
      style={{ '--context-count': ITEMS.length } as CSSProperties}
      className={`bottom-nav context-nav ${NAV_BASE}`}
    >
      {ITEMS.map((item) => {
        const isActive = activeId === item.contextId;
        return (
          <Link
            key={item.contextId}
            href={item.href}
            data-context-id={item.contextId}
            aria-current={isActive ? 'location' : undefined}
            onClick={item.href === '/' && pathname === '/' ? scrollToTop : undefined}
            className={`${LINK_BASE} ${isActive ? `active ${ACTIVE}` : IDLE}`}
          >
            <span className={`${ICON_WRAPPER} ${
              isActive
                ? 'h-[34px] w-[38px] rounded-[13px] bg-white shadow-[0_5px_13px_rgba(15,113,205,0.1)] dark:bg-slate-800'
                : 'h-[29px] w-[29px]'
            }`}>
              <svg
                className="ui-icon h-[23px] w-[23px]"
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {item.icon}
              </svg>
            </span>
            <b className="whitespace-nowrap text-[11px] leading-[1.25] font-black max-[900px]:text-[10px] max-[370px]:text-[9px]">
              {t(item.labelKey)}
            </b>
          </Link>
        );
      })}
    </nav>
  );
}

export default HomeBottomNav;