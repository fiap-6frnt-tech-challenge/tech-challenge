# Task 6 — State: Sincronizar Redux ↔ NextAuth no Login/Logout

> ⏳ **Status: Pending**

|                        |                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 2 — Dashboard MFE + Charts](../sprint-2-dashboard.md)                           |
| **Owner**              | `Dev 3` (State & Integration)                                                           |
| **Duração estimada**   | 1 dia                                                                                   |
| **Branch recomendada** | `dev3/auth-state-sync`                                                                  |
| **Depende de**         | — (pode iniciar no dia 1; o `authSlice` já existe da Sprint 1)                          |
| **PR só abre**         | Após o estado Redux `auth` refletir a sessão NextAuth automaticamente em login e logout |

---

## Dependências

- **O que bloqueia esta tarefa**: Nada. O `authSlice` (`setSession`/`clearSession`/`logout`) e o `<SessionProvider>` já existem desde a Sprint 1.
- **O que esta tarefa desbloqueia**: Desbloqueia a parte de **logout** da **[Task 9 — Página `/register` + Logout no Header](./09-register-page-logout-wiring.md)**: com o estado sincronizado, o Header pode renderizar o `UserMenu` a partir de `selectUser` e o logout reflete imediatamente na UI. Fecha o tópico faltante **"atualização do state (Redux) ao realizar login ou logout"**.

---

## Contexto

A Sprint 1 criou o `authSlice` ([packages/stores/src/authSlice.ts](../../../packages/stores/src/authSlice.ts)) com `setSession`, `clearSession`, selectors e o thunk `logout` — **mas nada despacha essas actions**. Hoje o estado Redux `auth` fica sempre em `{ user: null, isAuthenticated: false }`, mesmo após o login via NextAuth. A "fonte da verdade" da sessão (`useSession()`) e o store Redux estão **desconectados**.

Esta task cria um componente cliente **`SessionSync`** que observa `useSession()` e despacha `setSession`/`clearSession`, mantendo o store Redux espelhando a sessão. Isso é o que permite que qualquer app/MFE leia o usuário logado via `useAppSelector(selectUser)` — incluindo o `dashboard-mfe`, que compartilha o mesmo store singleton.

---

## Pré-condições

- Estar na branch `dev3/auth-state-sync`.
- Confirmar que `@bytebank/stores` exporta `setSession`, `clearSession`, `useAppDispatch`, `selectUser`, `selectIsAuthenticated`.

---

## Implementação passo-a-passo

### 1. Componente `SessionSync` (`apps/shell/src/app/SessionSync.tsx`)

```tsx
'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useAppDispatch, setSession, clearSession } from '@bytebank/stores';

/**
 * Espelha a sessão do NextAuth no store Redux (authSlice).
 * Não renderiza nada — apenas sincroniza estado.
 */
export function SessionSync() {
  const { data: session, status } = useSession();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (status === 'loading') return;

    if (session?.user) {
      dispatch(
        setSession({
          id: session.user.id,
          name: session.user.name ?? '',
          email: session.user.email ?? '',
          image: session.user.image ?? undefined,
        })
      );
    } else {
      dispatch(clearSession());
    }
  }, [session, status, dispatch]);

  return null;
}
```

### 2. Montar dentro dos providers (`apps/shell/src/app/providers.tsx`)

`SessionSync` precisa estar **dentro** de `<SessionProvider>` e de `<Provider store>` (ambos já existem). Monte-o uma única vez:

```tsx
<Provider store={store}>
  <SessionProvider>
    <SessionSync />
    <QueryClientProvider client={queryClient}>
      {children}
      <FeedbackHost />
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
    </QueryClientProvider>
  </SessionProvider>
</Provider>
```

### 3. Garantir o fluxo de logout

O thunk `logout` do `authSlice` chama `signOut({ callbackUrl: '/login' })`. Quando o `signOut` invalida a sessão, o `useSession()` atualiza para `null` → o `SessionSync` despacha `clearSession()`. Ou seja: **o logout limpa o Redux por dois caminhos** (o `extraReducers` do thunk e o `SessionSync`), o que é redundante-seguro.

> A action visual de logout (botão no Header) é cabeada na [Task 9](./09-register-page-logout-wiring.md); aqui garantimos que o **estado** reaja corretamente.

---

## Validação

- [ ] Após login, `useAppSelector(selectIsAuthenticated)` retorna `true` e `selectUser` traz `{ id, name, email }` (inspecionar via Redux DevTools).
- [ ] Após logout (`dispatch(logout())`), o store volta a `{ user: null, isAuthenticated: false }` e a navegação vai para `/login`.
- [ ] Recarregar a página com sessão ativa rehidrata o store `auth` corretamente (não fica `null` após F5).
- [ ] O `dashboard-mfe` (quando integrado) lê o mesmo usuário via `selectUser` — prova do store singleton compartilhado.

---

## Gotchas

1. **Não duplicar `SessionProvider`/`Provider`**: `SessionSync` apenas **consome** os providers existentes. Não criar uma segunda árvore de providers.
2. **`status === 'loading'`**: ignore o primeiro tick para não despachar `clearSession()` falsamente antes de a sessão resolver, o que causaria flicker de "deslogado".
3. **Store singleton entre MFEs**: para o `dashboard-mfe` enxergar o mesmo estado, `@bytebank/stores` precisa estar `singleton: true` no Module Federation (configurado na [Task 5](./05-create-dashboard-mfe.md)).
4. **Tipo `session.user.id`**: o callback `session` do NextAuth já injeta `id` (ver `auth.ts`). Confirme que a augmentation de tipos do `next-auth` (`Session['user']['id']`) está presente, senão o TS reclama.

---

## Próximo passo

→ **Renderizar o `UserMenu` (logout) no Header e a página de cadastro com a [Task 9 — Página `/register` + Logout no Header](./09-register-page-logout-wiring.md).**
