import { NextResponse, type NextRequest } from 'next/server';
import { revokeCurrentRequestSession } from '@/auth';
import { toHttpError } from '@/server/http/route';
import { isCrossOrigin } from '@/server/http/sameOrigin';

export async function POST(req: NextRequest) {
  if (isCrossOrigin(req, { requireOrigin: true })) {
    return NextResponse.json({ error: 'Origem não permitida' }, { status: 403 });
  }
  try {
    await revokeCurrentRequestSession(req);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toHttpError(error);
  }
}
