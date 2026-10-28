import type { NextRequest } from 'next/server';
import { container } from '@/server/container';
import { route } from '@/server/http/route';
import { privateMfaResponse } from '@/server/http/mfa';
const status = route(async ({ actor }) => container.mfa.status(actor.userId));
export async function GET(req: NextRequest) {
  return privateMfaResponse(await status(req));
}
