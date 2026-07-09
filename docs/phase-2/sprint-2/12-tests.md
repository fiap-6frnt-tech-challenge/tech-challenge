# Task 12 — Testes (agregações, hook, session sync, stories de gráfico)

> ⏳ **Status: Pending**

|                        |                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 2 — Dashboard MFE + Charts](../sprint-2-dashboard.md)                                                   |
| **Owner**              | Distribuído: `Dev 1` (agregações, register), `Dev 2` (stories de gráfico/KpiCard), `Dev 3` (hook, session sync) |
| **Duração estimada**   | 1.5 dia (somando as frentes)                                                                                    |
| **Branch recomendada** | `dev1/tests-summary`, `dev2/tests-charts`, `dev3/tests-state` (uma por frente)                                  |
| **Depende de**         | As implementações correspondentes (Tasks 1, 2, 3, 6, 7)                                                         |
| **PR só abre**         | Cada frente abre seu próprio PR junto da feature; o sprint fecha com a suíte verde                              |

---

## Dependências

- **O que bloqueia esta tarefa**: Cada bloco de teste depende da implementação que cobre. Não acumular para o fim — os testes acompanham a feature (princípio do [PLAN.md](../PLAN.md)).
- **O que esta tarefa desbloqueia**: Desbloqueia o **[Task 13 — Smoke Test & Demo](./13-smoke-test-demo.md)** com confiança (CI verde).

---

## Contexto

A cobertura do sprint se divide por frente, cada dev testando o que entregou. As funções de agregação são o alvo crítico de cobertura (≥ 80%, idealmente 100%, por serem puras). O fluxo de auth (session sync + register) ganha testes de reducer/serviço.

---

## Escopo por frente

### Dev 1 — Agregações + Register (`packages/shared`, `apps/shell`)

- [ ] `packages/shared/src/lib/transactions.test.ts`: casos para `aggregateByMonth`, `cumulativeBalance`, `groupByCategory`:
  - meses sem movimento, só transfers (neutros), categorias repetidas, base vazia, ordenação cronológica.
- [ ] Teste do endpoint/serviço de summary: shape correto, `401` sem sessão, filtro por `userId`.
- [ ] `db/users` (Task 2): hash não-reversível, `verifyCredentials` rejeita senha errada, e-mail normalizado (lowercase).

### Dev 2 — Stories/Interactions de gráfico (`packages/design-system`)

- [ ] `KpiCard.stories.tsx`: interaction test simulando delta positivo/negativo e verificando os `aria-label`/cores.
- [ ] Stories de `BarChart`/`LineChart`/`PieChart` cobrindo empty/loading/error (servem como testes via `@storybook/addon-vitest`).
- [ ] `DashboardWidget`: estado loading mostra skeleton, error mostra `ErrorState` + retry.

### Dev 3 — Hook + Session Sync (`packages/api-client`, `packages/stores`/`apps/shell`)

- [ ] `useDashboardSummary`: mock `fetch`, verificar query key por range e shape retornado.
- [ ] `authSlice` (já existe) + cobertura do `SessionSync`: dado `session` presente → `setSession` despachado; `session` null → `clearSession`. Mockar `useSession` e `next-auth/react`.
- [ ] Invalidação: mutation de transação invalida `summaryKeys.all`.

---

## Como rodar

```bash
# tudo
npx turbo run test

# por pacote
npm run test -w @bytebank/shared
npm run test -w @bytebank/api-client
npm run test -w @bytebank/stores
npx vitest --project=@bytebank/design-system   # stories via Playwright/Chromium
```

> Lembrete (memória de projeto): use `npm run test -w <pkg>` por pacote; evite `turbo run build` direto sob Bash.

---

## Validação

- [ ] `npx turbo run test` verde em todos os pacotes.
- [ ] Cobertura ≥ 80% nas funções de agregação (`packages/shared/src/lib/transactions.ts`).
- [ ] ≥ 15 testes novos no total (somando as frentes).
- [ ] A11y addon passa nos stories de gráfico.

---

## Gotchas

1. **Mock de `next-auth/react`**: ao testar `SessionSync`/`logout`, mockar `useSession`/`signOut` com `vi.mock('next-auth/react', ...)` para evitar erro de ESM (mesmo padrão da Sprint 1, Task 7).
2. **Fixtures de transfer**: como transfer é neutro, inclua-o nas fixtures para provar que não entra em income/expense.
3. **Stories são os testes**: no DS não há arquivos `*.test.tsx` separados — as stories rodam via `@storybook/addon-vitest` no Chromium headless.
4. **Recharts em ambiente de teste**: pode reclamar de `width/height=0` sem layout. Use `ResponsiveContainer` com tamanho mockado ou `play` functions que aguardam render.

---

## Próximo passo

→ **Fechar o sprint com o [Task 13 — Smoke Test Final & Demo](./13-smoke-test-demo.md).**
