import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AuthenticationError,
  NotFoundError,
  RateLimitedError,
  ValidationError,
} from '@bytebank/core';
import { HttpError, httpRequest } from './httpClient';
import { domainEvents$, invalidateClientSession } from '@bytebank/stores';

afterEach(() => vi.unstubAllGlobals());

function response(status: number, body: unknown, headers?: HeadersInit) {
  return { ok: false, status, headers: new Headers(headers), json: async () => body };
}

describe('httpRequest', () => {
  it('publishes session expiry for 401 responses but ignores a response from an ended session', async () => {
    const events: unknown[] = [];
    const stop = domainEvents$.subscribe((event) => events.push(event));
    try {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(401, {})));
      await expect(httpRequest('/private')).rejects.toBeInstanceOf(AuthenticationError);
      expect(events).toEqual([{ type: 'session.expired', version: 1 }]);
      let release!: (value: unknown) => void;
      vi.stubGlobal(
        'fetch',
        () =>
          new Promise((resolve) => {
            release = resolve;
          })
      );
      const pending = httpRequest('/private');
      invalidateClientSession();
      release(response(401, {}));
      await expect(pending).rejects.toBeInstanceOf(AuthenticationError);
      expect(events).toHaveLength(1);
    } finally {
      stop.unsubscribe();
    }
  });
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
