# S1-05 — Tempo de resposta: antes × depois

> Remedição da [baseline](./baseline.md) depois da task
> [S1-05](../sprint-1-clean-architecture/05-db-response-time.md): índices, agregações em SQL,
> endpoint de overview e paginação obrigatória em `GET /api/transactions`.
>
> Owner: Dev 3 (Performance & Plataforma)

## Condições da medição

|                |                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------- |
| **Data**       | 06/10/2026                                                                                          |
| **Código**     | branch `dev3-perf/db-response-time` (base `6b3783a`)                                                |
| **Máquina**    | a mesma da baseline (i3-1115G4, 4 núcleos, 3,8 GB de RAM), ~0,45 GB livres — Ressalva 1 vale igual  |
| **Banco**      | PostgreSQL 16 em Docker (`postgres:16-alpine`), migrado até `0004_response_time_indexes`            |
| **Dados**      | mesmo cenário do S0-04: `db:seed` (54 da `joana`) + `db:seed-load` (5.000 do `perf-user`), 0 anexos |
| **Servidor**   | `next build` + `node e2e/startShellStandalone.mjs` na :3000                                         |
| **Ferramenta** | `node scripts/perf/api-bench.mjs` — 10 conexões, 15 s por endpoint                                  |

Como na baseline, a primeira rodada do bench serviu de aquecimento do pool e foi descartada; os
números abaixo são da segunda.

## 1. API com 5.000 transações

| Endpoint                                      | Payload antes | Payload depois | p50 antes → depois | p95 antes → depois | req/s antes → depois |
| --------------------------------------------- | ------------: | -------------: | -----------------: | -----------------: | -------------------: |
| `GET /api/transactions?_page=1&_per_page=10`  |        1,7 kB |         1,7 kB |    103 → **75** ms |   245 → **122** ms |         80 → **124** |
| `GET /api/transactions/summary`               |      246,0 kB |       210,6 kB |   667 → **251** ms | 1.622 → **333** ms |          13 → **39** |
| `GET /api/transactions?q=mercado&…`           |        1,8 kB |         1,8 kB |     84 → **57** ms |    135 → **75** ms |        111 → **168** |
| Home: `GET /api/transactions` (lista inteira) |  **848,5 kB** |              — |             684 ms |             980 ms |                   14 |
| Home: `GET /api/transactions/overview`        |             — |     **0,9 kB** |              63 ms |          **93 ms** |                  147 |
| `GET /api/transactions?_page=1&_per_page=100` |             — |        17,1 kB |              65 ms |              83 ms |                  149 |

Zero respostas não-2xx. JSON cru em `perf/api-bench-2026-10-06T23-07-01-360Z.json` (não versionado).

### Metas do PLAN.md

| Métrica                          | Baseline | Meta               | Agora                | Situação                                                                    |
| -------------------------------- | -------- | ------------------ | -------------------- | --------------------------------------------------------------------------- |
| p95 do resumo                    | 1.622 ms | ≤ 811 ms (−50%)    | **333 ms** (−79%)    | **batida**                                                                  |
| p95 da lista (home)              | 980 ms   | ≤ 490 ms (−50%)    | **93 ms** (overview) | **batida** — a home não baixa mais a lista                                  |
| Payload da home                  | 848,5 kB | saldo + 5 recentes | **0,9 kB**           | **batida** (meta da task: ~2 kB)                                            |
| p95 da lista paginada (sugerida) | 245 ms   | ≤ 100 ms           | 122 ms               | **substituída** — ver [§ 5](#5-reavaliação-da-meta-da-lista-paginada-s1-10) |

### Leitura

- **O resumo caiu 79% no p95.** Antes, `summary` trazia as 5.000 linhas (com anexos) e agregava em
  JS; agora são três consultas agregadas em paralelo (`monthlyTotals`, `categoryTotals`,
  `balanceSeries`) e só o resultado atravessa a rede do banco.
- **A home passou de 848,5 kB para 0,9 kB.** Confirmado no navegador (Playwright, build de produção
  com os dois MFEs em `rsbuild preview`): a única chamada de dados de `/` é
  `GET /api/transactions/overview` → 200, 0,9 kB. Saldo e 5 recentes renderizam iguais.
- **O payload do resumo caiu 14% sem mudar o contrato**: os valores agora saem arredondados em
  centavos (`round(sum(amount::numeric), 2)`), sem as caudas de ponto flutuante
  (`4633.599999999999`). Os 210 kB restantes são quase todos `balanceOverTime`, que tem um ponto
  **por transação** (5.000 pontos). Agrupar por dia (≈ 700 pontos) é o próximo ganho de payload,
  mas muda o contrato do gráfico — fica como sugestão para o S3-04. Feito no
  [S4-10](../sprint-4-audit-delivery/10-mobile-lcp.md#notas-de-implementação): um ponto por dia.
- **Lista paginada de 10 itens: 122 ms, acima dos 100 ms sugeridos.** No mesmo bench, a página de
  **100** itens deu p95 de 83 ms, o que indica que o p95 do primeiro endpoint da rodada é ruído de
  aquecimento/memória da máquina, não custo da consulta — no banco ela executa em **0,2 ms** (seção
  2). Reavaliar em hardware com mais memória antes de considerar a meta falhada.

## 2. `EXPLAIN ANALYZE`

O cenário do S0-04 tem um único usuário com 99% das linhas, e aí um seq scan é a escolha certa do
planner para "todas as linhas do usuário". Para provar o uso dos índices num banco multiusuário, a
medição abaixo foi feita com **95.000 linhas extras de 19 outros usuários** e anexos em 10% das
transações (dados descartados depois). A coluna "sem índices" roda o mesmo SQL numa transação que
faz `DROP INDEX` e depois `ROLLBACK`, no mesmo banco — A/B limpo, sem depender da máquina.

| Consulta (gerada pelo Drizzle)         |   Sem índices | Com índices | Plano com índices                                                                |
| -------------------------------------- | ------------: | ----------: | -------------------------------------------------------------------------------- |
| Overview — saldo                       |      15–16 ms |      2,8 ms | Bitmap Index Scan `transactions_user_category_idx`                               |
| Overview — 5 recentes / lista paginada |      27–29 ms |  **0,2 ms** | Index Scan Backward `transactions_user_date_idx` + `attachments_transaction_idx` |
| `monthlyTotals` (6 meses)              |      14–19 ms |      1,7 ms | Bitmap Index Scan `transactions_user_date_idx`                                   |
| `categoryTotals` (6 meses)             |      14–17 ms |      0,6 ms | Bitmap Index Scan `transactions_user_date_idx`                                   |
| `balanceSeries` (6 meses)              |      16–21 ms |  2,7–4,8 ms | Bitmap Index Scan `transactions_user_date_idx`                                   |
| Busca `ilike '%mercado%'`              |     45–128 ms |      3,4 ms | Bitmap Index Scan (por usuário)                                                  |
| Anexos de uma transação                |        1,0 ms |     0,05 ms | Index Scan `attachments_transaction_idx`                                         |
| **Antiga** lista completa + anexos     | **3,5–5,6 s** |       15 ms | Bitmap Index Scan + Index Scan nos anexos                                        |

- Toda consulta por usuário passa a usar índice; nenhum seq scan em `transactions` nem em
  `attachments` com os índices presentes.
- O maior ganho isolado é o **`attachments_transaction_idx`**: sem ele, o `left join lateral` dos
  anexos faz um seq scan em `attachments` **por transação**. É o que fazia a lista completa antiga
  levar segundos assim que existiam anexos — a baseline não mostrou isso porque o `perf-user` não
  tinha nenhum.
- No cenário de um usuário só, o GIN de trigramas (`transactions_description_trgm_idx`) é o
  escolhido para a busca (Bitmap Index Scan, 1,8 ms); com muitos usuários o planner prefere filtrar
  primeiro por `user_id`, como esperado.

## 3. Equivalência dos números

Testes de integração (`npm run test:integration -w @bytebank/shell`, Postgres descartável):

- `storeEquivalence.integration.test.ts` compara, sobre o seed, `monthlyTotals` / `categoryTotals`
  / `balanceSeries` / `overview` com as funções JS antigas (`aggregateByMonth`, `groupByCategory`,
  `cumulativeBalance`, `calculateBalance`) arredondadas em centavos, e o **resumo inteiro** do
  `GetTransactionsSummary` com o cálculo da Fase 2 em três recortes (sem período, período do
  dashboard, só início). Todos iguais.
- `DrizzleTransactionRepository.integration.test.ts` cobre a transferência neutra, período aberto e
  a soma `0,1 + 0,2 − 0,05 = 0,25` exata.

Uma diferença intencional: dentro do **mesmo dia**, `balanceSeries` agora acumula na ordem de
criação (`date, created_at, id`); a implementação antiga herdava a ordem inversa da consulta. O
saldo de fim de dia é o mesmo; só os pontos intermediários do dia mudam de ordem. O seed não tem
duas transações no mesmo dia, por isso a equivalência é exata. Desde o S4-10 a série tem um ponto
por dia (o saldo de fim de dia), e essa diferença deixou de existir.

## 4. Remedição na `phase-4` integrada (S1-10)

Feita em 12/10/2026 no commit `3f67e54`, com as Tasks 01–09 integradas, para o smoke de fechamento
do sprint ([S1-10](../sprint-1-clean-architecture/10-tests-smoke.md)). Mesmo script, cenário e
máquina, num Postgres descartável (`postgres:16-alpine`) migrado até `0004`. A primeira rodada foi
descartada; abaixo estão a segunda e a terceira, seguidas, sobre o mesmo build.

| Endpoint                                      |  Payload | p95 S1-05 | p95 rodada 2 | p95 rodada 3 | Meta                |
| --------------------------------------------- | -------: | --------: | -----------: | -----------: | ------------------- |
| `GET /api/transactions?_page=1&_per_page=10`  |   1,7 kB |    122 ms |       106 ms |    **87 ms** | ≤ 100 ms (sugerida) |
| `GET /api/transactions?_page=1&_per_page=100` |  17,1 kB |     83 ms |       102 ms |       103 ms | —                   |
| `GET /api/transactions/overview` (home)       |   0,9 kB |     93 ms |        95 ms |        92 ms | ≤ 490 ms            |
| `GET /api/transactions/summary`               | 210,6 kB |    333 ms |       456 ms |       329 ms | ≤ 811 ms            |
| `GET /api/transactions?q=mercado&…`           |   1,8 kB |     75 ms |        96 ms |        83 ms | —                   |

Zero respostas não-2xx. JSON cru em `perf/api-bench-2026-10-12T19-39-59-491Z.json` e no arquivo
seguinte (não versionados).

- **As metas do PLAN.md seguem batidas** (resumo, lista da home e payload da home). Os payloads são
  os mesmos do S1-05, então a integração das Tasks 06–09 não mudou as respostas da API.
- **O resumo variou de 456 para 329 ms entre duas rodadas seguidas do mesmo build**, com 0,26 GB de
  RAM livre (Docker, três servidores Node e o VS Code abertos). É a Ressalva 1 da baseline: a
  comparação vale como ordem de grandeza, não ao milissegundo.
- **A lista paginada de 10 itens deu 106 e 87 ms**, uma rodada acima e outra abaixo dos 100 ms
  sugeridos. A § 5 explica essa oscilação.

## 5. Reavaliação da meta da lista paginada (S1-10)

A meta sugerida na baseline era p95 ≤ 100 ms para `GET /api/transactions?_page=1&_per_page=10`,
medido como todo o bench: 10 conexões simultâneas. O S1-05 mediu 122 ms. Como a consulta leva
0,2 ms no banco (§ 2), a pergunta era onde estão os outros 120 ms.

Experimento em 12/10/2026, no mesmo build, máquina e dados da § 4: `autocannon`, 15 s por cenário,
com uma rodada de aquecimento descartada. Para comparação, `GET /api/auth/session` passa pelo Next e
decodifica a sessão, mas não toca o banco.

| Cenário                               |      p50 |            p95 |    Média |   req/s |
| ------------------------------------- | -------: | -------------: | -------: | ------: |
| Lista de 10 · 1 conexão               |     8 ms |      **15 ms** |   9,5 ms |     100 |
| Lista de 10 · 10 conexões (3 rodadas) | 64–70 ms | **101–142 ms** | 70–81 ms | 124–142 |
| `/api/auth/session` · 1 conexão       |     3 ms |           5 ms |   2,9 ms |     290 |
| `/api/auth/session` · 10 conexões     |    25 ms |          36 ms |    26 ms |     373 |

Zero respostas não-2xx; 0,22 GB de RAM livre durante a medição.

- **Uma requisição sozinha leva 9,5 ms (p95 de 15 ms).** A consulta é 0,2 ms disso; o resto é a
  pilha HTTP: o Next com a sessão (o endpoint de sessão inteiro leva 2,9 ms), a validação do
  filtro, duas idas ao banco pela rede do Docker (contagem e página com anexos) e a serialização.
- **Com 10 conexões, a latência é fila.** A média bate com a lei de Little (latência = conexões ÷
  vazão): 10 ÷ 124 req/s = 81 ms, 10 ÷ 133 = 75 ms, 10 ÷ 142 = 70 ms. Passar de 1 para 10 conexões
  só leva a vazão de 100 para ~135 req/s: o processo Node já está com a CPU saturada, e as outras
  nove requisições esperam na fila.
- **Por isso o p95 com 10 conexões oscila em volta do limite:** 87, 101, 106, 109, 122 e 142 ms nas
  rodadas desta máquina, com o mesmo código (e 170 ms na rodada oficial abaixo). Ficar abaixo de 100 ms exige sustentar uns 140 req/s,
  o que depende de quanta CPU e memória sobram aqui, não da consulta.

**Avaliação.** A meta, do jeito que foi formulada, mede a vazão desta máquina, não o tempo de
resposta da lista:

- O **tempo de resposta** de uma requisição é de 15 ms no p95, bem abaixo dos 100 ms.
- **Sob concorrência**, a lista melhorou em relação à baseline: a vazão subiu de 80 para 113–142
  req/s (+41% a +78%), e o p95 com 10 conexões caiu de 245 ms para 87–170 ms. Mas esse p95 não
  fica abaixo de 100 ms de forma estável neste hardware.

**Decisão (12/10/2026).** A meta sugerida foi substituída por duas, registradas nas
[metas do PLAN.md](../PLAN.md#metas-kpis). O `api-bench.mjs` passou a medir as duas: a lista de 10
itens roda também com 1 conexão, e a tabela ganhou a coluna "Conexões".

| Meta                                     | Como medir                   | Baseline            | Agora                | Situação   |
| ---------------------------------------- | ---------------------------- | ------------------- | -------------------- | ---------- |
| Tempo de resposta da lista: p95 ≤ 100 ms | `api-bench.mjs`, 1 conexão   | não medido no S0-04 | **13 ms**            | **batida** |
| Vazão da lista acima da baseline         | `api-bench.mjs`, 10 conexões | 80 req/s            | **113 req/s** (+41%) | **batida** |

Os números são da rodada oficial do `api-bench.mjs` atualizado, no mesmo cenário da § 4
(`perf/api-bench-2026-10-12T20-28-09-561Z.json`). Nessa rodada, o p95 com 10 conexões deu 170 ms,
o que confirma que ele mede a fila. A vazão é comparada na mesma máquina porque também depende dela:
nas medições do dia, ficou entre 113 e 142 req/s.

A consulta não será otimizada, porque já leva 0,2 ms. Se o time quiser mais vazão, o custo por
requisição está fora do banco: a sessão é decodificada duas vezes (no `proxy.ts` e no `route()`), e
a lista faz duas idas ao banco. Cada uma rende poucos milissegundos; o cache HTTP do S3-03
(ETag/304) é o lugar mais natural para ganhar vazão.

## Como reproduzir

Igual à [baseline](./baseline.md#como-reproduzir), com duas diferenças:

1. Rodar `npm run db:migrate -w @bytebank/shell` **antes** do seed, para criar os índices
   (a migração `0004` também cria a extensão `pg_trgm`).
2. O servidor standalone não lê `.env.local`; além das variáveis da baseline, exportar
   `AUTH_SECRET`, `DATABASE_URL` e `LOCAL_UPLOADS_DIR` (o container exige storage em produção).

O `api-bench.mjs` trocou o endpoint "lista completa (sem paginação)", que não existe mais, por
"lista paginada (100 itens)" e "overview da home". Desde a S1-10, ele também mede a lista de 10
itens com 1 conexão (tempo de resposta); os outros cenários usam `PERF_CONNECTIONS` (padrão 10).
