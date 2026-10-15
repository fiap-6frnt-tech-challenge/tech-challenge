# Task 04 — Redux avançado: entity adapter, seletores memoizados, listener middleware

|                 |                                                           |
| --------------- | --------------------------------------------------------- |
| **Sprint**      | [Sprint 2 — Estado e reatividade](./README.md)            |
| **Owner**       | Dev 2 (Arquitetura Front & Estado)                        |
| **Duração**     | 1.5 dia                                                   |
| **Prioridade**  | P0                                                        |
| **Branch**      | `dev2-arch/redux-patterns`                                |
| **Depende de**  | Task 01, Task 03 (parcial — eventos de upload)            |
| **Desbloqueia** | Task 07 (logout completo), S3-06                          |
| **Requisito**   | State Management Patterns avançados                       |
| **Embasamento** | Princípios e Padrões — Aula 4 (State Management Patterns) |

---

## Contexto

Antes desta task, a store (`packages/stores`) tinha dois slices simples: `ui` (um único `feedback` e o painel de filtros) e `auth`, sem normalização, seletores memoizados nem efeitos centralizados. Os componentes disparavam `showFeedback` espalhados e o `configureStore` usava o padrão do RTK, que liga o Redux DevTools em produção.

## Implementação

1. **Notificações normalizadas** — `notificationsSlice` com `createEntityAdapter`, substituindo o `feedback` único por uma fila:

   ```ts
   const notificationsAdapter = createEntityAdapter<Notification>({
     sortComparer: (a, b) => a.createdAt - b.createdAt,
   });

   export const notificationsSlice = createSlice({
     name: 'notifications',
     initialState: notificationsAdapter.getInitialState(),
     reducers: {
       notificationAdded: {
         reducer: notificationsAdapter.addOne,
         prepare: (input: Omit<Notification, 'id' | 'createdAt'>) => ({
           payload: { ...input, id: nanoid(), createdAt: Date.now() },
         }),
       },
       notificationDismissed: notificationsAdapter.removeOne,
     },
   });
   ```

   `showFeedback`/`hideFeedback` continuam exportados como aliases (compatibilidade com os componentes atuais); o `FeedbackHost` mostra a notificação mais antiga.

2. **Uploads normalizados** — `uploadsSlice` com entity adapter: `{ id, transactionId, fileName, loaded, total, status }`, alimentado pela fila da Task 03.
3. **Seletores memoizados** com `createSelector`:
   ```ts
   export const selectOverallUploadProgress = createSelector([selectAllUploads], (uploads) => {
     const active = uploads.filter((u) => u.status === 'uploading');
     const total = active.reduce((sum, u) => sum + u.total, 0);
     return total === 0 ? null : active.reduce((sum, u) => sum + u.loaded, 0) / total;
   });
   ```
   Também `selectActiveUploads` e `selectHasPendingUploads` (avisar antes de fechar a aba com upload em andamento).
4. **Listener middleware** — `createListenerMiddleware` na store; os efeitos são **registrados no shell** (composition root), onde `queryClient` e store convivem:
   - `logout.pending` → `queryClient.clear()` + `resetClientState()` + cancelar uploads
   - `uploads/uploadFailed` → notificação de erro
5. **Ponte RxJS → Redux** (`apps/shell/src/app/eventBridges.ts`): `domainEvents$` (Task 01) → `notificationAdded` para os sucessos ("Transação criada"). Remover o `dispatch(showFeedback(...))` de sucesso duplicado nos componentes; erros continuam locais (o componente conhece o contexto).
6. **Reset no logout:** root reducer responde a `resetClientState` devolvendo o estado inicial. O shell invalida a geração da sessão antes de cancelar uploads e limpar caches; as mutations ignoram eventos e rollbacks de operações anteriores e retornam `ClientSessionEndedError` aos consumidores. O conteúdo privado é desmontado assim que a autenticação é limpa, evitando que observers recriem queries durante o redirecionamento.
7. **DevTools:** `configureStore({ devTools: process.env.NODE_ENV !== 'production' })`. A mesma política é aplicada às stores internas do Recharts; `chartRuntime.ts` está declarado em `sideEffects` para ser preservado pelo build.

## Testes

- [x] Reducers dos slices novos
- [x] Memoização: mesma entrada → mesma referência de saída
- [x] Listener: `logout.pending` limpa um QueryClient real (queries e mutations) e reseta o estado
- [x] Ponte: evento `transaction.created` gera uma notificação

## Validação

- [x] Estado normalizado (`ids`/`entities`), DevTools habilitado em dev e sem conexão em produção
- [x] Toast único por evento (sem duplicata)
- [x] Logout zera Redux e TanStack; operações tardias não restauram cache ou notificações

### Evidências — 2026-10-15

Implementada em `dev2-arch/redux-patterns`, a partir de `origin/upload-stream` (`41bf718`), que contém `phase-4` (`46f5102`). A integração na `phase-4` depende da entrada da S2-03; esta task não inclui o endurecimento completo de sessão da S2-07.

| Verificação                  | Resultado                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `CI=1 npm test`              | 13/13 tarefas Turbo, testes unitários, integração de hooks e stories aprovados   |
| `npx turbo run type-check`   | 13/13 tarefas aprovadas                                                          |
| `npm run lint`               | 13/13 tarefas aprovadas, sem erros; avisos preexistentes de imports legados      |
| `npm run arch:check`         | Sem violações: 442 módulos e 1181 dependências                                   |
| `DATABASE_URL=… npm run e2e` | Build de produção 8/8 e E2E 20/20, Chromium e Firefox, PostgreSQL 16 descartável |
| `git diff --check`           | Sem erros                                                                        |

O E2E de Redux cobre notificação única, FIFO, ausência de conexões DevTools, metadados normalizados e logout com dois uploads ativos mais um em espera. Também mantém uma criação pendente durante o logout, libera sua falha e confirma que o conteúdo privado foi desmontado e os caches/notificações permanecem vazios.

A revisão independente encontrou e motivou regressões para rollback de exclusão, sucesso/erro tardio de criação e remoção de anexo após logout. A validação em produção revelou a conexão DevTools das stores internas do Recharts e o refetch de `overview` por um consumidor ainda montado; ambos foram corrigidos e os cenários passaram. Nenhum bloqueio permaneceu na revisão final.

## Gotchas

1. Não guarde dados do servidor no Redux: transações ficam no TanStack. O entity adapter aqui serve a estado do cliente (notificações, uploads).
2. `File` não é serializável: no slice guarde só metadados. O `File` fica no stream. Senão o `serializableCheck` do RTK reclama.
3. Registre os listeners no shell, não dentro de `@bytebank/stores`, para o pacote não passar a depender do `api-client`.
4. A store é criada no pacote compartilhado; nos MFEs, `process.env.NODE_ENV` vem do `source.define` do rsbuild, mas quem cria a store é o shell — vale o valor dele.
