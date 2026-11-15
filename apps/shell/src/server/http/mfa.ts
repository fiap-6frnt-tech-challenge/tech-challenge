import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { AuthenticationError } from '@bytebank/core';
import { readJson } from '@/app/api/read-json';
import { route } from './route';

export const mfaPassword = z.string().min(1).max(128);
export const mfaCode = z.string().trim().min(1).max(128);

export function privateMfaResponse(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Pragma', 'no-cache');
  return response;
}

export function mfaMutation<T>(
  schema: z.ZodType<T>,
  execute: (userId: string, input: T, req: NextRequest) => Promise<unknown>
) {
  const handler = route(async ({ actor, req }) => {
    const input = schema.parse(await readJson(req));
    try {
      return await execute(actor.userId, input, req);
    } catch (error) {
      if (error instanceof AuthenticationError)
        return NextResponse.json({ error: 'Senha ou código inválido.' }, { status: 422 });
      throw error;
    }
  });
  return async (req: NextRequest) => {
    if (
      req.headers.get('origin') !== new URL(req.url).origin ||
      req.headers.get('sec-fetch-site') === 'cross-site'
    ) {
      return privateMfaResponse(
        NextResponse.json({ error: 'Origem não permitida' }, { status: 403 })
      );
    }
    return privateMfaResponse(await handler(req));
  };
}
