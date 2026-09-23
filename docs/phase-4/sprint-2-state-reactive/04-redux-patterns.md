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

A store (`packages/stores`) tem dois slices simples: `ui` (um único `feedback` e o painel de filtros) e `auth`. Não há normalização, seletores memoizados nem efeitos centralizados — os componentes disparam `showFeedback` espalhados. E o `configureStore` usa o padrão do RTK, que liga o Redux DevTools em produção.

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
6. **Reset no logout:** root reducer responde a `resetClientState` devolvendo o estado inicial — nenhum dado do usuário fica na memória depois do logout.
7. **DevTools:** `configureStore({ devTools: process.env.NODE_ENV !== 'production' })`.

## Testes

- [ ] Reducers dos slices novos
- [ ] Memoização: mesma entrada → mesma referência de saída
- [ ] Listener: `logout.pending` chama `queryClient.clear()` (mock) e reseta o estado
- [ ] Ponte: evento `transaction.created` gera uma notificação

## Validação

- [ ] Redux DevTools mostra o estado normalizado (`ids`/`entities`) em dev e não conecta em produção
- [ ] Toast único por evento (sem duplicata)
- [ ] Logout zera Redux e TanStack (React Query Devtools vazio)

## Gotchas

1. Não guarde dados do servidor no Redux: transações ficam no TanStack. O entity adapter aqui serve a estado do cliente (notificações, uploads).
2. `File` não é serializável: no slice guarde só metadados. O `File` fica no stream. Senão o `serializableCheck` do RTK reclama.
3. Registre os listeners no shell, não dentro de `@bytebank/stores`, para o pacote não passar a depender do `api-client`.
4. A store é criada no pacote compartilhado; nos MFEs, `process.env.NODE_ENV` vem do `source.define` do rsbuild, mas quem cria a store é o shell — vale o valor dele.
