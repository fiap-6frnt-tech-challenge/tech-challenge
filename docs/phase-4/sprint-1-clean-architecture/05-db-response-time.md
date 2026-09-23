# Task 05 — Tempo de resposta: índices, agregação em SQL, overview

|                 |                                                                 |
| --------------- | --------------------------------------------------------------- |
| **Sprint**      | [Sprint 1 — Clean Architecture](./README.md)                    |
| **Owner**       | Dev 3 (Performance & Plataforma)                                |
| **Duração**     | 1.5 dia                                                         |
| **Prioridade**  | P0                                                              |
| **Branch**      | `dev3-perf/db-response-time`                                    |
| **Depende de**  | Task 03 (repositórios), S0-04 (baseline)                        |
| **Desbloqueia** | S3-04 (prefetch do overview no SSR), S4-04                      |
| **Requisito**   | Melhoria no tempo de resposta · cache/otimização de requisições |
| **Embasamento** | Arquiteturas Avançadas — Aula 4 (Performance)                   |

---

## Contexto

- Não há nenhum índice em `transactions`: toda consulta por `user_id` faz seq scan.
- O resumo carrega **todas** as transações do período e agrega em JS.
- A home (`AccountOverview.tsx`) chama `useTransactions()` → `GET /api/transactions` sem paginação → baixa o histórico inteiro só para mostrar o saldo e as 5 recentes.

Com milhares de transações, isso domina o tempo de resposta e o payload.

## Implementação

1. **Índices** (migração Drizzle):

   ```ts
   export const transactions = pgTable(
     'transactions',
     {
       /* colunas */
     },
     (t) => [
       index('transactions_user_date_idx').on(t.userId, t.date),
       index('transactions_user_category_idx').on(t.userId, t.category),
     ]
   );

   export const attachments = pgTable(
     'attachments',
     {
       /* colunas */
     },
     (t) => [index('attachments_transaction_idx').on(t.transactionId)]
   );
   ```

   Para a busca `ilike '%termo%'`, uma migração SQL:

   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   CREATE INDEX transactions_description_trgm_idx ON transactions USING gin (description gin_trgm_ops);
   ```

2. **Agregações em SQL** no `DrizzleTransactionRepository` (`monthlyTotals`, `categoryTotals`, `balanceSeries`):
   ```sql
   SELECT to_char(date::date, 'YYYY-MM') AS month,
          SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END)    AS income,
          SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END) AS expense
   FROM transactions
   WHERE user_id = $1 AND date BETWEEN $2 AND $3
   GROUP BY 1
   ORDER BY 1;
   ```
   `balanceSeries` com função de janela: `SUM(<valor com sinal>) OVER (ORDER BY date, created_at)`.
3. **Overview:** `GET /api/transactions/overview` → `{ balance, recent: Transaction[5] }` (caso de uso `GetAccountOverview`) + hook `useAccountOverview` no `api-client`. O `AccountOverview.tsx` passa a usar o hook novo.
4. **Paginação obrigatória:** remover o ramo "sem `_page` devolve tudo" de `GET /api/transactions` (limite de `_per_page` em 100) — só depois de migrar a home.
5. **Medir de novo** com o mesmo script e cenário do S0-04; anotar antes/depois no PR e em `docs/phase-4/perf/`.

## Validação

- [ ] `EXPLAIN ANALYZE` mostra Index Scan nas consultas por usuário
- [ ] p95 do resumo e da lista melhor que a baseline (5 mil transações)
- [ ] Payload da home: da lista completa para ~2 KB
- [ ] Teste de equivalência: agregação SQL = agregação JS antiga para o seed (mesmos números no dashboard)
- [ ] `useTransactions()` sem uso restante (ou marcado como depreciado)

## Gotchas

1. `date` é `text` (`YYYY-MM-DD`): ordena corretamente como string e o índice `(user_id, date)` serve para faixas, mas para agrupar por mês faça cast (`date::date`).
2. Saldo em SQL: `SUM(CASE type WHEN 'deposit' THEN amount WHEN 'withdrawal' THEN -amount ELSE 0 END)` — transferência é neutra (regra do domínio). Cubra com teste comparando com `calculateBalance` do core.
3. `doublePrecision` somado em SQL tem o mesmo problema de ponto flutuante: arredonde na borda (`SUM(amount)::numeric(14,2)` ou `Money` no repositório).
4. O Neon suporta `pg_trgm`; o `postgres:16-alpine` do Docker também (extensão contrib incluída).
5. Coordene com o Dev 1: os métodos novos entram no `DrizzleTransactionRepository` da Task 03.
