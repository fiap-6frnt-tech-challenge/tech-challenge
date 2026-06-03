const publicAuthRoutes = ['/login', '/auth/error'];

export function isPublicAuthRoute(pathname: string) {
  return publicAuthRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
