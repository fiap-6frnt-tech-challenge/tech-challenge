import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { proxy } from './proxy';
import { NextRequest } from 'next/server';

type MockSession = { user: { id: string } } | { message: string } | null;
type AuthenticatedRequest = NextRequest & { auth: MockSession };
type AuthCallback = (
  req: AuthenticatedRequest
) => Response | undefined | Promise<Response | undefined>;
type ProxyEvent = Parameters<typeof proxy>[1];

vi.mock('next-auth', () => ({
  default: () => ({
    auth: (callback: AuthCallback) => {
      return async (req: NextRequest) => {
        // Simula o wrapper do NextAuth injetando a sessão conforme o teste
        const isAuthed = req.headers.get('x-mock-auth') === 'true';
        const mockSession: MockSession = req.headers.has('x-mock-auth-error')
          ? { message: 'UntrustedHost' }
          : isAuthed
            ? { user: { id: 'joana' } }
            : null;
        return callback(Object.assign(req, { auth: mockSession }));
      };
    },
  }),
}));

const proxyEvent = {} as ProxyEvent;

describe('Proxy de Autenticação', () => {
  beforeEach(() => {
    vi.stubEnv('CSP_MODE', 'report-only');
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('VERCEL_ENV', '');
    vi.stubEnv('VERCEL_PREVIEW_FEEDBACK_ENABLED', '0');
  });

  afterEach(() => vi.unstubAllEnvs());

  it('fails closed when Auth.js supplies a configuration error object', async () => {
    const req = new NextRequest('http://localhost:3000/');
    req.headers.set('x-mock-auth-error', 'true');
    const res = await proxy(req, proxyEvent);
    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe('http://localhost:3000/login');
  });
  const createMockRequest = (
    path: string,
    isAuthed = false,
    init?: ConstructorParameters<typeof NextRequest>[1]
  ) => {
    const url = `http://localhost:3000${path}`;
    const req = new NextRequest(url, init);
    if (isAuthed) {
      req.headers.set('x-mock-auth', 'true');
    }
    return req;
  };

  it('deve redirecionar usuário anônimo tentando acessar a home para /login', async () => {
    const req = createMockRequest('/');
    const res = await proxy(req, proxyEvent);

    expect(res).toBeDefined();
    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('deve permitir acesso à rota /login para usuários anônimos', async () => {
    const req = createMockRequest('/login');
    const res = await proxy(req, proxyEvent);

    expect(res?.headers.get('x-middleware-next')).toBe('1');
    expect(res?.headers.get('content-security-policy-report-only')).toContain("script-src 'self'");

    const requestPolicy = res?.headers.get(
      'x-middleware-request-content-security-policy-report-only'
    );
    const requestNonce = res?.headers.get('x-middleware-request-x-nonce');
    expect(requestPolicy).toBe(res?.headers.get('content-security-policy-report-only'));
    expect(requestNonce).toBeTruthy();
    expect(requestPolicy).toContain(`'nonce-${requestNonce}'`);
    expect(requestPolicy).toContain("'strict-dynamic'");
    expect(requestPolicy).toContain("style-src 'self' 'unsafe-inline'");
    expect(requestPolicy).toContain('connect-src');
    expect(requestPolicy).toContain('ws:');
    expect(requestPolicy).toContain("'unsafe-eval'");
  });

  it('uses the enforcing policy header when CSP_MODE=enforce', async () => {
    vi.stubEnv('CSP_MODE', 'enforce');
    const res = await proxy(createMockRequest('/login'), proxyEvent);

    expect(res?.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(res?.headers.has('content-security-policy-report-only')).toBe(false);
    expect(res?.headers.get('x-middleware-request-content-security-policy')).toBe(
      res?.headers.get('content-security-policy')
    );
  });

  it('allows Vercel Toolbar resources only for previews where it is enabled', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('VERCEL_PREVIEW_FEEDBACK_ENABLED', '1');
    const res = await proxy(createMockRequest('/login'), proxyEvent);
    const policy = res?.headers.get('content-security-policy-report-only');

    expect(policy).toContain('https://vercel.live');
    expect(policy).toContain('wss://ws-us3.pusher.com');
    expect(policy).toContain('frame-src');
  });

  it('deve redirecionar usuário já logado acessando /login para a home', async () => {
    const req = createMockRequest('/login', true);
    const res = await proxy(req, proxyEvent);

    expect(res).toBeDefined();
    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe('http://localhost:3000/');
  });

  it('deve permitir acesso à rota /register para usuários anônimos', async () => {
    const req = createMockRequest('/register');
    const res = await proxy(req, proxyEvent);

    expect(res?.headers.get('x-middleware-next')).toBe('1');
  });

  it('deve redirecionar usuário já logado acessando /register para a home', async () => {
    const req = createMockRequest('/register', true);
    const res = await proxy(req, proxyEvent);

    expect(res).toBeDefined();
    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe('http://localhost:3000/');
  });

  it('rejects a cross-site mutation before the anonymous API response', async () => {
    const req = createMockRequest('/api/transactions', false, {
      method: 'POST',
      headers: { origin: 'https://attacker.example', 'sec-fetch-site': 'cross-site' },
    });
    const res = await proxy(req, proxyEvent);

    expect(res?.status).toBe(403);
  });

  it('allows same-origin mutations to continue to API authentication', async () => {
    const req = createMockRequest('/api/transactions', false, {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', 'sec-fetch-site': 'same-origin' },
    });
    const res = await proxy(req, proxyEvent);

    expect(res?.status).toBe(401);
  });

  it('lets the unauthenticated CSP report endpoint reach its handler', async () => {
    const req = createMockRequest('/api/csp-report', false, {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', 'content-type': 'application/csp-report' },
    });
    const res = await proxy(req, proxyEvent);

    expect(res).toBeUndefined();
  });
});
