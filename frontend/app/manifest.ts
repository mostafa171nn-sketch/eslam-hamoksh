import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'معارج | Maarej — Educational Center Management',
    short_name: 'Maarej',
    description: 'منصة متكاملة متعددة الأطراف لإدارة مراكز التعليم: للمعلمين والطلاب وأولياء الأمور.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#4f46e5',
    lang: 'ar',
    dir: 'rtl',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}