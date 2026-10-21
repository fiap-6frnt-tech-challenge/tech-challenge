# Task 04 — Cache no servidor + prefetch no SSR (`HydrationBoundary`)

|                 |                                                                                         |
| --------------- | --------------------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 3 — Cache e criptografia](./README.md)                                          |
| **Owner**       | Dev 3 (Performance & Plataforma)                                                        |
| **Duração**     | 2 dias                                                                                  |
| **Prioridade**  | P0                                                                                      |
| **Branch**      | `dev3-perf/server-cache-ssr-prefetch`                                                   |
| **Depende de**  | S1-02 (casos de uso chamáveis no servidor), S1-06 (chaves do TanStack), S0-06 (Spike B) |
| **Desbloqueia** | S4-04 (relatório), S4-10 (LCP mobile)                                                   |
| **Requisito**   | Cache · pré-carregamento · melhoria no tempo de resposta                                |
| **Embasamento** | Arquiteturas Avançadas — Aula 4 · Princípios e Padrões — Aula 2 (Decorator)             |

---

> **Notas do Spike B (S0-06, 2026-09-30)** — [evidências](../sprint-0-foundation/06-risk-spikes.md#spike-b--evidências-e-aprendizados). A Parte B foi validada na home: `auth()` → `new QueryClient()` por requisição → `prefetchQuery` com `transactionKeys.list({})` → `HydrationBoundary` em volta dos remotes. O HTML já trouxe os dados, e o `AccountOverview` (remote) montou **sem** `GET /api/transactions`. Pontos para a implementação:
>
> - `HydrationBoundary`, `dehydrate` e `QueryClient` importam no Server Component, porque os módulos têm `'use client'`. O barrel do `@bytebank/api-client` também importa, mas instancia o `queryClient` singleton no servidor: nunca use esse objeto lá (gotcha 1).
> - O DTO precisa ter só tipos JSON, como hoje (`doublePrecision` → `number`, `text` → `string`). Um `Date` (ex.: `createdAt`) seria serializado de um jeito no SSR e de outro na API.
> - **O prefetch do resumo depende do gotcha 2.** `getDefaultSummaryRange()` faz a conta de mês no fuso local e depois usa `toISOString()` (UTC), então o `to` vira o dia seguinte entre 21h e 24h em Brasília. No servidor (UTC) a chave divergiria, e o remote refaria a busca.
> - **Página com prefetch fica dinâmica**, e a navegação SPA passa a esperar o roundtrip RSC. Em Slow 4G, o clique → `/transactions` foi de ~360 ms para ~870 ms quando a rota ficou dinâmica. Vale testar um `loading.tsx` por rota, para o skeleton aparecer já no clique (não testado).
> - O spike não avaliou `unstable_cache` nem `cacheComponents`, então a decisão da Parte A continua aberta.
> - O `scripts/spikes/s0-06/spike-b-check.mjs hydration`, no branch do spike, automatiza a checagem "sem requisição de dados depois do remote".

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

## Notas de implementação

**Parte A — cache do resumo no servidor**

- **API do Next 16.1.6.**
  - `unstable_cache` com tags funciona sem mudar o modo de renderização, e foi o adotado.
  - `'use cache'` + `cacheTag` ficou de fora: exige `cacheComponents: true`, que muda todas as páginas, e o spike não avaliou essa mudança.
  - O `revalidateTag` agora tem dois argumentos. Sem o segundo, o Next avisa que a forma está deprecada. Com `'max'`, a tag só fica _stale_, e a leitura seguinte ainda devolve o valor velho (stale-while-revalidate), o que não serve depois de uma mutação.
  - O `updateTag`, que expira na hora, só funciona em Server Action. Em Route Handler ele lança o erro `E872`.
  - Por isso o `NextCacheInvalidator` chama `revalidateTag('summary:<userId>', { expire: 0 })`, que expira a entrada na hora. Pelo template de rota do Next, a resposta da mutação só termina depois que a revalidação termina.
- **Decorator `CachedGetTransactionsSummary`** (core). Envolve o `GetTransactionsSummary`, que é o caso de uso que a rota `/summary` e o SSR usam. O `GetDashboardSummary` (12 meses, sem faixa) não serve nenhuma rota; por isso o nome difere do plano.
  - A leitura passa por uma porta nova, `ResultCache.remember({ key, tags }, load)`.
  - O adaptador `NextResultCache` (infra) usa `unstable_cache` com TTL de 5 min. A chave vai serializada em JSON numa parte só, porque o Next junta as partes com vírgula, e um `from=a,b` colidiria com outra faixa.
  - O `unstable_cache` também põe o `cb.toString()` na chave. No build de produção, o mesmo decorator aparece minificado de dois jeitos: `()=>this.summary.execute(e,t)` no chunk da rota e `(a,b)` no chunk da página. Com isso, o SSR e a API guardavam entradas separadas. O adaptador entrega ao Next uma função com `toString` fixo, porque a chave completa já vai nas `keyParts`. Assim a rota e a página compartilham a entrada.
- **A chave inclui a versão dos dados**: `['summary', userId, from, to, versão]`, com tag `summary:<userId>`. A versão é a mesma do ETag do S3-03 (`max(updated_at):count`). Só a tag não basta, porque há três casos em que a invalidação não alcança a entrada:
  1. Um GET que começou antes da mutação grava o resumo antigo **depois** da invalidação.
  2. No Docker (sem Vercel), o manifesto de tags fica em memória e as entradas ficam em disco. Um restart esquece as invalidações.
  3. Escritas fora dos casos de uso (seed, backfill).

  Nos três casos, o ETag faria o erro grudar no navegador. A rota responderia com o ETag da versão nova e o corpo velho, e os 304 seguintes manteriam o dado errado. Com a versão na chave, toda mutação muda a chave, e a tag continua limpando as entradas antigas.

  O custo é uma consulta de versão a mais por resumo (Index Only Scan, ~1 ms no S3-03). Sobra um caso raro: o caso 1 combinado com uma exclusão que volte a versão ao valor anterior. Ele fica limitado pelo TTL de 5 min.

- **Mutações.** `CreateTransaction`, `UpdateTransaction` e `DeleteTransaction` recebem o `CacheInvalidator` e chamam `invalidateUser(actor.userId)` depois de gravar. Entrada inválida ou transação de outro dono não invalida nada. Anexos não mexem no resumo e não invalidam a tag; como mudam a versão (S3-03), também trocam a chave.

**Parte B — prefetch no SSR**

- **Faixa padrão com fuso fixo.** `defaultSummaryRange()` fica no domínio do core. O `to` é a data de hoje no calendário de `America/Sao_Paulo`, e o `from` é o dia 1 do mês, 5 meses antes. O `dashboardSummaryQuery` do api-client e o SSR usam a mesma função (via `resolveSummaryRange`). Assim a chave bate entre o servidor (UTC) e o navegador, inclusive entre 21h e 24h. O `getDefaultSummaryRange()` antigo foi removido.
- **Chaves sem o barrel do cliente.** O servidor importa `@bytebank/api-client/keys` (subpath novo), que só tem as fábricas de chave, `normalizeTransactionsPageParams` e `resolveSummaryRange`. O `queryOptions.ts` passou a usar as mesmas funções. O Server Component não carrega hooks, Redux nem o `queryClient` singleton (gotcha 1).
- **`overviewKeys.me()` do plano não existe.** A chave do overview é `overviewKeys.all` (`['overview']`), a mesma do `useAccountOverview`.
- **`server/prefetch.ts`.** O fluxo é `auth()` → `new QueryClient()` por requisição → `prefetchQuery` → `dehydrate`.
  - Sem sessão, não busca nada.
  - Uma query que falha fica fora do estado, porque o `dehydrate` só leva `success`. O remote busca no cliente, como antes.
  - Na lista, o SSR lê a URL com o mesmo codec do remote (`fromBrowserSearchParams`), inclusive a página — não só a página 1. O caso de uso recebe exatamente o que a rota leria da requisição do remote (`toSearchParams` → `fromSearchParams`).
  - O JSON da lista sai do mesmo presenter da rota (`publicTransactionsPage`). Overview e resumo já eram o retorno direto dos casos de uso.
- **`loading.tsx` por rota.** Com o prefetch, `/` e `/transactions` passam a ser dinâmicas (`ƒ`). O `loading.tsx` faz o skeleton aparecer no clique, porque o `<Link>` pré-carrega a rota até o boundary. Ele também deixa o HTML sair antes das consultas (streaming).
  - A home foi para o route group `app/(home)/`. Um `app/loading.tsx` valeria para todas as rotas do layout raiz, e `/login` e `/register` mostrariam o skeleton do dashboard.
  - Os skeletons são os mesmos do `loading` do `next/dynamic` (exportados de `AccountOverviewRemote` e `TransactionsRemote`).
- **E2E que dependiam do fetch no cliente.**
  - O `http-cache.spec.ts` agora faz o `fetch` pela própria página para passar pelo cache HTTP do navegador, porque os remotes não buscam mais no load.
  - O teste de 401 do `session-hardening.spec.ts` dispara a busca da lista digitando no filtro.
  - O `globalSetup` cria um segundo usuário (`e2e.other@bytebank.test`) para o teste com 2 contas.
- **Preload de dados no hover (S2-08) ficou redundante na navegação SPA.** Os dados chegam no payload RSC junto com a página, e o remote não monta antes disso. O `routePreload` ainda busca pela API no hover, o que custa uma consulta a mais por hover. Ele fica como candidato a remoção no S4-04 (o smoke do S2 depende dele).
- **Achados para o Sprint 4** (viraram a [S4-10 — LCP mobile](../sprint-4-audit-delivery/10-mobile-lcp.md)).
  - O `AppShell` só renderiza a página depois que o cliente busca `/api/auth/session` (`isAuthenticated`). É mais um roundtrip antes de o remote começar a carregar, e o Lighthouse mostra **duas** requisições de sessão por carga. Passar a sessão do servidor ao `SessionProvider` tiraria esse passo da cascata.
  - Os dados nunca estiveram no caminho do LCP mobile, e por isso o LCP não mudou (ver Evidências).
    - Na home, o elemento de LCP é a ilustração do `BalanceCard`, dentro do remote. O _load delay_ dela é ~3,4 s antes e depois: a imagem só é pedida quando o remote monta, depois do JS do shell, da sessão e do JS do remote.
    - Em `/transactions`, o elemento de LCP é o `h1` do remote, que aparece com ou sem dados. O _render delay_ é ~5,3 s antes e depois.
    - Para mover o LCP, é preciso começar o remote mais cedo (sessão vinda do servidor, preload do remote da rota atual) ou renderizar o conteúdo do remote no servidor.

## Testes

- [x] Core: `defaultSummaryRange` (21h–24h em Brasília, virada de mês à meia-noite de Brasília, virada de ano)
- [x] Core: decorator — 2ª leitura do mesmo usuário e faixa sai do cache; chave com usuário, faixa e versão; tag por usuário; usuário B nunca recebe o resumo de A; recalcula depois de uma mutação mesmo sem a tag; invalidar a tag de A não afeta B
- [x] Core: criar, editar e excluir invalidam o ator; entrada inválida e transação de outro dono não invalidam
- [x] api-client: `normalizeTransactionsPageParams` e `resolveSummaryRange` (faixa de Brasília num relógio UTC)
- [x] Shell: `NextResultCache` (chave numa parte, tags, TTL; mesma fonte de função para rota e página; chaves com vírgula não colidem) e `NextCacheInvalidator` (`{ expire: 0 }`)
- [x] Shell: `prefetch.ts` — sem sessão não busca; chaves iguais às do `accountOverviewQuery`, `dashboardSummaryQuery` e `transactionsPageQuery`; caso de uso recebe o que a rota leria da requisição do remote; um cache por requisição; query que falha fica fora do estado; URL inválida cai na página 1 sem filtro, como no remote
- [x] Integração (Postgres): resumo guardado por usuário e versão; criar, editar e excluir revalidam `summary:<userId>`; outro usuário não vê o resumo
- [x] E2E `ssr-prefetch.spec.ts`: home e `/transactions` sem `GET /api/transactions*` depois do remote; 2 contas — HTML do SSR e resumo do cache sem dado da outra conta; mutação de A muda o resumo de A e não o de B

## Validação

- [x] Home e `/transactions` montam sem requisição de dados depois do remote (E2E no Chromium e no Firefox; no Lighthouse, 0 requisições de dados em 10 cargas, contra 10 antes)
- [x] Resumo servido do cache do servidor na segunda requisição; invalidado depois de uma mutação (log do `NEXT_PRIVATE_DEBUG_CACHE`, abaixo)
- [x] Teste com 2 usuários: nenhum vê dado do outro (SSR e cache) — E2E com 2 contas
- [ ] LCP mobile melhor que a baseline (anotado): **não atingido — o LCP mobile não muda em nenhuma das páginas.** A medição controlada (10 × 10, Mann-Whitney exato) dá IC 95% da diferença de [−140, +90] ms na home e [−124, +208] ms em `/transactions`. O motivo é estrutural: o elemento de LCP não depende dos dados (ver Achados para o Sprint 4). A melhora do LCP continua na [S4-10](../sprint-4-audit-delivery/10-mobile-lcp.md). O que a task melhora, de forma mensurável:
  - a requisição de dados sai da cascata (10 → 0 cargas com requisição);
  - o conteúdo fica pronto ~160 ms mais cedo depois que o remote carrega, nas duas páginas (p < 0,001).

## Evidências — 2026-10-20

Ambiente local: build de produção (standalone), Postgres 16 descartável, conta `perf.user` com 5 mil transações (`db:seed-load`), máquina de 4 núcleos e 3,8 GB.

| Validação                                      | Resultado                                                                                                                                                                                                                                                                          |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Testes unitários                               | core 210, api-client 71, shell 244, shared 114, stores 37 — todos aprovados                                                                                                                                                                                                        |
| Integração (Postgres descartável)              | 82 aprovados (inclui o novo teste do container)                                                                                                                                                                                                                                    |
| `next build`                                   | `/` e `/transactions` passam de `○` para `ƒ`                                                                                                                                                                                                                                       |
| E2E (Chromium e Firefox)                       | suíte completa no build final: 50 aprovados (12 pulados são o smoke opt-in do S2); smoke do S2 com `SPRINT2_SMOKE=1`: 15 aprovados, inclusive o preload no hover                                                                                                                   |
| `npm run arch:check`                           | sem violações                                                                                                                                                                                                                                                                      |
| Cache do resumo (`NEXT_PRIVATE_DEBUG_CACHE=1`) | 1ª leitura: `get … false` + `set` (224 ms); 2ª e 3ª: `get … true` (18 e 33 ms); POST: `revalidateTag ['summary:perf-user'] { expire: 0 }`; leitura seguinte: chave nova (versão mudou), saldo +10; DELETE: a versão volta à original, e o Next responde `expired tags` e recalcula |
| SSR e API na mesma entrada                     | home (SSR) grava a entrada; a API e a home seguinte leem a mesma (`get … true`)                                                                                                                                                                                                    |
| HTML do SSR                                    | traz `["overview"]`, `["summary",{"from":"2026-05-01","to":"2026-10-20"}]` e, em `/transactions?type=deposit&page=2`, a chave da página 2 com o filtro — iguais às do cliente                                                                                                      |

**Lighthouse mobile — protocolo controlado.** A/B entre o build da `main` (antes) e o desta branch (depois).

- **Amostras:** 10 por build e por página, intercaladas em ordem ABBA.
- **Memória:** Chrome do usuário fechado; VM do WSL/Docker limitada a 1 GB (`.wslconfig`, só durante a medição); os dois MFEs servidos por um único servidor estático.
- **Cada amostra:**
  1. reinicia o servidor e cria sessão nova;
  2. faz uma carga completa de aquecimento (Playwright, até a marca `*:ready` do remote);
  3. espera ≥ 400 MB livres (até 60 s);
  4. roda o Lighthouse.
- **Regra de travamento**, definida antes de ver os resultados: a amostra é descartada se o scripting do chunk do framework passar de 2× a mediana. Esse chunk é idêntico nos dois builds, então o tempo dele só mede o estado da máquina. Nenhuma das 40 amostras foi descartada.
- **Estatística:** Mann-Whitney exato e intervalo de Hodges-Lehmann.

| Página          | Métrica                   | Antes (mediana [Q1–Q3]) | Depois (mediana [Q1–Q3]) |       Diferença — IC 95% |       p |
| --------------- | ------------------------- | ----------------------: | -----------------------: | -----------------------: | ------: |
| `/`             | LCP                       |  5.199 ms [5.108–5.220] |   5.117 ms [5.075–5.220] |       −39 [−140, +90] ms |    0,48 |
| `/`             | TBT                       |        502 ms [372–588] |         671 ms [529–711] |      +138 [−59, +267] ms |    0,11 |
| `/`             | Remote carregado → pronto |        278 ms [253–350] |     **126 ms** [101–159] | **−158 [−225, −112] ms** | 0,00001 |
| `/transactions` | LCP                       |  5.845 ms [5.746–5.934] |   5.797 ms [5.753–5.867] |       −6 [−124, +208] ms |    0,91 |
| `/transactions` | TBT                       |        553 ms [513–597] |         575 ms [510–695] |       +28 [−59, +191] ms |    0,63 |
| `/transactions` | Remote carregado → pronto |        294 ms [230–381] |     **144 ms** [108–171] |  **−166 [−274, −86] ms** |  0,0001 |

- **LCP:** não muda em nenhuma página. Os intervalos cobrem o zero e são estreitos (±0,2 s), então o resultado é conclusivo: o ganho de LCP, se existe, é menor que isso. O elemento de LCP não depende dos dados (ver Achados para o Sprint 4).
- **Remote carregado → pronto:** é o passo que a task tira da cascata — a marca `*:ready` do remote menos o fim do `mf:loadRemote`, no trace observado. Cai ~160 ms nas duas páginas. A requisição de dados some em todas as cargas (10 → 0 por página).
- **TBT:** a diferença não é significativa em nenhuma página. Na home, o intervalo não descarta um aumento de até ~0,27 s; vale reavaliar no S4-04 em hardware estável.
- **Medições anteriores descartadas:** um best-of-3 em blocos e um A/B 5 × 5 mais cedo no mesmo dia, sem controle de memória (~240 MB livres), deram resultados contraditórios. Em várias execuções, o mesmo chunk do framework levou até 5,3 s, contra os ~0,8 s normais — travamento por swap, não código. Esses números não entram na conclusão.

## Gotchas

1. **Vazamento entre usuários:** o `queryClient` exportado do `api-client` é singleton de módulo. No servidor ele seria compartilhado entre requisições. Sempre `new QueryClient()` por requisição no Server Component.
2. As chaves precisam ser idênticas às do cliente, inclusive a faixa de datas padrão do resumo. Calcule `defaultSummaryRange()` numa função do core com fuso fixo (America/Sao_Paulo), usada pelos dois lados.
3. Os remotes montam com `ssr:false`, mas o `HydrationBoundary` fica no shell, acima deles e dentro do `QueryClientProvider` do `providers.tsx`: os dados entram no cache antes de o remote montar.
4. Chave e tag do cache do servidor sempre com `userId`.
5. `staleTime` > 0 no cliente (S3-06), senão o remote refaz a busca logo depois de hidratar.
