# Tech Challenge — Fase 2 — Plano Geral (60 dias)

**Janela:** 2026-05-13 → 2026-07-12 (60 dias corridos, ~8.5 semanas)
**Time:** **5 devs frontend** (5 tracks paralelos — ver [team-allocation.md](./team-allocation.md))
**Repo:** `tech-challenge/` (raiz do git)

> Este documento é o resumo executivo. Cada sprint tem seu próprio arquivo com tasks detalhadas e critérios de aceite:
>
> - [team-allocation.md](./team-allocation.md) — **Alocação de tarefas por dev em cada sprint + dependências**
> - [sprint-0-foundation.md](./sprint-0-foundation.md) — Monorepo + DS + PoC MF (dias 1-7)
> - [sprint-1-auth-state.md](./sprint-1-auth-state.md) — Auth + State + Persistência (dias 8-21)
> - [sprint-2-dashboard.md](./sprint-2-dashboard.md) — Dashboard MFE + Charts (dias 22-35)
> - [sprint-3-transactions.md](./sprint-3-transactions.md) — Transactions MFE + busca/scroll/categorias/anexos (dias 36-49)
> - [sprint-4-deploy-polish.md](./sprint-4-deploy-polish.md) — Docker + Deploy + A11y + Demo (dias 50-60)

---

## Objetivo da Fase 2

> "Aprimorar e escalar a aplicação de gerenciamento financeiro existente, utilizando uma arquitetura de microfrontends e garantindo a integração e deploy eficientes em ambientes cloud. A aplicação deve incluir novas funcionalidades e melhorias de performance, segurança e experiência do usuário."
> — POSTECH Tech Challenge Fase 2 (PDF, p.2)

## Requisitos da spec

### Funcionais

- **Home:** gráficos + análises financeiras
- **Listagem:** filtros avançados + busca + paginação/scroll infinito
- **Form transação:** validação avançada + sugestão de categorias + anexos

### Técnicos

- **Microfrontends** (Module Federation ou Single SPA)
- **Docker + Docker Compose / Kubernetes**
- **Cloud deploy** (Vercel/AWS/Azure) + auth/autorização
- **State management** (Redux/Recoil/NgRx) — escolha: **Zustand + TanStack Query**
- **TypeScript** ✓ (já temos)
- **SSR/SSG** para performance e SEO

### Entrega

- Código + README
- UX intuitiva + Acessibilidade (WCAG 2.1 AA)
- Vídeo demonstrativo

---

## Decisões arquiteturais (alinhadas com o usuário)

| Decisão          | Escolha                                             | Justificativa                                               |
| ---------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| Time             | 2-4 devs                                            | Frentes paralelas por sprint                                |
| MFE Framework    | Next.js/React (sem Angular)                         | Stack atual mantida; menos atrito                           |
| **MFE Tooling**  | **Rsbuild remotes + `@module-federation/enhanced`** | Federação runtime real + stack moderno (ver decisão abaixo) |
| State global     | Zustand + TanStack Query                            | Cobre cliente + servidor; leve; cross-MFE friendly          |
| Auth             | NextAuth (Credentials + JWT + **Google Provider**)  | Padrão Next.js; vive no shell                               |
| Storage anexos   | Vercel Blob                                         | Zero-config na Vercel; 1GB free tier                        |
| Charts           | Recharts                                            | Declarativo; aceita tokens DS via props                     |
| Estrutura `app/` | Move para `src/`                                    | Convenção Next.js padrão                                    |
| Monorepo tool    | Turborepo + npm workspaces                          | Cache CI + workspaces nativos do npm 7+                     |

---

## Decisão Module Federation — Opção A (final)

✅ **Decisão tomada:** Shell Next.js 16 App Router + remotes Rsbuild/Rspack com `@module-federation/enhanced`.

**Como isso atende a spec:**

| Requisito                 | Como atendemos                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Microfrontends em runtime | Remotes carregadas via `remoteEntry.js`, deploys independentes, federação real                                                                   |
| SSR para performance      | Shell faz SSR de layout + skeleton + metadata; MFE hidrata client-side com `<link rel="preload">` do remoteEntry                                 |
| SSR para SEO              | Páginas autenticadas (`/`, `/transactions`) não precisam de SEO (crawlers não passam do login). Apenas `/login` precisa SEO, e é SSR pelo shell. |
| SSG                       | Aplicável a futuras páginas de marketing pelo shell                                                                                              |

**Trade-off aceito:** MFEs são CSR (não SSR-rendered). Aceitável porque são autenticadas (`noindex,nofollow` adicionado via `generateMetadata`). LCP rápido garantido via SSR de skeleton no shell.

**Gate Sprint 0 (dia 5):** Se PoC Rsbuild falhar, fallback automático para opção D (build-time MFE via workspace packages). Ver [alternativas avaliadas](#alternativas-avaliadas-arquivo-histórico) abaixo.

### Alternativas avaliadas (arquivo histórico)

| Opção                                                | Motivo de não escolha                                                   |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| B. Vite remotes + `@originjs/vite-plugin-federation` | Plugin não-oficial; comunidade ativa mas não evolui em par com MF spec  |
| C. Downgrade Next 14 Pages Router + `nextjs-mf`      | Regressão de framework; perde App Router/RSC do Next 16                 |
| D. Build-time MFE (workspace packages)               | Não é federação runtime; só será usada como fallback se A falhar no PoC |

---

## Arquitetura alvo

### Monorepo dentro de `tech-challenge/`

```
tech-challenge/                   ← raiz do git repo
├── apps/
│   ├── shell/                    ← Next 16 host: auth, layout, /api/*, SSR
│   │   └── src/{app,components,hooks,...}
│   ├── dashboard-mfe/            ← React SPA (Rsbuild/Vite), federado em runtime
│   │   └── src/
│   └── transactions-mfe/         ← React SPA, federado em runtime
│       └── src/
├── packages/
│   ├── design-system/            ← UI components + tokens + Storybook + Chromatic
│   ├── api-client/               ← TanStack Query hooks + fetchers
│   ├── stores/                   ← Zustand stores compartilhadas
│   └── shared/                   ← Types, zod schemas, utils, categorias
├── docs/
│   └── phase-2/                  ← este diretório
├── docker-compose.yml
├── turbo.json
└── package.json                  ← workspace root manifest (`"workspaces": ["apps/*", "packages/*"]`)
```

### Auth entre MFEs

NextAuth no shell. Shell envolve mount points dos remotes em `<SessionProvider>`. Remotes consomem via `useSession()` exposto por `@bytebank/shared`. Todas chamadas API saem do shell (`/api/*`) — remotes nunca conhecem o JWT.

### Persistência

- **Transações:** migrar `app/api/transactions/store.ts` (in-memory) para Vercel KV/Postgres
- **Anexos:** Vercel Blob com signed URLs, atrás de interface `StorageProvider`

### State

- **Zustand:** estado cliente global (auth user, UI: filter panel, modais)
- **TanStack Query:** estado servidor (transações, summaries, anexos) com cache + optimistic updates
- Remover `context/TransactionsContext.tsx` e `context/FeedbackContext.tsx` no Sprint 1

---

## Roadmap visual

```
W1   W2   W3   W4   W5   W6   W7   W8 W9
[S0]   ── Foundation (7d)
     [────S1 Auth+State (14d)────]
                              [────S2 Dashboard (14d)────]
                                                    [────S3 Transactions (14d)────]
                                                                              [S4 Polish (11d)]
```

## Convenções obrigatórias (toda sprint)

1. **Design System first:** componente novo nasce em `packages/design-system/` com `I{Name}.ts`, story `.stories.tsx`, tokens DS, a11y
2. **Apps consomem DS via `@bytebank/design-system`** — nunca duplicar
3. **Sem dynamic class construction** — segue [tailwind-conventions.md](../../.claude/tailwind-conventions.md)
4. **Vitest tests** acompanham features — não acumulam para o final
5. **Chromatic** roda em todo PR que toca DS
6. **PR checklist:** story criada? a11y check? teste? tokens DS usados? base branch correta (`phase-2`)?

## Git Workflow — Fase 2

**Branch de integração:** `phase-2`. Durante os 60 dias da fase, **todas as branches** de feature/track partem de `phase-2` e **todos os PRs** apontam para `phase-2`. `main` só recebe um único merge final no fim do Sprint 4.

```bash
# Criar nova branch para uma task
git checkout phase-2
git pull origin phase-2
git checkout -b phase-2/<dev-handle>/<task>   # ex: phase-2/dev3-ds/login-form

# Abrir PR contra phase-2
gh pr create --base phase-2 --title "feat(ds): LoginForm component"
```

**Convenção de nomenclatura (handles em [team-allocation.md](./team-allocation.md)):**

- `phase-2/dev1-infra/<task>` — Track Infra & Build
- `phase-2/dev2-backend/<task>` — Track Backend & Auth
- `phase-2/dev3-ds/<task>` — Track Design System
- `phase-2/dev4-dashboard/<task>` — Track Dashboard MFE
- `phase-2/dev5-transactions/<task>` — Track Transactions MFE

**Regras de merge:**

- PRs em `phase-2` precisam de 1 reviewer + CI verde + Chromatic visual review (se tocar DS)
- Rebase diário recomendado para evitar conflitos grandes
- Merge final `phase-2` → `main` é uma PR única no fim do Sprint 4, revisada pelo time todo

## Riscos & mitigações

| Risco                                   | Mitigação                                                              |
| --------------------------------------- | ---------------------------------------------------------------------- |
| PoC Rsbuild MF + Next 16 falha          | Gate dia 5 + fallback automático para opção D (build-time packages)    |
| Vercel KV/Blob limites no free tier     | Documentar; cleanup script de anexos órfãos                            |
| Time não conhece Zustand/TanStack Query | Spike 1 dia no Sprint 1 antes de migrar                                |
| Singletons React quebram em runtime     | `singleton: true, strictVersion: true` + E2E "session presente em MFE" |
| Recharts hydration warnings             | `dynamic(..., { ssr: false })` em todos charts                         |
| Categoria sugestão erra                 | Heurística keyword + override manual + testes                          |
| Scope creep no S3                       | Priorizar anexos+categorias; dropar scroll infinito se necessário      |

## Verificação end-to-end (final)

1. `npm install && npm run dev` sobe shell + 2 MFEs localmente (via Turborepo)
2. `localhost:3000` redireciona para `/login`
3. Login Google → home renderiza dashboard com 4+ widgets
4. `/transactions` → busca, filtros, scroll infinito funcionando
5. Criar transação "Uber Trip" → categoria "Transporte" sugerida
6. Anexar PDF → preview + persistência após F5
7. `docker-compose up` em clone limpo → tudo sobe
8. Vercel deploys (shell + 2 MFEs) verdes
9. Lighthouse: Perf ≥ 90, A11y ≥ 95, Best Practices ≥ 95
10. Storybook do DS publica no Chromatic com todos novos componentes
11. 3 testes Playwright passam em CI
12. Vídeo demo (5-7 min) gravado

## Próximos passos imediatos

- [x] **Branch `phase-2` já criada** a partir de `main` e disponível em `origin` (long-lived; base de todas as features da fase)
- [x] **Branch atual** (onde estes docs vivem) já é uma feature branch a partir de `phase-2` — exemplo do workflow

1. Cada track cria suas sub-branches: `phase-2/dev1-infra/...`, `phase-2/dev3-ds/...`, etc. — ver [Git Workflow](#git-workflow--fase-2)
2. Iniciar [sprint-0-foundation.md](./sprint-0-foundation.md) — Bootstrap monorepo + extração de packages em paralelo com PoC Rsbuild
3. Gate dia 5: validar PoC ou acionar fallback opção D
