import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAndSignIn } from './registerFlow';

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  signIn: mocks.signIn,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 'user-1', name: 'Ana Souza', email: 'ana@bytebank.com' }),
    })
  );
  mocks.signIn.mockResolvedValue({ ok: true, error: null });
});

describe('registerAndSignIn', () => {
  it('envia cadastro e faz login com credentials', async () => {
    const result = await registerAndSignIn({
      name: 'Ana Souza',
      email: 'ana@bytebank.com',
      password: 'segredo123',
    });

    expect(result).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ana Souza',
        email: 'ana@bytebank.com',
        password: 'segredo123',
      }),
    });
    expect(mocks.signIn).toHaveBeenCalledWith('credentials', {
      email: 'ana@bytebank.com',
      password: 'segredo123',
      redirect: false,
    });
  });

  it('retorna erro de e-mail duplicado sem chamar login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ error: 'E-mail já cadastrado' }),
      })
    );

    const result = await registerAndSignIn({
      name: 'Ana Souza',
      email: 'ana@bytebank.com',
      password: 'segredo123',
    });

    expect(result).toEqual({ ok: false, error: 'E-mail já cadastrado' });
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it('retorna erro quando o login automático falha', async () => {
    mocks.signIn.mockResolvedValue({ ok: false, error: 'CredentialsSignin' });

    const result = await registerAndSignIn({
      name: 'Ana Souza',
      email: 'ana@bytebank.com',
      password: 'segredo123',
    });

    expect(result).toEqual({
      ok: false,
      error: 'Conta criada, mas não foi possível entrar automaticamente',
    });
  });
});
