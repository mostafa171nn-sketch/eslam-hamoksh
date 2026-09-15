import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { Inter, Noto_Sans_Arabic } from 'next/font/google';
import './globals.css';
import { AppProviders } from '../src/components/AppProviders';
import { ConditionalFooter } from '../src/components/layout/ConditionalFooter';
import { RouteTransition } from '../src/components/RouteTransition';
import { NavigationProgress } from '../src/components/NavigationProgress';
import { RoutePrefetcher } from '../src/components/RoutePrefetcher';

/**
 * Absolute origin used to resolve every relative URL emitted by the metadata
 * layer (canonical, robots, sitemap...). Override with NEXT_PUBLIC_SITE_URL
 * when the production domain is final (defaults to the Maarej brand domain).
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://maarej.com';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  display: 'swap',
  variable: '--font-noto-arabic',
});

export function generateMetadata(): Metadata {
  const lang = cookies().get('maarech-lang')?.value === 'en' ? 'en' : 'ar';
  const common = {
    metadataBase: new URL(SITE_URL),
    robots: { index: true, follow: true },
    icons: { icon: '/icon.svg' },
  };
  return lang === 'ar'
    ? {
        ...common,
        title: 'معارج | Maarej',
        description: 'منصة متكاملة متعددة الأطراف لإدارة مراكز التعليم: للمعلمين والطلاب وأولياء الأمور.',
        openGraph: {
          type: 'website',
          locale: 'ar_SA',
          siteName: 'معارج | Maarej',
          title: 'معارج | Maarej',
          description: 'منصة متكاملة متعددة الأطراف لإدارة مراكز التعليم: للمعلمين والطلاب وأولياء الأمور.',
          url: SITE_URL,
        },
      }
    : {
        ...common,
        title: 'Maarej | Education Platform',
        description: 'A complete multi-tenant learning-center platform for teachers, students and parents.',
        openGraph: {
          type: 'website',
          locale: 'en_US',
          siteName: 'Maarej',
          title: 'Maarej | Education Platform',
          description: 'A complete multi-tenant learning-center platform for teachers, students and parents.',
          url: SITE_URL,
        },
      };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#4f46e5',
};

/**
 * Applied BEFORE first paint so the stored theme/direction never flashes.
 * Keep it tiny + synchronous; it mirrors the logic in ThemeProvider/LangProvider.
 */
const themeInitScript = `
(function(){try{
var t=localStorage.getItem('maarech-theme');
if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
var r=document.documentElement;
if(t==='dark'){r.classList.add('dark');}else{r.classList.remove('dark');}
r.style.colorScheme=t;
var l=localStorage.getItem('maarech-lang');
if(l!=='en'){l='ar';}
if(l==='ar'){try{var c=document.cookie.match(/(?:^|; )maarech-lang=([^;]+)/);if(c&&c[1]==='en'){l='en';}}catch(e){}}
r.lang=l;r.dir=l==='ar'?'rtl':'ltr';
}catch(e){}})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={`${inter.variable} ${notoSansArabic.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-[100dvh] flex-col bg-slate-50 font-sans text-slate-900 antialiased dark:bg-slate-900 dark:text-slate-100">
        <NavigationProgress />
        <RoutePrefetcher />
        <AppProviders>
          <RouteTransition mode="page" className="flex-1">
            {children}
          </RouteTransition>
          <ConditionalFooter />
        </AppProviders>
      </body>
    </html>
  );
}
