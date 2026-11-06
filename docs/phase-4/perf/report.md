# Relatório de performance — Fase 4

> Comparação de três pontos: o **fim da Fase 2**, a **baseline do S0-04** (antes de qualquer
> otimização da Fase 4) e o **estado final da Fase 4**. Para cada otimização, o relatório mostra qual
> métrica ela moveu e quanto, e avalia as metas do [PLAN.md](../PLAN.md#metas-kpis).
>
> Task: [S4-04](../sprint-4-audit-delivery/04-performance-report.md) · Owner: Dev 3 (Performance &
> Plataforma)

## Resumo

| Métrica                                              | Fim da Fase 2 |       Baseline S0-04 |                  Fase 4 (final) | Meta                              | Situação         |
| ---------------------------------------------------- | ------------: | -------------------: | ------------------------------: | --------------------------------- | ---------------- |
| LCP mobile `/` (best-of-3)                           |         5,5 s |        4,62 s (prod) |                      **2,08 s** | —                                 | —                |
| LCP mobile `/transactions` (best-of-3)               |         5,2 s |        4,53 s (prod) |                      **2,79 s** | —                                 | —                |
| Lighthouse mobile `/` · `/transactions`              |       67 · 72 |       68 · 71 (prod) |                 83 · 74 (local) | ≥ 85 em produção                  | **pendente**     |
| Lighthouse desktop (3 páginas)                       | 100 · 97 · 97 | 100 · 99 · 98 (prod) |             **100 · 100 · 100** | ≥ 95, CLS = 0                     | atingida (local) |
| recharts no carregamento de `/transactions`          |           sim |          138 kB gzip |                           **0** | não                               | atingida         |
| p95 do resumo (5 mil transações)                     |             — |             1.622 ms |                       **62 ms** | ≤ 811 ms                          | atingida         |
| p95 da lista paginada, 1 conexão                     |             — |                    — |                       **12 ms** | ≤ 100 ms                          | atingida         |
| Vazão da lista paginada, 10 conexões                 |             — |             80 req/s |                   **156 req/s** | acima da baseline                 | atingida         |
| Dados da home no carregamento                        | lista inteira |             848,5 kB | **0 requisições** (vêm no HTML) | saldo + 5 recentes                | atingida         |
| Requisições ao digitar "supermercado" (400 ms/tecla) |             — |    12 (0 canceladas) |        **12** (11 + 1 prefetch) | 1 por termo; obsoletas canceladas | atingida         |

- **O tempo de resposta melhorou em todas as camadas.** API: o resumo caiu de 1.622 para 62 ms no
  p95, e a lista de 245 para 89 ms com o dobro da vazão. Rede: a revalidação devolve 304 sem corpo
  (31,7 → 1,7 kB por resposta no resumo). Tela: o LCP mobile caiu ~2 s nas páginas federadas e a
  navegação com pré-carregamento leva ~330 ms do clique ao conteúdo.
- **A meta mobile ≥ 85 ainda não pode ser decidida.** Ela vale para produção, e a produção ainda
  serve a Fase 2 (o deploy da `phase-4` é a Task 09). No build local, o TBT desta máquina segura a
  nota: 83 em `/` e 74 em `/transactions` hoje, contra medianas de 86,5 e 85 no A/B controlado do
  [S4-10](../sprint-4-audit-delivery/10-mobile-lcp.md#evidências--2026-10-29). Ver § 1.3.
- **Duas regressões encontradas e corrigidas.** O prefetch da página seguinte (S2-08) disparava
  para cada termo intermediário da busca, e a digitação lenta passou de 12 para 22 requisições.
  Agora o prefetch espera a página ficar estável por 1 s, e voltaram a ser 12 (§ 5). Desde o
  `loading.tsx` do S3-04, o dashboard aparecia ~330 ms depois da visão geral, numa 2ª rodada de
  revelação do Suspense. Agora, quando o remote já foi pré-carregado, ele monta com a página e
  aparece junto: 664 → 331 ms (§ 6).

---

## Condições da medição

|                |                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Data**       | 05/11/2026                                                                                                                     |
| **Código**     | `ba3b624` (branch `dev3-perf/perf-report`) = `phase-4` em `9878491` + correção do focus trap do DS, sem efeito de performance  |
| **Máquina**    | a mesma do S0-04: Windows 11, i3-1115G4, 4 núcleos, 3,8 GB de RAM; 420–580 MB livres durante as medições, Chrome fechado       |
| **Runtime**    | Node v22.14.0 · npm 10.9.2 · Next.js 16.4.3 · Playwright 1.61.1 · autocannon 8.0.0 · `lighthouse@12` (12.8.2) com Chromium 149 |
| **Banco**      | PostgreSQL 16.14 descartável em Docker (:55432), 13 migrações até `0012_mfa_totp`                                              |
| **Dados**      | 5.000 transações do `perf-user` (`db:seed-load`, PRNG de semente fixa, como no S0-04)                                          |
| **Servidores** | `next build` standalone na :3000 (CSP em `enforce`, HIBP desligado) e MFEs em `rsbuild preview` (:3002 e :3003), como no S0-04 |

### De onde vem cada ponto

| Ponto              | Fonte                                                                                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fim da Fase 2**  | Lighthouse local best-of-3 de 03/07/2026 (`perf-audit.md` da Fase 2, recuperável com `git show 2e9819e^:docs/phase-2/perf-audit.md`). O S0-04 confirmou esses números em produção. |
| **Baseline S0-04** | [baseline.md](./baseline.md) (27/09/2026, commit `3a1f3f2`), na mesma máquina. Os JSON crus não existem mais, então as colunas vêm do documento.                                   |
| **Fase 4 (final)** | Medido para este relatório, com os scripts de `scripts/perf/` (comandos em [Como reproduzir](#como-reproduzir)).                                                                   |

> [!IMPORTANT]
> **Ressalva 1 — produção ainda é a Fase 2.** `https://tech-challenge-phase2.vercel.app` serve a
> `main` (`eb89508`, Fase 2 + hotfix do IDOR). O estado final só pode ser medido em produção depois
> do deploy da Task 09. Até lá, o relatório traz o estado final **local** e os números de produção
> do S0-04. Também não foi possível remedir a produção da Fase 2 hoje: a conta
> `perf.user@bytebank.test` recusou a senha padrão (`CredentialsSignin`).
>
> **Ressalva 2 — a máquina segue sendo o gargalo** (Ressalva 1 do S0-04). Com Docker, três
> servidores Node e o Lighthouse, sobram 420–580 MB de RAM. O efeito aparece no TBT (§ 1.3).
>
> **Ressalva 3 — o Lighthouse agora roda no Chromium do Playwright.** Com o Chrome 156 do sistema,
> 17 das 18 execuções falharam com `NO_NAVSTART`. O `lighthouse-batch.mjs` passou a usar o
> Chromium 149 do Playwright (a mesma versão das medições do S2-09 e do S3-11) e a repetir uma
> execução com `runtimeError`. Três amostras falharam três vezes seguidas e foram refeitas sozinhas.

---

## 1. Lighthouse

Método do S0-04: 3 páginas × 2 presets, **3 execuções cada**. A nota é o melhor das 3, e LCP, TBT
e CLS são os dessa execução. "JS inicial" é a soma de `transferSize` dos scripts que a página baixou.

### 1.1 Estado final (local, 5.000 transações)

| Página          | Preset  | Perf (best) |    LCP |      TBT |   CLS | JS inicial | Execuções      |
| --------------- | ------- | ----------: | -----: | -------: | ----: | ---------: | -------------- |
| `/login`        | desktop |     **100** | 0,57 s |    30 ms | 0,000 |     249 kB | 98 / 100 / 100 |
| `/login`        | mobile  |      **83** | 2,86 s |   488 ms | 0,000 |     249 kB | 74 / 78 / 83   |
| `/`             | desktop |     **100** | 0,65 s |    62 ms | 0,000 |     309 kB | 94 / 99 / 100  |
| `/`             | mobile  |      **83** | 2,08 s |   613 ms | 0,000 |     306 kB | 69 / 77 / 83   |
| `/transactions` | desktop |     **100** | 0,55 s |    21 ms | 0,000 |     345 kB | 91 / 96 / 100  |
| `/transactions` | mobile  |      **74** | 2,79 s | 1.024 ms | 0,000 |     345 kB | 71 / 72 / 74   |

O elemento de LCP é o do HTML do servidor nas 12 amostras das páginas federadas: a ilustração do
`BalanceCard` em `/` e o `h1` do skeleton em `/transactions` (S4-10). O FCP fica em 0,77–0,88 s
no mobile.

### 1.2 Os três pontos

**Mobile** (nota · LCP · TBT):

| Página          | Fim da Fase 2 (local) | S0-04 produção       | S0-04 local            | **Final (local)**          |
| --------------- | --------------------- | -------------------- | ---------------------- | -------------------------- |
| `/login`        | 99 · 1,6 s · 120 ms   | 85 · 2,58 s · 473 ms | 73 · 3,43 s · 753 ms   | **83 · 2,86 s · 488 ms**   |
| `/`             | 67 · 5,5 s · 420 ms   | 68 · 4,62 s · 626 ms | 57 · 9,43 s · 557 ms   | **83 · 2,08 s · 613 ms**   |
| `/transactions` | 72 · 5,2 s · 370 ms   | 71 · 4,53 s · 295 ms | 54 · 6,15 s · 1.260 ms | **74 · 2,79 s · 1.024 ms** |

**Desktop** (nota · LCP · TBT):

| Página          | Fim da Fase 2 (local) | S0-04 produção       | S0-04 local          | **Final (local)**        |
| --------------- | --------------------- | -------------------- | -------------------- | ------------------------ |
| `/login`        | 100 · 0,4 s · 0 ms    | 100 · 0,75 s · 37 ms | 100 · 0,69 s · 2 ms  | **100 · 0,57 s · 30 ms** |
| `/`             | 97 · 1,3 s · 30 ms    | 99 · 1,04 s · 47 ms  | 85 · 1,58 s · 239 ms | **100 · 0,65 s · 62 ms** |
| `/transactions` | 97 · 1,2 s · 40 ms    | 98 · 1,07 s · 79 ms  | 90 · 1,50 s · 191 ms | **100 · 0,55 s · 21 ms** |

### 1.3 Leitura

- **O LCP mobile das páginas federadas caiu ~2 s.** `/` foi de 4,62 s (produção) e 9,43 s (local)
  no S0-04 para 2,08 s, e `/transactions` de 4,53 / 6,15 s para 2,79 s. As três amostras de hoje
  ficam em 2,08–2,88 s e 2,56–2,79 s. A prova causal é o A/B controlado do S4-10 (10 × 10, Mann-Whitney):
  −1.791 ms em `/` e −2.168 ms em `/transactions`, com IC 95% longe do zero.
- **O TBT é o que segura a nota mobile, e ele mede esta máquina, não o código.** Em todas as
  amostras mobile, o maior custo de scripting é o chunk do framework (`19zxo_j3gzaa9.js`, React,
  o mesmo hash do A/B do S4-10): 1,0–1,6 s hoje, contra ~0,8 s no A/B controlado. A calibração
  está no `/login`: a página não monta MFE e baixa **menos** JS que no S0-04 (249 contra 288 kB),
  mas deu 83 aqui, contra 99 no fim da Fase 2 e 85 em produção no S0-04.
- **Por isso a meta mobile ≥ 85 não pode ser decidida por este best-of-3.** No A/B controlado do
  S4-10 (WSL limitado a 1 GB, Chrome fechado, aquecimento e espera por memória livre), as medianas
  locais foram 86,5 em `/` (faixa 67–96) e 85 em `/transactions` (faixa 70–89), com o mesmo
  código. Ou seja: a nota mobile está perto do limite e oscila com o TBT. A meta 16 do PLAN.md é
  medida em produção (Task 09).
- **Desktop: 100 nas três páginas, CLS 0.** Em produção, o S0-04 viu um CLS de 0,004 na home
  mobile, que só aparece com latência real. Desde o S4-10, o cartão e o `h1` vêm do HTML com a
  mesma geometria do remote, e a home monta com os dados do SSR. Mesmo assim, o CLS = 0 também
  precisa ser confirmado em produção.

### 1.4 Produção — pendente

Depois do deploy da Task 09, rodar com uma conta que exista no banco de produção:

```bash
PERF_USER_PASSWORD='<senha>' node scripts/perf/session-cookie.mjs https://tech-challenge-phase2.vercel.app
node scripts/perf/lighthouse-batch.mjs prod https://tech-challenge-phase2.vercel.app
node scripts/perf/lh-summary.mjs prod
```

---

## 2. Bundle

Tamanhos de `node scripts/perf/bundle-report.mjs`: bytes em disco e gzip com `node:zlib`, em KiB.
Ele marca os chunks que contêm recharts (`recharts-wrapper`), zod (`ZodError`) e o runtime do
Module Federation. Para os totais dos MFEs, foi usada a tabela do próprio `rsbuild build`, como no
S0-04.

### 2.1 Shell — o chunk da federação

| Medida                                     | S0-04                    | S2-09            | **Final**            |
| ------------------------------------------ | ------------------------ | ---------------- | -------------------- |
| Chunk com `lib/federation.ts`              | 516 kB / **138 kB gzip** | 182,9 / 48,1 KiB | **161,2 / 45,7 KiB** |
| recharts dentro do chunk                   | sim (201 módulos)        | não              | **não**              |
| zod no JS inicial de `/` e `/transactions` | sim (75 kB gzip)         | não              | **não**              |

O chunk da federação ficou **67% menor em gzip** que no S0-04 e não carrega recharts nem zod.
Nenhum chunk do shell contém recharts.

### 2.2 MFEs

| MFE                | Total S0-04 (raw / gzip) | Total final (raw / gzip) | Chunk com recharts, S0-04    | Chunk com recharts, final                    |
| ------------------ | -----------------------: | -----------------------: | ---------------------------- | -------------------------------------------- |
| `dashboard-mfe`    |       1.081,8 / 315,8 kB |       1.124,1 / 336,9 kB | `async/178` 430,2 / 125,0 kB | `async/519` 279,1 / **81,9 kB**, sob demanda |
| `transactions-mfe` |       1.140,5 / 337,1 kB |         924,6 / 281,6 kB | `async/554` 373,1 / 104,8 kB | **nenhum**                                   |

O total do dashboard cresceu 4% porque cada gráfico virou um chunk próprio (S2-09). O total não
é o que o navegador baixa: os gráficos só carregam quando ficam visíveis.

### 2.3 JS inicial por rota

| Rota            | S0-04 local | S0-04 produção | **Final** | Final sem o preload da próxima rota |
| --------------- | ----------: | -------------: | --------: | ----------------------------------: |
| `/login`        |      288 kB |         291 kB |    249 kB |                              249 kB |
| `/`             |      486 kB |     491–528 kB |    306 kB |                              302 kB |
| `/transactions` |      469 kB |         476 kB |    345 kB |                              304 kB |

- As páginas federadas baixam **menos ~180 kB (`/`) e ~125 kB (`/transactions`) de JS** que no
  S0-04.
- Os bytes de hoje incluem o pré-carregamento ocioso da próxima rota (S2-08), que o Lighthouse
  registra porque espera a rede parar. Em `/transactions`, são 41,1 kB (exposes do
  `AccountOverview` e do `Dashboard` e o remote entry do dashboard). Sem eles, as duas páginas
  ficam em ~300 kB, a meta sugerida no S0-04.
- Cada remote entry (~34 KiB gzip) leva o próprio runtime do Module Federation, além do que já
  está no chunk da federação do shell. É a Parte D do S4-10 (runtime externo), não executada.

### 2.4 Onde está o zod

| Onde               | Chunk                     | Tamanho (raw / gzip) | Quando baixa                               |
| ------------------ | ------------------------- | -------------------: | ------------------------------------------ |
| Shell              | `0bl3suj7lk0au.js`        |     133,8 / 39,9 KiB | só em `/login` e `/register` (formulários) |
| `transactions-mfe` | `async/486.db53bfccf5.js` |     115,9 / 35,3 KiB | ao abrir o formulário de transação (S2-09) |
| `dashboard-mfe`    | —                         |                    — | não empacota zod                           |

No S0-04, o zod estava num chunk de 75 kB gzip do shell e numa cópia em cada MFE. Hoje,
nenhum script com zod é baixado em `/` nem em `/transactions` (cruzamento dos scripts do Lighthouse
com os chunks marcados, `bundle-report.mjs <relatório>`).

---

## 3. API com 5.000 transações

`node scripts/perf/api-bench.mjs`: autocannon, 15 s por cenário, 10 conexões salvo indicação. A
primeira rodada foi o aquecimento do pool e foi descartada, como no S0-04. Zero respostas
inesperadas na rodada oficial.

### 3.1 Tempo de resposta e vazão

| Endpoint                                 | Payload S0-04 → final | p50 S0-04 → S1-05 → **final** | p95 S0-04 → S1-05 → **final** | req/s S0-04 → S1-05 → **final** |
| ---------------------------------------- | --------------------: | ----------------------------: | ----------------------------: | ------------------------------: |
| Lista paginada (10 itens)                |          1,7 → 1,7 kB |          103 → 75 → **57 ms** |         245 → 122 → **89 ms** |              80 → 124 → **156** |
| Lista paginada (10 itens), **1 conexão** |                1,7 kB |              — → — → **8 ms** |            — → 13 → **12 ms** |                 — → — → **112** |
| Lista paginada (100 itens)               |               17,1 kB |            — → 65 → **62 ms** |            — → 83 → **84 ms** |               — → 149 → **152** |
| Home: lista inteira → overview           |    848,5 → **0,9 kB** |          684 → 63 → **63 ms** |          980 → 93 → **87 ms** |              14 → 147 → **151** |
| Resumo (`/summary`)                      |   246,0 → **29,9 kB** |         667 → 251 → **46 ms** |       1.622 → 333 → **62 ms** |               13 → 39 → **207** |
| Busca (`q=mercado`)                      |                1,8 kB |           84 → 57 → **58 ms** |          135 → 75 → **78 ms** |             111 → 168 → **166** |

- **Resumo: −96% no p95 e 16× a vazão.** Três causas se somam: agregação em SQL com índices
  (S1-05), cache do resultado no servidor (S3-04) e série de saldo com um ponto por dia (S4-10),
  que levou o payload de 210,6 para 29,9 kB.
- A coluna do meio da linha "1 conexão" é a rodada oficial do S1-10, a primeira que mediu esse
  cenário (só o p95 foi registrado).
- **Lista paginada:** p95 de 12 ms com 1 conexão (meta ≤ 100 ms) e 156 req/s com 10 conexões
  (+95% sobre os 80 req/s da baseline). Com 10 conexões, o p95 mede a fila do servidor, não a
  consulta ([s1-05 § 5](./s1-05-db-response-time.md#5-reavaliação-da-meta-da-lista-paginada-s1-10)).

### 3.2 Efeito do cache (1 conexão)

**Revalidação HTTP (S3-03):** o mesmo endpoint com `If-None-Match` igual à `ETag` atual.

| Endpoint | 200: bytes por resposta · p50 / p95 | **304**: bytes por resposta · p50 / p95 | Bytes economizados |
| -------- | ----------------------------------: | --------------------------------------: | -----------------: |
| Lista    |                 3,46 kB · 8 / 12 ms |                  **1,67 kB · 6 / 8 ms** |               −52% |
| Overview |                2,60 kB · 11 / 17 ms |                 **1,67 kB · 7 / 10 ms** |               −36% |
| Resumo   |                31,68 kB · 9 / 14 ms |                 **1,67 kB · 7 / 10 ms** |               −95% |

O 304 não tem corpo. Os 1,67 kB que sobram são cabeçalhos (CSP, HSTS, `ETag`, `Vary` e o cookie
de sessão que o proxy reemite a cada requisição). Quanto maior o JSON, maior o ganho.

**Cache do resumo no servidor (S3-04):** a mesma consulta, com uma faixa de datas nova a cada
requisição (sempre falta no cache), contra a faixa padrão (sempre acerta).

| Resumo, 1 conexão                        |      p50 |       p95 |   req/s |
| ---------------------------------------- | -------: | --------: | ------: |
| Faixa nova a cada requisição (sem cache) |    23 ms |     32 ms |      42 |
| Mesma faixa (cache do servidor)          | **9 ms** | **14 ms** | **101** |

O cache corta 61% do p50 e mais que dobra a vazão do resumo. Mesmo sem cache, o resumo leva 32 ms
no p95, porque a agregação já é feita no banco.

---

## 4. Payload da home

| Ponto                  | Dados da home no carregamento                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| S0-04                  | `GET /api/transactions` sem paginação: **848,5 kB** de JSON                                                  |
| S1-05                  | `GET /api/transactions/overview`: **0,9 kB** (saldo + 5 recentes)                                            |
| S3-04                  | **0 requisições**: overview e resumo vêm no HTML (`HydrationBoundary`)                                       |
| **Final (Lighthouse)** | **0 requisições** a `/api/*` nas 6 cargas da home, nem `/api/auth/session`; HTML de **11,3 kB** transferidos |

O HTML da home leva o overview, o resumo, o skeleton e a sessão e fica abaixo dos 14,6 kB da
primeira ida e volta do Lighthouse (gotcha 7 do S4-10). Em `/transactions`, o HTML tem 8,6 kB, e a
única chamada de API é o prefetch da página 2 (S2-08), que desde a correção da § 5 sai 1 s depois de
a lista ficar estável. A página 1 vem no HTML.

---

## 5. Busca

`node scripts/perf/search-requests.mjs`: digitação de "supermercado" (12 caracteres) em
`/transactions`, com debounce de 300 ms (RxJS) e tamanho mínimo de 2 caracteres (S2-02). A última
linha emula 600 ms de latência pelo CDP (`PERF_LATENCY_MS`), para que a requisição anterior ainda
esteja em voo quando o termo muda.

Cada célula traz as requisições ao digitar (buscas da página 1 + prefetches da página 2), os bytes
e as canceladas. A coluna "antes da correção" é o estado medido primeiro; "final" já tem a
correção desta task.

| Intervalo entre teclas         |            S0-04 |              Antes da correção |                     **Final** |
| ------------------------------ | ---------------: | -----------------------------: | ----------------------------: |
| 120 ms (rápida)                |   1 · 2,7 kB · 0 |         2 (1 + 1) · 6,6 kB · 0 |        2 (1 + 1) · 6,6 kB · 0 |
| 250 ms (média)                 |   1 · 2,7 kB · 0 |         2 (1 + 1) · 6,6 kB · 0 |        2 (1 + 1) · 6,6 kB · 0 |
| 400 ms (lenta)                 | 12 · 31,8 kB · 0 | **22 (11 + 11)** · 72,2 kB · 0 | **12 (11 + 1)** · 39,4 kB · 0 |
| 400 ms, com 600 ms de latência |                — |      12 (11 + 1) · 6,6 kB · 10 | 12 (11 + 1) · 6,6 kB · **10** |

O prefetch da página 2 da lista inicial (sem busca) fica fora da coluna "final". Desde a correção
ele sai 1 s depois da carga, já dentro da janela da digitação; antes, saía na carga.

- **1 requisição por termo estável: atingida.** Na digitação lenta, cada prefixo de 2 a 12
  caracteres fica parado mais de 300 ms, e cada um vira uma busca (11, contra 12 no S0-04, que
  também buscava o termo de 1 caractere).
- **Obsoletas canceladas: atingida.** Com a rede lenta, as 10 buscas intermediárias aparecem como
  `net::ERR_ABORTED` ("(canceled)" no DevTools) e só o termo final completa. Com o servidor local
  respondendo em ~10 ms, nenhuma requisição está em voo quando o termo muda, então não há o que
  cancelar.
- **Regressão encontrada e corrigida: o prefetch da página seguinte dobrava as requisições na
  digitação lenta.** O S2-08 busca a página n + 1 quando a lista tem mais de uma página. Com 5 mil
  transações, quase todo prefixo tem, então cada termo intermediário também gerava um prefetch da
  página 2, que nunca era usada: 22 requisições e 72,2 kB, contra 12 e 31,8 kB no S0-04. Com a rede
  lenta isso não acontecia, porque o prefetch só sai depois que a página 1 chega.
- **A correção:** o `usePrefetchNextTransactionsPage` (`@bytebank/api-client`) agora agenda o
  prefetch para 1 s depois de a página atual ficar estável. Se a chave muda antes (novo termo,
  filtro ou página), o agendamento é cancelado. Na digitação lenta, voltaram a ser 12 requisições:
  uma por termo e só o prefetch da página 2 do termo final. Os bytes (39,4 kB) seguem acima dos
  31,8 kB do S0-04, porque cada resposta tem ~0,6 kB a mais de cabeçalhos (CSP e o cookie que o
  proxy reemite) e porque o termo final ganha a página 2.
- **O custo:** quem clicar em "Página 2" menos de 1 s depois de a lista aparecer espera a
  requisição normal, com `aria-busy`, como antes do S2-08. Fora isso, o S2-08 continua valendo:
  com o `preload-nav.mjs checks`, a página 2 chegou pré-carregada, o clique nela não fez requisição
  (só o prefetch da página 3) e o clique → lista seguiu em 332 ms. Dois testes novos em
  `prefetch.integration.test.tsx` cobrem a espera e a digitação; os dois falham na versão
  anterior.
- O Lighthouse, o bundle e a API (§§ 1–3) foram medidos antes da correção. Ela só muda quando sai
  uma requisição de dados de 3,3 kB, e essas medidas não dependem dela.

---

## 6. Navegação

`node scripts/perf/preload-nav.mjs timing`: Slow 4G pelo CDP (150 ms, 1,6 Mbps), 1366 × 900,
conta com 25 transações, 3 pares intercalados por rota. "Sem preload" emula `saveData`, que
desliga todos os gatilhos do S2-08 na mesma build. Clique → conteúdo vem dos marks do app
(`nav:click` → `<conteúdo>:ready`). Medianas, com a faixa entre colchetes.

| Navegação             | Medida                    | S2-08: sem → com |                        **Final: sem → com** |
| --------------------- | ------------------------- | ---------------: | ------------------------------------------: |
| `/` → `/transactions` | clique → lista            |     522 → 333 ms | 642 [631–642] → **328** [325–331] ms (−49%) |
|                       | `loadRemote` do remote    |       193 → 2 ms |                              199 → **2** ms |
| `/transactions` → `/` | clique → visão geral      |     520 → 341 ms | 661 [631–667] → **331** [326–331] ms (−50%) |
|                       | clique → dashboard        |     835 → 341 ms | 965 [943–973] → **331** [326–331] ms (−66%) |
|                       | `loadRemote` do dashboard |       357 → 5 ms |                              374 → **4** ms |

- **Com preload, o clique → conteúdo segue em ~330 ms**, o piso do S2-08. Depois do clique, nenhuma
  requisição aos MFEs nem da página 1.
- **O dashboard voltou a aparecer junto com a visão geral.** Antes da correção do § 6.2, ele chegava
  ~330 ms depois: 977 [957–1.862] → 664 [641–725] ms com a mesma medição.

### 6.1 Rodadas de revelação do Suspense

No React 19.2, um commit que só revela conteúdo suspenso espera 300 ms desde a última troca entre
fallback e conteúdo, em qualquer boundary, e cada troca reinicia esse relógio
(`globalMostRecentFallbackTime + 300` em `react-dom-client.production.js`). Por isso o conteúdo
aparece em rodadas. `node scripts/perf/preload-nav.mjs suspense` registra, em relação ao clique,
quando cada skeleton entra e sai do DOM e quando cada remote resolve. São 3 execuções por caso, e a
tabela mostra a faixa. A coluna "`/` com, depois" é da build com a correção do § 6.2. As outras são
da build anterior, e a correção não muda esses casos.

| Marco (ms depois do clique)       | `/` sem preload | `/` com, antes | `/` com, depois | `/transactions` sem | `/transactions` com |
| --------------------------------- | --------------: | -------------: | --------------: | ------------------: | ------------------: |
| skeleton do `loading.tsx` aparece |           25–30 |          26–31 |           26–31 |               23–30 |               21–28 |
| RSC da rota respondeu             |         215–241 |        189–222 |         211–225 |             190–194 |             187–207 |
| remote acima da dobra resolvido   |         371–401 |        193–226 |         215–231 |             397–415 |             191–223 |
| página revelada                   |         325–327 |        329–331 |         322–329 |                   — |                   — |
| skeleton do dashboard aparece     |         333–346 |        351–356 |     não aparece |                   — |                   — |
| remote do dashboard resolvido     |         695–705 |        357–361 |         221–254 |                   — |                   — |
| visão geral ou lista revelada     |     **637–647** |    **329–331** |     **322–329** |         **628–634** |         **328–348** |
| dashboard revelado                |     **943–957** |    **656–658** |     **322–330** |                   — |                   — |

Na lista, o skeleton do `loading.tsx` e o do `next/dynamic` têm o mesmo rótulo, e a revelação da
página não aparece no DOM.

- **1ª rodada: o `loading.tsx`.** Desde o S3-04, as rotas são dinâmicas, e o `loading.tsx` mostra o
  skeleton ~25 ms depois do clique. A página só pode ser revelada 300 ms depois disso, em ~330 ms,
  mesmo com o RSC de volta em ~190–240 ms. Com preload, o remote resolve antes, e a visão geral e a
  lista aparecem nessa rodada.
- **Sem preload, o remote perde a 1ª rodada.** Ele resolve em ~370–415 ms, depois da revelação da
  página, que reiniciou o relógio. A visão geral e a lista esperam a 2ª rodada (~630–650 ms),
  ~230–270 ms depois de prontas. A diferença para o S2-08 (522 → ~640 ms) vem dessa rodada a mais, e
  não da espera pelo RSC, que volta antes de a página poder ser revelada.
- **Antes da correção, o dashboard sempre caía na 2ª rodada.** O `DeferUntilVisible` só entrava na
  árvore com a página. O `IntersectionObserver` disparava ~20 ms depois, o `next/dynamic` suspendia e
  o skeleton do dashboard reiniciava o relógio. Com preload, o remote resolvia 5 ms depois, mas o
  dashboard só aparecia 300 ms depois do skeleton. O `preloadRemote` baixa o chunk sem avaliar o
  módulo, então o primeiro render sempre suspende. No S2-08, a rota era estática e não tinha
  `loading.tsx`: o `DeferUntilVisible` montava antes da revelação, e o dashboard suspendia na mesma
  rodada da visão geral. Sem preload, o skeleton do dashboard ainda empurra a visão geral de ~626
  para ~640 ms, o que a correção não muda.

### 6.2 Correção: dashboard na rodada da página

Quando o remote do dashboard já foi pré-carregado, o `DashboardRemote` monta o dashboard no
primeiro render da página, sem esperar o `IntersectionObserver` (`eager` do `DeferUntilVisible`). O
`next/dynamic` suspende durante o render da página, o remote resolve antes de a 1ª rodada fechar, e
o dashboard aparece no mesmo commit da visão geral. O conjunto de remotes pré-carregados saiu do
`lib/federation.ts` para o `lib/preloadedRemotes.ts`, porque o `federation.ts` só entra por
`import()` e o `DashboardRemote` precisa consultar o conjunto de forma síncrona.

- **Com preload:** clique → dashboard 664 → **331 ms**. O clique → visão geral ficou igual (332 →
  331 ms).
- **Sem preload, 2G e carregamento direto: mesmo caminho de antes.** Sem preload, o conjunto está
  vazio. No 2G, nada baixou na ociosidade nem no hover, e o dashboard levou 943 ms (962 ms antes). No
  carregamento direto de `/`, o conjunto está vazio na hidratação. O HTML do SSR mantém o espaço de
  640 px, o console fica sem erros de hidratação, e o dashboard só é pedido depois da rolagem, em
  375 × 667 e em 1366 × 900. Como o HTML e a hidratação seguem iguais, o LCP não deve mudar (não
  remedido).
- **Custo residual:** com preload, o dashboard monta mesmo abaixo da dobra (no mobile, por exemplo).
  O custo é avaliar o módulo já baixado e renderizar os KPIs. Sem rolar, a navegação não pediu
  nenhum chunk de gráfico, nenhuma rota da API e nenhum asset dos MFEs. Os gráficos continuam no
  `DeferUntilVisible` do próprio dashboard, e os dados do resumo vêm no RSC.

---

## 7. Causalidade

Para cada otimização, a métrica que ela moveu, medida antes e depois na task que a introduziu. A
última coluna traz o estado final de hoje, quando ele foi remedido.

| Otimização                                 | Task  | Métrica                               | Antes → Depois                                                                                                                                                                             | Hoje                                                                       |
| ------------------------------------------ | ----- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Índices + agregação em SQL                 | S1-05 | p95 do resumo                         | 1.622 → 333 ms ([S1-05](./s1-05-db-response-time.md#1-api-com-5000-transações))                                                                                                            | 62 ms, somando o cache do servidor e a série por dia                       |
| Overview na home                           | S1-05 | payload da home                       | 848,5 → 0,9 kB; p95 980 → 93 ms ([S1-05](./s1-05-db-response-time.md#1-api-com-5000-transações))                                                                                           | 0 requisições: os dados vêm no HTML (S3-04)                                |
| Preload de remotes e dados                 | S2-08 | clique → conteúdo                     | 522 → 333 ms (lista), 835 → 341 ms (dashboard) ([S2-08](./s2-08-preload.md#1-clique--conteúdo))                                                                                            | 642 → 328 ms (lista), 661 → 331 ms (visão geral), 965 → 331 ms (dashboard) |
| Gráficos fora do shell                     | S2-09 | JS de `/transactions`, TBT            | 502,6 → 310,3 KiB, TBT 46 → 6 ms; chunk da federação 152,2 → 48,1 KiB gzip ([S2-09](./s2-09-lazy-loading.md))                                                                              | 0 scripts com recharts; chunk da federação 45,7 KiB gzip                   |
| Busca reativa + cancelamento               | S2-02 | requisições obsoletas                 | 0 canceladas → obsoletas abortadas ([S2-02](../sprint-2-state-reactive/02-reactive-search.md#validação))                                                                                   | 10 de 10 canceladas com 600 ms de latência (§ 5)                           |
| Prefetch da página n + 1 com 1 s de espera | S4-04 | requisições ao digitar (400 ms/tecla) | 22 → 12 requisições, 72,2 → 39,4 kB (§ 5)                                                                                                                                                  | a página 2 ainda chega pré-carregada no clique                             |
| Dashboard na rodada da página              | S4-04 | clique → dashboard, com preload       | 664 → 331 ms; visão geral 332 → 331 ms (§ 6.2)                                                                                                                                             | o dashboard aparece junto com a visão geral                                |
| ETag/304                                   | S3-03 | bytes transferidos na revalidação     | JSON inteiro → 304 sem corpo ([S3-03](../sprint-3-cache-security/03-http-cache.md#evidências--2026-10-20))                                                                                 | 31,7 → 1,7 kB (resumo), 3,5 → 1,7 kB (lista), 2,6 → 1,7 kB (overview)      |
| Cache do resumo no servidor                | S3-04 | tempo do resumo                       | 224 ms na 1ª leitura, 18–33 ms nas seguintes ([S3-04](../sprint-3-cache-security/04-server-cache-ssr-prefetch.md#evidências--2026-10-20))                                                  | p50 23 → 9 ms, p95 32 → 14 ms, 42 → 101 req/s (§ 3.2)                      |
| Prefetch no SSR                            | S3-04 | remote carregado → conteúdo pronto    | 278 → 126 ms (`/`), 294 → 144 ms (`/transactions`); LCP mobile sem mudança ([S3-04](../sprint-3-cache-security/04-server-cache-ssr-prefetch.md#evidências--2026-10-20))                    | não remedido                                                               |
| Elemento de LCP fora da cascata            | S4-10 | LCP mobile                            | Local (A/B 10 × 10): 4.132 → 2.512 ms (`/`), 4.633 → 2.507 ms (`/transactions`); FCP +14 ms (TTFB da sessão) ([S4-10](../sprint-4-audit-delivery/10-mobile-lcp.md#evidências--2026-10-29)) | best-of-3: 2,08 s (`/`) e 2,79 s (`/transactions`); produção pendente      |
| Série de saldo por dia                     | S4-10 | HTML da home                          | 13,6 → 11,6 kB transferidos (1.250 → 168 pontos para o `perf.user`), abaixo dos 14,6 kB da 1ª ida e volta ([S4-10](../sprint-4-audit-delivery/10-mobile-lcp.md#notas-de-implementação))    | HTML de 11,3 kB; payload do `/summary` 210,6 → 29,9 kB                     |

Duas observações sobre a tabela:

- As medições do S2-09 foram feitas num Apple M4, por outro membro do time. Valem como A/B na
  mesma máquina, não como comparação direta com os números desta máquina.
- O S2-08 teve um custo que só apareceu agora, com 5 mil transações: o prefetch da página n + 1
  durante a busca. Ele foi corrigido nesta task (§ 5).

---

## 8. Metas do PLAN.md

| Meta                                                 | Ponto de partida                      | Meta da Fase 4                            | Agora                                                                           | Situação                |
| ---------------------------------------------------- | ------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------- | ----------------------- |
| Lighthouse mobile `/`                                | 67 (Fase 2) · 68 (prod S0-04)         | ≥ 85 (produção, best-of-3)                | 83 (local, best-of-3); mediana 86,5 no A/B controlado do S4-10                  | **pendente**            |
| Lighthouse mobile `/transactions`                    | 72 · 71                               | ≥ 85 (produção, best-of-3)                | 74 (local, best-of-3); mediana 85 no A/B controlado do S4-10                    | **pendente**            |
| Lighthouse desktop (todas)                           | 97–100                                | ≥ 95 (sem regressão), CLS = 0             | 100 · 100 · 100, CLS 0 (local)                                                  | **atingida** localmente |
| recharts no carregamento de `/transactions`          | sim (138 kB gzip)                     | não                                       | 0 scripts com recharts                                                          | **atingida**            |
| p95 do resumo (5 mil transações)                     | 1.622 ms                              | −50% (≤ 811 ms)                           | 62 ms (−96%)                                                                    | **atingida**            |
| p95 da lista (5 mil transações)                      | 980 ms (lista inteira da home)        | −50% (≤ 490 ms)                           | 87 ms (overview); a lista sem paginação deixou de existir                       | **atingida**            |
| Tempo de resposta da lista paginada (p95, 1 conexão) | não medido                            | ≤ 100 ms                                  | 12 ms                                                                           | **atingida**            |
| Vazão da lista paginada (10 conexões)                | 80 req/s                              | acima da baseline, mesma máquina          | 156 req/s (+95%)                                                                | **atingida**            |
| Payload da home                                      | lista completa (848,5 kB)             | saldo + 5 recentes                        | 0 requisições de dados; tudo no HTML de 11,3 kB                                 | **atingida**            |
| Requisições por termo de busca                       | 1 (rápida) / 12 (lenta), 0 canceladas | 1 por termo estável; obsoletas canceladas | 1 por termo + 1 prefetch da página 2 do termo final; 10/10 obsoletas canceladas | **atingida**            |

- **Mobile ≥ 85 (pendente).** O LCP, que era o teto estrutural apontado desde a Fase 2, caiu ~2 s
  e não segura mais a nota. O que falta é o TBT, que nesta máquina oscila entre 0,5 e 1,5 s com o
  mesmo código. A medição que decide é a de produção (Task 09), com o comando da § 1.4. Se a
  produção ficar abaixo de 85, o próximo passo é reduzir o JS que executa antes da interação:
  runtime do Module Federation duplicado em cada remote entry (§ 2.3) e o pré-carregamento ocioso
  da próxima rota, que compete pela CPU durante a carga.
- **Desktop (atingida localmente).** Falta confirmar CLS = 0 em produção, onde o S0-04 viu 0,004
  na home mobile por causa da latência real.
- **Busca (atingida).** Cada termo estável gera uma busca, e as obsoletas são canceladas quando
  ainda estão em voo. O prefetch da página 2 dos termos intermediários, que dobrava as requisições,
  foi corrigido nesta task (§ 5).
- As metas de segurança e qualidade do PLAN.md (ZAP, `npm audit`, autorização, cobertura do core)
  estão fora deste relatório. Ver a [auditoria OWASP](../sprint-4-audit-delivery/03-owasp-audit-zap.md).

---

## 9. Prints para o vídeo

Gerados com `node scripts/perf/video-prints.mjs`, que abre o **DevTools real** do Chromium ligado à
página (porta de depuração remota) e fotografa o painel Network. Ficam em
[`docs/phase-4/assets/perf/`](../assets/perf/).

| Print                                                                                                                                                                                        | O que mostra                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`network-preload-hover.png`](../assets/perf/network-preload-hover.png)                                                                                                                      | Home ociosa + hover em "Transações": o expose do remote da rota atual (preload do HTML do servidor), o `TransactionsPage` (ociosidade) e a página 1 da lista (hover), antes do clique |
| [`network-preload-click.png`](../assets/perf/network-preload-click.png)                                                                                                                      | Depois do clique: nenhum download novo do remote nem da página 1; só o prefetch da página 2 e o expose do dashboard (ociosidade depois do `transactions:ready`)                       |
| [`network-304.png`](../assets/perf/network-304.png)                                                                                                                                          | `GET /api/transactions/overview` duas vezes: 200 (2,4 kB, 149 ms) e depois **304** (1,4 kB, 18 ms)                                                                                    |
| [`network-busca-canceladas.png`](../assets/perf/network-busca-canceladas.png)                                                                                                                | Busca de "supermercado" com 600 ms de latência: 10 requisições **(canceled)**, a do termo final e o prefetch da página 2                                                              |
| [`lighthouse-s4-10-antes-home.png`](../assets/perf/lighthouse-s4-10-antes-home.png) e [`…-depois-home.png`](../assets/perf/lighthouse-s4-10-depois-home.png)                                 | Lighthouse mobile da home antes e depois do S4-10: LCP 4,1 → 2,5 s, com a ilustração pintada desde o primeiro quadro do filmstrip                                                     |
| [`lighthouse-s4-10-antes-transactions.png`](../assets/perf/lighthouse-s4-10-antes-transactions.png) e [`…-depois-transactions.png`](../assets/perf/lighthouse-s4-10-depois-transactions.png) | O mesmo em `/transactions`: LCP 4,6 → 2,5 s                                                                                                                                           |
| [`lighthouse-final-home-mobile.png`](../assets/perf/lighthouse-final-home-mobile.png) e [`…-transactions-mobile.png`](../assets/perf/lighthouse-final-transactions-mobile.png)               | As execuções de melhor nota do best-of-3 de hoje (§ 1.1)                                                                                                                              |

- Os prints do Lighthouse mostram o bloco de métricas e o filmstrip do relatório real (gerado a
  partir do JSON pelo `ReportGenerator` do próprio Lighthouse). O medidor de nota ficou de fora:
  no Chromium headless deste Windows, o número saía desenhado duas vezes, sobreposto. As notas
  estão nas tabelas da § 1.
- Para o par antes/depois do S4-10, foi usada, em cada lado, a amostra mais próxima das medianas de
  LCP e TBT do A/B controlado: `before-home-5`, `after-daily-home-8`, `before-transactions-8` e
  `after-daily-transactions-5`.
- No vídeo, o 304 também aparece ao vivo: no Console, `fetch('/api/transactions/overview')` duas
  vezes. O Chromium entrega 200 ao JavaScript, mas o DevTools mostra o 304 da rede (S3-03).

---

## Pendências e próximos passos

| Item                                                             | Onde                      |
| ---------------------------------------------------------------- | ------------------------- |
| Lighthouse best-of-3 em produção (meta 16) e CLS em produção     | Task 09, comando da § 1.4 |
| Conta de medição em produção: `perf.user` recusou a senha padrão | Task 09                   |
| Runtime do Module Federation duplicado em cada remote entry      | S4-10 Parte D, § 2.3      |

---

## Como reproduzir

Os scripts ficam em [`scripts/perf/`](../../../scripts/perf/) e escrevem as saídas cruas em `perf/`
(ignorado pelo Git). O cookie de sessão fica em `.secrets/` (também ignorado).

### 1. Ambiente local com 5.000 transações

Banco descartável, para não mexer no volume do `bytebank-db`. As chaves de criptografia são as de
teste de [`e2e/keys.ts`](../../../e2e/keys.ts), as mesmas que o Playwright passa ao servidor;
exporte `DATA_ENCRYPTION_KEYS`, `DATA_ENCRYPTION_ACTIVE_KEY_ID` e `BLIND_INDEX_KEY` com esses
valores antes do seed e do servidor.

```bash
docker run -d --rm --name bytebank-s404-pg -e POSTGRES_USER=bytebank -e POSTGRES_PASSWORD=bytebank \
  -e POSTGRES_DB=bytebank -p 55432:5432 postgres:16-alpine
export DATABASE_URL=postgres://bytebank:bytebank@localhost:55432/bytebank
npm run db:migrate -w @bytebank/shell
PERF_COUNT=5000 npm run db:seed-load -w @bytebank/shell     # perf.user@bytebank.test / Senha123!

npm run build -w @bytebank/dashboard-mfe
npm run build -w @bytebank/transactions-mfe
NEXT_PUBLIC_DASHBOARD_MFE_URL=http://localhost:3002/mf-manifest.json \
NEXT_PUBLIC_TRANSACTIONS_MFE_URL=http://localhost:3003/mf-manifest.json \
NEXT_PUBLIC_API_URL=/api LOCAL_UPLOADS_DIR=.uploads npm run build -w @bytebank/shell

npm run preview -w @bytebank/dashboard-mfe &       # :3002
npm run preview -w @bytebank/transactions-mfe &    # :3003
HOSTNAME=localhost AUTH_TRUST_HOST=true AUTH_URL=http://localhost:3000 \
AUTH_SECRET=bytebank-e2e-auth-secret-bytebank-e2e-auth-secret \
NEXT_PUBLIC_API_URL=/api \
NEXT_PUBLIC_DASHBOARD_MFE_URL=http://localhost:3002/mf-manifest.json \
NEXT_PUBLIC_TRANSACTIONS_MFE_URL=http://localhost:3003/mf-manifest.json \
HIBP_ENABLED=false CSP_MODE=enforce BLOB_READ_WRITE_TOKEN= LOCAL_UPLOADS_DIR="$PWD/.uploads" \
node e2e/startShellStandalone.mjs                   # :3000

node scripts/perf/session-cookie.mjs http://localhost:3000
```

### 2. Medições

```bash
node scripts/perf/api-bench.mjs     # rodar duas vezes e descartar a primeira (aquecimento)

for d in 120 250 400; do PERF_KEY_DELAY=$d node scripts/perf/search-requests.mjs; done
PERF_KEY_DELAY=400 PERF_LATENCY_MS=600 PERF_SETTLE_MS=4000 node scripts/perf/search-requests.mjs

node scripts/perf/preload-nav.mjs timing
node scripts/perf/preload-nav.mjs suspense

node scripts/perf/lighthouse-batch.mjs s404-local http://localhost:3000
node scripts/perf/lh-summary.mjs s404-local

node scripts/perf/bundle-report.mjs
node scripts/perf/bundle-report.mjs perf/lh-s404-local-home-mobile-3.json perf/lh-s404-local-transactions-mobile-2.json

node scripts/perf/video-prints.mjs docs/phase-4/assets/perf <relatórios do Lighthouse>
```

- O `api-bench.mjs` ganhou os cenários de revalidação (manda `If-None-Match` com a `ETag` da sonda
  e espera 304) e o do resumo sem cache (uma faixa `to` nova a cada requisição). A tabela passou a
  mostrar o status esperado e os bytes por resposta.
- O `search-requests.mjs` aceita `PERF_LATENCY_MS`, que emula latência pelo CDP.
- O `lighthouse-batch.mjs` usa o Chromium do Playwright (`CHROME_PATH` sobrescreve) e repete a
  execução que volta com `runtimeError`. Uma amostra que falhe três vezes aparece como `FALHOU`;
  refaça só ela, com os mesmos argumentos e o mesmo nome de arquivo, antes do `lh-summary.mjs`.
- O `video-prints.mjs` precisa das portas 3000–3003 no ar e do cookie em `.secrets/`. O DevTools é
  carregado do próprio Chromium (`--remote-debugging-port` + `--remote-allow-origins`).
