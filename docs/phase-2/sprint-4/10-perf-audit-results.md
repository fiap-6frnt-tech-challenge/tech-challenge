# Task 10 — Resultados da auditoria de performance (baseline)

> Baseline "antes" que a [Task 11 — otimizações](./11-perf-optimizations.md) vai melhorar. Ver escopo em [Task 10](./10-perf-audit.md).

|                     |                                                                      |
| ------------------- | -------------------------------------------------------------------- |
| **Data da medição** | 2026-07-03                                                           |
| **Ferramenta**      | Lighthouse 12.8.2 (Chrome headless), `--only-categories=performance` |
| **Bundle**          | `next experimental-analyze` (analyzer nativo do Turbopack)           |

> ⚠️ **Onde a baseline foi medida.** A URL "de produção" (`fiap-6frnt-tech-challenge.vercel.app`) ainda serve a **Fase 1** — o projeto Vercel do shell faz deploy da `main`, e o trabalho da Fase 2 vive na branch `phase-2` (só vai pra `main` no fim de todas as tasks). `/login`, `/register`, `/poc` retornam **404** lá. Logo, a baseline **da arquitetura Fase 2** foi medida contra um **build de produção local** (`next start` + `rsbuild preview` dos 2 MFEs), autenticado com um usuário real (`NODE_ENV=production` desliga o backdoor `senha123`). Quando o `phase-2` for pra `main`, revalidar em produção Vercel real.

---

## 1. Baseline Lighthouse — Fase 2 (build de produção local)

| Página / preset         | **Perf**   | FCP  | LCP      | TBT         | CLS   | SI   |
| ----------------------- | ---------- | ---- | -------- | ----------- | ----- | ---- |
| `/` (home) desktop      | **52** 🔴  | 0.4s | 2.5s     | 940ms       | 0     | 2.8s |
| `/` (home) mobile       | **47** 🔴  | 0.8s | **6.4s** | **3.710ms** | 0.004 | 3.3s |
| `/transactions` desktop | **97** ✅  | 0.2s | 1.3s     | 30ms        | 0     | 0.4s |
| `/transactions` mobile  | **60** ⚠️  | 0.8s | **5.9s** | 780ms       | 0     | 1.0s |
| `/login` desktop        | **100** ✅ | 0.2s | 0.5s     | 10ms        | 0     | 0.3s |
| `/login` mobile         | **80** ⚠️  | 0.8s | 2.2s     | 760ms       | 0     | 0.9s |

Alvos da Fase 2: **≥ 90 desktop / ≥ 85 mobile**.

- **`/` (home)** é a pior de longe (52 desktop / 47 mobile) — carrega **dois MFEs na mesma dobra** (`AccountOverviewRemote` do transactions + `DashboardRemote` com charts). TBT altíssimo (**3.7s** mobile) e **LCP 6.4s** mobile.
- **`/transactions`** passa no desktop (97) mas fica em **60 no mobile** — LCP 5.9s pela cadeia `ssr:false` + federação sob throttle de CPU.
- **`/login`** quase passa (100 desktop / 80 mobile); o TBT mobile (~760ms) é o **custo de JS base do shell** (providers, next-auth, redux, RQ) mesmo numa página simples.
- **CLS ~0 em tudo** ✅ — o trabalho de skeletons já resolveu layout shift.

> **Cuidados de leitura.** (1) `localhost` tem latência de rede ~zero, então **LCP/SI são otimistas** vs Vercel real (que soma RTT/edge) — mesmo assim o LCP mobile da home já bate 6.4s, ou seja, o gargalo é **CPU/JS**, não rede. (2) Lighthouse aplica throttle de CPU 4× no mobile (TBT é representativo). (3) Runs únicos — variância ±5–10.

### Comparação: o que está no ar hoje (Fase 1)

Só como referência (NÃO é o alvo do audit), a Fase 1 em produção Vercel dá `/` 100/65 e `/transactions` 98/88 — muito melhor porque é a app **monolítica antiga sem MFE/charts pesados**. Não comparar com os números da Fase 2 acima.

### TTI

O Lighthouse 12 **não reporta mais TTI** (deprecado). Usar **TBT** como proxy de interatividade.

---

## 2. Análise de bundle

### Gotcha de tooling

O `@next/bundle-analyzer` (que a Task 10 assumia pronto via `ANALYZE=true`) **não é compatível com Turbopack** — e o `next build` do Next 16 usa Turbopack por padrão, então **nenhum treemap é gerado**. Alternativa usada: **`next experimental-analyze -o`** (analyzer nativo do Turbopack; escreve em `apps/shell/.next/diagnostics/analyze`).

### Chunks client mais pesados (shell)

| Chunk                     | Raw    | Gzip       | Conteúdo              |
| ------------------------- | ------ | ---------- | --------------------- |
| `1b21fcc8…`               | 512 KB | **138 KB** | **recharts**          |
| `2da916b3…`               | 348 KB | **74 KB**  | **zod**               |
| `10dda96e…`               | 223 KB | 69 KB      | react-dom (framework) |
| `9fcfe68e…` / `20c2f3ad…` | 117 KB | 32–33 KB   | app / scheduler       |
| `a6dad97d…`               | 109 KB | 38 KB      | app                   |

**Dependências > 100 KB (raw):** `recharts`, `zod`, `react-dom`. As duas primeiras são acionáveis.

### Checks pedidos pela Task 10

- **Duplicação react/DS entre shell e MFEs:** ✅ **não há.** `react`, `react-dom` e `@bytebank/*` são compartilhados como **singletons** via Module Federation (`apps/shell/src/lib/federation.ts` + `apps/transactions-mfe/rsbuild.config.ts`). O MFE consome o DS do shell.
- **Modais via `dynamic()` (lazy)?** ❌ **Não.** Só os 4 remotes usam `dynamic()`. Os modais (Delete/Edit/New/Confirm Transaction) são **import estático** no `TransactionsPage` — elegíveis a lazy.
- **recharts:** carrega sob demanda quando o **dashboard remote** monta e **executa na home** (que renderiza gráficos) — principal responsável pelo TBT de 3.7s ali; em `/transactions` não há chart e o TBT cai para 780ms.

---

## 3. Lista priorizada de gargalos → Task 11

| #   | Gargalo                                                    | Página                      | Ação sugerida                                                                                                                                 | Impacto        |
| --- | ---------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1   | **TBT 3.7s / LCP 6.4s** (recharts + 2 MFEs na mesma dobra) | `/` mobile (47)             | Lazy/defer do `DashboardRemote` (below-the-fold), `dynamic()` nos charts, avaliar lib de chart mais leve; considerar SSG/ISR da casca da home | 🔴 crítico     |
| 2   | **LCP 5.9s** (waterfall `ssr:false` + federação)           | `/transactions` mobile (60) | `preconnect` + `preload` do manifesto do transactions na rota; server-render do skeleton                                                      | 🔴 alto        |
| 3   | **TBT ~760ms de JS base do shell**                         | `/login` mobile (80)        | Enxugar JS inicial: `dynamic()` do `ReactQueryDevtools` só em dev, revisar providers, code-split                                              | 🟡 médio       |
| 4   | **zod 74 KB gz + recharts 138 KB gz** no bundle            | todas                       | Lazy-load do schema (só em modais/forms); code-split dos charts; conferir tree-shaking do zod v4                                              | 🟡 médio       |
| 5   | Modais em import estático                                  | `/transactions`             | `dynamic()` nos 4 modais                                                                                                                      | 🟢 baixo       |
| —   | **CLS ~0** em todas                                        | —                           | Manter a abordagem de skeletons (nada a fazer)                                                                                                | ✅ ok          |
| —   | **Prod serve Fase 1** (`/login` 404)                       | —                           | Revalidar a baseline em prod real quando `phase-2` → `main`                                                                                   | acompanhamento |

---

## 4. Como reproduzir

### Baseline Fase 2 (build de produção local)

```bash
# 1. MFEs de produção (rsbuild preview lê o dist do disco)
npm run build -w @bytebank/dashboard-mfe && npm run preview -w @bytebank/dashboard-mfe      # :3002
npm run build -w @bytebank/transactions-mfe && npm run preview -w @bytebank/transactions-mfe # :3003

# 2. Shell de produção — AUTH_TRUST_HOST é obrigatório no next-auth v5 em prod
#    (usa o .next já buildado; senão: npm run build -w @bytebank/shell)
AUTH_TRUST_HOST=true npm run start -w @bytebank/shell   # :3000

# 3. Sessão: NODE_ENV=production desliga o backdoor senha123 → precisa de usuário real.
#    Criar um dono das transações do seed (userId=joana) e logar via /api/auth para pegar o cookie.

# 4. Lighthouse com o cookie de sessão (home/transactions autenticados; login sem cookie)
npx lighthouse http://localhost:3000/transactions --only-categories=performance \
  --preset=desktop --extra-headers=headers.json --view
```

### Bundle analysis (Turbopack)

```bash
npm run build -w @bytebank/shell
npm exec -w @bytebank/shell -- next experimental-analyze   # UI interativa em :4000 (ou -o p/ só escrever arquivos)
```
