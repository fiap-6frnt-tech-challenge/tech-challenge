import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AuthenticationError,
  NotFoundError,
  RateLimitedError,
  ValidationError,
} from '@bytebank/core';
import { HttpError, httpRequest } from './httpClient';

afterEach(() => vi.unstubAllGlobals());

function response(status: number, body: unknown, headers?: HeadersInit) {
  return { ok: false, status, headers: new Headers(headers), json: async () => body };
}

describe('httpRequest', () => {
  it.each([
    [401, AuthenticationError],
    [404, NotFoundError],
    [422, ValidationError],
    [429, RateLimitedError],
  ] as const)('maps status %i into the matching core error', async (status, ErrorType) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          response(status, { error: 'API error', issues: [] }, { 'Retry-After': '12' })
        )
    );
    await expect(httpRequest('/resource')).rejects.toBeInstanceOf(ErrorType);
  });

  it('carries the retry delay for rate limits', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(429, {}, { 'Retry-After': '12' })));
    await expect(httpRequest('/resource')).rejects.toMatchObject({ retryAfterSeconds: 12 });
  });

  it('returns a generic HTTP error for unhandled statuses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(503, { error: 'Unavailable' })));
    await expect(httpRequest('/resource')).rejects.toMatchObject({
      name: 'HttpError',
      status: 503,
      message: 'Unavailable',
    } satisfies Partial<HttpError>);
  });

  it('passes AbortSignal to fetch and handles empty success responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    await expect(
      httpRequest<void>('/resource', { signal: controller.signal })
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('/api/resource', { signal: controller.signal });
  });
});
