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

## Validação

- [ ] Criar transação atualiza saldo e recentes na hora; erro simulado (API fora) faz rollback
- [ ] Políticas conferidas no React Query Devtools
- [ ] Nenhuma chave de dados financeiros em `localStorage`/`IndexedDB`
- [ ] Testes das mutations (otimista + rollback)

## Gotchas

1. O `staleTime` do cliente precisa conversar com o prefetch do SSR (S3-04): se for 0, o remote refaz a busca logo depois de hidratar.
2. Otimista em lista paginada com filtros é arriscado (a transação pode nem pertencer à página ou ao filtro). Aplique só no overview e no resumo; a lista apenas invalida.
3. Itens com id temporário (`optimistic-…`) não podem ser editados ou excluídos até o servidor responder: desabilite as ações neles.
