# Task 08 — Pré-carregamento de remotes e dados

|                 |                                                             |
| --------------- | ----------------------------------------------------------- |
| **Sprint**      | [Sprint 2 — Estado e reatividade](./README.md)              |
| **Owner**       | Dev 3 (Performance & Plataforma)                            |
| **Duração**     | 1.5 dia                                                     |
| **Prioridade**  | P0                                                          |
| **Branch**      | `dev3-perf/preload`                                         |
| **Depende de**  | S1-06 (chaves e queries), S0-06 (Spike B), S0-04 (baseline) |
| **Desbloqueia** | S3-04, S3-08 (prefetch por intenção vindo dos MFEs)         |
| **Requisito**   | Lazy loading e pré-carregamento                             |
| **Embasamento** | Arquiteturas Avançadas — Aula 4 (Performance)               |

---

> **Notas do Spike B (S0-06, 2026-09-30)** — [evidências](../sprint-0-foundation/06-risk-spikes.md#spike-b--evidências-e-aprendizados).
>
> - **Passo 1: use `resourceCategory: 'sync'`, não `'all'`.** O `'all'` baixou 260 kB em 8 assets: chunks lazy de modais, o expose `AccountOverview` e até o Tailwind do bootstrap standalone, que ainda viola a CSP do S3-05. O `'sync'` baixou 12,8 kB, só o expose que a rota precisa.
> - **Gotcha 1 respondido:** o runtime 2.5.0 aceita `'TransactionsPage'` ou `'./TransactionsPage'`.
> - **Gotcha 2 corrigido:** o `preloadRemote` baixa e **executa** o remoteEntry se ele ainda não estiver carregado; só os chunks do expose ficam em `<link rel="preload">`. Assets de shared que o shell provê são filtrados.
> - **Passo 3:** delegar `pointerover`/`focus` num wrapper do `Sidebar` no `AppShell` já funciona sem mexer no DS. Com ou sem a prop `onLinkIntent`, importe `lib/federation` com `import()` dinâmico no handler: um import estático leva o chunk da federação (582 kB raw) para o bundle inicial.
> - **Validação "tempo clique → conteúdo menor que na baseline":** o preload do chunk sozinho não entrega isso em `/transactions`.
>   - Em Slow 4G, o `loadRemote` caiu de ~190 ms para 2 ms, mas o clique → heading ficou igual (~890 ms com a rota dinâmica, ~370 ms com ela estática).
>   - O motivo é que o roundtrip RSC domina, e o React 19 segura a exibição do conteúdo por até 300 ms depois de mostrar o fallback de Suspense.
>   - O que muda o tempo clique → lista é o `prefetchQuery` no mesmo gatilho. O preload rende onde o carregamento passa de ~300 ms: o dashboard com recharts a partir de `/transactions`, ou um remoteEntry ainda não carregado.
>   - Meça também o `loadRemote` com `performance.mark`; o `scripts/spikes/s0-06/spike-b-check.mjs preload`, no branch do spike, faz isso.

## Contexto

A Fase 2 já faz preconnect e preload dos **manifests** dos remotes (`app/layout.tsx`). Mas os chunks dos exposes e os dados só começam a baixar quando o usuário chega na rota — daí a cascata `ssr:false` → runtime do MF → remote → mount → fetch → paint. Esta task antecipa os próximos passos prováveis.

## Implementação

1. **Helpers** em `lib/federation.ts`:

   ```ts
   export function preloadTransactionsPage() {
     if (!shouldPreload()) return;
     ensureInstance().preloadRemote([
       { nameOrAlias: 'transactions', exposes: ['TransactionsPage'], resourceCategory: 'all' },
     ]);
   }

   function shouldPreload() {
     const connection = (
       navigator as Navigator & {
         connection?: { saveData?: boolean; effectiveType?: string };
       }
     ).connection;
     return !connection?.saveData && !['slow-2g', '2g'].includes(connection?.effectiveType ?? '');
   }
   ```

2. **Gatilhos**

   | Gatilho                                    | O que pré-carrega                                            |
   | ------------------------------------------ | ------------------------------------------------------------ |
   | Home ociosa (`requestIdleCallback`)        | Remote `transactions/TransactionsPage`                       |
   | `/transactions` ociosa                     | Remote `dashboard/Dashboard`                                 |
   | Hover ou foco num link do menu (`Sidebar`) | Remote da rota + `prefetchQuery` da 1ª página (ou do resumo) |
   | Página _n_ da lista carregada              | `prefetchQuery` da página _n + 1_                            |
   | Hover em "Nova transação"                  | Chunk do modal (`import()` antecipado)                       |

3. **DS:** o `Sidebar` ganha a prop `onLinkIntent?(href)`; o shell passa o handler. O DS continua sem saber de federação.
4. **Medição:** `performance.mark('nav:click')` → `performance.mark('transactions:ready')` quando a lista renderiza. Tempo clique → conteúdo antes/depois + print da aba Network.

## Validação

- [ ] Hover em "Transações" baixa os chunks do expose e a 1ª página antes do clique (aba Network)
- [ ] Navegar para a página 2 da lista não mostra loading (dados já no cache)
- [ ] Nada é pré-carregado com "Economia de dados" ativa ou em 2G
- [ ] Tempo clique → conteúdo menor que na baseline (anotado)

## Gotchas

1. Confira o formato do nome em `exposes` na versão instalada (`@module-federation/enhanced` 2.5.0) e valide pela aba Network se os chunks do expose baixam.
2. `preloadRemote` baixa, mas não executa: custo de CPU baixo. Mesmo assim, não dispare no primeiro paint — use idle.
3. O prefetch de dados usa as **mesmas** chaves de `keys.ts` e os mesmos parâmetros normalizados, senão o cache não é aproveitado.
4. Respeite `saveData` e redes lentas.
5. O preload dos manifests já existe desde a Fase 2; esta task é o passo seguinte (chunks + dados).
