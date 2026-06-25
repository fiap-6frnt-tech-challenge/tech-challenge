# Task 11 — Perf: otimizações + `docs/phase-2/perf-audit.md` (antes/depois)

|                        |                                                                   |
| ---------------------- | ----------------------------------------------------------------- |
| **Sprint**             | [Sprint 4 — Deploy + Polish + Demo](../sprint-4-deploy-polish.md) |
| **Owner**              | Dev 3 (State & Integration)                                       |
| **Duração estimada**   | 1 dia                                                             |
| **Branch recomendada** | `dev3/perf-optimizations`                                         |
| **Status**             | ⏳ Pendente                                                       |

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

- [ ] **Preload do `remoteEntry`/`mf-manifest.json`** dos MFEs no `<head>` do shell (`<link rel="preload">` / `rel="modulepreload">`).
- [ ] **Preconnect** às origins dos MFEs (`<link rel="preconnect" href="https://bytebank-dashboard.vercel.app">`).
- [ ] **Font preload** (Inter) — `next/font` ou `<link rel="preload" as="font">` com `font-display: swap`.
- [ ] **Lazy load de modais** via `dynamic()` (já existe; confirmar cobertura e estender ao que faltar).
- [ ] **`next/image`** onde houver imagens raster (avatar, logos) — dimensões explícitas para evitar CLS.
- [ ] **Tree-shaking / imports pontuais** das deps > 100 KB flagradas (ex.: `lucide-react` já em `optimizePackageImports`; estender se preciso).
- [ ] **Skeleton com altura reservada** nas áreas dos MFEs para zerar CLS no carregamento federado.

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

- [ ] Perf ≥ 90 desktop / ≥ 85 mobile em `/`, `/transactions`, `/login` (em **produção**).
- [ ] FCP < 1.5s · LCP < 2.5s · TTI < 3.5s · CLS < 0.1.
- [ ] `docs/phase-2/perf-audit.md` com tabela antes/depois preenchida com números reais.

---

## Gotchas

1. **Preload demais polui a rede** e pode piorar o FCP — preload só do crítico (manifest + fonte), não de tudo.
2. **`modulepreload` cross-origin** exige `crossorigin` correto, senão o browser baixa duas vezes.
3. **Não regredir A11y** ao mexer em markup (skip link, foco) — re-rodar o Lighthouse A11y após as mudanças (sync com Task 08).
4. **CLS do MFE:** reservar a altura do container do remote **antes** de ele montar; medir com Layout Shift regions no DevTools.
5. **Se não bater o alvo:** documentar o gap e o motivo no relatório (a Task 11 pode entregar parcial, conforme prioridade da Sprint).
