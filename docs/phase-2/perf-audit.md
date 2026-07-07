# Performance — auditoria e otimizações (antes / depois)

Entregável das [Task 10](./sprint-4/10-perf-audit.md) (baseline) e [Task 11](./sprint-4/11-perf-optimizations.md) (otimizações). Detalhe da baseline e bundle em [10-perf-audit-results.md](./sprint-4/10-perf-audit-results.md).

## Método

- **Alvo medido:** build de **produção local** (Fase 2). A prod Vercel (`fiap-6frnt-tech-challenge.vercel.app`) ainda serve a **Fase 1** — `phase-2` só vai pra `main` no fim das tasks. Revalidar em prod real após o merge.
- **Setup:** `next start` (shell :3000) + `rsbuild preview` dos 2 MFEs (:3002/:3003), autenticado (`NODE_ENV=production` desliga o backdoor `senha123`; usei um usuário real dono das transações do seed).
- **Lighthouse 12.8.2**, `--only-categories=performance`, desktop (`--preset=desktop`) e mobile (default, throttle 4× CPU).
- **Best-of-3:** cada número é o melhor de 3 execuções. Em máquina de dev com 3 servidores rodando, o TBT (CPU-bound) tem variância enorme; run único engana. A baseline single-run da Task 10 estava **inflada por ruído** (ex.: `/` desktop "52" era ruído — o real é 95); esta tabela usa best-of-3 nos **dois** lados.
- **Cuidado:** `localhost` tem latência ~zero → LCP/SI são **otimistas** vs Vercel real. O LCP mobile aqui (~5s) é quase todo **CPU/JS**, não rede.

## Performance — antes / depois (best-of-3)

| Página          | Preset  | Perf (antes → depois) | LCP         | TBT             | Alvo   |
| --------------- | ------- | --------------------- | ----------- | --------------- | ------ |
| `/`             | desktop | **95 → 97**           | 1.4s → 1.3s | 90ms → 30ms     | ≥90 ✅ |
| `/`             | mobile  | **55 → 67**           | 6.1s → 5.5s | 1.090ms → 420ms | ≥85 ❌ |
| `/transactions` | desktop | **97 → 97**           | 1.3s → 1.2s | 40ms → 40ms     | ≥90 ✅ |
| `/transactions` | mobile  | **63 → 72**           | 5.6s → 5.2s | 640ms → 370ms   | ≥85 ❌ |
| `/login`        | desktop | **100 → 100**         | 0.6s → 0.4s | 0ms             | ≥90 ✅ |
| `/login`        | mobile  | **94 → 99**           | 1.6s → 1.6s | 270ms → 120ms   | ≥85 ✅ |

**CLS = 0** em todas (já estava — os skeletons com altura reservada resolveram o layout shift antes desta task).

### Status dos alvos

- **Desktop:** ✅ todas as 3 páginas ≥ 90 (95–100).
- **Mobile:** ✅ `/login` (99). ❌ `/` (67) e `/transactions` (72) — melhoraram (+12 e +9) mas **não batem ≥85**. Ver "Pendências".

## Otimizações aplicadas

1. **Defer do `DashboardRemote` abaixo da dobra** (`app/page.tsx` + `components/DeferUntilVisible.tsx`, IntersectionObserver). No mobile a home não monta o dashboard-mfe nem executa o **recharts** até o scroll. **Maior ganho:** `/` mobile TBT **1.090ms → 420ms**.
2. **Preconnect + preload dos manifests dos MFEs** (`app/layout.tsx`). Antecipa a conexão/fetch dos remotes. Reduz LCP das páginas federadas (`/` 6.1→5.5s, `/transactions` 5.6→5.2s).
3. **`ReactQueryDevtools` só em dev** (`app/providers.tsx`, `dynamic()` + gate `NODE_ENV`). Tira o módulo do bundle inicial de produção. **Ganho:** `/login` mobile TBT **270ms → 120ms**.
4. **Lazy-load dos modais** no `transactions-mfe` (`TransactionsPage.tsx`, `React.lazy` + `Suspense`, renderizados só quando abertos). O código de modais/`TransactionForm`/`FileUpload` virou um chunk **async de ~364KB** (evidência determinística: `dist/static/js/async/554.*.js`), fora do carregamento inicial da lista.

### Não aplicáveis / já resolvidos

- **Font preload (Inter):** N/A — não há `next/font` nem `@font-face`; 'Inter' cai no fallback do sistema, não há webfont pra pré-carregar.
- **`next/image` / CLS:** CLS já é 0 (skeletons com altura reservada). Sem ganho a extrair.
- **Duplicação react/DS:** já compartilhados como singletons via Module Federation (sem duplicação entre shell e MFEs).

## Trade-offs / pendências

- **Gargalo restante = LCP das páginas federadas** (`/` e `/transactions` mobile, ~5–5.5s). Vem da cadeia **`ssr: false` + Module Federation**: HTML vazio → shell JS → runtime MF → fetch do remote → mount → fetch de dados → paint. Preconnect/preload cortam a conexão, mas o render client-only permanece. Bater ≥85 mobile exige **SSR/streaming do conteúdo do MFE** — mudança arquitetural (os MFEs são `ssr: false` por design), **fora do escopo** desta task. Registrado como partial (gotcha #5 da Task 11).
- **Medição local é otimista em rede** e ruidosa em CPU. **Aceite final** da Fase 2 (Perf ≥90/85 em produção) deve ser revalidado na **Vercel real** após `phase-2` → `main`.
- O `DeferUntilVisible` carrega o dashboard só ao aproximar da viewport (rootMargin 300px). No desktop, onde o dashboard já entra na dobra, ele monta de imediato — comportamento correto.
