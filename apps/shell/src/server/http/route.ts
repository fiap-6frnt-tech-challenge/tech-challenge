import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  RateLimitedError,
  ValidationError,
} from '@bytebank/core';
import type { Actor } from '@bytebank/core/application';
import { auth } from '@/auth';
import { JsonRequestError } from '@/app/api/read-json';
import { UploadRequestError } from './UploadRequestError';

type Handler<P> = (context: { actor: Actor; req: NextRequest; params: P }) => Promise<unknown>;
type PublicHandler<P> = (context: { req: NextRequest; params: P }) => Promise<unknown>;
type RouteOptions = {
  status?: number;
  headers?: (request: NextRequest) => HeadersInit;
};
type RouteContext<P> = { params: Promise<P> };

function responseFor(result: unknown, req: NextRequest, options: RouteOptions): NextResponse {
  const headers = options.headers?.(req);
  if (result === undefined) return new NextResponse(null, { status: 204, headers });
  return NextResponse.json(result, { status: options.status ?? 200, headers });
}

export function route<P>(handler: Handler<P>, options: RouteOptions = {}) {
  return async (req: NextRequest, context?: RouteContext<P>): Promise<NextResponse> => {
    try {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }
      const params = await (context?.params ?? Promise.resolve({} as P));
      return responseFor(
        await handler({ actor: { userId: session.user.id }, req, params }),
        req,
        options
      );
    } catch (error) {
      return toHttpError(error);
    }
  };
}

export function publicRoute<P>(handler: PublicHandler<P>, options: RouteOptions = {}) {
  return async (req: NextRequest, context?: RouteContext<P>): Promise<NextResponse> => {
    try {
      const params = await (context?.params ?? Promise.resolve({} as P));
      return responseFor(await handler({ req, params }), req, options);
    } catch (error) {
      return toHttpError(error);
    }
  };
}

export function toHttpError(error: unknown): NextResponse {
  if (error instanceof ValidationError || error instanceof z.ZodError) {
    const issues = error.issues;
    const flattened = Array.isArray(issues)
      ? z.flattenError(new z.ZodError(issues as z.core.$ZodIssue[]))
      : issues;
    return NextResponse.json({ error: 'Dados inválidos', issues: flattened }, { status: 422 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  }
  if (error instanceof ConflictError) {
    const message = error.resource === 'E-mail' ? 'E-mail já cadastrado' : error.message;
    return NextResponse.json({ error: message }, { status: 409 });
  }
  if (error instanceof RateLimitedError) {
    return NextResponse.json(
      { error: 'Muitas tentativas' },
      { status: 429, headers: { 'Retry-After': String(error.retryAfterSeconds) } }
    );
  }
  if (error instanceof AuthenticationError) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  if (error instanceof JsonRequestError || error instanceof UploadRequestError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const requestId = crypto.randomUUID();
  console.error('[http] Erro inesperado', { requestId, error });
  return NextResponse.json({ error: 'Erro interno', requestId }, { status: 500 });
}
