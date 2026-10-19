import { NextResponse, type NextRequest } from 'next/server';
import { container } from '@/server/container';
import { route } from '@/server/http/route';

const revoke = route(async ({ actor }) => {
  await container.revokeSessions.execute(actor);
});

export async function POST(req: NextRequest) {
  if (
    req.headers.get('origin') !== new URL(req.url).origin ||
    req.headers.get('sec-fetch-site') === 'cross-site'
  ) {
    return NextResponse.json({ error: 'Origem não permitida' }, { status: 403 });
  }
  return revoke(req);
}
