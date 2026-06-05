import { describe, it, expect, vi } from 'vitest';
import { proxy } from './proxy';
import { NextRequest } from 'next/server';

type MockSession = { user: { id: string } } | null;
type AuthenticatedRequest = NextRequest & { auth: MockSession };
type AuthCallback = (
  req: AuthenticatedRequest
) => Response | undefined | Promise<Response | undefined>;
type ProxyEvent = Parameters<typeof proxy>[1];

// Mock do next-auth/jwt ou do auth nativo
vi.mock('./auth', () => ({
  auth: (callback: AuthCallback) => {
    return async (req: NextRequest) => {
      // Simula o comportamento do wrapper injetando a sessão conforme o teste
      const isAuthed = req.headers.get('x-mock-auth') === 'true';
      const mockSession: MockSession = isAuthed ? { user: { id: 'joana' } } : null;
      return callback(Object.assign(req, { auth: mockSession }));
    };
  },
}));

const proxyEvent = {} as ProxyEvent;

describe('Proxy de Autenticação', () => {
  const createMockRequest = (path: string, isAuthed = false) => {
    const url = `http://localhost:3000${path}`;
    const req = new NextRequest(url);
    if (isAuthed) {
      req.headers.set('x-mock-auth', 'true');
    }
    return req;
  };

  it('deve redirecionar usuário anônimo tentando acessar a home para /login', async () => {
    const req = createMockRequest('/');
    const res = await proxy(req, proxyEvent);

    expect(res).toBeDefined();
    expect(res?.status).toBe(307); // Redirect temporário
    expect(res?.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('deve permitir acesso à rota /login para usuários anônimos', async () => {
    const req = createMockRequest('/login');
    const res = await proxy(req, proxyEvent);

    // Sem redirect (continua o fluxo normal)
    expect(res).toBeUndefined();
  });

  it('deve redirecionar usuário já logado acessando /login para a home', async () => {
    const req = createMockRequest('/login', true);
    const res = await proxy(req, proxyEvent);

    expect(res).toBeDefined();
    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe('http://localhost:3000/');
  });
});
