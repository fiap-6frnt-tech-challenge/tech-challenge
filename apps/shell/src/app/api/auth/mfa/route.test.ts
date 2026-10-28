import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { AuthenticationError } from '@bytebank/core';
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  status: vi.fn(),
  setup: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
}));
vi.mock('@/auth', () => ({ auth: mocks.auth }));

vi.mock('@/server/container', () => ({
  container: {
    mfa: {
      status: mocks.status,
      setup: mocks.setup,
      enable: mocks.enable,
      disable: mocks.disable,
    },
  },
}));
import { GET } from './route';
import { POST as setup } from './setup/route';
import { POST as enable } from './enable/route';
import { POST as disable } from './disable/route';
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 'owner' } });
});
function req(action: string, data: unknown, origin = 'http://localhost') {
  return new NextRequest(`http://localhost/api/auth/mfa/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(data),
  });
}
describe('MFA HTTP boundaries', () => {
  it('returns status only and never caches responses', async () => {
    mocks.status.mockResolvedValue({ enabled: false, canEnroll: true, recoveryCodesRemaining: 0 });
    const response = await GET(new NextRequest('http://localhost/api/auth/mfa'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      enabled: false,
      canEnroll: true,
      recoveryCodesRemaining: 0,
    });
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(mocks.status).toHaveBeenCalledWith('owner');
  });
  it('rejects anonymous callers and cross-site mutations before executing', async () => {
    expect((await setup(req('setup', { password: 'password' }, 'https://evil.test'))).status).toBe(
      403
    );
    expect(mocks.setup).not.toHaveBeenCalled();
    mocks.auth.mockResolvedValue(null);
    expect((await setup(req('setup', { password: 'password' }))).status).toBe(401);
    expect(mocks.setup).not.toHaveBeenCalled();
  });
  it('rejects owner spoofing and extra fields strictly', async () => {
    expect((await setup(req('setup', { password: 'password', userId: 'victim' }))).status).toBe(
      422
    );
    expect((await enable(req('enable', { code: '123456', secret: 'attacker' }))).status).toBe(422);
    expect(mocks.setup).not.toHaveBeenCalled();
    expect(mocks.enable).not.toHaveBeenCalled();
  });
  it('uses only the authenticated owner and returns recovery codes only from activation', async () => {
    mocks.setup.mockResolvedValue({ secret: 'TESTSECRET', uri: 'otpauth://totp/Bytebank' });
    expect((await setup(req('setup', { password: 'password' }))).status).toBe(200);
    expect(mocks.setup).toHaveBeenCalledWith('owner', 'password');
    mocks.enable.mockResolvedValue({ recoveryCodes: ['once-only-test-code'] });
    const response = await enable(req('enable', { code: '123456' }));
    expect(await response.json()).toEqual({ recoveryCodes: ['once-only-test-code'] });
    expect(mocks.enable).toHaveBeenCalledWith('owner', '123456');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect((await disable(req('disable', { password: 'password', code: '123456' }))).status).toBe(
      204
    );
    expect(mocks.disable).toHaveBeenCalledWith('owner', 'password', '123456');
  });
  it('invalid proof is a safe validation failure, not an expired-session signal', async () => {
    mocks.setup.mockRejectedValue(new AuthenticationError());
    const response = await setup(req('setup', { password: 'wrong' }));
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'Senha ou código inválido.' });
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
});
