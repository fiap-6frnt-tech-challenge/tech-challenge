# Task 09 — Lazy loading e code splitting (gráficos fora do shell)

|                 |                                                     |
| --------------- | --------------------------------------------------- |
| **Sprint**      | [Sprint 2 — Estado e reatividade](./README.md)      |
| **Owner**       | Dev 3 (Performance & Plataforma)                    |
| **Duração**     | 1.5 dia                                             |
| **Prioridade**  | P0                                                  |
| **Branch**      | `dev3-perf/lazy-loading`                            |
| **Depende de**  | S1-09 (DS reorganizado), S0-04 (baseline de bundle) |
| **Desbloqueia** | S4-04 (relatório)                                   |
| **Requisito**   | Lazy loading · melhoria no tempo de carregamento    |
| **Embasamento** | Arquiteturas Avançadas — Aula 4 (Performance)       |

---

## Contexto

`apps/shell/src/lib/federation.ts` faz `import * as DS from '@bytebank/design-system'` para prover o DS como singleton aos remotes. Só que o barrel do DS exporta `BarChart`, `LineChart`, `PieChart`, `ChartTooltip` e `AccessibleChartData` — ou seja, **recharts** (~138 KB gzip na medição da Fase 2). Resultado: toda página federada, inclusive `/transactions` (que não tem gráfico), baixa e avalia o recharts. O zod (~74 KB gzip) aparece no mesmo caminho via `* as Shared`.

## Implementação

1. **Subpath de gráficos:** `@bytebank/design-system/charts` (`exports` no `package.json` + `src/charts.ts`), removendo os gráficos do barrel principal. O dashboard-mfe importa do subpath; os gráficos ficam no bundle do dashboard (não precisam ser compartilhados, só ele usa).
2. **Gráficos sob demanda:** cada widget do dashboard com `React.lazy` + `DeferUntilVisible` (os dois de baixo só carregam ao rolar) + `Suspense` usando o skeleton do `DashboardWidget`.
3. **Zod fora do caminho inicial:** schemas em subpath (`@bytebank/core/schemas`) usado só por formulários (que já são lazy). Conferir no analisador se o zod saiu do chunk da federação.
4. **Medir:** chunk de `lib/federation.ts`, JS inicial por rota e TBT mobile — antes/depois, com o método do S0-04.

## Validação

- [ ] recharts ausente dos chunks carregados em `/transactions` (analisador + aba Network)
- [ ] Na home mobile, os gráficos de baixo só carregam ao rolar
- [ ] Chunk da federação menor (anotado em KB gzip)
- [ ] TBT mobile de `/` e `/transactions` melhor que a baseline

## Gotchas

1. O `optimizePackageImports` do Next não resolve este caso: o `import * as DS` é intencional (singleton). O corte precisa ser feito no pacote (subpath).
2. Confirme que nenhum componente do barrel importa gráficos internamente, senão o recharts volta pelo barrel.
3. `KpiCard` e `DashboardWidget` ficam no barrel (não usam recharts) — confira os imports de cada um.
4. Atualize stories e testes que importavam gráficos do barrel.
