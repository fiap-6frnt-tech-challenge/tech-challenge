# Task 4 — Páginas de Autenticação no Shell

> ⏳ **Status: Pending**

|                        |                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 1 — Auth + State Migration](../sprint-1-auth-state.md)                                       |
| **Owner**              | `dev5-transactions`                                                                                  |
| **Duração estimada**   | 1 dia                                                                                                |
| **Branch recomendada** | `dev5-transactions/auth-pages`                                                                       |
| **Depende de**         | [Task 5 — Componentes no Design System](./05-ds-auth-components.md)                                  |
| **PR só abre**         | Após login funcionar visualmente redirecionando para a Dashboard e a página de erro renderizar do DS |

---

## Contexto

Com o NextAuth v5 configurado em nível de API no servidor (Task 3) e os componentes de formulários construídos no Design System (Task 5), agora devemos expor as páginas visuais no Host App (`apps/shell`). Esta tarefa envolve a criação de:

- `/login`: A tela principal onde o usuário escolhe entre login tradicional de credenciais ou OAuth com Google.
- `/auth/error`: Página de fallback caso ocorram erros durante a validação da sessão (ex: acessos bloqueados ou tokens expirados).

---

## Pré-condições

- Estar na branch `dev5-transactions/auth-pages`.
- Garantir que as dependências `@bytebank/design-system` e `@bytebank/shared` estão linkadas no shell.

---

## Implementação passo-a-passo

### 1. Criar Página de Login (`apps/shell/src/app/login/page.tsx`)

Esta página deve verificar se o usuário já tem sessão ativa (SSR) e redirecionar para a home `/` caso positivo. Caso contrário, renderiza a UI:

```typescript
import { redirect } from 'next/navigation';
import { auth, signIn } from '../../auth';
import { LoginForm, GoogleAuthButton } from '@bytebank/design-system';

export default async function LoginPage() {
  const session = await auth();

  // Redireciona usuários já logados para a home
  if (session) {
    redirect('/');
  }

  // Server Actions para NextAuth login
  async function handleCredentialsLogin(formData: any) {
    'use server';
    try {
      await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirectTo: '/',
      });
    } catch (error: any) {
      // Deixe o NextAuth propagar o redirect interno
      if (error.message === 'NEXT_REDIRECT') {
        throw error;
      }
      // Outros erros serão enviados para a query param de erro
      redirect(`/auth/error?error=CredentialsSignin`);
    }
  }

  async function handleGoogleLogin() {
    'use server';
    await signIn('google', { redirectTo: '/' });
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Acesse o ByteBank
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Insira suas credenciais ou continue com sua conta Google
          </p>
        </div>

        {/* Server action injetada no componente do DS */}
        <LoginForm onSubmit={handleCredentialsLogin} />

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
          <span className="flex-shrink mx-4 text-gray-400 text-xs uppercase">ou</span>
          <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
        </div>

        <GoogleAuthButton onClick={handleGoogleLogin} />
      </div>
    </main>
  );
}
```

---

### 2. Criar Página de Erro (`apps/shell/src/app/auth/error/page.tsx`)

Use o componente `ErrorState` nativo do Design System para exibir as mensagens amigáveis baseadas no erro do NextAuth enviado via query param `error`.

```typescript
'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ErrorState } from '@bytebank/design-system';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  let errorMessage = 'Ocorreu um erro desconhecido durante a autenticação.';

  if (error === 'CredentialsSignin') {
    errorMessage = 'Usuário ou senha inválidos. Por favor, verifique suas credenciais.';
  } else if (error === 'OAuthSignin' || error === 'OAuthCallback') {
    errorMessage = 'Não foi possível completar o login com sua conta do Google.';
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg flex flex-col gap-6 text-center">
        <ErrorState
          title="Falha na Autenticação"
          message={errorMessage}
        />

        <Link
          href="/login"
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
        >
          Voltar para o Login
        </Link>
      </div>
    </main>
  );
}
```

---

## Validação

- [ ] Acesse `http://localhost:3000/`. Você deve ser redirecionado para `/login`.
- [ ] Submeta credenciais inválidas (ex: senha errada). O middleware/handler deve redirecionar para `/auth/error?error=CredentialsSignin` e mostrar a mensagem de credenciais inválidas.
- [ ] Submeta credenciais válidas (qualquer e-mail com senha `senha123`). Você deve ser logado e redirecionado com sucesso para a home `/`.
- [ ] Teste tentar entrar em `/login` enquanto estiver logado: você deve ser mandado de volta para `/` automaticamente.

---

## Gotchas

1. **Server Actions em Components**: O Next.js exige a tag `'use server'` no topo do arquivo ou da função que é passada para um componente cliente como callback de form. Como `LoginForm` e `GoogleAuthButton` do Design System são componentes clientes, o roteamento ou server action deve ser passado do page component do shell (que é Server Component) usando as funções declaradas com `'use server'`.
2. **Missing Suspense**: O hook `useSearchParams` do Next.js precisa estar envolto em um `<Suspense>` block se a página for pré-renderizada de forma estática durante a build, para evitar que o build do Next.js falhe em produção. Envolva o conteúdo interno do `AuthErrorPage` com `<Suspense fallback={<p>Carregando...</p>}>` se necessário.

---

## Próximo passo

→ **Estruturar os estados globais do cliente em Zustand com a [Task 7 — Criar stores em packages/stores](./07-packages-stores.md).**
