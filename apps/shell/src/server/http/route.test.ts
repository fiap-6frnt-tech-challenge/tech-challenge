import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  RateLimitedError,
  ValidationError,
} from '@bytebank/core';
import { JsonRequestError } from '@/app/api/read-json';

const mocks = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mocks.auth }));

import { publicRoute, route, toHttpError } from './route';

const request = new Request('http://localhost/api/test') as import('next/server').NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 'user-1' } });
});
afterEach(() => vi.restoreAllMocks());

describe('route', () => {
  it('requires a session and never calls the handler without it', async () => {
    const handler = vi.fn().mockResolvedValue({ ok: true });
    mocks.auth.mockResolvedValue(null);
    const response = await route(handler)(request);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Não autenticado' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('passes actor and params, using the requested success status', async () => {
    const handler = vi.fn().mockResolvedValue({ id: 'tx-1' });
    const response = await route(handler, { status: 201 })(request, {
      params: Promise.resolve({ id: 'tx-1' }),
    });
    expect(handler).toHaveBeenCalledWith({
      actor: { userId: 'user-1' },
      req: request,
      params: { id: 'tx-1' },
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: 'tx-1' });
  });

  it('returns 204 with response headers for void handlers', async () => {
    const response = await route(async () => undefined, {
      headers: () => ({ 'Access-Control-Allow-Origin': 'http://localhost:3003' }),
    })(request);
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3003');
  });

  describe('with a data version', () => {
    const version = vi.fn();
    const handler = vi.fn();
    const versioned = route(handler, { version });
    const conditional = (etag: string) =>
      new Request('http://localhost/api/test', {
        headers: { 'If-None-Match': etag },
      }) as import('next/server').NextRequest;

    beforeEach(() => {
      version.mockResolvedValue('stamp-1');
      handler.mockResolvedValue({ ok: true });
    });

    it('answers 304 to the stored ETag without calling the handler', async () => {
      const first = await versioned(request);
      const etag = first.headers.get('ETag')!;
      handler.mockClear();

      const second = await versioned(conditional(etag));

      expect(first.status).toBe(200);
      expect(second.status).toBe(304);
      expect(handler).not.toHaveBeenCalled();
      expect(version).toHaveBeenCalledWith({
        actor: { userId: 'user-1' },
        req: expect.anything(),
        params: {},
      });
    });

    it('serves fresh data once the version changes', async () => {
      const etag = (await versioned(request)).headers.get('ETag')!;
      version.mockResolvedValue('stamp-2');

      const response = await versioned(conditional(etag));

      expect(response.status).toBe(200);
      expect(response.headers.get('ETag')).not.toBe(etag);
      await expect(response.json()).resolves.toEqual({ ok: true });
    });

    it('never matches the ETag of another user', async () => {
      const etag = (await versioned(request)).headers.get('ETag')!;
      mocks.auth.mockResolvedValue({ user: { id: 'user-2' } });

      const response = await versioned(conditional(etag));

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ actor: { userId: 'user-2' } })
      );
    });

    it('checks the session before reading the version', async () => {
      mocks.auth.mockResolvedValue(null);
      expect((await versioned(request)).status).toBe(401);
      expect(version).not.toHaveBeenCalled();
    });

    it('maps handler errors after the version check', async () => {
      handler.mockRejectedValue(new NotFoundError('Transação'));
      const response = await versioned(request);
      expect(response.status).toBe(404);
      expect(response.headers.get('ETag')).toBeNull();
    });
  });
});

describe('request id propagation', () => {
  const proxyId = '6f1c2a5e-8b9d-4e3f-a1b2-c3d4e5f60718';
  const fromProxy = () =>
    new Request('http://localhost/api/test', {
      headers: { 'x-request-id': proxyId },
    }) as import('next/server').NextRequest;

  it.each([
    ['route', route],
    ['publicRoute', publicRoute],
  ] as const)(
    '%s answers a 500 with the proxy request id and logs the same id',
    async (_, wrap) => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const response = await wrap(async () => {
        throw new Error('boom');
      })(fromProxy());

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({ error: 'Erro interno', requestId: proxyId });
      expect(log).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ requestId: proxyId })
      );
    }
  );

  it('exposes the request context to the handler', async () => {
    const { currentRequestId } = await import('./requestContext');
    const seen = vi.fn();
    await route(async () => seen(currentRequestId()))(fromProxy());
    expect(seen).toHaveBeenCalledWith(proxyId);
  });
});

describe('publicRoute', () => {
  it('does not require a session', async () => {
    mocks.auth.mockResolvedValue(null);
    const handler = vi.fn().mockResolvedValue({ created: true });
    const response = await publicRoute(handler, { status: 201 })(request);
    expect(response.status).toBe(201);
    expect(handler).toHaveBeenCalledWith({ req: request, params: {} });
    expect(mocks.auth).not.toHaveBeenCalled();
  });
});

describe('toHttpError', () => {
  it('flattens validation issues and preserves the 422 contract', async () => {
    const schema = z.object({ email: z.email() });
    const parsed = schema.safeParse({ email: 'invalid' });
    if (parsed.success) throw new Error('test setup');
    const response = toHttpError(new ValidationError(parsed.error.issues));
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Dados inválidos',
      issues: { fieldErrors: { email: expect.any(Array) } },
    });
  });

  it('maps domain and request errors without exposing internal detail', async () => {
    const cases = [
      [new NotFoundError('Transação'), 404, 'Não encontrado'],
      [new ConflictError('E-mail'), 409, 'E-mail já cadastrado'],
      [new AuthenticationError(), 401, 'Não autenticado'],
      [new JsonRequestError(400, 'JSON inválido'), 400, 'JSON inválido'],
    ] as const;
    for (const [error, status, message] of cases) {
      const response = toHttpError(error);
      expect(response.status).toBe(status);
      await expect(response.json()).resolves.toEqual({ error: message });
    }
  });

  it('adds Retry-After for rate limiting', async () => {
    const response = toHttpError(new RateLimitedError(30));
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('30');
    await expect(response.json()).resolves.toEqual({ error: 'Muitas tentativas' });
  });

  it('redacts unexpected errors and logs them with a request id', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = toHttpError(new Error('SQL password=secret'));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: 'Erro interno', requestId: expect.any(String) });
    expect(JSON.stringify(body)).not.toContain('secret');
    expect(log).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ requestId: body.requestId, error: expect.any(Error) })
    );
  });
});
