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
