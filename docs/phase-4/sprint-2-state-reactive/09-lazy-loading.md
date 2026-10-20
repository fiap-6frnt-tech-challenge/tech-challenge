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

> **Nota do Spike A (S0-06, 2026-09-30)** — [evidências](../sprint-0-foundation/06-risk-spikes.md#spike-a--evidências-e-aprendizados). Depois do S2-01, o chunk da federação também carrega o rxjs inteiro: +66 kB raw / ~18 kB gzip, porque o namespace passado ao `shared` não sofre tree-shaking. Leve isso em conta ao anotar "chunk da federação menor". O rxjs não pode sair do `shared` com `import()`, porque o `lib` precisa ser síncrono; o custo fica restrito às páginas federadas, que já carregam esse chunk.

## Contexto

`apps/shell/src/lib/federation.ts` faz `import * as DS from '@bytebank/design-system'` para prover o DS como singleton aos remotes. Só que o barrel do DS exporta `BarChart`, `LineChart`, `PieChart`, `ChartTooltip` e `AccessibleChartData` — ou seja, **recharts** (~138 KB gzip na medição da Fase 2). Resultado: toda página federada, inclusive `/transactions` (que não tem gráfico), baixa e avalia o recharts. O zod (~74 KB gzip) aparece no mesmo caminho via `* as Shared`.

## Implementação

1. **Subpath de gráficos:** `@bytebank/design-system/charts` (`exports` no `package.json` + `src/charts.ts`), removendo os gráficos do barrel principal. O dashboard-mfe importa do subpath; os gráficos ficam no bundle do dashboard (não precisam ser compartilhados, só ele usa).
2. **Gráficos sob demanda:** cada widget do dashboard com `React.lazy` + `DeferUntilVisible` (os dois de baixo só carregam ao rolar) + `Suspense` usando o skeleton do `DashboardWidget`.
3. **Zod fora do caminho inicial:** schemas no subpath existente (`@bytebank/core/schemas`), com exports de runtime fora dos barrels compartilhados. O modal de criação da home também passa a ser lazy na primeira abertura. Conferir no analisador se o zod saiu do chunk da federação.
4. **Medir:** chunk de `lib/federation.ts`, JS inicial por rota e TBT mobile — antes/depois, com o método do S0-04.

## Validação

- [x] recharts ausente dos chunks carregados em `/transactions` (analisador + aba Network)
- [x] Na home mobile, os gráficos de baixo carregam ao rolar ou ao receber foco por Tab
- [x] Chunk da federação menor (anotado em KB gzip)
- [x] TBT mobile de `/` e `/transactions` melhor que a baseline

## Gotchas

1. O `optimizePackageImports` do Next não resolve este caso: o `import * as DS` é intencional (singleton). O corte precisa ser feito no pacote (subpath).
2. Confirme que nenhum componente do barrel importa gráficos internamente, senão o recharts volta pelo barrel.
3. `KpiCard` e `DashboardWidget` ficam no barrel (não usam recharts) — confira os imports de cada um.
4. Atualize stories e testes que importavam gráficos do barrel.

## Evidências — 2026-10-19

- Base atualizada com a S2-07: `phase-4` em `5b7dd3e`.
- Chunk de federação: **152,2 → 48,1 KiB gzip** (−68,4%). Grafo síncrono: Recharts **201 → 0**, Zod **78 → 0**.
- Home: JS inicial **554,9 → 306,7 KiB**, TBT mobile **224 → 5 ms**.
- Transações: JS inicial **502,6 → 310,3 KiB**, TBT mobile **46 → 6 ms**.
- Medição em produção local com 5.000 transações, três execuções por rota e o mesmo hardware. Método, todas as amostras e limites no [relatório de performance](../perf/s2-09-lazy-loading.md).
- Revisão independente identificou a falta de acesso aos widgets por Tab. Regiões focáveis carregam no foco; regressão unitária e navegação real corrigidas.
- Integração em 2026-10-20 com `phase-4` em `1218396`: marcadores `markContentReady`, handlers de preload e montagem condicional preservados; schema de anexos adaptado ao `downloadUrl` autenticado. As métricas acima são anteriores a essa integração.
