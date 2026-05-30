# Task 3 — NextAuth v5 Setup no Shell & Middleware

> ⏳ **Status: Pending**

|                        |                                                                   |
| ---------------------- | ----------------------------------------------------------------- |
| **Sprint**             | [Sprint 1 — Auth + State Migration](../sprint-1-auth-state.md)    |
| **Owner**              | `Dev 2`                                                           |
| **Duração estimada**   | 2 dias                                                            |
| **Branch recomendada** | `dev2/nextauth-setup`                                             |
| **Depende de**         | [Task 6 — Schema de Transação Evoluído](./06-evolved-schema.md)   |
| **PR só abre**         | Após login com credentials e Google funcionar localmente no shell |

---

## Dependências

- **O que bloqueia esta tarefa**: Depende da entrega da **Task 6 (Schema Evoluído)** pelo Dev 1. É necessário ter os novos campos como `userId` estabilizados nos tipos do `packages/shared` para sincronizar o mock e as callbacks do NextAuth de forma adequada.
- **O que esta tarefa desbloqueia**: Desbloqueia os slices Redux Toolkit (**Task 7**) e os testes de infra/CI (**Task 10**), visto que estes necessitam ler a sessão e interceptar as rotas protegidas pelo middleware em ambiente de teste.

---

## Contexto

A segurança e o controle de acesso na Fase 2 serão centralizados no aplicativo **host (shell)** utilizando o **NextAuth.js v5 (Beta)**. O shell será o responsável por validar as credenciais do usuário, gerenciar a sessão segura (JWT em cookies HTTPOnly e Secure) e interceptar rotas não autenticadas via Middleware do Next.js. Os Microfrontends remotos que serão integrados no futuro consumirão a sessão de forma passiva através do contexto compartilhado.

---

## Pré-condições

- Estar na branch `dev2-backend/nextauth-setup`.
- Possuir uma conta no Google Cloud Platform para criar um Client ID e Client Secret OAuth 2.0.
  - Authorized Javascript Origins: `http://localhost:3000`
  - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`

---

## Implementação passo-a-passo

### 1. Instalar NextAuth v5 no shell

```bash
npm install next-auth@beta -w @bytebank/shell
```

### 2. Configuração Básica do NextAuth

Crie o arquivo de configurações centralizado em `apps/shell/src/auth.ts`:

```typescript
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:3000';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          // Bate na API da pós para autenticar
          const res = await fetch(`${BACKEND_URL}/user/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!res.ok) return null;

          const data = await res.json();
          const token = data.result?.token;

          if (!token) return null;

          // Busca dados da conta associada
          const accountRes = await fetch(`${BACKEND_URL}/account`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const accountData = await accountRes.json();
          const accountId = accountData.result?.account?.[0]?.id;

          return {
            id: credentials.email as string, // Usamos o email como id local
            email: credentials.email as string,
            token, // Retorna o JWT da pós no objeto do usuário
            accountId, // Adiciona o accountId retornado da conta
          };
        } catch (error) {
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 dias
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as any).token;
        token.accountId = (user as any).accountId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session as any).accessToken = token.accessToken as string;
        (session as any).user.accountId = token.accountId as string;
      }
      return session;
    },
  },
});
```

---

### 3. Configurar API Route para Auth

Crie o arquivo catch-all do Next.js App Router em `apps/shell/src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from '../../../../auth';
export const { GET, POST } = handlers;
```

---

### 4. Configurar Middleware de Rotas Protegidas

Crie o arquivo de middleware na raiz da pasta `src/` do shell (`apps/shell/src/middleware.ts`):

```typescript
import { auth } from './auth';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;

  const isApiRoute = nextUrl.pathname.startsWith('/api/auth');
  const isPublicRoute = nextUrl.pathname === '/login' || nextUrl.pathname === '/auth/error';

  if (isApiRoute) return;

  if (!isLoggedIn && !isPublicRoute) {
    return Response.redirect(new URL('/login', nextUrl));
  }

  if (isLoggedIn && isPublicRoute) {
    return Response.redirect(new URL('/', nextUrl));
  }
});

export const config = {
  // Protege todas as rotas exceto assets, favicon, _next e rotas públicas
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
```

---

### 5. Configurar o SessionProvider e Env Vars

Adicione as variáveis de ambiente necessárias em `apps/shell/.env.local`:

```env
AUTH_SECRET="gere_um_hash_aleatorio_32_chars" # Use: openssl rand -base64 32
AUTH_GOOGLE_ID="seu-oauth-client-id.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="seu-oauth-client-secret"
```

No layout raiz (`apps/shell/src/app/layout.tsx`), envolva os componentes filhos com o `<SessionProvider>` para disponibilizar a sessão no client-side:

```typescript
import { SessionProvider } from 'next-auth/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
```

---

## Validação

- [ ] Acesse `http://localhost:3000/`. Se você não estiver autenticado, deve ser redirecionado automaticamente para `http://localhost:3000/login` (a rota estará em 404 até criarmos a página, mas o redirect valida a segurança do middleware).
- [ ] Chame `http://localhost:3000/api/auth/providers` no navegador e verifique se as configurações de Credentials e Google são listadas como JSON.

---

## Gotchas

1. **NextAuth v5 Import Patterns**: O NextAuth v5 não exporta mais a biblioteca padrão `next-auth/client` ou `next-auth/next`. Certifique-se de importar `auth`, `signIn` e `signOut` diretamente do arquivo local `./auth.ts` configurado no passo 2. No client, use `next-auth/react`.
2. **Secret Opcional em Dev**: A partir da v5, se você esquecer `AUTH_SECRET` em dev, o NextAuth tenta gerar um hash temporário, mas em produção o build ou deploy quebrará silenciosamente. Sempre garanta esta variável no ambiente.

---

## Próximo passo

→ **Criar os componentes visuais de login no Design System com a [Task 5 — Componentes no Design System](./05-ds-auth-components.md).**
