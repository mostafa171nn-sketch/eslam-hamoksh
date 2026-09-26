/** @type {import('next').NextConfig} */

/**
 * Backend base URL the client-side `/api/*` requests are proxied to via
 * rewrites. In production this MUST be the deployed API URL.
 *
 * - Development: falls back to the local backend so `npm run dev` works out of
 *   the box against `backend` running on port 4000.
 * - Production (Vercel): the localhost fallback can never work (there is no
 *   backend on the serverless machine), so we require NEXT_PUBLIC_API_URL.
 */
const isProd = process.env.NODE_ENV === 'production';
const isUiDemo = process.env.NEXT_PUBLIC_UI_DEMO_DATA === 'true';
const backendUrl = process.env.NEXT_PUBLIC_API_URL || ((isProd && !isUiDemo) ? '' : 'http://localhost:4000');

if (isProd && !process.env.NEXT_PUBLIC_API_URL && !isUiDemo) {
  throw new Error(
    'Missing NEXT_PUBLIC_API_URL: production builds must set this to the deployed backend URL ' +
      '(e.g. https://your-api-host.com). The /api rewrite cannot target localhost on Vercel. ' +
      'Set NEXT_PUBLIC_UI_DEMO_DATA=true to build a frontend-only static demo instead.',
  );
}

const nextConfig = {
  // Allow prod (`next build`/`next start`) to use its own dist dir so it can
  // coexist with `next dev` without the dev server clobbering the deployment.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
      { source: '/uploads/:path*', destination: `${backendUrl}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
