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

| Métrica                          | Baseline | Meta               | Agora                | Situação                                   |
| -------------------------------- | -------- | ------------------ | -------------------- | ------------------------------------------ |
| p95 do resumo                    | 1.622 ms | ≤ 811 ms (−50%)    | **333 ms** (−79%)    | **batida**                                 |
| p95 da lista (home)              | 980 ms   | ≤ 490 ms (−50%)    | **93 ms** (overview) | **batida** — a home não baixa mais a lista |
| Payload da home                  | 848,5 kB | saldo + 5 recentes | **0,9 kB**           | **batida** (meta da task: ~2 kB)           |
| p95 da lista paginada (sugerida) | 245 ms   | ≤ 100 ms           | 122 ms               | **não batida** — ver leitura               |

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
  mas muda o contrato do gráfico — fica como sugestão para o S3-04.
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
duas transações no mesmo dia, por isso a equivalência é exata.

## Como reproduzir

Igual à [baseline](./baseline.md#como-reproduzir), com duas diferenças:

1. Rodar `npm run db:migrate -w @bytebank/shell` **antes** do seed, para criar os índices
   (a migração `0004` também cria a extensão `pg_trgm`).
2. O servidor standalone não lê `.env.local`; além das variáveis da baseline, exportar
   `AUTH_SECRET`, `DATABASE_URL` e `LOCAL_UPLOADS_DIR` (o container exige storage em produção).

O `api-bench.mjs` trocou o endpoint "lista completa (sem paginação)", que não existe mais, por
"lista paginada (100 itens)" e "overview da home".
