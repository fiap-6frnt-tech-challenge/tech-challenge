# Task 11 — Perf: otimizações + `docs/phase-2/perf-audit.md` (antes/depois)

|                        |                                                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 4 — Deploy + Polish + Demo](../sprint-4-deploy-polish.md)                                                                         |
| **Owner**              | Dev 3 (State & Integration)                                                                                                               |
| **Duração estimada**   | 1 dia                                                                                                                                     |
| **Branch recomendada** | `dev3/perf-optimizations`                                                                                                                 |
| **Status**             | 🟡 Parcial — desktop ✅ / mobile: `/login` ✅, `/` e `/transactions` abaixo do alvo (LCP federado). Ver [perf-audit.md](../perf-audit.md) |

---

## Dependências

- **O que bloqueia esta tarefa:** [Task 10 — Perf audit](./10-perf-audit.md). Sem a baseline e a lista de gargalos, otimização é chute.
- **O que esta tarefa desbloqueia:** o critério de aceite **Lighthouse Perf ≥ 90 desktop / 85 mobile** e o entregável **`docs/phase-2/perf-audit.md`** (com scores antes/depois). Fecha o requisito de "melhorias de performance" da Fase 2.

---

## Contexto

Com a baseline da Task 10, aplicar as otimizações de maior impacto e **re-medir** para provar o ganho. Foco em LCP (MFE federado) e TTI (JS).

---

## Implementação

### Otimizações candidatas

- [x] **Preload do `mf-manifest.json`** dos MFEs no `<head>` do shell (`app/layout.tsx`).
- [x] **Preconnect** às origins dos MFEs (`app/layout.tsx`).
- [ ] **Font preload** (Inter) — **N/A**: não há `next/font`/`@font-face`; 'Inter' é fallback do sistema.
- [x] **Lazy load de modais** via `React.lazy`+`Suspense` no `transactions-mfe` (`TransactionsPage.tsx`) — modais/form viram chunk async.
- [ ] **`next/image`** — sem ganho: CLS já é 0.
- [ ] **Tree-shaking deps > 100 KB** — `optimizePackageImports` já cobre lucide/DS/hookform; recharts/zod ficam via singleton do shell (ver perf-audit).
- [x] **Skeleton com altura reservada** — já feito (CLS 0); + **defer do `DashboardRemote`** (`DeferUntilVisible`) tira recharts do load inicial da home.

### Re-medição

Rodar o mesmo protocolo Lighthouse da Task 10 (mesmo preset/URL) e registrar o delta.

### `docs/phase-2/perf-audit.md`

```markdown
## Performance — antes / depois

| Página        | Métrica | Antes | Depois | Alvo |
| ------------- | ------- | ----- | ------ | ---- |
| /             | Perf    | 8x    | ≥90    | ≥90  |
| /             | LCP     | x.xs  | <2.5s  | <2.5 |
| /transactions | Perf    | 8x    | ≥90    | ≥90  |

...
```

- seção "Otimizações aplicadas" (o quê, por quê, impacto) e "Trade-offs / pendências".

---

## Validação (critério de aceite da Fase 2)

- [~] Perf ≥ 90 desktop / ≥ 85 mobile em `/`, `/transactions`, `/login`. **Desktop ✅ (95–100).** Mobile: `/login` ✅ (99); `/` (67) e `/transactions` (72) **abaixo do alvo** — gargalo LCP da cadeia `ssr:false`+federação (precisa SSR do MFE; fora do escopo). Medido em build de prod local (prod Vercel = Fase 1 até o merge).
- [x] **CLS < 0.1** (=0 em todas). FCP ok. LCP ainda >2.5s nas federadas mobile. TTI deprecado no LH12 (usar TBT).
- [x] `docs/phase-2/perf-audit.md` com tabela antes/depois (best-of-3) preenchida com números reais.

---

## Gotchas

1. **Preload demais polui a rede** e pode piorar o FCP — preload só do crítico (manifest + fonte), não de tudo.
2. **`modulepreload` cross-origin** exige `crossorigin` correto, senão o browser baixa duas vezes.
3. **Não regredir A11y** ao mexer em markup (skip link, foco) — re-rodar o Lighthouse A11y após as mudanças (sync com Task 08).
4. **CLS do MFE:** reservar a altura do container do remote **antes** de ele montar; medir com Layout Shift regions no DevTools.
5. **Se não bater o alvo:** documentar o gap e o motivo no relatório (a Task 11 pode entregar parcial, conforme prioridade da Sprint).
