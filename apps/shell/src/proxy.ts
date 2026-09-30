import NextAuth from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authConfig } from './auth.config';

const { auth } = NextAuth(authConfig);

function originOf(url: string | undefined, fallback: string) {
  try {
    return new URL(url ?? fallback).origin;
  } catch {
    return new URL(fallback).origin;
  }
}

const mfeOrigins = [
  ...new Set([
    originOf(process.env.NEXT_PUBLIC_DASHBOARD_MFE_URL, 'http://localhost:3002/mf-manifest.json'),
    originOf(
      process.env.NEXT_PUBLIC_TRANSACTIONS_MFE_URL,
      'http://localhost:3003/mf-manifest.json'
    ),
  ]),
].join(' ');

function buildCsp(nonce: string) {
  const isDev = process.env.NODE_ENV !== 'production';
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${mfeOrigins}${isDev ? " 'unsafe-eval'" : ''} 'report-sample'`,
    `style-src 'self' 'nonce-${nonce}' 'report-sample'`,
    `img-src 'self' data: blob: https://lh3.googleusercontent.com`,
    `font-src 'self'`,
    `connect-src 'self' ${mfeOrigins}${isDev ? ' ws:' : ''}`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self' https://accounts.google.com`,
    `object-src 'none'`,
    `report-uri /api/csp-report`,
  ].join('; ');
}

function nextWithCsp(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy-report-only', csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy-Report-Only', csp);
  return response;
}

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;

  const isApiRoute = nextUrl.pathname.startsWith('/api/auth');
  const publicAuthRoutes = ['/login', '/auth/error', '/register', '/spike-a'];
  const isPublicRoute = publicAuthRoutes.includes(nextUrl.pathname);

  if (isApiRoute) return;
  if (req.method === 'OPTIONS') return;
  if (nextUrl.pathname === '/api/csp-report') return;

  if (!isLoggedIn && !isPublicRoute) {
    if (nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', nextUrl));
  }

  if (isLoggedIn && isPublicRoute) {
    return NextResponse.redirect(new URL('/', nextUrl));
  }

  return nextWithCsp(req);
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
