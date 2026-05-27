# Task 10 — Testes Vitest de Middleware, Configuração de CI e Env Vars

> ⏳ **Status: Pending**

|                        |                                                                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 1 — Auth + State Migration](../sprint-1-auth-state.md)                                                                                            |
| **Owner**              | `Dev 1`                                                                                                                                                   |
| **Duração estimada**   | 1.5 dia                                                                                                                                                   |
| **Branch recomendada** | `dev1/vitest-ci-setup`                                                                                                                                    |
| **Depende de**         | [Task 3 — NextAuth Setup](./03-nextauth-setup.md), [Task 7 — Criar stores](./07-packages-stores.md) e [Task 8 — Criar hooks](./08-packages-api-client.md) |
| **PR só abre**         | Após todos os testes de middleware passarem localmente e o CI rodar com caching                                                                           |

---

## Dependências

- **O que bloqueia esta tarefa**: Bloqueada pelas tarefas **Task 3 (NextAuth Setup)**, **Task 7 (Stores)** e **Task 8 (API Hooks)**. Como os testes unitários do middleware do shell requerem o mock do NextAuth funcionando, e a pipeline de CI rodará testes unitários de todos os pacotes, esses recursos devem estar consolidados.
- **O que esta tarefa desbloqueia**: Desbloqueia a **Task 11 (Smoke Test Final)** ao garantir que o monorepo possua testes de integração estáveis e variáveis de ambiente configuradas na Vercel para deploys de pré-visualização.

---

## Pré-condições

- Estar na branch `dev1/vitest-ci-setup`.
- Garantir que a infraestrutura básica do Vitest do shell está funcional.

---

## Implementação passo-a-passo

### 1. Criar testes para o Middleware (`apps/shell/src/middleware.test.ts`)

Para garantir que rotas privadas continuam protegidas contra regressões acidentais, mocke o NextAuth e teste a lógica do middleware:

```typescript
import { describe, it, expect, vi } from 'vitest';
import middleware from './middleware';
import { NextRequest, NextResponse } from 'next/server';

// Mock do next-auth/jwt ou do auth nativo
vi.mock('./auth', () => ({
  auth: (callback: any) => {
    return async (req: any) => {
      // Simula o comportamento do wrapper injetando a sessão conforme o teste
      const isAuthed = req.headers.get('x-mock-auth') === 'true';
      const mockSession = isAuthed ? { user: { id: 'joana' } } : null;
      return callback({ ...req, auth: mockSession });
    };
  },
}));

describe('Middleware de Autenticação', () => {
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
    const res = await middleware(req, {} as any);

    expect(res).toBeDefined();
    expect(res?.status).toBe(307); // Redirect temporário
    expect(res?.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('deve permitir acesso à rota /login para usuários anônimos', async () => {
    const req = createMockRequest('/login');
    const res = await middleware(req, {} as any);

    // Sem redirect (continua o fluxo normal)
    expect(res).toBeUndefined();
  });

  it('deve redirecionar usuário já logado acessando /login para a home', async () => {
    const req = createMockRequest('/login', true);
    const res = await middleware(req, {} as any);

    expect(res).toBeDefined();
    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toBe('http://localhost:3000/');
  });
});
```

Execute o teste localmente no shell:

```bash
npm run test -w @bytebank/shell
```

---

### 2. Atualizar Workflow do GitHub Actions (`.github/workflows/ci.yml`)

Certifique-se de que a etapa de testes executa em todos os pacotes e utiliza caching do Turborepo para agilizar execuções de builds e testes redundantes:

```yaml
name: CI Pipeline

on:
  push:
    branches: [phase-2, main]
  pull_request:
    branches: [phase-2]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Setup Turbo Cache
        uses: dtinth/setup-github-actions-cache@v2

      - name: Lint check
        run: npx turbo run lint

      - name: Typecheck
        run: npx turbo run type-check

      - name: Unit Tests
        run: npx turbo run test --cache-dir=".turbo"

      - name: Build monorepo
        run: npx turbo run build --cache-dir=".turbo"
```

---

### 3. Sincronizar Variáveis de Ambiente no Provedor Cloud (Vercel)

Acesse o painel da Vercel para o projeto `@bytebank/shell` e certifique-se de preencher as variáveis do NextAuth v5 e do Redis/Postgres tanto para as ramificações de **Preview** quanto de **Production**:

- `AUTH_SECRET`: Hash de criptografia (pode usar valores diferentes por ambiente).
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`: Credenciais OAuth geradas no Google Console.
- `DATABASE_URL` (Postgres) ou `KV_REST_API_URL` (Redis/KV).
- `NEXTAUTH_URL`: Necessário apenas se utilizar NextAuth v4 ou se as URLs de callback precisarem ser fixadas em ambientes externos (geralmente dispensado pela v5 em deploy na Vercel).

---

## Validação

- [ ] A execução do pipeline localmente passa em todos os testes:
  ```bash
  npx turbo run test
  ```
- [ ] Ao abrir um PR contra a branch `phase-2`, a suite de testes no GitHub Actions roda com sucesso e valida o commit.

---

## Gotchas

1. **NextRequest / NextResponse no Vitest**: O Vitest roda em Node, logo APIs nativas de browser/Next como `NextRequest` e `NextResponse` podem falhar ao serem importadas nos arquivos de teste se o ambiente de testes não estiver devidamente configurado para `jsdom` ou `happy-dom`. Verifique as configurações de `test.environment` no arquivo `vitest.config.ts` do shell.

---

## Próximo passo

→ **Fazer a verificação geral e demonstrativa final da sprint na [Task 11 — Smoke Test Final & Vídeo Demo](./11-smoke-test-demo.md).**
