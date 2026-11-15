import { createHash } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

// A deploy may change the JSON shape, so no ETag survives it.
const deployment = process.env.VERCEL_DEPLOYMENT_ID ?? '';

const opaqueTag = (tag: string) => tag.trim().replace(/^W\//, '');

function matchesAny(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch) return false;
  return ifNoneMatch
    .split(',')
    .some((tag) => tag.trim() === '*' || opaqueTag(tag) === opaqueTag(etag));
}

export function dataVersion(req: Request, userId: string, stamp: string): string {
  const url = new URL(req.url);
  const query = new URLSearchParams(url.searchParams);
  query.sort();
  return createHash('sha256')
    .update([deployment, userId, url.pathname, query.toString(), stamp].join('\n'))
    .digest('base64url');
}

export async function withETag(req: NextRequest, version: string, load: () => Promise<unknown>) {
  const etag = `W/"${version}"`;
  const headers = { ETag: etag, 'Cache-Control': 'private, no-cache', Vary: 'Cookie' };
  if (matchesAny(req.headers.get('if-none-match'), etag)) {
    return new NextResponse(null, { status: 304, headers });
  }
  return NextResponse.json(await load(), { headers });
}
