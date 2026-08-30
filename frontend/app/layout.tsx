import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import './globals.css';
import { AppProviders } from '../src/components/AppProviders';

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
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-[100dvh] bg-slate-50 font-sans text-slate-900 antialiased dark:bg-slate-900 dark:text-slate-100">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}