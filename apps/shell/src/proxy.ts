import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { authConfig } from './auth.config';

const { auth } = NextAuth(authConfig);

const dashboardManifestUrl =
  process.env.NEXT_PUBLIC_DASHBOARD_MFE_URL ?? 'http://localhost:3002/mf-manifest.json';
const transactionsManifestUrl =
  process.env.NEXT_PUBLIC_TRANSACTIONS_MFE_URL ?? 'http://localhost:3003/mf-manifest.json';

function originOf(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

const mfeOrigins = [dashboardManifestUrl, transactionsManifestUrl]
  .map(originOf)
  .filter((origin): origin is string => Boolean(origin));

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== 'production';
  const vercelToolbarEnabled =
    process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_PREVIEW_FEEDBACK_ENABLED !== '0';
  const toolbarOrigins = vercelToolbarEnabled ? ['https://vercel.live'] : [];
  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...mfeOrigins,
    ...toolbarOrigins,
    ...(isDev ? ["'unsafe-eval'"] : []),
  ];
  const connectSources = [
    "'self'",
    ...mfeOrigins,
    ...(isDev ? ['ws:'] : []),
    ...toolbarOrigins,
    ...(vercelToolbarEnabled ? ['wss://ws-us3.pusher.com'] : []),
  ];

  return [
    `default-src 'self'`,
    `script-src ${scriptSources.join(' ')}`,
    `style-src 'self' 'unsafe-inline' ${toolbarOrigins.join(' ')}`.trim(),
    `img-src 'self' data: blob: https://lh3.googleusercontent.com ${toolbarOrigins.join(' ')}`.trim(),
    `connect-src ${connectSources.join(' ')}`,
    `font-src 'self' ${toolbarOrigins.join(' ')}`.trim(),
    ...(vercelToolbarEnabled ? [`frame-src 'self' https://vercel.live`] : []),
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self' https://accounts.google.com`,
    `object-src 'none'`,
    `report-uri /api/csp-report`,
  ].join('; ');
}

function cspHeaderName(): 'content-security-policy' | 'content-security-policy-report-only' {
  return process.env.CSP_MODE === 'enforce'
    ? 'content-security-policy'
    : 'content-security-policy-report-only';
}

function withCsp(req: NextRequest) {
  const nonce = Buffer.from(randomUUID()).toString('base64');
  const policy = buildCsp(nonce);
  const headerName = cspHeaderName();
  const requestHeaders = new Headers(req.headers);

  // Next 16 reads the nonce from the forwarded CSP policy header. Keep x-nonce
  // available to application components that need to read the nonce directly.
  requestHeaders.set(headerName, policy);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(headerName, policy);
  return response;
}

const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isAuthApi(pathname: string): boolean {
  return pathname === '/api/auth' || pathname.startsWith('/api/auth/');
}

function isCsrfRejected(
  requestOrigin: string,
  origin: string | null,
  fetchSite: string | null
): boolean {
  const allowedOrigins = new Set([requestOrigin]);

  if (process.env.NODE_ENV !== 'production') {
    for (const origin of mfeOrigins) allowedOrigins.add(origin);
  }

  return Boolean((origin && !allowedOrigins.has(origin)) || fetchSite === 'cross-site');
}

export const proxy = auth((req) => {
  const isLoggedIn = Boolean(req.auth?.user?.id);
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const isApiRoute = pathname.startsWith('/api/');
  const isCspReportRoute = pathname === '/api/csp-report';
  const publicAuthRoutes = ['/login', '/auth/error', '/register'];
  const isPublicRoute = publicAuthRoutes.includes(pathname);

  if (req.method === 'OPTIONS') return;

  if (
    isApiRoute &&
    !isAuthApi(pathname) &&
    mutatingMethods.has(req.method.toUpperCase()) &&
    isCsrfRejected(nextUrl.origin, req.headers.get('origin'), req.headers.get('sec-fetch-site'))
  ) {
    return NextResponse.json({ error: 'Origem não permitida' }, { status: 403 });
  }

  // CSP reports are browser-generated and must be accepted before login.
  if (isCspReportRoute || isAuthApi(pathname)) return;

  if (!isLoggedIn && !isPublicRoute) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', nextUrl));
  }

  if (isLoggedIn && isPublicRoute) {
    return NextResponse.redirect(new URL('/', nextUrl));
  }

  if (isApiRoute) return;
  return withCsp(req);
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
