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
});
