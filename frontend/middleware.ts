import { NextResponse, type NextRequest } from 'next/server';

/**
 * Private, utility and filtered URLs get an explicit `X-Robots-Tag: noindex`
 * response header (belt-and-suspenders alongside robots.txt).
 *
 * Every page/layout in the app is a client component, so Next.js route-segment
 * `metadata`/`robots` exports are unavailable; the middleware header is the
 * Next.js-native noindex mechanism that works without a server-components
 * migration. The public /teachers, /teachers/[id], /centers and /centers/[id]
 * pages intentionally never match (see path prefix guards below).
 */
function shouldNoindex(pathname: string): boolean {
  // Utility / session routes.
  if (
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/register' ||
    pathname.startsWith('/register/') ||
    pathname === '/search' ||
    pathname.startsWith('/search/') ||
    pathname === '/change-password' ||
    pathname.startsWith('/change-password/') ||
    pathname === '/reset-password' ||
    pathname.startsWith('/reset-password/') ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/forgot-password/')
  ) {
    return true;
  }

  // Private (dashboard group) surfaces. Guarded with exact segments so the
  // public /teachers and /centers trees are never caught by /teacher or
  // /center.
  if (
    pathname.startsWith('/dashboard/') ||
    pathname.startsWith('/admin/') ||
    pathname.startsWith('/profile/') ||
    pathname.startsWith('/notifications/') ||
    pathname.startsWith('/student/') ||
    pathname.startsWith('/parent/') ||
    pathname === '/teacher' ||
    pathname.startsWith('/teacher/') ||
    pathname === '/center' ||
    pathname.startsWith('/center/') ||
    pathname.startsWith('/centers/register')
  ) {
    return true;
  }

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Filtered / paginated variants of the public listings get noindex too; the
  // bare listing page (and sitemap URLs) remains the canonical, indexable URL.
  const filteredListing =
    (pathname === '/teachers' || pathname === '/centers') && search.length > 0;

  if (shouldNoindex(pathname) || filteredListing) {
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login/:path*',
    '/register/:path*',
    '/search/:path*',
    '/change-password/:path*',
    '/reset-password/:path*',
    '/forgot-password/:path*',
    '/dashboard/:path*',
    '/admin/:path*',
    '/profile/:path*',
    '/notifications/:path*',
    '/student/:path*',
    '/parent/:path*',
    '/teacher/:path*',
    '/center/:path*',
    '/centers/register/:path*',
    '/teachers/:path*',
    '/centers/:path*',
  ],
};