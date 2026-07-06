# Task 10 — Perf: auditoria Lighthouse + `@next/bundle-analyzer`

|                        |                                                                           |
| ---------------------- | ------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 4 — Deploy + Polish + Demo](../sprint-4-deploy-polish.md)         |
| **Owner**              | Dev 3 (State & Integration)                                               |
| **Duração estimada**   | 1 dia                                                                     |
| **Branch recomendada** | `dev3/perf-audit`                                                         |
| **Status**             | ✅ Concluída — ver [10-perf-audit-results.md](./10-perf-audit-results.md) |

---

## Dependências

- **O que bloqueia esta tarefa:** [Task 03 — deploy](./03-cloud-deploy-mfes.md) (Lighthouse Perf precisa rodar em **produção**, não preview/local — o aceite exige isso) e [Task 07 — CORS](./07-cors-cross-origin.md) (MFE carregando cross-origin de forma estável).
- **O que esta tarefa desbloqueia:** [Task 11 — otimizações de perf](./11-perf-optimizations.md). Estabelece a **baseline** (scores "antes") que a Task 11 vai melhorar.

---

## Contexto

A spec pede melhorias de **performance**. Esta task **mede** primeiro: Lighthouse em prod nas 3 páginas + análise de bundle. As otimizações vêm na Task 11 (medir antes de otimizar).

> ℹ️ **Já está pronto:** `apps/shell/next.config.ts` envolve a config com `@next/bundle-analyzer` (ativado por `ANALYZE=true`). Não precisa instalar nada — só rodar.

---

## Implementação

### 1. Baseline Lighthouse (produção)

```bash
npx lighthouse https://bytebank-shell.vercel.app/ --preset=desktop --view
npx lighthouse https://bytebank-shell.vercel.app/transactions --preset=desktop --view
npx lighthouse https://bytebank-shell.vercel.app/login --preset=desktop --view
# repetir com --preset=mobile
```

Coletar, por página, os **alvos** da Fase 2:

| Métrica                  | Alvo                       |
| ------------------------ | -------------------------- |
| Performance              | ≥ 90 desktop / ≥ 85 mobile |
| First Contentful Paint   | < 1.5s                     |
| Largest Contentful Paint | < 2.5s                     |
| Time to Interactive      | < 3.5s                     |
| Cumulative Layout Shift  | < 0.1                      |

### 2. Bundle analysis

```bash
ANALYZE=true npm run build -w @bytebank/shell   # abre o treemap do bundle-analyzer
```

- Flag dependências > 100 KB.
- Verificar duplicação de `react`/DS entre shell e MFEs (devem ser singletons compartilhados via federation).
- Conferir se modais já entram via `dynamic()` (lazy) e o que mais é elegível.

### 3. Registrar achados

Lista priorizada de gargalos (o que otimizar na Task 11), com impacto estimado.

---

## Validação

- [x] Scores de baseline coletados para `/`, `/transactions`, `/login` (desktop + mobile). ⚠️ Medidos contra **build de produção local** (Fase 2), porque a prod Vercel ainda serve a **Fase 1** (`phase-2` só vai pra `main` no fim); revalidar em prod real após o merge.
- [x] Bundle capturado via `next experimental-analyze` (o `@next/bundle-analyzer` é incompatível com Turbopack); dependências > 100 KB listadas.
- [x] Lista priorizada de otimizações entregue para a [Task 11](./11-perf-optimizations.md).

**Resultados:** [10-perf-audit-results.md](./10-perf-audit-results.md).

---

## Gotchas

1. **Medir em prod, não preview** — o aceite exige produção; previews da Vercel não têm o mesmo cache/edge.
2. **Cold start do MFE** infla o LCP de `/transactions` na primeira visita — medir com e sem cache e anotar.
3. **Throttling consistente** — usar sempre o mesmo preset (`desktop`/`mobile`) para comparar antes/depois de forma justa.
4. **`ANALYZE=true` só afeta o build do shell** — os MFEs (Rsbuild) têm seu próprio relatório (`rsbuild build` com `--analyze` / `BUNDLE_ANALYZE`); rodar à parte se um MFE for o gargalo.
