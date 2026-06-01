import { auth } from './auth';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;

  const isApiRoute = nextUrl.pathname.startsWith('/api/auth');
  const isPublicRoute = nextUrl.pathname === '/login' || nextUrl.pathname === '/auth/error';

  if (isApiRoute) return;

  if (!isLoggedIn && !isPublicRoute) {
    return Response.redirect(new URL('/login', nextUrl));
  }

  if (isLoggedIn && isPublicRoute) {
    return Response.redirect(new URL('/', nextUrl));
  }
});

export const config = {
  // Protege todas as rotas exceto assets, favicon, _next e rotas públicas
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
