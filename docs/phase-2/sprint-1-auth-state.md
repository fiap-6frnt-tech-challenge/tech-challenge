# Sprint 1 — Auth + State Migration

**Duração:** 14 dias · 2026-05-20 → 2026-06-02
**Objetivo:** Login funcional com NextAuth (Credentials + Google), persistência real para transações, estado migrado de Context API para Redux Toolkit + TanStack Query.

> Voltar para o [PLAN.md](./PLAN.md) · Anterior: [sprint-0](./sprint-0-foundation.md) · Próximo: [sprint-2](./sprint-2-dashboard.md)
> **Alocação de tarefas por dev:** [team-allocation.md#sprint-1](./team-allocation.md#sprint-1--auth--state-migration-14-dias)

---

## Pré-requisitos

- [ ] Sprint 0 fechado (monorepo + DS + PoC MF)
- [ ] Google Cloud Console: OAuth Client criado (Web Application, Authorized redirect: `http://localhost:3000/api/auth/callback/google` + prod)
- [ ] Backend oficial rodando localmente (via Docker Compose do repositório `israelmeinert/tech-challenge-2`) ou URL de produção disponível.

---

## Tasks

### 1. Spike: time aprende Redux Toolkit + TanStack Query (1 dia · **todo time** — **dev1-infra** lidera)

- [ ] Pair session de 2h: padrões de uso, slice boundaries, hooks tipados, cache keys
- [ ] Build de exemplo descartável: contador com slice Redux Toolkit + lista TanStack Query
- [ ] Documentar convenções em `docs/phase-2/state-conventions.md`

**Aceite:** time todo confortável com a API antes de tocar código real.

### 2. Integração com o Backend Oficial da Pós (2 dias · **dev2-backend**)

- [ ] Clonar e subir o backend oficial em container Docker localmente.
- [ ] Configurar a variável de ambiente `NEXT_PUBLIC_BACKEND_API_URL` no shell do Next.js (default: `http://localhost:3000`).
- [ ] Configurar rotas BFF no shell Next.js (`apps/shell/src/app/api/transactions/*` e `/api/user/*`) atuando como proxy seguro.
- [ ] O BFF deve anexar o cabeçalho `Authorization: Bearer <JWT>` em todas as requisições repassadas ao backend da pós.
- [ ] Mapear e implementar os endpoints do BFF:
  - `POST /api/user` -> proxy para `POST ${BACKEND_API_URL}/user` (cadastro)
  - `GET /api/account` -> proxy para `GET ${BACKEND_API_URL}/account` (retorna conta, transações e cartões)
  - `POST /api/transactions` -> proxy para `POST ${BACKEND_API_URL}/account/transaction` (cria transação)
  - `GET /api/transactions/statement` -> proxy para `GET ${BACKEND_API_URL}/account/{accountId}/statement` (extrato)
- [ ] Garantir que o BFF trate os formatos de resposta do backend oficial (como campos `accountId`, `type`, `value`, `from`, `to`, `anexo`) para manter compatibilidade com o frontend.

**Aceite:** BFF respondendo em `/api/*` e repassando transações criadas e consultadas com sucesso no MongoDB do backend oficial.

### 3. NextAuth setup no shell (2 dias · **dev2-backend**)

- [ ] `npm install next-auth@beta -w @bytebank/shell`
- [ ] Criar `apps/shell/src/app/api/auth/[...nextauth]/route.ts`
- [ ] Configurar providers:
  ```ts
  Credentials({
    name: 'credentials',
    credentials: { email, password },
    async authorize(creds) {
      // POST para ${BACKEND_API_URL}/user/auth
      // Se sucesso, retorna o usuário + insere o token JWT retornado no payload
    },
  });
  ```
- [ ] Session strategy: `jwt`, maxAge 7 dias, cookie httpOnly + secure em prod
- [ ] Callbacks: `jwt` salva o Bearer Token recebido do backend oficial na sessão do NextAuth (acessível no servidor BFF) e expõe dados mínimos do usuário.
- [ ] Página de erro `/auth/error` (DS-styled)
- [ ] `apps/shell/middleware.ts` protege todas rotas exceto `/login`, `/api/auth/*`, `/_next/*`
- [ ] Env vars: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_BACKEND_API_URL`
- [ ] `apps/shell/src/app/layout.tsx`: wrap em `<SessionProvider>`

**Aceite:** `/login` autentica chamando a API do backend da pós; o token JWT é guardado com segurança na sessão; logout funciona.

### 4. Páginas de auth (1 dia · **dev5-transactions**)

- [ ] `apps/shell/src/app/login/page.tsx` — usa `LoginForm` do DS
- [ ] `apps/shell/src/app/auth/error/page.tsx` — `ErrorState` do DS com mensagens i18n
- [ ] Server-side redirect se já autenticado → `/`

**Aceite:** UX de login alinhada com DS; navegação por teclado funcional.

### 5. Novos componentes no Design System (2 dias · **dev3-ds**)

> **Cada um com:** `I{Name}.ts`, `{Name}.tsx`, `{Name}.stories.tsx`, tokens DS, a11y.

- [ ] `LoginForm` — email + password + submit; valida com Zod; ARIA-live em erros
  - Story: empty / filled / loading / error / disabled
- [ ] `GoogleAuthButton` — botão branded ("Continuar com Google"), com logo SVG
  - Story: default / loading / disabled
- [ ] `UserMenu` — dropdown com avatar, nome, "Sair"; abre via clique/Enter
  - Story: anonymous / authenticated / with-long-name
- [ ] `AuthGuard` (componente client) — wrap content; mostra skeleton enquanto session carrega; redirect se anônimo
  - Story: loading / authenticated / unauthenticated (mockado)
- [ ] Atualizar `apps/shell/src/components/Header` para incluir `UserMenu` quando autenticado

**Aceite:** todos publicados no Chromatic; passam a11y addon.

### 6. Schema de transação evoluído (1 dia · **dev2-backend**)

- [ ] Em `packages/shared/src/types/transaction.ts`, adaptar a assinatura para corresponder à API da pós:
  ```ts
  export interface Transaction {
    id: string;
    accountId: string;
    type: 'Credit' | 'Debit';
    value: number; // Negativo para Debit, Positivo para Credit
    from?: string;
    to?: string;
    anexo?: string; // URL do comprovante (Vercel Blob)
    date: string;
  }
  ```
- [ ] Atualizar os schemas de validação Zod no shared (`packages/shared/src/schemas/transaction.ts`) para suportar esses campos e restrições.
- [ ] Atualizar o arquivo de mock de dados local `data/transactions.json` para bater com a nova estrutura, garantindo que o frontend renderize corretamente em modo dev offline.

**Aceite:** Todos os tipos TypeScript e schemas de validação atualizados e exportados com sucesso; mock de dados local ajustado.

### 7. packages/stores — Redux Toolkit (1 dia · **dev4-dashboard**)

- [ ] Instalar `@reduxjs/toolkit` e `react-redux` em `@bytebank/stores`
- [ ] `packages/stores/src/authSlice.ts` — estado derivado da session do NextAuth: `user`, `isAuthenticated`; actions `setSession`/`clearSession`; selectors `selectUser`, `selectIsAuthenticated`
- [ ] `packages/stores/src/uiSlice.ts` — `filterPanelOpen`, `setFilterPanelOpen`, `feedback: { type, title, message } | null`, actions `showFeedback()`/`hideFeedback()`
- [ ] `packages/stores/src/store.ts` — `configureStore({ reducer: { auth, ui } })` + tipos `RootState`/`AppDispatch`
- [ ] `packages/stores/src/hooks.ts` — `useAppDispatch` + `useAppSelector` tipados
- [ ] `redux-persist` para o UI slice se quiser persistir preferências (opcional)
- [ ] Index barrel exports (slices, actions, selectors, store, hooks)

**Aceite:** slices tipados, testados com Vitest, consumíveis de qualquer app/package via `useAppSelector`/`useAppDispatch`.

### 8. packages/api-client — TanStack Query hooks (2 dias · **dev4-dashboard**)

- [ ] Instalar `@tanstack/react-query` e `@tanstack/react-query-devtools` no package
- [ ] `packages/api-client/src/client.ts` — `QueryClient` factory com defaults sensatos (staleTime: 60s, retry: 1)
- [ ] `packages/api-client/src/transactions.ts`:
  - `useTransactions(filters, options)` — `useQuery`
  - `useTransaction(id)` — `useQuery`
  - `useCreateTransaction()` — `useMutation` + optimistic update
  - `useUpdateTransaction()` — `useMutation` + invalidate
  - `useDeleteTransaction()` — `useMutation` + optimistic remove
  - `useInfiniteTransactions(filters)` — `useInfiniteQuery` (preparado para Sprint 3)
- [ ] Cache keys padronizadas: `['transactions', filters]`, `['transaction', id]`
- [ ] HTTP layer: re-usar `TransactionService` movido pra `packages/api-client/src/http.ts`
- [ ] No shell, wrap layout com `<QueryClientProvider>` + Devtools (dev only)

**Aceite:** hooks tipados; mutations triggam refetch correto; devtools mostram cache.

### 9. Migração: remover Context API (2 dias · **dev5-transactions** + **dev4-dashboard** em pair)

- [ ] Remover `apps/shell/src/context/TransactionsContext.tsx`
- [ ] Substituir `useTransactions` (context) → `useTransactions` (hook do api-client) em:
  - `apps/shell/src/app/page.tsx`
  - `apps/shell/src/app/transactions/page.tsx`
  - `components/features/BalanceCard`
  - `components/features/NewTransaction`
  - todos consumidores
- [ ] `usePaginatedTransactions` virou consumer de `useTransactions` (já que filtros agora batem no servidor via cache)
- [ ] Remover `apps/shell/src/context/FeedbackContext.tsx`
- [ ] Substituir `useFeedback` (context) → `useAppSelector`/`useAppDispatch` no `uiSlice` (Redux) — `FeedbackModal` lê `feedback` do store e despacha `hideFeedback()`
- [ ] Remover `TransactionsProvider` e `FeedbackProvider` do layout; garantir que `<Provider store={store}>` (react-redux) envolve o app

**Aceite:** `grep -r "useContext" apps/shell/src` retorna apenas Next/React internals; nenhum `Transactions...Context` no código.

### 10. Testes Vitest (1 dia · **dev1-infra**)

- [ ] `packages/stores/src/authSlice.test.ts` — reducers de login/logout, state transitions, selectors
- [ ] `packages/stores/src/uiSlice.test.ts` — filter panel toggle, feedback push/clear
- [ ] `packages/api-client/src/transactions.test.ts` — mock fetch, verificar cache keys e optimistic updates
- [ ] `apps/shell/middleware.test.ts` — redirect anônimo, allow auth routes

**Aceite:** `npm test` passa com ≥ 10 testes cobrindo store/hooks/middleware.

---

## Critério de aceite do sprint

- [x] Login com credentials (autenticando contra POST /user/auth do backend oficial da pós) funciona
- [x] Logout funciona; sessão expira após 7 dias
- [x] Rotas protegidas: `/`, `/transactions` redirecionam para `/login` se anônimo
- [x] Transação criada persiste no banco de dados oficial (MongoDB do backend) após restarts
- [x] Schema da transação tem `accountId`, `type`, `value`, `from`, `to`, `anexo`, `date`
- [x] `useContext(TransactionsContext)` removido de todo o código
- [x] FeedbackModal controlado por Redux Toolkit (`uiSlice`)
- [x] 4 novos componentes no DS publicados no Chromatic com stories
- [x] Vitest passa
- [x] CI verde

## Riscos do sprint

| Risco                                        | Mitigação                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------- |
| OAuth Google bloqueia callbacks locais       | Configurar `http://localhost:3000` no Authorized JavaScript origins do Google Cloud |
| `NEXTAUTH_SECRET` faltando em Vercel preview | Sync env via `vercel env pull` antes do primeiro deploy                             |
| Optimistic updates dessincronizam            | Sempre invalidate na `onSettled`; testar com network throttling                     |
| Migração de Context quebra modais            | Migrar 1 modal por vez + smoke test após cada                                       |

## Definição de Pronto

- Cada PR: CI verde + 1 revisor + sem regressão Chromatic + testes adicionados
- Sprint encerra com vídeo curto (2 min) demonstrando: login Google → criar transação → logout → confirmar persistência
