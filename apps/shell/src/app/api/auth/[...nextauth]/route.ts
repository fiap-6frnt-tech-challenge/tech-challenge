import type { NextRequest } from 'next/server';
import { withRequestContext } from '@/server/http/requestContext';
import { handlers } from '../../../../auth';

type AuthHandler = (req: NextRequest) => Promise<Response>;

const inRequestContext = (handler: AuthHandler) => (req: NextRequest) =>
  withRequestContext(req.headers, () => handler(req));

export const GET = inRequestContext(handlers.GET);
export const POST = inRequestContext(handlers.POST);
