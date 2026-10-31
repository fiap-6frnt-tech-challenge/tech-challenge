# Task 10 — LCP mobile: tirar o elemento de LCP da cascata dos remotes

|                 |                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------ |
| **Sprint**      | [Sprint 4 — Auditoria e entrega](./README.md)                                              |
| **Owner**       | Dev 3 (Performance & Plataforma) — Dev 2 na Parte A (sessão e Redux)                       |
| **Duração**     | 2 dias (+0,5 dia de spike opcional, Parte D)                                               |
| **Prioridade**  | P1                                                                                         |
| **Branch**      | `dev3-perf/mobile-lcp`                                                                     |
| **Depende de**  | S3-04 (prefetch no SSR, `loading.tsx`), S3-05 (CSP com nonce)                              |
| **Desbloqueia** | Task 04 (linha de LCP mobile do relatório), meta 16 do [PLAN.md](../PLAN.md) (mobile ≥ 85) |
| **Requisito**   | Melhoria no tempo de resposta · pré-carregamento                                           |
| **Embasamento** | Arquiteturas Avançadas — Aula 4 (Performance)                                              |

---

## Contexto

O S3-04 tirou a busca de dados da cascata, mas o LCP mobile **não mudou**. O A/B controlado deu IC 95% de [−140, +90] ms na home e [−124, +208] ms em `/transactions`, contra ~160 ms de ganho no "conteúdo pronto" ([evidências](../sprint-3-cache-security/04-server-cache-ssr-prefetch.md#evidências--2026-10-20)). A meta do PLAN.md é Lighthouse mobile ≥ 85 nas duas páginas; o S0-04 mediu 68 / 71 em produção.

O motivo é que o elemento de LCP só aparece no fim de uma cascata serial, e os dados nunca estiveram nela. A sequência abaixo vem do trace do Lighthouse (build do S3-04):

```
HTML → JS do shell (~270 kB, 14 chunks) → hidratação
  → /api/auth/session (2×)                 trava do AppShell (isAuthenticated)
  → runtime do MF do shell (49 kB, lazy)   lib/federation
  → remote entry (114 kB) + expose
  → remote monta → elemento de LCP → pintura
```

O Lighthouse mobile simula 150 ms de RTT, 1,6 Mbps e CPU 4× mais lenta. Cada seta custa pelo menos um RTT mais o download.

| Página          | Elemento de LCP                                        | Fase dominante                                                  |
| --------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| `/`             | ilustração do `BalanceCard` (`/piggy-bank.png`, 11 kB) | _load delay_ ~3,4 s: a imagem só é pedida quando o remote monta |
| `/transactions` | `h1#transactions-heading`, dentro do remote            | _render delay_ ~5,3 s de JS                                     |

Há três alavancas: tirar o elemento de LCP da cascata (Partes A e B), paralelizar a cascata (Parte C) e reduzir bytes e CPU em cada passo (Partes C e D).

## Parte A — sessão vinda do servidor, sem a trava no cliente (Dev 2 + Dev 3)

Hoje o `AppShell` renderiza `{isAuthenticated ? children : null}`. Com isso, o `<main>` do HTML chega vazio, e a página espera o `/api/auth/session` do cliente (duas requisições) antes de renderizar qualquer coisa. O proxy e o `auth()` das páginas já protegem as rotas no servidor; a trava não acrescenta segurança.

1. `app/layout.tsx` chama `auth()` e passa a sessão para o `Providers`, que a entrega ao `SessionProvider`. Com a sessão inicial, o NextAuth não busca `/api/auth/session` na carga.
2. A sessão entra no `authSlice` antes do primeiro render, por `dispatch(setSession(...))` uma única vez. O store não pode ser recriado: ele é o singleton compartilhado com os MFEs.
3. O `AppShell` passa a esconder `children` só quando o cliente sabe que a sessão **acabou** (logout em andamento, sessão expirada ou revogada), não enquanto ela é desconhecida. Os testes do S2-07 (`session-hardening.spec.ts`) garantem que logout e expiração continuam limpando o conteúdo privado.

**Resultado esperado:** nenhuma requisição de sessão antes do remote começar a carregar, e o skeleton da rota já vem no HTML do servidor.

## Parte B — elemento de LCP no HTML do servidor

Com a Parte A, o skeleton da rota (`loading.tsx` e o `loading` do `next/dynamic`) passa a sair no HTML. Ele deve trazer o conteúdo real e estável que hoje é o elemento de LCP, no mesmo lugar e no mesmo tamanho:

- **`/transactions`:** o `h1` "Transações" com as classes do `#transactions-heading`, no lugar da barra de `Skeleton`.
- **Home:** a ilustração do `BalanceCard` (decorativa, `aria-hidden`), com o mesmo tamanho e posição, mais `<link rel="preload" as="image" fetchpriority="high">` para ela.

Quando o remote monta, ele troca o elemento por um idêntico. Não surge um candidato de LCP maior, e o CLS fica em 0.

- **Sem divergência entre shell e remote:** o cabeçalho da página e a ilustração vão para o Design System, e o remote e o skeleton usam o mesmo componente.
- **Acessibilidade:** só um `h1` por vez (o skeleton sai quando o remote monta). A região da lista continua com `aria-busy` enquanto carrega.
- **Não é maquiagem:** o conteúdo antecipado é o mesmo que o remote mostra. O conteúdo que depende dos dados continua medido pelo "conteúdo pronto" do S3-04, e o relatório mostra as duas métricas.

## Parte C — pré-carregar o remote da rota atual

Hoje só o manifest é pré-carregado (`layout.tsx`). O runtime, o remote entry e o expose esperam a trava da Parte A e o `import('@/lib/federation')`, um depois do outro.

1. **No servidor:** emitir `<link rel="preload" as="script">` para o remote entry e para o expose da rota atual. As URLs vêm do `mf-manifest.json` do remote, lido no servidor com cache curto: `metaData.publicPath` + `metaData.remoteEntry.name` (do tipo `global`, script clássico) e `exposes[].assets.js.sync`.
2. **No cliente:** disparar o `preloadRemote` da rota atual na inicialização (hoje só o hover e o idle disparam, e só para a próxima rota). O import do `lib/federation` começa junto, sem esperar a montagem.
3. **Adiar o `preloadLikelyNextRoute`** para depois da marca `*:ready` da página atual. Em `/transactions`, ele baixou o remote do dashboard (114 kB + expose) no meio da carga, disputando rede e CPU.

## Parte D — spike (timebox 0,5 dia, opcional): runtime do MF duplicado

Cada remote entry (~114 kB) leva o próprio runtime do Module Federation (`__FEDERATION__`, `loadRemote`, snapshot), e o shell já baixou o dele (49 kB). O MF 2.x tem um modo em que o host fornece o runtime aos remotes (`experiments.externalRuntime` nos remotes e `provideExternalRuntime` no host).

Falta confirmar se isso funciona com o nosso host, que usa a API de runtime direto no Next/Turbopack, sem o plugin de bundler. O spike registra a decisão e o ganho em kB por remote, mas só entra no código se couber no prazo.

## Fora do escopo — SSR dos remotes

É o único caminho que põe no HTML o conteúdo que **depende dos dados** (saldo, lista). Exige build dos remotes para Node e renderização no servidor. O Next App Router com Module Federation e SSR não tem suporte oficial (o `nextjs-mf` está descontinuado para o App Router), e as fronteiras de RSC complicam.

A alternativa, mover a parte visível da tela para Server Components do shell, quebra a posse dos MFEs exigida pela Fase 2. Registrar como passo futuro na documentação de arquitetura (Task 06).

## Notas de implementação

- **Sessão no servidor (A).**
  - `server/session.ts` expõe `currentSession = cache(() => auth())`. Layout, prefetch e as páginas de login, cadastro e segurança passam a validar a sessão uma vez por requisição; antes, cada `auth()` ia ao banco.
  - O layout passa a sessão ao `Providers`, que a entrega ao `SessionProvider`. Com a sessão inicial, o NextAuth não busca `/api/auth/session` na montagem; foco e polling continuam buscando.
  - `storeForSession` (`app/sessionStore.ts`): no servidor, cria **um store por requisição**. O singleton é compartilhado entre requisições no servidor, e semeá-lo vazaria a sessão de um usuário para outro. No cliente, semeia o singleton uma única vez, antes do primeiro render. O cabeçalho e a saudação saem no HTML sem divergência na hidratação.
  - `authSlice.sessionEnded`: fica `true` em `clearSession`, `setSession(null)` e `logout.pending`, continua `true` no `rejected` e sobrevive ao `resetClientState`. O `AppShell` esconde o conteúdo só nesse caso.
  - O `SessionSync` só despacha `setSession` quando a sessão muda, então não repete a semeadura na carga.
- **Elemento de LCP no HTML (B).**
  - O DS ganhou `PageHeading` e `BalanceIllustration` (com `BALANCE_ILLUSTRATION_SRC`), usados pelo remote e pelos skeletons do shell.
  - O preload da ilustração usa `preload()` do React, e o Next o envia no header HTTP `Link` (`fetchpriority="high"`), antes do HTML.
  - A geometria foi medida no Chromium (412 e 1280 px): `h1` e ilustração têm a mesma posição e o mesmo tamanho no skeleton e no remote. Foram necessários dois ajustes:
    - a barra da ação do `h1` usa px (`h-[44px]`), porque o `IconButton` usa `min-h-[44px]` e no mobile o rem é escalado;
    - as barras de texto ficam dentro de um elemento com a mesma tipografia do texto real, então a altura da linha é idêntica, em vez de alturas fixas.
  - O `h1` do skeleton não tem `id`; o `#transactions-heading` continua exclusivo do remote.
  - A lista abaixo do cartão depende dos dados (quantidade e quebra de linha) e não fica idêntica. No mobile ela está abaixo da dobra.
- **Pré-carregamento (C).**
  - `server/remotePreload.ts` lê o manifest do remote (`fetch` com `revalidate: 60` e timeout de 1 s; sem manifest, sem preload) e emite o remote entry e os chunks `sync` do expose da rota.
  - Os preloads saem no `<head>` com o nonce do CSP e **sem** `crossorigin`, porque o runtime do MF injeta os scripts sem esse atributo e reaproveita o `<link>` com o mesmo `href`.
  - Os preloads usam `fetchPriority: 'low'`. Com a prioridade padrão (`High`), o Lighthouse conta o script pré-carregado como bloqueante de renderização. Na 1ª rodada do A/B, o FCP piorou 442 ms em `/` e 282 ms em `/transactions`. Com `low`, eles ainda começam cedo, mas não disputam banda com o CSS. O `<script>` que o runtime do MF injeta depois (com `fetchpriority="high"`) reaproveita o preload.
  - No Docker Compose, o container do shell não alcança `localhost:3003`, então não há preload do servidor (sem erro).
  - No cliente, `preloadCurrentRoute` pré-carrega só o remote acima da dobra. Na home é o `AccountOverview`; o `Dashboard` continua no `DeferUntilVisible`.
  - `preloadLikelyNextRouteWhenReady` espera a marca `*:ready` da rota (`onContentReady` no `shared`, com `PerformanceObserver`) e só então agenda o `whenIdle`.
- **Série de saldo por dia (orçamento do HTML).**
  - Na primeira medição completa, o FCP de `/` subiu 164 ms. O Lighthouse simula o início da conexão TCP: os primeiros 14,6 kB (10 × 1.460 B) chegam numa ida e volta, e o restante custa outra (150 ms no perfil mobile). O HTML da home tinha 13,6 kB comprimidos e, com header, skeleton e sessão (+2,9 kB), foi a 16,5 kB. Em `/transactions` (8,7 kB), o mesmo acréscimo custou 9 ms.
  - O que enchia o HTML da home era o `balanceOverTime` do resumo que o S3-04 desidrata no HTML: um ponto por transação. Para o `perf.user`, eram 1.250 pontos em 168 dias, 53 kB sem compressão.
  - A série passou a ter um ponto por dia, com o saldo de fim de dia: `cumulativeBalance` no core e `balanceSeries` no SQL (`sum(sum(…)) over (order by date)` com `group by date`). A linha do gráfico é a mesma na resolução de dia, e a consulta custa o mesmo (3–16 ms nos dois formatos, `EXPLAIN ANALYZE`).
  - Atualização otimista: uma transação num dia que já tem ponto soma nesse ponto. Quando uma edição tira a transação de um dia, o ponto sai se o dia deixar de mover o saldo. Se o dia ainda tiver outra transação de saldo neutro, o ponto volta no refetch que a mutação já dispara.
- **Spike do runtime externo (D):** não executado (timebox).
- **E2E.**
  - O header com o nome do usuário agora vem no HTML do servidor, antes da hidratação. O helper `login()` passou a esperar também o remote da home montar ("Exibir saldo"), que só acontece depois da hidratação.
  - `openTransactionsPage` espera o `#transactions-heading` (só existe no remote), porque o skeleton já mostra o `h1` "Transações".

## Medição

- **Local — A/B controlado** (o protocolo que tornou o S3-04 conclusivo):
  - 10 amostras por build, intercaladas em ordem ABBA.
  - A cada amostra: reiniciar o servidor, fazer uma carga de aquecimento até a marca `*:ready` e esperar memória livre (≥ 400 MB).
  - Regra de travamento definida antes de ver os resultados: o scripting do chunk do framework (hash igual nos dois builds) passar de 2× a mediana.
  - Estatística: Mann-Whitney exato e intervalo de Hodges-Lehmann.
  - Nesta máquina (3,8 GB), fechar o Chrome e limitar a VM do WSL/Docker a 1 GB (`.wslconfig`) durante a medição.
  - Versionar o script em `scripts/perf/` como parte desta task.
- **Produção:** Lighthouse best-of-3 (meta 16 do PLAN.md e Task 04). O PageSpeed Insights não alcança páginas autenticadas.
- **Métricas:** LCP, FCP, TBT e CLS, mais o "conteúdo pronto" (marca `*:ready` do remote menos o fim do `mf:loadRemote`) e as requisições feitas antes de o remote montar.

## Validação

- [x] Nenhuma requisição a `/api/auth/session` antes de o remote montar; o `<main>` do HTML do servidor traz o skeleton
- [x] Elemento de LCP pintado a partir do HTML do servidor nas duas páginas, com CLS = 0
- [x] LCP mobile menor em `/` e `/transactions`, com IC 95% que exclui zero (A/B controlado, 10 × 10)
- [x] TBT e "conteúdo pronto" sem piora (IC 95%)
- [x] FCP sem efeito na nota: +14 ms em `/` e +11 ms em `/transactions`, o custo da sessão no servidor (TTFB); o FCP pontua 1 em todas as amostras
- [x] E2E verdes, inclusive `session-hardening.spec.ts` (logout e expiração limpam o conteúdo privado) e `ssr-prefetch.spec.ts`

## Gotchas

1. **CSP (S3-05).** Com `'strict-dynamic'`, um `<link rel="preload">` vindo do HTML precisa do nonce da requisição. Os preloads do próprio Next já saem com nonce.
2. **O preload precisa ter os mesmos atributos do request final** (`as="script"` e o mesmo `crossorigin` que o runtime do MF usa). Se não tiver, o navegador baixa o arquivo duas vezes.
3. **`auth()` no layout deixa todas as rotas dinâmicas.** Com o nonce do S3-05, isso já acontece; o `loading.tsx` mantém o skeleton imediato na navegação SPA.
4. **O store Redux é singleton compartilhado com os MFEs** ([MFE state](../../../packages/stores/src/store.ts)). Semeie a sessão por `dispatch`; nunca crie outro store.
5. **Nesta máquina, nunca compare execuções soltas.** Sem o protocolo controlado, o swap gera 5–8 s de TBT e resultados contraditórios (S3-04).
6. **O conteúdo antecipado tem que ser idêntico ao do remote.** Se for diferente, o remote gera um novo candidato de LCP ou layout shift, e o ganho some ou vira CLS.
7. **Orçamento de 14,6 kB do HTML.** O Lighthouse cobra mais uma ida e volta (150 ms no mobile) do documento que passa de 14,6 kB transferidos, cabeçalhos incluídos. Antes de pôr mais coisa no HTML do servidor, confira o `transferSize` do documento no relatório.

## Evidências — 2026-10-29

Ambiente local: build de produção (standalone), Postgres 16 descartável, conta `perf.user` com 5 mil transações (`db:seed-load`), máquina de 4 núcleos e 3,8 GB.

| Validação                                   | Resultado                                                                                                                                                                                                                                    |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Testes unitários                            | stores 42, shared 116, core 267 (série por dia e projeção otimista igual ao resumo recalculado), api-client 80, dashboard-mfe 16, shell 312 (inclui `sessionStore`, `remotePreload`, `routePreload`), transactions-mfe 186 — todos aprovados |
| Integração (Postgres descartável)           | 94 aprovados, inclusive a equivalência com as regras JS (`storeEquivalence`) e o dia com três transações num ponto só                                                                                                                        |
| Stories (Chromium headless)                 | DS 213 (inclui `PageHeading` e `BalanceIllustration`), transactions-mfe 55 — todas aprovadas                                                                                                                                                 |
| Tipos, lint e `npm run arch:check`          | `tsc` limpo em shared, design-system, transactions-mfe e shell; ESLint sem erros (só os avisos antigos de imports do `shared`); sem violações de dependência                                                                                 |
| E2E (Chromium e Firefox), build final       | 68 aprovados, 12 pulados (smoke opt-in do S2), também no build com a série por dia, incluindo o teste novo do `ssr-prefetch.spec.ts` (elemento de LCP e preloads no HTML, nenhum `/api/auth/session` na carga)                               |
| HTML do servidor                            | `<main>` com o skeleton nas duas páginas; `h1` "Transações" e `<img src="/piggy-bank.png">` no HTML; preloads do remote entry e do expose no `<head>` com nonce; preload da ilustração no header HTTP `Link` (`fetchpriority="high"`)        |
| Geometria skeleton × remote (Chromium)      | 412 px: ilustração em (65, 315, 283×229) nos dois; `h1` 376×73 nos dois. 1280 px: ilustração em (289, 183) nos dois; `h1` 952×76 nos dois. Altura do cartão igual (494 / 357 px)                                                             |
| Rede e CPU limitadas (150 ms, 1,6 Mbps, 4×) | uma única entrada de LCP, vinda do skeleton (ilustração aos 900 ms em `/`; `h1` aos 920 ms em `/transactions`); CLS 0; nenhum `/api/auth/session`; expose pedido aos ~600 ms                                                                 |

**Lighthouse mobile — protocolo controlado** (`scripts/perf/lh-ab.mjs` e `lh-ab-analyze.mjs`). A/B entre o HEAD da `phase-4` (antes) e esta branch com a série de saldo por dia (depois), com os dois MFEs servidos por um único servidor estático com gzip.

- **Amostras:** 10 por build e por página, em ordem ABBA. Cada amostra reinicia o servidor, cria uma sessão nova, aquece até a marca `*:ready` e espera memória livre (até 60 s) antes do Lighthouse.
- **Memória:** Chrome do usuário fechado e VM do WSL/Docker limitada a 1 GB (`.wslconfig`, só durante a medição). As amostras começaram com 550–780 MB livres.
- **Regra de travamento:** a mesma do S3-04, com o chunk do framework (`19zxo_j3gzaa9.js`, igual nos dois builds). Foram descartadas 2 das 40 amostras, ambas de "depois" (2,7 s e 1,7 s de scripting, para um limite de 1,55 s). O LCP delas (2.693 e 2.571 ms) não mudaria a conclusão.
- **Execução:** uma primeira tentativa parou na 6ª amostra, porque o aquecimento passou de 30 s logo depois do reinício da VM. O runner agora repete a amostra quando o aquecimento falha, e a rodada foi refeita do zero.

| Página          | Métrica                              | Antes (mediana [Q1–Q3]) |   Depois (mediana [Q1–Q3]) |             Diferença — IC 95% |       p |
| --------------- | ------------------------------------ | ----------------------: | -------------------------: | -----------------------------: | ------: |
| `/`             | LCP                                  |  4.132 ms [4.029–4.315] | **2.512 ms** [2.238–2.520] | **−1.791 [−1.999, −1.508] ms** | 0,00002 |
| `/`             | FCP                                  |        774 ms [770–776] |           787 ms [783–804] |               +14 [+6, +35] ms |    0,01 |
| `/`             | TBT                                  |        575 ms [494–703] |           450 ms [387–533] |            −131 [−305, +33] ms |    0,13 |
| `/`             | CLS                                  |                   0,000 |                      0,000 |                              0 |       — |
| `/`             | Remote carregado → pronto            |        239 ms [224–259] |          **54 ms** [50–62] |       **−185 [−209, −157] ms** | 0,00002 |
| `/`             | `/api/auth/session` na carga         |                       2 |                      **0** |                             −2 | 0,00002 |
| `/transactions` | LCP                                  |  4.633 ms [4.510–4.753] | **2.507 ms** [2.374–2.533] | **−2.168 [−2.329, −2.025] ms** | 0,00002 |
| `/transactions` | FCP                                  |        778 ms [775–790] |           795 ms [784–807] |               +11 [+1, +28] ms |    0,04 |
| `/transactions` | TBT                                  |        608 ms [568–683] |           511 ms [400–581] |             −120 [−247, +7] ms |    0,07 |
| `/transactions` | CLS                                  |                   0,000 |                      0,000 |                              0 |       — |
| `/transactions` | Remote carregado → pronto            |        203 ms [183–218] |          **89 ms** [75–97] |        **−117 [−143, −83] ms** | 0,00004 |
| `/transactions` | Requisições antes de o remote montar |              29 [28–29] |                 25 [25–25] |                    −4 [−4, −3] | 0,00002 |
| `/transactions` | `/api/auth/session` na carga         |                       2 |                      **0** |                             −2 | 0,00002 |

- **LCP** cai 1,8 s em `/` e 2,2 s em `/transactions`, com intervalos estreitos e longe do zero.
  - Em "depois", o elemento de LCP é o do HTML do servidor: a ordem de atributos é a do `<img>` do SSR, e o `h1` é o do skeleton, sem `id`.
  - Em `/`, ele é a ilustração em todas as amostras. Em `/transactions`, é o `h1` em 8 das 9; na outra, é o logo do header, com área quase igual à do texto do `h1` e no mesmo tempo.
- **"Conteúdo pronto"** melhora nas duas páginas. O remote começa a carregar antes, porque não espera mais a sessão.
- **TBT:** sem piora. As medianas caem ~0,1 s, mas os intervalos ainda cobrem o zero.
- **FCP:** +14 ms em `/` e +11 ms em `/transactions` (menos de um quadro). É o mesmo aumento do TTFB (mediana de 38 para 52 ms e de 34 para 45 ms).
  - O layout valida a sessão e renderiza o shell personalizado antes do primeiro byte. O banco só é consultado a cada 5 min (`SESSION_CHECK_MS`).
  - O FCP pontua 1 nas 40 amostras dos dois builds, então a nota não muda.
- **HTML da home:** de 13,6 para 11,6 kB transferidos, abaixo dos 14,6 kB. A série tem 168 pontos em vez de 1.250. `/transactions` vai de 6,5 para 8,7 kB.
- **Nota mobile local (mediana [faixa]):** `/` 71,5 [63–78] → 86,5 [67–96]; `/transactions` 68 [63–75] → 85 [70–89]. A nota oscila com o TBT desta máquina. A meta 16 (≥ 85) precisa da medição em produção (Task 04).
- **Rodadas anteriores** (fora da conclusão):
  - **1ª**, com os preloads em `High`: o FCP piorava 442 ms. Daí o `fetchPriority: 'low'`. Números em `perf/ab/results-high.md`.
  - **2ª:** usou por engano o `dist` antigo dos MFEs no build "depois". O `prepare` agora imprime os hashes dos exposes copiados.
  - **3ª**, sem a série por dia: LCP −1.704 ms em `/` e −2.200 ms em `/transactions`, mas o FCP de `/` subia 164 ms [+154, +188] porque o HTML passava de 14,6 kB. Daí a série por dia. Números em `perf/ab/results.md`.
- **Produção:** pendente do deploy da `phase-4` (Task 09). Rodar o Lighthouse best-of-3 e registrar na Task 04.
