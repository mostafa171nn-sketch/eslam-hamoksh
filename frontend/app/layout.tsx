import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { Inter, Noto_Sans_Arabic } from 'next/font/google';
import './globals.css';
import { AppProviders } from '../src/components/AppProviders';
import { ConditionalFooter } from '../src/components/layout/ConditionalFooter';

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
  return lang === 'ar'
    ? {
        title: 'معارج | Maarej',
        description: 'منصة متكاملة متعددة الأطراف لإدارة مراكز التعليم: للمعلمين والطلاب وأولياء الأمور.',
      }
    : {
        title: 'Maarej | Education Platform',
        description: 'A complete multi-tenant learning-center platform for teachers, students and parents.',
      };
}

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
        <AppProviders>
          <div className="flex-1">{children}</div>
          <ConditionalFooter />
        </AppProviders>
      </body>
    </html>
  );
}
