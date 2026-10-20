import { describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { dataVersion, withETag } from './etag';

const request = (path: string, headers: HeadersInit = {}) =>
  new Request(`http://localhost${path}`, { headers }) as NextRequest;

describe('dataVersion', () => {
  const base = dataVersion(request('/api/transactions?_page=1&type=deposit'), 'user-a', 'v1');

  it('is stable for the same user, route, query and data', () => {
    expect(dataVersion(request('/api/transactions?type=deposit&_page=1'), 'user-a', 'v1')).toBe(
      base
    );
  });

  it.each([
    ['another user', '/api/transactions?_page=1&type=deposit', 'user-b', 'v1'],
    ['another query', '/api/transactions?_page=2&type=deposit', 'user-a', 'v1'],
    ['another route', '/api/transactions/overview?_page=1&type=deposit', 'user-a', 'v1'],
    ['changed data', '/api/transactions?_page=1&type=deposit', 'user-a', 'v2'],
  ])('changes for %s', (_case, path, userId, stamp) => {
    expect(dataVersion(request(path), userId, stamp)).not.toBe(base);
  });
});

describe('withETag', () => {
  const body = { balance: 10, recent: [] };

  it('returns the JSON with a weak ETag and private revalidation headers', async () => {
    const response = await withETag(request('/api/x'), 'abc', async () => body);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(body);
    expect(response.headers.get('ETag')).toBe('W/"abc"');
    expect(response.headers.get('Cache-Control')).toBe('private, no-cache');
    expect(response.headers.get('Vary')).toBe('Cookie');
  });

  it.each(['W/"abc"', '"abc"', 'W/"old", W/"abc"', '*'])(
    'returns 304 without loading the data when If-None-Match is %s',
    async (ifNoneMatch) => {
      const load = vi.fn();
      const response = await withETag(
        request('/api/x', { 'If-None-Match': ifNoneMatch }),
        'abc',
        load
      );

      expect(response.status).toBe(304);
      expect(response.body).toBeNull();
      expect(response.headers.get('ETag')).toBe('W/"abc"');
      expect(response.headers.get('Cache-Control')).toBe('private, no-cache');
      expect(load).not.toHaveBeenCalled();
    }
  );

  it('loads fresh data when the stored ETag is outdated', async () => {
    const response = await withETag(
      request('/api/x', { 'If-None-Match': 'W/"old"' }),
      'abc',
      async () => body
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(body);
  });
});
