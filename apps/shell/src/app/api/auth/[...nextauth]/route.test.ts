import { describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { currentRequestContext } from '@/server/http/requestContext';

const mocks = vi.hoisted(() => ({ seen: [] as unknown[] }));
vi.mock('../../../../auth', () => ({
  handlers: {
    GET: async () => {
      mocks.seen.push(currentRequestContext());
      return new Response(null, { status: 204 });
    },
    POST: async () => {
      mocks.seen.push(currentRequestContext());
      return new Response(null, { status: 204 });
    },
  },
}));

import { GET, POST } from './route';

describe('Auth.js route handlers', () => {
  it('run the OAuth and credentials callbacks inside a request context', async () => {
    const request = () =>
      new Request('http://localhost/api/auth/callback/google', {
        headers: { 'x-forwarded-for': '203.0.113.12' },
      }) as NextRequest;

    await GET(request());
    await POST(request());

    expect(mocks.seen).toEqual([
      { requestId: expect.any(String), ipAddress: '203.0.113.12' },
      { requestId: expect.any(String), ipAddress: '203.0.113.12' },
    ]);
    expect(currentRequestContext()).toBeUndefined();
  });
});
