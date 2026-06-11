const publicAuthRoutes = ['/login', '/auth/error', '/register'];

export function isPublicAuthRoute(pathname: string) {
  return publicAuthRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
