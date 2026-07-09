import { describe, expect, it } from 'vitest';
import { isPublicAuthRoute } from './AppShell.routes';

describe('isPublicAuthRoute', () => {
  it.each([
    '/login',
    '/login/reset',
    '/auth/error',
    '/auth/error/details',
    '/register',
    '/register/confirm',
  ])('treats %s as a public auth route', (pathname) => {
    expect(isPublicAuthRoute(pathname)).toBe(true);
  });

  it.each(['/', '/extrato', '/transacoes', '/auth/callback', '/login-admin', '/register-admin'])(
    'does not treat %s as a public auth route',
    (pathname) => {
      expect(isPublicAuthRoute(pathname)).toBe(false);
    }
  );
});
