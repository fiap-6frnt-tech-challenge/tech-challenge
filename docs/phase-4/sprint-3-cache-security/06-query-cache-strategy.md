# Task 06 — Estratégia de cache no cliente + atualização otimista

|                 |                                                                 |
| --------------- | --------------------------------------------------------------- |
| **Sprint**      | [Sprint 3 — Cache e criptografia](./README.md)                  |
| **Owner**       | Dev 2 (Arquitetura Front & Estado)                              |
| **Duração**     | 1 dia                                                           |
| **Prioridade**  | P0                                                              |
| **Branch**      | `dev2-arch/query-cache-strategy`                                |
| **Depende de**  | S2-04 (logout limpa o cache)                                    |
| **Desbloqueia** | S3-04 (`staleTime` compatível com a hydration)                  |
| **Requisito**   | Cache · State Management Patterns (Optimistic UI)               |
| **Embasamento** | Princípios e Padrões — Aula 4 · Arquiteturas Avançadas — Aula 4 |

---

## Contexto

Hoje todas as queries usam o mesmo padrão (`staleTime` 60 s, `gcTime` 5 min, sem refetch no foco), e só a exclusão é otimista. Dados diferentes pedem políticas diferentes.

## Implementação

1. **Política por tipo de dado**

   | Dado                        | `staleTime` | `gcTime` | Refetch no foco | Invalidação                          |
   | --------------------------- | ----------- | -------- | --------------- | ------------------------------------ |
   | Resumo do dashboard         | 60 s        | 10 min   | sim             | mutações de transação                |
   | Overview (saldo + recentes) | 30 s        | 10 min   | sim             | mutações de transação                |
   | Página da lista             | 30 s        | 5 min    | não             | mutações (`transactionKeys.lists()`) |
   | Detalhe                     | 5 min       | 10 min   | não             | update/delete do id                  |
   | Anexos de uma transação     | 5 min       | 10 min   | não             | adicionar/remover anexo              |

2. **Criar e editar otimistas** (hoje só a exclusão é), no overview e no resumo:
   ```ts
   onMutate: async (input) => {
     await queryClient.cancelQueries({ queryKey: overviewKeys.all });
     const previous = queryClient.getQueryData<AccountOverview>(overviewKeys.me());
     queryClient.setQueryData<AccountOverview>(overviewKeys.me(), (old) =>
       old ? applyOptimisticCreate(old, input) : old
     );
     return { previous };
   },
   onError: (_error, _input, context) => {
     queryClient.setQueryData(overviewKeys.me(), context?.previous);
   },
   onSettled: () => invalidateTransactionViews(queryClient),
   ```
   `applyOptimisticCreate` fica no domínio (core): recalcula o saldo com `Money` e insere nas 5 recentes com id temporário `optimistic-<uuid>`.
3. **Sem persistência de dados financeiros** (ADR-005): nada de `persistQueryClient` com localStorage/IndexedDB. Só preferências de UI não sensíveis podem ser persistidas.
4. **Logout** (listener do S2-04): confirmar que limpa tudo (React Query Devtools vazio).

## Notas de implementação

- **Política:** `cachePolicy` (`packages/api-client/src/queries/cachePolicy.ts`) guarda a tabela acima e cada `queryOptions` espalha a sua: `transactionsPageQuery`, `accountOverviewQuery`, `dashboardSummaryQuery` e os novos `transactionDetailQuery` e `transactionAttachmentsQuery`. Os padrões do `createQueryClient` continuam só como fallback. O SSR (S3-04) hidrata com o horário da busca no servidor, então 30 s e 60 s evitam o refetch logo depois de hidratar.
- **Domínio:** a conta dos KPIs do resumo saiu do `GetTransactionsSummary` para `buildDashboardSummary` (`domain/dashboard/summarize.ts`), e o cliente recalcula o resumo otimista com a mesma função do servidor. `domain/transaction/optimistic.ts` traz `applyOptimisticCreate`/`applyOptimisticUpdate` (saldo com `Money`, 5 recentes, mais nova primeiro) e `applyOptimisticSummaryCreate`/`applyOptimisticSummaryUpdate` (mês, categoria e série de saldo; nada muda fora da faixa do resumo). A edição tira a contribuição da versão anterior e soma a nova.
- **Mutations:** `queries/transactionViews.ts` cancela, tira o snapshot, aplica e restaura o overview e todos os resumos em cache, e centraliza `invalidateTransactionViews`. Criar e editar invalidam no `onSettled`, inclusive depois do rollback. A edição busca a versão anterior no detalhe, no overview ou nas listas; se não achar, só invalida. A lista paginada nunca recebe item otimista (Gotcha 2).
- **Sessão:** o rollback respeita o guarda de sessão do S2-04. Uma falha que chega depois do logout não recria o cache limpo.
- **Id temporário:** `optimistic-<uuid>` (`crypto.randomUUID()`). O `TransactionItem` desabilita editar e excluir e marca `aria-busy` enquanto o id é temporário (Gotcha 3).
- **Na UI de hoje:** criar (pela home) mostra o efeito otimista. Editar só existe em `/transactions`, então atualiza o overview e o resumo em cache, que passam a aparecer com a navegação SPA da S3-08.
- **Persistência e logout:** não há `persistQueryClient`, `localStorage` ou IndexedDB com dados financeiros (filtros ficam na URL). O listener do S2-04 (`clientListeners.ts`) já limpa o `QueryClient` no logout.

## Testes

- [x] Core: `optimistic.test.ts` — centavos, depósito, saque e transferência neutra, ordem e limite das 5 recentes, faixa do resumo, mês e categoria novos, série de saldo, edição que muda valor, tipo, categoria ou data
- [x] Core: projeção otimista igual ao `GetTransactionsSummary` recalculado, depois de criar e de editar (`transactions-summary.test.ts`)
- [x] api-client: política de cada query e invalidação no `onSettled` (`hooks.test.ts`)
- [x] api-client: `optimistic.integration.test.tsx` — criar atualiza saldo, recentes e resumo antes da resposta; falha faz rollback e invalida; editar aplica a diferença, inclusive com a versão anterior só na lista; sem versão em cache só invalida; falha tardia depois do logout não restaura o snapshot
- [x] transactions-mfe: story `State: Pending Sync` — ações desabilitadas e `aria-busy`
- [x] E2E `optimistic-ui.spec.ts`: política lida do `QueryClient` da página real (os mesmos `query.options` que o Devtools mostra); POST segurado mostra saldo e recentes na hora, 503 faz rollback e mostra o erro; nenhum dado financeiro em `localStorage`, `sessionStorage` ou IndexedDB

## Validação

- [x] Criar transação atualiza saldo e recentes na hora; erro simulado (API fora) faz rollback
- [x] Políticas conferidas no React Query Devtools — automatizado no E2E, que lê os `query.options` do `QueryClient` da página
- [x] Nenhuma chave de dados financeiros em `localStorage`/`IndexedDB`
- [x] Testes das mutations (otimista + rollback)

## Gotchas

1. O `staleTime` do cliente precisa conversar com o prefetch do SSR (S3-04): se for 0, o remote refaz a busca logo depois de hidratar.
2. Otimista em lista paginada com filtros é arriscado (a transação pode nem pertencer à página ou ao filtro). Aplique só no overview e no resumo; a lista apenas invalida.
3. Itens com id temporário (`optimistic-…`) não podem ser editados ou excluídos até o servidor responder: desabilite as ações neles.
