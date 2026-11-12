function firstValue(value: string | null): string | undefined {
  return value?.split(',')[0]?.trim() || undefined;
}

export function requestOrigin(req: Request): string {
  const url = new URL(req.url);
  const host = firstValue(req.headers.get('x-forwarded-host')) ?? req.headers.get('host');
  if (!host) return url.origin;
  const protocol = firstValue(req.headers.get('x-forwarded-proto')) ?? url.protocol.slice(0, -1);
  return `${protocol}://${host}`;
}

export function isCrossOrigin(req: Request, { requireOrigin = false } = {}): boolean {
  if (req.headers.get('sec-fetch-site') === 'cross-site') return true;
  const origin = req.headers.get('origin');
  if (!origin) return requireOrigin;
  return origin !== requestOrigin(req);
}
