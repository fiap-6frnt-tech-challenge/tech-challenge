import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loginWithCredentials } from './loginFlow';

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  signIn: mocks.signIn,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signIn.mockResolvedValue({ ok: true, error: null });
});

describe('loginWithCredentials', () => {
  it('faz login com credentials sem redirect automático', async () => {
    const result = await loginWithCredentials({
      email: 'ana@bytebank.com',
      password: 'segredo123',
    });

    expect(result).toEqual({ ok: true });
    expect(mocks.signIn).toHaveBeenCalledWith('credentials', {
      email: 'ana@bytebank.com',
      password: 'segredo123',
      redirect: false,
    });
  });

  it('retorna erro quando as credenciais são inválidas', async () => {
    mocks.signIn.mockResolvedValue({ ok: false, error: 'CredentialsSignin' });

    const result = await loginWithCredentials({
      email: 'ana@bytebank.com',
      password: 'senha-errada',
    });

    expect(result).toEqual({ ok: false, error: 'CredentialsSignin' });
  });

  it('preserva o código de bloqueio retornado pelo NextAuth', async () => {
    mocks.signIn.mockResolvedValue({ ok: false, error: 'CredentialsSignin', code: 'rate_limited' });

    await expect(
      loginWithCredentials({ email: 'ana@bytebank.com', password: 'senha-errada' })
    ).resolves.toEqual({ ok: false, error: 'CredentialsSignin', code: 'rate_limited' });
  });

  it('envia o token Turnstile quando o desafio já foi solicitado', async () => {
    await loginWithCredentials(
      { email: 'ana@bytebank.com', password: 'segredo123' },
      'challenge-token'
    );

    expect(mocks.signIn).toHaveBeenCalledWith('credentials', {
      email: 'ana@bytebank.com',
      password: 'segredo123',
      turnstileToken: 'challenge-token',
      redirect: false,
    });
  });
});

describe('MFA credentials', () => {
  it('sends a second factor together with the verified credentials, without creating an intermediate session', async () => {
    mocks.signIn.mockResolvedValue({ error: 'CredentialsSignin', code: 'mfa_required' });
    const result = await loginWithCredentials(
      { email: 'ana@bytebank.com', password: 'segredo123' },
      undefined,
      '123456'
    );
    expect(mocks.signIn).toHaveBeenCalledWith('credentials', {
      email: 'ana@bytebank.com',
      password: 'segredo123',
      totp: '123456',
      redirect: false,
    });
    expect(result).toEqual({ ok: false, error: 'CredentialsSignin', code: 'mfa_required' });
  });
});
