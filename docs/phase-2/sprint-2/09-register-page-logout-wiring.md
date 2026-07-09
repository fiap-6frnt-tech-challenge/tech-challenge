# Task 9 — Página `/register` (cadastro) + Botão de Logout no Header

> ⏳ **Status: Pending**

|                        |                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 2 — Dashboard MFE + Charts](../sprint-2-dashboard.md)                                                                                                                                     |
| **Owner**              | `Dev 2` (DS & UI Pages)                                                                                                                                                                           |
| **Duração estimada**   | 1.5 dia                                                                                                                                                                                           |
| **Branch recomendada** | `dev2/register-page-logout`                                                                                                                                                                       |
| **Depende de**         | [Task 2 — Endpoint de Registro](./02-backend-register-endpoint.md), [Task 4 — `RegisterForm` no DS](./04-ds-register-form-usermenu.md), [Task 6 — Session Sync Redux](./06-state-session-sync.md) |
| **PR só abre**         | Após cadastrar → logar → deslogar funcionar de ponta a ponta na UI                                                                                                                                |

---

## Dependências

- **O que bloqueia esta tarefa**: Depende de três entregas:
  - **[Task 2](./02-backend-register-endpoint.md)** (Dev 1) — endpoint `POST /api/auth/register`.
  - **[Task 4](./04-ds-register-form-usermenu.md)** (Dev 2) — `RegisterForm` e `UserMenu` no DS.
  - **[Task 6](./06-state-session-sync.md)** (Dev 3) — estado Redux espelhando a sessão, para o Header ler `selectUser` e o logout refletir na UI.
- **O que esta tarefa desbloqueia**: Fecha os **três tópicos faltantes da Sprint 1** (cadastro, botão de logout, atualização de estado no login/logout) e habilita o smoke test completo de auth na **[Task 13](./13-smoke-test-demo.md)**.

---

## Contexto

Esta é a task de **integração dos buracos de Auth**: junta o endpoint de cadastro (Task 2), o `RegisterForm` (Task 4) e o `SessionSync` (Task 6) na experiência real do usuário:

1. **Cadastro**: nova rota pública `/register` que consome o endpoint e, no sucesso, já loga o usuário.
2. **Logout**: o `Header` do DS hoje mostra apenas um ícone estático e **não** usa o `UserMenu` ([packages/design-system/src/components/Header/Header.tsx](../../../packages/design-system/src/components/Header/Header.tsx)). Vamos plugar o `UserMenu` (com "Sair") no Header e cabear o `onLogout` ao thunk `logout` do `authSlice`.

---

## Pré-condições

- Estar na branch `dev2/register-page-logout`.
- Tasks 2, 4 e 6 mergeadas (ou disponíveis na branch de integração).
- `/register` deve ser rota **pública** no proxy (como `/login`).

---

## Implementação passo-a-passo

### 1. Liberar `/register` no proxy (`apps/shell/src/proxy.ts` + `AppShell.routes.ts`)

- [ ] Incluir `/register` como rota pública de auth no `proxy.ts` (mesma lista de `/login` e `/auth/error`).
- [ ] Incluir `/register` em `isPublicAuthRoute` ([apps/shell/src/app/AppShell.routes.ts](../../../apps/shell/src/app/AppShell.routes.ts)) para que o `AppShell` renderize a página **sem** Header/Sidebar.

### 2. Página de cadastro (`apps/shell/src/app/register/page.tsx`)

```tsx
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { RegisterPageContent } from './RegisterPageContent';

export default async function RegisterPage() {
  const session = await auth();
  if (session) redirect('/');
  return <RegisterPageContent />;
}
```

`RegisterPageContent.tsx` (`'use client'`): renderiza o `RegisterForm` do DS, chama o endpoint e, no sucesso, faz login automático:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { RegisterForm, type RegisterFormFields } from '@bytebank/design-system';

export function RegisterPageContent() {
  const router = useRouter();
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister(data: RegisterFormFields) {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(res.status === 409 ? 'E-mail já cadastrado' : (body.error ?? 'Falha no cadastro'));
      setLoading(false);
      return;
    }

    // Loga automaticamente após cadastrar
    await signIn('credentials', { email: data.email, password: data.password, redirectTo: '/' });
    router.push('/');
  }

  return <RegisterForm onSubmit={handleRegister} isLoading={isLoading} errorMessage={error} />;
}
```

- [ ] Adicionar link "Criar conta" na página de login (`/login`) apontando para `/register`, e o link inverso "Já tem conta? Entrar" no cadastro.

### 3. `UserMenu` (logout) no Header

O componente `Header` do DS precisa aceitar slots/props para renderizar o `UserMenu` controlado pelo shell. Duas opções (escolher a mais limpa):

- **Opção A (recomendada):** estender `HeaderProps` com `actionsSlot?: React.ReactNode` e renderizar esse slot no lugar do ícone estático atual. O shell injeta `<UserMenu .../>`.
- **Opção B:** o shell passa `user` + `onLogout` ao Header e o Header monta o `UserMenu` internamente.

Wrapper no shell (`apps/shell/src/components/AppHeader.tsx`):

```tsx
'use client';

import { Header, UserMenu } from '@bytebank/design-system';
import { useAppSelector, useAppDispatch, selectUser, logout } from '@bytebank/stores';
import { useState } from 'react';

export function AppHeader() {
  const user = useAppSelector(selectUser);
  const dispatch = useAppDispatch();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await dispatch(logout()); // signOut → callbackUrl '/login'
  };

  return (
    <Header
      userName={user?.name}
      actionsSlot={
        user ? (
          <UserMenu
            user={{ name: user.name, email: user.email, avatarUrl: user.image }}
            onLogout={handleLogout}
            isLoggingOut={loggingOut}
          />
        ) : null
      }
    />
  );
}
```

- [ ] Trocar `<Header />` por `<AppHeader />` em [apps/shell/src/app/AppShell.tsx](../../../apps/shell/src/app/AppShell.tsx).

---

## Validação

- [ ] **Cadastro**: em `/register`, criar uma conta nova → é logado e cai em `/`.
- [ ] **E-mail duplicado**: cadastrar e-mail existente mostra erro acessível (`aria-live`), sem travar o form.
- [ ] **Logout**: clicar no avatar → "Sair" desloga, redireciona para `/login` e o estado Redux `auth` zera (Redux DevTools).
- [ ] **Rotas públicas**: `/register` acessível sem sessão; estando logado, `/register` redireciona para `/`.
- [ ] **A11y**: navegar todo o fluxo só com teclado (Tab/Enter/Escape) — UserMenu abre, foca "Sair", fecha no Escape.

---

## Gotchas

1. **`/register` precisa ser pública** no proxy **e** em `isPublicAuthRoute`, senão o proxy redireciona para `/login` (loop) e o AppShell envolve a página com Header.
2. **Login automático pós-cadastro**: o `signIn('credentials', ...)` precisa das mesmas credenciais enviadas ao registro. Como a senha é hasheada no banco, o `authorize` (Task 2) compara o hash — funciona porque o usuário acabou de ser criado.
3. **DS sem Next Router**: o `RegisterForm`/`Header` não devem importar `next/*`. O roteamento e o `signIn` ficam no shell (`RegisterPageContent`/`AppHeader`).
4. **Estado do logout**: o `UserMenu` mostra "Saindo…" via `isLoggingOut`; o `clearSession` real vem do `SessionSync` (Task 6) quando a sessão cai — não limpe o store manualmente aqui para evitar corrida.
5. **Não quebrar o `userName` legado**: o `Header` ainda tem default `userName`. Garanta que, ao introduzir o slot, o layout em mobile/tablet/desktop continua intacto (testar os 3 breakpoints).

---

## Próximo passo

→ **Validar tudo de ponta a ponta no [Task 13 — Smoke Test Final & Demo](./13-smoke-test-demo.md).**
