import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), execute: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/server/container', () => ({
  container: { revokeSessions: { execute: mocks.execute } },
}));
import { POST } from './route';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 'owner' } });
});
function request(origin = 'http://localhost') {
  return new NextRequest('http://localhost/api/auth/sessions/revoke', {
    method: 'POST',
    headers: { Origin: origin },
    body: JSON.stringify({ userId: 'victim' }),
  });
}
describe('revoke sessions endpoint', () => {
  it('revokes only for the authenticated actor, regardless of request body', async () => {
    expect((await POST(request())).status).toBe(204);
    expect(mocks.execute).toHaveBeenCalledWith({ userId: 'owner' });
  });
  it('rejects anonymous and cross-origin requests', async () => {
    expect((await POST(request('https://evil.example'))).status).toBe(403);
    expect(mocks.execute).not.toHaveBeenCalled();
    mocks.auth.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
  });
});
