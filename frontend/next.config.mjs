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
const backendUrl = process.env.NEXT_PUBLIC_API_URL || (isProd ? '' : 'http://localhost:4000');

if (isProd && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error(
    'Missing NEXT_PUBLIC_API_URL: production builds must set this to the deployed backend URL ' +
      '(e.g. https://your-api-host.com). The /api rewrite cannot target localhost on Vercel.',
  );
}

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
      { source: '/uploads/:path*', destination: `${backendUrl}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
