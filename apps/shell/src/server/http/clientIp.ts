import { isIP } from 'node:net';

export function getClientIp(headers: Pick<Headers, 'get'>): string {
  const firstForwardedIp = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return firstForwardedIp && isIP(firstForwardedIp) ? firstForwardedIp : 'unknown';
}
