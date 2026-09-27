# Baseline de performance — Fase 4

> Medição de referência tirada **antes** de qualquer otimização da Fase 4, para que as tasks de
> performance (S1-05, S2-08, S2-09, S3-03, S3-04) tenham um "antes" contra o qual comparar e o
> relatório final (S4-04) possa provar a melhoria no tempo de resposta que a spec pede.
>
> Task: [S0-04](../sprint-0-foundation/04-perf-baseline.md) · Owner: Dev 3 (Performance & Plataforma)

## Condições da medição

|                     |                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------ |
| **Data**            | 27/09/2026                                                                                 |
| **Commit**          | `3a1f3f2` (branch `dev3-perf/perf-baseline`)                                               |
| **Máquina**         | Windows 11 (10.0.26200), Intel Core i3-1115G4 @ 3,00 GHz, **4 núcleos**, **3,8 GB de RAM** |
| **Runtime**         | Node v22.14.0 · npm 10.9.2 · Next.js 16.1.6 (Turbopack) · Chrome headless 153              |
| **Rede (produção)** | TTFB de `/login` 0,26–0,40 s · DNS 9–25 ms · conexão 29–46 ms                              |
| **Banco (local)**   | PostgreSQL 16.14 em Docker · **sem nenhum índice** em `transactions` além da PK            |
| **Ferramentas**     | `lighthouse@12` (npx) · `autocannon@8` (devDependency) · Playwright (Chromium)             |

### Ambientes

| Ambiente     | O que é                                                                                                | Volume de dados                              |
| ------------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| **produção** | https://tech-challenge-phase2.vercel.app (Vercel + Neon)                                               | **60 transações** (13,7 kB) — ver Ressalva 2 |
| **local**    | `next build` + `node e2e/startShellStandalone.mjs` na :3000, MFEs em `rsbuild preview` (:3002 e :3003) | **5.000 transações** no usuário `perf-user`  |

> [!IMPORTANT]
> **Ressalva 1 — a máquina de medição é o gargalo.** Durante as execuções a máquina ficou com
> ~0,1 GB de RAM livre de 3,8 GB (VS Code + Docker + 3 servidores Node + Chrome). O efeito aparece
> nos números: `/transactions` desktop local deu 90, 59 e 52 em três execuções seguidas, e `/`
> desktop 85, 72 e 61. **Isso vale também para as execuções de produção**, porque o Chrome que o
> Lighthouse dirige roda aqui — a Vercel serve a página, mas quem a renderiza é esta máquina. O caso
> mais claro está na tabela de produção: `/login` desktop, página estática, deu 89 numa execução e
> 100 na seguinte; e `/login` mobile deu 85 aqui contra 99 na Fase 2, sem que a página tenha mudado.
> Portanto: **as notas absolutas deste documento não servem como métrica de gate**; servem como
> comparação A/B na mesma máquina, e o best-of-3 é obrigatório. Para decidir se a meta de mobile ≥ 85
> foi batida, usar PageSpeed Insights ou um runner com mais memória (gotcha 1 da task).
>
> **Ressalva 2 — volume de dados diferente entre os ambientes.** A produção mede a conta
> `perf.user@bytebank.test` (id `b0a3aa87-1e61-4c11-81fa-062ad3ceed12`) com **60 transações**, ordem
> de grandeza de um usuário normal; os **5.000** ficam só no local, onde a API foi medida (seção 3).
> Não inflamos o Neon de produção para isso. As transações de perf têm descrição terminando em
> `(perf)` e saem com
> `node scripts/perf/seed-remote.mjs https://tech-challenge-phase2.vercel.app --limpar`.
>
> A primeira medição de produção foi feita com a conta **vazia**, antes do seed, e está arquivada em
> `perf/vazia/`. Comparando as duas: **o volume de dados praticamente não mexeu nas notas** (`/`
> mobile 62 → 68, `/transactions` mobile 67 → 71 — variação dentro do ruído da máquina, e para cima,
> não para baixo). Faz sentido: 60 itens são 13,7 kB de payload, irrelevante ao lado dos ~490 kB de
> JS. **A diferença entre as duas medições foi o estado da máquina, não o dado.** Isso reforça a
> Ressalva 1 e indica que, nessa escala, a nota mobile é dominada por JS e pela cascata de
> federação — não pelo tamanho da resposta.

---

## 1. Lighthouse

Metodologia: 3 páginas × 2 presets × 2 ambientes, **3 execuções cada** (36 execuções). A coluna
**Perf** é o melhor das 3 — mesmo método da Fase 2, para os números serem comparáveis. A coluna
**Execuções** traz as 3 notas em ordem, que é a medida honesta do ruído. "JS inicial" é a soma de
`transferSize` de todos os recursos do tipo `Script` que a página baixou.

### produção (60 transações) — **esta é a fonte principal**

| Página          | Preset  | Perf (best) |    LCP |    TBT |       CLS | JS inicial | Execuções     |
| --------------- | ------- | ----------: | -----: | -----: | --------: | ---------: | ------------- |
| `/login`        | desktop |     **100** | 0,75 s |  37 ms |     0,000 |     291 kB | 89 / 99 / 100 |
| `/login`        | mobile  |      **85** | 2,58 s | 473 ms |     0,000 |     291 kB | 65 / 80 / 85  |
| `/`             | desktop |      **99** | 1,04 s |  47 ms |     0,000 |     493 kB | 98 / 98 / 99  |
| `/`             | mobile  |      **68** | 4,62 s | 626 ms | **0,004** |     491 kB | 65 / 68 / 68  |
| `/transactions` | desktop |      **98** | 1,07 s |  79 ms |     0,000 |     476 kB | 97 / 97 / 98  |
| `/transactions` | mobile  |      **71** | 4,53 s | 295 ms |     0,000 |     477 kB | 61 / 65 / 71  |

O `/login` desktop desta rodada (89 / 99 / 100) é a melhor demonstração de por que o best-of-3 é
obrigatório: é uma página estática, que não mudou nada entre as duas medições, e ainda assim uma das
três execuções caiu 11 pontos. O best-of-3 devolveu 100 nas duas rodadas.

### local (5.000 transações — ver Ressalva 1)

| Página          | Preset  | Perf (best) |    LCP |     TBT |   CLS | JS inicial | Execuções       |
| --------------- | ------- | ----------: | -----: | ------: | ----: | ---------: | --------------- |
| `/login`        | desktop |     **100** | 0,69 s |    2 ms | 0,000 |     288 kB | 100 / 100 / 100 |
| `/login`        | mobile  |      **73** | 3,43 s |  753 ms | 0,000 |     288 kB | 68 / 71 / 73    |
| `/`             | desktop |      **85** | 1,58 s |  239 ms | 0,000 |     486 kB | 61 / 72 / 85    |
| `/`             | mobile  |      **57** | 9,43 s |  557 ms | 0,000 |     484 kB | 53 / 55 / 57    |
| `/transactions` | desktop |      **90** | 1,50 s |  191 ms | 0,000 |     469 kB | 52 / 59 / 90    |
| `/transactions` | mobile  |      **54** | 6,15 s | 1260 ms | 0,000 |     469 kB | 40 / 53 / 54    |

### 1.1 Comparação com a Fase 2 e calibração

| Página          | Preset  | Fase 2 (local) | Agora, produção | Agora, local | Prod, conta vazia |
| --------------- | ------- | -------------: | --------------: | -----------: | ----------------: |
| `/login`        | desktop |            100 |         **100** |          100 |               100 |
| `/login`        | mobile  |             99 |          **85** |           73 |                87 |
| `/`             | desktop |             97 |          **99** |           85 |                97 |
| `/`             | mobile  |             67 |          **68** |           57 |                62 |
| `/transactions` | desktop |             97 |          **98** |           90 |                98 |
| `/transactions` | mobile  |             72 |          **71** |           67 |                67 |

**A produção reproduz a Fase 2 com fidelidade**: desktop 100 / 99 / 98 contra 100 / 97 / 97, e mobile
68 / 71 contra 67 / 72 em `/` e `/transactions`. Duas medições independentes, em ambientes diferentes,
a três meses de distância, chegando ao mesmo lugar — é o melhor sinal de que o método está certo e de
que **o gargalo é estrutural, não circunstancial**.

A exceção é `/login` mobile: 85 aqui contra 99 na Fase 2. Como a página é estática e não mudou, a
diferença é a máquina (Ressalva 1) — o preset mobile aplica throttling de CPU 4× sobre 4 núcleos já
saturados. Pela mesma razão, todas as notas mobile desta tabela devem ser lidas como **piso**.

Para um número independente da máquina, o caminho é o PageSpeed Insights, que mede em hardware do
Google — mas só funciona em URL pública, ou seja, apenas `/login`:

```bash
curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https%3A%2F%2Ftech-challenge-phase2.vercel.app%2Flogin&category=performance&strategy=mobile&key=$PSI_KEY"
```

A cota anônima da API estava esgotada no dia da medição; para rodar, gerar uma chave gratuita no
Google Cloud Console e exportar como `PSI_KEY`. **Pendência para o S4-04:** confirmar a nota mobile
final por PSI (ou num runner com mais memória), porque é essa a fonte que decide a meta ≥ 85.

### Leitura

- **CLS: zero em tudo, menos na home mobile.** Em produção, `/` mobile tem CLS de **0,0038**,
  idêntico nas 3 execuções — é shift real, não ruído. O elemento é
  `main#main > div.flex > section.flex > div.@container`, o container do
  [`TransactionList`](../../../apps/transactions-mfe/src/components/TransactionList/TransactionList.tsx#L49):
  a lista de transações recentes da home entra depois que o dado chega e empurra o layout, porque a
  altura não fica reservada. No desktop dá 0,000 (a viewport larga absorve o deslocamento) e no
  build local também, porque o `localhost` responde antes da primeira pintura — **este shift só
  aparece com latência de rede real, em tela estreita**. A meta `CLS = 0` do PLAN.md, portanto,
  **ainda não está batida**.

  > Com a conta vazia (medição arquivada em `perf/vazia/`) o shift era outro: 0,0065 no desktop e
  > 0,0038 no mobile, vindo do `<span>` do
  > [`AccountOverview`](../../../apps/transactions-mfe/src/components/AccountOverview.tsx#L52), cujo
  > placeholder no shell
  > ([`AccountOverviewRemote`](../../../apps/shell/src/components/AccountOverviewRemote.tsx#L52)) tem
  > altura diferente. Ou seja: **são dois problemas de reserva de altura**, e o da lista só aparece
  > quando há lista. Quem atacar o CLS precisa verificar os dois.

- **O problema é mobile, e é JS** — não imagem, não layout: `/` e `/transactions` baixam ~470–490 kB
  de script e ficam com TBT de 0,5–1,3 s. `/login`, que não carrega MFE nenhum, baixa 288 kB.
- **A diferença entre `/login` e as páginas federadas é a cascata `ssr:false`:** a home faz
  **7 requisições** aos MFEs e `/transactions` **4**, todas depois de o JS do shell carregar. É o
  teto de LCP mobile apontado na Fase 2, e segue valendo.
- O LCP mobile local de `/` (9,43 s) está inflado pela saturação de memória **e** pelo download de
  849 kB de transações (seção 4).

---

## 2. Bundle

### 2.1 Shell — o chunk que carrega `lib/federation.ts`

Medido com `next experimental-analyze --output` (o `@next/bundle-analyzer` não gera relatório com
Turbopack, gotcha 3) e inspeção de `apps/shell/.next/static/chunks`:

| Chunk                 |    Raw |       Gzip | O que tem dentro                                                                                     |
| --------------------- | -----: | ---------: | ---------------------------------------------------------------------------------------------------- |
| `c64c0c460c59ef2f.js` | 516 kB | **138 kB** | runtime do Module Federation (38 referências a `@module-federation`/`createInstance`) **+ recharts** |
| `55768851c1f852b8.js` | 352 kB |      75 kB | **zod** (73 referências a `ZodError`/`too_small`)                                                    |
| `10dda96ee90bf67d.js` | 224 kB |      69 kB | React + framework                                                                                    |
| `9fcfe68ebb82bc00.js` | 120 kB |      32 kB | —                                                                                                    |
| `a400f84873664005.js` | 120 kB |      33 kB | —                                                                                                    |
| `a6dad97d9634a72d.js` | 112 kB |      38 kB | —                                                                                                    |

**O chunk da federação e o do recharts são o mesmo chunk: 516 kB raw / 138 kB gzip** — exatamente o
efeito previsto no PLAN.md. A causa está em
[`apps/shell/src/lib/federation.ts`](../../../apps/shell/src/lib/federation.ts):

```ts
import * as DS from '@bytebank/design-system';
```

O barril do DS (`src/index.ts` → `./components`) reexporta `BarChart`, `LineChart` e `PieChart`, que
importam `recharts`. Um namespace import cujo objeto é passado inteiro para o `shared` do Module
Federation **não pode ser tree-shaken**: todos os membros precisam existir em runtime. É por isso
que o `optimizePackageImports: ['@bytebank/design-system']` do `next.config.ts` não resolve este
caso. No grafo do shell entram **201 módulos de `recharts`**, mais 39 de `d3-shape`, 24 de
`d3-scale` e 2 de `victory-vendor` — de 3.173 módulos no total.

### 2.2 MFEs

Medido com a tabela de tamanhos que o próprio `rsbuild build` imprime (`performance.printFileSize`,
ligada por padrão), mais `grep` nos chunks para localizar as bibliotecas.

> **Correção à task:** a task S0-04 manda usar a opção `performance.bundleAnalyze` do Rsbuild, mas
> ela **não existe mais no Rsbuild 2** (o repo está no 2.0.7 — `PerformanceConfig` só tem
> `removeConsole`, `buildCache`, `printFileSize`, `chunkSplit`, `preconnect`, `dnsPrefetch`).
> Registrar o `BundleAnalyzerPlugin` do `webpack-bundle-analyzer` via `tools.rspack` também não
> resolve: o plugin é chamado, mas não emite o relatório sob Rspack. Se algum dia for preciso um
> treemap, o caminho é o `@rsdoctor/rspack-plugin`. Para o que esta task pede — tamanho por chunk e
> onde estão recharts e zod — a tabela do build somada ao `grep` já responde, com a vantagem de
> gerar números comparáveis entre execuções.

| MFE                | Total bruto |     Gzip | Chunk com recharts |      Raw |         Gzip |
| ------------------ | ----------: | -------: | ------------------ | -------: | -----------: |
| `dashboard-mfe`    |  1.081,8 kB | 315,8 kB | `async/178.*.js`   | 430,2 kB | **125,0 kB** |
| `transactions-mfe` |  1.140,5 kB | 337,1 kB | `async/554.*.js`   | 373,1 kB | **104,8 kB** |

Cada MFE carrega **sua própria cópia** de recharts e de zod (`571.*.js`, ~55 kB raw em cada um):
os dois declaram como `shared` apenas `react`, `react-dom` e os `@bytebank/*`. O
`transactions-mfe` carrega recharts **mesmo sem exibir gráfico** — herança do barril do DS.

### 2.3 JS inicial por rota (transferido, medido pelo Lighthouse)

| Rota            | JS inicial (local) | JS inicial (produção) | Requisições a MFE | Fetch de API (local, 5 mil itens) |
| --------------- | -----------------: | --------------------: | ----------------: | --------------------------------: |
| `/login`        |             288 kB |                291 kB |                 0 |                                 0 |
| `/`             |             486 kB |            491–528 kB |         7 (56 kB) |                        **849 kB** |
| `/transactions` |             469 kB |                476 kB |         4 (39 kB) |                            2,6 kB |

As páginas federadas carregam **~180 kB a mais de JS** que `/login`, que não monta MFE nenhum.

---

## 3. API com 5.000 transações

`autocannon`, 10 conexões, 15 s por endpoint, contra o build local de produção — nunca contra a
produção (gotcha 6). Usuário `perf-user` com 5.000 transações e **nenhum índice** em `transactions`
além da chave primária.

| Endpoint                                     |      Payload |    p50 |          p95 |      p99 | req/s |
| -------------------------------------------- | -----------: | -----: | -----------: | -------: | ----: |
| `GET /api/transactions?_page=1&_per_page=10` |       1,7 kB | 103 ms |       245 ms |   366 ms |    80 |
| `GET /api/transactions` (sem paginação)      | **848,5 kB** | 684 ms |   **980 ms** | 1.128 ms |    14 |
| `GET /api/transactions/summary`              |     246,0 kB | 667 ms | **1.622 ms** | 1.946 ms |    13 |
| `GET /api/transactions?q=mercado&…`          |       1,8 kB |  84 ms |       135 ms |   198 ms |   111 |

Zero respostas não-2xx nos quatro endpoints.

### Leitura

- **O resumo é o endpoint mais lento (p95 1,62 s)** e não usa agregação em SQL:
  `summary/route.ts` chama `getAllByUser`, traz as 5.000 linhas com os anexos e agrega em
  JavaScript (`aggregateByMonth`, `cumulativeBalance`, `groupByCategory`).
- **A lista sem paginação transfere 848,5 kB** e tem p95 de 980 ms.
- **A busca é o endpoint mais rápido** porque o `ilike '%mercado%'` reduz o resultado antes da
  serialização — mas faz **scan sequencial**, então degrada linearmente com o volume.
- A rodada a frio, antes do warm-up do pool, deu p50 bem pior: 146 / 1.165 / 1.619 / 107 ms. Os
  números da tabela são da rodada com o pool quente. **Comparações futuras precisam descartar a
  primeira rodada.**

---

## 4. Payload da home

`GET /api/transactions` sem paginação, 5.000 itens: **848,5 kB** de JSON (849,3 kB transferidos,
medido no log de rede do Lighthouse da home).

A home baixa **a lista inteira** para mostrar saldo + 5 transações recentes — confirmado no log de
rede: a única chamada de dados de `/` é `/api/transactions`, sem parâmetros. E
`GET /api/transactions/summary` **não é chamado pela home**: o endpoint existe, mas quem desenha os
gráficos agrega a lista completa no cliente.

A home também chama **`/api/auth/session` duas vezes** por carregamento.

---

## 5. Requisições por termo de busca

`node scripts/perf/search-requests.mjs`, digitando "supermercado" (12 caracteres) em
`/transactions`. O `SearchInput` do DS tem `debounceMs={300}`.

| Intervalo entre teclas               | Requisições |   Bytes | Canceladas |
| ------------------------------------ | ----------: | ------: | ---------: |
| 120 ms (digitação rápida)            |       **1** |  2,7 kB |          0 |
| 250 ms (digitação média)             |       **1** |  2,7 kB |          0 |
| 400 ms (digitação lenta / hesitante) |      **12** | 31,8 kB |      **0** |

O debounce de 300 ms resolve a digitação corrida, mas **não há cancelamento**: quando o intervalo
passa de 300 ms, cada caractere gera uma requisição, todas completam, e as 11 respostas obsoletas
são baixadas e descartadas. É esse caso que a meta "1 por termo estável; obsoletas canceladas"
precisa cobrir (S2-02).

> Observação: numa execução sob pressão de memória o campo terminou com `supemercado` em vez de
> `supermercado` — uma tecla foi perdida. Não reproduziu nas execuções seguintes, mas vale
> investigar em S2-02: o `SearchInput` faz `setDraftValue(value)` num `useEffect` quando `value`
> muda, o que pode sobrescrever o que o usuário digitou enquanto a requisição anterior voltava.

---

## 6. Metas do PLAN.md — confirmadas e ajustadas

| Métrica                                     | PLAN.md dizia      | Medido agora                                  | Situação                                                            |
| ------------------------------------------- | ------------------ | --------------------------------------------- | ------------------------------------------------------------------- |
| Lighthouse mobile `/`                       | 67 (Fase 2, local) | **68** (produção)                             | ponto de partida **confirmado**; meta ≥ 85 mantida                  |
| Lighthouse mobile `/transactions`           | 72 (Fase 2, local) | **71** (produção)                             | ponto de partida **confirmado**; meta ≥ 85 mantida                  |
| Lighthouse desktop (todas)                  | 97–100             | **100 / 99 / 98** (produção)                  | meta `≥ 95` mantida — já batida                                     |
| CLS                                         | meta `= 0`         | 0,000 em tudo, menos **0,0038 em `/` mobile** | **não batida**: reservar a altura da lista (e do `AccountOverview`) |
| recharts no carregamento de `/transactions` | sim (~138 kB gzip) | **confirmado: 138 kB gzip**                   | estimativa **confirmada na medição**                                |
| p95 do resumo (5 mil transações)            | medir no S0-04     | **1.622 ms**                                  | meta −50% ⇒ **≤ 811 ms**                                            |
| p95 da lista (5 mil transações)             | medir no S0-04     | **980 ms**                                    | meta −50% ⇒ **≤ 490 ms**                                            |
| Payload da home                             | "lista completa"   | **848,5 kB** (5 mil itens)                    | meta: saldo + 5 recentes                                            |
| Requisições por termo de busca              | medir no S0-04     | **1** (rápida) / **12** (lenta), 0 canceladas | meta: 1 por termo **+ cancelamento**                                |

Duas metas novas que os números sugerem, para o time decidir:

- **p95 da lista paginada ≤ 100 ms** (hoje 245 ms) — é a rota mais usada, e um índice em
  `(user_id, date)` deve resolver sozinho.
- **JS inicial das páginas federadas ≤ 300 kB** (hoje 469–486 kB, contra 288 kB de `/login`) — é a
  métrica que fecha o ciclo com a meta de mobile ≥ 85.

---

## 7. Achados que alimentam as próximas tasks

| Achado                                                                                                                | Evidência      | Task                     |
| --------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------ |
| `import * as DS` em `federation.ts` põe recharts no chunk da federação (516 kB / 138 kB gzip)                         | seção 2.1      | **S2-09**                |
| Cada MFE empacota sua própria cópia de recharts (125 kB e 105 kB gzip) e de zod                                       | seção 2.2      | **S2-09**                |
| `transactions-mfe` carrega recharts sem exibir gráfico                                                                | seção 2.2      | **S2-09**                |
| `summary` traz 5.000 linhas + anexos e agrega em JS (p95 1,62 s)                                                      | seção 3        | **S1-05**, **S3-04**     |
| Nenhum índice em `transactions`; a busca faz scan sequencial                                                          | `\di`, seção 3 | **S1-05**                |
| Home baixa 848,5 kB para mostrar saldo + 5 itens, e ignora o `/summary` que já existe                                 | seção 4        | **S2-08**                |
| `/api/auth/session` é chamado 2× por carregamento da home                                                             | seção 4        | **S2-07**                |
| Cascata `ssr:false`: 7 requisições a MFE na home e 4 em `/transactions`, todas após o JS do shell                     | seção 1        | **S3-04** (SSR/prefetch) |
| CLS de 0,0038 na home mobile: a altura do `TransactionList` não fica reservada (e, sem dados, a do `AccountOverview`) | seção 1        | **S2-08** / **S3-04**    |
| A busca não cancela requisições obsoletas (12 requisições, 0 canceladas)                                              | seção 5        | **S2-02**                |
| Possível perda de tecla no `SearchInput` durante re-render                                                            | seção 5        | **S2-02**                |

---

## Como reproduzir

Os scripts ficam em [`scripts/perf/`](../../../scripts/perf/) e escrevem as saídas cruas em `perf/`
na raiz — um JSON do Lighthouse por execução (~400 kB cada) mais os JSON do autocannon. Essa pasta
**não** está no `.gitignore` e aparece como untracked depois de medir: **não commitar** (o que
interessa já está resumido aqui; os JSON só servem para reprocessar a tabela com o `lh-summary.mjs`
sem remedir). Pode apagar a pasta a qualquer momento.

### 1. Ambiente local com 5.000 transações

```bash
docker compose up -d db
npm run db:migrate -w @bytebank/shell
npm run db:seed-load -w @bytebank/shell          # 5.000 transações; cria perf.user@bytebank.test / Senha123!

npm run build -w @bytebank/dashboard-mfe
npm run build -w @bytebank/transactions-mfe
npm run preview -w @bytebank/dashboard-mfe &     # :3002
npm run preview -w @bytebank/transactions-mfe &  # :3003

NEXT_PUBLIC_DASHBOARD_MFE_URL=http://localhost:3002/mf-manifest.json \
NEXT_PUBLIC_TRANSACTIONS_MFE_URL=http://localhost:3003/mf-manifest.json \
NEXT_PUBLIC_API_URL=/api npm run build -w @bytebank/shell

AUTH_TRUST_HOST=true AUTH_URL=http://localhost:3000 \
NEXT_PUBLIC_DASHBOARD_MFE_URL=http://localhost:3002/mf-manifest.json \
NEXT_PUBLIC_TRANSACTIONS_MFE_URL=http://localhost:3003/mf-manifest.json \
node e2e/startShellStandalone.mjs                # :3000
```

`AUTH_TRUST_HOST=true` é obrigatório no NextAuth v5 fora do `next dev` (gotcha 2), e não existe
mais backdoor de senha: o usuário criado pelo `db:seed-load` é real, com hash bcrypt.

O volume é configurável: `PERF_COUNT=20000 npm run db:seed-load -w @bytebank/shell`. Os dados são
gerados com PRNG de semente fixa (mulberry32), então duas cargas produzem exatamente as mesmas
linhas — é o que torna as medições comparáveis entre execuções.

> As descrições geradas para a categoria `food` contêm "mercado" e "supermercado" de propósito: é
> o que faz o endpoint de busca (`q=mercado`, seção 3) e a contagem de requisições (seção 5) terem
> resultado. **Mudar essas strings no `seed-load.ts` quebra as duas medições.**

### 2. Cookie de sessão (fora do repo)

```bash
node scripts/perf/session-cookie.mjs                                           # local
node scripts/perf/session-cookie.mjs https://tech-challenge-phase2.vercel.app  # produção
```

Grava `.secrets/headers.json` (para o `--extra-headers` do Lighthouse) e `.secrets/cookie.txt`
(para o `-H "Cookie: …"` do autocannon). **`.secrets/` está no `.gitignore`** — nunca commitar o
cookie (gotcha 5).

### 3. Lighthouse

```bash
node scripts/perf/lighthouse-batch.mjs local http://localhost:3000
node scripts/perf/lighthouse-batch.mjs prod  https://tech-challenge-phase2.vercel.app
node scripts/perf/lh-summary.mjs todos       # remonta as tabelas a partir de perf/lh-*.json
```

`PERF_RUNS=5` aumenta as execuções por combinação. Uma execução avulsa, como na task:

```bash
npx lighthouse@12 https://tech-challenge-phase2.vercel.app/transactions \
  --only-categories=performance --preset=desktop \
  --extra-headers=./.secrets/headers.json \
  --output=json --output-path=./perf/tx-desktop-1.json
```

No Windows o `chrome-launcher` às vezes falha com `EBUSY` ao limpar o temp **depois** de escrever o
relatório; o `lighthouse-batch.mjs` aproveita o JSON nesses casos, em vez de perder a execução.

### 4. API e busca

```bash
node scripts/perf/api-bench.mjs                              # 4 endpoints: p50/p95/p99 e payload
PERF_KEY_DELAY=400 node scripts/perf/search-requests.mjs     # requisições por termo digitado
```

O `api-bench.mjs` recusa qualquer URL que não seja localhost. O autocannon não calcula p95 por
padrão (a lista salta de p90 para p97,5); o script insere 95 na lista de percentis antes de medir,
porque p95 é a métrica da meta.

### 5. Bundle

```bash
cd apps/shell && npx next experimental-analyze --output   # .next/diagnostics/analyze
npm run build -w @bytebank/dashboard-mfe                  # imprime a tabela de tamanhos por chunk
npm run build -w @bytebank/transactions-mfe
```

Para descobrir em que chunk está uma biblioteca e quanto ela custa comprimida (o `-a` é necessário
porque o `modules.data` do Next tem cabeçalho binário):

```bash
grep -c "recharts-wrapper" apps/shell/.next/static/chunks/*.js
gzip -c apps/shell/.next/static/chunks/<chunk>.js | wc -c
grep -a -o '"path":"[^"]*recharts[^"]*"' apps/shell/.next/diagnostics/analyze/data/modules.data | sort -u | wc -l
```
