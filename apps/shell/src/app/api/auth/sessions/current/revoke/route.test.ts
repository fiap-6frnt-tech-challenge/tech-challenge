import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ revoke: vi.fn(), auth: vi.fn() }));
vi.mock('@/auth', () => ({ revokeCurrentRequestSession: mocks.revoke, auth: mocks.auth }));
import { POST } from './route';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.revoke.mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());
const request = (origin = 'http://localhost') =>
  new NextRequest('http://localhost/api/auth/sessions/current/revoke', {
    method: 'POST',
    headers: { Origin: origin },
  });
describe('current session revocation boundary', () => {
  it('confirms revocation before returning success', async () => {
    expect((await POST(request())).status).toBe(204);
    expect(mocks.revoke).toHaveBeenCalledWith(expect.any(NextRequest));
  });
  it('propagates storage failure instead of clearing the cookie and claiming success', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.revoke.mockRejectedValueOnce(new Error('database unavailable'));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(response.headers.get('set-cookie')).toBeNull();
  });
  it('rejects missing or cross-origin Origin', async () => {
    expect((await POST(request(''))).status).toBe(403);
    expect((await POST(request('https://evil.example'))).status).toBe(403);
    expect(mocks.revoke).not.toHaveBeenCalled();
  });
});
