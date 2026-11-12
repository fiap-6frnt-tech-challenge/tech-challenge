import { NextResponse, type NextRequest } from 'next/server';
import { container } from '@/server/container';
import { route } from '@/server/http/route';
import { isCrossOrigin } from '@/server/http/sameOrigin';

const revoke = route(async ({ actor }) => {
  await container.revokeSessions.execute(actor);
});

export async function POST(req: NextRequest) {
  if (isCrossOrigin(req, { requireOrigin: true })) {
    return NextResponse.json({ error: 'Origem não permitida' }, { status: 403 });
  }
  return revoke(req);
}
