import { NextResponse, type NextRequest } from 'next/server';
import { revokeCurrentRequestSession } from '@/auth';
import { toHttpError } from '@/server/http/route';

export async function POST(req: NextRequest) {
  if (
    req.headers.get('origin') !== new URL(req.url).origin ||
    req.headers.get('sec-fetch-site') === 'cross-site'
  ) {
    return NextResponse.json({ error: 'Origem não permitida' }, { status: 403 });
  }
  try {
    await revokeCurrentRequestSession(req);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toHttpError(error);
  }
}
