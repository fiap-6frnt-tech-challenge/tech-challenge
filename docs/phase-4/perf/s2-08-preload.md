# S2-08 — Pré-carregamento: antes × depois

> Medição da task [S2-08](../sprint-2-state-reactive/08-preload.md): preload dos remotes na
> ociosidade e na intenção de navegação, `prefetchQuery` dos dados da rota e da página seguinte da
> lista, e o modal "Nova transação" sob demanda.
>
> Owner: Dev 3 (Performance & Plataforma)

## Condições da medição

|                |                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| **Data**       | 18/10/2026                                                                                             |
| **Código**     | branch `dev3-perf/preload` (base `8c6525e`)                                                            |
| **Máquina**    | a mesma da baseline (i3-1115G4, 4 núcleos, 3,8 GB de RAM)                                              |
| **Servidor**   | `next build` + `node e2e/startShellStandalone.mjs` na :3000, MFEs em `rsbuild preview` (:3002 e :3003) |
| **Rede**       | Slow 4G via CDP: 150 ms de latência, 1,6 Mbps de download, 750 kbps de upload (perfil do Spike B)      |
| **Viewport**   | 1366 × 900 (desktop, menu lateral)                                                                     |
| **Dados**      | `perf.preload@bytebank.test` com 25 transações (3 páginas de 10)                                       |
| **Ferramenta** | `node scripts/perf/preload-nav.mjs` (Playwright + CDP), 3 pares intercalados por rota                  |

### Método

- **Antes = perfil `sem-preload`.** O script emula `navigator.connection.saveData = true`. Com isso
  `shouldPrefetch()` devolve `false` e nenhum gatilho da task dispara, então a navegação segue o
  caminho de antes da task, na mesma build e na mesma sessão. A baseline do S0-04 não mede clique →
  conteúdo, e os pares intercalados (sem, com, sem, com…) isolam o preload do ruído da máquina
  (Ressalva 1 da baseline).
- **Depois = perfil `com-preload`.** Página carregada → ociosidade → hover no link do menu → espera o
  prefetch dos dados terminar (~240 ms) → clique. Cada execução abre um contexto novo, com cache
  vazio.
- **Clique → conteúdo** vem dos marks do próprio app: `nav:click` no clique do `Sidebar` e
  `<conteúdo>:ready` no primeiro render com dados (`transactions`, `overview`, `dashboard`). O
  `performance.measure('nav:click → …:ready')` aparece na aba Performance do DevTools.
- **`loadRemote`** sai do `performance.measure('mf:loadRemote <id>')` em `lib/federation.ts`.
- A origem de cada asset dos MFEs (rede ou cache) vem dos eventos do CDP.

## 1. Clique → conteúdo

Medianas de 3 execuções. JSON cru em `perf/preload-nav-2026-10-18T22-50-08-839Z.json` (não
versionado).

| Navegação             | Medida                                        |  Antes |     Depois | Diferença |
| --------------------- | --------------------------------------------- | -----: | ---------: | --------: |
| `/` → `/transactions` | clique → lista renderizada                    | 522 ms | **333 ms** |  **−36%** |
|                       | `loadRemote('transactions/TransactionsPage')` | 193 ms |   **2 ms** |           |
| `/transactions` → `/` | clique → visão geral (saldo + recentes)       | 520 ms | **341 ms** |  **−34%** |
|                       | clique → dashboard (gráficos)                 | 835 ms | **341 ms** |  **−59%** |
|                       | `loadRemote('transactions/AccountOverview')`  | 210 ms |   **2 ms** |           |
|                       | `loadRemote('dashboard/Dashboard')`           | 357 ms |   **5 ms** |           |

Faixa das execuções: lista 509–523 → 318–334 ms; visão geral 510–522 → 333–346 ms; dashboard
826–837 → 333–347 ms.

## 2. O que a aba Network mostra

**`/` → `/transactions`**

| Momento               | Antes                                        | Depois                                                                      |
| --------------------- | -------------------------------------------- | --------------------------------------------------------------------------- |
| Home ociosa           | —                                            | `__federation_expose_TransactionsPage`                                      |
| Hover em "Transações" | —                                            | `GET /api/transactions?_page=1&_per_page=10&_sort=-date`                    |
| Clique                | o expose + `GET …_page=1`                    | **nenhuma** requisição aos MFEs nem da 1ª página                            |
| Lista carregada       | —                                            | `GET …_page=2` (prefetch)                                                   |
| Clique em "Página 2"  | `GET …_page=2`, lista com `aria-busy="true"` | **nenhuma** requisição da página 2, sem `aria-busy`; dispara `GET …_page=3` |

**`/transactions` → `/`**

| Momento                | Antes                                  | Depois                                                                                              |
| ---------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `/transactions` ociosa | —                                      | `__federation_expose_AccountOverview`, `__federation_expose_Dashboard` e o remoteEntry do dashboard |
| Hover em "Início"      | —                                      | `GET /api/transactions/overview` + `GET /api/transactions/summary`                                  |
| Clique                 | 3 assets dos MFEs + overview + summary | **nada**                                                                                            |

- **Hover isolado** (ociosidade desligada no script): o hover em "Transações" baixou o
  `__federation_expose_TransactionsPage` e a 1ª página; depois do clique, nenhuma requisição aos
  MFEs, e o clique → lista deu 320 ms.
- **2G e Economia de dados**: nada baixou na ociosidade nem no hover. O expose e a 1ª página só
  saíram depois do clique, e a página 2 só ao clicar nela, com `aria-busy`.

A captura de tela da aba Network fica para o vídeo, como no S2-02.

## 3. Bundle

- **`AccountOverview` (home):** passou de 3 chunks síncronos para 1, de 22,8 para 10,5 kB raw (8,5 →
  4,0 kB gzip, −53%). O `NewTransactionModal` (formulário e upload) virou `lazy` e baixa no hover ou
  foco de "Nova transação".
- **Shell:** o chunk da federação (592 kB raw) continua fora do JS inicial. O `lib/routePreload.ts`
  importa o `lib/federation` com `import()` dinâmico; nenhum dos 15 scripts do HTML de `/login`
  contém o runtime do MF.

## Leitura

1. **Em `/transactions`, o ganho vem dos dados.** Com o hover isolado o clique → lista deu 320 ms;
   com ociosidade + hover, 333 ms. O Spike B já tinha mostrado que só o preload do chunk não muda
   o total: os ~190 ms do `loadRemote` caem dentro da janela de até 300 ms em que o React 19 segura
   o reveal do Suspense. Quem tira a espera é o `prefetchQuery` da 1ª página no mesmo gatilho.
2. **Na home o ganho é maior (−59% no dashboard)** porque, sem preload, a cascata era mais longa:
   remoteEntry do dashboard (ainda não carregado quando se vem de `/transactions`) → expose com o
   recharts → resumo. Com o preload, tudo isso está pronto no clique, e visão geral e dashboard
   aparecem juntos.
3. **~330–340 ms é o piso dessa navegação** (RSC da rota + janela do Suspense), coerente com o
   Spike B. Descer daí depende do S3-04 (prefetch no SSR) ou de um `loading.tsx` por rota.
4. **`rel=prefetch` foi testado e descartado.** A ociosidade chegou a trocar o `<link rel=preload>`
   do runtime por `rel=prefetch` (prioridade baixa) com um plugin `createLink`. Como os MFEs servem
   `Cache-Control: no-cache`, o chunk baixou de novo no clique (200 da rede, `loadRemote` de 178 ms).
   Com `rel=preload`, o padrão do runtime, o chunk fica no cache do documento e o `loadRemote` cai
   para 2 ms. O custo aceito é um aviso do Chrome no console ("preloaded using link preload but not
   used within a few seconds") para os chunks pré-carregados na ociosidade. É warning, não erro.
5. **Prefetch da página n + 1:** custa uma requisição a mais (10 itens, ~1,7 kB) por listagem com
   mais de uma página. Ele só dispara depois que a página atual sai do placeholder e não dispara
   quando o resultado cabe numa página. Por isso a digitação na busca não gera prefetch de termos
   intermediários com uma página só, e o E2E de digitação lenta do S2-02 seguiu com 11
   requisições.
6. **No mobile** o `Header` repassa o `onLinkIntent` ao menu do drawer, mas no toque o
   `pointerenter` dispara junto com o clique: lá o ganho vem da ociosidade, não do hover. Não
   medido nesta rodada.
