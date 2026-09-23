# Task 04 — Cache no servidor + prefetch no SSR (`HydrationBoundary`)

|                 |                                                                                         |
| --------------- | --------------------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 3 — Cache e criptografia](./README.md)                                          |
| **Owner**       | Dev 3 (Performance & Plataforma)                                                        |
| **Duração**     | 2 dias                                                                                  |
| **Prioridade**  | P0                                                                                      |
| **Branch**      | `dev3-perf/server-cache-ssr-prefetch`                                                   |
| **Depende de**  | S1-02 (casos de uso chamáveis no servidor), S1-06 (chaves do TanStack), S0-06 (Spike B) |
| **Desbloqueia** | S4-04 (LCP mobile)                                                                      |
| **Requisito**   | Cache · pré-carregamento · melhoria no tempo de resposta                                |
| **Embasamento** | Arquiteturas Avançadas — Aula 4 · Princípios e Padrões — Aula 2 (Decorator)             |

---

## Contexto

O gargalo que sobrou da Fase 2 é o LCP mobile das páginas federadas: HTML vazio → JS do shell → runtime do MF → remote → mount → **fetch dos dados** → paint. O preload (S2-08) encurta a parte dos remotes; esta task tira o fetch da cascata (os dados chegam junto com o HTML) e evita recalcular o resumo a cada requisição.

## Parte A — cache do resumo no servidor

- Porta `CacheInvalidator { invalidateUser(userId: string): Promise<void> }` no core; adaptador `NextCacheInvalidator` na infra.
- **Decorator** `CachedGetDashboardSummary` envolvendo o caso de uso: chave `['summary', userId, from, to]`, tag `summary:<userId>`.
- Os casos de uso de mutação (criar, editar, excluir transação) chamam `cacheInvalidator.invalidateUser(actor.userId)`.
- **API do Next:** verifique o que a versão instalada (16.1) oferece antes de implementar. `unstable_cache` com tags funciona sem mudar o modo de renderização; `'use cache'` + `cacheTag` exige `cacheComponents: true`, que muda o comportamento de todas as páginas — só adote se o spike provar que nada quebra. Confira também a assinatura de `revalidateTag` nessa versão.

## Parte B — prefetch no SSR + hydration

```tsx
// app/page.tsx (Server Component)
export default async function Home() {
  const session = await auth();
  const actor = { userId: session!.user!.id! };
  const queryClient = new QueryClient(); // por requisição — nunca o singleton do navegador
  const range = defaultSummaryRange(); // função do core, com fuso fixo

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: overviewKeys.me(),
      queryFn: () => container.getAccountOverview.execute(actor),
    }),
    queryClient.prefetchQuery({
      queryKey: summaryKeys.range(range),
      queryFn: () => container.getDashboardSummary.execute(actor, range),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AccountOverviewRemote />
      <DeferUntilVisible minHeight={640}>
        <DashboardRemote />
      </DeferUntilVisible>
    </HydrationBoundary>
  );
}
```

- `/transactions/page.tsx`: prefetch da página 1 com os filtros de `searchParams`, lidos com o codec `TransactionFilter` (mesma chave do cliente).
- Medir o LCP mobile (Lighthouse best-of-3) antes/depois.

## Validação

- [ ] Home e `/transactions` montam sem requisição de dados depois do remote (aba Network)
- [ ] Resumo servido do cache do servidor na segunda requisição; invalidado depois de uma mutação
- [ ] Teste com 2 usuários: nenhum vê dado do outro (SSR e cache)
- [ ] LCP mobile melhor que a baseline (anotado)

## Gotchas

1. **Vazamento entre usuários:** o `queryClient` exportado do `api-client` é singleton de módulo. No servidor ele seria compartilhado entre requisições. Sempre `new QueryClient()` por requisição no Server Component.
2. As chaves precisam ser idênticas às do cliente, inclusive a faixa de datas padrão do resumo. Calcule `defaultSummaryRange()` numa função do core com fuso fixo (America/Sao_Paulo), usada pelos dois lados.
3. Os remotes montam com `ssr:false`, mas o `HydrationBoundary` fica no shell, acima deles e dentro do `QueryClientProvider` do `providers.tsx`: os dados entram no cache antes de o remote montar.
4. Chave e tag do cache do servidor sempre com `userId`.
5. `staleTime` > 0 no cliente (S3-06), senão o remote refaz a busca logo depois de hidratar.
